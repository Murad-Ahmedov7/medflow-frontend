import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appointmentService } from '../services/appointment.service';
import { APPOINTMENT_STATUS_VALUES } from '../types/appointment.types';
import type { AppointmentStatus, DoctorAppointmentResponse } from '../types/appointment.types';
import type { ApiListResult } from '../types/api.types';

export const DOCTOR_APPOINTMENTS_KEY = ['appointments', 'doctor'] as const;

// setQueryData operates on the raw cache value (ApiListResult), not the select-transformed array.
// This helper patches the status of one appointment inside the raw response in-place.
export function patchStatus(id: string, status: string) {
  return (old: ApiListResult<DoctorAppointmentResponse> | undefined) => {
    if (!old) return old;
    return { ...old, data: old.data.map(a => a.id === id ? { ...a, status: status as AppointmentStatus } : a) };
  };
}

export function useDoctorAppointments() {
  return useQuery({
    queryKey: DOCTOR_APPOINTMENTS_KEY,
    queryFn: appointmentService.getDoctorAppointments,
    select: (res) => res.data ?? [],
    staleTime: 30_000,
  });
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      appointmentService.updateStatus(id, APPOINTMENT_STATUS_VALUES[status]),
    onSuccess: (_data, { id, status }) => {
      queryClient.setQueryData(DOCTOR_APPOINTMENTS_KEY, patchStatus(id, status));
      queryClient.invalidateQueries({ queryKey: DOCTOR_APPOINTMENTS_KEY });
      queryClient.invalidateQueries({ queryKey: ['appointments', 'today'] });
    },
  });
}

export function useDoctorCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, cancellationReason }: { id: string; cancellationReason: string }) =>
      appointmentService.doctorCancel(id, cancellationReason),
    onSuccess: (_data, { id }) => {
      queryClient.setQueryData(DOCTOR_APPOINTMENTS_KEY, patchStatus(id, 'Cancelled'));
      queryClient.invalidateQueries({ queryKey: DOCTOR_APPOINTMENTS_KEY });
      queryClient.invalidateQueries({ queryKey: ['appointments', 'today'] });
    },
  });
}
