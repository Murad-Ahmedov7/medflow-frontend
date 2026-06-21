import { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Search, Calendar, Clock, ChevronLeft, ChevronRight,
  X, PlayCircle, CheckCircle2, XCircle, AlertCircle,
  Stethoscope, Filter, Phone, Mail, Cake, Timer,
  UserCircle2, Ban, MessageCircle, ClipboardList,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { extractErrorMessage } from '../utils/errorHandler';
import { useDoctorAppointments, useUpdateAppointmentStatus, useDoctorCancelAppointment } from '../hooks/useAppointments';
import { useAppointmentHub } from '../hooks/useAppointmentHub';
import { useDoctorProfile } from '../hooks/useDoctorProfile';
import { API_BASE_URL } from '../api/config';
import type { DoctorAppointmentResponse, AppointmentTab, AppointmentStatus } from '../types/appointment.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function todayIso() { return toIso(new Date()); }
function fmtTime(t: string) { return t?.slice(0, 5) ?? ''; }

const LOCALE_MAP: Record<string, string> = { en: 'en-GB', az: 'az-AZ', ru: 'ru-RU' };
function bcp47(lang: string) { return LOCALE_MAP[lang] ?? lang; }

function fmtDate(iso: string, locale: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(bcp47(locale), {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function fmtDateCard(iso: string, lang: string): string {
  const d = new Date(iso + 'T00:00:00');
  const locale = bcp47(lang);
  const weekday = d.toLocaleDateString(locale, { weekday: 'short' });
  const day     = d.toLocaleDateString(locale, { day: 'numeric' });
  const month   = d.toLocaleDateString(locale, { month: 'short' });
  const year    = d.getFullYear();
  return `${weekday}, ${day} ${month} ${year}`;
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

function avatarHue(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { t } = useTranslation();
  const cls: Record<AppointmentStatus, string> = {
    Waiting:    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700/40',
    InProgress: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700/40',
    Completed:  'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700/40',
    Cancelled:  'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-700/40',
  };
  const labels: Record<AppointmentStatus, string> = {
    Waiting: t('appointments.statusWaiting'),
    InProgress: t('appointments.statusInProgress'),
    Completed: t('appointments.statusCompleted'),
    Cancelled: t('appointments.statusCancelled'),
  };
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border', cls[status])}>
      {status === 'InProgress' && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
        </span>
      )}
      {labels[status]}
    </span>
  );
}

// ── Visit type chip ───────────────────────────────────────────────────────────

function VisitTypeChip({ type }: { type: string }) {
  const { t } = useTranslation();
  const isFirst = type === 'FirstVisit';
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide',
      isFirst
        ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400'
        : 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400',
    )}>
      {isFirst ? t('appointments.firstVisit') : t('appointments.followUp')}
    </span>
  );
}

// ── Patient avatar ────────────────────────────────────────────────────────────

function PatientAvatar({ name, imageUrl, patientId, size = 'md' }: {
  name: string;
  imageUrl?: string | null;
  patientId: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [imgError, setImgError] = useState(false);
  const src = imageUrl
    ? (imageUrl.startsWith('http') ? imageUrl : `${API_BASE_URL}${imageUrl}`)
    : null;
  const hue = avatarHue(patientId);
  const dims = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-12 h-12 text-sm' : 'w-10 h-10 text-xs';

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setImgError(true)}
        className={cn('rounded-full object-cover shrink-0 ring-2 ring-white dark:ring-slate-800', dims)}
      />
    );
  }

  return (
    <div
      className={cn('rounded-full shrink-0 flex items-center justify-center font-bold text-white', dims)}
      style={{ backgroundColor: `hsl(${hue}, 55%, 50%)` }}
    >
      {initials(name)}
    </div>
  );
}

// ── Cancel modal ──────────────────────────────────────────────────────────────

