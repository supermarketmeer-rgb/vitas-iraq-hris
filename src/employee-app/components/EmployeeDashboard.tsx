import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmployeeContext } from '../context/EmployeeContext';
import {
  getLocalServerConfig,
  saveLocalServerConfig,
  sendPunchToLocalServer,
  LocalServerConfig
} from '../utils/localBiometricService';

interface EmployeeDashboardProps {
  employee: any;
  onLogout: () => void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ employee, onLogout }) => {
  const { theme, toggleTheme, unreadNotifications } = useEmployeeContext();
  const navigate = useNavigate();
  const [currentDate] = useState(new Date());
  const [hasPunchedIn, setHasPunchedIn] = useState(true);
  const [punchTime, setPunchTime] = useState('08:15 صباحاً');
  const [isPunching, setIsPunching] = useState(false);
  const [punchStatusMsg, setPunchStatusMsg] = useState<string | null>(null);

  // Local Server Settings State
  const [serverConfig, setServerConfig] = useState<LocalServerConfig>(getLocalServerConfig());
  const [showServerModal, setShowServerModal] = useState(false);
  const [serverIpInput, setServerIpInput] = useState(serverConfig.serverIp);
  const [punchEndpointInput, setPunchEndpointInput] = useState(serverConfig.punchEndpoint);
  const [wifiSsidInput, setWifiSsidInput] = useState(serverConfig.wifiSsid);
  const [useNativeBiometricsInput, setUseNativeBiometricsInput] = useState(serverConfig.useNativeBiometrics);
  const isDark = theme === 'dark';

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ar-IQ', {
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
    setPunchStatusMsg(`تم تمكين وتحديث ربط سيرفر البصمة المحلي على (${newConfig.serverIp}) بنجاح!`);
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
    if (!empObj) return 'أحمد';

    // 1. Priority: Map badge numbers dynamically to correct Arabic first names
    const badgeNo = String(empObj.badgeNo || empObj.badge_no || '').trim();
    const badgeNameMap: Record<string, string> = {
      '1001': 'أحمد',
      '1002': 'فاطمة',
      '1003': 'علي',
      '1004': 'مصطفى',
      '1005': 'زينب',
      '1006': 'حيدر',
      '1007': 'مريم',
      '1008': 'عمر',
      '1009': 'سارة',
      '1010': 'كرار',
    };

    if (badgeNo && badgeNameMap[badgeNo]) {
      return badgeNameMap[badgeNo];
    }

    // 2. Check direct full name fields if available
    const arabicTripleName = empObj.fullNameAr || empObj.nameAr || empObj.name_ar || empObj.employeeNameAr || empObj.fullName || empObj.name || '';
    let cleaned = String(arabicTripleName).replace(/^الموظف/gi, '').replace(/[\(\)\d\_\-\.]/g, '').trim();
    
    if (cleaned && !/^\d+$/.test(cleaned)) {
      return cleaned.split(/\s+/)[0];
    }

    // 3. Deterministic fallback for any other custom badge number
    const firstNames = ['أحمد', 'فاطمة', 'علي', 'مصطفى', 'زينب', 'حيدر', 'مريم', 'عمر', 'سارة', 'كرار', 'حسين', 'نور', 'ياسين', 'زهراء'];
    const charSum = (badgeNo || '1001').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    return firstNames[charSum % firstNames.length];
  };

  const firstName = getFirstName(employee);

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-5">
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
                {employee?.position || 'موظف فيتاس'}
              </span>
            </div>
            <h1 className={`text-lg font-black leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              مرحباً، {firstName} 👋
            </h1>
            <p className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {formatDate(currentDate)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate('/employee-app/notifications')}
            className={`p-2.5 rounded-2xl border relative transition-all ${
              isDark 
                ? 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-700' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
            }`}
            title="التنبيهات"
          >
            <span className="material-symbols-outlined text-xl">notifications</span>
            {unreadNotifications > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>
            )}
          </button>

          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-2xl border transition-all ${
              isDark 
                ? 'bg-slate-800/80 border-slate-700/80 text-amber-400 hover:bg-slate-700' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
            }`}
            title={isDark ? 'تغيير للوضع النهاري' : 'تغيير للوضع الليلي'}
          >
            <span className="material-symbols-outlined text-xl">
              {isDark ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>
      </div>

      {/* Live Punching Card (بصمة الحضور والدوام المباشر) */}
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
              {hasPunchedIn ? 'حالة الدوام: حاضر في العمل' : 'حالة الدوام: لم تسجل البصمة بعد'}
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-teal-500 bg-teal-500/10 px-2 py-0.5 rounded-lg">
            {employee?.branch || 'المقر الرئيسي'}
          </span>
        </div>

        <div className="flex items-center justify-between my-2">
          <div>
            <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {hasPunchedIn ? punchTime : '00:00'}
            </p>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {hasPunchedIn ? 'وقت تسجيل دخول البصمة' : 'اضغط الزر للتبصيم المباشر'}
            </p>
          </div>

          <button
            onClick={handlePunchToggle}
            disabled={isPunching}
            className={`px-5 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 ${
              hasPunchedIn
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/20'
                : 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-teal-500/30'
            }`}
          >
            <span className="material-symbols-outlined text-lg">
              {isPunching ? 'sync' : hasPunchedIn ? 'logout' : 'fingerprint'}
            </span>
            <span>
              {isPunching ? 'جاري التبصيم...' : hasPunchedIn ? 'تسجيل انصراف' : 'تسجيل حضورك'}
            </span>
          </button>
        </div>

        {/* Punch Result Toast Notification */}
        {punchStatusMsg && (
          <div className="mt-3 p-3 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 text-[11px] font-bold flex items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">verified</span>
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
            <span>سيرفر البصمة المحلي: {serverConfig.serverIp}</span>
          </div>
          <button
            onClick={() => setShowServerModal(true)}
            className="text-[10px] font-bold text-slate-300 hover:text-white bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-xs">settings</span>
            <span>إعدادات السيرفر</span>
          </button>
        </div>
      </div>

      {/* LOCAL SERVER CONFIGURATION MODAL */}
      {showServerModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 animate-in zoom-in-95 ${
            isDark ? 'bg-[#111827] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-500 text-2xl">lan</span>
                <div>
                  <h3 className="text-sm font-bold">{isDark ? 'إعدادات سيرفر البصمة المحلي' : 'Local Biometric Server Setup'}</h3>
                  <p className="text-[10px] text-slate-400">ربط الموبايل بسيرفر الشركة عبر الواي فاي</p>
                </div>
              </div>
              <button onClick={() => setShowServerModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveServerSettings} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">
                  عنوان السيرفر المحلي (IP Address & Port)
                </label>
                <input
                  type="text"
                  value={serverIpInput}
                  onChange={e => setServerIpInput(e.target.value)}
                  placeholder="مثال: http://192.168.1.100:5000"
                  className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-teal-400 font-mono font-bold focus:outline-none focus:border-teal-500"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">أدخل عنوان IP الخاص بسيرفر البصمة في شبكة الفرع المحلية.</p>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">
                  مسار API البصمة (Endpoint Path)
                </label>
                <input
                  type="text"
                  value={punchEndpointInput}
                  onChange={e => setPunchEndpointInput(e.target.value)}
                  placeholder="/api/attendance/punch"
                  className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-slate-300 font-mono focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">
                  اسم شبكة الواي فاي للفرع (Branch Wi-Fi SSID)
                </label>
                <input
                  type="text"
                  value={wifiSsidInput}
                  onChange={e => setWifiSsidInput(e.target.value)}
                  placeholder="VITAS-IRAQ-LOCAL-WIFI"
                  className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-slate-300 font-mono focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="p-3 rounded-2xl bg-[#0a0c10] border border-white/5 flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs">تفعيل بصمة الإصبع/الوجه للموبايل</p>
                  <p className="text-[10px] text-slate-400">استدعاء حساس الموبايل (Biometric/WebAuthn)</p>
                </div>
                <button
                  type="button"
                  onClick={() => setUseNativeBiometricsInput(!useNativeBiometricsInput)}
                  className={`w-10 h-6 rounded-full transition-colors relative ${useNativeBiometricsInput ? 'bg-teal-500' : 'bg-slate-700'}`}
                >
                  <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${useNativeBiometricsInput ? 'right-5' : 'right-1'}`}></span>
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/25 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  حفظ وتفعيل الربط الفوري
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Action Grid (الوصول السريع) */}
      <div>
        <h2 className={`text-xs font-bold mb-2.5 px-1 uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          إجراءات سريعة
        </h2>
        <div className="grid grid-cols-4 gap-2.5">
          <button
            onClick={() => navigate('/employee-app/leave')}
            className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all active:scale-95 ${
              isDark ? 'bg-[#131b2e] border-slate-800 text-white hover:border-teal-500/40' : 'bg-white border-slate-200 text-slate-900 shadow-xs hover:border-teal-300'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-1.5">
              <span className="material-symbols-outlined text-xl">event_available</span>
            </div>
            <span className="text-[11px] font-bold">طلب إجازة</span>
          </button>

          <button
            onClick={() => navigate('/employee-app/attendance')}
            className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all active:scale-95 ${
              isDark ? 'bg-[#131b2e] border-slate-800 text-white hover:border-teal-500/40' : 'bg-white border-slate-200 text-slate-900 shadow-xs hover:border-teal-300'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-1.5">
              <span className="material-symbols-outlined text-xl">schedule</span>
            </div>
            <span className="text-[11px] font-bold">سجل الدوام</span>
          </button>

          <button
            onClick={() => navigate('/employee-app/profile')}
            className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all active:scale-95 ${
              isDark ? 'bg-[#131b2e] border-slate-800 text-white hover:border-teal-500/40' : 'bg-white border-slate-200 text-slate-900 shadow-xs hover:border-teal-300'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-1.5">
              <span className="material-symbols-outlined text-xl">payments</span>
            </div>
            <span className="text-[11px] font-bold">كشف الراتب</span>
          </button>

          <button
            onClick={() => navigate('/employee-app/messages')}
            className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all active:scale-95 ${
              isDark ? 'bg-[#131b2e] border-slate-800 text-white hover:border-teal-500/40' : 'bg-white border-slate-200 text-slate-900 shadow-xs hover:border-teal-300'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-1.5">
              <span className="material-symbols-outlined text-xl">mail</span>
            </div>
            <span className="text-[11px] font-bold">الرسائل</span>
          </button>
        </div>
      </div>

      {/* Quick Stats Grid (إحصائيات الموظف) */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`p-4 rounded-3xl border transition-all ${
          isDark 
            ? 'bg-[#131b2e] border-slate-800 text-white' 
            : 'bg-white border-slate-200 shadow-xs text-slate-900'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="material-symbols-outlined text-emerald-500 text-xl">event_available</span>
            <span className="text-emerald-500 text-[11px] font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">متاح</span>
          </div>
          <p className="text-2xl font-black text-emerald-500">18 يوم</p>
          <p className={`text-[11px] mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>رصيد الإجازة السنوية</p>
        </div>

        <div className={`p-4 rounded-3xl border transition-all ${
          isDark 
            ? 'bg-[#131b2e] border-slate-800 text-white' 
            : 'bg-white border-slate-200 shadow-xs text-slate-900'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="material-symbols-outlined text-blue-500 text-xl">schedule</span>
            <span className="text-blue-500 text-[11px] font-bold bg-blue-500/10 px-2 py-0.5 rounded-full">هذا الشهر</span>
          </div>
          <p className="text-2xl font-black text-blue-500">22 يوم</p>
          <p className={`text-[11px] mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>أيام الحضور المسجلة</p>
        </div>
      </div>

      {/* Recent Activity Timeline (النشاط والتنبيهات الأخيرة) */}
      <div className={`p-4 rounded-3xl border ${
        isDark ? 'bg-[#131b2e] border-slate-800 text-white' : 'bg-white border-slate-200 shadow-xs text-slate-900'
      }`}>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-bold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-teal-400 text-base">history</span>
            <span>النشاط والتحديثات الأخيرة</span>
          </h3>
          <button 
            onClick={() => navigate('/employee-app/notifications')}
            className="text-[11px] font-bold text-teal-500 hover:underline"
          >
            عرض الكل
          </button>
        </div>

        <div className="space-y-2.5">
          <div className={`flex items-center gap-3 p-3 rounded-2xl border ${
            isDark ? 'bg-[#0b1120] border-slate-800/80' : 'bg-slate-50 border-slate-100'
          }`}>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-base">check_circle</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">تم تسجيل بصمة الدوام بنجاح</p>
              <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>اليوم، 08:15 صباحاً</p>
            </div>
          </div>

          <div className={`flex items-center gap-3 p-3 rounded-2xl border ${
            isDark ? 'bg-[#0b1120] border-slate-800/80' : 'bg-slate-50 border-slate-100'
          }`}>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-base">mail</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">تنبيه من قسم الموارد البشرية</p>
              <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>أمس، 10:30 صباحاً</p>
            </div>
          </div>

          <div className={`flex items-center gap-3 p-3 rounded-2xl border ${
            isDark ? 'bg-[#0b1120] border-slate-800/80' : 'bg-slate-50 border-slate-100'
          }`}>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-base">event_available</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">تم الموافقة على طلب الإجازة السنوية</p>
              <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>منذ يومين</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};