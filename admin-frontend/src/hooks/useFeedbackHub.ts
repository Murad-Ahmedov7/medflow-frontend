import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import i18n from '../i18n';
import { API_BASE_URL } from '../api/config';
import { tokenStorage } from '../utils/token';
import { FEEDBACK_QUERY_KEY } from './useFeedback';

function t(key: string) {
  return i18n.t(key);
}

export function useFeedbackHub() {
  const queryClient = useQueryClient();
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/feedback`, {
        accessTokenFactory: () => tokenStorage.getToken() ?? '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connectionRef.current = connection;

    connection.on('NewFeedbackSubmitted', () => {
      queryClient.invalidateQueries({ queryKey: FEEDBACK_QUERY_KEY });
      toast.info(t('feedback.notifications.newFeedback'), {
        description: t('feedback.notifications.newFeedbackDesc'),
        id: 'new-feedback-submitted',
        duration: 5000,
      });
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
