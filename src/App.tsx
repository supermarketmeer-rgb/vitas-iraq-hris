import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { OfflineNotification } from './components/OfflineNotification';
import { MobileEmployeeBottomNav } from './components/MobileEmployeeBottomNav';
import { Login } from './components/Login';
import { Category1AuthView } from './views/Category1AuthView';
import { Category2DashboardView } from './views/Category2DashboardView';
import { Category3EmployeeView } from './views/Category3EmployeeView';
import { Category4LeaveView } from './views/Category4LeaveView';
import { Category5PayrollView } from './views/Category5PayrollView';
import { Category6RecruitmentView } from './views/Category6RecruitmentView';
import { Category7PerformanceView } from './views/Category7PerformanceView';
import { Category8AssetsDocumentsView } from './views/Category8AssetsDocumentsView';
import { Category9RiskComplianceView } from './views/Category9RiskComplianceView';
import { Category10SystemDevView } from './views/Category10SystemDevView';
import { Category11SupportHelpView } from './views/Category11SupportHelpView';
import { DatabaseSchemaViewer } from './components/DatabaseSchemaViewer';
import { SettingsSecurityView } from './views/SettingsSecurityView';
import { TaxSecurityModuleView } from './views/TaxSecurityModuleView';
import { ArchiveModuleView } from './views/ArchiveModuleView';
import { DynamicReportBuilder } from './components/DynamicReportBuilder';
import { CandidatePortal } from './components/recruitment/CandidatePortal';
import { EmployeePortal } from './components/EmployeePortal';
import { EmployeePortalView } from './views/EmployeePortalView';
import { EmployeeApp } from './employee-app/EmployeeApp';
import { useApp } from './context/AppContext';

