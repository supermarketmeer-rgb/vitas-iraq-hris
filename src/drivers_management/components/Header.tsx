import React, { useState } from 'react';
import {
  Bell,
  CheckCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { User, NotificationItem } from '../types';
import { SoundEffects } from '../utils/soundEffects';
import { getLang } from '../utils/i18n';

export interface HeaderProps {
  currentUser?: User;
  theme?: string;
  onThemeToggle?: () => void;
  onOpenSettings?: () => void;
  onToggleSidebar?: () => void;
  unreadCount?: number;
  notifications?: NotificationItem[];
  onNotificationClick?: (notif: NotificationItem) => void;
  onMarkAllRead?: () => void;
  isDriverView?: boolean;
  onOpenChangePassword?: () => void;
  onLogout?: () => void;
  onOpenWorkflowGuide?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  unreadCount = 0,
  notifications = [],
  onNotificationClick,
  onMarkAllRead,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => SoundEffects.isEnabled());

  const handleToggleSound = () => {
    const next = SoundEffects.toggleSound();
    setSoundEnabled(next);
  };

  return (
    <div className="inline-flex items-center gap-2 shrink-0 relative">
      {/* Click outside backdrop for notifications */}
      {showNotifications && (
        <div
          onClick={() => setShowNotifications(false)}
          className="fixed inset-0 z-40 bg-transparent"
        />
      )}

      {/* Sound Toggle (Alert Chimes) */}
      <button
        id="sound-toggle-btn"
        type="button"
        onClick={handleToggleSound}
        title={soundEnabled ? 'صوت التنبيهات المميز: مفعل (انقر للاستماع أو التعطيل)' : 'صوت التنبيهات: معطل (انقر للتفعيل)'}
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 ${
          soundEnabled
            ? 'bg-[#0f766e] hover:bg-[#115e59] text-white border border-teal-700/60'
            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
        }`}
        aria-label="تفعيل أو تعطيل صوت التنبيهات"
      >
        {soundEnabled ? <Volume2 className="w-5 h-5 text-white" /> : <VolumeX className="w-5 h-5" />}
      </button>

      {/* Notification Center (Bell) */}
      <div className="relative">
        <button
          id="notification-center-btn"
          type="button"
          onClick={() => setShowNotifications(!showNotifications)}
          title="مركز الإشعارات والتنبيهات"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 relative"
          aria-label="الإشعارات والتنبيهات"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span
              id="notification-badge-counter"
              className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-600 rounded-full ring-2 ring-white dark:ring-slate-900 animate-bounce"
            >
              {unreadCount}
            </span>
          )}
        </button>

        {showNotifications && (
          <div
            dir={getLang() === 'en' ? 'ltr' : 'rtl'}
            className="absolute left-0 mt-2 z-50 w-80 sm:w-96 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-3"
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
                  type="button"
                  onClick={() => SoundEffects.playChime()}
                  title="استمع لصوت التنبيه المميز"
                  className="p-1 rounded-md text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
                {unreadCount > 0 && onMarkAllRead && (
                  <button
                    type="button"
                    onClick={onMarkAllRead}
                    className="flex items-center gap-1 text-[11px] text-teal-600 hover:underline font-semibold cursor-pointer"
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
                      if (onNotificationClick) onNotificationClick(n);
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
  );
};
