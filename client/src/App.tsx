import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ToastProvider } from './context/ToastContext.js';
import { AppLayout } from './components/layout/AppLayout.js';

// Pages
import { LoginPage } from './pages/LoginPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { FdrRepositoryPage } from './pages/FdrRepositoryPage.js';
import { FdrDetailPage } from './pages/FdrDetailPage.js';
import { NewFdrSubmissionPage } from './pages/NewFdrSubmissionPage.js';
import { DocumentExtractionPage } from './pages/DocumentExtractionPage.js';
import { DuplicateReviewPage } from './pages/DuplicateReviewPage.js';
import { RiskAssessmentPage } from './pages/RiskAssessmentPage.js';
import { OfficerWorkbenchPage } from './pages/OfficerWorkbenchPage.js';
import { MaturityMonitoringPage } from './pages/MaturityMonitoringPage.js';
import { RenewalTrackingPage } from './pages/RenewalTrackingPage.js';
import { ReleaseRequestsPage } from './pages/ReleaseRequestsPage.js';
import { NotificationsCenterPage } from './pages/NotificationsCenterPage.js';
import { VoiceAssistantPage } from './pages/VoiceAssistantPage.js';
import { ReportsExportPage } from './pages/ReportsExportPage.js';
import { AuditTrailPage } from './pages/AuditTrailPage.js';
import { UserManagementPage } from './pages/UserManagementPage.js';
import { SystemConfigPage } from './pages/SystemConfigPage.js';
import { InstitutionProfilePage } from './pages/InstitutionProfilePage.js';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500 font-semibold">Authenticating session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="fdrs" element={<FdrRepositoryPage />} />
              <Route path="fdrs/new" element={<NewFdrSubmissionPage />} />
              <Route path="fdrs/:id" element={<FdrDetailPage />} />
              <Route path="documents" element={<DocumentExtractionPage />} />
              <Route path="verification" element={<Navigate to="/workbench" replace />} />
              <Route path="duplicates" element={<DuplicateReviewPage />} />
              <Route path="risk-assessment" element={<RiskAssessmentPage />} />
              <Route path="workbench" element={<OfficerWorkbenchPage />} />
              <Route path="maturity" element={<MaturityMonitoringPage />} />
              <Route path="renewals" element={<RenewalTrackingPage />} />
              <Route path="release-requests" element={<ReleaseRequestsPage />} />
              <Route path="notifications" element={<NotificationsCenterPage />} />
              <Route path="assistant" element={<VoiceAssistantPage />} />
              <Route path="reports" element={<ReportsExportPage />} />
              <Route path="audit" element={<AuditTrailPage />} />
              <Route path="users" element={<UserManagementPage />} />
              <Route path="settings" element={<SystemConfigPage />} />
              <Route path="my-institution" element={<InstitutionProfilePage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
