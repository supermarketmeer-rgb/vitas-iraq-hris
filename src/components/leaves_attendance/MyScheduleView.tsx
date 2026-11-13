import React, { useState } from 'react';
import { EmployeeSchedule, Language, PublicHoliday } from './types';
import { translations } from './translations';

interface MyScheduleViewProps {
  schedule: EmployeeSchedule | null;
  publicHolidays: PublicHoliday[];
  lang: Language;
}

const ARABIC_MONTHS = [
  'كانون الثاني / يناير',
  'شباط / فبراير',
  'آذار / مارس',
  'نيسان / أبريل',
  'أيار / مايو',
  'حزيران / يونيو',
  'تموز / يوليو',
  'آب / أغسطس',
  'أيلول / سبتمبر',
  'تشرين الأول / أكتوبر',
  'تشرين الثاني / نوفمبر',
  'كانون الأول / ديسمبر',
];

const ENGLISH_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const MyScheduleView: React.FC<MyScheduleViewProps> = ({
  schedule,
  publicHolidays,
  lang,
}) => {
  const t = translations[lang];

  // Dynamic system date from the user's computer
  const now = new Date();
  const [viewDate, setViewDate] = useState<Date>(
    () => new Date(now.getFullYear(), now.getMonth(), 1)
  );

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth(); // 0-based index

  // Calculate actual days in the selected month
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

  // First day of month (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  // Since our calendar starts on Saturday:
  // Saturday (6) -> 0, Sunday (0) -> 1, Monday (1) -> 2, ..., Friday (5) -> 6
  const startOffset = (firstDayOfWeek + 1) % 7;

  const handlePrevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const isCurrentViewMonth =
    now.getFullYear() === currentYear && now.getMonth() === currentMonth;

  const daysInMonth = Array.from({ length: totalDays }, (_, i) => {
    const day = i + 1;
    const monthStr = String(currentMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${currentYear}-${monthStr}-${dayStr}`;

    const d = new Date(currentYear, currentMonth, day);
    const dayOfWeek = d.getDay();

    // Weekend in Iraq / company policy: Friday (5) & Saturday (6)
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
    const holiday = publicHolidays.find(
      (h) => h.start_date <= dateStr && dateStr <= h.end_date
    );

    const isToday =
      isCurrentViewMonth && day === now.getDate();

    return {
      day,
      dateStr,
      dayOfWeek,
      isWeekend,
      holiday,
      isToday,
    };
  });

  const monthTitle =
    lang === 'ar'
      ? `تقويم الدوام (${ARABIC_MONTHS[currentMonth]} ${currentYear})`
      : `Work Schedule Calendar (${ENGLISH_MONTHS[currentMonth]} ${currentYear})`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-5 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            {t.my_schedule_title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t.my_schedule_subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 text-xs font-bold">
            {lang === 'ar' ? 'الوردية القياسية المعتمدة' : 'Standard Assigned Shift'}
          </span>
        </div>
      </div>

      {/* Shift Rules Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">schedule</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">{t.scheduled_shift}</span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
              {schedule?.default_start_time || '08:00'} - {schedule?.default_end_time || '16:00'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">verified</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">{t.grace_period}</span>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {schedule?.grace_period_minutes || 10} {lang === 'ar' ? 'دقائق' : 'mins'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">coffee</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">{t.break_period}</span>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">
              12:15 - 13:00 (45m)
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">calendar_month</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">{lang === 'ar' ? 'العطل الأسبوعية' : 'Weekend'}</span>
            <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
              {lang === 'ar' ? 'الجمعة والسبت' : 'Friday & Saturday'}
            </span>
          </div>
        </div>
      </div>

      {/* Monthly Interactive Calendar View */}
      <div className="p-5 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {monthTitle}
            </h2>
            {/* Navigation buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                title={lang === 'ar' ? 'الشهر السابق' : 'Previous Month'}
                className="w-7 h-7 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <span className="material-symbols-outlined text-base">
                  {lang === 'ar' ? 'chevron_right' : 'chevron_left'}
                </span>
              </button>
              <button
                type="button"
                onClick={handleToday}
                title={lang === 'ar' ? 'الرجوع لليوم الحالي' : 'Jump to Today'}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                {lang === 'ar' ? 'اليوم' : 'Today'}
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                title={lang === 'ar' ? 'الشهر القادم' : 'Next Month'}
                className="w-7 h-7 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <span className="material-symbols-outlined text-base">
                  {lang === 'ar' ? 'chevron_left' : 'chevron_right'}
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>{t.work_day}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span>{t.weekend}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
              <span>{t.public_holiday}</span>
            </span>
          </div>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2">
          {(lang === 'ar'
            ? ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']
            : ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']
          ).map((name) => (
            <div key={name} className="text-center py-2 text-xs font-bold text-slate-500 uppercase">
              {name}
            </div>
          ))}

          {/* Empty padding cells for day offset */}
          {Array.from({ length: startOffset }).map((_, idx) => (
            <div
              key={`empty-${idx}`}
              className="min-h-[85px] p-2 rounded-xl border border-dashed border-slate-200/60 dark:border-white/5 bg-slate-50/30 dark:bg-white/[0.02]"
            />
          ))}

          {/* Actual days in month */}
          {daysInMonth.map((d) => {
            return (
              <div
                key={d.day}
                className={`min-h-[85px] p-2 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                  d.isToday
                    ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30'
                    : d.holiday
                    ? 'border-teal-500/30 bg-teal-500/10'
                    : d.isWeekend
                    ? 'border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-white/5 text-slate-400'
                    : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0c10] hover:border-teal-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-bold text-sm ${
                      d.isToday
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {d.day}
                  </span>
                  {d.isToday && (
                    <span className="text-[10px] px-1 py-0.2 rounded bg-teal-600 text-white font-bold">
                      {lang === 'ar' ? 'اليوم' : 'Today'}
                    </span>
                  )}
                </div>

                <div className="mt-1">
                  {d.holiday ? (
                    <div className="text-[10px] font-bold text-teal-600 dark:text-teal-400 leading-tight">
                      {lang === 'ar' ? d.holiday.name_ar : d.holiday.name_en}
                    </div>
                  ) : d.isWeekend ? (
                    <div className="text-[10px] text-slate-400 font-medium">
                      {t.weekend}
                    </div>
                  ) : (
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                      08:00 - 16:00
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
