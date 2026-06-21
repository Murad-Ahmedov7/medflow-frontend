import axiosInstance from '../api/axiosInstance';
import { API_ENDPOINTS } from '../api/config';
import type { ApiResult, ApiListResult } from '../types/api.types';
import type { AdminFeedbackResponse, UpdateFeedbackRequest } from '../types/feedback.types';

export const feedbackService = {
  getAll: async () => {
    const res = await axiosInstance.get<ApiListResult<AdminFeedbackResponse>>(API_ENDPOINTS.feedback.base);
    return res.data;
  },
  update: async (id: string, data: UpdateFeedbackRequest) => {
    const res = await axiosInstance.patch<ApiResult<AdminFeedbackResponse>>(
      API_ENDPOINTS.feedback.byId(id),
      data,
    );
    return res.data;
  },
};
