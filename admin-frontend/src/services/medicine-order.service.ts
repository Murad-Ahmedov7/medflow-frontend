import axiosInstance from '../api/axiosInstance';
import { API_ENDPOINTS } from '../api/config';
import type { ApiResult } from '../types/api.types';
import type { MedicineOrderListResponse, MedicineOrderResponse } from '../types/medicine-order.types';

export const medicineOrderService = {
  getAll: async (page = 1, pageSize = 100) => {
    const res = await axiosInstance.get<ApiResult<MedicineOrderListResponse>>(
      `${API_ENDPOINTS.medicineOrders.base}?page=${page}&pageSize=${pageSize}`,
    );
    return res.data;
  },
  updateStatus: async (id: string, status: number) => {
    const res = await axiosInstance.patch<ApiResult<MedicineOrderResponse>>(
      API_ENDPOINTS.medicineOrders.status(id),
      { status },
    );
    return res.data;
  },
};
