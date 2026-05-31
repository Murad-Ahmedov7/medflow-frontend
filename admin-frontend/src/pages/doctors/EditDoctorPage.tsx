import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  User, Phone, Stethoscope, Building2,
  BadgeCheck, DollarSign, Clock, ArrowLeft, Save,
  Upload, X, ImageIcon,
} from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useDepartments, useGetDoctor, useUpdateDoctor, useUploadDoctorPhoto } from '../../hooks/useDoctors';
import { API_BASE_URL } from '../../api/config';
import { cn } from '../../utils/cn';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

type TFunction = (key: string) => string;

function makeSchema(t: TFunction) {
  return z.object({
    fullName: z.string().min(3, t('doctors.validation.fullNameMin')).max(50, t('doctors.validation.fullNameMax')),
    phone: z.string().min(9, t('doctors.validation.phoneInvalid')).max(20),
    departmentId: z.string().uuid(t('doctors.validation.departmentRequired')),
    specialty: z.string().min(2, t('doctors.validation.specialtyMin')).max(100),
    about: z.string().max(1000).optional(),
    licenseNumber: z.string().max(50).optional(),
    yearsOfExperience: z.coerce.number().int().min(0).max(60),
    consultationFee: z.coerce.number().min(0).max(99999.99),
  });
}

type FormData = z.infer<ReturnType<typeof makeSchema>>;

export function EditDoctorPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = `/doctors${(location.state as { returnTo?: string } | null)?.returnTo ?? ''}`;

  const schema = useMemo(() => makeSchema(t), [i18n.language]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: doctorResult, isLoading: loadingDoctor, isError } = useGetDoctor(id ?? '');
  const { data: departments = [], isLoading: loadingDepts } = useDepartments();
  const { mutate: updateDoctor, isPending } = useUpdateDoctor();
  const { mutateAsync: uploadPhoto, isPending: isUploading } = useUploadDoctorPhoto();

  const doctor = doctorResult?.data;

  // ── Photo state ──────────────────────────────────────────────────────────────
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [savedImageUrl, setSavedImageUrl] = useState<string | null>(null);
  // true when admin clicked "Remove" — signals the backend to NULL the field
  const [photoDeleted, setPhotoDeleted] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (doctor) {
      reset({
        fullName: doctor.fullName,
        phone: doctor.phone,
        departmentId: doctor.departmentId,
        specialty: doctor.specialty,
        about: doctor.about ?? '',
        licenseNumber: doctor.licenseNumber ?? '',
        yearsOfExperience: doctor.yearsOfExperience,
        consultationFee: doctor.consultationFee,
      });
      // Resolve absolute URL for images stored as relative paths
      if (doctor.imageUrl) {
        const url = doctor.imageUrl.startsWith('http')
          ? doctor.imageUrl
          : `${API_BASE_URL}${doctor.imageUrl}`;
        setSavedImageUrl(url);
      } else {
        setSavedImageUrl(null);
      }
    }
  }, [doctor, reset]);

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
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoDeleted(false); // replacing, not deleting
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
    setSavedImageUrl(null);
    setPhotoDeleted(true); // signal backend to NULL the field on save
  }

  async function onSubmit(data: FormData) {
    if (!id) return;

    // Upload new photo first if one was selected
    if (photoFile) {
      await uploadPhoto({ id, file: photoFile }).catch(() => {
        // non-blocking — proceed to update regardless
      });
    }

    updateDoctor(
      {
        id,
        data: {
          fullName: data.fullName,
          phone: data.phone,
          departmentId: data.departmentId,
          specialty: data.specialty,
          about: data.about || undefined,
          licenseNumber: data.licenseNumber || undefined,
          yearsOfExperience: data.yearsOfExperience,
          consultationFee: data.consultationFee,
          isActive: doctor!.isActive,
          // "" → admin deleted the image (backend NULLs the field)
          // undefined → no change (backend preserves the current value)
          imageUrl: photoDeleted ? '' : undefined,
        },
      },
      {
        onSuccess: (result) => {
          if (result.isSuccess) navigate(returnTo);
        },
      },
    );
  }

  const isSubmitting = isPending || isUploading;

  // The currently displayed image: new local preview > saved remote URL > nothing
  const displayImage = photoPreview ?? savedImageUrl;

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto py-20 flex flex-col items-center gap-4">
        <p className="text-slate-500 dark:text-slate-400">{t('doctors.notFound')}</p>
        <Link to={returnTo}>
          <Button variant="secondary">{t('common.back')}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          to={returnTo}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={16} />
          {t('common.back')}
        </Link>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-linear-to-br from-cyan-500 to-blue-600 shadow-sm">
            <Save size={18} className="text-white" />
          </div>
          <div>
            {loadingDoctor ? (
              <>
                <div className="h-6 w-48 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse mb-1.5" />
                <div className="h-4 w-64 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {t('doctors.editTitle')}
                  {doctor && (
                    <span className="ml-2 text-slate-400 dark:text-slate-500 font-normal text-lg">
                      — {doctor.fullName}
                    </span>
                  )}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {t('doctors.editSubtitle')}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {loadingDoctor ? (
        <FormSkeleton />
      ) : (
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
              {/* Email is read-only — cannot be changed after account creation */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('auth.email')}
                </label>
                <div className="flex items-center h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-700/50 dark:border-slate-600 text-sm text-slate-400 dark:text-slate-500 select-none">
                  {doctor?.email ?? ''}
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">Email cannot be changed</p>
              </div>
              <Input
                id="phone"
                type="tel"
                label={t('auth.phone')}
                placeholder="+1 555 000 0000"
                leftIcon={<Phone size={16} />}
                error={errors.phone?.message}
                {...register('phone')}
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
                displayImage={displayImage}
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
            <Link to={returnTo}>
              <Button type="button" variant="secondary">
                {t('common.cancel')}
              </Button>
            </Link>
            <Button type="submit" isLoading={isSubmitting} className="min-w-36">
              {isSubmitting ? t('doctors.saving') : t('doctors.save')}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── Image uploader ────────────────────────────────────────────────────────────
function ImageUploader({
  displayImage,
  error,
  isDragging,
  onFileChange,
  onDrop,
  onDragOver,
  onDragLeave,
  onRemove,
  t,
}: {
  displayImage: string | null;
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

      {displayImage ? (
        /* ── Preview / current image state ────────────────────────── */
        <div className="flex items-center gap-4 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-700/20">
          <img
            src={displayImage}
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

function FormSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-2xl border border-slate-100 bg-white shadow-sm dark:bg-slate-800 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <div className="h-4 w-40 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={j} className="space-y-1.5">
                <div className="h-3.5 w-24 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-11 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
