import axiosInstance from '../api/axiosInstance';
import { API_ENDPOINTS } from '../api/config';
import type { ApiResult } from '../types/api.types';
import type {
  SignInRequest,
  SignInResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  ChangePasswordRequest,
} from '../types/auth.types';

export const authService = {
  signIn: async (data: SignInRequest) => {
    const response = await axiosInstance.post<ApiResult<SignInResponse>>(
      API_ENDPOINTS.auth.signIn,
      data
    );
    return response.data;
  },

  refreshToken: async (data: RefreshTokenRequest) => {
    const response = await axiosInstance.post<ApiResult<RefreshTokenResponse>>(
      API_ENDPOINTS.auth.refreshToken,
      data
    );
    return response.data;
  },

  changePassword: async (data: ChangePasswordRequest) => {
    const response = await axiosInstance.post<ApiResult<void>>(
      API_ENDPOINTS.auth.changePassword,
      data
    );
    return response.data;
  },
};
