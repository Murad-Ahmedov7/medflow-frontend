import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedbackService } from '../services/feedback.service';
import { extractErrorMessage, sanitizeApiMessage } from '../utils/errorHandler';
import { showToast } from '../utils/toast';
import { useAuthStore } from '../store/authStore';
import type { CreateFeedbackRequest } from '../types/feedback.types';

const MY_FEEDBACK_KEY = ['feedback', 'my'];

export function useMyFeedback() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: MY_FEEDBACK_KEY,
    queryFn: async () => {
      const result = await feedbackService.getMy();
      if (!result.isSuccess) throw new Error(result.errors?.[0] ?? 'Failed to load feedback.');
      return result.data ?? [];
    },
    staleTime: 1000 * 60 * 2,
    enabled: isAuthenticated,
  });
}

export function useSubmitFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFeedbackRequest) => feedbackService.create(data),
    onSuccess: (result) => {
      if (!result.isSuccess) {
        showToast.apiError(sanitizeApiMessage(result.errors?.[0]));
        return;
      }
      queryClient.invalidateQueries({ queryKey: MY_FEEDBACK_KEY });
    },
    onError: (error) => {
      showToast.apiError(extractErrorMessage(error));
    },
  });
}
