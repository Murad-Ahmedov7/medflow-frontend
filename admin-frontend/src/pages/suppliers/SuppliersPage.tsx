import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Truck, BookOpen, Mail, Phone } from 'lucide-react';
import { cn } from '../../utils/cn';
import axiosInstance from '../../api/axiosInstance';
import { API_ENDPOINTS } from '../../api/config';
import type { ApiListResult } from '../../types/api.types';
import type { SupplierResponse } from '../../types/supplier.types';

function useSuppliers() {
  return useQuery({
    queryKey: ['admin-suppliers'],
    queryFn: async () => {
      const res = await axiosInstance.get<ApiListResult<SupplierResponse>>(
        `${API_ENDPOINTS.suppliers.base}?pageSize=50`,
      );
      return res.data.data ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

export function SuppliersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: suppliers = [], isLoading, isError } = useSuppliers();

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      >
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('suppliers.title')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t('suppliers.subtitle')}</p>
      </motion.div>

      {/* Supplier cards */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800" />
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-2/3" />
              </div>
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
              <div className="h-9 bg-slate-100 dark:bg-slate-800 rounded-xl w-full mt-2" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="p-10 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('common.error')}</p>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((s, idx) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.07, duration: 0.25 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 flex flex-col gap-3"
            >
              {/* Name row */}
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 shrink-0">
                  <Truck size={18} className="text-cyan-600 dark:text-cyan-400" />
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{s.name}</p>
              </div>

              {/* Contact info */}
              <div className="space-y-1.5">
                {s.contactEmail && (
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail size={13} className="text-slate-400 shrink-0" />
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{s.contactEmail}</span>
                  </div>
                )}
                {s.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-slate-400 shrink-0" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">{s.phone}</span>
                  </div>
                )}
              </div>

              {/* CTA */}
              <button
                onClick={() => navigate(`/suppliers/${s.id}/catalogue`)}
                className={cn(
                  'mt-auto flex items-center justify-center gap-2 w-full py-2.5 rounded-xl',
                  'bg-slate-50 dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-900/20',
                  'text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400',
                  'border border-slate-200 dark:border-slate-700 hover:border-cyan-200 dark:hover:border-cyan-800',
                  'transition-colors',
                )}
              >
                <BookOpen size={15} />
                {t('suppliers.viewCatalogue')}
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
