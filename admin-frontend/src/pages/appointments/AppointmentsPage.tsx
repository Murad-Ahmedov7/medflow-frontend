import { useState, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarCheck, Search, ChevronLeft, ChevronRight,
  ChevronsUpDown, ArrowUp, ArrowDown, Calendar, Clock,
  Users, CheckCircle2, Loader2, ChevronDown, X, Eye,
  Stethoscope, AlertCircle, Mail, Phone, Cake, Timer,
  UserCircle2, Ban,
} from 'lucide-react';
import { useAppointments, useGetAppointment } from '../../hooks/useAppointments';
import { useAppointmentHub } from '../../hooks/useAppointmentHub';
import { cn } from '../../utils/cn';
import type { AppointmentResponse, AppointmentStatus, AppointmentType } from '../../types/appointment.types';
import {
  APPOINTMENT_STATUS_FROM_BYTE,
  APPOINTMENT_TYPE_FROM_BYTE,
} from '../../types/appointment.types';

const PAGE_SIZE_OPTIONS = [10, 20, 50];
type SortKey = 'date' | 'doctor' | 'patient' | 'status';

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusStr(raw: number | string): AppointmentStatus {
  if (typeof raw === 'string') return raw as AppointmentStatus;
  return APPOINTMENT_STATUS_FROM_BYTE[raw] ?? 'Waiting';
}
function typeStr(raw: number | string): AppointmentType {
  if (typeof raw === 'string') return raw as AppointmentType;
  return APPOINTMENT_TYPE_FROM_BYTE[raw as number] ?? 'FirstVisit';
}
function fmtTime(t: string) {
  return t?.slice(0, 5) ?? '';
}
function fmtDate(d: string) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return d;
  }
}
function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  Waiting:    'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/40',
  InProgress: 'bg-blue-50  text-blue-700  border-blue-100  dark:bg-blue-900/20  dark:text-blue-400  dark:border-blue-800/40',
  Completed:  'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40',
  Cancelled:  'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/40',
};
const STATUS_DOT: Record<AppointmentStatus, string> = {
  Waiting:    'bg-amber-500',
  InProgress: 'bg-blue-500 animate-pulse',
  Completed:  'bg-emerald-500',
  Cancelled:  'bg-rose-500',
};

function StatusBadge({ status, t }: { status: AppointmentStatus; t: (k: string) => string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border whitespace-nowrap',
      STATUS_STYLES[status],
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[status])} />
      {t(`appointments.statuses.${status}`)}
    </span>
  );
}

// ── Stat cards ────────────────────────────────────────────────────────────────

const STAT_CFG = {
  cyan:    { bar: 'bg-cyan-500',    icon: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400',    ring: 'ring-cyan-200 dark:ring-cyan-800' },
  violet:  { bar: 'bg-violet-500',  icon: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',  ring: 'ring-violet-200 dark:ring-violet-800' },
  amber:   { bar: 'bg-amber-500',   icon: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',   ring: 'ring-amber-200 dark:ring-amber-800' },
  emerald: { bar: 'bg-emerald-500', icon: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-200 dark:ring-emerald-800' },
};

function StatCard({
  icon, label, value, color, loading, active, onClick,
}: {
  icon: React.ReactNode; label: string; value: number; color: keyof typeof STAT_CFG;
  loading: boolean; active: boolean; onClick: () => void;
}) {
  const cfg = STAT_CFG[color];
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        'rounded-2xl border bg-white dark:bg-slate-800 shadow-sm overflow-hidden text-left w-full transition-all duration-150',
        active
          ? `border-transparent ring-2 ${cfg.ring}`
          : 'border-slate-200/80 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
      )}
    >
      <div className={cn('h-0.5 w-full', cfg.bar)} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className={cn('flex items-center justify-center w-10 h-10 rounded-xl shrink-0', cfg.icon)}>
            {icon}
          </div>
          {active && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Active
            </span>
          )}
        </div>
        {loading ? (
          <div>
            <div className="h-7 w-12 bg-slate-100 dark:bg-slate-700/80 rounded-lg animate-pulse mb-2" />
            <div className="h-3 w-20 bg-slate-100 dark:bg-slate-700/80 rounded animate-pulse" />
          </div>
        ) : (
          <div>
            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 leading-none tabular-nums">{value}</p>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1.5">{label}</p>
          </div>
        )}
      </div>
    </motion.button>
  );
}

