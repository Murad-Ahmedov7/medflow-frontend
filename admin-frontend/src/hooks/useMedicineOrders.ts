import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { medicineOrderService } from '../services/medicine-order.service';
import { extractErrorMessage, sanitizeApiMessage } from '../utils/errorHandler';
import { showToast } from '../utils/toast';

export const MEDICINE_ORDERS_QUERY_KEY = ['admin-medicine-orders'];

export function useMedicineOrders() {
  return useQuery({
    queryKey: MEDICINE_ORDERS_QUERY_KEY,
    queryFn: async () => {
      const result = await medicineOrderService.getAll();
      if (!result.isSuccess) throw new Error(result.errors?.[0] ?? 'Failed to load medicine orders.');
      return result.data?.items ?? [];
    },
    staleTime: 1000 * 30,
  });
}

export function useUpdateMedicineOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: number }) =>
      medicineOrderService.updateStatus(id, status),
    onSuccess: (result) => {
      if (!result.isSuccess) {
        showToast.apiError(sanitizeApiMessage(result.errors?.[0]));
        return;
      }
      queryClient.invalidateQueries({ queryKey: MEDICINE_ORDERS_QUERY_KEY });
      toast.success('Medicine order updated.');
    },
    onError: (error) => {
      showToast.apiError(extractErrorMessage(error));
    },
  });
}
