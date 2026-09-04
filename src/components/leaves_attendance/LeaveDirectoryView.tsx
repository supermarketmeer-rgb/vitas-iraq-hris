import React, { useState } from 'react';
import { Language, LeaveRequest } from './types';
import { translations } from './translations';

interface LeaveDirectoryViewProps {
  requests: LeaveRequest[];
  lang: Language;
  onOpenApply: () => void;
  onViewDetails: (request: LeaveRequest) => void;
  onCancelRequest: (id: number) => void;
  onExportExcel: () => void;
}

export const LeaveDirectoryView: React.FC<LeaveDirectoryViewProps> = ({
  requests,
  lang,
  onOpenApply,
  onViewDetails,
  onCancelRequest,
  onExportExcel,
}) => {
  const t = translations[lang];

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const filtered = requests.filter((r) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchNum = r.request_number.toLowerCase().includes(q);
      const matchName = r.employee_name_ar.toLowerCase().includes(q) || r.employee_name_en.toLowerCase().includes(q);
      const matchType = r.leave_type_name_ar.toLowerCase().includes(q) || r.leave_type_name_en.toLowerCase().includes(q);
      if (!matchNum && !matchName && !matchType) return false;
    }
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (deptFilter !== 'all') {
      if (!r.department_name_ar.includes(deptFilter) && !r.department_name_en.includes(deptFilter)) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getStatusBadge = (status: LeaveRequest['status']) => {
    switch (status) {
      case 'approved':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-slate-900 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-400 dark:border-emerald-700">
            {t.leave_status_approved}
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-slate-900 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-400 dark:border-rose-700">
            {t.leave_status_rejected}
          </span>
        );
      case 'returned':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-slate-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-400 dark:border-amber-700">
            {t.leave_status_returned}
          </span>
        );
      case 'submitted':
      case 'pending_approval':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-slate-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-400 dark:border-amber-700">
            {t.leave_status_pending}
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-sm">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            {t.leave_directory_title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t.leave_directory_subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenApply}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-teal-600 hover:bg-teal-500 active:scale-95 shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">edit_calendar</span>
            <span>{t.apply_leave_title}</span>
          </button>

          <button
            onClick={onExportExcel}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 border border-slate-200 dark:border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">table_chart</span>
            <span>{t.export_excel}</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 text-base">search</span>
          <input
            type="text"
            placeholder={t.search_placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">{t.filter_all_statuses}</option>
            <option value="pending_approval">{t.leave_status_pending}</option>
            <option value="approved">{t.leave_status_approved}</option>
            <option value="rejected">{t.leave_status_rejected}</option>
            <option value="returned">{t.leave_status_returned}</option>
          </select>
        </div>

        <div>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">{t.filter_all_departments}</option>
            <option value="تكنولوجيا المعلومات">تكنولوجيا المعلومات (IT)</option>
            <option value="الموارد البشرية">الموارد البشرية (HR)</option>
            <option value="العمليات">العمليات والفروع (Operations)</option>
            <option value="المالية">المالية والحسابات (Finance)</option>
          </select>
        </div>
      </div>

      {/* Directory Table */}
      <div className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-50 dark:bg-[#0a0c10] border-b border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-bold">
              <tr>
                <th className="px-3.5 py-3 text-start">{t.req_number}</th>
                <th className="px-3.5 py-3 text-start">{t.col_emp_name}</th>
                <th className="px-3.5 py-3 text-start">{t.col_dept}</th>
                <th className="px-3.5 py-3 text-start">{t.leave_type_select}</th>
                <th className="px-3.5 py-3 text-start">{t.start_date}</th>
                <th className="px-3.5 py-3 text-start">{t.end_date}</th>
                <th className="px-3.5 py-3 text-start">{t.calculated_days}</th>
                <th className="px-3.5 py-3 text-start">{t.col_status}</th>
                <th className="px-3.5 py-3 text-center">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    {t.no_records_found}
                  </td>
                </tr>
              ) : (
                paginated.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-3.5 py-3 font-mono font-bold text-slate-900 dark:text-white">
                      {req.request_number}
                    </td>
                    <td className="px-3.5 py-3 font-semibold text-slate-800 dark:text-slate-200">
                      {lang === 'ar' ? req.employee_name_ar : req.employee_name_en}
                    </td>
                    <td className="px-3.5 py-3 text-slate-600 dark:text-slate-400">
                      {lang === 'ar' ? req.department_name_ar : req.department_name_en}
                    </td>
                    <td className="px-3.5 py-3 font-medium">
                      {lang === 'ar' ? req.leave_type_name_ar : req.leave_type_name_en}
                    </td>
                    <td className="px-3.5 py-3 font-mono">{req.start_date}</td>
                    <td className="px-3.5 py-3 font-mono">{req.end_date}</td>
                    <td className="px-3.5 py-3 font-bold text-teal-600 dark:text-teal-400">
                      {req.total_days} {t.days_unit}
                    </td>
                    <td className="px-3.5 py-3">{getStatusBadge(req.status)}</td>
                    <td className="px-3.5 py-3 text-center">
                      <button
                        onClick={() => onViewDetails(req)}
                        className="px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 hover:bg-teal-500/20 text-[11px] font-bold cursor-pointer"
                      >
                        {t.view_details}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs bg-slate-50 dark:bg-[#0a0c10]">
          <span className="text-slate-500">
            {t.total_records} {filtered.length}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
            >
              {lang === 'ar' ? 'السابق' : 'Previous'}
            </button>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
              {currentPage} {t.of} {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
            >
              {lang === 'ar' ? 'التالي' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
