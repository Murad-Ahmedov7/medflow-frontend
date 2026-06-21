import axiosInstance from '../api/axiosInstance';
import { API_ENDPOINTS } from '../api/config';
import type { ApiResult } from '../types/api.types';
import type {
  SignInRequest, SignInResponse,
  SignUpRequest, SignUpResponse,
} from '../types/auth.types';

export interface ForgotPasswordRequest   { email: string; }
export interface ResetPasswordRequest    { token: string; newPassword: string; confirmPassword: string; }
export interface ChangePasswordRequest   { currentPassword: string; newPassword: string; confirmPassword: string; }

// Backend returns Result (no data) for both — isSuccess + errors only
type VoidResult = Omit<ApiResult<never>, 'data'> & { data: null };

export const authService = {
  signIn: async (data: SignInRequest) => {
    const res = await axiosInstance.post<ApiResult<SignInResponse>>(API_ENDPOINTS.auth.signIn, data);
    return res.data;
  },
  signUp: async (data: SignUpRequest) => {
    const res = await axiosInstance.post<ApiResult<SignUpResponse>>(API_ENDPOINTS.auth.signUp, data);
    return res.data;
  },
  forgotPassword: async (data: ForgotPasswordRequest) => {
    const res = await axiosInstance.post<VoidResult>(API_ENDPOINTS.auth.forgotPassword, data);
    return res.data;
  },
  resetPassword: async (data: ResetPasswordRequest) => {
    const res = await axiosInstance.post<VoidResult>(API_ENDPOINTS.auth.resetPassword, data);
    return res.data;
  },
  changePassword: async (data: ChangePasswordRequest) => {
    const res = await axiosInstance.post<VoidResult>(API_ENDPOINTS.auth.changePassword, data);
    return res.data;
  },
};
