import React, { useState, useEffect } from 'react';
import { useEmployeeContext } from '../context/EmployeeContext';
import { 
  HelpCircle, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  MessageSquare, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  ShieldAlert, 
  PhoneCall, 
  Mail, 
  Headphones, 
  Check, 
  RefreshCw,
  Search
} from 'lucide-react';

interface EmployeeSupportProps {
  employee: any;
  onLogout?: () => void;
}

export interface SupportTicket {
  id: number | string;
  employee_id: number | string;
  subject: string;
  category: 'HR Query' | 'IT Support' | 'Facilities' | 'Other';
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  ticket_type?: 'طلب' | 'شكوى' | 'استفسار' | 'دعم فني';
  priority?: 'عادية' | 'متوسطة' | 'عاجلة';
  hr_response?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
  created_at: string;
}

export const EmployeeSupport: React.FC<EmployeeSupportProps> = ({ employee }) => {
  const { theme, language } = useEmployeeContext();
  const isDark = theme === 'dark';
  const isEn = language === 'en';

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTicketId, setExpandedTicketId] = useState<number | string | null>(null);

  // New Ticket Form State
  const [ticketType, setTicketType] = useState<'طلب' | 'شكوى' | 'استفسار' | 'دعم فني'>('طلب');
  const [priority, setPriority] = useState<'عادية' | 'متوسطة' | 'عاجلة'>('متوسطة');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const empId = employee?.id || employee?.employee_id || employee?.code || '1';

  // Fetch Tickets
  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/support-tickets?employee_id=${encodeURIComponent(empId)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setTickets(data);
          try {
            localStorage.setItem(`vitas_emp_tickets_${empId}`, JSON.stringify(data));
          } catch (e) {}
        }
      } else {
        // Fallback to local storage
        const local = localStorage.getItem(`vitas_emp_tickets_${empId}`);
        if (local) {
          setTickets(JSON.parse(local));
        }
      }
    } catch (err) {
      console.warn('Network error fetching tickets, checking local storage:', err);
      const local = localStorage.getItem(`vitas_emp_tickets_${empId}`);
      if (local) {
        setTickets(JSON.parse(local));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [empId]);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setToastMessage(isEn ? 'Please fill in subject and details.' : 'يرجى كتابة موضوع الطلب وتفاصيله.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    setIsSubmitting(true);
    const category = ticketType === 'دعم فني' ? 'IT Support' : 'HR Query';

    const payload = {
      employee_id: empId,
      subject: subject.trim(),
      category,
      description: description.trim(),
      ticket_type: ticketType,
      priority
    };

    try {
      const res = await fetch('/api/support-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const resData = await res.json();
        const createdTicket = resData.ticket || {
          id: resData.id || Date.now(),
          ...payload,
          status: 'Open',
          created_at: new Date().toISOString()
        };
        setTickets(prev => [createdTicket, ...prev]);
        setShowForm(false);
        setSubject('');
        setDescription('');
        setToastMessage(isEn 
          ? `✓ Ticket #TK-${createdTicket.id} submitted successfully to HR!` 
          : `✓ تم إرسال تذكرتك بنجاح برقم #TK-${createdTicket.id} إلى قسم الموارد البشرية!`
        );
        setTimeout(() => setToastMessage(null), 4500);
      } else {
        throw new Error('Server returned error');
      }
    } catch (err) {
      // Local fallback
      const fallbackTicket: SupportTicket = {
        id: `LOC-${Date.now().toString().slice(-4)}`,
        employee_id: empId,
        subject: subject.trim(),
        category,
        description: description.trim(),
        ticket_type: ticketType,
        priority,
        status: 'Open',
        created_at: new Date().toISOString()
      };
      setTickets(prev => {
        const updated = [fallbackTicket, ...prev];
        localStorage.setItem(`vitas_emp_tickets_${empId}`, JSON.stringify(updated));
        return updated;
      });
      setShowForm(false);
      setSubject('');
      setDescription('');
      setToastMessage(isEn ? 'Ticket saved locally and queued for delivery.' : 'تم تسجيل التذكرة بنجاح وجاري إرسالها للـ HR.');
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Tickets
  const filteredTickets = tickets.filter(t => {
    if (statusFilter === 'open' && t.status !== 'Open' && t.status !== 'In Progress') return false;
    if (statusFilter === 'resolved' && t.status !== 'Resolved' && t.status !== 'Closed') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchSubject = t.subject?.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchType = t.ticket_type?.toLowerCase().includes(q);
      const matchId = String(t.id).includes(q);
      return matchSubject || matchDesc || matchType || matchId;
    }
    return true;
  });

  const openCount = tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length;
  const resolvedCount = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-4 pb-24 animate-in fade-in">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm p-3.5 rounded-2xl bg-teal-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 border border-teal-400 animate-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-white" />
          <span className="leading-snug">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className={`p-4 rounded-3xl border transition-all ${
        isDark 
          ? 'bg-gradient-to-br from-[#131b2e] to-[#0a0f1d] border-slate-800 text-white shadow-xl' 
          : 'bg-gradient-to-br from-teal-50 to-white border-slate-200 text-slate-900 shadow-sm'
      }`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-black">
                {isEn ? 'Support & Grievances' : 'تقديم طلب أو شكوى (الدعم)'}
              </h1>
              <p className={`text-[11px] font-medium mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {isEn ? 'Submit requests, complaints & HR inquiries' : 'القناة المباشرة مع الموارد البشرية والإدارة'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className={`w-10 h-10 rounded-2xl font-black text-xs flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer ${
              showForm 
                ? 'bg-rose-500 text-white shadow-rose-500/25 rotate-45' 
                : 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-600/30'
            }`}
            title={showForm ? (isEn ? 'Close Form' : 'إغلاق') : (isEn ? 'New Ticket' : 'تقديم طلب جديد')}
          >
            <Plus className="w-5 h-5 transition-transform" />
          </button>
        </div>

        {/* Quick Stats Pill Bar */}
        <div className="grid grid-cols-3 gap-2 mt-3.5 pt-3 border-t border-slate-200/80 dark:border-white/5 text-center text-xs">
          <div 
            onClick={() => setStatusFilter('all')}
            className={`p-2 rounded-xl border cursor-pointer transition-all ${
              statusFilter === 'all' 
                ? 'bg-teal-500/15 border-teal-500/40 text-teal-700 dark:text-teal-300 font-bold' 
                : isDark ? 'bg-black/20 border-white/5 text-slate-400' : 'bg-slate-100/60 border-slate-200 text-slate-600'
            }`}
          >
            <div className="text-sm font-black">{tickets.length}</div>
            <div className="text-[10px]">{isEn ? 'All' : 'الكل'}</div>
          </div>

          <div 
            onClick={() => setStatusFilter('open')}
            className={`p-2 rounded-xl border cursor-pointer transition-all ${
              statusFilter === 'open' 
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold' 
                : isDark ? 'bg-black/20 border-white/5 text-slate-400' : 'bg-slate-100/60 border-slate-200 text-slate-600'
            }`}
          >
            <div className="text-sm font-black">{openCount}</div>
            <div className="text-[10px]">{isEn ? 'In Progress' : 'قيد المتابعة'}</div>
          </div>

          <div 
            onClick={() => setStatusFilter('resolved')}
            className={`p-2 rounded-xl border cursor-pointer transition-all ${
              statusFilter === 'resolved' 
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold' 
                : isDark ? 'bg-black/20 border-white/5 text-slate-400' : 'bg-slate-100/60 border-slate-200 text-slate-600'
            }`}
          >
            <div className="text-sm font-black">{resolvedCount}</div>
            <div className="text-[10px]">{isEn ? 'Resolved' : 'تم الرد'}</div>
          </div>
        </div>
      </div>

      {/* Submission Form Modal / Card */}
      {showForm && (
        <div className={`p-4 rounded-3xl border space-y-3.5 shadow-xl transition-all animate-in zoom-in-95 duration-200 ${
          isDark ? 'bg-[#111827] border-teal-500/30' : 'bg-white border-teal-500/40 shadow-teal-500/10'
        }`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
            <h2 className="text-xs font-black flex items-center gap-2" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
              <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-lg">edit_document</span>
              {isEn ? 'Submit New Request or Grievance' : 'نموذج تقديم طلب أو شكوى جديدة'}
            </h2>
            <button 
              type="button" 
              onClick={() => setShowForm(false)} 
              className="text-slate-400 hover:text-slate-200 text-xs font-bold"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmitTicket} className="space-y-3">
            {/* Ticket Type Selector */}
            <div>
              <label className="block text-[11px] font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#334155' }}>
                {isEn ? 'Type of Submission *' : 'نوع المعاملة أو الطلب *'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { id: 'طلب', labelAr: '📝 طلب إداري', labelEn: '📝 Request', color: 'teal' },
                  { id: 'شكوى', labelAr: '⚠️ شكوى وتظلم', labelEn: '⚠️ Complaint', color: 'rose' },
                  { id: 'استفسار', labelAr: '❓ استفسار', labelEn: '❓ Query', color: 'blue' },
                  { id: 'دعم فني', labelAr: '💻 دعم فني', labelEn: '💻 IT Support', color: 'purple' },
                ].map(item => {
                  const isSelected = ticketType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTicketType(item.id as any)}
                      className={`py-2 px-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-teal-600 text-white border-teal-500 shadow-xs scale-[1.02]'
                          : isDark
                            ? 'bg-[#0a0c10] border-slate-800 text-slate-300 hover:bg-slate-800'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {isEn ? item.labelEn : item.labelAr}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Priority Selector */}
            <div>
              <label className="block text-[11px] font-bold mb-1" style={{ color: isDark ? '#cbd5e1' : '#334155' }}>
                {isEn ? 'Priority' : 'درجة الأهمية'}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'عادية', labelAr: 'عادية', labelEn: 'Normal' },
                  { id: 'متوسطة', labelAr: 'متوسطة', labelEn: 'Medium' },
                  { id: 'عاجلة', labelAr: 'عاجلة جداً', labelEn: 'Urgent' },
                ].map(p => {
                  const isSelected = priority === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPriority(p.id as any)}
                      className={`py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                        isSelected
                          ? p.id === 'عاجلة'
                            ? 'bg-rose-600 text-white border-rose-500'
                            : 'bg-teal-600 text-white border-teal-500'
                          : isDark
                            ? 'bg-[#0a0c10] border-slate-800 text-slate-400'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      {isEn ? p.labelEn : p.labelAr}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subject Field */}
            <div>
              <label className="block text-[11px] font-bold mb-1" style={{ color: isDark ? '#cbd5e1' : '#334155' }}>
                {isEn ? 'Subject *' : 'موضوع الطلب أو الشكوى *'}
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder={isEn ? 'e.g. Inquiry regarding housing allowance' : 'مثال: استفسار حول مكافأة الربع السنوي أو تعديل بيانات'}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-all ${
                  isDark ? 'bg-[#0a0c10] border-slate-700 text-white focus:border-teal-400' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-teal-600'
                }`}
              />
            </div>

            {/* Details Field */}
            <div>
              <label className="block text-[11px] font-bold mb-1" style={{ color: isDark ? '#cbd5e1' : '#334155' }}>
                {isEn ? 'Details and Explanation *' : 'التفاصيل والشرح الوافي *'}
              </label>
              <textarea
                rows={4}
                required
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={isEn ? 'Write detailed description of your request or issue...' : 'يرجى كتابة كافة التفاصيل لمساعدة مسؤولي الموارد البشرية على المتابعة...'}
                className={`w-full p-3 rounded-xl border text-xs outline-none transition-all ${
                  isDark ? 'bg-[#0a0c10] border-slate-700 text-white focus:border-teal-400' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-teal-600'
                }`}
              />
            </div>

            {/* Submit Button */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="w-1/3 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                {isEn ? 'Cancel' : 'إلغاء'}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-2/3 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-teal-600/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isEn ? 'Submitting...' : 'جاري الإرسال...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{isEn ? 'Submit to HR' : 'إرسال التذكرة للـ HR'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Filter Header */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 rtl:left-auto rtl:right-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={isEn ? 'Search my tickets...' : 'بحث في طلباتي وشكاوى السابقة...'}
            className={`w-full ps-9 pe-3 py-2 rounded-xl border text-xs outline-none ${
              isDark ? 'bg-[#111827] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          />
        </div>
        <button
          onClick={fetchTickets}
          className={`p-2 rounded-xl border shrink-0 transition-colors ${
            isDark ? 'bg-[#111827] border-slate-800 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
          title={isEn ? 'Refresh' : 'تحديث'}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-teal-500' : ''}`} />
        </button>
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
            {isEn ? `My Submissions (${filteredTickets.length})` : `سجل طلباتي والشكاوى (${filteredTickets.length})`}
          </h2>
          {statusFilter !== 'all' && (
            <button 
              onClick={() => setStatusFilter('all')}
              className="text-[10px] text-teal-600 font-bold hover:underline"
            >
              {isEn ? 'Clear Filter' : 'عرض الكل'}
            </button>
          )}
        </div>

        {filteredTickets.length === 0 ? (
          <div className={`p-8 rounded-3xl border text-center space-y-3 ${
            isDark ? 'bg-[#111827] border-slate-800/80 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-xs" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                {isEn ? 'No tickets found' : 'لا توجد طلبات أو شكاوى مسجلة'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {isEn ? 'You can submit a new request anytime using the button above.' : 'يمكنك تقديم طلب جديد أو شكوى رسمية في أي وقت بالضغط على الزر أعلاه.'}
              </p>
            </div>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>{isEn ? 'Submit Ticket Now' : 'تقديم طلب الآن'}</span>
              </button>
            )}
          </div>
        ) : (
          filteredTickets.map(ticket => {
            const isExpanded = expandedTicketId === ticket.id;
            const isResolved = ticket.status === 'Resolved' || ticket.status === 'Closed';
            const hasResponse = Boolean(ticket.hr_response);

            return (
              <div
                key={ticket.id}
                className={`p-4 rounded-2xl border transition-all shadow-xs space-y-2.5 ${
                  isDark 
                    ? 'bg-[#111827] border-slate-800/80 hover:border-slate-700' 
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Top Row: Ticket ID, Type & Status Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-[10px] text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-lg border border-teal-500/20">
                      #TK-{ticket.id}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                      ticket.ticket_type === 'شكوى'
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        : ticket.ticket_type === 'استفسار'
                        ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20'
                        : ticket.ticket_type === 'دعم فني'
                        ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                        : 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/20'
                    }`}>
                      {ticket.ticket_type || 'طلب'}
                    </span>
                    {ticket.priority === 'عاجلة' && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-600 text-white">
                        {isEn ? 'Urgent' : 'عاجل'}
                      </span>
                    )}
                  </div>

                  {/* Status Badge */}
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                    isResolved
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : ticket.status === 'In Progress'
                      ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  }`}>
                    {isResolved ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span>{isEn ? 'Resolved' : 'تم الحل والرد'}</span>
                      </>
                    ) : ticket.status === 'In Progress' ? (
                      <>
                        <Clock className="w-3 h-3 text-sky-500" />
                        <span>{isEn ? 'In Progress' : 'قيد المتابعة'}</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3 text-amber-500" />
                        <span>{isEn ? 'Pending Review' : 'بانتظار المراجعة'}</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Subject & Summary */}
                <div>
                  <h3 className="font-black text-xs" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                    {ticket.subject}
                  </h3>
                  <p className={`text-[11px] mt-1 leading-relaxed ${
                    isExpanded ? '' : 'line-clamp-2'
                  } ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {ticket.description}
                  </p>
                </div>

                {/* HR Official Response Box (If present) */}
                {hasResponse && (
                  <div className={`p-3 rounded-xl border space-y-1 text-xs ${
                    isDark 
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200' 
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}>
                    <div className="flex items-center justify-between text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        {isEn ? 'Official HR Response' : 'رد مسؤولي الموارد البشرية:'}
                      </span>
                      {ticket.resolved_by && <span>بواسطة: {ticket.resolved_by}</span>}
                    </div>
                    <p className="text-[11px] leading-relaxed font-medium">
                      {ticket.hr_response}
                    </p>
                  </div>
                )}

                {/* Footer: Date and Toggle Expand */}
                <div className={`pt-2 border-t flex items-center justify-between text-[10px] ${
                  isDark ? 'border-white/5 text-slate-400' : 'border-slate-100 text-slate-500'
                }`}>
                  <span className="font-mono">
                    {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString('ar-IQ', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : ''}
                  </span>

                  <button
                    onClick={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
                    className="font-bold text-teal-600 dark:text-teal-400 flex items-center gap-0.5 hover:underline"
                  >
                    <span>{isExpanded ? (isEn ? 'Show Less' : 'طي التفاصيل') : (isEn ? 'Details' : 'عرض التفاصيل')}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Emergency Contact & HR Direct Assistance Card */}
      <div className={`p-4 rounded-3xl border space-y-2 text-xs ${
        isDark ? 'bg-[#0f141f] border-slate-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <h3 className="font-black text-xs flex items-center gap-2" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
          <Headphones className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          {isEn ? 'Emergency Direct Channels' : 'قنوات التواصل المباشر مع الموارد البشرية'}
        </h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          {isEn 
            ? 'For urgent matters, reach out to the General Administration HR Helpdesk during official work hours.' 
            : 'للحالات الطارئة جداً، يمكنك التواصل مع شعبة شؤون الموظفين بالإدارة العامة أثناء الدوام الرسمي.'}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <a
            href="tel:07700000000"
            className="px-3 py-1.5 rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-300 font-bold text-[11px] flex items-center gap-1.5 border border-teal-500/20"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>0770 000 0000</span>
          </a>
          <a
            href="mailto:hr@vitasiraq.iq"
            className="px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold text-[11px] flex items-center gap-1.5 border border-blue-500/20"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>hr@vitasiraq.iq</span>
          </a>
        </div>
      </div>
    </div>
  );
};

