import axiosInstance from '../api/axiosInstance';
import { API_ENDPOINTS } from '../api/config';
import type { ApiResult } from '../types/api.types';
import type { SignInRequest, SignInResponse, ChangePasswordRequest } from '../types/auth.types';

export const authService = {
  signIn: async (data: SignInRequest) => {
    const res = await axiosInstance.post<ApiResult<SignInResponse>>(API_ENDPOINTS.auth.signIn, data);
    return res.data;
  },
  changePassword: async (data: ChangePasswordRequest) => {
    const res = await axiosInstance.post<ApiResult<void>>(API_ENDPOINTS.auth.changePassword, data);
    return res.data;
  },
};
