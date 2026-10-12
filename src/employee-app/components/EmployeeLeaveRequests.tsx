import React, { useState, useEffect } from 'react';
import { useEmployeeContext } from '../context/EmployeeContext';

interface EmployeeLeaveRequestsProps {
  employee: any;
  onLogout: () => void;
}

export const EmployeeLeaveRequests: React.FC<EmployeeLeaveRequestsProps> = ({ employee, onLogout }) => {
  const { theme } = useEmployeeContext();
  const isDark = theme === 'dark';

  const [showForm, setShowForm] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live Clock
  const [currentTime, setCurrentTime] = useState<string>(() => {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const todayDate = new Date().toISOString().split('T')[0];

  // Employee details
  const empName = employee?.fullName || employee?.name || 'وليد خالد اسماعيل البياتي';
  const empTitle = employee?.jobTitle || employee?.position || 'حارس وصيانة';
  const empDept = employee?.department || 'قسم الائتمان';

  // Attendance Today State
  const [attendanceToday, setAttendanceToday] = useState({
    scheduled_start: '08:00',
    scheduled_end: '16:00',
    check_in: '07:55',
    check_out: '16:15',
    worked_hours: '8.35 hrs'
  });

  // Leave Balances
  const [leaveBalances, setLeaveBalances] = useState({
    annual: { available: 17, entitled: 21 },
    sick: { available: 13, entitled: 14 },
    emergency: { available: 5, entitled: 5 }
  });

  // Requests History
  const [requests, setRequests] = useState([
    {
      id: 'LV-2026-0012',
      leaveType: 'إجازة سنوية',
      startDate: '2026-08-15',
      endDate: '2026-08-20',
      totalDays: 5,
      reason: 'قضاء عطلة عائلية مجدولة',
      status: 'pending',
      appliedDate: '2026-08-08',
      approvedBy: null
    },
    {
      id: 'LV-2026-0008',
      leaveType: 'إجازة مرضية',
      startDate: '2026-07-10',
      endDate: '2026-07-12',
      totalDays: 2,
      reason: 'علاج طارئ ومراجعة طبية',
      status: 'approved',
      appliedDate: '2026-07-09',
      approvedBy: 'مدير الموارد البشرية'
    },
    {
      id: 'LV-2026-0003',
      leaveType: 'إجازة سنوية',
      startDate: '2026-06-01',
      endDate: '2026-06-05',
      totalDays: 4,
      reason: 'عطلة سنوية',
      status: 'approved',
      appliedDate: '2026-05-25',
      approvedBy: 'المدير المباشر'
    }
  ]);

  const [newRequest, setNewRequest] = useState({
    leaveType: 'إجازة سنوية',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const [correctionForm, setCorrectionForm] = useState({
    date: todayDate,
    requestedIn: '08:00',
    requestedOut: '16:00',
    reason: ''
  });

  const handleSyncNow = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setToastMessage('تمت مزامنة سجلات الحضور بنجاح مع أجهزة البصمة');
      setTimeout(() => setToastMessage(null), 3000);
    }, 1000);
  };

  const calculateDays = () => {
    if (!newRequest.startDate || !newRequest.endDate) return 0;
    const start = new Date(newRequest.startDate);
    const end = new Date(newRequest.endDate);
    const diffTime = Math.max(0, end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const days = calculateDays();
    const newReqItem = {
      id: `LV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      leaveType: newRequest.leaveType,
      startDate: newRequest.startDate,
      endDate: newRequest.endDate,
      totalDays: days,
      reason: newRequest.reason,
      status: 'pending',
      appliedDate: todayDate,
      approvedBy: null
    };

    setRequests([newReqItem, ...requests]);

    if (newRequest.leaveType === 'إجازة سنوية' && leaveBalances.annual.available >= days) {
      setLeaveBalances(prev => ({
        ...prev,
        annual: { ...prev.annual, available: prev.annual.available - days }
      }));
    } else if (newRequest.leaveType === 'إجازة مرضية' && leaveBalances.sick.available >= days) {
      setLeaveBalances(prev => ({
        ...prev,
        sick: { ...prev.sick, available: prev.sick.available - days }
      }));
    } else if (newRequest.leaveType === 'إجازة طارئة' && leaveBalances.emergency.available >= days) {
      setLeaveBalances(prev => ({
        ...prev,
        emergency: { ...prev.emergency, available: prev.emergency.available - days }
      }));
    }

    setShowForm(false);
    setNewRequest({ leaveType: 'إجازة سنوية', startDate: '', endDate: '', reason: '' });
    setToastMessage(`تم تقديم طلب الإجازة (${days} أيام) بنجاح`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCorrectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAttendanceToday(prev => ({
      ...prev,
      check_in: correctionForm.requestedIn || prev.check_in,
      check_out: correctionForm.requestedOut || prev.check_out
    }));
    setShowCorrectionModal(false);
    setToastMessage('تم تقديم طلب تصحيح البصمة بنجاح');
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-3 sm:p-5 space-y-5 animate-in fade-in duration-300">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-600 dark:text-teal-400 flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <span className="material-symbols-outlined text-lg">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Top Banner */}
      <div className={`p-5 sm:p-6 rounded-3xl border shadow-sm flex flex-wrap items-center justify-between gap-4 transition-all ${
        isDark ? 'bg-[#0a0c10] border-white/10 shadow-xl' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-500/20 border border-teal-200 dark:border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-sm shrink-0">
            <span className="material-symbols-outlined text-2xl">space_dashboard</span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] font-mono text-teal-700 dark:text-teal-400 uppercase tracking-widest font-bold bg-teal-50 dark:bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-500/20">
                VITAS IRAQ HRIS • LEAVES & ATTENDANCE
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-semibold">
                {todayDate}
              </span>
            </div>
            <h1 className={`text-xl sm:text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              مرحباً، {empName}
            </h1>
            <p className={`text-xs font-medium mt-0.5 flex items-center gap-2 ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}>
              <span>{empTitle}</span>
              <span className="text-slate-400">•</span>
              <span className="text-teal-600 dark:text-teal-400 font-bold">{empDept}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
          {/* Live digital clock pill */}
          <div className={`px-3 py-2 rounded-2xl border font-mono text-xs font-bold flex items-center gap-1.5 shadow-inner ${
            isDark ? 'bg-slate-900/80 border-slate-700/80 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{currentTime}</span>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="px-3.5 py-2 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition-all flex items-center gap-1.5 border border-teal-400/40 cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">edit_calendar</span>
            <span>تقديم طلب إجازة</span>
          </button>

          <button
            onClick={handleSyncNow}
            disabled={isSyncing}
            className={`px-3.5 py-2 rounded-2xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 border cursor-pointer disabled:opacity-50 active:scale-95 ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
            }`}
          >
            <span className={`material-symbols-outlined text-sm text-teal-600 dark:text-teal-400 ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
            <span>{isSyncing ? 'مزامنة...' : 'تحديث الحضور'}</span>
          </button>
        </div>
      </div>

      {/* 2. 6 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {/* Present */}
        <div className={`p-3.5 rounded-2xl border shadow-xs ${isDark ? 'bg-[#121b2d] border-[#1f2d4a]' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>حاضر</span>
            <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-500">
              <span className="material-symbols-outlined text-sm">person_check</span>
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-500">20</div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>41% نسبة الحضور</span>
          </div>
        </div>

        {/* Late */}
        <div className={`p-3.5 rounded-2xl border shadow-xs ${isDark ? 'bg-[#121b2d] border-[#1f2d4a]' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>متأخر</span>
            <div className="p-1 rounded-lg bg-amber-500/10 text-amber-500">
              <span className="material-symbols-outlined text-sm">schedule</span>
            </div>
          </div>
          <div className="text-2xl font-black text-amber-500">10</div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">تأخير صباحي</div>
        </div>

        {/* On Leave */}
        <div className={`p-3.5 rounded-2xl border shadow-xs ${isDark ? 'bg-[#121b2d] border-[#1f2d4a]' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>في إجازة</span>
            <div className="p-1 rounded-lg bg-blue-500/10 text-blue-500">
              <span className="material-symbols-outlined text-sm">event_available</span>
            </div>
          </div>
          <div className="text-2xl font-black text-blue-500">5</div>
          <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">إجازات معتمدة</div>
        </div>

        {/* Early Leave */}
        <div className={`p-3.5 rounded-2xl border shadow-xs ${isDark ? 'bg-[#121b2d] border-[#1f2d4a]' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>خروج مبكر</span>
            <div className="p-1 rounded-lg bg-purple-500/10 text-purple-500">
              <span className="material-symbols-outlined text-sm">output</span>
            </div>
          </div>
          <div className="text-2xl font-black text-purple-500">5</div>
          <div className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5">خروج قبل الوقت</div>
        </div>

        {/* Missing Punch */}
        <div className={`p-3.5 rounded-2xl border shadow-xs ${isDark ? 'bg-[#121b2d] border-[#1f2d4a]' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>بصمة مفقودة</span>
            <div className="p-1 rounded-lg bg-rose-500/10 text-rose-500">
              <span className="material-symbols-outlined text-sm">warning</span>
            </div>
          </div>
          <div className="text-2xl font-black text-rose-500">4</div>
          <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">بحاجة لتصحيح</div>
        </div>

        {/* Absent */}
        <div className={`p-3.5 rounded-2xl border shadow-xs ${isDark ? 'bg-[#121b2d] border-[#1f2d4a]' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>غائب</span>
            <div className="p-1 rounded-lg bg-slate-500/10 text-slate-500">
              <span className="material-symbols-outlined text-sm">person_off</span>
            </div>
          </div>
          <div className={`text-2xl font-black ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>5</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">غائب بدون عذر</div>
        </div>
      </div>

      {/* 3. Main Two Cards: My Attendance Today & My Leave Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Attendance Today Card */}
        <div className={`p-5 rounded-3xl border shadow-xs flex flex-col justify-between space-y-4 ${
          isDark ? 'bg-[#121b2d] border-[#1f2d4a]' : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className={`flex items-center justify-between border-b pb-2.5 mb-3.5 ${
              isDark ? 'border-[#1f2d4a]' : 'border-slate-100'
            }`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-500">fingerprint</span>
                <h2 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  حضوري اليوم
                </h2>
              </div>
              <button
                onClick={() => setShowCorrectionModal(true)}
                className="text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                <span>طلب تصحيح</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-[#0c1322] border-[#1f2d4a]' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-slate-400 block text-[10px] mb-0.5">الوردية المجدولة</span>
                <span className="font-mono font-bold text-[11px]">{attendanceToday.scheduled_start} - {attendanceToday.scheduled_end}</span>
              </div>
              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-[#0c1322] border-[#1f2d4a]' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-slate-400 block text-[10px] mb-0.5">وقت الحضور</span>
                <span className="font-mono font-bold text-emerald-500 text-[11px]">{attendanceToday.check_in}</span>
              </div>
              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-[#0c1322] border-[#1f2d4a]' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-slate-400 block text-[10px] mb-0.5">وقت الانصراف</span>
                <span className="font-mono font-bold text-[11px]">{attendanceToday.check_out}</span>
              </div>
              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-[#0c1322] border-[#1f2d4a]' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-slate-400 block text-[10px] mb-0.5">ساعات العمل</span>
                <span className="font-bold text-teal-500 text-[11px]">{attendanceToday.worked_hours}</span>
              </div>
            </div>
          </div>

          {/* Quick Simulation Buttons */}
          <div className={`pt-2.5 border-t ${isDark ? 'border-[#1f2d4a]' : 'border-slate-100'}`}>
            <span className="text-[10px] text-slate-400 block mb-1.5 font-medium">تسجيل البصمة السريع:</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                onClick={() => {
                  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                  setAttendanceToday(prev => ({ ...prev, check_in: now }));
                  setToastMessage(`تم تسجيل الحضور في ${now}`);
                  setTimeout(() => setToastMessage(null), 3000);
                }}
                className="px-2 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-sm">login</span>
                <span>حضور</span>
              </button>
              <button
                onClick={() => {
                  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                  setAttendanceToday(prev => ({ ...prev, check_out: now }));
                  setToastMessage(`تم تسجيل الانصراف في ${now}`);
                  setTimeout(() => setToastMessage(null), 3000);
                }}
                className="px-2 py-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-sm">logout</span>
                <span>انصراف</span>
              </button>
              <button
                onClick={() => {
                  setToastMessage('تم تسجيل الخروج للاستراحة');
                  setTimeout(() => setToastMessage(null), 3000);
                }}
                className="px-2 py-2 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-sm">coffee</span>
                <span>استراحة</span>
              </button>
              <button
                onClick={() => {
                  setToastMessage('تم تسجيل العودة من الاستراحة');
                  setTimeout(() => setToastMessage(null), 3000);
                }}
                className="px-2 py-2 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-sm">work</span>
                <span>عودة</span>
              </button>
            </div>
          </div>
        </div>

        {/* Leave Balances Card */}
        <div className={`p-5 rounded-3xl border shadow-xs flex flex-col justify-between space-y-4 ${
          isDark ? 'bg-[#121b2d] border-[#1f2d4a]' : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className={`flex items-center justify-between border-b pb-2.5 mb-3.5 ${
              isDark ? 'border-[#1f2d4a]' : 'border-slate-100'
            }`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-500">account_balance_wallet</span>
                <h2 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  أرصدة إجازاتي
                </h2>
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="px-2.5 py-1 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-xs">add</span>
                <span>طلب إجازة</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Annual */}
              <div className={`p-2.5 rounded-2xl border space-y-1.5 ${isDark ? 'bg-[#0c1322] border-[#1f2d4a]' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[10px] truncate">إجازة اعتيادية</span>
                  <span className="text-[8px] px-1 py-0.2 rounded font-mono font-bold bg-teal-500/10 text-teal-500">2026</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-black text-teal-500">{leaveBalances.annual.available}</span>
                  <span className="text-[9px] text-slate-400">من {leaveBalances.annual.entitled} يوم</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-1 overflow-hidden">
                  <div className="bg-teal-500 h-full rounded-full" style={{ width: `${(leaveBalances.annual.available / leaveBalances.annual.entitled) * 100}%` }} />
                </div>
              </div>

              {/* Sick */}
              <div className={`p-2.5 rounded-2xl border space-y-1.5 ${isDark ? 'bg-[#0c1322] border-[#1f2d4a]' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[10px] truncate">إجازة مرضية</span>
                  <span className="text-[8px] px-1 py-0.2 rounded font-mono font-bold bg-teal-500/10 text-teal-500">2026</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-black text-teal-500">{leaveBalances.sick.available}</span>
                  <span className="text-[9px] text-slate-400">من {leaveBalances.sick.entitled} يوم</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-1 overflow-hidden">
                  <div className="bg-teal-500 h-full rounded-full" style={{ width: `${(leaveBalances.sick.available / leaveBalances.sick.entitled) * 100}%` }} />
                </div>
              </div>

              {/* Emergency */}
              <div className={`p-2.5 rounded-2xl border space-y-1.5 ${isDark ? 'bg-[#0c1322] border-[#1f2d4a]' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[10px] truncate">إجازة طارئة</span>
                  <span className="text-[8px] px-1 py-0.2 rounded font-mono font-bold bg-teal-500/10 text-teal-500">2026</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-black text-teal-500">{leaveBalances.emergency.available}</span>
                  <span className="text-[9px] text-slate-400">من {leaveBalances.emergency.entitled} يوم</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-1 overflow-hidden">
                  <div className="bg-teal-500 h-full rounded-full" style={{ width: `${(leaveBalances.emergency.available / leaveBalances.emergency.entitled) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className={`pt-2 border-t flex items-center justify-between text-[11px] ${isDark ? 'border-[#1f2d4a]' : 'border-slate-100'}`}>
            <span className="text-slate-400">
              طلبات الإجازة المعلقة: {requests.filter(r => r.status === 'pending').length}
            </span>
            <span className="text-teal-500 font-bold">سجل إجازاتي الكامل ←</span>
          </div>
        </div>
      </div>

      {/* 4. Leave Requests History List */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            سجل طلبات الإجازة السابقة
          </h3>
          <span className="text-[11px] text-teal-500 font-bold">{requests.length} طلبات</span>
        </div>

        <div className="space-y-2.5">
          {requests.map((request) => (
            <div
              key={request.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                isDark ? 'bg-[#131b2e] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold">{request.leaveType}</span>
                  <span className="text-[10px] font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full">
                    {request.totalDays} أيام
                  </span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  request.status === 'approved' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' :
                  request.status === 'pending' ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' :
                  'bg-rose-500/15 text-rose-400 border-rose-500/20'
                }`}>
                  {request.status === 'approved' ? 'مقبول' : request.status === 'pending' ? 'قيد الانتظار' : 'مرفوض'}
                </span>
              </div>

              <div className={`text-[11px] grid grid-cols-2 gap-1 p-2 rounded-xl my-2 ${
                isDark ? 'bg-slate-900/50' : 'bg-slate-50'
              }`}>
                <div>
                  <span className="text-slate-400 block text-[10px]">تاريخ البداية</span>
                  <span className="font-bold">{request.startDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">تاريخ النهاية</span>
                  <span className="font-bold">{request.endDate}</span>
                </div>
              </div>

              <p className={`text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <span className="font-bold">السبب:</span> {request.reason}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Apply for Leave */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className={`w-full max-w-md rounded-3xl p-5 border shadow-2xl space-y-4 animate-in zoom-in-95 ${
            isDark ? 'bg-[#0f172a] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-700/40">
              <h2 className="text-sm font-black flex items-center gap-1.5">
                <span className="material-symbols-outlined text-teal-500">edit_calendar</span>
                <span>تقديم طلب إجازة جديدة</span>
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold mb-1 text-teal-500">نوع الإجازة المطلوبة *</label>
                <select
                  value={newRequest.leaveType}
                  onChange={(e) => setNewRequest({ ...newRequest, leaveType: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  required
                >
                  <option value="إجازة سنوية">إجازة سنوية (متاح: {leaveBalances.annual.available} يوم)</option>
                  <option value="إجازة مرضية">إجازة مرضية (متاح: {leaveBalances.sick.available} يوم)</option>
                  <option value="إجازة طارئة">إجازة طارئة (متاح: {leaveBalances.emergency.available} يوم)</option>
                  <option value="إجازة بدون راتب">إجازة بدون راتب</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold mb-1 text-teal-500">تاريخ البداية *</label>
                  <input
                    type="date"
                    value={newRequest.startDate}
                    onChange={(e) => setNewRequest({ ...newRequest, startDate: e.target.value })}
                    className={`w-full px-2.5 py-2 rounded-xl border text-xs ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-teal-500">تاريخ النهاية *</label>
                  <input
                    type="date"
                    value={newRequest.endDate}
                    onChange={(e) => setNewRequest({ ...newRequest, endDate: e.target.value })}
                    className={`w-full px-2.5 py-2 rounded-xl border text-xs ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    required
                  />
                </div>
              </div>

              {newRequest.startDate && newRequest.endDate && (
                <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs flex justify-between">
                  <span>الأيام المحسوبة:</span>
                  <span className="font-black">{calculateDays()} أيام</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold mb-1 text-teal-500">سبب طلب الإجازة *</label>
                <textarea
                  value={newRequest.reason}
                  onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                  placeholder="يرجى كتابة سبب الإجازة..."
                  rows={3}
                  className={`w-full px-3 py-2 rounded-xl border text-xs resize-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 active:scale-95 transition-all"
                >
                  إرسال طلب الإجازة
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-bold ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
                  }`}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Attendance Correction */}
      {showCorrectionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className={`w-full max-w-md rounded-3xl p-5 border shadow-2xl space-y-4 animate-in zoom-in-95 ${
            isDark ? 'bg-[#0f172a] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-700/40">
              <h2 className="text-sm font-black flex items-center gap-1.5">
                <span className="material-symbols-outlined text-teal-500">edit</span>
                <span>طلب تصحيح بصمة دوام</span>
              </h2>
              <button
                onClick={() => setShowCorrectionModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleCorrectionSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold mb-1 text-teal-500">تاريخ اليوم *</label>
                <input
                  type="date"
                  value={correctionForm.date}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, date: e.target.value })}
                  className={`w-full px-2.5 py-2 rounded-xl border text-xs ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold mb-1 text-teal-500">الحضور الفعلي *</label>
                  <input
                    type="time"
                    value={correctionForm.requestedIn}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, requestedIn: e.target.value })}
                    className={`w-full px-2.5 py-2 rounded-xl border text-xs ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-teal-500">الانصراف الفعلي *</label>
                  <input
                    type="time"
                    value={correctionForm.requestedOut}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, requestedOut: e.target.value })}
                    className={`w-full px-2.5 py-2 rounded-xl border text-xs ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-teal-500">سبب التصحيح *</label>
                <textarea
                  value={correctionForm.reason}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                  placeholder="سبب نسيان البصمة أو العطل الفني..."
                  rows={3}
                  className={`w-full px-3 py-2 rounded-xl border text-xs resize-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 active:scale-95 transition-all"
                >
                  إرسال طلب التصحيح
                </button>
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-bold ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
                  }`}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};