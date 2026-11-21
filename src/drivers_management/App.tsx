import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { DriverAppView } from './components/DriverAppView';
import { TripsManager } from './components/TripsManager';
import { TripApprovalModal } from './components/TripApprovalModal';
import { LiveTrackingDashboard } from './components/LiveTrackingDashboard';
import { VehiclesManager } from './components/VehiclesManager';
import { DriversManager } from './components/DriversManager';
import { OfficesManager } from './components/OfficesManager';
import { ReportsManager } from './components/ReportsManager';
import { UsersManager } from './components/UsersManager';
import { SettingsManager } from './components/SettingsManager';
import { WorkflowGuideModal } from './components/WorkflowGuideModal';
import { User, Trip, NotificationItem, Role } from './types';
import { DtmsStorage } from './utils/storage';
import { isGPSTrackingEnabled } from './utils/gpsTracker';
import { hydrateDataFromMySQL } from './utils/apiSync';
import { DtmsHeaderProvider } from './context/DtmsHeaderContext';
import './index.css';

export type NavSection =
  | 'dashboard'
  | 'trips'
  | 'create_trip'
  | 'live_tracking'
  | 'vehicles'
  | 'drivers'
  | 'offices'
  | 'reports'
  | 'users'
  | 'settings'
  | 'driver_app';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

const DTMS_ROLES: Role[] = ['admin', 'supervisor', 'security', 'viewer', 'driver'];

