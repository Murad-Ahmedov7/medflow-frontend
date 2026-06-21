import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '../api/config';
import { tokenStorage } from '../utils/token';

export interface MedicineOrderPaymentReceivedPayload {
  amount: number;
  newBalance: number;
}

// Live-refreshes the Finance dashboard whenever the admin/hospital balance changes —
// Stripe top-up, medicine order revenue, supplier purchase, or order-cancellation reversal.
// onMedicineOrderPaymentReceived fires only for a successful medicine-order payment
// (not status updates or cancellations) so callers can show a payment-success modal.
export function useBalanceHub(onMedicineOrderPaymentReceived?: (payload: MedicineOrderPaymentReceivedPayload) => void) {
  const queryClient = useQueryClient();
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const callbackRef = useRef(onMedicineOrderPaymentReceived);
  callbackRef.current = onMedicineOrderPaymentReceived;

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/appointments`, {
        accessTokenFactory: () => tokenStorage.getToken() ?? '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connectionRef.current = connection;

    connection.on('AdminBalanceChanged', () => {
      queryClient.invalidateQueries({ queryKey: ['admin-balance'] });
      queryClient.invalidateQueries({ queryKey: ['admin-balance-transactions'] });
    });

    connection.on('MedicineOrderPaymentReceived', (payload: MedicineOrderPaymentReceivedPayload) => {
      queryClient.invalidateQueries({ queryKey: ['admin-balance'] });
      queryClient.invalidateQueries({ queryKey: ['admin-balance-transactions'] });
      callbackRef.current?.(payload);
    });

    connection.start()
      .then(() => connection.invoke('JoinAdminGroup'))
      .catch(() => { /* SignalR is an enhancement — fail silently */ });

    return () => {
      if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
        connectionRef.current.invoke('LeaveAdminGroup').catch(() => {});
      }
      connection.stop();
      connectionRef.current = null;
    };
  }, [queryClient]);
}
