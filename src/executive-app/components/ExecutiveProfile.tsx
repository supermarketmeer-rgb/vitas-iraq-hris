import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExecutiveContext } from '../context/ExecutiveContext';
import { 
  ShieldCheck, 
  User, 
  Mail, 
  Phone, 
  Building, 
  AlertTriangle, 
  LogOut, 
  Globe, 
  Moon, 
  Sun, 
  Laptop, 
  Smartphone, 
  CheckCircle2,
  FileCheck
} from 'lucide-react';
import vitasLogo from '../../../assets/VitasLogo.jpeg';

export const ExecutiveProfile: React.FC = () => {
  const navigate = useNavigate();
  const { 
    executiveUser, 
    theme, 
    toggleTheme, 
    language, 
    toggleLanguage, 
    t, 
    logout, 
    triggerEmergencyAlert, 
    emergencyAlert, 
    clearEmergencyAlert 
  } = useExecutiveContext();

  const isDark = theme === 'dark';
  const isAr = language === 'ar';

  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState('حالة طوارئ تشغيلية / تنبيه أمني عاجل');
  const [alertMessage, setAlertMessage] = useState('بناءً على توجيهات المدير العام، يرجى الالتزام بالبروتوكول الأمني في كافة الفروع وتعليق المعاملات الميدانية مؤقتاً.');

  const handleBroadcastAlert = (e: React.FormEvent) => {
    e.preventDefault();
    triggerEmergencyAlert(alertTitle, alertMessage);
    setIsAlertModalOpen(false);
  };

  return (
    <div className="p-3.5 space-y-4 pb-20 animate-in fade-in duration-300">
      {/* Title */}
      <div>
        <h2 className="text-base font-bold text-white dark:text-white light:text-slate-900" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
          {t('الملف التنفيذي وإدارة المنظومة', 'Executive Profile & Command Hub')}
        </h2>
        <p className="text-xs text-slate-400">
          {t('إدارة حساب المدير العام، بروتوكولات الأمان وغرفة الطوارئ', 'Managing Director account, security protocols & emergency command')}
        </p>
      </div>

      {/* Profile Card */}
      <div className={`p-4 rounded-2xl border relative overflow-hidden shadow-sm ${
        isDark 
          ? 'bg-gradient-to-br from-[#0c1322] via-[#090e1a] to-[#0d1627] border-amber-500/30 text-white' 
          : 'bg-white border-slate-200 text-slate-900 shadow-md'
      }`}>
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-teal-400 p-0.5 shadow-md shrink-0">
            <div className="w-full h-full rounded-2xl bg-slate-950 flex items-center justify-center text-white font-bold text-lg">
              {executiveUser.fullNameAr?.charAt(0) || 'ش'}
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-mono text-[9px] font-bold">
                {executiveUser.badgeNo}
              </span>
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                <ShieldCheck className="w-3 h-3" />
                {t('صلاحيات قيادية مطلقة', 'Super Executive Access')}
              </span>
            </div>
            <h3 className="text-sm font-bold text-white dark:text-white light:text-slate-900 mt-1 truncate" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
              {isAr ? executiveUser.fullNameAr : executiveUser.fullNameEn}
            </h3>
            <p className="text-xs text-amber-400 font-medium">
              {isAr ? executiveUser.titleAr : executiveUser.titleEn}
            </p>
          </div>
        </div>

        {/* Credentials Details Strip */}
        <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5 text-xs text-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
              <Building className="w-3.5 h-3.5 text-amber-500" />
              {t('المؤسسة:', 'Organization:')}
            </span>
            <span className="font-semibold text-[11px] text-white dark:text-white light:text-slate-900" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
              {isAr ? executiveUser.organizationAr : executiveUser.organizationEn}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
              <Mail className="w-3.5 h-3.5 text-amber-500" />
              {t('البريد المعتمد:', 'Email:')}
            </span>
            <span className="font-mono text-[11px] text-teal-400">
              {executiveUser.email}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
              <Phone className="w-3.5 h-3.5 text-amber-500" />
              {t('الهاتف التنفيذي:', 'Executive Phone:')}
            </span>
            <span className="font-mono text-[11px] text-slate-300">
              {executiveUser.phone}
            </span>
          </div>
        </div>
      </div>

      {/* Emergency & Security Protocols */}
      <div className={`p-4 rounded-2xl border space-y-3 ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white dark:text-white light:text-slate-900 flex items-center gap-1.5" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>{t('بروتوكول الطوارئ والأمان التنفيذي', 'Emergency Command Protocols')}</span>
          </h3>
          {emergencyAlert?.active && (
            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold animate-pulse">
              {t('البث الأمني نشط', 'Alert Active')}
            </span>
          )}
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          {t('إرسال تنبيه أمني فوري أو تعليق طارئ للعمليات يتم بثه مباشرة لكافة شاشات مدراء الفروع وموظفي فيتاس العراق.',
             'Trigger instant security broadcast or emergency operations freeze across all 16 Iraqi branches.')}
        </p>

        {emergencyAlert?.active ? (
          <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs space-y-2">
            <div className="font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>{emergencyAlert.title}</span>
            </div>
            <p className="text-[11px] text-slate-300">{emergencyAlert.message}</p>
            <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 font-mono">
              <span>{t('وقت التفعيل: ', 'Triggered at: ')} {emergencyAlert.timestamp}</span>
              <button
                onClick={clearEmergencyAlert}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
              >
                {t('إنهاء حالة الطوارئ', 'Deactivate Alert')}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAlertModalOpen(true)}
            className="w-full py-2.5 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/40 text-rose-400 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>{t('تفعيل بث أمني / حالة طوارئ لكافة الفروع', 'Broadcast Emergency Alert to All Branches')}</span>
          </button>
        )}
      </div>

      {/* System Switcher Hub */}
      <div className={`p-4 rounded-2xl border space-y-2.5 ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h3 className="text-xs font-bold text-white dark:text-white light:text-slate-900" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
          {t('الانتقال لمنظومات النظام الأخرى', 'Cross-System Navigation')}
        </h3>

        <div className="space-y-2">
          {/* Switch to Desktop HRMS */}
          <button
            onClick={() => {
              window.location.href = '/';
            }}
            className="w-full p-2.5 rounded-xl border border-slate-700 hover:border-amber-500/40 text-slate-200 hover:text-white text-xs font-bold flex items-center justify-between transition-all cursor-pointer bg-slate-800/40"
          >
            <div className="flex items-center gap-2">
              <Laptop className="w-4 h-4 text-amber-400" />
              <span>{t('بوابة الموارد البشرية لسطح المكتب (HRMS Portal)', 'Desktop HRMS Portal')}</span>
            </div>
            <span className="text-[10px] text-slate-400">←</span>
          </button>

          {/* Switch to Employee Mobile App */}
          <button
            onClick={() => {
              navigate('/employee-app');
            }}
            className="w-full p-2.5 rounded-xl border border-slate-700 hover:border-teal-500/40 text-slate-200 hover:text-white text-xs font-bold flex items-center justify-between transition-all cursor-pointer bg-slate-800/40"
          >
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-teal-400" />
              <span>{t('تطبيق الموظفين (Employee Mobile App)', 'Employee Mobile App')}</span>
            </div>
            <span className="text-[10px] text-slate-400">←</span>
          </button>
        </div>
      </div>

      {/* Logout Action */}
      <button
        onClick={logout}
        className="w-full py-2.5 rounded-2xl bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/30 text-rose-400 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
        <span>{t('تسجيل الخروج من تطبيق المدير العام', 'Sign Out of General Manager Suite')}</span>
      </button>

      {/* Emergency Alert Broadcast Modal */}
      {isAlertModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#0d1322] border border-rose-500/40 p-5 space-y-4 shadow-2xl text-white animate-in zoom-in-95">
            <div className="flex items-center gap-2 text-rose-500">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <h3 className="text-sm font-bold text-white">
                {t('تأكيد بث تنبيه أمني عاجل لكافة الفروع', 'Confirm Emergency Security Broadcast')}
              </h3>
            </div>

            <form onSubmit={handleBroadcastAlert} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  {t('عنوان التنبيه الأمني:', 'Alert Title:')}
                </label>
                <input
                  type="text"
                  required
                  value={alertTitle}
                  onChange={e => setAlertTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  {t('نص التعليمات الأمنية والتشغيلية:', 'Operational Instructions:')}
                </label>
                <textarea
                  rows={3}
                  required
                  value={alertMessage}
                  onChange={e => setAlertMessage(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-rose-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAlertModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-700 text-slate-300 font-bold hover:bg-slate-800"
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md"
                >
                  {t('بث فوري الآن', 'Broadcast Now')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
