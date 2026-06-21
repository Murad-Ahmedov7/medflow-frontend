import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  CalendarDays, Clock, Stethoscope, CheckCircle2,
  Hourglass, RotateCcw, XCircle, Ban, Info,
  ArrowRight, CircleDot, CircleX, MessageCircle, ClipboardList, X,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { API_BASE_URL, API_ENDPOINTS } from '../api/config';
import axiosInstance from '../api/axiosInstance';
import { extractErrorMessage } from '../utils/errorHandler';
import type { ApiListResult, ApiResult } from '../types/api.types';
import { MedicalRecordContent } from '../components/ui/MedicalRecordContent';
import {
  MiniCalendar, TimeSlotGrid, SlotSkeleton, FullyBookedBanner,
  todayIso as todayStr, fmtTime,
} from '../components/ui/BookingCalendar';
import { useRefundStore } from '../store/refundStore';

// ── Types ──────────────────────────────────────────────────────────────────────

interface MyAppointment {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorImageUrl: string;
  appointmentDate: string;  // "YYYY-MM-DD"
  startTime: string;        // "HH:mm:ss"
  endTime: string;
  appointmentType: string;
  status: string;           // 'Waiting' | 'InProgress' | 'Completed' | 'Cancelled'
  cancellationReason?: string | null;
  chatId?: string;
  examinationId?: string | null;
}

interface DoctorSchedule {
  id: string;
  doctorId: string;
  dayOfWeek: number; // 1=Mon..7=Sun
  startTime: string;
  endTime: string;
}

interface SlotItem {
  start: string;
  end: string;
  isAvailable: boolean;
}

interface AvailableSlotsResponse {
  doctorId: string;
  date: string;
  slots: SlotItem[];
}

type TabKey = 'upcoming' | 'past';

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDateLong(iso: string, locale: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(locale, {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });
}

const DOW_TO_JS: Record<number, number> = { 1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:0 };

function isUpcoming(appt: MyAppointment): boolean {
  if (appt.status === 'Completed' || appt.status === 'Cancelled') return false;
  const today = todayStr();
  if (appt.appointmentDate > today) return true;
  if (appt.appointmentDate < today) return false;
  return appt.status === 'Waiting' || appt.status === 'InProgress';
}

// Same rule as backend: status=Waiting AND ≥24 h before start
function isActionable(appt: MyAppointment): boolean {
  if (appt.status !== 'Waiting') return false;
  const dt = new Date(`${appt.appointmentDate}T${appt.startTime}`);
  return (dt.getTime() - Date.now()) / 3_600_000 >= 24;
}

function avatarUrl(doctorId: string) {
  const n = (parseInt(doctorId.replace(/-/g, '').slice(0, 8), 16) % 70) + 1;
  const g = parseInt(doctorId.replace(/-/g, '').slice(8, 10), 16) % 2 === 0 ? 'men' : 'women';
  return `https://randomuser.me/api/portraits/${g}/${n}.jpg`;
}

// Per-status visual config — color scheme, icon, border, bar background
const STATUS_CONFIG = {
  Waiting: {
    bar:    'bg-amber-50 dark:bg-amber-900/15 border-b border-amber-100 dark:border-amber-800/30',
    icon:   <Hourglass size={13} className="text-amber-500 dark:text-amber-400 shrink-0" />,
    text:   'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800/50',
    dot:    null,
  },
  InProgress: {
    bar:    'bg-blue-50 dark:bg-blue-900/15 border-b border-blue-100 dark:border-blue-800/30',
    icon:   <CircleDot size={13} className="text-blue-500 dark:text-blue-400 shrink-0" />,
    text:   'text-blue-700 dark:text-blue-400',
    border: 'border-blue-300 dark:border-blue-700/60',
    dot:    true, // animated pulse
  },
  Completed: {
    bar:    'bg-emerald-50 dark:bg-emerald-900/10 border-b border-emerald-100 dark:border-emerald-800/20',
    icon:   <CheckCircle2 size={13} className="text-emerald-500 dark:text-emerald-400 shrink-0" />,
    text:   'text-emerald-700 dark:text-emerald-400',
    border: 'border-slate-100 dark:border-slate-700/60',
    dot:    null,
  },
  Cancelled: {
    bar:    'bg-rose-50 dark:bg-rose-900/10 border-b border-rose-100 dark:border-rose-800/20',
    icon:   <CircleX size={13} className="text-rose-400 dark:text-rose-500 shrink-0" />,
    text:   'text-rose-600 dark:text-rose-400',
    border: 'border-slate-100 dark:border-slate-700/60',
    dot:    null,
  },
} as const;

