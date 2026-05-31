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
  withCredentials: false,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token!);
  });
  failedQueue = [];
}

// Attach JWT to every request
axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — refresh token flow
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const isAuthEndpoint = originalRequest.url?.includes('/api/auth/sign-in') ||
      originalRequest.url?.includes('/api/auth/refresh-token');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      const refreshToken = tokenStorage.getRefreshToken();

      if (!refreshToken || isTokenExpired(refreshToken)) {
        useAuthStore.getState().logout();
        showToast.sessionExpired();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post<ApiResult<RefreshTokenResponse>>(
          `${API_BASE_URL}${API_ENDPOINTS.auth.refreshToken}`,
          { refreshToken }
        );

        const newToken = response.data.data?.token;
        const newRefresh = response.data.data?.refreshToken;

        if (!newToken || !newRefresh) throw new Error('Invalid refresh response');

        tokenStorage.setToken(newToken);
        tokenStorage.setRefreshToken(newRefresh);
        axiosInstance.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        showToast.tokenRefreshFailed();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
