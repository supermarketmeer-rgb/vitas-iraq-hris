import React, { useState, useEffect } from 'react';
import { useEmployeeContext } from '../context/EmployeeContext';

interface EmployeeLeaveRequestsProps {
  employee: any;
  onLogout: () => void;
}

export const EmployeeLeaveRequests: React.FC<EmployeeLeaveRequestsProps> = ({ employee, onLogout }) => {
  const { theme, language } = useEmployeeContext();
  const isDark = theme === 'dark';
  const isEn = language === 'en';

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
  const empName = isEn 
    ? (employee?.fullNameEn || 'Dina Haider Qasim') 
    : (employee?.fullName || employee?.name || 'دينا حيدر قاسم');
  const empTitle = isEn 
    ? 'Receptionist' 
    : (employee?.jobTitle || employee?.position || 'موظف استقبال');
  const empDept = isEn 
    ? 'Credit Department' 
    : (employee?.department || 'قسم الائتمان');

  // Attendance Today State
  const [attendanceToday, setAttendanceToday] = useState({
    scheduled_start: '08:00',
    scheduled_end: '16:00',
    check_in: '07:55',
    check_out: '16:15',
    worked_hours: isEn ? '8.35 hrs' : '8.35 ساعة'
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

  const getLeaveTypeName = (type: string) => {
    if (!isEn) {
      if (type === 'Annual Leave') return 'إجازة سنوية';
      if (type === 'Sick Leave') return 'إجازة مرضية';
      if (type === 'Emergency Leave') return 'إجازة طارئة';
      if (type === 'Unpaid Leave') return 'إجازة بدون راتب';
      return type;
    }
    if (type === 'إجازة سنوية' || type === 'إجازة اعتيادية') return 'Annual Leave';
    if (type === 'إجازة مرضية') return 'Sick Leave';
    if (type === 'إجازة طارئة') return 'Emergency Leave';
    if (type === 'إجازة بدون راتب') return 'Unpaid Leave';
    return type;
  };

  const getStatusLabel = (status: string) => {
    if (status === 'approved') return isEn ? 'Approved' : 'مقبول';
    if (status === 'pending') return isEn ? 'Pending' : 'قيد الانتظار';
    return isEn ? 'Rejected' : 'مرفوض';
  };

  const getReasonLabel = (reason: string) => {
    if (!isEn) return reason;
    if (reason.includes('عطلة عائلية')) return 'Scheduled family vacation';
    if (reason.includes('علاج طارئ')) return 'Emergency medical checkup';
    if (reason.includes('عطلة سنوية')) return 'Annual regular leave';
    return reason;
  };

  const handleSyncNow = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setToastMessage(isEn 
        ? 'Attendance logs successfully synced with biometric devices' 
        : 'تمت مزامنة سجلات الحضور بنجاح مع أجهزة البصمة'
      );
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
    setToastMessage(isEn 
      ? `Leave request (${days} days) submitted successfully` 
      : `تم تقديم طلب الإجازة (${days} أيام) بنجاح`
    );
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
    setToastMessage(isEn 
      ? 'Punch correction request submitted successfully' 
      : 'تم تقديم طلب تصحيح البصمة بنجاح'
    );
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

      {/* 1. Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {isEn ? 'Leaves & Attendance' : 'الإجازات والدوام'}
          </h1>
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
            <span>{isEn ? 'Apply for Leave' : 'تقديم طلب إجازة'}</span>
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
            <span>{isSyncing ? (isEn ? 'Syncing...' : 'مزامنة...') : (isEn ? 'Update Logs' : 'تحديث الحضور')}</span>
          </button>
        </div>
      </div>

      {/* 2. 6 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {/* Present */}
        <div className={`p-3.5 rounded-2xl border shadow-xs ${isDark ? 'bg-[#121b2d] border-[#1f2d4a]' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {isEn ? 'Present' : 'حاضر'}
            </span>
            <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-500">
              <span className="material-symbols-outlined text-sm">person_check</span>
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-500">20</div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{isEn ? '41% Attendance Rate' : '41% نسبة الحضور'}</span>
          </div>
        </div>

        {/* Late */}
        <div className={`p-3.5 rounded-2xl border shadow-xs ${isDark ? 'bg-[#121b2d] border-[#1f2d4a]' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {isEn ? 'Late' : 'متأخر'}
            </span>
            <div className="p-1 rounded-lg bg-amber-500/10 text-amber-500">
              <span className="material-symbols-outlined text-sm">schedule</span>
            </div>
          </div>
          <div className="text-2xl font-black text-amber-500">10</div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
            {isEn ? 'Morning delays' : 'تأخير صباحي'}
          </div>
        </div>

        {/* On Leave */}
        <div className={`p-3.5 rounded-2xl border shadow-xs ${isDark ? 'bg-[#121b2d] border-[#1f2d4a]' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {isEn ? 'On Leave' : 'في إجازة'}
            </span>
            <div className="p-1 rounded-lg bg-blue-500/10 text-blue-500">
              <span className="material-symbols-outlined text-sm">event_available</span>
            </div>
          </div>
          <div className="text-2xl font-black text-blue-500">5</div>
          <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">
            {isEn ? 'Approved leaves' : 'إجازات معتمدة'}
          </div>
        </div>

        {/* Early Leave */}
        <div className={`p-3.5 rounded-2xl border shadow-xs ${isDark ? 'bg-[#121b2d] border-[#1f2d4a]' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {isEn ? 'Early Leave' : 'خروج مبكر'}
            </span>
            <div className="p-1 rounded-lg bg-purple-500/10 text-purple-500">
              <span className="material-symbols-outlined text-sm">output</span>
            </div>
          </div>
          <div className="text-2xl font-black text-purple-500">5</div>
          <div className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5">
            {isEn ? 'Left early' : 'خروج قبل الوقت'}
          </div>
        </div>

        {/* Missing Punch */}
        <div className={`p-3.5 rounded-2xl border shadow-xs ${isDark ? 'bg-[#121b2d] border-[#1f2d4a]' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {isEn ? 'Missing Punch' : 'بصمة مفقودة'}
            </span>
            <div className="p-1 rounded-lg bg-rose-500/10 text-rose-500">
              <span className="material-symbols-outlined text-sm">warning</span>
            </div>
          </div>
          <div className="text-2xl font-black text-rose-500">4</div>
          <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">
            {isEn ? 'Needs correction' : 'بحاجة لتصحيح'}
          </div>
        </div>

        {/* Absent */}
        <div className={`p-3.5 rounded-2xl border shadow-xs ${isDark ? 'bg-[#121b2d] border-[#1f2d4a]' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {isEn ? 'Absent' : 'غائب'}
            </span>
            <div className="p-1 rounded-lg bg-slate-500/10 text-slate-500">
              <span className="material-symbols-outlined text-sm">person_off</span>
            </div>
          </div>
          <div className={`text-2xl font-black ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>5</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            {isEn ? 'Unexcused absence' : 'غائب بدون عذر'}
          </div>
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
                  {isEn ? 'My Attendance Today' : 'حضوري اليوم'}
                </h2>
              </div>
              <button
                onClick={() => setShowCorrectionModal(true)}
                className="text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                <span>{isEn ? 'Request Correction' : 'طلب تصحيح'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-[#0c1322] border-[#1f2d4a]' : 'bg-slate-50 border-slate-300'}`}>
                <span className={`block text-[10px] mb-0.5 font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                  {isEn ? 'Scheduled Shift' : 'الوردية المجدولة'}
                </span>
                <span className={`font-mono font-black text-[11px] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {attendanceToday.scheduled_start} - {attendanceToday.scheduled_end}
                </span>
              </div>
              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-[#0c1322] border-[#1f2d4a]' : 'bg-slate-50 border-slate-300'}`}>
                <span className={`block text-[10px] mb-0.5 font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                  {isEn ? 'Punch In' : 'وقت الحضور'}
                </span>
                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-[11px]">{attendanceToday.check_in}</span>
              </div>
              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-[#0c1322] border-[#1f2d4a]' : 'bg-slate-50 border-slate-300'}`}>
                <span className={`block text-[10px] mb-0.5 font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                  {isEn ? 'Punch Out' : 'وقت الانصراف'}
                </span>
                <span className={`font-mono font-black text-[11px] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {attendanceToday.check_out}
                </span>
              </div>
              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-[#0c1322] border-[#1f2d4a]' : 'bg-slate-50 border-slate-300'}`}>
                <span className={`block text-[10px] mb-0.5 font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                  {isEn ? 'Worked Hours' : 'ساعات العمل'}
                </span>
                <span className={`font-black text-[11px] ${isDark ? 'text-teal-400' : 'text-teal-800'}`}>
                  {attendanceToday.worked_hours}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Leave Balances Card */}
        <div className={`p-5 rounded-3xl border shadow-xs flex flex-col justify-between space-y-4 ${
          isDark ? 'bg-[#121b2d] border-[#1f2d4a]' : 'bg-white border-slate-300'
        }`}>
          <div>
            <div className={`flex items-center justify-between border-b pb-2.5 mb-3.5 ${
              isDark ? 'border-[#1f2d4a]' : 'border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-600 dark:text-teal-400">account_balance_wallet</span>
                <h2 className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {isEn ? 'My Leave Balances' : 'أرصدة إجازاتي'}
                </h2>
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="px-2.5 py-1 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-xs">add</span>
                <span>{isEn ? 'Request Leave' : 'طلب إجازة'}</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Annual */}
              <div className={`p-2.5 rounded-2xl border space-y-1.5 ${isDark ? 'bg-[#0c1322] border-[#1f2d4a]' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <span className={`font-black text-[10px] truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {isEn ? 'Annual' : 'إجازة اعتيادية'}
                  </span>
                  <span className="text-[8px] px-1 py-0.2 rounded font-mono font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400">2026</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-black text-teal-600 dark:text-teal-400">{leaveBalances.annual.available}</span>
                  <span className={`text-[9px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                    {isEn ? `of ${leaveBalances.annual.entitled} days` : `من ${leaveBalances.annual.entitled} يوم`}
                  </span>
                </div>
                <div className={`w-full rounded-full h-1 overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  <div className="bg-teal-500 h-full rounded-full" style={{ width: `${(leaveBalances.annual.available / leaveBalances.annual.entitled) * 100}%` }} />
                </div>
              </div>

              {/* Sick */}
              <div className={`p-2.5 rounded-2xl border space-y-1.5 ${isDark ? 'bg-[#0c1322] border-[#1f2d4a]' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <span className={`font-black text-[10px] truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {isEn ? 'Sick' : 'إجازة مرضية'}
                  </span>
                  <span className="text-[8px] px-1 py-0.2 rounded font-mono font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400">2026</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-black text-teal-600 dark:text-teal-400">{leaveBalances.sick.available}</span>
                  <span className={`text-[9px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                    {isEn ? `of ${leaveBalances.sick.entitled} days` : `من ${leaveBalances.sick.entitled} يوم`}
                  </span>
                </div>
                <div className={`w-full rounded-full h-1 overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  <div className="bg-teal-500 h-full rounded-full" style={{ width: `${(leaveBalances.sick.available / leaveBalances.sick.entitled) * 100}%` }} />
                </div>
              </div>

              {/* Emergency */}
              <div className={`p-2.5 rounded-2xl border space-y-1.5 ${isDark ? 'bg-[#0c1322] border-[#1f2d4a]' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <span className={`font-black text-[10px] truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {isEn ? 'Emergency' : 'إجازة طارئة'}
                  </span>
                  <span className="text-[8px] px-1 py-0.2 rounded font-mono font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400">2026</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-black text-teal-600 dark:text-teal-400">{leaveBalances.emergency.available}</span>
                  <span className={`text-[9px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                    {isEn ? `of ${leaveBalances.emergency.entitled} days` : `من ${leaveBalances.emergency.entitled} يوم`}
                  </span>
                </div>
                <div className={`w-full rounded-full h-1 overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  <div className="bg-teal-500 h-full rounded-full" style={{ width: `${(leaveBalances.emergency.available / leaveBalances.emergency.entitled) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className={`pt-2 border-t flex items-center justify-between text-[11px] ${isDark ? 'border-[#1f2d4a]' : 'border-slate-200'}`}>
            <span className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
              {isEn ? `Pending requests: ${requests.filter(r => r.status === 'pending').length}` : `طلبات الإجازة المعلقة: ${requests.filter(r => r.status === 'pending').length}`}
            </span>
            <span className="text-teal-700 dark:text-teal-400 font-black">
              {isEn ? 'Complete Leave History →' : 'سجل إجازاتي الكامل ←'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Leave Requests History List */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <h3 className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-800'}`}>
            {isEn ? 'Leave Requests History' : 'سجل طلبات الإجازة السابقة'}
          </h3>
          <span className="text-[11px] text-teal-700 dark:text-teal-400 font-black">
            {requests.length} {isEn ? 'requests' : 'طلبات'}
          </span>
        </div>

        <div className="space-y-2.5">
          {requests.map((request) => (
            <div
              key={request.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                isDark ? 'bg-[#131b2e] border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{getLeaveTypeName(request.leaveType)}</span>
                  <span className="text-[10px] font-mono font-bold text-teal-700 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full">
                    {request.totalDays} {isEn ? 'Days' : 'أيام'}
                  </span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                  request.status === 'approved' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' :
                  request.status === 'pending' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' :
                  'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
                }`}>
                  {getStatusLabel(request.status)}
                </span>
              </div>

              <div className={`text-[11px] grid grid-cols-2 gap-1 p-2 rounded-xl my-2 border ${
                isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-100/80 border-slate-200'
              }`}>
                <div>
                  <span className={`block text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                    {isEn ? 'Start Date' : 'تاريخ البداية'}
                  </span>
                  <span className={`font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{request.startDate}</span>
                </div>
                <div>
                  <span className={`block text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                    {isEn ? 'End Date' : 'تاريخ النهاية'}
                  </span>
                  <span className={`font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{request.endDate}</span>
                </div>
              </div>

              <p className={`text-[11px] font-medium ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                <span className="font-black">{isEn ? 'Reason: ' : 'السبب: '}</span>
                {getReasonLabel(request.reason)}
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
            <div className={`flex items-center justify-between pb-2 border-b ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <h2 className="text-sm font-black flex items-center gap-1.5">
                <span className="material-symbols-outlined text-teal-500">edit_calendar</span>
                <span>{isEn ? 'Apply for New Leave' : 'تقديم طلب إجازة جديدة'}</span>
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className={`p-1 rounded-full cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-3.5">
              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                  {isEn ? 'Requested Leave Type *' : 'نوع الإجازة المطلوبة *'}
                </label>
                <select
                  value={newRequest.leaveType}
                  onChange={(e) => setNewRequest({ ...newRequest, leaveType: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                  required
                >
                  <option value="إجازة سنوية">
                    {isEn ? `Annual Leave (Available: ${leaveBalances.annual.available} days)` : `إجازة سنوية (متاح: ${leaveBalances.annual.available} يوم)`}
                  </option>
                  <option value="إجازة مرضية">
                    {isEn ? `Sick Leave (Available: ${leaveBalances.sick.available} days)` : `إجازة مرضية (متاح: ${leaveBalances.sick.available} يوم)`}
                  </option>
                  <option value="إجازة طارئة">
                    {isEn ? `Emergency Leave (Available: ${leaveBalances.emergency.available} days)` : `إجازة طارئة (متاح: ${leaveBalances.emergency.available} يوم)`}
                  </option>
                  <option value="إجازة بدون راتب">
                    {isEn ? 'Unpaid Leave' : 'إجازة بدون راتب'}
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                    {isEn ? 'Start Date *' : 'تاريخ البداية *'}
                  </label>
                  <input
                    type="date"
                    value={newRequest.startDate}
                    onChange={(e) => setNewRequest({ ...newRequest, startDate: e.target.value })}
                    className={`w-full px-2.5 py-2 rounded-xl border text-xs ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                    required
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                    {isEn ? 'End Date *' : 'تاريخ النهاية *'}
                  </label>
                  <input
                    type="date"
                    value={newRequest.endDate}
                    onChange={(e) => setNewRequest({ ...newRequest, endDate: e.target.value })}
                    className={`w-full px-2.5 py-2 rounded-xl border text-xs ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                    required
                  />
                </div>
              </div>

              {newRequest.startDate && newRequest.endDate && (
                <div className={`p-2.5 rounded-xl border text-xs flex justify-between ${
                  isDark ? 'bg-teal-500/10 border-teal-500/20 text-teal-400' : 'bg-teal-50 border-teal-200 text-teal-800'
                }`}>
                  <span>{isEn ? 'Calculated Days:' : 'الأيام المحسوبة:'}</span>
                  <span className="font-black">
                    {calculateDays()} {isEn ? 'Days' : 'أيام'}
                  </span>
                </div>
              )}

              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                  {isEn ? 'Reason for Leave *' : 'سبب طلب الإجازة *'}
                </label>
                <textarea
                  value={newRequest.reason}
                  onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                  placeholder={isEn ? 'Please describe reason for leave...' : 'يرجى كتابة سبب الإجازة...'}
                  rows={3}
                  className={`w-full px-3 py-2 rounded-xl border text-xs resize-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  {isEn ? 'Submit Leave Request' : 'إرسال طلب الإجازة'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {isEn ? 'Cancel' : 'إلغاء'}
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
            <div className={`flex items-center justify-between pb-2 border-b ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <h2 className="text-sm font-black flex items-center gap-1.5">
                <span className="material-symbols-outlined text-teal-500">edit</span>
                <span>{isEn ? 'Attendance Punch Correction' : 'طلب تصحيح بصمة دوام'}</span>
              </h2>
              <button
                onClick={() => setShowCorrectionModal(false)}
                className={`p-1 rounded-full cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleCorrectionSubmit} className="space-y-3.5">
              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                  {isEn ? 'Date *' : 'تاريخ اليوم *'}
                </label>
                <input
                  type="date"
                  value={correctionForm.date}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, date: e.target.value })}
                  className={`w-full px-2.5 py-2 rounded-xl border text-xs ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                    {isEn ? 'Actual Punch In *' : 'الحضور الفعلي *'}
                  </label>
                  <input
                    type="time"
                    value={correctionForm.requestedIn}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, requestedIn: e.target.value })}
                    className={`w-full px-2.5 py-2 rounded-xl border text-xs ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                    required
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                    {isEn ? 'Actual Punch Out *' : 'الانصراف الفعلي *'}
                  </label>
                  <input
                    type="time"
                    value={correctionForm.requestedOut}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, requestedOut: e.target.value })}
                    className={`w-full px-2.5 py-2 rounded-xl border text-xs ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                  {isEn ? 'Correction Reason *' : 'سبب التصحيح *'}
                </label>
                <textarea
                  value={correctionForm.reason}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                  placeholder={isEn ? 'Reason for missing punch or hardware issue...' : 'سبب نسيان البصمة أو العطل الفني...'}
                  rows={3}
                  className={`w-full px-3 py-2 rounded-xl border text-xs resize-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  {isEn ? 'Submit Correction Request' : 'إرسال طلب التصحيح'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {isEn ? 'Cancel' : 'إلغاء'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};