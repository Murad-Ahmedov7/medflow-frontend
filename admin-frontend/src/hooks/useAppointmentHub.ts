import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '../api/config';
import { tokenStorage } from '../utils/token';

export function useAppointmentHub() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/appointments`, {
        accessTokenFactory: () => tokenStorage.getToken() ?? '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connectionRef.current = connection;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    };

    const applyStatus = (appointmentId: string, status: string) => {
      queryClient.setQueryData(
        ['appointments'],
        (old: { data?: Array<{ id?: string; status: string | number }> } | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map(a => a.id === appointmentId ? { ...a, status } : a),
          };
        },
      );
      invalidate();
    };

    connection.on('AppointmentStatusUpdated', invalidate);

    connection.on('ConsultationStarted', (p: { appointmentId: string }) => {
      applyStatus(p.appointmentId, 'InProgress');
      toast.info(t('appointments.notifications.started'));
    });

    connection.on('ConsultationCompleted', (p: { appointmentId: string }) => {
      applyStatus(p.appointmentId, 'Completed');
      toast.success(t('appointments.notifications.completed'));
    });

    connection.on('ConsultationCancelled', (p: { appointmentId: string }) => {
      applyStatus(p.appointmentId, 'Cancelled');
      toast.info(t('appointments.notifications.cancelled'));
    });

    connection.start()
      .catch(() => { /* SignalR is an enhancement — fail silently */ });

    return () => {
      connection.stop();
      connectionRef.current = null;
    };
  }, [t, queryClient]);
}
