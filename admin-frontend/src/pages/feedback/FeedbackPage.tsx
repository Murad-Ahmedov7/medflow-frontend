import { useState, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Search, ChevronLeft, ChevronRight,
  ChevronsUpDown, ArrowUp, ArrowDown, X,
  Loader2, ChevronDown, Eye, AlertCircle,
  User, Mail, Calendar, CheckCircle2, Clock, AlertTriangle,
  Send, MessageCircleReply,
} from 'lucide-react';
import { useFeedback, useRespondToFeedback } from '../../hooks/useFeedback';
import { useFeedbackHub } from '../../hooks/useFeedbackHub';
import { cn } from '../../utils/cn';
import type { AdminFeedbackResponse, FeedbackCategory, FeedbackStatus } from '../../types/feedback.types';

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [10, 20, 50];
type SortKey = 'patient' | 'category' | 'subject' | 'status' | 'createdAt';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return iso; }
}

function getPageNumbers(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, -1, total];
  if (current >= total - 3) return [1, -1, total - 4, total - 3, total - 2, total - 1, total];
  return [1, -1, current - 1, current, current + 1, -1, total];
}

// ── Status badge config ───────────────────────────────────────────────────────

const STATUS_STYLES: Record<FeedbackStatus, string> = {
  Open:     'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/40',
  InReview: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/40',
  Resolved: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/40',
};

const STATUS_DOT: Record<FeedbackStatus, string> = {
  Open:     'bg-blue-500',
  InReview: 'bg-amber-500 animate-pulse',
  Resolved: 'bg-emerald-500',
};

const CATEGORY_STYLES: Record<FeedbackCategory, string> = {
  Complaint:  'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800/40',
  Suggestion: 'bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800/40',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status, t }: { status: FeedbackStatus; t: (k: string) => string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border whitespace-nowrap',
      STATUS_STYLES[status],
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[status])} />
      {t(`feedback.statuses.${status}`)}
    </span>
  );
}

function CategoryBadge({ category, t }: { category: FeedbackCategory; t: (k: string) => string }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border whitespace-nowrap',
      CATEGORY_STYLES[category],
    )}>
      {t(`feedback.categories.${category}`)}
    </span>
  );
}

// ── Stat Cards ────────────────────────────────────────────────────────────────

const STAT_CFG = {
  blue:    { bar: 'bg-blue-500',    icon: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',    ring: 'ring-blue-200 dark:ring-blue-800' },
  amber:   { bar: 'bg-amber-500',   icon: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',   ring: 'ring-amber-200 dark:ring-amber-800' },
  emerald: { bar: 'bg-emerald-500', icon: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-200 dark:ring-emerald-800' },
  cyan:    { bar: 'bg-cyan-500',    icon: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400',    ring: 'ring-cyan-200 dark:ring-cyan-800' },
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
          active
            ? 'text-cyan-600 dark:text-cyan-400'
            : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300',
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

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-50 dark:border-slate-700/40">
      <td className="pl-5 pr-4 py-3.5"><div className="h-6 w-20 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" /></td>
      <td className="px-4 py-3.5 hidden sm:table-cell">
        <div className="space-y-1">
          <div className="h-3.5 w-28 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-3 w-40 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
        </div>
      </td>
      <td className="px-4 py-3.5 hidden md:table-cell"><div className="h-3.5 w-36 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-6 w-20 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" /></td>
      <td className="px-4 py-3.5 hidden lg:table-cell"><div className="h-3.5 w-20 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /></td>
      <td className="pr-5 pl-4 py-3.5"><div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" /></td>
    </tr>
  );
}

// ── Pagination button ─────────────────────────────────────────────────────────

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
          ? 'bg-cyan-600 text-white shadow-sm'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700',
        disabled && 'opacity-35 cursor-not-allowed pointer-events-none',
      )}
    >
      {children}
    </button>
  );
}

// ── Feedback Drawer ───────────────────────────────────────────────────────────

