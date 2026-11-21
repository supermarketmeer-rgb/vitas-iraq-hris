import React, { useState, useEffect } from 'react';
import { usePWA } from '../hooks/usePWA';
import { Download, X, Monitor, RefreshCw, CheckCircle2, Chrome, Globe, AlertCircle } from 'lucide-react';

interface PWAInstallBannerProps {
  language?: 'ar' | 'en';
}

const DISMISSED_KEY = 'vitas_pwa_install_dismissed';

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ language = 'ar' }) => {
  const { state, install, applyUpdate } = usePWA();
  const [visible, setVisible] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);

  const isAr = language === 'ar';

  useEffect(() => {
    // Don't show if already installed as PWA
    if (state.isInstalled) return;

    // Don't show if user already dismissed
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;

    // Show after a 3-second delay (don't interrupt initial load)
    const timer = setTimeout(() => {
      if (state.isInstallable || state.browserSupport === 'manual') {
        setVisible(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [state.isInstallable, state.isInstalled, state.browserSupport]);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
  };

  const handleInstall = async () => {
    if (state.browserSupport === 'manual') {
      setShowManual(true);
      return;
    }
    setInstalling(true);
    const accepted = await install();
    setInstalling(false);
    if (accepted) {
      setInstalled(true);
      setTimeout(() => setVisible(false), 3000);
    }
  };

  // Update notification takes priority
  if (state.hasUpdate) {
    return (
      <div
        dir={isAr ? 'rtl' : 'ltr'}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] animate-in slide-in-from-top-2 duration-300"
        style={{ maxWidth: 440, width: 'calc(100vw - 32px)' }}
      >
        <div className="bg-teal-900 border border-teal-600 rounded-2xl shadow-2xl shadow-teal-900/50 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-500/20 flex items-center justify-center shrink-0">
            <RefreshCw className="w-5 h-5 text-teal-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">
              {isAr ? 'تحديث جديد متاح' : 'New Update Available'}
            </p>
            <p className="text-xs text-teal-300 mt-0.5">
              {isAr ? 'VITAS IRAQ HRMS – نسخة جديدة جاهزة' : 'VITAS IRAQ HRMS – New version ready'}
            </p>
          </div>
          <button
            onClick={applyUpdate}
            className="shrink-0 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap"
          >
            {isAr ? 'تحديث الآن' : 'Update Now'}
          </button>
        </div>
      </div>
    );
  }

  if (!visible) return null;

  if (installed) {
    return (
      <div
        dir={isAr ? 'rtl' : 'ltr'}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999] animate-in slide-in-from-bottom-2 duration-300"
        style={{ maxWidth: 440, width: 'calc(100vw - 32px)' }}
      >
        <div className="bg-emerald-900 border border-emerald-600 rounded-2xl shadow-2xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          <p className="text-sm font-semibold text-white">
            {isAr
              ? 'تم تثبيت VITAS IRAQ HRMS بنجاح على حاسبتك!'
              : 'VITAS IRAQ HRMS installed successfully!'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999] animate-in slide-in-from-bottom-3 duration-500"
      style={{ maxWidth: 480, width: 'calc(100vw - 32px)' }}
    >
      <div className="bg-[#0f172a] border border-teal-600/60 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 pb-3 border-b border-white/5">
          <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-white/5 flex items-center justify-center">
            <img src="/icons/icon-192.png" alt="VITAS HRMS" className="w-10 h-10 object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white leading-tight">
              {isAr ? 'تثبيت VITAS IRAQ HRMS' : 'Install VITAS IRAQ HRMS'}
            </p>
            <p className="text-xs text-teal-400 mt-0.5 flex items-center gap-1">
              <Monitor className="w-3 h-3" />
              {isAr ? 'تطبيق مكتبي سحابي' : 'Cloud Desktop Application'}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          {!showManual ? (
            <>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                {isAr
                  ? 'ثبّت VITAS IRAQ HRMS على حاسبتك للوصول إليه بشكل أسرع وأسهل. شغّل النظام مباشرة من سطح المكتب دون الحاجة لفتح المتصفح.'
                  : 'Install VITAS IRAQ HRMS on your computer for faster and easier access. Launch the system directly from your desktop without opening your browser manually.'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleInstall}
                  disabled={installing}
                  className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors"
                >
                  {installing ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {isAr ? 'تثبيت التطبيق' : 'Install Application'}
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 text-xs font-semibold transition-colors"
                >
                  {isAr ? 'لاحقاً' : 'Maybe Later'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-300 font-semibold mb-3">
                {isAr ? 'كيفية التثبيت اليدوي:' : 'Manual Installation Instructions:'}
              </p>
              <div className="space-y-3">
                <div className="bg-white/5 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Chrome className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-white">Google Chrome</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isAr
                      ? 'القائمة ← "Cast, save and share" ← "Install page as app"'
                      : 'Menu → Cast, save and share → Install page as app'}
                  </p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Globe className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold text-white">Microsoft Edge</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isAr
                      ? 'القائمة ← Apps ← "Install this site as an app"'
                      : 'Menu → Apps → Install this site as an app'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="mt-3 w-full px-4 py-2 rounded-xl border border-white/10 text-slate-400 hover:text-white text-xs font-semibold transition-colors"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PWAInstallBanner;
