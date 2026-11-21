import React, { useState } from 'react';
import {
  Moon,
  Sun,
  Bell,
  CheckCheck,
  ShieldCheck,
  UserCheck,
  Truck,
  Sliders,
  Menu,
  X,
  Volume2,
  VolumeX,
  KeyRound,
  LogOut,
  HelpCircle,
  Eye,
} from 'lucide-react';
import { User, NotificationItem, Role } from '../types';
import { SoundEffects } from '../utils/soundEffects';
import { t, getLang } from '../utils/i18n';

interface HeaderProps {
  currentUser: User;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
  unreadCount: number;
  notifications: NotificationItem[];
  onNotificationClick: (notif: NotificationItem) => void;
  onMarkAllRead: () => void;
  isDriverView?: boolean;
  onOpenChangePassword?: () => void;
  onLogout?: () => void;
  onOpenWorkflowGuide?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  theme,
  onThemeToggle,
  onOpenSettings,
  onToggleSidebar,
  unreadCount,
  notifications,
  onNotificationClick,
  onMarkAllRead,
  isDriverView,
  onOpenChangePassword,
  onLogout,
  onOpenWorkflowGuide,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => SoundEffects.isEnabled());
  const handleToggleSound = () => {
    const next = SoundEffects.toggleSound();
    setSoundEnabled(next);
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'admin':
        return { label: t('admin_role'), bg: 'bg-teal-700 text-white', icon: ShieldCheck };
      case 'supervisor':
        return { label: t('supervisor_role'), bg: 'bg-teal-600 text-white', icon: UserCheck };
      case 'security':
        return { label: getLang() === 'en' ? 'Security' : 'الأمن', bg: 'bg-amber-700 text-white', icon: ShieldCheck };
      case 'viewer':
        return { label: getLang() === 'en' ? 'Viewer' : 'مشاهد', bg: 'bg-slate-600 text-white', icon: Eye };
      case 'driver':
        return { label: t('driver_role'), bg: 'bg-teal-800 text-white', icon: Truck };
    }
  };

  const currentBadge = getRoleBadge(currentUser.role);
  const BadgeIcon = currentBadge.icon;

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 lg:px-6 shadow-xs transition-colors duration-200">
      {/* Right Side: Branding */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#c1cd21] text-[#191e22] shadow-xs shrink-0 font-bold">
            <Truck className="w-5 h-5 text-[#191e22]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 dark:text-white text-sm sm:text-base tracking-tight font-['Plus_Jakarta_Sans',sans-serif]">
                DTMS
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-700">
                {currentUser.role === 'driver' ? 'تطبيق السائق الميداني' : 'إدارة حركة ونقليات السائقين'}
              </span>
            </div>
            <p className="hidden md:block text-[10px] text-gray-500 dark:text-gray-400 font-['Cairo']">
              نظام إدارة أسطول المركبات والرحلات وقراءات العدادات
            </p>
          </div>
        </div>
      </div>

      {/* Left Side: Role switcher, Notifications, Theme toggle, Settings, XAMPP Export */}
      <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 shrink-0">
        {/* Click outside backdrop for dropdowns */}
        {(showUserMenu || showNotifications) && (
          <div
            onClick={() => {
              setShowUserMenu(false);
              setShowNotifications(false);
            }}
            className="fixed inset-0 z-40 bg-transparent"
          />
        )}

        {/* Central Portal account menu */}
        <div className="relative z-50">
          <button
            id="role-switcher-dropdown-btn"
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-1.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-teal-500 bg-white dark:bg-slate-800 transition-colors text-right"
          >
            <div className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
            <div className="text-right">
              <span className="block text-[11px] sm:text-xs font-bold text-gray-900 dark:text-white truncate max-w-[80px] sm:max-w-[130px]">
                {currentUser.name}
              </span>
              <span className="hidden sm:block text-[10px] text-teal-600 dark:text-teal-400 font-semibold truncate">
                {t('role_label')} {currentBadge.label}
              </span>
            </div>
            <BadgeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-600 dark:text-teal-400 shrink-0" />
          </button>

          {showUserMenu && (
            <div className="absolute left-0 mt-2 w-72 max-w-[calc(100vw-20px)] rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-2 z-50">
              <div className="p-2 border-b border-gray-100 dark:border-slate-800">
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{currentUser.name}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{currentUser.email}</p>
                <p className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold mt-1">
                  {t('role_label')} {currentBadge.label}
                </p>
              </div>
              <div className="py-1 space-y-1">
                {onOpenChangePassword && (
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenChangePassword();
                    }}
                    className="w-full text-right p-2 rounded-lg text-xs flex items-center gap-2 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-slate-800 font-bold border border-teal-200 dark:border-teal-800 transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-teal-600" />
                    <span>تعديل كلمة المرور في البوابة المركزية</span>
                  </button>
                )}
                {onLogout && (
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full text-right p-2 rounded-lg text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold border border-rose-200 dark:border-rose-900 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                    <span>تسجيل الخروج من البوابة</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* System Settings Button (Admin) */}
        {currentUser.role === 'admin' && (
          <button
            id="open-system-settings-btn"
            onClick={onOpenSettings}
            title={getLang() === 'en' ? 'System Settings' : 'إعدادات النظام'}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Sliders className="w-4 h-4" />
          </button>
        )}

        {/* Sound Toggle (Alert Chimes) */}
        <button
          id="sound-toggle-btn"
          onClick={handleToggleSound}
          title={soundEnabled ? 'صوت التنبيهات المميز: مفعل (انقر للاستماع أو التعطيل)' : 'صوت التنبيهات: معطل (انقر للتفعيل)'}
          className={`p-2 rounded-xl border transition-all ${
            soundEnabled
              ? 'text-teal-600 dark:text-teal-400 bg-teal-50/80 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800/60 shadow-xs'
              : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 border-transparent'
          }`}
          aria-label="تفعيل أو تعطيل صوت التنبيهات"
        >
          {soundEnabled ? <Volume2 className="w-5 h-5 text-teal-600 dark:text-teal-400" /> : <VolumeX className="w-5 h-5" />}
        </button>

        {/* Theme Toggle (Light / Dark) */}
        <button
          id="theme-toggle-btn"
          onClick={onThemeToggle}
          title={theme === 'dark' ? 'التبديل إلى الوضع النهاري (Light Mode)' : 'التبديل إلى الوضع الليلي (Dark Mode)'}
          className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 border border-transparent hover:border-gray-200 dark:hover:border-slate-700 transition-all active:scale-95 shadow-xs"
          aria-label="تبديل الثيم ليل ونهار"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400 drop-shadow-xs" />
          ) : (
            <Moon className="w-5 h-5 text-teal-700 dark:text-teal-400" />
          )}
        </button>

        {/* Notification Center */}
        <div className="relative">
          <button
            id="notification-center-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            title="مركز الإشعارات والتنبيهات"
            className="relative p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span
                id="notification-badge-counter"
                className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-teal-600 rounded-full ring-2 ring-white dark:ring-slate-900 animate-bounce"
              >
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div
              dir={getLang() === 'en' ? 'ltr' : 'rtl'}
              className={`fixed top-[4.5rem] z-50 w-[calc(100vw-24px)] max-w-96 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-3 ${getLang() === 'en' ? 'right-3' : 'left-3'}`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
                <div className="flex min-w-0 items-center gap-2">
                  <Bell className="w-4 h-4 text-teal-600" />
                  <span className="truncate text-sm font-bold text-gray-900 dark:text-white">
                    {getLang() === 'en' ? 'Notifications' : 'الإشعارات والتنبيهات'}
                  </span>
                  {unreadCount > 0 && (
                    <span className="shrink-0 text-[11px] px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 font-bold">
                      {getLang() === 'en' ? `${unreadCount} new` : `${unreadCount} جديد`}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => SoundEffects.playChime()}
                    title="استمع لصوت التنبيه المميز"
                    className="p-1 rounded-md text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                  {unreadCount > 0 && (
                    <button
                      onClick={onMarkAllRead}
                      className="flex items-center gap-1 text-[11px] text-teal-600 hover:underline font-semibold"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>{getLang() === 'en' ? 'Mark all read' : 'تحديد الكل كمقروء'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800 py-1">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400">
                    {getLang() === 'en' ? 'No notifications' : 'لا توجد إشعارات حالياً'}
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        onNotificationClick(n);
                        setShowNotifications(false);
                      }}
                      className={`p-2.5 rounded-xl cursor-pointer transition-colors ${
                        n.is_read
                          ? 'hover:bg-gray-50 dark:hover:bg-slate-800/60 opacity-80'
                          : 'bg-teal-50/70 dark:bg-teal-950/30 hover:bg-teal-50 dark:hover:bg-teal-950/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                          <span className="min-w-0 break-words text-xs font-bold text-gray-900 dark:text-white">
                          {n.title}
                        </span>
                        <span className="text-[10px] text-gray-400 shrink-0">{(n.created_at || '').split(' ')[1] || n.created_at || ''}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 break-words text-[11px] text-gray-600 dark:text-gray-300">
                        {n.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
