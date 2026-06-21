import axiosInstance from '../api/axiosInstance';
import { API_ENDPOINTS } from '../api/config';
import type { ApiResult, ApiListResult } from '../types/api.types';
import type { ChatSummaryDto, MessageDto, SendMessageRequest, GetOrCreateChatRequest } from '../types/chat.types';

export const chatService = {
  getMyChats: async () => {
    const response = await axiosInstance.get<ApiListResult<ChatSummaryDto>>(API_ENDPOINTS.chat.base);
    return response.data;
  },

  getMessages: async (chatId: string, pageNumber = 1, pageSize = 30) => {
    const response = await axiosInstance.get<ApiListResult<MessageDto>>(
      API_ENDPOINTS.chat.messages(chatId),
      { params: { pageNumber, pageSize } },
    );
    return response.data;
  },

  sendMessage: async (chatId: string, data: SendMessageRequest) => {
    const response = await axiosInstance.post<ApiResult<MessageDto>>(
      API_ENDPOINTS.chat.messages(chatId),
      data,
    );
    return response.data;
  },

  markRead: async (chatId: string) => {
    const response = await axiosInstance.post<ApiResult<null>>(API_ENDPOINTS.chat.read(chatId));
    return response.data;
  },

  getOrCreate: async (data: GetOrCreateChatRequest) => {
    const response = await axiosInstance.post<ApiResult<ChatSummaryDto>>(
      API_ENDPOINTS.chat.getOrCreate,
      data,
    );
    return response.data;
  },
};
