import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmployeeContext } from '../context/EmployeeContext';
import {
  getLocalServerConfig,
  saveLocalServerConfig,
  sendPunchToLocalServer,
  LocalServerConfig
} from '../utils/localBiometricService';
import { 
  Bell, 
  Sun, 
  Moon, 
  Globe, 
  User, 
  Clock, 
  CreditCard, 
  Calendar, 
  Award,
  History,
  CheckCircle2,
  FileText
} from 'lucide-react';

interface EmployeeDashboardProps {
  employee: any;
  onLogout: () => void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ employee, onLogout }) => {
  const { theme, toggleTheme, language, toggleLanguage, unreadNotifications, notifications } = useEmployeeContext();
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  const isEn = language === 'en';

  const [currentDate] = useState(new Date());
  const [hasPunchedIn, setHasPunchedIn] = useState(true);
  const [punchTime, setPunchTime] = useState(isEn ? '08:15 AM' : '08:15 صباحاً');
  const [isPunching, setIsPunching] = useState(false);
  const [punchStatusMsg, setPunchStatusMsg] = useState<string | null>(null);

  // Local Server Settings State
  const [serverConfig, setServerConfig] = useState<LocalServerConfig>(getLocalServerConfig());
  const [showServerModal, setShowServerModal] = useState(false);
  const [serverIpInput, setServerIpInput] = useState(serverConfig.serverIp);
  const [punchEndpointInput, setPunchEndpointInput] = useState(serverConfig.punchEndpoint);
  const [wifiSsidInput, setWifiSsidInput] = useState(serverConfig.wifiSsid);
  const [useNativeBiometricsInput, setUseNativeBiometricsInput] = useState(serverConfig.useNativeBiometrics);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(isEn ? 'en-US' : 'ar-IQ', {
      weekday: 'long',
      day: 'numeric',
      month: 'short'
    }).format(date);
  };

  const handleSaveServerSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const newConfig: LocalServerConfig = {
      serverIp: serverIpInput.trim(),
      punchEndpoint: punchEndpointInput.trim(),
      wifiSsid: wifiSsidInput.trim(),
      useNativeBiometrics: useNativeBiometricsInput,
      offlineModeAllowed: true
    };
    saveLocalServerConfig(newConfig);
    setServerConfig(newConfig);
    setShowServerModal(false);
    setPunchStatusMsg(
      isEn 
        ? `Local biometric server connected to (${newConfig.serverIp}) successfully!` 
        : `تم تمكين وتحديث ربط سيرفر البصمة المحلي على (${newConfig.serverIp}) بنجاح!`
    );
  };

  const handlePunchToggle = async () => {
    setIsPunching(true);
    setPunchStatusMsg(null);

    const targetType = hasPunchedIn ? 'CHECK_OUT' : 'CHECK_IN';
    const result = await sendPunchToLocalServer(employee, targetType);

    if (result.success) {
      if (hasPunchedIn) {
        setHasPunchedIn(false);
      } else {
        setHasPunchedIn(true);
        setPunchTime(result.timestamp);
      }
    }
    setPunchStatusMsg(result.message);
    setIsPunching(false);
  };

  const getFirstName = (empObj: any) => {
    const bNo = String(empObj?.badgeNo || empObj?.badge_no || '').trim().toUpperCase();

    if (isEn) {
      if (bNo === 'V167') return 'Dina';
      if (empObj?.fullNameEn) return empObj.fullNameEn.split(' ')[0];
      const enMap: Record<string, string> = {
        '1001': 'Ahmed',
        '1002': 'Fatima',
        '1003': 'Ali',
        'V167': 'Dina'
      };
      if (bNo && enMap[bNo]) return enMap[bNo];
      return 'Employee';
    }

    if (bNo === 'V167') return 'دينا';

    const fullNameAr = empObj?.full_name_ar || 
                       empObj?.fullNameAr || 
                       empObj?.fullName || 
                       empObj?.name_ar || 
                       empObj?.nameAr || 
                       empObj?.name || 
                       '';

    let cleaned = String(fullNameAr)
      .replace(/^الموظف\s+/gi, '')
      .replace(/^السيد\s+/gi, '')
      .replace(/^السيدة\s+/gi, '')
      .replace(/^الآنسة\s+/gi, '')
      .replace(/[\(\)\d\_\-\.]/g, '')
      .trim();

    if (cleaned && !/^\d+$/.test(cleaned)) {
      return cleaned.split(/\s+/)[0];
    }

    const arMap: Record<string, string> = {
      '1001': 'أحمد',
      '1002': 'فاطمة',
      '1003': 'علي',
      'V167': 'دينا'
    };
    if (bNo && arMap[bNo]) return arMap[bNo];
    return 'الموظف';
  };

  const firstName = getFirstName(employee);
  const positionTitle = isEn 
    ? (employee?.positionEn || employee?.position_en || 'Receptionist')
    : (employee?.position_ar || employee?.position || 'موظف استقبال');

  const branchTitle = isEn
    ? (employee?.branchEn || employee?.branch_en || 'Najaf Office')
    : (employee?.branch || employee?.location_ar || 'مكتب النجف');

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-5 pb-20 animate-in fade-in">
      {/* Mobile Top Header */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3">
          <div className="relative cursor-pointer" onClick={() => navigate('/employee-app/profile')}>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-400 flex items-center justify-center text-white font-black text-lg shadow-md shadow-teal-500/20">
              {firstName.charAt(0)}
            </div>
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-teal-500 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full">
                {positionTitle}
              </span>
            </div>
            <h1 className={`text-lg font-black leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isEn ? `Welcome, ${firstName} 👋` : `مرحباً، ${firstName} 👋`}
            </h1>
            <p className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {formatDate(currentDate)}
            </p>
          </div>
        </div>

        {/* Global Action Icons: Notifications, Language, Theme */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate('/employee-app/notifications')}
            className={`p-2.5 rounded-2xl border relative transition-all cursor-pointer ${
              isDark 
                ? 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-700' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
            }`}
            title={isEn ? 'Notifications' : 'التنبيهات'}
          >
            <Bell className="w-4 h-4" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-4 text-[10px] font-bold bg-rose-500 text-white rounded-full flex items-center justify-center animate-pulse shadow-sm">
                {unreadNotifications}
              </span>
            )}
          </button>

          <button
            onClick={toggleLanguage}
            className={`p-2 rounded-2xl border transition-all text-xs font-bold cursor-pointer ${
              isDark 
                ? 'bg-slate-800/80 border-slate-700/80 text-teal-400 hover:bg-slate-700' 
                : 'bg-white border-slate-200 text-teal-700 hover:bg-slate-50 shadow-xs'
            }`}
            title={isEn ? 'التبديل إلى العربية' : 'Switch to English'}
          >
            <Globe className="w-4 h-4" />
          </button>

          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
              isDark 
                ? 'bg-slate-800/80 border-slate-700/80 text-amber-400 hover:bg-slate-700' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
            }`}
            title={isDark ? (isEn ? 'Switch to Light Mode' : 'التحويل للوضع النهاري') : (isEn ? 'Switch to Dark Mode' : 'التحويل للوضع الليلي')}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        </div>
      </div>

      {/* Official Routed Document Priority Banner */}
      {notifications.filter(n => !n.read && n.documentType).map(n => (
        <div 
          key={n.id}
          onClick={() => navigate('/employee-app/notifications')}
          className="p-4 rounded-3xl bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-700 text-white shadow-xl shadow-teal-600/25 flex items-center justify-between cursor-pointer hover:scale-[1.01] transition-all border border-white/20 animate-in fade-in"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 pr-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                  {isEn ? 'New Official Document' : 'مستند رسمي جديد'}
                </span>
                <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping"></span>
              </div>
              <p className="text-xs font-bold mt-1 truncate">{n.title}</p>
              <p className="text-[10px] opacity-90 truncate">{n.message}</p>
            </div>
          </div>
          <span className="text-xs bg-white text-teal-800 font-bold px-3 py-1.5 rounded-xl shrink-0 shadow-xs">
            {isEn ? 'Preview' : 'معاينة'}
          </span>
        </div>
      ))}

      {/* Live Punching Card */}
      <div className={`p-5 rounded-3xl border transition-all relative overflow-hidden shadow-lg ${
        hasPunchedIn
          ? isDark 
            ? 'bg-gradient-to-br from-emerald-950/40 via-teal-900/30 to-slate-900 border-emerald-500/30' 
            : 'bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border-emerald-200'
          : isDark
            ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700/60'
            : 'bg-gradient-to-br from-slate-50 to-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${hasPunchedIn ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {hasPunchedIn 
                ? (isEn ? 'Status: Present at Work' : 'حالة الدوام: حاضر في العمل') 
                : (isEn ? 'Status: Not Checked In Yet' : 'حالة الدوام: لم تسجل البصمة بعد')}
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-teal-500 bg-teal-500/10 px-2 py-0.5 rounded-lg">
            {branchTitle}
          </span>
        </div>

        <div className="flex items-center justify-between my-2">
          <div>
            <p className={`text-2xl font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {hasPunchedIn ? punchTime : '00:00'}
            </p>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {hasPunchedIn 
                ? (isEn ? 'Check-in biometric punch' : 'وقت تسجيل دخول البصمة') 
                : (isEn ? 'Tap button to punch in' : 'اضغط الزر للتبصيم المباشر')}
            </p>
          </div>

          <button
            onClick={handlePunchToggle}
            disabled={isPunching}
            className={`px-5 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer ${
              hasPunchedIn
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/20'
                : 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-teal-500/30'
            }`}
          >
            <span className="material-symbols-outlined text-lg">
              {isPunching ? 'sync' : hasPunchedIn ? 'logout' : 'fingerprint'}
            </span>
            <span>
              {isPunching 
                ? (isEn ? 'Processing...' : 'جاري التبصيم...') 
                : hasPunchedIn 
                ? (isEn ? 'Check Out' : 'تسجيل انصراف') 
                : (isEn ? 'Check In' : 'تسجيل حضورك')}
            </span>
          </button>
        </div>

        {/* Punch Result Toast Notification */}
        {punchStatusMsg && (
          <div className="mt-3 p-3 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 text-[11px] font-bold flex items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{punchStatusMsg}</span>
            </div>
            <button onClick={() => setPunchStatusMsg(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Local Server Wi-Fi Connection Bar */}
        <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px]">
          <div
            onClick={() => setShowServerModal(true)}
            className="flex items-center gap-1.5 text-teal-400 hover:text-teal-300 font-bold cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="material-symbols-outlined text-sm">lan</span>
            <span>{isEn ? `Biometric Server: ${serverConfig.serverIp}` : `سيرفر البصمة المحلي: ${serverConfig.serverIp}`}</span>
          </div>
          <button
            onClick={() => setShowServerModal(true)}
            className="text-[10px] font-bold text-slate-300 hover:text-white bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700 flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-xs">settings</span>
            <span>{isEn ? 'Server Setup' : 'إعدادات السيرفر'}</span>
          </button>
        </div>
      </div>

      {/* Quick Action Grid (6 ESS Sections with Zero Language Mixing) */}
      <div>
        <h2 className={`text-xs font-bold mb-2.5 px-1 uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {isEn ? 'ESS Portal Sections' : 'أقسام بوابة الموظف الذاتية'}
        </h2>
        <div className="grid grid-cols-3 gap-2.5">
          <button
            onClick={() => navigate('/employee-app/profile')}
            className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center transition-all active:scale-95 cursor-pointer ${
              isDark ? 'bg-[#131b2e] border-slate-800 text-white hover:border-teal-500/40' : 'bg-white border-slate-200 text-slate-900 shadow-xs hover:border-teal-300'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-1.5">
              <User className="w-5 h-5 text-teal-500" />
            </div>
            <span className="text-[11px] font-bold">{isEn ? 'Profile' : 'الملف الشخصي'}</span>
          </button>

          <button
            onClick={() => navigate('/employee-app/attendance')}
            className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center transition-all active:scale-95 cursor-pointer ${
              isDark ? 'bg-[#131b2e] border-slate-800 text-white hover:border-teal-500/40' : 'bg-white border-slate-200 text-slate-900 shadow-xs hover:border-teal-300'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-1.5">
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-[11px] font-bold">{isEn ? 'Attendance' : 'سجل الدوام'}</span>
          </button>

          <button
            onClick={() => navigate('/employee-app/payroll')}
            className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center transition-all active:scale-95 cursor-pointer ${
              isDark ? 'bg-[#131b2e] border-slate-800 text-white hover:border-teal-500/40' : 'bg-white border-slate-200 text-slate-900 shadow-xs hover:border-teal-300'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-1.5">
              <CreditCard className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-[11px] font-bold">{isEn ? 'Payroll' : 'الرواتب'}</span>
          </button>

          <button
            onClick={() => navigate('/employee-app/leave')}
            className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center transition-all active:scale-95 cursor-pointer ${
              isDark ? 'bg-[#131b2e] border-slate-800 text-white hover:border-teal-500/40' : 'bg-white border-slate-200 text-slate-900 shadow-xs hover:border-teal-300'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-1.5">
              <Calendar className="w-5 h-5 text-teal-500" />
            </div>
            <span className="text-[11px] font-bold">{isEn ? 'Leave' : 'الإجازات'}</span>
          </button>

          <button
            onClick={() => navigate('/employee-app/evaluation')}
            className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center transition-all active:scale-95 cursor-pointer ${
              isDark ? 'bg-[#131b2e] border-slate-800 text-white hover:border-teal-500/40' : 'bg-white border-slate-200 text-slate-900 shadow-xs hover:border-teal-300'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-1.5">
              <Award className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-[11px] font-bold">{isEn ? 'Self Evaluation' : 'التقييم الذاتي'}</span>
          </button>

          <button
            onClick={() => navigate('/employee-app/notifications')}
            className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center transition-all active:scale-95 cursor-pointer relative ${
              isDark ? 'bg-[#131b2e] border-slate-800 text-white hover:border-teal-500/40' : 'bg-white border-slate-200 text-slate-900 shadow-xs hover:border-teal-300'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-1.5">
              <Bell className="w-5 h-5 text-purple-500" />
            </div>
            <span className="text-[11px] font-bold">{isEn ? 'Notifications' : 'التنبيهات والمرفقات'}</span>
            {unreadNotifications > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            )}
          </button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`p-4 rounded-3xl border transition-all ${
          isDark ? 'bg-[#131b2e] border-slate-800 text-white' : 'bg-white border-slate-200 shadow-xs text-slate-900'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="material-symbols-outlined text-emerald-500 text-xl">event_available</span>
            <span className="text-emerald-500 text-[11px] font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {isEn ? 'Available' : 'متاح'}
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-500">{isEn ? '18 Days' : '18 يوم'}</p>
          <p className={`text-[11px] mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {isEn ? 'Annual Leave Balance' : 'رصيد الإجازة السنوية'}
          </p>
        </div>

        <div className={`p-4 rounded-3xl border transition-all ${
          isDark ? 'bg-[#131b2e] border-slate-800 text-white' : 'bg-white border-slate-200 shadow-xs text-slate-900'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="material-symbols-outlined text-blue-500 text-xl">schedule</span>
            <span className="text-blue-500 text-[11px] font-bold bg-blue-500/10 px-2 py-0.5 rounded-full">
              {isEn ? 'This Month' : 'هذا الشهر'}
            </span>
          </div>
          <p className="text-2xl font-black text-blue-500">{isEn ? '22 Days' : '22 يوم'}</p>
          <p className={`text-[11px] mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {isEn ? 'Logged Attendance Days' : 'أيام الحضور المسجلة'}
          </p>
        </div>
      </div>

      {/* Recent Activity Timeline */}
      <div className={`p-4 rounded-3xl border ${
        isDark ? 'bg-[#131b2e] border-slate-800 text-white' : 'bg-white border-slate-200 shadow-xs text-slate-900'
      }`}>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-bold flex items-center gap-1.5">
            <History className="w-4 h-4 text-teal-400" />
            <span>{isEn ? 'Recent Activity & Records' : 'النشاط والتحديثات الأخيرة'}</span>
          </h3>
          <button 
            onClick={() => navigate('/employee-app/notifications')}
            className="text-[11px] font-bold text-teal-500 hover:underline cursor-pointer"
          >
            {isEn ? 'View All' : 'عرض الكل'}
          </button>
        </div>

        <div className="space-y-2.5">
          {notifications && notifications.length > 0 ? (
            notifications.slice(0, 4).map(notif => (
              <div
                key={notif.id}
                onClick={() => navigate('/employee-app/notifications')}
                className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                  !notif.read
                    ? (isDark ? 'bg-teal-950/40 border-teal-500/40 text-white' : 'bg-teal-50/80 border-teal-200 text-slate-900')
                    : (isDark ? 'bg-[#0b1120] border-slate-800/80 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-700')
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  notif.documentType === 'employment_contract' || notif.type === 'success'
                    ? 'bg-emerald-500/15 text-emerald-500'
                    : 'bg-teal-500/15 text-teal-500'
                }`}>
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0"></span>}
                    <p className="text-xs font-bold truncate">{notif.title}</p>
                  </div>
                  <p className={`text-[10px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {notif.message}
                  </p>
                </div>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                  {notif.timestamp ? new Date(notif.timestamp).toLocaleDateString(isEn ? 'en-US' : 'ar-IQ') : ''}
                </span>
              </div>
            ))
          ) : (
            <div className={`flex items-center gap-3 p-3 rounded-2xl border ${
              isDark ? 'bg-[#0b1120] border-slate-800/80' : 'bg-slate-50 border-slate-100'
            }`}>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{isEn ? 'Attendance recorded successfully' : 'تم تسجيل بصمة الدوام بنجاح'}</p>
                <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {isEn ? 'Today, 08:15 AM' : 'اليوم، 08:15 صباحاً'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};