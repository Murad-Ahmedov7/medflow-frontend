import { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, GuestRoute } from './ProtectedRoute';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { PageLoader } from '../components/ui/PageLoader';
import { SignInPage } from '../pages/auth/SignInPage';
import { DashboardPage } from '../pages/DashboardPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { CreateDoctorPage } from '../pages/doctors/CreateDoctorPage';
import { EditDoctorPage } from '../pages/doctors/EditDoctorPage';
import { DoctorsPage } from '../pages/doctors/DoctorsPage';
import { AppointmentsPage } from '../pages/appointments/AppointmentsPage';
import { MedicinesPage } from '../pages/medicines/MedicinesPage';
import { SuppliersPage } from '../pages/suppliers/SuppliersPage';
import { SupplierCataloguePage } from '../pages/suppliers/SupplierCataloguePage';
import { HospitalStockPage } from '../pages/stock/HospitalStockPage';
import { PrescriptionsPage } from '../pages/prescriptions/PrescriptionsPage';
import { MedicineOrdersPage } from '../pages/medicine-orders/MedicineOrdersPage';
import { ChatPage } from '../pages/chat/ChatPage';
import { FinancePage } from '../pages/finance/FinancePage';
import { StripeSuccessPage } from '../pages/finance/StripeSuccessPage';
import { DepartmentsPage } from '../pages/departments/DepartmentsPage';
import { PatientsPage } from '../pages/patients/PatientsPage';
import { FeedbackPage } from '../pages/feedback/FeedbackPage';

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
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/appointments" element={<AppointmentsPage />} />
            <Route path="/departments" element={<DepartmentsPage />} />
            <Route path="/medicines" element={<MedicinesPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/suppliers/:id/catalogue" element={<SupplierCataloguePage />} />
            <Route path="/stock" element={<HospitalStockPage />} />
            <Route path="/prescriptions" element={<PrescriptionsPage />} />
            <Route path="/medicine-orders" element={<MedicineOrdersPage />} />
            {/* Legacy URL — keep working for anyone with the old link bookmarked */}
            <Route path="/pharmacy-orders" element={<Navigate to="/medicine-orders" replace />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/finance" element={<FinancePage />} />
            <Route path="/finance/success" element={<StripeSuccessPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
