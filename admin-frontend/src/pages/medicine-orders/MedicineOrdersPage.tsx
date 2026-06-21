import { useState, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, Search, ChevronLeft, ChevronRight,
  Loader2, ChevronDown, AlertTriangle, User, Pill,
  Clock, PackageCheck, Truck, XCircle, ArrowRight, Ban,
} from 'lucide-react';
import { useMedicineOrders, useUpdateMedicineOrderStatus } from '../../hooks/useMedicineOrders';
import { useMedicineOrderHub } from '../../hooks/useMedicineOrderHub';
import { cn } from '../../utils/cn';
import { fmt } from '../../utils/currency';
import type { MedicineOrderResponse, MedicineOrderStatus } from '../../types/medicine-order.types';

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const STATUS_ORDER: MedicineOrderStatus[] = ['Pending', 'Preparing', 'Ready', 'Delivered'];
const STATUS_TO_BYTE: Record<MedicineOrderStatus, number> = {
  Pending: 1, Preparing: 2, Ready: 3, Delivered: 4, Cancelled: 5,
};

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

const STATUS_STYLES: Record<MedicineOrderStatus, string> = {
  Pending:   'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/40',
  Preparing: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/40',
  Ready:     'bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800/40',
  Delivered: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/40',
  Cancelled: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800/40',
};

const STATUS_DOT: Record<MedicineOrderStatus, string> = {
  Pending:   'bg-blue-500',
  Preparing: 'bg-amber-500 animate-pulse',
  Ready:     'bg-violet-500',
  Delivered: 'bg-emerald-500',
  Cancelled: 'bg-rose-500',
};

const STATUS_ICON: Record<MedicineOrderStatus, React.ElementType> = {
  Pending: Clock,
  Preparing: PackageCheck,
  Ready: ShoppingCart,
  Delivered: Truck,
  Cancelled: XCircle,
};

// i18n key for the advance-status button shown while the order is in this status —
// only Pending/Preparing/Ready have a "next step" button; Delivered/Cancelled are terminal.
const ADVANCE_LABEL_KEY: Partial<Record<MedicineOrderStatus, string>> = {
  Pending: 'medicineOrders.actions.startPreparing',
  Preparing: 'medicineOrders.actions.markReady',
  Ready: 'medicineOrders.actions.markDelivered',
};

function StatusBadge({ status, t }: { status: MedicineOrderStatus; t: (k: string) => string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border whitespace-nowrap',
      STATUS_STYLES[status],
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[status])} />
      {t(`medicineOrders.statuses.${status}`)}
    </span>
  );
}

// ── Stat Cards ────────────────────────────────────────────────────────────────

