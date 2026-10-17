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

  const navItems = [
    { id: 'profile', path: '/employee-app/profile', label: isEn ? 'Profile' : 'حسابي', icon: User },
    { id: 'attendance', path: '/employee-app/attendance', label: isEn ? 'Attendance' : 'الدوام', icon: Clock },
    { id: 'payroll', path: '/employee-app/payroll', label: isEn ? 'Payroll' : 'الرواتب', icon: CreditCard },
    { id: 'leave', path: '/employee-app/leave', label: isEn ? 'Leave' : 'الإجازات', icon: Calendar },
    { id: 'evaluation', path: '/employee-app/evaluation', label: isEn ? 'Evaluation' : 'التقييم', icon: Award },
    { id: 'notifications', path: '/employee-app/notifications', label: isEn ? 'Alerts' : 'التنبيهات', icon: Bell, badge: unreadNotifications },
  ];

  return (
    <div className={`w-full border-b-2 sticky top-0 z-40 backdrop-blur-md transition-colors ${
      isDark ? 'bg-[#0f172a]/95 border-slate-800' : 'bg-white/95 border-slate-300 shadow-xs'
    }`}>
      {/* Top Utility Header with Brand, Language Switcher, and Theme Toggle */}
      <div className={`w-full max-w-md mx-auto px-3.5 pt-2 pb-1.5 flex items-center justify-between gap-2 border-b-[1.5px] ${
        isDark ? 'border-slate-800/80' : 'border-slate-200'
      }`}>
        <div 
          onClick={() => navigate('/employee-app/')} 
          className="flex items-center gap-2 min-w-0 cursor-pointer group"
          title={isEn ? 'Go to Dashboard' : 'الانتقال للرئيسية'}
        >
          <div className="w-7 h-7 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-sm">badge</span>
          </div>
          <p className={`text-xs font-black truncate transition-colors ${
            isDark ? 'text-white group-hover:text-teal-400' : 'text-slate-900 group-hover:text-teal-700'
          }`}>
            {isEn ? 'VITAS Iraq • ESS Portal' : 'فيتاس العراق • بوابة الموظف'}
          </p>
        </div>

        {/* Global Controls: Language and Theme */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Language Toggle Button */}
          <button
            onClick={toggleLanguage}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-black border-[1.5px] transition-all flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95 ${
              isDark 
                ? 'bg-slate-800 border-slate-700 text-teal-400 hover:bg-slate-700' 
                : 'bg-slate-100 border-slate-300 text-teal-700 hover:bg-slate-200'
            }`}
            title={isEn ? 'التبديل إلى اللغة العربية' : 'Switch to English'}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{isEn ? 'العربية' : 'English'}</span>
          </button>

          {/* Dark / Light Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`p-1.5 rounded-xl border-[1.5px] transition-all cursor-pointer shadow-2xs active:scale-95 ${
              isDark 
                ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' 
                : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
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

      {/* 6 Attached Navigation Tabs (Moved to Top as requested by User) */}
      <div className="w-full max-w-md mx-auto px-1.5 py-1.5 flex items-center justify-between gap-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/employee-app/' && location.pathname.startsWith(item.path));
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-1.5 rounded-2xl transition-all duration-200 flex-1 min-w-0 cursor-pointer ${
                isActive
                  ? isDark 
                    ? 'text-teal-300 font-black bg-teal-500/20 shadow-xs' 
                    : 'text-white font-black bg-teal-700 shadow-sm shadow-teal-700/20'
                  : isDark 
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${
                  isActive ? 'scale-105 text-white dark:text-teal-300' : ''
                }`} />

                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 animate-pulse shadow-xs">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>

              <span className={`text-[10.5px] leading-tight mt-1 whitespace-nowrap truncate w-full text-center ${
                isActive ? 'font-black' : 'font-bold'
              }`}>
                {item.label}
              </span>

              {isActive && (
                <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isDark ? 'bg-teal-300' : 'bg-teal-400'}`}></span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
