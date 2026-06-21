import { useState, useCallback, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Stethoscope, Clock, X, Heart,
  ChevronDown, ChevronLeft, ChevronRight, ArrowRight,
  GitCompareArrows, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../utils/cn';
import { API_BASE_URL, API_ENDPOINTS } from '../api/config';
import axiosInstance from '../api/axiosInstance';
import type { ApiListResult } from '../types/api.types';
import { useAuthStore } from '../store/authStore';
import { useMyFavoriteIds, useToggleFavorite } from '../hooks/useFavorites';
import { useCompareStore, MAX_COMPARE } from '../store/compareStore';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DoctorItem {
  id: string;
  fullName: string;
  specialty: string;
  departmentName: string;
  departmentId: string;
  imageUrl?: string;
  yearsOfExperience: number;
  consultationFee: number;
  isActive: boolean;
}

interface DepartmentItem {
  id: string;
  name: string;
}

type SortKey = 'az' | 'za' | 'exp-desc' | 'fee-asc' | 'fee-desc';

const SORT_TO_BACKEND: Record<SortKey, { sortBy: string; sortDesc: boolean }> = {
  'az':       { sortBy: 'fullName',          sortDesc: false },
  'za':       { sortBy: 'fullName',          sortDesc: true  },
  'exp-desc': { sortBy: 'yearsOfExperience', sortDesc: true  },
  'fee-asc':  { sortBy: 'consultationFee',   sortDesc: false },
  'fee-desc': { sortBy: 'consultationFee',   sortDesc: true  },
};

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const PAGE_SIZE = 12;
const FAVORITES_PAGE_SIZE = 200;

// ── Data ──────────────────────────────────────────────────────────────────────

interface DoctorsBackendQuery {
  page: number;
  search: string;
  departmentId: string;
  letter: string;
  sort: SortKey;
}

interface DoctorsResult {
  doctors: DoctorItem[];
  totalCount: number;
}

function useDoctors(
  q: DoctorsBackendQuery,
  favoritesMode: boolean,
  favoriteIds: string[],
) {
  const { sortBy, sortDesc } = SORT_TO_BACKEND[q.sort];

  const queryKey = favoritesMode
    ? ['public-doctors-favorites', q, favoriteIds]
    : ['public-doctors', q];

  return useQuery<DoctorsResult>({
    queryKey,
    queryFn: async () => {
      if (favoritesMode && favoriteIds.length === 0) {
        return { doctors: [], totalCount: 0 };
      }

      const params: Record<string, string | number | boolean> = {
        page: favoritesMode ? 1 : q.page,
        pageSize: favoritesMode ? FAVORITES_PAGE_SIZE : PAGE_SIZE,
        isActive: true,
        sortBy,
        sortDesc,
      };
      if (q.search)       params.search         = q.search;
      if (q.departmentId) params.departmentId   = q.departmentId;
      if (q.letter)       params.nameStartsWith = q.letter;

      const res = await axiosInstance.get<ApiListResult<DoctorItem>>(
        API_ENDPOINTS.doctors.base,
        { params },
      );

      const all = res.data.data ?? [];

      if (favoritesMode) {
        const favSet = new Set(favoriteIds);
        const filtered = all.filter((d) => favSet.has(d.id));
        return { doctors: filtered, totalCount: filtered.length };
      }

      return {
        doctors:    all,
        totalCount: res.data.pagedTotalCount ?? 0,
      };
    },
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

function useDepartments() {
  return useQuery({
    queryKey: ['public-departments'],
    queryFn: async () => {
      const res = await axiosInstance.get<ApiListResult<DepartmentItem>>(
        API_ENDPOINTS.departments.base,
      );
      return (res.data.data ?? []) as DepartmentItem[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

// ── Doctor avatar ─────────────────────────────────────────────────────────────

function DoctorAvatar({ imageUrl, name }: { imageUrl?: string; name: string }) {
  const src = imageUrl
    ? (imageUrl.startsWith('http') ? imageUrl : `${API_BASE_URL}${imageUrl}`)
    : null;

  const strippedName = name.replace(/^(dr|prof|mr|mrs|ms|miss)\.\s*/i, '').trim();
  const initials = strippedName.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

  if (src) {
    return <img src={src} alt={name} className="w-full h-full object-cover object-top" />;
  }
  return (
    <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-cyan-50 to-blue-100 dark:from-cyan-900/20 dark:to-blue-900/30">
      {initials
        ? <span className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">{initials}</span>
        : <Stethoscope size={40} className="text-cyan-300 dark:text-cyan-600" />
      }
    </div>
  );
}

// ── Doctor card ───────────────────────────────────────────────────────────────

function DoctorCard({ doctor, index, t, isFavorited, onToggleFavorite, isCompared, onToggleCompare, compareDisabled }: {
  doctor: DoctorItem; index: number; t: (k: string) => string;
  isFavorited: boolean; onToggleFavorite: (id: string) => void;
  isCompared: boolean; onToggleCompare: (doc: DoctorItem) => void; compareDisabled: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.04, 0.2), ease: 'easeOut' }}
      className={cn(
        'group flex flex-col rounded-2xl overflow-hidden',
        'bg-white dark:bg-slate-800',
        'border transition-all duration-200',
        isCompared
          ? 'border-cyan-400 dark:border-cyan-500 shadow-lg shadow-cyan-100 dark:shadow-cyan-900/30'
          : 'border-slate-100 dark:border-slate-700/60 shadow-sm hover:shadow-lg hover:-translate-y-0.5',
      )}
    >
      {/* Photo */}
      <div className="relative h-100 shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-700">
        <DoctorAvatar imageUrl={doctor.imageUrl} name={doctor.fullName} />

        {/* Favorite button — top-right */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={(e) => { e.preventDefault(); onToggleFavorite(doctor.id); }}
          aria-label={isFavorited ? t('doctors.removeFromFavorites') : t('doctors.addToFavorites')}
          className={cn(
            'absolute top-3 right-3 z-10 flex items-center justify-center w-9 h-9 rounded-full',
            'bg-white/90 dark:bg-slate-900/80 backdrop-blur-sm shadow-md transition-colors duration-150',
            isFavorited ? 'text-rose-500' : 'text-slate-400 hover:text-rose-400 dark:text-slate-500 dark:hover:text-rose-400',
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isFavorited ? 'filled' : 'outline'}
              initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-center"
            >
              <Heart size={16} fill={isFavorited ? 'currentColor' : 'none'} />
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-5">
        <h3 className="text-[15px] font-bold text-slate-800 dark:text-slate-100 leading-snug mb-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
          {doctor.fullName}
        </h3>
        <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium mb-4 truncate">
          {doctor.specialty}
        </p>
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50 dark:border-slate-700/60">
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-slate-400 dark:text-slate-500 shrink-0" />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              <strong className="font-bold tabular-nums text-slate-700 dark:text-slate-300">{doctor.yearsOfExperience}</strong>
              {' '}{t('doctors.experience')}
            </span>
          </div>

          {/* Compare toggle inline with View Details */}
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={(e) => {
                e.preventDefault();
                if (!isCompared && compareDisabled) {
                  toast.info(t('compare.maxReached'), { description: t('compare.maxReachedDesc') });
                  return;
                }
                onToggleCompare(doctor);
              }}
              aria-label={isCompared ? t('compare.removeFromCompare') : t('compare.addToCompare')}
              className={cn(
                'flex items-center justify-center w-6 h-6 rounded-lg border transition-all duration-150',
                isCompared
                  ? 'bg-cyan-500 border-cyan-500 text-white'
                  : compareDisabled
                    ? 'border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                    : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-cyan-400 hover:text-cyan-500 dark:text-slate-500 dark:hover:border-cyan-600 dark:hover:text-cyan-400',
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={isCompared ? 'check' : 'compare'}
                  initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ duration: 0.13 }}
                  className="flex items-center justify-center"
                >
                  {isCompared
                    ? <Check size={13} strokeWidth={2.5} />
                    : <GitCompareArrows size={12} />
                  }
                </motion.span>
              </AnimatePresence>
            </motion.button>

            <Link
              to={`/doctors/${doctor.id}`}
              className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline underline-offset-2 flex items-center gap-0.5"
            >
              {t('doctors.viewDetails')}
              <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 shadow-sm animate-pulse">
      <div className="h-100 bg-slate-100 dark:bg-slate-700" />
      <div className="p-5 space-y-3">
        <div className="h-4 w-36 bg-slate-100 dark:bg-slate-700 rounded-lg" />
        <div className="h-3 w-24 bg-slate-100 dark:bg-slate-700 rounded" />
        <div className="pt-3 mt-1 border-t border-slate-50 dark:border-slate-700/50 flex gap-3">
          <div className="h-3 w-16 bg-slate-100 dark:bg-slate-700 rounded" />
          <div className="h-3 w-10 bg-slate-100 dark:bg-slate-700 rounded ml-auto" />
        </div>
      </div>
    </div>
  );
}

// ── Sort dropdown ─────────────────────────────────────────────────────────────

function SortDropdown({ value, onChange, t }: {
  value: SortKey; onChange: (v: SortKey) => void; t: (k: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const opts: { key: SortKey; label: string }[] = [
    { key: 'az',       label: t('doctors.sortAZ') },
    { key: 'za',       label: t('doctors.sortZA') },
    { key: 'exp-desc', label: t('doctors.sortExpDesc') },
    { key: 'fee-asc',  label: t('doctors.sortFeeAsc') },
    { key: 'fee-desc', label: t('doctors.sortFeeDesc') },
  ];
  const currentLabel = opts.find((o) => o.key === value)?.label ?? opts[0].label;

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-cyan-300 dark:hover:border-cyan-700 shadow-sm transition-all"
      >
        <span className="hidden sm:inline text-xs text-slate-400">{t('doctors.sortLabel')}:</span>
        <span className="text-xs font-semibold">{currentLabel}</span>
        <ChevronDown size={13} className={cn('text-slate-400 transition-transform duration-150', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.13 }}
              className="absolute right-0 top-full mt-1.5 z-50 min-w-44 rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl overflow-hidden"
            >
              {opts.map((o) => (
                <button key={o.key} onClick={() => { onChange(o.key); setOpen(false); }}
                  className={cn(
                    'w-full text-left px-4 py-2.5 text-sm transition-colors',
                    o.key === value
                      ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50',
                  )}
                >
                  {o.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({ page, total, pageSize, onChange }: {
  page: number; total: number; pageSize: number; onChange: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  function getPages(): (number | -1)[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, -1, totalPages];
    if (page >= totalPages - 3) return [1, -1, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, -1, page - 1, page, page + 1, -1, totalPages];
  }

  return (
    <div className="flex items-center justify-center gap-1.5 pt-10">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 disabled:opacity-35 disabled:cursor-not-allowed hover:border-cyan-300 hover:text-cyan-600 dark:hover:border-cyan-700 dark:hover:text-cyan-400 transition-all"
      >
        <ChevronLeft size={16} />
      </button>

      {getPages().map((p, i) =>
        p === -1 ? (
          <span key={`sep-${i}`} className="w-9 text-center text-slate-400 dark:text-slate-500 text-sm select-none">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={cn(
              'w-9 h-9 rounded-xl text-sm font-semibold transition-all border',
              p === page
                ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm shadow-cyan-200 dark:shadow-cyan-900/40'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-cyan-300 hover:text-cyan-600 dark:hover:border-cyan-700 dark:hover:text-cyan-400',
            )}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 disabled:opacity-35 disabled:cursor-not-allowed hover:border-cyan-300 hover:text-cyan-600 dark:hover:border-cyan-700 dark:hover:text-cyan-400 transition-all"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function DoctorsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── URL state ─────────────────────────────────────────────────────────────
  const page          = Math.max(1, Number(searchParams.get('page') || 1));
  const urlSearch     = searchParams.get('search') ?? '';
  const urlDept       = searchParams.get('department') ?? '';
  const urlLetter     = searchParams.get('letter') ?? '';
  const urlSort       = (searchParams.get('sort') ?? 'az') as SortKey;
  const favoritesMode = searchParams.get('favorites') === 'true';

  const [localSearch, setLocalSearch] = useState(urlSearch);

  function setParam(updates: Record<string, string | undefined>) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(updates)) {
        if (!v) next.delete(k); else next.set(k, v);
      }
      return next;
    }, { replace: true });
  }

  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const handleSearchChange = useCallback((val: string) => {
    setLocalSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setParam({ search: val || undefined, page: undefined });
    }, 350);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleDeptChange(slug: string) {
    setParam({ department: slug || undefined, page: undefined });
  }
  function handleLetterChange(letter: string) {
    setParam({ letter: letter || undefined, page: undefined });
  }
  function handleSortChange(sort: SortKey) {
    setParam({ sort: sort === 'az' ? undefined : sort, page: undefined });
  }
  function handlePageChange(p: number) {
    setParam({ page: p === 1 ? undefined : String(p) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function clearAll() {
    setLocalSearch('');
    setSearchParams({}, { replace: true });
  }

  // Switching view tabs — mutually exclusive
  function activateAll() {
    setParam({ favorites: undefined, page: undefined });
  }
  function activateFavorites() {
    if (!isAuthenticated) {
      toast.info(t('doctors.signInForFavorites'), { description: t('doctors.signInForFavoritesDesc') });
      return;
    }
    setParam({ favorites: 'true', page: undefined });
  }
  function activateCompare() {
    navigate('/doctors/compare');
  }

  // ── Auth / favorites ──────────────────────────────────────────────────────
  const { isAuthenticated } = useAuthStore();
  const { data: favoriteIds = [] } = useMyFavoriteIds();
  const { mutate: toggleFavorite } = useToggleFavorite();
  const favoriteSet = new Set(favoriteIds);

  function handleToggleFavorite(doctorId: string) {
    if (!isAuthenticated) {
      toast.info(t('doctors.signInForFavorites'), { description: t('doctors.signInForFavoritesDesc') });
      return;
    }
    toggleFavorite(doctorId);
  }

  // ── Compare state — Zustand store (survives navigation) ───────────────────
  const { doctors: compareDoctors, toggle: toggleCompare } = useCompareStore();

  function handleToggleCompare(doctor: DoctorItem) {
    toggleCompare({
      id: doctor.id,
      fullName: doctor.fullName,
      specialty: doctor.specialty,
      departmentName: doctor.departmentName,
      imageUrl: doctor.imageUrl,
      yearsOfExperience: doctor.yearsOfExperience,
      consultationFee: doctor.consultationFee,
      isActive: doctor.isActive,
    });
  }

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: departments = [] } = useDepartments();

  const resolvedDeptId = departments.find(
    (d) => d.name.toLowerCase().replace(/\s+/g, '-') === urlDept,
  )?.id ?? '';

  const backendQuery: DoctorsBackendQuery = {
    page,
    search: urlSearch,
    departmentId: resolvedDeptId,
    letter: urlLetter,
    sort: urlSort,
  };

  // In compare mode we don't need to hit the backend for the doctor list
  const { data, isLoading, isFetching, isError } = useDoctors(
    backendQuery,
    favoritesMode,
    favoriteIds,
  );

  const rawDoctors = data?.doctors ?? [];
  const doctors    = favoritesMode
    ? rawDoctors.filter((d) => favoriteSet.has(d.id))
    : rawDoctors;
  const totalCount = favoritesMode ? doctors.length : (data?.totalCount ?? 0);

  const hasFilters = !!(urlSearch || urlDept || urlLetter || (urlSort && urlSort !== 'az') || favoritesMode);
  const compareCount = compareDoctors.length;
  const compareIds   = new Set(compareDoctors.map((d) => d.id));

  // Active tab: all / favorites (compare navigates away)
  const activeTab: 'all' | 'favorites' = favoritesMode ? 'favorites' : 'all';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 overflow-x-hidden">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="relative bg-linear-to-br from-slate-900 via-cyan-950 to-blue-950 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: 'easeOut' }}>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/25 text-cyan-300 text-xs font-semibold tracking-wide mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              {t('doctors.heroBadge')}
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-3">
              {t('doctors.heroTitle')}
            </h1>
            <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto mb-8">
              {t('doctors.heroSubtitle')}
            </p>

            {/* Search */}
            <div className="relative max-w-2xl mx-auto">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={t('doctors.searchPlaceholder')}
                className="w-full h-13 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 hover:border-white/25 focus:border-cyan-400/60 pl-12 pr-11 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all shadow-lg"
              />
              <AnimatePresence>
                {localSearch && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => handleSearchChange('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    <X size={15} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Sticky filter bar ────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-sm border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-4 space-y-3">

          {/* Row 1: View toggle + Department select + Sort */}
          <div className="flex items-center gap-3">

            {/* All Doctors / Favorites / Compare toggle */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">

              {/* All Doctors */}
              <button
                onClick={activateAll}
                className={cn(
                  'flex items-center gap-1.5 h-8 px-3 rounded-[10px] text-xs font-semibold transition-all duration-150',
                  activeTab === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
                )}
              >
                <Stethoscope size={12} />
                <span className="hidden sm:inline">{t('doctors.viewAll')}</span>
              </button>

              {/* Favorites */}
              <button
                onClick={activateFavorites}
                className={cn(
                  'flex items-center gap-1.5 h-8 px-3 rounded-[10px] text-xs font-semibold transition-all duration-150',
                  activeTab === 'favorites'
                    ? 'bg-white dark:bg-slate-700 text-rose-500 dark:text-rose-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-rose-400 dark:hover:text-rose-400',
                )}
              >
                <Heart size={12} fill={activeTab === 'favorites' ? 'currentColor' : 'none'} />
                <span className="hidden sm:inline">{t('doctors.viewFavorites')}</span>
                {isAuthenticated && favoriteIds.length > 0 && (
                  <span className={cn(
                    'flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[10px] font-bold tabular-nums',
                    activeTab === 'favorites'
                      ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300'
                      : 'bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300',
                  )}>
                    {favoriteIds.length}
                  </span>
                )}
              </button>

              {/* Compare — navigates to /doctors/compare */}
              <button
                onClick={activateCompare}
                className="flex items-center gap-1.5 h-8 px-3 rounded-[10px] text-xs font-semibold transition-all duration-150 text-slate-500 dark:text-slate-400 hover:text-cyan-500 dark:hover:text-cyan-400"
              >
                <GitCompareArrows size={12} />
                <span className="hidden sm:inline">{t('compare.filterLabel')}</span>
                <AnimatePresence>
                  {compareCount > 0 && (
                    <motion.span
                      initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[10px] font-bold tabular-nums bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300"
                    >
                      {compareCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>

            {/* Department — only when not in favorites mode */}
            {activeTab === 'all' && (
              <div className="relative flex-1 max-w-xs">
                <Stethoscope size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  value={urlDept}
                  onChange={(e) => handleDeptChange(e.target.value)}
                  className={cn(
                    'w-full h-9 rounded-xl pl-9 pr-8 text-sm appearance-none cursor-pointer',
                    'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
                    'focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition-all shadow-sm',
                    urlDept
                      ? 'text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700'
                      : 'text-slate-600 dark:text-slate-300',
                  )}
                >
                  <option value="">{t('doctors.allDepartments')}</option>
                  {departments.map((d) => {
                    const slug = d.name.toLowerCase().replace(/\s+/g, '-');
                    return <option key={d.id} value={slug}>{d.name}</option>;
                  })}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}

            {/* Sort */}
            {(
              <div className="ml-auto">
                <SortDropdown value={urlSort} onChange={handleSortChange} t={t} />
              </div>
            )}
          </div>

          {/* Row 2: A-Z navigation — only when not in favorites mode */}
          {activeTab === 'all' && (
            <div className="overflow-x-auto scrollbar-none -mx-1 px-1">
              <div className="flex items-center gap-1 min-w-max pb-0.5">
                <button
                  onClick={() => handleLetterChange('')}
                  className={cn(
                    'h-8 min-w-11 px-3 rounded-lg text-xs font-bold transition-all duration-150',
                    !urlLetter
                      ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200',
                  )}
                >
                  {t('doctors.allLetters')}
                </button>

                {ALPHABET.map((letter) => {
                  const isActive = urlLetter === letter;
                  return (
                    <button
                      key={letter}
                      onClick={() => handleLetterChange(isActive ? '' : letter)}
                      className={cn(
                        'h-8 w-8 rounded-lg text-xs font-bold transition-all duration-150 shrink-0',
                        isActive
                          ? 'bg-cyan-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:text-cyan-600 dark:hover:text-cyan-400',
                      )}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
        <>
            {/* Result count row */}
            <div className="flex items-center justify-between mb-6 min-h-6">
              {isLoading ? (
                <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  {isFetching && !isLoading && (
                    <span className="inline-block w-3 h-3 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                  )}
                  <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">{totalCount}</span>
                  {favoritesMode ? t('favorites.found') : t('doctors.found')}
                </p>
              )}
              <AnimatePresence>
                {hasFilters && (
                  <motion.button
                    initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 6 }}
                    onClick={clearAll}
                    className="flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline underline-offset-2"
                  >
                    <X size={11} />
                    {t('doctors.clearFilters')}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Grid / states */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: favoritesMode ? 4 : PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center py-28 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4 border border-red-100 dark:border-red-900/40">
                  <Stethoscope size={28} className="text-red-300 dark:text-red-500" />
                </div>
                <p className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">{t('common.error')}</p>
              </div>
            ) : doctors.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-28 text-center"
              >
                <div className={cn(
                  'w-20 h-20 rounded-3xl flex items-center justify-center mb-5 shadow-sm border',
                  favoritesMode
                    ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800/40'
                    : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700',
                )}>
                  {favoritesMode
                    ? <Heart size={36} className="text-rose-200 dark:text-rose-700" />
                    : <Stethoscope size={36} className="text-slate-200 dark:text-slate-600" />
                  }
                </div>
                <p className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">
                  {favoritesMode ? t('favorites.empty') : t('doctors.noResults')}
                </p>
                <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed mb-6">
                  {favoritesMode ? t('favorites.emptyDesc') : t('doctors.noResultsDesc')}
                </p>
                {favoritesMode ? (
                  <button
                    onClick={activateAll}
                    className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold transition-colors shadow-sm"
                  >
                    {t('favorites.browseDoctors')}
                  </button>
                ) : hasFilters ? (
                  <button onClick={clearAll} className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold transition-colors shadow-sm">
                    {t('doctors.clearFilters')}
                  </button>
                ) : null}
              </motion.div>
            ) : (
              <>
                <AnimatePresence mode="popLayout">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {doctors.map((doctor, i) => (
                      <DoctorCard
                        key={doctor.id}
                        doctor={doctor}
                        index={i}
                        t={t}
                        isFavorited={favoriteSet.has(doctor.id)}
                        onToggleFavorite={handleToggleFavorite}
                        isCompared={compareIds.has(doctor.id)}
                        onToggleCompare={handleToggleCompare}
                        compareDisabled={compareCount >= MAX_COMPARE && !compareIds.has(doctor.id)}
                      />
                    ))}
                  </div>
                </AnimatePresence>

                {/* Pagination — only in All Doctors mode */}
                {activeTab === 'all' && (
                  <Pagination
                    page={page}
                    total={totalCount}
                    pageSize={PAGE_SIZE}
                    onChange={handlePageChange}
                  />
                )}
              </>
            )}
        </>
      </div>

      {/* ── Floating compare bar ─────────────────────────────────── */}
      <AnimatePresence>
        {compareCount >= 2 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl shadow-slate-900/20 dark:shadow-slate-950/60"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <GitCompareArrows size={16} className="text-cyan-500" />
              <span>
                <span className="tabular-nums text-cyan-600 dark:text-cyan-400">{compareCount}</span>
                {' '}{t('compare.doctorsSelected')}
              </span>
            </div>
            <button
              onClick={activateCompare}
              className="flex items-center gap-1.5 h-8 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition-colors shadow-sm"
            >
              {t('compare.compare')}
              <ArrowRight size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
