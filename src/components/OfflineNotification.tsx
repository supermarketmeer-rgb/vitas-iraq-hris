import React, { useState, useEffect } from 'react';

export const OfflineNotification: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showRestored, setShowRestored] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);
      const timer = setTimeout(() => {
        setShowRestored(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestored(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showRestored) return null;

  return (
    <div className="w-full z-40 transition-all duration-300">
      {!isOnline ? (
        <div className="bg-rose-950/90 border-b border-rose-500/30 text-rose-200 px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <span className="material-symbols-outlined text-rose-400 text-lg animate-pulse">
              wifi_off
            </span>
            <div>
              <span className="font-bold">انقطع الاتصال بالشبكة!</span>
              <span className="mx-1 text-rose-300 hidden sm:inline">•</span>
              <span className="text-rose-300 text-[11px] font-normal hidden sm:inline">
                تعمل بوابة VITAS IRAQ HRMS الآن بالوضع المحلي الآمن. سيتم حفظ التغييرات وتزامنها تلقائياً فور عودة الاتصال.
              </span>
            </div>
          </div>
          <span className="bg-rose-900/60 border border-rose-500/40 text-rose-300 text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase">
            Offline Mode
          </span>
        </div>
      ) : showRestored ? (
        <div className="bg-emerald-950/90 border-b border-emerald-500/30 text-emerald-200 px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md backdrop-blur-md animate-in fade-in duration-300">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <span className="material-symbols-outlined text-emerald-400 text-lg">
              wifi
            </span>
            <span>تم استعادة الاتصال بالإنترنت بنجاح. النظام يعمل بالوضع المباشر الآن.</span>
          </div>
          <button 
            onClick={() => setShowRestored(false)}
            className="text-emerald-400 hover:text-white text-xs font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      ) : null}
    </div>
  );
};