function waitingLabel(appointmentDate: string, t: (k: string, opts?: Record<string, unknown>) => string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const appt = new Date(appointmentDate + 'T00:00:00');
  appt.setHours(0, 0, 0, 0);
  const days = Math.round((appt.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return t('appointments.statusBarToday');
  if (days === 1) return t('appointments.statusBarTomorrow');
  if (days <= 7)  return t('appointments.statusBarInDays', { count: days });
  return t('appointments.statusBarWaiting');
}

function StatusBar({ status, appointmentDate, t }: {
  status: string;
  appointmentDate: string;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  if (!cfg) return null;

  const label = status === 'Waiting'
    ? waitingLabel(appointmentDate, t)
    : t(`appointments.statusBar${status}`);

  return (
    <div className={cn('flex items-center gap-2 px-5 py-2', cfg.bar)}>
      {cfg.dot && (
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
        </span>
      )}
      {!cfg.dot && cfg.icon}
      <span className={cn('text-xs font-semibold', cfg.text)}>
        {label}
      </span>
    </div>
  );
}

function typeBadge(type: string, t: (k: string) => string) {
  const label = type === 'FirstVisit' ? t('appointments.firstVisit') : t('appointments.followUp');
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600/50">
      {label}
    </span>
  );
}

// ── Medical record modal ───────────────────────────────────────────────────────

function MedicalRecordModal({
  examinationId,
  onClose,
}: {
  examinationId: string;
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
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <ClipboardList size={16} className="text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('medicalRecord.title')}</h3>
          </div>
          <button onClick={onClose} className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <MedicalRecordContent examinationId={examinationId} />
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {t('medicalRecord.close')}
          </button>
        </div>
      </motion.div>
    </div>
  );
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

function useDoctorSchedules(doctorId: string) {
  return useQuery<DoctorSchedule[]>({
    queryKey: ['doctor-schedules', doctorId],
    queryFn: async () => {
      const res = await axiosInstance.get<ApiListResult<DoctorSchedule>>(API_ENDPOINTS.doctors.schedules(doctorId));
      return res.data.data ?? [];
    },
    staleTime: 10 * 60_000,
  });
}

function useAvailableSlots(doctorId: string, date: string | null, enabled: boolean) {
  return useQuery<AvailableSlotsResponse | null>({
    queryKey: ['available-slots', doctorId, date],
    queryFn: async () => {
      if (!date) return null;
      const res = await axiosInstance.get<ApiResult<AvailableSlotsResponse>>(
        API_ENDPOINTS.appointments.availableSlots,
        { params: { doctorId, date, slotMinutes: 30 } },
      );
      return res.data.data ?? null;
    },
    enabled: enabled && !!doctorId && !!date,
    staleTime: 60_000,
  });
}

// ── Reschedule panel ───────────────────────────────────────────────────────────

function ReschedulePanel({
  appt,
  onClose,
  t,
  locale,
}: {
  appt: MyAppointment;
  onClose: () => void;
  t: (k: string) => string;
  locale: string;
}) {
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [fullyBookedDates, setFullyBookedDates] = useState<Set<string>>(new Set());

  const { data: schedules = [] } = useDoctorSchedules(appt.doctorId);
  const workingDays = new Set(
    schedules.map(s => DOW_TO_JS[s.dayOfWeek] ?? -1).filter(d => d >= 0),
  );

  const { data: slotsData, isLoading: slotsLoading } = useAvailableSlots(
    appt.doctorId, selectedDate, !!selectedDate,
  );

  const slots = slotsData?.slots ?? [];
  const isFullyBooked = !slotsLoading && !!slotsData && slots.length > 0 && slots.every(s => !s.isAvailable);

  useEffect(() => {
    if (!slotsLoading && slotsData && selectedDate) {
      const allTaken = slotsData.slots.length > 0 && slotsData.slots.every(s => !s.isAvailable);
      if (allTaken) {
        setFullyBookedDates(prev => prev.has(selectedDate) ? prev : new Set(prev).add(selectedDate));
      }
    }
  }, [slotsLoading, slotsData, selectedDate]);

  const { mutate: doReschedule, isPending } = useMutation({
    mutationFn: async () => {
      if (!selectedDate || !selectedSlot) throw new Error('Select a date and time.');
      const slot = slots.find(s => s.start === selectedSlot);
      if (!slot) throw new Error('Slot not found.');
      await axiosInstance.patch(API_ENDPOINTS.appointments.reschedule(appt.id), {
        newDate:      selectedDate,
        newStartTime: selectedSlot,
        newEndTime:   slot.end,
      });
    },
    onSuccess: () => {
      toast.success(t('appointments.rescheduleSuccess'));
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
      onClose();
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err) || t('appointments.rescheduleError'));
    },
  });

  return (
    <div className="mt-4 py-4 px-4 border-t border-slate-100 dark:border-slate-700/60 space-y-4">
      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
        {t('appointments.rescheduleTitle')}
      </p>

      {/* Calendar */}
      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
          <CalendarDays size={12} />
          {t('booking.selectDate')}
        </p>
        {workingDays.size > 0 ? (
          <MiniCalendar
            workingDays={workingDays}
            selected={selectedDate}
            onSelect={(iso) => { setSelectedDate(iso); setSelectedSlot(null); }}
            fullyBookedDates={fullyBookedDates}
          />
        ) : (
          <p className="text-xs text-slate-400 dark:text-slate-500">{t('booking.noSchedule')}</p>
        )}
      </div>

      {/* Time slots */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Clock size={15} className="text-cyan-500" />
              {t('booking.selectSlot')}
              {slotsData && (
                <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                  {fmtDateLong(selectedDate, locale)}
                </span>
              )}
            </h3>
            <div className="rounded-2xl border border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-800 shadow-sm p-4">
              {slotsLoading ? (
                <SlotSkeleton />
              ) : isFullyBooked ? (
                <FullyBookedBanner t={t} />
              ) : (
                <TimeSlotGrid
                  slots={slots}
                  selected={selectedSlot}
                  onSelect={setSelectedSlot}
                  t={t}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm row */}
      <div className="flex gap-2">
        <button
          onClick={onClose}
          disabled={isPending}
          className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors disabled:opacity-50"
        >
          {t('common.cancel')}
        </button>
        <button
          disabled={!selectedDate || !selectedSlot || isPending}
          onClick={() => doReschedule()}
          className="flex-1 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
        >
          {isPending ? t('appointments.rescheduling') : t('appointments.rescheduleConfirm')}
        </button>
      </div>
    </div>
  );
}

// ── Stats bar ──────────────────────────────────────────────────────────────────

function StatsBar({ appointments, t }: { appointments: MyAppointment[]; t: (k: string) => string }) {
  const total     = appointments.length;
  const upcoming  = appointments.filter(isUpcoming).length;
  const completed = appointments.filter(a => a.status === 'Completed').length;

  const stats = [
    { label: t('appointments.statsTotal'),     value: total,     icon: CalendarDays, color: 'text-cyan-600 dark:text-cyan-400',     bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
    { label: t('appointments.statsUpcoming'),  value: upcoming,  icon: Hourglass,    color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: t('appointments.statsCompleted'), value: completed, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: i * 0.07, ease: 'easeOut' }}
          className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 shadow-sm p-4 flex flex-col items-center gap-1.5"
        >
          <div className={cn('flex items-center justify-center w-8 h-8 rounded-xl', s.bg)}>
            <s.icon size={16} className={s.color} />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{s.value}</p>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 text-center leading-tight">{s.label}</p>
        </motion.div>
      ))}
    </div>
  );
}

