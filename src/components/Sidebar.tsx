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


  // Ref to the aside element — dynamically aligns with theme (#eef2f6 in light mode, #06080d in dark mode)
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const aside = sidebarRef.current;
    if (!aside) return;

    const applyTheme = () => {
      // Disconnect first to prevent style changes from re-triggering the observer
      observer.disconnect();

      if (isDark) {
        aside.style.setProperty('background-color', '#06080d', 'important');
        aside.style.setProperty('border-color', '#1e2a44', 'important');
        aside.style.setProperty('color', '#cbd5e1', 'important');

        const applyElDark = (el: Element) => {
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
            const hasOwnBorder = el.classList.contains('border-b') || el.classList.contains('border-t') || el.classList.contains('border-teal-500') || el.classList.contains('border-x');
            if (!hasOwnBorder) {
              (el as HTMLElement).style.setProperty('border', 'none', 'important');
              (el as HTMLElement).style.setProperty('outline', 'none', 'important');
              (el as HTMLElement).style.setProperty('box-shadow', 'none', 'important');
            }
          }
          if (isInput) {
            (el as HTMLElement).style.setProperty('background-color', '#0a0d14', 'important');
            (el as HTMLElement).style.setProperty('border-color', '#1e2a44', 'important');
            (el as HTMLElement).style.setProperty('outline', 'none', 'important');
          }
          if (tag === 'button') {
            const btn = el as HTMLElement;
            const isBtnActive = btn.classList.contains('border-teal-500') || btn.className.includes('border-teal-500');
            if (isBtnActive) {
              btn.style.setProperty('background-color', '#06080d', 'important');
              btn.style.setProperty('border-color', '#14b8a6', 'important');
            } else {
              if (btn.classList.contains('border-transparent') || btn.className.includes('border-transparent')) {
                btn.style.setProperty('border-color', 'transparent', 'important');
                btn.style.setProperty('background-color', 'transparent', 'important');
              } else {
                btn.style.setProperty('border-color', '#1e2a44', 'important');
                btn.style.setProperty('background-color', '#0f172a', 'important');
              }
            }
          }
        };

        aside.querySelectorAll('*').forEach(applyElDark);
      } else {
        // Light mode: match page title canvas #eef2f6
        aside.style.setProperty('background-color', '#eef2f6', 'important');
        aside.style.setProperty('border-color', '#cbd5e1', 'important');
        aside.style.setProperty('color', '#0f172a', 'important');

        const applyElLight = (el: Element) => {
          const tag = (el as HTMLElement).tagName?.toLowerCase();
          if (!tag) return;
          const isImg = tag === 'img';
          const isInput = tag === 'input' || tag === 'select' || tag === 'textarea';
          const isContainer = tag === 'div' || tag === 'nav' || tag === 'section' || tag === 'ul' || tag === 'li' || tag === 'aside';

          const isTeal = (el as HTMLElement).classList.contains('text-teal-400') ||
                         (el as HTMLElement).classList.contains('text-teal-300') ||
                         (el as HTMLElement).classList.contains('text-teal-700') ||
                         !!(el as HTMLElement).closest('.border-teal-500');
          const isRose = (el as HTMLElement).classList.contains('bg-rose-500') ||
                         (el as HTMLElement).classList.contains('bg-rose-600') ||
                         !!(el as HTMLElement).closest('.bg-rose-500');

          if (!isImg) {
            if (isTeal) {
              (el as HTMLElement).style.setProperty('color', '#0d9488', 'important');
            } else if (isRose) {
              (el as HTMLElement).style.setProperty('color', '#ffffff', 'important');
            } else {
              (el as HTMLElement).style.setProperty('color', '#0f172a', 'important');
            }
          }
          if (isContainer) {
            const insideButton = !!(el as HTMLElement).closest('button');
            (el as HTMLElement).style.setProperty('background-color', insideButton ? 'transparent' : '#eef2f6', 'important');
            (el as HTMLElement).style.setProperty('border-color', '#cbd5e1', 'important');
          }
          if (isInput) {
            (el as HTMLElement).style.setProperty('background-color', '#eef2f6', 'important');
            (el as HTMLElement).style.setProperty('border-color', '#cbd5e1', 'important');
            (el as HTMLElement).style.setProperty('color', '#0f172a', 'important');
            (el as HTMLElement).style.setProperty('outline', 'none', 'important');
          }
          if (tag === 'button') {
            const btn = el as HTMLElement;
            const isBtnActive = btn.classList.contains('border-teal-500') || btn.className.includes('border-teal-500');
            if (isBtnActive) {
              btn.style.setProperty('background-color', '#e2e8f0', 'important');
              btn.style.setProperty('border-color', '#14b8a6', 'important');
              btn.style.setProperty('color', '#0d9488', 'important');
            } else {
              if (btn.classList.contains('border-transparent') || btn.className.includes('border-transparent')) {
                btn.style.setProperty('border-color', 'transparent', 'important');
                btn.style.setProperty('background-color', 'transparent', 'important');
                btn.style.setProperty('color', '#334155', 'important');
              } else {
                btn.style.setProperty('border-color', '#cbd5e1', 'important');
                btn.style.setProperty('background-color', '#eef2f6', 'important');
                btn.style.setProperty('color', '#0f172a', 'important');
              }
            }
          }
        };

        aside.querySelectorAll('*').forEach(applyElLight);
      }

      // Reconnect after applying styles
      observer.observe(aside, { childList: true, subtree: true });
    };

    const observer = new MutationObserver(applyTheme);
    applyTheme();
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
        return jobVacancies.filter(j => j.status === 'مفتوحة' || j.status === 'Open').length;
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
        className={`max-lg:fixed inset-y-0 start-0 z-50 w-80 max-w-[85vw] lg:w-80 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:z-20 border-x flex flex-col shrink-0 select-none transition-all duration-300 shadow-2xl lg:shadow-none print:hidden ${isDark ? "bg-[#06080d] border-[#1e2a44] text-slate-300" : "bg-[#eef2f6] border-[#cbd5e1] text-slate-900"}`}
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
          className={`p-3 border-b space-y-2 ${isDark ? "border-[#1e2a44] bg-[#06080d]" : "border-[#cbd5e1] bg-[#eef2f6]"}`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-teal-400">menu_open</span>
              <span className="text-[11px] font-bold text-slate-200">
                {t('أقسام النظام المرخصة', 'Authorized Categories')}
              </span>
              <span className={`cat-counter-badge text-[10px] px-2 py-0.5 rounded-md border font-mono font-bold ${
                isDark
                  ? 'bg-teal-500/10 text-teal-400 border-teal-500/30'
                  : 'bg-teal-50 text-teal-800 border-teal-200 shadow-2xs'
              }`}>
                {permittedCategories.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={collapseAll}
                className={`px-2 py-1 rounded-lg text-[11px] flex items-center gap-1 transition-all cursor-pointer ${isDark ? "bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 text-slate-300 hover:text-teal-400" : "bg-[#eef2f6] hover:bg-[#e2e8f0] border border-[#cbd5e1] text-slate-700 hover:text-teal-700"}`}
                title={t('طوي كافة القوائم', 'Collapse all categories')}
              >
                <span className="material-symbols-outlined text-sm">unfold_less</span>
                <span>{t('طوي الكل', 'Collapse All')}</span>
              </button>
              <button
                onClick={expandAll}
                className={`p-1 rounded-lg transition-all cursor-pointer ${isDark ? "bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 text-slate-400 hover:text-teal-400" : "bg-[#eef2f6] hover:bg-[#e2e8f0] border border-[#cbd5e1] text-slate-700 hover:text-teal-700"}`}
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
              className={`w-full border rounded-xl ${language === 'ar' ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-1.5 text-xs focus:outline-none focus:border-teal-500/60 transition-colors ${isDark ? "bg-[#0a0d14] border-slate-800/80 text-slate-200 placeholder:text-slate-500" : "bg-[#eef2f6] border-[#cbd5e1] text-slate-900 placeholder:text-slate-500"}`}
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
                className={`rounded-2xl overflow-hidden shadow-xs border ${isDark ? "bg-white/[0.03] border-white/5" : "bg-[#eef2f6] border-[#cbd5e1]"}`}
              >
                {/* Category Header Bar */}
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className={`w-full px-3.5 py-2.5 flex items-center justify-between text-start transition-colors group cursor-pointer ${isDark ? "hover:bg-white/5 text-white" : "hover:bg-[#e2e8f0] text-slate-900"}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold border transition-colors ${
                        isDark
                          ? 'bg-teal-600/20 border-teal-500/40 text-teal-300'
                          : 'bg-teal-50 border-teal-300/80 text-teal-800 shadow-2xs'
                      }`}
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
                    <span className={`cat-counter-badge text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                      isDark
                        ? 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                        : 'bg-teal-50 text-teal-800 border-teal-200/90 shadow-2xs'
                    }`}>
                      {cat.filteredModules.length}
                    </span>
                    <span
                      className={`material-symbols-outlined text-lg transition-transform duration-200 ${
                        isDark ? 'text-white' : 'text-slate-700'
                      } ${isOpen ? 'rotate-180' : ''}`}
                    >
                      expand_more
                    </span>
                  </div>
                </button>

                {/* Module Items List */}
                {isOpen && (
                  <div
                    className={`p-1.5 pt-0 space-y-1 border-t ${isDark ? "border-white/5 bg-[#0a0c10]/40" : "border-[#cbd5e1] bg-[#eef2f6]"}`}
                  >
                    {cat.filteredModules.map(mod => {
                      const isActive = activeModuleId === mod.id;
                      const badgeCount = getBadgeCount(mod.id);
                      const displayModTitle = language === 'en' ? mod.titleEn : mod.title;

                      return (
                        <button
                          key={mod.id}
                          onClick={() => handleSelectModule(mod.id)}
                          style={{
                            borderColor: isActive ? '#14b8a6' : 'transparent',
                            backgroundColor: isActive ? (isDark ? '#06080d' : '#e2e8f0') : 'transparent'
                          }}
                          className={`w-full text-start px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all group cursor-pointer focus:outline-none focus:ring-0 ${
                            isActive
                              ? (isDark ? 'bg-[#06080d] text-teal-400 font-bold border border-teal-500 shadow-md shadow-teal-500/10' : 'bg-[#e2e8f0] text-teal-800 font-bold border border-teal-500 shadow-xs')
                              : (isDark ? 'text-white hover:bg-white/10 hover:text-teal-400 border border-transparent' : 'text-slate-700 hover:bg-[#e2e8f0] hover:text-teal-700 border border-transparent')
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
                              className={`cat-counter-badge text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1 border ${
                                isActive
                                  ? (isDark ? 'bg-[#06080d] text-teal-400 border-teal-500' : 'bg-teal-100 text-teal-800 border-teal-300')
                                  : (isDark ? 'bg-teal-600/10 text-teal-400 border-teal-500/20' : 'bg-teal-50 text-teal-800 border-teal-200')
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
          className={`p-1.5 border-t flex items-center gap-1.5 ${isDark ? "border-[#1e2a44] bg-[#06080d]" : "border-[#cbd5e1] bg-[#eef2f6]"}`}
        >
          {/* Employee Profile Button (Settings & Security is hidden from all users) */}
          <button
            onClick={() => handleSelectModule('emp-profile')}
            className={`flex-1 px-2.5 h-8 rounded-xl flex items-center gap-2 transition-all text-[11px] font-normal cursor-pointer ${
              activeModuleId === 'emp-profile'
                ? 'bg-[#06080d] text-teal-400 border border-teal-500 shadow-md'
                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-teal-400 border border-slate-800/80'
            }`}
            title={t('ملفي الوظيفي', 'My Profile')}
          >
            <span className="material-symbols-outlined text-base">person</span>
            <span className="truncate">{t('ملفي الوظيفي', 'My Profile')}</span>
          </button>

          {/* Language AR/EN Toggle Button */}
          <button
            onClick={toggleLanguage}
            className="h-8 px-3 rounded-xl border flex items-center justify-center transition-all shadow-sm shrink-0 text-xs font-normal cursor-pointer bg-slate-900/80 border-slate-800/80 text-white hover:bg-slate-800 hover:border-teal-500/50"
            title={language === 'ar' ? 'Switch to English' : 'التحويل للعربية'}
          >
            <span className="text-xs tracking-wider font-normal text-white">
              {language === 'ar' ? 'EN' : 'AR'}
            </span>
          </button>

          {/* Theme Day/Night Toggle Button */}
          <button
            onClick={toggleTheme}
            className="h-8 px-2.5 rounded-xl border flex items-center justify-center transition-all shadow-sm shrink-0 text-xs font-normal cursor-pointer bg-slate-900/80 border-slate-800/80 text-white hover:bg-slate-800 hover:border-teal-500/50"
            title={theme === 'dark' ? t('الوضع الفاتح', 'Light Mode') : t('الوضع الداكن', 'Dark Mode')}
          >
            <span className="text-sm">{isDark ? '☀️' : '🌙'}</span>
          </button>
        </div>

        {/* Sidebar Footer info */}
        <div
          className={`p-3 border-t text-center ${isDark ? "border-[#1e2a44] bg-[#06080d]" : "border-[#cbd5e1] bg-[#eef2f6]"}`}
        >
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>{t('الصلاحيات:', 'Access:')} <span className="text-emerald-400 font-normal">{userPerms.isSuperAdmin ? t('كاملة', 'Full') : t('مخصصة', 'Role Based')}</span></span>
            <span className={`cat-counter-badge text-[10px] font-mono px-2 py-0.5 rounded-md border ${
              isDark
                ? 'bg-[#06080d] text-teal-400 border-teal-500 shadow-md'
                : 'bg-teal-50 text-teal-800 border-teal-200/90 shadow-2xs'
            }`}>
              v2.5 Enterprise
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
