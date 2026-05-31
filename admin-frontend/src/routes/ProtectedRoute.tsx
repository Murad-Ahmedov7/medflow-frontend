import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  redirectTo?: string;
}

export function ProtectedRoute({ redirectTo = '/sign-in' }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}

export function GuestRoute({ redirectTo = '/' }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
