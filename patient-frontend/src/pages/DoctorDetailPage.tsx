import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft, Stethoscope, Building2, Clock,
  DollarSign, BadgeCheck, CheckCircle2, XCircle,
  Lock, AlertCircle, CalendarDays,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { API_BASE_URL, API_ENDPOINTS } from '../api/config';
import axiosInstance from '../api/axiosInstance';
import { extractErrorMessage } from '../utils/errorHandler';
import type { ApiResult, ApiListResult } from '../types/api.types';
import { useAuthStore } from '../store/authStore';
import { useMyPatientProfile } from '../hooks/usePatientProfile';
import {
  MiniCalendar, TimeSlotGrid, FullyBookedBanner, SlotSkeleton,
  toIso, todayIso, fmtTime, fmtMonthYear,
} from '../components/ui/BookingCalendar';
import { PaymentSuccessModal } from '../components/ui/PaymentSuccessModal';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DoctorDetail {
  id: string;
  fullName: string;
  specialty: string;
  departmentName: string;
  imageUrl?: string;
  about?: string;
  licenseNumber?: string;
  yearsOfExperience: number;
  consultationFee: number;
  isActive: boolean;
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
  workStart: string;
  workEnd: string;
  slotMinutes: number;
  slots: SlotItem[];
}

