/**
 * Shared layout components for all auth pages (SignIn, SignUp, ForgotPassword).
 */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CalendarCheck, Users, ShieldCheck,
  HeartPulse, Activity, Star,
  ChevronRight, Stethoscope,
} from 'lucide-react';
import logoIcon from '../../assets/branding/medflow_logo_only.png';
import { motion } from 'framer-motion';
import { ThemeSwitcher } from '../../components/layout/ThemeSwitcher';
import { LanguageSwitcher } from '../../components/layout/LanguageSwitcher';
import { cn } from '../../utils/cn';

// ─── Avatar constants ─────────────────────────────────────────────────────────
export const DOCTOR_AVATARS = [
  {
    photo: 'https://randomuser.me/api/portraits/women/44.jpg',
    name: 'Dr. Sarah Chen',
    spec: 'Cardiologist',
    time: '09:30 AM',
    dot: 'bg-cyan-400',
    ring: 'ring-cyan-400/50',
  },
  {
    photo: 'https://randomuser.me/api/portraits/men/32.jpg',
    name: 'Dr. James Park',
    spec: 'Neurologist',
    time: '10:45 AM',
    dot: 'bg-violet-400',
    ring: 'ring-violet-400/50',
  },
  {
    photo: 'https://randomuser.me/api/portraits/women/68.jpg',
    name: 'Dr. Maria Kim',
    spec: 'Dermatologist',
    time: '12:00 PM',
    dot: 'bg-emerald-400',
    ring: 'ring-emerald-400/50',
  },
  {
    photo: 'https://randomuser.me/api/portraits/men/75.jpg',
    name: 'Dr. Michael Johnson',
    spec: 'Orthopedic Surgeon',
    time: '01:30 PM',
    dot: 'bg-orange-400',
    ring: 'ring-orange-400/50',
  },
];
export const SPECIALIST_PHOTOS = [
  'https://randomuser.me/api/portraits/women/26.jpg',
  'https://randomuser.me/api/portraits/men/54.jpg',
  'https://randomuser.me/api/portraits/women/71.jpg',
  'https://randomuser.me/api/portraits/men/77.jpg',
  'https://randomuser.me/api/portraits/women/90.jpg',
];
export const TESTIMONIAL_PHOTO = 'https://randomuser.me/api/portraits/women/12.jpg';

