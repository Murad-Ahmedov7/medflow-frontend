import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { doctorService } from '../services/doctor.service';
import { departmentService } from '../services/department.service';
import { extractErrorMessage, sanitizeApiMessage } from '../utils/errorHandler';
import type { CreateDoctorRequest, DoctorsQuery, UpdateDoctorRequest } from '../types/doctor.types';
import type { ExportDoctorsParams } from '../types/doctor.types';
import type { CreateDepartmentRequest, UpdateDepartmentRequest } from '../types/department.types';

export function useDoctors(query: DoctorsQuery = {}) {
  return useQuery({
    queryKey: ['doctors', query],
    queryFn: () => doctorService.getAll(query),
  });
}

export function useGetDoctor(id: string) {
  return useQuery({
    queryKey: ['doctor', id],
    queryFn: () => doctorService.getById(id),
    enabled: !!id,
  });
}

export function useDoctorStats() {
  return useQuery({
    queryKey: ['doctor-stats'],
    queryFn: doctorService.getStats,
    staleTime: 60_000,
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: departmentService.getAll,
    select: (res) => res.data ?? [],
  });
}

export function useDepartmentsRaw() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: departmentService.getAll,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (data: CreateDepartmentRequest) => departmentService.create(data),
    onSuccess: (result) => {
      if (!result.isSuccess) {
        toast.error(result.errors?.[0] ? sanitizeApiMessage(result.errors[0]) : t('departments.createError'));
        return;
      }
      toast.success(t('departments.createSuccess'));
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-stats'] });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDepartmentRequest }) =>
      departmentService.update(id, data),
    onSuccess: (result) => {
      if (!result.isSuccess) {
        toast.error(result.errors?.[0] ? sanitizeApiMessage(result.errors[0]) : t('departments.updateError'));
        return;
      }
      toast.success(t('departments.updateSuccess'));
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: string) => departmentService.delete(id),
    onSuccess: (result) => {
      if (!result.isSuccess) {
        toast.error(result.errors?.[0] ? sanitizeApiMessage(result.errors[0]) : t('departments.deleteError'));
        return;
      }
      toast.success(t('departments.deleteSuccess'));
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-stats'] });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useCreateDoctor() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (data: CreateDoctorRequest) => doctorService.create(data),
    onSuccess: (result) => {
      if (!result.isSuccess) {
        toast.error(result.errors?.[0] ? sanitizeApiMessage(result.errors[0]) : t('doctors.createError'));
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-stats'] });
      // Navigation is deferred to the caller so a photo upload can complete first.
      // The caller is responsible for showing a success toast and navigating.
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useUpdateDoctor() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDoctorRequest }) =>
      doctorService.update(id, data),
    onSuccess: (result, { id }) => {
      if (!result.isSuccess) {
        toast.error(result.errors?.[0] ? sanitizeApiMessage(result.errors[0]) : t('doctors.updateError'));
        return;
      }
      toast.success(t('doctors.updateSuccess'));
      // Remove (evict) the list cache so the list page never renders stale data.
      // invalidateQueries only marks stale → the old data still renders briefly.
      queryClient.removeQueries({ queryKey: ['doctors'] });
      // Evict the individual doctor cache so the edit page also reflects the change.
      queryClient.removeQueries({ queryKey: ['doctor', id] });
      queryClient.invalidateQueries({ queryKey: ['doctor-stats'] });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useExportDoctors() {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (params: ExportDoctorsParams) =>
      doctorService.exportExcel(params as Record<string, string | boolean | undefined>),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `doctors-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(t('doctors.exportSuccess'));
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useToggleDoctorStatus() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: string) => doctorService.toggleStatus(id),
    onSuccess: (result) => {
      if (!result.isSuccess) {
        toast.error(result.errors?.[0] ? sanitizeApiMessage(result.errors[0]) : t('common.error'));
        return;
      }
      toast.success(result.data ? t('doctors.activated') : t('doctors.deactivated'));
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-stats'] });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useUploadDoctorPhoto() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      doctorService.uploadPhoto(id, file),
    onSuccess: (result, { id }) => {
      if (!result.isSuccess) {
        toast.error(result.errors?.[0] ? sanitizeApiMessage(result.errors[0]) : t('doctors.uploadError'));
        return;
      }
      toast.success(t('doctors.uploadSuccess'));
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      queryClient.invalidateQueries({ queryKey: ['doctor', id] });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });
}
