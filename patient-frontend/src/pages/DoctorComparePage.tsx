import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, GitCompareArrows, Stethoscope,
  Building2, Clock, DollarSign, Trophy, BadgeDollarSign,
  LayoutGrid,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useCompareStore, MAX_COMPARE } from '../store/compareStore';
import type { CompareDoctor } from '../store/compareStore';
import {
  CompareAvatar, CompareDoctorHeader, CompareEmptySlot,
  CompareStatRow, CompareActionCell,
  CompareMobileCard, CompareMobileEmptySlot,
} from '../components/ui/CompareDrawer';

// ── Helpers ───────────────────────────────────────────────────────────────────

function maxIndex(arr: number[]): number {
  if (arr.length === 0) return -1;
  let best = 0;
  for (let i = 1; i < arr.length; i++) if (arr[i] > arr[best]) best = i;
  return best;
}

function minIndex(arr: number[]): number {
  if (arr.length === 0) return -1;
  let best = 0;
  for (let i = 1; i < arr.length; i++) if (arr[i] < arr[best]) best = i;
  return best;
}

// ── Desktop comparison table ──────────────────────────────────────────────────

function DesktopTable({ doctors, onRemove, onAdd }: {
  doctors: CompareDoctor[]; onRemove: (id: string) => void; onAdd: () => void;
}) {
  const { t } = useTranslation();

  const colCount = MAX_COMPARE;
  const slots = Array.from({ length: colCount }, (_, i) => doctors[i] ?? null);
  const expValues  = doctors.map((d) => d.yearsOfExperience);
  const feeValues  = doctors.map((d) => d.consultationFee);
  const bestExpIdx = maxIndex(expValues);
  const lowestFeeIdx = minIndex(feeValues);

  function highlightsFor(doctorIdx: number, fieldIdx: number): boolean {
    return doctorIdx === fieldIdx;
  }

  const gridCols = `180px repeat(${colCount}, 1fr)`;

  return (
    <div className="hidden md:block rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">

      {/* Header row: label spacer + doctor columns */}
      <div className="grid border-b border-slate-200 dark:border-slate-700" style={{ gridTemplateColumns: gridCols }}>
        <div className="bg-slate-50/80 dark:bg-slate-800/60 border-r border-slate-200 dark:border-slate-700" />
        {slots.map((doc, i) =>
          doc ? (
            <CompareDoctorHeader key={doc.id} doctor={doc} onRemove={onRemove} isLast={i === colCount - 1} />
          ) : (
            <CompareEmptySlot key={`empty-${i}`} onAdd={onAdd} isLast={i === colCount - 1} />
          )
        )}
      </div>

      {/* Stat rows */}
      <CompareStatRow
        icon={<Building2 size={14} />}
        label={t('doctors.detail.department')}
        colCount={colCount}
        children={slots.map((doc) => doc ? <span>{doc.departmentName}</span> : <span className="text-slate-300 dark:text-slate-600">—</span>)}
      />

      <CompareStatRow
        icon={<Stethoscope size={14} />}
        label={t('doctors.detail.specialty')}
        colCount={colCount}
        children={slots.map((doc) => doc ? <span>{doc.specialty}</span> : <span className="text-slate-300 dark:text-slate-600">—</span>)}
      />

      <CompareStatRow
        icon={<Clock size={14} />}
        label={t('doctors.detail.experience')}
        colCount={colCount}
        highlights={slots.map((doc, i) => doc !== null && highlightsFor(i, bestExpIdx))}
        highlightClass="bg-amber-50 dark:bg-amber-900/15 text-amber-700 dark:text-amber-300"
        children={slots.map((doc, i) =>
          doc ? (
            <span className="flex items-center gap-1.5">
              {doc.yearsOfExperience} {t('doctors.experience')}
              {highlightsFor(i, bestExpIdx) && <Trophy size={13} className="text-amber-500 shrink-0" />}
            </span>
          ) : (
            <span className="text-slate-300 dark:text-slate-600">—</span>
          )
        )}
      />

      <CompareStatRow
        icon={<DollarSign size={14} />}
        label={t('doctors.detail.consultationFee')}
        colCount={colCount}
        highlights={slots.map((doc, i) => doc !== null && highlightsFor(i, lowestFeeIdx))}
        highlightClass="bg-emerald-50 dark:bg-emerald-900/15 text-emerald-700 dark:text-emerald-300"
        children={slots.map((doc, i) =>
          doc ? (
            <span className="flex items-center gap-1.5">
              ₼{doc.consultationFee}
              {highlightsFor(i, lowestFeeIdx) && <BadgeDollarSign size={13} className="text-emerald-500 shrink-0" />}
            </span>
          ) : (
            <span className="text-slate-300 dark:text-slate-600">—</span>
          )
        )}
      />

      {/* Actions row */}
      <div className="grid border-t border-slate-200 dark:border-slate-700" style={{ gridTemplateColumns: gridCols }}>
        <div className="flex items-center px-5 py-4 bg-slate-50/80 dark:bg-slate-800/60">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            {t('compare.actions')}
          </span>
        </div>
        {slots.map((doc, i) =>
          doc ? (
            <CompareActionCell key={doc.id} doctor={doc} isLast={i === colCount - 1} />
          ) : (
            <div
              key={`empty-actions-${i}`}
              className={cn('py-4', i < colCount - 1 && 'border-r border-slate-100 dark:border-slate-700/60')}
            />
          )
        )}
      </div>
    </div>
  );
}

