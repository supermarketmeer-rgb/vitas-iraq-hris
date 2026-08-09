import React, { useState } from 'react';
import { Language, TimesheetSummary } from './types';
import { translations } from './translations';

interface TimesheetsViewProps {
  summaries: TimesheetSummary[];
  periodType: 'daily' | 'weekly' | 'monthly';
  onPeriodChange: (p: 'daily' | 'weekly' | 'monthly') => void;
  lang: Language;
  onExportExcel: () => void;
  onExportPdf: () => void;
}

export const TimesheetsView: React.FC<TimesheetsViewProps> = ({
  summaries,
  periodType,
  onPeriodChange,
  lang,
  onExportExcel,
  onExportPdf,
}) => {
  const t = translations[lang];
  const [filterText, setFilterText] = useState('');

  const filtered = summaries.filter((s) => {
    if (!filterText) return true;
    const q = filterText.toLowerCase();
    return (
      s.employee_name_ar.toLowerCase().includes(q) ||
      s.employee_name_en.toLowerCase().includes(q) ||
      s.employee_number.toLowerCase().includes(q)
    );
  });

  const totalWorkedHours = filtered.reduce((acc, curr) => acc + curr.worked_hours, 0);
  const totalOvertimeHours = filtered.reduce((acc, curr) => acc + curr.overtime_hours, 0);
  const totalLateMinutes = filtered.reduce((acc, curr) => acc + curr.late_minutes, 0);
  const totalLeaveHours = filtered.reduce((acc, curr) => acc + curr.leave_hours, 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">schedule</span>
                <span>{lang === 'ar' ? 'سجلات التايم شيت والمصادقة للرواتب' : 'Timesheets & Payroll Certification'}</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {t.timesheets_title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              {t.timesheets_subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/10 border border-white/10">
              <button
                onClick={() => onPeriodChange('daily')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  periodType === 'daily'
                    ? 'bg-teal-500 text-white font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {t.view_daily}
              </button>
              <button
                onClick={() => onPeriodChange('weekly')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  periodType === 'weekly'
                    ? 'bg-teal-500 text-white font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {t.view_weekly}
              </button>
              <button
                onClick={() => onPeriodChange('monthly')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  periodType === 'monthly'
                    ? 'bg-teal-500 text-white font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {t.view_monthly}
              </button>
            </div>

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

      {/* Top Analytics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="p-4 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-sm">
          <span className="text-xs text-slate-500 block mb-1">{t.worked_hours}</span>
          <span className="text-2xl font-black text-slate-900 dark:text-white">{totalWorkedHours.toFixed(1)}h</span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-sm">
          <span className="text-xs text-slate-500 block mb-1">{t.overtime_hours}</span>
          <span className="text-2xl font-black text-teal-600 dark:text-teal-400">{totalOvertimeHours.toFixed(1)}h</span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-sm">
          <span className="text-xs text-slate-500 block mb-1">{t.col_late_mins}</span>
          <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{totalLateMinutes}m</span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-sm">
          <span className="text-xs text-slate-500 block mb-1">{t.leave_hours}</span>
          <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{totalLeaveHours.toFixed(1)}h</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="relative max-w-md">
          <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 text-base">search</span>
          <input
            type="text"
            placeholder={t.search_placeholder}
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full pr-9 pl-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Timesheets Table */}
      <div className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#0a0c10] border-b border-slate-200 dark:border-white/10 font-bold text-slate-700 dark:text-slate-300">
                <th className="p-3 text-start">{t.col_emp_num}</th>
                <th className="p-3 text-start">{t.col_emp_name}</th>
                <th className="p-3 text-start">{t.col_dept}</th>
                <th className="p-3 text-start">{t.regular_hours}</th>
                <th className="p-3 text-start">{t.worked_hours}</th>
                <th className="p-3 text-start">{t.break_hours}</th>
                <th className="p-3 text-start">{t.col_late_mins}</th>
                <th className="p-3 text-start">{t.overtime_hours}</th>
                <th className="p-3 text-start">{t.col_status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    {t.no_records_found}
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">{s.employee_number}</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">
                      {lang === 'ar' ? s.employee_name_ar : s.employee_name_en}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">
                      {lang === 'ar' ? s.department_name_ar : s.department_name_en}
                    </td>
                    <td className="p-3 font-mono font-semibold">{s.scheduled_hours}h</td>
                    <td className="p-3 font-mono font-bold text-teal-600 dark:text-teal-400">{s.worked_hours}h</td>
                    <td className="p-3 font-mono text-slate-500">{s.break_hours}h</td>
                    <td className="p-3 font-mono text-amber-600 dark:text-amber-400 font-bold">{s.late_minutes}m</td>
                    <td className="p-3 font-mono text-teal-600 dark:text-teal-400 font-bold">{s.overtime_hours}h</td>
                    <td className="p-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {t.payroll_ready_badge}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