function FeedbackDrawer({
  item,
  onClose,
  t,
}: {
  item: AdminFeedbackResponse;
  onClose: () => void;
  t: (k: string) => string;
}) {
  const respond = useRespondToFeedback();
  const [pendingStatus, setPendingStatus] = useState<FeedbackStatus | null>(null);
  const [responseText, setResponseText] = useState(item.adminResponse ?? '');

  // Keep responseText in sync when the drawer item changes (e.g. live query refresh)
  const prevIdRef = useRef(item.id);
  if (prevIdRef.current !== item.id) {
    prevIdRef.current = item.id;
    setResponseText(item.adminResponse ?? '');
  }

  const statuses: FeedbackStatus[] = ['Open', 'InReview', 'Resolved'];

  const handleStatusChange = (status: FeedbackStatus) => {
    if (status === item.status) return;
    setPendingStatus(status);
    respond.mutate(
      { id: item.id, status, adminResponse: responseText.trim() || null },
      { onSettled: () => setPendingStatus(null) },
    );
  };

  const handleSendResponse = () => {
    respond.mutate({ id: item.id, status: item.status, adminResponse: responseText.trim() || null });
  };

  const responseChanged = responseText.trim() !== (item.adminResponse ?? '').trim();

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
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-linear-to-br from-cyan-500 to-blue-600 shrink-0 shadow-sm">
              <MessageSquare size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                {t('feedback.drawerTitle')}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                {fmtDate(item.createdAt)}
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

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Patient info */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              {t('feedback.drawerPatient')}
            </p>
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <User size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.patientFullName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
                <span className="text-sm text-slate-600 dark:text-slate-300 font-mono text-xs">{item.patientEmail}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
                <span className="text-sm text-slate-500 dark:text-slate-400">{fmtDate(item.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Feedback details */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              {t('feedback.drawerDetails')}
            </p>
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{t('feedback.category')}</span>
                <CategoryBadge category={item.category} t={t} />
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium shrink-0">{t('feedback.subject')}</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 text-right">{item.subject}</span>
              </div>
            </div>
          </div>

          {/* Patient message */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              {t('feedback.message')}
            </p>
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{item.message}</p>
            </div>
          </div>

          {/* Status management */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              {t('feedback.drawerStatus')}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {statuses.map((s) => {
                const isCurrent = item.status === s;
                const isPending = pendingStatus === s;
                return (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={respond.isPending}
                    className={cn(
                      'flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all duration-150',
                      isCurrent
                        ? cn(STATUS_STYLES[s], 'ring-2', s === 'Open' ? 'ring-blue-300 dark:ring-blue-700' : s === 'InReview' ? 'ring-amber-300 dark:ring-amber-700' : 'ring-emerald-300 dark:ring-emerald-700')
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600',
                      respond.isPending && !isPending && 'opacity-50',
                    )}
                  >
                    {isPending ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[s])} />
                    )}
                    {t(`feedback.statuses.${s}`)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Admin response */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {t('feedback.drawerAdminResponse')}
              </p>
              {item.adminRespondedAt && (
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  — {fmtDate(item.adminRespondedAt)}
                </span>
              )}
            </div>
            <textarea
              rows={4}
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder={t('feedback.drawerResponsePlaceholder')}
              className={cn(
                'w-full rounded-xl border px-4 py-3 text-sm text-slate-800 dark:text-slate-100',
                'bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500',
                'outline-none resize-none transition-all',
                'focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-400 dark:focus:border-cyan-500',
                'border-slate-200 dark:border-slate-700',
              )}
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              {item.adminResponse && !responseChanged ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <MessageCircleReply size={13} />
                  {t('feedback.drawerResponseSent')}
                </div>
              ) : (
                <span />
              )}
              <button
                onClick={handleSendResponse}
                disabled={respond.isPending || !responseText.trim()}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all',
                  'bg-cyan-600 hover:bg-cyan-700 text-white',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {respond.isPending && !pendingStatus ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Send size={12} />
                )}
                {t('feedback.drawerSendResponse')}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ── Feedback Row ──────────────────────────────────────────────────────────────

function FeedbackRow({
  item, index, onView, t,
}: {
  item: AdminFeedbackResponse;
  index: number;
  onView: () => void;
  t: (k: string) => string;
}) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: Math.min(index * 0.025, 0.15) }}
      className="group hover:bg-slate-50/70 dark:hover:bg-slate-700/20 transition-colors"
    >
      {/* Category */}
      <td className="pl-5 pr-4 py-3.5">
        <CategoryBadge category={item.category} t={t} />
      </td>

      {/* Patient */}
      <td className="px-4 py-3.5 hidden sm:table-cell">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 shrink-0">
            <User size={13} className="text-slate-500 dark:text-slate-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate max-w-36 leading-tight">
              {item.patientFullName}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-36">{item.patientEmail}</p>
          </div>
        </div>
      </td>

      {/* Subject */}
      <td className="px-4 py-3.5 hidden md:table-cell">
        <span className="text-sm text-slate-700 dark:text-slate-200 truncate max-w-48 block">{item.subject}</span>
      </td>

      {/* Status */}
      <td className="px-4 py-3.5">
        <StatusBadge status={item.status} t={t} />
      </td>

      {/* Date */}
      <td className="px-4 py-3.5 hidden lg:table-cell">
        <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDate(item.createdAt)}</span>
      </td>

      {/* Actions */}
      <td className="pr-5 pl-4 py-3.5">
        <div className="flex items-center justify-end">
          <button
            onClick={onView}
            title={t('feedback.actions.view')}
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export function FeedbackPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── URL state ────────────────────────────────────────────────────────────
  const page        = Math.max(1, Number(searchParams.get('page') || 1));
  const rawSize     = Number(searchParams.get('size') || 10);
  const pageSize    = PAGE_SIZE_OPTIONS.includes(rawSize) ? rawSize : 10;
  const urlSearch   = searchParams.get('search') ?? '';
  const catFilter   = (searchParams.get('category') ?? '') as FeedbackCategory | '';
  const statusFilter = (searchParams.get('status') ?? '') as FeedbackStatus | '';
  const sortBy      = (searchParams.get('sort') as SortKey) || 'createdAt';
  const sortDesc    = searchParams.get('dir') !== 'asc';

  const [search, setSearch] = useState(urlSearch);
  const [selected, setSelected] = useState<AdminFeedbackResponse | null>(null);

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
    const isDesc = sortBy === key ? !sortDesc : true;
    setParam({
      sort: key === 'createdAt' ? undefined : key,
      dir: isDesc ? undefined : 'asc',
      page: undefined,
    });
  }

  // ── SignalR ───────────────────────────────────────────────────────────────
  useFeedbackHub();

  // ── Data ─────────────────────────────────────────────────────────────────
  const { data: allFeedback = [], isLoading, isError, isFetching } = useFeedback();

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:    allFeedback.length,
    open:     allFeedback.filter((f) => f.status === 'Open').length,
    inReview: allFeedback.filter((f) => f.status === 'InReview').length,
    resolved: allFeedback.filter((f) => f.status === 'Resolved').length,
  }), [allFeedback]);

  // ── Stat card click ──────────────────────────────────────────────────────
  function handleStatClick(card: 'total' | 'open' | 'inReview' | 'resolved') {
    if (card === 'total') setParam({ status: undefined, category: undefined, page: undefined });
    else if (card === 'open') setParam({ status: 'Open', page: undefined });
    else if (card === 'inReview') setParam({ status: 'InReview', page: undefined });
    else setParam({ status: 'Resolved', page: undefined });
  }

  const activeCard: typeof stats extends Record<infer K, number> ? K : never =
    statusFilter === 'Open'     ? 'open'     :
    statusFilter === 'InReview' ? 'inReview' :
    statusFilter === 'Resolved' ? 'resolved' :
    (!statusFilter && !catFilter && !urlSearch) ? 'total' : 'total';

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...allFeedback];

    if (urlSearch) {
      const q = urlSearch.toLowerCase();
      list = list.filter((f) =>
        f.patientFullName?.toLowerCase().includes(q) ||
        f.subject?.toLowerCase().includes(q) ||
        f.message?.toLowerCase().includes(q) ||
        f.patientEmail?.toLowerCase().includes(q),
      );
    }
    if (catFilter) list = list.filter((f) => f.category === catFilter);
    if (statusFilter) list = list.filter((f) => f.status === statusFilter);

    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'patient')   cmp = a.patientFullName.localeCompare(b.patientFullName);
      if (sortBy === 'category')  cmp = a.category.localeCompare(b.category);
      if (sortBy === 'subject')   cmp = a.subject.localeCompare(b.subject);
      if (sortBy === 'status')    cmp = a.status.localeCompare(b.status);
      if (sortBy === 'createdAt') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDesc ? -cmp : cmp;
    });

    return list;
  }, [allFeedback, urlSearch, catFilter, statusFilter, sortBy, sortDesc]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const hasFilters = !!(urlSearch || catFilter || statusFilter);

  // Re-sync selected item when query refreshes (keeps drawer status up to date)
  const selectedLive = useMemo(() => {
    if (!selected) return null;
    return allFeedback.find((f) => f.id === selected.id) ?? selected;
  }, [selected, allFeedback]);

  return (
    <div className="space-y-6 pb-8">

      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-linear-to-br from-cyan-500 to-blue-600 shadow-sm shadow-cyan-200 dark:shadow-cyan-900/50">
              <MessageSquare size={15} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              {t('feedback.listTitle')}
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 ml-10.5">
            {t('feedback.listSubtitle')}
          </p>
        </div>
      </div>

      {/* ── Stat cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={<MessageSquare size={19} />}
          label={t('feedback.stats.total')}
          value={stats.total}
          color="cyan"
          loading={isLoading}
          active={activeCard === 'total' && !hasFilters}
          onClick={() => handleStatClick('total')}
        />
        <StatCard
          icon={<AlertCircle size={19} />}
          label={t('feedback.stats.open')}
          value={stats.open}
          color="blue"
          loading={isLoading}
          active={statusFilter === 'Open'}
          onClick={() => handleStatClick('open')}
        />
        <StatCard
          icon={<Clock size={19} />}
          label={t('feedback.stats.inReview')}
          value={stats.inReview}
          color="amber"
          loading={isLoading}
          active={statusFilter === 'InReview'}
          onClick={() => handleStatClick('inReview')}
        />
        <StatCard
          icon={<CheckCircle2 size={19} />}
          label={t('feedback.stats.resolved')}
          value={stats.resolved}
          color="emerald"
          loading={isLoading}
          active={statusFilter === 'Resolved'}
          onClick={() => handleStatClick('resolved')}
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
            placeholder={t('feedback.search')}
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

        {/* Filters */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Category */}
          <div className="relative">
            <select
              value={catFilter}
              onChange={(e) => setParam({ category: e.target.value || undefined, page: undefined })}
              className={cn(
                'h-10 rounded-xl border border-slate-200 bg-white pl-3.5 pr-8 text-sm appearance-none cursor-pointer',
                'shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition-all',
                'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100',
                catFilter ? 'text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700' : 'text-slate-600 dark:text-slate-300',
              )}
            >
              <option value="">{t('feedback.allCategories')}</option>
              <option value="Complaint">{t('feedback.categories.Complaint')}</option>
              <option value="Suggestion">{t('feedback.categories.Suggestion')}</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Status */}
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
              <option value="">{t('feedback.allStatuses')}</option>
              <option value="Open">{t('feedback.statuses.Open')}</option>
              <option value="InReview">{t('feedback.statuses.InReview')}</option>
              <option value="Resolved">{t('feedback.statuses.Resolved')}</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

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
              {totalCount} {totalCount === 1 ? t('feedback.result') : t('feedback.results')} —
              <button
                onClick={() => { setSearch(''); setSearchParams({}, { replace: true }); }}
                className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 font-medium hover:underline"
              >
                <X size={11} />
                {t('common.clear')}
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
              {t('feedback.listTitle')}
            </span>
            {!isLoading && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 text-xs font-semibold">
                {totalCount}
              </span>
            )}
          </div>
          {isFetching && !isLoading && (
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Loader2 size={11} className="animate-spin" /> {t('common.loading')}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <SortTh label={t('feedback.table.category')} sortKey="category" current={sortBy} desc={sortDesc} onSort={handleSort} className="pl-5 pr-4 py-3.5" />
                <th className="px-4 py-3.5 text-left hidden sm:table-cell">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{t('feedback.table.patient')}</span>
                </th>
                <SortTh label={t('feedback.table.subject')} sortKey="subject" current={sortBy} desc={sortDesc} onSort={handleSort} className="px-4 py-3.5 hidden md:table-cell" />
                <SortTh label={t('feedback.table.status')} sortKey="status" current={sortBy} desc={sortDesc} onSort={handleSort} className="px-4 py-3.5" />
                <SortTh label={t('feedback.table.date')} sortKey="createdAt" current={sortBy} desc={sortDesc} onSort={handleSort} className="px-4 py-3.5 hidden lg:table-cell" />
                <th className="pr-5 pl-4 py-3.5 w-16" />
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {isLoading ? (
                Array.from({ length: Math.min(pageSize, 6) }).map((_, i) => <SkeletonRow key={i} />)
              ) : isError ? (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center justify-center py-20 px-6">
                      <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
                        <AlertTriangle size={24} className="text-red-400" />
                      </div>
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1">{t('common.error')}</p>
                    </div>
                  </td>
                </tr>
              ) : pageItems.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center justify-center py-20 px-6">
                      <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-700">
                        <MessageSquare size={28} className="text-slate-300 dark:text-slate-600" />
                      </div>
                      <p className="text-base font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        {hasFilters ? t('feedback.noResults') : t('feedback.empty')}
                      </p>
                      <p className="text-sm text-slate-400 dark:text-slate-500 text-center max-w-xs">
                        {hasFilters ? t('feedback.noResultsDesc') : t('feedback.emptyDesc')}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                pageItems.map((item, i) => (
                  <FeedbackRow
                    key={item.id}
                    item={item}
                    index={i}
                    onView={() => setSelected(item)}
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
                {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, totalCount)}
              </span>{' '}
              of <span className="font-semibold text-slate-700 dark:text-slate-200">{totalCount}</span>
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

      {/* ── Feedback drawer ───────────────────────────────────────── */}
      <AnimatePresence>
        {selectedLive && (
          <FeedbackDrawer
            item={selectedLive}
            onClose={() => setSelected(null)}
            t={t}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
