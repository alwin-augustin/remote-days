import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import { Toaster } from '@/components/ui/sonner';

import EmployeeSummary from '@/pages/hr/EmployeeSummary';
import UserManagement from '@/pages/admin/UserManagement';
import CountryThresholds from '@/pages/admin/CountryThresholds';
import NotificationHistory from '@/pages/admin/NotificationHistory';
import AuditLogs from '@/pages/admin/AuditLogs';

// Placeholder pages
import Home from '@/pages/Home';
import CalendarPage from '@/pages/CalendarPage';

import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import CtaPage from "@/pages/CtaPage";

function App() {
  return (
    <>
      <Toaster />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/cta" element={<CtaPage />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/calendar" element={<CalendarPage />} />
          </Route>
        </Route>

        {/* HR Routes */}
        <Route element={<ProtectedRoute roles={['hr', 'admin']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/hr" element={<EmployeeSummary />} />
          </Route>
        </Route>

        {/* Admin Routes */}
        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/countries" element={<CountryThresholds />} />
            <Route path="/admin/notifications/stats" element={<NotificationHistory />} />
            <Route path="/admin/audit" element={<AuditLogs />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
