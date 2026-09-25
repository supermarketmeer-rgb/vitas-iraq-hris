import React from 'react';
import { useApp } from '../context/AppContext';
import { getUserEffectivePermissions } from '../utils/permissionHelper';

export const MobileEmployeeBottomNav: React.FC = () => {
  const {
    activeModuleId,
    setActiveModuleId,
    language,
    currentUserRole,
    currentUser,
    isSidebarOpen,
    setIsSidebarOpen,
    theme
  } = useApp();

  const currentRole = currentUserRole || currentUser?.role || 'Employee';
  const userPerms = getUserEffectivePermissions(currentUser, currentRole);

  // Dynamically build bottom bar items strictly matching the user's licensed permissions
  const getDynamicNavItems = () => {
    const items: Array<{ id: string; labelAr: string; labelEn: string; icon: string }> = [];

    // Tab 1: Home / Dashboard
    if (userPerms.isSuperAdmin || userPerms.employees || userPerms.payroll || userPerms.reports) {
      items.push({ id: 'dash-overview', labelAr: 'الرئيسية', labelEn: 'Home', icon: 'space_dashboard' });
    } else {
      items.push({ id: 'dash-ess', labelAr: 'الرئيسية', labelEn: 'Home', icon: 'home' });
    }

    // Tab 2: Employees or Recruitment or Attendance
    if (userPerms.employees) {
      items.push({ id: 'emp-hr-directory', labelAr: 'الموظفين', labelEn: 'Staff', icon: 'recent_actors' });
    } else if (userPerms.recruitment) {
      items.push({ id: 'recruit-dash', labelAr: 'الوظائف', labelEn: 'Jobs', icon: 'work' });
    } else {
      items.push({ id: 'leave-attendance', labelAr: 'الدوام', labelEn: 'Attendance', icon: 'schedule' });
    }

    // Tab 3: Attendance or Leaves or ATS
    if (userPerms.attendance && !items.some(i => i.id === 'leave-attendance')) {
      items.push({ id: 'leave-attendance', labelAr: 'الدوام', labelEn: 'Attendance', icon: 'schedule' });
    } else if (userPerms.recruitment && !items.some(i => i.id === 'recruit-ats')) {
      items.push({ id: 'recruit-ats', labelAr: 'المسار ATS', labelEn: 'Pipeline', icon: 'view_kanban' });
    } else {
      items.push({ id: 'cat-4-leave', labelAr: 'الإجازات', labelEn: 'Leaves', icon: 'event_available' });
    }

    // Tab 4: Payroll or Reports or Candidate Profile or Payslip
    if (userPerms.payroll) {
      items.push({ id: 'payroll-mgmt', labelAr: 'الرواتب', labelEn: 'Payroll', icon: 'payments' });
    } else if (userPerms.reports) {
      items.push({ id: 'sys-dynamic-reports', labelAr: 'التقارير', labelEn: 'Reports', icon: 'analytics' });
    } else if (userPerms.recruitment) {
      items.push({ id: 'recruit-candidate-profile', labelAr: 'المرشحين', labelEn: 'Candidates', icon: 'person_search' });
    } else if (userPerms.assets) {
      items.push({ id: 'cat-8-assets', labelAr: 'الأصول', labelEn: 'Assets', icon: 'devices' });
    } else {
      items.push({ id: 'payroll-payslip', labelAr: 'قسيمتي', labelEn: 'Payslip', icon: 'receipt_long' });
    }

    // Tab 5: Menu Drawer (Toggles the drawer showing ONLY authorized modules)
    items.push({ id: '__MENU__', labelAr: 'القائمة', labelEn: 'Menu', icon: 'menu' });

    return items;
  };

  const navItems = getDynamicNavItems();
  const isDark = theme === 'dark';

  const handleTabClick = (itemId: string) => {
    if (itemId === '__MENU__') {
      setIsSidebarOpen(!isSidebarOpen);
      return;
    }

    setActiveModuleId(itemId);
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <nav
      aria-label="Mobile Navigation"
      className={`fixed bottom-0 inset-x-0 z-40 lg:hidden print:hidden border-t backdrop-blur-xl transition-colors duration-200 select-none ${
        isDark
          ? 'bg-[#06080d]/95 border-teal-500/20 text-slate-300 shadow-[0_-8px_30px_rgba(0,0,0,0.7)]'
          : 'bg-white/95 border-slate-300 text-slate-700 shadow-[0_-8px_25px_rgba(0,0,0,0.08)]'
      }`}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto px-2 py-1 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {navItems.map((item) => {
          const isMenuTab = item.id === '__MENU__';
          const isActive = !isMenuTab && (
            activeModuleId === item.id ||
            (item.id === 'cat-4-leave' && activeModuleId.startsWith('leave') && activeModuleId !== 'leave-attendance') ||
            (item.id === 'emp-hr-directory' && (activeModuleId === 'emp-directory' || activeModuleId === 'emp-profile' || activeModuleId === 'emp-hr-directory')) ||
            (item.id === 'payroll-mgmt' && activeModuleId.startsWith('pay') && activeModuleId !== 'payroll-payslip')
          );

          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all duration-200 min-w-[56px] min-h-[48px] cursor-pointer active:scale-95 relative ${
                isActive
                  ? (isDark ? 'text-teal-400 bg-teal-500/10 font-bold' : 'text-teal-700 bg-teal-50 font-bold')
                  : isMenuTab && isSidebarOpen
                    ? (isDark ? 'text-teal-400 font-bold bg-teal-500/10' : 'text-teal-700 font-bold bg-teal-50')
                    : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              {/* Active Indicator Top Pill */}
              {isActive && (
                <span className="absolute -top-1 w-6 h-0.5 rounded-full bg-teal-500 animate-in fade-in zoom-in duration-200" />
              )}

              <span
                className={`material-symbols-outlined text-2xl transition-transform duration-200 ${
                  isActive ? 'scale-110' : ''
                }`}
              >
                {isMenuTab && isSidebarOpen ? 'close' : item.icon}
              </span>

              <span className="text-[10px] leading-tight mt-0.5 whitespace-nowrap font-medium">
                {language === 'ar' ? item.labelAr : item.labelEn}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
