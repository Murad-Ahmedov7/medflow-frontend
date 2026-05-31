import axiosInstance from '../api/axiosInstance';
import { API_ENDPOINTS } from '../api/config';
import type { ApiResult, ApiListResult } from '../types/api.types';
import type {
  CreateDoctorRequest,
  CreateDoctorResponse,
  DoctorResponse,
  DoctorStatsResponse,
  DoctorsQuery,
  UpdateDoctorRequest,
} from '../types/doctor.types';

export const doctorService = {
  create: async (data: CreateDoctorRequest) => {
    const response = await axiosInstance.post<ApiResult<CreateDoctorResponse>>(
      API_ENDPOINTS.users.createDoctor,
      data,
    );
    return response.data;
  },

  getAll: async (query: DoctorsQuery = {}) => {
    const response = await axiosInstance.get<ApiListResult<DoctorResponse>>(
      API_ENDPOINTS.doctors.base,
      { params: query },
    );
    return response.data;
  },

  getStats: async () => {
    const response = await axiosInstance.get<ApiResult<DoctorStatsResponse>>(
      API_ENDPOINTS.doctors.stats,
    );
    return response.data;
  },

  getById: async (id: string) => {
    const response = await axiosInstance.get<ApiResult<DoctorResponse>>(
      API_ENDPOINTS.doctors.byId(id),
    );
    return response.data;
  },

  update: async (id: string, data: UpdateDoctorRequest) => {
    const response = await axiosInstance.put<ApiResult<DoctorResponse>>(
      API_ENDPOINTS.doctors.byId(id),
      data,
    );
    return response.data;
  },

  toggleStatus: async (id: string) => {
    const response = await axiosInstance.patch<ApiResult<boolean>>(
      API_ENDPOINTS.doctors.toggleStatus(id),
    );
    return response.data;
  },

  exportExcel: async (params: Record<string, string | boolean | undefined>) => {
    const response = await axiosInstance.get(API_ENDPOINTS.doctors.export, {
      params,
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  uploadPhoto: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosInstance.post<ApiResult<string>>(
      API_ENDPOINTS.doctors.uploadPhoto(id),
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },
};
