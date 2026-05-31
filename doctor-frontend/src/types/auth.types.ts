import type { UserRole } from './api.types';

export interface SignInRequest {
  email: string;
  password: string;
  requiredPortal: 'Admin' | 'Doctor' | 'Patient';
}

export interface SignInResponse {
  token: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
