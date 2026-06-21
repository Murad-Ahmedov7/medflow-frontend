import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import i18n from '../i18n';
import { API_BASE_URL } from '../api/config';
import { tokenStorage } from '../utils/token';
import { DOCTOR_APPOINTMENTS_KEY, patchStatus } from './useAppointments';

function t(key: string) {
  return i18n.t(key);
}

export function useAppointmentHub(doctorId: string | undefined) {
  const queryClient = useQueryClient();
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    if (!doctorId) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/appointments`, {
        // SignalR WebSocket cannot send Authorization headers;
        // JWT is passed as ?access_token= query param instead.
        accessTokenFactory: () => tokenStorage.getToken() ?? '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connectionRef.current = connection;

    // Generic status update — invalidate and refetch
    connection.on('AppointmentStatusUpdated', () => {
      queryClient.invalidateQueries({ queryKey: DOCTOR_APPOINTMENTS_KEY });
      queryClient.invalidateQueries({ queryKey: ['appointments', 'today'] });
    });

    // A patient booked a new appointment — refresh the Upcoming Appointments list live
    connection.on('NewAppointmentCreated', () => {
      queryClient.invalidateQueries({ queryKey: DOCTOR_APPOINTMENTS_KEY });
      queryClient.invalidateQueries({ queryKey: ['appointments', 'today'] });
      toast.info(t('appointments.newAppointmentBooked'), {
        id: 'new-appointment-booked',
        duration: 5000,
      });
    });

    // Granular events with appointmentId — update cache instantly then reconcile
    const applyStatus = (appointmentId: string, status: string) => {
      queryClient.setQueryData(DOCTOR_APPOINTMENTS_KEY, patchStatus(appointmentId, status));
      queryClient.invalidateQueries({ queryKey: DOCTOR_APPOINTMENTS_KEY });
      queryClient.invalidateQueries({ queryKey: ['appointments', 'today'] });
    };

    connection.on('ConsultationStarted',   (p: { appointmentId: string }) => applyStatus(p.appointmentId, 'InProgress'));
    connection.on('ConsultationCompleted', (p: { appointmentId: string }) => applyStatus(p.appointmentId, 'Completed'));
    connection.on('ConsultationCancelled', (p: { appointmentId: string }) => applyStatus(p.appointmentId, 'Cancelled'));

    connection.start()
      .then(() => connection.invoke('JoinDoctorGroup', doctorId))
      .catch(() => { /* SignalR is an enhancement — fail silently */ });

    return () => {
      if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
        connectionRef.current.invoke('LeaveDoctorGroup', doctorId).catch(() => {});
      }
      connection.stop();
      connectionRef.current = null;
    };
  }, [doctorId, queryClient]);
}
