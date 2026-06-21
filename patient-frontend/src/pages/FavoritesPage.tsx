import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Heart, Search, Clock, ArrowRight, Stethoscope, LogIn, ChevronDown } from 'lucide-react';
import { cn } from '../utils/cn';
import { API_BASE_URL } from '../api/config';
import { useAuthStore } from '../store/authStore';
import { useMyFavorites, useToggleFavorite } from '../hooks/useFavorites';
import type { FavoriteDoctorResponse } from '../types/favorite.types';

type SortKey = 'az' | 'za' | 'newest' | 'oldest';

function DoctorAvatar({ imageUrl, name }: { imageUrl: string | null; name: string }) {
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

function FavoriteCard({ doctor, index, t, onRemove }: {
  doctor: FavoriteDoctorResponse;
  index: number;
  t: (k: string) => string;
  onRemove: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: Math.min(index * 0.04, 0.2), ease: 'easeOut' }}
      className={cn(
        'group flex flex-col rounded-2xl overflow-hidden',
        'bg-white dark:bg-slate-800',
        'border border-slate-100 dark:border-slate-700/60',
        'shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200',
      )}
    >
      {/* Photo */}
      <div className="relative h-64 shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-700">
        <DoctorAvatar imageUrl={doctor.imageUrl} name={doctor.fullName} />
        {/* Remove from favorites button */}
        <button
          onClick={() => onRemove(doctor.doctorId)}
          aria-label={t('favorites.removeFromFavorites')}
          className={cn(
            'absolute top-3 right-3 z-10 flex items-center justify-center w-8 h-8 rounded-full',
            'bg-white/85 dark:bg-slate-900/70 backdrop-blur-sm shadow-sm',
            'hover:scale-110 active:scale-95 transition-all duration-150',
            'text-rose-500 hover:text-rose-600',
          )}
        >
          <Heart size={15} fill="currentColor" />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-5">
        <h3 className="text-[15px] font-bold text-slate-800 dark:text-slate-100 leading-snug mb-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
          {doctor.fullName}
        </h3>
        <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium mb-1 truncate">
          {doctor.specialty}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 truncate">
          {doctor.departmentName}
        </p>
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50 dark:border-slate-700/60">
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-slate-400 dark:text-slate-500 shrink-0" />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              <strong className="font-bold tabular-nums text-slate-700 dark:text-slate-300">{doctor.yearsOfExperience}</strong>
              {' '}{t('doctors.experience')}
            </span>
          </div>
          <Link
            to={`/doctors/${doctor.doctorId}`}
            className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline underline-offset-2 flex items-center gap-0.5"
          >
            {t('doctors.viewDetails')}
            <ArrowRight size={11} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export function FavoritesPage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const { data: favorites = [], isLoading } = useMyFavorites();
  const { mutate: toggleFavorite } = useToggleFavorite();

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [sortOpen, setSortOpen] = useState(false);

  const sortOpts: { key: SortKey; label: string }[] = [
    { key: 'newest', label: t('favorites.sortNewest') },
    { key: 'oldest', label: t('favorites.sortOldest') },
    { key: 'az',     label: t('doctors.sortAZ') },
    { key: 'za',     label: t('doctors.sortZA') },
  ];

  const filtered = favorites
    .filter((d) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        d.fullName.toLowerCase().includes(q) ||
        d.specialty.toLowerCase().includes(q) ||
        d.departmentName.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sort === 'az') return a.fullName.localeCompare(b.fullName);
      if (sort === 'za') return b.fullName.localeCompare(a.fullName);
      if (sort === 'oldest') return new Date(a.favoritedAt).getTime() - new Date(b.favoritedAt).getTime();
      return new Date(b.favoritedAt).getTime() - new Date(a.favoritedAt).getTime(); // newest
    });

  // Guest state
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="max-w-sm w-full text-center"
        >
          <div className="w-20 h-20 rounded-3xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/40 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Heart size={36} className="text-rose-300 dark:text-rose-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            {t('favorites.signInRequired')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
            {t('favorites.signInRequiredDesc')}
          </p>
          <Link
            to="/sign-in"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold transition-colors shadow-sm"
          >
            <LogIn size={16} />
            {t('auth.signIn')}
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* Hero */}
      <div className="relative bg-linear-to-br from-slate-900 via-rose-950/40 to-slate-900 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-pink-500/10 blur-3xl pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: 'easeOut' }}>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/25 text-rose-300 text-xs font-semibold tracking-wide mb-4">
              <Heart size={11} fill="currentColor" />
              {t('favorites.heroBadge')}
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-3">
              {t('favorites.heroTitle')}
            </h1>
            <p className="text-slate-400 text-base max-w-xl mx-auto">
              {t('favorites.heroSubtitle')}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('favorites.searchPlaceholder')}
              className={cn(
                'w-full h-9 rounded-xl pl-9 pr-3 text-sm',
                'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
                'focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition-all shadow-sm',
                'text-slate-700 dark:text-slate-300 placeholder-slate-400',
              )}
            />
          </div>

          {/* Sort dropdown */}
          <div className="relative shrink-0 ml-auto">
            <button
              onClick={() => setSortOpen((v) => !v)}
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-cyan-300 dark:hover:border-cyan-700 shadow-sm transition-all"
            >
              <span className="text-xs font-semibold">{sortOpts.find((o) => o.key === sort)?.label}</span>
              <ChevronDown size={13} className={cn('text-slate-400 transition-transform duration-150', sortOpen && 'rotate-180')} />
            </button>
            {sortOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setSortOpen(false)} />
                <div className="absolute right-0 top-full mt-1.5 z-30 min-w-40 rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl overflow-hidden">
                  {sortOpts.map((o) => (
                    <button key={o.key} onClick={() => { setSort(o.key); setSortOpen(false); }}
                      className={cn(
                        'w-full text-left px-4 py-2.5 text-sm transition-colors',
                        o.key === sort
                          ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 font-semibold'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50',
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Count */}
        {!isLoading && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">{filtered.length}</span>
            {' '}{t('favorites.found')}
          </p>
        )}

        {/* States */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 shadow-sm animate-pulse">
                <div className="h-64 bg-slate-100 dark:bg-slate-700" />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-36 bg-slate-100 dark:bg-slate-700 rounded-lg" />
                  <div className="h-3 w-24 bg-slate-100 dark:bg-slate-700 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-28 text-center"
          >
            <div className="w-20 h-20 rounded-3xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/40 flex items-center justify-center mb-5 shadow-sm">
              <Heart size={36} className="text-rose-200 dark:text-rose-700" />
            </div>
            <p className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">{t('favorites.empty')}</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed mb-6">{t('favorites.emptyDesc')}</p>
            <Link
              to="/doctors"
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold transition-colors shadow-sm"
            >
              {t('favorites.browseDoctors')}
            </Link>
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-28 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <Search size={28} className="text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">{t('doctors.noResults')}</p>
            <button onClick={() => setSearch('')} className="text-sm text-cyan-600 dark:text-cyan-400 hover:underline mt-2">
              {t('doctors.clearFilters')}
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((doctor, i) => (
              <FavoriteCard
                key={doctor.doctorId}
                doctor={doctor}
                index={i}
                t={t}
                onRemove={(id) => toggleFavorite(id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
