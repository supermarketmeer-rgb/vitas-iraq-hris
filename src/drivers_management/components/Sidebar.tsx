import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Car,
  Users,
  UserCheck,
  Navigation,
  MapPin,
  FileBarChart,
  Settings,
  Smartphone,
  HelpCircle,
  KeyRound,
  LogOut,
  Globe,
} from 'lucide-react';
import { t } from '../utils/i18n';
import { Role, User } from '../types';
import { isGPSTrackingEnabled } from '../utils/gpsTracker';

export type NavSection =
  | 'dashboard'
  | 'driver_app'
  | 'trips'
  | 'create_trip'
  | 'live_tracking'
  | 'offices'
  | 'vehicles'
  | 'drivers'
  | 'users'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  userRole: Role;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  onOpenWorkflowGuide?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSelectSection,
  userRole,
  isOpen,
  onClose,
  currentUser,
  onOpenWorkflowGuide,
}) => {
  const getNavItems = () => {
    const items: { id: NavSection; label: string; icon: React.ElementType; badge?: string }[] = [];

    if (userRole !== 'viewer') {
      items.push({
        id: 'dashboard',
        label: t('nav_dashboard'),
        icon: LayoutDashboard,
      });
    }

    // Driver specific app highlight
    if (userRole === 'driver') {
      items.push({
        id: 'driver_app',
        label: t('nav_driver_app'),
        icon: Smartphone,
        badge: t('nav_badge_live'),
      });
    }

    // Trips management
    if (userRole === 'admin' || userRole === 'supervisor' || userRole === 'security' || userRole === 'viewer') {
      items.push({
        id: 'trips',
        label: t('nav_trips'),
        icon: Navigation,
      });
    }

    // Live GPS tracking
    if (isGPSTrackingEnabled() && userRole !== 'viewer' && userRole !== 'driver') {
      items.push({
        id: 'live_tracking',
        label: t('nav_live_tracking'),
        icon: MapPin,
        badge: 'Live',
      });
    }

    // Masters
    if (userRole === 'admin') {
      items.push(
        {
          id: 'offices',
          label: t('nav_offices'),
          icon: Building2,
        },
        {
          id: 'vehicles',
          label: t('nav_vehicles_admin'),
          icon: Car,
        },
        {
          id: 'drivers',
          label: t('nav_drivers_admin'),
          icon: UserCheck,
        },
        {
          id: 'users',
          label: t('nav_users'),
          icon: Users,
        }
      );
    }

    if (userRole === 'supervisor' || userRole === 'security') {
      items.push(
        {
          id: 'vehicles',
          label: t('nav_vehicles_sup'),
          icon: Car,
        },
        {
          id: 'drivers',
          label: t('nav_drivers_sup'),
          icon: UserCheck,
        }
      );
    }

    // Reports
    if (userRole === 'admin' || Boolean(currentUser?.can_view_reports)) {
      items.push({
        id: 'reports',
        label: t('nav_reports'),
        icon: FileBarChart,
      });
    }

    // Administration settings (Admin)
    if (userRole === 'admin') {
      items.push({
        id: 'settings',
        label: t('nav_settings'),
        icon: Settings,
      });
    }

    return items;
  };

  const navItems = getNavItems();
  const userName = currentUser?.name || t('nav_user_system');
  const userInitial = userName.trim().charAt(0).toUpperCase() || 'U';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Vitas Horizon Executive Sidebar */}
      <aside
        className={`fixed inset-y-0 rtl:right-0 ltr:left-0 z-50 flex flex-col w-72 max-w-[82vw] bg-gradient-to-b from-[#23272a] to-[#15181a] text-white shadow-2xl rtl:border-l ltr:border-r border-white/10 transition-transform duration-300 ease-in-out lg:static lg:!translate-x-0 lg:z-0 ${
          isOpen ? 'translate-x-0' : 'rtl:translate-x-full ltr:-translate-x-full hidden lg:flex'
        }`}
      >
        {/* 1. Vitas Official Brand Tile */}
        <div className="p-3 pb-2 border-b border-white/10">
          <div className="bg-white rounded-xl p-2.5 px-3 flex items-center justify-between shadow-md border border-white/90">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-xs">
                V
              </div>
              <span className="text-[13px] font-black tracking-wider text-[#23272a] leading-tight font-sans">
                VITAS IRAQ
              </span>
            </div>
            <div className="flex flex-col items-start rtl:border-r-[1.5px] ltr:border-l-[1.5px] border-slate-200 rtl:pr-2 ltr:pl-2">
              <span className="font-['Cairo'] text-[11px] font-bold text-[#6f7800] leading-tight">
                إدارة السائقين
              </span>
            </div>
          </div>

          {/* Module Identity Badge */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white mt-2">
            <div className="w-8 h-8 rounded-lg bg-[#c1cd21] text-[#191e22] flex items-center justify-center font-bold shadow-[0_2px_8px_rgba(193,205,33,0.35)] shrink-0">
              <Navigation className="w-4 h-4 text-[#191e22]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate font-['Plus_Jakarta_Sans',sans-serif]">
                DTMS Drivers
              </span>
              <span className="text-[11px] font-semibold text-[#c1cd21] font-['Cairo'] truncate">
                نظام إدارة النقليات والأسطول
              </span>
            </div>
          </div>
        </div>

        {/* 2. Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 custom-scrollbar">
          {/* Section: Services */}
          <div className="px-2 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            القوائم والعمليات التشغيلية
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => {
                  onSelectSection(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 rtl:text-right ltr:text-left cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[#c1cd21]/20 to-[#c1cd21]/5 text-[#c1cd21] font-bold rtl:border-r-3 ltr:border-l-3 border-[#c1cd21] shadow-xs'
                    : 'text-slate-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-[#c1cd21]' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isActive
                        ? 'bg-[#c1cd21] text-[#191e22]'
                        : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Quick Actions for Admin */}
          {userRole === 'admin' && onOpenWorkflowGuide && (
            <>
              <div className="px-2 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                أدوات الإدارة والمساندة
              </div>

              {onOpenWorkflowGuide && (
                <button
                  id="sidebar-workflow-guide-btn"
                  onClick={() => {
                    onOpenWorkflowGuide();
                    onClose();
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-semibold text-xs flex items-center justify-between border border-white/10 transition-colors cursor-pointer mt-1"
                >
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-3.5 h-3.5 text-cyan-300" />
                    <span>{t('nav_workflow')}</span>
                  </div>
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-white/10 text-white text-[10px] font-bold">
                    ?
                  </span>
                </button>
              )}
            </>
          )}
        </div>

        {/* 3. Vitas Horizon User Account Box at Footer */}
        <div className="p-3 border-t border-white/10 bg-black/30">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#c1cd21] text-[#191e22] flex items-center justify-center font-extrabold text-sm shrink-0 shadow-[0_2px_8px_rgba(193,205,33,0.35)]">
              {userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <b className="block text-xs font-bold text-white truncate">
                {userName}
              </b>
              <small className="block text-[11px] text-slate-400 truncate">
                {currentUser?.username || 'user'} / {userRole === 'admin' ? 'Admin' : userRole === 'supervisor' ? 'Supervisor' : userRole === 'security' ? 'Security' : userRole === 'viewer' ? 'Viewer' : 'Driver'}
              </small>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px]">
            <button
              onClick={() => {
                const currentLang = localStorage.getItem('vitas_language') || localStorage.getItem('dtms_preferred_language') || 'ar';
                const newLang = currentLang === 'ar' ? 'en' : 'ar';
                localStorage.setItem('vitas_language', newLang);
                localStorage.setItem('dtms_preferred_language', newLang);
                window.location.reload();
              }}
              className="text-slate-300 hover:text-white transition-colors flex items-center gap-1 font-bold bg-white/5 px-2.5 py-1 rounded cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-[#c1cd21]" />
              <span>
                {(() => {
                   const lang = localStorage.getItem('vitas_language') || localStorage.getItem('dtms_preferred_language') || 'ar';
                   return lang === 'en' ? 'العربية' : 'English';
                })()}
              </span>
            </button>
            <span className="text-white/20">|</span>
            <span className="text-slate-400 text-[10px] font-mono">v2.5 Enterprise</span>
          </div>
        </div>
      </aside>
    </>
  );
};
