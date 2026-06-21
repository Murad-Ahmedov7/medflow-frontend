import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Wallet, Plus, ArrowUpCircle, ArrowDownCircle, X,
  ChevronLeft, ChevronRight, RefreshCw, CreditCard, ChevronDown,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { fmt } from '../../utils/currency';
import { extractErrorMessage } from '../../utils/errorHandler';
import axiosInstance from '../../api/axiosInstance';
import { API_ENDPOINTS } from '../../api/config';
import type { ApiResult } from '../../types/api.types';
import type {
  AdminBalanceResponse,
  BalanceTransactionListResponse,
  BalanceTransactionResponse,
  PurchaseLineSnapshot,
  CreateCheckoutRequest,
} from '../../types/finance.types';
import { PaymentSuccessModal } from '../../components/ui/PaymentSuccessModal';
import { useMedicineOrderPaymentStore } from '../../store/medicineOrderPaymentStore';

// ── Data hooks ────────────────────────────────────────────────────────────────

function useBalance() {
  return useQuery({
    queryKey: ['admin-balance'],
    queryFn: async () => {
      const res = await axiosInstance.get<ApiResult<AdminBalanceResponse>>(API_ENDPOINTS.balance.base);
      return res.data.data!;
    },
    staleTime: 30_000,
  });
}

function useTransactions(page: number, pageSize: number) {
  return useQuery({
    queryKey: ['admin-balance-transactions', page, pageSize],
    queryFn: async () => {
      const res = await axiosInstance.get<ApiResult<BalanceTransactionListResponse>>(
        `${API_ENDPOINTS.balance.transactions}?page=${page}&pageSize=${pageSize}`,
      );
      return res.data.data!;
    },
    staleTime: 30_000,
    placeholderData: prev => prev,
  });
}

function useCreateCheckout() {
  return useMutation({
    mutationFn: async (data: CreateCheckoutRequest) => {
      const res = await axiosInstance.post<ApiResult<string>>(API_ENDPOINTS.balance.checkout, data);
      return res.data.data!;
    },
  });
}

// ── Add Funds Modal ───────────────────────────────────────────────────────────

const PRESET_AMOUNTS = [25, 50, 100, 200];

