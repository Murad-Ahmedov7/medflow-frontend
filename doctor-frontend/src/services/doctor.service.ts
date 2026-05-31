import axiosInstance from '../api/axiosInstance';
import { API_ENDPOINTS } from '../api/config';
import type { ApiResult } from '../types/api.types';
import type { DoctorProfileResponse } from '../types/doctor.types';

export const doctorService = {
  getProfile: async () => {
    const response = await axiosInstance.get<ApiResult<DoctorProfileResponse>>(
      API_ENDPOINTS.doctors.me,
    );
    return response.data;
  },
};
