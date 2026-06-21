import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '../api/config';
import { tokenStorage } from '../utils/token';
import { CHATS_KEY, chatMessagesKey } from './useChats';
import type { ApiListResult } from '../types/api.types';
import type { MessageDto } from '../types/chat.types';

export function useChatHub(userId: string | undefined) {
  const qc = useQueryClient();
  const qcRef = useRef(qc);
  qcRef.current = qc;

  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    if (!userId) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/chat`, {
        accessTokenFactory: () => tokenStorage.getToken() ?? '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connectionRef.current = connection;

    connection.on('NewMessage', (message: MessageDto) => {
      const cacheKey = chatMessagesKey(message.chatId);
      // The cache holds ApiListResult<MessageDto> (the raw queryFn return).
      // select: r => r.data is applied on read — setQueryData must write the same shape.
      qcRef.current.setQueryData<ApiListResult<MessageDto>>(
        cacheKey,
        old => {
          if (!old) return old;
          return { ...old, data: [...old.data, message], totalCount: old.totalCount + 1 };
        },
      );
      qcRef.current.invalidateQueries({ queryKey: CHATS_KEY });
    });

    connection.on('MessagesRead', (payload: { chatId: string; readByUserId: string; lastReadMessageId: string | null }) => {
      // Update per-message readBy in the cache so ticks flip instantly without a refetch.
      const cacheKey = chatMessagesKey(payload.chatId);
      const cached = qcRef.current.getQueryData<ApiListResult<MessageDto>>(cacheKey);
      if (cached && payload.lastReadMessageId) {
        // Find the index of the last-read message; mark all messages up to that index as read.
        const lastIdx = cached.data.findIndex(m => m.id === payload.lastReadMessageId);
        const upTo    = lastIdx >= 0 ? lastIdx : cached.data.length - 1;
        const updated = cached.data.map((m, i) => {
          if (i > upTo) return m;
          if (m.senderId === payload.readByUserId) return m; // sender never appears in their own readBy
          if (m.readBy.includes(payload.readByUserId)) return m;
          return { ...m, readBy: [...m.readBy, payload.readByUserId] };
        });
        qcRef.current.setQueryData<ApiListResult<MessageDto>>(cacheKey, { ...cached, data: updated });
      }
      qcRef.current.invalidateQueries({ queryKey: CHATS_KEY });
    });

    connection.on('ChatCreated', () => {
      qcRef.current.invalidateQueries({ queryKey: CHATS_KEY });
    });

    connection.start().catch(() => { /* SignalR is an enhancement — fail silently */ });

    return () => {
      connection.stop();
      connectionRef.current = null;
    };
  }, [userId]); // qc intentionally excluded — accessed via stable ref

  return connectionRef;
}