const normalizeRole = (role: unknown): Role =>
  DTMS_ROLES.includes(role as Role) ? (role as Role) : 'supervisor';

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('DTMS ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[500px] w-full bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center font-['Cairo',sans-serif] rounded-2xl">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl">
            <div className="w-14 h-14 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2 text-white">حدث خطأ أثناء عرض موديول السائقين</h2>
            <p className="text-sm text-gray-300 mb-4">
              واجه موديول السائقين خطأ غير متوقع. يرجى النقر أدناه لإعادة تهيئة العرض.
            </p>
            {this.state.error?.message && (
              <div className="p-3 bg-slate-950/80 rounded-xl text-xs text-red-300 font-mono text-left mb-6 overflow-x-auto max-h-28">
                {this.state.error.message}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer"
              >
                إعادة المحاولة
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const {
    currentUser: hrisUser,
    theme: hrisTheme,
    language: hrisLanguage,
    activeModuleId
  } = useApp();

  // Initialize DTMS storage defaults if empty
  useEffect(() => {
    DtmsStorage.init();
  }, []);

  const theme = hrisTheme || 'light';

  // Map HRIS User to DTMS User
  const currentUser: User = useMemo(() => {
    if (hrisUser) {
      const isSuper = ['Super Admin', 'HR Manager', 'IT Admin', 'Admin'].includes(hrisUser.role || '');
      const isSupervisor = ['Branch Manager', 'Supervisor', 'Department Head'].includes(hrisUser.role || '');
      const isDriver = hrisUser.role === 'Driver';
      const role: Role = isSuper ? 'admin' : isSupervisor ? 'supervisor' : isDriver ? 'driver' : 'supervisor';

      return {
        id: String(hrisUser.id || '1'),
        name: hrisUser.name || (hrisUser as any).fullNameAr || (hrisUser as any).fullName || 'مدير النظام',
        username: hrisUser.employeeId || 'admin',
        email: hrisUser.email || 'admin@vitasiraq.com',
        role,
        office_id: '1',
        status: 'active',
        preferred_language: hrisLanguage === 'en' ? 'en' : 'ar',
        can_view_reports: true,
        driver_mode: 'simple',
        created_at: new Date().toISOString()
      };
    }
    return {
      id: '1',
      name: 'مدير النظام',
      username: 'admin',
      email: 'admin@vitasiraq.com',
      role: 'admin',
      office_id: '1',
      status: 'active',
      preferred_language: 'ar',
      can_view_reports: true,
      driver_mode: 'simple',
      created_at: new Date().toISOString()
    };
  }, [hrisUser, hrisLanguage]);

  // Section determination from HRIS activeModuleId
  const getSectionFromModuleId = (modId?: string): NavSection => {
    switch (modId) {
      case 'drivers-mgmt':
      case 'cat-drivers':
        return 'dashboard';
      case 'drivers-trips':
        return 'trips';
      case 'drivers-offices':
        return 'offices';
      case 'drivers-vehicles':
        return 'vehicles';
      case 'drivers-list':
        return 'drivers';
      case 'drivers-tracking':
        return 'live_tracking';
      case 'drivers-app':
        return 'driver_app';
      case 'drivers-users':
        return 'users';
      case 'drivers-reports':
      case 'drivers-payroll':
        return 'reports';
      case 'drivers-settings':
        return 'settings';
      case 'drivers-guide':
        return 'dashboard';
      default:
        return 'dashboard';
    }
  };

  const [currentSection, setCurrentSection] = useState<NavSection>(() =>
    getSectionFromModuleId(activeModuleId)
  );

  // Sync section when activeModuleId changes in HRIS Sidebar
  useEffect(() => {
    if (activeModuleId === 'drivers-guide') {
      setShowWorkflowGuideModal(true);
    }
    setCurrentSection(getSectionFromModuleId(activeModuleId));
  }, [activeModuleId]);

  const navigateToSection = (section: NavSection) => {
    const canViewReports = currentUser.role === 'admin' || Boolean(currentUser.can_view_reports);
    if (section === 'reports' && !canViewReports) return;
    if (section === 'settings' && currentUser.role !== 'admin') return;
    if (currentUser.role === 'driver' && section !== 'driver_app' && !(section === 'reports' && canViewReports)) {
      return;
    }
    if (currentUser.role === 'viewer' && section !== 'trips' && !(section === 'reports' && canViewReports)) {
      return;
    }
    if (section === 'live_tracking' && !isGPSTrackingEnabled()) {
      section = 'dashboard';
    }
    setCurrentSection(section);
  };

  // Selected trip for tracking
  const [selectedTrackingTripId, setSelectedTrackingTripId] = useState<string | undefined>(undefined);

  // Mobile sidebar toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modals state
  const [tripForApproval, setTripForApproval] = useState<Trip | null>(null);
  const [showWorkflowGuideModal, setShowWorkflowGuideModal] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    return DtmsStorage.getNotifications();
  });

  // Handle data refreshes across components
  const [, setDataVersion] = useState(0);

  const triggerDataRefresh = () => {
    hydrateDataFromMySQL()
      .then((result) => {
        if (!result.success) return;
        setNotifications(DtmsStorage.getNotifications());
        setDataVersion((v) => v + 1);
      })
      .catch(() => {});
  };

  useEffect(() => {
    let isMounted = true;
    const syncData = () => {
      hydrateDataFromMySQL()
        .then((res) => {
          if (res.success && isMounted) {
            setNotifications(DtmsStorage.getNotifications());
            setDataVersion((v) => v + 1);
          }
        })
        .catch(() => {});
    };

    syncData();
    const interval = setInterval(syncData, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const unreadCount = notifications.filter(
    (n) => !n.is_read && (n.user_id === currentUser.id || currentUser.role === 'admin')
  ).length;

  const handleNotificationClick = (notif: NotificationItem) => {
    DtmsStorage.markNotificationRead(notif.id);
    setNotifications(DtmsStorage.getNotifications());
    if (notif.trip_id) {
      const trip = DtmsStorage.getTripById(notif.trip_id);
      if (trip && trip.status === 'pending_approval' && ['admin', 'supervisor', 'security'].includes(currentUser.role)) {
        setTripForApproval(trip);
      } else {
        navigateToSection('trips');
      }
    }
  };

  const handleMarkAllRead = () => {
    DtmsStorage.markAllNotificationsRead(currentUser.id);
    setNotifications(DtmsStorage.getNotifications());
  };

  const topHeaderActions = (
    <Header
      currentUser={currentUser}
      unreadCount={unreadCount}
      notifications={notifications}
      onNotificationClick={handleNotificationClick}
      onMarkAllRead={handleMarkAllRead}
    />
  );

  return (
    <div className="dtms-container w-full min-h-[calc(100vh-6rem)] bg-[#f4f6f8] dark:bg-slate-900 text-[#191e22] dark:text-slate-100 flex flex-col font-['Cairo','Plus_Jakarta_Sans',sans-serif] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <DtmsHeaderProvider headerActions={topHeaderActions}>
        {/* Main Workspace */}
        <div className="w-full flex-1 flex flex-col min-w-0">
          {/* Main Content Area */}
          <main className="flex-1 p-3 sm:p-5 min-w-0">
          {currentSection === 'dashboard' && (
            <Dashboard
              key="dashboard"
              onNavigate={(section) => navigateToSection(section as NavSection)}
              currentUser={currentUser}
            />
          )}

          {currentSection === 'driver_app' && (
            <DriverAppView
              key="driver_app"
              currentUser={currentUser}
              onRefreshData={triggerDataRefresh}
            />
          )}

          {(currentSection === 'trips' || currentSection === 'create_trip') && (
            <TripsManager
              key={`trips-${currentSection}`}
              currentUser={currentUser}
              initialCreateModalOpen={currentSection === 'create_trip'}
              onOpenTripApproval={(trip) => setTripForApproval(trip)}
              onOpenLiveTracking={(tripId) => {
                setSelectedTrackingTripId(tripId);
                setCurrentSection('live_tracking');
              }}
              onRefreshData={triggerDataRefresh}
            />
          )}

          {currentSection === 'live_tracking' && isGPSTrackingEnabled() && (
            <LiveTrackingDashboard
              initialTripId={selectedTrackingTripId}
              onSelectTrip={(tripId) => setSelectedTrackingTripId(tripId)}
            />
          )}

          {currentSection === 'vehicles' && (
            <VehiclesManager
              key="vehicles"
              currentUser={currentUser}
              onRefreshData={triggerDataRefresh}
            />
          )}

          {currentSection === 'drivers' && (
            <DriversManager
              key="drivers"
              currentUser={currentUser}
              onRefreshData={triggerDataRefresh}
            />
          )}

          {currentSection === 'offices' && (
            <OfficesManager
              key="offices"
              onRefreshData={triggerDataRefresh}
            />
          )}

          {currentSection === 'reports' && (currentUser.role === 'admin' || currentUser.can_view_reports) && (
            <ReportsManager
              key="reports"
              currentUser={currentUser}
            />
          )}

          {currentSection === 'settings' && currentUser.role === 'admin' && (
            <SettingsManager key="settings" onRefreshData={triggerDataRefresh} />
          )}

          {currentSection === 'users' && (
            <UsersManager
              key="users"
              onRefreshData={triggerDataRefresh}
            />
          )}
        </main>
      </div>
    </DtmsHeaderProvider>

      {/* Modals */}
      {tripForApproval && (
        <TripApprovalModal
          trip={tripForApproval}
          currentUser={currentUser}
          onClose={() => setTripForApproval(null)}
          onSuccess={() => {
            triggerDataRefresh();
            setTripForApproval(null);
          }}
        />
      )}

      {/* Workflow Guide Modal */}
      {showWorkflowGuideModal && (
        <WorkflowGuideModal
          isOpen={showWorkflowGuideModal}
          onClose={() => setShowWorkflowGuideModal(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
