import React, { useState } from 'react';
import { AttendanceRecord, Language } from './types';
import { translations } from './translations';

interface AttendanceCorrectionModalProps {
  record: AttendanceRecord | null;
  lang: Language;
  onClose: () => void;
  onSubmit: (data: {
    attendance_record_id: number;
    date: string;
    requested_in: string;
    requested_out: string;
    reason: string;
  }) => Promise<void>;
}

export const AttendanceCorrectionModal: React.FC<AttendanceCorrectionModalProps> = ({
  record,
  lang,
  onClose,
  onSubmit,
}) => {
  if (!record) return null;
  const t = translations[lang];

  const [requestedIn, setRequestedIn] = useState(record.first_punch || '08:00');
  const [requestedOut, setRequestedOut] = useState(record.last_punch || '16:00');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg(lang === 'ar' ? 'يرجى كتابة سبب طلب التصحيح' : 'Please provide a reason for the punch correction.');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await onSubmit({
        attendance_record_id: record.id,
        date: record.date,
        requested_in: requestedIn,
        requested_out: requestedOut,
        reason,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error submitting correction request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-[#0a0c10]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-500 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">edit</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {t.correct_modal_title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'ar' ? record.employee_name_ar : record.employee_name_en} - {record.date}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 border border-rose-500/20">
              <span className="material-symbols-outlined text-base text-rose-500">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Current Punches Info */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/10 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">{lang === 'ar' ? 'البصمة المسجلة حالياً (دخول):' : 'Current Registered In:'}</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {record.first_punch || (lang === 'ar' ? 'غير مسجلة (مفقودة)' : 'Missing')}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">{lang === 'ar' ? 'البصمة المسجلة حالياً (خروج):' : 'Current Registered Out:'}</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {record.last_punch || (lang === 'ar' ? 'غير مسجلة (مفقودة)' : 'Missing')}
              </span>
            </div>
          </div>

          {/* Requested Punches */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.requested_in_time} <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={requestedIn}
                onChange={(e) => setRequestedIn(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.requested_out_time} <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={requestedOut}
                onChange={(e) => setRequestedOut(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
                required
              />
            </div>
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t.correction_reason} <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={lang === 'ar' ? 'مثال: انقطاع التيار الكهربائي عن جهاز البصمة / مهمة عمل خارجية بتكليف رسمي...' : 'e.g., Device offline / Official field mission with approval...'}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 resize-none"
              required
            />
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300">
            {lang === 'ar'
              ? 'سيتم إرسال هذا الطلب مباشرة إلى مديرك المباشر لاعتماده في مركز الموافقات وتحديث سجل الدوام والرواتب تلقائياً.'
              : 'This request will be routed directly to your Direct Manager for approval in the Approval Center.'}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 active:scale-95 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-sm">send</span>
              <span>{isSubmitting ? t.loading : t.submit_correction_btn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
