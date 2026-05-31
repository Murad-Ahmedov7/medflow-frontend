import axiosInstance from '../api/axiosInstance';
import { API_ENDPOINTS } from '../api/config';
import type { ApiListResult } from '../types/api.types';
import type { TodayAppointmentResponse } from '../types/appointment.types';

export const appointmentService = {
  getToday: async () => {
    const response = await axiosInstance.get<ApiListResult<TodayAppointmentResponse>>(
      API_ENDPOINTS.appointments.today,
    );
    return response.data;
  },
};