function AddFundsModal({ currentBalance, onClose }: { currentBalance: number; onClose: () => void }) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const { mutate, isPending } = useCreateCheckout();

  const parsed = parseFloat(amount);
  const valid  = !isNaN(parsed) && parsed >= 1;

  function handlePreset(val: number) {
    setAmount(String(val));
  }

  function handleConfirm() {
    if (!valid) return;
    mutate({ amount: parsed }, {
      onSuccess: (url) => {
        window.location.href = url;
      },
      onError: (e) => toast.error(extractErrorMessage(e) || t('finance.checkoutError')),
    });
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ duration: 0.2 }}
        className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 shrink-0">
              <CreditCard size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('finance.addFunds')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('finance.addFundsSubtitle')}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Current balance info */}
        <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{t('finance.currentBalance')}</p>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100 tabular-nums mt-0.5">
            {fmt(currentBalance)}
          </p>
        </div>

        {/* Preset amounts */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {PRESET_AMOUNTS.map(val => (
            <button
              key={val}
              onClick={() => handlePreset(val)}
              className={cn(
                'py-2 rounded-xl text-xs font-semibold border transition-colors',
                parseFloat(amount) === val
                  ? 'bg-cyan-600 text-white border-cyan-600'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-400',
              )}
            >
              ${val}
            </button>
          ))}
        </div>

        {/* Custom amount input */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
            {t('finance.customAmount')}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500 dark:text-slate-400 pointer-events-none">$</span>
            <input
              type="number"
              min="1"
              step="1"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className={cn(inputCls, 'pl-7')}
            />
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">{t('finance.minAmount')}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={onClose} disabled={isPending}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50">
            {t('common.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!valid || isPending}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <CreditCard size={14} />
            )}
            {isPending ? t('finance.redirecting') : t('finance.payWithStripe')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Transaction row ───────────────────────────────────────────────────────────

function TransactionRow({ tx, index }: { tx: BalanceTransactionResponse; index: number }) {
  const isCredit  = tx.type === 'TopUp' || tx.type === 'Income';
  const hasLines  = !isCredit && tx.purchaseLines.length > 0;
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.1, delay: index * 0.02 }}
      className="border-b border-slate-100 dark:border-slate-700/60 last:border-0"
    >
      {/* Main row */}
      <div
        className={cn(
          'grid grid-cols-[auto_1fr_auto] gap-4 items-center px-5 py-3.5 transition-colors',
          hasLines
            ? 'cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-700/25'
            : 'hover:bg-slate-50/60 dark:hover:bg-slate-700/20',
        )}
        onClick={() => hasLines && setExpanded(v => !v)}
      >
        {/* Icon */}
        <div className={cn(
          'flex items-center justify-center w-8 h-8 rounded-lg shrink-0',
          isCredit ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-rose-50 dark:bg-rose-900/20',
        )}>
          {isCredit
            ? <ArrowUpCircle size={15} className="text-emerald-600 dark:text-emerald-400" />
            : <ArrowDownCircle size={15} className="text-rose-500 dark:text-rose-400" />}
        </div>

        {/* Info */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
              {tx.description ?? (tx.type === 'TopUp' ? 'Balance Top-Up' : tx.type === 'Income' ? 'Medicine Order Revenue' : 'Medicine Purchase')}
            </p>
            {hasLines && (
              <ChevronDown
                size={13}
                className={cn(
                  'text-slate-400 shrink-0 transition-transform duration-200',
                  expanded && 'rotate-180',
                )}
              />
            )}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {new Date(tx.createdAt).toLocaleString(undefined, {
              year: 'numeric', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>

        {/* Amount */}
        <div className="text-right shrink-0">
          <span className={cn(
            'text-sm font-bold tabular-nums',
            isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400',
          )}>
            {isCredit ? '+' : '−'}{fmt(tx.amount)}
          </span>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {tx.type === 'TopUp' ? 'Top-Up' : tx.type === 'Income' ? 'Income' : 'Purchase'}
          </p>
        </div>
      </div>

      {/* Expandable purchase lines */}
      <AnimatePresence initial={false}>
        {expanded && hasLines && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <PurchaseLineDetails lines={tx.purchaseLines} total={tx.amount} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function PurchaseLineDetails({ lines, total }: { lines: PurchaseLineSnapshot[]; total: number }) {
  return (
    <div className="mx-5 mb-3.5 rounded-xl border border-slate-100 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/50 overflow-hidden">
      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2 border-b border-slate-100 dark:border-slate-700/60">
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Medicine</span>
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide text-right w-14">Qty</span>
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide text-right w-20">Unit Price</span>
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide text-right w-20">Total</span>
      </div>

      {/* Lines */}
      {lines.map((line, i) => (
        <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center px-4 py-2.5 border-b border-slate-100/70 dark:border-slate-700/40 last:border-0">
          <span className="text-sm text-slate-700 dark:text-slate-200 font-medium truncate">{line.medicineName}</span>
          <span className="text-sm text-slate-600 dark:text-slate-300 tabular-nums text-right w-14">×{line.quantity}</span>
          <span className="text-sm text-slate-600 dark:text-slate-300 tabular-nums text-right w-20">{fmt(line.unitPrice)}</span>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular-nums text-right w-20">{fmt(line.lineTotal)}</span>
        </div>
      ))}

      {/* Total footer */}
      {lines.length > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100/60 dark:bg-slate-700/30 border-t border-slate-200/60 dark:border-slate-600/40">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total</span>
          <span className="text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums">{fmt(total)}</span>
        </div>
      )}
    </div>
  );
}

// ── Filter tabs ───────────────────────────────────────────────────────────────

type TypeFilter = 'all' | 'income' | 'expenses';

const TYPE_FILTERS: { value: TypeFilter; labelKey: string }[] = [
  { value: 'all',      labelKey: 'finance.filterAll'      },
  { value: 'income',   labelKey: 'finance.filterIncome'   },
  { value: 'expenses', labelKey: 'finance.filterExpenses' },
];

// ── Page ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

export function FinancePage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAddFunds, setShowAddFunds] = useState(false);

  // Set by the global SignalR balance hub (mounted once in DashboardLayout) whenever a
  // patient's medicine order payment lands — shown here only while this page is mounted.
  const pendingPayment = useMedicineOrderPaymentStore(s => s.pendingPayment);
  const clearPendingPayment = useMedicineOrderPaymentStore(s => s.clearPendingPayment);

  // ── URL state ──────────────────────────────────────────────────────────────
  const rawType   = searchParams.get('type') ?? '';
  const typeFilter: TypeFilter = (rawType === 'income' || rawType === 'expenses') ? rawType : 'all';
  const page      = Math.max(1, Number(searchParams.get('page') || 1));

  function setParam(updates: Record<string, string | undefined>) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(updates)) {
        if (v === undefined || v === '') next.delete(k);
        else next.set(k, v);
      }
      return next;
    }, { replace: true });
  }

  function setTypeFilter(val: TypeFilter) {
    setParam({ type: val === 'all' ? undefined : val, page: undefined });
  }

  function setPage(p: number) {
    setParam({ page: p <= 1 ? undefined : String(p) });
  }

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data: balance, isLoading: balanceLoading } = useBalance();
  const { data: txData, isLoading: txLoading } = useTransactions(page, PAGE_SIZE);

  const allTransactions = txData?.items ?? [];
  const totalCount      = txData?.totalCount ?? 0;
  const totalPages      = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const transactions = typeFilter === 'all'
    ? allTransactions
    : allTransactions.filter(tx =>
        typeFilter === 'income' ? (tx.type === 'TopUp' || tx.type === 'Income') : tx.type === 'Purchase',
      );

  const currentBalance = balance?.balance    ?? 0;
  const totalTopUps    = balance?.totalTopUps ?? 0;
  const totalSpent     = balance?.totalSpent  ?? 0;

  const balanceColor = currentBalance <= 0
    ? 'text-rose-600 dark:text-rose-400'
    : currentBalance < 50
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-emerald-600 dark:text-emerald-400';

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('finance.title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t('finance.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowAddFunds(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors shrink-0"
        >
          <Plus size={15} />
          {t('finance.addFunds')}
        </button>
      </div>

      {/* Balance card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 shadow-sm overflow-hidden"
      >
        <div className="flex items-stretch">
          {/* Left: balance figure */}
          <div className="flex-1 p-6">
            <div className="flex items-center gap-2 mb-1">
              <Wallet size={15} className="text-slate-400 dark:text-slate-500" />
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                {t('finance.currentBalance')}
              </p>
            </div>

            {balanceLoading ? (
              <div className="animate-pulse h-10 w-40 bg-slate-100 dark:bg-slate-700 rounded-xl mt-2" />
            ) : (
              <p className={cn('text-4xl font-bold tabular-nums mt-2 leading-none', balanceColor)}>
                {fmt(currentBalance)}
              </p>
            )}

            {balance && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                {t('finance.lastUpdated')}{' '}
                {new Date(balance.updatedAt).toLocaleString(undefined, {
                  month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            )}

            {!balanceLoading && currentBalance < 50 && currentBalance > 0 && (
              <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {t('finance.lowBalance')}
              </div>
            )}
            {!balanceLoading && currentBalance <= 0 && (
              <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                {t('finance.insufficientBalance')}
              </div>
            )}
          </div>

          {/* Right: quick stats */}
          <div className="border-l border-slate-100 dark:border-slate-700/60 flex flex-col divide-y divide-slate-100 dark:divide-slate-700/60">
            <div className="px-6 py-4">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                {t('finance.totalTopUps')}
              </p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {fmt(totalTopUps)}
              </p>
            </div>
            <div className="px-6 py-4">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                {t('finance.totalSpent')}
              </p>
              <p className="text-lg font-bold text-rose-500 dark:text-rose-400 tabular-nums">
                {fmt(totalSpent)}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Transaction history */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.08 }}
        className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 shadow-sm overflow-hidden"
      >
        {/* Header with filter tabs */}
        <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/80">
          <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide shrink-0">
            {t('finance.transactionHistory')}
          </h2>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 rounded-lg p-0.5">
            {TYPE_FILTERS.map(({ value, labelKey }) => (
              <button
                key={value}
                onClick={() => setTypeFilter(value)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-semibold transition-all duration-150',
                  typeFilter === value
                    ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
                )}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Loading skeleton */}
        {txLoading && (
          <div className="animate-pulse divide-y divide-slate-100 dark:divide-slate-700/40">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-48 bg-slate-100 dark:bg-slate-700 rounded" />
                  <div className="h-3 w-28 bg-slate-100 dark:bg-slate-700/60 rounded" />
                </div>
                <div className="h-4 w-20 bg-slate-100 dark:bg-slate-700/60 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!txLoading && transactions.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 mb-1">
              <Wallet size={24} className="text-slate-300 dark:text-slate-500" />
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t('finance.noTransactions')}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{t('finance.noTransactionsDesc')}</p>
          </div>
        )}

        {/* Rows */}
        {!txLoading && transactions.length > 0 && (
          <div>
            {transactions.map((tx, i) => (
              <TransactionRow key={tx.id} tx={tx} index={i} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!txLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/40">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {totalCount} {t('finance.transactions')}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 min-w-16 text-center">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showAddFunds && (
          <AddFundsModal
            key="add-funds"
            currentBalance={currentBalance}
            onClose={() => setShowAddFunds(false)}
          />
        )}
      </AnimatePresence>

      <PaymentSuccessModal
        open={!!pendingPayment}
        onClose={clearPendingPayment}
        message={t('finance.success.medicineOrderTitle')}
        amount={pendingPayment?.amount}
        amountLabel={t('finance.success.amountAdded')}
        amountSign="credit"
        balance={pendingPayment?.newBalance}
        balanceLabel={t('finance.success.newBalance')}
        ctaLabel={t('common.close')}
      />
    </div>
  );
}
