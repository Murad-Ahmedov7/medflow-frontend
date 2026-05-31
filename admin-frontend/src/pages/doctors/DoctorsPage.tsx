import { useState, useCallback, useRef } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../../api/config';
import {
  User, UserPlus, Search, ChevronLeft, ChevronRight,
  ChevronsUpDown, ArrowUp, ArrowDown, Stethoscope,
  Users, Building2, CalendarCheck, Phone, Edit2,
  Loader2, TrendingUp, ChevronDown, UserCheck, UserX, CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import { useDoctors, useDoctorStats, useDepartments, useToggleDoctorStatus, useExportDoctors } from '../../hooks/useDoctors';
import { cn } from '../../utils/cn';
import type { DoctorResponse } from '../../types/doctor.types';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

type SortKey = 'fullName' | 'specialty' | 'department' | 'yearsOfExperience' | 'createdAt';

function DoctorAvatar({ imageUrl, name }: { imageUrl?: string; name: string }) {
  const src = imageUrl
    ? (imageUrl.startsWith('http') ? imageUrl : `${API_BASE_URL}${imageUrl}`)
    : null;

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="w-10 h-10 rounded-xl object-cover shrink-0 border-2 border-white dark:border-slate-700 shadow-sm"
      />
    );
  }

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center border-2 border-white dark:border-slate-700 shadow-sm bg-slate-100 dark:bg-slate-700">
      {initials ? (
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-none">
          {initials}
        </span>
      ) : (
        <User size={14} className="text-slate-400 dark:text-slate-500" />
      )}
    </div>
  );
}

