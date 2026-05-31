import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import {
  ArrowRight, Shield, Clock, Star,
  CalendarCheck, Users, Building2, HeartPulse,
  Stethoscope, CheckCircle2, ChevronRight,
} from 'lucide-react';
import { cn } from '../utils/cn';

// ── Stats shown in hero ──────────────────────────────────────────────────────
const STATS = [
  { icon: Stethoscope, value: '50+',  labelKey: 'home.statDoctors' },
  { icon: Users,       value: '10k+', labelKey: 'home.statPatients' },
  { icon: Building2,   value: '15',   labelKey: 'home.statDepts' },
  { icon: HeartPulse,  value: '24/7', labelKey: 'home.statSupport' },
];

// ── Fake "upcoming appointment" card — only dynamic values here ───────────────
const UPCOMING = {
  photo: 'https://randomuser.me/api/portraits/women/44.jpg',
  doctorName: 'Dr. Sarah Carter',
  specialtyKey: 'home.cardiologist',
  time: '10:30 AM',
  dateKey: 'home.today',
};

// ── Floating doctor cards — specialty keys for i18n ──────────────────────────
const DOCTORS = [
  { photo: 'https://randomuser.me/api/portraits/men/32.jpg',   name: 'Dr. James H.', specialtyKey: 'home.neurologist',   rating: 4.9 },
  { photo: 'https://randomuser.me/api/portraits/women/68.jpg', name: 'Dr. Mia F.',   specialtyKey: 'home.cardiologist',  rating: 4.8 },
  { photo: 'https://randomuser.me/api/portraits/men/75.jpg',   name: 'Dr. Amara K.', specialtyKey: 'home.dermatologist', rating: 4.9 },
];

// ── Features below hero — all keys ───────────────────────────────────────────
const FEATURES = [
  { icon: Shield, titleKey: 'home.featureExpertTitle',  descKey: 'home.featureExpertDesc' },
  { icon: Clock,  titleKey: 'home.featureSupportTitle', descKey: 'home.featureSupportDesc' },
  { icon: Star,   titleKey: 'home.featurePremiumTitle', descKey: 'home.featurePremiumDesc' },
];

