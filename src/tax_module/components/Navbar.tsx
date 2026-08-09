import React from 'react';
import { useApp } from '../context/AppContext.js';
import {
  Globe,
  Moon,
  Sun,
  ShieldCheck,
  Calendar,
  Sparkles,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    lang,
    setLang,
    theme,
    setTheme,
    activePeriod,
    setActivePeriod,
    setActiveTab,
    t,
  } = useApp();

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 transition-colors">
      {/* Title & Integrated Badge */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
            {t('module_title')}
          </h1>
          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
            <ShieldCheck className="w-3 h-3" />
            <span className="hidden xs:inline">{t('hr_integrated_badge')}</span>
          </span>
        </div>
      </div>

      {/* Center Actions: Payroll Period Selector */}
      <div className="hidden md:flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80">
        <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {t('payroll_period')}:
        </span>
        <select
          value={activePeriod}
          onChange={(e) => setActivePeriod(e.target.value)}
          className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
        >
          <option value="2026-08" className="dark:bg-slate-900 text-slate-900 dark:text-white">
            2026-08 ({lang === 'ar' ? 'آب / أغسطس' : 'August 2026'})
          </option>
          <option value="2026-07" className="dark:bg-slate-900 text-slate-900 dark:text-white">
            2026-07 ({lang === 'ar' ? 'تموز / يوليو' : 'July 2026'})
          </option>
          <option value="2026-06" className="dark:bg-slate-900 text-slate-900 dark:text-white">
            2026-06 ({lang === 'ar' ? 'حزيران / يونيو' : 'June 2026'})
          </option>
          <option value="2026-01" className="dark:bg-slate-900 text-slate-900 dark:text-white">
            2026-01 ({lang === 'ar' ? 'كانون الثاني / يناير' : 'January 2026'})
          </option>
        </select>
      </div>

      {/* Right Action Controls */}
      <div className="flex items-center gap-2">
        {/* Quick Simulator button */}
        <button
          onClick={() => setActiveTab('simulator')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('rule_simulator')}</span>
          <span className="sm:hidden">{lang === 'ar' ? 'محاكاة' : 'Simulate'}</span>
        </button>

        {/* Language Switcher */}
        <button
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          className="px-2.5 py-1.5 rounded-xl text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors flex items-center gap-1.5 text-xs font-bold"
          title={lang === 'ar' ? 'Switch to English' : 'التحويل للعربية'}
        >
          <Globe className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span className="uppercase text-[11px]">{lang === 'ar' ? 'EN' : 'عربي'}</span>
        </button>

        {/* Theme Switcher */}
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors"
          title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
        >
          {theme === 'light' ? (
            <Moon className="w-4 h-4 text-slate-700" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400" />
          )}
        </button>
      </div>
    </header>
  );
};

