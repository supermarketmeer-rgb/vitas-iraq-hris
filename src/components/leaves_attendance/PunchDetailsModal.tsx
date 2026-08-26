import React from 'react';
import { AttendanceRecord, Language } from './types';
import { translations } from './translations';

interface PunchDetailsModalProps {
  record: AttendanceRecord | null;
  lang: Language;
  onClose: () => void;
  onOpenCorrection: (record: AttendanceRecord) => void;
}

export const PunchDetailsModal: React.FC<PunchDetailsModalProps> = ({
  record,
  lang,
  onClose,
  onOpenCorrection,
}) => {
  if (!record) return null;
  const t = translations[lang];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/10 sticky top-0 bg-white dark:bg-[#111827] z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-500 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">fingerprint</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t.punch_timeline_title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'ar' ? record.employee_name_ar : record.employee_name_en} ({record.employee_number}) - {record.date}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Day Evaluation Summary Banner */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">{t.scheduled_shift}</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {record.scheduled_start} - {record.scheduled_end}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">{t.col_first_punch}</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {record.first_punch || '--:--'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">{t.col_last_punch}</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {record.last_punch || '--:--'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">{t.worked_hours_today}</span>
              <span className="font-bold text-teal-600 dark:text-teal-400">
                {(record.worked_minutes / 60).toFixed(1)} {t.hours_unit}
              </span>
            </div>
          </div>

          {/* Grace Period & Rule Calculations */}
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-300">
              <span className="material-symbols-outlined text-base text-emerald-500">info</span>
              <span>{lang === 'ar' ? 'تفسير محرك الدوام وقواعد الاحتساب:' : 'Attendance Engine Interpretation:'}</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-emerald-800 dark:text-emerald-300 text-[11px] leading-relaxed">
              <li>{record.notes}</li>
              {record.late_minutes > 0 && (
                <li className="text-amber-800 dark:text-amber-300 font-semibold">
                  {t.late_calculated} {record.late_minutes} {lang === 'ar' ? 'دقيقة' : 'minutes'}.
                </li>
              )}
              {record.break_minutes > 0 && (
                <li>
                  {t.break_detected}: {record.break_minutes} {lang === 'ar' ? 'دقيقة استراحة مقررة' : 'mins break'}.
                </li>
              )}
              {record.overtime_minutes > 0 && (
                <li className="text-teal-800 dark:text-white font-semibold">
                  {lang === 'ar' ? `تم احتساب ${record.overtime_minutes} دقيقة وقت إضافي بعد نهاية الدوام المقرر.` : `Calculated ${record.overtime_minutes} mins overtime.`}
                </li>
              )}
            </ul>
          </div>

          {/* Biometric Punches Timeline */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
              {lang === 'ar' ? 'تسلسل البصمات المقروءة من جهاز البصمة:' : 'Biometric Punches Sequence:'}
            </h3>

            {record.punches.length === 0 ? (
              <div className="p-4 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-rose-500">warning</span>
                <span>{lang === 'ar' ? 'لم يتم العثور على أي بصمات مسجلة لهذا اليوم (غائب أو إجازة).' : 'No biometric punches recorded for this day.'}</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {record.punches.map((p, idx) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-white dark:bg-[#0a0c10] border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-teal-600 text-white shadow-md font-bold flex items-center justify-center text-[11px]">
                        {idx + 1}
                      </div>
                      <div>
                        <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                          {p.punch_time}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {p.source === 'biometric' ? 'Device Punch (Raw)' : 'Manual Correction'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 uppercase">
                        {p.punch_type}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {p.verify_mode || 'fingerprint'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-[#0a0c10] rounded-b-2xl">
          <button
            onClick={() => {
              onClose();
              onOpenCorrection(record);
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-teal-600 dark:text-white bg-teal-600 hover:bg-teal-500/20 border border-teal-500/20 transition-colors cursor-pointer"
          >
            {t.request_correction}
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-white/15 cursor-pointer"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
