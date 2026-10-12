import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Employee } from '../types';
import { 
  Clock, 
  CreditCard, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Printer, 
  ShieldCheck, 
  DollarSign, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  User,
  Check,
  Award
} from 'lucide-react';

type TabType = 'profile' | 'attendance' | 'payroll' | 'leave' | 'evaluation';

interface EmployeePortalProps {
  embedded?: boolean;
  employee?: Employee;
}

export const EmployeePortal: React.FC<EmployeePortalProps> = ({ embedded = false, employee }) => {
  const { employees, t, language, theme, currentUser } = useApp();
  const isDark = theme === 'dark';

  const [isLoggedIn, setIsLoggedIn] = useState(embedded);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(employee || null);
  const [badgeNumber, setBadgeNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [punchedToday, setPunchedToday] = useState(true);
  const [punchToast, setPunchToast] = useState<string | null>(null);
  const [selectedPayslipIndex, setSelectedPayslipIndex] = useState(0);

  // Leaves & Attendance State for Employee
  const [liveClockTime, setLiveClockTime] = useState<string>(() => {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  });
  const [isSyncingAttendance, setIsSyncingAttendance] = useState(false);
  const [showApplyLeaveModal, setShowApplyLeaveModal] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [showLeaveHistoryTable, setShowLeaveHistoryTable] = useState(false);

  const [todayAttendanceState, setTodayAttendanceState] = useState({
    scheduled_start: '08:00',
    scheduled_end: '16:00',
    check_in: '07:55',
    check_out: '16:15',
    worked_hours: '8.35 hrs',
    status: 'present'
  });

  const empKey = selectedEmployee?.badgeNo || selectedEmployee?.employeeId || selectedEmployee?.id || 'default';
  const [leaveBalances, setLeaveBalances] = useState(() => {
    try {
      const saved = localStorage.getItem(`vitas_emp_leave_balances_${empKey}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      annual: { available: 17, entitled: 21 },
      sick: { available: 13, entitled: 14 },
      emergency: { available: 5, entitled: 5 }
    };
  });

  const [myLeaveRequests, setMyLeaveRequests] = useState<Array<{
    id: string;
    type: string;
    typeEn: string;
    startDate: string;
    endDate: string;
    days: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    appliedDate: string;
  }>>(() => {
    try {
      const saved = localStorage.getItem(`vitas_emp_leave_requests_${empKey}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'LV-2026-0012',
        type: 'إجازة سنوية',
        typeEn: 'Annual Leave',
        startDate: '2026-08-08',
        endDate: '2026-08-11',
        days: 4,
        reason: 'إجازة سنوية مجدولة مسبقاً بعد إغلاق الحسابات النصف سنوية',
        status: 'approved',
        appliedDate: '2026-08-01'
      },
      {
        id: 'LV-2026-0005',
        type: 'إجازة طارئة',
        typeEn: 'Emergency Leave',
        startDate: '2026-06-14',
        endDate: '2026-06-14',
        days: 1,
        reason: 'ظرف عائلي طارئ',
        status: 'approved',
        appliedDate: '2026-06-14'
      }
    ];
  });

  const [newLeaveForm, setNewLeaveForm] = useState({
    leaveType: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
    isEmergency: false
  });

  const [correctionForm, setCorrectionForm] = useState({
    date: new Date().toISOString().split('T')[0],
    requestedIn: '08:00',
    requestedOut: '16:00',
    reason: ''
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveClockTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (embedded) {
      setIsLoggedIn(true);
      if (employee) {
        setSelectedEmployee(employee);
      } else if (currentUser) {
        const cEmpId = String(currentUser.employeeId || currentUser.id || '').trim().toLowerCase();
        const cBadge = String(currentUser.badgeNo || '').trim().toLowerCase();
        const matched = employees.find(emp => {
          const eId = String(emp.employeeId || emp.id || '').trim().toLowerCase();
          const bNo = String(emp.badgeNo || '').trim().toLowerCase();
          return (cEmpId && (eId === cEmpId || bNo === cEmpId)) || (cBadge && (bNo === cBadge || eId === cBadge));
        });
        if (matched) {
          setSelectedEmployee(matched);
        } else {
          setSelectedEmployee({
            id: currentUser.id || 'admin',
            employeeId: currentUser.employeeId || 'admin',
            badgeNo: currentUser.badgeNo || 'admin',
            fullName: currentUser.name || 'مدير النظام (Super Admin)',
            email: currentUser.email || 'admin@vitasiraq.iq',
            phone: '',
            department: 'الإدارة العليا',
            jobTitle: currentUser.role || 'Super Admin',
            branch: 'المقر الرئيسي - بغداد',
            joinDate: new Date().toISOString(),
            salary: 2200000,
            status: 'Active' as const
          });
        }
      }
    }
  }, [embedded, employee, currentUser, employees]);

  // Handle login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    // Check for super admin login
    if (badgeNumber === 'admin' && password === 'admin') {
      // Create a mock super admin user
      const superAdmin: Employee = {
        id: '0',
        employeeId: 'admin',
        badgeNo: 'admin',
        fullName: 'مدير النظام (Super Admin)',
        email: 'admin@vitasiraq.iq',
        phone: '',
        department: 'الإدارة العليا',
        jobTitle: 'Super Admin',
        branch: 'المقر الرئيسي',
        joinDate: new Date().toISOString(),
        salary: 0,
        status: 'Active' as const
      };
      setSelectedEmployee(superAdmin);
      setIsLoggedIn(true);
      setLoginError('');
      return;
    }

    const cleanInput = badgeNumber.trim().toLowerCase();
    const cleanInputAlpha = cleanInput.replace(/[^a-z0-9]/g, '');

    if (!cleanInput) {
      setLoginError(language === 'en' ? 'Please enter badge number' : 'يرجى إدخال رقم البادج أو معرف الموظف');
      return;
    }

    // Match against real employees list from Context
    const matched = employees && employees.length > 0
      ? employees.find(emp => {
          const bNo = String(emp.badgeNo || emp.badge_no || '').trim().toLowerCase();
          const eId = String(emp.employeeId || emp.employee_id || emp.id || '').trim().toLowerCase();
          const bNoAlpha = bNo.replace(/[^a-z0-9]/g, '');
          const eIdAlpha = eId.replace(/[^a-z0-9]/g, '');

          return (
            bNo === cleanInput ||
            eId === cleanInput ||
            (cleanInputAlpha && bNoAlpha === cleanInputAlpha) ||
            (cleanInputAlpha && eIdAlpha === cleanInputAlpha) ||
            (cleanInputAlpha && (bNoAlpha.includes(cleanInputAlpha) || cleanInputAlpha.includes(bNoAlpha))) ||
            (cleanInputAlpha && (eIdAlpha.includes(cleanInputAlpha) || cleanInputAlpha.includes(eIdAlpha))) ||
            (emp.email && emp.email.toLowerCase().includes(cleanInput))
          );
        })
      : null;

    if (matched) {
      setSelectedEmployee(matched);
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      const fallbackEmp: Employee = {
        id: cleanInputAlpha || '5245',
        employeeId: `VTS-${cleanInput.toUpperCase()}`,
        badgeNo: badgeNumber.trim(),
        fullName: `الموظف (${badgeNumber.trim()})`,
        email: `${cleanInputAlpha}@vitasiraq.com`,
        phone: '07700000000',
        department: 'قسم العمليات والائتمان',
        jobTitle: 'مسؤول ائتمان',
        branch: 'الإدارة العامة - بغداد',
        joinDate: '2022-01-01',
        salary: 1200000,
        status: 'Active' as const
      };
      setSelectedEmployee(fallbackEmp);
      setIsLoggedIn(true);
      setLoginError('');
    }
  };

  // Handle logout
  const handleLogout = () => {
    setIsLoggedIn(false);
    setSelectedEmployee(null);
    setBadgeNumber('');
    setPassword('');
  };

  // Login form
  if (!isLoggedIn) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors ${
        isDark 
          ? 'bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white' 
          : 'bg-slate-100 text-slate-900'
      }`}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('بوابة الموظف الذاتية', 'Employee Self-Service Portal')}</h1>
            <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>{t('مؤسسة فيتاس العراق', 'VITAS Iraq')}</p>
          </div>

          <div className={`p-6 rounded-2xl border shadow-2xl w-full max-w-md mx-auto ${
            isDark ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-200'
          }`}>
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: isDark ? '#cbd5e1' : '#1e293b' }}>
                  {t('رقم البادج', 'Badge Number')}
                </label>
                <input
                  type="text"
                  value={badgeNumber}
                  onChange={(e) => setBadgeNumber(e.target.value)}
                  placeholder={t('أدخل رقم البادج', 'Enter Badge Number')}
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-normal focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    isDark ? 'bg-[#0a0c10] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: isDark ? '#cbd5e1' : '#1e293b' }}>
                  {t('كلمة المرور', 'Password')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('كلمة المرور', 'Password')}
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-normal focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    isDark ? 'bg-[#0a0c10] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm font-bold">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm transition-all shadow-lg shadow-teal-600/20"
              >
                {t('تسجيل الدخول', 'Login')}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Main portal content
  const portalContent = (
    <>
      {!embedded && (
        <div className={`flex items-center justify-between mb-8 pb-4 border-b ${
          isDark ? 'border-white/10' : 'border-slate-300'
        }`}>
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {t('بوابة الموظف الذاتية', 'Employee Self-Service Portal')}
            </h1>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{selectedEmployee?.fullName}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-md shadow-rose-600/20"
          >
            {t('تسجيل الخروج', 'Logout')}
          </button>
        </div>
      )}

      {/* Toast notification */}
      {punchToast && (
        <div className="mb-4 p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-400 text-sm font-bold flex items-center gap-2 transition-all">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{punchToast}</span>
        </div>
      )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            {t('الملف الشخصي', 'Profile')}
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'attendance'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            {t('الحضور', 'Attendance')}
          </button>
          <button
            onClick={() => setActiveTab('payroll')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'payroll'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            {t('الرواتب', 'Payroll')}
          </button>
          <button
            onClick={() => setActiveTab('leave')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'leave'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            {t('الإجازات', 'Leave')}
          </button>
          <button
            onClick={() => setActiveTab('evaluation')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'evaluation'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            {t('التقييم الذاتي', 'Self Evaluation')}
          </button>
        </div>

        {/* Content */}
        <div className={`p-6 rounded-2xl border shadow-xl ${
          isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          {/* 1. Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {t('معلومات الموظف', 'Employee Information')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('الاسم الكامل', 'Full Name')}</label>
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedEmployee?.fullName}</p>
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('رقم الموظف', 'Employee ID')}</label>
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedEmployee?.employeeId}</p>
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('رقم البادج', 'Badge Number')}</label>
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedEmployee?.badgeNo}</p>
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('القسم', 'Department')}</label>
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedEmployee?.department}</p>
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('المسمى الوظيفي', 'Job Title')}</label>
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedEmployee?.jobTitle}</p>
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('الفرع ومقر العمل', 'Branch / Location')}</label>
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedEmployee?.branch || t('المقر الرئيسي - بغداد', 'Headquarters - Baghdad')}</p>
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('البريد الإلكتروني', 'Email')}</label>
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedEmployee?.email}</p>
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('رقم الهاتف', 'Phone')}</label>
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedEmployee?.phone || '07700000000'}</p>
                </div>
              </div>
            </div>
          )}

          {/* 2. Attendance Tab */}
          {activeTab === 'attendance' && (() => {
            const handleQuickPunch = () => {
              const now = new Date();
              const timeStr = now.toLocaleTimeString(language === 'ar' ? 'ar-IQ' : 'en-US', { hour: '2-digit', minute: '2-digit' });
              if (punchedToday) {
                setPunchedToday(false);
                setPunchToast(language === 'ar' ? `تم تسجيل الانصراف بنجاح الساعة ${timeStr}` : `Clocked out successfully at ${timeStr}`);
              } else {
                setPunchedToday(true);
                setPunchToast(language === 'ar' ? `تم تسجيل الحضور بنجاح الساعة ${timeStr}` : `Clocked in successfully at ${timeStr}`);
              }
              setTimeout(() => setPunchToast(null), 3500);
            };

            const attendanceLogs = [
              { date: '2026-10-12', day: language === 'ar' ? 'الإثنين' : 'Monday', checkIn: '08:05 ص', checkOut: punchedToday ? '--:--' : '04:30 م', hours: punchedToday ? '4:25' : '8:25', status: 'present', note: punchedToday ? (language === 'ar' ? 'دوام فعلي (جاري)' : 'In progress') : (language === 'ar' ? 'مكتمل' : 'Completed') },
              { date: '2026-10-11', day: language === 'ar' ? 'الأحد' : 'Sunday', checkIn: '08:00 ص', checkOut: '04:30 م', hours: '8:30', status: 'present', note: language === 'ar' ? 'مكتمل' : 'Completed' },
              { date: '2026-10-10', day: language === 'ar' ? 'السبت' : 'Saturday', checkIn: '--:--', checkOut: '--:--', hours: '0:00', status: 'weekend', note: language === 'ar' ? 'عطلة أسبوعية' : 'Weekend' },
              { date: '2026-10-09', day: language === 'ar' ? 'الجمعة' : 'Friday', checkIn: '--:--', checkOut: '--:--', hours: '0:00', status: 'weekend', note: language === 'ar' ? 'عطلة أسبوعية' : 'Weekend' },
              { date: '2026-10-08', day: language === 'ar' ? 'الخميس' : 'Thursday', checkIn: '08:18 ص', checkOut: '04:45 م', hours: '8:27', status: 'late', note: language === 'ar' ? 'تأخير 18 دقيقة' : 'Late 18 min' },
              { date: '2026-10-07', day: language === 'ar' ? 'الأربعاء' : 'Wednesday', checkIn: '07:55 ص', checkOut: '04:30 م', hours: '8:35', status: 'present', note: language === 'ar' ? 'مكتمل' : 'Completed' },
              { date: '2026-10-06', day: language === 'ar' ? 'الثلاثاء' : 'Tuesday', checkIn: '08:00 ص', checkOut: '04:30 م', hours: '8:30', status: 'present', note: language === 'ar' ? 'مكتمل' : 'Completed' },
              { date: '2026-10-05', day: language === 'ar' ? 'الإثنين' : 'Monday', checkIn: '08:02 ص', checkOut: '04:32 م', hours: '8:30', status: 'present', note: language === 'ar' ? 'مكتمل' : 'Completed' },
            ];

            return (
              <div className="space-y-6">
                {/* Attendance Header & Today Punch */}
                <div className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-teal-600/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {t('سجل الحضور والانصراف', 'Attendance & Time Logs')}
                      </h2>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {t('حالة اليوم:', 'Today Status:')}{' '}
                        <span className={`font-bold ${punchedToday ? 'text-emerald-500' : 'text-amber-500'}`}>
                          {punchedToday ? t('مسجل حضور (08:05 ص)', 'Clocked In (08:05 AM)') : t('غير مسجل حضور / منصرف', 'Clocked Out')}
                        </span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleQuickPunch}
                    className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg ${
                      punchedToday 
                        ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20' 
                        : 'bg-teal-600 hover:bg-teal-500 shadow-teal-600/20'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    {punchedToday ? t('تسجيل انصراف فوري', 'Clock Out') : t('تسجيل حضور فوري', 'Clock In')}
                  </button>
                </div>

                {/* 4 Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="text-xs font-bold text-slate-400 mb-1">{t('أيام الحضور', 'Present Days')}</div>
                    <div className="text-2xl font-black text-emerald-500">21 <span className="text-xs font-normal text-slate-400">/ 22</span></div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">95.5% {t('نسبة الالتزام', 'Commitment')}</div>
                  </div>
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="text-xs font-bold text-slate-400 mb-1">{t('أيام التأخير', 'Late Arrivals')}</div>
                    <div className="text-2xl font-black text-amber-500">1 <span className="text-xs font-normal text-slate-400">{t('يوم', 'day')}</span></div>
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">{t('18 دقيقة إجمالي', '18 min total')}</div>
                  </div>
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="text-xs font-bold text-slate-400 mb-1">{t('الغياب والإجازات', 'Absences & Leaves')}</div>
                    <div className="text-2xl font-black text-sky-500">0 <span className="text-xs font-normal text-slate-400">{t('غياب', 'absence')}</span></div>
                    <div className="text-[11px] text-sky-600 dark:text-sky-400 mt-1">{t('سجل نظيف', 'Clean record')}</div>
                  </div>
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="text-xs font-bold text-slate-400 mb-1">{t('ساعات العمل الإجمالية', 'Total Work Hours')}</div>
                    <div className="text-2xl font-black text-teal-500">168:30 <span className="text-xs font-normal text-slate-400">{t('ساعة', 'hrs')}</span></div>
                    <div className="text-[11px] text-teal-600 dark:text-teal-400 mt-1">{t('متوسط 8.4 ساعة/يوم', 'Avg 8.4h/day')}</div>
                  </div>
                </div>

                {/* Attendance Records Table */}
                <div>
                  <h3 className={`text-sm font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {t('سجل الحضور لشهر تشرين الأول 2026', 'Attendance Log - October 2026')}
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-xs text-right">
                      <thead className={isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}>
                        <tr>
                          <th className="p-3 font-bold">{t('التاريخ', 'Date')}</th>
                          <th className="p-3 font-bold">{t('اليوم', 'Day')}</th>
                          <th className="p-3 font-bold">{t('الدخول', 'Check-In')}</th>
                          <th className="p-3 font-bold">{t('الخروج', 'Check-Out')}</th>
                          <th className="p-3 font-bold">{t('ساعات العمل', 'Hours')}</th>
                          <th className="p-3 font-bold">{t('الحالة', 'Status')}</th>
                          <th className="p-3 font-bold">{t('الملاحظات', 'Notes')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {attendanceLogs.map((log, idx) => (
                          <tr key={idx} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                            <td className="p-3 font-mono font-medium">{log.date}</td>
                            <td className="p-3">{log.day}</td>
                            <td className="p-3 font-mono text-emerald-500">{log.checkIn}</td>
                            <td className="p-3 font-mono text-slate-400">{log.checkOut}</td>
                            <td className="p-3 font-mono font-bold">{log.hours}</td>
                            <td className="p-3">
                              {log.status === 'present' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  {t('حاضر', 'Present')}
                                </span>
                              )}
                              {log.status === 'late' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  {t('تأخير', 'Late')}
                                </span>
                              )}
                              {log.status === 'weekend' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-500 border border-slate-500/20">
                                  {t('عطلة', 'Weekend')}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-slate-400">{log.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 3. Payroll Tab */}
          {/* 3. Payroll Tab */}
          {activeTab === 'payroll' && (() => {
            const rawSalary = Number(selectedEmployee?.salary) || (selectedEmployee?.employeeId === 'admin' ? 2200000 : 1350000);
            const basicSalary = selectedEmployee?.basicSalary ? Number(selectedEmployee.basicSalary) : Math.round(rawSalary * 0.72);
            const phoneAllowance = Number(selectedEmployee?.phoneAllowance ?? selectedEmployee?.phone_allowance ?? (rawSalary >= 2000000 ? 50000 : 0));
            const familyAllowance = Number(
              selectedEmployee?.familyAllowance ?? 
              selectedEmployee?.family_allowance ?? 
              (selectedEmployee?.maritalStatus === 'متأهل' || selectedEmployee?.maritalStatus === 'married' ? 100000 : (rawSalary >= 2000000 ? 100000 : 0))
            );
            const certAllowance = Number(selectedEmployee?.certificateAllowance ?? selectedEmployee?.certificate_allowance ?? (rawSalary >= 2000000 ? 114000 : 0));
            const transportAllowance = Number(selectedEmployee?.transportationFixed ?? selectedEmployee?.transportation_fixed ?? 100000);
            const knownAllowances = basicSalary + phoneAllowance + familyAllowance + certAllowance + transportAllowance;
            const performanceBonus = Math.max(0, rawSalary - knownAllowances) || (rawSalary >= 2000000 ? 252000 : 120000);
            const grossSalary = basicSalary + phoneAllowance + familyAllowance + certAllowance + transportAllowance + performanceBonus;
            const socialSecurityDeduction = Math.round(basicSalary * 0.05);
            const taxDeduction = Math.round(basicSalary * 0.03);
            const insuranceDeduction = 0;
            const loanDeduction = 0;
            const absenceDeduction = 0;
            const totalDeductions = socialSecurityDeduction + taxDeduction + insuranceDeduction + loanDeduction + absenceDeduction;
            const netSalary = grossSalary - totalDeductions;

            const handlePrint = () => {
              window.print();
            };

            const handleDownload = () => {
              setPunchToast(language === 'ar' ? 'جاري تجهيز وتحميل قسيمة الراتب PDF...' : 'Preparing and downloading payslip PDF...');
              setTimeout(() => setPunchToast(null), 3000);
            };

            const payslipHistory = [
              { 
                month: language === 'ar' ? 'تشرين الأول (أكتوبر) 2026' : 'October 2026', 
                shortMonth: language === 'ar' ? 'تشرين الأول 2026' : 'October 2026',
                gross: grossSalary, 
                net: netSalary, 
                date: '2026-10-28', 
                status: 'paid',
                basic: basicSalary,
                phone: phoneAllowance,
                family: familyAllowance,
                cert: certAllowance,
                transport: transportAllowance,
                bonus: performanceBonus,
                socialSecurity: socialSecurityDeduction,
                tax: taxDeduction,
                insurance: insuranceDeduction,
                loan: loanDeduction,
                absence: absenceDeduction,
                deductions: totalDeductions
              },
              { 
                month: language === 'ar' ? 'أيلول (سبتمبر) 2026' : 'September 2026', 
                shortMonth: language === 'ar' ? 'أيلول 2026' : 'September 2026',
                gross: grossSalary, 
                net: netSalary, 
                date: '2026-09-28', 
                status: 'paid',
                basic: basicSalary,
                phone: phoneAllowance,
                family: familyAllowance,
                cert: certAllowance,
                transport: transportAllowance,
                bonus: performanceBonus,
                socialSecurity: socialSecurityDeduction,
                tax: taxDeduction,
                insurance: insuranceDeduction,
                loan: loanDeduction,
                absence: absenceDeduction,
                deductions: totalDeductions
              },
              { 
                month: language === 'ar' ? 'آب (أغسطس) 2026' : 'August 2026', 
                shortMonth: language === 'ar' ? 'آب 2026' : 'August 2026',
                gross: grossSalary, 
                net: netSalary, 
                date: '2026-08-27', 
                status: 'paid',
                basic: basicSalary,
                phone: phoneAllowance,
                family: familyAllowance,
                cert: certAllowance,
                transport: transportAllowance,
                bonus: performanceBonus,
                socialSecurity: socialSecurityDeduction,
                tax: taxDeduction,
                insurance: insuranceDeduction,
                loan: loanDeduction,
                absence: absenceDeduction,
                deductions: totalDeductions
              },
            ];

            const activePayslip = payslipHistory[selectedPayslipIndex] || payslipHistory[0];

            return (
              <div className="space-y-6">
                {/* Payroll Hero Card (النافذة العليا) */}
                <div id="payroll-hero-card" className="p-6 rounded-2xl bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900 text-white shadow-xl relative overflow-hidden transition-all duration-300">
                  <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {t('مدفوع ومحوّل للحساب', 'Paid & Transferred')}
                        </span>
                        <span className="text-xs font-semibold" style={{ color: '#ffffff' }}>
                          {activePayslip.shortMonth}
                        </span>
                        {selectedPayslipIndex > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/30 text-teal-200 border border-teal-400/40">
                            {t('أرشيف سابق', 'Archived Payslip')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold mb-1" style={{ color: '#ffffff' }}>
                        {t('صافي الراتب المستحق', 'Net Salary Payable')} ({activePayslip.shortMonth})
                      </div>
                      <div className="text-3xl md:text-4xl font-black tracking-tight flex items-baseline gap-2">
                        <span className="font-mono font-black drop-shadow-sm" style={{ color: '#60a5fa' }}>
                          {activePayslip.net.toLocaleString('en-US')}
                        </span>
                        <span className="text-sm font-bold" style={{ color: '#ffffff' }}>
                          {t('دينار عراقي', 'IQD')}
                        </span>
                      </div>
                      <div className="text-[11px] font-medium mt-2" style={{ color: '#ffffff' }}>
                        {t('تاريخ الإيداع:', 'Disbursed:')} {activePayslip.date} • {t('عبر المصرف العراقي للتجارة (TBI)', 'Trade Bank of Iraq (TBI)')}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleDownload}
                        className="px-4 py-2.5 rounded-xl bg-teal-950/80 hover:bg-teal-950 text-white text-xs font-bold transition-all border border-teal-500/30 flex items-center gap-2 shadow-md cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-teal-300" />
                        <span className="text-white font-bold">{t('تحميل القسيمة (PDF)', 'Download Payslip (PDF)')}</span>
                      </button>
                      <button
                        onClick={handlePrint}
                        className="px-4 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold transition-all border border-teal-500/40 flex items-center gap-2 shadow-md cursor-pointer"
                      >
                        <Printer className="w-4 h-4 text-white" />
                        <span className="text-white font-bold">{t('طباعة القسيمة', 'Print Payslip')}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Salary Breakdown (Earnings vs Deductions) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Earnings Column */}
                  <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                        <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {t('المستحقات والبدلات', 'Earnings & Allowances')}
                        </h3>
                      </div>
                      <span className="text-xs font-bold text-emerald-500 font-mono">
                        +{activePayslip.gross.toLocaleString('en-US')} {t('د.ع', 'IQD')}
                      </span>
                    </div>
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">{t('الراتب الاسمي الفعلي', 'Basic Salary')}</span>
                        <span className="font-bold font-mono">{activePayslip.basic.toLocaleString('en-US')} {t('د.ع', 'IQD')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">{t('بدل الهاتف', 'Phone Allowance')}</span>
                        <span className="font-bold font-mono">{activePayslip.phone.toLocaleString('en-US')} {t('د.ع', 'IQD')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">{t('بدل الزوجية والأولاد', 'Family Allowance')}</span>
                        <span className="font-bold font-mono">{activePayslip.family.toLocaleString('en-US')} {t('د.ع', 'IQD')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">{t('بدل الشهادة', 'Certificate Allowance')}</span>
                        <span className="font-bold font-mono">{activePayslip.cert.toLocaleString('en-US')} {t('د.ع', 'IQD')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">{t('بدل النقل والسفر', 'Transportation Allowance')}</span>
                        <span className="font-bold font-mono">{activePayslip.transport.toLocaleString('en-US')} {t('د.ع', 'IQD')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">{t('الحوافز ومكافأة الأداء', 'Incentives & Performance Bonus')}</span>
                        <span className="font-bold font-mono text-emerald-500">+{activePayslip.bonus.toLocaleString('en-US')} {t('د.ع', 'IQD')}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center font-bold">
                        <span>{t('إجمالي الراتب الإجمالي (Gross)', 'Total Gross Salary')}</span>
                        <span className="font-mono text-teal-500">{activePayslip.gross.toLocaleString('en-US')} {t('د.ع', 'IQD')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions Column */}
                  <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <ArrowDownRight className="w-4 h-4 text-rose-500" />
                        <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {t('الاستقطاعات والتأمين', 'Deductions & Taxes')}
                        </h3>
                      </div>
                      <span className="text-xs font-bold text-rose-500 font-mono">
                        -{activePayslip.deductions.toLocaleString('en-US')} {t('د.ع', 'IQD')}
                      </span>
                    </div>
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">{t('استقطاع التقاعد والضمان الاجتماعي (5%)', 'Pension & Social Security (5%)')}</span>
                        <span className="font-bold font-mono text-rose-500">-{activePayslip.socialSecurity.toLocaleString('en-US')} {t('د.ع', 'IQD')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">{t('استقطاع ضريبة الدخل (3%)', 'Income Tax (3%)')}</span>
                        <span className="font-bold font-mono text-rose-500">-{activePayslip.tax.toLocaleString('en-US')} {t('د.ع', 'IQD')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">{t('قسط التأمين الصحي', 'Health Insurance')}</span>
                        <span className="font-bold font-mono text-slate-400">-{activePayslip.insurance.toLocaleString('en-US')} {t('د.ع', 'IQD')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">{t('استقطاع القروض والسلف', 'Loan Deduction')}</span>
                        <span className="font-bold font-mono text-slate-400">-{activePayslip.loan.toLocaleString('en-US')} {t('د.ع', 'IQD')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">{t('استقطاع الغيابات والجزاءات', 'Absence & Other Deductions')}</span>
                        <span className="font-bold font-mono text-slate-400">-{activePayslip.absence.toLocaleString('en-US')} {t('د.ع', 'IQD')}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center font-bold">
                        <span>{t('إجمالي الاستقطاعات', 'Total Deductions')}</span>
                        <span className="font-mono text-rose-500">-{activePayslip.deductions.toLocaleString('en-US')} {t('د.ع', 'IQD')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bank Account Information */}
                <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-600/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-400">{t('المصرف المحول إليه', 'Bank Name')}</div>
                      <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {selectedEmployee?.bankName || t('المصرف العراقي للتجارة (Trade Bank of Iraq)', 'Trade Bank of Iraq (TBI)')}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400">{t('رقم الآيبان (IBAN)', 'IBAN Number')}</div>
                    <div className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
                      {selectedEmployee?.iban || 'IQ44 TBIQ 0000 0012 3456 7890'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400">{t('طريقة الدفع', 'Payment Method')}</div>
                    <div className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                      {t('إيداع بنكي مباشر', 'Direct Bank Deposit')}
                    </div>
                  </div>
                </div>

                {/* Payslip History Archive */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {t('أرشيف كشوفات الرواتب السابقة', 'Previous Payslips Archive')}
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      {t('انقر على "View Details" لعرض بيانات أي شهر في النافذة العليا', 'Click "View Details" to show any month in top card')}
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className={`w-full text-xs ${language === 'en' ? 'text-left' : 'text-right'}`}>
                      <thead className={isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}>
                        <tr>
                          <th className={`p-3 font-bold ${language === 'en' ? 'text-left' : 'text-right'}`}>{t('الشهر والدفعة', 'Period')}</th>
                          <th className={`p-3 font-bold ${language === 'en' ? 'text-left' : 'text-right'}`}>{t('الراتب الإجمالي', 'Gross')}</th>
                          <th className={`p-3 font-bold ${language === 'en' ? 'text-left' : 'text-right'}`}>{t('صافي المستلم', 'Net Paid')}</th>
                          <th className={`p-3 font-bold ${language === 'en' ? 'text-left' : 'text-right'}`}>{t('تاريخ الصرف', 'Disbursed Date')}</th>
                          <th className={`p-3 font-bold ${language === 'en' ? 'text-left' : 'text-right'}`}>{t('الحالة', 'Status')}</th>
                          <th className="p-3 font-bold text-center">{t('الإجراء', 'Action')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {payslipHistory.map((p, idx) => (
                          <tr 
                            key={idx} 
                            className={`transition-colors ${
                              selectedPayslipIndex === idx
                                ? isDark ? 'bg-teal-950/40 border-r-4 border-r-teal-400' : 'bg-teal-50/70 border-r-4 border-r-teal-600'
                                : isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="p-3 font-bold flex items-center gap-2">
                              <span>{p.month}</span>
                              {selectedPayslipIndex === idx && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30">
                                  {t('معروض بالأعلى', 'Active in View')}
                                </span>
                              )}
                            </td>
                            <td className="p-3 font-mono">{p.gross.toLocaleString('en-US')} {t('د.ع', 'IQD')}</td>
                            <td className="p-3 font-mono font-bold text-emerald-500">{p.net.toLocaleString('en-US')} {t('د.ع', 'IQD')}</td>
                            <td className="p-3 font-mono text-slate-400">{p.date}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                {t('مدفوع', 'Paid')}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => {
                                  setSelectedPayslipIndex(idx);
                                  const heroCard = document.getElementById('payroll-hero-card');
                                  if (heroCard) {
                                    heroCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                  }
                                  setPunchToast(
                                    language === 'ar'
                                      ? `تم عرض بيانات كشف راتب شهر (${p.shortMonth}) في النافذة العليا بنجاح`
                                      : `Displaying payslip for ${p.shortMonth} in the top window`
                                  );
                                  setTimeout(() => setPunchToast(null), 3000);
                                }}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 mx-auto cursor-pointer shadow-xs ${
                                  selectedPayslipIndex === idx
                                    ? 'bg-teal-600 text-white shadow-teal-600/30 ring-2 ring-teal-400'
                                    : 'bg-teal-600/10 hover:bg-teal-600/25 text-teal-600 dark:text-teal-400 border border-teal-500/30'
                                }`}
                                title={language === 'ar' ? `عرض بيانات شهر ${p.shortMonth} في النافذة العليا` : `Show ${p.shortMonth} in top card`}
                              >
                                <span className="material-symbols-outlined text-sm">visibility</span>
                                <span>{t('عرض التفاصيل', 'View Details')}</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 4. Leave Tab - Matches Image 1 precisely, scoped to current employee */}
          {activeTab === 'leave' && (() => {
            const todayDateStr = new Date().toISOString().split('T')[0];

            // Department Bilingual Mapper
            const getDeptBilingual = () => {
              const raw = selectedEmployee?.department || 'قسم الائتمان';
              if (language === 'ar') return raw;
              const map: Record<string, string> = {
                'قسم الائتمان': 'Credit Department',
                'الائتمان': 'Credit Department',
                'قسم الاتئمان': 'Credit Department',
                'قسم العمليات والائتمان': 'Operations & Credit Department',
                'الموارد البشرية': 'Human Resources Department',
                'المعلوماتية والاتصالات': 'IT & Communications Department',
                'تكنولوجيا المعلومات': 'Information Technology Department',
                'المالية والمحاسبة': 'Finance & Accounting Department',
                'القسم المالي': 'Finance Department',
                'الإدارة العليا': 'Executive Management',
                'المشتريات والتسهيلات': 'Procurement & Facilities Department',
                'الأمن': 'Security Department',
                'قسم الأمن': 'Security Department'
              };
              return (selectedEmployee as any)?.departmentEn || map[raw] || raw;
            };

            // Position Bilingual Mapper
            const getPositionBilingual = () => {
              const raw = selectedEmployee?.jobTitle || 'حارس وصيانة';
              if (language === 'ar') return raw;
              const map: Record<string, string> = {
                'حارس وصيانة': 'Guard&Maintenance',
                'حارس و صيانة': 'Guard&Maintenance',
                'حارس أمن': 'Security Guard',
                'مسؤول ائتمان': 'Credit Officer',
                'أخصائي ائتمان': 'Loan Specialist',
                'محاسب أول': 'Senior Accountant',
                'مسؤول موارد بشرية': 'HR Officer',
                'Super Admin': 'Super Admin',
                'مدير النظام': 'Super Admin'
              };
              return (selectedEmployee as any)?.jobTitleEn || map[raw] || raw;
            };

            // Employee Name
            const empDisplayName = language === 'ar'
              ? (selectedEmployee?.fullName || 'وليد خالد اسماعيل البياتي')
              : ((selectedEmployee as any)?.fullNameEn || selectedEmployee?.fullName || 'Waleed Khalid Ismail Al Bayati');

            const handleSyncNow = () => {
              setIsSyncingAttendance(true);
              setTimeout(() => {
                setIsSyncingAttendance(false);
                setPunchToast(
                  language === 'ar'
                    ? 'تمت مزامنة سجلات الحضور بنجاح مع خادم البصمة البيومترية'
                    : 'Attendance records synchronized successfully with biometric server'
                );
                setTimeout(() => setPunchToast(null), 3500);
              }, 1200);
            };

            const handleApplyLeaveSubmit = (e: React.FormEvent) => {
              e.preventDefault();
              if (!newLeaveForm.startDate || !newLeaveForm.endDate) return;

              const start = new Date(newLeaveForm.startDate);
              const end = new Date(newLeaveForm.endDate);
              const diffTime = Math.max(0, end.getTime() - start.getTime());
              const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

              const typeNames: Record<string, { ar: string; en: string }> = {
                annual: { ar: 'إجازة سنوية', en: 'Annual Leave' },
                sick: { ar: 'إجازة مرضية', en: 'Sick Leave' },
                emergency: { ar: 'إجازة طارئة', en: 'Emergency Leave' },
                unpaid: { ar: 'إجازة بدون راتب', en: 'Unpaid Leave' }
              };

              const newReq = {
                id: `LV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
                type: typeNames[newLeaveForm.leaveType]?.ar || 'إجازة اعتيادية',
                typeEn: typeNames[newLeaveForm.leaveType]?.en || 'Annual Leave',
                startDate: newLeaveForm.startDate,
                endDate: newLeaveForm.endDate,
                days: daysCount,
                reason: newLeaveForm.reason || (language === 'ar' ? 'طلب إجازة شخصية' : 'Personal leave request'),
                status: 'pending' as const,
                appliedDate: todayDateStr
              };

              const updatedRequests = [newReq, ...myLeaveRequests];
              setMyLeaveRequests(updatedRequests);

              // Update balance
              if (newLeaveForm.leaveType === 'annual' && leaveBalances.annual.available >= daysCount) {
                const updatedBal = {
                  ...leaveBalances,
                  annual: { ...leaveBalances.annual, available: leaveBalances.annual.available - daysCount }
                };
                setLeaveBalances(updatedBal);
                localStorage.setItem(`vitas_emp_leave_balances_${empKey}`, JSON.stringify(updatedBal));
              } else if (newLeaveForm.leaveType === 'sick' && leaveBalances.sick.available >= daysCount) {
                const updatedBal = {
                  ...leaveBalances,
                  sick: { ...leaveBalances.sick, available: leaveBalances.sick.available - daysCount }
                };
                setLeaveBalances(updatedBal);
                localStorage.setItem(`vitas_emp_leave_balances_${empKey}`, JSON.stringify(updatedBal));
              } else if (newLeaveForm.leaveType === 'emergency' && leaveBalances.emergency.available >= daysCount) {
                const updatedBal = {
                  ...leaveBalances,
                  emergency: { ...leaveBalances.emergency, available: leaveBalances.emergency.available - daysCount }
                };
                setLeaveBalances(updatedBal);
                localStorage.setItem(`vitas_emp_leave_balances_${empKey}`, JSON.stringify(updatedBal));
              }

              localStorage.setItem(`vitas_emp_leave_requests_${empKey}`, JSON.stringify(updatedRequests));

              setShowApplyLeaveModal(false);
              setNewLeaveForm({
                leaveType: 'annual',
                startDate: '',
                endDate: '',
                reason: '',
                isEmergency: false
              });

              setPunchToast(
                language === 'ar'
                  ? `تم تقديم طلب الإجازة (${daysCount} أيام) بنجاح وبانتظار موافقة المدير`
                  : `Leave request for ${daysCount} days submitted successfully for approval`
              );
              setTimeout(() => setPunchToast(null), 4000);
            };

            const handleCorrectionSubmit = (e: React.FormEvent) => {
              e.preventDefault();
              setTodayAttendanceState(prev => ({
                ...prev,
                check_in: correctionForm.requestedIn || prev.check_in,
                check_out: correctionForm.requestedOut || prev.check_out
              }));
              setShowCorrectionModal(false);
              setPunchToast(
                language === 'ar'
                  ? 'تم إرسال طلب تصحيح البصمة إلى مسؤول الموارد البشرية بنجاح'
                  : 'Attendance correction request submitted to HR officer successfully'
              );
              setTimeout(() => setPunchToast(null), 4000);
            };

            return (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* 1. Top Banner with live clock and identity */}
                <div className={`p-6 sm:p-7 rounded-3xl border shadow-sm flex flex-wrap items-center justify-between gap-6 transition-all ${
                  isDark ? 'bg-[#0a0c10] border-white/10 shadow-xl' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-start gap-4">
                    <div className="w-13 h-13 rounded-2xl bg-teal-50 dark:bg-teal-500/20 border border-teal-200 dark:border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-sm shrink-0">
                      <span className="material-symbols-outlined text-2xl">space_dashboard</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-mono text-teal-700 dark:text-teal-400 uppercase tracking-widest font-bold bg-teal-50 dark:bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-200 dark:border-teal-500/20">
                          VITAS IRAQ HRIS • LEAVES & ATTENDANCE
                        </span>
                        <span className="text-xs text-slate-400 hidden sm:inline">•</span>
                        <span className="text-xs font-mono text-slate-500 dark:text-slate-400 hidden sm:inline font-semibold">
                          {todayDateStr}
                        </span>
                      </div>
                      <h1 className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {language === 'ar' ? `مرحباً، ${empDisplayName}` : `Welcome back, ${empDisplayName}`}
                      </h1>
                      <p className={`text-xs sm:text-sm font-medium mt-1 flex items-center gap-2 ${
                        isDark ? 'text-slate-300' : 'text-slate-600'
                      }`}>
                        <span>{getPositionBilingual()}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-teal-600 dark:text-teal-400 font-bold">{getDeptBilingual()}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Live digital clock pill */}
                    <div className={`px-4 py-2.5 rounded-2xl border font-mono text-xs sm:text-sm font-bold flex items-center gap-2 shadow-inner ${
                      isDark ? 'bg-slate-900/80 border-slate-700/80 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{liveClockTime}</span>
                    </div>

                    <button
                      onClick={() => setShowApplyLeaveModal(true)}
                      className="px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-600/20 transition-all flex items-center gap-2 border border-teal-400/40 cursor-pointer active:scale-95"
                    >
                      <span className="material-symbols-outlined text-base">edit_calendar</span>
                      <span>{t('تقديم طلب إجازة', 'Apply for Leave')}</span>
                    </button>

                    <button
                      onClick={handleSyncNow}
                      disabled={isSyncingAttendance}
                      className={`px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-2 border cursor-pointer disabled:opacity-50 active:scale-95 ${
                        isDark 
                          ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-base text-teal-600 dark:text-teal-400 ${isSyncingAttendance ? 'animate-spin' : ''}`}>sync</span>
                      <span>{isSyncingAttendance ? t('جارٍ المزامنة...', 'Syncing...') : t('تحديث الحضور الآن', 'Sync Attendance Now')}</span>
                    </button>
                  </div>
                </div>

                {/* 2. High Level Attendance KPIs - Scoped to this Employee */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                  {/* Present */}
                  <div className={`p-4 rounded-2xl border shadow-xs transition-all hover:shadow-md hover:border-emerald-500/40 ${
                    isDark ? 'bg-[#121b2d] border-[#1f2d4a]' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
                      <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('حاضر', 'Present')}</span>
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <span className="material-symbols-outlined text-base">person_check</span>
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                      20
                    </div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1 flex items-center gap-1 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{language === 'ar' ? '41% نسبة الحضور' : '41% Attendance'}</span>
                    </div>
                  </div>

                  {/* Late */}
                  <div className={`p-4 rounded-2xl border shadow-xs transition-all hover:shadow-md hover:border-amber-500/40 ${
                    isDark ? 'bg-[#121b2d] border-[#1f2d4a]' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
                      <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('متأخر', 'Late')}</span>
                      <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <span className="material-symbols-outlined text-base">schedule</span>
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
                      10
                    </div>
                    <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 font-medium">
                      {t('تأخير صباحي', 'Morning Late')}
                    </div>
                  </div>

                  {/* On Leave */}
                  <div className={`p-4 rounded-2xl border shadow-xs transition-all hover:shadow-md hover:border-blue-500/40 ${
                    isDark ? 'bg-[#121b2d] border-[#1f2d4a]' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
                      <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('في إجازة', 'On Leave')}</span>
                      <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <span className="material-symbols-outlined text-base">event_available</span>
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
                      5
                    </div>
                    <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 font-medium">
                      {t('إجازات معتمدة', 'Approved Leaves')}
                    </div>
                  </div>

                  {/* Early Leave */}
                  <div className={`p-4 rounded-2xl border shadow-xs transition-all hover:shadow-md hover:border-purple-500/40 ${
                    isDark ? 'bg-[#121b2d] border-[#1f2d4a]' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
                      <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('خروج مبكر', 'Early Leave')}</span>
                      <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                        <span className="material-symbols-outlined text-base">output</span>
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">
                      5
                    </div>
                    <div className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 font-medium">
                      {t('خروج قبل الوقت', 'Early Out')}
                    </div>
                  </div>

                  {/* Missing Punch */}
                  <div className={`p-4 rounded-2xl border shadow-xs transition-all hover:shadow-md hover:border-rose-500/40 ${
                    isDark ? 'bg-[#121b2d] border-[#1f2d4a]' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
                      <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('بصمة مفقودة', 'Missing Punch')}</span>
                      <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        <span className="material-symbols-outlined text-base">warning</span>
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
                      4
                    </div>
                    <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-medium">
                      {t('بحاجة لتصحيح', 'Needs Correction')}
                    </div>
                  </div>

                  {/* Absent */}
                  <div className={`p-4 rounded-2xl border shadow-xs transition-all hover:shadow-md hover:border-slate-500/40 ${
                    isDark ? 'bg-[#121b2d] border-[#1f2d4a]' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
                      <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('غائب', 'Absent')}</span>
                      <div className="p-1.5 rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400">
                        <span className="material-symbols-outlined text-base">person_off</span>
                      </div>
                    </div>
                    <div className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      5
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                      {t('غائب بدون عذر', 'Unexcused')}
                    </div>
                  </div>
                </div>

                {/* 3. Main Grid: My Attendance Today + My Leave Balances */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Today's Personal Attendance Card */}
                  <div className={`lg:col-span-6 rounded-3xl border p-6 space-y-4 shadow-sm flex flex-col justify-between ${
                    isDark ? 'bg-[#121b2d] border-[#1f2d4a]' : 'bg-white border-slate-200'
                  }`}>
                    <div>
                      <div className={`flex items-center justify-between border-b pb-3 mb-4 ${
                        isDark ? 'border-[#1f2d4a]' : 'border-slate-100'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-teal-500">fingerprint</span>
                          <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {t('حضوري اليوم', 'My Attendance Today')}
                          </h2>
                        </div>
                        <button
                          onClick={() => setShowCorrectionModal(true)}
                          className="text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                          <span>{t('طلب تصحيح', 'Request Correction')}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
                        <div className={`p-3 rounded-2xl border ${
                          isDark ? 'bg-[#0c1322] border-[#1f2d4a]' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <span className="text-slate-400 block mb-1">{t('الوردية المجدولة', 'Scheduled Shift')}</span>
                          <span className={`font-mono font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            {todayAttendanceState.scheduled_start} - {todayAttendanceState.scheduled_end}
                          </span>
                        </div>
                        <div className={`p-3 rounded-2xl border ${
                          isDark ? 'bg-[#0c1322] border-[#1f2d4a]' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <span className="text-slate-400 block mb-1">{t('وقت الحضور', 'Check In')}</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {todayAttendanceState.check_in}
                          </span>
                        </div>
                        <div className={`p-3 rounded-2xl border ${
                          isDark ? 'bg-[#0c1322] border-[#1f2d4a]' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <span className="text-slate-400 block mb-1">{t('وقت الانصراف', 'Check Out')}</span>
                          <span className={`font-mono font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            {todayAttendanceState.check_out}
                          </span>
                        </div>
                        <div className={`p-3 rounded-2xl border ${
                          isDark ? 'bg-[#0c1322] border-[#1f2d4a]' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <span className="text-slate-400 block mb-1">{t('ساعات العمل', 'Worked Hours')}</span>
                          <span className="font-bold text-teal-600 dark:text-teal-400">
                            {todayAttendanceState.worked_hours}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Simulation Buttons */}
                    <div className={`pt-3 border-t ${isDark ? 'border-[#1f2d4a]' : 'border-slate-100'}`}>
                      <span className="text-[11px] text-slate-400 block mb-2 font-medium">
                        {t('تسجيل البصمة السريع:', 'Instant Live Punch Simulation:')}
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button
                          onClick={() => {
                            const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                            setTodayAttendanceState(prev => ({ ...prev, check_in: now }));
                            setPunchToast(language === 'ar' ? `تم تسجيل حضورك بنجاح (${now})` : `Punch In recorded at ${now}`);
                            setTimeout(() => setPunchToast(null), 3000);
                          }}
                          className="px-3 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                        >
                          <span className="material-symbols-outlined text-sm">login</span>
                          <span>{t('تسجيل حضور', 'Punch In')}</span>
                        </button>
                        <button
                          onClick={() => {
                            const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                            setTodayAttendanceState(prev => ({ ...prev, check_out: now }));
                            setPunchToast(language === 'ar' ? `تم تسجيل انصرافك بنجاح (${now})` : `Punch Out recorded at ${now}`);
                            setTimeout(() => setPunchToast(null), 3000);
                          }}
                          className="px-3 py-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                        >
                          <span className="material-symbols-outlined text-sm">logout</span>
                          <span>{t('تسجيل انصراف', 'Punch Out')}</span>
                        </button>
                        <button
                          onClick={() => {
                            setPunchToast(language === 'ar' ? 'تم تسجيل خروج للاستراحة' : 'Break Out recorded');
                            setTimeout(() => setPunchToast(null), 3000);
                          }}
                          className="px-3 py-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                        >
                          <span className="material-symbols-outlined text-sm">coffee</span>
                          <span>{t('خروج استراحة', 'Break Out')}</span>
                        </button>
                        <button
                          onClick={() => {
                            setPunchToast(language === 'ar' ? 'تم تسجيل عودة من الاستراحة' : 'Break In recorded');
                            setTimeout(() => setPunchToast(null), 3000);
                          }}
                          className="px-3 py-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                        >
                          <span className="material-symbols-outlined text-sm">work</span>
                          <span>{t('عودة للعمل', 'Break In')}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Leave Balances Card */}
                  <div className={`lg:col-span-6 rounded-3xl border p-6 space-y-4 shadow-sm flex flex-col justify-between ${
                    isDark ? 'bg-[#121b2d] border-[#1f2d4a]' : 'bg-white border-slate-200'
                  }`}>
                    <div>
                      <div className={`flex items-center justify-between border-b pb-3 mb-4 ${
                        isDark ? 'border-[#1f2d4a]' : 'border-slate-100'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-teal-500">account_balance_wallet</span>
                          <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {t('أرصدة إجازاتي', 'My Leave Balances')}
                          </h2>
                        </div>
                        <button
                          onClick={() => setShowApplyLeaveModal(true)}
                          className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">add</span>
                          <span>{t('تقديم طلب إجازة', 'Apply for Leave')}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Annual Leave */}
                        <div className={`p-3.5 rounded-2xl border space-y-2 hover:border-teal-500/30 transition-all ${
                          isDark ? 'bg-[#0c1322] border-[#1f2d4a]' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className={`font-bold text-xs truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                              {t('إجازة اعتيادية / سنوية', 'Annual Leave')}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400">
                              2026
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-black text-teal-600 dark:text-teal-400">
                              {leaveBalances.annual.available}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {t('من', 'of')} {leaveBalances.annual.entitled} {t('يوم', 'days')}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-teal-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, (leaveBalances.annual.available / (leaveBalances.annual.entitled || 1)) * 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Sick Leave */}
                        <div className={`p-3.5 rounded-2xl border space-y-2 hover:border-teal-500/30 transition-all ${
                          isDark ? 'bg-[#0c1322] border-[#1f2d4a]' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className={`font-bold text-xs truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                              {t('إجازة مرضية', 'Sick Leave')}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400">
                              2026
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-black text-teal-600 dark:text-teal-400">
                              {leaveBalances.sick.available}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {t('من', 'of')} {leaveBalances.sick.entitled} {t('يوم', 'days')}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-teal-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, (leaveBalances.sick.available / (leaveBalances.sick.entitled || 1)) * 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Emergency Leave */}
                        <div className={`p-3.5 rounded-2xl border space-y-2 hover:border-teal-500/30 transition-all ${
                          isDark ? 'bg-[#0c1322] border-[#1f2d4a]' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className={`font-bold text-xs truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                              {t('إجازة طارئة / اضطرارية', 'Emergency Leave')}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400">
                              2026
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-black text-teal-600 dark:text-teal-400">
                              {leaveBalances.emergency.available}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {t('من', 'of')} {leaveBalances.emergency.entitled} {t('يوم', 'days')}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-teal-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, (leaveBalances.emergency.available / (leaveBalances.emergency.entitled || 1)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick links under balances */}
                    <div className={`pt-3 border-t flex items-center justify-between text-xs ${
                      isDark ? 'border-[#1f2d4a]' : 'border-slate-100'
                    }`}>
                      <span className="text-slate-400">
                        {language === 'ar' 
                          ? `طلبات الإجازة المعلقة حالياً: ${myLeaveRequests.filter(r => r.status === 'pending').length}` 
                          : `Pending requests: ${myLeaveRequests.filter(r => r.status === 'pending').length}`}
                      </span>
                      <button
                        onClick={() => setShowLeaveHistoryTable(!showLeaveHistoryTable)}
                        className="text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <span>{showLeaveHistoryTable ? t('إخفاء السجل ▲', 'Hide History ▲') : t('سجل إجازاتي الكامل ←', 'Full Leave History →')}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. Full Leave History Section (Toggleable or always shown) */}
                {showLeaveHistoryTable && (
                  <div className={`rounded-3xl border p-6 space-y-4 shadow-sm animate-in fade-in duration-300 ${
                    isDark ? 'bg-[#121b2d] border-[#1f2d4a]' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between border-b pb-3 dark:border-[#1f2d4a] border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-teal-500">history_edu</span>
                        <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {t('سجل طلبات إجازاتي', 'My Leave Request History')}
                        </h2>
                      </div>
                      <span className="text-xs text-slate-400">
                        {t('إجمالي الطلبات:', 'Total requests:')} {myLeaveRequests.length}
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-[#1f2d4a]">
                      <table className="w-full text-xs text-right">
                        <thead className={isDark ? 'bg-slate-800/80 text-slate-300' : 'bg-slate-100 text-slate-700'}>
                          <tr>
                            <th className="p-3 font-bold">{t('رقم الطلب', 'Request ID')}</th>
                            <th className="p-3 font-bold">{t('نوع الإجازة', 'Leave Type')}</th>
                            <th className="p-3 font-bold">{t('الفترة', 'Period')}</th>
                            <th className="p-3 font-bold">{t('عدد الأيام', 'Days')}</th>
                            <th className="p-3 font-bold">{t('السبب', 'Reason')}</th>
                            <th className="p-3 font-bold">{t('الحالة', 'Status')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                          {myLeaveRequests.map((req) => (
                            <tr key={req.id} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                              <td className="p-3 font-mono font-bold text-teal-600 dark:text-teal-400">{req.id}</td>
                              <td className="p-3 font-semibold">{language === 'ar' ? req.type : req.typeEn}</td>
                              <td className="p-3 font-mono text-slate-400">{req.startDate} → {req.endDate}</td>
                              <td className="p-3 font-bold">{req.days} {t('يوم', 'days')}</td>
                              <td className="p-3 text-slate-500 dark:text-slate-400 max-w-xs truncate">{req.reason}</td>
                              <td className="p-3">
                                {req.status === 'approved' && (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    {t('معتمدة', 'Approved')}
                                  </span>
                                )}
                                {req.status === 'pending' && (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                    {t('قيد المراجعة', 'Pending')}
                                  </span>
                                )}
                                {req.status === 'rejected' && (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                    {t('مرفوضة', 'Rejected')}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 5. Modal: Apply for Leave */}
                {showApplyLeaveModal && (
                  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className={`w-full max-w-lg rounded-3xl p-6 border shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 ${
                      isDark ? 'bg-[#0f172a] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
                            <span className="material-symbols-outlined text-xl">edit_calendar</span>
                          </div>
                          <div>
                            <h3 className="text-base font-black">{t('تقديم طلب إجازة جديدة', 'Submit New Leave Request')}</h3>
                            <p className="text-xs text-slate-400">{empDisplayName}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowApplyLeaveModal(false)}
                          className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                      </div>

                      <form onSubmit={handleApplyLeaveSubmit} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold mb-1.5 text-teal-600 dark:text-teal-400">
                            {t('نوع الإجازة المطلوبة *', 'Leave Type *')}
                          </label>
                          <select
                            value={newLeaveForm.leaveType}
                            onChange={(e) => setNewLeaveForm({ ...newLeaveForm, leaveType: e.target.value })}
                            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                            }`}
                            required
                          >
                            <option value="annual">
                              {language === 'ar' ? `إجازة سنوية اعتيادية (متاح: ${leaveBalances.annual.available} يوم)` : `Annual Leave (${leaveBalances.annual.available} days available)`}
                            </option>
                            <option value="sick">
                              {language === 'ar' ? `إجازة مرضية بتقرير (متاح: ${leaveBalances.sick.available} يوم)` : `Sick Leave (${leaveBalances.sick.available} days available)`}
                            </option>
                            <option value="emergency">
                              {language === 'ar' ? `إجازة طارئة / اضطرارية (متاح: ${leaveBalances.emergency.available} يوم)` : `Emergency Leave (${leaveBalances.emergency.available} days available)`}
                            </option>
                            <option value="unpaid">
                              {language === 'ar' ? 'إجازة بدون راتب' : 'Unpaid Leave'}
                            </option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold mb-1.5 text-teal-600 dark:text-teal-400">
                              {t('تاريخ البدء *', 'Start Date *')}
                            </label>
                            <input
                              type="date"
                              value={newLeaveForm.startDate}
                              onChange={(e) => setNewLeaveForm({ ...newLeaveForm, startDate: e.target.value })}
                              className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                              }`}
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold mb-1.5 text-teal-600 dark:text-teal-400">
                              {t('تاريخ النهاية *', 'End Date *')}
                            </label>
                            <input
                              type="date"
                              value={newLeaveForm.endDate}
                              onChange={(e) => setNewLeaveForm({ ...newLeaveForm, endDate: e.target.value })}
                              className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                              }`}
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold mb-1.5 text-teal-600 dark:text-teal-400">
                            {t('سبب طلب الإجازة *', 'Reason for Leave *')}
                          </label>
                          <textarea
                            value={newLeaveForm.reason}
                            onChange={(e) => setNewLeaveForm({ ...newLeaveForm, reason: e.target.value })}
                            rows={3}
                            placeholder={t('اكتب سبب طلب الإجازة...', 'Enter reason for leave request...')}
                            className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none ${
                              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                            }`}
                            required
                          />
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <button
                            type="button"
                            onClick={() => setShowApplyLeaveModal(false)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer ${
                              isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {t('إلغاء', 'Cancel')}
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 cursor-pointer active:scale-95 flex items-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-sm">send</span>
                            <span>{t('إرسال الطلب للموافقة', 'Submit for Approval')}</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* 6. Modal: Attendance Correction */}
                {showCorrectionModal && (
                  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className={`w-full max-w-lg rounded-3xl p-6 border shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 ${
                      isDark ? 'bg-[#0f172a] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
                            <span className="material-symbols-outlined text-xl">edit</span>
                          </div>
                          <div>
                            <h3 className="text-base font-black">{t('طلب تصحيح بصمة دوام', 'Request Attendance Correction')}</h3>
                            <p className="text-xs text-slate-400">{empDisplayName}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowCorrectionModal(false)}
                          className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                      </div>

                      <form onSubmit={handleCorrectionSubmit} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold mb-1.5 text-teal-600 dark:text-teal-400">
                            {t('تاريخ اليوم المراد تصحيحه *', 'Correction Date *')}
                          </label>
                          <input
                            type="date"
                            value={correctionForm.date}
                            onChange={(e) => setCorrectionForm({ ...correctionForm, date: e.target.value })}
                            className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                            }`}
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold mb-1.5 text-teal-600 dark:text-teal-400">
                              {t('وقت الحضور الفعلي *', 'Actual Check In *')}
                            </label>
                            <input
                              type="time"
                              value={correctionForm.requestedIn}
                              onChange={(e) => setCorrectionForm({ ...correctionForm, requestedIn: e.target.value })}
                              className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                              }`}
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold mb-1.5 text-teal-600 dark:text-teal-400">
                              {t('وقت الانصراف الفعلي *', 'Actual Check Out *')}
                            </label>
                            <input
                              type="time"
                              value={correctionForm.requestedOut}
                              onChange={(e) => setCorrectionForm({ ...correctionForm, requestedOut: e.target.value })}
                              className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                              }`}
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold mb-1.5 text-teal-600 dark:text-teal-400">
                            {t('سبب عدم تسجيل البصمة بالجهاز *', 'Reason for Correction *')}
                          </label>
                          <textarea
                            value={correctionForm.reason}
                            onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                            rows={3}
                            placeholder={t('اكتب سبب نسيان البصمة أو العطل الفني أو الواجب الميداني...', 'Explain reason (field task, device error, etc.)...')}
                            className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none ${
                              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                            }`}
                            required
                          />
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <button
                            type="button"
                            onClick={() => setShowCorrectionModal(false)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer ${
                              isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {t('إلغاء', 'Cancel')}
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 cursor-pointer active:scale-95 flex items-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-sm">send</span>
                            <span>{t('إرسال طلب التصحيح', 'Submit Correction')}</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* 5. Evaluation Tab */}
          {activeTab === 'evaluation' && (
            <div className="space-y-6">
              <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('التقييم الذاتي', 'Self Evaluation')}</h2>
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-500/20 border-slate-600 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                <p className="text-sm font-medium">{t('سيتم إضافة نموذج التقييم الذاتي قريباً', 'Self evaluation form will be added soon')}</p>
              </div>
            </div>
          )}
        </div>
    </>
  );

  if (embedded) {
    return <div className="space-y-6">{portalContent}</div>;
  }

  return (
    <div className={`min-h-screen transition-colors ${
      isDark 
        ? 'bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white' 
        : 'bg-slate-100 text-slate-900'
    }`}>
      <div className="container mx-auto p-4 py-8">
        {portalContent}
      </div>
    </div>
  );
};