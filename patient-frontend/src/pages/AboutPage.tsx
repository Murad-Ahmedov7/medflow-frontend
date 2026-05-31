import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Heart, Award, Lightbulb,
  Users, Building2, Stethoscope, CalendarCheck, Quote,
} from 'lucide-react';
import { cn } from '../utils/cn';

// ── Static demo data — all labels come from i18n ──────────────────────────────

const STATS_HERO = [
  { value: '10k+', labelKey: 'about.statPatients', icon: Users },
  { value: '50+',  labelKey: 'about.statDoctors',  icon: Stethoscope },
  { value: '15',   labelKey: 'about.statDepts',    icon: Building2 },
  { value: '8',    labelKey: 'about.statYears',    icon: CalendarCheck },
];

const VALUES = [
  { icon: Heart,      titleKey: 'about.value1Title', descKey: 'about.value1Desc', color: 'text-rose-500 dark:text-rose-400',     bg: 'bg-rose-50 dark:bg-rose-900/20' },
  { icon: Award,      titleKey: 'about.value2Title', descKey: 'about.value2Desc', color: 'text-cyan-600 dark:text-cyan-400',     bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
  { icon: Lightbulb,  titleKey: 'about.value3Title', descKey: 'about.value3Desc', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20' },
];

const STATS_BANNER = [
  { value: '10,000+', labelKey: 'about.statPatients' },
  { value: '50+',     labelKey: 'about.statDoctors' },
  { value: '15',      labelKey: 'about.statDepts' },
  { value: '8',       labelKey: 'about.statYears' },
];

const DOCTORS = [
  {
    photo:       'https://randomuser.me/api/portraits/women/44.jpg',
    nameKey:     'about.doctor1Name',
    specialtyKey:'about.doctor1Specialty',
    bioKey:      'about.doctor1Bio',
    ring:        'ring-cyan-400/50',
  },
  {
    photo:       'https://randomuser.me/api/portraits/men/32.jpg',
    nameKey:     'about.doctor2Name',
    specialtyKey:'about.doctor2Specialty',
    bioKey:      'about.doctor2Bio',
    ring:        'ring-violet-400/50',
  },
  {
    photo:       'https://randomuser.me/api/portraits/women/68.jpg',
    nameKey:     'about.doctor3Name',
    specialtyKey:'about.doctor3Specialty',
    bioKey:      'about.doctor3Bio',
    ring:        'ring-emerald-400/50',
  },
];

const TESTIMONIALS = [
  {
    photo:      'https://randomuser.me/api/portraits/women/22.jpg',
    quoteKey:  'about.testimonial1Quote',
    authorKey: 'about.testimonial1Author',
    roleKey:   'about.testimonial1Role',
  },
  {
    photo:      'https://randomuser.me/api/portraits/men/41.jpg',
    quoteKey:  'about.testimonial2Quote',
    authorKey: 'about.testimonial2Author',
    roleKey:   'about.testimonial2Role',
  },
  {
    photo:      'https://randomuser.me/api/portraits/women/55.jpg',
    quoteKey:  'about.testimonial3Quote',
    authorKey: 'about.testimonial3Author',
    roleKey:   'about.testimonial3Role',
  },
];

// ── Reusable animation variants ───────────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, delay, ease: 'easeOut' },
});

