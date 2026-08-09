import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmployeeContext } from '../context/EmployeeContext';

interface EmployeeMessagesProps {
  employee: any;
  onLogout: () => void;
}

export const EmployeeMessages: React.FC<EmployeeMessagesProps> = ({ employee, onLogout }) => {
  const navigate = useNavigate();
  const { messages, addMessage, markMessageAsRead, unreadMessages, theme, toggleTheme } = useEmployeeContext();
  const isDark = theme === 'dark';

  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [newMessage, setNewMessage] = useState({
    to: '',
    subject: '',
    content: ''
  });

  // رسائل تجريبية
  const mockMessages = [
    {
      id: '1',
      from: 'إدارة الموارد البشرية',
      fromId: 'HR001',
      subject: 'تحديث سياسة الإجازات',
      content: 'نود إعلامكم بتحديث سياسة الإجازات السنوية ابتداءً من الشهر القادم. يرجى مراجعة القسم الجديد في بوابة الموظفين للحصول على التفاصيل الكاملة.',
      timestamp: '2026-08-08T10:30:00',
      read: false,
      priority: 'high'
    },
    {
      id: '2',
      from: 'المدير المباشر',
      fromId: 'MGR001',
      subject: 'اجتماع الفريق الأسبوعي',
      content: 'تذكير بموعد اجتماع الفريق الأسبوعي يوم الأحد القادم الساعة 9 صباحاً في قاعة الاجتماعات رقم 2. يرجى التأكد من حضوركم.',
      timestamp: '2026-08-07T14:15:00',
      read: true,
      priority: 'normal'
    },
    {
      id: '3',
      from: 'قسم المالية',
      fromId: 'FIN001',
      subject: 'إشعار كشف الراتب',
      content: 'تم إصدار كشف الراتب للشهر الحالي. يمكنك الآن عرض وتحميل كشف الراتب من قسم الرواتب في البوابة.',
      timestamp: '2026-08-05T09:00:00',
      read: true,
      priority: 'normal'
    }
  ];

  const allMessages = [...mockMessages, ...messages];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.to || !newMessage.subject || !newMessage.content) return;

    addMessage({
      from: employee?.fullName || 'الموظف',
      fromId: employee?.employeeId || 'EMP001',
      to: newMessage.to,
      subject: newMessage.subject,
      content: newMessage.content,
      timestamp: new Date().toISOString(),
      read: false,
      priority: 'normal'
    });

    setNewMessage({ to: '', subject: '', content: '' });
    setShowCompose(false);
  };

  const handleSelectMessage = (message: any) => {
    setSelectedMessage(message);
    if (!message.read) {
      markMessageAsRead(message.id);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffHours < 24) return `اليوم، ${date.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}`;
    if (diffDays === 1) return `أمس، ${date.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}`;
    return date.toLocaleDateString('ar-IQ');
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-4">
      {/* Mobile Top Header */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">mail</span>
          </div>
          <div>
            <h1 className={`text-base font-black leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              الرسائل والمراسلات
            </h1>
            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {unreadMessages > 0 ? `${unreadMessages} رسائل غير مقروءة` : 'صندوق الوارد المباشر'}
            </p>
          </div>
        </div>

        <button
          onClick={() => { setSelectedMessage(null); setShowCompose(true); }}
          className="px-3.5 py-2 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs flex items-center gap-1 shadow-md shadow-teal-600/20 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-base">edit</span>
          <span>كتابة</span>
        </button>
      </div>

      {showCompose ? (
        /* Mobile Compose Modal / Card */
        <div className={`p-4 rounded-3xl border shadow-xl space-y-4 animate-in fade-in duration-200 ${
          isDark ? 'bg-[#131b2e] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-700/40">
            <h2 className="text-sm font-black flex items-center gap-1.5">
              <span className="material-symbols-outlined text-teal-400">send</span>
              <span>كتابة رسالة جديدة</span>
            </h2>
            <button
              onClick={() => setShowCompose(false)}
              className={`p-1 rounded-full ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <form onSubmit={handleSendMessage} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold mb-1 text-teal-400">إلى (اسم المستلم أو القسم) *</label>
              <input
                type="text"
                value={newMessage.to}
                onChange={(e) => setNewMessage({...newMessage, to: e.target.value})}
                placeholder="مثال: قسم الموارد البشرية"
                className={`w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold mb-1 text-teal-400">موضوع الرسالة *</label>
              <input
                type="text"
                value={newMessage.subject}
                onChange={(e) => setNewMessage({...newMessage, subject: e.target.value})}
                placeholder="عنوان أو موضوع المراسلة..."
                className={`w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold mb-1 text-teal-400">محتوى الرسالة *</label>
              <textarea
                value={newMessage.content}
                onChange={(e) => setNewMessage({...newMessage, content: e.target.value})}
                placeholder="اكتب نص الرسالة هنا..."
                rows={4}
                className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
                required
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md"
              >
                إرسال الرسالة
              </button>
              <button
                type="button"
                onClick={() => setShowCompose(false)}
                className={`px-4 py-2.5 rounded-2xl border font-bold text-xs ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
                }`}
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      ) : selectedMessage ? (
        /* Mobile Message Detail View */
        <div className={`p-4 rounded-3xl border shadow-xl space-y-4 animate-in fade-in duration-200 ${
          isDark ? 'bg-[#131b2e] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/40">
            <button
              onClick={() => setSelectedMessage(null)}
              className="flex items-center gap-1 text-teal-400 text-xs font-bold hover:underline"
            >
              <span className="material-symbols-outlined text-base">arrow_forward</span>
              <span>العودة للرسائل</span>
            </button>
            {selectedMessage.priority === 'high' && (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold border border-rose-500/30">
                رسالة هامة
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 text-white font-black flex items-center justify-center shrink-0">
              {selectedMessage.from.charAt(0)}
            </div>
            <div>
              <h2 className="text-sm font-bold">{selectedMessage.from}</h2>
              <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {formatTime(selectedMessage.timestamp)}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black text-teal-400 mb-2">{selectedMessage.subject}</h3>
            <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
              isDark ? 'bg-slate-900/60 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}>
              {selectedMessage.content}
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              onClick={() => alert('تم إرسال الرد المباشر')}
              className="flex-1 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">reply</span>
              <span>رد سريع</span>
            </button>
          </div>
        </div>
      ) : (
        /* Mobile Message List */
        <div className="space-y-2.5">
          {allMessages.map((message) => (
            <div
              key={message.id}
              onClick={() => handleSelectMessage(message)}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all active:scale-98 ${
                !message.read 
                  ? isDark 
                    ? 'bg-teal-950/30 border-teal-500/40 text-white shadow-sm' 
                    : 'bg-teal-50/80 border-teal-200 text-slate-900 shadow-xs'
                  : isDark 
                    ? 'bg-[#131b2e] border-slate-800 text-slate-200' 
                    : 'bg-white border-slate-200 text-slate-800 shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                  !message.read 
                    ? 'bg-gradient-to-tr from-teal-500 to-emerald-400 text-white shadow-sm' 
                    : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                }`}>
                  {message.from.charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className={`text-xs font-bold truncate ${!message.read ? 'text-teal-400 font-black' : ''}`}>
                      {message.from}
                    </p>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                      {formatTime(message.timestamp).split('،')[0]}
                    </span>
                  </div>

                  <p className="text-xs font-bold truncate mb-1">{message.subject}</p>
                  <p className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {message.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};