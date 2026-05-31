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
  const p = parseJwt(token);
  if (!p) return null;
  return {
    id: p.sub,
    email: p.email,
    fullName: p.name ?? p.email,
    role: p['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ?? p.role,
  };
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      token: tokenStorage.getToken(),
      refreshToken: tokenStorage.getRefreshToken(),
      user: (() => { const t = tokenStorage.getToken(); return t ? extractUser(t) : null; })(),
      isAuthenticated: !!tokenStorage.getToken(),
      isLoading: false,
      setTokens: (token, refreshToken) => {
        tokenStorage.setToken(token);
        tokenStorage.setRefreshToken(refreshToken);
        set({ token, refreshToken, user: extractUser(token), isAuthenticated: true });
      },
      logout: () => {
        tokenStorage.clearAll();
        set({ token: null, refreshToken: null, user: null, isAuthenticated: false });
      },
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'medflow-patient-auth',
      partialize: (s) => ({ token: s.token, refreshToken: s.refreshToken, user: s.user, isAuthenticated: s.isAuthenticated }),
    }
  )
);
