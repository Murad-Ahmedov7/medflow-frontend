import axiosInstance from '../api/axiosInstance';
import { API_ENDPOINTS } from '../api/config';
import type { ApiResult } from '../types/api.types';
import type { MyPatientProfileResponse, UpdateMyPatientProfileRequest } from '../types/patient.types';

export const patientProfileService = {
  getMyProfile: async (): Promise<ApiResult<MyPatientProfileResponse>> => {
    const res = await axiosInstance.get<ApiResult<MyPatientProfileResponse>>(API_ENDPOINTS.patients.me);
    return res.data;
  },

  updateMyProfile: async (data: UpdateMyPatientProfileRequest): Promise<ApiResult<MyPatientProfileResponse>> => {
    const res = await axiosInstance.put<ApiResult<MyPatientProfileResponse>>(API_ENDPOINTS.patients.me, data);
    return res.data;
  },

  uploadPhoto: async (file: File): Promise<ApiResult<MyPatientProfileResponse>> => {
    const form = new FormData();
    form.append('file', file);
    const res = await axiosInstance.post<ApiResult<MyPatientProfileResponse>>(
      API_ENDPOINTS.patients.mePhoto,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return res.data;
  },
};
