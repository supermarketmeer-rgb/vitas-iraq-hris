import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useEmployeeContext } from '../context/EmployeeContext';
import {
  Clock,
  Info,
  ArrowUpDown,
  AlertTriangle,
  Send,
  CheckCircle2,
  XCircle,
  Users,
  X,
  Loader2
} from 'lucide-react';

interface EmployeeAttendanceProps {
  employee: any;
  onLogout: () => void;
}

interface MissingCheckoutItem {
  id: number | string;
  employee_id: string;
  badge_no?: string;
  employee_name_ar?: string;
  employee_name_en?: string;
  department?: string;
  branch?: string;
  date: string;
  check_in: string;
  isOverdue: boolean;
  correction?: {
    id: number;
    status: 'pending' | 'approved' | 'rejected';
    reason?: string;
    requested_check_out?: string;
  } | null;
}

export const EmployeeAttendance: React.FC<EmployeeAttendanceProps> = ({ employee }) => {
  const { theme, language, employee: contextEmployee } = useEmployeeContext();
  const currentEmp = contextEmployee || employee;
  const isDark = theme === 'dark';
  const isEn = language === 'en';

  const nowDate = new Date();
  const defaultMonthStr = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(defaultMonthStr);

  // Live attendance records for this employee
  const [liveRecords, setLiveRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Missing check-outs (own + subordinates if direct supervisor)
  const [myMissing, setMyMissing] = useState<MissingCheckoutItem[]>([]);
  const [subordinateMissing, setSubordinateMissing] = useState<MissingCheckoutItem[]>([]);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [supervisorName, setSupervisorName] = useState('');
  const [shouldBlink, setShouldBlink] = useState(false);

  // Interactive Modal for Missing Check-Outs (Employee correction request & Supervisor review)
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [missingModalTab, setMissingModalTab] = useState<'own' | 'subordinates'>('own');
  const [activeRequestDate, setActiveRequestDate] = useState<string | null>(null);
  const [requestedCheckoutTime, setRequestedCheckoutTime] = useState('16:00');
  const [correctionReason, setCorrectionReason] = useState('');
  const [submittingKey, setSubmittingKey] = useState<string | null>(null);
  const [actionToast, setActionToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const empIdentifier = String(
    currentEmp?.employeeId || currentEmp?.employee_id || currentEmp?.id || currentEmp?.badgeNo || ''
  ).trim();

  // Compute payroll cycle window (21st prev month -> 20th selected month)
  const cycleRange = useMemo(() => {
    if (!/^\d{4}-\d{2}$/.test(selectedMonth)) return { start: '2026-09-21', end: '2026-12-31' };
    const [yStr, mStr] = selectedMonth.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const start = fmt(new Date(y, m - 2, 21));
    const end = fmt(new Date(y, m - 1, 20));
    return { start: start < '2026-09-21' ? '2026-09-21' : start, end };
  }, [selectedMonth]);

  const fetchAttendanceData = useCallback(async () => {
    if (!empIdentifier) return;
    setIsLoading(true);
    try {
      const [attRes, missRes] = await Promise.all([
        fetch(
          `/api/attendance?employee_id=${encodeURIComponent(empIdentifier)}&start_date=${encodeURIComponent(cycleRange.start)}&end_date=${encodeURIComponent(cycleRange.end)}&limit=200`
        ).then(r => (r.ok ? r.json() : [])).catch(() => []),
        fetch(
          `/api/attendance/missing-checkouts?employee_id=${encodeURIComponent(empIdentifier)}&month=${encodeURIComponent(selectedMonth)}`
        ).then(r => (r.ok ? r.json() : null)).catch(() => null)
      ]);

      if (Array.isArray(attRes)) {
        setLiveRecords(attRes);
      }
      if (missRes && missRes.success) {
        setMyMissing(Array.isArray(missRes.myMissing) ? missRes.myMissing : []);
        setSubordinateMissing(Array.isArray(missRes.subordinateMissing) ? missRes.subordinateMissing : []);
        setIsSupervisor(Boolean(missRes.isSupervisor));
        setSupervisorName(missRes.supervisorName || currentEmp?.supervisorName || '');
        setShouldBlink(Boolean(missRes.shouldBlink));
      }
    } finally {
      setIsLoading(false);
    }
  }, [empIdentifier, cycleRange.start, cycleRange.end, selectedMonth, currentEmp?.supervisorName]);

  useEffect(() => {
    fetchAttendanceData();
    const interval = setInterval(fetchAttendanceData, 60000);
    return () => clearInterval(interval);
  }, [fetchAttendanceData]);

  // Format live attendance rows for display
  const attendanceRows = useMemo(() => {
    const arDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return liveRecords.map(r => {
      const dateStr = r.date || String(r.attendance_date || '').slice(0, 10);
      const dObj = new Date(`${dateStr}T00:00:00`);
      const dow = isNaN(dObj.getTime()) ? 0 : dObj.getDay();
      const isThu = dow === 4;
      const checkIn = r.check_in ? String(r.check_in).slice(0, 5) : null;
      const rawOut = r.check_out ? String(r.check_out).slice(0, 5) : null;
      const checkOut = rawOut && rawOut !== '00:00' && rawOut !== checkIn ? rawOut : null;
      const isMissingOut = Boolean(checkIn && !checkOut);
      const workedHrsNum = Number(r.work_hours || 0);
      const hrs = Math.floor(workedHrsNum);
      const mins = Math.round((workedHrsNum - hrs) * 60);
      const workHoursStr = workedHrsNum > 0 ? `${hrs}:${String(mins).padStart(2, '0')}` : '0:00';
      const isLate = Boolean(checkIn && checkIn > '08:15');

      return {
        id: r.id,
        date: dateStr,
        day: arDays[dow] || '',
        isThursday: isThu,
        checkIn,
        checkOut,
        isMissingOut,
        workHours: workHoursStr,
        workedHoursNum: workedHrsNum,
        requiredHours: isThu ? '7:00' : '8:00',
        status: isMissingOut ? 'missing_checkout' : (isLate ? 'late' : (r.status || 'present')),
        notes: r.notes || ''
      };
    });
  }, [liveRecords]);

  // Computed monthly stats
  const monthlyStats = useMemo(() => {
    const presentDays = attendanceRows.filter(r => r.checkIn && r.checkOut).length;
    const lateDays = attendanceRows.filter(r => r.status === 'late').length;
    const totalWorked = attendanceRows.reduce((sum, r) => sum + (r.workedHoursNum || 0), 0);
    const totalH = Math.floor(totalWorked);
    const totalM = Math.round((totalWorked - totalH) * 60);
    const avgVal = presentDays > 0 ? totalWorked / presentDays : 0;
    const avgH = Math.floor(avgVal);
    const avgM = Math.round((avgVal - avgH) * 60);
    const totalCount = attendanceRows.length || 22;
    const compliancePct = totalCount > 0 ? Math.min(100, Math.round((presentDays / Math.max(presentDays + myMissing.length, 1)) * 100)) : 100;

    return {
      totalWorkdays: Math.max(attendanceRows.length, 22),
      presentDays,
      lateDays,
      missingCheckoutCount: myMissing.length,
      subordinateMissingCount: subordinateMissing.length,
      totalWorkHours: `${totalH}:${String(totalM).padStart(2, '0')}`,
      avgWorkHours: `${avgH}:${String(avgM).padStart(2, '0')}`,
      complianceRate: `${compliancePct}%`
    };
  }, [attendanceRows, myMissing.length, subordinateMissing.length]);

  // Submit employee correction request to direct supervisor
  const handleSubmitCorrection = async (item: MissingCheckoutItem) => {
    setSubmittingKey(`req_${item.date}`);
    setActionToast(null);
    try {
      const res = await fetch('/api/attendance/correction/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: item.employee_id || empIdentifier,
          employee_name: currentEmp?.fullName || currentEmp?.full_name_ar || currentEmp?.name || '',
          attendance_date: item.date,
          correction_type: 'missing_check_out',
          requested_check_in: item.check_in || '08:00:00',
          requested_check_out: `${requestedCheckoutTime}:00`,
          reason: correctionReason.trim() || 'نسيان بصمة الخروج',
          supervisor_name: supervisorName || currentEmp?.supervisorName || '',
          submitted_by_supervisor: false
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'فشل إرسال الطلب');

      setActionToast({
        type: 'success',
        text: isEn
          ? 'Correction request sent to your direct supervisor!'
          : 'تم إرسال طلب تصحيح بصمة الخروج إلى مسؤولك المباشر بنجاح!'
      });
      setActiveRequestDate(null);
      setCorrectionReason('');
      await fetchAttendanceData();
    } catch (err: any) {
      setActionToast({ type: 'error', text: err?.message || 'حدث خطأ أثناء الإرسال' });
    } finally {
      setSubmittingKey(null);
    }
  };

  // Supervisor approves or rejects subordinate missing check-out
  const handleSupervisorDecision = async (item: MissingCheckoutItem, decision: 'approve' | 'reject') => {
    const key = `sup_${item.employee_id}_${item.date}_${decision}`;
    setSubmittingKey(key);
    setActionToast(null);
    try {
      const reviewerName = currentEmp?.fullName || currentEmp?.full_name_ar || currentEmp?.name || 'المشرف المباشر';
      if (item.correction?.id) {
        const res = await fetch(`/api/attendance/correction/${item.correction.id}/decision`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ decision, reviewed_by: reviewerName })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'فشل تنفيذ القرار');
      } else if (decision === 'approve') {
        // Direct supervisor can approve/correct a subordinate's missing checkout directly
        const dObj = new Date(`${item.date}T00:00:00`);
        const defaultOut = dObj.getDay() === 4 ? '15:00:00' : '16:00:00';
        const res = await fetch('/api/attendance/correction/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: item.employee_id,
            employee_name: item.employee_name_ar || item.employee_name_en || '',
            attendance_date: item.date,
            correction_type: 'missing_check_out',
            requested_check_in: item.check_in || '08:00:00',
            requested_check_out: defaultOut,
            reason: 'تصحيح مباشر معتمد من المسؤول المباشر',
            supervisor_name: reviewerName,
            submitted_by_supervisor: true,
            reviewed_by: reviewerName
          })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'فشل اعتماد التصحيح');
      }

      setActionToast({
        type: 'success',
        text: decision === 'approve'
          ? (isEn ? 'Check-out corrected and approved!' : 'تم اعتماد تصحيح بصمة الخروج وإلغاء الغياب في البيرول!')
          : (isEn ? 'Correction request rejected.' : 'تم رفض طلب التصحيح.')
      });
      await fetchAttendanceData();
    } catch (err: any) {
      setActionToast({ type: 'error', text: err?.message || 'حدث خطأ' });
    } finally {
      setSubmittingKey(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return isDark
          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
          : 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
      case 'late':
        return isDark
          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
          : 'bg-amber-50 text-amber-800 border-amber-300 font-bold';
      case 'missing_checkout':
        return isDark
          ? 'bg-rose-500/25 text-rose-300 border-rose-500/50 animate-pulse'
          : 'bg-rose-50 text-rose-700 border-rose-400 font-bold animate-pulse';
      default:
        return isDark
          ? 'bg-slate-700 text-slate-300 border-slate-600'
          : 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'present':
        return isEn ? 'Present' : 'حاضر';
      case 'late':
        return isEn ? 'Late' : 'متأخر';
      case 'missing_checkout':
        return isEn ? 'No Check-Out' : 'بدون بصمة خروج';
      default:
        return status;
    }
  };

  const getDayName = (dayAr: string) => {
    if (!isEn) return dayAr;
    const map: Record<string, string> = {
      'الخميس': 'Thursday',
      'الجمعة': 'Friday',
      'السبت': 'Saturday',
      'الأحد': 'Sunday',
      'الاثنين': 'Monday',
      'الثلاثاء': 'Tuesday',
      'الأربعاء': 'Wednesday'
    };
    return map[dayAr] || dayAr;
  };

  const formatDate = (dateString: string) => {
    const d = new Date(`${dateString}T00:00:00`);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString(isEn ? 'en-US' : 'ar-IQ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const totalMissingDisplay = isSupervisor && myMissing.length === 0 && subordinateMissing.length > 0
    ? subordinateMissing.length
    : myMissing.length;

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-4 pb-20 animate-in fade-in">
      {/* Mobile Top Navigation & Month Selector */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shadow-xs">
            <Clock className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className={`text-base font-black leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isEn ? 'Attendance & Punch Records' : 'سجل الدوام والبصمات'}
            </h1>
            <p className={`text-[11px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
              {isEn ? `Cycle: ${cycleRange.start} → ${cycleRange.end}` : `الدورة: ${cycleRange.start} ← ${cycleRange.end}`}
            </p>
          </div>
        </div>

        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className={`px-3 py-1.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors cursor-pointer ${
            isDark
              ? 'border-slate-700 bg-slate-800 text-white'
              : 'border-slate-300 bg-white text-slate-900 shadow-xs'
          }`}
        />
      </div>

      {/* Official Shift Schedule Rule Banner */}
      <div className={`p-3.5 rounded-2xl border text-xs flex items-center gap-3 ${
        isDark
          ? 'bg-teal-950/30 border-teal-500/30 text-teal-200'
          : 'bg-teal-50/80 border-teal-300 text-teal-950 shadow-xs'
      }`}>
        <Info className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
        <div className="text-[11px] leading-snug">
          <span className="font-black block text-teal-800 dark:text-teal-300">
            {isEn ? 'Official Working Hours Rule (Settings):' : 'ضوابط وساعات الدوام الرسمية (حسب الإعدادات):'}
          </span>
          <span className="font-bold text-slate-700 dark:text-slate-300">
            {isEn
              ? 'Sunday to Wednesday: 8 hours (08:00 - 16:00) • Thursday: 7 hours (08:00 - 15:00)'
              : 'من الأحد إلى الأربعاء: 8 ساعات (08:00 - 16:00) • الخميس: 7 ساعات (08:00 - 15:00)'}
          </span>
        </div>
      </div>

      {/* Stats Grid 2x2 */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className={`p-3.5 rounded-2xl border ${
          isDark ? 'bg-gradient-to-br from-emerald-950/30 to-slate-900 border-emerald-500/30' : 'bg-emerald-50/70 border-emerald-300 shadow-xs'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span>
            <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full">
              {isEn ? 'Present' : 'حضور'}
            </span>
          </div>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
            {monthlyStats.presentDays} {isEn ? 'Days' : 'أيام'}
          </p>
          <p className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
            {isEn ? 'Complete Check-In & Out' : 'بصمة دخول وخروج مكتملة'}
          </p>
        </div>

        <div className={`p-3.5 rounded-2xl border ${
          isDark ? 'bg-gradient-to-br from-amber-950/30 to-slate-900 border-amber-500/30' : 'bg-amber-50/70 border-amber-300 shadow-xs'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="material-symbols-outlined text-amber-600 text-lg">schedule</span>
            <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full">
              {isEn ? 'Late' : 'تأخير'}
            </span>
          </div>
          <p className="text-xl font-black text-amber-600 dark:text-amber-400">
            {monthlyStats.lateDays} {isEn ? 'Day' : 'يوم'}
          </p>
          <p className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
            {isEn ? 'Late past 08:15 AM' : 'تأخير بعد 08:15 صباحاً'}
          </p>
        </div>

        <div className={`p-3.5 rounded-2xl border ${
          isDark ? 'bg-gradient-to-br from-rose-950/30 to-slate-900 border-rose-500/30' : 'bg-rose-50/70 border-rose-300 shadow-xs'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="material-symbols-outlined text-rose-600 text-lg">event_busy</span>
            <span className="text-[10px] font-black text-rose-700 dark:text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded-full">
              {isEn ? 'Records' : 'السجلات'}
            </span>
          </div>
          <p className="text-xl font-black text-rose-600 dark:text-rose-400">
            {attendanceRows.length} {isEn ? 'Days' : 'يوم'}
          </p>
          <p className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
            {isEn ? 'Synced biometric days' : 'أيام بصمة مسجلة بالدورة'}
          </p>
        </div>

        {/* REPLACED CARD: Missing Check-Out Days (Blinks after 1 hour past departure; clickable for employee correction & supervisor team review) */}
        <button
          type="button"
          onClick={() => {
            setMissingModalTab(isSupervisor && myMissing.length === 0 && subordinateMissing.length > 0 ? 'subordinates' : 'own');
            setShowMissingModal(true);
            setActionToast(null);
          }}
          className={`p-3.5 rounded-2xl border text-start transition-all cursor-pointer active:scale-95 relative overflow-hidden ${
            shouldBlink
              ? (isDark
                  ? 'bg-gradient-to-br from-rose-950/70 to-amber-950/40 border-rose-500 ring-2 ring-rose-500/60 shadow-lg shadow-rose-900/40 animate-pulse'
                  : 'bg-gradient-to-br from-rose-50 to-amber-50 border-rose-500 ring-2 ring-rose-500/50 shadow-md animate-pulse')
              : (isDark
                  ? 'bg-gradient-to-br from-orange-950/30 to-slate-900 border-orange-500/30 hover:border-orange-400'
                  : 'bg-orange-50/70 border-orange-300 hover:border-orange-500 shadow-xs')
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <AlertTriangle className={`w-5 h-5 ${shouldBlink ? 'text-rose-600 dark:text-rose-400' : 'text-orange-600 dark:text-orange-400'}`} />
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              shouldBlink
                ? 'bg-rose-600 text-white'
                : 'text-orange-700 dark:text-orange-300 bg-orange-500/15'
            }`}>
              {shouldBlink
                ? (isEn ? 'Action Required!' : 'تنبيه! مطلوب تصحيح')
                : (isEn ? 'No Check-Out' : 'بدون خروج')}
            </span>
          </div>
          <p className={`text-xl font-black ${shouldBlink ? 'text-rose-600 dark:text-rose-400' : 'text-orange-600 dark:text-orange-400'}`}>
            {totalMissingDisplay} {isEn ? (totalMissingDisplay === 1 ? 'Day' : 'Days') : (totalMissingDisplay === 1 ? 'يوم' : 'أيام')}
          </p>
          <p className={`text-[10px] font-bold leading-tight ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            {isSupervisor && subordinateMissing.length > 0
              ? (isEn
                  ? `Missing Check-Out • Team: ${subordinateMissing.length}`
                  : `أيام بدون بصمة خروج • الفريق: ${subordinateMissing.length}`)
              : (isEn
                  ? 'Missing Check-Out (Tap to correct)'
                  : 'أيام بدون بصمة خروج (اضغط للتصحيح)')}
          </p>
        </button>
      </div>

      {/* Monthly Summary Bar */}
      <div className={`p-4 rounded-3xl border ${
        isDark ? 'bg-[#131b2e] border-slate-800 text-white' : 'bg-white border-slate-300 shadow-xs text-slate-900'
      }`}>
        <div className="flex items-center justify-between text-xs font-black mb-2">
          <span>{isEn ? 'Total Monthly Worked Hours' : 'إجمالي ساعات العمل المحققة للدورة'}</span>
          <span className="text-teal-600 dark:text-teal-400 font-mono text-sm">
            {monthlyStats.totalWorkHours} {isEn ? 'hours' : 'ساعة'}
          </span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700/40 h-2.5 rounded-full overflow-hidden">
          <div className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full" style={{ width: monthlyStats.complianceRate }}></div>
        </div>
        <div className="flex justify-between items-center text-[10px] text-slate-700 dark:text-slate-400 font-bold mt-2">
          <span className="flex items-center gap-1">
            <span className="font-black text-slate-900 dark:text-white">
              {isEn ? `Daily Avg: ${monthlyStats.avgWorkHours} hrs/day` : `المعدل اليومي: ${monthlyStats.avgWorkHours} ساعة/يوم`}
            </span>
          </span>
          <span className="text-emerald-700 dark:text-emerald-400 font-black">
            {isEn ? `${monthlyStats.complianceRate} Compliance` : `التزام ${monthlyStats.complianceRate}`}
          </span>
        </div>
      </div>

      {/* Daily Attendance Cards (Live Synced Records) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h3 className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-800'}`}>
              {isEn ? 'Daily Attendance History (Latest at Top)' : 'سجل الدوام اليومي (أحدث سجل في الأعلى)'}
            </h3>
          </div>
          <span className="text-[11px] text-teal-700 dark:text-teal-400 font-black">
            {attendanceRows.length} {isEn ? 'records' : 'سجلات'}
          </span>
        </div>

        {isLoading ? (
          <div className="py-10 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
            <span>{isEn ? 'Loading attendance records...' : 'جاري تحميل سجلات البصمة...'}</span>
          </div>
        ) : attendanceRows.length === 0 ? (
          <div className={`p-6 rounded-2xl border text-center text-xs font-bold ${
            isDark ? 'bg-[#131b2e] border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
          }`}>
            {isEn ? 'No biometric records found for this cycle.' : 'لا توجد حركات بصمة مسجلة لهذه الدورة.'}
          </div>
        ) : (
          <div className="space-y-2.5">
            {attendanceRows.map((record) => (
              <div
                key={`${record.id}_${record.date}`}
                className={`p-3.5 rounded-2xl border transition-all ${
                  record.status === 'missing_checkout'
                    ? isDark ? 'bg-rose-950/30 border-rose-500/40 text-white' : 'bg-rose-50/70 border-rose-300 text-slate-900 shadow-xs'
                    : record.status === 'late'
                    ? isDark ? 'bg-amber-950/20 border-amber-500/30 text-white' : 'bg-amber-50/70 border-amber-300 text-slate-900 shadow-xs'
                    : isDark ? 'bg-[#131b2e] border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {getDayName(record.day)}
                    </span>
                    <span className={`text-[11px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                      {formatDate(record.date)}
                    </span>
                    {record.isThursday && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                        {isEn ? 'Thursday (7h)' : 'الخميس (7 ساعات)'}
                      </span>
                    )}
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${getStatusBadge(record.status)}`}>
                    {getStatusText(record.status)}
                  </span>
                </div>

                <div className={`grid grid-cols-4 gap-1.5 p-2 rounded-xl text-center text-xs border ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100/80 border-slate-200'
                }`}>
                  <div>
                    <span className={`text-[10px] block mb-0.5 font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                      {isEn ? 'Check In' : 'الدخول'}
                    </span>
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">{record.checkIn || '--:--'}</span>
                  </div>
                  <div>
                    <span className={`text-[10px] block mb-0.5 font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                      {isEn ? 'Check Out' : 'الخروج'}
                    </span>
                    <span className={`font-mono font-black ${record.checkOut ? 'text-blue-600 dark:text-blue-400' : 'text-rose-500'}`}>
                      {record.checkOut || (isEn ? 'Missing' : 'غير مسجل')}
                    </span>
                  </div>
                  <div>
                    <span className={`text-[10px] block mb-0.5 font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                      {isEn ? 'Required' : 'المقرر'}
                    </span>
                    <span className="font-mono font-black text-slate-800 dark:text-slate-200">
                      {record.requiredHours} {isEn ? 'h' : 'س'}
                    </span>
                  </div>
                  <div>
                    <span className={`text-[10px] block mb-0.5 font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                      {isEn ? 'Worked' : 'الفعلي'}
                    </span>
                    <span className="font-mono font-black text-teal-600 dark:text-teal-400">
                      {record.workHours} {isEn ? 'h' : 'س'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Missing Check-Out Modal (Employee Request + Direct Supervisor Subordinate List) */}
      {showMissingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className={`w-full max-w-md max-h-[88vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
            isDark ? 'bg-[#0f172a] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Header */}
            <div className={`p-4 border-b flex items-center justify-between gap-2 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-rose-50/70 border-rose-200'
            }`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <div>
                  <h3 className="text-sm font-black">
                    {isEn ? 'Missing Check-Out Punch Alerts' : 'تنبيهات الأيام بدون بصمة خروج'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold">
                    {isEn ? 'Missing check-out counts as absence in Payroll unless corrected' : 'عدم وجود بصمة خروج يُحتسب غياباً في البيرول ما لم يتم التصحيح'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMissingModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs (Shown when Direct Supervisor has subordinates) */}
            {isSupervisor && (
              <div className={`px-4 pt-3 pb-2 flex items-center gap-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => setMissingModalTab('own')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    missingModalTab === 'own'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {isEn ? `My Missing (${myMissing.length})` : `بصماتي الناقصة (${myMissing.length})`}
                </button>
                <button
                  type="button"
                  onClick={() => setMissingModalTab('subordinates')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    missingModalTab === 'subordinates'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{isEn ? `My Team (${subordinateMissing.length})` : `فريقي (${subordinateMissing.length})`}</span>
                </button>
              </div>
            )}

            {/* Toast Banner */}
            {actionToast && (
              <div className={`mx-4 mt-3 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${
                actionToast.type === 'success'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}>
                {actionToast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                <span>{actionToast.text}</span>
              </div>
            )}

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {missingModalTab === 'own' ? (
                myMissing.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                    <p className="text-xs font-bold text-slate-400">
                      {isEn ? 'All your check-out punches are complete!' : 'جميع بصمات الخروج الخاصة بك مكتملة ولا يوجد أي نقص.'}
                    </p>
                  </div>
                ) : (
                  myMissing.map(item => {
                    const isExpanded = activeRequestDate === item.date;
                    return (
                      <div
                        key={item.date}
                        className={`p-3.5 rounded-2xl border space-y-2.5 ${
                          isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-black">{formatDate(item.date)}</p>
                            <p className="text-[11px] font-mono text-emerald-500 font-bold">
                              {isEn ? 'Check-In:' : 'بصمة الدخول:'} {String(item.check_in).slice(0, 5)} • {isEn ? 'Check-Out: Missing' : 'الخروج: غير مسجل'}
                            </p>
                          </div>
                          {item.correction?.status === 'pending' ? (
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-amber-500/15 text-amber-500 border border-amber-500/30">
                              {isEn ? 'Pending Supervisor' : 'بانتظار المشرف'}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveRequestDate(isExpanded ? null : item.date);
                                const d = new Date(`${item.date}T00:00:00`);
                                setRequestedCheckoutTime(d.getDay() === 4 ? '15:00' : '16:00');
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Send className="w-3 h-3" />
                              <span>{isEn ? 'Request Correction' : 'طلب تصحيح'}</span>
                            </button>
                          )}
                        </div>

                        {isExpanded && (
                          <div className={`pt-2.5 border-t space-y-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                            <div className="flex items-center gap-2">
                              <label className="text-[11px] font-bold shrink-0">
                                {isEn ? 'Departure Time:' : 'وقت الخروج الفعلي:'}
                              </label>
                              <input
                                type="time"
                                value={requestedCheckoutTime}
                                onChange={e => setRequestedCheckoutTime(e.target.value)}
                                className="flex-1 px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold"
                              />
                            </div>
                            <textarea
                              rows={2}
                              value={correctionReason}
                              onChange={e => setCorrectionReason(e.target.value)}
                              placeholder={isEn ? 'Reason (e.g. forgot check-out / field visit)...' : 'السبب (مثال: نسيان البصمة / مهمة ميدانية)...'}
                              className="w-full p-2.5 rounded-xl border text-xs"
                            />
                            <button
                              type="button"
                              disabled={submittingKey === `req_${item.date}`}
                              onClick={() => handleSubmitCorrection(item)}
                              className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              {submittingKey === `req_${item.date}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                              <span>{isEn ? 'Send to Direct Supervisor' : 'إرسال للمسؤول المباشر'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )
              ) : (
                /* DIRECT SUPERVISOR VIEW: Subordinates who missed check-out */
                subordinateMissing.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                    <p className="text-xs font-bold text-slate-400">
                      {isEn ? 'All your team members have complete check-out punches!' : 'جميع الموظفين التابعين لك لديهم بصمات خروج مكتملة.'}
                    </p>
                  </div>
                ) : (
                  subordinateMissing.map(item => (
                    <div
                      key={`${item.employee_id}_${item.date}`}
                      className={`p-3.5 rounded-2xl border space-y-2.5 ${
                        isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-black truncate">
                            {isEn ? (item.employee_name_en || item.employee_name_ar) : (item.employee_name_ar || item.employee_name_en)}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold">
                            {item.badge_no || item.employee_id} • {item.branch || item.department || '-'}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-rose-500/15 text-rose-500 border border-rose-500/30 shrink-0">
                          {formatDate(item.date)}
                        </span>
                      </div>

                      <div className="text-[11px] font-mono font-bold text-emerald-500">
                        {isEn ? 'Check-In:' : 'الدخول:'} {String(item.check_in).slice(0, 5)} • {isEn ? 'Check-Out: Missing' : 'الخروج: بدون بصمة'}
                      </div>

                      {item.correction?.reason && (
                        <p className={`text-[11px] p-2 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}>
                          <strong>{isEn ? 'Employee Note:' : 'ملاحظة الموظف:'}</strong> {item.correction.reason}
                          {item.correction.requested_check_out ? ` (${String(item.correction.requested_check_out).slice(0, 5)})` : ''}
                        </p>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          disabled={Boolean(submittingKey)}
                          onClick={() => handleSupervisorDecision(item, 'approve')}
                          className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isEn ? 'Approve Correction' : 'اعتماد التصحيح'}</span>
                        </button>
                        {item.correction?.id && (
                          <button
                            type="button"
                            disabled={Boolean(submittingKey)}
                            onClick={() => handleSupervisorDecision(item, 'reject')}
                            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>{isEn ? 'Reject' : 'رفض'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
