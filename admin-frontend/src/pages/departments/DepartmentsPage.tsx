import { useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Building2, Plus, Search, ChevronLeft, ChevronRight,
  ChevronsUpDown, ArrowUp, ArrowDown, Edit2, Trash2,
  Loader2, X, Users, Stethoscope, ExternalLink,
  CalendarDays, AlertCircle,
} from 'lucide-react';
import { useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment, useDoctors } from '../../hooks/useDoctors';
import { cn } from '../../utils/cn';
import type { DepartmentResponse } from '../../types/department.types';
import type { DoctorResponse } from '../../types/doctor.types';
import { API_BASE_URL } from '../../api/config';

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

type SortKey = 'name' | 'doctorCount' | 'createdAt';

// ── Zod schema ────────────────────────────────────────────────────────────────

const deptSchema = z.object({
  name: z.string().min(2, 'departments.validation.nameMin').max(100, 'departments.validation.nameMax'),
  imageUrl: z.string().url('departments.validation.imageUrlInvalid').or(z.literal('')).optional(),
});

type DeptFormValues = z.infer<typeof deptSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function getPageNumbers(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, -1, total];
  if (current >= total - 3) return [1, -1, total - 4, total - 3, total - 2, total - 1, total];
  return [1, -1, current - 1, current, current + 1, -1, total];
}

// ── DepartmentsPage ───────────────────────────────────────────────────────────

