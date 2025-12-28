import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import { Toaster } from '@/components/ui/sonner';
import { CookieConsent } from '@/components/CookieConsent';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';

import EmployeeSummary from '@/pages/hr/EmployeeSummary';
import EmployeeList from '@/pages/hr/EmployeeList';
import EmployeeDetails from '@/pages/hr/EmployeeDetails';
import UserManagement from '@/pages/admin/UserManagement';
import CountryThresholds from '@/pages/admin/CountryThresholds';
import NotificationHistory from '@/pages/admin/NotificationHistory';
import AuditLogs from '@/pages/admin/AuditLogs';
import UserImport from '@/pages/admin/UserImport';
import Holidays from '@/pages/admin/Holidays';
import Requests from '@/pages/admin/Requests';
import MyRequests from '@/pages/MyRequests';

// Placeholder pages
import Home from '@/pages/Home';
import CalendarPage from '@/pages/CalendarPage';
import ComplianceDetails from '@/pages/ComplianceDetails';

import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import CtaPage from "@/pages/CtaPage";

// Legal pages
import PrivacyPolicy from '@/pages/legal/PrivacyPolicy';
import TermsOfService from '@/pages/legal/TermsOfService';
import CookiePolicy from '@/pages/legal/CookiePolicy';

function App() {
  return (
    <>
      <Toaster />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/cta" element={<CtaPage />} />

        {/* Legal Pages (Public) */}
        <Route path="/legal/privacy" element={<PrivacyPolicy />} />
        <Route path="/legal/terms" element={<TermsOfService />} />
        <Route path="/legal/cookies" element={<CookiePolicy />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/compliance" element={<ComplianceDetails />} />
            <Route path="/requests" element={<MyRequests />} />
          </Route>
        </Route>

        {/* HR Routes */}
        <Route element={<ProtectedRoute roles={['hr', 'admin']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/hr" element={<EmployeeSummary />} />
            <Route path="/hr/employees" element={<EmployeeList />} />
            <Route path="/hr/employees/:id" element={<EmployeeDetails />} />
            <Route path="/admin/requests" element={<Requests />} />
            <Route path="/admin/holidays" element={<Holidays />} />
          </Route>
        </Route>

        {/* Admin Routes */}
        <Route element={<ProtectedRoute roles={['admin', 'hr']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/users/import" element={<UserImport />} />
            <Route path="/admin/countries" element={<CountryThresholds />} />
            <Route path="/admin/notifications/stats" element={<NotificationHistory />} />
            <Route path="/admin/audit" element={<AuditLogs />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
      <CookieConsent />
      <PWAInstallPrompt />
    </>
  );
}

export default App;
