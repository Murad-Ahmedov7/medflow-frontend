import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  X, Stethoscope, Building2, Clock, DollarSign,
  ArrowRight, CalendarDays, Trophy, BadgeDollarSign, Plus,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { API_BASE_URL } from '../../api/config';
import type { CompareDoctor } from '../../store/compareStore';

export type { CompareDoctor };

// ── Avatar ────────────────────────────────────────────────────────────────────

export function CompareAvatar({ imageUrl, name, size = 'md' }: {
  imageUrl?: string; name: string; size?: 'sm' | 'md' | 'lg';
}) {
  const src = imageUrl
    ? (imageUrl.startsWith('http') ? imageUrl : `${API_BASE_URL}${imageUrl}`)
    : null;

  const stripped = name.replace(/^(dr|prof|mr|mrs|ms|miss)\.\s*/i, '').trim();
  const initials = stripped.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  const textSize = size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-base' : 'text-xl';
  const iconSize = size === 'lg' ? 40 : size === 'sm' ? 22 : 28;

  if (src) {
    return <img src={src} alt={name} className="w-full h-full object-cover object-top" />;
  }
  return (
    <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-cyan-50 to-blue-100 dark:from-cyan-900/20 dark:to-blue-900/30">
      {initials
        ? <span className={cn('font-bold text-cyan-600 dark:text-cyan-400', textSize)}>{initials}</span>
        : <Stethoscope size={iconSize} className="text-cyan-300 dark:text-cyan-600" />
      }
    </div>
  );
}

// ── Stat row (desktop table) ──────────────────────────────────────────────────

interface StatRowProps {
  icon: React.ReactNode;
  label: string;
  colCount: number;
  children: React.ReactNode[];
  highlights?: boolean[];
  highlightClass?: string;
}

