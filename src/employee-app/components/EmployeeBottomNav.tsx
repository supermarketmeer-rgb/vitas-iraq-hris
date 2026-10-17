import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEmployeeContext } from '../context/EmployeeContext';
import { 
  User, 
  Clock, 
  CreditCard, 
  Calendar, 
  Award, 
  Bell 
} from 'lucide-react';

export const EmployeeBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, unreadNotifications } = useEmployeeContext();
  const isDark = theme === 'dark';

  const navItems = [
    { path: '/employee-app/profile', label: 'حسابي', labelEn: 'Profile', icon: User },
    { path: '/employee-app/attendance', label: 'الدوام', labelEn: 'Attendance', icon: Clock },
    { path: '/employee-app/payroll', label: 'الرواتب', labelEn: 'Payroll', icon: CreditCard },
    { path: '/employee-app/leave', label: 'الإجازات', labelEn: 'Leave', icon: Calendar },
    { path: '/employee-app/evaluation', label: 'التقييم', labelEn: 'Evaluation', icon: Award },
    { path: '/employee-app/notifications', label: 'التنبيهات', labelEn: 'Alerts', icon: Bell, badge: unreadNotifications },
  ];

  return (
    <div className={`w-full z-50 backdrop-blur-xl border-t py-1.5 px-2 print:hidden transition-all duration-200 ${
      isDark 
        ? 'bg-[#0f172a]/95 border-slate-800/80 shadow-2xl text-white' 
        : 'bg-white/95 border-slate-200 shadow-xl text-slate-800'
    }`}>
      <div className="flex items-center justify-between w-full max-w-md mx-auto px-0.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/employee-app/' && location.pathname.startsWith(item.path));
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`relative flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all duration-200 flex-1 min-w-0 ${
                isActive
                  ? isDark 
                    ? 'text-teal-400 font-bold bg-teal-500/10' 
                    : 'text-teal-700 font-extrabold bg-teal-50'
                  : isDark 
                    ? 'text-slate-400 hover:text-slate-200' 
                    : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${
                  isActive ? 'scale-110 text-teal-500' : ''
                }`} />

                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 animate-pulse shadow-xs">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>

              <span className={`text-[10px] leading-tight mt-1 whitespace-nowrap truncate w-full text-center ${
                isActive 
                  ? isDark ? 'text-teal-400 font-bold' : 'text-teal-800 font-extrabold' 
                  : 'font-medium'
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
