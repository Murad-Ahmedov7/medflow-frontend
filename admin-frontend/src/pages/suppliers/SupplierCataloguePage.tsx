import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft, BookOpen, ShoppingCart, Minus, Plus, X, Wallet, AlertTriangle,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { fmt } from '../../utils/currency';
import { extractErrorMessage } from '../../utils/errorHandler';
import axiosInstance from '../../api/axiosInstance';
import { API_ENDPOINTS } from '../../api/config';
import type { ApiResult } from '../../types/api.types';
import type {
  CatalogueItemResponse,
  CreatePurchaseOrderRequest, PurchaseOrderLineRequest, PurchaseOrderResponse,
} from '../../types/supplier.types';
import { MEDICINE_FORM_BADGE } from '../../types/medicine.types';
import type { SupplierResponse } from '../../types/supplier.types';
import type { AdminBalanceResponse } from '../../types/finance.types';
import { PaymentSuccessModal } from '../../components/ui/PaymentSuccessModal';

// ── Data hooks ────────────────────────────────────────────────────────────────

function useSupplier(id: string) {
  return useQuery({
    queryKey: ['admin-supplier', id],
    queryFn: async () => {
      const res = await axiosInstance.get<ApiResult<SupplierResponse>>(API_ENDPOINTS.suppliers.byId(id));
      return res.data.data ?? null;
    },
    enabled: !!id,
  });
}

function useCatalogue(supplierId: string) {
  return useQuery({
    queryKey: ['admin-catalogue', supplierId],
    queryFn: async () => {
      const res = await axiosInstance.get<ApiResult<CatalogueItemResponse[]>>(
        API_ENDPOINTS.suppliers.catalogue(supplierId),
      );
      return res.data.data ?? [];
    },
    enabled: !!supplierId,
    staleTime: 30_000,
  });
}


function useCreatePurchaseOrder(supplierId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePurchaseOrderRequest) =>
      axiosInstance.post<ApiResult<PurchaseOrderResponse>>(
        API_ENDPOINTS.suppliers.purchase(supplierId),
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-catalogue', supplierId] });
      qc.invalidateQueries({ queryKey: ['admin-hospital-stock'] });
      qc.invalidateQueries({ queryKey: ['admin-balance'] });
      qc.invalidateQueries({ queryKey: ['admin-balance-transactions'] });
    },
  });
}

function useAdminBalance() {
  return useQuery({
    queryKey: ['admin-balance'],
    queryFn: async () => {
      const res = await axiosInstance.get<ApiResult<AdminBalanceResponse>>(API_ENDPOINTS.balance.base);
      return res.data.data!;
    },
    staleTime: 30_000,
  });
}

// ── Purchase types ────────────────────────────────────────────────────────────

interface PurchaseLine {
  medicineId: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
}

// ── Purchase modal ────────────────────────────────────────────────────────────

