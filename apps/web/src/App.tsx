import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import { Toaster } from '@/components/ui/sonner';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';

import EmployeeSummary from '@/pages/hr/EmployeeSummary';
import EmployeeList from '@/pages/hr/EmployeeList';
import EmployeeDetails from '@/pages/hr/EmployeeDetails';
import UserManagement from '@/pages/admin/UserManagement';
import CountryThresholds from '@/pages/admin/CountryThresholds';
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
            <Route path="/" element={<FeatureErrorBoundary featureName="Dashboard"><Home /></FeatureErrorBoundary>} />
            <Route path="/calendar" element={<FeatureErrorBoundary featureName="Calendar"><CalendarPage /></FeatureErrorBoundary>} />
            <Route path="/compliance" element={<FeatureErrorBoundary featureName="Compliance"><ComplianceDetails /></FeatureErrorBoundary>} />
            <Route path="/requests" element={<FeatureErrorBoundary featureName="Requests"><MyRequests /></FeatureErrorBoundary>} />
          </Route>
        </Route>

        {/* HR Routes */}
        <Route element={<ProtectedRoute roles={['hr', 'admin']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/hr" element={<FeatureErrorBoundary featureName="Compliance Hub"><EmployeeSummary /></FeatureErrorBoundary>} />
            <Route path="/hr/employees" element={<FeatureErrorBoundary featureName="Employees"><EmployeeList /></FeatureErrorBoundary>} />
            <Route path="/hr/employees/:id" element={<FeatureErrorBoundary featureName="Employee Details"><EmployeeDetails /></FeatureErrorBoundary>} />
            <Route path="/admin/requests" element={<FeatureErrorBoundary featureName="Requests"><Requests /></FeatureErrorBoundary>} />
            <Route path="/admin/holidays" element={<FeatureErrorBoundary featureName="Holidays"><Holidays /></FeatureErrorBoundary>} />
          </Route>
        </Route>

        {/* Admin Routes */}
        <Route element={<ProtectedRoute roles={['admin', 'hr']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/admin/users" element={<FeatureErrorBoundary featureName="Users"><UserManagement /></FeatureErrorBoundary>} />
            <Route path="/admin/users/import" element={<FeatureErrorBoundary featureName="User Import"><UserImport /></FeatureErrorBoundary>} />
            <Route path="/admin/countries" element={<FeatureErrorBoundary featureName="Country Limits"><CountryThresholds /></FeatureErrorBoundary>} />
            <Route path="/admin/audit" element={<FeatureErrorBoundary featureName="Audit Logs"><AuditLogs /></FeatureErrorBoundary>} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
      <PWAInstallPrompt />
    </>
  );
}

export default App;