// ── Detail modal ──────────────────────────────────────────────────────────────

function calcDurationMins(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

function fmtBirthDate(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return iso; }
}

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 pt-1 pb-0.5">
      <span className="text-slate-400 dark:text-slate-500">{icon}</span>
      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</span>
    </div>
  );
}

function DetailRow({ icon, label, value, mono }: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-slate-50 dark:border-slate-800/60 last:border-0">
      <div className="flex items-center gap-2 shrink-0">
        {icon && <span className="text-slate-300 dark:text-slate-600">{icon}</span>}
        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium w-28">{label}</span>
      </div>
      <span className={cn('text-sm text-slate-800 dark:text-slate-100 text-right break-all', mono && 'font-mono text-xs text-slate-500 dark:text-slate-400')}>
        {value}
      </span>
    </div>
  );
}

function DetailModal({
  selectedId,
  fallback,
  onClose,
  t,
}: {
  selectedId: string;
  fallback: AppointmentResponse;
  onClose: () => void;
  t: (k: string) => string;
}) {
  const { data: detail, isLoading: detailLoading } = useGetAppointment(selectedId);
  const appt = detail ?? fallback;

  const st  = statusStr(appt.status);
  const ty  = typeStr(appt.appointmentType);
  const dur = calcDurationMins(appt.startTime, appt.endTime);
  const na  = t('appointments.modal.na');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-linear-to-br from-cyan-500 to-blue-600 shadow-sm">
              <CalendarCheck size={15} className="text-white" />
            </div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('appointments.details')}</h2>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={st} t={t} />
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

          {detailLoading && (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex justify-between gap-4 py-2">
                  <div className="h-3 w-24 bg-slate-100 dark:bg-slate-700 rounded" />
                  <div className="h-3 w-32 bg-slate-100 dark:bg-slate-700 rounded" />
                </div>
              ))}
            </div>
          )}

          {!detailLoading && (
          <>
          {/* ── Patient Information ─────────────────────────────── */}
          <SectionHeader icon={<UserCircle2 size={13} />} label={t('appointments.modal.patientInfo')} />
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 px-4 py-1 divide-y divide-slate-100 dark:divide-slate-800/60">
            <DetailRow
              icon={<Users size={13} />}
              label={t('appointments.modal.fullName')}
              value={appt.patientFullName || na}
            />
            <DetailRow
              icon={<Mail size={13} />}
              label={t('appointments.modal.email')}
              value={appt.patientEmail || na}
              mono={!!appt.patientEmail}
            />
            <DetailRow
              icon={<Phone size={13} />}
              label={t('appointments.modal.phone')}
              value={appt.patientPhone || na}
            />
            <DetailRow
              icon={<Cake size={13} />}
              label={t('appointments.modal.birthDate')}
              value={fmtBirthDate(appt.patientBirthDate) || na}
            />
          </div>

          {/* ── Appointment Information ─────────────────────────── */}
          <SectionHeader icon={<CalendarCheck size={13} />} label={t('appointments.modal.appointmentInfo')} />
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 px-4 py-1 divide-y divide-slate-100 dark:divide-slate-800/60">
            <DetailRow
              icon={<Stethoscope size={13} />}
              label={t('appointments.doctor')}
              value={appt.doctorName || na}
            />
            <DetailRow
              icon={<Calendar size={13} />}
              label={t('appointments.date')}
              value={fmtDate(appt.appointmentDate)}
            />
            <DetailRow
              icon={<Clock size={13} />}
              label={t('appointments.startTime') + ' – ' + t('appointments.endTime')}
              value={`${fmtTime(appt.startTime)} – ${fmtTime(appt.endTime)}`}
            />
            <DetailRow
              icon={<Timer size={13} />}
              label={t('appointments.modal.duration')}
              value={dur > 0 ? `${dur} ${t('appointments.modal.minutes')}` : na}
            />
            <DetailRow
              icon={<CalendarCheck size={13} />}
              label={t('appointments.type')}
              value={t(`appointments.types.${ty}`)}
            />
          </div>

          {/* ── Cancellation Information ────────────────────────── */}
          {st === 'Cancelled' && (
            <>
              <SectionHeader icon={<Ban size={13} />} label={t('appointments.modal.cancellationInfo')} />
              <div className="rounded-xl border border-rose-100 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-900/10 px-4 py-1">
                <DetailRow
                  icon={<Ban size={13} />}
                  label={t('appointments.modal.cancellationReason')}
                  value={
                    appt.cancellationReason
                      ? <span className="text-rose-700 dark:text-rose-400">{appt.cancellationReason}</span>
                      : <span className="text-slate-400 dark:text-slate-500 italic">{na}</span>
                  }
                />
              </div>
            </>
          )}
          </>
          )}
        </div>

      </motion.div>
    </motion.div>
  );
}

