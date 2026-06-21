import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Search, Users, UserCheck, CalendarClock, Star,
  Phone, Mail, MessageCircle, ClipboardList, CalendarDays,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { extractErrorMessage } from '../utils/errorHandler';
import { useDoctorAppointments } from '../hooks/useAppointments';
import { useGetOrCreateChat } from '../hooks/useChats';
import { API_BASE_URL } from '../api/config';
import type { DoctorAppointmentResponse } from '../types/appointment.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function todayIso() { return toIso(new Date()); }

const LOCALE_MAP: Record<string, string> = { en: 'en-GB', az: 'az-AZ', ru: 'ru-RU' };
function bcp47(lang: string) { return LOCALE_MAP[lang] ?? lang; }

function fmtDate(iso: string | null, lang: string): string | null {
  if (!iso) return null;
  try { return new Date(iso + 'T00:00:00').toLocaleDateString(bcp47(lang), { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return iso; }
}

function calcAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

function avatarHue(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

function PatientAvatar({ name, imageUrl, patientId, size = 'md' }: {
  name: string; imageUrl?: string | null; patientId: string; size?: 'md' | 'lg';
}) {
  const [imgError, setImgError] = useState(false);
  const src = imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `${API_BASE_URL}${imageUrl}`) : null;
  const hue = avatarHue(patientId);
  const dims = size === 'lg' ? 'w-12 h-12 text-sm' : 'w-10 h-10 text-xs';

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

// ── Patient aggregation ───────────────────────────────────────────────────────

type PatientStatus = 'Active' | 'FollowUp' | 'NoUpcoming';

interface PatientSummary {
  patientId: string;
  fullName: string;
  imageUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  birthDate?: string | null;
  appointments: DoctorAppointmentResponse[];
  lastAppointment: DoctorAppointmentResponse | null;
  nextAppointment: DoctorAppointmentResponse | null;
  status: PatientStatus;
  mostRecentChatId: string | null;
  mostRecentExaminationAppointmentId: string | null;
}

function buildPatientSummaries(appointments: DoctorAppointmentResponse[]): PatientSummary[] {
  const today = todayIso();
  const byPatient = new Map<string, DoctorAppointmentResponse[]>();
  for (const appt of appointments) {
    const list = byPatient.get(appt.patientId) ?? [];
    list.push(appt);
    byPatient.set(appt.patientId, list);
  }

  const summaries: PatientSummary[] = [];
  for (const [patientId, appts] of byPatient) {
    const sortedDesc = [...appts].sort((a, b) =>
      b.appointmentDate !== a.appointmentDate
        ? b.appointmentDate.localeCompare(a.appointmentDate)
        : b.startTime.localeCompare(a.startTime),
    );
    const latest = sortedDesc[0];

    const past = appts
      .filter(a => a.status === 'Completed' || (a.appointmentDate < today && a.status !== 'Cancelled'))
      .sort((a, b) => b.appointmentDate.localeCompare(a.appointmentDate) || b.startTime.localeCompare(a.startTime));
    const lastAppointment = past[0] ?? null;

    const upcoming = appts
      .filter(a => (a.status === 'Waiting' || a.status === 'InProgress') &&
        (a.appointmentDate > today || a.appointmentDate === today))
      .sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate) || a.startTime.localeCompare(b.startTime));
    const nextAppointment = upcoming[0] ?? null;

    let status: PatientStatus;
    if (nextAppointment) {
      status = 'Active';
    } else if (lastAppointment && lastAppointment.appointmentType === 'FirstVisit') {
      status = 'FollowUp';
    } else {
      status = 'NoUpcoming';
    }

    const chatSource = sortedDesc.find(a => a.chatId) ?? null;
    const examSource = sortedDesc.find(a => a.examinationId) ?? null;

    summaries.push({
      patientId,
      fullName: latest.patientFullName,
      imageUrl: latest.patientImageUrl,
      phone: latest.patientPhone,
      email: latest.patientEmail,
      birthDate: latest.patientBirthDate,
      appointments: sortedDesc,
      lastAppointment,
      nextAppointment,
      status,
      mostRecentChatId: chatSource?.chatId ?? null,
      mostRecentExaminationAppointmentId: examSource?.id ?? null,
    });
  }
  return summaries;
}

// ── Status badge ──────────────────────────────────────────────────────────────

function PatientStatusBadge({ status }: { status: PatientStatus }) {
  const { t } = useTranslation();
  const cls: Record<PatientStatus, string> = {
    Active:      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700/40',
    FollowUp:    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700/40',
    NoUpcoming:  'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700/40 dark:text-slate-400 dark:border-slate-600/40',
  };
  const labels: Record<PatientStatus, string> = {
    Active: t('patients.statusActive'),
    FollowUp: t('patients.statusFollowUp'),
    NoUpcoming: t('patients.statusNoUpcoming'),
  };
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border whitespace-nowrap', cls[status])}>
      {labels[status]}
    </span>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

const STAT_COLORS = {
  cyan:   { bg: 'bg-cyan-50 dark:bg-cyan-900/20',    icon: 'text-cyan-600 dark:text-cyan-400',    num: 'text-cyan-700 dark:text-cyan-300' },
  emerald:{ bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'text-emerald-600 dark:text-emerald-400', num: 'text-emerald-700 dark:text-emerald-300' },
  amber:  { bg: 'bg-amber-50 dark:bg-amber-900/20',  icon: 'text-amber-600 dark:text-amber-400',  num: 'text-amber-700 dark:text-amber-300' },
  blue:   { bg: 'bg-blue-50 dark:bg-blue-900/20',    icon: 'text-blue-600 dark:text-blue-400',    num: 'text-blue-700 dark:text-blue-300' },
};

function StatCard({ label, value, icon, color, delay = 0 }: {
  label: string; value: number | null; icon: React.ReactNode; color: keyof typeof STAT_COLORS; delay?: number;
}) {
  const c = STAT_COLORS[color];
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      className="rounded-2xl border border-slate-100 bg-white shadow-sm dark:bg-slate-800 dark:border-slate-700 p-4"
    >
      <div className={cn('flex items-center justify-center w-9 h-9 rounded-xl', c.bg)}>
        <span className={c.icon}>{icon}</span>
      </div>
      <div className="mt-3">
        {value === null ? (
          <div className="h-7 w-10 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />
        ) : (
          <p className={cn('text-2xl font-bold tabular-nums', c.num)}>{value}</p>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{label}</p>
      </div>
    </motion.div>
  );
}

// ── Action button ─────────────────────────────────────────────────────────────

function ActionBtn({ onClick, icon, label, variant = 'default', disabled = false }: {
  onClick: () => void; icon: React.ReactNode; label: string;
  variant?: 'cyan' | 'violet' | 'default'; disabled?: boolean;
}) {
  const variantCls = {
    cyan:    'border-cyan-400/60 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20',
    violet:  'border-violet-400/60 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20',
    default: 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700',
  };
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center justify-center w-8 h-8 rounded-lg border transition-colors shrink-0',
        disabled
          ? 'border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-60'
          : variantCls[variant],
      )}
    >
      {icon}
    </button>
  );
}

