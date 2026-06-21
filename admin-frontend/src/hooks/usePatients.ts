import { useQuery } from '@tanstack/react-query';
import { patientService } from '../services/patient.service';

export function usePatients() {
  return useQuery({
    queryKey: ['patients'],
    queryFn: patientService.getAll,
    staleTime: 60_000,
  });
}

export function useGetPatient(id: string | null) {
  return useQuery({
    queryKey: ['patient', id],
    queryFn: () => patientService.getById(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}
