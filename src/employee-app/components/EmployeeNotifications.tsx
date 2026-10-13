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

  // تنبيهات تجريبية مع مرفقات رسمية
  const mockNotifications = [
    {
      id: '1',
      title: 'تم قبول طلب الإجازة',
      message: 'تم قبول طلب الإجازة من 15-20 أغسطس 2026. يمكنك الآن التخطيط لإجازتك.',
      type: 'success',
      timestamp: '2026-08-08T09:15:00',
      read: false,
      important: true,
      action: 'عرض التفاصيل',
      attachments: [
        {
          name: 'قرار_الموافقة_على_الإجازة_السنوية.pdf',
          size: '380 KB',
          type: 'pdf',
          refNo: 'LV-APP-2026/089',
          issuer: 'شعبة الإجازات والدوام - فيتاس العراق',
          content: 'نص الموافقة الرسمية: تم قبول طلب الإجازة المقدم بعد تدقيق الرصيد السنوي المتاح للموظف والموافقة عليها أصولياً.'
        }
      ]
    },
    {
      id: '2',
      title: 'تذكير: اجتماع الفريق وتعميم أوقات العمل',
      message: 'اجتماع الفريق الأسبوعي غداً الساعة 9 صباحاً في قاعة الاجتماعات رقم 2.',
      type: 'info',
      timestamp: '2026-08-07T16:00:00',
      read: false,
      important: true,
      action: 'إضافة للتقويم',
      attachments: [
        {
          name: 'جدول_أعمال_الاجتماع_والتوجيهات.pdf',
          size: '520 KB',
          type: 'pdf',
          refNo: 'MTG-2026/41',
          issuer: 'إدارة العمليات - فيتاس العراق',
          content: 'جدول أعمال الاجتماع الأسبوعي: مراجعة المستهدفات الشهرية، مؤشرات خدمة العملاء، خطة العمل الميداني.'
        }
      ]
    },
    {
      id: '3',
      title: 'تحديث سلم الحوافز والرواتب الربع سنوية',
      message: 'تم تحديث سياسة الرواتب والحوافز الربع سنوية المعتمدة لعام 2026. يرجى مراجعة المستند والجدول المرفق.',
      type: 'warning',
      timestamp: '2026-08-06T11:30:00',
      read: true,
      important: false,
      action: 'عرض المستند',
      attachments: [
        {
          name: 'لائحة_الحوافز_والإنتاجية_المعتمدة.pdf',
          size: '1.4 MB',
          type: 'pdf',
          refNo: 'VITAS/HR/DEC-2026/089',
          issuer: 'الإدارة العامة - فيتاس العراق',
          content: 'المادة 1: تُصرف الحوافز الربع سنوية وفق معدلات الإنجاز ومطابقة الحضور بما لا يقل عن 90%.\nالمادة 2: يُعمل بالقرار اعتباراً من الشهر الجاري.'
        },
        {
          name: 'جدول_معايير_الاستحقاق_2026.xlsx',
          size: '620 KB',
          type: 'excel',
          refNo: 'VITAS/FIN/TBL-2026/44',
          issuer: 'الشؤون المالية والموارد البشرية',
          content: 'جدول معايير ونسب استحقاق الحوافز والتقييم الوظيفي لموظفي الفروع والإدارات.'
        }
      ]
    },
    {
      id: '4',
      title: 'كشف الراتب لشهر آب 2026 متاح الآن',
      message: 'كشف راتب شهر أغسطس 2026 متاح الآن للعرض والتحميل مع تفاصيل البدلات والاستقطاعات.',
      type: 'success',
      timestamp: '2026-08-05T08:00:00',
      read: true,
      important: false,
      action: 'عرض الكشف',
      attachments: [
        {
          name: 'قسيمة_راتب_رسمية_آب_2026.pdf',
          size: '420 KB',
          type: 'pdf',
          refNo: 'VTS/PAY/2026-08/SLIP',
          issuer: 'قسم الرواتب والأجور - فيتاس العراق',
          content: 'قسيمة صرف الراتب الشهرية المعتمدة رسمياً متضمنة الراتب الأساسي والبدلات وصندوق الضمان الاجتماعي.'
        }
      ]
    },
    {
      id: '5',
      title: 'تذكير: تقييم الأداء ونموذج التطوير',
      message: 'يجب إكمال تقييم الأداء الذاتي ومراجعة الأهداف التشغيلية قبل نهاية الأسبوع.',
      type: 'warning',
      timestamp: '2026-08-04T14:00:00',
      read: true,
      important: true,
      action: 'بدء التقييم',
      attachments: [
        {
          name: 'دليل_معايير_تقييم_الأداء_KPIs.xlsx',
          size: '780 KB',
          type: 'excel',
          refNo: 'VITAS/HR/KPI-2026',
          issuer: 'قسم التدريب والتطوير الوظيفي',
          content: 'معايير تقييم الأداء السنوي ومؤشرات قياس الإنتاجية الوظيفية وجودة العمل الميداني.'
        }
      ]
    },
    {
      id: '6',
      title: 'رسالة جديدة من إدارة الموارد البشرية',
      message: 'تحديث استمارة التأمين الصحي وإصدار بطاقات العلاج الطبي لك ولعائلتك.',
      type: 'info',
      timestamp: '2026-08-03T10:00:00',
      read: true,
      important: false,
      action: 'عرض الرسالة',
      attachments: [
        {
          name: 'استمارة_تحديث_التأمين_الطبي_2026.pdf',
          size: '710 KB',
          type: 'pdf',
          refNo: 'VITAS/MED/FORM-2026/12',
          issuer: 'وحدة الخدمات والمنافع الطبية',
          content: 'استمارة تجديد وثيقة التأمين الصحي الشامل للموظفين وأفراد عائلاتهم المستحقين.'
        }
      ]
    }
  ];

  const [previewAttachment, setPreviewAttachment] = useState<any | null>(null);

  const handleDownloadAttachment = (att: any) => {
    let mimeType = att.type === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf';
    const content = `=== VITAS IRAQ OFFICIAL HR DOCUMENT ===\nDocument: ${att.name}\nRef: ${att.refNo || 'VITAS/HR/2026'}\nDate: ${new Date().toLocaleDateString('ar-IQ')}\n${att.content || 'Verified by VITAS Iraq HRMS Portal.'}`;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = att.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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

                  <p className={`text-[11px] leading-relaxed mb-2.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {notification.message}
                  </p>

                  {/* Notification Attachments List */}
                  {notification.attachments && notification.attachments.length > 0 && (
                    <div className="mb-3 space-y-1.5 pt-2 border-t border-white/5">
                      <p className="text-[10px] font-bold text-teal-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">attach_file</span>
                        <span>المرفقات المعتمدة ({notification.attachments.length})</span>
                      </p>
                      {notification.attachments.map((att: any, idx: number) => (
                        <div
                          key={idx}
                          className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-[11px] ${
                            isDark ? 'bg-slate-900/90 border-slate-700/80' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="material-symbols-outlined text-base text-rose-400 shrink-0">
                              {att.type === 'excel' ? 'table_chart' : 'description'}
                            </span>
                            <span className="truncate font-bold">{att.name}</span>
                            <span className="text-[9px] text-slate-400 shrink-0 font-mono">({att.size})</span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => setPreviewAttachment({ ...att, notifTitle: notification.title })}
                              className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30 flex items-center gap-0.5 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-xs">visibility</span>
                              <span>معاينة</span>
                            </button>
                            <button
                              onClick={() => handleDownloadAttachment(att)}
                              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 cursor-pointer"
                              title="تحميل"
                            >
                              <span className="material-symbols-outlined text-xs">download</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button className="text-[10px] font-bold text-white bg-teal-600 hover:bg-teal-700 px-2.5 py-1 rounded-lg shadow-sm transition-all cursor-pointer">
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

      {/* Attachment Preview Modal for Mobile App */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className={`w-full max-w-sm rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${
            isDark ? 'bg-[#0f172a] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className={`p-3.5 border-b flex items-center justify-between ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-teal-400 text-lg">description</span>
                <span className="text-xs font-bold truncate">{previewAttachment.name}</span>
              </div>
              <button
                onClick={() => setPreviewAttachment(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 text-xs leading-relaxed">
              <div className="border-b border-teal-500/20 pb-3 text-center">
                <p className="font-black text-teal-400 text-sm">مؤسسة فيتاس العراق للتمويل الأصغر</p>
                <p className="text-[10px] text-slate-400">VITAS IRAQ - HRMS OFFICIAL ATTACHMENT</p>
                <p className="text-[10px] font-mono mt-1 text-teal-500 font-bold">{previewAttachment.refNo || 'REF-2026'}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/40 border border-white/5 space-y-2 whitespace-pre-line text-justify">
                {previewAttachment.content || 'وثيقة رسمية معتمدة من إدارة الموارد البشرية والشؤون الإدارية.'}
              </div>

              <div className="pt-2 text-center text-[10px] text-emerald-400 font-bold flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-sm">verified</span>
                <span>مصادق ومعتمد رسمياً من الإدارة العامة</span>
              </div>
            </div>

            <div className={`p-3 border-t flex items-center justify-between gap-2 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <button
                onClick={() => handleDownloadAttachment(previewAttachment)}
                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                <span>تحميل المرفق</span>
              </button>
              <button
                onClick={() => setPreviewAttachment(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};