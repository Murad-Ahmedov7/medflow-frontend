import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, CalendarDays, Stethoscope, ChevronDown, FileText, ShoppingCart, Pill } from 'lucide-react';
import { cn } from '../utils/cn';
import { API_BASE_URL, API_ENDPOINTS } from '../api/config';
import axiosInstance from '../api/axiosInstance';
import type { ApiListResult, ApiResult } from '../types/api.types';
import type { PharmacyOrderListResponse, PharmacyOrderStatus, PharmacyOrderResponse } from '../types/medical-record.types';
import { MedicalRecordContent } from '../components/ui/MedicalRecordContent';

// ── Types ──────────────────────────────────────────────────────────────────────

interface MyAppointment {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorImageUrl: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  appointmentType: string;
  status: string;
  examinationId?: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtTime(t: string) { return t?.slice(0, 5) ?? ''; }

function avatarUrl(doctorId: string) {
  const n = (parseInt(doctorId.replace(/-/g, '').slice(0, 8), 16) % 70) + 1;
  const g = parseInt(doctorId.replace(/-/g, '').slice(8, 10), 16) % 2 === 0 ? 'men' : 'women';
  return `https://randomuser.me/api/portraits/${g}/${n}.jpg`;
}

const LOCALE_MAP: Record<string, string> = { en: 'en-GB', az: 'az-AZ', ru: 'ru-RU' };

function fmtDate(iso: string, lang: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(LOCALE_MAP[lang] ?? lang, {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ── Data hooks ─────────────────────────────────────────────────────────────────

function useMyAppointments() {
  return useQuery<MyAppointment[]>({
    queryKey: ['my-appointments'],
    queryFn: async () => {
      const res = await axiosInstance.get<ApiListResult<MyAppointment>>(API_ENDPOINTS.appointments.my);
      if (!res.data.isSuccess) throw new Error(res.data.errors?.[0] ?? 'Failed');
      return res.data.data ?? [];
    },
    staleTime: 60_000,
  });
}

function useMyPharmacyOrders() {
  return useQuery({
    queryKey: ['my-pharmacy-orders'],
    queryFn: async () => {
      const res = await axiosInstance.get<ApiResult<PharmacyOrderListResponse>>(
        `${API_ENDPOINTS.pharmacyOrders.my}?page=1&pageSize=20`,
      );
      return res.data.data?.items ?? [];
    },
    staleTime: 30_000,
  });
}

const PHARMACY_STATUS_STYLES: Record<PharmacyOrderStatus, string> = {
  Pending:   'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  Preparing: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  Ready:     'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400',
  Delivered: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  Cancelled: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400',
};

// ── Record card ────────────────────────────────────────────────────────────────

function RecordCard({ appt, index }: { appt: MyAppointment; index: number }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const imgSrc = appt.doctorImageUrl
    ? (appt.doctorImageUrl.startsWith('http') ? appt.doctorImageUrl : `${API_BASE_URL}${appt.doctorImageUrl}`)
    : avatarUrl(appt.doctorId);

  const typeLabel = appt.appointmentType === 'FirstVisit'
    ? t('healthRecords.firstVisit')
    : t('healthRecords.followUp');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.06, ease: 'easeOut' }}
      className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 shadow-sm overflow-hidden"
    >
      {/* Card header — always visible, click to expand */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors"
      >
        {/* Doctor avatar */}
        <img
          src={imgSrc}
          alt={appt.doctorName}
          className="w-11 h-11 rounded-xl object-cover shrink-0 ring-1 ring-slate-100 dark:ring-slate-700"
        />

        {/* Doctor + date info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
            {appt.doctorName}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
            <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <CalendarDays size={11} className="shrink-0" />
              {fmtDate(appt.appointmentDate, i18n.language)}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
              {fmtTime(appt.startTime)} – {fmtTime(appt.endTime)}
            </span>
          </div>
          <span className={cn(
            'inline-flex items-center mt-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide',
            appt.appointmentType === 'FirstVisit'
              ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400'
              : 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400',
          )}>
            {typeLabel}
          </span>
        </div>

        {/* Expand chevron */}
        <ChevronDown
          size={16}
          className={cn(
            'shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {/* Expandable detail */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden border-t border-slate-100 dark:border-slate-700/60"
          >
            <MedicalRecordContent examinationId={appt.examinationId!} className="px-5 pb-5 pt-1" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function RecordSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-5 flex gap-4 animate-pulse">
          <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3 w-56 bg-slate-100 dark:bg-slate-700/60 rounded" />
            <div className="h-4 w-16 bg-slate-100 dark:bg-slate-700/60 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Pharmacy order row ───────────────────────────────────────────────────────────

function PharmacyOrderRow({ order }: { order: PharmacyOrderResponse }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const typeLabel = order.appointmentType === 'FirstVisit'
    ? t('healthRecords.firstVisit')
    : t('healthRecords.followUp');

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-50 dark:bg-violet-900/20 shrink-0">
          <Pill size={14} className="text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          {/* Primary identifier: which consultation this order came from */}
          {order.doctorName ? (
            <>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                {order.doctorName}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                {order.appointmentType && (
                  <span className={cn(
                    'inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide',
                    order.appointmentType === 'FirstVisit'
                      ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400'
                      : 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400',
                  )}>
                    {typeLabel}
                  </span>
                )}
                {order.appointmentDate && (
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {fmtDate(order.appointmentDate, i18n.language)}
                  </span>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
              {new Date(order.createdAt).toLocaleDateString()}
            </p>
          )}
          {/* Secondary line: medicine count + price */}
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            {t('pharmacy.medicineCount', { count: order.medicineCount })} · ${order.totalPrice.toFixed(2)}
          </p>
        </div>
        <span className={cn(
          'shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg',
          PHARMACY_STATUS_STYLES[order.status],
        )}>
          {t(`pharmacy.statuses.${order.status}`)}
        </span>
        <ChevronDown
          size={14}
          className={cn('shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-3.5 pl-16 space-y-1">
              {order.items.map((line, i) => (
                <p key={i} className="text-xs text-slate-500 dark:text-slate-400">
                  {line.medicineName} × {line.quantity}
                </p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function HealthRecordsPage() {
  const { t } = useTranslation();
  const { data: appointments = [], isLoading, isError } = useMyAppointments();
  const { data: pharmacyOrders = [] } = useMyPharmacyOrders();

  // Only completed appointments that have a medical record
  const records = appointments
    .filter(a => a.status === 'Completed' && !!a.examinationId)
    .sort((a, b) => b.appointmentDate.localeCompare(a.appointmentDate) || b.startTime.localeCompare(a.startTime));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* Page header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 pt-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-900/20">
                <FileText size={18} className="text-violet-600 dark:text-violet-400" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('healthRecords.pageTitle')}</h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 ml-12">{t('healthRecords.pageSubtitle')}</p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {isLoading && <RecordSkeleton />}

        {isError && !isLoading && (
          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-10 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('common.error')}</p>
          </div>
        )}

        {!isLoading && !isError && records.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 shadow-sm p-14 flex flex-col items-center gap-4 text-center"
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700/50 mb-2">
              <ClipboardList size={28} className="text-slate-300 dark:text-slate-600" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">{t('healthRecords.empty')}</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xs">{t('healthRecords.emptyDesc')}</p>
            </div>
            <Link
              to="/doctors"
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold transition-colors"
            >
              <Stethoscope size={15} />
              {t('appointments.browseDoctors')}
            </Link>
          </motion.div>
        )}

        {!isLoading && !isError && records.length > 0 && (
          <div className="space-y-3">
            {records.map((appt, i) => (
              <RecordCard key={appt.id} appt={appt} index={i} />
            ))}
          </div>
        )}

        {/* Pharmacy orders */}
        {pharmacyOrders.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-900/20">
                <ShoppingCart size={16} className="text-violet-600 dark:text-violet-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('pharmacy.myOrders')}</h2>
            </div>
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 shadow-sm divide-y divide-slate-50 dark:divide-slate-700/60">
              {pharmacyOrders.map((order) => (
                <PharmacyOrderRow key={order.id} order={order} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