export function CompareStatRow({ icon, label, colCount, children, highlights = [], highlightClass = '' }: StatRowProps) {
  return (
    <div
      className="grid border-b border-slate-100 dark:border-slate-700/60 last:border-0"
      style={{ gridTemplateColumns: `180px repeat(${colCount}, 1fr)` }}
    >
      {/* Label column */}
      <div className="flex items-center gap-2.5 px-5 py-4 bg-slate-50/80 dark:bg-slate-800/60">
        <span className="text-slate-400 dark:text-slate-500 shrink-0">{icon}</span>
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide leading-snug">
          {label}
        </span>
      </div>
      {children.map((child, i) => (
        <div
          key={i}
          className={cn(
            'flex items-center justify-center px-4 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200 text-center',
            highlights[i] && highlightClass,
            i < children.length - 1 && 'border-r border-slate-100 dark:border-slate-700/60',
          )}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

// ── Doctor column header ──────────────────────────────────────────────────────

export function CompareDoctorHeader({ doctor, onRemove, isLast }: {
  doctor: CompareDoctor; onRemove: (id: string) => void; isLast: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className={cn(
      'relative flex flex-col items-center px-4 py-6 gap-3',
      !isLast && 'border-r border-slate-200 dark:border-slate-700',
    )}>
      {/* Remove */}
      <button
        onClick={() => onRemove(doctor.id)}
        className="absolute top-3 right-3 flex items-center justify-center w-6 h-6 rounded-full text-slate-300 dark:text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
        aria-label={t('compare.remove')}
      >
        <X size={13} />
      </button>

      {/* Photo */}
      <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-slate-100 dark:border-slate-700 shadow-sm shrink-0">
        <CompareAvatar imageUrl={doctor.imageUrl} name={doctor.fullName} size="md" />
      </div>

      <div className="text-center">
        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">{doctor.fullName}</p>
        <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium mt-1">{doctor.specialty}</p>
      </div>

      <span className={cn(
        'inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full',
        doctor.isActive
          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
          : 'bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400',
      )}>
        <span className={cn('h-1.5 w-1.5 rounded-full', doctor.isActive ? 'bg-emerald-500' : 'bg-slate-400')} />
        {doctor.isActive ? t('doctors.detail.active') : t('doctors.detail.inactive')}
      </span>
    </div>
  );
}

// ── Empty slot ────────────────────────────────────────────────────────────────

export function CompareEmptySlot({ onAdd, isLast }: {
  onAdd: () => void; isLast: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className={cn(
      'flex flex-col items-center justify-center px-4 py-6 gap-3 min-h-52',
      !isLast && 'border-r border-slate-200 dark:border-slate-700',
    )}>
      <button
        onClick={onAdd}
        className={cn(
          'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-dashed w-full',
          'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-600',
          'hover:border-cyan-300 dark:hover:border-cyan-700 hover:text-cyan-500 dark:hover:text-cyan-400',
          'transition-colors duration-150',
        )}
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800">
          <Plus size={18} />
        </div>
        <span className="text-xs font-semibold">{t('compare.addDoctor')}</span>
      </button>
    </div>
  );
}

// ── Action buttons row ────────────────────────────────────────────────────────

export function CompareActionCell({ doctor, isLast }: {
  doctor: CompareDoctor; isLast: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className={cn(
      'flex flex-col gap-2 items-stretch justify-center px-4 py-4',
      !isLast && 'border-r border-slate-100 dark:border-slate-700/60',
    )}>
      <Link
        to={`/doctors/${doctor.id}`}
        className="flex items-center justify-center gap-1.5 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
      >
        {t('compare.viewProfile')} <ArrowRight size={11} />
      </Link>
      <Link
        to={`/doctors/${doctor.id}?book=1`}
        className="flex items-center justify-center gap-1.5 h-9 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-xs font-semibold text-white transition-colors shadow-sm"
      >
        <CalendarDays size={11} />
        {t('doctors.bookAppointment')}
      </Link>
    </div>
  );
}

// ── Mobile card ───────────────────────────────────────────────────────────────

export function CompareMobileCard({ doctor, isBestExp, isLowestFee, onRemove }: {
  doctor: CompareDoctor; isBestExp: boolean; isLowestFee: boolean;
  onRemove: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="relative shrink-0 w-72 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
      {/* Remove */}
      <button
        onClick={() => onRemove(doctor.id)}
        className="absolute top-3 right-3 z-10 flex items-center justify-center w-7 h-7 rounded-full bg-white/90 dark:bg-slate-900/80 shadow text-slate-400 hover:text-rose-500 transition-colors"
        aria-label={t('compare.remove')}
      >
        <X size={13} />
      </button>

      {/* Photo */}
      <div className="h-52 overflow-hidden bg-slate-100 dark:bg-slate-700">
        <CompareAvatar imageUrl={doctor.imageUrl} name={doctor.fullName} size="lg" />
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">{doctor.fullName}</h3>
          <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium mt-0.5">{doctor.specialty}</p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Building2 size={12} className="text-slate-400 shrink-0" />
            <span className="text-xs text-slate-600 dark:text-slate-300 truncate">{doctor.departmentName}</span>
          </div>

          <div className={cn(
            'flex items-center gap-2 rounded-lg px-2.5 py-1.5',
            isBestExp ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40' : 'bg-slate-50 dark:bg-slate-700/40',
          )}>
            <Clock size={12} className={cn('shrink-0', isBestExp ? 'text-amber-500' : 'text-slate-400')} />
            <span className={cn('text-xs font-semibold', isBestExp ? 'text-amber-700 dark:text-amber-300' : 'text-slate-600 dark:text-slate-300')}>
              {doctor.yearsOfExperience} {t('doctors.experience')}
              {isBestExp && <Trophy size={10} className="inline ml-1 text-amber-500" />}
            </span>
          </div>

          <div className={cn(
            'flex items-center gap-2 rounded-lg px-2.5 py-1.5',
            isLowestFee ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40' : 'bg-slate-50 dark:bg-slate-700/40',
          )}>
            <DollarSign size={12} className={cn('shrink-0', isLowestFee ? 'text-emerald-500' : 'text-slate-400')} />
            <span className={cn('text-xs font-semibold', isLowestFee ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-300')}>
              ₼{doctor.consultationFee}
              {isLowestFee && <BadgeDollarSign size={10} className="inline ml-1 text-emerald-500" />}
            </span>
          </div>

          <span className={cn(
            'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
            doctor.isActive
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
          )}>
            <span className={cn('h-1.5 w-1.5 rounded-full', doctor.isActive ? 'bg-emerald-500' : 'bg-slate-400')} />
            {doctor.isActive ? t('doctors.detail.active') : t('doctors.detail.inactive')}
          </span>
        </div>

        <div className="pt-1 space-y-2">
          <Link
            to={`/doctors/${doctor.id}`}
            className="flex items-center justify-center gap-1.5 w-full h-9 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            {t('compare.viewProfile')} <ArrowRight size={11} />
          </Link>
          <Link
            to={`/doctors/${doctor.id}?book=1`}
            className="flex items-center justify-center gap-1.5 w-full h-9 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-xs font-semibold text-white transition-colors shadow-sm"
          >
            <CalendarDays size={11} />
            {t('doctors.bookAppointment')}
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Mobile empty slot ─────────────────────────────────────────────────────────

export function CompareMobileEmptySlot({ onAdd }: { onAdd: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="shrink-0 w-72 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-3 p-8 min-h-52">
      <button
        onClick={onAdd}
        className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-600 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors"
      >
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <Plus size={20} />
        </div>
        <span className="text-xs font-semibold">{t('compare.addDoctor')}</span>
      </button>
    </div>
  );
}
