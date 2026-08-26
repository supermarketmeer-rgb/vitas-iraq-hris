import React, { useState } from 'react';
import { CATEGORY_GROUPS } from '../data/categories';
import { useApp } from '../context/AppContext';

export const Sidebar: React.FC = () => {
  const {
    activeModuleId,
    setActiveModuleId,
    isSidebarOpen,
    language,
    toggleLanguage,
    toggleTheme,
    t,
    employees,
    leaveRequests,
    jobVacancies,
    candidates,
    assetRecords,
    riskRecords,
    documentRecords,
    currentUserRole,
    currentUser,
    theme
  } = useApp();

  const isEmployeeRole = currentUserRole === 'Employee' || currentUser?.role === 'Employee';

  const EMPLOYEE_ALLOWED_MODULE_IDS = new Set([
    'dash-ess',
    'dash-overview',
    'dash-search',
    'emp-profile',
    'emp-organization',
    'emp-contracts',
    'emp-company-profile',
    'emp-calendar',
    'emp-news',
    'cat-4-leave',
    'leave-attendance',
    'leave-apply',
    'leave-timesheets',
    'leave-directory',
    'leave-schedule',
    'cat-5-payroll',
    'payroll-payslips',
    'cat-7-perf',
    'perf-evaluations',
    'perf-goals',
    'doc-mgmt',
  ]);

  // Collapsed by default as requested
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  const [sidebarFilter, setSidebarFilter] = useState('');

  const toggleCategory = (id: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const collapseAll = () => {
    setOpenCategories({});
  };

  const expandAll = () => {
    const allOpen: Record<string, boolean> = {};
    CATEGORY_GROUPS.forEach(cat => {
      allOpen[cat.id] = true;
    });
    setOpenCategories(allOpen);
  };

  // Helper to retrieve live badge count for specific modules
  const getBadgeCount = (moduleId: string): number | null => {
    switch (moduleId) {
      case 'emp-directory':
      case 'emp-hr-directory':
        return employees.length;
      case 'leave-directory':
      case 'leave-approvals':
        return leaveRequests.filter(r => r.status === 'قيد الانتظار').length;
      case 'recruit-dash':
        return jobVacancies.length;
      case 'recruit-ats':
      case 'recruit-candidate-profile':
        return candidates.length;
      case 'asset-inventory':
        return assetRecords.length;
      case 'risk-assessment':
        return riskRecords.length;
      case 'doc-mgmt':
      case 'doc-edms':
        return documentRecords.length;
      default:
        return null;
    }
  };

  const isDark = theme === 'dark';

  if (!isSidebarOpen) {
    return null;
  }

  return (
    <aside className={`w-80 ${isDark ? 'bg-[#06080d] border-[#1e2a44] text-slate-300' : 'bg-[#e8ebef] border-slate-300 text-slate-800 shadow-sm'} border-x flex flex-col h-screen sticky top-0 z-20 shrink-0 select-none transition-all duration-200 print:hidden`}>
      {/* Sidebar Top Filter & Collapse Controls */}
      <div className={`p-3 border-b ${isDark ? 'border-[#1e2a44] bg-[#06080d]' : 'border-slate-300'} space-y-2`}>
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm text-teal-400">menu_open</span>
            {t('أقسام النظام', 'System Categories')}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={collapseAll}
              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-teal-400 text-[11px] flex items-center gap-1 transition-all"
              title={t('طوي كافة القوائم', 'Collapse all categories')}
            >
              <span className="material-symbols-outlined text-sm">unfold_less</span>
              <span>{t('طوي الكل', 'Collapse All')}</span>
            </button>
            <button
              onClick={expandAll}
              className="p-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-teal-400 transition-all"
              title={t('توسيع كافة القوائم', 'Expand all categories')}
            >
              <span className="material-symbols-outlined text-sm">unfold_more</span>
            </button>
          </div>
        </div>

        <div className="relative">
          <span className={`material-symbols-outlined absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-2.5 text-slate-500 text-lg`}>
            filter_list
          </span>
          <input
            type="text"
            placeholder={t('صفّي أقسام النظام...', 'Filter system modules...')}
            value={sidebarFilter}
            onChange={e => setSidebarFilter(e.target.value)}
            className={`w-full bg-white/5 border border-white/10 rounded-xl ${language === 'ar' ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500/60 transition-colors placeholder:text-slate-500`}
          />
          {sidebarFilter && (
            <button
              onClick={() => setSidebarFilter('')}
              className={`absolute ${language === 'ar' ? 'left-2.5' : 'right-2.5'} top-2 text-slate-400 hover:text-slate-200 text-xs`}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Navigation Categories Scrollable Container */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {CATEGORY_GROUPS.map((cat, groupIndex) => {
          // Filter modules based on user role and quick sidebar filter
          const filteredModules = cat.modules.filter(m => {
            if (m.hidden) return false;
            if (isEmployeeRole && !EMPLOYEE_ALLOWED_MODULE_IDS.has(m.id)) return false;
            if (sidebarFilter) {
              return m.title.includes(sidebarFilter) || m.titleEn.toLowerCase().includes(sidebarFilter.toLowerCase());
            }
            return true;
          });

          if (filteredModules.length === 0) {
            return null;
          }

          const isOpen = openCategories[cat.id];
          const displayCatTitle = language === 'en' ? cat.titleEn : cat.title;
          const displayCatSubtitle = language === 'en' ? cat.title : cat.titleEn;

          return (
            <div
              key={cat.id}
              className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden shadow-sm"
            >
              {/* Category Header Bar */}
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-start hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-teal-600/10 border border-teal-500/20 text-teal-400 flex items-center justify-center text-sm font-bold">
                    {groupIndex + 1}
                  </span>
                  <div>
                    <h2 className="text-xs font-bold text-slate-200 group-hover:text-teal-400 transition-colors">
                      {displayCatTitle}
                    </h2>
                    <p className="text-[10px] text-slate-500 font-mono tracking-tight">
                      {displayCatSubtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold bg-white/5 text-slate-400 px-1.5 py-0.5 rounded">
                    {filteredModules.length}
                  </span>
                  <span
                    className={`material-symbols-outlined text-slate-400 text-lg transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  >
                    expand_more
                  </span>
                </div>
              </button>

              {/* Module Items List */}
              {isOpen && (
                <div className="p-1.5 pt-0 space-y-1 bg-[#0a0c10]/40 border-t border-white/5">
                  {filteredModules.map(mod => {
                    const isActive = activeModuleId === mod.id;
                    const badgeCount = getBadgeCount(mod.id);
                    const displayModTitle = language === 'en' ? mod.titleEn : mod.title;

                    // Special styling for Module & Biometric Settings
                    if (mod.id === 'leave-biometric-settings') {
                      return (
                        <button
                          key={mod.id}
                          onClick={() => setActiveModuleId(mod.id)}
                          className={`w-full text-center my-1.5 px-3 py-3 rounded-2xl text-xs flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-98 cursor-pointer ${
                            isActive
                              ? 'bg-[#06080d] text-emerald-400 font-normal border-2 border-emerald-500 shadow-emerald-900/40'
                              : 'bg-[#06080d] text-white font-normal border border-emerald-500/40 hover:border-emerald-400 shadow-emerald-950/30'
                          }`}
                        >
                          <span className="material-symbols-outlined text-lg text-emerald-400">
                            settings
                          </span>
                          <span className="leading-snug max-w-[170px] text-center font-normal">
                            {displayModTitle}
                          </span>
                        </button>
                      );
                    }

                    return (
                      <button
                        key={mod.id}
                        onClick={() => setActiveModuleId(mod.id)}
                        className={`w-full text-start px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all group ${
                          isActive
                            ? 'bg-[#06080d] text-teal-400 font-normal border border-teal-500 shadow-md shadow-teal-500/10'
                            : 'text-slate-300 hover:bg-white/5 hover:text-teal-400 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`material-symbols-outlined text-base ${
                              isActive
                                ? 'text-teal-400'
                                : 'text-slate-400 group-hover:text-teal-400'
                            }`}
                          >
                            {mod.icon}
                          </span>
                          <span className="truncate">{displayModTitle}</span>
                        </div>

                        {/* Badges for Category 4 */}
                        {mod.id === 'leave-apply' && (
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 animate-pulse ml-1" />
                        )}

                        {mod.id === 'leave-approvals' && (
                          <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-normal text-[11px] flex items-center justify-center shrink-0 ml-1 shadow-sm">
                            3
                          </span>
                        )}

                        {mod.id !== 'leave-apply' && mod.id !== 'leave-approvals' && badgeCount !== null && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-normal ml-1 ${
                              isActive
                                ? 'bg-[#06080d] text-teal-400 border border-teal-500'
                                : 'bg-teal-600/10 text-teal-400 border border-teal-500/20'
                            }`}
                          >
                            {badgeCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Settings & Bottom Controls (Settings & Security + Language Icon + Theme Icon on the SAME row) */}
      <div className={`p-1.5 border-t ${isDark ? 'border-[#1e2a44] bg-[#06080d]' : 'border-slate-300 bg-[#e8ebef]'} flex items-center gap-1.5`}>
        {/* Settings & Security Button */}
        <button
          onClick={() => setActiveModuleId('sys-settings-security')}
          className={`flex-1 px-2.5 h-8 rounded-xl flex items-center gap-2 transition-all text-[11px] font-normal ${
            activeModuleId === 'sys-settings-security'
              ? 'bg-[#06080d] text-teal-400 border border-teal-500 shadow-md'
              : isDark
                ? 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-teal-400 border border-white/10'
                : 'bg-white/80 text-slate-800 hover:bg-white border border-slate-300 shadow-sm'
          }`}
          title={t('الإعدادات والأمان', 'Settings & Security')}
        >
          <span className="material-symbols-outlined text-base">settings</span>
          <span className="truncate">{t('الإعدادات والأمان', 'Settings & Security')}</span>
        </button>

        {/* Language AR/EN Toggle Button */}
        <button
          onClick={toggleLanguage}
          className={`h-8 px-3 rounded-xl border flex items-center justify-center transition-all shadow-sm shrink-0 text-xs font-normal ${
            isDark
              ? 'bg-[#06080d] border-white/10 text-white hover:bg-white/10 hover:border-teal-500/50'
              : 'bg-[#f1f5f9] border-slate-300 text-slate-900 hover:bg-white'
          }`}
          title={language === 'ar' ? 'Switch to English' : 'التحويل للعربية'}
        >
          <span className={`text-xs tracking-wider font-normal ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {language === 'ar' ? 'EN' : 'AR'}
          </span>
        </button>

        {/* Theme Day/Night Toggle Button */}
        <button
          onClick={toggleTheme}
          className={`h-8 px-2.5 rounded-xl border flex items-center justify-center transition-all shadow-sm shrink-0 text-xs font-normal ${
            isDark
              ? 'bg-[#06080d] border-white/10 text-white hover:bg-white/10 hover:border-teal-500/50'
              : 'bg-[#f1f5f9] border-slate-300 text-slate-900 hover:bg-white'
          }`}
          title={theme === 'dark' ? t('الوضع الفاتح', 'Light Mode') : t('الوضع الداكن', 'Dark Mode')}
        >
          <span className="text-sm">{isDark ? '☀️' : '🌙'}</span>
        </button>
      </div>

      {/* Sidebar Footer info */}
      <div className="p-3 border-t border-[#1e2a44] bg-[#06080d] text-center">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span>{t('حالة النظام:', 'System Status:')} <span className="text-emerald-400 font-normal">{t('متصل بـ API', 'Connected API')}</span></span>
          <span className="text-[10px] font-mono bg-[#06080d] text-teal-400 shadow-md px-1.5 py-0.5 rounded border border-teal-500">
            v2.5 Enterprise
          </span>
        </div>
      </div>
    </aside>
  );
};
