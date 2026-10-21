import React from 'react';
import { useExecutiveContext } from '../context/ExecutiveContext';
import { 
  ShieldCheck, 
  Globe, 
  Sun, 
  Moon, 
  Bell, 
  AlertTriangle 
} from 'lucide-react';
import vitasLogo from '../../../assets/VitasLogo.jpeg';

interface ExecutiveTopHeaderProps {
  onOpenEmergency?: () => void;
}

export const ExecutiveTopHeader: React.FC<ExecutiveTopHeaderProps> = ({ onOpenEmergency }) => {
  const { 
    executiveUser, 
    kpis, 
    theme, 
    toggleTheme, 
    language, 
    toggleLanguage, 
    t, 
    emergencyAlert 
  } = useExecutiveContext();

  const isDark = theme === 'dark';
  const todayDate = new Date().toLocaleDateString(language === 'ar' ? 'ar-IQ' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <header className={`px-4 pt-3 pb-3 border-b transition-colors sticky top-0 z-30 backdrop-blur-xl ${
      isDark 
        ? 'bg-[#090d16]/90 border-slate-800 text-white' 
        : 'bg-white/90 border-slate-200 text-slate-900 shadow-xs'
    }`}>
      {/* Top Banner Row: Logo, Title, Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl overflow-hidden border border-amber-500/30 bg-slate-900 flex items-center justify-center shrink-0 shadow-sm">
            <img src={vitasLogo} alt="VITAS Iraq" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500 flex items-center gap-0.5">
                <ShieldCheck className="w-3 h-3 text-amber-500 inline" />
                {t('القيادة التنفيذية', 'EXECUTIVE PORTAL')}
              </span>
              <span className="px-1.5 py-0.2 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[9px] font-mono font-bold">
                GM SUITE
              </span>
            </div>
            <h1 className="text-xs font-bold truncate text-slate-100 dark:text-slate-100 light:text-slate-900" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
              {t('فيتاس العراق للتمويل الأصغر', 'VITAS Iraq Microfinance')}
            </h1>
          </div>
        </div>

        {/* Action Controls: Theme, Language, Emergency Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Emergency Alert Button */}
          {onOpenEmergency && (
            <button
              onClick={onOpenEmergency}
              className={`p-1.5 rounded-lg border transition-all relative ${
                emergencyAlert?.active
                  ? 'bg-rose-600 border-rose-500 text-white animate-pulse'
                  : isDark 
                    ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-amber-400 hover:border-amber-500/50' 
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-amber-600'
              }`}
              title={t('غرفة الطوارئ والتنبيهات', 'Emergency & Alerts Hub')}
            >
              <AlertTriangle className="w-4 h-4" />
              {kpis.pendingDecisionsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                  {kpis.pendingDecisionsCount}
                </span>
              )}
            </button>
          )}

          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className={`px-2 py-1 rounded-lg border text-[11px] font-bold transition-all flex items-center gap-1 ${
              isDark 
                ? 'bg-slate-800/80 border-slate-700 text-slate-200 hover:border-amber-500/50' 
                : 'bg-slate-100 border-slate-200 text-slate-800 hover:border-amber-600'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-amber-500" />
            <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-1.5 rounded-lg border transition-all ${
              isDark 
                ? 'bg-slate-800/80 border-slate-700 text-amber-400 hover:bg-slate-700' 
                : 'bg-slate-100 border-slate-200 text-amber-600 hover:bg-slate-200'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Secondary User Strip: GM Profile & Today's Date */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/40 text-[11px]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-600 to-teal-500 flex items-center justify-center text-[10px] font-bold text-white shadow-2xs">
            {executiveUser.fullNameAr?.charAt(0) || 'ش'}
          </div>
          <span className="font-semibold text-slate-200 dark:text-slate-200 light:text-slate-800" style={{ color: isDark ? '#e2e8f0' : '#1e293b' }}>
            {language === 'ar' ? executiveUser.fullNameAr : executiveUser.fullNameEn}
          </span>
          <span className="text-slate-400 text-[10px] hidden sm:inline">
            ({t('المدير العام', 'Managing Director')})
          </span>
        </div>

        <div className="text-[10px] text-slate-400 font-mono">
          {todayDate}
        </div>
      </div>
    </header>
  );
};
