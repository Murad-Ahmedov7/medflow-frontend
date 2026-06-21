import axiosInstance from '../api/axiosInstance';
import { API_ENDPOINTS } from '../api/config';
import type { ApiResult, ApiListResult } from '../types/api.types';
import type { FavoriteDoctorResponse, ToggleFavoriteResult } from '../types/favorite.types';

export const favoriteService = {
  toggle: async (doctorId: string) => {
    const res = await axiosInstance.post<ApiResult<ToggleFavoriteResult>>(
      API_ENDPOINTS.favorites.toggle(doctorId),
    );
    return res.data;
  },
  getMyFavorites: async () => {
    const res = await axiosInstance.get<ApiListResult<FavoriteDoctorResponse>>(
      API_ENDPOINTS.favorites.my,
    );
    return res.data;
  },
  getMyFavoriteIds: async () => {
    const res = await axiosInstance.get<ApiResult<string[]>>(API_ENDPOINTS.favorites.ids);
    return res.data;
  },
};