// ── Section label (small badge above titles) ──────────────────────────────────
function SectionBadge({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full
      bg-cyan-100 dark:bg-cyan-900/30
      border border-cyan-200/60 dark:border-cyan-800/50
      text-cyan-700 dark:text-cyan-400 text-sm font-medium mb-5">
      <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
      {label}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function AboutPage() {
  const { t } = useTranslation();

  return (
    <div className="overflow-x-hidden">

      {/* ── 1. Hero ───────────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-20 sm:pt-32 sm:pb-24
        bg-linear-to-br from-slate-50 via-cyan-50/30 to-blue-50/50
        dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 overflow-hidden">

        {/* Background blobs */}
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-cyan-400/10 dark:bg-cyan-500/6 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -left-24 h-80 w-80 rounded-full bg-blue-400/8 dark:bg-blue-500/5 blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...fadeUp(0)}>
            <SectionBadge label={t('about.heroBadge')} />
            <h1 className="text-4xl sm:text-5xl lg:text-[3.2rem] font-bold
              text-slate-900 dark:text-white
              leading-[1.12] tracking-tight mb-6">
              {t('about.heroTitle')}
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
              {t('about.heroSubtitle')}
            </p>
          </motion.div>

          {/* Hero stats */}
          <motion.div {...fadeUp(0.15)} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-16">
            {STATS_HERO.map(({ value, labelKey, icon: Icon }, i) => (
              <motion.div
                key={labelKey}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.07 }}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-2xl px-4 py-5 text-center',
                  'bg-white/70 dark:bg-slate-800/50',
                  'border border-slate-200/70 dark:border-slate-700/50',
                  'shadow-sm backdrop-blur-sm',
                )}
              >
                <Icon size={18} className="text-cyan-500 dark:text-cyan-400" />
                <span className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums leading-none">{value}</span>
                <span className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 leading-tight">{t(labelKey)}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── 2. Mission ────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-24 bg-white dark:bg-slate-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...fadeUp(0)}>
            <SectionBadge label={t('about.missionBadge')} />
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
              {t('about.missionTitle')}
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 leading-[1.8]">
              {t('about.missionBody')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── 3. Values ─────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-24 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp(0)} className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              {t('about.valuesTitle')}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              {t('about.valuesSubtitle')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {VALUES.map(({ icon: Icon, titleKey, descKey, color, bg }, i) => (
              <motion.div
                key={titleKey}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.1 }}
                className={cn(
                  'rounded-2xl border border-slate-100 dark:border-slate-800',
                  'bg-white dark:bg-slate-900 p-8 shadow-sm',
                )}
              >
                <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center mb-5', bg)}>
                  <Icon size={22} className={color} />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">
                  {t(titleKey)}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                  {t(descKey)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Stats banner ───────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 bg-slate-900 dark:bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp(0)} className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              {t('about.statsBannerTitle')}
            </h2>
            <p className="text-slate-400 text-sm">{t('about.statsBannerSubtitle')}</p>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
            {STATS_BANNER.map(({ value, labelKey }, i) => (
              <motion.div
                key={labelKey}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="text-center"
              >
                <p className="text-4xl sm:text-5xl font-bold text-white tabular-nums leading-none mb-2">{value}</p>
                <p className="text-slate-400 text-sm font-medium">{t(labelKey)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Team ───────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-24 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp(0)} className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              {t('about.teamTitle')}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              {t('about.teamSubtitle')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {DOCTORS.map(({ photo, nameKey, specialtyKey, bioKey, ring }, i) => (
              <motion.div
                key={nameKey}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.1 }}
                className={cn(
                  'rounded-2xl border border-slate-100 dark:border-slate-800',
                  'bg-slate-50 dark:bg-slate-800 p-6 text-center shadow-sm',
                )}
              >
                <img
                  src={photo}
                  alt={t(nameKey)}
                  className={cn('w-24 h-24 rounded-full object-cover mx-auto mb-4 ring-4', ring)}
                />
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                  {t(nameKey)}
                </h3>
                <p className="text-sm text-cyan-600 dark:text-cyan-400 font-medium mt-1 mb-3">
                  {t(specialtyKey)}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t(bioKey)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. Testimonials ───────────────────────────────────────────── */}
      <section className="py-20 sm:py-24 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp(0)} className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              {t('about.testimonialsTitle')}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              {t('about.testimonialsSubtitle')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {TESTIMONIALS.map(({ photo, quoteKey, authorKey, roleKey }, i) => (
              <motion.div
                key={quoteKey}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.1 }}
                className={cn(
                  'rounded-2xl border border-slate-100 dark:border-slate-800',
                  'bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col',
                )}
              >
                <Quote size={28} className="text-cyan-200 dark:text-cyan-800 mb-4 shrink-0" />
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed flex-1 italic">
                  {t(quoteKey)}
                </p>
                <div className="flex items-center gap-3 mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
                  <img
                    src={photo}
                    alt={t(authorKey)}
                    className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-slate-100 dark:ring-slate-700"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {t(authorKey)}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                      {t(roleKey)}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
