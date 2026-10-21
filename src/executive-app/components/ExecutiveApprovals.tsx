import React, { useState } from 'react';
import { useExecutiveContext, ExecutiveDecision } from '../context/ExecutiveContext';
import { 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Search, 
  Filter, 
  ShieldCheck, 
  AlertCircle, 
  FileCheck, 
  Send,
  Building,
  User,
  Calendar,
  DollarSign
} from 'lucide-react';

export const ExecutiveApprovals: React.FC = () => {
  const { decisions, approveDecision, rejectDecision, requestRevision, theme, language, t } = useExecutiveContext();
  const isDark = theme === 'dark';
  const isAr = language === 'ar';

  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal for decision justification / notes
  const [selectedDecision, setSelectedDecision] = useState<ExecutiveDecision | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'revision' | null>(null);
  const [actionNote, setActionNote] = useState('');

  const filteredDecisions = decisions.filter(d => {
    if (filterStatus !== 'all' && d.status !== filterStatus) return false;
    if (filterType !== 'all' && d.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = d.titleAr.toLowerCase().includes(q) || d.titleEn.toLowerCase().includes(q);
      const matchRequester = d.requesterName.toLowerCase().includes(q) || d.branch.toLowerCase().includes(q);
      if (!matchTitle && !matchRequester) return false;
    }
    return true;
  });

  const handleExecuteAction = () => {
    if (!selectedDecision || !actionType) return;
    if (actionType === 'approve') {
      approveDecision(selectedDecision.id, actionNote || 'تمت المصادقة والاعتماد بموجب الصلاحيات المخولة للمدير العام.');
    } else if (actionType === 'reject') {
      rejectDecision(selectedDecision.id, actionNote || 'مرفوض بتوجيه المدير العام.');
    } else if (actionType === 'revision') {
      requestRevision(selectedDecision.id, actionNote || 'يرجى استيفاء البيانات وتقديم دراسة جدوى.');
    }
    setSelectedDecision(null);
    setActionType(null);
    setActionNote('');
  };

  return (
    <div className="p-3.5 space-y-4 pb-20 animate-in fade-in duration-300">
      {/* Title & Status Summary */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white dark:text-white light:text-slate-900" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
            {t('مركز الموافقات والقرارات التنفيذية', 'Executive Approvals Hub')}
          </h2>
          <p className="text-xs text-slate-400">
            {t('المصادقة الاستراتيجية والقرارات المصيرية للمؤسسة', 'Strategic approvals & high-level enterprise decisions')}
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold">
          {decisions.filter(d => d.status === 'pending').length} {t('قيد الانتظار', 'Pending')}
        </span>
      </div>

      {/* Status Pills */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
        <button
          onClick={() => setFilterStatus('pending')}
          className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
            filterStatus === 'pending'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {t('المعلقة', 'Pending')} ({decisions.filter(d => d.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilterStatus('approved')}
          className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
            filterStatus === 'approved'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {t('المعتمدة', 'Approved')} ({decisions.filter(d => d.status === 'approved').length})
        </button>
        <button
          onClick={() => setFilterStatus('all')}
          className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
            filterStatus === 'all'
              ? 'bg-slate-700 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {t('الكل', 'All')} ({decisions.length})
        </button>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-[11px]">
        {[
          { id: 'all', label: t('كافة الأنواع', 'All Types') },
          { id: 'leave', label: t('إجازات المدراء', 'Leaves') },
          { id: 'hire', label: t('التعيينات الحساسة', 'Hiring') },
          { id: 'bonus', label: t('المكافآت', 'Bonuses') },
          { id: 'contract', label: t('العقود', 'Contracts') },
          { id: 'overtime', label: t('العمل الإضافي', 'Overtime') },
          { id: 'budget', label: t('الموازنات', 'Budgets') }
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilterType(cat.id)}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition-all cursor-pointer ${
              filterType === cat.id
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold'
                : 'bg-slate-800/60 border border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder={t('بحث في القرارات، مقدم الطلب، الفرع...', 'Search decisions, requester, branch...')}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className={`w-full ps-9 pe-3 py-2 rounded-xl text-xs outline-none border transition-all ${
            isDark 
              ? 'bg-slate-900/90 border-slate-800 text-white placeholder-slate-500 focus:border-amber-500' 
              : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-600'
          }`}
        />
      </div>

      {/* Decisions Cards List */}
      <div className="space-y-3">
        {filteredDecisions.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-slate-800 bg-slate-900/50 text-slate-400 space-y-2">
            <CheckCircle2 className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-xs">{t('لا توجد قرارات مطابقة للفلتر المحدد', 'No decisions matching the selected filter')}</p>
          </div>
        ) : (
          filteredDecisions.map(decision => {
            const isPending = decision.status === 'pending';
            const isApproved = decision.status === 'approved';
            const isRejected = decision.status === 'rejected';

            return (
              <div
                key={decision.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isDark 
                    ? 'bg-slate-900/95 border-slate-800 shadow-md' 
                    : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                {/* Header: Badge, Branch, Date, Status */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                      {decision.type === 'leave' && t('إجازة قيادية', 'Leadership Leave')}
                      {decision.type === 'hire' && t('تعيين قيادي', 'Key Hire')}
                      {decision.type === 'bonus' && t('مكافأة تميز', 'Bonus')}
                      {decision.type === 'contract' && t('تجديد عقود', 'Contract')}
                      {decision.type === 'overtime' && t('عمل إضافي', 'Overtime')}
                      {decision.type === 'termination' && t('إنهاء خدمة', 'Settlement')}
                      {decision.type === 'budget' && t('موازنة خاصة', 'Budget')}
                    </span>

                    {decision.policyCompliance === 'compliant' && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] flex items-center gap-1 font-semibold">
                        <ShieldCheck className="w-3 h-3" />
                        {t('مطابق للسياسة', 'Policy Compliant')}
                      </span>
                    )}

                    {decision.policyCompliance === 'exception_required' && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-[10px] flex items-center gap-1 font-semibold">
                        <AlertCircle className="w-3 h-3" />
                        {t('استثناء مدير عام', 'GM Exception Required')}
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    {decision.date}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-xs font-bold text-white dark:text-white light:text-slate-900 leading-snug" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  {isAr ? decision.titleAr : decision.titleEn}
                </h3>

                {/* Requester & Branch Row */}
                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-500" />
                    {decision.requesterName}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Building className="w-3 h-3 text-slate-500" />
                    {decision.branch}
                  </span>
                </div>

                {/* Amount / Duration Highlight Box */}
                {decision.amountOrDuration && (
                  <div className="mt-2.5 p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 flex items-center justify-between text-xs font-mono font-bold">
                    <span>{t('القيمة أو المدة المقررة:', 'Authorized Amount/Period:')}</span>
                    <span className="text-amber-400 text-xs font-bold">{decision.amountOrDuration}</span>
                  </div>
                )}

                {/* Details Narrative */}
                <p className="text-[11px] text-slate-300 dark:text-slate-300 light:text-slate-600 mt-2.5 leading-relaxed bg-slate-800/40 p-2.5 rounded-xl border border-slate-800/50">
                  {isAr ? decision.detailsAr : decision.detailsEn}
                </p>

                {/* Impact Summary */}
                <div className="mt-2 text-[10px] text-slate-400 flex items-start gap-1">
                  <span className="font-bold text-amber-400 shrink-0">{t('الأثر المؤسسي:', 'Institutional Impact:')}</span>
                  <span>{isAr ? decision.impactSummaryAr : decision.impactSummaryEn}</span>
                </div>

                {/* Decision Stamp if Approved / Rejected */}
                {decision.decisionNote && (
                  <div className={`mt-3 p-2.5 rounded-xl border flex items-start gap-2 text-[11px] ${
                    isApproved 
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' 
                      : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                  }`}>
                    <FileCheck className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">
                        {isApproved ? t('مصادق ومعتمد بقرار المدير العام', 'Approved by Managing Director Decree') : t('مرفوض بقرار المدير العام', 'Rejected by Managing Director')}
                      </div>
                      <p className="text-[10px] mt-0.5 opacity-90">{decision.decisionNote}</p>
                    </div>
                  </div>
                )}

                {/* Action Buttons for Pending Decisions */}
                {isPending && (
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800">
                    {/* Revision */}
                    <button
                      onClick={() => {
                        setSelectedDecision(decision);
                        setActionType('revision');
                        setActionNote('');
                      }}
                      className="py-2 px-1 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
                      <span>{t('طلب مراجعة', 'Revise')}</span>
                    </button>

                    {/* Reject */}
                    <button
                      onClick={() => {
                        setSelectedDecision(decision);
                        setActionType('reject');
                        setActionNote('');
                      }}
                      className="py-2 px-1 rounded-xl border border-rose-500/40 hover:bg-rose-500/10 text-rose-400 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{t('رفض القرار', 'Reject')}</span>
                    </button>

                    {/* Approve */}
                    <button
                      onClick={() => {
                        setSelectedDecision(decision);
                        setActionType('approve');
                        setActionNote('تمت المصادقة والاعتماد بموجب الصلاحيات المخولة للمدير العام.');
                      }}
                      className="py-2 px-1 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-[11px] font-bold shadow-sm flex items-center justify-center gap-1 cursor-pointer transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{t('مصادقة واعتماد', 'Approve')}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Decision Justification / Electronic Stamp Modal */}
      {selectedDecision && actionType && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#0d1322] border border-amber-500/30 p-5 space-y-4 shadow-2xl text-white animate-in zoom-in-95">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                actionType === 'approve' ? 'bg-emerald-500/20 text-emerald-400' :
                actionType === 'reject' ? 'bg-rose-500/20 text-rose-400' : 'bg-sky-500/20 text-sky-400'
              }`}>
                {actionType === 'approve' && <CheckCircle2 className="w-5 h-5" />}
                {actionType === 'reject' && <XCircle className="w-5 h-5" />}
                {actionType === 'revision' && <HelpCircle className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm font-bold">
                  {actionType === 'approve' && t('تأكيد المصادقة والاعتماد التنفيذي', 'Confirm Executive Approval')}
                  {actionType === 'reject' && t('تأكيد رفض القرار الإداري', 'Confirm Decision Rejection')}
                  {actionType === 'revision' && t('طلب استيضاح وتعديل', 'Request Clarification / Revision')}
                </h3>
                <p className="text-[10px] text-slate-400">
                  {isAr ? selectedDecision.titleAr : selectedDecision.titleEn}
                </p>
              </div>
            </div>

            {/* Note input */}
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                {t('التوجيه التنفيذي / الملاحظة الرسمية:', 'Official Directive / Justification:')}
              </label>
              <textarea
                rows={3}
                value={actionNote}
                onChange={e => setActionNote(e.target.value)}
                placeholder={t('أدخل توجيه سيادتك لتوثيقه في السجل الإداري...', 'Enter your directive for official archiving...')}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500 resize-none"
              />
            </div>

            {/* Electronic Stamp Badge */}
            {actionType === 'approve' && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-center space-y-1">
                <div className="font-mono text-[10px] uppercase font-bold tracking-widest text-amber-400">
                  ★ VITAS IRAQ EXECUTIVE SIGNATURE ★
                </div>
                <div className="font-bold text-xs">
                  د. شاكر الحسني | المدير العام والرئيس التنفيذي
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  REF: GM-DEC-{Date.now().toString().slice(-6)}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedDecision(null);
                  setActionType(null);
                }}
                className="flex-1 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800"
              >
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                className={`flex-1 py-2 rounded-xl text-white text-xs font-bold transition-all ${
                  actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-500' :
                  actionType === 'reject' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-sky-600 hover:bg-sky-500'
                }`}
              >
                {t('تنفيذ القرار', 'Execute')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
