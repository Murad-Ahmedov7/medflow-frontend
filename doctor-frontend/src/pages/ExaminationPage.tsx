import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft, ClipboardList, Thermometer, Plus,
  Trash2, Pill, X, AlertTriangle, Lock,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { extractErrorMessage } from '../utils/errorHandler';
import axiosInstance from '../api/axiosInstance';
import { API_ENDPOINTS } from '../api/config';
import type { ApiResult, ApiListResult } from '../types/api.types';
import type { ExaminationResponse, CreateExaminationRequest, UpdateExaminationRequest } from '../types/examination.types';
import type { PrescriptionResponse, AddPrescriptionItemRequest } from '../types/prescription.types';
import type { MedicineResponse } from '../types/medicine.types';
import type { DoctorAppointmentResponse } from '../types/appointment.types';
import { DOCTOR_APPOINTMENTS_KEY } from '../hooks/useAppointments';

// ── Queries / mutations ────────────────────────────────────────────────────────

function useAppointment(appointmentId: string) {
  return useQuery<DoctorAppointmentResponse | null>({
    queryKey: ['appointment', appointmentId],
    queryFn: async () => {
      const res = await axiosInstance.get<ApiResult<DoctorAppointmentResponse>>(
        API_ENDPOINTS.appointments.byId(appointmentId),
      );
      return res.data.data ?? null;
    },
    staleTime: 30_000,
  });
}

function useExaminationByAppointment(appointmentId: string) {
  return useQuery({
    queryKey: ['examination', 'appointment', appointmentId],
    queryFn: async () => {
      const res = await axiosInstance.get<ApiResult<ExaminationResponse>>(
        API_ENDPOINTS.examinations.byAppointmentId(appointmentId),
      );
      return res.data.data ?? null;
    },
    staleTime: 30_000,
  });
}

function usePrescription(prescriptionId: string | null | undefined) {
  return useQuery({
    queryKey: ['prescription', prescriptionId],
    queryFn: async () => {
      if (!prescriptionId) return null;
      const res = await axiosInstance.get<ApiResult<PrescriptionResponse>>(
        API_ENDPOINTS.prescriptions.byId(prescriptionId),
      );
      return res.data.data ?? null;
    },
    enabled: !!prescriptionId,
    staleTime: 30_000,
  });
}

function useMedicines() {
  return useQuery({
    queryKey: ['medicines'],
    queryFn: async () => {
      const res = await axiosInstance.get<ApiListResult<MedicineResponse>>(API_ENDPOINTS.medicines.base);
      return res.data.data ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

function useUpdateExamination(examinationId: string, appointmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateExaminationRequest) =>
      axiosInstance.put<ApiResult<ExaminationResponse>>(API_ENDPOINTS.examinations.update(examinationId), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['examination', 'appointment', appointmentId] }),
  });
}

function useCreateExamination(appointmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateExaminationRequest) =>
      axiosInstance.post<ApiResult<ExaminationResponse>>(API_ENDPOINTS.examinations.base, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DOCTOR_APPOINTMENTS_KEY });
      qc.invalidateQueries({ queryKey: ['examination', 'appointment', appointmentId] });
    },
  });
}

function useCreatePrescription(appointmentId: string, examinationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (title: string) =>
      axiosInstance.post<ApiResult<PrescriptionResponse>>(API_ENDPOINTS.prescriptions.base, {
        examinationId,
        title,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['examination', 'appointment', appointmentId] }),
  });
}

function useAddPrescriptionItem(prescriptionId: string, appointmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AddPrescriptionItemRequest) =>
      axiosInstance.post(API_ENDPOINTS.prescriptions.items(prescriptionId), data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prescription', prescriptionId] });
      qc.invalidateQueries({ queryKey: ['examination', 'appointment', appointmentId] });
    },
  });
}

function useRemovePrescriptionItem(prescriptionId: string, appointmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      axiosInstance.delete(API_ENDPOINTS.prescriptions.deleteItem(prescriptionId, itemId)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prescription', prescriptionId] });
      qc.invalidateQueries({ queryKey: ['examination', 'appointment', appointmentId] });
    },
  });
}

// ── Form schema ───────────────────────────────────────────────────────────────

