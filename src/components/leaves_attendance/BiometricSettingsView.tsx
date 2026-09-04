import React, { useState, useEffect } from 'react';
import {
  BiometricServerSettings,
  BiometricTestResult,
  Language,
  RawAttendanceLog,
} from './types';
import { translations } from './translations';

interface BiometricSettingsViewProps {
  settings: BiometricServerSettings;
  rawLogs: RawAttendanceLog[];
  lang: Language;
  employees?: any[];
  onSaveSettings: (settings: Partial<BiometricServerSettings>) => Promise<void>;
  onTestConnection: (params: any) => Promise<BiometricTestResult>;
  onSimulatePunch: (employeeId: number, punchType: string, verifyMode: string) => Promise<void>;
  onSyncNow: () => void;
  isSyncing: boolean;
}

export const BiometricSettingsView: React.FC<BiometricSettingsViewProps> = ({
  settings,
  rawLogs: initialRawLogs,
  lang,
  employees,
  onSaveSettings,
  onTestConnection,
  onSimulatePunch,
  onSyncNow,
  isSyncing,
}) => {
  const t = translations[lang];

  const [formData, setFormData] = useState<any>({
    host: settings?.host || '127.0.0.1',
    port: settings?.port || 1433,
    db_name: (settings as any)?.db_name || 'att',
    username: settings?.username || 'sa',
    password: settings?.password || '',
    auth_mode: (settings as any)?.auth_mode || 'sql',
    table_name: (settings as any)?.table_name || 'iclock_transaction',
    sync_interval_mins: (settings as any)?.sync_interval_mins || 15,
    auto_sync_enabled: settings?.auto_sync_enabled !== false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Raw logs state & live polling
  const [liveRawLogs, setLiveRawLogs] = useState<RawAttendanceLog[]>(initialRawLogs || []);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logFilter, setLogFilter] = useState('');

  // Simulator state
  const [simEmployeeId, setSimEmployeeId] = useState<number>(1);
  const [simPunchType, setSimPunchType] = useState<string>('check_in');
  const [simVerifyMode, setSimVerifyMode] = useState<string>('fingerprint');
  const [simMessage, setSimMessage] = useState<string>('');

  const employeeList = employees && employees.length > 0 ? employees : [
    { id: 1, badgeNo: '1001', name: 'أحمد سعدي الموسوي' },
    { id: 2, badgeNo: '1002', name: 'فاطمة حسين خليل' },
    { id: 3, badgeNo: '1003', name: 'علي جاسم كريم' },
    { id: 4, badgeNo: '1004', name: 'مصطفى حسن كاظم' },
    { id: 5, badgeNo: '1005', name: 'زينب عبد الجبار' },
    { id: 6, badgeNo: '1006', name: 'حيدر جاسم الفتلاوي' },
    { id: 7, badgeNo: '1007', name: 'مريم عادل طارق' },
    { id: 8, badgeNo: '1008', name: 'عمر فاروق عبد الله' },
  ];

  // Fetch real settings and raw logs from API on load
  const fetchLiveConfigAndLogs = async () => {
    try {
      setIsLoadingLogs(true);
      const [cfgRes, logsRes] = await Promise.all([
        fetch('/api/biometric/settings').then(r => r.json()).catch(() => null),
        fetch('/api/biometric/raw-logs?limit=50').then(r => r.json()).catch(() => null)
      ]);

      if (cfgRes && cfgRes.settings) {
        setFormData((prev: any) => ({
          ...prev,
          ...cfgRes.settings,
          auto_sync_enabled: cfgRes.settings.auto_sync_enabled === 1 || cfgRes.settings.auto_sync_enabled === true
        }));
      }

      if (logsRes && Array.isArray(logsRes.raw_logs) && logsRes.raw_logs.length > 0) {
        setLiveRawLogs(logsRes.raw_logs);
      }
    } catch (e) {
      // fallback
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLiveConfigAndLogs();
  }, []);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await onTestConnection({
        host: formData.host,
        port: Number(formData.port),
        db_name: formData.db_name,
        username: formData.username,
        password: formData.password,
        auth_mode: formData.auth_mode,
        table_name: formData.table_name,
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        status: 'error',
        message_ar: `فشل الاتصال بسرفر البصمة (${formData.host}:${formData.port}). يرجى التحقق من العنوان وصلاحيات الدخول.`,
        message_en: `Failed to connect to (${formData.host}:${formData.port}). Check host and credentials.`,
        latency_ms: 0
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveSettings(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
      fetchLiveConfigAndLogs();
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerSim = async () => {
    try {
      await onSimulatePunch(simEmployeeId, simPunchType, simVerifyMode);
      const emp = employeeList.find(e => e.id === simEmployeeId) || employeeList[0];
      setSimMessage(
        lang === 'ar'
          ? `تم تسجيل البصمة بنجاح لـ (${emp.badgeNo || `EMP-100${emp.id}`}) ${emp.name || emp.fullName} في جدول البصمات وتوليد سجل الدوام!`
          : `Punch recorded for (${emp.badgeNo || `EMP-100${emp.id}`}) ${emp.name || emp.fullName} into Raw Logs!`
      );
      setTimeout(() => setSimMessage(''), 5000);
      fetchLiveConfigAndLogs();
    } catch (e) {}
  };

  const filteredLogs = liveRawLogs.filter(log => {
    if (!logFilter) return true;
    const q = logFilter.toLowerCase();
    return (
      (log.employee_biometric_id && log.employee_biometric_id.toLowerCase().includes(q)) ||
      (log.employee_name_ar && log.employee_name_ar.toLowerCase().includes(q)) ||
      (log.employee_name_en && log.employee_name_en.toLowerCase().includes(q)) ||
      (log.punch_datetime && log.punch_datetime.includes(q)) ||
      (log.device_id && log.device_id.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner with Architecture Indicators */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                {lang === 'ar' ? 'الربط الديناميكي لسرفر البصمة (MS SQL Server ⇄ XAMPP)' : 'Biometric Server Connection (MS SQL Server ⇄ XAMPP)'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                <span>MS SQL Server (LAN / Local)</span>
              </span>
              <span className="text-xs text-slate-400 font-bold">⇄</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                MySQL (vitasiraq_hris_db)
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {lang === 'ar'
                ? 'ربط مباشر وديناميكي مع قاعدة بيانات أجهزة البصمة (ZKTeco / BioTime / BioStar) على الحاسوب الحالي أو عبر الشبكة المحلية (LAN).'
                : 'Dynamic connection to ZKTeco / BioTime biometric database locally or across the local network (LAN).'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onSyncNow();
                setTimeout(fetchLiveConfigAndLogs, 1500);
              }}
              disabled={isSyncing}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-teal-600 hover:bg-teal-500 active:scale-95 shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <span className={`material-symbols-outlined text-sm ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
              <span>{isSyncing ? (lang === 'ar' ? 'جاري المزامنة...' : 'Syncing...') : (lang === 'ar' ? 'مزامنة فورية من السرفر' : 'Sync Now')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Connection Form & Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Connection Settings Form */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSave} className="p-6 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-500">settings_ethernet</span>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {lang === 'ar' ? 'إعدادات عنوان واتصال سرفر البصمة (LAN / Local IP)' : 'Biometric Server Host & Credentials'}
                </h2>
              </div>

              {saveSuccess && (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-fade-in">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  <span>{lang === 'ar' ? 'تم الحفظ وتطبيق الإعدادات' : 'Saved Successfully'}</span>
                </span>
              )}
            </div>

            {/* Quick Presets */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                {lang === 'ar' ? 'خيارات وطريقة الاتصال بسرفر البصمة:' : 'Connection Method Presets:'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, host: '127.0.0.1', port: 1433, db_name: formData.db_name || 'att' })}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 ${formData.host === '127.0.0.1' || formData.host === 'localhost' ? 'bg-teal-600 text-white border-teal-500 shadow-sm' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'}`}
                >
                  <span className="material-symbols-outlined text-xs">computer</span>
                  <span>{lang === 'ar' ? '🖥️ هذا الحاسوب (Localhost)' : '🖥️ Localhost (127.0.0.1)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const name = prompt(lang === 'ar' ? 'أدخل اسم حاسوب سرفر البصمة في الشبكة (مثال: ATT-SERVER أو DESKTOP-ZK):' : 'Enter Fingerprint Computer Name (e.g. ATT-SERVER):', 'ATT-SERVER');
                    if (name) setFormData({ ...formData, host: name.trim() });
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 ${!['127.0.0.1', 'localhost'].includes(formData.host) && !/\d+\.\d+\.\d+\.\d+/.test(formData.host) ? 'bg-blue-600 text-white border-blue-500 shadow-sm' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'}`}
                >
                  <span className="material-symbols-outlined text-xs">badge</span>
                  <span>{lang === 'ar' ? '📛 اسم الحاسوب (Hostname)' : '📛 Computer Name'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ip = prompt(lang === 'ar' ? 'أدخل عنوان IP لحاسوب سرفر البصمة (مثال: 192.168.1.50):' : 'Enter Fingerprint Server IP (e.g. 192.168.1.50):', '192.168.1.100');
                    if (ip) setFormData({ ...formData, host: ip.trim() });
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 ${/\d+\.\d+\.\d+\.\d+/.test(formData.host) && formData.host !== '127.0.0.1' ? 'bg-amber-600 text-white border-amber-500 shadow-sm' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'}`}
                >
                  <span className="material-symbols-outlined text-xs">lan</span>
                  <span>{lang === 'ar' ? '🌐 عنوان IP (LAN IP)' : '🌐 IP Address'}</span>
                </button>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'عنوان الخادم (اسم الحاسوب أو عنوان IP):' : 'Server Host (Computer Name or IP):'}
                </label>
                <input
                  type="text"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  placeholder="ATT-SERVER أو 192.168.1.50 أو localhost"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'منفذ الاتصال (Port):' : 'Port:'}
                </label>
                <input
                  type="number"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                  placeholder="1433"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'اسم قاعدة بيانات البصمة (Database Name):' : 'Database Name:'}
                </label>
                <input
                  type="text"
                  value={formData.db_name || ''}
                  onChange={(e) => setFormData({ ...formData, db_name: e.target.value })}
                  placeholder="att أو BioStar أو zkeco"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'جدول حركات التبصيم (Table Name):' : 'Punch Table Name:'}
                </label>
                <input
                  type="text"
                  value={formData.table_name || 'iclock_transaction'}
                  onChange={(e) => setFormData({ ...formData, table_name: e.target.value })}
                  placeholder="iclock_transaction أو CHECKINOUT"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'نوع المصادقة (Authentication Mode):' : 'Authentication Mode:'}
                </label>
                <select
                  value={formData.auth_mode || 'sql'}
                  onChange={(e) => setFormData({ ...formData, auth_mode: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 font-medium"
                >
                  <option value="sql">SQL Server Authentication (User & Password)</option>
                  <option value="windows">Windows Integrated Authentication (NTLM / Local)</option>
                </select>
              </div>

              {formData.auth_mode === 'sql' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {lang === 'ar' ? 'اسم مستخدم قاعدة البيانات (User):' : 'DB Username:'}
                    </label>
                    <input
                      type="text"
                      value={formData.username || ''}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="sa أو biometric_sync_user"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {lang === 'ar' ? 'كلمة المرور (Password):' : 'DB Password:'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password || ''}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="••••••••••••"
                        className="w-full px-3 py-2 pe-10 rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:border-teal-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute end-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Auto Sync Settings */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'المزامنة التلقائية الدورية:' : 'Auto-Sync Interval:'}
                </label>
                <select
                  value={formData.sync_interval_mins || 15}
                  onChange={(e) => setFormData({ ...formData, sync_interval_mins: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 font-medium"
                >
                  <option value={5}>{lang === 'ar' ? 'كل 5 دقائق (تحديث سريع)' : 'Every 5 Minutes (Fast)'}</option>
                  <option value={10}>{lang === 'ar' ? 'كل 10 دقائق' : 'Every 10 Minutes'}</option>
                  <option value={15}>{lang === 'ar' ? 'كل 15 دقيقة (افتراضي)' : 'Every 15 Minutes (Default)'}</option>
                  <option value={30}>{lang === 'ar' ? 'كل 30 دقيقة' : 'Every 30 Minutes'}</option>
                  <option value={60}>{lang === 'ar' ? 'كل ساعة' : 'Every 1 Hour'}</option>
                </select>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.auto_sync_enabled}
                    onChange={(e) => setFormData({ ...formData, auto_sync_enabled: e.target.checked })}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {lang === 'ar' ? 'تفعيل الجدولة التلقائية في الخلفية' : 'Enable Background Auto-Sync'}
                  </span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-white/10">
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <span className={`material-symbols-outlined text-sm ${isTesting ? 'animate-spin' : ''}`}>
                  {isTesting ? 'sync' : 'wifi_tethering'}
                </span>
                <span>{isTesting ? (lang === 'ar' ? 'جاري فحص الاتصال...' : 'Testing...') : (lang === 'ar' ? 'فحص الاتصال بالسرفر' : 'Test Connection')}</span>
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 active:scale-95 shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-sm">save</span>
                <span>{isSaving ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ وتطبيق الإعدادات' : 'Save Settings')}</span>
              </button>
            </div>

            {/* Test Connection Result Box */}
            {testResult && (
              <div className={`p-4 rounded-2xl text-xs border ${
                testResult.success
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
              }`}>
                <div className="flex items-center justify-between font-bold mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">
                      {testResult.success ? 'check_circle' : 'error'}
                    </span>
                    <span>{testResult.success ? (lang === 'ar' ? 'نجح الاتصال بسرفر البصمة!' : 'Connected Successfully!') : (lang === 'ar' ? 'فشل الاتصال بسرفر البصمة' : 'Connection Failed')}</span>
                  </div>
                  {testResult.latency_ms > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 font-mono">
                      {testResult.latency_ms}ms
                    </span>
                  )}
                </div>
                <p className="text-[11px] leading-relaxed">
                  {lang === 'ar' ? testResult.message_ar : testResult.message_en}
                </p>
                {testResult.server_version && (
                  <div className="mt-2 pt-2 border-t border-current/10 font-mono text-[10px] opacity-80">
                    {testResult.server_version} ({testResult.driver})
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Right Side: Biometric Punch Simulator & Status Summary */}
        <div className="lg:col-span-5 space-y-6">
          {/* Punch Simulator Box */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-white/10">
              <span className="material-symbols-outlined text-teal-500">fingerprint</span>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {lang === 'ar' ? 'محاكي تسجيل البصمات الحي (Punch Simulator)' : 'Live Punch Simulator'}
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {lang === 'ar' ? 'تسجيل حركة تبصيم فورية واحتساب الدوام وساعات التأخير آلياً' : 'Simulate hardware punch and recalculate attendance'}
                </p>
              </div>
            </div>

            {simMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs border border-emerald-500/20 font-medium animate-fade-in">
                {simMessage}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'الموظف:' : 'Employee:'}
                </label>
                <select
                  value={simEmployeeId}
                  onChange={(e) => setSimEmployeeId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 font-bold focus:outline-none"
                >
                  {employeeList.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      ({emp.badgeNo ? `EMP-${emp.badgeNo}` : `EMP-100${emp.id}`}) {emp.name || emp.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'نوع الحركة:' : 'Punch Type:'}
                  </label>
                  <select
                    value={simPunchType}
                    onChange={(e) => setSimPunchType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    <option value="check_in">{lang === 'ar' ? 'دخول (Check In)' : 'Check In'}</option>
                    <option value="check_out">{lang === 'ar' ? 'خروج (Check Out)' : 'Check Out'}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'طريقة البصمة:' : 'Verify Mode:'}
                  </label>
                  <select
                    value={simVerifyMode}
                    onChange={(e) => setSimVerifyMode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    <option value="fingerprint">{lang === 'ar' ? 'بصمة إصبع (Fingerprint)' : 'Fingerprint'}</option>
                    <option value="face">{lang === 'ar' ? 'بصمة وجه (Face)' : 'Face Recognition'}</option>
                    <option value="card">{lang === 'ar' ? 'بطاقة ذكية (Card/RFID)' : 'RFID Card'}</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTriggerSim}
                className="w-full py-2.5 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-500 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98"
              >
                <span className="material-symbols-outlined text-sm">touch_app</span>
                <span>{lang === 'ar' ? 'تسجيل حركة تبصيم الآن' : 'Record Simulated Punch'}</span>
              </button>
            </div>
          </div>

          {/* Quick Technical Help Info */}
          <div className="p-5 rounded-3xl bg-slate-50 dark:bg-[#0d121c] border border-slate-200 dark:border-white/5 text-xs space-y-2">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-blue-500">info</span>
              <span>{lang === 'ar' ? 'دليل تهيئة سرفر البصمة عبر الشبكة (LAN):' : 'LAN Configuration Guide:'}</span>
            </h3>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              <li>{lang === 'ar' ? 'تأكد من تفعيل بروتوكول TCP/IP في SQL Server Configuration Manager على جهاز سرفر البصمة.' : 'Ensure TCP/IP is enabled in SQL Server Configuration Manager on the host.'}</li>
              <li>{lang === 'ar' ? 'تأكد من فتح المنفذ 1433 في جدار حماية ويندوز (Windows Firewall).' : 'Ensure Port 1433 is open in Windows Firewall on the remote PC.'}</li>
              <li>{lang === 'ar' ? 'إذا كان اسم السرفر SQLEXPRESS، يمكنك استخدام المنفذ المحدد للـ Instance أو كتابة IP مباشرة.' : 'If using SQLEXPRESS instance, connect via port 1433 or dynamic port.'}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Section: Live Raw Logs Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-500">receipt_long</span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {lang === 'ar' ? 'سجل حركات البصمة الخام المستوردة (Raw Attendance Logs Stream)' : 'Raw Attendance Logs Stream'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {lang === 'ar' ? 'عرض الحركات الفعلية المستوردة من أجهزة البصمة وقاعدة بيانات SQL Server' : 'Live punches pulled from biometric devices & MS SQL Server'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              placeholder={lang === 'ar' ? 'بحث برقم الموظف أو الاسم أو الجهاز...' : 'Filter by ID, name, or device...'}
              className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 focus:outline-none"
            />
            <button
              onClick={fetchLiveConfigAndLogs}
              disabled={isLoadingLogs}
              className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-colors"
              title={lang === 'ar' ? 'تحديث السجل' : 'Refresh logs'}
            >
              <span className={`material-symbols-outlined text-sm ${isLoadingLogs ? 'animate-spin' : ''}`}>refresh</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-white/5 text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">{lang === 'ar' ? 'معرف البصمة' : 'Biometric ID'}</th>
                <th className="py-2.5 px-3">{lang === 'ar' ? 'اسم الموظف' : 'Employee Name'}</th>
                <th className="py-2.5 px-3">{lang === 'ar' ? 'توقيت البصمة' : 'Punch Timestamp'}</th>
                <th className="py-2.5 px-3">{lang === 'ar' ? 'نوع الحركة' : 'Punch Type'}</th>
                <th className="py-2.5 px-3">{lang === 'ar' ? 'نوع التحقق' : 'Verify Mode'}</th>
                <th className="py-2.5 px-3">{lang === 'ar' ? 'معرف الجهاز / الفرع' : 'Device ID / Branch'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    {isLoadingLogs
                      ? (lang === 'ar' ? 'جاري جلب سجلات البصمات...' : 'Loading raw logs...')
                      : (lang === 'ar' ? 'لا توجد حركات تبصيم مسجلة حالياً. اضغط "مزامنة فورية" أو سجل حركة تجريبية.' : 'No biometric logs found. Click "Sync Now" or simulate a punch.')}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => (
                  <tr key={log.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-teal-600 dark:text-teal-400">
                      {log.employee_biometric_id || log.employee_number || `BIO-${log.id}`}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      {lang === 'ar' ? (log.employee_name_ar || log.employee_name_en || 'موظف') : (log.employee_name_en || log.employee_name_ar || 'Employee')}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                      {log.punch_datetime}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.punch_type === 'check_in'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}>
                        {log.punch_type === 'check_in' ? (lang === 'ar' ? 'دخول' : 'Check In') : (lang === 'ar' ? 'خروج' : 'Check Out')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-white/5 font-medium text-slate-600 dark:text-slate-300">
                        {log.verify_mode || 'fingerprint'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                      {log.device_id || 'TERMINAL-01'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
