import React, { useState, useEffect } from 'react';
import { CurrentUser, DashboardStats, Language } from './types';
import { translations } from './translations';

export interface DashboardViewProps {
  stats: DashboardStats;
  currentUser: CurrentUser;
  lang: Language;
  onNavigate: (tab: any) => void;
  onSyncNow: () => void;
  isSyncing: boolean;
  onOpenApplyLeave: () => void;
  onOpenCorrection: () => void;
  onSimulatePunch?: (punchType: string, verifyMode: string) => void;
  onOpenExportReport?: () => void;
  onOpenDbInspector?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  currentUser,
  lang,
  onNavigate,
  onSyncNow,
  isSyncing,
  onOpenApplyLeave,
  onOpenCorrection,
  onSimulatePunch,
  onOpenExportReport,
  onOpenDbInspector,
}) => {
  const t = translations[lang];

  // Live time ticker
  const [currentTime, setCurrentTime] = useState<string>(() => {
    return new Date().toLocaleTimeString(lang === 'ar' ? 'ar-IQ' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  });

  const [punchFeedback, setPunchFeedback] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString(lang === 'ar' ? 'ar-IQ' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [lang]);

  const handleTriggerQuickPunch = (type: string) => {
    if (onSimulatePunch) {
      onSimulatePunch(type, 'fingerprint');
    }
    const typeLabel =
      type === 'check_in'
        ? (lang === 'ar' ? 'تسجيل دخول' : 'Check In')
        : type === 'check_out'
        ? (lang === 'ar' ? 'تسجيل خروج' : 'Check Out')
        : type === 'break_out'
        ? (lang === 'ar' ? 'خروج للاستراحة' : 'Break Out')
        : (lang === 'ar' ? 'عودة من الاستراحة' : 'Break In');

    setPunchFeedback(
      lang === 'ar'
        ? `تم تسجيل بصمة (${typeLabel}) بنجاح في ${currentTime}`
        : `Successfully recorded (${typeLabel}) at ${currentTime}`
    );

    setTimeout(() => {
      setPunchFeedback(null);
    }, 4000);
  };

  const totalEmployees = stats.total_employees || 49;
  const presentPct = Math.round(((stats.today_attendance.present || 0) / totalEmployees) * 100);

  const weeklyDays = [
    { dayAr: 'الأحد', dayEn: 'Sun', hours: 8.0, target: 8.0, status: 'regular' },
    { dayAr: 'الإثنين', dayEn: 'Mon', hours: 8.5, target: 8.0, status: 'overtime' },
    { dayAr: 'الثلاثاء', dayEn: 'Tue', hours: 8.0, target: 8.0, status: 'regular' },
    { dayAr: 'الأربعاء', dayEn: 'Wed', hours: 9.0, target: 8.0, status: 'overtime' },
    { dayAr: 'الخميس', dayEn: 'Thu', hours: 8.0, target: 8.0, status: 'regular' },
  ];

  const upcomingHolidays = [
    {
      name_ar: 'عطلة رأس السنة الهجرية',
      name_en: 'Islamic New Year',
      date: '2026-07-16',
      days: 1,
    },
    {
      name_ar: 'عطلة عيد الغدير الأغر',
      name_en: 'Eid Al-Ghadir',
      date: '2026-06-25',
      days: 1,
    },
    {
      name_ar: 'عطلة يوم النصر والتحرير',
      name_en: 'Victory Day',
      date: '2026-12-10',
      days: 1,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner with live clock and identity */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#0a0c10] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-xl flex flex-wrap items-center justify-between gap-6 transition-all">
        <div className="flex items-start gap-4">
          <div className="w-13 h-13 rounded-2xl bg-teal-50 dark:bg-teal-500/20 border border-teal-200 dark:border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-sm">
            <span className="material-symbols-outlined text-2xl">space_dashboard</span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-teal-700 dark:text-teal-400 uppercase tracking-widest font-bold bg-teal-50 dark:bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-200 dark:border-teal-500/20">
                VITAS IRAQ HRIS • LEAVES & ATTENDANCE
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline">•</span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 hidden sm:inline font-semibold">
                {stats.today_date}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {lang === 'ar' ? `مرحباً، ${currentUser.name_ar}` : `Welcome back, ${currentUser.name_en}`}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-1 flex items-center gap-2">
              <span>{lang === 'ar' ? currentUser.position_ar : currentUser.position_en}</span>
              <span className="text-slate-400">•</span>
              <span className="text-teal-600 dark:text-teal-400 font-bold">{lang === 'ar' ? currentUser.department_name_ar : currentUser.department_name_en}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Live digital clock pill */}
          <div className="px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-white font-mono text-xs sm:text-sm font-bold flex items-center gap-2 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{currentTime}</span>
          </div>

          <button
            onClick={onOpenApplyLeave}
            className="px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-600/20 transition-all flex items-center gap-2 border border-teal-400/40 cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-base">edit_calendar</span>
            <span>{t.fab_apply_leave}</span>
          </button>

          <button
            onClick={onSyncNow}
            disabled={isSyncing}
            className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-2 border border-slate-200 dark:border-slate-700 cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <span className={`material-symbols-outlined text-base text-teal-600 dark:text-teal-400 ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
            <span>{isSyncing ? t.syncing : t.sync_now}</span>
          </button>
        </div>
      </div>

      {/* Punch Toast Feedback */}
      {punchFeedback && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <span className="material-symbols-outlined text-xl text-emerald-500">check_circle</span>
          <span className="text-xs sm:text-sm font-bold">{punchFeedback}</span>
        </div>
      )}

      {/* High Level Attendance KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Present */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#121b2d] border border-slate-200 dark:border-[#1f2d4a] shadow-sm transition-all hover:shadow-md hover:border-emerald-500/40">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{t.present}</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <span className="material-symbols-outlined text-base">person_check</span>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.today_attendance.present}
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1 flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{presentPct}% {lang === 'ar' ? 'نسبة الحضور' : 'Attendance'}</span>
          </div>
        </div>

        {/* Late */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#121b2d] border border-slate-200 dark:border-[#1f2d4a] shadow-sm transition-all hover:shadow-md hover:border-amber-500/40">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{t.late}</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <span className="material-symbols-outlined text-base">schedule</span>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
            {stats.today_attendance.late}
          </div>
          <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 font-medium">
            {lang === 'ar' ? 'تأخير صباحي' : 'Morning Late'}
          </div>
        </div>

        {/* On Leave */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#121b2d] border border-slate-200 dark:border-[#1f2d4a] shadow-sm transition-all hover:shadow-md hover:border-blue-500/40">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{t.on_leave}</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <span className="material-symbols-outlined text-base">event_available</span>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
            {stats.today_attendance.on_leave}
          </div>
          <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 font-medium">
            {lang === 'ar' ? 'إجازات معتمدة' : 'Approved Leaves'}
          </div>
        </div>

        {/* Early Leave */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#121b2d] border border-slate-200 dark:border-[#1f2d4a] shadow-sm transition-all hover:shadow-md hover:border-purple-500/40">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{t.early_leave}</span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <span className="material-symbols-outlined text-base">output</span>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">
            {stats.today_attendance.early_leave}
          </div>
          <div className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 font-medium">
            {lang === 'ar' ? 'خروج قبل الوقت' : 'Early Out'}
          </div>
        </div>

        {/* Missing Punch */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#121b2d] border border-slate-200 dark:border-[#1f2d4a] shadow-sm transition-all hover:shadow-md hover:border-rose-500/40">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{t.missing_punch}</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <span className="material-symbols-outlined text-base">warning</span>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
            {stats.today_attendance.missing_punch}
          </div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-medium">
            {lang === 'ar' ? 'بحاجة لتصحيح' : 'Needs Correction'}
          </div>
        </div>

        {/* Absent */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#121b2d] border border-slate-200 dark:border-[#1f2d4a] shadow-sm transition-all hover:shadow-md hover:border-slate-500/40">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{t.absent}</span>
            <div className="p-1.5 rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400">
              <span className="material-symbols-outlined text-base">person_off</span>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-200">
            {stats.today_attendance.absent}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {lang === 'ar' ? 'غائب بدون عذر' : 'Unexcused'}
          </div>
        </div>
      </div>

      {/* Main Grid: My Attendance + Balances */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today's Personal Attendance Card */}
        <div className="lg:col-span-6 rounded-3xl bg-white dark:bg-[#121b2d] border border-slate-200 dark:border-[#1f2d4a] p-6 space-y-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1f2d4a] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-500">fingerprint</span>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t.my_attendance_card}
                </h2>
              </div>
              <button
                onClick={onOpenCorrection}
                className="text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                <span>{t.request_correction}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0c1322] border border-slate-200 dark:border-[#1f2d4a]">
                <span className="text-slate-400 block mb-1">{t.scheduled_shift}</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {stats.my_attendance_today.scheduled_start} - {stats.my_attendance_today.scheduled_end}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0c1322] border border-slate-200 dark:border-[#1f2d4a]">
                <span className="text-slate-400 block mb-1">{t.first_punch_time}</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.my_attendance_today.check_in || t.not_punched_yet}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0c1322] border border-slate-200 dark:border-[#1f2d4a]">
                <span className="text-slate-400 block mb-1">{t.last_punch_time}</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {stats.my_attendance_today.check_out || t.not_punched_yet}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0c1322] border border-slate-200 dark:border-[#1f2d4a]">
                <span className="text-slate-400 block mb-1">{t.worked_hours_today}</span>
                <span className="font-bold text-teal-600 dark:text-teal-400">
                  {stats.my_attendance_today.worked_hours} {t.hours_unit}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Simulation Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-[#1f2d4a]">
            <span className="text-[11px] text-slate-400 block mb-2 font-medium">
              {t.quick_punch_title}:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => handleTriggerQuickPunch('check_in')}
                className="px-3 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">login</span>
                <span>{t.quick_punch_in}</span>
              </button>
              <button
                onClick={() => handleTriggerQuickPunch('check_out')}
                className="px-3 py-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">logout</span>
                <span>{t.quick_punch_out}</span>
              </button>
              <button
                onClick={() => handleTriggerQuickPunch('break_out')}
                className="px-3 py-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">coffee</span>
                <span>{t.quick_break_out}</span>
              </button>
              <button
                onClick={() => handleTriggerQuickPunch('break_in')}
                className="px-3 py-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">work</span>
                <span>{t.quick_break_in}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Leave Balances Card */}
        <div className="lg:col-span-6 rounded-3xl bg-white dark:bg-[#121b2d] border border-slate-200 dark:border-[#1f2d4a] p-6 space-y-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1f2d4a] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-500">account_balance_wallet</span>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t.my_leave_balances}
                </h2>
              </div>
              <button
                onClick={onOpenApplyLeave}
                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                <span>{t.fab_apply_leave}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {stats.my_leave_balances.map((b) => (
                <div
                  key={b.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0c1322] border border-slate-200 dark:border-[#1f2d4a] space-y-2 hover:border-teal-500/30 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                      {lang === 'ar' ? b.leave_type_name_ar : b.leave_type_name_en}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400">
                      2026
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-teal-600 dark:text-teal-400">
                      {b.available_days}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {t.of} {b.entitled_days} {t.days_unit}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-teal-500 h-full rounded-full"
                      style={{ width: `${Math.min(100, (b.available_days / (b.entitled_days || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick links under balances */}
          <div className="pt-3 border-t border-slate-100 dark:border-[#1f2d4a] flex items-center justify-between text-xs">
            <span className="text-slate-400">
              {lang === 'ar' ? `طلبات الإجازة المعلقة حالياً: ${stats.leave_requests.pending}` : `Pending requests: ${stats.leave_requests.pending}`}
            </span>
            <button
              onClick={() => onNavigate('leave-directory')}
              className="text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer"
            >
              {lang === 'ar' ? 'سجل إجازاتي الكامل ←' : 'Full Leave History →'}
            </button>
          </div>
        </div>
      </div>

      {/* Weekly Hours Bar Breakdown & Upcoming Holidays */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Weekly Hours Breakdown */}
        <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-[#121b2d] border border-slate-200 dark:border-[#1f2d4a] p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1f2d4a] pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-teal-500">bar_chart</span>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {lang === 'ar' ? 'ساعات العمل الأسبوعية الفعلية' : 'Weekly Worked Hours Distribution'}
              </h2>
            </div>
            <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-full">
              {lang === 'ar' ? 'المجموع: 41.5 ساعة' : 'Total: 41.5 hrs'}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-3 pt-2">
            {weeklyDays.map((day, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  {lang === 'ar' ? day.dayAr : day.dayEn}
                </span>
                <div className="w-full bg-slate-100 dark:bg-[#0c1322] rounded-2xl h-36 flex items-end justify-center p-1.5 border border-slate-200 dark:border-[#1f2d4a]">
                  <div
                    className={`w-full rounded-xl transition-all ${
                      day.status === 'overtime'
                        ? 'bg-gradient-to-t from-teal-600 to-teal-400'
                        : 'bg-gradient-to-t from-blue-600 to-blue-400'
                    }`}
                    style={{ height: `${(day.hours / 10) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                  {day.hours}h
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Public Holidays */}
        <div className="lg:col-span-5 rounded-3xl bg-white dark:bg-[#121b2d] border border-slate-200 dark:border-[#1f2d4a] p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1f2d4a] pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-teal-500">celebration</span>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {lang === 'ar' ? 'العطل والمناسبات الرسمية القادمة' : 'Upcoming Public Holidays'}
              </h2>
            </div>
            <button
              onClick={() => onNavigate('leave-schedule')}
              className="text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer"
            >
              {lang === 'ar' ? 'عرض الكل' : 'View All'}
            </button>
          </div>

          <div className="space-y-2.5">
            {upcomingHolidays.map((hol, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0c1322] border border-slate-200 dark:border-[#1f2d4a] flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-xs">
                    <span className="material-symbols-outlined text-base">event</span>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {lang === 'ar' ? hol.name_ar : hol.name_en}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">{hol.date}</span>
                  </div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  {hol.days} {t.days_unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Manager Section */}
      {stats.manager_stats && (
        <div className="rounded-3xl bg-white dark:bg-[#121b2d] border border-slate-200 dark:border-[#1f2d4a] p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1f2d4a] pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-teal-500">fact_check</span>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {t.manager_approval_center_title}
              </h2>
            </div>
            <button
              onClick={() => onNavigate('leave-approvals')}
              className="text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer"
            >
              {t.view_all_requests}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              onClick={() => onNavigate('leave-approvals')}
              className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between cursor-pointer hover:bg-amber-500/15 transition-all"
            >
              <div>
                <span className="text-xs text-amber-800 dark:text-amber-300 font-semibold block">
                  {t.pending_leave_approvals}
                </span>
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
                  {stats.manager_stats.pending_leave_approvals}
                </span>
              </div>
              <span className="material-symbols-outlined text-3xl text-amber-500">pending_actions</span>
            </div>

            <div
              onClick={() => onNavigate('leave-approvals')}
              className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between cursor-pointer hover:bg-blue-500/15 transition-all"
            >
              <div>
                <span className="text-xs text-blue-800 dark:text-blue-300 font-semibold block">
                  {t.pending_correction_approvals}
                </span>
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 block">
                  {stats.manager_stats.pending_correction_approvals}
                </span>
              </div>
              <span className="material-symbols-outlined text-3xl text-blue-500">rule</span>
            </div>

            <div
              onClick={() => onNavigate('leave-attendance')}
              className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between cursor-pointer hover:bg-emerald-500/15 transition-all"
            >
              <div>
                <span className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold block">
                  {t.team_present}
                </span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                  {stats.manager_stats.team_present_today} / {stats.manager_stats.team_total}
                </span>
              </div>
              <span className="material-symbols-outlined text-3xl text-emerald-500">groups</span>
            </div>

            <div
              onClick={() => onNavigate('leave-attendance')}
              className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between cursor-pointer hover:bg-purple-500/15 transition-all"
            >
              <div>
                <span className="text-xs text-purple-800 dark:text-purple-300 font-semibold block">
                  {t.team_on_leave}
                </span>
                <span className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 block">
                  {stats.manager_stats.team_on_leave_today}
                </span>
              </div>
              <span className="material-symbols-outlined text-3xl text-purple-500">event_busy</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Access Tools Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigate('leave-attendance')}
          className="p-4 rounded-2xl bg-white dark:bg-[#121b2d] border border-slate-200 dark:border-[#1f2d4a] hover:border-teal-500/40 shadow-sm transition-all flex items-center gap-3 text-left cursor-pointer group"
        >
          <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 group-hover:bg-teal-500 group-hover:text-white transition-all">
            <span className="material-symbols-outlined text-xl">co_present</span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {lang === 'ar' ? 'سجل الحضور اليومي' : 'Daily Attendance'}
            </h4>
            <span className="text-[10px] text-slate-400">
              {lang === 'ar' ? 'استعراض كل الموظفين' : 'All employees log'}
            </span>
          </div>
        </button>

        <button
          onClick={() => onNavigate('leave-timesheets')}
          className="p-4 rounded-2xl bg-white dark:bg-[#121b2d] border border-slate-200 dark:border-[#1f2d4a] hover:border-teal-500/40 shadow-sm transition-all flex items-center gap-3 text-left cursor-pointer group"
        >
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
            <span className="material-symbols-outlined text-xl">table_chart</span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {lang === 'ar' ? 'جداول الدوام الشهرية' : 'Monthly Timesheets'}
            </h4>
            <span className="text-[10px] text-slate-400">
              {lang === 'ar' ? 'تجهيز مسير الرواتب' : 'Payroll preparation'}
            </span>
          </div>
        </button>

        <button
          onClick={onOpenExportReport}
          className="p-4 rounded-2xl bg-white dark:bg-[#121b2d] border border-slate-200 dark:border-[#1f2d4a] hover:border-teal-500/40 shadow-sm transition-all flex items-center gap-3 text-left cursor-pointer group"
        >
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-all">
            <span className="material-symbols-outlined text-xl">download</span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {lang === 'ar' ? 'تصدير التقارير' : 'Export Reports'}
            </h4>
            <span className="text-[10px] text-slate-400">Excel / PDF</span>
          </div>
        </button>

        <button
          onClick={() => onNavigate('leave-biometric-settings')}
          className="p-4 rounded-2xl bg-white dark:bg-[#121b2d] border border-slate-200 dark:border-[#1f2d4a] hover:border-teal-500/40 shadow-sm transition-all flex items-center gap-3 text-left cursor-pointer group"
        >
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-all">
            <span className="material-symbols-outlined text-xl">settings_ethernet</span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {lang === 'ar' ? 'خوادم وأجهزة البصمة' : 'Biometric Servers'}
            </h4>
            <span className="text-[10px] text-slate-400">
              {lang === 'ar' ? 'الربط والمزامنة' : 'ZK & SQL Connection'}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};