export function DepartmentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state
  const page     = Math.max(1, Number(searchParams.get('page') || 1));
  const urlSearch = searchParams.get('search') ?? '';
  const sortBy   = (searchParams.get('sortBy') as SortKey) || 'name';
  const sortDesc = searchParams.get('sortDesc') === 'true';

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
      sortBy: key === 'name' ? undefined : key,
      sortDesc: nextDesc ? 'true' : undefined,
      page: undefined,
    });
  }

  // ── Data ─────────────────────────────────────────────────────────────────
  const { data: deptList = [], isLoading: deptsLoading } = useDepartments();
  const { data: doctorsResult } = useDoctors({ pageSize: 500 });

  // Build doctorCount per department
  const doctorsByDept = useMemo(() => {
    const map: Record<string, DoctorResponse[]> = {};
    for (const d of doctorsResult?.data ?? []) {
      if (d.departmentId) {
        (map[d.departmentId] ??= []).push(d);
      }
    }
    return map;
  }, [doctorsResult]);

  // Enrich, filter, sort, paginate — all client-side
  const enriched = useMemo(() => {
    return deptList.map((d) => ({
      ...d,
      doctorCount: doctorsByDept[d.id]?.length ?? 0,
    }));
  }, [deptList, doctorsByDept]);

  const filtered = useMemo(() => {
    const q = urlSearch.toLowerCase();
    return q ? enriched.filter((d) => d.name.toLowerCase().includes(q)) : enriched;
  }, [enriched, urlSearch]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name')        cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'doctorCount') cmp = a.doctorCount - b.doctorCount;
      else if (sortBy === 'createdAt')   cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDesc ? -cmp : cmp;
    });
  }, [filtered, sortBy, sortDesc]);

  const totalCount = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const hasActiveFilters = !!urlSearch;

  // ── Modal state ───────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen]   = useState(false);
  const [editTarget, setEditTarget]   = useState<(typeof enriched)[0] | null>(null);
  const [viewTarget, setViewTarget]   = useState<(typeof enriched)[0] | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<(typeof enriched)[0] | null>(null);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const { mutate: createDept, isPending: isCreating } = useCreateDepartment();
  const { mutate: updateDept, isPending: isUpdating } = useUpdateDepartment();
  const { mutate: deleteDept, isPending: isDeleting } = useDeleteDepartment();

  function handleCreate(values: DeptFormValues) {
    createDept(
      { name: values.name, imageUrl: values.imageUrl || undefined },
      { onSuccess: (res) => { if (res.isSuccess) setCreateOpen(false); } },
    );
  }

  function handleUpdate(values: DeptFormValues) {
    if (!editTarget) return;
    updateDept(
      { id: editTarget.id, data: { name: values.name, imageUrl: values.imageUrl || undefined } },
      { onSuccess: (res) => { if (res.isSuccess) setEditTarget(null); } },
    );
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteDept(deleteTarget.id, {
      onSuccess: (res) => { if (res.isSuccess) setDeleteTarget(null); },
    });
  }

  return (
    <div className="space-y-6 pb-8">

      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-linear-to-br from-violet-500 to-indigo-600 shadow-sm shadow-violet-200 dark:shadow-violet-900/50">
              <Building2 size={15} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              {t('departments.listTitle')}
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 ml-10.5">
            {t('departments.listSubtitle')}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold shadow-md shadow-cyan-200 dark:shadow-cyan-900/40 transition-colors shrink-0"
        >
          <Plus size={15} />
          {t('departments.create')}
        </motion.button>
      </div>

      {/* ── Stats strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Building2 size={18} />}
          label={t('departments.stats.total')}
          value={deptsLoading ? undefined : deptList.length}
          color="violet"
        />
        <StatCard
          icon={<Users size={18} />}
          label={t('departments.stats.totalDoctors')}
          value={deptsLoading ? undefined : (doctorsResult?.pagedTotalCount ?? 0)}
          color="cyan"
        />
        <StatCard
          icon={<Stethoscope size={18} />}
          label={t('departments.stats.avgDoctors')}
          value={deptsLoading ? undefined : (
            deptList.length > 0
              ? Math.round((doctorsResult?.pagedTotalCount ?? 0) / deptList.length * 10) / 10
              : 0
          )}
          color="indigo"
          isDecimal
        />
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t('departments.search')}
            className={cn(
              'w-full h-10 rounded-xl border border-slate-200 bg-white pl-9.5 pr-4 py-0 text-sm text-slate-800 placeholder-slate-400',
              'shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition-all',
              'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500',
            )}
          />
        </div>
        {hasActiveFilters && (
          <button
            onClick={() => { setSearch(''); setSearchParams({}, { replace: true }); }}
            className="flex items-center gap-1.5 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-700 transition-colors bg-white dark:bg-slate-800"
          >
            <X size={13} />
            {t('common.clear')}
          </button>
        )}
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
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
              {totalCount} {t('departments.filterResults')}
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
              {t('departments.listTitle')}
            </span>
            {!deptsLoading && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-semibold">
                {totalCount}
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <SortTh label={t('departments.table.department')} sortKey="name" current={sortBy} desc={sortDesc} onSort={handleSort} className="pl-5 pr-4 py-3.5" />
                <SortTh label={t('departments.table.doctors')} sortKey="doctorCount" current={sortBy} desc={sortDesc} onSort={handleSort} className="px-4 py-3.5" />
                <SortTh label={t('departments.table.created')} sortKey="createdAt" current={sortBy} desc={sortDesc} onSort={handleSort} className="px-4 py-3.5 hidden md:table-cell" />
                <th className="pr-5 pl-4 py-3.5 w-28" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {deptsLoading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : pageItems.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <EmptyState hasFilters={hasActiveFilters} onAdd={() => setCreateOpen(true)} t={t} />
                  </td>
                </tr>
              ) : (
                pageItems.map((dept, i) => (
                  <DeptRow
                    key={dept.id}
                    dept={dept}
                    index={i}
                    doctors={doctorsByDept[dept.id] ?? []}
                    onView={() => setViewTarget(dept)}
                    onEdit={() => setEditTarget(dept)}
                    onDelete={() => setDeleteTarget(dept)}
                    onViewDoctors={() => navigate(`/doctors?department=${dept.name.toLowerCase().replace(/\s+/g, '-')}`)}
                    t={t}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ─────────────────────────────────────────── */}
        {!deptsLoading && totalCount > PAGE_SIZE && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-700/10">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('departments.pagination.showing')}{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, totalCount)}
              </span>{' '}
              {t('departments.pagination.of')}{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">{totalCount}</span>
            </p>
            <div className="flex items-center gap-1">
              <PagBtn
                onClick={() => setParam({ page: currentPage > 2 ? String(currentPage - 1) : undefined })}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={14} />
              </PagBtn>
              {getPageNumbers(currentPage, totalPages).map((p, i) =>
                p === -1 ? (
                  <span key={`sep-${i}`} className="w-8 text-center text-slate-400 text-sm">…</span>
                ) : (
                  <PagBtn key={p} onClick={() => setParam({ page: p === 1 ? undefined : String(p) })} active={p === currentPage}>{p}</PagBtn>
                )
              )}
              <PagBtn
                onClick={() => setParam({ page: String(currentPage + 1) })}
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={14} />
              </PagBtn>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {createOpen && (
          <DeptFormModal
            title={t('departments.createTitle')}
            onSubmit={handleCreate}
            onClose={() => setCreateOpen(false)}
            isPending={isCreating}
            t={t}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editTarget && (
          <DeptFormModal
            title={t('departments.editTitle')}
            defaultValues={{ name: editTarget.name, imageUrl: editTarget.imageUrl ?? '' }}
            onSubmit={handleUpdate}
            onClose={() => setEditTarget(null)}
            isPending={isUpdating}
            t={t}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewTarget && (
          <ViewModal
            dept={viewTarget}
            doctors={doctorsByDept[viewTarget.id] ?? []}
            onClose={() => setViewTarget(null)}
            onEdit={() => { setViewTarget(null); setEditTarget(viewTarget); }}
            onViewDoctors={() => {
              setViewTarget(null);
              navigate(`/doctors?department=${viewTarget.name.toLowerCase().replace(/\s+/g, '-')}`);
            }}
            t={t}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <DeleteModal
            dept={deleteTarget}
            onConfirm={handleDelete}
            onClose={() => setDeleteTarget(null)}
            isPending={isDeleting}
            t={t}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatCard
// ─────────────────────────────────────────────────────────────────────────────

const STAT_CFG = {
  violet: { icon: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400', bar: 'bg-violet-500', num: 'text-violet-700 dark:text-violet-300' },
  cyan:   { icon: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400',         bar: 'bg-cyan-500',   num: 'text-cyan-700 dark:text-cyan-300' },
  indigo: { icon: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400', bar: 'bg-indigo-500', num: 'text-indigo-700 dark:text-indigo-300' },
};

function StatCard({
  icon, label, value, color, isDecimal,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | undefined;
  color: keyof typeof STAT_CFG;
  isDecimal?: boolean;
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
            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 leading-none tabular-nums">
              {isDecimal ? value.toFixed(1) : value}
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
  label, sortKey, current, desc, onSort, className,
}: {
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
            ? 'text-violet-600 dark:text-violet-400'
            : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300',
        )}
      >
        {label}
        <span className="flex flex-col gap-px">
          {active ? (
            desc
              ? <ArrowDown size={11} className="text-violet-500" />
              : <ArrowUp size={11} className="text-violet-500" />
          ) : (
            <ChevronsUpDown size={11} className="opacity-40 group-hover:opacity-70 transition-opacity" />
          )}
        </span>
      </button>
    </th>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DeptRow
// ─────────────────────────────────────────────────────────────────────────────

function DeptAvatar({ imageUrl, name }: { imageUrl?: string; name: string }) {
  if (imageUrl) {
    const src = imageUrl.startsWith('http') ? imageUrl : `${API_BASE_URL}${imageUrl}`;
    return (
      <img
        src={src}
        alt={name}
        className="w-10 h-10 rounded-xl object-cover shrink-0 border-2 border-white dark:border-slate-700 shadow-sm"
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center border-2 border-white dark:border-slate-700 shadow-sm bg-violet-50 dark:bg-violet-900/20">
      <Building2 size={16} className="text-violet-400 dark:text-violet-500" />
    </div>
  );
}

function DeptRow({
  dept, index, doctors, onView, onEdit, onDelete, onViewDoctors, t,
}: {
  dept: DepartmentResponse & { doctorCount: number };
  index: number;
  doctors: DoctorResponse[];
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onViewDoctors: () => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: Math.min(index * 0.025, 0.15) }}
      className="group hover:bg-slate-50/70 dark:hover:bg-slate-700/20 transition-colors"
    >
      {/* Department name + avatar */}
      <td className="pl-5 pr-4 py-3.5">
        <button onClick={onView} className="flex items-center gap-3 text-left w-full">
          <DeptAvatar imageUrl={dept.imageUrl} name={dept.name} />
          <div className="min-w-0">
            <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate leading-tight hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
              {dept.name}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {t('departments.table.id')}: {dept.id.slice(0, 8)}…
            </p>
          </div>
        </button>
      </td>

      {/* Doctor count */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 text-xs font-semibold border border-cyan-100 dark:border-cyan-800/40">
            <Users size={11} />
            {dept.doctorCount}
          </span>
          {dept.doctorCount > 0 && (
            <button
              onClick={onViewDoctors}
              title={t('departments.viewDoctors')}
              className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-400 hover:underline transition-opacity"
            >
              {t('departments.viewDoctors')}
              <ExternalLink size={10} />
            </button>
          )}
        </div>

        {/* Stacked doctor avatars */}
        {doctors.length > 0 && (
          <div className="flex mt-1.5 -space-x-2">
            {doctors.slice(0, 4).map((doc) => {
              const src = doc.imageUrl
                ? (doc.imageUrl.startsWith('http') ? doc.imageUrl : `${API_BASE_URL}${doc.imageUrl}`)
                : null;
              return src ? (
                <img
                  key={doc.id}
                  src={src}
                  alt={doc.fullName}
                  title={doc.fullName}
                  className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 object-cover"
                />
              ) : (
                <div
                  key={doc.id}
                  title={doc.fullName}
                  className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 bg-slate-200 dark:bg-slate-700 flex items-center justify-center"
                >
                  <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">
                    {doc.fullName[0].toUpperCase()}
                  </span>
                </div>
              );
            })}
            {doctors.length > 4 && (
              <div className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                  +{doctors.length - 4}
                </span>
              </div>
            )}
          </div>
        )}
      </td>

      {/* Created date */}
      <td className="px-4 py-3.5 hidden md:table-cell">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <CalendarDays size={11} className="shrink-0 text-slate-300 dark:text-slate-600" />
          {fmtDate(dept.createdAt)}
        </div>
      </td>

      {/* Actions */}
      <td className="pr-5 pl-4 py-3.5">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={onView}
            title={t('departments.actions.view')}
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-lg transition-all',
              'text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20',
              'opacity-0 group-hover:opacity-100 focus:opacity-100',
            )}
          >
            <ExternalLink size={14} />
          </button>
          <button
            onClick={onEdit}
            title={t('departments.actions.edit')}
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-lg transition-all',
              'text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20',
              'opacity-0 group-hover:opacity-100 focus:opacity-100',
            )}
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={onDelete}
            title={t('departments.actions.delete')}
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-lg transition-all',
              'text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
              'opacity-0 group-hover:opacity-100 focus:opacity-100',
            )}
          >
            <Trash2 size={14} />
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
            <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded animate-pulse w-24" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <div className="h-6 w-12 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />
      </td>
      <td className="px-4 py-3.5 hidden md:table-cell">
        <div className="h-3.5 w-24 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
      </td>
      <td className="pr-5 pl-4 py-3.5">
        <div className="flex justify-end gap-1">
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />
        </div>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EmptyState
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({
  hasFilters, onAdd, t,
}: {
  hasFilters: boolean;
  onAdd: () => void;
  t: (k: string) => string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-700">
        <Building2 size={28} className="text-slate-300 dark:text-slate-600" />
      </div>
      <p className="text-base font-semibold text-slate-600 dark:text-slate-300 mb-1">
        {hasFilters ? t('departments.noResults') : t('departments.empty')}
      </p>
      <p className="text-sm text-slate-400 dark:text-slate-500 text-center max-w-xs mb-5">
        {hasFilters ? t('departments.noResultsDesc') : t('departments.emptyDesc')}
      </p>
      {!hasFilters && (
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus size={15} />
          {t('departments.create')}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DeptFormModal (Create + Edit)
// ─────────────────────────────────────────────────────────────────────────────

function DeptFormModal({
  title, defaultValues, onSubmit, onClose, isPending, t,
}: {
  title: string;
  defaultValues?: DeptFormValues;
  onSubmit: (v: DeptFormValues) => void;
  onClose: () => void;
  isPending: boolean;
  t: (k: string) => string;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<DeptFormValues>({
    resolver: zodResolver(deptSchema),
    defaultValues: defaultValues ?? { name: '', imageUrl: '' },
  });

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">{title}</h2>
          <button onClick={onClose} className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              {t('departments.form.name')} <span className="text-red-500">*</span>
            </label>
            <input
              {...register('name')}
              placeholder={t('departments.form.namePlaceholder')}
              className={cn(
                'w-full h-10 rounded-xl border px-3.5 text-sm bg-white dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 placeholder-slate-400',
                'focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition-all',
                errors.name
                  ? 'border-red-300 dark:border-red-700 focus:ring-red-400/30 focus:border-red-400'
                  : 'border-slate-200 dark:border-slate-600',
              )}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{t(errors.name.message ?? '')}</p>
            )}
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              {t('departments.form.imageUrl')}
              <span className="ml-1.5 text-xs font-normal text-slate-400">({t('common.optional')})</span>
            </label>
            <input
              {...register('imageUrl')}
              placeholder="https://example.com/image.jpg"
              className={cn(
                'w-full h-10 rounded-xl border px-3.5 text-sm bg-white dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 placeholder-slate-400',
                'focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition-all',
                errors.imageUrl
                  ? 'border-red-300 dark:border-red-700 focus:ring-red-400/30 focus:border-red-400'
                  : 'border-slate-200 dark:border-slate-600',
              )}
            />
            {errors.imageUrl && (
              <p className="mt-1 text-xs text-red-500">{t(errors.imageUrl.message ?? '')}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-600"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ViewModal
// ─────────────────────────────────────────────────────────────────────────────

function ViewModal({
  dept, doctors, onClose, onEdit, onViewDoctors, t,
}: {
  dept: DepartmentResponse & { doctorCount: number };
  doctors: DoctorResponse[];
  onClose: () => void;
  onEdit: () => void;
  onViewDoctors: () => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <DeptAvatar imageUrl={dept.imageUrl} name={dept.name} />
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">{dept.name}</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{fmtDate(dept.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <Edit2 size={12} />
              {t('departments.actions.edit')}
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Doctor count */}
        <div className="flex items-center justify-between mb-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <Users size={15} className="text-cyan-500" />
            {t('departments.table.doctors')}: {dept.doctorCount}
          </div>
          {dept.doctorCount > 0 && (
            <button
              onClick={onViewDoctors}
              className="flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              {t('departments.viewDoctors')}
              <ExternalLink size={11} />
            </button>
          )}
        </div>

        {/* Doctor list */}
        {doctors.length > 0 ? (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
            {doctors.map((doc) => {
              const src = doc.imageUrl
                ? (doc.imageUrl.startsWith('http') ? doc.imageUrl : `${API_BASE_URL}${doc.imageUrl}`)
                : null;
              return (
                <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                  {src ? (
                    <img src={src} alt={doc.fullName} className="w-9 h-9 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {doc.fullName[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{doc.fullName}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{doc.specialty}</p>
                  </div>
                  <span className={cn(
                    'shrink-0 text-xs px-2 py-0.5 rounded-full font-medium',
                    doc.isActive
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500',
                  )}>
                    {doc.isActive ? t('doctors.active') : t('doctors.inactive')}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <Stethoscope size={24} className="mb-2 opacity-40" />
            <p className="text-sm">{t('departments.noDoctors')}</p>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DeleteModal
// ─────────────────────────────────────────────────────────────────────────────

function DeleteModal({
  dept, onConfirm, onClose, isPending, t,
}: {
  dept: DepartmentResponse & { doctorCount: number };
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const hasDoctors = dept.doctorCount > 0;
  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            'flex items-center justify-center w-11 h-11 rounded-xl shrink-0',
            hasDoctors ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-red-50 dark:bg-red-900/20',
          )}>
            {hasDoctors
              ? <AlertCircle size={22} className="text-amber-500" />
              : <Trash2 size={22} className="text-red-500" />
            }
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {hasDoctors ? t('departments.deleteBlockedTitle') : t('departments.deleteTitle')}
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">{dept.name}</p>
          </div>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
          {hasDoctors
            ? t('departments.deleteBlockedDesc', { count: dept.doctorCount })
            : t('departments.deleteDesc')}
        </p>

        <div className="flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-600"
          >
            {t('common.cancel')}
          </button>
          {!hasDoctors && (
            <button
              onClick={onConfirm}
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {t('common.delete')}
            </button>
          )}
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ModalOverlay
// ─────────────────────────────────────────────────────────────────────────────

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative z-10 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 w-full"
        style={{ maxWidth: '560px' }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PagBtn
// ─────────────────────────────────────────────────────────────────────────────

function PagBtn({
  children, onClick, disabled, active,
}: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-all',
        active
          ? 'bg-violet-600 text-white shadow-sm shadow-violet-200 dark:shadow-violet-900/40'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200',
        disabled && 'opacity-35 cursor-not-allowed pointer-events-none',
      )}
    >
      {children}
    </button>
  );
}