// ── Patient card ──────────────────────────────────────────────────────────────

function PatientCard({
  patient, index, isLast, isFavorite, onToggleFavorite,
  onViewAppointments, onViewMedicalRecords, onMessage, isMessaging,
}: {
  patient: PatientSummary;
  index: number;
  isLast: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onViewAppointments: () => void;
  onViewMedicalRecords: () => void;
  onMessage: () => void;
  isMessaging: boolean;
}) {
  const { t, i18n } = useTranslation();
  const age = calcAge(patient.birthDate);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: index * 0.03 }}
      className={cn(
        'flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-700/30',
        !isLast && 'border-b border-slate-100 dark:border-slate-700/50',
      )}
    >
      {/* Favorite + avatar */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggleFavorite}
          aria-label={t('patients.toggleFavorite')}
          className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-300 dark:text-slate-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors shrink-0"
        >
          <Star size={16} className={cn(isFavorite && 'fill-amber-400 text-amber-400')} />
        </button>
        <PatientAvatar name={patient.fullName} imageUrl={patient.imageUrl} patientId={patient.patientId} size="lg" />
      </div>

      {/* Name + contact */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">
            {patient.fullName}
          </p>
          {age != null && (
            <span className="text-xs text-slate-400 dark:text-slate-500">· {age} {t('appointments.years')}</span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap mt-1">
          {patient.email && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <Mail size={11} className="text-slate-400 shrink-0" />
              <span className="truncate max-w-40">{patient.email}</span>
            </span>
          )}
          {patient.phone && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <Phone size={11} className="text-slate-400 shrink-0" />
              {patient.phone}
            </span>
          )}
        </div>
      </div>

      {/* Last / next appointment */}
      <div className="flex sm:flex-col gap-3 sm:gap-0.5 shrink-0 sm:items-end sm:w-44">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          <span className="text-slate-400 dark:text-slate-500">{t('patients.lastAppointment')}: </span>
          {fmtDate(patient.lastAppointment?.appointmentDate ?? null, i18n.language) ?? t('appointments.na')}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          <span className="text-slate-400 dark:text-slate-500">{t('patients.nextAppointment')}: </span>
          {fmtDate(patient.nextAppointment?.appointmentDate ?? null, i18n.language) ?? t('appointments.na')}
        </div>
      </div>

      {/* Total appointments */}
      <div className="flex items-center gap-1.5 shrink-0 sm:flex-col sm:items-center sm:w-20">
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 tabular-nums">{patient.appointments.length}</span>
        <span className="text-[11px] text-slate-400 dark:text-slate-500">{t('patients.totalAppointments')}</span>
      </div>

      {/* Status */}
      <div className="shrink-0">
        <PatientStatusBadge status={patient.status} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <ActionBtn onClick={onViewAppointments} icon={<CalendarDays size={15} />} label={t('patients.viewAppointments')} variant="cyan" />
        <ActionBtn onClick={onViewMedicalRecords} icon={<ClipboardList size={15} />} label={t('patients.viewMedicalRecords')} variant="violet" disabled={!patient.mostRecentExaminationAppointmentId} />
        <ActionBtn onClick={onMessage} icon={<MessageCircle size={15} />} label={t('patients.messagePatient')} variant="default" disabled={isMessaging} />
      </div>
    </motion.div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function PatientSkeleton() {
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

// ── Favorites persistence ─────────────────────────────────────────────────────

const FAVORITES_KEY = 'medflow_doctor_favorite_patients';

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveFavorites(favorites: Set<string>) {
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favorites))); } catch { /* ignore */ }
}