interface BookAppointmentResponse {
  chargedConsultationFee: number;
  newPatientBalance: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DOW_TO_JS: Record<number, number> = { 1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:0 }; // custom→JS

function fmtDate(d: Date, locale: string) {
  return d.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
}

// ── Data hooks ────────────────────────────────────────────────────────────────

function useDoctorDetail(id: string) {
  return useQuery<DoctorDetail>({
    queryKey: ['doctor-detail', id],
    queryFn: async () => {
      const res = await axiosInstance.get<ApiResult<DoctorDetail>>(API_ENDPOINTS.doctors.byId(id));
      if (!res.data.isSuccess || !res.data.data) throw new Error(res.data.errors?.[0] ?? 'Not found');
      return res.data.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

function useDoctorSchedules(doctorId: string) {
  return useQuery<DoctorSchedule[]>({
    queryKey: ['doctor-schedules', doctorId],
    queryFn: async () => {
      const res = await axiosInstance.get<ApiListResult<DoctorSchedule>>(API_ENDPOINTS.doctors.schedules(doctorId));
      return res.data.data ?? [];
    },
    enabled: !!doctorId,
    staleTime: 10 * 60 * 1000,
  });
}

function useAvailableSlots(doctorId: string, date: string | null) {
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
    enabled: !!doctorId && !!date,
    staleTime: 60_000,
  });
}

// ── Doctor avatar ─────────────────────────────────────────────────────────────

function DoctorAvatar({ imageUrl, name }: { imageUrl?: string; name: string }) {
  const src = imageUrl
    ? (imageUrl.startsWith('http') ? imageUrl : `${API_BASE_URL}${imageUrl}`)
    : null;
  const initials = name.replace(/^(dr|prof|mr|mrs|ms|miss)\.\s*/i, '').trim()
    .split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  if (src) return <img src={src} alt={name} className="w-full h-full object-cover object-top" />;
  return (
    <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-cyan-50 to-blue-100 dark:from-cyan-900/20 dark:to-blue-900/30">
      {initials
        ? <span className="text-4xl font-bold text-cyan-600 dark:text-cyan-400">{initials}</span>
        : <Stethoscope size={48} className="text-cyan-300 dark:text-cyan-600" />}
    </div>
  );
}

// ── Info row ──────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-3.5 border-b border-slate-100 dark:border-slate-700/60 last:border-0">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</p>
      </div>
    </div>
  );
}

// ── Booking section (access-gated) ────────────────────────────────────────────

// Minimal shape we need from the appointments list for eligibility checks.
interface AppointmentEligibility {
  doctorId: string;
  status: string;        // 'Waiting' | 'InProgress' | 'Completed' | 'Cancelled'
  appointmentType: string; // 'FirstVisit' | 'FollowUpVisit'
}

function useMyAppointmentsEligibility(enabled: boolean) {
  return useQuery<AppointmentEligibility[]>({
    queryKey: ['my-appointments'],
    queryFn: async () => {
      const res = await axiosInstance.get<ApiListResult<AppointmentEligibility>>(
        API_ENDPOINTS.appointments.my,
      );
      if (!res.data.isSuccess) throw new Error(res.data.errors?.[0] ?? 'Failed');
      return res.data.data ?? [];
    },
    enabled,
    staleTime: 60_000,
  });
}

function BookingSection({
  doctor,
  workingDays,
  t,
}: {
  doctor: DoctorDetail;
  workingDays: Set<number>;
  t: (k: string) => string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const { data: profile, isLoading: profileLoading } = useMyPatientProfile(isAuthenticated);
  const { i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<1 | 2>(1);
  const [fullyBookedDates, setFullyBookedDates] = useState<Set<string>>(new Set());
  const [paymentSuccess, setPaymentSuccess] = useState<BookAppointmentResponse | null>(null);

  // Fetch eligibility data unconditionally (before any early returns) to comply
  // with React's Rules of Hooks. The query itself is disabled until the patient
  // is authenticated and has a complete profile.
  const { data: myAppointments = [] } = useMyAppointmentsEligibility(
    isAuthenticated && !!profile?.isProfileComplete,
  );

  // Eligibility derived from appointment history — computed before early returns
  // so hooks (useEffect below) are never called conditionally.
  const hasUsedFirstVisit = myAppointments.some(
    a => a.doctorId === doctor.id
      && a.appointmentType === 'FirstVisit'
      && a.status !== 'Cancelled',
  );
  const hasCompletedWithDoctor = myAppointments.some(
    a => a.doctorId === doctor.id && a.status === 'Completed',
  );
  const hasActiveFirstVisit = myAppointments.some(
    a => a.doctorId === doctor.id
      && a.appointmentType === 'FirstVisit'
      && (a.status === 'Waiting' || a.status === 'InProgress'),
  );

  // Sync selectedType when eligibility data loads or changes.
  useEffect(() => {
    if (selectedType === 1 && hasUsedFirstVisit && hasCompletedWithDoctor) {
      setSelectedType(2);
    } else if (selectedType === 2 && !hasCompletedWithDoctor) {
      setSelectedType(1);
    }
  }, [hasUsedFirstVisit, hasCompletedWithDoctor, selectedType]);

  // Date lives in ?date= so it survives page refresh
  const selectedDate = searchParams.get('date');
  function selectDate(iso: string) {
    setSearchParams((prev) => { prev.set('date', iso); return prev; }, { replace: true });
    setSelectedSlot(null);
  }
  function clearDate() {
    setSearchParams((prev) => { prev.delete('date'); return prev; }, { replace: true });
    setSelectedSlot(null);
  }

  const { data: slotsData, isLoading: slotsLoading } = useAvailableSlots(doctor.id, selectedDate);

  useEffect(() => {
    if (!slotsLoading && slotsData && selectedDate) {
      const allTaken = slotsData.slots.length > 0 && slotsData.slots.every(s => !s.isAvailable);
      if (allTaken) {
        setFullyBookedDates(prev => prev.has(selectedDate) ? prev : new Set(prev).add(selectedDate));
      }
    }
  }, [slotsLoading, slotsData, selectedDate]);

  const { mutate: bookAppointment, isPending: isBooking } = useMutation({
    mutationFn: async () => {
      if (!selectedDate || !selectedSlot || !profile?.id) throw new Error('Missing data');
      const slotInfo = slotsData?.slots.find(s => s.start === selectedSlot);
      if (!slotInfo) throw new Error('Slot not found');
      const res = await axiosInstance.post<ApiResult<BookAppointmentResponse>>(API_ENDPOINTS.appointments.base, {
        doctorId:        doctor.id,
        patientId:       profile.id,
        appointmentDate: selectedDate,
        startTime:       selectedSlot,
        endTime:         slotInfo.end,
        appointmentType: selectedType,
        status:          1, // Waiting — backend overrides this anyway
      });
      if (!res.data.isSuccess) throw new Error(res.data.errors?.[0] ?? 'Failed');
      return res.data.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['available-slots', doctor.id, selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['patient-wallet-balance'] });
      setSelectedSlot(null);
      clearDate();
      setPaymentSuccess(data);
    },
    onError: (e) => {
      const msg = extractErrorMessage(e);
      if (msg.includes('Only one First Visit is allowed')) {
        toast.error(t('booking.firstVisitUsedHint'));
      } else if (msg.includes('active First Visit')) {
        toast.error(t('appointments.activeFirstVisitError'));
      } else if (msg.includes('wallet balance is too low')) {
        toast.error(t('booking.insufficientBalance'));
      } else {
        toast.error(msg || t('booking.errorTitle'));
      }
    },
  });

  // ── Guest ─────────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 shrink-0">
            <Lock size={15} className="text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-0.5">{t('doctors.detail.bookGuestTitle')}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t('doctors.detail.bookGuestDesc')}</p>
          </div>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/sign-in')}
          className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-sm transition-colors">
          {t('doctors.detail.bookGuestCta')}
        </motion.button>
      </div>
    );
  }

  // ── Auth + incomplete profile ──────────────────────────────────────────────
  if (profileLoading) {
    return <div className="h-13 rounded-2xl bg-slate-100 dark:bg-slate-700 animate-pulse" />;
  }

  if (!profile?.isProfileComplete) {
    const pct = profile?.profileCompletionPercentage ?? 0;
    return (
      <div className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/10 p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 shrink-0">
            <AlertCircle size={15} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-0.5">{t('doctors.detail.bookIncompleteTitle')}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t('doctors.detail.bookIncompleteDesc')}</p>
          </div>
        </div>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{t('profile.completionLabel')}</span>
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 tabular-nums">{pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-amber-100 dark:bg-amber-900/30 overflow-hidden">
            <div className="h-full rounded-full bg-amber-500 dark:bg-amber-400 transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/profile')}
          className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors">
          {t('doctors.detail.bookIncompleteCta')}
        </motion.button>
      </div>
    );
  }

  // ── Auth + complete profile — full booking UI ──────────────────────────────
  const slots = slotsData?.slots ?? [];
  const hasSchedule = workingDays.size > 0;

  // Fully booked: slots loaded, non-empty, but none available
  const isFullyBooked = !slotsLoading && !!slotsData && slots.length > 0 && slots.every(s => !s.isAvailable);

  // ── Active First Visit — block entire booking UI ──────────────────────────
  if (hasActiveFirstVisit) {
    return (
      <div className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/10 p-5">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 shrink-0">
            <AlertCircle size={15} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-0.5">
              {t('booking.activeFirstVisitBlock')}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
              {t('booking.activeFirstVisitBlockDesc')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Step 1: Date */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
          <CalendarDays size={15} className="text-cyan-500" />
          {t('booking.selectDate')}
        </h3>
        {hasSchedule ? (
          <MiniCalendar
            workingDays={workingDays}
            selected={selectedDate}
            onSelect={selectDate}
            fullyBookedDates={fullyBookedDates}
          />
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500">{t('booking.noSchedule')}</p>
        )}
      </div>

      {/* Step 2: Time slots */}
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
                  {fmtDate(new Date(selectedDate + 'T00:00:00'), i18n.language)}
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

      {/* Step 3: Type + confirm */}
      <AnimatePresence>
        {selectedDate && selectedSlot && !isFullyBooked && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Appointment type */}
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('booking.appointmentType')}</p>
              <div className="flex gap-2">
                {([1, 2] as const).map((type) => {
                  const isFirstVisit = type === 1;
                  const isFollowUp   = type === 2;
                  const disabled = (isFirstVisit && hasUsedFirstVisit) || (isFollowUp && !hasCompletedWithDoctor);
                  const hint = isFirstVisit && hasUsedFirstVisit
                    ? t('booking.firstVisitUsedHint')
                    : isFollowUp && !hasCompletedWithDoctor
                      ? t('booking.followUpDisabledHint')
                      : undefined;
                  return (
                    <button
                      key={type}
                      disabled={disabled}
                      onClick={() => !disabled && setSelectedType(type)}
                      title={hint}
                      className={cn(
                        'flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all',
                        selectedType === type && !disabled
                          ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm'
                          : disabled
                            ? 'bg-slate-50 dark:bg-slate-800/40 text-slate-300 dark:text-slate-600 border-slate-100 dark:border-slate-700/40 cursor-not-allowed'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-cyan-300',
                      )}
                    >
                      {type === 1 ? t('booking.firstVisit') : t('booking.followUp')}
                    </button>
                  );
                })}
              </div>
              {hasUsedFirstVisit && (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 leading-relaxed">
                  {t('booking.firstVisitUsedHint')}
                </p>
              )}
              {!hasUsedFirstVisit && !hasCompletedWithDoctor && (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 leading-relaxed">
                  {t('booking.followUpDisabledHint')}
                </p>
              )}
            </div>

            {/* Summary */}
            <div className="rounded-xl bg-cyan-50 dark:bg-cyan-900/15 border border-cyan-100 dark:border-cyan-800/40 p-4 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t('booking.selectDate')}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t('booking.selectSlot')}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {fmtTime(selectedSlot)} – {fmtTime(slotsData?.slots.find(s => s.start === selectedSlot)?.end ?? '')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t('booking.appointmentType')}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {selectedType === 1 ? t('booking.firstVisit') : t('booking.followUp')}
                </span>
              </div>
            </div>

            {/* Confirm button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              disabled={isBooking}
              onClick={() => bookAppointment()}
              className="w-full py-3.5 rounded-2xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-60 text-white font-semibold text-sm shadow-md shadow-cyan-200 dark:shadow-cyan-900/40 transition-colors"
            >
              {isBooking ? t('booking.confirming') : t('booking.confirm')}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <PaymentSuccessModal
        open={!!paymentSuccess}
        onClose={() => setPaymentSuccess(null)}
        message={t('booking.successTitle')}
        amount={paymentSuccess?.chargedConsultationFee}
        amountLabel={t('booking.consultationFeeCharged')}
        amountSign="debit"
        balance={paymentSuccess?.newPatientBalance}
        balanceLabel={t('wallet.success.newBalance')}
        ctaLabel={t('common.close')}
      />
    </div>
  );
}

// ── Working hours card ────────────────────────────────────────────────────────

// Maps custom DayOfWeek byte (1=Mon..7=Sun) to i18n key
const DOW_KEY: Record<number, string> = {
  1: 'schedule.mon', 2: 'schedule.tue', 3: 'schedule.wed',
  4: 'schedule.thu', 5: 'schedule.fri', 6: 'schedule.sat', 7: 'schedule.sun',
};

function WorkingHoursCard({ schedules, t }: { schedules: DoctorSchedule[]; t: (k: string) => string }) {
  if (schedules.length === 0) return null;

  const ordered = [...schedules].sort((a, b) => {
    // Sun (7) sorts after Sat (6) — just use numeric order 1-7
    return a.dayOfWeek - b.dayOfWeek;
  });

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 shadow-sm px-5 py-3">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 pt-1">
        {t('doctors.detail.workingHours')}
      </p>
      <div className="space-y-2">
        {ordered.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 w-8 shrink-0">
              {t(DOW_KEY[s.dayOfWeek] ?? 'schedule.unknown')}
            </span>
            <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700/60" />
            <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0 tabular-nums">
              {fmtTime(s.startTime)} – {fmtTime(s.endTime)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
      <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="aspect-3/4 rounded-2xl bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="md:col-span-2 space-y-4">
          <div className="h-7 w-56 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-4 w-36 bg-slate-100 dark:bg-slate-700 rounded" />
          <div className="space-y-3 mt-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 dark:bg-slate-700/50 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function DoctorDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { t } = useTranslation();

  const { data: doctor, isLoading, isError } = useDoctorDetail(id);
  const { data: schedules = [] } = useDoctorSchedules(id);

  // Build set of JS day numbers (0=Sun..6=Sat) the doctor works
  const workingDays = new Set(
    schedules.map((s) => DOW_TO_JS[s.dayOfWeek] ?? -1).filter((d) => d >= 0)
  );

  if (isLoading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-20"><DetailSkeleton /></div>
  );

  if (isError || !doctor) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-20 flex flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2">
        <Stethoscope size={28} className="text-slate-300 dark:text-slate-600" />
      </div>
      <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">{t('doctors.detail.notFound')}</p>
      <Link to="/doctors" className="flex items-center gap-1.5 text-sm font-medium text-cyan-600 dark:text-cyan-400 hover:underline">
        <ArrowLeft size={15} />{t('doctors.detail.backToList')}
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 pt-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <Link to="/doctors" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
            <ArrowLeft size={15} />{t('doctors.detail.backToList')}
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* ── Left: Photo + info ───────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="lg:col-span-1 space-y-5"
          >
            <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700/60 shadow-sm aspect-3/4 bg-slate-100 dark:bg-slate-700">
              <DoctorAvatar imageUrl={doctor.imageUrl} name={doctor.fullName} />
            </div>

            {/* Status */}
            <div className={cn(
              'flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border',
              doctor.isActive
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/40'
                : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600/50',
            )}>
              {doctor.isActive ? <><CheckCircle2 size={15} />{t('doctors.detail.active')}</> : <><XCircle size={15} />{t('doctors.detail.inactive')}</>}
            </div>

            {/* Info card */}
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 shadow-sm px-5 py-1">
              <InfoRow icon={<Building2 size={15} />} label={t('doctors.detail.department')} value={doctor.departmentName} />
              <InfoRow icon={<Clock size={15} />} label={t('doctors.detail.experience')} value={`${doctor.yearsOfExperience} ${t('doctors.experience')}`} />
              {doctor.consultationFee > 0 && (
                <InfoRow icon={<DollarSign size={15} />} label={t('doctors.detail.consultationFee')} value={`$${doctor.consultationFee.toFixed(2)}`} />
              )}
              {doctor.licenseNumber && (
                <InfoRow icon={<BadgeCheck size={15} />} label={t('doctors.detail.license')} value={doctor.licenseNumber} />
              )}
            </div>

            {/* Working hours */}
            <WorkingHoursCard schedules={schedules} t={t} />
          </motion.div>

          {/* ── Right: Name + about + booking ────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08, ease: 'easeOut' }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Name */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-tight mb-1">
                {doctor.fullName}
              </h1>
              <p className="text-cyan-600 dark:text-cyan-400 font-semibold text-base">{doctor.specialty}</p>
            </div>

            {/* About */}
            {doctor.about && (
              <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 shadow-sm p-5">
                <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">{t('doctors.detail.about')}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{doctor.about}</p>
              </div>
            )}

            {/* Booking */}
            {doctor.isActive && (
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <CalendarDays size={18} className="text-cyan-500" />
                  {t('doctors.detail.bookAppointment')}
                </h2>
                <BookingSection doctor={doctor} workingDays={workingDays} t={t} />
              </div>
            )}
          </motion.div>

        </div>
      </div>
    </div>
  );
}
