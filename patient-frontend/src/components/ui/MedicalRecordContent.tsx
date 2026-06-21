import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Thermometer, Pill, ShoppingCart, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import axiosInstance from '../../api/axiosInstance';
import { API_ENDPOINTS } from '../../api/config';
import { extractErrorMessage } from '../../utils/errorHandler';
import type { ApiResult } from '../../types/api.types';
import type {
  ExaminationViewResponse, PrescriptionView, PharmacyOrderResponse,
} from '../../types/medical-record.types';
import { PaymentSuccessModal } from './PaymentSuccessModal';

// ── Data hooks ─────────────────────────────────────────────────────────────────

function useExamination(examinationId: string) {
  return useQuery({
    queryKey: ['patient-examination', examinationId],
    queryFn: async () => {
      const res = await axiosInstance.get<ApiResult<ExaminationViewResponse>>(
        API_ENDPOINTS.examinations.byId(examinationId),
      );
      return res.data.data ?? null;
    },
    staleTime: 10 * 60_000,
  });
}

function usePrescription(prescriptionId: string | null | undefined) {
  return useQuery({
    queryKey: ['patient-prescription', prescriptionId],
    queryFn: async () => {
      if (!prescriptionId) return null;
      const res = await axiosInstance.get<ApiResult<PrescriptionView>>(
        API_ENDPOINTS.prescriptions.byId(prescriptionId),
      );
      return res.data.data ?? null;
    },
    enabled: !!prescriptionId,
    staleTime: 10 * 60_000,
  });
}

// ── Sub-components ─────────────────────────────────────────────────────────────

// Builds a plain-language usage sentence from raw dose/frequency/duration numbers,
// e.g. "Take 2 tablets, 3 times per day, for 7 days." or "Take 1 tablet daily for 30 days."
function buildUsageSentence(item: { dose: number; frequency: number; durationInDays: number }, t: (k: string, opts?: Record<string, unknown>) => string) {
  const tabletWord = item.dose === 1 ? t('medicalRecord.tablet') : t('medicalRecord.tablets');
  const dosePart = t('medicalRecord.takeDose', { count: item.dose, word: tabletWord });

  const frequencyPart = item.frequency === 1
    ? t('medicalRecord.dailyShort')
    : t('medicalRecord.timesPerDay', { count: item.frequency });

  const durationPart = t('medicalRecord.forDays', { count: item.durationInDays });

  // "daily" reads naturally without a comma; "2 times per day" needs one before "for N days"
  return item.frequency === 1
    ? `${dosePart} ${frequencyPart} ${durationPart}`
    : `${dosePart}, ${frequencyPart}, ${durationPart}`;
}

function VitalChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 px-3 py-2.5 text-center">
      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wide">{label}</p>
      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-0.5">{value}</p>
    </div>
  );
}

// ── Get Prescription from Hospital Pharmacy (one-click, whole prescription) ─────

