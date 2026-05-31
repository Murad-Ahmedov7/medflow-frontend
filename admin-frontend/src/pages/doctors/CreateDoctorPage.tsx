import { useState, useMemo, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  User, Mail, Phone, Lock, Eye, EyeOff, Stethoscope,
  Building2, BadgeCheck, DollarSign, Clock, ArrowLeft, UserPlus,
  Upload, X, ImageIcon,
} from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { PasswordStrengthBar } from '../../components/ui/PasswordStrengthBar';
import { useDepartments, useCreateDoctor, useUploadDoctorPhoto } from '../../hooks/useDoctors';
import { cn } from '../../utils/cn';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

type TFunction = (key: string) => string;

function makeSchema(t: TFunction) {
  return z.object({
    fullName: z.string().min(3, t('doctors.validation.fullNameMin')).max(50, t('doctors.validation.fullNameMax')),
    email: z.string().email(t('auth.validation.emailInvalid')),
    phone: z.string().min(9, t('doctors.validation.phoneInvalid')).max(20),
    password: z
      .string()
      .min(8, t('auth.validation.passwordMin'))
      .regex(/[A-Z]/, t('doctors.validation.passwordUpper'))
      .regex(/[a-z]/, t('doctors.validation.passwordLower'))
      .regex(/[0-9]/, t('doctors.validation.passwordDigit')),
    confirmPassword: z.string(),
    departmentId: z.string().uuid(t('doctors.validation.departmentRequired')),
    specialty: z.string().min(2, t('doctors.validation.specialtyMin')).max(100),
    about: z.string().max(1000).optional(),
    licenseNumber: z.string().max(50).optional(),
    yearsOfExperience: z.coerce.number().int().min(0).max(60),
    consultationFee: z.coerce.number().min(0).max(99999.99),
  }).refine((d) => d.password === d.confirmPassword, {
    message: t('doctors.validation.passwordsMismatch'),
    path: ['confirmPassword'],
  });
}

type FormData = z.infer<ReturnType<typeof makeSchema>>;

