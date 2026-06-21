import { useQuery } from '@tanstack/react-query';
import { appointmentService } from '../services/appointment.service';
import type { AppointmentResponse } from '../types/appointment.types';

export function useAppointments() {
  return useQuery({
    queryKey: ['appointments'],
    queryFn: appointmentService.getAll,
  });
}

export function useGetAppointment(id: string | null) {
  return useQuery<AppointmentResponse | null>({
    queryKey: ['appointment', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await appointmentService.getById(id);
      return res.data ?? null;
    },
    enabled: !!id,
    staleTime: 0,
  });
}