// ── Rules card ─────────────────────────────────────────────────────────────────

function RulesCard({ t }: { t: (k: string) => string }) {
  const rules = t('appointments.rules', { returnObjects: true }) as string[];
  return (
    <div className="rounded-2xl border border-cyan-100 dark:border-cyan-800/40 bg-cyan-50/60 dark:bg-cyan-900/10 p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-100 dark:bg-cyan-800/40 shrink-0 mt-0.5">
          <Info size={14} className="text-cyan-600 dark:text-cyan-400" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 mb-2">
            {t('appointments.rulesTitle')}
          </p>
          <ul className="space-y-1">
            {Array.isArray(rules) && rules.map((rule, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <span className="mt-1.5 h-1 w-1 rounded-full bg-cyan-400 dark:bg-cyan-600 shrink-0" />
                {rule}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function AppointmentSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-5 flex gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3 w-24 bg-slate-100 dark:bg-slate-700/60 rounded" />
            <div className="h-3 w-32 bg-slate-100 dark:bg-slate-700/60 rounded" />
          </div>
          <div className="h-6 w-20 bg-slate-100 dark:bg-slate-700/60 rounded-lg self-start" />
        </div>
      ))}
    </div>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────────

type PanelMode = 'none' | 'cancel' | 'reschedule';

function AppointmentCard({ appt, index, tab, t, locale }: {
  appt: MyAppointment;
  index: number;
  tab: TabKey;
  t: (k: string) => string;
  locale: string;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [panel, setPanel] = useState<PanelMode>('none');
  const [showRecord, setShowRecord] = useState(false);

  const imgSrc = appt.doctorImageUrl
    ? (appt.doctorImageUrl.startsWith('http') ? appt.doctorImageUrl : `${API_BASE_URL}${appt.doctorImageUrl}`)
    : avatarUrl(appt.doctorId);

  const isCancelled = appt.status === 'Cancelled';
  const canAct      = isActionable(appt);

  const { mutate: cancelAppt, isPending: isCancelling } = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.delete<ApiResult<{ refunded: boolean; refundAmount: number; newBalance: number }>>(
        API_ENDPOINTS.appointments.cancel(appt.id),
      );
      if (!res.data.isSuccess) throw new Error(res.data.errors?.[0] ?? 'Failed');
      return res.data.data!;
    },
    onSuccess: (data) => {
      toast.success(t('appointments.cancelSuccess'));
      setPanel('none');
      queryClient.setQueryData<MyAppointment[]>(['my-appointments'], old =>
        old?.map(a => a.id === appt.id ? { ...a, status: 'Cancelled' } : a) ?? [],
      );
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });

      // Cancelling refunds the consultation fee charged at booking time — show the
      // same payment-success animation used for charges, just as a credit.
      if (data.refunded) {
        queryClient.invalidateQueries({ queryKey: ['patient-wallet-balance'] });
        useRefundStore.getState().setPendingRefund({
          amount: data.refundAmount,
          newBalance: data.newBalance,
        });
      }
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err) || t('appointments.cancelError'));
      setPanel('none');
    },
  });

  const borderCls = STATUS_CONFIG[appt.status as keyof typeof STATUS_CONFIG]?.border
    ?? 'border-slate-100 dark:border-slate-700/60';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.055, ease: 'easeOut' }}
      className={cn(
        'rounded-2xl bg-white dark:bg-slate-800 border shadow-sm transition-shadow hover:shadow-md overflow-hidden',
        borderCls,
        isCancelled && 'opacity-60',
      )}
    >
      {/* Status bar — full-width, color-coded */}
      <StatusBar status={appt.status} appointmentDate={appt.appointmentDate} t={t} />

      {/* Card body */}
      <div className="flex items-start gap-4 p-5">
        <img
          src={imgSrc}
          alt={appt.doctorName}
          className="w-12 h-12 rounded-xl object-cover shrink-0 ring-1 ring-slate-100 dark:ring-slate-700"
        />

        <div className="flex-1 min-w-0">
          {/* Doctor name */}
          <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight mb-2">
            {appt.doctorName}
          </p>

          {/* Meta row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <CalendarDays size={12} className="shrink-0" />
              <span>{fmtDateLong(appt.appointmentDate, locale)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Clock size={12} className="shrink-0" />
              <span>{fmtTime(appt.startTime)} – {fmtTime(appt.endTime)}</span>
            </div>
          </div>

          {/* Cancellation reason — only for Cancelled status */}
          {isCancelled && (
            <div className="flex items-start gap-2 mt-2.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-900/15 border border-rose-100 dark:border-rose-800/30">
              <CircleX size={13} className="text-rose-400 dark:text-rose-500 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                {appt.cancellationReason
                  ? <><span className="font-semibold">{t('appointments.cancellationReasonLabel')}: </span>{appt.cancellationReason}</>
                  : <span className="italic text-rose-500 dark:text-rose-400">{t('appointments.cancellationNoReason')}</span>
                }
              </p>
            </div>
          )}

          {/* Footer: type badge + actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
            {typeBadge(appt.appointmentType, t)}

            <div className="flex items-center gap-3 flex-wrap">
              <Link
                to={`/doctors/${appt.doctorId}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
              >
                {t('appointments.viewDoctor')}
                <ArrowRight size={11} />
              </Link>

              {appt.chatId && (appt.status === 'Waiting' || appt.status === 'InProgress') && (
                <button
                  onClick={() => navigate(`/chat?open=${appt.chatId}`)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
                >
                  <MessageCircle size={12} />
                  {t('appointments.openChat', 'Open Chat')}
                </button>
              )}

              {tab === 'past' && appt.status === 'Completed' && (
                <Link
                  to={`/doctors/${appt.doctorId}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
                >
                  <RotateCcw size={12} />
                  {t('appointments.bookFollowUp')}
                </Link>
              )}

              {appt.examinationId && (appt.status === 'Completed' || appt.status === 'InProgress') && (
                <button
                  onClick={() => setShowRecord(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                >
                  <ClipboardList size={12} />
                  {t('medicalRecord.viewRecord')}
                </button>
              )}

              {canAct && (
                <button
                  onClick={() => setPanel(p => p === 'reschedule' ? 'none' : 'reschedule')}
                  className={cn(
                    'inline-flex items-center gap-1.5 text-xs font-semibold transition-colors',
                    panel === 'reschedule'
                      ? 'text-slate-400 dark:text-slate-500'
                      : 'text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300',
                  )}
                >
                  <CalendarDays size={12} />
                  {t('appointments.reschedule')}
                </button>
              )}

              {canAct && (
                <button
                  onClick={() => setPanel(p => p === 'cancel' ? 'none' : 'cancel')}
                  className={cn(
                    'inline-flex items-center gap-1.5 text-xs font-semibold transition-colors',
                    panel === 'cancel'
                      ? 'text-slate-400 dark:text-slate-500'
                      : 'text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300',
                  )}
                >
                  <XCircle size={12} />
                  {t('appointments.cancel')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Inline panels */}
      <AnimatePresence>
        {/* Cancel confirmation */}
        {panel === 'cancel' && (
          <motion.div
            key="cancel-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-rose-100 dark:border-rose-900/40">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/20 shrink-0">
                  <Ban size={14} className="text-rose-500 dark:text-rose-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-0.5">
                    {t('appointments.cancelConfirmTitle')}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {t('appointments.cancelConfirmDesc')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPanel('none')}
                  disabled={isCancelling}
                  className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => cancelAppt()}
                  disabled={isCancelling}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors disabled:opacity-60"
                >
                  {isCancelling ? t('appointments.cancelling') : t('appointments.cancelConfirm')}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Reschedule panel */}
        {panel === 'reschedule' && (
          <motion.div
            key="reschedule-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <ReschedulePanel
              appt={appt}
              onClose={() => setPanel('none')}
              t={t}
              locale={locale}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Medical record modal */}
      <AnimatePresence>
        {showRecord && appt.examinationId && (
          <MedicalRecordModal
            key="medical-record"
            examinationId={appt.examinationId}
            onClose={() => setShowRecord(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function MyAppointmentsPage() {
  const { t, i18n } = useTranslation();
  const { data: appointments = [], isLoading, isError } = useMyAppointments();
  const [tab, setTab] = useState<TabKey>('upcoming');

  const upcoming = appointments
    .filter(isUpcoming)
    .sort((a, b) => a.appointmentDate !== b.appointmentDate
      ? a.appointmentDate.localeCompare(b.appointmentDate)
      : a.startTime.localeCompare(b.startTime));

  const past = appointments
    .filter(a => !isUpcoming(a))
    .sort((a, b) => a.appointmentDate !== b.appointmentDate
      ? b.appointmentDate.localeCompare(a.appointmentDate)
      : b.startTime.localeCompare(a.startTime));

  const visible = tab === 'upcoming' ? upcoming : past;

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'upcoming', label: t('appointments.tabUpcoming'), count: upcoming.length },
    { key: 'past',     label: t('appointments.tabPast'),     count: past.length },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 pt-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-900/20">
                <CalendarDays size={18} className="text-cyan-600 dark:text-cyan-400" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('appointments.pageTitle')}</h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 ml-12">{t('appointments.pageSubtitle')}</p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {isLoading && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 animate-pulse" />
              ))}
            </div>
            <AppointmentSkeleton />
          </div>
        )}

        {isError && !isLoading && (
          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-10 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('common.error')}</p>
          </div>
        )}

        {!isLoading && !isError && (
          <>
            <RulesCard t={t} />
            {appointments.length > 0 && <StatsBar appointments={appointments} t={t} />}

            {appointments.length > 0 && (
              <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 mb-5">
                {tabs.map(tab_ => (
                  <button
                    key={tab_.key}
                    onClick={() => setTab(tab_.key)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-150',
                      tab === tab_.key
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
                    )}
                  >
                    {tab_.label}
                    <span className={cn(
                      'inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-md text-[11px] font-bold tabular-nums',
                      tab === tab_.key
                        ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-400'
                        : 'bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400',
                    )}>
                      {tab_.count}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {appointments.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 shadow-sm p-14 flex flex-col items-center gap-4 text-center"
              >
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700/50 mb-2">
                  <Stethoscope size={28} className="text-slate-300 dark:text-slate-600" />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">{t('appointments.empty')}</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500">{t('appointments.emptyDesc')}</p>
                </div>
                <Link to="/doctors" className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold transition-colors">
                  {t('appointments.browseDoctors')}
                </Link>
              </motion.div>
            )}

            {appointments.length > 0 && visible.length === 0 && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-10 text-center"
                >
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    {tab === 'upcoming' ? t('appointments.noUpcoming') : t('appointments.noPast')}
                  </p>
                  {tab === 'upcoming' && (
                    <Link to="/doctors" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold transition-colors">
                      {t('appointments.browseDoctors')}
                    </Link>
                  )}
                </motion.div>
              </AnimatePresence>
            )}

            {visible.length > 0 && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3"
                >
                  {visible.map((appt, i) => (
                    <AppointmentCard
                      key={appt.id}
                      appt={appt}
                      index={i}
                      tab={tab}
                      t={t}
                      locale={i18n.language}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
          </>
        )}
      </div>
    </div>
  );
}
