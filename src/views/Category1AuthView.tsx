import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const Category1AuthView: React.FC = () => {
  const { activeModuleId, setActiveModuleId, currentUser, setCurrentUserRole, addNotification, t } = useApp();
  
  // View 1: Secure Login States
  const [username, setUsername] = useState('VTS-1001');
  const [password, setPassword] = useState('••••••••••••');
  const [selectedRole, setSelectedRole] = useState(currentUser.role || 'Super Admin');
  const [otpCode, setOtpCode] = useState('');
  const [isMfaSent, setIsMfaSent] = useState(false);
  const [authResult, setAuthResult] = useState<any>(null);
  const [activeSecureTab, setActiveSecureTab] = useState<'login' | 'sessions' | 'matrix' | 'logs'>('login');

  // View 2: Corporate SSO States
  const [ssoProvider, setSsoProvider] = useState<'azure' | 'adfs' | 'google' | 'okta'>('azure');
  const [ssoDomain, setSsoDomain] = useState('vitasiraq.com');
  const [tenantId, setTenantId] = useState('8f92a11b-4c33-4e92-a128-vitasiraq001');
  const [clientId, setClientId] = useState('client-vitas-hrms-prod-2026');
  const [autoProvision, setAutoProvision] = useState(true);
  const [isTestingSso, setIsTestingSso] = useState(false);
  const [ssoTestResult, setSsoTestResult] = useState<string | null>(null);

  // View 3: Biometric Auth States
  const [isScanning, setIsScanning] = useState(false);
  const [scanType, setScanType] = useState<'fingerprint' | 'face'>('fingerprint');
  const [scanResult, setScanResult] = useState<{ success: boolean; score: number; name: string; badge: string } | null>(null);
  const [livenessStrictness, setLivenessStrictness] = useState('high');

  // Active Sessions Data
  const [activeSessions, setActiveSessions] = useState([
    { id: 'SESS-001', device: 'Windows 11 (Chrome)', ip: '192.168.1.45', location: 'المقر الرئيسي - بغداد', role: 'Super Admin', user: 'أحمد محمد علي', method: 'Password + 2FA', time: 'منذ 15 دقيقة', isCurrent: true },
    { id: 'SESS-002', device: 'iPhone 15 Pro (Safari)', ip: '10.0.4.12', location: 'فرع البصرة', role: 'HR Manager', user: 'فاطمة حسين خليل', method: 'Biometric TouchID', time: 'منذ ساعتين', isCurrent: false },
    { id: 'SESS-003', device: 'Android 14 (Edge)', ip: '10.0.8.99', location: 'فرع أربيل', role: 'Employee', user: 'علي جاسم كريم', method: 'Corporate SSO', time: 'منذ 4 ساعات', isCurrent: false },
  ]);

  // Security Audit Log Mock Data
  const auditLogs = [
    { id: 'LOG-101', event: 'نجاح تسجيل الدخول بالبصمة الحيوية', user: 'أحمد محمد علي (1001)', ip: '192.168.1.45', status: 'success', time: '17:45:10' },
    { id: 'LOG-102', event: 'محاولة كلمة مرور خاطئة', user: 'guest_user', ip: '185.220.101.4', status: 'warning', time: '16:30:22' },
    { id: 'LOG-103', event: 'مصادقة توكن SSO عبر Microsoft Azure', user: 'فاطمة حسين خليل (1002)', ip: '10.0.4.12', status: 'success', time: '14:12:05' },
    { id: 'LOG-104', event: 'ترقية صلاحيات الجلسة المؤقتة', user: 'Super Admin System', ip: 'localhost', status: 'info', time: '12:00:00' },
  ];

  // Hardware Terminals Mock Data
  const terminals = [
    { id: 'TERM-01', name: 'جهاز البصمة الرئيسي - المدخل العام', location: 'بغداد - المقر الرئيسي', status: 'online', type: 'BioStation 3 (Face+FP)', enrolledCount: 148, lastSync: 'منذ دقيقة' },
    { id: 'TERM-02', name: 'جهاز بصمة الاستقبال - فرع البصرة', location: 'فرع البصرة', status: 'online', type: 'FacePass Pro V2', enrolledCount: 65, lastSync: 'منذ 5 دقائق' },
    { id: 'TERM-03', name: 'جهاز بصمة الإدارة - فرع أربيل', location: 'فرع أربيل', status: 'standby', type: 'Anviz TouchID', enrolledCount: 42, lastSync: 'منذ 12 دقيقة' },
  ];

  // Handlers
  const handleSendOtp = () => {
    setIsMfaSent(true);
    addNotification({
      title: t('رمز التحقق OTP', 'OTP Verification Code'),
      message: t('تم إرسال رمز الأمان (948201) إلى هاتفك المسجل', 'Verification code (948201) sent to your registered phone'),
      type: 'info'
    });
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentUserRole(selectedRole as any);

    let route = 'dash-overview';
    if (selectedRole === 'Employee') route = 'dash-ess';
    if (selectedRole === 'IT Admin') route = 'sys-dynamic-reports';

    setAuthResult({
      success: true,
      user: username,
      role: selectedRole,
      targetRoute: route,
      token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(username)}.${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('ar-IQ')
    });

    addNotification({
      title: t('تم تسجيل الدخول بنجاح', 'Login Successful'),
      message: t(`تم التوجيه بنجاح بصلاحية ${selectedRole}`, `Successfully routed with role ${selectedRole}`),
      type: 'success'
    });
  };

  const handleTerminateSession = (sessionId: string) => {
    setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
    addNotification({
      title: t('إنهاء الجلسة', 'Session Terminated'),
      message: t(`تم إنهاء الجلسة ${sessionId} وإلغاء صلاحيتها بنجاح`, `Session ${sessionId} successfully terminated`),
      type: 'warning'
    });
  };

  const handleTestSso = () => {
    setIsTestingSso(true);
    setSsoTestResult(null);
    setTimeout(() => {
      setIsTestingSso(false);
      setSsoTestResult(t('تم اختبار الاتصال بمزود SSO بنجاح! شهادة SAML صالحة لغاية ديسمبر 2027.', 'SSO Connection successful! SAML Cert valid until Dec 2027.'));
      addNotification({
        title: t('اختبار SSO بنجاح', 'SSO Test Passed'),
        message: t('تمت مصادقة نطاق vitasiraq.com عبر Microsoft Azure AD', 'Domain vitasiraq.com authenticated via Azure AD'),
        type: 'success'
      });
    }, 1200);
  };

  const handleBiometricScan = () => {
    setIsScanning(true);
    setScanResult(null);
    setTimeout(() => {
      setIsScanning(false);
      setScanResult({
        success: true,
        score: 99.8,
        name: 'أحمد محمد علي',
        badge: '1001'
      });
      addNotification({
        title: t('مطابقة البصمة الحيوية', 'Biometric Match Success'),
        message: t('تم التأكد من هويتك بنسبة مطابقة 99.8%', 'Identity verified with 99.8% confidence score'),
        type: 'success'
      });
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner Header */}
      <div className="dark-banner p-6 rounded-3xl bg-gradient-to-r from-teal-950 via-slate-900 to-teal-950 border border-teal-500/20 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[11px] font-mono text-teal-400 uppercase tracking-widest font-black">
              1. AUTHENTICATION & SECURITY • تسجيل الدخول والأمان
            </span>
          </div>
          <h1 className="text-2xl font-black text-white text-white-force drop-shadow-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-400 text-3xl">shield_lock</span>
            {activeModuleId === 'auth-secure' && t('تسجيل الدخول الآمن وتوجيه الأدوار', 'Secure Login & Role Routing')}
            {activeModuleId === 'auth-sso' && t('تسجيل الدخول المؤسسي (Corporate SSO)', 'Corporate Single Sign-On (SSO)')}
            {activeModuleId === 'auth-biometric' && t('المصادقة والتحقق البيومتري', 'Biometric Authentication & Verification')}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {t('منظومة المصادقة المعززة وتوجيه الصلاحيات لموظفي ومسؤولي فيتاس العراق', 'Enhanced authentication and role routing system for VITAS Iraq staff')}
          </p>
        </div>

        {/* Top Module Sub-Buttons Bar */}
        <div className="flex items-center gap-2 bg-[#0a0c10]/80 p-1.5 rounded-2xl border border-white/10 flex-wrap">
          <button
            onClick={() => setActiveModuleId('auth-secure')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeModuleId === 'auth-secure'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-base">login</span>
            <span>{t('الدخول والتوجيه', 'Secure Login')}</span>
          </button>

          <button
            onClick={() => setActiveModuleId('auth-sso')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeModuleId === 'auth-sso'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-base">corporate_fare</span>
            <span>{t('الدخول المؤسسي SSO', 'Corporate SSO')}</span>
          </button>

          <button
            onClick={() => setActiveModuleId('auth-biometric')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeModuleId === 'auth-biometric'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-base">fingerprint</span>
            <span>{t('المصادقة البيومترية', 'Biometric Auth')}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODULE 1: SECURE LOGIN & ROLE ROUTING (auth-secure) */}
      {/* ========================================================================= */}
      {activeModuleId === 'auth-secure' && (
        <div className="space-y-6">
          {/* Internal Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-700/50 pb-2 flex-wrap">
            <button
              onClick={() => setActiveSecureTab('login')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeSecureTab === 'login'
                  ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-base">login</span>
              {t('اختبار تسجيل الدخول والتوجيه', 'Live Authentication Simulator')}
            </button>
            <button
              onClick={() => setActiveSecureTab('sessions')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeSecureTab === 'sessions'
                  ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-base">devices</span>
              {t('إدارة الجلسات النشطة', 'Active Sessions')} ({activeSessions.length})
            </button>
            <button
              onClick={() => setActiveSecureTab('matrix')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeSecureTab === 'matrix'
                  ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-base">grid_view</span>
              {t('مصفوفة الصلاحيات', 'Role Matrix')}
            </button>
            <button
              onClick={() => setActiveSecureTab('logs')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeSecureTab === 'logs'
                  ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-base">receipt_long</span>
              {t('سجل التدقيق والأمان', 'Security Audit Logs')}
            </button>
          </div>

          {/* TAB 1: LIVE LOGIN & ROUTING SIMULATOR */}
          {activeSecureTab === 'login' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Login Form Panel */}
              <div className="p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-teal-400">admin_panel_settings</span>
                    {t('محاكي الدخول وتوجيه الأدوار الذكي', 'Role-Based Authentication Simulator')}
                  </h2>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    MFA Enabled
                  </span>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">
                      {t('معرف الموظف / رقم البادج', 'Employee ID / Badge Number')}
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-base">badge</span>
                      <input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        className="w-full bg-[#0a0c10] border border-white/10 rounded-xl pr-10 pl-3.5 py-2.5 text-white font-bold focus:outline-none focus:border-teal-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1">
                      {t('كلمة المرور المشفرة', 'Encrypted Password')}
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-base">lock</span>
                      <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-[#0a0c10] border border-white/10 rounded-xl pr-10 pl-3.5 py-2.5 text-white font-bold focus:outline-none focus:border-teal-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-teal-400 font-black mb-1">
                      {t('اختر دور الصلاحية للتوجيه (Role Routing Test)', 'Target Role Privilege to Test')}
                    </label>
                    <select
                      value={selectedRole}
                      onChange={e => setSelectedRole(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-teal-500/40 rounded-xl px-3.5 py-2.5 text-teal-300 font-black focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="Super Admin">Super Admin (مدير النظام الأقصى)</option>
                      <option value="HR Manager">HR Manager (مدير الموارد البشرية)</option>
                      <option value="Recruiter">Recruiter (مسؤول التوظيف والاستقطاب)</option>
                      <option value="Department Head">Department Head (رئيس قسم)</option>
                      <option value="Employee">Employee (موظف - بوابة الخدمة الذاتية)</option>
                      <option value="IT Admin">IT Admin (مسؤول تكنولوجيا المعلومات)</option>
                    </select>
                  </div>

                  {/* Simulated 2FA Section */}
                  <div className="p-3.5 rounded-2xl bg-[#0a0c10] border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 font-bold flex items-center gap-1.5 text-[11px]">
                        <span className="material-symbols-outlined text-amber-400 text-base">phonelink_lock</span>
                        {t('المصادقة الثنائية (2FA OTP)', 'Two-Factor OTP Verification')}
                      </span>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="text-[10px] font-bold text-teal-400 bg-teal-500/10 px-2 py-1 rounded-lg border border-teal-500/20 hover:bg-teal-500/20"
                      >
                        {isMfaSent ? t('إعادة إرسال OTP', 'Resend OTP') : t('إرسال رمز OTP', 'Send OTP Code')}
                      </button>
                    </div>

                    {isMfaSent && (
                      <input
                        type="text"
                        placeholder="أدخل الرمز (948201)"
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value)}
                        className="w-full bg-[#111827] border border-teal-500/30 rounded-xl px-3 py-2 text-center text-teal-400 font-mono font-black tracking-widest text-sm focus:outline-none"
                      />
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-black text-xs shadow-lg shadow-teal-600/25 transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">lock_open</span>
                    {t('مصادقة الجلسة وتوجيه الحساب', 'Authenticate & Route Session')}
                  </button>
                </form>
              </div>

              {/* Live Routing Result Panel */}
              <div className="space-y-4">
                <div className="p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-white/10">
                    <span className="material-symbols-outlined text-teal-400">alt_route</span>
                    {t('نتيجة المصادقة والتوجيه المباشر', 'Live Authentication & Routing Output')}
                  </h2>

                  {authResult ? (
                    <div className="space-y-3 animate-in fade-in duration-300">
                      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-emerald-400 text-2xl">check_circle</span>
                          <div>
                            <p className="text-xs font-black text-emerald-400">{t('تمت المصادقة والتوجيه بنجاح', 'Authentication & Routing Successful')}</p>
                            <p className="text-[10px] text-slate-400">وقت المصادقة: {authResult.timestamp}</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-mono font-bold">
                          HTTP 200 OK
                        </span>
                      </div>

                      <div className="p-4 rounded-2xl bg-[#0a0c10] border border-white/5 space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-white/5">
                          <span className="text-slate-400">{t('المستخدم المصادق:', 'Authenticated User:')}</span>
                          <span className="text-white font-bold">{authResult.user}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-white/5">
                          <span className="text-slate-400">{t('الصلاحية الممنوحة:', 'Granted Privilege:')}</span>
                          <span className="text-teal-400 font-bold">{authResult.role}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-white/5">
                          <span className="text-slate-400">{t('مسار الواجهة المستهدفة:', 'Target Dashboard Route:')}</span>
                          <span className="text-emerald-400 font-mono font-bold">/{authResult.targetRoute}</span>
                        </div>
                        <div className="py-1">
                          <span className="text-slate-400 block mb-1">{t('رمز التوكن المشفر (JWT Session Token):', 'JWT Session Token:')}</span>
                          <p className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400 break-all">
                            {authResult.token}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => setActiveModuleId(authResult.targetRoute)}
                        className="w-full py-2.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 font-bold text-xs border border-teal-500/30 flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                        {t('الانتقال المباشر للوحة الواجهة الموجهة', 'Navigate to Target Dashboard View')}
                      </button>
                    </div>
                  ) : (
                    <div className="p-8 rounded-2xl bg-[#0a0c10] border border-white/5 text-center text-slate-400 space-y-2">
                      <span className="material-symbols-outlined text-3xl text-slate-600">lock</span>
                      <p className="text-xs font-bold">{t('قم بتعبئة النموذج والضغط على "مصادقة وتوجيه" لاختبار التوجيه', 'Fill form and click Authenticate to test role routing')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ACTIVE SESSIONS */}
          {activeSecureTab === 'sessions' && (
            <div className="p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-teal-400">devices</span>
                    {t('الجلسات النشطة والأجهزة المتصلة بالمؤسسة', 'Active Institution Sessions & Device Manager')}
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">{t('تتبع الجلسات المفتوحة مع إمكانية الإنهاء الفوري للأجهزة المشبوهة', 'Monitor active sessions with instant remote termination capability')}</p>
                </div>
                <button
                  onClick={() => {
                    setActiveSessions(prev => prev.slice(0, 1));
                    addNotification({ title: t('إنهاء الجلسات', 'Sessions Terminated'), message: t('تم إنهاء جميع الجلسات الأخرى بنجاح', 'All other sessions terminated'), type: 'warning' });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/20"
                >
                  {t('إنهاء كافة الجلسات الأخرى', 'Terminate All Other Sessions')}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400">
                      <th className="pb-3 text-start font-bold">{t('المستخدم والدور', 'User & Role')}</th>
                      <th className="pb-3 text-start font-bold">{t('الجهاز ونظام التشغيل', 'Device & OS')}</th>
                      <th className="pb-3 text-start font-bold">{t('عنوان IP والموقع', 'IP Address & Location')}</th>
                      <th className="pb-3 text-start font-bold">{t('طريقة المصادقة', 'Auth Method')}</th>
                      <th className="pb-3 text-start font-bold">{t('وقت النشاط', 'Active Time')}</th>
                      <th className="pb-3 text-center font-bold">{t('الإجراء', 'Action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {activeSessions.map(session => (
                      <tr key={session.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            <div>
                              <p className="font-bold text-white">{session.user}</p>
                              <span className="text-[10px] text-teal-400 font-bold">{session.role}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-slate-300 font-mono">{session.device}</td>
                        <td className="py-3">
                          <p className="text-slate-200 font-mono">{session.ip}</p>
                          <p className="text-[10px] text-slate-500">{session.location}</p>
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-700">
                            {session.method}
                          </span>
                        </td>
                        <td className="py-3 text-slate-400">{session.time}</td>
                        <td className="py-3 text-center">
                          {session.isCurrent ? (
                            <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                              {t('الجلسة الحالية', 'Current Session')}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleTerminateSession(session.id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-bold border border-rose-500/20"
                            >
                              {t('إنهاء الجلسة', 'Terminate')}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: ROLE MATRIX */}
          {activeSecureTab === 'matrix' && (
            <div className="p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-white/10">
                <span className="material-symbols-outlined text-teal-400">grid_view</span>
                {t('مصفوفة توجيه وتقسيم الصلاحيات بالأدوار', 'Role Permission Matrix Visualizer')}
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-center border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 bg-[#0a0c10]">
                      <th className="p-3 text-start">{t('موديولات النظام / الأقسام', 'System Modules')}</th>
                      <th className="p-3">Super Admin</th>
                      <th className="p-3">HR Manager</th>
                      <th className="p-3">Recruiter</th>
                      <th className="p-3">Department Head</th>
                      <th className="p-3">Employee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    <tr>
                      <td className="p-3 text-start font-bold text-white">إدارة الموظفين والملفات</td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">Full Admin</span></td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">Full Admin</span></td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">Read / Edit</span></td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-bold">Dept Only</span></td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-bold">Self Only</span></td>
                    </tr>
                    <tr>
                      <td className="p-3 text-start font-bold text-white">حسابات وتجهيز الرواتب</td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">Full Admin</span></td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">Full Admin</span></td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold">No Access</span></td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-bold">Approve Only</span></td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">Payslip View</span></td>
                    </tr>
                    <tr>
                      <td className="p-3 text-start font-bold text-white">موديول الأرشفة المستندية</td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">Full Admin</span></td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">Full Admin</span></td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">Read Only</span></td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">Dept Archive</span></td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-bold">My Files Only</span></td>
                    </tr>
                    <tr>
                      <td className="p-3 text-start font-bold text-white">إعدادات الأمان والصلاحيات</td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">Full Admin</span></td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold">No Access</span></td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold">No Access</span></td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold">No Access</span></td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold">No Access</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT LOGS */}
          {activeSecureTab === 'logs' && (
            <div className="p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-white/10">
                <span className="material-symbols-outlined text-teal-400">receipt_long</span>
                {t('سجل التدقيق والأحداث الأمنية', 'Security Audit Trail & Event Log')}
              </h2>

              <div className="space-y-2">
                {auditLogs.map(log => (
                  <div key={log.id} className="p-3 rounded-2xl bg-[#0a0c10] border border-white/5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${
                        log.status === 'success' ? 'bg-emerald-400' : log.status === 'warning' ? 'bg-amber-400' : 'bg-blue-400'
                      }`}></span>
                      <div>
                        <p className="font-bold text-white">{log.event}</p>
                        <p className="text-[10px] text-slate-400">{log.user} • IP: {log.ip}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">{log.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODULE 2: CORPORATE SSO LOGIN (auth-sso) */}
      {/* ========================================================================= */}
      {activeModuleId === 'auth-sso' && (
        <div className="space-y-6">
          {/* SSO Identity Providers Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              onClick={() => setSsoProvider('azure')}
              className={`p-5 rounded-3xl border cursor-pointer transition-all ${
                ssoProvider === 'azure'
                  ? 'bg-gradient-to-br from-blue-950/60 to-slate-900 border-blue-500 text-white shadow-xl shadow-blue-500/10'
                  : 'bg-[#111827] border-white/10 text-slate-300 hover:border-white/20'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-2xl">cloud_sync</span>
              </div>
              <h3 className="text-xs font-bold">Microsoft Entra ID / Azure AD</h3>
              <p className="text-[10px] text-slate-400 mt-1">SAML 2.0 / OpenID Connect Sync</p>
              <span className="mt-3 inline-block text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                نشط ومعتمد
              </span>
            </div>

            <div
              onClick={() => setSsoProvider('adfs')}
              className={`p-5 rounded-3xl border cursor-pointer transition-all ${
                ssoProvider === 'adfs'
                  ? 'bg-gradient-to-br from-emerald-950/60 to-slate-900 border-emerald-500 text-white shadow-xl shadow-emerald-500/10'
                  : 'bg-[#111827] border-white/10 text-slate-300 hover:border-white/20'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-2xl">lan</span>
              </div>
              <h3 className="text-xs font-bold">Active Directory (ADFS)</h3>
              <p className="text-[10px] text-slate-400 mt-1">On-Premises Directory Server</p>
              <span className="mt-3 inline-block text-[9px] font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                مربوط محلياً
              </span>
            </div>

            <div
              onClick={() => setSsoProvider('google')}
              className={`p-5 rounded-3xl border cursor-pointer transition-all ${
                ssoProvider === 'google'
                  ? 'bg-gradient-to-br from-amber-950/60 to-slate-900 border-amber-500 text-white shadow-xl shadow-amber-500/10'
                  : 'bg-[#111827] border-white/10 text-slate-300 hover:border-white/20'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-2xl">workspace_premium</span>
              </div>
              <h3 className="text-xs font-bold">Google Workspace</h3>
              <p className="text-[10px] text-slate-400 mt-1">Enterprise OAuth2 SSO</p>
              <span className="mt-3 inline-block text-[9px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                مزود احتياطي
              </span>
            </div>

            <div
              onClick={() => setSsoProvider('okta')}
              className={`p-5 rounded-3xl border cursor-pointer transition-all ${
                ssoProvider === 'okta'
                  ? 'bg-gradient-to-br from-purple-950/60 to-slate-900 border-purple-500 text-white shadow-xl shadow-purple-500/10'
                  : 'bg-[#111827] border-white/10 text-slate-300 hover:border-white/20'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-2xl">badge</span>
              </div>
              <h3 className="text-xs font-bold">Okta Identity Cloud</h3>
              <p className="text-[10px] text-slate-400 mt-1">Federated SSO & Adaptive MFA</p>
              <span className="mt-3 inline-block text-[9px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                متاح للتخصيص
              </span>
            </div>
          </div>

          {/* SSO Configuration & Test Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Settings */}
            <div className="p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-white/10">
                <span className="material-symbols-outlined text-teal-400">settings_applications</span>
                {t('إعدادات موديول SSO المؤسسي', 'Corporate SSO Parameters')}
              </h2>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">{t('نطاق المؤسسة المعتمد (Corporate Domain)', 'Corporate Domain')}</label>
                  <input
                    type="text"
                    value={ssoDomain}
                    onChange={e => setSsoDomain(e.target.value)}
                    className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-teal-400 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Tenant Directory ID</label>
                  <input
                    type="text"
                    value={tenantId}
                    onChange={e => setTenantId(e.target.value)}
                    className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Application Client ID</label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                    className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-slate-300 font-mono"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-[#0a0c10] border border-white/5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white text-xs">{t('إنشاء الموظفين الجدد تلقائياً (JIT Auto-Provisioning)', 'Just-In-Time Auto Provisioning')}</p>
                    <p className="text-[10px] text-slate-400">{t('إنشاء حساب HRMS فور تسليم توكن SSO من الدليل', 'Create HRMS profile automatically upon SSO assertion')}</p>
                  </div>
                  <button
                    onClick={() => setAutoProvision(!autoProvision)}
                    className={`w-10 h-6 rounded-full transition-colors relative ${autoProvision ? 'bg-teal-500' : 'bg-slate-700'}`}
                  >
                    <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${autoProvision ? 'right-5' : 'right-1'}`}></span>
                  </button>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleTestSso}
                    disabled={isTestingSso}
                    className="flex-1 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-sm">{isTestingSso ? 'sync' : 'network_check'}</span>
                    {isTestingSso ? t('جاري اختبار الاتصال...', 'Testing SSO...') : t('اختبار اتصال مزود SSO', 'Test SSO Connection')}
                  </button>
                </div>

                {ssoTestResult && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400">verified</span>
                    {ssoTestResult}
                  </div>
                )}
              </div>
            </div>

            {/* Launch SSO Card */}
            <div className="p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-6 text-center flex flex-col justify-between">
              <div>
                <div className="w-16 h-16 rounded-3xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-3xl">corporate_fare</span>
                </div>
                <h3 className="text-base font-bold text-white">{t('بوابة الدخول الموحد لشركة فيتاس العراق', 'VITAS Iraq Corporate Identity Gateway')}</h3>
                <p className="text-xs text-slate-400 mt-2">
                  {t('تسجيل الدخول الآمن بنقرة واحدة باستخدام بريد المؤسسة الرسمي (@vitasiraq.com) دون الحاجة لإدخال كلمات مرور إضافية.', 'One-click SSO sign-in using corporate email (@vitasiraq.com) backed by Azure AD MFA.')}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#0a0c10] border border-white/5 text-start text-xs space-y-2 font-mono">
                <div className="flex justify-between py-1 border-b border-white/5 text-slate-400">
                  <span>Redirect URI:</span>
                  <span className="text-teal-400">https://hrms.vitasiraq.com/auth/sso/callback</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5 text-slate-400">
                  <span>Certificate Status:</span>
                  <span className="text-emerald-400">Valid (2026-2027)</span>
                </div>
                <div className="flex justify-between py-1 text-slate-400">
                  <span>Encryption:</span>
                  <span className="text-slate-200">SAML 2.0 / SHA-256</span>
                </div>
              </div>

              <button
                onClick={() => alert(t('تم بدء المصادقة وتأكيد الهوية عبر Microsoft Azure AD', 'Initiating identity confirmation via Microsoft Azure AD'))}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-teal-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-black text-xs shadow-xl shadow-teal-600/30 flex items-center justify-center gap-2 transition-all"
              >
                <span className="material-symbols-outlined text-lg">login</span>
                {t('الدخول المباشر بحساب Microsoft Vitas Iraq', 'Sign in with Microsoft Vitas Iraq Account')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODULE 3: BIOMETRIC AUTHENTICATION (auth-biometric) */}
      {/* ========================================================================= */}
      {activeModuleId === 'auth-biometric' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Biometric Scanner Simulator */}
            <div className="p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-6 text-center">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 text-start">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-teal-400">fingerprint</span>
                    {t('محاكي الفحص البيومتري المباشر (Biometric Scanner)', 'Live Biometric Scanner Simulator')}
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">{t('دعم معايير FIDO2 / WebAuthn للبصمة والوجه', 'FIDO2 / WebAuthn fingerprint & face recognition support')}</p>
                </div>
                <div className="flex bg-[#0a0c10] p-1 rounded-xl border border-white/10 text-xs">
                  <button
                    onClick={() => setScanType('fingerprint')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${scanType === 'fingerprint' ? 'bg-teal-600 text-white' : 'text-slate-400'}`}
                  >
                    بصمة الإصبع
                  </button>
                  <button
                    onClick={() => setScanType('face')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${scanType === 'face' ? 'bg-teal-600 text-white' : 'text-slate-400'}`}
                  >
                    التعرف على الوجه
                  </button>
                </div>
              </div>

              {/* Interactive Scanner Graphic */}
              <div className="relative py-8">
                <div className={`w-32 h-32 mx-auto rounded-full border-4 transition-all flex items-center justify-center relative ${
                  isScanning 
                    ? 'border-teal-400 bg-teal-500/10 shadow-[0_0_50px_rgba(20,184,166,0.5)] animate-pulse' 
                    : scanResult?.success
                      ? 'border-emerald-400 bg-emerald-500/10'
                      : 'border-slate-700 bg-slate-900/50'
                }`}>
                  <span className={`material-symbols-outlined text-6xl transition-all ${
                    isScanning ? 'text-teal-400 scale-110' : scanResult?.success ? 'text-emerald-400' : 'text-slate-500'
                  }`}>
                    {scanType === 'fingerprint' ? 'fingerprint' : 'face_5'}
                  </span>

                  {isScanning && (
                    <div className="absolute inset-0 rounded-full border-2 border-teal-400 animate-ping opacity-75"></div>
                  )}
                </div>

                <p className="text-xs font-bold text-slate-300 mt-4">
                  {isScanning 
                    ? t('جاري المسح الضوئي والمطابقة الهيدروليكية...', 'Scanning & matching biometric template...')
                    : scanResult?.success
                      ? t(`تم التحقق من الموظف: ${scanResult.name} (البادج: ${scanResult.badge})`, `Verified: ${scanResult.name} (Badge: ${scanResult.badge})`)
                      : t('اضغط على "بدء المسح الضوئي" لااختبار المصادقة الحيوية', 'Click "Start Scan" to test biometric authentication')
                  }
                </p>

                {scanResult?.success && (
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-black">
                    <span className="material-symbols-outlined text-base">verified</span>
                    <span>نسبة مطابقة البصمة: {scanResult.score}% (FIDO2 Certified)</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleBiometricScan}
                disabled={isScanning}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-black text-xs shadow-xl shadow-teal-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">{scanType === 'fingerprint' ? 'touch_app' : 'center_focus_strong'}</span>
                {isScanning ? t('جاري مسح البصمة الحيوية...', 'Scanning...') : t('بدء المسح البيومتري المباشر', 'Start Biometric Scan Test')}
              </button>
            </div>

            {/* Registered Hardware Terminals Panel */}
            <div className="p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-white/10">
                <span className="material-symbols-outlined text-teal-400">precision_manufacturing</span>
                {t('أجهزة التبصيم المتصلة بالفروع (Biometric Hardware Terminals)', 'Connected Hardware Terminals')}
              </h2>

              <div className="space-y-3">
                {terminals.map(term => (
                  <div key={term.id} className="p-4 rounded-2xl bg-[#0a0c10] border border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${term.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                        <span className="font-bold text-white">{term.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                        {term.type}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-slate-400">
                      <span>الموقع: {term.location}</span>
                      <span>الموظفين المسجلين: <strong className="text-emerald-400">{term.enrolledCount}</strong></span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Biometric Policy Controls */}
              <div className="p-4 rounded-2xl bg-[#0a0c10] border border-white/5 space-y-3 text-xs">
                <h3 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-teal-400 text-base">verified_user</span>
                  {t('سياسات الدقة ومنع التزييف (Anti-Spoofing Rules)', 'Anti-Spoofing & Liveness Detection Rules')}
                </h3>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{t('درجة الصرامة عند مطابقة البصمة الحيوية:', 'Liveness Strictness Level:')}</span>
                  <select
                    value={livenessStrictness}
                    onChange={e => setLivenessStrictness(e.target.value)}
                    className="bg-[#111827] border border-white/10 rounded-lg px-2.5 py-1 text-teal-400 font-bold focus:outline-none"
                  >
                    <option value="high">عالية جداً (Strict 99.5%+)</option>
                    <option value="medium">متوسطة (Standard 95%+)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
