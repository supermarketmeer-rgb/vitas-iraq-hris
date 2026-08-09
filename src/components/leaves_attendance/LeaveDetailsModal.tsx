import React from 'react';
import { Language, LeaveRequest } from './types';
import { translations } from './translations';

interface LeaveDetailsModalProps {
  request: LeaveRequest | null;
  lang: Language;
  onClose: () => void;
  onCancelRequest?: (id: number) => void;
}

export const LeaveDetailsModal: React.FC<LeaveDetailsModalProps> = ({
  request,
  lang,
  onClose,
  onCancelRequest,
}) => {
  if (!request) return null;
  const t = translations[lang];

  const getStatusBadge = (status: LeaveRequest['status']) => {
    switch (status) {
      case 'approved':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            {t.leave_status_approved}
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            {t.leave_status_rejected}
          </span>
        );
      case 'returned':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            {t.leave_status_returned}
          </span>
        );
      case 'submitted':
      case 'pending_approval':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            {t.leave_status_pending}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/10 sticky top-0 bg-white dark:bg-[#111827] z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-500 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">event_available</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {request.request_number}
                </h2>
                {getStatusBadge(request.status)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'ar' ? request.leave_type_name_ar : request.leave_type_name_en} - {request.total_days} {t.days_unit}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-xs">
          {/* Key Leave Parameters */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/10 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <span className="text-slate-400 block mb-0.5">{lang === 'ar' ? 'الموظف صاحب الطلب:' : 'Employee:'}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {lang === 'ar' ? request.employee_name_ar : request.employee_name_en}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">{t.col_dept}:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {lang === 'ar' ? request.department_name_ar : request.department_name_en}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">{t.calculated_days}:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {request.total_days} {t.days_unit} {request.is_hourly ? `(${request.total_hours}h)` : ''}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">{t.start_date}:</span>
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                {request.start_date} {request.start_time ? `(${request.start_time})` : ''}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">{t.end_date}:</span>
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                {request.end_date} {request.end_time ? `(${request.end_time})` : ''}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">{t.col_date}:</span>
              <span className="font-mono text-slate-500">{request.created_at.slice(0, 10)}</span>
            </div>
          </div>

          {/* Reason */}
          <div>
            <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
              {t.leave_reason}:
            </span>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 leading-relaxed">
              {request.reason}
            </div>
          </div>

          {/* Workflow Stages History */}
          <div>
            <h3 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
              {t.workflow_stages}:
            </h3>

            <div className="space-y-3">
              {/* Stage 1: Submission */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#0a0c10] border border-slate-200 dark:border-white/10 flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400 shrink-0">
                  <span className="material-symbols-outlined text-lg">person_check</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {lang === 'ar' ? 'تقديم الطلب من قبل الموظف' : 'Request Submitted by Employee'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{request.created_at}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {lang === 'ar'
                      ? `قام ${request.employee_name_ar} بإنشاء الطلب وإرساله لمديره المباشر.`
                      : `Created by ${request.employee_name_en} and routed to Direct Manager.`}
                  </p>
                </div>
              </div>

              {/* Stage 2: Manager Action */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#0a0c10] border border-slate-200 dark:border-white/10 flex items-start gap-3">
                <div className={`p-1.5 rounded-lg shrink-0 ${
                  request.status === 'approved'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : request.status === 'rejected'
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}>
                  <span className="material-symbols-outlined text-lg">verified_user</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {lang === 'ar' ? 'موافقة المدير المباشر' : 'Direct Manager Decision'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {request.updated_at || (lang === 'ar' ? 'قيد الانتظار' : 'Pending')}
                    </span>
                  </div>
                  <div className="text-[11px] mt-0.5">
                    {request.status === 'approved' ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {lang === 'ar' ? 'تمت الموافقة من قبل المدير المباشر' : 'Approved by Direct Manager'}
                      </span>
                    ) : request.status === 'rejected' ? (
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">
                        {lang === 'ar' ? `مرفوض: ${request.manager_comment || ''}` : `Rejected: ${request.manager_comment || ''}`}
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">
                        {lang === 'ar' ? 'بانتظار قرار المدير المباشر في مركز الموافقات' : 'Awaiting Direct Manager review'}
                      </span>
                    )}
                  </div>
                  {request.manager_comment && (
                    <div className="mt-1.5 p-2 rounded bg-slate-50 dark:bg-[#111827] text-slate-700 dark:text-slate-300 text-[10px]">
                      <strong>{lang === 'ar' ? 'ملاحظات:' : 'Comments:'}</strong> {request.manager_comment}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-[#0a0c10] rounded-b-2xl">
          {request.status === 'pending_approval' && onCancelRequest ? (
            <button
              onClick={() => {
                if (confirm(lang === 'ar' ? 'هل أنت متأكد من رغبتك في إلغاء طلب الإجازة؟' : 'Are you sure you want to cancel this leave request?')) {
                  onCancelRequest(request.id);
                  onClose();
                }
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 cursor-pointer"
            >
              {t.cancel_request}
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-slate-200 hover:bg-slate-300 cursor-pointer"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
