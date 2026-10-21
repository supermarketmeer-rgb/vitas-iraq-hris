import React, { useState } from 'react';
import { useExecutiveContext } from '../context/ExecutiveContext';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  Globe, 
  Moon, 
  Sun, 
  ArrowRight,
  Zap,
  Building2
} from 'lucide-react';
import vitasLogo from '../../../assets/VitasLogo.jpeg';

export const ExecutiveLogin: React.FC = () => {
  const { loginAsGeneralManager, theme, toggleTheme, language, toggleLanguage, t } = useExecutiveContext();
  const isDark = theme === 'dark';

  const [username, setUsername] = useState('gm.director@vitasiraq.org');
  const [password, setPassword] = useState('••••••••••••');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      loginAsGeneralManager();
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className={`min-h-screen w-full flex flex-col justify-between p-6 transition-colors ${
      isDark ? 'bg-[#070b14] text-white' : 'bg-slate-100 text-slate-900'
    }`}>
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[10px] font-mono font-bold tracking-widest text-amber-500 uppercase">
            EXECUTIVE SUITE
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleLanguage}
            className="p-1.5 rounded-xl border border-slate-700 bg-slate-800/60 text-slate-300 text-xs font-bold flex items-center gap-1"
          >
            <Globe className="w-3.5 h-3.5 text-amber-500" />
            <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
          </button>
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-xl border border-slate-700 bg-slate-800/60 text-amber-400"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-sm mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 mx-auto rounded-3xl overflow-hidden p-1 bg-gradient-to-tr from-amber-600 via-amber-500 to-teal-400 shadow-xl">
            <img src={vitasLogo} alt="VITAS Iraq" className="w-full h-full object-cover rounded-2xl" />
          </div>

          <div>
            <h1 className="text-lg font-bold text-white dark:text-white light:text-slate-900" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
              {t('تطبيق المدير العام والقيادة التنفيذية', 'General Manager & Executive Suite')}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {t('شركة فيتاس العراق للتمويل الأصغر', 'VITAS Iraq Microfinance')}
            </p>
          </div>
        </div>

        {/* Quick Instant GM Access Button */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-teal-500/10 border border-amber-500/30 text-center space-y-2 shadow-sm">
          <div className="flex items-center justify-center gap-1.5 text-amber-400 text-xs font-bold">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>{t('الدخول المباشر المخصص للمدير العام', 'Direct 1-Click GM Access')}</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {t('دخول فوري لحساب د. شاكر الحسني (المدير العام والرئيس التنفيذي)', 'Instant access as Dr. Shaker Al-Hasani (MD & CEO)')}
          </p>
          <button
            onClick={loginAsGeneralManager}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{t('دخول فوري كمدير عام', 'Instant Login as General Manager')}</span>
          </button>
        </div>

        {/* Traditional Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">
              {t('البريد التنفيذي أو المعرف القيادي', 'Executive Email / Badge ID')}
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full ps-9 pe-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-amber-500 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">
              {t('كلمة المرور المشفرة', 'Password')}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full ps-9 pe-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-amber-500 text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{isLoading ? t('جاري التحقق والتشفير...', 'Authenticating...') : t('تسجيل الدخول الرسمي', 'Official Sign In')}</span>
          </button>
        </form>
      </div>

      {/* Footer Info */}
      <div className="text-center text-[10px] text-slate-500 space-y-1">
        <p>VITAS Iraq HRMS • Executive Command Suite v2.4</p>
        <p>{t('نظام آمن ومشفر بأعلى معايير الحوكمة المصرفية', 'Secured with high-standard banking governance protocols')}</p>
      </div>
    </div>
  );
};
