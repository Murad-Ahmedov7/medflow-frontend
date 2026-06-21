import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientProfileService } from '../services/patientProfile.service';
import { extractErrorMessage, sanitizeApiMessage } from '../utils/errorHandler';
import { showToast } from '../utils/toast';
import type { UpdateMyPatientProfileRequest } from '../types/patient.types';

export const PROFILE_QUERY_KEY = ['patient', 'me'];

export function useMyPatientProfile(enabled = true) {
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: async () => {
      const result = await patientProfileService.getMyProfile();
      if (!result.isSuccess || !result.data) {
        throw new Error(result.errors?.[0] ?? 'Failed to load profile.');
      }
      return result.data;
    },
    staleTime: 1000 * 60 * 5,
    enabled,
  });
}

export function useUpdateMyPatientProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateMyPatientProfileRequest) =>
      patientProfileService.updateMyProfile(data),
    onSuccess: (result) => {
      if (!result.isSuccess) { showToast.apiError(sanitizeApiMessage(result.errors?.[0])); return; }
      queryClient.setQueryData(PROFILE_QUERY_KEY, result.data);
      showToast.profileSaved();
    },
    onError: (error) => { showToast.apiError(extractErrorMessage(error)); },
  });
}

export function useUploadProfilePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => patientProfileService.uploadPhoto(file),
    onSuccess: (result) => {
      if (!result.isSuccess) { showToast.apiError(sanitizeApiMessage(result.errors?.[0])); return; }
      queryClient.setQueryData(PROFILE_QUERY_KEY, result.data);
      showToast.photoUploaded();
    },
    onError: (error) => { showToast.apiError(extractErrorMessage(error)); },
  });
}
