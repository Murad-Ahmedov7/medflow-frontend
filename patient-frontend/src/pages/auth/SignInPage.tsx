import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useSignIn } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';
import { AuthPageRoot, AuthCard, AuthBrandBadge, ContinueAsGuest } from './AuthShared';

type FormData = { email: string; password: string };

export function SignInPage() {
  const { t } = useTranslation();
  const [showPw, setShowPw] = useState(false);
  const { mutate: signIn, isPending } = useSignIn();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ mode: 'onChange' });

  return (
    <AuthPageRoot leftTitleKey="auth.panelWelcomeBack" leftHeadingKey="auth.panelSignInHeading">
      <AuthCard>
        <AuthBrandBadge />

        <h1 className="text-[1.55rem] sm:text-[1.75rem] xl:text-[1.95rem] font-bold text-slate-900 dark:text-white leading-tight tracking-tight mb-6 sm:mb-7 xl:mb-7">
          {t('auth.signIn')}
        </h1>

        <form onSubmit={handleSubmit((d) => signIn(d))} className="space-y-4 sm:space-y-4.5 xl:space-y-5">
          <Input
            id="email" type="email" label={t('auth.email')}
            placeholder={t('auth.emailPlaceholder')} leftIcon={<Mail size={16} />}
            error={errors.email?.message} autoComplete="email"
            {...register('email', {
              required: t('auth.validation.emailRequired'),
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: t('auth.validation.emailInvalid') },
            })}
          />

          <div>
            <Input
              id="password" type={showPw ? 'text' : 'password'} label={t('auth.password')}
              placeholder={t('auth.passwordPlaceholder')} leftIcon={<Lock size={16} />}
              rightIcon={
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              error={errors.password?.message} autoComplete="current-password"
              {...register('password', {
                required: t('auth.validation.passwordRequired'),
                minLength: { value: 8, message: t('auth.validation.passwordMin') },
              })}
            />
            <div className="flex justify-end mt-1.5">
              <Link
                to="/forgot-password"
                className="text-[12px] text-slate-400 hover:text-cyan-600 dark:text-slate-500 dark:hover:text-cyan-400 transition-colors duration-150"
              >
                {t('auth.forgotPassword')}
              </Link>
            </div>
          </div>

          <div className="pt-1">
            <Button type="submit" size="lg" className="w-full" isLoading={isPending}>
              <span>{t('auth.signIn')}</span>
              {!isPending && <ArrowRight size={16} />}
            </Button>
          </div>
        </form>

        <div className="mt-5 sm:mt-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
          <span className="text-[11.5px] text-slate-400 dark:text-slate-600 shrink-0">
            {t('auth.dontHaveAccount')}
          </span>
          <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
        </div>

        <div className="mt-3 sm:mt-3.5">
          <Link
            to="/sign-up"
            className={cn(
              'flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-[13px] sm:text-[13.5px] font-semibold',
              'border border-slate-200 dark:border-slate-700/80',
              'text-slate-700 dark:text-slate-300',
              'hover:bg-slate-50 dark:hover:bg-slate-800/50',
              'hover:border-cyan-400/70 dark:hover:border-cyan-600/60',
              'hover:text-cyan-600 dark:hover:text-cyan-400',
              'transition-all duration-200',
            )}
          >
            {t('auth.signUp')}
            <ArrowRight size={14} />
          </Link>
        </div>

        <ContinueAsGuest />
      </AuthCard>
    </AuthPageRoot>
  );
}
