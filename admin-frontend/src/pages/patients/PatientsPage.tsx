import { useState, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Search, ChevronLeft, ChevronRight,
  ChevronsUpDown, ArrowUp, ArrowDown, X,
  Loader2, ChevronDown, Eye, User,
  Phone, Mail, Calendar, CalendarCheck,
  ClipboardList, Stethoscope, Activity,
  Venus, Mars, Droplets,
} from 'lucide-react';
import { usePatients } from '../../hooks/usePatients';
import { cn } from '../../utils/cn';
import axiosInstance from '../../api/axiosInstance';
import { API_ENDPOINTS } from '../../api/config';
import type { PatientResponse, PatientEnriched } from '../../types/patient.types';
import { BLOOD_GROUP_LABELS } from '../../types/patient.types';
import type { AppointmentResponse, AppointmentStatus, AppointmentType } from '../../types/appointment.types';
import type { PrescriptionListItem } from '../../types/prescription.types';
import type { ApiListResult } from '../../types/api.types';

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [10, 20, 50];
type SortKey = 'name' | 'phone' | 'gender' | 'appointments' | 'prescriptions' | 'createdAt';

// ── Data hooks ────────────────────────────────────────────────────────────────

function useAllAppointments() {
  return useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const res = await axiosInstance.get<ApiListResult<AppointmentResponse>>(
        API_ENDPOINTS.appointments.base,
      );
      return res.data.data ?? [];
    },
    staleTime: 60_000,
  });
}

