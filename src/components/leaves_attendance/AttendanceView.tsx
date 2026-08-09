import React, { useState } from 'react';
import { AttendanceRecord, Language } from './types';
import { translations } from './translations';

interface AttendanceViewProps {
  records: AttendanceRecord[];
  lang: Language;
  onViewPunches: (record: AttendanceRecord) => void;
  onCorrectPunch: (record: AttendanceRecord) => void;
  onReprocess: () => void;
  isReprocessing: boolean;
  onExportExcel: () => void;
  onExportPdf: () => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  records,
  lang,
  onViewPunches,
  onCorrectPunch,
  onReprocess,
  isReprocessing,
  onExportExcel,
  onExportPdf,
}) => {
  const t = translations[lang];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [lateOnly, setLateOnly] = useState(false);
  const [earlyOnly, setEarlyOnly] = useState(false);
  const [missingOnly, setMissingOnly] = useState(false);
  const [overtimeOnly, setOvertimeOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const filteredRecords = records.filter((r) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName =
        r.employee_name_ar.toLowerCase().includes(q) ||
        r.employee_name_en.toLowerCase().includes(q);
      const matchNumber = r.employee_number.toLowerCase().includes(q);
      const matchDept =
        r.department_name_ar.toLowerCase().includes(q) ||
        r.department_name_en.toLowerCase().includes(q);
      if (!matchName && !matchNumber && !matchDept) return false;
    }
    if (selectedStatus !== 'all' && r.status !== selectedStatus) return false;
    if (lateOnly && r.late_minutes === 0 && r.status !== 'late') return false;
    if (earlyOnly && r.early_leave_minutes === 0 && r.status !== 'early_leave') return false;
    if (missingOnly && r.status !== 'missing_punch') return false;
    if (overtimeOnly && r.overtime_minutes === 0) return false;
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo) return false;
    return true;
  });

  const totalCount = records.length;
  const presentCount = records.filter(
    (r) => r.status === 'present' || r.status === 'late' || r.status === 'early_leave'
  ).length;
  const lateCount = records.filter((r) => r.late_minutes > 0 || r.status === 'late').length;
  const missingCount = records.filter((r) => r.status === 'missing_punch').length;
  const totalOvertimeMins = records.reduce((acc, r) => acc + (r.overtime_minutes || 0), 0);

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const getStatusBadge = (status: AttendanceRecord['status'], isCorrected: boolean) => {
    let bg = 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300';
    let label: string = status;

    switch (status) {
      case 'present':
        bg = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
        label = t.present;
        break;
      case 'late':
        bg = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
        label = t.late;
        break;
      case 'early_leave':
        bg = 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
        label = t.early_leave;
        break;
      case 'on_leave':
        bg = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
        label = t.on_leave;
        break;
      case 'absent':
        bg = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
        label = t.absent;
        break;
      case 'missing_punch':
        bg = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 animate-pulse';
        label = t.missing_punch;
        break;
    }

    return (
      <div className="flex items-center gap-1">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${bg}`}>
          {label}
        </span>
        {isCorrected && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 font-medium">
            {lang === 'ar' ? 'معدل' : 'Corrected'}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">fingerprint</span>
                <span>{lang === 'ar' ? 'سجل الحضور والدوام الموحد' : 'Biometric Attendance Registry'}</span>
              </span>
              <span className="text-xs text-slate-400 font-mono bg-white/5 px-2.5 py-0.5 rounded-full">
                {records.length} {lang === 'ar' ? 'سجل دوام' : 'Records'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {t.attendance_management}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              {t.attendance_description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onReprocess}
              disabled={isReprocessing}
              className="px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-sm ${isReprocessing ? 'animate-spin' : ''}`}>refresh</span>
              <span>{t.reprocess_attendance}</span>
            </button>

            <button
              onClick={onExportExcel}
              className="px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">table_chart</span>
              <span>{t.export_excel}</span>
            </button>

            <button
              onClick={onExportPdf}
              className="px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-medium bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              <span>{t.export_pdf}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="p-4 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-sm">
          <span className="text-xs text-slate-500 block mb-1">{lang === 'ar' ? 'إجمالي السجلات' : 'Total Logs'}</span>
          <span className="text-2xl font-black text-slate-900 dark:text-white">{totalCount}</span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-sm">
          <span className="text-xs text-slate-500 block mb-1">{t.present}</span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{presentCount}</span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-sm">
          <span className="text-xs text-slate-500 block mb-1">{t.late}</span>
          <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{lateCount}</span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-sm">
          <span className="text-xs text-slate-500 block mb-1">{t.overtime}</span>
          <span className="text-2xl font-black text-teal-600 dark:text-teal-400">
            {(totalOvertimeMins / 60).toFixed(1)} {t.hours_unit}
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 space-y-3 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 text-base">search</span>
            <input
              type="text"
              placeholder={t.search_placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">{t.filter_all_statuses}</option>
            <option value="present">{t.present}</option>
            <option value="late">{t.late}</option>
            <option value="early_leave">{t.early_leave}</option>
            <option value="missing_punch">{t.missing_punch}</option>
            <option value="on_leave">{t.on_leave}</option>
            <option value="absent">{t.absent}</option>
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
          />
        </div>

        {/* Quick Toggles */}
        <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={lateOnly}
              onChange={(e) => setLateOnly(e.target.checked)}
              className="w-3.5 h-3.5 text-teal-600 rounded"
            />
            <span>{t.filter_late_only}</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={missingOnly}
              onChange={(e) => setMissingOnly(e.target.checked)}
              className="w-3.5 h-3.5 text-teal-600 rounded"
            />
            <span>{t.filter_missing_only}</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={overtimeOnly}
              onChange={(e) => setOvertimeOnly(e.target.checked)}
              className="w-3.5 h-3.5 text-teal-600 rounded"
            />
            <span>{t.filter_overtime_only}</span>
          </label>
        </div>
      </div>

      {/* Main Attendance Table */}
      <div className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#0a0c10] border-b border-slate-200 dark:border-white/10 font-bold text-slate-700 dark:text-slate-300">
                <th className="p-3 text-start">{t.col_emp_num}</th>
                <th className="p-3 text-start">{t.col_emp_name}</th>
                <th className="p-3 text-start">{t.col_dept}</th>
                <th className="p-3 text-start">{t.col_date}</th>
                <th className="p-3 text-start">{t.col_first_punch}</th>
                <th className="p-3 text-start">{t.col_last_punch}</th>
                <th className="p-3 text-start">{t.col_worked_hours}</th>
                <th className="p-3 text-start">{t.col_late_mins}</th>
                <th className="p-3 text-start">{t.col_overtime}</th>
                <th className="p-3 text-start">{t.col_status}</th>
                <th className="p-3 text-start">{t.col_actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400">
                    {t.no_records_found}
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">{r.employee_number}</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">
                      {lang === 'ar' ? r.employee_name_ar : r.employee_name_en}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">
                      {lang === 'ar' ? r.department_name_ar : r.department_name_en}
                    </td>
                    <td className="p-3 font-mono text-slate-600 dark:text-slate-300">{r.date}</td>
                    <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {r.first_punch || '--:--'}
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {r.last_punch || '--:--'}
                    </td>
                    <td className="p-3 font-bold text-teal-600 dark:text-teal-400">
                      {(r.worked_minutes / 60).toFixed(1)} {t.hours_unit}
                    </td>
                    <td className="p-3 font-mono text-amber-600 dark:text-amber-400 font-bold">
                      {r.late_minutes > 0 ? `${r.late_minutes}m` : '-'}
                    </td>
                    <td className="p-3 font-mono text-teal-600 dark:text-teal-400 font-bold">
                      {r.overtime_minutes > 0 ? `${(r.overtime_minutes / 60).toFixed(1)}h` : '-'}
                    </td>
                    <td className="p-3">{getStatusBadge(r.status, r.is_corrected)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onViewPunches(r)}
                          className="px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 hover:bg-teal-500/20 text-[11px] font-bold transition-all cursor-pointer"
                        >
                          {t.view_punches}
                        </button>
                        <button
                          onClick={() => onCorrectPunch(r)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-[11px] font-bold transition-all cursor-pointer"
                        >
                          {t.correct_punch}
                        </button>
                      </div>
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
            {t.total_records} {filteredRecords.length}
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
