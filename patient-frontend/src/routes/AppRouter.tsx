import { Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { WebsiteLayout } from '../layouts/WebsiteLayout';
import { Spinner } from '../components/ui/Spinner';
import { useAuthStore } from '../store/authStore';

import { HomePage } from '../pages/HomePage';
import { AboutPage } from '../pages/AboutPage';
import { DoctorsPage } from '../pages/DoctorsPage';
import { ServicesPage } from '../pages/ServicesPage';
import { ContactPage } from '../pages/ContactPage';
import { ProfilePage } from '../pages/ProfilePage';
import { SignInPage } from '../pages/auth/SignInPage';
import { SignUpPage } from '../pages/auth/SignUpPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { NotFoundPage } from '../pages/NotFoundPage';

function GuestOnly() {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
}

function AuthRequired() {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/sign-in" replace />;
  return <Outlet />;
}

function PageFallback() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Spinner size="md" />
    </div>
  );
}

export function AppRouter() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<WebsiteLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/doctors" element={<DoctorsPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/contact" element={<ContactPage />} />

          <Route element={<AuthRequired />}>
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route element={<GuestOnly />}>
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
