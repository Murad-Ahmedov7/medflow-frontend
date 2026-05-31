import { useQuery } from '@tanstack/react-query';
import { doctorService } from '../services/doctor.service';
import { appointmentService } from '../services/appointment.service';

export function useDoctorProfile() {
  return useQuery({
    queryKey: ['doctor', 'profile'],
    queryFn: doctorService.getProfile,
    select: (res) => res.data ?? null,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTodayAppointments() {
  return useQuery({
    queryKey: ['appointments', 'today'],
    queryFn: appointmentService.getToday,
    select: (res) => res.data ?? [],
    refetchInterval: 2 * 60 * 1000,
  });
}
