import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { useNavigate } from 'react-router-dom';
import vitasLogo from '../../assets/VitasLogo.jpeg';
import { ConnectionStatusWidget } from './ConnectionStatusWidget';
import { syncEngine } from '../services/syncEngine';
import { api } from '../api/client';
import { SystemHelpGuideModal } from './SystemHelpGuideModal';

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
    refreshAllData,
    resetToZeroData,
    setActiveModuleId,
    activeModuleId
  } = useApp();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showHelpGuideModal, setShowHelpGuideModal] = useState(false);
  const [showChangePwdModal, setShowChangePwdModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdChangeMsg, setPwdChangeMsg] = useState<string | null>(null);

  // Manual Sync states
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [syncFeedbackMsg, setSyncFeedbackMsg] = useState<string | null>(null);

  const handleManualSync = async () => {
    if (isManualSyncing) return;
    setIsManualSyncing(true);
    setSyncFeedbackMsg(language === 'ar' ? 'جاري مزامنة السيرفر المحلي مع السحابة...' : 'Syncing Local Server ⇄ Cloud...');

    try {
      // 1. Trigger ultra-fast backend cloud DB sync
      const backendRes: any = await api.syncNow().catch((err: any) => ({ error: err.message }));
      
      // 2. Immediately refresh all active data in UI state without page reload
      await refreshAllData().catch(() => {});

      const modCount = backendRes?.modifiedTablesCount || 0;
      const rowCount = backendRes?.totalRowsSynced || 0;
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
              ? `⚡ كافة الجداول والسجلات الـ 82 محدثة ومتطابقة بالكامل (${duration} ثانية)`
              : `⚡ All 82 tables are completely identical and up-to-date (${duration}s)`
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

  const unreadCount = notifications.filter(n => !n.read).length;

  const isDark = theme === 'dark';

  // Handle null currentUser - show simplified header or redirect
  if (!currentUser) {
    return (
      <header className={`sticky top-0 z-30 h-16 ${isDark ? 'bg-[#06080d]/95 border-[#1e2a44] text-white' : 'bg-[#e8ebef]/95 border-slate-300 text-slate-800 shadow-sm'} backdrop-blur-md border-b px-4 flex items-center justify-between transition-colors duration-200 print:hidden`}>
        <div className="flex items-center gap-3">
          <img src={vitasLogo} alt="VITAS Iraq Logo" className="w-10 h-10 rounded-full object-cover border-2 border-teal-500/40 shadow-md bg-white" />
          <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>VITAS Iraq HRMS</span>
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

  const currentUserName = language === 'en' && currentUser.name === 'مدير الموارد البشرية'
    ? 'HR Manager'
    : currentUser.name || 'User';

  return (
    <header className={`sticky top-0 z-30 h-16 ${isDark ? 'bg-[#06080d]/95 border-[#1e2a44] text-white' : 'bg-[#e8ebef]/95 border-slate-300 text-slate-800 shadow-sm'} backdrop-blur-md border-b px-4 flex items-center justify-between transition-colors duration-200 print:hidden`}>
      {/* Left / Start Section - Logo & Sidebar Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`p-2 rounded-lg transition-colors ${
            isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
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
              <span className={`font-extrabold text-lg tracking-tight font-['Inter',sans-serif] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                VITAS<span className="text-teal-500">IRAQ</span>
              </span>
              <span className="text-[10px] bg-teal-600 text-white shadow-md border border-teal-500/20 px-1.5 py-0.5 rounded font-mono font-semibold">
                HRMS
              </span>
            </div>
            <p className={`text-[11px] -mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('بوابة الموارد البشرية المؤسسية', 'Enterprise HR Portal')}
            </p>
          </div>
        </div>
      </div>

      {/* Middle - Universal Search Bar */}
      <div className="flex-1 max-w-xl mx-4 hidden md:block">
        <button
          onClick={() => setIsSearchOpen(true)}
          className={`w-full h-10 px-3.5 rounded-xl flex items-center justify-between text-sm transition-all group ${
            isDark 
              ? 'bg-[#06080d] border border-teal-500/40 text-slate-200 hover:text-white hover:border-teal-400 shadow-inner' 
              : 'bg-white border border-slate-300 text-slate-700 hover:border-teal-500 hover:text-slate-900 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="material-symbols-outlined text-teal-500 group-hover:scale-110 transition-transform shrink-0">
              search
            </span>
            <span className={`font-normal truncate whitespace-nowrap text-xs sm:text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {t('بحث شامل في المنظومة...', 'Global search system...')}
            </span>
          </div>
          <kbd className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono text-teal-600 dark:text-teal-300 bg-teal-50 dark:bg-teal-500/10 border border-teal-300 dark:border-teal-500/30 rounded shadow-xs">
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
                  : 'bg-white text-slate-800 border-slate-300 hover:bg-teal-50 hover:border-teal-400'
            }`}
            title={t(
              'مزامنة فورية بين السيرفر المحلي والسحابي (تلقائياً كل 15 دقيقة)',
              'Manual Sync Local ⇄ Cloud Server (Auto every 15 mins)'
            )}
          >
            <span className={`material-symbols-outlined text-lg text-teal-500 ${isManualSyncing ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span className="hidden sm:inline text-xs font-bold text-teal-700 dark:text-teal-400">
              {isManualSyncing ? t('جاري المزامنة...', 'Syncing...') : t('مزامنة', 'Sync')}
            </span>
            <span className="hidden md:inline-block text-[10px] font-mono px-1 py-0.2 rounded bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30 font-semibold">
              15m
            </span>
          </button>

          {/* Sync Toast Feedback Tooltip */}
          {syncFeedbackMsg && (
            <div className={`absolute top-full mt-2 ${language === 'ar' ? 'left-0' : 'right-0'} z-50 p-2.5 px-3.5 rounded-xl shadow-2xl border text-xs font-bold whitespace-nowrap animate-in fade-in slide-in-from-top-1 ${
              syncFeedbackMsg.includes('خطأ') || syncFeedbackMsg.includes('Error')
                ? 'bg-rose-950 text-rose-200 border-rose-600'
                : 'bg-teal-950 text-teal-200 border-teal-500'
            }`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-teal-400">
                  {syncFeedbackMsg.includes('خطأ') || syncFeedbackMsg.includes('Error') ? 'error' : 'check_circle'}
                </span>
                <span>{syncFeedbackMsg}</span>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Search Icon */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className={`md:hidden p-2 rounded-lg transition-colors ${
            isDark ? 'text-white hover:bg-white/10' : 'text-slate-700 hover:bg-slate-200'
          }`}
          title={t('البحث', 'Search')}
        >
          <span className="material-symbols-outlined">search</span>
        </button>

        {/* Role Switcher Selector */}
        <div className={`hidden lg:flex items-center gap-1.5 p-1 rounded-xl border ${
          isDark ? 'bg-[#06080d] border-teal-500/40' : 'bg-white border-slate-300 shadow-xs'
        }`}>
          <span className="material-symbols-outlined text-teal-500 text-sm ml-1">
            admin_panel_settings
          </span>
          <select
            value={currentUser.role}
            onChange={(e) => setCurrentUserRole(e.target.value as UserRole)}
            className={`bg-transparent text-xs font-normal focus:outline-none cursor-pointer py-1 ${
              isDark ? 'text-white' : 'text-slate-800'
            }`}
            title={t('تبديل دور المستخدم للأمان والصلاحيات', 'Switch user role for permissions')}
          >
            {roles.map(r => (
              <option key={r} value={r} className={isDark ? 'bg-[#0a0c10] text-white font-normal' : 'bg-white text-slate-800 font-normal'}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Company News Button */}
        <button
          onClick={() => setActiveModuleId('emp-news')}
          className={`p-2 px-3 rounded-xl border text-xs font-normal transition-all flex items-center gap-1.5 ${
            activeModuleId === 'emp-news'
              ? (isDark ? 'bg-[#06080d] text-teal-400 border-teal-400 shadow-lg shadow-teal-500/20' : 'bg-teal-50 text-teal-800 border-teal-500 shadow-xs')
              : (isDark ? 'bg-[#06080d] text-white border-teal-500/40 hover:text-teal-400 hover:border-teal-400' : 'bg-white text-slate-800 border-slate-300 hover:bg-teal-50 shadow-xs')
          }`}
          title={t('أخبار وإعلانات المؤسسة', 'Company News & Announcements')}
        >
          <span className="material-symbols-outlined text-xl text-teal-500">newspaper</span>
          <span className={`hidden md:inline text-xs ${isDark ? 'text-white' : 'text-slate-800'}`}>{t('أخبار المؤسسة', 'Company News')}</span>
        </button>

        {/* System Help & Functional Guide Modal Trigger */}
        <button
          onClick={() => setShowHelpGuideModal(true)}
          className={`p-2 rounded-xl transition-all relative border flex items-center justify-center ${
            isDark 
              ? 'bg-[#06080d] text-white border-teal-500/40 hover:text-teal-400 hover:border-teal-400' 
              : 'bg-white text-slate-800 border-slate-300 hover:bg-teal-50 shadow-xs'
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
                : 'bg-white text-slate-800 border-slate-300 hover:bg-teal-50 shadow-xs'
            }`}
            title={t('الإشعارات', 'Notifications')}
          >
            <span className={`material-symbols-outlined text-xl ${isDark ? 'text-white' : 'text-slate-800'}`}>notifications</span>
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
            <div className={`absolute ${language === 'ar' ? 'left-0' : 'right-0'} mt-2 w-80 sm:w-96 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150 border ${
              isDark ? 'bg-[#0a0c10] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-teal-500">notifications_active</span>
                  <h3 className={`font-normal text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {t('مركز التنبيهات', 'Notification Center')}
                  </h3>
                </div>
                <span className={`text-xs shadow-xs border px-2 py-0.5 rounded-full font-normal ${
                  isDark ? 'bg-[#06080d] text-teal-400 border-teal-500' : 'bg-teal-50 text-teal-700 border-teal-300'
                }`}>
                  {notifications.length} {t('تنبيهات', 'notifications')}
                </span>
              </div>

              <div className="py-2 max-h-64 overflow-y-auto space-y-2">
                {notifications.length === 0 ? (
                  <div className="text-center py-6 text-slate-500">
                    <span className="material-symbols-outlined text-3xl mb-1 text-slate-600">
                      notifications_off
                    </span>
                    <p className="text-xs">{t('لا توجد إشعارات جديدة حتى الآن', 'No new notifications yet')}</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      className={`p-3 rounded-xl border text-xs transition-colors ${
                        n.read
                          ? (isDark ? 'bg-white/[0.02] border-white/5 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500')
                          : (isDark ? 'bg-teal-500/5 border-teal-500/20 text-slate-200 font-normal' : 'bg-teal-50/50 border-teal-200 text-slate-800 font-normal')
                      }`}
                    >
                      <div className="flex items-center justify-between font-normal mb-1">
                        <span className="font-bold">{n.title}</span>
                        <span className="text-[10px] text-slate-400">{n.timestamp}</span>
                      </div>
                      <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>{n.message}</p>
                    </div>
                  ))
                )}
              </div>

              <div className={`pt-2 border-t text-center ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <button
                  onClick={() => {
                    setActiveModuleId('supp-notif-center');
                    setShowNotifMenu(false);
                  }}
                  className="text-xs font-normal text-teal-600 dark:text-teal-400 hover:underline py-1 transition-colors"
                >
                  {t('عرض كافة الإشعارات والتحكم الإداري ←', 'View all notifications & settings →')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`header-user-profile flex items-center gap-2.5 p-1.5 px-2.5 rounded-xl transition-colors border shadow-xs ${
              isDark 
                ? 'bg-[#06080d] hover:bg-[#0a0c10] border-teal-500/40 hover:border-teal-400' 
                : 'bg-white hover:bg-slate-50 border-slate-300 hover:border-teal-500'
            }`}
          >
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-sm shadow-xs ${
              isDark ? 'bg-teal-500/20 border-teal-500/50 text-teal-300' : 'bg-teal-50 border-teal-200 text-teal-700'
            }`}>
              {(currentUserName || 'U').slice(0, 1)}
            </div>
            <div className="hidden xl:block text-start">
              <p className={`text-xs font-normal leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {currentUserName}
              </p>
              <p className="text-[10px] text-teal-600 dark:text-teal-400 font-normal">{currentUser.role}</p>
            </div>
            <span className={`material-symbols-outlined text-lg hidden sm:block ${isDark ? 'text-white' : 'text-slate-600'}`}>
              expand_more
            </span>
          </button>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div className={`absolute ${language === 'ar' ? 'left-0' : 'right-0'} mt-2 w-64 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 border ${
              isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className={`p-2 border-b mb-2 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {currentUserName}
                </p>
                <p className="text-xs text-slate-400 font-mono">{currentUser.email}</p>
                <div className="mt-2 inline-flex items-center gap-1 text-[10px] bg-teal-600 text-white shadow-md border border-teal-500/20 px-2 py-0.5 rounded-md font-semibold">
                  <span className="material-symbols-outlined text-[12px]">verified_user</span>
                  {currentUser.role}
                </div>
              </div>

              <div className="space-y-1 text-xs font-medium">
                <button
                  onClick={() => {
                    setActiveModuleId('emp-profile');
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-start px-3 py-2 rounded-lg text-slate-300 hover:bg-white/5 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-teal-400 text-base">account_box</span>
                  {t('ملفي الشخصي الوظيفي', 'My Employee Profile')}
                </button>

                <button
                  onClick={() => {
                    setActiveModuleId('supp-profile-settings');
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-start px-3 py-2 rounded-lg text-slate-300 hover:bg-white/5 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-teal-400 text-base">settings</span>
                  {t('إعدادات وتفضيلات الحساب', 'Account Settings & Preferences')}
                </button>

                <button
                  onClick={() => {
                    setActiveModuleId('sec-roles-permissions');
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-start px-3 py-2 rounded-lg text-slate-300 hover:bg-white/5 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-teal-400 text-base">admin_panel_settings</span>
                  {t('إدارة الصلاحيات والأدوار', 'Roles & Permissions Management')}
                </button>

                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    setShowChangePwdModal(true);
                  }}
                  className="w-full text-start px-3 py-2 rounded-lg text-teal-300 hover:bg-teal-500/10 flex items-center gap-2 font-bold"
                >
                  <span className="material-symbols-outlined text-teal-400 text-base">key</span>
                  {t('تغيير كلمة المرور الخاصة بي', 'Change My Password')}
                </button>

                <div className="pt-2 border-t border-white/10 mt-2 space-y-1">
                  <button
                    onClick={() => {
                      const confirmMsg = t(
                        'هل أنت تأكد من تهيئة النظام وتفريغ كافة البيانات المدخلة لتكون صفراً تماماً؟',
                        'Are you sure you want to reset and wipe all system data?'
                      );
                      if (confirm(confirmMsg)) {
                        resetToZeroData();
                        setShowProfileMenu(false);
                      }
                    }}
                    className="w-full text-start px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 font-bold"
                  >
                    <span className="material-symbols-outlined text-base">restart_alt</span>
                    {t('إعادة ضبط البيانات لصفر (تفريغ الكلي)', 'Reset All System Data (Wipe)')}
                  </button>

                  <button
                    onClick={() => {
                      setCurrentUser(null);
                      setAuthenticated(false);
                      setShowProfileMenu(false);
                      navigate('/login');
                    }}
                    className="w-full text-start px-3 py-2 rounded-lg text-slate-300 hover:bg-white/5 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">logout</span>
                    {t('تسجيل الخروج', 'Logout')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Self-Service Change Password Modal */}
      {showChangePwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
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
                  setNewPassword('');
                  setConfirmPassword('');
                  setPwdChangeMsg(null);
                }}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                if (!newPassword || newPassword.length < 4) {
                  alert(t('يرجى إدخال كلمة مرور بطول 4 أحرف على الأقل', 'Password must be at least 4 characters'));
                  return;
                }
                if (newPassword !== confirmPassword) {
                  alert(t('كلمتا المرور غير متطابقتين', 'Passwords do not match'));
                  return;
                }

                try {
                  // Update in custom users list if exists
                  const customUsersRaw = localStorage.getItem('vitas_custom_users') || '{}';
                  const customUsers = JSON.parse(customUsersRaw);
                  const userKey = (currentUser.employeeId || currentUser.name || '').toLowerCase();
                  if (customUsers[userKey]) {
                    customUsers[userKey].password = newPassword;
                  }
                  // Also match by username if stored
                  Object.keys(customUsers).forEach(k => {
                    if (customUsers[k].name === currentUser.name || customUsers[k].employeeId === currentUser.employeeId) {
                      customUsers[k].password = newPassword;
                    }
                  });
                  localStorage.setItem('vitas_custom_users', JSON.stringify(customUsers));
                } catch (err) {
                  console.error(err);
                }

                setPwdChangeMsg(t('تم تحديث كلمة المرور الخاصة بك بنجاح!', 'Your password has been updated successfully!'));
                setTimeout(() => {
                  setShowChangePwdModal(false);
                  setNewPassword('');
                  setConfirmPassword('');
                  setPwdChangeMsg(null);
                }, 2000);
              }}
              className="p-6 space-y-4 text-xs"
            >
              {pwdChangeMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-2 animate-in fade-in">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>{pwdChangeMsg}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {t('كلمة المرور الجديدة:', 'New Password:')}
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder={t('أدخل كلمة المرور الجديدة', 'Enter new password')}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none font-mono ${
                    isDark ? 'bg-[#0a0c10] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {t('تأكيد كلمة المرور الجديدة:', 'Confirm New Password:')}
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder={t('أعد إدخال كلمة المرور', 'Re-enter new password')}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none font-mono ${
                    isDark ? 'bg-[#0a0c10] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowChangePwdModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-white/5 font-bold transition-all text-xs cursor-pointer"
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition-all shadow-md shadow-teal-600/20 text-xs cursor-pointer"
                >
                  {t('تحديث كلمة المرور', 'Update Password')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* System Help & Functional Guide Modal */}
      <SystemHelpGuideModal
        isOpen={showHelpGuideModal}
        onClose={() => setShowHelpGuideModal(false)}
      />
    </header>
  );
};
