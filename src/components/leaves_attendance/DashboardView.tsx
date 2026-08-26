import React, { useState } from 'react';
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

  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isPunchModalOpen, setIsPunchModalOpen] = useState(false);
  const [selectedPunchType, setSelectedPunchType] = useState<string>('check_in');

  const handleTriggerQuickPunch = (type: string) => {
    if (onSimulatePunch) {
      onSimulatePunch(type, 'fingerprint');
    }
    setIsPunchModalOpen(false);
    setIsFabOpen(false);
  };

  const weeklyDays = [
    { dayAr: 'الأحد', dayEn: 'Sun', hours: 8.0, target: 8.0, status: 'regular' },
    { dayAr: 'الإثنين', dayEn: 'Mon', hours: 8.5, target: 8.0, status: 'overtime' },
    { dayAr: 'الثلاثاء', dayEn: 'Tue', hours: 8.0, target: 8.0, status: 'regular' },
    { dayAr: 'الأربعاء', dayEn: 'Wed', hours: 9.0, target: 8.0, status: 'overtime' },
    { dayAr: 'الخميس', dayEn: 'Thu', hours: 8.0, target: 8.0, status: 'regular' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#121c33] via-[#172545] to-[#121c33] border border-[#1e3054] shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-white">space_dashboard</span>
            <span className="text-xs font-mono text-white uppercase tracking-widest font-bold">
              VITAS IRAQ HRIS - LEAVES & ATTENDANCE
            </span>
          </div>
          <h1 className="text-2xl font-black text-white drop-shadow-md">
            {lang === 'ar' ? `مرحباً، ${currentUser.name_ar}` : `Welcome back, ${currentUser.name_en}`}
          </h1>
          <p className="text-xs text-white/90 font-medium mt-1">
            {lang === 'ar'
              ? `${currentUser.position_ar} - ${currentUser.department_name_ar}`
              : `${currentUser.position_en} - ${currentUser.department_name_en}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenApplyLeave}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/25 transition-all flex items-center gap-2 border border-teal-300/40 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">edit_calendar</span>
            <span>{t.fab_apply_leave}</span>
          </button>
          <button
            onClick={onSyncNow}
            disabled={isSyncing}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/25 transition-all flex items-center gap-2 border border-teal-300/40 cursor-pointer disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-sm ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
            <span>{isSyncing ? t.syncing : t.sync_now}</span>
          </button>
        </div>
      </div>

      {/* High Level Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Present */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#121b2d] border border-slate-200 dark:border-[#1f2d4a] shadow-sm transition-all hover:scale-[1.02]">
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
            <span>{lang === 'ar' ? 'حضور بالبصمة' : 'Biometric Verified'}</span>
          </div>
        </div>

        {/* Late */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#121b2d] border border-slate-200 dark:border-[#1f2d4a] shadow-sm transition-all hover:scale-[1.02]">
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
        <div className="p-4 rounded-2xl bg-white dark:bg-[#121b2d] border border-slate-200 dark:border-[#1f2d4a] shadow-sm transition-all hover:scale-[1.02]">
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
        <div className="p-4 rounded-2xl bg-white dark:bg-[#121b2d] border border-slate-200 dark:border-[#1f2d4a] shadow-sm transition-all hover:scale-[1.02]">
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
        <div className="p-4 rounded-2xl bg-white dark:bg-[#121b2d] border border-slate-200 dark:border-[#1f2d4a] shadow-sm transition-all hover:scale-[1.02]">
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
        <div className="p-4 rounded-2xl bg-white dark:bg-[#121b2d] border border-slate-200 dark:border-[#1f2d4a] shadow-sm transition-all hover:scale-[1.02]">
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

      {/* Main Grid: My Attendance + Balances + Manager Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today's Personal Attendance Card */}
        <div className="lg:col-span-6 rounded-3xl bg-white dark:bg-[#121b2d] border border-slate-200 dark:border-[#1f2d4a] p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1f2d4a] pb-3">
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
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

          {/* Quick Simulation Buttons */}
          <div className="pt-2 border-t border-slate-100 dark:border-[#1f2d4a]">
            <span className="text-[11px] text-slate-400 block mb-2 font-medium">
              {t.quick_punch_title}:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => handleTriggerQuickPunch('check_in')}
                className="px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">login</span>
                <span>{t.quick_punch_in}</span>
              </button>
              <button
                onClick={() => handleTriggerQuickPunch('check_out')}
                className="px-3 py-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">logout</span>
                <span>{t.quick_punch_out}</span>
              </button>
              <button
                onClick={() => handleTriggerQuickPunch('break_out')}
                className="px-3 py-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">coffee</span>
                <span>{t.quick_break_out}</span>
              </button>
              <button
                onClick={() => handleTriggerQuickPunch('break_in')}
                className="px-3 py-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">work</span>
                <span>{t.quick_break_in}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Leave Balances Card */}
        <div className="lg:col-span-6 rounded-3xl bg-white dark:bg-[#121b2d] border border-slate-200 dark:border-[#1f2d4a] p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1f2d4a] pb-3">
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
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0c1322] border border-slate-200 dark:border-[#1f2d4a] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
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
      </div>

      {/* Manager Section (If Manager / HR Admin) */}
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
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
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

            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
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

            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
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

            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between">
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
    </div>
  );
};
