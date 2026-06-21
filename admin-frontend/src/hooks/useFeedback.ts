import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { feedbackService } from '../services/feedback.service';
import { extractErrorMessage, sanitizeApiMessage } from '../utils/errorHandler';
import { showToast } from '../utils/toast';
import type { FeedbackStatus } from '../types/feedback.types';

export const FEEDBACK_QUERY_KEY = ['admin-feedback'];

export function useFeedback() {
  return useQuery({
    queryKey: FEEDBACK_QUERY_KEY,
    queryFn: async () => {
      const result = await feedbackService.getAll();
      if (!result.isSuccess) throw new Error(result.errors?.[0] ?? 'Failed to load feedback.');
      return result.data ?? [];
    },
    staleTime: 1000 * 30,
  });
}

export function useRespondToFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, adminResponse }: { id: string; status: FeedbackStatus; adminResponse?: string | null }) =>
      feedbackService.update(id, { status, adminResponse }),
    onSuccess: (result) => {
      if (!result.isSuccess) {
        showToast.apiError(sanitizeApiMessage(result.errors?.[0]));
        return;
      }
      queryClient.invalidateQueries({ queryKey: FEEDBACK_QUERY_KEY });
      toast.success('Feedback updated.');
    },
    onError: (error) => {
      showToast.apiError(extractErrorMessage(error));
    },
  });
}
