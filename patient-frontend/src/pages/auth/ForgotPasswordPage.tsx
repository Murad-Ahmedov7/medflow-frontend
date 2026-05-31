import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Mail, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { cn } from '../../utils/cn';
import { useForgotPassword } from '../../hooks/useAuth';
import { TaskPageRoot, TaskCard, AuthBrandBadge } from './AuthShared';

type FormData = { email: string };

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const { mutate: forgotPassword, isPending } = useForgotPassword();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ mode: 'onChange' });

  function onSubmit(data: FormData) {
    forgotPassword(data, {
      onSuccess: () => {
        setSubmittedEmail(data.email);
        setSubmitted(true);
      },
    });
  }

  return (
    <TaskPageRoot>
      <TaskCard>
        <AuthBrandBadge />

        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <h1 className="text-[1.75rem] sm:text-[2rem] xl:text-[2.25rem] font-bold text-slate-900 dark:text-white leading-tight tracking-tight mb-2">
                {t('auth.forgotPasswordTitle')}
              </h1>
              <p className="text-[14px] xl:text-[15px] text-slate-500 dark:text-slate-400 mb-8 xl:mb-10 leading-relaxed">
                {t('auth.forgotPasswordDesc')}
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 xl:space-y-6">
                <Input
                  id="email" type="email" label={t('auth.email')}
                  placeholder={t('auth.emailPlaceholder')} leftIcon={<Mail size={16} />}
                  error={errors.email?.message} autoComplete="email"
                  {...register('email', {
                    required: t('auth.validation.emailRequired'),
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: t('auth.validation.emailInvalid') },
                  })}
                />
                <div className="pt-1">
                  <Button type="submit" size="lg" className="w-full" isLoading={isPending}>
                    <span>{t('auth.forgotPasswordSubmit')}</span>
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
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              {/* Success icon */}
              <div className="flex justify-center mb-7">
                <div className="h-20 w-20 rounded-3xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-100 dark:ring-emerald-500/20">
                  <CheckCircle2 size={38} className="text-emerald-500 dark:text-emerald-400" strokeWidth={1.75} />
                </div>
              </div>

              <h1 className="text-[1.75rem] sm:text-[2rem] xl:text-[2.25rem] font-bold text-slate-900 dark:text-white leading-tight tracking-tight mb-3 text-center">
                {t('auth.forgotPasswordSentTitle')}
              </h1>
              <p className="text-[14px] xl:text-[15px] text-slate-500 dark:text-slate-400 leading-relaxed mb-1.5 text-center">
                {t('auth.forgotPasswordSentDesc')}
              </p>
              <p className="text-[14px] font-semibold text-slate-700 dark:text-slate-300 mb-9 text-center break-all">
                {submittedEmail}
              </p>

              <Link
                to="/sign-in"
                className={cn(
                  'flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl text-[14px] font-semibold',
                  'border border-slate-200 dark:border-slate-700/80',
                  'text-slate-700 dark:text-slate-300',
                  'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                  'hover:border-cyan-400/70 dark:hover:border-cyan-600/60',
                  'hover:text-cyan-600 dark:hover:text-cyan-400',
                  'transition-all duration-200',
                )}
              >
                <ArrowLeft size={15} />
                {t('auth.forgotPasswordBack')}
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </TaskCard>
    </TaskPageRoot>
  );
}
