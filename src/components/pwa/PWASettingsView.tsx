import React, { useState } from 'react';
import { usePWA } from '../../hooks/usePWA';
import {
  Monitor, Download, RefreshCw, CheckCircle2, AlertCircle,
  Wifi, WifiOff, Globe, Chrome, Shield, Zap, Info, ExternalLink
} from 'lucide-react';

interface PWASettingsViewProps {
  language?: 'ar' | 'en';
  isDark?: boolean;
}

export const PWASettingsView: React.FC<PWASettingsViewProps> = ({
  language = 'ar',
  isDark = true,
}) => {
  const { state, install, applyUpdate, checkForUpdates } = usePWA();
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [checkResult, setCheckResult] = useState<'up-to-date' | 'found' | null>(null);

  const isAr = language === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const appVersion = '1.0.0';
  const appUrl = window.location.origin;

  const handleCheckUpdates = async () => {
    setChecking(true);
    setCheckResult(null);
    await checkForUpdates();
    await new Promise(r => setTimeout(r, 1500));
    setCheckResult(state.hasUpdate ? 'found' : 'up-to-date');
    setChecking(false);
  };

  const handleInstall = async () => {
    setInstalling(true);
    await install();
    setInstalling(false);
  };

  const StatusBadge = ({ ok, label }: { ok: boolean; label: string }) => (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
      ok
        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
    }`}>
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
      {label}
    </span>
  );

  const InfoRow = ({ label, value, badge }: { label: string; value: React.ReactNode; badge?: React.ReactNode }) => (
    <div className={`flex items-center justify-between py-3 border-b ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
      <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{label}</span>
      <div className="flex items-center gap-2">
        {badge}
        <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</span>
      </div>
    </div>
  );

  return (
    <div className={`space-y-6 ${isDark ? 'text-white' : 'text-slate-900'}`} dir={isAr ? 'rtl' : 'ltr'}>

      {/* Title */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-teal-500/20' : 'bg-teal-100'}`}>
          <Monitor className="w-5 h-5 text-teal-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold">{t('تثبيت التطبيق على سطح المكتب', 'Desktop Application Installation')}</h2>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {t('إدارة تثبيت VITAS IRAQ HRMS كتطبيق مكتبي سحابي', 'Manage VITAS IRAQ HRMS desktop installation')}
          </p>
        </div>
      </div>

      {/* App Info Card */}
      <div className={`rounded-2xl border p-5 ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200'}`}>
        <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
          <Info className="w-4 h-4" />
          {t('معلومات التطبيق', 'Application Information')}
        </h3>

        <div>
          <InfoRow label={t('اسم التطبيق', 'Application Name')} value="VITAS IRAQ HRMS" />
          <InfoRow label={t('الإصدار الحالي', 'Current Version')} value={appVersion} />
          <InfoRow
            label={t('رابط التطبيق', 'Application URL')}
            value={
              <a href={appUrl} className="text-teal-400 hover:underline flex items-center gap-1 text-xs" target="_blank" rel="noreferrer">
                {appUrl} <ExternalLink className="w-3 h-3" />
              </a>
            }
          />
          <InfoRow
            label={t('حالة التثبيت', 'Installation Status')}
            value=""
            badge={<StatusBadge ok={state.isInstalled} label={state.isInstalled ? t('مثبّت', 'Installed') : t('غير مثبّت', 'Not Installed')} />}
          />
          <InfoRow
            label={t('دعم PWA في المتصفح', 'Browser PWA Support')}
            value=""
            badge={<StatusBadge
              ok={state.browserSupport !== 'none'}
              label={
                state.browserSupport === 'full' ? t('دعم كامل', 'Full Support') :
                state.browserSupport === 'manual' ? t('تثبيت يدوي', 'Manual Install') :
                t('غير مدعوم', 'Not Supported')
              }
            />}
          />
          <InfoRow
            label={t('الاتصال بالخادم', 'Server Connection')}
            value=""
            badge={<StatusBadge ok={navigator.onLine} label={navigator.onLine ? t('متصل', 'Online') : t('غير متصل', 'Offline')} />}
          />
          <InfoRow
            label={t('وضع التشغيل', 'Display Mode')}
            value={state.isInstalled ? t('مستقل (Standalone)', 'Standalone') : t('متصفح (Browser)', 'Browser')}
          />
          <InfoRow
            label={t('تحديث متاح', 'Update Available')}
            value=""
            badge={<StatusBadge ok={!state.hasUpdate} label={state.hasUpdate ? t('نعم – متاح', 'Yes – Available') : t('محدّث', 'Up to Date')} />}
          />
        </div>
      </div>

      {/* Install Actions */}
      <div className={`rounded-2xl border p-5 ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200'}`}>
        <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
          <Zap className="w-4 h-4" />
          {t('إجراءات التثبيت', 'Installation Actions')}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Install / Already Installed */}
          {!state.isInstalled ? (
            <button
              onClick={handleInstall}
              disabled={installing || state.browserSupport === 'none'}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:bg-teal-900 disabled:text-teal-700 text-white font-bold text-sm transition-colors"
            >
              {installing
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Download className="w-4 h-4" />
              }
              {t('تثبيت التطبيق', 'Install Application')}
            </button>
          ) : (
            <button
              onClick={() => window.open('/', '_blank')}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-700/40 border border-emerald-600/40 text-emerald-300 font-bold text-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              {t('التطبيق مثبّت', 'Application Installed')}
            </button>
          )}

          {/* Check for Updates */}
          <button
            onClick={handleCheckUpdates}
            disabled={checking}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border font-bold text-sm transition-colors ${
              isDark
                ? 'border-white/10 bg-white/5 hover:bg-white/10 text-white'
                : 'border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            {t('التحقق من التحديثات', 'Check for Updates')}
          </button>

          {/* Apply Update */}
          {(state.hasUpdate || checkResult === 'found') && (
            <button
              onClick={applyUpdate}
              disabled={state.isUpdating}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-colors sm:col-span-2"
            >
              <RefreshCw className={`w-4 h-4 ${state.isUpdating ? 'animate-spin' : ''}`} />
              {t('تطبيق التحديث الآن', 'Apply Update Now')}
            </button>
          )}
        </div>

        {checkResult === 'up-to-date' && (
          <div className="mt-3 flex items-center gap-2 text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            {t('التطبيق محدّث – لا توجد تحديثات جديدة', 'Application is up to date')}
          </div>
        )}
      </div>

      {/* Manual Install Instructions */}
      {state.browserSupport === 'manual' && !state.isInstalled && (
        <div className={`rounded-2xl border p-5 ${isDark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
          <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
            <AlertCircle className="w-4 h-4" />
            {t('تعليمات التثبيت اليدوي', 'Manual Installation Instructions')}
          </h3>
          <div className="space-y-3">
            <div className={`rounded-xl p-3 ${isDark ? 'bg-white/5' : 'bg-white border border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Chrome className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold">Google Chrome</span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {t('القائمة (⋮) ← Cast, save and share ← Install page as app', 'Menu (⋮) → Cast, save and share → Install page as app')}
              </p>
            </div>
            <div className={`rounded-xl p-3 ${isDark ? 'bg-white/5' : 'bg-white border border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Globe className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-bold">Microsoft Edge</span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {t('القائمة (…) ← Apps ← Install this site as an app', 'Menu (…) → Apps → Install this site as an app')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Security Note */}
      <div className={`rounded-2xl border p-4 flex items-start gap-3 ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
        <Shield className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
        <div>
          <p className={`text-xs font-semibold mb-1 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
            {t('ملاحظة أمنية مهمة', 'Important Security Note')}
          </p>
          <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {t(
              'جميع البيانات تبقى على الخادم السحابي المركزي. لا يتم تخزين أي معلومات حساسة (رواتب، بيانات موظفين، صلاحيات) على الجهاز عند التثبيت. يتطلب التطبيق اتصالاً بالإنترنت دائماً.',
              'All data remains on the central cloud server. No sensitive information (payroll, employee data, permissions) is stored locally upon installation. An internet connection is always required.'
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PWASettingsView;