function useBuyPrescription(onOrderPlaced: (order: PharmacyOrderResponse, newBalance: number) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (prescriptionId: string) => {
      const res = await axiosInstance.post<ApiResult<PharmacyOrderResponse>>(
        API_ENDPOINTS.pharmacyOrders.create,
        { prescriptionId },
      );
      if (!res.data.isSuccess || !res.data.data)
        throw new Error(res.data.errors?.[0] ?? 'Order failed');
      return res.data.data;
    },
    onSuccess: async (order, prescriptionId) => {
      qc.invalidateQueries({ queryKey: ['my-pharmacy-orders'] });
      // Refresh so hasPharmacyOrder flips to true and the button disables immediately —
      // otherwise the patient could click "buy" again before the page is reloaded.
      qc.invalidateQueries({ queryKey: ['patient-prescription', prescriptionId] });
      const balanceRes = await axiosInstance.get<ApiResult<{ balance: number }>>(API_ENDPOINTS.wallet.balance);
      const newBalance = balanceRes.data.data?.balance ?? 0;
      qc.setQueryData(['patient-wallet-balance'], { balance: newBalance });
      onOrderPlaced(order, newBalance);
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err));
    },
  });
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface MedicalRecordContentProps {
  examinationId: string;
  /** Extra className applied to the outermost div — use for padding/spacing tweaks per context */
  className?: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function MedicalRecordContent({ examinationId, className }: MedicalRecordContentProps) {
  const { t } = useTranslation();
  const { data: exam, isLoading } = useExamination(examinationId);
  const { data: prescription } = usePrescription(exam?.prescriptionId);
  const [successState, setSuccessState] = useState<{ order: PharmacyOrderResponse; newBalance: number } | null>(null);
  const buyPrescription = useBuyPrescription((order, newBalance) => setSuccessState({ order, newBalance }));

  // Grand total only counts medicines currently purchasable from the hospital pharmacy —
  // unavailable medicines are excluded from quantity/price totals entirely.
  const summary = useMemo(() => {
    const items = prescription?.prescriptionItems ?? [];
    const available = items.filter((i) => i.isAvailable);
    return {
      medicineCount: items.length,
      totalQuantity: available.reduce((sum, i) => sum + i.quantity, 0),
      grandTotal: available.reduce((sum, i) => sum + (i.totalPrice ?? 0), 0),
    };
  }, [prescription]);

  if (isLoading) {
    return (
      <div className={cn('animate-pulse space-y-3', className)}>
        <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-4 w-full bg-slate-100 dark:bg-slate-700/60 rounded" />
        <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-700/60 rounded" />
      </div>
    );
  }

  if (!exam) {
    return (
      <p className={cn('text-sm text-slate-400 dark:text-slate-500 italic text-center py-8', className)}>
        {t('medicalRecord.noRecord')}
      </p>
    );
  }

  return (
    <div className={cn('space-y-5', className)}>

      {/* Clinical info */}
      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 px-4 py-3 space-y-3">
        <div>
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">
            {t('medicalRecord.complaint')}
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-200">{exam.complaint}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">
            {t('medicalRecord.diagnosis')}
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-200">{exam.diagnosis}</p>
        </div>
        {exam.notes && (
          <div>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">
              {t('medicalRecord.notes')}
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-200">{exam.notes}</p>
          </div>
        )}
      </div>

      {/* Vitals */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Thermometer size={13} className="text-slate-400" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            {t('medicalRecord.vitals')}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <VitalChip label={t('medicalRecord.temperature')} value={`${exam.temperature} °C`} />
          <VitalChip label={t('medicalRecord.bloodPressure')} value={`${exam.bloodPressureSystolic}/${exam.bloodPressureDiastolic}`} />
          {exam.pulse  != null && <VitalChip label={t('medicalRecord.pulse')}  value={`${exam.pulse} bpm`} />}
          {exam.weight != null && <VitalChip label={t('medicalRecord.weight')} value={`${exam.weight} kg`}  />}
          {exam.height != null && <VitalChip label={t('medicalRecord.height')} value={`${exam.height} cm`} />}
        </div>
      </div>

      {/* Prescription */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Pill size={13} className="text-slate-400" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            {t('medicalRecord.prescription')}
          </p>
        </div>
        {!prescription || prescription.prescriptionItems.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 italic">{t('medicalRecord.noPrescription')}</p>
        ) : (
          <>
            <div className="space-y-2">
              {prescription.prescriptionItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-3"
                >
                  {/* 1. Medicine name */}
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight min-w-0 truncate">
                      {item.medicineName}
                    </p>
                    <span className="shrink-0 text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/40 rounded-md px-1.5 py-0.5 tabular-nums">
                      #{idx + 1}
                    </span>
                  </div>

                  {/* 2. Usage Instructions — single source of truth for how the medicine is taken */}
                  <div className="mt-2">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                      {t('medicalRecord.usageInstructions')}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-0.5">
                      {buildUsageSentence(item, t)}
                    </p>
                  </div>

                  {/* 3–5. Quantity / Unit Price / Total */}
                  <div className="grid grid-cols-3 gap-2 mt-2.5">
                    <div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                        {t('medicalRecord.quantity')}
                      </p>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                        {item.quantity}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                        {t('medicalRecord.unitPrice')}
                      </p>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                        {item.isAvailable && item.unitPrice != null ? `$${item.unitPrice.toFixed(2)}` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                        {t('medicalRecord.total')}
                      </p>
                      {item.isAvailable && item.totalPrice != null ? (
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                          ${item.totalPrice.toFixed(2)}
                        </p>
                      ) : (
                        <p className="text-sm font-semibold text-rose-500 dark:text-rose-400">
                          {t('medicalRecord.unavailable')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 6. Doctor Note — free-text instruction from the doctor, distinct from the dosing schedule above */}
                  {item.usageInstruction && (
                    <div className="mt-2.5">
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                        {t('medicalRecord.doctorNote')}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5">
                        {item.usageInstruction}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Prescription summary */}
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-violet-50/60 dark:bg-violet-900/10 px-4 py-3 mt-3 space-y-1.5">
              <p className="text-xs font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wide mb-1">
                {t('medicalRecord.prescriptionSummary')}
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">{t('medicalRecord.medicines')}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{summary.medicineCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">{t('medicalRecord.totalQuantity')}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{summary.totalQuantity}</span>
              </div>
              <div className="flex items-center justify-between text-sm pt-1 mt-1 border-t border-violet-100 dark:border-violet-800/40">
                <span className="font-semibold text-slate-700 dark:text-slate-200">{t('medicalRecord.grandTotal')}</span>
                <span className="font-bold text-violet-700 dark:text-violet-400 tabular-nums">${summary.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => buyPrescription.mutate(prescription.id)}
              disabled={buyPrescription.isPending || prescription.hasPharmacyOrder}
              className={cn(
                'w-full flex items-center justify-center gap-2 mt-3 py-2.5 rounded-xl text-sm font-semibold border transition-colors',
                prescription.hasPharmacyOrder
                  ? 'text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 cursor-not-allowed'
                  : 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 border-violet-100 dark:border-violet-800/40 hover:bg-violet-100 dark:hover:bg-violet-900/40 disabled:opacity-50',
              )}
            >
              {prescription.hasPharmacyOrder ? (
                <CheckCircle2 size={14} />
              ) : buyPrescription.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ShoppingCart size={14} />
              )}
              {prescription.hasPharmacyOrder
                ? t('pharmacy.alreadyOrdered')
                : `${t('pharmacy.buyPrescription')} ($${summary.grandTotal.toFixed(2)})`}
            </button>
          </>
        )}
      </div>

      <PaymentSuccessModal
        open={!!successState}
        onClose={() => setSuccessState(null)}
        message={t('pharmacy.orderPlaced')}
        amount={successState?.order.totalPrice}
        amountLabel={t('medicalRecord.grandTotal')}
        amountSign="debit"
        balance={successState?.newBalance}
        balanceLabel={t('wallet.success.newBalance')}
        ctaLabel={t('common.close')}
      />
    </div>
  );
}
