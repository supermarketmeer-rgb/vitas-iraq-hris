import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ExecutiveContextProvider, useExecutiveContext } from './context/ExecutiveContext';
import { ExecutiveTopHeader } from './components/ExecutiveTopHeader';
import { ExecutiveBottomNav } from './components/ExecutiveBottomNav';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { ExecutiveApprovals } from './components/ExecutiveApprovals';
import { ExecutiveBranches } from './components/ExecutiveBranches';
import { ExecutiveWorkforce } from './components/ExecutiveWorkforce';
import { ExecutiveDecrees } from './components/ExecutiveDecrees';
import { ExecutiveProfile } from './components/ExecutiveProfile';
import { ExecutiveLogin } from './components/ExecutiveLogin';
import { Smartphone, Monitor, Wifi, BatteryCharging, Signal } from 'lucide-react';

function ExecutiveAppMain() {
  const { isAuthenticated, theme, language, t } = useExecutiveContext();
  const [isPhoneMockup, setIsPhoneMockup] = useState(true);
  const [currentTime, setCurrentTime] = useState('');

  const isDark = theme === 'dark';

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!isAuthenticated) {
    return <ExecutiveLogin />;
  }

  return (
    <div 
      dir={language === 'ar' ? 'rtl' : 'ltr'} 
      className={`min-h-screen w-full flex flex-col items-center justify-center p-0 md:p-4 transition-colors duration-300 ${
        isDark ? 'bg-[#050811] text-slate-100' : 'bg-slate-200/80 text-slate-900'
      }`}
    >
      {/* Desktop Helper Toggle: Phone Frame vs Full Responsive View */}
      <div className="hidden md:flex items-center justify-between w-full max-w-md lg:max-w-xl mb-2 px-2 text-xs">
        <div className="flex items-center gap-1.5 text-amber-500 font-bold">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>{t('تطبيق المدير العام والقيادة التنفيذية (VITAS Iraq GM Suite)', 'VITAS Iraq Executive Suite')}</span>
        </div>

        <button
          onClick={() => setIsPhoneMockup(!isPhoneMockup)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition-all cursor-pointer"
        >
          {isPhoneMockup ? <Monitor className="w-3.5 h-3.5 text-amber-400" /> : <Smartphone className="w-3.5 h-3.5 text-amber-400" />}
          <span>{isPhoneMockup ? t('العرض الممتد', 'Full Screen Mode') : t('إطار الهاتف', 'Phone Mockup')}</span>
        </button>
      </div>

      {/* Main App Smartphone Container */}
      <div 
        className={`w-full ${
          isPhoneMockup 
            ? 'max-w-md h-screen md:h-[90vh] md:max-h-[880px] md:rounded-[40px] md:border-[6px] md:border-slate-800 md:shadow-2xl' 
            : 'max-w-3xl min-h-screen md:min-h-[85vh] md:rounded-3xl md:border-2 md:border-slate-800 md:shadow-xl'
        } flex flex-col relative overflow-hidden transition-all ${
          isDark ? 'bg-[#080c16] text-white' : 'bg-slate-50 text-slate-900'
        }`}
      >
        {/* Smartphone Status Bar (Carrier, Signal, Time, Battery) */}
        <div className="px-5 pt-2 pb-1 flex items-center justify-between text-[11px] font-semibold text-slate-400 select-none border-b border-slate-800/20 z-40 bg-[#090d16]">
          <div className="flex items-center gap-1 font-mono">
            <span>{currentTime || '12:00'}</span>
          </div>

          {/* Dynamic Island / Speaker Notch on Phone Mockup */}
          {isPhoneMockup && (
            <div className="w-20 h-3.5 bg-slate-950 rounded-full border border-slate-800/80 hidden md:block" />
          )}

          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className="text-[9px] font-bold tracking-tight text-amber-400">VITAS 5G</span>
            <Signal className="w-3 h-3 text-slate-400" />
            <Wifi className="w-3 h-3 text-slate-400" />
            <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>

        {/* Top Executive Header */}
        <ExecutiveTopHeader />

        {/* Scrollable Main Views Container */}
        <div className="flex-1 overflow-y-auto no-scrollbar relative">
          <Routes>
            <Route path="/" element={<Navigate to="/executive-app/dashboard" replace />} />
            <Route path="/dashboard" element={<ExecutiveDashboard />} />
            <Route path="/approvals" element={<ExecutiveApprovals />} />
            <Route path="/branches" element={<ExecutiveBranches />} />
            <Route path="/workforce" element={<ExecutiveWorkforce />} />
            <Route path="/decrees" element={<ExecutiveDecrees />} />
            <Route path="/profile" element={<ExecutiveProfile />} />
            <Route path="*" element={<Navigate to="/executive-app/dashboard" replace />} />
          </Routes>
        </div>

        {/* Bottom Navigation */}
        <ExecutiveBottomNav />
      </div>
    </div>
  );
}

export const ExecutiveApp: React.FC = () => {
  return (
    <ExecutiveContextProvider>
      <ExecutiveAppMain />
    </ExecutiveContextProvider>
  );
};
