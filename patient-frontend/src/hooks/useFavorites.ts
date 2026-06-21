import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { favoriteService } from '../services/favorite.service';
import { useAuthStore } from '../store/authStore';
import { extractErrorMessage, sanitizeApiMessage } from '../utils/errorHandler';

export const FAVORITE_IDS_KEY = ['favorites', 'ids'];
export const FAVORITES_KEY = ['favorites', 'list'];

export function useMyFavoriteIds() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: FAVORITE_IDS_KEY,
    queryFn: async () => {
      const result = await favoriteService.getMyFavoriteIds();
      if (!result.isSuccess) throw new Error(result.errors?.[0] ?? 'Failed to load favorites.');
      return result.data ?? [];
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
  });
}

export function useMyFavorites() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: FAVORITES_KEY,
    queryFn: async () => {
      const result = await favoriteService.getMyFavorites();
      if (!result.isSuccess) throw new Error(result.errors?.[0] ?? 'Failed to load favorites.');
      return result.data ?? [];
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (doctorId: string) => favoriteService.toggle(doctorId),

    // Optimistic update: flip the ID in cache immediately so the heart reacts
    // before the server responds.
    onMutate: async (doctorId: string) => {
      await queryClient.cancelQueries({ queryKey: FAVORITE_IDS_KEY });
      const previous = queryClient.getQueryData<string[]>(FAVORITE_IDS_KEY);
      queryClient.setQueryData<string[]>(FAVORITE_IDS_KEY, (old = []) =>
        old.includes(doctorId) ? old.filter((id) => id !== doctorId) : [...old, doctorId],
      );
      return { previous };
    },

    // Reconcile with server truth, then notify.
    onSuccess: (result, doctorId, context) => {
      if (!result.isSuccess) {
        // Server rejected — roll back optimistic update.
        queryClient.setQueryData(FAVORITE_IDS_KEY, context?.previous);
        toast.error(result.errors?.[0] ? sanitizeApiMessage(result.errors[0]) : 'Failed to update favorites.');
        return;
      }

      const isFavorited = result.data?.isFavorited ?? false;

      // Write the server-confirmed state into the IDs cache.
      queryClient.setQueryData<string[]>(FAVORITE_IDS_KEY, (old = []) => {
        const without = old.filter((id) => id !== doctorId);
        return isFavorited ? [...without, doctorId] : without;
      });

      // Invalidate the full favorites list so it stays in sync.
      queryClient.invalidateQueries({ queryKey: FAVORITES_KEY });

      if (isFavorited) {
        toast.success('Added to favorites');
      } else {
        toast.info('Removed from favorites');
      }
    },

    onError: (error, _doctorId, context) => {
      // Roll back optimistic update on network/server error.
      if (context?.previous !== undefined) {
        queryClient.setQueryData(FAVORITE_IDS_KEY, context.previous);
      }
      toast.error(extractErrorMessage(error));
    },
  });
}
