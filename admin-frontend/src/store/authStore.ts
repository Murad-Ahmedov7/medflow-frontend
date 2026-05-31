import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { tokenStorage, parseJwt } from '../utils/token';
import type { AuthState, AuthUser } from '../types/auth.types';

interface AuthActions {
  setTokens: (token: string, refreshToken: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

function extractUser(token: string): AuthUser | null {
  const payload = parseJwt(token);
  if (!payload) return null;
  return {
    id: payload.sub,
    email: payload.email,
    fullName: payload.name ?? payload.email,
    role: payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ?? payload.role,
  };
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      token: tokenStorage.getToken(),
      refreshToken: tokenStorage.getRefreshToken(),
      user: (() => {
        const t = tokenStorage.getToken();
        return t ? extractUser(t) : null;
      })(),
      isAuthenticated: !!tokenStorage.getToken(),
      isLoading: false,

      setTokens: (token, refreshToken) => {
        tokenStorage.setToken(token);
        tokenStorage.setRefreshToken(refreshToken);
        const user = extractUser(token);
        set({ token, refreshToken, user, isAuthenticated: true });
      },

      logout: () => {
        tokenStorage.clearAll();
        set({ token: null, refreshToken: null, user: null, isAuthenticated: false });
      },

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'medflow-admin-auth',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