const examinationSchema = z.object({
  complaint: z.string().min(1),
  diagnosis: z.string().min(1),
  notes: z.string().optional(),
  temperature: z.coerce.number().min(30).max(45),
  bloodPressureSystolic: z.coerce.number().min(50).max(250),
  bloodPressureDiastolic: z.coerce.number().min(30).max(150),
  pulse: z.union([z.coerce.number().min(20).max(300), z.literal('')]).optional(),
  weight: z.union([z.coerce.number().min(1).max(500), z.literal('')]).optional(),
  height: z.union([z.coerce.number().min(30).max(250), z.literal('')]).optional(),
});
type ExamForm = z.infer<typeof examinationSchema>;

const itemSchema = z.object({
  medicineId: z.string().min(1, 'Please select a medicine.'),
  dose: z.coerce.number({ invalid_type_error: 'Enter a valid quantity.' }).min(0.5, 'Quantity must be at least 0.5.').max(20, 'Quantity seems too high. Please check.'),
  frequency: z.coerce.number({ invalid_type_error: 'Enter a valid number.' }).int('Frequency must be a whole number.').min(1, 'Frequency must be at least 1 time per day.').max(24, 'Frequency cannot exceed 24 times per day.'),
  durationInDays: z.coerce.number({ invalid_type_error: 'Enter a valid number.' }).int('Duration must be a whole number of days.').min(1, 'Duration must be at least 1 day.').max(365, 'Duration cannot exceed 365 days.'),
  usageInstruction: z.string().max(500, 'Instructions cannot exceed 500 characters.').optional(),
});
type ItemForm = z.infer<typeof itemSchema>;

// ── Shared UI ─────────────────────────────────────────────────────────────────

function SectionCard({ title, icon, children }: {
  title: string; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
        <span className="text-cyan-600 dark:text-cyan-400">{icon}</span>
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
      {children}
      {required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
  );
}

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="text-xs text-rose-500 mt-1">{msg}</p> : null;
}

const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition disabled:opacity-60';
const textareaCls = cn(inputCls, 'resize-none');

function ReadVal({ val }: { val: React.ReactNode }) {
  return <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{val}</p>;
}

// ── Searchable medicine combobox ───────────────────────────────────────────────

