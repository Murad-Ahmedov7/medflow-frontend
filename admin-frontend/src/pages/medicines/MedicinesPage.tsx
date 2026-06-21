import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Search, Pill, X,
  ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronLeft, ChevronRight,
  Eye, Calendar, FlaskConical, Package,
  ArrowUpDown, Tag,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { fmt } from '../../utils/currency';
import { extractErrorMessage } from '../../utils/errorHandler';
import axiosInstance from '../../api/axiosInstance';
import { API_ENDPOINTS } from '../../api/config';
import type { ApiResult, ApiListResult } from '../../types/api.types';
import type { MedicineResponse, MedicineSortBy } from '../../types/medicine.types';
import {
  MEDICINE_FORM_OPTIONS,
  MEDICINE_FORM_BADGE,
} from '../../types/medicine.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

// ── URL state ─────────────────────────────────────────────────────────────────

function useUrlState() {
  const [params, setParams] = useSearchParams();
  const get = (key: string, fallback = '') => params.get(key) ?? fallback;
  const set = useCallback((updates: Record<string, string | null>) => {
    setParams(prev => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === '') next.delete(k);
        else next.set(k, v);
      }
      if (!('page' in updates)) next.delete('page');
      return next;
    });
  }, [setParams]);
  return { get, set };
}

// ── Data hooks ────────────────────────────────────────────────────────────────

interface MedicinesQuery {
  search: string; form: string; available: string;
  sortBy: MedicineSortBy; sortDesc: boolean; page: number; pageSize: number;
}

function useMedicines(q: MedicinesQuery) {
  return useQuery({
    queryKey: ['admin-medicines', q],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (q.search)    p.set('search', q.search);
      if (q.form)      p.set('form', q.form);
      if (q.available) p.set('available', q.available);
      // Map URL-facing 'quantity' to the backend field name 'stockquantity'
      const apiSortBy = q.sortBy === 'quantity' ? 'stockquantity' : q.sortBy;
      if (apiSortBy)   p.set('sortBy', apiSortBy);
      if (q.sortDesc)  p.set('sortDesc', 'true');
      p.set('page',     String(q.page));
      p.set('pageSize', String(q.pageSize));
      const res = await axiosInstance.get<ApiListResult<MedicineResponse>>(
        `${API_ENDPOINTS.medicines.base}?${p.toString()}`,
      );
      return { items: res.data.data ?? [], total: res.data.pagedTotalCount ?? 0 };
    },
    staleTime: 30_000,
    placeholderData: prev => prev,
  });
}

function useMedicinesTotalCount() {
  return useQuery({
    queryKey: ['medicines-total-count'],
    queryFn: async () => {
      const res = await axiosInstance.get<ApiListResult<MedicineResponse>>(
        `${API_ENDPOINTS.medicines.base}?pageSize=1&page=1`,
      );
      // pagedTotalCount = total matching records in DB (independent of page/pageSize)
      // totalCount = Data.Count (always equals pageSize or remaining items — never the catalogue total)
      return res.data.pagedTotalCount ?? 0;
    },
    staleTime: 60_000,
  });
}

function useMedicineDetail(id: string | null) {
  return useQuery({
    queryKey: ['admin-medicine-detail', id],
    queryFn: async () => {
      const res = await axiosInstance.get<ApiResult<MedicineResponse>>(
        API_ENDPOINTS.medicines.byId(id!),
      );
      return res.data.data!;
    },
    enabled: !!id,
    staleTime: 60_000,
  });
}

function useUpdateSellingPrice(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sellingPrice: number) =>
      axiosInstance.patch<ApiResult<MedicineResponse>>(
        API_ENDPOINTS.medicines.updateSellingPrice(id),
        { sellingPrice },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-medicines'] });
      qc.invalidateQueries({ queryKey: ['admin-medicine-detail', id] });
    },
  });
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition';