function AppContent() {
  const { activeModuleId, isSidebarOpen, theme } = useApp();
  const location = useLocation();
  const isPublicPortal = location.pathname === '/apply';
  const isDark = theme === 'dark';

  const renderActiveView = () => {
    console.log('renderActiveView called with activeModuleId:', activeModuleId);
    switch (activeModuleId) {
      // Category 1: Authentication & Security
      case 'auth-secure':
      case 'auth-sso':
      case 'auth-biometric':
      case 'auth-login':
      case 'auth-register':
      case 'auth-forgot-password':
      case 'auth-verify-email':
      case 'auth-reset-password':
      case 'auth-2fa':
      case 'auth-token':
        return <Category1AuthView />;

      // Category 2: Dashboard
      case 'dash-overview':
      case 'dash-exec-1':
      case 'dash-exec-2':
      case 'dash-ess':
      case 'dash-search':
        return <Category2DashboardView />;

      // Category 3: Employee Management
      case 'emp-directory':
      case 'emp-hr-directory':
      case 'emp-add':
      case 'emp-onboarding':
      case 'emp-profile':
      case 'emp-organization':
      case 'emp-contracts':
      case 'emp-travel':
      case 'emp-transfer':
      case 'emp-exit':
      case 'emp-branches':
      case 'emp-company-profile':
      case 'emp-calendar':
      case 'emp-news':
        return <Category3EmployeeView />;

      // Category 4: Leave Management
      case 'cat-4-leave':
      case 'leave-dashboard':
      case 'leave-attendance':
      case 'leave-timesheets':
      case 'leave-apply':
      case 'leave-directory':
      case 'leave-schedule':
      case 'leave-approvals':
      case 'leave-biometric-settings':
      case 'leave-db-schema':
      case 'leave-request':
      case 'leave-approval':
      case 'leave-calendar':
      case 'leave-balance':
      case 'leave-policy':
      case 'leave-types':
      case 'attendance-system':
      case 'timesheet':
        return <Category4LeaveView />;

      case 'payroll-social-tax-engine':
      case 'pay-social-security':
      case 'pay-tax-engine':
        return <TaxSecurityModuleView />;

      // Category 5: Payroll & Compensation
      case 'payroll-mgmt':
      case 'payroll-payslip':
      case 'payroll-approvals':
      case 'payroll-claims':
      case 'pay-dashboard':
      case 'pay-salary':
      case 'pay-slip':
      case 'pay-bonus':
      case 'pay-deductions':
      case 'pay-tax':
      case 'pay-benefits':
      case 'pay-reimbursement':
        return <Category5PayrollView />;

      // Category 6: Recruitment
      case 'recruit-dash':
      case 'recruit-ats':
      case 'recruit-candidate-profile':
      case 'recruit-candidate-portal':
        return <Category6RecruitmentView />;

      // Category 7: Performance Management & Training
      case 'perf-mgmt':
      case 'perf-self-appraisal':
      case 'perf-review':
      case 'train-my-learning':
      case 'train-courses-analytics':
      case 'perf-dashboard':
      case 'perf-goals':
      case 'perf-reviews':
      case 'perf-feedback':
      case 'perf-360':
      case 'perf-idp':
        return <Category7PerformanceView />;

      // Category 8: Assets & Documents
      case 'asset-inventory':
      case 'asset-allocation':
      case 'asset-maintenance':
      case 'asset-return':
      case 'doc-repository':
      case 'doc-templates':
      case 'doc-signature':
      case 'doc-compliance':
        return <Category8AssetsDocumentsView />;

      // Category 9: Risk & Compliance
      case 'risk-dashboard':
      case 'risk-assessment':
      case 'risk-policies':
      case 'risk-audit':
      case 'risk-incident':
      case 'risk-training':
        return <Category9RiskComplianceView />;

      // Category 10: System Development
      case 'sys-develop':
      case 'sys-test':
      case 'sys-deploy':
      case 'sys-monitor':
      case 'sys-api':
      case 'sys-logs':
        return <Category10SystemDevView />;

      // Category 11: Support & Help
      case 'sup-faq':
      case 'sup-tickets':
      case 'sup-training':
      case 'sup-guides':
      case 'sup-contact':
      case 'supp-agent-desk':
      case 'supp-knowledge-base':
      case 'supp-guide-center':
      case 'supp-emp-handbook':
      case 'supp-news-admin':
      case 'supp-notif-settings':
      case 'supp-notif-center':
      case 'supp-profile-settings':
      case 'supp-internal-chat':
      case 'supp-mobile-app':
      case 'supp-enterprise-nexus':
      case 'supp-nexus-mobile':
        return <Category11SupportHelpView />;
      
      // Employee Portal (internal view)
      case 'supp-emp-portal':
        return <EmployeePortalView />;

      // Archive Module
      case 'archive-general':
      case 'archive-employee':
      case 'archive-documents':
      case 'archive-reports':
        return <ArchiveModuleView />;

      // Settings & Security
      case 'sys-settings-security':
        console.log('Matched sys-settings-security case, rendering SettingsSecurityView');
        return <SettingsSecurityView />;
      case 'settings-general':
      case 'settings-security':
      case 'settings-users':
      case 'settings-roles':
      case 'settings-audit':
        console.log('Matched other settings case, rendering SettingsSecurityView');
        return <SettingsSecurityView />;

      // Special Tools
      case 'sys-database':
        return <DatabaseSchemaViewer />;
      case 'sys-dynamic-reports':
        return <DynamicReportBuilder />;

      default:
        return <Category2DashboardView />;
    }
  };

  // Public portal view - no sidebar, no header
  if (isPublicPortal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white">
        <ErrorBoundary>
          <div className="container mx-auto p-4 py-8">
            <CandidatePortal />
          </div>
        </ErrorBoundary>
      </div>
    );
  }

  // Admin / Employee dashboard view
  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0a0c10] text-white' : 'bg-slate-100 text-slate-900'} transition-colors duration-200`}>
      <ErrorBoundary>
        <OfflineNotification />
        <Header />
        <div className="flex min-h-[calc(100vh-4rem)]">
          {isSidebarOpen && <Sidebar />}
          <main className="flex-1 overflow-auto p-4 sm:p-6 pb-20 sm:pb-6">
            {renderActiveView()}
          </main>
        </div>
        <MobileEmployeeBottomNav />
        <GlobalSearchModal />
      </ErrorBoundary>
    </div>
  );
}

// Public Candidate Portal (no sidebar, no header)
function PublicCandidatePortal() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white">
      <ErrorBoundary>
        <div className="container mx-auto p-4 py-8">
          <CandidatePortal />
        </div>
      </ErrorBoundary>
    </div>
  );
}

// Public Employee Portal (no sidebar, no header)
function PublicEmployeePortal() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white">
      <ErrorBoundary>
        <div className="container mx-auto p-4 py-8">
          <EmployeePortal />
        </div>
      </ErrorBoundary>
    </div>
  );
}

// New Employee App (completely separate)
function NewEmployeeApp() {
  return (
    <ErrorBoundary>
      <EmployeeApp />
    </ErrorBoundary>
  );
}

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useApp();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          {/* Login Page */}
          <Route path="/login" element={<Login />} />
          
          {/* Public Candidate Portal */}
          <Route path="/apply" element={<PublicCandidatePortal />} />
          
          {/* Public Employee Portal */}
          <Route path="/portal" element={<PublicEmployeePortal />} />
          
          {/* New Employee App (completely separate) */}
          <Route path="/employee-app/*" element={<NewEmployeeApp />} />
          
          {/* Admin Dashboard (protected route) */}
          <Route
            path="*"
            element={
              <ProtectedRoute>
                <AppContent />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AppProvider>
  );
}