const STAT_CFG = {
  cyan:    { bar: 'bg-cyan-500',    icon: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400',    ring: 'ring-cyan-200 dark:ring-cyan-800' },
  blue:    { bar: 'bg-blue-500',    icon: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',    ring: 'ring-blue-200 dark:ring-blue-800' },
  amber:   { bar: 'bg-amber-500',   icon: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',   ring: 'ring-amber-200 dark:ring-amber-800' },
  violet:  { bar: 'bg-violet-500',  icon: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400', ring: 'ring-violet-200 dark:ring-violet-800' },
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

// ── Skeleton ──────────────────────────────────────────────────────────────────

function TableColgroup() {
  return (
    <colgroup>
      <col className="w-1/4" />
      <col className="w-[35%]" />
      <col className="w-[15%]" />
      <col className="w-[10%]" />
      <col className="w-[15%]" />
    </colgroup>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-50 dark:border-slate-700/40">
      <td className="pl-5 pr-4 py-3.5 hidden sm:table-cell">
        <div className="space-y-1">
          <div className="h-3.5 w-28 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
        </div>
      </td>
      <td className="px-4 py-3.5"><div className="h-3.5 w-24 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /></td>
      <td className="px-4 py-3.5 hidden lg:table-cell"><div className="h-3.5 w-20 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /></td>
      <td className="px-3 py-3.5"><div className="h-6 w-20 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" /></td>
      <td className="pr-5 pl-3 py-3.5"><div className="w-full h-8 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" /></td>
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

// ── Order Row (+ expandable items panel) ────────────────────────────────────────

function OrderRow({
  item, index, t,
}: {
  item: MedicineOrderResponse;
  index: number;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const update = useUpdateMedicineOrderStatus();
  const currentIdx = STATUS_ORDER.indexOf(item.status);
  const nextStatus = currentIdx >= 0 && currentIdx < STATUS_ORDER.length - 1 ? STATUS_ORDER[currentIdx + 1] : null;
  const canAdvance = !!nextStatus;
  const advanceLabelKey = ADVANCE_LABEL_KEY[item.status];
  // Cancel is only allowed before the order is marked Ready — once medicines are
  // prepared for pickup (Ready), delivered, or already cancelled, it's locked.
  const canCancel = item.status === 'Pending' || item.status === 'Preparing';
  const NextIcon = nextStatus ? STATUS_ICON[nextStatus] : ArrowRight;
  const isTerminal = item.status === 'Delivered' || item.status === 'Cancelled';

  return (
    <>
      <motion.tr
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: Math.min(index * 0.025, 0.15) }}
        className="group hover:bg-slate-50/70 dark:hover:bg-slate-700/20 transition-colors cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Patient */}
        <td className="pl-5 pr-4 py-3.5 hidden sm:table-cell">
          <div className="flex items-center gap-2.5">
            <ChevronDown
              size={13}
              className={cn('shrink-0 text-slate-400 transition-transform duration-150', expanded && 'rotate-180')}
            />
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 shrink-0">
              <User size={13} className="text-slate-500 dark:text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate max-w-36 leading-tight">
              {item.patientFullName}
            </p>
          </div>
        </td>

        {/* Medicine count */}
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-2">
            <Pill size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
            <span className="text-sm text-slate-700 dark:text-slate-200">
              {t('medicineOrders.medicineCount', { count: item.medicineCount })}
            </span>
          </div>
        </td>

        {/* Date */}
        <td className="px-3 py-3.5 hidden lg:table-cell">
          <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDate(item.createdAt)}</span>
        </td>

        {/* Status */}
        <td className="px-3 py-3.5">
          <StatusBadge status={item.status} t={t} />
        </td>

        {/* Actions — header is centered above this cell, so the button group is centered too */}
        <td className="pr-5 pl-3 py-3.5">
          <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
            {isTerminal ? (
              <span className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border whitespace-nowrap',
                item.status === 'Delivered' ? STATUS_STYLES.Delivered : STATUS_STYLES.Cancelled,
              )}>
                {item.status === 'Delivered' ? t('medicineOrders.actions.completedBadge') : t('medicineOrders.statuses.Cancelled')}
              </span>
            ) : (
              <>
                {canAdvance && advanceLabelKey && (
                  <button
                    onClick={() => update.mutate({ id: item.id, status: STATUS_TO_BYTE[nextStatus!] })}
                    disabled={update.isPending}
                    title={t(advanceLabelKey)}
                    className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    <NextIcon size={12} className="shrink-0" />
                    <span className="truncate">{t(advanceLabelKey)}</span>
                  </button>
                )}
                <button
                  onClick={() => update.mutate({ id: item.id, status: STATUS_TO_BYTE.Cancelled })}
                  disabled={update.isPending || !canCancel}
                  title={canCancel ? t('medicineOrders.actions.cancel') : t('medicineOrders.actions.cancelDisabledHint')}
                  className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                >
                  <Ban size={13} />
                </button>
              </>
            )}
          </div>
        </td>
      </motion.tr>

      <AnimatePresence initial={false}>
        {expanded && (
          <tr>
            <td colSpan={5} className="p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="overflow-hidden bg-slate-50/70 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-700/60"
              >
                <div className="px-5 sm:px-14 py-3 space-y-1.5">
                  {item.items.map((line, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-700 dark:text-slate-200">
                        {line.medicineName} × {line.quantity}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500 tabular-nums">
                        {fmt(line.unitPrice * line.quantity)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-3 text-sm font-semibold pt-1.5 mt-1.5 border-t border-slate-200/70 dark:border-slate-700/60">
                    <span className="text-slate-600 dark:text-slate-300">{t('medicineOrders.total')}</span>
                    <span className="text-slate-800 dark:text-slate-100 tabular-nums">{fmt(item.totalPrice)}</span>
                  </div>
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function MedicineOrdersPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const page        = Math.max(1, Number(searchParams.get('page') || 1));
  const rawSize     = Number(searchParams.get('size') || 10);
  const pageSize    = PAGE_SIZE_OPTIONS.includes(rawSize) ? rawSize : 10;
  const urlSearch   = searchParams.get('search') ?? '';
  const statusFilter = (searchParams.get('status') ?? '') as MedicineOrderStatus | '';

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
    }, 350);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useMedicineOrderHub();

  // allOrders is already one row per medicine order (not per medicine line),
  // so every count below is naturally an order count.
  const { data: allOrders = [], isLoading, isError, isFetching } = useMedicineOrders();

  const stats = useMemo(() => ({
    total:     allOrders.length,
    pending:   allOrders.filter((o) => o.status === 'Pending').length,
    preparing: allOrders.filter((o) => o.status === 'Preparing').length,
    ready:     allOrders.filter((o) => o.status === 'Ready').length,
    delivered: allOrders.filter((o) => o.status === 'Delivered').length,
  }), [allOrders]);

  function handleStatClick(card: 'total' | 'pending' | 'preparing' | 'ready' | 'delivered') {
    if (card === 'total') setParam({ status: undefined, page: undefined });
    else setParam({ status: card.charAt(0).toUpperCase() + card.slice(1), page: undefined });
  }

  const filtered = useMemo(() => {
    let list = [...allOrders];
    if (urlSearch) {
      const q = urlSearch.toLowerCase();
      list = list.filter((o) =>
        o.patientFullName?.toLowerCase().includes(q) ||
        o.items.some((line) => line.medicineName?.toLowerCase().includes(q)),
      );
    }
    if (statusFilter) list = list.filter((o) => o.status === statusFilter);
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }, [allOrders, urlSearch, statusFilter]);

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const hasFilters = !!(urlSearch || statusFilter);

  return (
    <div className="space-y-6 pb-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-linear-to-br from-violet-500 to-cyan-600 shadow-sm shadow-violet-200 dark:shadow-violet-900/50">
              <ShoppingCart size={15} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              {t('medicineOrders.listTitle')}
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 ml-10.5">
            {t('medicineOrders.listSubtitle')}
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard icon={<ShoppingCart size={19} />} label={t('medicineOrders.stats.total')} value={stats.total}
          color="cyan" loading={isLoading} active={!statusFilter && !hasFilters} onClick={() => handleStatClick('total')} />
        <StatCard icon={<Clock size={19} />} label={t('medicineOrders.stats.pending')} value={stats.pending}
          color="blue" loading={isLoading} active={statusFilter === 'Pending'} onClick={() => handleStatClick('pending')} />
        <StatCard icon={<PackageCheck size={19} />} label={t('medicineOrders.stats.preparing')} value={stats.preparing}
          color="amber" loading={isLoading} active={statusFilter === 'Preparing'} onClick={() => handleStatClick('preparing')} />
        <StatCard icon={<ShoppingCart size={19} />} label={t('medicineOrders.stats.ready')} value={stats.ready}
          color="violet" loading={isLoading} active={statusFilter === 'Ready'} onClick={() => handleStatClick('ready')} />
        <StatCard icon={<Truck size={19} />} label={t('medicineOrders.stats.delivered')} value={stats.delivered}
          color="emerald" loading={isLoading} active={statusFilter === 'Delivered'} onClick={() => handleStatClick('delivered')} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t('medicineOrders.search')}
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

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
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
              <option value="">{t('medicineOrders.allStatuses')}</option>
              <option value="Pending">{t('medicineOrders.statuses.Pending')}</option>
              <option value="Preparing">{t('medicineOrders.statuses.Preparing')}</option>
              <option value="Ready">{t('medicineOrders.statuses.Ready')}</option>
              <option value="Delivered">{t('medicineOrders.statuses.Delivered')}</option>
              <option value="Cancelled">{t('medicineOrders.statuses.Cancelled')}</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

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

      {/* Table card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:bg-slate-800 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-700/20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              {t('medicineOrders.listTitle')}
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
          <table className="w-full table-fixed min-w-215">
            <TableColgroup />
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="pl-5 pr-4 py-3.5 text-left hidden sm:table-cell">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{t('medicineOrders.table.patient')}</span>
                </th>
                <th className="px-4 py-3.5 text-left">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{t('medicineOrders.table.medicines')}</span>
                </th>
                <th className="px-3 py-3.5 text-left hidden lg:table-cell">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{t('medicineOrders.table.date')}</span>
                </th>
                <th className="px-3 py-3.5 text-left">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{t('medicineOrders.table.status')}</span>
                </th>
                <th className="pr-22 pl-3 py-3.5 text-center">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">{t('medicineOrders.table.actions')}</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {isLoading ? (
                Array.from({ length: Math.min(pageSize, 6) }).map((_, i) => <SkeletonRow key={i} />)
              ) : isError ? (
                <tr>
                  <td colSpan={5}>
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
                  <td colSpan={5}>
                    <div className="flex flex-col items-center justify-center py-20 px-6">
                      <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-700">
                        <ShoppingCart size={28} className="text-slate-300 dark:text-slate-600" />
                      </div>
                      <p className="text-base font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        {hasFilters ? t('medicineOrders.noResults') : t('medicineOrders.empty')}
                      </p>
                      <p className="text-sm text-slate-400 dark:text-slate-500 text-center max-w-xs">
                        {hasFilters ? t('medicineOrders.noResultsDesc') : t('medicineOrders.emptyDesc')}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                pageItems.map((item, i) => (
                  <OrderRow key={item.id} item={item} index={i} t={t} />
                ))
              )}
            </tbody>
          </table>
        </div>

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
    </div>
  );
}
