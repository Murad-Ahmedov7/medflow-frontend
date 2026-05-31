import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function ProtectedRoute({ redirectTo = '/sign-in' }: { redirectTo?: string }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to={redirectTo} replace />;
  return <Outlet />;
}

export function GuestRoute({ redirectTo = '/' }: { redirectTo?: string }) {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to={redirectTo} replace />;
  return <Outlet />;
}
