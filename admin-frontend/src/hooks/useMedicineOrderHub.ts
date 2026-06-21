import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '../api/config';
import { tokenStorage } from '../utils/token';
import { MEDICINE_ORDERS_QUERY_KEY } from './useMedicineOrders';

export function useMedicineOrderHub() {
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

    // Event names are the backend SignalR contract — unchanged by this UI rename.
    // No toast here: the payment-success modal (triggered separately by
    // MedicineOrderPaymentReceived in useBalanceHub) is the single success surface
    // for a new medicine order — showing both would be redundant.
    connection.on('NewPharmacyOrder', () => {
      queryClient.invalidateQueries({ queryKey: MEDICINE_ORDERS_QUERY_KEY });
    });

    connection.on('PharmacyOrderStatusChanged', () => {
      queryClient.invalidateQueries({ queryKey: MEDICINE_ORDERS_QUERY_KEY });
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
