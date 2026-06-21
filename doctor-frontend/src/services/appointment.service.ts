import axiosInstance from '../api/axiosInstance';
import { API_ENDPOINTS } from '../api/config';
import type { ApiListResult, ApiResult } from '../types/api.types';
import type { DoctorAppointmentResponse, TodayAppointmentResponse } from '../types/appointment.types';

export const appointmentService = {
  getToday: async () => {
    const response = await axiosInstance.get<ApiListResult<TodayAppointmentResponse>>(
      API_ENDPOINTS.appointments.today,
    );
    return response.data;
  },

  getDoctorAppointments: async () => {
    const response = await axiosInstance.get<ApiListResult<DoctorAppointmentResponse>>(
      API_ENDPOINTS.appointments.doctor,
    );
    return response.data;
  },

  updateStatus: async (id: string, status: number) => {
    const response = await axiosInstance.patch<ApiResult<unknown>>(
      API_ENDPOINTS.appointments.status(id),
      { status },
    );
    return response.data;
  },

  doctorCancel: async (id: string, cancellationReason: string) => {
    const response = await axiosInstance.patch<ApiResult<unknown>>(
      API_ENDPOINTS.appointments.doctorCancel(id),
      { cancellationReason },
    );
    return response.data;
  },
};