function MedicineCombobox({
  medicines,
  value,
  onChange,
  error,
}: {
  medicines: MedicineResponse[];
  value: string;
  onChange: (id: string) => void;
  error?: string;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const selected = medicines.find(m => m.id === value) ?? null;

  const filtered = query.trim()
    ? medicines.filter(m => m.name.toLowerCase().includes(query.toLowerCase()))
    : medicines;

  function handleSelect(m: MedicineResponse) {
    onChange(m.id);
    setQuery('');
    setOpen(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setOpen(true);
    if (!e.target.value) onChange('');
  }

  return (
    <div className="relative">
      <div
        className={cn(
          'flex items-center w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-800 transition',
          error
            ? 'border-rose-300 dark:border-rose-700 focus-within:ring-2 focus-within:ring-rose-500/30'
            : 'border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-cyan-500/30',
        )}
      >
        {selected && !open ? (
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-slate-800 dark:text-slate-100 font-medium">
              {selected.name}
              {selected.form && (
                <span className="text-xs text-slate-400 dark:text-slate-500 font-normal ml-1.5">
                  ({selected.form})
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(true); }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-2 shrink-0"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <input
            autoFocus={open}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={t('prescription.searchMedicine')}
            className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 w-full mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-xs text-slate-400 dark:text-slate-500 text-center">
                {medicines.length === 0 ? t('prescription.noMedicinesInCatalog') : t('prescription.noMedicineFound')}
              </li>
            ) : (
              filtered.map(m => (
                <li
                  key={m.id}
                  onMouseDown={() => handleSelect(m)}
                  className={cn(
                    'flex items-center justify-between px-3 py-2.5 cursor-pointer text-sm transition-colors',
                    m.id === value
                      ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60',
                  )}
                >
                  <span className="font-medium">{m.name}</span>
                  {m.form && (
                    <span className="text-xs text-slate-400 dark:text-slate-500 ml-2 shrink-0">
                      {m.form}
                    </span>
                  )}
                </li>
              ))
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Add item modal ─────────────────────────────────────────────────────────────

function AddItemModal({
  prescriptionId,
  appointmentId,
  medicines,
  onClose,
}: {
  prescriptionId: string;
  appointmentId: string;
  medicines: MedicineResponse[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { mutate, isPending } = useAddPrescriptionItem(prescriptionId, appointmentId);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ItemForm>({
    resolver: zodResolver(itemSchema),
    defaultValues: { dose: 1 },
  });

  const selectedMedicineId = watch('medicineId') ?? '';
  const hasMedicine = !!selectedMedicineId;

  function onSubmit(v: ItemForm) {
    mutate({
      medicineId: v.medicineId,
      dose: v.dose,
      frequency: v.frequency,
      durationInDays: v.durationInDays,
      usageInstruction: v.usageInstruction || undefined,
    }, {
      onSuccess: () => { toast.success(t('prescription.itemAdded')); onClose(); },
      onError: (e) => toast.error(extractErrorMessage(e) || t('prescription.itemAddError')),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Pill size={15} className="text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('prescription.addItem')}</h3>
          </div>
          <button onClick={onClose} className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">

          {/* Step 1 — Medicine search */}
          <div>
            <FieldLabel required>{t('prescription.medicine')}</FieldLabel>
            <MedicineCombobox
              medicines={medicines}
              value={selectedMedicineId}
              onChange={(id) => setValue('medicineId', id, { shouldValidate: true })}
              error={errors.medicineId?.message}
            />
            {!hasMedicine && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                {t('prescription.selectMedicineFirst')}
              </p>
            )}
            <FieldError msg={errors.medicineId?.message} />
          </div>

          {/* Step 2 — Prescription details (disabled until medicine selected) */}
          <fieldset
            disabled={!hasMedicine}
            className="space-y-4 transition-opacity duration-200 disabled:opacity-40 disabled:pointer-events-none"
          >
            {/* Quantity + Frequency + Duration — 3 columns */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <FieldLabel required>{t('prescription.quantity')}</FieldLabel>
                <div className="relative">
                  <input
                    type="number" step="0.5" min="0.5" max="20"
                    placeholder="1"
                    className={cn(inputCls, 'pr-8')}
                    {...register('dose')}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 dark:text-slate-500 pointer-events-none leading-none">
                    {t('prescription.units')}
                  </span>
                </div>
                <FieldError msg={errors.dose?.message} />
              </div>
              <div>
                <FieldLabel required>{t('prescription.frequency')}</FieldLabel>
                <div className="relative">
                  <input type="number" min="1" max="24" placeholder="3" className={cn(inputCls, 'pr-8')} {...register('frequency')} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 dark:text-slate-500 pointer-events-none leading-none">×/d</span>
                </div>
                <FieldError msg={errors.frequency?.message} />
              </div>
              <div>
                <FieldLabel required>{t('prescription.duration')}</FieldLabel>
                <div className="relative">
                  <input type="number" min="1" max="365" placeholder="7" className={cn(inputCls, 'pr-8')} {...register('durationInDays')} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 dark:text-slate-500 pointer-events-none leading-none">{t('prescription.days')}</span>
                </div>
                <FieldError msg={errors.durationInDays?.message} />
              </div>
            </div>

            {/* Usage instruction */}
            <div>
              <FieldLabel>{t('prescription.usageInstruction')}</FieldLabel>
              <textarea
                rows={2}
                placeholder={t('prescription.usageInstructionPlaceholder')}
                className={textareaCls}
                {...register('usageInstruction')}
              />
              <FieldError msg={errors.usageInstruction?.message} />
            </div>
          </fieldset>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={isPending}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isPending || !hasMedicine}
              className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPending ? t('prescription.adding') : t('prescription.addItem')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Prescription section ──────────────────────────────────────────────────────

function PrescriptionSection({
  appointmentId,
  examinationId,
  prescriptionId,
  isReadOnly,
  medicines,
}: {
  appointmentId: string;
  examinationId: string;
  prescriptionId: string | null | undefined;
  isReadOnly: boolean;
  medicines: MedicineResponse[];
}) {
  const { t } = useTranslation();
  const [showCreate, setShowCreate] = useState(false);
  const [prescTitle, setPrescTitle] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);

  const { data: prescription, isLoading } = usePrescription(prescriptionId);
  const { mutate: createPresc, isPending: isCreating } = useCreatePrescription(appointmentId, examinationId);
  const { mutate: removeItem } = useRemovePrescriptionItem(prescription?.id ?? '', appointmentId);

  if (isLoading) {
    return (
      <SectionCard title={t('prescription.title')} icon={<Pill size={16} />}>
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-4 w-64 bg-slate-100 dark:bg-slate-700/60 rounded" />
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title={t('prescription.title')} icon={<Pill size={16} />}>
      {/* No prescription yet */}
      {!prescriptionId && isReadOnly && (
        <p className="text-sm text-slate-400 dark:text-slate-500 italic">{t('prescription.noPrescription')}</p>
      )}

      {!prescriptionId && !isReadOnly && (
        !showCreate ? (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:border-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors w-full justify-center"
          >
            <Plus size={15} />
            {t('prescription.addPrescription')}
          </button>
        ) : (
          <div className="space-y-3">
            <div>
              <FieldLabel required>{t('prescription.prescriptionTitle')}</FieldLabel>
              <input
                autoFocus
                value={prescTitle}
                onChange={e => setPrescTitle(e.target.value)}
                placeholder={t('prescription.prescriptionTitlePlaceholder')}
                className={inputCls}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowCreate(false); setPrescTitle(''); }} disabled={isCreating}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  if (!prescTitle.trim()) return;
                  createPresc(prescTitle.trim(), {
                    onSuccess: () => { toast.success(t('prescription.created')); setShowCreate(false); setPrescTitle(''); },
                    onError: (e) => toast.error(extractErrorMessage(e) || t('prescription.createError')),
                  });
                }}
                disabled={isCreating || !prescTitle.trim()}
                className="flex-1 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {isCreating ? t('prescription.creating') : t('prescription.createPrescription')}
              </button>
            </div>
          </div>
        )
      )}

      {/* Prescription exists */}
      {prescription && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{prescription.title}</p>
            {!isReadOnly && (
              <button
                onClick={() => setShowAddItem(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 text-xs font-semibold transition-colors"
              >
                <Plus size={12} />
                {t('prescription.addItem')}
              </button>
            )}
          </div>

          {prescription.prescriptionItems.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 italic">{t('prescription.noItems')}</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                    <th className="text-left px-3 py-2 font-semibold">{t('prescription.medicine')}</th>
                    <th className="text-left px-3 py-2 font-semibold">{t('prescription.quantity')}</th>
                    <th className="text-left px-3 py-2 font-semibold">{t('prescription.frequency')}</th>
                    <th className="text-left px-3 py-2 font-semibold">{t('prescription.duration')}</th>
                    <th className="text-left px-3 py-2 font-semibold">{t('prescription.usageInstruction')}</th>
                    {!isReadOnly && <th className="w-8 px-3 py-2" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {prescription.prescriptionItems.map(item => (
                    <tr key={item.id} className="text-slate-700 dark:text-slate-200">
                      <td className="px-3 py-2.5 font-medium">{item.medicineName}</td>
                      <td className="px-3 py-2.5">{item.dose} {t('prescription.units')}</td>
                      <td className="px-3 py-2.5">{item.frequency}×/day</td>
                      <td className="px-3 py-2.5">{item.durationInDays}d</td>
                      <td className="px-3 py-2.5 text-slate-400 dark:text-slate-500">{item.usageInstruction || '—'}</td>
                      {!isReadOnly && (
                        <td className="px-3 py-2.5">
                          <button
                            onClick={() =>
                              removeItem(item.id, {
                                onSuccess: () => toast.success(t('prescription.itemRemoved')),
                                onError: (e) => toast.error(extractErrorMessage(e) || t('prescription.removeError')),
                              })
                            }
                            className="flex items-center justify-center w-6 h-6 rounded-md text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showAddItem && prescription && (
          <AddItemModal
            key="add-item"
            prescriptionId={prescription.id}
            appointmentId={appointmentId}
            medicines={medicines}
            onClose={() => setShowAddItem(false)}
          />
        )}
      </AnimatePresence>
    </SectionCard>
  );
}

// ── Vitals form fields (shared between create and edit) ────────────────────────

function VitalsFields({ register, errors }: {
  register: ReturnType<typeof useForm<ExamForm>>['register'];
  errors: ReturnType<typeof useForm<ExamForm>>['formState']['errors'];
}) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <div>
        <FieldLabel required>{t('examination.temperature')}</FieldLabel>
        <input type="number" step="0.1" min="30" max="45" className={inputCls} {...register('temperature')} />
        <FieldError msg={errors.temperature?.message} />
      </div>
      <div>
        <FieldLabel required>{t('examination.systolic')}</FieldLabel>
        <input type="number" min="50" max="250" className={inputCls} {...register('bloodPressureSystolic')} />
        <FieldError msg={errors.bloodPressureSystolic?.message} />
      </div>
      <div>
        <FieldLabel required>{t('examination.diastolic')}</FieldLabel>
        <input type="number" min="30" max="150" className={inputCls} {...register('bloodPressureDiastolic')} />
        <FieldError msg={errors.bloodPressureDiastolic?.message} />
      </div>
      <div>
        <FieldLabel>{t('examination.pulse')}</FieldLabel>
        <input type="number" min="20" max="300" className={inputCls} {...register('pulse')} />
        <FieldError msg={errors.pulse?.message} />
      </div>
      <div>
        <FieldLabel>{t('examination.weight')}</FieldLabel>
        <input type="number" step="0.1" min="1" max="500" className={inputCls} {...register('weight')} />
        <FieldError msg={errors.weight?.message} />
      </div>
      <div>
        <FieldLabel>{t('examination.height')}</FieldLabel>
        <input type="number" step="0.1" min="30" max="250" className={inputCls} {...register('height')} />
        <FieldError msg={errors.height?.message} />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ExaminationPage() {
  const { appointmentId = '' } = useParams<{ appointmentId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: appointment } = useAppointment(appointmentId);
  const isReadOnly   = appointment?.status === 'Completed';
  const isRestricted = appointment?.status === 'Waiting' || appointment?.status === 'Cancelled';

  const { data: examination, isLoading: loadingExam } = useExaminationByAppointment(appointmentId);
  const hasExamination = !!examination;

  const { data: medicines = [] } = useMedicines();

  // Single form instance used for both create and edit
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<ExamForm>({
    resolver: zodResolver(examinationSchema),
  });

  // Pre-fill form when an existing examination loads
  useEffect(() => {
    if (examination) {
      reset({
        complaint: examination.complaint,
        diagnosis: examination.diagnosis,
        notes: examination.notes ?? '',
        temperature: examination.temperature,
        bloodPressureSystolic: examination.bloodPressureSystolic,
        bloodPressureDiastolic: examination.bloodPressureDiastolic,
        pulse: examination.pulse ?? '',
        weight: examination.weight ?? '',
        height: examination.height ?? '',
      });
    }
  }, [examination, reset]);

  const { mutate: createExamination, isPending: isCreating } = useCreateExamination(appointmentId);
  const { mutate: updateExamination, isPending: isUpdating } = useUpdateExamination(
    examination?.id ?? '',
    appointmentId,
  );
  const isSaving = isCreating || isUpdating;

  function onSubmit(v: ExamForm) {
    const payload = {
      complaint: v.complaint,
      diagnosis: v.diagnosis,
      notes: v.notes || undefined,
      temperature: v.temperature,
      bloodPressureSystolic: v.bloodPressureSystolic,
      bloodPressureDiastolic: v.bloodPressureDiastolic,
      pulse: v.pulse !== '' && v.pulse != null ? Number(v.pulse) : undefined,
      weight: v.weight !== '' && v.weight != null ? Number(v.weight) : undefined,
      height: v.height !== '' && v.height != null ? Number(v.height) : undefined,
    };

    if (hasExamination && examination) {
      updateExamination(payload, {
        onSuccess: () => toast.success(t('examination.updated')),
        onError: (e) => toast.error(extractErrorMessage(e) || t('examination.saveError')),
      });
    } else {
      createExamination({ appointmentId, ...payload }, {
        onSuccess: () => toast.success(t('examination.saved')),
        onError: (e) => toast.error(extractErrorMessage(e) || t('examination.saveError')),
      });
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-tight">{t('examination.title')}</h1>
          {appointment && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {appointment.patientFullName} · {appointment.appointmentDate} · {appointment.startTime.slice(0, 5)}
            </p>
          )}
        </div>
      </div>

      {/* Restricted banner */}
      {isRestricted && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/10 px-5 py-4"
        >
          <AlertTriangle size={18} className="text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">{t('examination.restricted')}</p>
        </motion.div>
      )}

      {/* Read-only banner */}
      {isReadOnly && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-5 py-4"
        >
          <Lock size={16} className="text-slate-400 shrink-0" />
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{t('examination.viewOnly')}</p>
        </motion.div>
      )}

      {/* Loading skeleton */}
      {loadingExam && (
        <div className="space-y-4 animate-pulse">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 h-52" />
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 h-36" />
        </div>
      )}

      {/* ── EDITABLE — InProgress (create or edit) ── */}
      {!isRestricted && !isReadOnly && !loadingExam && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <SectionCard title={t('examination.title')} icon={<ClipboardList size={16} />}>
            <div className="space-y-4">
              <div>
                <FieldLabel required>{t('examination.complaint')}</FieldLabel>
                <textarea rows={3} placeholder={t('examination.complaintPlaceholder')} className={textareaCls} {...register('complaint')} />
                <FieldError msg={errors.complaint?.message} />
              </div>
              <div>
                <FieldLabel required>{t('examination.diagnosis')}</FieldLabel>
                <textarea rows={2} placeholder={t('examination.diagnosisPlaceholder')} className={textareaCls} {...register('diagnosis')} />
                <FieldError msg={errors.diagnosis?.message} />
              </div>
              <div>
                <FieldLabel>{t('examination.notes')}</FieldLabel>
                <textarea rows={3} placeholder={t('examination.notesPlaceholder')} className={textareaCls} {...register('notes')} />
                <FieldError msg={errors.notes?.message} />
              </div>
            </div>
          </SectionCard>

          <SectionCard title={t('examination.vitals')} icon={<Thermometer size={16} />}>
            <VitalsFields register={register} errors={errors} />
          </SectionCard>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving || (hasExamination && !isDirty)}
              className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {isSaving
                ? t('examination.saving')
                : hasExamination
                  ? t('examination.updateRecord')
                  : t('examination.saveRecord')}
            </button>
          </div>
        </form>
      )}

      {/* Prescription — editable path only; read-only path renders its own below */}
      {!isRestricted && !isReadOnly && !loadingExam && hasExamination && examination && (
        <PrescriptionSection
          appointmentId={appointmentId}
          examinationId={examination.id}
          prescriptionId={examination.prescriptionId}
          isReadOnly={!!isReadOnly}
          medicines={medicines}
        />
      )}

      {/* ── READ-ONLY — Completed ── */}
      {isReadOnly && !loadingExam && examination && (
        <div className="space-y-4">
          <SectionCard title={t('examination.title')} icon={<ClipboardList size={16} />}>
            <div className="space-y-4">
              <div>
                <FieldLabel>{t('examination.complaint')}</FieldLabel>
                <ReadVal val={examination.complaint} />
              </div>
              <div>
                <FieldLabel>{t('examination.diagnosis')}</FieldLabel>
                <ReadVal val={examination.diagnosis} />
              </div>
              {examination.notes && (
                <div>
                  <FieldLabel>{t('examination.notes')}</FieldLabel>
                  <ReadVal val={examination.notes} />
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title={t('examination.vitals')} icon={<Thermometer size={16} />}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div><FieldLabel>{t('examination.temperature')}</FieldLabel><ReadVal val={`${examination.temperature} °C`} /></div>
              <div><FieldLabel>{t('examination.systolic')}</FieldLabel><ReadVal val={`${examination.bloodPressureSystolic} mmHg`} /></div>
              <div><FieldLabel>{t('examination.diastolic')}</FieldLabel><ReadVal val={`${examination.bloodPressureDiastolic} mmHg`} /></div>
              {examination.pulse != null && <div><FieldLabel>{t('examination.pulse')}</FieldLabel><ReadVal val={`${examination.pulse} bpm`} /></div>}
              {examination.weight != null && <div><FieldLabel>{t('examination.weight')}</FieldLabel><ReadVal val={`${examination.weight} kg`} /></div>}
              {examination.height != null && <div><FieldLabel>{t('examination.height')}</FieldLabel><ReadVal val={`${examination.height} cm`} /></div>}
            </div>
          </SectionCard>

          <PrescriptionSection
            appointmentId={appointmentId}
            examinationId={examination.id}
            prescriptionId={examination.prescriptionId}
            isReadOnly={true}
            medicines={medicines}
          />
        </div>
      )}
    </div>
  );
}
