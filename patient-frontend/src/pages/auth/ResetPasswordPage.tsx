import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Lock, Eye, EyeOff, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { PasswordStrengthBar } from '../../components/ui/PasswordStrengthBar';
import { useResetPassword } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';
import { TaskPageRoot, TaskCard, AuthBrandBadge } from './AuthShared';

type FormData = { newPassword: string; confirmPassword: string };

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { mutate: resetPassword, isPending } = useResetPassword();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({ mode: 'onChange' });

  function onSubmit(data: FormData) {
    resetPassword({ token, newPassword: data.newPassword, confirmPassword: data.confirmPassword });
  }

  // Missing or empty token — show invalid link state
  if (!token) {
    return (
      <TaskPageRoot>
        <TaskCard>
          <AuthBrandBadge />
          <div className="flex flex-col items-center text-center gap-5 py-2">
            <div className="h-20 w-20 rounded-3xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center ring-1 ring-red-100 dark:ring-red-500/20">
              <AlertCircle size={36} className="text-red-500 dark:text-red-400" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-[1.5rem] font-bold text-slate-900 dark:text-white mb-2">
                {t('auth.invalidResetLinkTitle')}
              </h1>
              <p className="text-[14px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {t('auth.resetPasswordInvalidToken')}
              </p>
            </div>
            <Link
              to="/forgot-password"
              className={cn(
                'mt-1 inline-flex items-center gap-2 py-2.5 px-6 rounded-xl text-[13.5px] font-semibold',
                'border border-slate-200 dark:border-slate-700/80',
                'text-slate-700 dark:text-slate-300',
                'hover:border-cyan-400/70 hover:text-cyan-600',
                'dark:hover:border-cyan-600/60 dark:hover:text-cyan-400',
                'transition-all duration-200',
              )}
            >
              <ArrowLeft size={15} />
              {t('auth.forgotPasswordBack')}
            </Link>
          </div>
        </TaskCard>
      </TaskPageRoot>
    );
  }

  return (
    <TaskPageRoot>
      <TaskCard>
        <AuthBrandBadge />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <h1 className="text-[1.75rem] sm:text-[2rem] xl:text-[2.25rem] font-bold text-slate-900 dark:text-white leading-tight tracking-tight mb-2">
            {t('auth.resetPasswordTitle')}
          </h1>
          <p className="text-[14px] xl:text-[15px] text-slate-500 dark:text-slate-400 mb-8 xl:mb-10 leading-relaxed">
            {t('auth.resetPasswordDesc')}
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 xl:space-y-6">
            <div>
              <Input
                id="newPassword" type={showPw ? 'text' : 'password'} label={t('auth.password')}
                placeholder={t('auth.passwordPlaceholder')} leftIcon={<Lock size={16} />}
                rightIcon={
                  <button type="button" onClick={() => setShowPw((v) => !v)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                error={errors.newPassword?.message} autoComplete="new-password"
                {...register('newPassword', {
                  required: t('auth.validation.passwordRequired'),
                  minLength: { value: 8, message: t('auth.validation.passwordMin') },
                })}
              />
              <PasswordStrengthBar password={watch('newPassword') ?? ''} />
            </div>

            <Input
              id="confirmPassword" type={showConfirm ? 'text' : 'password'} label={t('auth.confirmPassword')}
              placeholder={t('auth.confirmPasswordPlaceholder')} leftIcon={<Lock size={16} />}
              rightIcon={
                <button type="button" onClick={() => setShowConfirm((v) => !v)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              error={errors.confirmPassword?.message} autoComplete="new-password"
              {...register('confirmPassword', {
                required: t('auth.validation.confirmPasswordRequired'),
                validate: (v) => v === watch('newPassword') || t('auth.validation.confirmPasswordMismatch'),
              })}
            />

            <div className="pt-1">
              <Button type="submit" size="lg" className="w-full" isLoading={isPending}>
                <span>{t('auth.resetPasswordSubmit')}</span>
                {!isPending && <ArrowRight size={16} />}
              </Button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            <Link
              to="/sign-in"
              className={cn(
                'inline-flex items-center gap-2 text-[13.5px] font-medium',
                'text-slate-400 hover:text-cyan-600',
                'dark:text-slate-500 dark:hover:text-cyan-400',
                'transition-colors duration-150',
              )}
            >
              <ArrowLeft size={15} />
              {t('auth.forgotPasswordBack')}
            </Link>
          </div>
        </motion.div>
      </TaskCard>
    </TaskPageRoot>
  );
}
