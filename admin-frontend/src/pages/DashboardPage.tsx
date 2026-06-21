import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip as RechartTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Wallet, Package, Pill, AlertTriangle, Truck,
  ShoppingCart, ArrowUpCircle, ArrowDownCircle, TrendingUp, Building2, Users,
  MessageSquareMore, AlertCircle, Clock, CheckCircle2,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { fmt } from '../utils/currency';
import axiosInstance from '../api/axiosInstance';
import { API_ENDPOINTS } from '../api/config';
import { useAuthStore } from '../store/authStore';
import type { ApiResult, ApiListResult } from '../types/api.types';
import type { AdminBalanceResponse, BalanceTransactionResponse, BalanceTransactionListResponse } from '../types/finance.types';
import type { MedicineResponse } from '../types/medicine.types';
import type { SupplierResponse, StockItemResponse } from '../types/supplier.types';
import { departmentService } from '../services/department.service';
import { patientService } from '../services/patient.service';
import { feedbackService } from '../services/feedback.service';

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

function useAllMedicines() {
  return useQuery({
    queryKey: ['medicines-dashboard'],
    queryFn: async () => {
      const res = await axiosInstance.get<ApiListResult<MedicineResponse>>(
        `${API_ENDPOINTS.medicines.base}?pageSize=500&sortBy=name`,
      );
      return res.data.data;
    },
    staleTime: 60_000,
  });
}

function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers-dashboard'],
    queryFn: async () => {
      const res = await axiosInstance.get<ApiListResult<SupplierResponse>>(API_ENDPOINTS.suppliers.base);
      return res.data.data;
    },
    staleTime: 60_000,
  });
}

function useHospitalStock() {
  return useQuery({
    queryKey: ['admin-hospital-stock'],
    queryFn: async () => {
      const res = await axiosInstance.get<ApiResult<StockItemResponse[]>>(API_ENDPOINTS.stock.base);
      return res.data.data ?? [];
    },
    staleTime: 0, // always fresh on mount — dashboard count must match stock page exactly
  });
}

function usePatientCount() {
  return useQuery({
    queryKey: ['patients'],
    queryFn: patientService.getAll,
    staleTime: 60_000,
    select: (res) => res.data?.length ?? 0,
  });
}

function useDepartmentCount() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: departmentService.getAll,
    staleTime: 60_000,
    select: (res) => res.data?.length ?? 0,
  });
}

function useFeedbackStats() {
  return useQuery({
    queryKey: ['admin-feedback'],
    queryFn: async () => {
      const res = await feedbackService.getAll();
      return res.data ?? [];
    },
    staleTime: 30_000,
    select: (data) => ({
      open:     data.filter((f) => f.status === 'Open').length,
      inReview: data.filter((f) => f.status === 'InReview').length,
      resolved: data.filter((f) => f.status === 'Resolved').length,
    }),
  });
}

function useRecentTransactions() {
  return useQuery({
    queryKey: ['transactions-dashboard'],
    queryFn: async () => {
      const res = await axiosInstance.get<ApiResult<BalanceTransactionListResponse>>(
        `${API_ENDPOINTS.balance.transactions}?page=1&pageSize=10`,
      );
      return res.data.data!.items;
    },
    staleTime: 30_000,
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────


const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const fmtDateShort = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

const PIE_COLORS = ['#06b6d4', '#6366f1', '#f59e0b', '#f43f5e', '#22d3ee', '#a78bfa', '#fb923c', '#34d399'];

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.35, ease: 'easeOut' } }),
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 animate-pulse">
      <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
      <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
      <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded" />
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3 animate-pulse">
      <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800 rounded" />
      </div>
      <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
    </div>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  index: number;
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  onClick?: () => void;
  badge?: { text: string; color: string };
}

function KpiCard({ index, label, value, sub, icon: Icon, iconBg, iconColor, onClick, badge }: KpiCardProps) {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      onClick={onClick}
      className={cn(
        'rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5',
        onClick && 'cursor-pointer hover:border-cyan-200 dark:hover:border-cyan-700 hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all duration-150',
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn('p-2.5 rounded-xl', iconBg)}>
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>
        {badge && (
          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', badge.color)}>
            {badge.text}
          </span>
        )}
      </div>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{sub}</p>}
    </motion.div>
  );
}

