import React, { useState } from 'react';
import { useEmployeeContext } from '../context/EmployeeContext';

interface EmployeeNotificationsProps {
  employee: any;
  onLogout: () => void;
}

export const EmployeeNotifications: React.FC<EmployeeNotificationsProps> = ({ employee, onLogout }) => {
  const { notifications, markNotificationAsRead, unreadNotifications, theme, toggleTheme } = useEmployeeContext();
  const isDark = theme === 'dark';
  const [filter, setFilter] = useState<'all' | 'unread' | 'important'>('all');

  // تنبيهات تجريبية
  const mockNotifications = [
    {
      id: '1',
      title: 'تم قبول طلب الإجازة',
      message: 'تم قبول طلب الإجازة من 15-20 أغسطس 2026. يمكنك الآن التخطيط لإجازتك.',
      type: 'success',
      timestamp: '2026-08-08T09:15:00',
      read: false,
      important: true,
      action: 'عرض التفاصيل'
    },
    {
      id: '2',
      title: 'تذكير: اجتماع الفريق',
      message: 'اجتماع الفريق الأسبوعي غداً الساعة 9 صباحاً في قاعة الاجتماعات رقم 2.',
      type: 'info',
      timestamp: '2026-08-07T16:00:00',
      read: false,
      important: true,
      action: 'إضافة للتقويم'
    },
    {
      id: '3',
      title: 'تحديث سياسة الرواتب',
      message: 'تم تحديث سياسة الرواتب والحوافز. يرجى مراجعة المستند الجديد.',
      type: 'warning',
      timestamp: '2026-08-06T11:30:00',
      read: true,
      important: false,
      action: 'عرض المستند'
    },
    {
      id: '4',
      title: 'كشف الراتب متاح',
      message: 'كشف راتب شهر أغسطس 2026 متاح الآن للعرض والتحميل.',
      type: 'success',
      timestamp: '2026-08-05T08:00:00',
      read: true,
      important: false,
      action: 'عرض الكشف'
    },
    {
      id: '5',
      title: 'تذكير: تقييم الأداء',
      message: 'يجب إكمال تقييم الأداء الذاتي قبل نهاية الأسبوع.',
      type: 'warning',
      timestamp: '2026-08-04T14:00:00',
      read: true,
      important: true,
      action: 'بدء التقييم'
    },
    {
      id: '6',
      title: 'رسالة جديدة من HR',
      message: 'لديك رسالة جديدة من قسم الموارد البشرية بخصوص طلبك الأخير.',
      type: 'info',
      timestamp: '2026-08-03T10:00:00',
      read: true,
      important: false,
      action: 'عرض الرسالة'
    }
  ];

  const allNotifications = [...mockNotifications, ...notifications];

  const filteredNotifications = allNotifications.filter(notification => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'important') return notification.important;
    return true;
  });

  const handleMarkAsRead = (id: string) => {
    markNotificationAsRead(id);
  };

  const handleMarkAllAsRead = () => {
    allNotifications.forEach(notification => {
      if (!notification.read) {
        markNotificationAsRead(notification.id);
      }
    });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    return date.toLocaleDateString('ar-IQ');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return 'check_circle';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      case 'info':
      default:
        return 'info';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'from-green-500 to-green-600';
      case 'warning':
        return 'from-amber-500 to-amber-600';
      case 'error':
        return 'from-rose-500 to-rose-600';
      case 'info':
      default:
        return 'from-blue-500 to-blue-600';
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-4">
      {/* Mobile Header */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">notifications</span>
          </div>
          <div>
            <h1 className={`text-base font-black leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              التنبيهات والإشعارات
            </h1>
            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {unreadNotifications > 0 ? `${unreadNotifications} تنبيهات غير مقروءة` : 'جميع التنبيهات محدّثة'}
            </p>
          </div>
        </div>

        {unreadNotifications > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-[11px] font-bold text-teal-400 hover:underline bg-teal-500/10 px-2.5 py-1.5 rounded-xl"
          >
            قراءة الكل
          </button>
        )}
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-full font-bold text-xs whitespace-nowrap transition-all ${
            filter === 'all'
              ? 'bg-teal-500 text-slate-950 font-black shadow-sm'
              : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
          }`}
        >
          الكل ({allNotifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3 py-1.5 rounded-full font-bold text-xs whitespace-nowrap transition-all ${
            filter === 'unread'
              ? 'bg-teal-500 text-slate-950 font-black shadow-sm'
              : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
          }`}
        >
          غير مقروء ({allNotifications.filter(n => !n.read).length})
        </button>
        <button
          onClick={() => setFilter('important')}
          className={`px-3 py-1.5 rounded-full font-bold text-xs whitespace-nowrap transition-all ${
            filter === 'important'
              ? 'bg-teal-500 text-slate-950 font-black shadow-sm'
              : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
          }`}
        >
          هام ({allNotifications.filter(n => n.important).length})
        </button>
      </div>

      {/* Notifications Cards List */}
      <div className="space-y-2.5">
        {filteredNotifications.length === 0 ? (
          <div className={`p-8 rounded-3xl border text-center ${
            isDark ? 'bg-[#131b2e] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
          }`}>
            <div className={`w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center ${
              isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'
            }`}>
              <span className="material-symbols-outlined text-2xl">notifications_off</span>
            </div>
            <p className="text-xs font-bold">لا توجد تنبيهات متاحة حالياً</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                !notification.read
                  ? isDark ? 'bg-teal-950/20 border-teal-500/40 text-white shadow-xs' : 'bg-teal-50/70 border-teal-300 text-slate-900 shadow-xs'
                  : isDark ? 'bg-[#131b2e] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getNotificationColor(notification.type)} flex items-center justify-center shrink-0 shadow-xs text-white`}>
                  <span className="material-symbols-outlined text-lg">
                    {getNotificationIcon(notification.type)}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h3 className="text-xs font-bold truncate">{notification.title}</h3>
                      {notification.important && (
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-400 text-[9px] font-bold border border-rose-500/30 shrink-0">
                          هام
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                      {formatTime(notification.timestamp)}
                    </span>
                  </div>

                  <p className={`text-[11px] leading-relaxed mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {notification.message}
                  </p>

                  <div className="flex items-center gap-2">
                    <button className="text-[10px] font-bold text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-lg border border-teal-500/20">
                      {notification.action}
                    </button>
                    {!notification.read && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                          isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                        }`}
                      >
                        تعليم كمقروء
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};