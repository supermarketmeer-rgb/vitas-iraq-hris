import React, { useState } from 'react';
import { AttendanceCorrectionRequest, Language, LeaveRequest } from './types';
import { translations } from './translations';

interface ManagerApprovalCenterProps {
  pendingLeaves: LeaveRequest[];
  pendingCorrections: AttendanceCorrectionRequest[];
  lang: Language;
  onTakeAction: (payload: {
    request_type: 'leave' | 'correction';
    request_id: number;
    action: 'approve' | 'reject' | 'return';
    comments?: string;
    rejection_reason?: string;
  }) => Promise<void>;
}

export const ManagerApprovalCenter: React.FC<ManagerApprovalCenterProps> = ({
  pendingLeaves,
  pendingCorrections,
  lang,
  onTakeAction,
}) => {
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState<'leaves' | 'corrections'>('leaves');
  const [rejectModalData, setRejectModalData] = useState<{
    request_type: 'leave' | 'correction';
    request_id: number;
    action: 'reject' | 'return';
    title: string;
  } | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleActionClick = async (
    requestType: 'leave' | 'correction',
    requestId: number,
    action: 'approve' | 'reject' | 'return'
  ) => {
    if (action === 'approve') {
      setIsProcessing(true);
      try {
        await onTakeAction({
          request_type: requestType,
          request_id: requestId,
          action: 'approve',
          comments: lang === 'ar' ? 'تمت الموافقة والاعتماد من قبل المدير المباشر' : 'Approved by Direct Manager',
        });
      } finally {
        setIsProcessing(false);
      }
    } else {
      setRejectModalData({
        request_type: requestType,
        request_id: requestId,
        action,
        title:
          action === 'reject'
            ? lang === 'ar' ? 'رفض الطلب مع ذكر السبب' : 'Reject Request (Mandatory Reason)'
            : lang === 'ar' ? 'إرجاع الطلب للموظف لإعادة التعديل' : 'Return Request for Modification',
      });
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalData || !reasonText.trim()) return;

    setIsProcessing(true);
    try {
      await onTakeAction({
        request_type: rejectModalData.request_type,
        request_id: rejectModalData.request_id,
        action: rejectModalData.action,
        comments: reasonText,
        rejection_reason: reasonText,
      });
      setRejectModalData(null);
      setReasonText('');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-5 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              {t.approval_center_title}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              {pendingLeaves.length + pendingCorrections.length} {lang === 'ar' ? 'طلب معلق' : 'Pending'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {t.approval_center_subtitle}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/10">
          <button
            onClick={() => setActiveTab('leaves')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'leaves'
                ? 'bg-white dark:bg-[#111827] text-teal-600 dark:text-teal-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>{t.tab_leave_approvals}</span>
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
              {pendingLeaves.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('corrections')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'corrections'
                ? 'bg-white dark:bg-[#111827] text-teal-600 dark:text-teal-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>{t.tab_correction_approvals}</span>
            <span className="w-5 h-5 rounded-full bg-slate-700 text-white text-[10px] font-bold flex items-center justify-center">
              {pendingCorrections.length}
            </span>
          </button>
        </div>
      </div>

      {/* Tab 1: Pending Leave Requests */}
      {activeTab === 'leaves' && (
        <div className="space-y-3">
          {pendingLeaves.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 text-slate-400">
              <span className="material-symbols-outlined text-4xl text-teal-500 mb-2">task_alt</span>
              <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                {lang === 'ar' ? 'لا توجد طلبات إجازة قيد الانتظار حالياً' : 'No pending leave requests.'}
              </p>
            </div>
          ) : (
            pendingLeaves.map((req) => (
              <div
                key={req.id}
                className="p-5 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-sm space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-white/10 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-500 font-bold flex items-center justify-center text-sm">
                      {req.employee_name_ar.slice(0, 1)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {lang === 'ar' ? req.employee_name_ar : req.employee_name_en} ({req.employee_number})
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {lang === 'ar' ? req.department_name_ar : req.department_name_en} - {req.branch_name_ar}
                      </p>
                    </div>
                  </div>

                  <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-white/10 px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300">
                    {req.request_number}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 dark:bg-[#0a0c10] p-3 rounded-2xl border border-slate-200 dark:border-white/10">
                  <div>
                    <span className="text-slate-400 block mb-0.5">{t.leave_type_select}:</span>
                    <span className="font-bold text-teal-600 dark:text-teal-400">
                      {lang === 'ar' ? req.leave_type_name_ar : req.leave_type_name_en}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">{t.calculated_days}:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {req.total_days} {t.days_unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">{t.start_date}:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">{req.start_date}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">{t.end_date}:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">{req.end_date}</span>
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300">{t.leave_reason}:</span>
                  <p className="text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#0a0c10] p-3 rounded-xl border border-slate-200 dark:border-white/10">
                    {req.reason}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => handleActionClick('leave', req.id, 'reject')}
                    disabled={isProcessing}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer"
                  >
                    {t.reject_btn}
                  </button>
                  <button
                    onClick={() => handleActionClick('leave', req.id, 'approve')}
                    disabled={isProcessing}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 active:scale-95 shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">check</span>
                    <span>{t.approve_btn}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Pending Attendance Correction Requests */}
      {activeTab === 'corrections' && (
        <div className="space-y-3">
          {pendingCorrections.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 text-slate-400">
              <span className="material-symbols-outlined text-4xl text-teal-500 mb-2">task_alt</span>
              <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                {lang === 'ar' ? 'لا توجد طلبات تصحيح بصمة قيد الانتظار' : 'No pending correction requests.'}
              </p>
            </div>
          ) : (
            pendingCorrections.map((corr) => (
              <div
                key={corr.id}
                className="p-5 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {lang === 'ar' ? corr.employee_name_ar : corr.employee_name_en} ({corr.employee_number})
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {lang === 'ar' ? corr.department_name_ar : corr.department_name_en} - {corr.date}
                    </p>
                  </div>

                  <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-white/10 px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300">
                    {corr.request_number}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-[#0a0c10] p-3 rounded-2xl border border-slate-200 dark:border-white/10">
                  <div>
                    <span className="text-slate-400 block mb-0.5">{t.requested_in_time}:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {corr.requested_in}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">{t.requested_out_time}:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {corr.requested_out}
                    </span>
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300">{t.correction_reason}:</span>
                  <p className="text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#0a0c10] p-3 rounded-xl border border-slate-200 dark:border-white/10">
                    {corr.reason}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => handleActionClick('correction', corr.id, 'reject')}
                    disabled={isProcessing}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer"
                  >
                    {t.reject_btn}
                  </button>
                  <button
                    onClick={() => handleActionClick('correction', corr.id, 'approve')}
                    disabled={isProcessing}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 active:scale-95 shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">check</span>
                    <span>{t.approve_btn}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModalData && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-md p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              {rejectModalData.title}
            </h3>

            <form onSubmit={handleModalSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.rejection_reason_label}
                </label>
                <textarea
                  rows={3}
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  placeholder={t.rejection_reason_placeholder}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 focus:outline-none resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectModalData(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer"
                >
                  {t.confirm_action}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