function SortIcon({ field, active, desc }: { field: string; active: string; desc: boolean }) {
  if (field !== active) return <ChevronsUpDown size={13} className="text-slate-300 dark:text-slate-600 ml-1" />;
  return desc
    ? <ChevronDown size={13} className="text-cyan-500 ml-1" />
    : <ChevronUp   size={13} className="text-cyan-500 ml-1" />;
}

// ── Detail Drawer ─────────────────────────────────────────────────────────────

function DetailDrawer({ id, onClose, onUpdatePrice }: {
  id: string;
  onClose: () => void;
  onUpdatePrice: (med: MedicineResponse) => void;
}) {
  const { t } = useTranslation();
  const { data: med, isLoading, isError } = useMedicineDetail(id);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('medicines.drawer.title')}</h2>
          <div className="flex items-center gap-1">
            {med && (
              <button
                onClick={() => { onUpdatePrice(med); onClose(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors"
              >
                <Tag size={13} />
                {t('medicines.updatePrice')}
              </button>
            )}
            <button
              onClick={onClose}
              className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="animate-pulse p-5 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-5 w-48 bg-slate-100 dark:bg-slate-700/60 rounded" />
                </div>
              ))}
            </div>
          )}

          {isError && (
            <div className="p-10 text-center">
              <p className="text-sm text-slate-500">{t('common.error')}</p>
            </div>
          )}

          {med && (
            <div className="p-5 space-y-5">
              {/* Name + badge row */}
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 shrink-0 mt-0.5">
                  <Pill size={20} className="text-cyan-600 dark:text-cyan-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">{med.name}</h3>
                  {med.genericName && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{med.genericName}</p>
                  )}
                  {med.manufacturer && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{med.manufacturer}</p>
                  )}
                </div>
              </div>

              {/* Key fields grid */}
              <div className="grid grid-cols-2 gap-3">
                <DrawerField icon={<FlaskConical size={14} />} label={t('medicines.form')}>
                  <span className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold',
                    MEDICINE_FORM_BADGE[med.form] ?? 'bg-slate-100 text-slate-600',
                  )}>
                    {med.form}
                  </span>
                </DrawerField>

                <DrawerField icon={<Package size={14} />} label={t('medicines.unit')}>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {med.unit}
                  </span>
                </DrawerField>

                {med.strength && (
                  <DrawerField label={t('medicines.strength')}>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{med.strength}</span>
                  </DrawerField>
                )}

                <DrawerField label={t('medicines.sellingPrice')}>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                    {fmt(med.sellingPrice)}
                  </span>
                </DrawerField>
              </div>

              {/* Description */}
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">
                  {t('medicines.description')}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {med.description || (
                    <span className="italic text-slate-400 dark:text-slate-500">
                      {t('medicines.drawer.noDescription')}
                    </span>
                  )}
                </p>
              </div>

              {/* Prescription usage */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                  {t('medicines.drawer.prescriptionUsage')}
                </p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                  {med.prescriptionCount}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {med.prescriptionCount > 0
                    ? t('medicines.drawer.timesPrescribed', { count: med.prescriptionCount })
                    : t('medicines.drawer.neverPrescribed')}
                </p>
              </div>

              {/* Created date */}
              <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 pt-1">
                <Calendar size={13} />
                <span>
                  {t('medicines.drawer.added')} {formatFullDate(med.createdAt)}
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

function DrawerField({ label, icon, children }: {
  label: string; icon?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div>
      <p className="flex items-center gap-1 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
        {icon}
        {label}
      </p>
      {children}
    </div>
  );
}

// ── Selling Price Modal ───────────────────────────────────────────────────────

const priceSchema = z.object({
  sellingPrice: z.number({ invalid_type_error: 'Required' }).positive('Must be greater than 0'),
});
type PriceFormValues = z.infer<typeof priceSchema>;

function SellingPriceModal({ medicine, onClose }: { medicine: MedicineResponse; onClose: () => void }) {
  const { t } = useTranslation();
  const { mutate, isPending } = useUpdateSellingPrice(medicine.id);

  const { register, handleSubmit, formState: { errors } } = useForm<PriceFormValues>({
    resolver: zodResolver(priceSchema),
    defaultValues: { sellingPrice: medicine.sellingPrice },
  });

  function onSubmit(v: PriceFormValues) {
    mutate(v.sellingPrice, {
      onSuccess: () => { toast.success(t('medicines.priceUpdateSuccess')); onClose(); },
      onError: (e) => toast.error(extractErrorMessage(e) || t('medicines.priceUpdateError')),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ duration: 0.2 }}
        className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 shrink-0">
              <Tag size={18} className="text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('medicines.updatePrice')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-44">{medicine.name}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Current price info */}
        <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{t('medicines.currentPrice')}</p>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100 tabular-nums mt-0.5">
            {fmt(medicine.sellingPrice)}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              {t('medicines.newPrice')}<span className="text-rose-500 ml-0.5">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500 dark:text-slate-400 pointer-events-none">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                className={cn(inputCls, 'pl-7')}
                {...register('sellingPrice', { valueAsNumber: true })}
              />
            </div>
            {errors.sellingPrice && (
              <p className="text-xs text-rose-500 mt-1">{errors.sellingPrice.message}</p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={isPending}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
              {isPending ? t('medicines.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Sort options ──────────────────────────────────────────────────────────────

const SORT_OPTIONS: { value: MedicineSortBy; labelKey: string }[] = [
  { value: 'quantity',   labelKey: 'medicines.sortQuantity' },
  { value: 'name',       labelKey: 'medicines.sortName' },
  { value: 'price',      labelKey: 'medicines.sortPrice' },
  { value: 'createdAt',  labelKey: 'medicines.sortNewest' },
  { value: 'prescribed', labelKey: 'medicines.sortPrescribed' },
];

function SortDropdown({ sortBy, sortDesc, onChange }: {
  sortBy: MedicineSortBy; sortDesc: boolean;
  onChange: (field: MedicineSortBy, desc: boolean) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const activeOption = SORT_OPTIONS.find(o => o.value === sortBy);
  const dirLabel = sortDesc ? '↓' : '↑';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-2 pl-3 pr-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors',
          open
            ? 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60',
        )}
      >
        <span>{activeOption ? t(activeOption.labelKey) : '—'}</span>
        <span className="text-cyan-500 tabular-nums w-3 text-center">{dirLabel}</span>
        <ChevronDown size={11} className={cn('text-slate-400 transition-transform duration-150', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1.5 z-30 w-48 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg shadow-slate-900/10 dark:shadow-slate-900/40 overflow-hidden py-1"
          >
            {SORT_OPTIONS.map(o => {
              const isActive = sortBy === o.value;
              return (
                <div key={o.value}>
                  {(['asc', 'desc'] as const).map(dir => {
                    const isSelected = isActive && (dir === 'desc') === sortDesc;
                    return (
                      <button
                        key={dir}
                        onClick={() => { onChange(o.value, dir === 'desc'); setOpen(false); }}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-1.5 text-xs transition-colors',
                          isSelected
                            ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 font-semibold'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50',
                        )}
                      >
                        <span>{t(o.labelKey)}</span>
                        <span className={cn('tabular-nums', isSelected ? 'text-cyan-500' : 'text-slate-400')}>
                          {dir === 'asc' ? '↑' : '↓'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const PAGE_SIZES = [10, 20, 50];

// Columns: Name | Form | Selling Price | Quantity | Actions
const TABLE_COLS = 'grid-cols-[3fr_minmax(90px,1fr)_minmax(100px,1fr)_110px_56px]';

function StockBadge({ qty }: { qty: number }) {
  const cls =
    qty === 0  ? 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400' :
    qty <= 20  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-400';

  return (
    <div className="flex justify-center">
      <span className={cn(
        'inline-flex items-center justify-center min-w-11 h-6.5 px-2.5 rounded-full text-xs font-bold tabular-nums tracking-wide',
        cls,
      )}>
        {qty}
      </span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function MedicinesPage() {
  const { t } = useTranslation();
  const { get, set } = useUrlState();

  const search    = get('q');
  const form      = get('form');
  const sortBy    = (get('sort', 'quantity')) as MedicineSortBy;
  const sortDesc  = get('dir') === 'desc';
  const page      = Math.max(1, Number(get('page', '1')) || 1);
  const pageSize  = PAGE_SIZES.includes(Number(get('size', '20'))) ? Number(get('size', '20')) : 20;

  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => { setSearchInput(search); }, [search]);
  useEffect(() => {
    const timer = setTimeout(() => set({ q: searchInput || null }), 300);
    return () => clearTimeout(timer);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const [priceMed, setPriceMed] = useState<MedicineResponse | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);

  const { data, isLoading, isError } = useMedicines({ search, form, available: undefined, sortBy, sortDesc, page, pageSize });
  const { data: catalogueTotal } = useMedicinesTotalCount();

  const medicines  = data?.items ?? [];
  const total      = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function handleSort(field: MedicineSortBy) {
    if (sortBy === field) set({ sort: field, dir: sortDesc ? 'asc' : 'desc' });
    else set({ sort: field, dir: field === 'createdAt' ? 'desc' : 'asc' });
  }

  const chipCls = (active: boolean) => cn(
    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
    active
      ? 'bg-cyan-600 text-white'
      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
  );

  const thCls    = 'text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide select-none';
  const thBtnCls = 'flex items-center gap-0.5 hover:text-slate-600 dark:hover:text-slate-300 transition-colors';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('medicines.title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t('medicines.subtitle')}</p>
        </div>
        {catalogueTotal !== undefined && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-800/40 shrink-0 self-start mt-1">
            <Pill size={13} className="text-cyan-600 dark:text-cyan-400" />
            <span className="text-sm font-semibold text-cyan-700 dark:text-cyan-400 tabular-nums">
              {t('medicines.totalCount', { count: catalogueTotal })}
            </span>
          </div>
        )}
      </div>

      {/* Toolbar card */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 shadow-sm">
        {/* Row 1 — search + sort */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700/60">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder={t('medicines.searchPlaceholder')}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:bg-white dark:focus:bg-slate-900 transition"
            />
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 shrink-0">
              <ArrowUpDown size={12} />
              {t('medicines.sortBy')}
            </span>
            <SortDropdown
              sortBy={sortBy}
              sortDesc={sortDesc}
              onChange={(field, desc) => set({ sort: field, dir: desc ? 'desc' : 'asc' })}
            />
          </div>
        </div>

        {/* Row 2 — form filter chips */}
        <div className="flex flex-wrap items-center gap-1.5 px-4 py-2.5">
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 mr-1">{t('medicines.form')}</span>
          <button onClick={() => set({ form: null })} className={chipCls(!form)}>
            {t('medicines.filterAll')}
          </button>
          {MEDICINE_FORM_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => set({ form: form === String(o.value) ? null : String(o.value) })}
              className={chipCls(form === String(o.value))}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Skeleton */}
      {isLoading && (
        <div className="animate-pulse rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 overflow-hidden">
          {Array.from({ length: pageSize > 10 ? 8 : 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-slate-100 dark:border-slate-700/40 last:border-0">
              <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-3 w-52 bg-slate-100 dark:bg-slate-700/60 rounded" />
              </div>
              <div className="flex gap-2">
                <div className="h-6 w-16 bg-slate-100 dark:bg-slate-700/60 rounded-lg" />
                <div className="h-6 w-10 bg-slate-100 dark:bg-slate-700/60 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {isError && !isLoading && (
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-10 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('common.error')}</p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && medicines.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-14 flex flex-col items-center gap-3 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 mb-1">
            <Pill size={24} className="text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t('medicines.noResults')}</p>
        </motion.div>
      )}

      {/* Table */}
      {!isLoading && !isError && medicines.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}
          className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 shadow-sm overflow-hidden">

          <div className="overflow-x-auto w-full">
          <div className="min-w-170 w-full">

          {/* Column headers */}
          <div className={cn('grid gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700/60', TABLE_COLS)}>
            <button className={cn(thCls, thBtnCls)} onClick={() => handleSort('name')}>
              {t('medicines.table.name')}<SortIcon field="name" active={sortBy} desc={sortDesc} />
            </button>
            <span className={thCls}>{t('medicines.table.form')}</span>
            <button className={cn(thCls, thBtnCls)} onClick={() => handleSort('price')}>
              {t('medicines.table.sellingPrice')}<SortIcon field="price" active={sortBy} desc={sortDesc} />
            </button>
            <button className={cn(thCls, thBtnCls, 'justify-center w-full')} onClick={() => handleSort('quantity')}>
              {t('medicines.table.quantity')}<SortIcon field="quantity" active={sortBy} desc={sortDesc} />
            </button>
            <span className={thCls}>{t('medicines.table.actions')}</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {medicines.map((med, i) => (
              <motion.div key={med.id}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ duration: 0.1, delay: i * 0.015 }}
                className={cn('grid gap-3 items-center px-4 py-2.5 hover:bg-slate-50/60 dark:hover:bg-slate-700/20 transition-colors cursor-pointer', TABLE_COLS)}
                onClick={() => setDrawerId(med.id)}
              >
                {/* Name */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 shrink-0">
                    <Pill size={13} className="text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-snug">
                      {med.name}
                    </p>
                    {(med.genericName || med.manufacturer || med.strength) && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate leading-snug mt-0.5">
                        {[
                          med.genericName,
                          med.manufacturer,
                          med.strength ? `${med.strength} ${med.unit}` : null,
                        ].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Form */}
                <div>
                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold',
                    MEDICINE_FORM_BADGE[med.form] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300')}>
                    {med.form}
                  </span>
                </div>

                {/* Selling Price */}
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                  {fmt(med.sellingPrice)}
                </span>

                {/* Stock Quantity */}
                <StockBadge qty={med.stockQuantity ?? 0} />

                {/* Actions */}
                <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setDrawerId(med.id)}
                    className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors"
                    title={t('medicines.drawer.title')}
                  >
                    <Eye size={13} />
                  </button>
                  <button
                    onClick={() => setPriceMed(med)}
                    className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors"
                    title={t('medicines.updatePrice')}
                  >
                    <Tag size={13} />
                  </button>
                </div>

              </motion.div>
            ))}
          </div>

          </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{t('medicines.pageSize')}:</span>
              {PAGE_SIZES.map(s => (
                <button key={s} onClick={() => set({ size: String(s), page: '1' })}
                  className={cn('px-2 py-0.5 rounded-md font-semibold transition-colors',
                    pageSize === s ? 'bg-cyan-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700')}>
                  {s}
                </button>
              ))}
              <span className="ml-2 font-medium text-slate-600 dark:text-slate-300">
                {t('medicines.totalCount', { count: total })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => set({ page: String(page - 1) })} disabled={page <= 1}
                className="flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 min-w-20 text-center">
                {page} / {totalPages}
              </span>
              <button onClick={() => set({ page: String(page + 1) })} disabled={page >= totalPages}
                className="flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {drawerId && (
          <DetailDrawer
            key="drawer"
            id={drawerId}
            onClose={() => setDrawerId(null)}
            onUpdatePrice={med => { setDrawerId(null); setPriceMed(med); }}
          />
        )}
        {priceMed && (
          <SellingPriceModal key="price" medicine={priceMed} onClose={() => setPriceMed(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