// ── Attention Card ────────────────────────────────────────────────────────────

function AttentionCard({ index, total, lowQty, unavail, onClick }: {
  index: number; total: number; lowQty: number; unavail: number; onClick: () => void;
}) {
  const { t } = useTranslation();
  const active = total > 0;
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      onClick={onClick}
      className={cn(
        'rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5',
        'cursor-pointer hover:border-cyan-200 dark:hover:border-cyan-700 hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all duration-150',
      )}
    >
      <div className={cn(
        'p-2.5 rounded-xl w-fit',
        active ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-slate-50 dark:bg-slate-800',
      )}>
        <AlertTriangle className={cn('h-5 w-5', active ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400')} />
      </div>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t('dashboard.attentionRequired')}</p>
      <p className={cn(
        'mt-1 text-2xl font-bold tabular-nums',
        active ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500',
      )}>
        {total}
      </p>
      <div className="mt-1.5 flex flex-col gap-0.5">
        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium tabular-nums">
          {lowQty} {t('dashboard.attentionLowQty')}
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
          {unavail} {t('dashboard.attentionUnavail')}
        </span>
      </div>
    </motion.div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const balance = useBalance();
  const medicines = useAllMedicines();
  const stock = useHospitalStock();
  const suppliers = useSuppliers();
  const transactions = useRecentTransactions();
  const deptCount = useDepartmentCount();
  const patientCount = usePatientCount();
  const feedbackStats = useFeedbackStats();

  const isLoading = balance.isLoading || medicines.isLoading || stock.isLoading || suppliers.isLoading || transactions.isLoading;

  // ── stock-derived KPIs (source of truth: Hospital Stock records) ───────────
  const stockItems = stock.data ?? [];

  const inventoryValue = stockItems.reduce(
    (sum, s) => sum + s.quantityOnHand * s.costPrice,
    0,
  );

  const inStockCount = stockItems.filter(s => s.quantityOnHand > 0).length;

  // ── medicine-derived KPIs (from full medicine catalogue) ──────────────────
  // Source of truth: same data as MedicinesPage — no isAvailableInHospital filter.
  const allMeds = medicines.data ?? [];

  const LOW_QTY_THRESHOLD = 20;
  const lowQtyCount    = allMeds.filter(m => { const q = m.stockQuantity ?? 0; return q > 0 && q <= LOW_QTY_THRESHOLD; }).length;
  const unavailCount   = allMeds.filter(m => (m.stockQuantity ?? 0) === 0).length;
  const attentionTotal = lowQtyCount + unavailCount;

  // ── form distribution for pie chart (Hospital Stock units by form) ────────
  const formGroups = stockItems.reduce<Record<string, number>>((acc, s) => {
    if (s.quantityOnHand > 0) {
      acc[s.medicineForm] = (acc[s.medicineForm] ?? 0) + s.quantityOnHand;
    }
    return acc;
  }, {});

  const pieData = Object.entries(formGroups)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // ── recent purchases (Purchase-type transactions, last 5) ─────────────────
  const allTx = transactions.data ?? [];
  const recentPurchases = allTx.filter(tx => tx.type === 'Purchase').slice(0, 5);
  const activityFeed = allTx.slice(0, 8);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('nav.dashboard')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t('dashboard.welcomeBack')}{' '}
          <span className="font-medium text-cyan-600">{user?.fullName}</span>
        </p>
      </div>

      {/* KPI Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <KpiSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            index={0}
            label={t('dashboard.patients')}
            value={String(patientCount.data ?? 0)}
            sub={t('dashboard.patientsSub')}
            icon={Users}
            iconBg="bg-teal-50 dark:bg-teal-900/20"
            iconColor="text-teal-600 dark:text-teal-400"
            onClick={() => navigate('/patients')}
          />
          <KpiCard
            index={1}
            label={t('dashboard.currentBalance')}
            value={fmt(balance.data?.balance ?? 0)}
            sub={t('dashboard.totalTopUps', { value: fmt(balance.data?.totalTopUps ?? 0) })}
            icon={Wallet}
            iconBg="bg-cyan-50 dark:bg-cyan-900/20"
            iconColor="text-cyan-600 dark:text-cyan-400"
            onClick={() => navigate('/finance')}
            badge={
              (balance.data?.balance ?? 0) < 50
                ? { text: t('dashboard.lowBalance'), color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' }
                : undefined
            }
          />
          <KpiCard
            index={2}
            label={t('dashboard.inventoryValue')}
            value={fmt(inventoryValue)}
            sub={t('dashboard.medicinesInStock', { count: inStockCount })}
            icon={TrendingUp}
            iconBg="bg-indigo-50 dark:bg-indigo-900/20"
            iconColor="text-indigo-600 dark:text-indigo-400"
            onClick={() => navigate('/stock')}
          />
          <KpiCard
            index={3}
            label={t('dashboard.medicinesInStockLabel')}
            value={String(inStockCount)}
            sub={t('dashboard.outOfTotal', { total: allMeds.length })}
            icon={Pill}
            iconBg="bg-blue-50 dark:bg-blue-900/20"
            iconColor="text-blue-600 dark:text-blue-400"
            onClick={() => navigate('/stock')}
          />
          <KpiCard
            index={4}
            label={t('dashboard.departments')}
            value={String(deptCount.data ?? 0)}
            sub={t('dashboard.departmentsSub')}
            icon={Building2}
            iconBg="bg-violet-50 dark:bg-violet-900/20"
            iconColor="text-violet-600 dark:text-violet-400"
            onClick={() => navigate('/departments')}
          />
          <AttentionCard
            index={5}
            total={attentionTotal}
            lowQty={lowQtyCount}
            unavail={unavailCount}
            onClick={() => navigate('/medicines?sort=quantity&dir=asc')}
          />
          <KpiCard
            index={6}
            label={t('dashboard.suppliers')}
            value={String(suppliers.data?.length ?? 0)}
            sub={t('dashboard.activeSuppliers')}
            icon={Truck}
            iconBg="bg-emerald-50 dark:bg-emerald-900/20"
            iconColor="text-emerald-600 dark:text-emerald-400"
            onClick={() => navigate('/suppliers')}
          />
          <KpiCard
            index={7}
            label={t('dashboard.totalPurchases')}
            value={fmt(balance.data?.totalSpent ?? 0)}
            sub={t('dashboard.allTimePurchases')}
            icon={ShoppingCart}
            iconBg="bg-rose-50 dark:bg-rose-900/20"
            iconColor="text-rose-600 dark:text-rose-400"
            onClick={() => navigate('/finance')}
          />
        </div>
      )}

      {/* Feedback widget */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.42, duration: 0.35, ease: 'easeOut' }}
        className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 cursor-pointer hover:border-cyan-200 dark:hover:border-cyan-700 hover:shadow-md transition-all duration-150"
        onClick={() => navigate('/feedback')}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-900/20">
              <MessageSquareMore className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('dashboard.feedback')}</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">{t('dashboard.feedbackSub')}</p>
            </div>
          </div>
          <span className="text-xs text-cyan-600 dark:text-cyan-400 font-medium hover:underline">
            {t('dashboard.viewAll')}
          </span>
        </div>
        {feedbackStats.isLoading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-blue-100 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-900/20 p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-300 tabular-nums">{feedbackStats.data?.open ?? 0}</p>
                <p className="text-xs text-blue-600/70 dark:text-blue-400/70">{t('feedback.stats.open')}</p>
              </div>
            </div>
            <div className="rounded-xl border border-amber-100 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20 p-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <p className="text-xl font-bold text-amber-700 dark:text-amber-300 tabular-nums">{feedbackStats.data?.inReview ?? 0}</p>
                <p className="text-xs text-amber-600/70 dark:text-amber-400/70">{t('feedback.stats.inReview')}</p>
              </div>
            </div>
            <div className="rounded-xl border border-emerald-100 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-900/20 p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">{feedbackStats.data?.resolved ?? 0}</p>
                <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">{t('feedback.stats.resolved')}</p>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Middle row: Recent Purchases + Pie Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Purchases */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4, ease: 'easeOut' }}
          className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">{t('dashboard.recentPurchases')}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{t('dashboard.recentPurchasesSub')}</p>
            </div>
            <button
              onClick={() => navigate('/finance')}
              className="text-xs text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 font-medium"
            >
              {t('dashboard.viewAll')}
            </button>
          </div>

          {transactions.isLoading ? (
            <div className="divide-y divide-slate-50 dark:divide-slate-800">
              {Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} />)}
            </div>
          ) : recentPurchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <Package className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">{t('dashboard.noPurchases')}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-800">
              {recentPurchases.map(tx => (
                <PurchaseRow key={tx.id} tx={tx} />
              ))}
            </div>
          )}
        </motion.div>

        {/* Stock Distribution Pie */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4, ease: 'easeOut' }}
          className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6"
        >
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">{t('dashboard.stockDistribution')}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{t('dashboard.stockDistributionSub')}</p>
          </div>

          {medicines.isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="h-32 w-32 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-cyan-500 animate-spin" />
            </div>
          ) : pieData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <Pill className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">{t('dashboard.noStockData')}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <RechartTooltip
                  formatter={(value: number, name: string) => [`${value} units`, name]}
                  contentStyle={{
                    borderRadius: '0.75rem',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.75rem',
                    background: '#fff',
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '0.75rem' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Activity Feed */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.4, ease: 'easeOut' }}
        className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">{t('dashboard.activityFeed')}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{t('dashboard.activityFeedSub')}</p>
          </div>
          <button
            onClick={() => navigate('/finance')}
            className="text-xs text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 font-medium"
          >
            {t('dashboard.viewAll')}
          </button>
        </div>

        {transactions.isLoading ? (
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)}
          </div>
        ) : activityFeed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <Wallet className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">{t('finance.noTransactions')}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {activityFeed.map(tx => (
              <ActivityRow key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ── Purchase Row ──────────────────────────────────────────────────────────────

