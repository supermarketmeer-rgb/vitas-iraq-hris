import React, { useState } from 'react';
import { useEmployeeContext } from '../context/EmployeeContext';
import { 
  CheckCircle2, 
  Clock, 
  Calendar, 
  AlertCircle, 
  Info,
  ArrowUpDown
} from 'lucide-react';

interface EmployeeAttendanceProps {
  employee: any;
  onLogout: () => void;
}

export const EmployeeAttendance: React.FC<EmployeeAttendanceProps> = ({ employee, onLogout }) => {
  const { theme, language } = useEmployeeContext();
  const isDark = theme === 'dark';
  const isEn = language === 'en';
  const [selectedMonth, setSelectedMonth] = useState('2026-08');

  // Attendance Records for August 2026 in DESCENDING order (Latest record at the top!)
  // Work hours: 8 hours daily (08:00 - 16:00) except Thursday: 7 hours (08:00 - 15:00)
  const mockAttendanceData = [
    {
      date: '2026-08-27',
      day: 'الخميس',
      checkIn: '08:00',
      checkOut: '15:00',
      workHours: '7:00',
      requiredHours: '7:00',
      shiftType: 'thursday',
      status: 'present',
      notes: 'دوام الخميس المقرر (7 ساعات: 08:00 - 15:00)',
      notesEn: 'Scheduled Thursday Shift (7 hours: 08:00 - 15:00)'
    },
    {
      date: '2026-08-26',
      day: 'الأربعاء',
      checkIn: '08:00',
      checkOut: '16:00',
      workHours: '8:00',
      requiredHours: '8:00',
      shiftType: 'regular',
      status: 'present',
      notes: 'دوام رسمي كامل (8 ساعات: 08:00 - 16:00)',
      notesEn: 'Standard Shift (8 hours: 08:00 - 16:00)'
    },
    {
      date: '2026-08-25',
      day: 'الثلاثاء',
      checkIn: '07:55',
      checkOut: '16:05',
      workHours: '8:10',
      requiredHours: '8:00',
      shiftType: 'regular',
      status: 'present',
      notes: 'دوام رسمي كامل (8 ساعات: 08:00 - 16:00)',
      notesEn: 'Standard Shift (8 hours: 08:00 - 16:00)'
    },
    {
      date: '2026-08-24',
      day: 'الاثنين',
      checkIn: '08:12',
      checkOut: '16:15',
      workHours: '8:03',
      requiredHours: '8:00',
      shiftType: 'regular',
      status: 'late',
      notes: 'تأخير صباحي 12 دقيقة مع تعويض الانصراف',
      notesEn: 'Morning delay 12 mins with departure offset'
    },
    {
      date: '2026-08-23',
      day: 'الأحد',
      checkIn: '08:00',
      checkOut: '16:00',
      workHours: '8:00',
      requiredHours: '8:00',
      shiftType: 'regular',
      status: 'present',
      notes: 'دوام رسمي كامل (8 ساعات: 08:00 - 16:00)',
      notesEn: 'Standard Shift (8 hours: 08:00 - 16:00)'
    },
    {
      date: '2026-08-22',
      day: 'السبت',
      checkIn: null,
      checkOut: null,
      workHours: '0:00',
      requiredHours: '0:00',
      shiftType: 'weekend',
      status: 'weekend',
      notes: 'عطلة نهاية الأسبوع الرسمية',
      notesEn: 'Official Weekend Holiday'
    },
    {
      date: '2026-08-21',
      day: 'الجمعة',
      checkIn: null,
      checkOut: null,
      workHours: '0:00',
      requiredHours: '0:00',
      shiftType: 'weekend',
      status: 'weekend',
      notes: 'عطلة نهاية الأسبوع الرسمية',
      notesEn: 'Official Weekend Holiday'
    },
    {
      date: '2026-08-20',
      day: 'الخميس',
      checkIn: '08:00',
      checkOut: '15:00',
      workHours: '7:00',
      requiredHours: '7:00',
      shiftType: 'thursday',
      status: 'present',
      notes: 'دوام الخميس المقرر (7 ساعات: 08:00 - 15:00)',
      notesEn: 'Scheduled Thursday Shift (7 hours: 08:00 - 15:00)'
    },
    {
      date: '2026-08-19',
      day: 'الأربعاء',
      checkIn: '08:00',
      checkOut: '16:00',
      workHours: '8:00',
      requiredHours: '8:00',
      shiftType: 'regular',
      status: 'present',
      notes: 'دوام رسمي كامل (8 ساعات: 08:00 - 16:00)',
      notesEn: 'Standard Shift (8 hours: 08:00 - 16:00)'
    },
    {
      date: '2026-08-18',
      day: 'الثلاثاء',
      checkIn: '08:00',
      checkOut: '16:00',
      workHours: '8:00',
      requiredHours: '8:00',
      shiftType: 'regular',
      status: 'present',
      notes: 'دوام رسمي كامل (8 ساعات: 08:00 - 16:00)',
      notesEn: 'Standard Shift (8 hours: 08:00 - 16:00)'
    },
    {
      date: '2026-08-17',
      day: 'الاثنين',
      checkIn: null,
      checkOut: null,
      workHours: '0:00',
      requiredHours: '8:00',
      shiftType: 'regular',
      status: 'absent',
      notes: 'إجازة اعتيادية معتمدة رسمياً',
      notesEn: 'Officially approved annual leave'
    },
    {
      date: '2026-08-16',
      day: 'الأحد',
      checkIn: '08:00',
      checkOut: '16:00',
      workHours: '8:00',
      requiredHours: '8:00',
      shiftType: 'regular',
      status: 'present',
      notes: 'دوام رسمي كامل (8 ساعات: 08:00 - 16:00)',
      notesEn: 'Standard Shift (8 hours: 08:00 - 16:00)'
    },
    {
      date: '2026-08-15',
      day: 'السبت',
      checkIn: null,
      checkOut: null,
      workHours: '0:00',
      requiredHours: '0:00',
      shiftType: 'weekend',
      status: 'weekend',
      notes: 'عطلة نهاية الأسبوع الرسمية',
      notesEn: 'Official Weekend Holiday'
    },
    {
      date: '2026-08-14',
      day: 'الجمعة',
      checkIn: null,
      checkOut: null,
      workHours: '0:00',
      requiredHours: '0:00',
      shiftType: 'weekend',
      status: 'weekend',
      notes: 'عطلة نهاية الأسبوع الرسمية',
      notesEn: 'Official Weekend Holiday'
    },
    {
      date: '2026-08-13',
      day: 'الخميس',
      checkIn: '08:00',
      checkOut: '15:00',
      workHours: '7:00',
      requiredHours: '7:00',
      shiftType: 'thursday',
      status: 'present',
      notes: 'دوام الخميس المقرر (7 ساعات: 08:00 - 15:00)',
      notesEn: 'Scheduled Thursday Shift (7 hours: 08:00 - 15:00)'
    },
    {
      date: '2026-08-12',
      day: 'الأربعاء',
      checkIn: '08:00',
      checkOut: '16:00',
      workHours: '8:00',
      requiredHours: '8:00',
      shiftType: 'regular',
      status: 'present',
      notes: 'دوام رسمي كامل (8 ساعات: 08:00 - 16:00)',
      notesEn: 'Standard Shift (8 hours: 08:00 - 16:00)'
    },
    {
      date: '2026-08-11',
      day: 'الثلاثاء',
      checkIn: '08:00',
      checkOut: '16:00',
      workHours: '8:00',
      requiredHours: '8:00',
      shiftType: 'regular',
      status: 'present',
      notes: 'دوام رسمي كامل (8 ساعات: 08:00 - 16:00)',
      notesEn: 'Standard Shift (8 hours: 08:00 - 16:00)'
    },
    {
      date: '2026-08-10',
      day: 'الاثنين',
      checkIn: '08:00',
      checkOut: '16:00',
      workHours: '8:00',
      requiredHours: '8:00',
      shiftType: 'regular',
      status: 'present',
      notes: 'دوام رسمي كامل (8 ساعات: 08:00 - 16:00)',
      notesEn: 'Standard Shift (8 hours: 08:00 - 16:00)'
    },
    {
      date: '2026-08-09',
      day: 'الأحد',
      checkIn: '08:00',
      checkOut: '16:00',
      workHours: '8:00',
      requiredHours: '8:00',
      shiftType: 'regular',
      status: 'present',
      notes: 'دوام رسمي كامل (8 ساعات: 08:00 - 16:00)',
      notesEn: 'Standard Shift (8 hours: 08:00 - 16:00)'
    },
    {
      date: '2026-08-08',
      day: 'السبت',
      checkIn: null,
      checkOut: null,
      workHours: '0:00',
      requiredHours: '0:00',
      shiftType: 'weekend',
      status: 'weekend',
      notes: 'عطلة نهاية الأسبوع الرسمية',
      notesEn: 'Official Weekend Holiday'
    },
    {
      date: '2026-08-07',
      day: 'الجمعة',
      checkIn: null,
      checkOut: null,
      workHours: '0:00',
      requiredHours: '0:00',
      shiftType: 'weekend',
      status: 'weekend',
      notes: 'عطلة نهاية الأسبوع الرسمية',
      notesEn: 'Official Weekend Holiday'
    },
    {
      date: '2026-08-06',
      day: 'الخميس',
      checkIn: '08:00',
      checkOut: '15:00',
      workHours: '7:00',
      requiredHours: '7:00',
      shiftType: 'thursday',
      status: 'present',
      notes: 'دوام الخميس المقرر (7 ساعات: 08:00 - 15:00)',
      notesEn: 'Scheduled Thursday Shift (7 hours: 08:00 - 15:00)'
    },
    {
      date: '2026-08-05',
      day: 'الأربعاء',
      checkIn: '08:00',
      checkOut: '16:00',
      workHours: '8:00',
      requiredHours: '8:00',
      shiftType: 'regular',
      status: 'present',
      notes: 'دوام رسمي كامل (8 ساعات: 08:00 - 16:00)',
      notesEn: 'Standard Shift (8 hours: 08:00 - 16:00)'
    },
    {
      date: '2026-08-04',
      day: 'الثلاثاء',
      checkIn: '08:00',
      checkOut: '16:00',
      workHours: '8:00',
      requiredHours: '8:00',
      shiftType: 'regular',
      status: 'present',
      notes: 'دوام رسمي كامل (8 ساعات: 08:00 - 16:00)',
      notesEn: 'Standard Shift (8 hours: 08:00 - 16:00)'
    },
    {
      date: '2026-08-03',
      day: 'الاثنين',
      checkIn: '08:00',
      checkOut: '16:00',
      workHours: '8:00',
      requiredHours: '8:00',
      shiftType: 'regular',
      status: 'present',
      notes: 'دوام رسمي كامل (8 ساعات: 08:00 - 16:00)',
      notesEn: 'Standard Shift (8 hours: 08:00 - 16:00)'
    },
    {
      date: '2026-08-02',
      day: 'الأحد',
      checkIn: '08:00',
      checkOut: '16:00',
      workHours: '8:00',
      requiredHours: '8:00',
      shiftType: 'regular',
      status: 'present',
      notes: 'دوام رسمي كامل (8 ساعات: 08:00 - 16:00)',
      notesEn: 'Standard Shift (8 hours: 08:00 - 16:00)'
    },
    {
      date: '2026-08-01',
      day: 'السبت',
      checkIn: null,
      checkOut: null,
      workHours: '0:00',
      requiredHours: '0:00',
      shiftType: 'weekend',
      status: 'weekend',
      notes: 'عطلة نهاية الأسبوع الرسمية',
      notesEn: 'Official Weekend Holiday'
    }
  ];

  // Work Hours Statistics matching Settings (8 hours Sunday-Wednesday, 7 hours Thursday)
  // Weekly total = 4 * 8 + 1 * 7 = 39 hours / 5 days = 7.8 hours / day (7 hours 48 minutes)
  const monthlyStats = {
    totalWorkdays: 22,
    presentDays: 18,
    lateDays: 1,
    absentDays: 1,
    weekendDays: 8,
    // (14 regular days * 8h) + (4 Thursdays * 7h) = 112 + 28 = 140 hours
    totalWorkHours: '140:13',
    // 39 hours / 5 days = 7.8 hrs = 7:48
    avgWorkHours: '7:48',
    complianceRate: '98%'
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
      case 'absent':
        return isDark
          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
          : 'bg-rose-50 text-rose-800 border-rose-300 font-bold';
      case 'weekend':
        return isDark
          ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
          : 'bg-blue-50 text-blue-800 border-blue-300 font-bold';
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
      case 'absent':
        return isEn ? 'Absent' : 'إجازة / غياب';
      case 'weekend':
        return isEn ? 'Weekend' : 'عطلة أسبوعية';
      default:
        return status;
    }
  };

  const getDayName = (dayAr: string) => {
    if (!isEn) return dayAr;
    const map: { [key: string]: string } = {
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
    return new Date(dateString).toLocaleDateString(isEn ? 'en-US' : 'ar-IQ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

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
              {isEn ? 'Daily punch records and worked hours' : 'كشوفات البصمة وساعات الدوام الفعلية'}
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

      {/* Official Shift Schedule Rule Banner (Explaining 8h daily / 7h Thursday) */}
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
            {isEn ? `Out of ${monthlyStats.totalWorkdays} workdays` : `من أصل ${monthlyStats.totalWorkdays} يوم عمل`}
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
            {isEn ? 'Late past 08:00 AM' : 'تأخير بعد 08:00 صباحاً'}
          </p>
        </div>

        <div className={`p-3.5 rounded-2xl border ${
          isDark ? 'bg-gradient-to-br from-rose-950/30 to-slate-900 border-rose-500/30' : 'bg-rose-50/70 border-rose-300 shadow-xs'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="material-symbols-outlined text-rose-600 text-lg">cancel</span>
            <span className="text-[10px] font-black text-rose-700 dark:text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded-full">
              {isEn ? 'Leave' : 'إجازة'}
            </span>
          </div>
          <p className="text-xl font-black text-rose-600 dark:text-rose-400">
            {monthlyStats.absentDays} {isEn ? 'Day' : 'يوم'}
          </p>
          <p className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
            {isEn ? 'Approved annual leave' : 'إجازة اعتيادية معتمدة'}
          </p>
        </div>

        <div className={`p-3.5 rounded-2xl border ${
          isDark ? 'bg-gradient-to-br from-blue-950/30 to-slate-900 border-blue-500/30' : 'bg-blue-50/70 border-blue-300 shadow-xs'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="material-symbols-outlined text-blue-600 text-lg">weekend</span>
            <span className="text-[10px] font-black text-blue-700 dark:text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded-full">
              {isEn ? 'Weekend' : 'عطلة'}
            </span>
          </div>
          <p className="text-xl font-black text-blue-600 dark:text-blue-400">
            {monthlyStats.weekendDays} {isEn ? 'Days' : 'أيام'}
          </p>
          <p className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
            {isEn ? 'Fri & Sat holidays' : 'عطلات الجمعة والسبت'}
          </p>
        </div>
      </div>

      {/* Monthly Summary Bar (Correct 7:48 hrs/day reflecting 8h regular & 7h Thursday) */}
      <div className={`p-4 rounded-3xl border ${
        isDark ? 'bg-[#131b2e] border-slate-800 text-white' : 'bg-white border-slate-300 shadow-xs text-slate-900'
      }`}>
        <div className="flex items-center justify-between text-xs font-black mb-2">
          <span>{isEn ? 'Total Monthly Worked Hours' : 'إجمالي ساعات العمل المحققة للشهر'}</span>
          <span className="text-teal-600 dark:text-teal-400 font-mono text-sm">
            {monthlyStats.totalWorkHours} {isEn ? 'hours' : 'ساعة'}
          </span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700/40 h-2.5 rounded-full overflow-hidden">
          <div className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full" style={{ width: '98%' }}></div>
        </div>
        <div className="flex justify-between items-center text-[10px] text-slate-700 dark:text-slate-400 font-bold mt-2">
          <span className="flex items-center gap-1">
            <span className="font-black text-slate-900 dark:text-white">
              {isEn ? `Daily Avg: ${monthlyStats.avgWorkHours} hrs/day` : `المعدل اليومي: ${monthlyStats.avgWorkHours} ساعة/يوم`}
            </span>
            <span className="text-[9px] text-teal-700 dark:text-teal-400 font-black">
              {isEn ? '(8h daily / Thu 7h)' : '(8 س يومياً / الخميس 7 س)'}
            </span>
          </span>
          <span className="text-emerald-700 dark:text-emerald-400 font-black">
            {isEn ? `${monthlyStats.complianceRate} Compliance` : `التزام ${monthlyStats.complianceRate}`}
          </span>
        </div>
      </div>

      {/* Daily Attendance Cards (Mobile Log List - Sorted with LATEST RECORD AT TOP) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h3 className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-800'}`}>
              {isEn ? 'Daily Attendance History (Latest at Top)' : 'سجل الدوام اليومي (أحدث سجل في الأعلى)'}
            </h3>
          </div>
          <span className="text-[11px] text-teal-700 dark:text-teal-400 font-black">
            {mockAttendanceData.length} {isEn ? 'records' : 'سجلات'}
          </span>
        </div>

        <div className="space-y-2.5">
          {mockAttendanceData.map((record, index) => {
            const isThursday = record.day === 'الخميس';
            return (
              <div
                key={index}
                className={`p-3.5 rounded-2xl border transition-all ${
                  record.status === 'present'
                    ? isDark ? 'bg-[#131b2e] border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-xs'
                    : record.status === 'late'
                    ? isDark ? 'bg-amber-950/20 border-amber-500/30 text-white' : 'bg-amber-50/70 border-amber-300 text-slate-900 shadow-xs'
                    : record.status === 'absent'
                    ? isDark ? 'bg-rose-950/20 border-rose-500/30 text-white' : 'bg-rose-50/70 border-rose-300 text-slate-900 shadow-xs'
                    : isDark ? 'bg-slate-900/50 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 shadow-xs'
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
                    {isThursday && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                        {isEn ? 'Thursday (7h)' : 'الخميس (7 ساعات)'}
                      </span>
                    )}
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${getStatusBadge(record.status)}`}>
                    {getStatusText(record.status)}
                  </span>
                </div>

                {record.status !== 'weekend' && record.status !== 'absent' ? (
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
                      <span className="font-mono font-black text-blue-600 dark:text-blue-400">{record.checkOut || '--:--'}</span>
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
                      <span className={`font-mono font-black ${isDark ? 'text-teal-400' : 'text-teal-800'}`}>
                        {record.workHours} {isEn ? 'h' : 'س'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className={`text-xs italic font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                    {isEn ? record.notesEn : record.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};