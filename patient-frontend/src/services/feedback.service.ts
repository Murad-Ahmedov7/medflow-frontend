import axiosInstance from '../api/axiosInstance';
import { API_ENDPOINTS } from '../api/config';
import type { ApiResult, ApiListResult } from '../types/api.types';
import type { FeedbackResponse, CreateFeedbackRequest } from '../types/feedback.types';

export const feedbackService = {
  create: async (data: CreateFeedbackRequest) => {
    const res = await axiosInstance.post<ApiResult<FeedbackResponse>>(API_ENDPOINTS.feedback.base, data);
    return res.data;
  },
  getMy: async () => {
    const res = await axiosInstance.get<ApiListResult<FeedbackResponse>>(API_ENDPOINTS.feedback.my);
    return res.data;
  },
};