function PurchaseRow({ tx }: { tx: BalanceTransactionResponse }) {
  const lineCount = tx.purchaseLines?.length ?? 0;
  return (
    <div className="py-3 flex items-start gap-3">
      <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 shrink-0 mt-0.5">
        <ShoppingCart className="h-4 w-4 text-rose-500 dark:text-rose-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
          {tx.description ?? 'Purchase Order'}
        </p>
        {lineCount > 0 && (
          <p className="text-xs text-slate-400 mt-0.5">
            {tx.purchaseLines.map(l => `${l.medicineName} ×${l.quantity}`).join(' · ')}
          </p>
        )}
        <p className="text-xs text-slate-400">{fmtDate(tx.createdAt)}</p>
      </div>
      <span className="text-sm font-semibold text-rose-600 dark:text-rose-400 tabular-nums shrink-0">
        -{fmt(tx.amount)}
      </span>
    </div>
  );
}

// ── Activity Row ──────────────────────────────────────────────────────────────

function ActivityRow({ tx }: { tx: BalanceTransactionResponse }) {
  const isIncome = tx.type === 'TopUp';
  return (
    <div className="py-3 flex items-center gap-3">
      <div className={cn(
        'p-1.5 rounded-lg shrink-0',
        isIncome ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-rose-50 dark:bg-rose-900/20',
      )}>
        {isIncome
          ? <ArrowUpCircle className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
          : <ArrowDownCircle className="h-4 w-4 text-rose-500 dark:text-rose-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
          {tx.description ?? (isIncome ? 'Balance Top-Up' : 'Purchase Order')}
        </p>
        <p className="text-xs text-slate-400">{fmtDateShort(tx.createdAt)}</p>
      </div>
      <span className={cn(
        'text-sm font-semibold tabular-nums shrink-0',
        isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
      )}>
        {isIncome ? '+' : '-'}{fmt(tx.amount)}
      </span>
    </div>
  );
}
