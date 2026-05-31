import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  User, Mail, Phone, CalendarDays, Droplets, MapPin,
  HeartPulse, AlertCircle, ShieldCheck, CheckCircle2, Lock, Camera, Loader2,
} from 'lucide-react';
import { useMyPatientProfile, useUpdateMyPatientProfile, useUploadProfilePhoto } from '../hooks/usePatientProfile';
import { useAuthStore } from '../store/authStore';
import { API_BASE_URL } from '../api/config';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { cn } from '../utils/cn';
import type { UpdateMyPatientProfileRequest, BloodGroup, Gender } from '../types/patient.types';
import { BLOOD_GROUP_LABELS } from '../types/patient.types';

const GENDERS: Gender[] = ['Male', 'Female'];
const BLOOD_GROUPS = Object.keys(BLOOD_GROUP_LABELS) as BloodGroup[];

// ─── Profile completion banner ────────────────────────────────────────────────
function CompletionBanner({
  percentage,
  isComplete,
  missingFields,
}: {
  percentage: number;
  isComplete: boolean;
  missingFields: string[];
}) {
  const { t } = useTranslation();
  return (
    <div className={cn(
      'rounded-2xl border p-5 xl:p-6',
      isComplete
        ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800/30'
        : 'bg-amber-50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-800/30',
    )}>
      <div className="flex items-start gap-3">
        {isComplete
          ? <CheckCircle2 size={20} className="text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
          : <AlertCircle  size={20} className="text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
        }
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-semibold leading-tight',
            isComplete ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300',
          )}>
            {isComplete ? t('profile.completionDone') : t('profile.completionNotice')}
          </p>
          {!isComplete && (
            <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-1">
              {t('profile.completionHint')}
            </p>
          )}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t('profile.completionLabel')}
              </span>
              <span className={cn('text-xs font-bold tabular-nums',
                isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
              )}>
                {percentage}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={cn('h-full rounded-full', isComplete ? 'bg-emerald-500' : 'bg-amber-500')}
              />
            </div>
          </div>
          {!isComplete && missingFields.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {missingFields.map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-100 dark:bg-amber-900/25 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40"
                >
                  {t(`profile.field.${f.charAt(0).toLowerCase() + f.slice(1)}`)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Read-only field ──────────────────────────────────────────────────────────
function ReadOnlyField({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</label>
      <div className={cn(
        'flex items-center gap-3 h-11 px-3 rounded-xl',
        'border border-slate-200 dark:border-slate-700/60',
        'bg-slate-50 dark:bg-slate-800/40',
        'text-sm text-slate-500 dark:text-slate-400',
      )}>
        <span className="text-slate-300 dark:text-slate-600 shrink-0">{icon}</span>
        <span className="flex-1 truncate">{value}</span>
        <Lock size={13} className="text-slate-300 dark:text-slate-600 shrink-0" />
      </div>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────
function SectionCard({ title, icon, children }: {
  title: string; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <div className="flex items-center gap-2.5 px-5 xl:px-6 py-4 border-b border-slate-100 dark:border-slate-800">
        <span className="text-cyan-600 dark:text-cyan-400">{icon}</span>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</h2>
      </div>
      <div className="p-5 xl:p-6">{children}</div>
    </div>
  );
}

// ─── ProfilePage ──────────────────────────────────────────────────────────────
export function ProfilePage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { data: profile, isLoading } = useMyPatientProfile();
  const { mutate: saveProfile, isPending } = useUpdateMyPatientProfile();
  const { mutate: uploadPhoto, isPending: isUploading } = useUploadProfilePhoto();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<UpdateMyPatientProfileRequest>({
    mode: 'onChange',
    defaultValues: { bloodGroup: 'Unknown', gender: undefined },
  });

  useEffect(() => {
    if (profile) {
      reset({
        fin:        profile.fin      ?? '',
        address:    profile.address  ?? '',
        birthDate:  profile.birthDate ? profile.birthDate.split('T')[0] : '',
        gender:     profile.gender   ?? undefined,
        bloodGroup: profile.bloodGroup,
        allergies:  profile.allergies ?? '',
      });
    }
  }, [profile, reset]);

  function onSubmit(data: UpdateMyPatientProfileRequest) {
    saveProfile({
      fin:        data.fin        || undefined,
      address:    data.address    || undefined,
      birthDate:  data.birthDate  || undefined,
      gender:     data.gender     || undefined,
      bloodGroup: data.bloodGroup,
      allergies:  data.allergies  || undefined,
    });
  }

  const initials = (profile?.fullName ?? user?.fullName ?? '?')
    .split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  const avatarUrl = profile?.profileImageUrl
    ? `${API_BASE_URL}${profile.profileImageUrl}`
    : null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type) || file.size > 5 * 1024 * 1024) {
      alert(t('profile.uploadPhotoError'));
      return;
    }
    uploadPhoto(file);
    // Reset so the same file can be re-selected if needed
    e.target.value = '';
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="space-y-6"
      >

        {/* ── Page header ── */}
        <div className="flex items-center gap-4">
          {/* Clickable avatar / photo uploader */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title={t('profile.uploadPhoto')}
            className="relative h-16 w-16 rounded-2xl shrink-0 group focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={profile?.fullName}
                className="h-full w-full rounded-2xl object-cover shadow-md"
              />
            ) : (
              <div className="h-full w-full rounded-2xl bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-md shadow-cyan-500/25">
                {initials}
              </div>
            )}
            {/* Overlay */}
            <div className={cn(
              'absolute inset-0 rounded-2xl flex items-center justify-center transition-all duration-150',
              isUploading
                ? 'bg-black/40'
                : 'bg-black/0 group-hover:bg-black/40',
            )}>
              {isUploading
                ? <Loader2 size={20} className="text-white animate-spin" />
                : <Camera size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
              }
            </div>
          </button>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
              {profile?.fullName ?? user?.fullName}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {profile?.email ?? user?.email}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              {t('profile.uploadPhotoHint')}
            </p>
          </div>
        </div>

        {/* ── Completion banner ── */}
        {profile && (
          <CompletionBanner
            percentage={profile.profileCompletionPercentage}
            isComplete={profile.isProfileComplete}
            missingFields={profile.missingFields}
          />
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* ── Account information (read-only) ── */}
          <SectionCard title={t('profile.sectionAccount')} icon={<User size={16} />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ReadOnlyField label={t('profile.firstName')} value={profile?.firstName ?? '—'} icon={<User size={15} />} />
              <ReadOnlyField label={t('profile.lastName')}  value={profile?.lastName  ?? '—'} icon={<User size={15} />} />
              <ReadOnlyField label={t('auth.email')} value={profile?.email ?? user?.email ?? '—'} icon={<Mail size={15} />} />
              <ReadOnlyField label={t('auth.phone')} value={profile?.phone ?? user?.phone ?? '—'} icon={<Phone size={15} />} />
            </div>
            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <ShieldCheck size={12} />
              {t('profile.accountReadOnlyNote')}
            </p>
          </SectionCard>

          {/* ── Medical profile ── */}
          <SectionCard title={t('profile.sectionMedical')} icon={<HeartPulse size={16} />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* FIN */}
              <Input
                id="fin"
                label={t('profile.fin')}
                placeholder={t('profile.finPlaceholder')}
                leftIcon={<ShieldCheck size={16} />}
                error={errors.fin?.message}
                {...register('fin', {
                  pattern: {
                    value: /^[A-Za-z0-9]{7,10}$/,
                    message: t('profile.validation.finFormat'),
                  },
                })}
              />

              {/* Birth date */}
              <Input
                id="birthDate"
                type="date"
                label={t('profile.birthDate')}
                leftIcon={<CalendarDays size={16} />}
                error={errors.birthDate?.message}
                {...register('birthDate', {
                  validate: (v) => {
                    if (!v) return true; // optional field
                    return new Date(v) < new Date() || t('profile.validation.birthDatePast');
                  },
                })}
              />

              {/* Gender — toggle buttons, value managed via setValue + watch */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('profile.gender')}
                </label>
                {/* Hidden registered input so RHF tracks gender value */}
                <input type="hidden" {...register('gender')} />
                <div className="flex gap-2">
                  {GENDERS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() =>
                        setValue('gender', watch('gender') === g ? undefined : g, { shouldDirty: true, shouldValidate: true })
                      }
                      className={cn(
                        'flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all duration-150',
                        watch('gender') === g
                          ? 'bg-cyan-600 border-cyan-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-cyan-400 dark:hover:border-cyan-600',
                      )}
                    >
                      {t(`profile.gender${g}`)}
                    </button>
                  ))}
                </div>
                {errors.gender && (
                  <p className="text-xs text-red-500 mt-0.5">{errors.gender.message}</p>
                )}
              </div>

              {/* Blood group */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="bloodGroup" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('profile.bloodGroup')}
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Droplets size={16} />
                  </div>
                  <select
                    id="bloodGroup"
                    {...register('bloodGroup', {
                      validate: (v) =>
                        (v && v !== 'Unknown') || t('profile.validation.bloodGroupRequired'),
                    })}
                    className={cn(
                      'w-full h-11 rounded-xl border bg-white pl-10 pr-4 text-sm text-slate-800 shadow-sm appearance-none',
                      'focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-400 transition-all duration-200',
                      'dark:bg-slate-800 dark:text-slate-100',
                      errors.bloodGroup
                        ? 'border-red-400 focus:ring-red-400/40'
                        : 'border-slate-200 dark:border-slate-700',
                    )}
                  >
                    <option value="Unknown">{t('profile.bloodGroupSelect')}</option>
                    {BLOOD_GROUPS.filter((bg) => bg !== 'Unknown').map((bg) => (
                      <option key={bg} value={bg}>{BLOOD_GROUP_LABELS[bg]}</option>
                    ))}
                  </select>
                </div>
                {errors.bloodGroup && (
                  <p className="text-xs text-red-500 mt-0.5">{errors.bloodGroup.message}</p>
                )}
              </div>
            </div>
          </SectionCard>

          {/* ── Contact & additional ── */}
          <SectionCard title={t('profile.sectionContact')} icon={<MapPin size={16} />}>
            <div className="space-y-4">
              <Input
                id="address"
                label={t('profile.address')}
                placeholder={t('profile.addressPlaceholder')}
                leftIcon={<MapPin size={16} />}
                error={errors.address?.message}
                {...register('address', {
                  maxLength: { value: 200, message: t('profile.validation.addressMax') },
                })}
              />

              {/* Allergies textarea */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="allergies" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('profile.allergies')}
                </label>
                <textarea
                  id="allergies"
                  rows={3}
                  placeholder={t('profile.allergiesPlaceholder')}
                  className={cn(
                    'w-full rounded-xl border px-4 py-2.5 text-sm placeholder-slate-400 shadow-sm resize-none bg-white text-slate-800',
                    'focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-400 transition-all duration-200',
                    'dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500',
                    errors.allergies
                      ? 'border-red-400 focus:ring-red-400/40'
                      : 'border-slate-200 dark:border-slate-700',
                  )}
                  {...register('allergies', {
                    maxLength: { value: 500, message: t('profile.validation.allergiesMax') },
                  })}
                />
                {errors.allergies && (
                  <p className="text-xs text-red-500 mt-0.5">{errors.allergies.message}</p>
                )}
              </div>
            </div>
          </SectionCard>

          {/* ── Save ── */}
          <div className="flex justify-end pb-6">
            <Button
              type="submit"
              isLoading={isPending}
              disabled={!isDirty}
              className="min-w-36"
            >
              {isPending ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </form>

      </motion.div>
    </div>
  );
}
