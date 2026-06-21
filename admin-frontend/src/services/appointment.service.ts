import axiosInstance from '../api/axiosInstance';
import { API_ENDPOINTS } from '../api/config';
import type { ApiResult, ApiListResult } from '../types/api.types';
import type {
  AppointmentResponse,
  UpdateAppointmentStatusRequest,
} from '../types/appointment.types';

export const appointmentService = {
  getAll: async () => {
    const response = await axiosInstance.get<ApiListResult<AppointmentResponse>>(
      API_ENDPOINTS.appointments.base,
    );
    return response.data;
  },

  getById: async (id: string) => {
    const response = await axiosInstance.get<ApiResult<AppointmentResponse>>(
      API_ENDPOINTS.appointments.byId(id),
    );
    return response.data;
  },

  updateStatus: async (id: string, data: UpdateAppointmentStatusRequest) => {
    const response = await axiosInstance.patch<ApiResult<AppointmentResponse>>(
      API_ENDPOINTS.appointments.status(id),
      data,
    );
    return response.data;
  },
};
