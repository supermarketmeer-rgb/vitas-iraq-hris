import React from 'react';
import { AttendanceRecord, Language } from './types';
import { translations } from './translations';

interface ExportReportModalProps {
  records: AttendanceRecord[];
  lang: Language;
  onClose: () => void;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  records,
  lang,
  onClose,
}) => {
  const t = translations[lang];

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCsv = () => {
    const headers = [
      'Employee Number',
      'Employee Name',
      'Department',
      'Branch',
      'Date',
      'Scheduled Start',
      'First Punch',
      'Scheduled End',
      'Last Punch',
      'Worked Hours',
      'Late Minutes',
      'Early Minutes',
      'Overtime Hours',
      'Status',
    ];

    const rows = records.map((r) => [
      r.employee_number,
      lang === 'ar' ? r.employee_name_ar : r.employee_name_en,
      lang === 'ar' ? r.department_name_ar : r.department_name_en,
      lang === 'ar' ? r.branch_name_ar : r.branch_name_en,
      r.date,
      r.scheduled_start,
      r.first_punch || '',
      r.scheduled_end,
      r.last_punch || '',
      (r.worked_minutes / 60).toFixed(1),
      r.late_minutes,
      r.early_leave_minutes,
      (r.overtime_minutes / 60).toFixed(1),
      r.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Vitas_Iraq_Attendance_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/10 sticky top-0 bg-white dark:bg-[#111827] z-10 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-500 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">print</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {lang === 'ar' ? 'معاينة وطباعة تقرير الحضور والدوام المعتمد' : 'Print & Export Attendance Report'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'ar' ? 'تقرير رسمي معتمد لكشف الرواتب والإدارة العليا' : 'Official certified attendance report for payroll & management'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCsv}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">table_chart</span>
              <span>{t.export_excel}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 active:scale-95 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              <span>{lang === 'ar' ? 'طباعة التقرير (Print / PDF)' : 'Print Report'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        {/* Printable Report Canvas */}
        <div className="p-6 space-y-6 text-xs text-slate-800 dark:text-slate-200 print:text-black print:p-0">
          {/* Company Official Header */}
          <div className="flex items-center justify-between pb-4 border-b-2 border-slate-900 dark:border-white/20">
            <div>
              <h1 className="text-lg font-bold">
                {lang === 'ar' ? 'شركة فيتاس العراق للتمويل الأصغر (ش.م.خ)' : 'Vitas Iraq for Microfinance LLC'}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {lang === 'ar' ? 'نظام الموارد البشرية - موديول الحضور والإجازات' : 'HRIS - Leaves & Attendance Department'}
              </p>
            </div>
            <div className="text-end">
              <span className="font-mono text-xs font-bold block">
                {lang === 'ar' ? 'تاريخ التقرير:' : 'Report Date:'} {new Date().toISOString().slice(0, 10)}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {lang === 'ar' ? 'سنة 2026 المالية' : 'Fiscal Year 2026'}
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start border-collapse">
              <thead>
                <tr className="border-b border-slate-300 dark:border-white/10 font-bold bg-slate-50 dark:bg-[#0a0c10] text-slate-700 dark:text-slate-300">
                  <th className="p-2 text-start">{t.col_emp_num}</th>
                  <th className="p-2 text-start">{t.col_emp_name}</th>
                  <th className="p-2 text-start">{t.col_dept}</th>
                  <th className="p-2 text-start">{t.col_date}</th>
                  <th className="p-2 text-start">{t.col_first_punch}</th>
                  <th className="p-2 text-start">{t.col_last_punch}</th>
                  <th className="p-2 text-start">{t.col_worked_hours}</th>
                  <th className="p-2 text-start">{t.col_late_mins}</th>
                  <th className="p-2 text-start">{t.col_overtime}</th>
                  <th className="p-2 text-start">{t.col_status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {records.map((r) => (
                  <tr key={r.id}>
                    <td className="p-2 font-mono font-semibold">{r.employee_number}</td>
                    <td className="p-2 font-semibold">
                      {lang === 'ar' ? r.employee_name_ar : r.employee_name_en}
                    </td>
                    <td className="p-2">
                      {lang === 'ar' ? r.department_name_ar : r.department_name_en}
                    </td>
                    <td className="p-2 font-mono">{r.date}</td>
                    <td className="p-2 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {r.first_punch || '--:--'}
                    </td>
                    <td className="p-2 font-mono">{r.last_punch || '--:--'}</td>
                    <td className="p-2 font-bold">{(r.worked_minutes / 60).toFixed(1)} {t.hours_unit}</td>
                    <td className="p-2 font-mono text-amber-600 dark:text-amber-400">{r.late_minutes}m</td>
                    <td className="p-2 font-mono text-teal-600 dark:text-teal-400">{(r.overtime_minutes / 60).toFixed(1)}h</td>
                    <td className="p-2 uppercase font-semibold text-[10px]">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Official Signature Footer */}
          <div className="grid grid-cols-3 gap-6 pt-12 text-center text-xs">
            <div>
              <span className="font-semibold block mb-8">{lang === 'ar' ? 'إعداد مسؤول الحضور والدوام' : 'Prepared by Attendance Officer'}</span>
              <div className="w-36 mx-auto border-b border-slate-400" />
            </div>
            <div>
              <span className="font-semibold block mb-8">{lang === 'ar' ? 'اعتماد مدير الموارد البشرية' : 'HR Director Certification'}</span>
              <div className="w-36 mx-auto border-b border-slate-400" />
            </div>
            <div>
              <span className="font-semibold block mb-8">{lang === 'ar' ? 'مطابقة كشف الرواتب والحسابات' : 'Payroll Audited'}</span>
              <div className="w-36 mx-auto border-b border-slate-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
