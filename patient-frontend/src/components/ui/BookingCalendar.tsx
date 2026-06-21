import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

// ── Date helpers (local-safe — never toISOString which shifts day in UTC+ zones) ─

export function toIso(d: Date) {
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function todayIso() { return toIso(new Date()); }
export function fmtTime(t: string) { return t?.slice(0, 5) ?? ''; }
export function fmtMonthYear(d: Date, locale: string) {
  return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}
export function fmtDateShort(d: Date, locale: string) {
  return d.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SlotItem {
  start: string;
  end: string;
  isAvailable: boolean;
}

// ── MiniCalendar ──────────────────────────────────────────────────────────────

export function MiniCalendar({
  workingDays,
  selected,
  onSelect,
  fullyBookedDates = new Set<string>(),
}: {
  workingDays: Set<number>;       // JS day numbers: 0=Sun … 6=Sat
  selected: string | null;        // ISO "YYYY-MM-DD"
  onSelect: (iso: string) => void;
  fullyBookedDates?: Set<string>; // ISO dates already known to be fully booked
}) {
  const { i18n } = useTranslation();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + 60);

  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay  = new Date(viewYear, viewMonth + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Mon = 0

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  const days: (Date | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) => new Date(viewYear, viewMonth, i + 1)),
  ];

  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-800 shadow-sm p-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 capitalize">
          {fmtMonthYear(firstDay, i18n.language)}
        </span>
        <button
          onClick={nextMonth}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day-of-week headers Mon – Sun */}
      <div className="grid grid-cols-7 mb-1">
        {['M','T','W','T','F','S','S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-slate-400 dark:text-slate-500 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mb-3 px-0.5">
        <span className="flex items-center gap-1 text-[9px] text-slate-400 dark:text-slate-500">
          <span className="w-2 h-2 rounded-sm bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 inline-block" />
          Non-working
        </span>
        <span className="flex items-center gap-1 text-[9px] text-slate-400 dark:text-slate-500">
          <span className="w-2 h-2 rounded-sm bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-700/50 inline-block" />
          Fully booked
        </span>
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((d, i) => {
          if (!d) return <div key={`e-${i}`} />;

          const iso           = toIso(d);
          const isPast        = d < today;
          const isFuture      = d > maxDate;
          const isWorking     = workingDays.has(d.getDay());
          const isFullyBooked = !isPast && !isFuture && isWorking && fullyBookedDates.has(iso);
          const isDisabled    = isPast || isFuture || !isWorking || isFullyBooked;
          const isSelected    = selected === iso;
          const isToday       = iso === todayIso();

          return (
            <button
              key={iso}
              disabled={isDisabled}
              onClick={() => onSelect(iso)}
              title={
                isPast || isFuture ? undefined
                  : !isWorking    ? 'Not a working day'
                  : isFullyBooked ? 'Fully booked'
                  : undefined
              }
              className={cn(
                'aspect-square rounded-lg text-xs font-medium transition-all duration-100 flex items-center justify-center',

                isSelected &&
                  'bg-cyan-600 text-white shadow-sm shadow-cyan-200 dark:shadow-cyan-900/40',

                !isSelected && !isDisabled &&
                  'text-slate-700 dark:text-slate-200 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:text-cyan-700 dark:hover:text-cyan-300 cursor-pointer',

                !isSelected && (isPast || isFuture) &&
                  'text-slate-200 dark:text-slate-700 cursor-not-allowed',

                !isSelected && !isPast && !isFuture && !isWorking &&
                  'bg-slate-100 dark:bg-slate-700/60 text-slate-300 dark:text-slate-600 cursor-not-allowed',

                !isSelected && isFullyBooked &&
                  'bg-rose-50 dark:bg-rose-900/20 text-rose-300 dark:text-rose-700 cursor-not-allowed line-through decoration-rose-300 dark:decoration-rose-700',

                isToday && !isSelected && !isDisabled &&
                  'ring-1 ring-cyan-400 dark:ring-cyan-600',
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── TimeSlotGrid ──────────────────────────────────────────────────────────────

export function TimeSlotGrid({
  slots,
  selected,
  onSelect,
  t,
}: {
  slots: SlotItem[];
  selected: string | null;
  onSelect: (start: string) => void;
  t: (k: string) => string;
}) {
  if (slots.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
        {t('booking.noSlots')}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {slots.map((slot) => {
        const isSelected = selected === slot.start;
        return (
          <button
            key={slot.start}
            disabled={!slot.isAvailable}
            onClick={() => onSelect(slot.start)}
            className={cn(
              'py-2.5 rounded-xl text-xs font-semibold transition-all duration-100 border',
              isSelected
                ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm'
                : slot.isAvailable
                  ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-400 dark:hover:border-cyan-700'
                  : 'bg-slate-50 dark:bg-slate-800/40 text-slate-300 dark:text-slate-600 border-slate-100 dark:border-slate-700/40 cursor-not-allowed line-through',
            )}
          >
            {fmtTime(slot.start)}
          </button>
        );
      })}
    </div>
  );
}

// ── FullyBookedBanner ─────────────────────────────────────────────────────────

export function FullyBookedBanner({ t }: { t: (k: string) => string }) {
  return (
    <div className="py-6 flex flex-col items-center gap-2 text-center">
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/20 mb-1">
        <AlertCircle size={18} className="text-rose-500 dark:text-rose-400" />
      </div>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {t('booking.fullyBookedTitle')}
      </p>
      <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[200px] leading-relaxed">
        {t('booking.fullyBookedDesc')}
      </p>
    </div>
  );
}

// ── SlotSkeleton ──────────────────────────────────────────────────────────────

export function SlotSkeleton() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-10 rounded-xl bg-slate-100 dark:bg-slate-700 animate-pulse" />
      ))}
    </div>
  );
}
