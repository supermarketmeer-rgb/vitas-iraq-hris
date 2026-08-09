import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEmployeeContext } from '../context/EmployeeContext';

export const EmployeeBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, unreadNotifications, unreadMessages } = useEmployeeContext();
  const isDark = theme === 'dark';

  const navItems = [
    { path: '/employee-app/', label: 'الرئيسية', icon: 'home' },
    { path: '/employee-app/attendance', label: 'الدوام', icon: 'schedule' },
    { path: '/employee-app/leave', label: 'الإجازات', icon: 'event_available' },
    { path: '/employee-app/notifications', label: 'التنبيهات', icon: 'notifications', badge: unreadNotifications + unreadMessages },
    { path: '/employee-app/profile', label: 'حسابي', icon: 'person' },
  ];

  return (
    <div className={`w-full z-50 backdrop-blur-xl border-t py-2 px-3 print:hidden transition-all duration-200 ${
      isDark 
        ? 'bg-[#0f172a]/95 border-slate-800/80 shadow-2xl text-white' 
        : 'bg-white/95 border-slate-200 shadow-xl text-slate-800'
    }`}>
      <div className="flex items-center justify-between w-full max-w-md mx-auto px-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/employee-app/' && location.pathname.startsWith(item.path));

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 flex-1 ${
                isActive
                  ? isDark 
                    ? 'text-teal-400 font-bold scale-105 bg-teal-500/10' 
                    : 'text-teal-700 font-extrabold scale-105 bg-teal-50'
                  : isDark 
                    ? 'text-slate-400 hover:text-slate-200' 
                    : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <span className={`material-symbols-outlined text-2xl transition-transform ${
                  isActive ? 'fill-1 scale-110' : ''
                }`}>
                  {item.icon}
                </span>

                {!!item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-[16px] bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 animate-pulse shadow-sm">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>

              <span className={`text-[10px] leading-tight mt-0.5 whitespace-nowrap font-medium ${
                isActive 
                  ? isDark ? 'text-teal-400 font-bold' : 'text-teal-800 font-extrabold' 
                  : ''
              }`}>
                {item.label}
              </span>

              {isActive && (
                <span className={`w-1 h-1 rounded-full mt-0.5 ${isDark ? 'bg-teal-400' : 'bg-teal-600'}`}></span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