export function DoctorsPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Read state from URL ───────────────────────────────────────
  const page       = Math.max(1, Number(searchParams.get('page') || 1));
  const rawSize    = Number(searchParams.get('size') || 10);
  const pageSize   = PAGE_SIZE_OPTIONS.includes(rawSize) ? rawSize : 10;
  const urlSearch  = searchParams.get('search') ?? '';
  const deptSlug   = searchParams.get('department') ?? '';
  const statusParam = searchParams.get('status');
  const isActive: boolean | undefined =
    statusParam === 'active' ? true : statusParam === 'inactive' ? false : undefined;
  const sortBy   = (searchParams.get('sortBy') as SortKey) || 'fullName';
  const sortDesc = searchParams.get('sortDesc') === 'true';

  // Local state for the search input only (keeps typing instant)
  const [search, setSearch] = useState(urlSearch);

  // ── Department data (needed for slug ↔ id resolution) ─────────
  const { data: deptResult } = useDepartments();
  const departments = deptResult ?? [];

  // Slug helpers — "Gastroenterology" ↔ "gastroenterology", "General Medicine" ↔ "general-medicine"
  const toSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-');
  const departmentId = deptSlug
    ? (departments.find((d) => toSlug(d.name) === deptSlug)?.id ?? undefined)
    : undefined;

  // ── Write helpers ─────────────────────────────────────────────
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

  // Debounce search → URL
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
      sortBy: key === 'fullName' ? undefined : key,
      sortDesc: nextDesc ? 'true' : undefined,
      page: undefined,
    });
  }

  function handleFilterChange(key: 'department' | 'status', value: string) {
    if (key === 'department') {
      // value is the department id from <select>; convert to slug for URL
      const name = departments.find((d) => d.id === value)?.name;
      setParam({ department: name ? toSlug(name) : undefined, page: undefined });
    } else {
      setParam({ status: value || undefined, page: undefined });
    }
  }

  const query = {
    page,
    pageSize,
    search: urlSearch || undefined,
    departmentId,
    isActive,
    sortBy,
    sortDesc,
  };

  const { data: doctorsResult, isLoading, isFetching } = useDoctors(query);
  const { data: statsResult, isSuccess: statsLoaded } = useDoctorStats();
  const { mutate: toggleStatus, isPending: isToggling } = useToggleDoctorStatus();
  const { mutate: exportDoctors, isPending: isExporting } = useExportDoctors();

  const doctors = doctorsResult?.data ?? [];
  const totalCount = doctorsResult?.pagedTotalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const stats = statsLoaded ? statsResult?.data : undefined;

  const activeCount = stats?.activeDoctors ?? 0;
  const totalDrs = stats?.totalDoctors ?? 0;
  const activeRate = totalDrs > 0 ? Math.round((activeCount / totalDrs) * 100) : 0;

  const hasActiveFilters = !!(urlSearch || deptSlug || isActive !== undefined);

  function handleExport() {
    exportDoctors({
      search: urlSearch || undefined,
      departmentId: departmentId || undefined,
      isActive,
      sortBy,
      sortDesc,
      colFullName: t('doctors.exportColumns.fullName'),
      colEmail: t('doctors.exportColumns.email'),
      colPhone: t('doctors.exportColumns.phone'),
      colDepartment: t('doctors.exportColumns.department'),
      colSpecialty: t('doctors.exportColumns.specialty'),
      colLicense: t('doctors.exportColumns.license'),
      colExperience: t('doctors.exportColumns.experience'),
      colFee: t('doctors.exportColumns.fee'),
      colStatus: t('doctors.exportColumns.status'),
      colActive: t('doctors.active'),
      colInactive: t('doctors.inactive'),
      colJoined: t('doctors.exportColumns.joined'),
      sheetName: t('doctors.exportColumns.sheetName'),
    });
  }

  return (
    <div className="space-y-6 pb-8">

      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-linear-to-br from-cyan-500 to-blue-600 shadow-sm shadow-cyan-200 dark:shadow-cyan-900/50">
              <Stethoscope size={15} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              {t('doctors.listTitle')}
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 ml-10.5">
            {t('doctors.listSubtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExport}
            disabled={isExporting}
            title={t('doctors.export')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors',
              'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800',
              'text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400',
              'hover:border-emerald-200 dark:hover:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
              'disabled:opacity-50 disabled:cursor-not-allowed shadow-sm',
            )}
          >
            {isExporting
              ? <Loader2 size={15} className="animate-spin" />
              : <FileSpreadsheet size={15} />
            }
            <span className="hidden sm:inline">
              {isExporting ? t('doctors.exporting') : t('doctors.export')}
            </span>
          </motion.button>

          <Link to="/doctors/create">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold shadow-md shadow-cyan-200 dark:shadow-cyan-900/40 transition-colors"
            >
              <UserPlus size={15} />
              {t('doctors.create')}
            </motion.button>
          </Link>
        </div>
      </div>

      {/* ── Stats Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={<Users size={19} />}
          label={t('doctors.stats.total')}
          value={stats?.totalDoctors}
          color="cyan"
          trend={null}
          loading={!statsLoaded}
        />
        <StatCard
          icon={<CheckCircle2 size={19} />}
          label={t('doctors.stats.active')}
          value={stats?.activeDoctors}
          color="emerald"
          trend={totalDrs > 0 ? `${activeRate}% active` : null}
          loading={!statsLoaded}
        />
        <StatCard
          icon={<Building2 size={19} />}
          label={t('doctors.stats.departments')}
          value={stats?.departmentCount}
          color="violet"
          trend={null}
          loading={!statsLoaded}
        />
        <StatCard
          icon={<CalendarCheck size={19} />}
          label={t('doctors.stats.todayAvailable')}
          value={stats?.todayAvailableDoctors}
          color="amber"
          trend={null}
          loading={!statsLoaded}
        />
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
            placeholder={t('doctors.search')}
            className={cn(
              'w-full h-10 rounded-xl border border-slate-200 bg-white pl-9.5 pr-9 py-0 text-sm text-slate-800 placeholder-slate-400',
              'shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition-all',
              'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500',
            )}
          />
          <AnimatePresence>
            {isFetching && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <Loader2 size={13} className="text-cyan-500 animate-spin" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Department */}
          <div className="relative">
            <select
              value={departmentId ?? ''}
              onChange={(e) => handleFilterChange('department', e.target.value)}
              className={cn(
                'h-10 rounded-xl border border-slate-200 bg-white pl-3.5 pr-8 text-sm appearance-none cursor-pointer',
                'shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition-all',
                'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100',
                departmentId ? 'text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700' : 'text-slate-600 dark:text-slate-300',
              )}
            >
              <option value="">{t('doctors.allDepartments')}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Status */}
          <div className="relative">
            <select
              value={statusParam ?? ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className={cn(
                'h-10 rounded-xl border border-slate-200 bg-white pl-3.5 pr-8 text-sm appearance-none cursor-pointer',
                'shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition-all',
                'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100',
                isActive !== undefined ? 'text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700' : 'text-slate-600 dark:text-slate-300',
              )}
            >
              <option value="">{t('doctors.allStatuses')}</option>
              <option value="active">{t('doctors.active')}</option>
              <option value="inactive">{t('doctors.inactive')}</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

          {/* Page size */}
          <div className="relative">
            <select
              value={pageSize}
              onChange={(e) => setParam({ size: e.target.value === '10' ? undefined : e.target.value, page: undefined })}
              className={cn(
                'h-10 rounded-xl border border-slate-200 bg-white pl-3 pr-7 text-sm appearance-none cursor-pointer',
                'shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition-all',
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
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-0">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
              Showing filtered results — {totalCount} match{totalCount !== 1 ? 'es' : ''}
              <button
                onClick={() => {
                  setSearch('');
                  setSearchParams({}, { replace: true });
                }}
                className="text-cyan-600 dark:text-cyan-400 font-medium hover:underline ml-1"
              >
                Clear filters
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
              {t('doctors.listTitle')}
            </span>
            {!isLoading && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 text-xs font-semibold">
                {totalCount}
              </span>
            )}
          </div>
          {isFetching && !isLoading && (
            <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Loader2 size={11} className="animate-spin" /> Refreshing
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <SortTh label={t('doctors.table.doctor')} sortKey="fullName" current={sortBy} desc={sortDesc} onSort={handleSort} className="pl-5 pr-4 py-3.5" />
                <SortTh label={t('doctors.table.specialty')} sortKey="specialty" current={sortBy} desc={sortDesc} onSort={handleSort} className="px-4 py-3.5" />
                <SortTh label={t('doctors.table.department')} sortKey="department" current={sortBy} desc={sortDesc} onSort={handleSort} className="px-4 py-3.5 hidden md:table-cell" />
                <SortTh label={t('doctors.table.experience')} sortKey="yearsOfExperience" current={sortBy} desc={sortDesc} onSort={handleSort} className="px-4 py-3.5 hidden lg:table-cell" />
                <th className="px-4 py-3.5 text-left">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{t('doctors.table.status')}</span>
                </th>
                <th className="px-4 py-3.5 text-left hidden xl:table-cell">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{t('doctors.table.contact')}</span>
                </th>
                <SortTh label={t('doctors.table.joined')} sortKey="createdAt" current={sortBy} desc={sortDesc} onSort={handleSort} className="px-4 py-3.5 hidden xl:table-cell" />
                <th className="pr-5 pl-4 py-3.5 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {isLoading ? (
                Array.from({ length: pageSize > 6 ? 6 : pageSize }).map((_, i) => <SkeletonRow key={i} />)
              ) : doctors.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState hasFilters={hasActiveFilters} t={t} />
                  </td>
                </tr>
              ) : (
                doctors.map((doctor, i) => (
                  <DoctorRow
                    key={doctor.id}
                    doctor={doctor}
                    index={i}
                    onToggleStatus={() => toggleStatus(doctor.id)}
                    isToggling={isToggling}
                    returnTo={location.search}
                    t={t}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ─────────────────────────────────────────── */}
        {!isLoading && totalCount > 0 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-700/10">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, totalCount)}
              </span>{' '}
              of{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">{totalCount}</span>
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatCard
// ─────────────────────────────────────────────────────────────────────────────

const STAT_CONFIG = {
  cyan:    { icon: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400',    bar: 'bg-cyan-500',    num: 'text-cyan-700 dark:text-cyan-300' },
  emerald: { icon: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500', num: 'text-emerald-700 dark:text-emerald-300' },
  violet:  { icon: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',   bar: 'bg-violet-500',  num: 'text-violet-700 dark:text-violet-300' },
  amber:   { icon: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',   bar: 'bg-amber-500',   num: 'text-amber-700 dark:text-amber-300' },
};

function StatCard({
  icon,
  label,
  value,
  color,
  trend,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | undefined;
  color: keyof typeof STAT_CONFIG;
  trend: string | null;
  loading: boolean;
}) {
  const cfg = STAT_CONFIG[color];
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-slate-200/80 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-sm overflow-hidden"
    >
      <div className={cn('h-0.5 w-full', cfg.bar)} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className={cn('flex items-center justify-center w-10 h-10 rounded-xl shrink-0', cfg.icon)}>
            {icon}
          </div>
          {trend && !loading && (
            <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg border border-emerald-100 dark:border-emerald-800/40">
              <TrendingUp size={10} />
              {trend}
            </div>
          )}
        </div>
        {loading ? (
          <div>
            <div className="h-7 w-12 bg-slate-100 dark:bg-slate-700/80 rounded-lg animate-pulse mb-2" />
            <div className="h-3 w-20 bg-slate-100 dark:bg-slate-700/80 rounded animate-pulse" />
          </div>
        ) : (
          <div>
            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 leading-none tabular-nums">
              {value ?? 0}
            </p>
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

function SortTh({
  label,
  sortKey,
  current,
  desc,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  desc: boolean;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = current === sortKey;
  return (
    <th className={cn('text-left', className)}>
      <button
        onClick={() => onSort(sortKey)}
        className={cn(
          'flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide transition-colors group',
          active
            ? 'text-cyan-600 dark:text-cyan-400'
            : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300',
        )}
      >
        {label}
        <span className="flex flex-col gap-px">
          {active ? (
            desc
              ? <ArrowDown size={11} className="text-cyan-500" />
              : <ArrowUp size={11} className="text-cyan-500" />
          ) : (
            <ChevronsUpDown size={11} className="opacity-40 group-hover:opacity-70 transition-opacity" />
          )}
        </span>
      </button>
    </th>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DoctorRow
// ─────────────────────────────────────────────────────────────────────────────

function DoctorRow({
  doctor,
  index,
  onToggleStatus,
  isToggling,
  returnTo,
  t,
}: {
  doctor: DoctorResponse;
  index: number;
  onToggleStatus: () => void;
  isToggling: boolean;
  returnTo: string;
  t: (k: string) => string;
}) {
  const joinedStr = new Date(doctor.createdAt).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: Math.min(index * 0.025, 0.15) }}
      className="group hover:bg-slate-50/70 dark:hover:bg-slate-700/20 transition-colors"
    >
      {/* ── Doctor ── */}
      <td className="pl-5 pr-4 py-3.5">
        <div className="flex items-center gap-3">
          <DoctorAvatar imageUrl={doctor.imageUrl} name={doctor.fullName} />
          <div className="min-w-0">
            <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate leading-tight">
              {doctor.fullName}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
              {doctor.email}
            </p>
          </div>
        </div>
      </td>

      {/* ── Specialty ── */}
      <td className="px-4 py-3.5">
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 text-xs font-semibold border border-cyan-100 dark:border-cyan-800/40 whitespace-nowrap">
          {doctor.specialty}
        </span>
      </td>

      {/* ── Department ── */}
      <td className="px-4 py-3.5 hidden md:table-cell">
        <div className="flex items-center gap-1.5">
          <Building2 size={12} className="text-slate-300 dark:text-slate-600 shrink-0" />
          <span className="text-sm text-slate-600 dark:text-slate-300 truncate max-w-35">
            {doctor.departmentName || '—'}
          </span>
        </div>
      </td>

      {/* ── Experience ── */}
      <td className="px-4 py-3.5 hidden lg:table-cell">
        <div className="flex items-center gap-1">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {doctor.yearsOfExperience}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">{t('doctors.yearsShort')}</span>
        </div>
      </td>

      {/* ── Status ── */}
      <td className="px-4 py-3.5">
        {doctor.isActive ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold border border-emerald-100 dark:border-emerald-800/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {t('doctors.active')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 text-xs font-semibold border border-slate-200 dark:border-slate-600/50">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
            {t('doctors.inactive')}
          </span>
        )}
      </td>

      {/* ── Contact ── */}
      <td className="px-4 py-3.5 hidden xl:table-cell">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Phone size={11} className="shrink-0 text-slate-300 dark:text-slate-600" />
          <span className="font-medium">{doctor.phone}</span>
        </div>
      </td>

      {/* ── Joined ── */}
      <td className="px-4 py-3.5 hidden xl:table-cell">
        <span className="text-xs text-slate-500 dark:text-slate-400">{joinedStr}</span>
      </td>

      {/* ── Actions — inline buttons, visible on row hover ── */}
      <td className="pr-5 pl-4 py-3.5">
        <div className="flex items-center justify-end gap-1.5">
          {/* Edit */}
          <Link
            to={`/doctors/${doctor.id}/edit`}
            state={{ returnTo: returnTo }}
            title={t('doctors.actions.edit')}
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-lg transition-all',
              'text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400',
              'hover:bg-cyan-50 dark:hover:bg-cyan-900/20',
              'opacity-0 group-hover:opacity-100 focus:opacity-100',
            )}
          >
            <Edit2 size={14} />
          </Link>

          {/* Toggle active */}
          <button
            onClick={onToggleStatus}
            disabled={isToggling}
            title={doctor.isActive ? 'Deactivate' : 'Activate'}
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-lg transition-all',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              doctor.isActive
                ? 'text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                : 'text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
              'opacity-0 group-hover:opacity-100 focus:opacity-100',
            )}
          >
            {isToggling
              ? <Loader2 size={14} className="animate-spin" />
              : doctor.isActive
                ? <UserX size={14} />
                : <UserCheck size={14} />
            }
          </button>
        </div>
      </td>
    </motion.tr>
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
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="h-3.5 bg-slate-100 dark:bg-slate-700 rounded-md animate-pulse w-32" />
            <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded animate-pulse w-44" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <div className="h-6 w-24 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />
      </td>
      <td className="px-4 py-3.5 hidden md:table-cell">
        <div className="h-3.5 w-28 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
      </td>
      <td className="px-4 py-3.5 hidden lg:table-cell">
        <div className="h-3.5 w-10 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
      </td>
      <td className="px-4 py-3.5">
        <div className="h-6 w-16 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />
      </td>
      <td className="px-4 py-3.5 hidden xl:table-cell">
        <div className="h-3.5 w-28 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
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
        <Stethoscope size={28} className="text-slate-300 dark:text-slate-600" />
      </div>
      <p className="text-base font-semibold text-slate-600 dark:text-slate-300 mb-1">
        {hasFilters ? t('doctors.noResults') : 'No doctors yet'}
      </p>
      <p className="text-sm text-slate-400 dark:text-slate-500 text-center max-w-xs">
        {hasFilters ? t('doctors.noResultsDesc') : 'Create your first doctor account to get started.'}
      </p>
      {!hasFilters && (
        <Link to="/doctors/create" className="mt-5">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold shadow-sm transition-colors">
            <UserPlus size={15} />
            {t('doctors.create')}
          </button>
        </Link>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PagBtn
// ─────────────────────────────────────────────────────────────────────────────

function PagBtn({
  children,
  onClick,
  disabled,
  active,
  'aria-label': ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  'aria-label'?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-all',
        active
          ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-200 dark:shadow-cyan-900/40'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200',
        disabled && 'opacity-35 cursor-not-allowed pointer-events-none',
      )}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getPageNumbers(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, -1, total];
  if (current >= total - 3) return [1, -1, total - 4, total - 3, total - 2, total - 1, total];
  return [1, -1, current - 1, current, current + 1, -1, total];
}
