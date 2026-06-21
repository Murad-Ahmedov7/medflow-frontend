import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Package, Truck, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../utils/cn';
import { fmt } from '../../utils/currency';
import { extractErrorMessage } from '../../utils/errorHandler';
import axiosInstance from '../../api/axiosInstance';
import { API_ENDPOINTS } from '../../api/config';
import type { ApiResult } from '../../types/api.types';
import type { StockItemResponse } from '../../types/supplier.types';
import { MEDICINE_FORM_BADGE } from '../../types/medicine.types';

function useHospitalStock() {
  return useQuery({
    queryKey: ['admin-hospital-stock'],
    queryFn: async () => {
      const res = await axiosInstance.get<ApiResult<StockItemResponse[]>>(API_ENDPOINTS.stock.base);
      return res.data.data ?? [];
    },
    staleTime: 30_000,
  });
}

function usePublishToMedicines() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (medicineId: string) =>
      axiosInstance.patch<ApiResult<boolean>>(API_ENDPOINTS.stock.publish(medicineId)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-hospital-stock'] });
      qc.invalidateQueries({ queryKey: ['admin-medicines'] });
    },
  });
}

// 7 columns: Medicine | Form | Strength | Cost | Selling | Supplier | Qty | Action
const TABLE_COLS = 'grid-cols-[2fr_minmax(100px,0.75fr)_minmax(110px,0.8fr)_90px_90px_minmax(120px,0.9fr)_100px_minmax(140px,1fr)]';

export function HospitalStockPage() {
  const { t } = useTranslation();
  const { data: items = [], isLoading, isError } = useHospitalStock();
  const { mutate: publish, isPending: publishing } = usePublishToMedicines();

  function handlePublish(item: StockItemResponse) {
    publish(item.medicineId, {
      onSuccess: () => toast.success(t('stock.publishSuccess')),
      onError: (e) => toast.error(extractErrorMessage(e) || t('stock.publishError')),
    });
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      >
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('stock.title')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t('stock.subtitle')}</p>
      </motion.div>

      {/* Table card */}
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
            t('stock.table.medicine'),
            t('stock.table.form'),
            t('stock.table.strength'),
            t('stock.table.costPrice'),
            t('stock.table.sellingPrice'),
            t('stock.table.sourceSupplier'),
            t('stock.table.quantity'),
            t('stock.publish'),
          ].map((h, i) => (
            <span key={i} className={cn(
              'text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide',
              i === 6 && 'text-center',
            )}>
              {h}
            </span>
          ))}
        </div>

        {/* Loading skeletons */}
        {isLoading && (
          <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={cn('grid gap-3 px-5 py-3.5 animate-pulse', TABLE_COLS)}>
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-2/3" />
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-2/3" />
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/3 ml-auto" />
                <div className="h-7 bg-slate-100 dark:bg-slate-800 rounded-lg w-full" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="p-10 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('common.error')}</p>
          </div>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800">
              <Package size={22} className="text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t('stock.noResults')}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center max-w-xs">{t('stock.noResultsDesc')}</p>
          </div>
        )}

        {!isLoading && !isError && items.length > 0 && (
          <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
            {items.map((item, idx) => (
              <motion.div
                key={item.medicineId}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.025, duration: 0.2 }}
                className={cn('grid gap-3 px-5 py-3.5 items-center hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors', TABLE_COLS)}
              >
                {/* Medicine name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 shrink-0">
                    <Package size={15} className="text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{item.medicineName}</span>
                </div>

                {/* Form badge */}
                <div>
                  <span className={cn(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    MEDICINE_FORM_BADGE[item.medicineForm] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                  )}>
                    {item.medicineForm}
                  </span>
                </div>

                {/* Strength */}
                <span className="text-sm text-slate-600 dark:text-slate-300 truncate">
                  {item.medicineStrength ?? '—'}
                </span>

                {/* Cost price */}
                <span className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                  {item.costPrice > 0 ? fmt(item.costPrice) : '—'}
                </span>

                {/* Selling price */}
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                  {item.sellingPrice > 0 ? fmt(item.sellingPrice) : '—'}
                </span>

                {/* Source supplier */}
                <div>
                  {item.lastSupplierName ? (
                    <div className="flex items-center gap-1.5">
                      <Truck size={13} className="text-slate-400 shrink-0" />
                      <span className="text-sm text-slate-600 dark:text-slate-300 truncate">{item.lastSupplierName}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-300 dark:text-slate-600">—</span>
                  )}
                </div>

                {/* Qty */}
                <div className="flex justify-center">
                  <span className={cn(
                    'inline-flex items-center justify-center min-w-10 px-2.5 py-1 rounded-lg text-sm font-bold tabular-nums',
                    item.quantityOnHand === 0
                      ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      : item.quantityOnHand <= 20
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
                  )}>
                    {item.quantityOnHand}
                  </span>
                </div>

                {/* Publish action — every row shown here is unpublished */}
                <div>
                  <button
                    onClick={() => handlePublish(item)}
                    disabled={publishing}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                      'bg-cyan-600 hover:bg-cyan-700 text-white disabled:opacity-60 disabled:cursor-not-allowed',
                    )}
                  >
                    <Upload size={12} className="shrink-0" />
                    {t('stock.publish')}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Total count footer */}
        {!isLoading && !isError && items.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {items.length} {t('stock.table.medicine').toLowerCase()}
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
