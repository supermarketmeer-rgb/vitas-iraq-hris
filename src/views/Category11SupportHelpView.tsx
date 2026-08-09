import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { EmptyState } from '../components/EmptyState';

export const Category11SupportHelpView: React.FC = () => {
  const {
    activeModuleId,
    setActiveModuleId,
    currentUser,
    notifications,
    markNotificationRead,
    resetToZeroData,
    isDark,
    t
  } = useApp();

  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMsg, setTicketMsg] = useState('');
  const [ticketSent, setTicketSent] = useState(false);

  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string; time: string }[]>([]);

  const handleSendTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject) return;
    setTicketSent(true);
    setTicketSubject('');
    setTicketMsg('');
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput) return;
    const newM = {
      sender: currentUser.name,
      text: chatInput,
      time: new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, newM]);
    setChatInput('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Banner */}
      <div className="dark-banner p-6 rounded-3xl bg-gradient-to-r from-teal-900 via-teal-800 to-teal-900 border border-white/10 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-teal-400">support_agent</span>
            <span className="text-xs font-mono text-teal-400 uppercase tracking-widest font-bold">
              SUPPORT, COMMUNICATION & MOBILE HUB
            </span>
          </div>
          <h1 className="text-2xl font-black text-white text-white-force drop-shadow-sm">
            {activeModuleId === 'supp-emp-portal' && t('بوابة دعم الموظفين وتذاكر الاستفسارات', 'Employee Support Portal & Tickets')}
            {activeModuleId === 'supp-agent-desk' && t('لوحة مكتب وكيل الدعم وإدارة التذاكر', 'Support Desk Agent Portal & Ticket Management')}
            {activeModuleId === 'supp-knowledge-base' && t('قاعدة المعرفة والأجوبة على الأسئلة الشائعة', 'Knowledge Base & FAQ')}
            {activeModuleId === 'supp-guide-center' && t('مركز دليل واستخدام البوابة بالفيديو والصور', 'User Guides & Help Center')}
            {activeModuleId === 'supp-emp-handbook' && t('دليل وكتيب حقوق وواجبات الموظف في فيتاس العراق', 'VITAS Iraq Employee Handbook')}
            {activeModuleId === 'supp-news-admin' && t('إدارة ونشر الأخبار والتنبيهات الإدارية', 'Company News & Announcements Admin')}
            {activeModuleId === 'supp-notif-settings' && t('تخصيص تفضيلات وقنوات الإشعارات', 'Notification Preferences & Channels')}
            {activeModuleId === 'supp-notif-center' && t('مركز التنبيهات والأحداث الرسمية', 'Notification & Events Center')}
            {activeModuleId === 'supp-profile-settings' && t('إعدادات الملف والتفضيلات الشخصية', 'Profile & Preference Settings')}
            {activeModuleId === 'supp-internal-chat' && t('المحادثات الداخلية بين الموظفين (Internal Chat)', 'Internal Staff Messaging (Internal Chat)')}
            {activeModuleId === 'supp-mobile-app' && t('تحميل ومزامنة تطبيق الهاتف المحمول', 'Mobile Application Sync & Download')}
            {activeModuleId === 'supp-enterprise-nexus' && t('نظام Enterprise Nexus للربط الموحد', 'Enterprise Nexus Integration System')}
            {activeModuleId === 'supp-nexus-mobile' && t('مرافق الهاتف الذكي Nexus Mobile Companion', 'Nexus Mobile Companion App')}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {t('مركز التواصل المباشر والدعم الفني لكافة موظفي وفروع فيتاس العراق', 'Direct communication & support hub for all VITAS Iraq staff & branches')}
          </p>
        </div>
      </div>

      {activeModuleId === 'supp-emp-portal' && (
        <div className="max-w-2xl mx-auto p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4 text-xs">
          <h2 className="text-sm font-bold text-white border-b border-white/10 pb-2">{t('تقديم تذكرة دعم جديدة', 'Submit New Support Ticket')}</h2>

          {ticketSent && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
              {t(`تم إرسال تذكرتك بنجاح برقم #TK-${Math.floor(1000 + Math.random() * 9000)} وسيتواصل معك فريق الدعم قريباً.`, `Your ticket #TK-${Math.floor(1000 + Math.random() * 9000)} was submitted successfully. Support will respond shortly.`)}
            </div>
          )}

          <form onSubmit={handleSendTicket} className="space-y-3">
            <div>
              <label className="block text-slate-400 mb-1">{t('موضوع التذكرة *', 'Ticket Subject *')}</label>
              <input
                type="text"
                required
                placeholder={t('مثال: استفسار عن اقتطاع بدل السكن لهذا الشهر', 'e.g. Housing allowance query for this month')}
                value={ticketSubject}
                onChange={e => setTicketSubject(e.target.value)}
                className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">{t('تفاصيل الاستفسار أو المشكلة *', 'Issue / Request Details *')}</label>
              <textarea
                rows={4}
                required
                placeholder={t('اكتب التفاصيل هنا...', 'Write details here...')}
                value={ticketMsg}
                onChange={e => setTicketMsg(e.target.value)}
                className="w-full bg-[#0a0c10] border border-white/10 rounded-xl p-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg shadow-teal-600/25 transition-all"
            >
              {t('إرسال التذكرة لفريق الدعم', 'Submit Ticket to Support Team')}
            </button>
          </form>
        </div>
      )}

      {activeModuleId === 'supp-internal-chat' && (
        <div className="max-w-3xl mx-auto p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-bold text-white">{t('المحادثة والدردشة الداخلية المباشرة', 'Live Internal Staff Messaging')}</h2>
            <span className="text-emerald-400 font-bold">{t('● متصل الآن', '● Online')}</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0a0c10] border border-white/10 h-64 overflow-y-auto space-y-3 custom-scrollbar">
            {chatMessages.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <span className="material-symbols-outlined text-3xl mb-1">forum</span>
                <p>{t('ابدأ المحادثة الداخلية الآمنة بين الموظفين والأقسام', 'Start secure internal chats with colleagues and departments')}</p>
              </div>
            ) : (
              chatMessages.map((m, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-[#111827] border border-white/10 text-right space-y-1">
                  <div className="flex justify-between font-bold text-teal-400">
                    <span>{m.sender}</span>
                    <span className="text-[10px] text-slate-500">{m.time}</span>
                  </div>
                  <p className="text-slate-200">{m.text}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendChatMessage} className="flex gap-2">
            <input
              type="text"
              placeholder={t('اكتب رسالتك المباشرة هنا...', 'Type your message here...')}
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              className="flex-1 bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
            />
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition-all shadow-md shadow-teal-600/20"
            >
              {t('إرسال', 'Send')}
            </button>
          </form>
        </div>
      )}

      {activeModuleId === 'supp-notif-center' && (
        <div className={`p-6 rounded-3xl ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200 shadow-xl'} border space-y-4 text-xs`}>
          <div className={`flex items-center justify-between border-b ${isDark ? 'border-white/10' : 'border-slate-200'} pb-3`}>
            <h2 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <span className="material-symbols-outlined text-teal-600 dark:text-teal-400">notifications_active</span>
              {t(`مركز التنبيهات والإشعارات الرسمية (${notifications.length})`, `Official Notifications Center (${notifications.length})`)}
            </h2>
            <span className="text-xs bg-teal-500/10 text-teal-700 dark:text-teal-400 font-mono font-bold px-3 py-1 rounded-full border border-teal-500/20">
              {notifications.filter(n => !n.read).length} {t('غير مقروءة', 'unread')}
            </span>
          </div>

          {notifications.length === 0 ? (
            <EmptyState
              icon="notifications_off"
              title={t('لا توجد تنبيهات مسجلة', 'No Notifications')}
              description={t('جميع الإشعارات الصادرة ستقوم بالظهور هنا فور وقوع الحدث.', 'All incoming alerts and system events will appear here.')}
            />
          ) : (
            <div className="space-y-3">
              {notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => markNotificationRead(n.id)}
                  className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                    n.read
                      ? isDark ? 'bg-[#0a0c10] border-white/5 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-700'
                      : isDark ? 'bg-teal-600/10 border-teal-500/30 text-white font-bold' : 'bg-teal-50 border-teal-300 text-slate-900 font-bold shadow-sm'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {!n.read && <span className="w-2 h-2 rounded-full bg-teal-500 inline-block animate-pulse"></span>}
                      <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{n.title}</p>
                    </div>
                    <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'} font-medium`}>{n.message}</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500 whitespace-nowrap mr-3">{n.timestamp}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeModuleId === 'supp-mobile-app' && (
        <div className="max-w-xl mx-auto p-8 rounded-3xl bg-[#111827] border border-white/10 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-teal-600/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-3xl">smartphone</span>
          </div>

          <div>
            <h2 className="text-base font-bold text-white">VITAS IRAQ HRMS Mobile App</h2>
            <p className="text-xs text-slate-400 mt-1">{t('تطبيق الموبايل المباشر لمتابعة الإجازات، الراتب والدوام من هاتفك الذكي', 'Mobile app for tracking leaves, payslips & attendance on your smartphone')}</p>
          </div>

          <div className="flex justify-center gap-3">
            <button className="px-5 py-2.5 rounded-xl bg-[#0a0c10] hover:bg-slate-800 text-white font-bold text-xs border border-white/10 flex items-center gap-2 transition-colors">
              <span className="material-symbols-outlined text-teal-400">android</span>
              {t('تحميل لنظام Android (APK)', 'Download Android (APK)')}
            </button>
            <button className="px-5 py-2.5 rounded-xl bg-[#0a0c10] hover:bg-slate-800 text-white font-bold text-xs border border-white/10 flex items-center gap-2 transition-colors">
              <span className="material-symbols-outlined text-teal-400">apple</span>
              {t('تحميل لنظام iOS App Store', 'Download iOS App Store')}
            </button>
          </div>
        </div>
      )}

      {activeModuleId === 'supp-profile-settings' && (
        <div className="max-w-xl mx-auto p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4 text-xs">
          <h2 className="text-sm font-bold text-white border-b border-white/10 pb-2">{t('تفضيلات وإعدادات الحساب', 'Account Preferences & Settings')}</h2>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-[#0a0c10] border border-white/10 flex justify-between items-center">
              <div>
                <p className="font-bold text-white">{t('الاسم والبيانات', 'Name & Profile')}</p>
                <p className="text-[10px] text-slate-400">{currentUser.name} ({currentUser.email})</p>
              </div>
              <span className="text-teal-400 font-bold">{currentUser.role}</span>
            </div>

            <button
              onClick={() => {
                if (confirm(t('هل أنت تأكد من تفريغ كافة البيانات وإعادتها لصفر؟', 'Are you sure you want to reset all data to zero?'))) {
                  resetToZeroData();
                  setActiveModuleId('dash-overview');
                }
              }}
              className="w-full py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold hover:bg-rose-500/20 text-center transition-colors"
            >
              {t('إعادة ضبط البيانات إلى صفر تماماً', 'Reset All Data to Zero')}
            </button>
          </div>
        </div>
      )}

      {(activeModuleId === 'supp-agent-desk' ||
        activeModuleId === 'supp-knowledge-base' ||
        activeModuleId === 'supp-guide-center' ||
        activeModuleId === 'supp-emp-handbook' ||
        activeModuleId === 'supp-news-admin' ||
        activeModuleId === 'supp-notif-settings' ||
        activeModuleId === 'supp-enterprise-nexus' ||
        activeModuleId === 'supp-nexus-mobile') && (
        <div className="p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white border-b border-white/10 pb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-400">help_center</span>
            {t('الدليل وقاعدة المعرفة الموحدة', 'Handbook & Knowledge Base Portal')}
          </h2>
          <EmptyState
            icon="auto_stories"
            title={t('وحدة الدعم والإرشادات جاهزة', 'Help & Guidance Module Ready')}
            description={t('جميع كتيبات وإرشادات استخدام بوابة فيتاس العراق متوفرة باللغة العربية والإنجليزية.', 'All VITAS Iraq guides and documentations are available in Arabic and English.')}
          />
        </div>
      )}
    </div>
  );
};
