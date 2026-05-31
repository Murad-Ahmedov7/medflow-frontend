import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from '../../layouts/AuthLayout';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useSignIn } from '../../hooks/useAuth';

type SignInForm = {
  email: string;
  password: string;
};

export function SignInPage() {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const { mutate: signIn, isPending } = useSignIn();
  const { register, handleSubmit, formState: { errors } } = useForm<SignInForm>({ mode: 'onChange' });

  return (
    <AuthLayout title={t('auth.adminPortal')} subtitle={t('auth.welcomeBack')}>
      <form onSubmit={handleSubmit((data) => signIn(data))} className="space-y-5">
        <Input
          id="email"
          type="email"
          label={t('auth.email')}
          placeholder={t('auth.emailPlaceholder')}
          leftIcon={<Mail size={16} />}
          error={errors.email?.message}
          autoComplete="email"
          {...register('email', {
            required: t('auth.validation.emailRequired'),
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: t('auth.validation.emailInvalid') },
          })}
        />
        <Input
          id="password"
          type={showPassword ? 'text' : 'password'}
          label={t('auth.password')}
          placeholder={t('auth.passwordPlaceholder')}
          leftIcon={<Lock size={16} />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
          error={errors.password?.message}
          autoComplete="current-password"
          {...register('password', {
            required: t('auth.validation.passwordRequired'),
            minLength: { value: 8, message: t('auth.validation.passwordMin') },
          })}
        />
        <Button type="submit" size="lg" className="w-full mt-2" isLoading={isPending}>
          {isPending ? t('auth.signingIn') : t('auth.signIn')}
        </Button>
      </form>
    </AuthLayout>
  );
}