// ── Sort header ───────────────────────────────────────────────────────────────

function SortTh({ label, sortKey, current, desc, onSort, className }: {
  label: string; sortKey: SortKey; current: SortKey; desc: boolean;
  onSort: (k: SortKey) => void; className?: string;
}) {
  const active = current === sortKey;
  return (
    <th className={cn('text-left', className)}>
      <button
        onClick={() => onSort(sortKey)}
        className={cn(
          'flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide transition-colors group',
          active ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300',
        )}
      >
        {label}
        <span>
          {active
            ? (desc ? <ArrowDown size={11} className="text-cyan-500" /> : <ArrowUp size={11} className="text-cyan-500" />)
            : <ChevronsUpDown size={11} className="opacity-40 group-hover:opacity-70" />}
        </span>
      </button>
    </th>
  );
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-50 dark:border-slate-700/40">
      <td className="pl-5 pr-4 py-3.5"><div className="h-8 w-32 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" /></td>
      <td className="px-4 py-3.5 hidden sm:table-cell"><div className="h-3.5 w-28 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /></td>
      <td className="px-4 py-3.5 hidden md:table-cell"><div className="h-3.5 w-24 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /></td>
      <td className="px-4 py-3.5 hidden lg:table-cell"><div className="h-3.5 w-20 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-6 w-20 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" /></td>
      <td className="px-4 py-3.5 hidden xl:table-cell"><div className="h-6 w-16 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" /></td>
      <td className="pr-5 pl-4 py-3.5"><div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" /></td>
    </tr>
  );
}

// ── Pagination button ─────────────────────────────────────────────────────────

function PagBtn({ children, onClick, disabled, active, 'aria-label': ariaLabel }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean; 'aria-label'?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-all',
        active ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700',
        disabled && 'opacity-35 cursor-not-allowed pointer-events-none',
      )}
    >
      {children}
    </button>
  );
}

