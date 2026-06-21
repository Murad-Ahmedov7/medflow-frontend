import axiosInstance from '../api/axiosInstance';
import { API_ENDPOINTS } from '../api/config';
import type { ApiListResult, ApiResult } from '../types/api.types';
import type { PatientResponse } from '../types/patient.types';

export const patientService = {
  getAll: async () => {
    const response = await axiosInstance.get<ApiListResult<PatientResponse>>(
      API_ENDPOINTS.patients.base,
    );
    return response.data;
  },

  getById: async (id: string) => {
    const response = await axiosInstance.get<ApiResult<PatientResponse>>(
      API_ENDPOINTS.patients.byId(id),
    );
    return response.data;
  },
};