export function CreateDoctorPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const schema = useMemo(() => makeSchema(t), [i18n.language]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: departments = [], isLoading: loadingDepts } = useDepartments();
  const { mutateAsync: createDoctor, isPending } = useCreateDoctor();
  const { mutateAsync: uploadPhoto, isPending: isUploading } = useUploadDoctorPhoto();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { yearsOfExperience: 0, consultationFee: 0 },
  });

  const password = watch('password') ?? '';

  function validateAndSetFile(file: File): boolean {
    setPhotoError(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      setPhotoError(t('doctors.uploadInvalidType'));
      return false;
    }
    if (file.size > MAX_BYTES) {
      setPhotoError(t('doctors.uploadTooLarge'));
      return false;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    return true;
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
    e.target.value = '';
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetFile(file);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function removePhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoError(null);
  }

  async function onSubmit(data: FormData) {
    // Step 1: create the doctor record (no imageUrl sent)
    const result = await createDoctor({
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      password: data.password,
      confirmPassword: data.confirmPassword,
      departmentId: data.departmentId,
      specialty: data.specialty,
      about: data.about || undefined,
      licenseNumber: data.licenseNumber || undefined,
      yearsOfExperience: data.yearsOfExperience,
      consultationFee: data.consultationFee,
    }).catch(() => null);

    if (!result?.isSuccess || !result.data?.id) return;

    // Step 2: upload photo if one was selected (non-blocking on failure)
    if (photoFile) {
      await uploadPhoto({ id: result.data.id, file: photoFile }).catch(() => {});
    }

    toast.success(t('doctors.createSuccess'));
    navigate('/doctors');
  }

  const isSubmitting = isPending || isUploading;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          to="/doctors"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={16} />
          {t('common.back')}
        </Link>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-linear-to-br from-cyan-500 to-blue-600 shadow-sm">
            <UserPlus size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {t('doctors.createTitle')}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {t('doctors.createSubtitle')}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Section: Account */}
        <SectionCard title={t('doctors.sections.account')} icon={<User size={16} />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="fullName"
              label={t('auth.fullName')}
              placeholder="Dr. John Smith"
              leftIcon={<User size={16} />}
              error={errors.fullName?.message}
              {...register('fullName')}
            />
            <Input
              id="email"
              type="email"
              label={t('auth.email')}
              placeholder="doctor@medflow.com"
              leftIcon={<Mail size={16} />}
              error={errors.email?.message}
              autoComplete="off"
              {...register('email')}
            />
            <Input
              id="phone"
              type="tel"
              label={t('auth.phone')}
              placeholder="+994 50 000 00 00"
              leftIcon={<Phone size={16} />}
              error={errors.phone?.message}
              {...register('phone')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                label={t('auth.password')}
                placeholder={t('auth.passwordPlaceholder')}
                leftIcon={<Lock size={16} />}
                rightIcon={
                  <button type="button" onClick={() => setShowPassword((v) => !v)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                error={errors.password?.message}
                autoComplete="new-password"
                {...register('password')}
              />
              <PasswordStrengthBar password={password} />
            </div>
            <Input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              label={t('auth.confirmPassword')}
              placeholder={t('auth.confirmPasswordPlaceholder')}
              leftIcon={<Lock size={16} />}
              rightIcon={
                <button type="button" onClick={() => setShowConfirm((v) => !v)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              error={errors.confirmPassword?.message}
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
          </div>
        </SectionCard>

        {/* Section: Professional Info */}
        <SectionCard title={t('doctors.sections.professional')} icon={<Stethoscope size={16} />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Department */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="departmentId" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('doctors.department')}
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Building2 size={16} />
                </div>
                <select
                  id="departmentId"
                  disabled={loadingDepts}
                  className={cn(
                    'w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-800 shadow-sm transition-all duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-400',
                    'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100',
                    'disabled:opacity-60 disabled:cursor-not-allowed',
                    errors.departmentId && 'border-red-400 focus:ring-red-400/40',
                  )}
                  {...register('departmentId')}
                >
                  <option value="">{loadingDepts ? t('common.loading') : t('doctors.selectDepartment')}</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              {errors.departmentId && (
                <p className="text-xs text-red-500">{errors.departmentId.message}</p>
              )}
            </div>

            <Input
              id="specialty"
              label={t('doctors.specialty')}
              placeholder="e.g. Cardiology"
              leftIcon={<Stethoscope size={16} />}
              error={errors.specialty?.message}
              {...register('specialty')}
            />

            <Input
              id="licenseNumber"
              label={t('doctors.licenseNumber')}
              placeholder="e.g. MED-12345"
              leftIcon={<BadgeCheck size={16} />}
              error={errors.licenseNumber?.message}
              {...register('licenseNumber')}
            />

            {/* Profile Photo Upload */}
            <ImageUploader
              preview={photoPreview}
              error={photoError}
              isDragging={isDragging}
              onFileChange={handleFileChange}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onRemove={removePhoto}
              t={t}
            />

            <Input
              id="yearsOfExperience"
              type="number"
              min={0}
              max={60}
              label={t('doctors.yearsOfExperience')}
              placeholder="0"
              leftIcon={<Clock size={16} />}
              error={errors.yearsOfExperience?.message}
              {...register('yearsOfExperience')}
            />

            <Input
              id="consultationFee"
              type="number"
              min={0}
              step={0.01}
              label={t('doctors.consultationFee')}
              placeholder="0.00"
              leftIcon={<DollarSign size={16} />}
              error={errors.consultationFee?.message}
              {...register('consultationFee')}
            />
          </div>

          {/* About */}
          <div className="mt-4 flex flex-col gap-1.5">
            <label htmlFor="about" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('doctors.about')}
            </label>
            <textarea
              id="about"
              rows={3}
              placeholder={t('doctors.aboutPlaceholder')}
              className={cn(
                'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-sm transition-all duration-200 resize-none',
                'focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-400',
                'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500',
                errors.about && 'border-red-400',
              )}
              {...register('about')}
            />
            {errors.about && <p className="text-xs text-red-500">{errors.about.message}</p>}
          </div>
        </SectionCard>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <Link to="/doctors">
            <Button type="button" variant="secondary">
              {t('common.cancel')}
            </Button>
          </Link>
          <Button type="submit" isLoading={isSubmitting} className="min-w-36">
            {isSubmitting ? t('doctors.creating') : t('doctors.create')}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── Image uploader ────────────────────────────────────────────────────────────
function ImageUploader({
  preview,
  error,
  isDragging,
  onFileChange,
  onDrop,
  onDragOver,
  onDragLeave,
  onRemove,
  t,
}: {
  preview: string | null;
  error: string | null;
  isDragging: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onRemove: () => void;
  t: TFunction;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {t('doctors.profilePhoto')}
      </label>

      {preview ? (
        /* ── Preview state ─────────────────────────────────────────── */
        <div className="flex items-center gap-4 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-700/20">
          <img
            src={preview}
            alt="Preview"
            className="w-16 h-16 rounded-xl object-cover shrink-0 ring-2 ring-cyan-400/40"
          />
          <div className="flex flex-col gap-2 min-w-0">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300',
                'hover:bg-cyan-100 dark:hover:bg-cyan-900/40 border border-cyan-200/60 dark:border-cyan-800/50',
              )}
            >
              <Upload size={12} />
              {t('doctors.changePhoto')}
            </button>
            <button
              type="button"
              onClick={onRemove}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
                'hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200/60 dark:border-red-800/50',
              )}
            >
              <X size={12} />
              {t('doctors.removePhoto')}
            </button>
          </div>
        </div>
      ) : (
        /* ── Drop zone ─────────────────────────────────────────────── */
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-150 min-h-27.5',
            isDragging
              ? 'border-cyan-400 bg-cyan-50/60 dark:bg-cyan-900/20 dark:border-cyan-600'
              : 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-700/20 hover:border-cyan-300 dark:hover:border-cyan-700 hover:bg-cyan-50/40 dark:hover:bg-cyan-900/10',
            error && 'border-red-300 dark:border-red-700',
          )}
        >
          <div className={cn(
            'flex items-center justify-center w-10 h-10 rounded-xl transition-colors',
            isDragging ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500',
          )}>
            <ImageIcon size={18} />
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('doctors.uploadDragDrop')}{' '}
              <span className="text-cyan-600 dark:text-cyan-400 font-semibold underline underline-offset-2">
                {t('doctors.uploadBrowse')}
              </span>
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              {t('doctors.uploadPhotoHint')}
            </p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={onFileChange}
      />

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm dark:bg-slate-800 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100 dark:border-slate-700">
        <span className="text-cyan-600 dark:text-cyan-400">{icon}</span>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}
