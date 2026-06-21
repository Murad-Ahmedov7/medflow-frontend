import { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute, GuestRoute } from './ProtectedRoute';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { PageLoader } from '../components/ui/PageLoader';
import { SignInPage } from '../pages/auth/SignInPage';
import { DashboardPage } from '../pages/DashboardPage';
import { AppointmentsPage } from '../pages/AppointmentsPage';
import { PatientsPage } from '../pages/PatientsPage';
import { ExaminationPage } from '../pages/ExaminationPage';
import { MedicinesPage } from '../pages/MedicinesPage';
import { ChatPage } from '../pages/ChatPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/sign-in" element={<SignInPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/appointments" element={<AppointmentsPage />} />
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/examinations/:appointmentId" element={<ExaminationPage />} />
            <Route path="/medicines" element={<MedicinesPage />} />
            <Route path="/chat" element={<ChatPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
