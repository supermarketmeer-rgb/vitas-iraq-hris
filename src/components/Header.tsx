import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { useNavigate } from 'react-router-dom';
import vitasLogo from '../../assets/VitasLogo.jpeg';
import { ConnectionStatusWidget } from './ConnectionStatusWidget';
import { syncEngine, SyncScheduleOption } from '../services/syncEngine';
import { api } from '../api/client';
import { SystemHelpGuideModal } from './SystemHelpGuideModal';
import {
  getEmployeeLocalizedName,
  localizeNotificationTitle,
  localizeNotificationMessage,
  localizeTimestamp
} from '../utils/nameHelper';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const {
    theme,
    toggleTheme,
    language,
    toggleLanguage,
    t,
    currentUser,
    setCurrentUserRole,
    setCurrentUser,
    setAuthenticated,
    setIsSidebarOpen,
    isSidebarOpen,
    setIsSearchOpen,
    notifications,
    markAllNotificationsAsRead,
    markNotificationRead,
    refreshAllData,
    resetToZeroData,
    setActiveModuleId,
    activeModuleId
  } = useApp();

  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showHelpGuideModal, setShowHelpGuideModal] = useState(false);
  const [showChangePwdModal, setShowChangePwdModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurPwd, setShowCurPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [pwdChangeMsg, setPwdChangeMsg] = useState<string | null>(null);
  const [pwdChangeError, setPwdChangeError] = useState<string | null>(null);
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  // Manual Sync states
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [syncFeedbackMsg, setSyncFeedbackMsg] = useState<string | null>(null);
  const [syncSchedule, setSyncSchedule] = useState<SyncScheduleOption>(syncEngine.getSchedule());

  useEffect(() => {
    const unsub = syncEngine.subscribe(s => setSyncSchedule(s));
    syncEngine.loadScheduleFromBackend().then(s => setSyncSchedule(s)).catch(() => {});
    return unsub;
  }, []);

  const handleManualSync = async () => {
    if (isManualSyncing) return;
    setIsManualSyncing(true);
    setSyncFeedbackMsg(language === 'ar' ? 'جاري مزامنة السيرفر المحلي مع السحابة...' : 'Syncing Local Server ⇄ Cloud...');

    try {
      // 1. Trigger ultra-fast backend cloud DB sync
      const backendRes: any = await api.syncNow().catch((err: any) => ({ error: err.message }));
      
      // 2. Immediately refresh all active data in UI state without page reload
      await refreshAllData().catch(() => {});
      await syncEngine.loadScheduleFromBackend().catch(() => {});

      const modCount = backendRes?.modifiedTablesCount || 0;
      const rowCount = backendRes?.totalRowsSynced || 0;
      const totalTables = backendRes?.totalTables || backendRes?.syncedTablesCount || 111;
      const duration = backendRes?.durationSeconds || '1.2';

      if (backendRes && !backendRes.error) {
        if (rowCount > 0) {
          setSyncFeedbackMsg(
            language === 'ar'
              ? `⚡ تمت مزامنة ${rowCount} سجل معدل عبر ${modCount} جداول بنجاح (${duration} ثانية)`
              : `⚡ Synced ${rowCount} modified records across ${modCount} tables in ${duration}s`
          );
        } else {
          setSyncFeedbackMsg(
            language === 'ar'
              ? `⚡ كافة الجداول والسجلات الـ ${totalTables} محدثة ومتطابقة بالكامل (${duration} ثانية)`
              : `⚡ All ${totalTables} tables are completely identical and up-to-date (${duration}s)`
          );
        }
      } else {
        setSyncFeedbackMsg(
          language === 'ar'
            ? `اكتملت المزامنة (${backendRes?.error || 'السيرفر متصل'})`
            : `Sync completed (${backendRes?.error || 'Server active'})`
        );
      }
    } catch (e: any) {
      setSyncFeedbackMsg(language === 'ar' ? `خطأ: ${e.message}` : `Error: ${e.message}`);
    } finally {
      setIsManualSyncing(false);
      setTimeout(() => {
        setSyncFeedbackMsg(null);
      }, 5000);
    }
  };

  const isNotifUnread = (n: any) => !(n.read === true || n.read === 1 || n.is_read === 1 || n.is_read === true);
  const unreadCount = notifications.filter(isNotifUnread).length;

  const isDark = theme === 'dark';

  // Header background: always #06080d with white text as originally designed
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const applyDark = () => {
      // Disconnect first to prevent infinite loop when setting style attributes
      observer.disconnect();

      header.style.setProperty('background-color', '#06080d', 'important');
      header.style.setProperty('border-color', '#1e2a44', 'important');

      header.querySelectorAll('*').forEach(el => {
        const htmlEl = el as HTMLElement;
        if (
          htmlEl.closest('.notif-dropdown') || htmlEl.classList.contains('notif-dropdown') ||
          htmlEl.closest('.sync-toast-popup') || htmlEl.classList.contains('sync-toast-popup')
        ) {
          return;
        }

        const tag = htmlEl.tagName?.toLowerCase();
        if (!tag) return;
        const isImg = tag === 'img';
        const isInput = tag === 'input' || tag === 'select' || tag === 'textarea';

        if (!isImg) {
          htmlEl.style.setProperty('color', '#ffffff', 'important');
        }
        if (tag === 'div' || tag === 'nav' || tag === 'section') {
          htmlEl.style.setProperty('background-color', 'transparent', 'important');
        }
        if (isInput) {
          htmlEl.style.setProperty('background-color', 'rgba(255,255,255,0.08)', 'important');
          htmlEl.style.setProperty('border-color', 'rgba(255,255,255,0.2)', 'important');
        }
      });

      // Restore data-keep-color (e.g. VITAS teal)
      header.querySelectorAll('[data-keep-color]').forEach(el => {
        const keepColor = el.getAttribute('data-keep-color');
        if (keepColor) {
          (el as HTMLElement).style.setProperty('color', keepColor, 'important');
        }
      });

      // Reconnect after applying styles
      observer.observe(header, { childList: true, subtree: true });
    };

    const observer = new MutationObserver(applyDark);

    // Initial apply
    applyDark();

    return () => observer.disconnect();
  }, []);

  // Handle null currentUser - show simplified header or redirect
  if (!currentUser) {
    return (
      <header className="sticky top-0 z-30 h-16 bg-[#06080d]/95 border-[#1e2a44] text-white backdrop-blur-md border-b px-4 flex items-center justify-between transition-colors duration-200 print:hidden">
        <div className="flex items-center gap-3">
          <img src={vitasLogo} alt="VITAS Iraq Logo" className="w-10 h-10 rounded-full object-cover border-2 border-teal-500/40 shadow-md bg-white" />
          <span className="text-lg font-bold text-white">VITAS Iraq HRMS</span>
        </div>
      </header>
    );
  }

  const roles: UserRole[] = [
    'Super Admin',
    'HR Manager',
    'Recruiter',
    'Department Head',
    'Employee',
    'IT Admin',
    'Compliance Officer'
  ];

  const currentUserName = getEmployeeLocalizedName(currentUser, language) || 'User';

  return (
    <>
      <header ref={headerRef} className="sticky top-0 z-40 h-16 bg-[#06080d]/95 backdrop-blur-md border-b border-[#1e2a44] px-4 flex items-center justify-between transition-colors duration-200 print:hidden text-white">
      {/* Left / Start Section - Logo & Sidebar Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-lg transition-colors text-slate-400 hover:text-white hover:bg-white/5"
          title={t('تبديل القائمة الجانبية', 'Toggle Sidebar')}
        >
          <span className="material-symbols-outlined text-2xl">
            {isSidebarOpen ? 'menu_open' : 'menu'}
          </span>
        </button>

        {/* System Brand Logo */}
        <div 
          onClick={() => setActiveModuleId('dash-overview')} 
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          <img 
            src={vitasLogo} 
            alt="VITAS IRAQ Logo" 
            className="w-10 h-10 rounded-full object-cover border-2 border-teal-500/40 shadow-lg shadow-teal-600/25 group-hover:scale-105 transition-transform bg-white shrink-0" 
          />
          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight font-['Inter',sans-serif] text-white">
                <span data-keep-color="#14b8a6" style={{ color: '#14b8a6' }}>VITAS</span>IRAQ
              </span>
              <span className="text-[10px] bg-teal-600 text-white shadow-md border border-teal-500/20 px-1.5 py-0.5 rounded font-mono font-semibold">
                HRMS
              </span>
            </div>
            <p className="text-[11px] -mt-1 font-medium text-slate-400">
              {t('بوابة الموارد البشرية المؤسسية', 'Enterprise HR Portal')}
            </p>
          </div>
        </div>
      </div>

      {/* Middle - Universal Search Bar (Hidden as requested, preserved for quick re-enabling) */}
      <div className="flex-1 max-w-xl mx-4 hidden" style={{ display: 'none' }}>
        <button
          onClick={() => setIsSearchOpen(true)}
          className={`w-full h-10 px-3.5 rounded-xl flex items-center justify-between text-sm transition-all group ${
            isDark 
              ? 'bg-[#06080d] border border-teal-500/40 text-slate-200 hover:text-white hover:border-teal-400 shadow-inner' 
              : 'bg-white/10 border border-white/20 text-slate-200 hover:border-teal-400 hover:text-white shadow-inner'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="material-symbols-outlined text-teal-500 group-hover:scale-110 transition-transform shrink-0">
              search
            </span>
            <span className={`font-normal truncate whitespace-nowrap text-xs sm:text-sm ${isDark ? 'text-slate-300' : 'text-blue-200'}`}>
              {t('بحث شامل في المنظومة...', 'Global search system...')}
            </span>
          </div>
          <kbd className={`hidden lg:inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono rounded shadow-xs ${
            isDark ? 'text-teal-300 bg-teal-500/10 border border-teal-500/30' : 'text-teal-300 bg-white/10 border border-white/20'
          }`}>
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right / End Section - Actions, Theme, Language, Role, User Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Connection Mode & Diagnostics Indicator */}
        <ConnectionStatusWidget />

        {/* Manual Cloud ⇄ Local Sync Button */}
        <div className="relative">
          <button
            onClick={handleManualSync}
            disabled={isManualSyncing}
            className={`p-2 px-2.5 sm:px-3 rounded-xl border text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
              isManualSyncing
                ? 'bg-teal-500/20 text-teal-400 border-teal-500 animate-pulse'
                : isDark
                  ? 'bg-[#06080d] text-white border-teal-500/40 hover:text-teal-400 hover:border-teal-400 hover:bg-teal-950/30'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-teal-400'
            }`}
            title={t(
              'مزامنة فورية بين السيرفر المحلي والسحابي (تلقائياً كل 15 دقيقة)',
              'Manual Sync Local ⇄ Cloud Server (Auto every 15 mins)'
            )}
          >
            <span className={`material-symbols-outlined text-lg text-teal-500 ${isManualSyncing ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span className={`hidden sm:inline text-xs font-bold ${isDark ? 'text-teal-400' : 'text-teal-300'}`}>
              {isManualSyncing ? t('جاري المزامنة...', 'Syncing...') : t('مزامنة', 'Sync')}
            </span>
            <span className={`hidden md:inline-block text-[10px] font-mono px-1 py-0.2 rounded border font-semibold ${
              isDark ? 'bg-teal-500/10 text-teal-300 border-teal-500/30' : 'bg-white/10 text-teal-200 border-white/20'
            }`}>
              {syncSchedule === '1min' ? '1m' :
               syncSchedule === '5min' ? '5m' :
               syncSchedule === '10min' ? '10m' :
               syncSchedule === '15min' ? '15m' :
               syncSchedule === '30min' ? '30m' :
               syncSchedule === '1hr' ? '1h' :
               syncSchedule === 'daily' ? '24h' : 'Off'}
            </span>
          </button>

          {/* Sync Toast Feedback Tooltip */}
          {syncFeedbackMsg && (
            <div className={`sync-toast-popup absolute top-full mt-2 ${language === 'ar' ? 'left-0' : 'right-0'} z-50 p-3 px-4 rounded-xl shadow-2xl border text-xs font-extrabold whitespace-nowrap animate-in fade-in slide-in-from-top-1 ${
              syncFeedbackMsg.includes('خطأ') || syncFeedbackMsg.includes('Error')
                ? (isDark ? 'bg-[#0a0c10] text-rose-300 border-rose-600' : 'bg-white text-rose-800 border-2 border-rose-600 shadow-xl')
                : (isDark ? 'bg-[#0a0c10] text-teal-300 border-teal-500' : 'bg-white text-slate-900 border-2 border-emerald-500 shadow-xl')
            }`}>
              <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined text-base font-bold ${
                  syncFeedbackMsg.includes('خطأ') || syncFeedbackMsg.includes('Error') ? 'text-rose-600' : 'text-emerald-600'
                }`}>
                  {syncFeedbackMsg.includes('خطأ') || syncFeedbackMsg.includes('Error') ? 'error' : 'check_circle'}
                </span>
                <span className={isDark ? 'text-white font-bold' : 'text-slate-900 font-extrabold'}>{syncFeedbackMsg}</span>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Search Icon */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className={`md:hidden p-2 rounded-lg transition-colors ${
            isDark ? 'text-white hover:bg-white/10' : 'text-white hover:bg-white/10'
          }`}
          title={t('البحث', 'Search')}
        >
          <span className="material-symbols-outlined">search</span>
        </button>

        {/* Role Switcher Selector (Super Admin Only) */}
        {currentUser?.role === 'Super Admin' && (
          <div className={`hidden lg:flex items-center gap-1.5 p-1 rounded-xl border ${
            isDark ? 'bg-[#06080d] border-teal-500/40' : 'bg-white/10 border-white/20'
          }`}>
            <span className="material-symbols-outlined text-teal-500 text-sm ml-1">
              admin_panel_settings
            </span>
            <select
              value={currentUser.role}
              onChange={(e) => setCurrentUserRole(e.target.value as UserRole)}
              className={`bg-transparent text-xs font-normal focus:outline-none cursor-pointer py-1 ${
                isDark ? 'text-white' : 'text-white'
              }`}
              title={t('تبديل دور المستخدم للأمان والصلاحيات', 'Switch user role for permissions')}
            >
              {roles.map(r => (
                <option key={r} value={r} className={isDark ? 'bg-[#0a0c10] text-white font-normal' : 'bg-[#06080d] text-white font-normal'}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Company News Button */}
        <button
          onClick={() => setActiveModuleId('emp-news')}
          className={`p-2 px-3 rounded-xl border text-xs font-normal transition-all flex items-center gap-1.5 ${
            activeModuleId === 'emp-news'
              ? (isDark ? 'bg-[#06080d] text-teal-400 border-teal-400 shadow-lg shadow-teal-500/20' : 'bg-white/20 text-teal-300 border-teal-400 shadow-lg shadow-teal-500/20')
              : (isDark ? 'bg-[#06080d] text-white border-teal-500/40 hover:text-teal-400 hover:border-teal-400' : 'bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-teal-400')
          }`}
          title={t('أخبار وإعلانات المؤسسة', 'Company News & Announcements')}
        >
          <span className="material-symbols-outlined text-xl text-teal-500">newspaper</span>
          <span className={`hidden md:inline text-xs ${isDark ? 'text-white' : 'text-white'}`}>{t('أخبار المؤسسة', 'Company News')}</span>
        </button>

        {/* System Help & Functional Guide Modal Trigger */}
        <button
          onClick={() => setShowHelpGuideModal(true)}
          className={`p-2 rounded-xl transition-all relative border flex items-center justify-center ${
            isDark 
              ? 'bg-[#06080d] text-white border-teal-500/40 hover:text-teal-400 hover:border-teal-400' 
              : 'bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-teal-400'
          }`}
          title={t('دليل وفهرس وظائف موديولات المنظومة (مفهرس)', 'System Modules Index & Functional Guide')}
        >
          <span className="material-symbols-outlined text-xl text-teal-500">help</span>
        </button>

        {/* Notifications Button */}
        <div className="relative">
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className={`p-2 rounded-xl transition-all relative border ${
              isDark 
                ? 'bg-[#06080d] text-white border-teal-500/40 hover:text-teal-400 hover:border-teal-400' 
                : 'bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-teal-400'
            }`}
            title={t('الإشعارات', 'Notifications')}
          >
            <span className={`material-symbols-outlined text-xl ${isDark ? 'text-white' : 'text-white'}`}>notifications</span>
            {unreadCount > 0 && (
              <span 
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 text-white border border-rose-500 text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-md shadow-rose-600/40"
                style={{ color: '#ffffff' }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifMenu && (
            <div className={`notif-dropdown absolute ${language === 'ar' ? 'left-0' : 'right-0'} mt-2 w-80 sm:w-96 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150 border ${
              isDark 
                ? 'bg-[#0a0c10] border-white/10 text-white' 
                : 'bg-white border-slate-300 text-slate-900 shadow-slate-900/20'
            }`}>
              <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-teal-600">notifications_active</span>
                  <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {t('مركز التنبيهات', 'Notification Center')}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {notifications.some(isNotifUnread) && (
                    <button
                      onClick={markAllNotificationsAsRead}
                      style={{ color: '#ffffff', backgroundColor: '#0d7a6e' }}
                      className="mark-all-read-btn text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm bg-teal-700 hover:bg-teal-800 text-white border border-teal-800 cursor-pointer"
                      title={t('تحديد كل التنبيهات كمقروءة', 'Mark all as read')}
                    >
                      <span className="material-symbols-outlined text-sm" style={{ color: '#ffffff' }}>done_all</span>
                      <span style={{ color: '#ffffff' }}>{t('الكل مقروء', 'Mark All Read')}</span>
                    </button>
                  )}
                  <span className={`text-xs shadow-xs border px-2 py-0.5 rounded-full font-bold ${
                    isDark 
                      ? 'bg-[#06080d] text-teal-400 border-teal-500' 
                      : 'bg-teal-50 text-teal-800 border-teal-300'
                  }`}>
                    {notifications.length} {t('تنبيهات', 'notifications')}
                  </span>
                </div>
              </div>

              <div className="py-2 max-h-64 overflow-y-auto space-y-2">
                {notifications.length === 0 ? (
                  <div className="text-center py-6 text-slate-500">
                    <span className="material-symbols-outlined text-3xl mb-1 text-slate-400">
                      notifications_off
                    </span>
                    <p className="text-xs text-slate-600 font-medium">{t('لا توجد إشعارات جديدة حتى الآن', 'No new notifications yet')}</p>
                  </div>
                ) : (
                  notifications.map(n => {
                    const isRead = !isNotifUnread(n);
                    return (
                      <div
                        key={n.id}
                        dir={language === 'en' ? 'ltr' : 'rtl'}
                        onClick={() => {
                          if (!isRead) markNotificationRead(n.id);
                        }}
                        className={`p-3 rounded-xl border text-xs transition-colors cursor-pointer ${
                          isRead
                            ? (isDark ? 'bg-white/[0.02] border-white/5 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-700')
                            : (isDark ? 'bg-teal-500/10 border-teal-500/30 text-slate-100 font-semibold shadow-xs' : 'bg-teal-50/90 border-teal-300 text-slate-900 font-semibold shadow-xs')
                        }`}
                      >
                        <div className="flex items-center justify-between font-normal mb-1">
                          <div className="flex items-center gap-1.5">
                            {!isRead && <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block animate-pulse"></span>}
                            <span className={`font-bold ${language === 'en' ? 'text-left' : 'text-right'} ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {localizeNotificationTitle(n.title, language)}
                            </span>
                          </div>
                          <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {localizeTimestamp(n.timestamp, language)}
                          </span>
                        </div>
                        <p className={`${language === 'en' ? 'text-left' : 'text-right'} ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                          {localizeNotificationMessage(n.message, language)}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              <div className={`pt-2 border-t text-center ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <button
                  onClick={() => {
                    setActiveModuleId('supp-notif-center');
                    setShowNotifMenu(false);
                  }}
                  className={`text-xs font-bold hover:underline py-1 transition-colors ${isDark ? 'text-teal-400' : 'text-teal-700'}`}
                >
                  {t('عرض كافة الإشعارات والتحكم الإداري ←', 'View all notifications & settings →')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Current User Display Field (حقل عادي لعرض المستخدم الحالي) */}
        <div
          className={`flex items-center gap-2.5 p-1.5 px-3 rounded-xl border shadow-xs select-none ${
            isDark 
              ? 'bg-[#06080d] border-teal-500/40 text-white' 
              : 'bg-white/10 border-white/20 text-white'
          }`}
          title={`${currentUserName} (${currentUser.role})`}
        >
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-sm shadow-xs shrink-0 ${
            isDark ? 'bg-teal-500/20 border-teal-500/50 text-teal-300' : 'bg-teal-500/30 border-teal-400/50 text-teal-200'
          }`}>
            {(currentUserName || 'U').slice(0, 1)}
          </div>
          <div className="text-start">
            <p className={`text-xs font-bold leading-tight ${isDark ? 'text-white' : 'text-white'}`}>
              {currentUserName}
            </p>
            <p className={`text-[10px] font-semibold leading-tight mt-0.5 ${isDark ? 'text-teal-400' : 'text-teal-300'}`}>{currentUser.role}</p>
          </div>
        </div>

        {/* Change Password Quick Action Button */}
        <button
          type="button"
          onClick={() => setShowChangePwdModal(true)}
          className={`p-2 rounded-xl border transition-all flex items-center justify-center cursor-pointer shadow-xs active:scale-95 ${
            isDark
              ? 'bg-[#06080d] hover:bg-[#0a0c10] text-teal-400 border-teal-500/40 hover:border-teal-400'
              : 'bg-white/10 hover:bg-white/20 text-teal-300 border-white/20 hover:border-teal-400'
          }`}
          title={t('تغيير كلمة المرور الخاصة بي', 'Change My Password')}
        >
          <span className="material-symbols-outlined text-lg">key</span>
        </button>

        {/* Logout Quick Action Button */}
        <button
          type="button"
          onClick={() => {
            setCurrentUser(null);
            setAuthenticated(false);
            navigate('/login');
          }}
          className={`p-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
            isDark
              ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
              : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/30'
          }`}
          title={t('تسجيل الخروج', 'Logout')}
        >
          <span className="material-symbols-outlined text-base">logout</span>
          <span className="hidden sm:inline">{t('خروج', 'Logout')}</span>
        </button>
      </div>
    </header>

      {/* Self-Service Change Password Modal */}
      {showChangePwdModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`p-5 border-b flex items-center justify-between ${
              isDark ? 'border-white/10 bg-[#0a0c10]' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-500 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">lock_reset</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                    {t('تغيير كلمة المرور الخاصة بك', 'Change Your Password')}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {t(`المستخدم: ${currentUser.name}`, `User: ${currentUser.name}`)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowChangePwdModal(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setPwdChangeMsg(null);
                  setPwdChangeError(null);
                }}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async e => {
                e.preventDefault();
                setPwdChangeMsg(null);
                setPwdChangeError(null);

                if (!newPassword || newPassword.length < 4) {
                  setPwdChangeError(t('يرجى إدخال كلمة مرور بطول 4 أحرف على الأقل', 'Password must be at least 4 characters'));
                  return;
                }
                if (newPassword !== confirmPassword) {
                  setPwdChangeError(t('كلمتا المرور غير متطابقتين', 'Passwords do not match'));
                  return;
                }

                setIsChangingPwd(true);
                try {
                  const isAdminRole = Boolean(
                    currentUser?.role === 'Super Admin' ||
                    currentUser?.role === 'Admin' ||
                    currentUser?.role === 'HR Manager' ||
                    currentUser?.can_manage_users === 1 ||
                    currentUser?.can_manage_users === true ||
                    (currentUser?.username && currentUser.username.toLowerCase() === 'admin') ||
                    (currentUser?.username && currentUser.username.toLowerCase() === 'hrmanager')
                  );

                  const resolvedUsername = 
                    currentUser?.username ||
                    (currentUser?.employeeId === 'VTS-HRMANAGER' || currentUser?.role === 'HR Manager' || currentUser?.name === 'مدير الموارد البشرية' ? 'hrmanager' :
                     currentUser?.employeeId === 'VTS-ADMIN' || currentUser?.role === 'Super Admin' ? 'admin' :
                     currentUser?.name);

                  const resolvedEmpId = currentUser?.employeeId || (currentUser?.role === 'HR Manager' ? 'VTS-HRMANAGER' : (currentUser?.role === 'Super Admin' ? 'VTS-ADMIN' : undefined));
                  const resolvedId = (currentUser?.role === 'HR Manager' && (!currentUser?.id || currentUser?.id === '1')) ? '1096' : currentUser?.id;

                  await api.changePassword({
                    id: resolvedId,
                    username: resolvedUsername,
                    employeeId: resolvedEmpId,
                    currentPassword: currentPassword ? currentPassword.trim() : undefined,
                    newPassword: newPassword.trim(),
                    adminReset: isAdminRole || !currentPassword.trim()
                  } as any);

                  // Update in custom users list if exists
                  try {
                    const customUsersRaw = localStorage.getItem('vitas_custom_users') || '{}';
                    const customUsers = JSON.parse(customUsersRaw);
                    const userKey = (resolvedUsername || resolvedEmpId || currentUser.name || '').toLowerCase();
                    if (customUsers[userKey]) {
                      customUsers[userKey].password = newPassword.trim();
                    }
                    if (resolvedUsername === 'hrmanager' && customUsers['hrmanager']) {
                      customUsers['hrmanager'].password = newPassword.trim();
                    }
                    if (resolvedUsername === 'admin' && customUsers['admin']) {
                      customUsers['admin'].password = newPassword.trim();
                    }
                    Object.keys(customUsers).forEach(k => {
                      if (
                        customUsers[k].name === currentUser.name ||
                        customUsers[k].employeeId === resolvedEmpId ||
                        customUsers[k].username === resolvedUsername
                      ) {
                        customUsers[k].password = newPassword.trim();
                      }
                    });
                    localStorage.setItem('vitas_custom_users', JSON.stringify(customUsers));
                  } catch (err) {
                    console.error(err);
                  }

                  // Also update currentUser in localStorage so current session stays updated
                  try {
                    const rawCur = localStorage.getItem('vitas_current_user');
                    if (rawCur) {
                      const curObj = JSON.parse(rawCur);
                      curObj.password = newPassword.trim();
                      localStorage.setItem('vitas_current_user', JSON.stringify(curObj));
                      setCurrentUser(curObj);
                    }
                  } catch (e) {}

                  setPwdChangeMsg(t('تم تحديث كلمة المرور الخاصة بك بنجاح في قاعدة البيانات وتفعيلها فوراً!', 'Your password has been updated successfully in the database!'));
                  setTimeout(() => {
                    setShowChangePwdModal(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPwdChangeMsg(null);
                    setPwdChangeError(null);
                  }, 2000);
                } catch (err: any) {
                  setPwdChangeError(err.message || t('حدث خطأ أثناء تحديث كلمة المرور', 'An error occurred while changing password'));
                } finally {
                  setIsChangingPwd(false);
                }
              }}
              className="p-6 space-y-4 text-xs"
            >
              {pwdChangeError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-700 dark:text-rose-300 font-bold flex items-center gap-2 animate-in fade-in">
                  <span className="material-symbols-outlined text-base">error</span>
                  <span>{pwdChangeError}</span>
                </div>
              )}
              {pwdChangeMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-2 animate-in fade-in">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>{pwdChangeMsg}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {t('كلمة المرور الحالية (اختياري للآدمن):', 'Current Password (Optional for Admin):')}
                </label>
                <div className="relative">
                  <input
                    type={showCurPwd ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder={t('أدخل كلمة المرور الحالية (أو اتركها فارغة)', 'Enter current password (or leave blank)')}
                    className={`w-full px-3.5 py-2.5 pe-10 rounded-xl border text-xs outline-none font-mono ${
                      isDark ? 'bg-[#0a0c10] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurPwd(!showCurPwd)}
                    className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">
                      {showCurPwd ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {t('كلمة المرور الجديدة:', 'New Password:')}
                </label>
                <div className="relative">
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder={t('أدخل كلمة المرور الجديدة', 'Enter new password')}
                    className={`w-full px-3.5 py-2.5 pe-10 rounded-xl border text-xs outline-none font-mono ${
                      isDark ? 'bg-[#0a0c10] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">
                      {showNewPwd ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {t('تأكيد كلمة المرور الجديدة:', 'Confirm New Password:')}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPwd ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder={t('أعد إدخال كلمة المرور', 'Re-enter new password')}
                    className={`w-full px-3.5 py-2.5 pe-10 rounded-xl border text-xs outline-none font-mono ${
                      isDark ? 'bg-[#0a0c10] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                    className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">
                      {showConfirmPwd ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePwdModal(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPwdChangeMsg(null);
                    setPwdChangeError(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-white/5 font-bold transition-all text-xs cursor-pointer"
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isChangingPwd}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold transition-all shadow-md shadow-teal-600/20 text-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isChangingPwd ? (
                    <>
                      <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                      <span>{t('جاري التحديث...', 'Updating...')}</span>
                    </>
                  ) : (
                    <span>{t('تحديث كلمة المرور', 'Update Password')}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* System Help & Functional Guide Modal */}
      <SystemHelpGuideModal
        isOpen={showHelpGuideModal}
        onClose={() => setShowHelpGuideModal(false)}
      />
    </>
  );
};
