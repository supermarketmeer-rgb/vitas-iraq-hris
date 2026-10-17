import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEmployeeContext } from '../context/EmployeeContext';
import { 
  User, 
  Clock, 
  CreditCard, 
  Calendar, 
  Award, 
  Bell,
  Sun,
  Moon,
  Globe
} from 'lucide-react';

export const EmployeeTopTabBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme, language, toggleLanguage, unreadNotifications } = useEmployeeContext();
  const isDark = theme === 'dark';
  const isEn = language === 'en';

  const tabs = [
    {
      id: 'profile',
      path: '/employee-app/profile',
      label: isEn ? 'Profile' : 'الملف الشخصي',
      icon: User
    },
    {
      id: 'attendance',
      path: '/employee-app/attendance',
      label: isEn ? 'Attendance' : 'الدوام',
      icon: Clock
    },
    {
      id: 'payroll',
      path: '/employee-app/payroll',
      label: isEn ? 'Payroll' : 'الرواتب',
      icon: CreditCard
    },
    {
      id: 'leave',
      path: '/employee-app/leave',
      label: isEn ? 'Leave' : 'الإجازات',
      icon: Calendar
    },
    {
      id: 'evaluation',
      path: '/employee-app/evaluation',
      label: isEn ? 'Self Evaluation' : 'التقييم الذاتي',
      icon: Award
    },
    {
      id: 'notifications',
      path: '/employee-app/notifications',
      label: isEn ? 'Notifications' : 'التنبيهات',
      icon: Bell,
      badge: unreadNotifications,
      hidden: true // مخفي لأن آيقونة التنبيهات موجودة في الشريط السفلي
    }
  ];

  const visibleTabs = tabs.filter(tab => !tab.hidden);

  return (
    <div className={`w-full border-b sticky top-0 z-40 backdrop-blur-md transition-colors ${
      isDark ? 'bg-[#0f172a]/95 border-slate-800' : 'bg-white/95 border-slate-200'
    }`}>
      {/* Top Utility Header with Brand, Language Switcher, and Theme Toggle */}
      <div className="w-full max-w-md mx-auto px-3.5 pt-2 pb-1.5 flex items-center justify-between gap-2 border-b border-white/5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-sm">badge</span>
          </div>
          <p className={`text-xs font-black truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {isEn ? 'VITAS Iraq • ESS Portal' : 'فيتاس العراق • بوابة الموظف'}
          </p>
        </div>

        {/* Global Controls: Language and Theme */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Language Toggle Button */}
          <button
            onClick={toggleLanguage}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-black border transition-all flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95 ${
              isDark 
                ? 'bg-slate-800 border-slate-700 text-teal-400 hover:bg-slate-700' 
                : 'bg-slate-100 border-slate-200 text-teal-700 hover:bg-slate-200'
            }`}
            title={isEn ? 'التبديل إلى اللغة العربية' : 'Switch to English'}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{isEn ? 'العربية' : 'English'}</span>
          </button>

          {/* Dark / Light Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`p-1.5 rounded-xl border transition-all cursor-pointer shadow-2xs active:scale-95 ${
              isDark 
                ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' 
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
            title={isDark ? (isEn ? 'Switch to Light Mode' : 'التحويل للوضع النهاري') : (isEn ? 'Switch to Dark Mode' : 'التحويل للوضع الليلي')}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>
        </div>
      </div>

      {/* ESS Pill Tabs */}
      <div className="w-full max-w-md mx-auto px-3 py-2 overflow-x-auto no-scrollbar flex items-center gap-2">
        {visibleTabs.map((tab) => {
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
              <span>{tab.label}</span>

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