// ─── Glass card ───────────────────────────────────────────────────────────────
export function GlassCard({ className, children, delay = 0 }: {
  className?: string; children: React.ReactNode; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={cn(
        'rounded-2xl border overflow-hidden',
        'bg-white/65 border-slate-200/60 shadow-sm',
        'dark:bg-white/6 dark:border-white/10',
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

// ─── Appointment mock card ────────────────────────────────────────────────────
export function AppointmentMockCard() {
  const { t } = useTranslation();
  return (
    <GlassCard className="p-4 xl:p-5 2xl:p-6 h-full flex flex-col" delay={0.2}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 xl:mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <CalendarCheck size={13} className="text-cyan-600 dark:text-cyan-400 shrink-0 xl:w-3.5 xl:h-3.5" />
          <span className="text-[10.5px] xl:text-[11.5px] 2xl:text-[12.5px] font-bold uppercase tracking-wider text-slate-600 dark:text-white/60">
            {t('auth.panelTodaysAppts')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
          <span className="text-[10px] xl:text-[10.5px] 2xl:text-[11.5px] text-emerald-600 dark:text-emerald-300 font-semibold">{t('auth.panelLive')}</span>
        </div>
      </div>
      {/* Rows — flex-1 so they fill the card; justify-between distributes evenly */}
      <div className="flex-1 flex flex-col justify-between">
        {DOCTOR_AVATARS.map((a, i) => (
          <motion.div
            key={a.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.3 + i * 0.08 }}
            className="flex items-center gap-2.5 xl:gap-3"
          >
            <img
              src={a.photo} alt={a.name}
              className={cn('w-8 h-8 xl:w-9 xl:h-9 2xl:w-10 2xl:h-10 rounded-full shrink-0 object-cover ring-2', a.ring)}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] xl:text-[12px] 2xl:text-[13px] font-semibold text-slate-800 dark:text-white leading-tight truncate">{a.name}</p>
              <p className="text-[9.5px] xl:text-[10px] 2xl:text-[11px] text-slate-500 dark:text-white/40 mt-0.5 truncate">{a.spec}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className={cn('h-1.5 w-1.5 rounded-full', a.dot)} />
              <span className="text-[9.5px] xl:text-[10.5px] 2xl:text-[11.5px] text-slate-500 dark:text-white/50 font-medium tabular-nums">{a.time}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );
}

// ─── Health metrics card ──────────────────────────────────────────────────────
export function HealthMetricsCard() {
  const { t } = useTranslation();
  return (
    <GlassCard className="p-4 xl:p-5 2xl:p-6 h-full flex flex-col" delay={0.28}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 xl:mb-4 shrink-0">
        <span className="text-[10.5px] xl:text-[11.5px] 2xl:text-[12.5px] font-bold uppercase tracking-wider text-slate-600 dark:text-white/60">
          {t('auth.panelHealthOverview')}
        </span>
        <Activity size={13} className="text-cyan-600 dark:text-cyan-400 xl:w-3.5 xl:h-3.5" />
      </div>
      {/* Metrics — flex-1 + justify-between distributes the 3 rows evenly */}
      <div className="flex-1 flex flex-col justify-between">
        {[
  {
    labelKey: 'auth.panelHeartRate',
    value: '72',
    unit: 'bpm',
    bar: '72%',
    barCls: 'bg-rose-500 dark:bg-rose-400',
  },
  {
    labelKey: 'auth.panelHealthScore',
    value: '87',
    unit: '/100',
    bar: '87%',
    barCls: 'bg-cyan-500 dark:bg-cyan-400',
  },
  {
    labelKey: 'auth.panelSteps',
    value: '8,420',
    unit: 'steps',
    bar: '84%',
    barCls: 'bg-emerald-500 dark:bg-emerald-400',
  },
].map((m) => (
          <div key={m.labelKey}>
            <p className="text-[9.5px] xl:text-[10.5px] 2xl:text-[11.5px] text-slate-400 dark:text-white/40 mb-1">{t(m.labelKey)}</p>
            <div className="flex items-baseline gap-1 mb-1.5">
              <span className="text-[18px] xl:text-[20px] 2xl:text-[22px] font-bold text-slate-800 dark:text-white leading-none">{m.value}</span>
              <span className="text-[9.5px] xl:text-[10px] text-slate-400 dark:text-white/35">{m.unit}</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-200/70 dark:bg-white/10 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: m.bar }}
                transition={{ duration: 1.1, delay: 0.6, ease: 'easeOut' }}
                className={cn('h-full rounded-full', m.barCls)}
              />
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

// ─── Stat pills ───────────────────────────────────────────────────────────────
export function StatPillsRow() {
  const { t } = useTranslation();
  const pills = [
    { icon: Users,       value: '10k+',  label: t('auth.statPatients'), iconCls: 'text-cyan-600 dark:text-cyan-400' },
    { icon: ShieldCheck, value: 'HIPAA', label: t('auth.statHipaa'),    iconCls: 'text-violet-600 dark:text-violet-400' },
    { icon: Star,        value: '4.9★',  label: t('auth.panelRating'),  iconCls: 'text-amber-500 dark:text-amber-300' },
    { icon: HeartPulse,  value: '100%',  label: t('auth.statSecure'),   iconCls: 'text-emerald-600 dark:text-emerald-400' },
  ];
  return (
    <div className="grid grid-cols-4 gap-2.5 xl:gap-3 2xl:gap-4">
      {pills.map(({ icon: Icon, value, label, iconCls }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 + i * 0.07 }}
          className={cn(
            'flex flex-col items-center gap-2 xl:gap-2.5',
            'rounded-2xl py-3.5 xl:py-4 2xl:py-5 px-2',
            'bg-white/75 border border-slate-200/50',
            'dark:bg-white/5 dark:border-white/8',
          )}
        >
          <Icon size={16} className={cn(iconCls, 'xl:w-[18px] xl:h-[18px] 2xl:w-5 2xl:h-5')} />
          <span className="text-[13px] xl:text-[15px] 2xl:text-[17px] font-bold text-slate-800 dark:text-white leading-none">{value}</span>
          <span className="text-[9px] xl:text-[9.5px] 2xl:text-[10.5px] text-slate-500 dark:text-white/45 text-center leading-tight">{label}</span>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Doctor avatar badge ──────────────────────────────────────────────────────
export function DoctorAvatarBadge() {
  const { t } = useTranslation();
  return (
    <GlassCard className="px-4 xl:px-5 2xl:px-6 py-3 xl:py-3.5 2xl:py-4 flex items-center gap-3 xl:gap-4" delay={0.36}>
      <div className="flex -space-x-2.5 xl:-space-x-3">
        {SPECIALIST_PHOTOS.map((src, i) => (
          <img
            key={i} src={src} alt="Specialist"
            className="w-8 h-8 xl:w-9 xl:h-9 2xl:w-10 2xl:h-10 rounded-full object-cover ring-2 ring-white/90 dark:ring-[#091525]"
          />
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11.5px] xl:text-[12.5px] 2xl:text-[14px] font-semibold text-slate-800 dark:text-white leading-tight">
          {t('auth.panelVerifiedSpecialists')}
        </p>
        <p className="text-[10px] xl:text-[11px] 2xl:text-[12px] text-slate-500 dark:text-white/40 mt-0.5">
          {t('auth.panelDepartments')}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
        <span className="text-[10.5px] xl:text-[11.5px] 2xl:text-[12.5px] text-emerald-600 dark:text-emerald-300 font-semibold">{t('auth.panelOnline')}</span>
      </div>
    </GlassCard>
  );
}

// ─── Left panel ───────────────────────────────────────────────────────────────
//
// Dashboard layout mirrors the reference image:
//   [ Appointments ] [ Health Overview ]   ← grid-cols-2
//   [    Specialists (full width)      ]
//
// At 1920×1080 the content column is the full panel width minus padding.
// Panel = 56% × 1920 = 1075px, px-14 = 56px each side → 963px usable.
// No max-w cap — we use all available horizontal space like the reference.
//
export function AuthLeftPanel({ titleKey, headingKey }: { titleKey: string; headingKey: string }) {
  const { t } = useTranslation();
  return (
    <div className={cn(
      'hidden lg:flex flex-col h-full relative overflow-hidden',
      'bg-linear-to-br from-slate-50 via-sky-50/60 to-cyan-50/80',
      'dark:bg-linear-to-br dark:from-[#060d1a] dark:via-[#071220] dark:to-[#050c17]',
    )}>

      {/* Light: accent wash */}
      <div className="absolute inset-0 pointer-events-none dark:hidden" style={{
        backgroundImage:
          'radial-gradient(ellipse at 80% 0%, rgba(6,182,212,0.10) 0%, transparent 50%),' +
          'radial-gradient(ellipse at 5% 100%, rgba(139,92,246,0.06) 0%, transparent 45%)',
      }} />

      {/* Dark: glow orbs */}
      <div className="absolute inset-0 pointer-events-none hidden dark:block">
        <div className="absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-cyan-500/8 blur-[120px]" />
        <div className="absolute bottom-0 -left-20 h-80 w-80 rounded-full bg-blue-700/10 blur-[90px]" />
        <div className="absolute top-1/2 left-1/2 h-64 w-64 rounded-full bg-violet-600/5 blur-[80px]" />
      </div>

      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none dark:hidden" style={{
        backgroundImage: 'radial-gradient(circle, rgba(15,23,42,0.035) 1px, transparent 1px)',
        backgroundSize: '26px 26px',
      }} />
      <div className="absolute inset-0 pointer-events-none hidden dark:block" style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.028) 1px, transparent 1px)',
        backgroundSize: '26px 26px',
      }} />

      {/* ── Content column — full height, no artificial max-width cap ── */}
      <div className="relative flex flex-col h-full px-7 xl:px-10 2xl:px-14 py-5 xl:py-6 2xl:py-9">

        {/* 1 ── Brand ── */}
        <div className="flex items-center gap-3 shrink-0">
          <div className={cn(
            'h-9 w-9 xl:h-10 xl:w-10 2xl:h-11 2xl:w-11 rounded-xl flex items-center justify-center shrink-0',
            'bg-white shadow-md shadow-slate-200/60 dark:bg-white/12 dark:shadow-none',
          )}>
            <img src={logoIcon} alt="MedFlow" className="h-5 w-5 xl:h-6 xl:w-6 2xl:h-6.5 2xl:w-6.5 object-contain dark:brightness-0 dark:invert" />
          </div>
          <span className="text-[17px] xl:text-[19px] 2xl:text-[21px] font-bold tracking-tight text-slate-800 dark:text-white">MedFlow</span>
        </div>

        {/* 2 ── Hero text ── */}
        <div className="mt-4 xl:mt-5 2xl:mt-7 shrink-0">

          {/* Badge pill */}
          <div className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 xl:py-1.5 mb-3 xl:mb-3.5',
            'bg-white/80 border border-slate-200/60',
            'dark:bg-white/8 dark:border-white/12',
          )}>
            <Stethoscope size={11} className="text-cyan-600 dark:text-cyan-400/80 xl:w-3 xl:h-3" />
            <span className="text-[9.5px] xl:text-[10.5px] 2xl:text-[11.5px] font-bold uppercase tracking-[0.13em] text-cyan-700 dark:text-cyan-300/80">
              {t(titleKey)}
            </span>
          </div>

          {/* Main heading */}
          <h2 className="text-[2rem] xl:text-[2.5rem] 2xl:text-[3rem] font-bold leading-[1.12] tracking-tight text-slate-900 dark:text-white">
            {t(headingKey)}
          </h2>

          {/* Description */}
          <p className="mt-2 xl:mt-2.5 2xl:mt-4 text-[13px] xl:text-[14.5px] 2xl:text-[16px] leading-[1.7] text-slate-500 dark:text-white/55 max-w-125 xl:max-w-135">
            {t('auth.panelDesc')}
          </p>
        </div>

        {/* 3 ── Stats row ── */}
        <div className="mt-4 xl:mt-5 2xl:mt-7 shrink-0">
          <StatPillsRow />
        </div>

        {/* 4+5+6 ── Dashboard block — grows to fill remaining height ── */}
        <div className="flex-1 flex flex-col gap-2 xl:gap-2.5 2xl:gap-3 mt-3 xl:mt-3.5 2xl:mt-5 min-h-0">
          {/* Appointments + Health side by side, equal height */}
          <div className="flex-1 grid grid-cols-2 gap-2 xl:gap-2.5 2xl:gap-3 min-h-0">
            <AppointmentMockCard />
            <HealthMetricsCard />
          </div>
          {/* Specialists badge — natural height, doesn't stretch */}
          <div className="shrink-0">
            <DoctorAvatarBadge />
          </div>
        </div>

        {/* 7 ── Testimonial ── */}
        <div className="mt-3 xl:mt-3.5 2xl:mt-5 pt-3 xl:pt-3.5 2xl:pt-5 border-t border-slate-200/50 dark:border-white/8 shrink-0">
          <div className="flex items-start gap-3 xl:gap-4">
            {/* Decorative quote mark */}
            <span className="text-[2.5rem] xl:text-[3rem] leading-none text-cyan-400/40 dark:text-cyan-400/30 font-serif select-none shrink-0 -mt-1">❝</span>
            <div className="min-w-0">
              <p className="text-[12px] xl:text-[13px] 2xl:text-[14.5px] text-slate-500 dark:text-white/50 leading-relaxed italic">
                {t('auth.panelTestimonialQuote')}
              </p>
              <div className="flex items-center gap-2.5 mt-1.5">
                <img
                  src={TESTIMONIAL_PHOTO} alt="Emily R."
                  className="w-6 h-6 xl:w-7 xl:h-7 rounded-full object-cover ring-1 ring-slate-200/60 dark:ring-white/20"
                />
                <span className="text-[11.5px] xl:text-[12.5px] 2xl:text-[13.5px] font-semibold text-slate-700 dark:text-white/70">— {t('auth.panelTestimonialAuthor')}</span>
                <span className="text-amber-400 text-[11px] xl:text-[12px] tracking-tight">★★★★★</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Right form panel ─────────────────────────────────────────────────────────
export function AuthFormPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col min-h-0 relative bg-white dark:bg-[#080d17]">

      {/* Light: very faint warm */}
      <div className="absolute inset-0 pointer-events-none dark:hidden" style={{
        backgroundImage: 'radial-gradient(ellipse at 60% 0%, rgba(6,182,212,0.035) 0%, transparent 55%)',
      }} />

      {/* Dark: ambient */}
      <div className="absolute inset-0 pointer-events-none hidden dark:block overflow-hidden">
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-blue-600/5 blur-[80px]" />
        <div className="absolute -bottom-32 -left-32 h-72 w-72 rounded-full bg-cyan-500/4 blur-[70px]" />
      </div>

      {/* Top bar */}
      <div className="relative flex items-center justify-between px-5 sm:px-8 xl:px-10 py-4 sm:py-5 shrink-0">
        <div className="lg:hidden flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow shadow-cyan-500/30">
            <img src={logoIcon} alt="MedFlow" className="h-5 w-5 object-contain brightness-0 invert" />
          </div>
          <span className="text-[15px] font-bold text-slate-800 dark:text-slate-100 tracking-tight">MedFlow</span>
        </div>
        <div className="flex items-center gap-1 lg:ml-auto">
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
      </div>

      {/* Scrollable form area */}
      <div className="relative flex-1 overflow-y-auto min-h-0">
        <div className="flex min-h-full items-center justify-center px-4 sm:px-8 xl:px-10 py-4 xl:py-6">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="w-full max-w-100 xl:max-w-115 2xl:max-w-130"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ─── Auth card shell ──────────────────────────────────────────────────────────
export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(
      'rounded-2xl',
      'px-6 sm:px-8 xl:px-9 2xl:px-10 py-7 sm:py-8 xl:py-9 2xl:py-10',
      'bg-white border border-slate-100 shadow-lg shadow-slate-200/50',
      'dark:bg-[#0f1623] dark:border-white/6 dark:shadow-xl dark:shadow-black/30',
    )}>
      {children}
    </div>
  );
}

// ─── Brand badge ──────────────────────────────────────────────────────────────
export function AuthBrandBadge() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 mb-5 xl:mb-6">
      <div className={cn(
        'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
        'bg-linear-to-br from-cyan-500 to-blue-600',
        'shadow-md shadow-cyan-500/25',
      )}>
        <img src={logoIcon} alt="MedFlow" className="h-6 w-6 object-contain brightness-0 invert" />
      </div>
      <div>
        <p className="text-[11.5px] xl:text-[12.5px] font-bold uppercase tracking-[0.17em] text-cyan-600 dark:text-cyan-400 leading-none">
          MedFlow
        </p>
        <p className="text-[10px] xl:text-[10.5px] text-slate-400 dark:text-slate-500 mt-0.5">{t('auth.patientPortal')}</p>
      </div>
    </div>
  );
}

// ─── Continue as guest ────────────────────────────────────────────────────────
export function ContinueAsGuest() {
  const { t } = useTranslation();
  return (
    <p className="text-center mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-[11.5px] xl:text-[12px] text-slate-400 dark:text-slate-600">
      {t('auth.orText')}{' '}
      <Link
        to="/"
        className="inline-flex items-center gap-0.5 font-medium
          text-slate-400 hover:text-cyan-600
          dark:text-slate-500 dark:hover:text-cyan-400
          transition-colors duration-150"
      >
        {t('auth.continueAsGuest')}
        <ChevronRight size={10} />
      </Link>
    </p>
  );
}

// ─── Page root — split-screen (SignIn / SignUp) ───────────────────────────────
export function AuthPageRoot({ leftTitleKey, leftHeadingKey, children }: {
  leftTitleKey: string;
  leftHeadingKey: string;
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen flex overflow-hidden">
      <div className="lg:w-[52%] xl:w-[54%] 2xl:w-[56%] shrink-0 h-full">
        <AuthLeftPanel titleKey={leftTitleKey} headingKey={leftHeadingKey} />
      </div>
      <AuthFormPanel>
        {children}
      </AuthFormPanel>
    </div>
  );
}

// ─── Task page root ───────────────────────────────────────────────────────────
export function TaskPageRoot({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-[#080d17] relative">

      <div className="absolute inset-0 pointer-events-none dark:hidden" style={{
        backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(6,182,212,0.05) 0%, transparent 55%)',
      }} />
      <div className="absolute inset-0 pointer-events-none hidden dark:block overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-cyan-500/6 blur-[90px]" />
        <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-blue-600/5 blur-[80px]" />
      </div>

      <div className="relative flex items-center justify-between px-6 sm:px-10 xl:px-14 py-4 xl:py-5 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 xl:h-9 xl:w-9 rounded-xl bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/25">
            <img src={logoIcon} alt="MedFlow" className="h-5 w-5 object-contain brightness-0 invert" />
          </div>
          <span className="text-[15px] xl:text-[16px] font-bold tracking-tight text-slate-800 dark:text-white">MedFlow</span>
        </div>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
      </div>

      <div className="relative flex-1 overflow-y-auto min-h-0">
        <div className="flex min-h-full items-center justify-center px-4 sm:px-6 py-6 xl:py-8">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.36, ease: 'easeOut' }}
            className="w-full max-w-125 xl:max-w-135 2xl:max-w-150"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ─── Task card ────────────────────────────────────────────────────────────────
export function TaskCard({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(
      'rounded-2xl xl:rounded-3xl',
      'px-7 sm:px-10 xl:px-11 2xl:px-12 py-8 sm:py-10 xl:py-11 2xl:py-12',
      'bg-white border border-slate-100 shadow-lg shadow-slate-200/50',
      'dark:bg-[#0f1623] dark:border-white/6 dark:shadow-xl dark:shadow-black/30',
    )}>
      {children}
    </div>
  );
}
