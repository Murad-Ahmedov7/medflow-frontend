import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Eye, EyeOff, User, Phone, ArrowRight } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { PasswordStrengthBar } from '../../components/ui/PasswordStrengthBar';
import { useSignUp } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';
import { AuthPageRoot, AuthCard, AuthBrandBadge, ContinueAsGuest } from './AuthShared';

type FormData = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

export function SignUpPage() {
  const { t } = useTranslation();
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { mutate: signUp, isPending } = useSignUp();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({ mode: 'onChange' });

  return (
    <AuthPageRoot leftTitleKey="auth.panelJoin" leftHeadingKey="auth.panelSignUpHeading">
      <AuthCard>
        <AuthBrandBadge />

        <h1 className="text-[1.55rem] sm:text-[1.75rem] xl:text-[1.95rem] font-bold text-slate-900 dark:text-white leading-tight tracking-tight mb-5 sm:mb-6 xl:mb-6">
          {t('auth.signUp')}
        </h1>

        <form onSubmit={handleSubmit((d) => signUp(d))} className="space-y-3.5 sm:space-y-4 xl:space-y-4">
          <Input
            id="fullName" type="text" label={t('auth.fullName')}
            placeholder={t('auth.fullNamePlaceholder')} leftIcon={<User size={16} />}
            error={errors.fullName?.message} autoComplete="name"
            {...register('fullName', {
              required: t('auth.validation.fullNameRequired'),
              minLength: { value: 2, message: t('auth.validation.fullNameMin') },
            })}
          />
          <Input
            id="email" type="email" label={t('auth.email')}
            placeholder={t('auth.emailPlaceholder')} leftIcon={<Mail size={16} />}
            error={errors.email?.message} autoComplete="email"
            {...register('email', {
              required: t('auth.validation.emailRequired'),
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: t('auth.validation.emailInvalid') },
            })}
          />
          <Input
            id="phone" type="tel" label={t('auth.phone')}
            placeholder={t('auth.phonePlaceholder')} leftIcon={<Phone size={16} />}
            error={errors.phone?.message} autoComplete="tel"
            {...register('phone', {
              required: t('auth.validation.phoneRequired'),
              minLength: { value: 7, message: t('auth.validation.phoneMin') },
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
              error={errors.password?.message} autoComplete="new-password"
              {...register('password', {
                required: t('auth.validation.passwordRequired'),
                minLength: { value: 8, message: t('auth.validation.passwordMin') },
              })}
            />
            <PasswordStrengthBar password={watch('password') ?? ''} />
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
              validate: (v) => v === watch('password') || t('auth.validation.confirmPasswordMismatch'),
            })}
          />
          <div className="pt-1">
            <Button type="submit" size="lg" className="w-full" isLoading={isPending}>
              <span>{t('auth.signUp')}</span>
              {!isPending && <ArrowRight size={16} />}
            </Button>
          </div>
        </form>

        <div className="mt-5 sm:mt-5 flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
          <span className="text-[11.5px] text-slate-400 dark:text-slate-600 shrink-0">
            {t('auth.alreadyHaveAccount')}
          </span>
          <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
        </div>

        <div className="mt-3">
          <Link
            to="/sign-in"
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
            {t('auth.signIn')}
            <ArrowRight size={14} />
          </Link>
        </div>

        <ContinueAsGuest />
      </AuthCard>
    </AuthPageRoot>
  );
}
