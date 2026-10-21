import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useExecutiveContext } from '../context/ExecutiveContext';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Building2, 
  Users, 
  FileText, 
  Settings 
} from 'lucide-react';

export const ExecutiveBottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { kpis, theme, t } = useExecutiveContext();
  const isDark = theme === 'dark';

  const navItems = [
    {
      id: 'dashboard',
      path: '/executive-app/dashboard',
      label: t('الرئيسية', 'Dashboard'),
      icon: LayoutDashboard
    },
    {
      id: 'approvals',
      path: '/executive-app/approvals',
      label: t('الموافقات', 'Decisions'),
      icon: CheckSquare,
      badge: kpis.pendingDecisionsCount > 0 ? kpis.pendingDecisionsCount : undefined
    },
    {
      id: 'branches',
      path: '/executive-app/branches',
      label: t('الفروع', 'Branches'),
      icon: Building2
    },
    {
      id: 'workforce',
      path: '/executive-app/workforce',
      label: t('الكادر', 'Workforce'),
      icon: Users
    },
    {
      id: 'decrees',
      path: '/executive-app/decrees',
      label: t('الأوامر', 'Decrees'),
      icon: FileText
    },
    {
      id: 'profile',
      path: '/executive-app/profile',
      label: t('المزيد', 'More'),
      icon: Settings
    }
  ];

  return (
    <nav className={`w-full border-t transition-colors sticky bottom-0 z-40 backdrop-blur-xl ${
      isDark 
        ? 'bg-[#090d16]/95 border-slate-800 text-slate-400' 
        : 'bg-white/95 border-slate-200 text-slate-500 shadow-lg'
    }`}>
      <div className="flex items-center justify-around px-1 py-1.5 max-w-lg mx-auto">
        {navItems.map(item => {
          const isActive = location.pathname === item.path || (item.id === 'dashboard' && location.pathname === '/executive-app');
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex-1 py-1 px-1 flex flex-col items-center justify-center relative rounded-xl transition-all ${
                isActive
                  ? isDark 
                    ? 'text-amber-400 bg-amber-500/10' 
                    : 'text-amber-600 bg-amber-50 font-bold'
                  : 'hover:text-slate-300'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 px-1 min-w-[15px] h-[15px] rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center shadow-xs animate-bounce">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 font-medium truncate max-w-[54px] ${isActive ? 'font-bold' : ''}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-0.5 shadow-xs" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
