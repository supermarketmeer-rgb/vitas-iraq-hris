import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';

interface DriversModuleViewProps {
  initialPage?: string;
}

export const DriversModuleView: React.FC<DriversModuleViewProps> = ({ initialPage = 'dashboard.php' }) => {
  const { theme, language, currentUser, activeModuleId, isAuthenticated } = useApp();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);

  const isDark = theme === 'dark';
  const isAr = language === 'ar';

  // Determine initial page based on activeModuleId
  const targetPage = useMemo(() => {
    switch (activeModuleId) {
      case 'drivers-trips':
        return 'trips.php';
      case 'drivers-payroll':
        return 'payroll.php';
      case 'drivers-reports':
        return 'reports.php';
      case 'drivers-offices':
        return 'offices.php';
      case 'drivers-list':
        return 'drivers.php';
      default:
        return initialPage;
    }
  }, [activeModuleId, initialPage]);

  // Authorization check
  const isAuthorized = useMemo(() => {
    if (!currentUser) return false;
    const role = currentUser.role || '';
    if (['Super Admin', 'HR Manager', 'Payroll Specialist', 'IT Admin'].includes(role)) {
      return true;
    }
    const perms = currentUser.modulePermissions;
    if (perms && (perms.drivers || perms['cat-drivers'] || perms['drivers-mgmt'])) {
      return true;
    }
    return false;
  }, [currentUser]);

  // Construct SSO Payload
  const ssoParam = useMemo(() => {
    if (!currentUser) return '';
    try {
      const validId = (currentUser.id && currentUser.id !== '0') ? currentUser.id : 1;
      const userPayload = {
        id: validId,
        username: currentUser.employeeId || currentUser.name || 'admin',
        name: currentUser.name || 'مدير النظام',
        role: currentUser.role || 'Super Admin',
        email: currentUser.email || '',
        office_id: 1,
        can_manage_drivers: 1
      };
      return btoa(unescape(encodeURIComponent(JSON.stringify(userPayload))));
    } catch {
      return '';
    }
  }, [currentUser]);

  const iframeSrc = useMemo(() => {
    const queryParams = new URLSearchParams({
      embedded: '1',
      theme: theme || 'light',
      lang: language || 'ar',
      ...(ssoParam ? { sso_user: ssoParam } : {})
    });
    return `/hr_drivers/${targetPage}?${queryParams.toString()}`;
  }, [targetPage, theme, language, ssoParam]);

  useEffect(() => {
    setIsLoading(true);
    setIframeError(false);
  }, [targetPage]);

  // Real-time Theme synchronization with iframe
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage({
          type: 'HR_SET_THEME',
          theme: theme
        }, '*');
      } catch (e) {
        console.warn('Error syncing theme with Drivers iframe:', e);
      }
    }
  }, [theme]);

  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false);
    setIframeError(false);

    // Push current theme + sso_user to iframe on every load
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage({
          type: 'HR_SET_THEME',
          theme: theme
        }, '*');
        if (ssoParam) {
          iframeRef.current.contentWindow.postMessage({
            type: 'HR_SET_SSO',
            sso_user: ssoParam
          }, '*');
        }
      } catch (e) {
        // cross-origin restriction safeguard
      }
    }
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setIframeError(true);
  };

  // If authenticated but user data not yet hydrated from localStorage, wait
  if (isAuthenticated && !currentUser) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-[500px] flex items-center justify-center p-6 animate-in fade-in duration-300">
        <div className={`max-w-md w-full p-8 rounded-3xl border text-center transition-all ${
          isDark
            ? 'bg-[#0a0c10] border-rose-500/20 text-white shadow-xl shadow-rose-950/20'
            : 'bg-white border-rose-200 text-slate-900 shadow-sm'
        }`}>
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl">gpp_bad</span>
          </div>
          <h2 className="text-xl font-black mb-2">
            {isAr ? 'غير مصرح بالوصول' : 'Access Restricted'}
          </h2>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'} mb-6 leading-relaxed`}>
            {isAr
              ? 'عفواً، لا تمتلك الصلاحيات الكافية للوصول إلى موديول إدارة السائقين والرحلات. يرجى التواصل مع إدارة الموارد البشرية لطلب الصلاحية.'
              : 'You do not have the required permissions to access the Drivers & Trips module. Please contact HR administration.'}
          </p>
          <div className="text-xs font-mono px-3 py-1.5 rounded-xl inline-block bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Permission required: drivers_view / HR Manager
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Module Container */}
      <div className={`relative w-full rounded-2xl overflow-hidden border transition-all ${
        isDark ? 'border-white/10 bg-[#0a0c10]' : 'border-slate-200 bg-white shadow-sm'
      }`}>
        {/* Loading overlay */}
        {isLoading && (
          <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 backdrop-blur-xs ${
            isDark ? 'bg-[#0a0c10]/80 text-white' : 'bg-white/80 text-slate-800'
          }`}>
            <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-medium font-mono text-teal-400">
              {isAr ? 'جارٍ تحميل موديول السائقين والرحلات...' : 'Loading Drivers & Trips Module...'}
            </span>
          </div>
        )}

        {/* Error Fallback */}
        {iframeError ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-4xl text-amber-400 mb-2">error</span>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              {isAr ? 'تعذر تحميل الموديول' : 'Failed to Load Module'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              {isAr ? 'يرجى التحقق من تشغيل خدمة XAMPP (Apache + MySQL)' : 'Please verify that XAMPP (Apache + MySQL) is running'}
            </p>
            <button
              onClick={() => {
                setIsLoading(true);
                setIframeError(false);
                if (iframeRef.current) {
                  iframeRef.current.src = iframeSrc;
                }
              }}
              className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-500 transition-colors"
            >
              {isAr ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            title="Drivers Management Module"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            className="w-full h-[calc(100vh-7rem)] border-0 block"
            style={{ minHeight: '800px' }}
          />
        )}
      </div>
    </div>
  );
};
