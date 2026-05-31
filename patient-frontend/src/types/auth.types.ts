import type { UserRole } from './api.types';

export interface SignInRequest {
  email: string;
  password: string;
  requiredPortal: 'Admin' | 'Doctor' | 'Patient';
}

export interface SignUpRequest {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface SignInResponse {
  token: string;
  refreshToken: string;
}

export interface SignUpResponse {
  id: string;
  fullName: string;
  email: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
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
