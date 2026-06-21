import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Sun, Moon, Globe, Lock, Eye, EyeOff, Settings } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '../utils/cn';
import { useTheme } from '../hooks/useTheme';
import { authService } from '../services/auth.service';
import { extractErrorMessage, sanitizeApiMessage } from '../utils/errorHandler';

// ── Helpers ────────────────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: 'en', label: 'English',    flag: '🇬🇧' },
  { code: 'az', label: 'Azərbaycan', flag: '🇦🇿' },
  { code: 'ru', label: 'Русский',    flag: '🇷🇺' },
] as const;

// ── Password form schema ───────────────────────────────────────────────────────

function usePasswordSchema() {
  const { t } = useTranslation();
  return z.object({
    currentPassword: z.string().min(1, t('settings.validation.currentRequired')),
    newPassword:     z.string()
                       .min(1, t('settings.validation.newRequired'))
                       .min(8, t('settings.validation.newMin')),
    confirmPassword: z.string().min(1, t('settings.validation.confirmRequired')),
  }).refine(d => d.newPassword === d.confirmPassword, {
    message: t('settings.validation.confirmMismatch'),
    path: ['confirmPassword'],
  });
}

type PasswordFormData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  children,
  delay = 0,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay, ease: 'easeOut' }}
      className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 shadow-sm overflow-hidden"
    >
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
          {icon}
        </div>
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </motion.div>
  );
}

// ── Password input with visibility toggle ─────────────────────────────────────

function PasswordInput({
  id,
  placeholder,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; error?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-xl border bg-white dark:bg-slate-900 px-4 py-2.5 text-sm pr-10 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500',
            error
              ? 'border-rose-300 dark:border-rose-700'
              : 'border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100',
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          tabIndex={-1}
        >
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-rose-500 dark:text-rose-400">{error}</p>}
    </div>
  );
}

// ── Appearance section ─────────────────────────────────────────────────────────

function AppearanceSection() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  const options = [
    { value: 'light' as const, label: t('settings.themeLight'), icon: <Sun size={16} /> },
    { value: 'dark'  as const, label: t('settings.themeDark'),  icon: <Moon size={16} /> },
  ];

  return (
    <Section icon={<Sun size={14} />} title={t('settings.sectionAppearance')} delay={0.06}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.theme')}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {theme === 'light' ? t('settings.themeLight') : t('settings.themeDark')}
          </p>
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                theme === opt.value
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
              )}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ── Language section ───────────────────────────────────────────────────────────

function LanguageSection() {
  const { t, i18n } = useTranslation();

  return (
    <Section icon={<Globe size={14} />} title={t('settings.sectionLanguage')} delay={0.12}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.language')}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {LANGUAGES.find(l => l.code === i18n.language)?.label ?? 'English'}
          </p>
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => i18n.changeLanguage(lang.code)}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                i18n.language === lang.code
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
              )}
            >
              <span className="text-[13px] leading-none">{lang.flag}</span>
              <span className="hidden sm:inline">{lang.label}</span>
            </button>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ── Password section ───────────────────────────────────────────────────────────

function PasswordSection() {
  const { t } = useTranslation();
  const schema = usePasswordSchema();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormData>({ resolver: zodResolver(schema) });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: PasswordFormData) => authService.changePassword(data),
    onSuccess: (result) => {
      if (!result.isSuccess) {
        toast.error(result.errors?.[0] ? sanitizeApiMessage(result.errors[0]) : t('settings.passwordError'));
        return;
      }
      toast.success(t('settings.passwordChanged'));
      reset();
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err));
    },
  });

  return (
    <Section icon={<Lock size={14} />} title={t('settings.sectionPassword')} delay={0.18}>
      <form onSubmit={handleSubmit(d => mutate(d))} className="space-y-4">
        <div>
          <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
            {t('settings.currentPassword')}
          </label>
          <PasswordInput
            id="currentPassword"
            placeholder={t('settings.currentPasswordPlaceholder')}
            error={errors.currentPassword?.message}
            {...register('currentPassword')}
          />
        </div>
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
            {t('settings.newPassword')}
          </label>
          <PasswordInput
            id="newPassword"
            placeholder={t('settings.newPasswordPlaceholder')}
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
            {t('settings.confirmPassword')}
          </label>
          <PasswordInput
            id="confirmPassword"
            placeholder={t('settings.confirmPasswordPlaceholder')}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
        </div>
        <div className="pt-1 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
          >
            {isPending ? t('settings.savingPassword') : t('settings.savePassword')}
          </button>
        </div>
      </form>
    </Section>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* Page header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 pt-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800">
                <Settings size={18} className="text-slate-600 dark:text-slate-300" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('settings.pageTitle')}</h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 ml-12">{t('settings.pageSubtitle')}</p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        <AppearanceSection />
        <LanguageSection />
        <PasswordSection />
      </div>
    </div>
  );
}