// ── Mobile cards layout ───────────────────────────────────────────────────────

function MobileCards({ doctors, onRemove, onAdd }: {
  doctors: CompareDoctor[]; onRemove: (id: string) => void; onAdd: () => void;
}) {
  const expValues    = doctors.map((d) => d.yearsOfExperience);
  const feeValues    = doctors.map((d) => d.consultationFee);
  const bestExpIdx   = maxIndex(expValues);
  const lowestFeeIdx = minIndex(feeValues);

  const emptyCount = MAX_COMPARE - doctors.length;

  return (
    <div className="md:hidden overflow-x-auto -mx-4 px-4 pb-4">
      <div className="flex gap-4 min-w-max">
        {doctors.map((doc, i) => (
          <CompareMobileCard
            key={doc.id}
            doctor={doc}
            isBestExp={i === bestExpIdx}
            isLowestFee={i === lowestFeeIdx}
            onRemove={onRemove}
          />
        ))}
        {Array.from({ length: emptyCount }, (_, i) => (
          <CompareMobileEmptySlot key={`empty-${i}`} onAdd={onAdd} />
        ))}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onBrowse }: { onBrowse: () => void }) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-28 text-center"
    >
      <div className="w-20 h-20 rounded-3xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center mb-5 shadow-sm">
        <GitCompareArrows size={36} className="text-slate-200 dark:text-slate-600" />
      </div>
      <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">{t('compare.emptyTitle')}</h2>
      <p className="text-sm text-slate-400 dark:text-slate-500 max-w-sm leading-relaxed mb-6">
        {t('compare.emptyDesc')}
      </p>
      <button
        onClick={onBrowse}
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold transition-colors shadow-sm"
      >
        <LayoutGrid size={14} />
        {t('compare.browseDoctors')}
      </button>
    </motion.div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

function Legend() {
  const { t } = useTranslation();
  return (
    <div className="hidden md:flex items-center gap-5 flex-wrap">
      <div className="flex items-center gap-1.5">
        <div className="flex items-center justify-center w-5 h-5 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
          <Trophy size={10} className="text-amber-500" />
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">{t('compare.legendExp')}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="flex items-center justify-center w-5 h-5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40">
          <BadgeDollarSign size={10} className="text-emerald-500" />
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">{t('compare.legendFee')}</span>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function DoctorComparePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { doctors, remove, clear } = useCompareStore();

  const hasAny = doctors.length > 0;

  function goBack() {
    navigate('/doctors');
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="relative bg-linear-to-br from-slate-900 via-cyan-950 to-blue-950 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: 'easeOut' }}
          >
            {/* Back link */}
            <button
              onClick={goBack}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft size={15} />
              {t('compare.backToDoctors')}
            </button>

            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/25 text-cyan-300 text-xs font-semibold tracking-wide mb-3">
                  <GitCompareArrows size={12} />
                  {t('compare.filterLabel')}
                </span>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
                  {t('compare.pageTitle')}
                </h1>
                <p className="text-slate-400 text-sm mt-2 max-w-lg">{t('compare.pageSubtitle')}</p>
              </div>

              {hasAny && (
                <button
                  onClick={clear}
                  className="self-start sm:self-auto flex items-center gap-1.5 h-9 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 hover:border-white/25 text-white text-xs font-semibold transition-all"
                >
                  {t('compare.clearAll')}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">

        {!hasAny ? (
          <EmptyState onBrowse={goBack} />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            {/* Legend + count */}
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">{doctors.length}</span>
                {' / '}
                <span className="tabular-nums">{MAX_COMPARE}</span>
                {' '}{t('compare.doctorsSelected')}
              </p>
              <Legend />
            </div>

            {/* Desktop table */}
            <AnimatePresence mode="popLayout">
              <DesktopTable doctors={doctors} onRemove={remove} onAdd={goBack} />
            </AnimatePresence>

            {/* Mobile cards */}
            <MobileCards doctors={doctors} onRemove={remove} onAdd={goBack} />
          </motion.div>
        )}
      </div>
    </div>
  );
}
