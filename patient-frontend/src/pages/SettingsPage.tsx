import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Settings } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '../utils/cn';
import { authService } from '../services/auth.service';
import { extractErrorMessage, sanitizeApiMessage } from '../utils/errorHandler';

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
        <PasswordSection />
      </div>
    </div>
  );
}
