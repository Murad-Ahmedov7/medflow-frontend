import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import i18n from '../i18n';
import { API_BASE_URL } from '../api/config';
import { tokenStorage } from '../utils/token';
import type { FeedbackResponse } from '../types/feedback.types';

const MY_FEEDBACK_KEY = ['feedback', 'my'];

function t(key: string) {
  return i18n.t(key);
}

export function useFeedbackHub(patientId: string | undefined) {
  const queryClient = useQueryClient();
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    if (!patientId) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/feedback`, {
        accessTokenFactory: () => tokenStorage.getToken() ?? '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connectionRef.current = connection;

    connection.on('FeedbackUpdated', (payload: { feedbackId: string; newStatus: string; adminResponse: string | null }) => {
      // Read old item before updating so we can diff what changed
      const cached = queryClient.getQueryData<FeedbackResponse[]>(MY_FEEDBACK_KEY);
      const old = cached?.find((f) => f.id === payload.feedbackId);

      // Optimistically update the cached item so the UI reflects changes immediately
      queryClient.setQueryData<FeedbackResponse[]>(MY_FEEDBACK_KEY, (prev) =>
        prev?.map((f) =>
          f.id === payload.feedbackId
            ? {
                ...f,
                status: payload.newStatus as FeedbackResponse['status'],
                adminResponse: payload.adminResponse,
                adminRespondedAt: payload.adminResponse ? new Date().toISOString() : f.adminRespondedAt,
              }
            : f,
        ),
      );
      // Then revalidate to get the authoritative server state
      queryClient.invalidateQueries({ queryKey: MY_FEEDBACK_KEY });

      // Fire the appropriate toast based on what actually changed
      const statusChanged = old && old.status !== payload.newStatus;
      const responseAdded = payload.adminResponse && old?.adminResponse !== payload.adminResponse;

      if (payload.newStatus === 'Resolved') {
        toast.success(t('feedback.notifications.resolved'), {
          description: t('feedback.notifications.resolvedDesc'),
          id: `feedback-resolved-${payload.feedbackId}`,
          duration: 6000,
        });
      } else if (statusChanged) {
        const label = payload.newStatus === 'InReview'
          ? t('feedback.statusInReview')
          : payload.newStatus;
        toast.info(t('feedback.notifications.statusChanged'), {
          description: t('feedback.notifications.statusChangedDesc').replace('{{status}}', label),
          id: `feedback-status-${payload.feedbackId}`,
          duration: 5000,
        });
      } else if (responseAdded) {
        toast.info(t('feedback.notifications.newResponse'), {
          description: t('feedback.notifications.newResponseDesc'),
          id: `feedback-response-${payload.feedbackId}`,
          duration: 5000,
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
  }, [patientId, queryClient]);
}
