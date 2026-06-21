import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ClipboardList, X, Calendar, User, Stethoscope } from 'lucide-react';
import { cn } from '../../utils/cn';
import axiosInstance from '../../api/axiosInstance';
import { API_ENDPOINTS } from '../../api/config';
import type { ApiListResult } from '../../types/api.types';
import type { PrescriptionListItem } from '../../types/prescription.types';

// ── Query ──────────────────────────────────────────────────────────────────────

function usePrescriptions() {
  return useQuery({
    queryKey: ['admin-prescriptions'],
    queryFn: async () => {
      const res = await axiosInstance.get<ApiListResult<PrescriptionListItem>>(API_ENDPOINTS.prescriptions.base);
      return res.data.data ?? [];
    },
    staleTime: 60_000,
  });
}

// ── Detail modal ──────────────────────────────────────────────────────────────

function PrescriptionDetailModal({
  prescription,
  onClose,
}: {
  prescription: PrescriptionListItem;
  onClose: () => void;
}) {
  const { t } = useTranslation();

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
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('prescriptions.modalTitle')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{prescription.title}</p>
          </div>
          <button onClick={onClose} className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors shrink-0 ml-3">
            <X size={14} />
          </button>
        </div>

        {/* Context info */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <User size={12} className="text-slate-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide font-semibold">{t('prescriptions.patient')}</p>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{prescription.patientFullName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Stethoscope size={12} className="text-slate-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide font-semibold">{t('prescriptions.doctor')}</p>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{prescription.doctorFullName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={12} className="text-slate-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide font-semibold">{t('prescriptions.date')}</p>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{prescription.appointmentDate ?? t('prescriptions.na')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-5">
          {prescription.prescriptionItems.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 italic text-center py-6">{t('prescriptions.items')}: 0</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                    <th className="text-left px-3 py-2.5 font-semibold">{t('prescriptions.medicine')}</th>
                    <th className="text-left px-3 py-2.5 font-semibold">{t('prescriptions.dose')}</th>
                    <th className="text-left px-3 py-2.5 font-semibold">{t('prescriptions.frequency')}</th>
                    <th className="text-left px-3 py-2.5 font-semibold">{t('prescriptions.duration')}</th>
                    <th className="text-left px-3 py-2.5 font-semibold">{t('prescriptions.usageInstruction')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {prescription.prescriptionItems.map(item => (
                    <tr key={item.id} className="text-slate-700 dark:text-slate-200">
                      <td className="px-3 py-2.5 font-medium">{item.medicineName}</td>
                      <td className="px-3 py-2.5">{item.dose} mg</td>
                      <td className="px-3 py-2.5">{item.frequency}×/day</td>
                      <td className="px-3 py-2.5">{item.durationInDays}d</td>
                      <td className="px-3 py-2.5 text-slate-400 dark:text-slate-500">{item.usageInstruction || t('prescriptions.na')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function PrescriptionsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PrescriptionListItem | null>(null);

  const { data: prescriptions = [], isLoading, isError } = usePrescriptions();

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return prescriptions;
    return prescriptions.filter(p =>
      p.patientFullName.toLowerCase().includes(q) ||
      p.doctorFullName.toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q),
    );
  }, [prescriptions, search]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('prescriptions.title')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t('prescriptions.subtitle')}</p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('prescriptions.searchPlaceholder')}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition"
        />
      </div>

      {/* Skeleton */}
      {isLoading && (
        <div className="animate-pulse rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-slate-100 dark:border-slate-700/60 last:border-0">
              <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-3 w-64 bg-slate-100 dark:bg-slate-700/60 rounded" />
              </div>
              <div className="h-7 w-20 bg-slate-100 dark:bg-slate-700/60 rounded-lg" />
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
      {!isLoading && !isError && filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-14 flex flex-col items-center gap-3 text-center"
        >
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 mb-1">
            <ClipboardList size={24} className="text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t('prescriptions.noResults')}</p>
        </motion.div>
      )}

      {/* List */}
      {!isLoading && !isError && filtered.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}
          className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 shadow-sm overflow-hidden"
        >
          {/* Column headers */}
          <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-4 px-5 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700/60 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
            <span>{t('prescriptions.prescriptionTitle')}</span>
            <span>{t('prescriptions.patient')}</span>
            <span>{t('prescriptions.doctor')}</span>
            <span>{t('prescriptions.date')}</span>
            <span>{t('prescriptions.items')}</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {filtered.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.12, delay: i * 0.02 }}
                className="flex sm:grid sm:grid-cols-[1fr_1fr_1fr_auto_auto] gap-4 items-center px-5 py-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-900/20 shrink-0">
                    <ClipboardList size={14} className="text-violet-600 dark:text-violet-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{p.title}</p>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 truncate hidden sm:block">{p.patientFullName}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 truncate hidden sm:block">{p.doctorFullName}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 shrink-0 hidden sm:block">{p.appointmentDate ?? '—'}</p>
                <button
                  onClick={() => setSelected(p)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600',
                    'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700',
                    'text-xs font-semibold transition-colors shrink-0 whitespace-nowrap ml-auto sm:ml-0',
                  )}
                >
                  {t('prescriptions.viewDetail')}
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Detail modal */}
      <AnimatePresence>
        {selected && (
          <PrescriptionDetailModal
            key="detail"
            prescription={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
