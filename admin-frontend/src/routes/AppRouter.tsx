import { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute, GuestRoute } from './ProtectedRoute';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { PageLoader } from '../components/ui/PageLoader';
import { SignInPage } from '../pages/auth/SignInPage';
import { DashboardPage } from '../pages/DashboardPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { CreateDoctorPage } from '../pages/doctors/CreateDoctorPage';
import { EditDoctorPage } from '../pages/doctors/EditDoctorPage';
import { DoctorsPage } from '../pages/doctors/DoctorsPage';

export function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Guest routes */}
        <Route element={<GuestRoute />}>
          <Route path="/sign-in" element={<SignInPage />} />
        </Route>

        {/* Protected dashboard routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/doctors" element={<DoctorsPage />} />
            <Route path="/doctors/create" element={<CreateDoctorPage />} />
            <Route path="/doctors/:id/edit" element={<EditDoctorPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
