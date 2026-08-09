import React, { useState } from 'react';
import { useEmployeeContext } from '../context/EmployeeContext';

interface EmployeeAttendanceProps {
  employee: any;
  onLogout: () => void;
}

export const EmployeeAttendance: React.FC<EmployeeAttendanceProps> = ({ employee, onLogout }) => {
  const { theme, toggleTheme } = useEmployeeContext();
  const isDark = theme === 'dark';
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // بيانات الحضور التجريبية
  const mockAttendanceData = [
    {
      date: '2026-08-01',
      day: 'الخميس',
      checkIn: '08:05',
      checkOut: '16:45',
      workHours: '8:40',
      status: 'present',
      notes: ''
    },
    {
      date: '2026-08-02',
      day: 'الجمعة',
      checkIn: null,
      checkOut: null,
      workHours: '0:00',
      status: 'weekend',
      notes: 'عطلة نهاية الأسبوع'
    },
    {
      date: '2026-08-03',
      day: 'السبت',
      checkIn: null,
      checkOut: null,
      workHours: '0:00',
      status: 'weekend',
      notes: 'عطلة نهاية الأسبوع'
    },
    {
      date: '2026-08-04',
      day: 'الأحد',
      checkIn: '08:00',
      checkOut: '16:30',
      workHours: '8:30',
      status: 'present',
      notes: ''
    },
    {
      date: '2026-08-05',
      day: 'الاثنين',
      checkIn: '08:15',
      checkOut: '16:50',
      workHours: '8:35',
      status: 'late',
      notes: 'تأخير 15 دقيقة'
    },
    {
      date: '2026-08-06',
      day: 'الثلاثاء',
      checkIn: '07:55',
      checkOut: '16:40',
      workHours: '8:45',
      status: 'present',
      notes: ''
    },
    {
      date: '2026-08-07',
      day: 'الأربعاء',
      checkIn: null,
      checkOut: null,
      workHours: '0:00',
      status: 'absent',
      notes: 'إجازة مرضية'
    },
    {
      date: '2026-08-08',
      day: 'الخميس',
      checkIn: '08:00',
      checkOut: '16:35',
      workHours: '8:35',
      status: 'present',
      notes: ''
    }
  ];

  const monthlyStats = {
    totalDays: 22,
    presentDays: 18,
    absentDays: 1,
    lateDays: 1,
    weekendDays: 4,
    totalWorkHours: '148:30',
    avgWorkHours: '8:15'
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return isDark
          ? 'bg-green-500/20 text-green-400 border-green-500/30'
          : 'bg-green-100 text-green-700 border-green-300';
      case 'late':
        return isDark
          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
          : 'bg-amber-100 text-amber-700 border-amber-300';
      case 'absent':
        return isDark
          ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
          : 'bg-rose-100 text-rose-700 border-rose-300';
      case 'weekend':
        return isDark
          ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
          : 'bg-blue-100 text-blue-700 border-blue-300';
      default:
        return isDark
          ? 'bg-slate-700 text-slate-300 border-slate-600'
          : 'bg-slate-200 text-slate-700 border-slate-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'present':
        return 'حاضر';
      case 'late':
        return 'متأخر';
      case 'absent':
        return 'غائب';
      case 'weekend':
        return 'عطلة';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-IQ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getCurrentMonthStats = () => {
    const present = mockAttendanceData.filter(d => d.status === 'present').length;
    const late = mockAttendanceData.filter(d => d.status === 'late').length;
    const absent = mockAttendanceData.filter(d => d.status === 'absent').length;
    const weekend = mockAttendanceData.filter(d => d.status === 'weekend').length;
    
    return {
      present,
      late,
      absent,
      weekend,
      total: present + late + absent + weekend
    };
  };

  const currentStats = getCurrentMonthStats();

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-5">
      {/* Mobile Top Navigation & Month Selector */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">schedule</span>
          </div>
          <div>
            <h1 className={`text-base font-black leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              سجل الدوام والبصصمات
            </h1>
            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              تتبع كشوفات البصمة وساعات العمل
            </p>
          </div>
        </div>

        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className={`px-3 py-1.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors ${
            isDark 
              ? 'border-slate-700 bg-slate-800 text-white' 
              : 'border-slate-300 bg-white text-slate-900'
          }`}
        />
      </div>

      {/* Stats Grid 2x2 */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className={`p-3.5 rounded-2xl border ${
          isDark ? 'bg-gradient-to-br from-emerald-950/30 to-slate-900 border-emerald-500/30' : 'bg-emerald-50/70 border-emerald-200'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">حضور</span>
          </div>
          <p className="text-xl font-black text-emerald-500">{currentStats.present} أيام</p>
          <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>من أصل {currentStats.total} يوم عمل</p>
        </div>

        <div className={`p-3.5 rounded-2xl border ${
          isDark ? 'bg-gradient-to-br from-amber-950/30 to-slate-900 border-amber-500/30' : 'bg-amber-50/70 border-amber-200'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="material-symbols-outlined text-amber-500 text-lg">schedule</span>
            <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">تأخير</span>
          </div>
          <p className="text-xl font-black text-amber-500">{currentStats.late} يوم</p>
          <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>تأخير عن 08:00 صباحاً</p>
        </div>

        <div className={`p-3.5 rounded-2xl border ${
          isDark ? 'bg-gradient-to-br from-rose-950/30 to-slate-900 border-rose-500/30' : 'bg-rose-50/70 border-rose-200'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="material-symbols-outlined text-rose-500 text-lg">cancel</span>
            <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">غياب</span>
          </div>
          <p className="text-xl font-black text-rose-500">{currentStats.absent} يوم</p>
          <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>إجازة مرضية / غياب</p>
        </div>

        <div className={`p-3.5 rounded-2xl border ${
          isDark ? 'bg-gradient-to-br from-blue-950/30 to-slate-900 border-blue-500/30' : 'bg-blue-50/70 border-blue-200'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="material-symbols-outlined text-blue-500 text-lg">weekend</span>
            <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full">عطلة</span>
          </div>
          <p className="text-xl font-black text-blue-500">{currentStats.weekend} أيام</p>
          <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>عطلات الجمعة والسبت</p>
        </div>
      </div>

      {/* Monthly Summary Bar */}
      <div className={`p-4 rounded-3xl border ${
        isDark ? 'bg-[#131b2e] border-slate-800 text-white' : 'bg-white border-slate-200 shadow-xs text-slate-900'
      }`}>
        <div className="flex items-center justify-between text-xs font-bold mb-2">
          <span>إجمالي ساعات عمل الشهر</span>
          <span className="text-teal-500 font-mono">{monthlyStats.totalWorkHours} ساعة</span>
        </div>
        <div className="w-full bg-slate-700/20 h-2.5 rounded-full overflow-hidden">
          <div className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full" style={{ width: '85%' }}></div>
        </div>
        <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5">
          <span>المعدل اليومي: {monthlyStats.avgWorkHours} ساعة/يوم</span>
          <span className="text-emerald-500 font-bold">التزام 95%</span>
        </div>
      </div>

      {/* Daily Attendance Cards (Mobile Log List) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            سجل أيام الشهر اليومي
          </h3>
          <span className="text-[11px] text-teal-500 font-bold">{mockAttendanceData.length} سجلات</span>
        </div>

        <div className="space-y-2.5">
          {mockAttendanceData.map((record, index) => (
            <div
              key={index}
              className={`p-3.5 rounded-2xl border transition-all ${
                record.status === 'present'
                  ? isDark ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                  : record.status === 'late'
                  ? isDark ? 'bg-amber-950/20 border-amber-500/30' : 'bg-amber-50/60 border-amber-200'
                  : record.status === 'absent'
                  ? isDark ? 'bg-rose-950/20 border-rose-500/30' : 'bg-rose-50/60 border-rose-200'
                  : isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black">{record.day}</span>
                  <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{formatDate(record.date)}</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(record.status)}`}>
                  {getStatusText(record.status)}
                </span>
              </div>

              {record.status !== 'weekend' && record.status !== 'absent' ? (
                <div className="grid grid-cols-3 gap-2 bg-slate-800/10 dark:bg-slate-900/40 p-2 rounded-xl text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">الدخول</span>
                    <span className="font-mono font-bold text-emerald-500">{record.checkIn || '--:--'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">الخروج</span>
                    <span className="font-mono font-bold text-blue-500">{record.checkOut || '--:--'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">المدة</span>
                    <span className="font-mono font-bold text-teal-400">{record.workHours} س</span>
                  </div>
                </div>
              ) : (
                <p className={`text-xs italic ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {record.notes || 'لا يوجد بصمة مسجلة لهذا اليوم'}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};