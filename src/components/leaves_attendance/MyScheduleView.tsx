import React from 'react';
import { EmployeeSchedule, Language, PublicHoliday } from './types';
import { translations } from './translations';

interface MyScheduleViewProps {
  schedule: EmployeeSchedule | null;
  publicHolidays: PublicHoliday[];
  lang: Language;
}

export const MyScheduleView: React.FC<MyScheduleViewProps> = ({
  schedule,
  publicHolidays,
  lang,
}) => {
  const t = translations[lang];

  const daysInMonth = Array.from({ length: 31 }, (_, i) => {
    const day = i + 1;
    const dateStr = `2026-08-${String(day).padStart(2, '0')}`;
    const d = new Date(dateStr);
    const dayOfWeek = d.getDay();

    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
    const holiday = publicHolidays.find((h) => h.start_date <= dateStr && dateStr <= h.end_date);

    return {
      day,
      dateStr,
      dayOfWeek,
      isWeekend,
      holiday,
    };
  });

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
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            {lang === 'ar' ? 'تقويم الدوام للشهر الحالي (آب / أغسطس 2026)' : 'Work Schedule Calendar (August 2026)'}
          </h2>
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

          {daysInMonth.map((d) => {
            const isToday = d.day === 8;

            return (
              <div
                key={d.day}
                className={`min-h-[85px] p-2 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                  isToday
                    ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20'
                    : d.holiday
                    ? 'border-teal-500/30 bg-teal-500/10'
                    : d.isWeekend
                    ? 'border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-white/5 text-slate-400'
                    : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0c10] hover:border-teal-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-bold text-sm ${isToday ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {d.day}
                  </span>
                  {isToday && (
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