// ── Page ──────────────────────────────────────────────────────────────────────

type PatientFilter = 'all' | 'active' | 'followUp';
const PAGE_SIZE = 10;

export function PatientsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites());
  const [messagingPatientId, setMessagingPatientId] = useState<string | null>(null);

  const { mutate: getOrCreateChat } = useGetOrCreateChat();
  const { data: appointments = [], isLoading, isError } = useDoctorAppointments();

  const filter = (searchParams.get('filter') as PatientFilter) || 'all';
  const search = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  function setParam(key: string, value: string) {
    setSearchParams(prev => {
      if (value) prev.set(key, value); else prev.delete(key);
      if (key !== 'page') prev.delete('page');
      return prev;
    }, { replace: true });
  }

  const allPatients = useMemo(() => buildPatientSummaries(appointments), [appointments]);

  const totalPatients = allPatients.length;
  const activeCount = allPatients.filter(p => p.status === 'Active').length;
  const followUpCount = allPatients.filter(p => p.status === 'FollowUp').length;
  const upcomingAppointmentsCount = allPatients.reduce((sum, p) => sum + (p.nextAppointment ? 1 : 0), 0);

  const filterFiltered = useMemo(() => {
    switch (filter) {
      case 'active': return allPatients.filter(p => p.status === 'Active');
      case 'followUp': return allPatients.filter(p => p.status === 'FollowUp');
      default: return allPatients;
    }
  }, [allPatients, filter]);

  const searchFiltered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return filterFiltered;
    return filterFiltered.filter(p =>
      p.fullName.toLowerCase().includes(q) ||
      (p.email?.toLowerCase().includes(q) ?? false) ||
      (p.phone?.toLowerCase().includes(q) ?? false),
    );
  }, [filterFiltered, search]);

  const sorted = useMemo(() => {
    return [...searchFiltered].sort((a, b) => {
      const favA = favorites.has(a.patientId) ? 1 : 0;
      const favB = favorites.has(b.patientId) ? 1 : 0;
      if (favA !== favB) return favB - favA;
      return a.fullName.localeCompare(b.fullName);
    });
  }, [searchFiltered, favorites]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function toggleFavorite(patientId: string) {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(patientId)) next.delete(patientId); else next.add(patientId);
      saveFavorites(next);
      return next;
    });
  }

  function handleMessage(patient: PatientSummary) {
    if (patient.mostRecentChatId) {
      navigate(`/chat?open=${patient.mostRecentChatId}`);
      return;
    }
    setMessagingPatientId(patient.patientId);
    getOrCreateChat(
      { otherUserId: patient.patientId, type: 2 },
      {
        onSuccess: (res) => {
          setMessagingPatientId(null);
          if (res.data) navigate(`/chat?open=${res.data.id}`);
        },
        onError: (err) => {
          setMessagingPatientId(null);
          toast.error(extractErrorMessage(err) || t('common.error'));
        },
      },
    );
  }

  const filters: { key: PatientFilter; label: string; count: number }[] = [
    { key: 'all', label: t('patients.filterAll'), count: totalPatients },
    { key: 'active', label: t('patients.filterActive'), count: activeCount },
    { key: 'followUp', label: t('patients.filterFollowUp'), count: followUpCount },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('nav.patients')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t('patients.subtitle')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label={t('patients.totalPatients')}      value={isLoading ? null : totalPatients}              icon={<Users size={18} />}         color="cyan"    delay={0.05} />
        <StatCard label={t('patients.activePatients')}     value={isLoading ? null : activeCount}                icon={<UserCheck size={18} />}     color="emerald" delay={0.1} />
        <StatCard label={t('patients.followUpNeeded')}      value={isLoading ? null : followUpCount}              icon={<CalendarClock size={18} />} color="amber"   delay={0.15} />
        <StatCard label={t('patients.upcomingAppointments')} value={isLoading ? null : upcomingAppointmentsCount} icon={<CalendarDays size={18} />}  color="blue"    delay={0.2} />
      </div>

      {/* Filters */}
      <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 w-full sm:w-fit">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setParam('filter', f.key)}
            className={cn(
              'flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-150 min-w-0',
              filter === f.key
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
            )}
          >
            <span className="truncate">{f.label}</span>
            <span className={cn(
              'inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-md text-[10px] font-bold tabular-nums shrink-0',
              filter === f.key ? 'bg-slate-100 dark:bg-slate-600 text-cyan-600 dark:text-cyan-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
            )}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setParam('q', e.target.value)}
          placeholder={t('patients.searchPlaceholder')}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition"
        />
      </div>

      {/* Content */}
      {isLoading && <PatientSkeleton />}

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
            <Users size={24} className="text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t('patients.empty')}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">{t('patients.emptyDesc')}</p>
        </motion.div>
      )}

      {!isLoading && !isError && paginated.length > 0 && (
        <AnimatePresence mode="wait">
          <motion.div
            key={filter}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 shadow-sm overflow-hidden"
          >
            {paginated.map((patient, i) => (
              <PatientCard
                key={patient.patientId}
                patient={patient}
                index={i}
                isLast={i === paginated.length - 1}
                isFavorite={favorites.has(patient.patientId)}
                onToggleFavorite={() => toggleFavorite(patient.patientId)}
                onViewAppointments={() => navigate(`/appointments?q=${encodeURIComponent(patient.fullName)}`)}
                onViewMedicalRecords={() => patient.mostRecentExaminationAppointmentId && navigate(`/examinations/${patient.mostRecentExaminationAppointmentId}`)}
                onMessage={() => handleMessage(patient)}
                isMessaging={messagingPatientId === patient.patientId}
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
    </div>
  );
}