export function HomePage() {
  const { t } = useTranslation();

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden
        bg-linear-to-br from-slate-50 via-cyan-50/30 to-blue-50/50
        dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">

        {/* Background blobs */}
        <div className="absolute -top-32 -right-32 h-150 w-150 rounded-full bg-cyan-400/8 dark:bg-cyan-500/6 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -left-32 h-96 w-96 rounded-full bg-blue-400/8 dark:bg-blue-500/6 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-200 w-200 rounded-full bg-slate-200/20 dark:bg-slate-800/20 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* ── Left — copy ─────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
            >
              {/* Pill badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full
                bg-cyan-100 dark:bg-cyan-900/30
                border border-cyan-200/60 dark:border-cyan-800/50
                text-cyan-700 dark:text-cyan-400 text-sm font-medium mb-7">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
                {t('home.heroBadge')}
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-bold
                text-slate-900 dark:text-white
                leading-[1.12] tracking-tight mb-6">
                {t('home.heroTitle')}
              </h1>

              <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed mb-8 max-w-lg">
                {t('home.heroSubtitle')}
              </p>

              {/* CTA buttons */}
              <div className="flex flex-wrap gap-3 mb-12">
                <Link to="/sign-up">
                  <Button size="lg" className="gap-2 shadow-lg shadow-cyan-500/25">
                    {t('home.bookAppointment')} <ArrowRight size={17} />
                  </Button>
                </Link>
                <Link to="/doctors">
                  <Button variant="outline" size="lg" className="gap-2">
                    {t('home.findDoctors')} <ChevronRight size={16} />
                  </Button>
                </Link>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {STATS.map(({ icon: Icon, value, labelKey }, i) => (
                  <motion.div
                    key={labelKey}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.15 + i * 0.07 }}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1.5 rounded-2xl px-3 py-4 text-center',
                      'bg-white/70 dark:bg-slate-800/50',
                      'border border-slate-200/70 dark:border-slate-700/50',
                      'shadow-sm backdrop-blur-sm',
                    )}
                  >
                    <Icon size={18} className="text-cyan-500 dark:text-cyan-400" />
                    <span className="text-xl font-bold text-slate-800 dark:text-slate-100 tabular-nums leading-none">{value}</span>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-tight">{t(labelKey)}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* ── Right — visual panel ─────────────────────────────── */}
            <div className="relative hidden lg:block h-135">

              {/* ── Main appointment card ── */}
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className={cn(
                  'absolute left-8 top-12 w-72 rounded-2xl p-5',
                  'bg-white dark:bg-slate-800',
                  'border border-slate-200/80 dark:border-slate-700',
                  'shadow-xl shadow-slate-200/60 dark:shadow-slate-900/60',
                )}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    {t('home.nextAppointment')}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {t('home.confirmed')}
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={UPCOMING.photo}
                    alt={UPCOMING.doctorName}
                    className="w-11 h-11 rounded-xl object-cover shrink-0 ring-2 ring-slate-100 dark:ring-slate-700"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{UPCOMING.doctorName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t(UPCOMING.specialtyKey)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700">
                  <CalendarCheck size={14} className="text-cyan-500 shrink-0" />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t(UPCOMING.dateKey)}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">{UPCOMING.time}</span>
                </div>
              </motion.div>

              {/* ── Doctor cards stack ── */}
              <motion.div
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.55, delay: 0.25 }}
                className={cn(
                  'absolute right-0 top-6 w-56 rounded-2xl p-4',
                  'bg-white dark:bg-slate-800',
                  'border border-slate-200/80 dark:border-slate-700',
                  'shadow-xl shadow-slate-200/60 dark:shadow-slate-900/60',
                )}
              >
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                  {t('home.topDoctors')}
                </p>
                <div className="space-y-2.5">
                  {DOCTORS.map((doc) => (
                    <div key={doc.name} className="flex items-center gap-2.5">
                      <img
                        src={doc.photo}
                        alt={doc.name}
                        className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-600"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{doc.name}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{t(doc.specialtyKey)}</p>
                      </div>
                      <span className="text-[11px] font-bold text-amber-500 shrink-0">★ {doc.rating}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* ── Health score widget ── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className={cn(
                  'absolute left-4 bottom-24 w-48 rounded-2xl p-4',
                  'bg-linear-to-br from-cyan-500 to-blue-600',
                  'shadow-lg shadow-cyan-500/30',
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <HeartPulse size={15} className="text-white/80" />
                  <span className="text-xs font-semibold text-white/80 uppercase tracking-wide">{t('home.healthScore')}</span>
                </div>
                <p className="text-3xl font-bold text-white leading-none mb-1">92<span className="text-base font-medium text-white/70">/100</span></p>
                <div className="w-full h-1.5 rounded-full bg-white/20 mt-2">
                  <div className="h-1.5 rounded-full bg-white/80 w-[92%]" />
                </div>
                <p className="text-[11px] text-white/70 mt-1.5">{t('home.excellentCondition')}</p>
              </motion.div>

              {/* ── Available now badge ── */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.45 }}
                className={cn(
                  'absolute right-4 bottom-20 rounded-2xl px-4 py-3',
                  'bg-white dark:bg-slate-800',
                  'border border-slate-200/80 dark:border-slate-700',
                  'shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50',
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-800 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{t('home.availableNow')}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('home.doctorsOnline')}</p>
                  </div>
                </div>
              </motion.div>

              {/* ── Subtle grid backdrop ── */}
              <div className="absolute inset-0 -z-10 opacity-[0.03] dark:opacity-[0.04]"
                style={{
                  backgroundImage: 'radial-gradient(circle, #0891b2 1px, transparent 1px)',
                  backgroundSize: '28px 28px',
                }} />
            </div>

          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section className="py-24 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">{t('home.whyChooseTitle')}</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              {t('home.whyChooseSubtitle')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURES.map(({ icon: Icon, titleKey, descKey }) => (
              <motion.div key={titleKey} whileHover={{ y: -4 }} transition={{ duration: 0.2 }}
                className="rounded-2xl border border-slate-100 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800 p-8 text-center group">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20 mb-6 group-hover:shadow-cyan-500/30 transition-shadow">
                  <Icon size={24} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">{t(titleKey)}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{t(descKey)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
