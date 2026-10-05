import React, { useState, useEffect, useRef } from 'react';
import { CATEGORY_GROUPS } from '../data/categories';
import { useApp } from '../context/AppContext';
import { getUserEffectivePermissions, isModuleAuthorized } from '../utils/permissionHelper';

export const Sidebar: React.FC = () => {
  const {
    activeModuleId,
    setActiveModuleId,
    isSidebarOpen,
    setIsSidebarOpen,
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

  const currentRole = currentUserRole || currentUser?.role || 'Employee';
  const userPerms = getUserEffectivePermissions(currentUser, currentRole);
  const isDark = theme === 'dark';

  // Collapsed by default as requested
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [sidebarFilter, setSidebarFilter] = useState('');


  // Ref to the aside element — used to force dark blue bg + white color in light mode via JS
  // (CSS alone cannot reliably override Tailwind v4 utility cascade in this project)
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const aside = sidebarRef.current;
    if (!aside) return;

    const applyDark = () => {
      // Disconnect first to prevent style changes from re-triggering the observer
      observer.disconnect();

      const applyEl = (el: Element) => {
        const tag = (el as HTMLElement).tagName?.toLowerCase();
        if (!tag) return;
        const isImg = tag === 'img';
        const isInput = tag === 'input' || tag === 'select' || tag === 'textarea';
        const isContainer = tag === 'div' || tag === 'nav' || tag === 'section' || tag === 'ul' || tag === 'li' || tag === 'aside';

        const isTeal = (el as HTMLElement).classList.contains('text-teal-400') ||
                       (el as HTMLElement).classList.contains('text-teal-300') ||
                       !!(el as HTMLElement).closest('.border-teal-500');
        const isRose = (el as HTMLElement).classList.contains('bg-rose-500') ||
                       !!(el as HTMLElement).closest('.bg-rose-500');
        const isEmerald = (el as HTMLElement).classList.contains('text-emerald-400');

        if (!isImg) {
          if (isTeal) {
            (el as HTMLElement).style.setProperty('color', '#2dd4bf', 'important');
          } else if (isRose) {
            (el as HTMLElement).style.setProperty('color', '#ffffff', 'important');
          } else if (isEmerald) {
            (el as HTMLElement).style.setProperty('color', '#34d399', 'important');
          } else {
            (el as HTMLElement).style.setProperty('color', '#e2e8f0', 'important');
          }
        }
        if (isContainer) {
          const insideButton = !!(el as HTMLElement).closest('button');
          (el as HTMLElement).style.setProperty('background-color', insideButton ? 'transparent' : '#06080d', 'important');
        }
        if (isInput) {
          (el as HTMLElement).style.setProperty('background-color', 'rgba(255,255,255,0.08)', 'important');
          (el as HTMLElement).style.setProperty('border-color', 'rgba(255,255,255,0.2)', 'important');
        }
        if (tag === 'button') {
          const btn = el as HTMLElement;
          const isBtnActive = btn.classList.contains('border-teal-500') || btn.className.includes('border-teal-500');
          if (isBtnActive) {
            btn.style.setProperty('background-color', '#06080d', 'important');
            btn.style.setProperty('border-color', '#14b8a6', 'important');
          }
        }
      };

      applyEl(aside);
      aside.querySelectorAll('*').forEach(applyEl);

      // Reconnect after applying styles
      observer.observe(aside, { childList: true, subtree: true });
    };

    const observer = new MutationObserver(applyDark);
    applyDark();
    return () => observer.disconnect();
  }, [isDark, openCategories, sidebarFilter, activeModuleId]);




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

  // Helper to close sidebar drawer on mobile after clicking an item
  const handleSelectModule = (modId: string) => {
    setActiveModuleId(modId);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
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



  if (!isSidebarOpen) {
    return null;
  }

  // Pre-calculate count of permitted categories (Excluding authentication/login demo pages)
  const permittedCategories = CATEGORY_GROUPS
    .filter(cat => cat.id !== 'cat-1-auth')
    .map(cat => {
      const filteredModules = cat.modules.filter(m => {
        if (m.hidden) return false;
        if (!isModuleAuthorized(cat.id, m.id, userPerms, currentRole)) {
          return false;
        }
        if (sidebarFilter) {
          return m.title.includes(sidebarFilter) || m.titleEn.toLowerCase().includes(sidebarFilter.toLowerCase());
        }
        return true;
      });
      return { ...cat, filteredModules };
    }).filter(c => c.filteredModules.length > 0);

  const totalPermittedModules = permittedCategories.reduce((acc, c) => acc + c.filteredModules.length, 0);

  return (
    <>
      {/* Mobile Drawer Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden animate-in fade-in duration-200"
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden="true"
      />

      <aside
        ref={sidebarRef}
        className="fixed inset-y-0 start-0 z-50 w-80 max-w-[85vw] lg:static lg:w-80 h-full lg:h-screen lg:sticky lg:top-0 border-x flex flex-col shrink-0 select-none transition-all duration-300 shadow-2xl lg:shadow-none print:hidden bg-[#06080d] border-[#1e2a44] text-slate-300"
      >


        {/* Mobile Header: Displays current user badge & authorized module count */}
        <div className="lg:hidden p-3.5 border-b border-teal-500/20 bg-teal-950/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 font-bold shrink-0 overflow-hidden shadow-inner">
              {currentUser?.avatar ? (
                <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-xl">person</span>
              )}
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold truncate text-white">
                {currentUser?.name || t('المستخدم المرخص', 'Authorized User')}
              </h4>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-teal-400 font-bold px-1.5 py-0.2 rounded bg-teal-500/10 border border-teal-500/30">
                  {currentUser?.role || currentRole}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {totalPermittedModules} {t('موديول مرخص', 'modules')}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsSidebarOpen(false)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title={t('إغلاق القائمة', 'Close Menu')}
          >
            ✕
          </button>
        </div>

        {/* Sidebar Top Filter & Collapse Controls */}
        <div
          className="p-3 border-b border-[#1e2a44] bg-[#06080d] space-y-2"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-teal-400">menu_open</span>
              <span className="text-[11px] font-bold text-slate-200">
                {t('أقسام النظام المرخصة', 'Authorized Categories')}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-400 font-mono font-bold">
                {permittedCategories.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={collapseAll}
                className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-teal-400 text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                title={t('طوي كافة القوائم', 'Collapse all categories')}
              >
                <span className="material-symbols-outlined text-sm">unfold_less</span>
                <span>{t('طوي الكل', 'Collapse All')}</span>
              </button>
              <button
                onClick={expandAll}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-teal-400 transition-all cursor-pointer"
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
              placeholder={t('ابحث في الموديولات المتاحة لك...', 'Filter your permitted modules...')}
              value={sidebarFilter}
              onChange={e => setSidebarFilter(e.target.value)}
              className={`w-full bg-white/5 border border-white/10 rounded-xl ${language === 'ar' ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500/60 transition-colors placeholder:text-slate-500`}
            />

            {sidebarFilter && (
              <button
                onClick={() => setSidebarFilter('')}
                className={`absolute ${language === 'ar' ? 'left-2.5' : 'right-2.5'} top-2 text-slate-400 hover:text-slate-200 text-xs cursor-pointer`}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Navigation Categories Scrollable Container */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
          {permittedCategories.map((cat, groupIndex) => {
            const isOpen = openCategories[cat.id];
            const displayCatTitle = language === 'en' ? cat.titleEn : cat.title;
            const displayCatSubtitle = language === 'en' ? cat.title : cat.titleEn;

            return (
              <div
                key={cat.id}
                className="rounded-2xl overflow-hidden shadow-md bg-white/[0.03]"
              >
                {/* Category Header Bar */}
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between text-start hover:bg-white/5 transition-colors group cursor-pointer text-white"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold bg-teal-600/20 border border-teal-500/40 text-teal-300"
                    >
                      {groupIndex + 1}
                    </span>
                    <div>
                      <h2 className="text-xs font-bold text-white group-hover:text-teal-400 transition-colors">
                        {displayCatTitle}
                      </h2>
                      <p className="text-[10px] text-white/80 font-mono tracking-tight">
                        {displayCatSubtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold bg-white/10 text-white px-1.5 py-0.5 rounded">
                      {cat.filteredModules.length}
                    </span>
                    <span
                      className={`material-symbols-outlined text-white text-lg transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    >
                      expand_more
                    </span>
                  </div>
                </button>

                {/* Module Items List */}
                {isOpen && (
                  <div
                    className="p-1.5 pt-0 space-y-1 border-t border-white/5 bg-[#0a0c10]/40"
                  >
                    {cat.filteredModules.map(mod => {
                      const isActive = activeModuleId === mod.id;
                      const badgeCount = getBadgeCount(mod.id);
                      const displayModTitle = language === 'en' ? mod.titleEn : mod.title;

                      return (
                        <button
                          key={mod.id}
                          onClick={() => handleSelectModule(mod.id)}
                          className={`w-full text-start px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all group cursor-pointer focus:outline-none focus:ring-0 ${
                            isActive
                              ? `bg-[#06080d] text-teal-400 font-bold border border-teal-500 shadow-md shadow-teal-500/10`
                              : 'text-white hover:bg-white/10 hover:text-teal-400 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`material-symbols-outlined text-base ${
                                isActive
                                  ? 'text-teal-400'
                                  : 'text-white group-hover:text-teal-400'
                              }`}
                            >
                              {mod.icon}
                            </span>
                            <span className="truncate">{displayModTitle}</span>
                          </div>

                          {/* Live Badges */}
                          {mod.id === 'leave-apply' && (
                            <span className="text-[10px] bg-teal-500/20 text-teal-300 px-1.5 py-0.2 rounded-full font-mono font-bold">
                              New
                            </span>
                          )}

                          {mod.id === 'leave-approvals' && badgeCount !== null && badgeCount > 0 && (
                            <span className="text-[10px] bg-rose-500 text-white px-1.5 py-0.2 rounded-full font-mono font-bold animate-pulse">
                              {badgeCount}
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

          {permittedCategories.length === 0 && (
            <div className="p-6 text-center text-slate-400 text-xs">
              <span className="material-symbols-outlined text-3xl block mb-2 text-slate-500">lock</span>
              <p>{t('لا توجد موديولات مطابقة لبحثك أو صلاحيات حسابك', 'No modules match your filter or permissions')}</p>
            </div>
          )}
        </nav>

        {/* Settings & Bottom Controls (Settings & Security + Language Icon + Theme Icon on the SAME row) */}
        <div
          id="sidebar-footer-controls"
          className="p-1.5 border-t border-[#1e2a44] bg-[#06080d] flex items-center gap-1.5"
        >
          {/* Settings & Security Button (Available ONLY if user has settings permissions) */}
          {(userPerms.isSuperAdmin || userPerms.settings) ? (
            <button
              onClick={() => handleSelectModule('sys-settings-security')}
              className={`flex-1 px-2.5 h-8 rounded-xl flex items-center gap-2 transition-all text-[11px] font-normal cursor-pointer ${
                activeModuleId === 'sys-settings-security'
                  ? 'bg-[#06080d] text-teal-400 border border-teal-500 shadow-md'
                  : isDark
                    ? 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-teal-400 border border-white/10'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-teal-400 border border-white/10'
              }`}
              title={t('الإعدادات والأمان', 'Settings & Security')}
            >
              <span className="material-symbols-outlined text-base">settings</span>
              <span className="truncate">{t('الإعدادات والأمان', 'Settings & Security')}</span>
            </button>
          ) : (
            <button
              onClick={() => handleSelectModule('emp-profile')}
              className={`flex-1 px-2.5 h-8 rounded-xl flex items-center gap-2 transition-all text-[11px] font-normal cursor-pointer ${
                activeModuleId === 'emp-profile'
                  ? 'bg-[#06080d] text-teal-400 border border-teal-500 shadow-md'
                  : isDark
                    ? 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-teal-400 border border-white/10'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-teal-400 border border-white/10'
              }`}
              title={t('ملفي الوظيفي', 'My Profile')}
            >
              <span className="material-symbols-outlined text-base">person</span>
              <span className="truncate">{t('ملفي الوظيفي', 'My Profile')}</span>
            </button>
          )}

          {/* Language AR/EN Toggle Button */}
          <button
            onClick={toggleLanguage}
            className="h-8 px-3 rounded-xl border flex items-center justify-center transition-all shadow-sm shrink-0 text-xs font-normal cursor-pointer bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-teal-500/50"
            title={language === 'ar' ? 'Switch to English' : 'التحويل للعربية'}
          >
            <span className="text-xs tracking-wider font-normal text-white">
              {language === 'ar' ? 'EN' : 'AR'}
            </span>
          </button>

          {/* Theme Day/Night Toggle Button */}
          <button
            onClick={toggleTheme}
            className="h-8 px-2.5 rounded-xl border flex items-center justify-center transition-all shadow-sm shrink-0 text-xs font-normal cursor-pointer bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-teal-500/50"
            title={theme === 'dark' ? t('الوضع الفاتح', 'Light Mode') : t('الوضع الداكن', 'Dark Mode')}
          >
            <span className="text-sm">{isDark ? '☀️' : '🌙'}</span>
          </button>
        </div>

        {/* Sidebar Footer info */}
        <div
          className="p-3 border-t border-[#1e2a44] bg-[#06080d] text-center"
        >
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>{t('الصلاحيات:', 'Access:')} <span className="text-emerald-400 font-normal">{userPerms.isSuperAdmin ? t('كاملة', 'Full') : t('مخصصة', 'Role Based')}</span></span>
            <span className={`text-[10px] font-mono ${isDark ? 'bg-[#06080d]' : 'bg-[#06080d]'} text-teal-400 shadow-md px-1.5 py-0.5 rounded border border-teal-500`}>
              v2.5 Enterprise
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
