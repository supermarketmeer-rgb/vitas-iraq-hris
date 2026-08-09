import React from 'react';
import { useApp } from '../context/AppContext';

export const MobileEmployeeBottomNav: React.FC = () => {
  const { activeModuleId, setActiveModuleId, language, currentUserRole, currentUser } = useApp();
  const isEmployeeRole = currentUserRole === 'Employee' || currentUser?.role === 'Employee';

  if (!isEmployeeRole) return null;

  const navItems = [
    { id: 'dash-ess', labelAr: 'الرئيسية', labelEn: 'Home', icon: 'home' },
    { id: 'leave-attendance', labelAr: 'الدوام', labelEn: 'Attendance', icon: 'schedule' },
    { id: 'cat-4-leave', labelAr: 'الإجازات', labelEn: 'Leaves', icon: 'event_available' },
    { id: 'payroll-payslip', labelAr: 'الراتب', labelEn: 'Payslip', icon: 'payments' },
    { id: 'emp-profile', labelAr: 'حسابي', labelEn: 'Profile', icon: 'person' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 shadow-2xl py-1.5 px-3 sm:hidden print:hidden">
      <div className="flex items-center justify-between max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = activeModuleId === item.id || 
            (item.id === 'cat-4-leave' && activeModuleId?.startsWith('leave') && activeModuleId !== 'leave-attendance') ||
            (item.id === 'emp-profile' && activeModuleId === 'emp-profile') ||
            (item.id === 'payroll-payslip' && activeModuleId?.startsWith('payroll'));

          return (
            <button
              key={item.id}
              onClick={() => setActiveModuleId(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all flex-1 ${
                isActive
                  ? 'text-teal-600 dark:text-teal-400 font-black scale-105 bg-teal-50 dark:bg-teal-500/10'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span className={`material-symbols-outlined text-2xl transition-transform ${isActive ? 'fill-1' : ''}`}>
                {item.icon}
              </span>
              <span className="text-[10px] leading-tight mt-0.5 whitespace-nowrap font-bold">
                {language === 'ar' ? item.labelAr : item.labelEn}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-teal-600 dark:bg-teal-400 mt-0.5"></span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