function CancelModal({
  appt,
  onClose,
}: {
  appt: DoctorAppointmentResponse;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { mutate: cancel, isPending } = useDoctorCancelAppointment();
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  const hasError = touched && !reason.trim();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!reason.trim()) return;
    cancel({ id: appt.id, cancellationReason: reason.trim() }, {
      onSuccess: () => {
        toast.success(t('appointments.toastCancelled'));
        onClose();
      },
      onError: (err) => toast.error(extractErrorMessage(err) || t('common.error')),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-900/20">
              <XCircle size={18} className="text-rose-500 dark:text-rose-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{t('appointments.cancelModalTitle')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{appt.patientFullName}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('appointments.cancelReasonLabel')}
              <span className="text-rose-500 ml-0.5">*</span>
            </label>
            <textarea
              ref={textareaRef}
              value={reason}
              onChange={e => setReason(e.target.value)}
              onBlur={() => setTouched(true)}
              rows={4}
              placeholder={t('appointments.cancelReasonPlaceholder')}
              className={cn(
                'w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition resize-none',
                hasError
                  ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-500/20'
                  : 'border-slate-200 dark:border-slate-700 focus:ring-cyan-500/20',
              )}
            />
            {hasError && (
              <p className="text-xs text-rose-500 mt-1">{t('appointments.cancelReasonRequired')}</p>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {isPending ? t('appointments.cancelling') : t('appointments.confirmCancel')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Detail Drawer ─────────────────────────────────────────────────────────────

function calcDur(start: string, end: string) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

function fmtBirth(iso: string | null | undefined, locale: string) {
  if (!iso) return null;
  try { return new Date(iso).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return iso; }
}

function DrawerSection({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-slate-400 dark:text-slate-500">{icon}</span>
        <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</p>
      </div>
      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-1 divide-y divide-slate-100 dark:divide-slate-800/60">
        {children}
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon?: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <div className="flex items-center gap-2 shrink-0">
        {icon && <span className="text-slate-300 dark:text-slate-600 shrink-0">{icon}</span>}
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium w-24 shrink-0">{label}</p>
      </div>
      <div className="text-right">
        {typeof value === 'string'
          ? <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 break-all">{value}</p>
          : value}
      </div>
    </div>
  );
}

function DetailDrawer({
  appt,
  onClose,
}: {
  appt: DoctorAppointmentResponse;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const na = t('appointments.na');
  const dur = calcDur(appt.startTime, appt.endTime);

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-105 bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <PatientAvatar name={appt.patientFullName} imageUrl={appt.patientImageUrl} patientId={appt.patientId} size="md" />
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">{appt.patientFullName}</p>
            <StatusBadge status={appt.status} />
          </div>
        </div>
        <button onClick={onClose} className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors shrink-0">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <DrawerSection label={t('appointments.drawerPatientInfo')} icon={<UserCircle2 size={13} />}>
          <Row icon={<Phone size={13} />}    label={t('appointments.phone')}     value={appt.patientPhone || na} />
          <Row icon={<Mail size={13} />}     label={t('appointments.email')}     value={appt.patientEmail || na} />
          <Row icon={<Stethoscope size={13} />} label={t('appointments.gender')} value={appt.patientGender || na} />
          <Row icon={<Cake size={13} />}     label={t('appointments.birthDate')} value={fmtBirth(appt.patientBirthDate, i18n.language) || na} />
        </DrawerSection>

        <DrawerSection label={t('appointments.drawerAppointmentInfo')} icon={<Calendar size={13} />}>
          <Row icon={<Calendar size={13} />} label={t('appointments.date')}   value={fmtDate(appt.appointmentDate, i18n.language)} />
          <Row icon={<Clock size={13} />}    label={t('appointments.time')}   value={`${fmtTime(appt.startTime)} – ${fmtTime(appt.endTime)}`} />
          <Row icon={<Timer size={13} />}    label={t('appointments.duration')} value={dur > 0 ? `${dur} ${t('appointments.minutes')}` : na} />
          <Row icon={<Stethoscope size={13} />} label={t('appointments.type')} value={appt.appointmentType === 'FirstVisit' ? t('appointments.firstVisit') : t('appointments.followUp')} />
          <Row icon={<AlertCircle size={13} />} label={t('appointments.status')} value={<StatusBadge status={appt.status} />} />
        </DrawerSection>

        {appt.status === 'Cancelled' && (
          <DrawerSection label={t('appointments.drawerCancellationInfo')} icon={<Ban size={13} />}>
            <div className="rounded-2xl border border-rose-100 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-900/10 -mx-4 px-4 py-1">
              <Row
                icon={<Ban size={13} />}
                label={t('appointments.cancelReasonLabel')}
                value={
                  appt.cancellationReason
                    ? <span className="text-rose-700 dark:text-rose-400 text-sm font-semibold wrap-break-word">{appt.cancellationReason}</span>
                    : <span className="text-slate-400 italic text-sm">{na}</span>
                }
              />
            </div>
          </DrawerSection>
        )}
      </div>
    </motion.div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function AppointmentSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={cn('p-4 flex items-center gap-4', i !== 4 && 'border-b border-slate-100 dark:border-slate-700/40')}>
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3 w-48 bg-slate-100 dark:bg-slate-700/60 rounded" />
          </div>
          <div className="hidden sm:flex flex-col items-end gap-1.5">
            <div className="h-3 w-28 bg-slate-100 dark:bg-slate-700/60 rounded" />
            <div className="h-3 w-16 bg-slate-100 dark:bg-slate-700/60 rounded" />
          </div>
          <div className="h-6 w-20 bg-slate-100 dark:bg-slate-700/60 rounded-lg" />
          <div className="flex gap-2">
            <div className="h-8 w-8 bg-slate-100 dark:bg-slate-700/60 rounded-lg" />
            <div className="h-8 w-8 bg-slate-100 dark:bg-slate-700/60 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Patient age helper ────────────────────────────────────────────────────────

function calcAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// ── Action button ─────────────────────────────────────────────────────────────

function ActionBtn({
  onClick,
  icon,
  label,
  variant = 'default',
  disabled = false,
  disabledTitle,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  variant?: 'cyan' | 'emerald' | 'rose' | 'violet' | 'default';
  disabled?: boolean;
  /** Tooltip shown instead of the label when disabled — explains why the action is blocked */
  disabledTitle?: string;
}) {
  const variantCls = {
    cyan:    'border-cyan-400/60 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20',
    emerald: 'border-emerald-400/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
    rose:    'border-rose-400/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20',
    violet:  'border-violet-400/60 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20',
    default: 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700',
  };
  return (
    <button
      title={disabled ? (disabledTitle ?? label) : label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center justify-center w-8 h-8 rounded-lg border transition-colors shrink-0',
        disabled
          ? 'border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-60 hover:bg-transparent dark:hover:bg-transparent'
          : variantCls[variant],
      )}
    >
      {icon}
    </button>
  );
}

// ── Appointment card ──────────────────────────────────────────────────────────

function AppointmentCard({
  appt,
  index,
  isLast,
  showDate = false,
  onViewDetails,
  onStartConsultation,
  onCompleteConsultation,
  onCancelRequest,
  onOpenChat,
  onMedicalRecord,
}: {
  appt: DoctorAppointmentResponse;
  index: number;
  isLast: boolean;
  showDate?: boolean;
  onViewDetails: () => void;
  onStartConsultation: () => void;
  onCompleteConsultation: () => void;
  onCancelRequest: () => void;
  onOpenChat?: () => void;
  onMedicalRecord?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const age    = calcAge(appt.patientBirthDate);
  const gender = appt.patientGender;
  // A consultation can only be started on its scheduled date — never early.
  // Backend enforces this too; this just keeps the doctor from hitting that error.
  const isFutureAppointment = appt.appointmentDate > todayIso();

  const meta = [
    gender ?? null,
    age != null ? `${age} ${t('appointments.years')}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: index * 0.03 }}
      className={cn(
        'flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-700/30',
        !isLast && 'border-b border-slate-100 dark:border-slate-700/50',
        appt.status === 'Cancelled' && 'opacity-55',
      )}
    >
      {/* ── Avatar ──────────────────────────────────────────────── */}
      <PatientAvatar
        name={appt.patientFullName}
        imageUrl={appt.patientImageUrl}
        patientId={appt.patientId}
        size="md"
      />

      {/* ── Patient block ────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">
            {appt.patientFullName}
          </p>
          <VisitTypeChip type={appt.appointmentType} />
        </div>
        {meta && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-tight">{meta}</p>
        )}
        {appt.status === 'Cancelled' && appt.cancellationReason && (
          <p className="text-[11px] text-rose-400 dark:text-rose-500 mt-0.5 leading-tight truncate">
            {appt.cancellationReason}
          </p>
        )}
      </div>

      {/* ── Date + time ──────────────────────────────────────────── */}
      <div className="hidden sm:flex flex-col items-end shrink-0 min-w-0">
        {showDate ? (
          <>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Calendar size={11} className="text-slate-400 dark:text-slate-500 shrink-0" />
              <span className="font-medium">{fmtDateCard(appt.appointmentDate, i18n.language)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              <Clock size={11} className="shrink-0" />
              <span>{fmtTime(appt.startTime)} – {fmtTime(appt.endTime)}</span>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-tight tabular-nums">
              {fmtTime(appt.startTime)}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-tight mt-0.5 tabular-nums">
              – {fmtTime(appt.endTime)}
            </p>
          </>
        )}
      </div>

      {/* ── Status badge ─────────────────────────────────────────── */}
      <div className="shrink-0">
        <StatusBadge status={appt.status} />
      </div>

      {/* ── Actions ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 shrink-0">
        {appt.status === 'Waiting' && (
          <>
            <ActionBtn
              onClick={onStartConsultation}
              icon={<PlayCircle size={15} />}
              label={t('appointments.startConsultation')}
              variant="cyan"
              disabled={isFutureAppointment}
              disabledTitle={t('appointments.cannotStartBeforeDate')}
            />
            <ActionBtn
              onClick={onCancelRequest}
              icon={<XCircle size={15} />}
              label={t('appointments.cancel')}
              variant="rose"
            />
          </>
        )}

        {appt.status === 'InProgress' && (
          <ActionBtn
            onClick={onCompleteConsultation}
            icon={<CheckCircle2 size={15} />}
            label={t('appointments.completeConsultation')}
            variant="emerald"
          />
        )}

        {appt.chatId && (appt.status === 'Waiting' || appt.status === 'InProgress') && onOpenChat && (
          <ActionBtn
            onClick={onOpenChat}
            icon={<MessageCircle size={15} />}
            label={t('chat.openChat', 'Open Chat')}
            variant="default"
          />
        )}

        {(appt.status === 'InProgress' || appt.status === 'Completed') && onMedicalRecord && (
          <ActionBtn
            onClick={onMedicalRecord}
            icon={<ClipboardList size={15} />}
            label={appt.status === 'InProgress' ? t('examination.addRecord') : t('examination.viewRecord')}
            variant={appt.status === 'InProgress' ? 'violet' : 'default'}
          />
        )}

        {/* View details chevron */}
        <button
          onClick={onViewDetails}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-300 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-500 dark:hover:text-slate-400 transition-colors shrink-0"
        >
          <ChevronRightIcon size={15} />
        </button>
      </div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export function AppointmentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [drawerAppt, setDrawerAppt]     = useState<DoctorAppointmentResponse | null>(null);
  const [cancelAppt, setCancelAppt]     = useState<DoctorAppointmentResponse | null>(null);

  const { mutate: updateStatus } = useUpdateAppointmentStatus();

  const tab        = (searchParams.get('tab') as AppointmentTab) || 'today';
  const search     = searchParams.get('q') || '';
  const dateFilter = searchParams.get('date') || '';
  const page       = parseInt(searchParams.get('page') || '1', 10);

  function setParam(key: string, value: string) {
    setSearchParams(prev => {
      if (value) prev.set(key, value); else prev.delete(key);
      if (key !== 'page') prev.delete('page');
      return prev;
    }, { replace: true });
  }

  const { data: profile } = useDoctorProfile();
  const { data: appointments = [], isLoading, isError } = useDoctorAppointments();

  useAppointmentHub(profile?.id);

  const today = todayIso();

  function handleStatusTransition(appt: DoctorAppointmentResponse, status: AppointmentStatus) {
    const toastKey: Record<AppointmentStatus, string> = {
      InProgress: 'appointments.toastStarted',
      Completed:  'appointments.toastCompleted',
      Cancelled:  'appointments.toastCancelled',
      Waiting:    'appointments.toastStarted',
    };
    updateStatus({ id: appt.id, status }, {
      onSuccess: () => toast.success(t(toastKey[status])),
      onError: (e) => {
        const msg = extractErrorMessage(e) || t('common.error');
        const isMedicalRecordBlocked = msg.toLowerCase().includes('medical record');
        if (status === 'Completed' && isMedicalRecordBlocked) {
          toast.error(msg, {
            duration: 8000,
            action: {
              label: t('appointments.openMedicalRecord'),
              onClick: () => navigate(`/examinations/${appt.id}`),
            },
          });
        } else {
          toast.error(msg);
        }
      },
    });
  }

  const tabFiltered = useMemo(() => {
    switch (tab) {
      case 'today':
        return appointments
          .filter(a => a.appointmentDate === today && (a.status === 'Waiting' || a.status === 'InProgress'))
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
      case 'upcoming':
        return appointments
          .filter(a =>
            (a.status === 'Waiting' || a.status === 'InProgress') &&
            (a.appointmentDate > today || (a.appointmentDate === today && (a.status === 'Waiting' || a.status === 'InProgress'))),
          )
          .sort((a, b) => a.appointmentDate !== b.appointmentDate ? a.appointmentDate.localeCompare(b.appointmentDate) : a.startTime.localeCompare(b.startTime));
      case 'completed':
        return appointments
          .filter(a => a.status === 'Completed')
          .sort((a, b) => b.appointmentDate.localeCompare(a.appointmentDate) || b.startTime.localeCompare(a.startTime));
      case 'cancelled':
        return appointments
          .filter(a => a.status === 'Cancelled')
          .sort((a, b) => b.appointmentDate.localeCompare(a.appointmentDate) || b.startTime.localeCompare(a.startTime));
      default:
        return appointments;
    }
  }, [appointments, tab, today]);

  const searchFiltered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return q ? tabFiltered.filter(a => a.patientFullName.toLowerCase().includes(q)) : tabFiltered;
  }, [tabFiltered, search]);

  const dateFiltered = useMemo(() => {
    return dateFilter ? searchFiltered.filter(a => a.appointmentDate === dateFilter) : searchFiltered;
  }, [searchFiltered, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(dateFiltered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = dateFiltered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const tabs: { key: AppointmentTab; label: string; count: number }[] = [
    { key: 'today',     label: t('appointments.tabToday'),     count: appointments.filter(a => a.appointmentDate === today && (a.status === 'Waiting' || a.status === 'InProgress')).length },
    { key: 'upcoming',  label: t('appointments.tabUpcoming'),  count: appointments.filter(a => (a.status === 'Waiting' || a.status === 'InProgress') && (a.appointmentDate > today || (a.appointmentDate === today && (a.status === 'Waiting' || a.status === 'InProgress')))).length },
    { key: 'completed', label: t('appointments.tabCompleted'), count: appointments.filter(a => a.status === 'Completed').length },
    { key: 'cancelled', label: t('appointments.tabCancelled'), count: appointments.filter(a => a.status === 'Cancelled').length },
  ];

  const tabAccents: Record<AppointmentTab, string> = {
    today:     'text-cyan-600',
    upcoming:  'text-amber-600',
    completed: 'text-emerald-600',
    cancelled: 'text-rose-600',
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('nav.appointments')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t('appointments.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
        {tabs.map(tb => (
          <button
            key={tb.key}
            onClick={() => setParam('tab', tb.key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all duration-150 min-w-0',
              tab === tb.key
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
            )}
          >
            <span className="truncate hidden sm:inline">{tb.label}</span>
            <span className="sm:hidden">{tb.label.slice(0, 3)}</span>
            <span className={cn(
              'inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-md text-[10px] font-bold tabular-nums shrink-0',
              tab === tb.key
                ? cn('bg-slate-100 dark:bg-slate-600', tabAccents[tb.key])
                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
            )}>
              {tb.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search + date filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setParam('q', e.target.value)}
            placeholder={t('appointments.searchPlaceholder')}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition"
          />
        </div>
        <div className="relative">
          <Filter size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="date"
            value={dateFilter}
            onChange={e => setParam('date', e.target.value)}
            className="pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition w-full sm:w-auto"
          />
          {dateFilter && (
            <button onClick={() => setParam('date', '')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading && <AppointmentSkeleton />}

      {isError && !isLoading && (
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-10 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('common.error')}</p>
        </div>
      )}

      {!isLoading && !isError && paginated.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-14 flex flex-col items-center gap-3 text-center"
        >
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 mb-1">
            <Calendar size={24} className="text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t('appointments.empty')}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">{t('appointments.emptyDesc')}</p>
        </motion.div>
      )}

      {!isLoading && !isError && paginated.length > 0 && (
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 shadow-sm overflow-hidden"
          >
            {paginated.map((appt, i) => (
              <AppointmentCard
                key={appt.id}
                appt={appt}
                index={i}
                isLast={i === paginated.length - 1}
                showDate={tab !== 'today'}
                onViewDetails={() => setDrawerAppt(appt)}
                onStartConsultation={() => handleStatusTransition(appt, 'InProgress')}
                onCompleteConsultation={() => handleStatusTransition(appt, 'Completed')}
                onCancelRequest={() => setCancelAppt(appt)}
                onOpenChat={appt.chatId ? () => navigate(`/chat?open=${appt.chatId}`) : undefined}
                onMedicalRecord={() => navigate(`/examinations/${appt.id}`)}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('appointments.pageInfo', { current: safePage, total: totalPages })}
          </p>
          <div className="flex gap-1">
            <button disabled={safePage <= 1} onClick={() => setParam('page', String(safePage - 1))} className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors">
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => Math.abs(p - safePage) <= 2)
              .map(p => (
                <button
                  key={p}
                  onClick={() => setParam('page', String(p))}
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-lg text-xs font-semibold border transition-colors',
                    p === safePage ? 'bg-cyan-600 text-white border-cyan-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
                  )}
                >{p}</button>
              ))}
            <button disabled={safePage >= totalPages} onClick={() => setParam('page', String(safePage + 1))} className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      <AnimatePresence>
        {drawerAppt && (
          <>
            <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setDrawerAppt(null)} />
            <DetailDrawer key="drawer" appt={drawerAppt} onClose={() => setDrawerAppt(null)} />
          </>
        )}
      </AnimatePresence>

      {/* Cancel modal */}
      <AnimatePresence>
        {cancelAppt && (
          <CancelModal key="cancel-modal" appt={cancelAppt} onClose={() => setCancelAppt(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
