import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, Pill, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';
import axiosInstance from '../api/axiosInstance';
import { API_ENDPOINTS } from '../api/config';
import type { ApiListResult } from '../types/api.types';
import type { MedicineResponse } from '../types/medicine.types';
import { MEDICINE_FORM_OPTIONS, FORM_BADGE_COLOR } from '../types/medicine.types';

// ── URL state helper ──────────────────────────────────────────────────────────

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

// ── Data hook ─────────────────────────────────────────────────────────────────

const PAGE_SIZES = [10, 20, 50];

interface MedicinesQuery {
  search: string;
  form: string;
  page: number;
  pageSize: number;
}

function useMedicines(q: MedicinesQuery) {
  return useQuery({
    queryKey: ['doctor-medicines', q],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (q.search) p.set('search', q.search);
      if (q.form)   p.set('form', q.form);
      p.set('page',     String(q.page));
      p.set('pageSize', String(q.pageSize));
      const res = await axiosInstance.get<ApiListResult<MedicineResponse>>(
        `${API_ENDPOINTS.medicines.base}?${p.toString()}`,
      );
      return { items: res.data.data ?? [], total: res.data.pagedTotalCount ?? 0 };
    },
    staleTime: 60_000,
    placeholderData: prev => prev,
  });
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function MedicineSkeleton({ rows }: { rows: number }) {
  return (
    <div className="animate-pulse rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 overflow-hidden">
      <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-3 w-64 bg-slate-100 dark:bg-slate-700/60 rounded" />
            </div>
            <div className="flex gap-2">
              <div className="h-6 w-16 bg-slate-100 dark:bg-slate-700/60 rounded-lg" />
              <div className="h-6 w-14 bg-slate-100 dark:bg-slate-700/60 rounded-lg" />
              <div className="h-6 w-20 bg-slate-100 dark:bg-slate-700/60 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function MedicinesPage() {
  const { t } = useTranslation();
  const { get, set } = useUrlState();

  const search   = get('q');
  const form     = get('form');
  const page     = Math.max(1, Number(get('page', '1')) || 1);
  const pageSize = PAGE_SIZES.includes(Number(get('size', '20'))) ? Number(get('size', '20')) : 20;

  // Debounced search
  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => { setSearchInput(search); }, [search]);
  useEffect(() => {
    const timer = setTimeout(() => set({ q: searchInput || null }), 300);
    return () => clearTimeout(timer);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading, isError } = useMedicines({ search, form, page, pageSize });
  const medicines  = data?.items ?? [];
  const total      = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const chipCls = (active: boolean) => cn(
    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
    active
      ? 'bg-cyan-600 text-white'
      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('medicines.title')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t('medicines.subtitle')}</p>
      </div>

      {/* Search + form filter chips */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder={t('medicines.searchPlaceholder')}
            className="pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition w-72"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => set({ form: null })} className={chipCls(!form)}>
            {t('medicines.filterAll')}
          </button>
          {MEDICINE_FORM_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => set({ form: form === o.value ? null : o.value })}
              className={chipCls(form === o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Skeleton */}
      {isLoading && <MedicineSkeleton rows={pageSize > 10 ? 8 : 5} />}

      {/* Error */}
      {isError && !isLoading && (
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-10 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('common.error')}</p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && medicines.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-14 flex flex-col items-center gap-3 text-center"
        >
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 mb-1">
            <Pill size={24} className="text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t('medicines.noResults')}</p>
          <p className="text-xs text-slate-400">{t('medicines.noResultsDesc')}</p>
        </motion.div>
      )}

      {/* List */}
      {!isLoading && !isError && medicines.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}
          className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 shadow-sm overflow-hidden"
        >
          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {medicines.map((med, i) => (
              <motion.div
                key={med.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.12, delay: i * 0.015 }}
                className="flex items-center gap-4 px-5 py-4"
              >
                {/* Icon */}
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 shrink-0">
                  <Pill size={16} className="text-cyan-600 dark:text-cyan-400" />
                </div>

                {/* Name + generic + manufacturer */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{med.name}</p>
                  {med.genericName && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{med.genericName}</p>
                  )}
                  {med.manufacturer && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{med.manufacturer}</p>
                  )}
                  {!med.genericName && !med.manufacturer && med.strength && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{med.strength}</p>
                  )}
                </div>

                {/* Strength (show as separate pill when we have generic/manufacturer) */}
                {med.strength && (med.genericName || med.manufacturer) && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{med.strength}</span>
                )}

                {/* Form badge */}
                <span className={cn(
                  'inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold shrink-0',
                  FORM_BADGE_COLOR[med.form] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
                )}>
                  {med.form}
                </span>

                {/* Unit badge */}
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                  {med.unit}
                </span>

                {/* Availability badge (read-only, no toggle) */}
                <span className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold shrink-0',
                  med.isAvailableInHospital
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400',
                )}>
                  <Building2 size={11} />
                  {med.isAvailableInHospital ? t('medicines.availableInHospital') : t('medicines.unavailableInHospital')}
                </span>

                {/* Price */}
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular-nums shrink-0">
                  ₼{med.sellingPrice.toFixed(2)}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Pagination footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{t('medicines.pageSize')}:</span>
              {PAGE_SIZES.map(s => (
                <button
                  key={s}
                  onClick={() => set({ size: String(s), page: '1' })}
                  className={cn(
                    'px-2 py-0.5 rounded-md font-semibold transition-colors',
                    pageSize === s ? 'bg-cyan-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700',
                  )}
                >
                  {s}
                </button>
              ))}
              <span className="ml-2 tabular-nums">{total}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => set({ page: String(page - 1) })}
                disabled={page <= 1}
                className="flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 min-w-20 text-center">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => set({ page: String(page + 1) })}
                disabled={page >= totalPages}
                className="flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