function getPageNumbers(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, -1, total];
  if (current >= total - 3) return [1, -1, total - 4, total - 3, total - 2, total - 1, total];
  return [1, -1, current - 1, current, current + 1, -1, total];
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function AppointmentsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── URL state ────────────────────────────────────────────────────────────
  const page      = Math.max(1, Number(searchParams.get('page') || 1));
  const rawSize   = Number(searchParams.get('size') || 10);
  const pageSize  = PAGE_SIZE_OPTIONS.includes(rawSize) ? rawSize : 10;
  const urlSearch = searchParams.get('search') ?? '';
  const statusFilter = (searchParams.get('status') ?? '') as AppointmentStatus | '';
  const doctorFilter = searchParams.get('doctor') ?? '';
  const dateFilter   = searchParams.get('date') ?? '';
  const sortBy  = (searchParams.get('sort') as SortKey) || 'date';
  const sortDesc = searchParams.get('sortDesc') === 'true';

  const [search, setSearch] = useState(urlSearch);
  const [selected, setSelected] = useState<AppointmentResponse | null>(null);

  function setParam(updates: Record<string, string | undefined>) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(updates)) {
        if (v === undefined || v === '') next.delete(k);
        else next.set(k, v);
      }
      return next;
    }, { replace: true });
  }

  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setParam({ search: val || undefined, page: undefined });
    }, 350);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSort(key: SortKey) {
    const nextDesc = sortBy === key ? !sortDesc : false;
    setParam({ sort: key === 'date' ? undefined : key, sortDesc: nextDesc ? 'true' : undefined, page: undefined });
  }

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: result, isLoading, isError, isFetching } = useAppointments();
  useAppointmentHub();

  const allAppointments = result?.data ?? [];

  // ── Derived stats (client-side from full dataset) ────────────────────────
  const stats = useMemo(() => {
    const todayIsoStr = todayIso();
    return {
      total:     allAppointments.length,
      today:     allAppointments.filter((a) => a.appointmentDate?.slice(0, 10) === todayIsoStr).length,
      waiting:   allAppointments.filter((a) => statusStr(a.status) === 'Waiting').length,
      completed: allAppointments.filter((a) => statusStr(a.status) === 'Completed').length,
    };
  }, [allAppointments]);

  // ── Stat card click → set filter ────────────────────────────────────────
  function handleStatClick(card: 'total' | 'today' | 'waiting' | 'completed') {
    if (card === 'total') {
      setParam({ status: undefined, date: undefined, page: undefined });
    } else if (card === 'today') {
      setParam({ date: todayIso(), status: undefined, page: undefined });
    } else if (card === 'waiting') {
      setParam({ status: 'Waiting', date: undefined, page: undefined });
    } else {
      setParam({ status: 'Completed', date: undefined, page: undefined });
    }
  }

  // Determine which stat card is "active"
  const activeCard: 'total' | 'today' | 'waiting' | 'completed' | null =
    statusFilter === 'Waiting'   ? 'waiting'   :
    statusFilter === 'Completed' ? 'completed'  :
    dateFilter === todayIso()    ? 'today'      :
    (!statusFilter && !dateFilter && !urlSearch && !doctorFilter) ? 'total' : null;

  // ── Client-side filter + sort ────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...allAppointments];

    if (urlSearch) {
      const q = urlSearch.toLowerCase();
      list = list.filter((a) =>
        a.doctorName?.toLowerCase().includes(q) ||
        a.patientId?.toLowerCase().includes(q),
      );
    }
    if (statusFilter) {
      list = list.filter((a) => statusStr(a.status) === statusFilter);
    }
    if (doctorFilter) {
      list = list.filter((a) => a.doctorId === doctorFilter);
    }
    if (dateFilter) {
      list = list.filter((a) => a.appointmentDate?.slice(0, 10) === dateFilter);
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'date')   cmp = a.appointmentDate.localeCompare(b.appointmentDate);
      if (sortBy === 'doctor') cmp = a.doctorName.localeCompare(b.doctorName);
      if (sortBy === 'status') cmp = statusStr(a.status).localeCompare(statusStr(b.status));
      return sortDesc ? -cmp : cmp;
    });

    return list;
  }, [allAppointments, urlSearch, statusFilter, doctorFilter, dateFilter, sortBy, sortDesc]);

  // ── Pagination ───────────────────────────────────────────────────────────
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const hasFilters = !!(urlSearch || statusFilter || doctorFilter || dateFilter);

  // ── Unique doctors for filter dropdown ───────────────────────────────────
  const doctorOptions = useMemo(() => {
    const map = new Map<string, string>();
    allAppointments.forEach((a) => { if (a.doctorId && a.doctorName) map.set(a.doctorId, a.doctorName); });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allAppointments]);

  return (
    <div className="space-y-6 pb-8">

      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-linear-to-br from-cyan-500 to-blue-600 shadow-sm shadow-cyan-200 dark:shadow-cyan-900/50">
              <CalendarCheck size={15} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              {t('appointments.listTitle')}
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 ml-10.5">
            {t('appointments.listSubtitle')}
          </p>
        </div>
      </div>

      {/* ── Stats cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={<CalendarCheck size={19} />} label={t('appointments.stats.total')}
          value={stats.total} color="cyan" loading={isLoading}
          active={activeCard === 'total'} onClick={() => handleStatClick('total')} />
        <StatCard icon={<Calendar size={19} />} label={t('appointments.stats.today')}
          value={stats.today} color="violet" loading={isLoading}
          active={activeCard === 'today'} onClick={() => handleStatClick('today')} />
        <StatCard icon={<Clock size={19} />} label={t('appointments.stats.waiting')}
          value={stats.waiting} color="amber" loading={isLoading}
          active={activeCard === 'waiting'} onClick={() => handleStatClick('waiting')} />
        <StatCard icon={<CheckCircle2 size={19} />} label={t('appointments.stats.completed')}
          value={stats.completed} color="emerald" loading={isLoading}
          active={activeCard === 'completed'} onClick={() => handleStatClick('completed')} />
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t('appointments.search')}
            className={cn(
              'w-full h-10 rounded-xl border border-slate-200 bg-white pl-9.5 pr-4 text-sm text-slate-800 placeholder-slate-400',
              'shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition-all',
              'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500',
            )}
          />
          <AnimatePresence>
            {isFetching && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 size={13} className="text-cyan-500 animate-spin" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Status filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setParam({ status: e.target.value || undefined, page: undefined })}
              className={cn(
                'h-10 rounded-xl border border-slate-200 bg-white pl-3.5 pr-8 text-sm appearance-none cursor-pointer',
                'shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition-all',
                'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100',
                statusFilter ? 'text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700' : 'text-slate-600 dark:text-slate-300',
              )}
            >
              <option value="">{t('appointments.allStatuses')}</option>
              <option value="Waiting">{t('appointments.statuses.Waiting')}</option>
              <option value="InProgress">{t('appointments.statuses.InProgress')}</option>
              <option value="Completed">{t('appointments.statuses.Completed')}</option>
              <option value="Cancelled">{t('appointments.statuses.Cancelled')}</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Doctor filter */}
          {doctorOptions.length > 0 && (
            <div className="relative">
              <select
                value={doctorFilter}
                onChange={(e) => setParam({ doctor: e.target.value || undefined, page: undefined })}
                className={cn(
                  'h-10 rounded-xl border border-slate-200 bg-white pl-3.5 pr-8 text-sm appearance-none cursor-pointer max-w-36',
                  'shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition-all',
                  'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100',
                  doctorFilter ? 'text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700' : 'text-slate-600 dark:text-slate-300',
                )}
              >
                <option value="">{t('appointments.allDoctors')}</option>
                {doctorOptions.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          )}

          {/* Date filter */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setParam({ date: e.target.value || undefined, page: undefined })}
            className={cn(
              'h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm cursor-pointer',
              'shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition-all',
              'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100',
              dateFilter ? 'border-cyan-300 dark:border-cyan-700 text-cyan-700 dark:text-cyan-300' : 'text-slate-600 dark:text-slate-300',
            )}
          />

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

          {/* Page size */}
          <div className="relative">
            <select
              value={pageSize}
              onChange={(e) => setParam({ size: e.target.value === '10' ? undefined : e.target.value, page: undefined })}
              className="h-10 rounded-xl border border-slate-200 bg-white pl-3 pr-7 text-sm appearance-none cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
            >
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n} / pg</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Active filter indicator */}
      <AnimatePresence>
        {hasFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: -8 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
              {totalCount} result{totalCount !== 1 ? 's' : ''} —
              <button
                onClick={() => { setSearch(''); setSearchParams({}, { replace: true }); }}
                className="text-cyan-600 dark:text-cyan-400 font-medium hover:underline"
              >
                Clear filters
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Table card ───────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:bg-slate-800 dark:border-slate-700 overflow-hidden">
        {/* Table meta bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-700/20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              {t('appointments.listTitle')}
            </span>
            {!isLoading && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 text-xs font-semibold">
                {totalCount}
              </span>
            )}
          </div>
          {isFetching && !isLoading && (
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Loader2 size={11} className="animate-spin" /> Refreshing
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <SortTh label={t('appointments.table.doctor')} sortKey="doctor" current={sortBy} desc={sortDesc} onSort={handleSort} className="pl-5 pr-4 py-3.5" />
                <th className="px-4 py-3.5 text-left hidden sm:table-cell">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{t('appointments.table.patient')}</span>
                </th>
                <SortTh label={t('appointments.table.date')} sortKey="date" current={sortBy} desc={sortDesc} onSort={handleSort} className="px-4 py-3.5 hidden md:table-cell" />
                <th className="px-4 py-3.5 text-left hidden lg:table-cell">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{t('appointments.table.time')}</span>
                </th>
                <SortTh label={t('appointments.table.status')} sortKey="status" current={sortBy} desc={sortDesc} onSort={handleSort} className="px-4 py-3.5" />
                <th className="px-4 py-3.5 text-left hidden xl:table-cell">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{t('appointments.table.type')}</span>
                </th>
                <th className="pr-5 pl-4 py-3.5 w-20" />
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {isLoading ? (
                Array.from({ length: Math.min(pageSize, 6) }).map((_, i) => <SkeletonRow key={i} />)
              ) : isError ? (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-20 px-6">
                      <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
                        <AlertCircle size={24} className="text-red-400" />
                      </div>
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1">{t('common.error')}</p>
                    </div>
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-20 px-6">
                      <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-700">
                        <CalendarCheck size={28} className="text-slate-300 dark:text-slate-600" />
                      </div>
                      <p className="text-base font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        {hasFilters ? t('appointments.noResults') : t('appointments.noAppointments')}
                      </p>
                      <p className="text-sm text-slate-400 dark:text-slate-500 text-center max-w-xs">
                        {hasFilters ? t('appointments.noResultsDesc') : t('appointments.noAppointmentsDesc')}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paged.map((appt, i) => (
                  <AppointmentRow
                    key={appt.id || `${appt.doctorId}-${appt.patientId}-${appt.appointmentDate}-${appt.startTime}-${i}`}
                    appt={appt}
                    index={i}
                    onView={() => setSelected(appt)}
                    t={t}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && totalCount > 0 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-700/10">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {Math.min((page - 1) * pageSize + 1, totalCount)}–{Math.min(page * pageSize, totalCount)}
              </span>{' '}
              of <span className="font-semibold text-slate-700 dark:text-slate-200">{totalCount}</span>
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <PagBtn onClick={() => setParam({ page: page > 2 ? String(page - 1) : undefined })} disabled={page === 1} aria-label="Previous">
                  <ChevronLeft size={14} />
                </PagBtn>
                {getPageNumbers(page, totalPages).map((p, i) =>
                  p === -1 ? (
                    <span key={`sep-${i}`} className="w-8 text-center text-slate-400 text-sm">…</span>
                  ) : (
                    <PagBtn key={p} onClick={() => setParam({ page: p === 1 ? undefined : String(p) })} active={p === page}>{p}</PagBtn>
                  )
                )}
                <PagBtn onClick={() => setParam({ page: String(page + 1) })} disabled={page === totalPages} aria-label="Next">
                  <ChevronRight size={14} />
                </PagBtn>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Detail modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <DetailModal
            selectedId={selected.id}
            fallback={selected}
            onClose={() => setSelected(null)}
            t={t}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Appointment row ───────────────────────────────────────────────────────────

function AppointmentRow({
  appt, index, onView, t,
}: {
  appt: AppointmentResponse;
  index: number;
  onView: () => void;
  t: (k: string) => string;
}) {
  const st = statusStr(appt.status);
  const ty = typeStr(appt.appointmentType);

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: Math.min(index * 0.025, 0.15) }}
      className="group hover:bg-slate-50/70 dark:hover:bg-slate-700/20 transition-colors"
    >
      {/* Doctor */}
      <td className="pl-5 pr-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 shrink-0">
            <Stethoscope size={14} className="text-cyan-600 dark:text-cyan-400" />
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate max-w-32 leading-tight">
            {appt.doctorName || '—'}
          </p>
        </div>
      </td>

      {/* Patient name */}
      <td className="px-4 py-3.5 hidden sm:table-cell">
        <div className="flex items-center gap-1.5">
          <Users size={12} className="text-slate-300 dark:text-slate-600 shrink-0" />
          <span className="text-sm text-slate-600 dark:text-slate-300 truncate max-w-32">
            {appt.patientFullName || appt.patientId?.slice(0, 8)}
          </span>
        </div>
      </td>

      {/* Date */}
      <td className="px-4 py-3.5 hidden md:table-cell">
        <span className="text-sm text-slate-600 dark:text-slate-300">{fmtDate(appt.appointmentDate)}</span>
      </td>

      {/* Time */}
      <td className="px-4 py-3.5 hidden lg:table-cell">
        <span className="text-sm text-slate-600 dark:text-slate-300 tabular-nums">
          {fmtTime(appt.startTime)} – {fmtTime(appt.endTime)}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3.5">
        <StatusBadge status={st} t={t} />
      </td>

      {/* Type */}
      <td className="px-4 py-3.5 hidden xl:table-cell">
        <span className="text-xs text-slate-500 dark:text-slate-400">{t(`appointments.types.${ty}`)}</span>
      </td>

      {/* Action */}
      <td className="pr-5 pl-4 py-3.5">
        <div className="flex items-center justify-end">
          <button
            onClick={onView}
            title={t('appointments.actions.view')}
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-lg transition-all',
              'text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400',
              'hover:bg-cyan-50 dark:hover:bg-cyan-900/20',
              'opacity-0 group-hover:opacity-100 focus:opacity-100',
            )}
          >
            <Eye size={14} />
          </button>
        </div>
      </td>
    </motion.tr>
  );
}
