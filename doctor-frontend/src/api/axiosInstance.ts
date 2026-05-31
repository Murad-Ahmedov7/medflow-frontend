import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from './config';
import { tokenStorage, isTokenExpired } from '../utils/token';
import { showToast } from '../utils/toast';
import { useAuthStore } from '../store/authStore';
import type { ApiResult } from '../types/api.types';
import type { RefreshTokenResponse } from '../types/auth.types';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
}

axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosInstance.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const isAuthEndpoint = original.url?.includes('/api/auth/sign-in') ||
      original.url?.includes('/api/auth/refresh-token');
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      const refresh = tokenStorage.getRefreshToken();
      if (!refresh || isTokenExpired(refresh)) {
        useAuthStore.getState().logout();
        showToast.sessionExpired();
        return Promise.reject(error);
      }
      if (isRefreshing) {
        return new Promise((resolve, reject) => failedQueue.push({ resolve, reject })).then(
          (token) => { original.headers.Authorization = `Bearer ${token}`; return axiosInstance(original); }
        );
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const res = await axios.post<ApiResult<RefreshTokenResponse>>(
          `${API_BASE_URL}${API_ENDPOINTS.auth.refreshToken}`, { refreshToken: refresh }
        );
        const newToken = res.data.data?.token;
        const newRefresh = res.data.data?.refreshToken;
        if (!newToken || !newRefresh) throw new Error('Invalid refresh');
        tokenStorage.setToken(newToken);
        tokenStorage.setRefreshToken(newRefresh);
        axiosInstance.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(original);
      } catch (e) {
        processQueue(e, null);
        useAuthStore.getState().logout();
        showToast.tokenRefreshFailed();
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
