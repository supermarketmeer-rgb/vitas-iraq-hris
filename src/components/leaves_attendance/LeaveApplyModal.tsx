import React, { useState, useEffect } from 'react';
import { CurrentUser, Language, LeaveBalance, LeaveType } from './types';
import { translations } from './translations';

interface LeaveApplyModalProps {
  currentUser: CurrentUser;
  leaveTypes: LeaveType[];
  leaveBalances: LeaveBalance[];
  lang: Language;
  onClose: () => void;
  onSubmit: (data: any) => Promise<any>;
}

export const LeaveApplyModal: React.FC<LeaveApplyModalProps> = ({
  currentUser,
  leaveTypes,
  leaveBalances,
  lang,
  onClose,
  onSubmit,
}) => {
  const t = translations[lang];

  const [leaveTypeId, setLeaveTypeId] = useState<number>(leaveTypes[0]?.id || 1);
  const [isHourly, setIsHourly] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>('2026-08-10');
  const [endDate, setEndDate] = useState<string>('2026-08-11');
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('12:00');
  const [hourlyCount, setHourlyCount] = useState<number>(3);
  const [reason, setReason] = useState<string>('');
  const [emergencyContact, setEmergencyContact] = useState<string>('');
  const [isEmergency, setIsEmergency] = useState<boolean>(false);
  const [attachmentName, setAttachmentName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const selectedBalance = leaveBalances.find((b) => b.leave_type_id === Number(leaveTypeId));
  const availableDays = selectedBalance?.available_days ?? 18;

  const calculateDays = () => {
    if (isHourly) return hourlyCount / 8;
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 0;

    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const day = cur.getDay();
      if (day !== 5 && day !== 6) {
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  };

  const calculatedDays = calculateDays();
  const isBalanceExceeded = calculatedDays > availableDays;

  useEffect(() => {
    if (isHourly && startTime && endTime) {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      const diff = (eh * 60 + em) - (sh * 60 + sm);
      if (diff > 0) {
        setHourlyCount(Math.round((diff / 60) * 10) / 10);
      }
    }
  }, [startTime, endTime, isHourly]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg(lang === 'ar' ? 'يرجى كتابة سبب الإجازة' : 'Please provide a reason for the leave.');
      return;
    }
    if (isBalanceExceeded) {
      setErrorMsg(lang === 'ar' ? 'تنبيه: الرصيد غير كافٍ لطلب هذا العدد من الأيام' : 'Warning: Insufficient leave balance.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      await onSubmit({
        employee_id: currentUser.employee_id,
        leave_type_id: Number(leaveTypeId),
        is_hourly: isHourly,
        start_date: startDate,
        end_date: isHourly ? startDate : endDate,
        start_time: isHourly ? startTime : undefined,
        end_time: isHourly ? endTime : undefined,
        hours_count: isHourly ? hourlyCount : undefined,
        total_days: calculatedDays,
        reason,
        emergency_contact: emergencyContact,
        is_emergency: isEmergency,
        attachment_url: attachmentName ? `/attachments/${attachmentName}` : undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit leave request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/10 sticky top-0 bg-white dark:bg-[#111827] z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-500 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">edit_calendar</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t.apply_leave_title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.apply_leave_subtitle}
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

        {/* Applicant Information */}
        <div className="p-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/10 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">{lang === 'ar' ? 'مقدم الطلب:' : 'Applicant:'}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {lang === 'ar' ? currentUser.name_ar : currentUser.name_en} ({currentUser.employee_number})
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">{t.col_dept}:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {lang === 'ar' ? currentUser.department_name_ar : currentUser.department_name_en}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-slate-400 block mb-0.5">{lang === 'ar' ? 'المدير المباشر:' : 'Direct Manager:'}</span>
              <span className="font-semibold text-teal-600 dark:text-teal-400">
                {lang === 'ar' ? 'زيد الحسيني (مدير IT)' : 'Zaid Al-Husseini (IT Director)'}
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 border border-rose-500/20">
              <span className="material-symbols-outlined text-base text-rose-500">warning</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
            {/* Leave Type Selector & Live Balance Preview */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  {t.leave_type_select} <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                  {t.available}: {availableDays} {t.days_unit}
                </span>
              </div>
              <select
                value={leaveTypeId}
                onChange={(e) => setLeaveTypeId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 focus:border-teal-500 focus:outline-none"
              >
                {leaveTypes.map((lt) => (
                  <option key={lt.id} value={lt.id}>
                    {lang === 'ar' ? lt.name_ar : lt.name_en} ({lt.is_paid ? (lang === 'ar' ? 'مدفوعة الأجر' : 'Paid') : (lang === 'ar' ? 'غير مدفوعة' : 'Unpaid')})
                  </option>
                ))}
              </select>
            </div>

            {/* Full Day vs Hourly Leave Toggle */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/10">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                {t.leave_mode}:
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                  <input
                    type="radio"
                    name="duration_mode"
                    checked={!isHourly}
                    onChange={() => setIsHourly(false)}
                    className="text-teal-600 focus:ring-teal-500"
                  />
                  <span>{t.full_or_multi_days}</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                  <input
                    type="radio"
                    name="duration_mode"
                    checked={isHourly}
                    onChange={() => setIsHourly(true)}
                    className="text-teal-600 focus:ring-teal-500"
                  />
                  <span>{t.hourly_leave_mode}</span>
                </label>
              </div>
            </div>

            {/* Date / Time Inputs */}
            {!isHourly ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.start_date} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.end_date} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 focus:outline-none"
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.col_date} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 focus:outline-none"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t.start_time}
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t.end_time}
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Calculated Days & Balance Notice */}
            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              isBalanceExceeded
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-300'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-300'
            }`}>
              <div>
                <span className="font-bold">
                  {t.calculated_days}: {calculatedDays} {t.days_unit}
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {lang === 'ar'
                    ? 'تم استبعاد عطلة نهاية الأسبوع والعطلات الرسمية تلقائياً.'
                    : 'Weekends & Public Holidays excluded.'}
                </p>
              </div>

              {isBalanceExceeded && (
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-white dark:bg-[#111827] px-2 py-1 rounded-md border border-rose-500/30">
                  {lang === 'ar' ? 'يتجاوز الرصيد!' : 'Exceeds balance!'}
                </span>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.leave_reason} <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t.leave_reason_placeholder}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 focus:border-teal-500 focus:outline-none resize-none"
                required
              />
            </div>

            {/* Emergency & Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.contact_during_leave}
                </label>
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="0770XXXXXXX"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 focus:outline-none"
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer pt-4 font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={isEmergency}
                    onChange={(e) => setIsEmergency(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded"
                  />
                  <span>{t.emergency_leave_toggle}</span>
                </label>
              </div>
            </div>

            {/* Attachment Upload */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.attachment_upload}
              </label>
              <div className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0a0c10] text-center">
                <span className="material-symbols-outlined text-2xl text-slate-400 mb-1">cloud_upload</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  {attachmentName ? attachmentName : t.upload_hint}
                </span>
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setAttachmentName(e.target.files[0].name);
                  }}
                  className="hidden"
                  id="leave-file-input"
                />
                <label
                  htmlFor="leave-file-input"
                  className="inline-block mt-1 text-[10px] font-bold text-teal-600 hover:text-teal-500 cursor-pointer"
                >
                  {lang === 'ar' ? 'تصفح الملفات' : 'Browse Files'}
                </label>
              </div>
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
                disabled={isSubmitting || isBalanceExceeded}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 active:scale-95 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">send</span>
                <span>{isSubmitting ? t.loading : t.submit_leave_btn}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
