import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { chatService } from '../services/chat.service';
import type { GetOrCreateChatRequest } from '../types/chat.types';

export const CHATS_KEY = ['chats'] as const;
export const chatMessagesKey = (chatId: string) => ['chat-messages', chatId] as const;

export function useMyChats() {
  return useQuery({
    queryKey: CHATS_KEY,
    queryFn: () => chatService.getMyChats(),
    select: r => r.data,
    staleTime: 30_000,
  });
}

export function useChatMessages(chatId: string | undefined) {
  return useQuery({
    queryKey: chatMessagesKey(chatId ?? ''),
    queryFn: () => chatService.getMessages(chatId!),
    select: r => r.data,
    enabled: !!chatId,
  });
}

export function useSendMessage(chatId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => chatService.sendMessage(chatId, { body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chatMessagesKey(chatId) });
      qc.invalidateQueries({ queryKey: CHATS_KEY });
    },
    onError: () => toast.error('Failed to send message'),
  });
}

export function useMarkRead(chatId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => chatService.markRead(chatId),
    onSuccess: () => qc.invalidateQueries({ queryKey: CHATS_KEY }),
  });
}

export function useGetOrCreateChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: GetOrCreateChatRequest) => chatService.getOrCreate(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: CHATS_KEY }),
  });
}