function useAllPrescriptions() {
  return useQuery({
    queryKey: ['admin-prescriptions'],
    queryFn: async () => {
      const res = await axiosInstance.get<ApiListResult<PrescriptionListItem>>(
        API_ENDPOINTS.prescriptions.base,
      );
      return res.data.data ?? [];
    },
    staleTime: 60_000,
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function fullName(p: PatientResponse) {
  return `${p.firstName} ${p.lastName}`.trim();
}

function getPageNumbers(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, -1, total];
  if (current >= total - 3) return [1, -1, total - 4, total - 3, total - 2, total - 1, total];
  return [1, -1, current - 1, current, current + 1, -1, total];
}

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  Waiting:    'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/40',
  InProgress: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/40',
  Completed:  'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40',
  Cancelled:  'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/40',
};

function normaliseStatus(raw: string | number): AppointmentStatus {
  if (typeof raw === 'string' && ['Waiting','InProgress','Completed','Cancelled'].includes(raw)) {
    return raw as AppointmentStatus;
  }
  const map: Record<number, AppointmentStatus> = { 1: 'Waiting', 2: 'InProgress', 3: 'Completed', 4: 'Cancelled' };
  return map[raw as number] ?? 'Waiting';
}

function normaliseType(raw: string | number): AppointmentType {
  if (typeof raw === 'string' && ['FirstVisit','FollowUpVisit'].includes(raw)) return raw as AppointmentType;
  const map: Record<number, AppointmentType> = { 1: 'FirstVisit', 2: 'FollowUpVisit' };
  return map[raw as number] ?? 'FirstVisit';
}

// ── PatientsPage ──────────────────────────────────────────────────────────────

export function PatientsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state
  const page       = Math.max(1, Number(searchParams.get('page') || 1));
  const rawSize    = Number(searchParams.get('size') || 10);
  const pageSize   = PAGE_SIZE_OPTIONS.includes(rawSize) ? rawSize : 10;
  const urlSearch  = searchParams.get('search') ?? '';
  const genderFilter = searchParams.get('gender') ?? '';
  const sortBy     = (searchParams.get('sort') as SortKey) || 'name';
  const sortDesc   = searchParams.get('dir') === 'desc';

  const [search, setSearch] = useState(urlSearch);

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
    }, 380);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSort(key: SortKey) {
    const nextDesc = sortBy === key ? !sortDesc : false;
    setParam({
      sort: key === 'name' ? undefined : key,
      dir: nextDesc ? 'desc' : undefined,
      page: undefined,
    });
  }

  // ── Data ─────────────────────────────────────────────────────────────────
  const { data: patientsResult, isLoading: patientsLoading } = usePatients();
  const { data: appointments = [] } = useAllAppointments();
  const { data: prescriptions = [] } = useAllPrescriptions();

  const patients = patientsResult?.data ?? [];

  // Build lookup maps
  const apptsByPatient = useMemo(() => {
    const map: Record<string, AppointmentResponse[]> = {};
    for (const a of appointments) {
      (map[a.patientId] ??= []).push(a);
    }
    return map;
  }, [appointments]);

  // Email lookup: first appointment for each patient carries patientEmail
  const emailByPatient = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of appointments) {
      if (a.patientEmail && !map[a.patientId]) {
        map[a.patientId] = a.patientEmail;
      }
    }
    return map;
  }, [appointments]);

  // Prescription count: match by patientFullName (no patientId on prescription list)
  const rxCountByName = useMemo(() => {
    const map: Record<string, number> = {};
    for (const rx of prescriptions) {
      const key = rx.patientFullName?.toLowerCase().trim() ?? '';
      if (key) map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [prescriptions]);

  // Enrich patients
  const enriched: PatientEnriched[] = useMemo(() => {
    return patients.map((p) => ({
      ...p,
      email: emailByPatient[p.id] ?? null,
      appointmentCount: apptsByPatient[p.id]?.length ?? 0,
      prescriptionCount: rxCountByName[fullName(p).toLowerCase().trim()] ?? 0,
    }));
  }, [patients, emailByPatient, apptsByPatient, rxCountByName]);

  // Filter
  const filtered = useMemo(() => {
    const q = urlSearch.toLowerCase();
    return enriched.filter((p) => {
      const matchSearch = !q || [
        fullName(p).toLowerCase(),
        (p.email ?? '').toLowerCase(),
        p.phone.toLowerCase(),
      ].some((s) => s.includes(q));

      const matchGender = !genderFilter || p.gender === genderFilter;

      return matchSearch && matchGender;
    });
  }, [enriched, urlSearch, genderFilter]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name')          cmp = fullName(a).localeCompare(fullName(b));
      else if (sortBy === 'phone')    cmp = a.phone.localeCompare(b.phone);
      else if (sortBy === 'gender')   cmp = (a.gender ?? '').localeCompare(b.gender ?? '');
      else if (sortBy === 'appointments') cmp = a.appointmentCount - b.appointmentCount;
      else if (sortBy === 'prescriptions') cmp = a.prescriptionCount - b.prescriptionCount;
      else if (sortBy === 'createdAt') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDesc ? -cmp : cmp;
    });
  }, [filtered, sortBy, sortDesc]);

  const totalCount = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const hasActiveFilters = !!(urlSearch || genderFilter);

  // ── Drawer state ──────────────────────────────────────────────────────────
  const [selectedPatient, setSelectedPatient] = useState<PatientEnriched | null>(null);

  // Derived unique genders for filter dropdown
  const availableGenders = useMemo(() => {
    const set = new Set(enriched.map((p) => p.gender).filter(Boolean));
    return Array.from(set).sort();
  }, [enriched]);

  return (
    <div className="space-y-6 pb-8">

      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-linear-to-br from-teal-500 to-cyan-600 shadow-sm shadow-teal-200 dark:shadow-teal-900/50">
              <Users size={15} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              {t('patients.listTitle')}
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 ml-10.5">
            {t('patients.listSubtitle')}
          </p>
        </div>
      </div>

      {/* ── Stats strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<Users size={18} />}         label={t('patients.stats.total')}         value={patientsLoading ? undefined : patients.length}                color="teal" />
        <StatCard icon={<CalendarCheck size={18} />} label={t('patients.stats.appointments')}  value={patientsLoading ? undefined : appointments.length}           color="cyan" />
        <StatCard icon={<ClipboardList size={18} />} label={t('patients.stats.prescriptions')} value={patientsLoading ? undefined : prescriptions.length}          color="indigo" />
        <StatCard icon={<Activity size={18} />}      label={t('patients.stats.activeThisWeek')} value={patientsLoading ? undefined : countActiveThisWeek(appointments)} color="violet" />
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
            placeholder={t('patients.search')}
            className={cn(
              'w-full h-10 rounded-xl border border-slate-200 bg-white pl-9.5 pr-4 py-0 text-sm text-slate-800 placeholder-slate-400',
              'shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all',
              'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500',
            )}
          />
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Gender filter */}
          {availableGenders.length > 0 && (
            <div className="relative">
              <select
                value={genderFilter}
                onChange={(e) => setParam({ gender: e.target.value || undefined, page: undefined })}
                className={cn(
                  'h-10 rounded-xl border border-slate-200 bg-white pl-3.5 pr-8 text-sm appearance-none cursor-pointer',
                  'shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all',
                  'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100',
                  genderFilter ? 'text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700' : 'text-slate-600 dark:text-slate-300',
                )}
              >
                <option value="">{t('patients.allGenders')}</option>
                {availableGenders.map((g) => (
                  <option key={g} value={g}>{t(`patients.gender.${g}`, { defaultValue: g })}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          )}

          {/* Divider */}
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

          {/* Page size */}
          <div className="relative">
            <select
              value={pageSize}
              onChange={(e) => setParam({ size: e.target.value === '10' ? undefined : e.target.value, page: undefined })}
              className={cn(
                'h-10 rounded-xl border border-slate-200 bg-white pl-3 pr-7 text-sm appearance-none cursor-pointer',
                'shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all',
                'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300',
              )}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n} / pg</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Active filter indicator */}
      <AnimatePresence>
        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: -8 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              {totalCount} {t('patients.filterResults')}
              <button
                onClick={() => { setSearch(''); setSearchParams({}, { replace: true }); }}
                className="flex items-center gap-1 text-teal-600 dark:text-teal-400 font-medium hover:underline ml-1"
              >
                <X size={11} />
                {t('common.clear')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Table Card ───────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:bg-slate-800 dark:border-slate-700 overflow-hidden">

        {/* Table meta bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-700/20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              {t('patients.listTitle')}
            </span>
            {!patientsLoading && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-xs font-semibold">
                {totalCount}
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <SortTh label={t('patients.table.patient')}       sortKey="name"          current={sortBy} desc={sortDesc} onSort={handleSort} className="pl-5 pr-4 py-3.5" />
                <SortTh label={t('patients.table.gender')}        sortKey="gender"        current={sortBy} desc={sortDesc} onSort={handleSort} className="px-4 py-3.5 hidden sm:table-cell" />
                <th className="px-4 py-3.5 text-left hidden md:table-cell">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{t('patients.table.phone')}</span>
                </th>
                <SortTh label={t('patients.table.appointments')}  sortKey="appointments"  current={sortBy} desc={sortDesc} onSort={handleSort} className="px-4 py-3.5 hidden lg:table-cell" />
                <SortTh label={t('patients.table.prescriptions')} sortKey="prescriptions" current={sortBy} desc={sortDesc} onSort={handleSort} className="px-4 py-3.5 hidden lg:table-cell" />
                <SortTh label={t('patients.table.registered')}    sortKey="createdAt"     current={sortBy} desc={sortDesc} onSort={handleSort} className="px-4 py-3.5 hidden xl:table-cell" />
                <th className="pr-5 pl-4 py-3.5 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {patientsLoading ? (
                Array.from({ length: Math.min(pageSize, 6) }).map((_, i) => <SkeletonRow key={i} />)
              ) : pageItems.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState hasFilters={hasActiveFilters} t={t} />
                  </td>
                </tr>
              ) : (
                pageItems.map((patient, i) => (
                  <PatientRow
                    key={patient.id}
                    patient={patient}
                    index={i}
                    onView={() => setSelectedPatient(patient)}
                    t={t}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ─────────────────────────────────────────── */}
        {!patientsLoading && totalCount > 0 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-700/10">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('patients.pagination.showing')}{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, totalCount)}
              </span>{' '}
              {t('patients.pagination.of')}{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">{totalCount}</span>
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <PagBtn onClick={() => setParam({ page: currentPage > 2 ? String(currentPage - 1) : undefined })} disabled={currentPage === 1}>
                  <ChevronLeft size={14} />
                </PagBtn>
                {getPageNumbers(currentPage, totalPages).map((p, i) =>
                  p === -1 ? (
                    <span key={`sep-${i}`} className="w-8 text-center text-slate-400 text-sm">…</span>
                  ) : (
                    <PagBtn key={p} onClick={() => setParam({ page: p === 1 ? undefined : String(p) })} active={p === currentPage}>{p}</PagBtn>
                  )
                )}
                <PagBtn onClick={() => setParam({ page: String(currentPage + 1) })} disabled={currentPage === totalPages}>
                  <ChevronRight size={14} />
                </PagBtn>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Patient Details Drawer ────────────────────────────────── */}
      <AnimatePresence>
        {selectedPatient && (
          <PatientDrawer
            patient={selectedPatient}
            appointments={apptsByPatient[selectedPatient.id] ?? []}
            prescriptions={prescriptions.filter(
              (rx) => rx.patientFullName?.toLowerCase().trim() === fullName(selectedPatient).toLowerCase().trim()
            )}
            onClose={() => setSelectedPatient(null)}
            t={t}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function countActiveThisWeek(appointments: AppointmentResponse[]): number {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const seen = new Set<string>();
  for (const a of appointments) {
    const d = new Date(a.appointmentDate);
    if (d >= weekAgo && d <= now) seen.add(a.patientId);
  }
  return seen.size;
}

// ─────────────────────────────────────────────────────────────────────────────
// StatCard
// ─────────────────────────────────────────────────────────────────────────────

const STAT_CFG = {
  teal:   { icon: 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400',     bar: 'bg-teal-500' },
  cyan:   { icon: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400',     bar: 'bg-cyan-500' },
  indigo: { icon: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400', bar: 'bg-indigo-500' },
  violet: { icon: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400', bar: 'bg-violet-500' },
};

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: number | undefined; color: keyof typeof STAT_CFG;
}) {
  const cfg = STAT_CFG[color];
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-slate-200/80 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-sm overflow-hidden"
    >
      <div className={cn('h-0.5 w-full', cfg.bar)} />
      <div className="p-5">
        <div className={cn('flex items-center justify-center w-10 h-10 rounded-xl shrink-0 mb-4', cfg.icon)}>
          {icon}
        </div>
        {value === undefined ? (
          <div>
            <div className="h-7 w-12 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse mb-2" />
            <div className="h-3 w-20 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
          </div>
        ) : (
          <div>
            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 leading-none tabular-nums">{value}</p>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1.5">{label}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SortTh
// ─────────────────────────────────────────────────────────────────────────────

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
          active
            ? 'text-teal-600 dark:text-teal-400'
            : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300',
        )}
      >
        {label}
        <span className="flex flex-col gap-px">
          {active ? (
            desc ? <ArrowDown size={11} className="text-teal-500" /> : <ArrowUp size={11} className="text-teal-500" />
          ) : (
            <ChevronsUpDown size={11} className="opacity-40 group-hover:opacity-70 transition-opacity" />
          )}
        </span>
      </button>
    </th>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PatientRow
// ─────────────────────────────────────────────────────────────────────────────

function PatientAvatar({ name, imageUrl }: { name: string; imageUrl?: string | null }) {
  if (imageUrl) {
    return <img src={imageUrl} alt={name} className="w-10 h-10 rounded-xl object-cover shrink-0 border-2 border-white dark:border-slate-700 shadow-sm" />;
  }
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  return (
    <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center border-2 border-white dark:border-slate-700 shadow-sm bg-teal-50 dark:bg-teal-900/20">
      {initials ? (
        <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 leading-none">{initials}</span>
      ) : (
        <User size={14} className="text-teal-400" />
      )}
    </div>
  );
}

function PatientRow({ patient, index, onView, t }: {
  patient: PatientEnriched; index: number;
  onView: () => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const name = fullName(patient);
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: Math.min(index * 0.025, 0.15) }}
      className="group hover:bg-slate-50/70 dark:hover:bg-slate-700/20 transition-colors"
    >
      {/* Patient */}
      <td className="pl-5 pr-4 py-3.5">
        <div className="flex items-center gap-3">
          <PatientAvatar name={name} />
          <div className="min-w-0">
            <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate leading-tight">{name}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
              {patient.email ?? patient.fin ?? '—'}
            </p>
          </div>
        </div>
      </td>

      {/* Gender */}
      <td className="px-4 py-3.5 hidden sm:table-cell">
        <GenderBadge gender={patient.gender} t={t} />
      </td>

      {/* Phone */}
      <td className="px-4 py-3.5 hidden md:table-cell">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Phone size={11} className="shrink-0 text-slate-300 dark:text-slate-600" />
          <span className="font-medium">{patient.phone}</span>
        </div>
      </td>

      {/* Appointment count */}
      <td className="px-4 py-3.5 hidden lg:table-cell">
        <span className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border',
          patient.appointmentCount > 0
            ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 border-cyan-100 dark:border-cyan-800/40'
            : 'bg-slate-50 dark:bg-slate-700/40 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-700',
        )}>
          <CalendarCheck size={11} />
          {patient.appointmentCount}
        </span>
      </td>

      {/* Prescription count */}
      <td className="px-4 py-3.5 hidden lg:table-cell">
        <span className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border',
          patient.prescriptionCount > 0
            ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800/40'
            : 'bg-slate-50 dark:bg-slate-700/40 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-700',
        )}>
          <ClipboardList size={11} />
          {patient.prescriptionCount}
        </span>
      </td>

      {/* Registered */}
      <td className="px-4 py-3.5 hidden xl:table-cell">
        <span className="text-xs text-slate-500 dark:text-slate-400">{fmtDate(patient.createdAt)}</span>
      </td>

      {/* Actions */}
      <td className="pr-5 pl-4 py-3.5">
        <div className="flex items-center justify-end">
          <button
            onClick={onView}
            title={t('patients.actions.view')}
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-lg transition-all',
              'text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20',
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

// ─────────────────────────────────────────────────────────────────────────────
// GenderBadge
// ─────────────────────────────────────────────────────────────────────────────

function GenderBadge({ gender, t }: { gender: string; t: (k: string, opts?: Record<string, unknown>) => string }) {
  if (!gender) return <span className="text-xs text-slate-400">—</span>;
  const isMale = gender === 'Male';
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border',
      isMale
        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800/40'
        : 'bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 border-pink-100 dark:border-pink-800/40',
    )}>
      {isMale ? <Mars size={11} /> : <Venus size={11} />}
      {t(`patients.gender.${gender}`, { defaultValue: gender })}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SkeletonRow
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-50 dark:border-slate-700/40">
      <td className="pl-5 pr-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 animate-pulse shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 w-32 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
            <div className="h-3 w-44 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5 hidden sm:table-cell">
        <div className="h-6 w-16 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />
      </td>
      <td className="px-4 py-3.5 hidden md:table-cell">
        <div className="h-3.5 w-28 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
      </td>
      <td className="px-4 py-3.5 hidden lg:table-cell">
        <div className="h-6 w-10 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />
      </td>
      <td className="px-4 py-3.5 hidden lg:table-cell">
        <div className="h-6 w-10 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />
      </td>
      <td className="px-4 py-3.5 hidden xl:table-cell">
        <div className="h-3.5 w-20 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
      </td>
      <td className="pr-5 pl-4 py-3.5">
        <div className="flex justify-end">
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />
        </div>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EmptyState
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({ hasFilters, t }: { hasFilters: boolean; t: (k: string) => string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-700">
        <Users size={28} className="text-slate-300 dark:text-slate-600" />
      </div>
      <p className="text-base font-semibold text-slate-600 dark:text-slate-300 mb-1">
        {hasFilters ? t('patients.noResults') : t('patients.empty')}
      </p>
      <p className="text-sm text-slate-400 dark:text-slate-500 text-center max-w-xs">
        {hasFilters ? t('patients.noResultsDesc') : t('patients.emptyDesc')}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PagBtn
// ─────────────────────────────────────────────────────────────────────────────

function PagBtn({ children, onClick, disabled, active }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-all',
        active
          ? 'bg-teal-600 text-white shadow-sm shadow-teal-200 dark:shadow-teal-900/40'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200',
        disabled && 'opacity-35 cursor-not-allowed pointer-events-none',
      )}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PatientDrawer
// ─────────────────────────────────────────────────────────────────────────────

type DrawerTab = 'appointments' | 'prescriptions';

function PatientDrawer({
  patient, appointments, prescriptions, onClose, t,
}: {
  patient: PatientEnriched;
  appointments: AppointmentResponse[];
  prescriptions: PrescriptionListItem[];
  onClose: () => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('appointments');
  const name = fullName(patient);

  // Sort appointments newest first
  const sortedAppts = useMemo(() =>
    [...appointments].sort((a, b) =>
      new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime()
    ), [appointments]);

  // Sort prescriptions newest first
  const sortedRx = useMemo(() =>
    [...prescriptions].sort((a, b) => {
      const da = a.appointmentDate ? new Date(a.appointmentDate).getTime() : 0;
      const db = b.appointmentDate ? new Date(b.appointmentDate).getTime() : 0;
      return db - da;
    }), [prescriptions]);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-black/30 dark:bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <PatientAvatar name={name} />
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{name}</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                {patient.email ?? patient.fin ?? patient.phone}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 ml-2"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Patient Info Grid ────────────────────────────────── */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="grid grid-cols-2 gap-3">
            <InfoItem icon={<Mail size={13} />}     label={t('patients.drawer.email')}     value={patient.email ?? '—'} />
            <InfoItem icon={<Phone size={13} />}    label={t('patients.drawer.phone')}     value={patient.phone} />
            <InfoItem icon={<Venus size={13} />}    label={t('patients.drawer.gender')}    value={t(`patients.gender.${patient.gender}`, { defaultValue: patient.gender || '—' })} />
            <InfoItem icon={<Calendar size={13} />} label={t('patients.drawer.registered')} value={fmtDate(patient.createdAt)} />
            {patient.birthDate && (
              <InfoItem icon={<Calendar size={13} />} label={t('patients.drawer.birthDate')} value={fmtDate(patient.birthDate)} />
            )}
            {patient.bloodGroup && patient.bloodGroup !== 'Unknown' && (
              <InfoItem icon={<Droplets size={13} />} label={t('patients.drawer.bloodGroup')} value={BLOOD_GROUP_LABELS[patient.bloodGroup] ?? patient.bloodGroup} />
            )}
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────── */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 shrink-0">
          <TabButton
            active={activeTab === 'appointments'}
            onClick={() => setActiveTab('appointments')}
            icon={<CalendarCheck size={13} />}
            label={t('patients.drawer.appointments')}
            count={appointments.length}
          />
          <TabButton
            active={activeTab === 'prescriptions'}
            onClick={() => setActiveTab('prescriptions')}
            icon={<ClipboardList size={13} />}
            label={t('patients.drawer.prescriptions')}
            count={prescriptions.length}
          />
        </div>

        {/* ── Tab Content ──────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'appointments' ? (
            sortedAppts.length === 0 ? (
              <DrawerEmpty icon={<CalendarCheck size={24} />} label={t('patients.drawer.noAppointments')} />
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {sortedAppts.map((appt) => (
                  <AppointmentItem key={appt.id} appt={appt} t={t} />
                ))}
              </div>
            )
          ) : (
            sortedRx.length === 0 ? (
              <DrawerEmpty icon={<ClipboardList size={24} />} label={t('patients.drawer.noPrescriptions')} />
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {sortedRx.map((rx) => (
                  <PrescriptionItem key={rx.id} rx={rx} t={t} />
                ))}
              </div>
            )
          )}
        </div>
      </motion.div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawer sub-components
// ─────────────────────────────────────────────────────────────────────────────

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-slate-300 dark:text-slate-600 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide font-semibold">{label}</p>
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, count }: {
  active: boolean; onClick: () => void;
  icon: React.ReactNode; label: string; count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold transition-colors relative',
        active
          ? 'text-teal-600 dark:text-teal-400'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
      )}
    >
      {icon}
      {label}
      <span className={cn(
        'inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-bold',
        active
          ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-500',
      )}>
        {count}
      </span>
      {active && (
        <motion.div
          layoutId="patient-drawer-tab"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500"
        />
      )}
    </button>
  );
}

function DrawerEmpty({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <div className="opacity-30 mb-3">{icon}</div>
      <p className="text-sm">{label}</p>
    </div>
  );
}

function AppointmentItem({ appt, t }: {
  appt: AppointmentResponse;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const status = normaliseStatus(appt.status);
  const type   = normaliseType(appt.appointmentType);

  return (
    <div className="px-5 py-3.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Stethoscope size={11} className="text-slate-400 shrink-0" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
              {appt.doctorName}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar size={10} />
              {fmtDate(appt.appointmentDate)}
            </span>
            <span className="flex items-center gap-1">
              <Loader2 size={10} />
              {appt.startTime?.slice(0, 5)}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {t(`appointments.types.${type}`, { defaultValue: type })}
          </p>
        </div>
        <span className={cn(
          'shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border',
          STATUS_STYLES[status],
        )}>
          {t(`appointments.statuses.${status}`, { defaultValue: status })}
        </span>
      </div>
    </div>
  );
}

function PrescriptionItem({ rx, t }: {
  rx: PrescriptionListItem;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <div className="px-5 py-3.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{rx.title}</p>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            <Stethoscope size={10} className="shrink-0" />
            <span className="truncate">{rx.doctorFullName}</span>
          </div>
        </div>
        {rx.appointmentDate && (
          <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <Calendar size={10} />
            {fmtDate(rx.appointmentDate)}
          </span>
        )}
      </div>
      {rx.prescriptionItems.length > 0 && (
        <div className="space-y-1">
          {rx.prescriptionItems.map((item) => (
            <div key={item.id} className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
              <div className="w-1 h-1 rounded-full bg-indigo-400 shrink-0" />
              <span className="font-medium text-slate-600 dark:text-slate-300">{item.medicineName}</span>
              <span>{item.dose}mg · {item.frequency}×/day · {item.durationInDays}d</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
