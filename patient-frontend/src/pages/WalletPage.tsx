import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Wallet, ArrowLeft, CreditCard, Plus, X,
  ArrowUpRight, ArrowDownLeft, Loader2, RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import axiosInstance from '../api/axiosInstance';
import { API_ENDPOINTS } from '../api/config';
import type { ApiResult } from '../types/api.types';
import { extractErrorMessage } from '../utils/errorHandler';
import { cn } from '../utils/cn';

// ── Types ─────────────────────────────────────────────────────────────────────

interface WalletBalanceData {
  balance: number;
  totalTopUps: number;
  updatedAt: string;
}

interface WalletTransaction {
  id: string;
  type: 'TopUp' | 'Purchase';
  amount: number;
  description: string | null;
  createdAt: string;
}

interface WalletTransactionList {
  items: WalletTransaction[];
  totalCount: number;
}

// ── Amount presets ────────────────────────────────────────────────────────────

const PRESETS = [10, 25, 50, 100];

// ── Add Funds Modal ───────────────────────────────────────────────────────────

function AddFundsModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState<string>('');

  const checkout = useMutation({
    mutationFn: async (amt: number) => {
      const res = await axiosInstance.post<ApiResult<string>>(
        API_ENDPOINTS.wallet.checkout,
        { amount: amt },
      );
      if (!res.data.isSuccess || !res.data.data)
        throw new Error(res.data.errors?.[0] ?? 'Checkout failed');
      return res.data.data;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err));
    },
  });

  const parsed = parseFloat(amount);
  const valid  = !isNaN(parsed) && parsed >= 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40">
              <CreditCard size={15} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {t('wallet.addFunds')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {/* Amount input */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              {t('wallet.amount')}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500 dark:text-slate-400">$</span>
              <input
                type="number"
                min={1}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 transition-colors"
              />
            </div>
          </div>

          {/* Presets */}
          <div className="flex gap-2 flex-wrap">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setAmount(String(p))}
                className={cn(
                  'flex-1 min-w-14 py-2 rounded-lg text-xs font-bold border transition-colors',
                  amount === String(p)
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400',
                )}
              >
                ${p}
              </button>
            ))}
          </div>

          {/* Note */}
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {t('wallet.stripeNote')}
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          <button
            disabled={!valid || checkout.isPending}
            onClick={() => checkout.mutate(parsed)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {checkout.isPending ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <CreditCard size={15} />
            )}
            {checkout.isPending ? t('wallet.redirecting') : t('wallet.payWithStripe')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Transaction row ───────────────────────────────────────────────────────────

function TxRow({ tx }: { tx: WalletTransaction }) {
  const isTopUp = tx.type === 'TopUp';
  return (
    <div className="flex items-center gap-3 py-3">
      <div className={cn(
        'flex items-center justify-center w-8 h-8 rounded-full shrink-0',
        isTopUp
          ? 'bg-emerald-50 dark:bg-emerald-900/20'
          : 'bg-rose-50 dark:bg-rose-900/20',
      )}>
        {isTopUp
          ? <ArrowDownLeft size={14} className="text-emerald-600 dark:text-emerald-400" />
          : <ArrowUpRight size={14} className="text-rose-500 dark:text-rose-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
          {tx.description ?? (isTopUp ? 'Wallet Top-Up' : 'Purchase')}
        </p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
          {new Date(tx.createdAt).toLocaleDateString()}
        </p>
      </div>
      <span className={cn(
        'text-sm font-bold tabular-nums',
        isTopUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400',
      )}>
        {isTopUp ? '+' : '-'}${tx.amount.toFixed(2)}
      </span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function WalletPage() {
  const { t }    = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc       = useQueryClient();
  const [showAddFunds, setShowAddFunds] = useState(false);

  const { data: balanceData, isLoading: balLoading } = useQuery({
    queryKey: ['patient-wallet-balance'],
    queryFn: async () => {
      const res = await axiosInstance.get<ApiResult<WalletBalanceData>>(
        API_ENDPOINTS.wallet.balance,
      );
      return res.data.data ?? null;
    },
    staleTime: 0,       // always refetch on mount — balance must reflect latest payment
    refetchOnMount: true,
  });

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['patient-wallet-transactions'],
    queryFn: async () => {
      const res = await axiosInstance.get<ApiResult<WalletTransactionList>>(
        `${API_ENDPOINTS.wallet.transactions}?page=1&pageSize=20`,
      );
      return res.data.data ?? null;
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  const balance = balanceData?.balance ?? 0;

  return (
    <>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <div className="relative bg-linear-to-br from-slate-900 via-emerald-950 to-slate-900 overflow-hidden">
          <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-cyan-500/8 blur-3xl pointer-events-none" />

          <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-14">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, ease: 'easeOut' }}
            >
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-white transition-colors mb-6"
              >
                <ArrowLeft size={15} />
                {t('common.back')}
              </button>

              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-xs font-semibold tracking-wide mb-4">
                <Wallet size={12} />
                {t('wallet.pageTitle')}
              </span>

              <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-2">
                {t('wallet.heroTitle')}
              </h1>
              <p className="text-slate-400 text-sm max-w-md">{t('wallet.heroSubtitle')}</p>

              {/* Balance card + CTA */}
              <div className="mt-8 flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="inline-flex flex-col gap-1 bg-white/8 backdrop-blur-sm border border-white/12 rounded-2xl px-7 py-5">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    {t('wallet.currentBalance')}
                  </span>
                  <div className="flex items-end gap-2">
                    {balLoading ? (
                      <Loader2 size={28} className="text-white animate-spin mb-1" />
                    ) : (
                      <span className="text-4xl font-bold text-white tabular-nums">
                        ${balance.toFixed(2)}
                      </span>
                    )}
                    <span className="text-sm text-slate-400 mb-1">USD</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{user?.email ?? ''}</p>
                </div>

                <button
                  onClick={() => setShowAddFunds(true)}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-emerald-900/30"
                >
                  <Plus size={15} />
                  {t('wallet.addFunds')}
                </button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ── Transactions ─────────────────────────────────────────── */}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, delay: 0.1, ease: 'easeOut' }}
            className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden"
          >
            {/* Card header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {t('wallet.transactions')}
              </h2>
              <button
                onClick={() => {
                  qc.invalidateQueries({ queryKey: ['patient-wallet-balance'] });
                  qc.invalidateQueries({ queryKey: ['patient-wallet-transactions'] });
                }}
                className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <RefreshCw size={13} />
              </button>
            </div>

            {/* List */}
            {txLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={22} className="text-slate-300 animate-spin" />
              </div>
            ) : !txData?.items.length ? (
              <div className="flex flex-col items-center text-center py-12 px-6 gap-2">
                <Wallet size={28} className="text-slate-200 dark:text-slate-700" />
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  {t('wallet.noTransactions')}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-700/60 px-5">
                {txData.items.map((tx) => (
                  <TxRow key={tx.id} tx={tx} />
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* ── Add Funds Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {showAddFunds && (
          <AddFundsModal onClose={() => setShowAddFunds(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