function PurchaseModal({ supplierId, catalogue, onClose }: {
  supplierId: string;
  catalogue: CatalogueItemResponse[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { mutate, isPending } = useCreatePurchaseOrder(supplierId);
  const { data: balanceData, refetch: refetchBalance } = useAdminBalance();
  const [lines, setLines]      = useState<PurchaseLine[]>([]);
  const [successInfo, setSuccessInfo] = useState<{ amount: number; balance: number } | null>(null);

  const currentBalance   = balanceData?.balance ?? 0;

  function addLine() {
    setLines(prev => [...prev, { medicineId: '', medicineName: '', quantity: 1, unitPrice: 0 }]);
  }

  function removeLine(idx: number) {
    setLines(prev => prev.filter((_, i) => i !== idx));
  }

  function updateLine(idx: number, field: keyof PurchaseLine, value: string | number) {
    setLines(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      if (field === 'medicineId') {
        const cat = catalogue.find(c => c.medicineId === value);
        return { ...l, medicineId: String(value), medicineName: cat?.medicineName ?? '', unitPrice: cat?.unitPrice ?? l.unitPrice };
      }
      return { ...l, [field]: Number(value) };
    }));
  }

  const selectedLines    = lines.filter(l => l.medicineId !== '');
  const totalCost        = selectedLines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const hasUnselected    = lines.some(l => l.medicineId === '');
  const insufficientFunds = selectedLines.length > 0 && totalCost > currentBalance;

  function confirm() {
    if (lines.length === 0 || selectedLines.length === 0) {
      toast.error(t('catalogue.purchase.noLines'));
      return;
    }
    if (hasUnselected) {
      toast.error(t('catalogue.purchase.unselectedLines'));
      return;
    }
    const payload: CreatePurchaseOrderRequest = {
      lines: selectedLines.map(l => ({
        medicineId: l.medicineId,
        quantity:   l.quantity,
        unitPrice:  l.unitPrice,
      } satisfies PurchaseOrderLineRequest)),
    };
    mutate(payload, {
      onSuccess: async () => {
        const refreshed = await refetchBalance();
        setSuccessInfo({ amount: totalCost, balance: refreshed.data?.balance ?? currentBalance - totalCost });
      },
      onError: (e) => toast.error(extractErrorMessage(e) || t('catalogue.purchase.error')),
    });
  }

  const inputCls = 'w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ duration: 0.2 }}
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('catalogue.purchase.title')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('catalogue.purchase.subtitle')}</p>
          </div>
          <button onClick={onClose} className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[2fr_80px_120px_80px_36px] gap-2 px-5 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 shrink-0">
          {[t('catalogue.selectMedicine'), t('catalogue.purchase.quantity'), t('catalogue.purchase.unitPrice'), t('catalogue.purchase.lineTotal'), ''].map((h, i) => (
            <span key={i} className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{h}</span>
          ))}
        </div>

        {/* Lines */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2 min-h-20">
          {lines.length === 0 && (
            <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">{t('catalogue.purchase.noLines')}</p>
          )}
          {lines.map((line, idx) => {
            const usedIds = new Set(lines.filter((_, i) => i !== idx).map(l => l.medicineId).filter(Boolean));
            const availableForRow = catalogue.filter(c => !usedIds.has(c.medicineId));
            const selected = line.medicineId !== '';
            return (
              <div key={idx} className="grid grid-cols-[2fr_80px_120px_80px_36px] gap-2 items-center">
                <select
                  value={line.medicineId}
                  onChange={e => updateLine(idx, 'medicineId', e.target.value)}
                  className={cn(inputCls, !selected && 'text-slate-400 dark:text-slate-500')}
                >
                  <option value="">{t('catalogue.selectMedicine')}</option>
                  {availableForRow.map(c => (
                    <option key={c.medicineId} value={c.medicineId}>{c.medicineName}</option>
                  ))}
                </select>
                <input
                  type="number" min={1} value={selected ? line.quantity : ''}
                  disabled={!selected}
                  onChange={e => updateLine(idx, 'quantity', e.target.value)}
                  className={cn(inputCls, !selected && 'opacity-40 cursor-not-allowed')}
                />
                <input
                  type="number" min={0.01} step={0.01} value={selected ? line.unitPrice : ''}
                  disabled={!selected}
                  onChange={e => updateLine(idx, 'unitPrice', e.target.value)}
                  className={cn(inputCls, !selected && 'opacity-40 cursor-not-allowed')}
                />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 text-right">
                  {selected ? fmt(line.quantity * line.unitPrice) : '—'}
                </span>
                <button
                  onClick={() => removeLine(idx)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <Minus size={14} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 px-5 py-4 space-y-3">
          <button
            onClick={addLine}
            disabled={selectedLines.length >= catalogue.length}
            className="flex items-center gap-2 text-sm font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus size={15} />
            {t('catalogue.purchase.addLine')}
          </button>

          {/* Balance info row */}
          <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Wallet size={12} />
              {t('catalogue.purchase.availableBalance')}
            </div>
            <span className={cn(
              'text-sm font-bold tabular-nums',
              insufficientFunds
                ? 'text-rose-500 dark:text-rose-400'
                : 'text-emerald-600 dark:text-emerald-400',
            )}>
              {fmt(currentBalance)}
            </span>
          </div>

          {/* Insufficient balance warning */}
          {insufficientFunds && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/40">
              <AlertTriangle size={14} className="text-rose-500 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                {t('catalogue.purchase.insufficientBalance', {
                  required: fmt(totalCost),
                  available: fmt(currentBalance),
                })}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('catalogue.purchase.totalCost')}</p>
              <p className={cn(
                'text-lg font-bold tabular-nums',
                insufficientFunds
                  ? 'text-rose-500 dark:text-rose-400'
                  : 'text-slate-800 dark:text-slate-100',
              )}>
                {fmt(totalCost)}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} disabled={isPending}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50">
                {t('common.cancel')}
              </button>
              <button onClick={confirm} disabled={isPending || selectedLines.length === 0 || hasUnselected || insufficientFunds}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center gap-2">
                <ShoppingCart size={15} />
                {isPending ? t('catalogue.purchase.confirming') : t('catalogue.purchase.confirm')}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <PaymentSuccessModal
        open={!!successInfo}
        onClose={onClose}
        message={t('catalogue.purchase.success')}
        amount={successInfo?.amount}
        amountLabel={t('catalogue.purchase.totalCost')}
        amountSign="debit"
        balance={successInfo?.balance}
        balanceLabel={t('catalogue.purchase.availableBalance')}
        ctaLabel={t('common.close')}
        onCta={onClose}
      />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABLE_COLS = 'grid-cols-[2fr_minmax(100px,1fr)_minmax(120px,1fr)_90px]';

export function SupplierCataloguePage() {
  const { t } = useTranslation();
  const { id: supplierId = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: supplier } = useSupplier(supplierId);
  const { data: catalogue = [], isLoading, isError } = useCatalogue(supplierId);

  const [purchaseOpen, setPurchaseOpen] = useState(false);

  return (
    <div className="p-6 space-y-5">
      {/* Back + header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="space-y-3"
      >
        <button
          onClick={() => navigate('/suppliers')}
          className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft size={15} />
          {t('catalogue.backToSuppliers')}
        </button>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-900/20">
                <BookOpen size={18} className="text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  {supplier?.name ?? '…'}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('catalogue.subtitle')}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setPurchaseOpen(true)}
            disabled={catalogue.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <ShoppingCart size={15} />
            {t('catalogue.purchaseOrder')}
          </button>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.08 }}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden"
      >
        {/* Header row */}
        <div className={cn(
          'grid gap-3 px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50',
          TABLE_COLS,
        )}>
          {[
            t('catalogue.table.medicine'),
            t('catalogue.table.form'),
            t('catalogue.table.unitPrice'),
            t('catalogue.table.availableQuantity'),
          ].map((h, i) => (
            <span key={i} className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{h}</span>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={cn('grid gap-3 px-5 py-3.5 animate-pulse', TABLE_COLS)}>
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/4" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="p-10 text-center">
            <p className="text-sm text-slate-500">{t('common.error')}</p>
          </div>
        )}

        {!isLoading && !isError && catalogue.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800">
              <BookOpen size={22} className="text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t('catalogue.noResults')}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center max-w-xs">{t('catalogue.noResultsDesc')}</p>
          </div>
        )}

        {!isLoading && !isError && catalogue.length > 0 && (
          <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
            <AnimatePresence initial={false}>
              {catalogue.map((item, idx) => (
                <motion.div
                  key={item.medicineId}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.025, duration: 0.2 }}
                  className={cn('grid gap-3 px-5 py-3.5 items-center hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors', TABLE_COLS)}
                >
                  {/* Medicine name */}
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {item.medicineName}
                  </span>

                  {/* Form */}
                  <div>
                    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', MEDICINE_FORM_BADGE[item.medicineForm] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}>
                      {item.medicineForm}
                    </span>
                  </div>

                  {/* Unit price */}
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {fmt(item.unitPrice)}
                  </span>

                  {/* Available qty */}
                  <span className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    item.availableQuantity > 0
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                  )}>
                    {item.availableQuantity}
                  </span>

                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Footer count */}
        {!isLoading && !isError && catalogue.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {catalogue.length} {t('catalogue.table.medicine').toLowerCase()}
            </span>
          </div>
        )}
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {purchaseOpen && (
          <PurchaseModal supplierId={supplierId} catalogue={catalogue} onClose={() => setPurchaseOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
