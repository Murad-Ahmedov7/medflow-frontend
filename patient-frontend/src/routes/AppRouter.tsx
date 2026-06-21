import { Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { WebsiteLayout } from '../layouts/WebsiteLayout';
import { Spinner } from '../components/ui/Spinner';
import { useAuthStore } from '../store/authStore';

import { HomePage } from '../pages/HomePage';
import { AboutPage } from '../pages/AboutPage';
import { DoctorsPage } from '../pages/DoctorsPage';
import { DoctorDetailPage } from '../pages/DoctorDetailPage';
import { DoctorComparePage } from '../pages/DoctorComparePage';

import { ContactPage } from '../pages/ContactPage';
import { ProfilePage } from '../pages/ProfilePage';
import { SignInPage } from '../pages/auth/SignInPage';
import { SignUpPage } from '../pages/auth/SignUpPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { MyAppointmentsPage } from '../pages/MyAppointmentsPage';
import { HealthRecordsPage } from '../pages/HealthRecordsPage';
import { SettingsPage } from '../pages/SettingsPage';
import { ChatPage } from '../pages/ChatPage';
import { FeedbackPage } from '../pages/FeedbackPage';
import { WalletPage } from '../pages/WalletPage';
import { WalletSuccessPage } from '../pages/WalletSuccessPage';
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
          <Route path="/doctors/compare" element={<DoctorComparePage />} />
          <Route path="/doctors/:id" element={<DoctorDetailPage />} />
          <Route path="/contact" element={<ContactPage />} />

          <Route element={<AuthRequired />}>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/appointments" element={<MyAppointmentsPage />} />
            <Route path="/health-records" element={<HealthRecordsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/wallet/success" element={<WalletSuccessPage />} />
          </Route>

          {/* Feedback is publicly accessible; the page handles unauthenticated state internally */}
          <Route path="/feedback" element={<FeedbackPage />} />

          {/* Chat is accessible to everyone; page itself handles unauthenticated state */}
          <Route path="/chat" element={<ChatPage />} />
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
