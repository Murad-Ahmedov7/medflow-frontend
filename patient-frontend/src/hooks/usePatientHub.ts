import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '../api/config';
import { tokenStorage } from '../utils/token';
import { useRefundStore } from '../store/refundStore';

export function usePatientHub(patientId: string | undefined) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    if (!patientId) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/appointments`, {
        // JWT must be passed as query param for WebSocket transport
        accessTokenFactory: () => tokenStorage.getToken() ?? '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connectionRef.current = connection;

    // Consultation started — doctor clicked "Start Consultation"
    connection.on('ConsultationStarted', (payload: { doctorName: string; appointmentId: string }) => {
      toast.info(t('notifications.consultationStarted'), {
        description: t('notifications.consultationStartedDesc', { doctorName: payload.doctorName }),
        duration: 8000,
      });
      queryClient.setQueryData<Array<{ id: string; status: string }>>(
        ['my-appointments'],
        old => old?.map(a => a.id === payload.appointmentId ? { ...a, status: 'InProgress' } : a),
      );
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
    });

    // Consultation completed — doctor clicked "Complete Consultation"
    connection.on('ConsultationCompleted', (payload: { doctorName: string; appointmentId: string }) => {
      toast.success(t('notifications.consultationCompleted'), {
        description: t('notifications.consultationCompletedDesc', { doctorName: payload.doctorName }),
        duration: 8000,
      });
      queryClient.setQueryData<Array<{ id: string; status: string }>>(
        ['my-appointments'],
        old => old?.map(a => a.id === payload.appointmentId ? { ...a, status: 'Completed' } : a),
      );
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
    });

    // Pharmacy order status changed — toast only for Ready/Delivered/Cancelled, always refresh the list.
    // A cancellation also refunds the wallet on the backend, so the balance is refreshed too.
    connection.on('PharmacyOrderStatusChanged', (payload: { orderId: string; newStatus: string }) => {
      queryClient.invalidateQueries({ queryKey: ['my-pharmacy-orders'] });
      if (payload.newStatus === 'Ready') {
        toast.success(t('pharmacy.notifications.ready'), { duration: 8000 });
      } else if (payload.newStatus === 'Delivered') {
        toast.success(t('pharmacy.notifications.delivered'), { duration: 8000 });
      } else if (payload.newStatus === 'Cancelled') {
        queryClient.invalidateQueries({ queryKey: ['patient-wallet-balance'] });
        toast.info(t('pharmacy.notifications.cancelled'), { duration: 8000 });
      }
    });

    // Consultation cancelled (by the doctor) — refunds the consultation fee on the
    // backend when one was charged. The refund gets the full success-modal treatment
    // (same as a payment), not just a toast, so it's set on the shared refund store
    // and rendered globally from App.tsx.
    connection.on('ConsultationCancelled', (payload: {
      doctorName: string; appointmentId: string;
      refunded?: boolean; refundAmount?: number; newBalance?: number;
    }) => {
      toast.warning(t('notifications.consultationCancelled'), {
        description: t('notifications.consultationCancelledDesc', { doctorName: payload.doctorName }),
        duration: 8000,
      });
      queryClient.setQueryData<Array<{ id: string; status: string }>>(
        ['my-appointments'],
        old => old?.map(a => a.id === payload.appointmentId ? { ...a, status: 'Cancelled' } : a),
      );
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });

      if (payload.refunded && payload.refundAmount != null && payload.newBalance != null) {
        queryClient.invalidateQueries({ queryKey: ['patient-wallet-balance'] });
        useRefundStore.getState().setPendingRefund({
          amount: payload.refundAmount,
          newBalance: payload.newBalance,
        });
      }
    });

    connection.start()
      .then(() => connection.invoke('JoinPatientGroup', patientId))
      .catch(() => { /* SignalR is an enhancement — fail silently */ });

    return () => {
      if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
        connectionRef.current.invoke('LeavePatientGroup', patientId).catch(() => {});
      }
      connection.stop();
      connectionRef.current = null;
    };
  }, [patientId, t, queryClient]);
}
