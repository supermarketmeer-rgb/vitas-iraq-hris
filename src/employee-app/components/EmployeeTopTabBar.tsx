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

export const EmployeeTopTabBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, unreadNotifications } = useEmployeeContext();
  const isDark = theme === 'dark';

  const tabs = [
    {
      id: 'profile',
      path: '/employee-app/profile',
      labelEn: 'Profile',
      labelAr: 'الملف الشخصي',
      icon: User
    },
    {
      id: 'attendance',
      path: '/employee-app/attendance',
      labelEn: 'Attendance',
      labelAr: 'الدوام',
      icon: Clock
    },
    {
      id: 'payroll',
      path: '/employee-app/payroll',
      labelEn: 'Payroll',
      labelAr: 'الرواتب',
      icon: CreditCard
    },
    {
      id: 'leave',
      path: '/employee-app/leave',
      labelEn: 'Leave',
      labelAr: 'الإجازات',
      icon: Calendar
    },
    {
      id: 'evaluation',
      path: '/employee-app/evaluation',
      labelEn: 'Self Evaluation',
      labelAr: 'التقييم الذاتي',
      icon: Award
    },
    {
      id: 'notifications',
      path: '/employee-app/notifications',
      labelEn: 'Notifications & Attachments',
      labelAr: 'التنبيهات والمرفقات',
      icon: Bell,
      badge: unreadNotifications
    }
  ];

  return (
    <div className={`w-full border-b sticky top-0 z-40 backdrop-blur-md transition-colors ${
      isDark ? 'bg-[#0f172a]/95 border-slate-800' : 'bg-white/95 border-slate-200'
    }`}>
      <div className="w-full max-w-md mx-auto px-3 py-2.5 overflow-x-auto no-scrollbar flex items-center gap-2">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`px-3.5 py-2 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0 shadow-2xs ${
                isActive
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/25 scale-[1.02]'
                  : isDark
                    ? 'bg-slate-900/80 text-slate-300 border border-slate-700/80 hover:bg-slate-800 hover:text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : isDark ? 'text-teal-400' : 'text-teal-600'}`} />
              <span>{tab.labelEn}</span>
              <span className="opacity-75 text-[10px]">({tab.labelAr})</span>

              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full min-w-[18px] text-center shadow-xs animate-pulse">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
