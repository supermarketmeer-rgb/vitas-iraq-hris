import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { connectionManager, ConnectionState } from '../services/connectionManager';
import { syncEngine } from '../services/syncEngine';
import { useApp } from '../context/AppContext';
import { 
  Wifi, 
  Cloud, 
  WifiOff, 
  RefreshCw, 
  Server, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Database,
  Clock,
  Layers,
  HardDrive
} from 'lucide-react';

export const ConnectionStatusWidget: React.FC = () => {
  const { language, theme } = useApp();
  const [connState, setConnState] = useState<ConnectionState>(connectionManager.getState());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const isDark = theme === 'dark';

  useEffect(() => {
    const unsubscribe = connectionManager.subscribe((newState) => {
      setConnState(newState);
    });
    return unsubscribe;
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setTestResult(null);
    const result = await syncEngine.triggerSync();
    setIsSyncing(false);
    if (result.success) {
      setTestResult(language === 'ar' 
        ? `تمت المزامنة بنجاح! (تم إرسال ${result.pushedCount}، وتم استلام ${result.pulledCount})`
        : `Sync successful! (Pushed: ${result.pushedCount}, Pulled: ${result.pulledCount})`);
    } else {
      setTestResult(language === 'ar'
        ? `فشلت المزامنة: ${result.error || 'تعذر الاتصال'}`
        : `Sync failed: ${result.error || 'Connection failed'}`);
    }
  };

  const handleTestConnection = async () => {
    setTestResult(language === 'ar' ? 'جاري اختبار الاتصال...' : 'Testing connection...');
    const mode = await connectionManager.checkConnectionNow();
    setTestResult(language === 'ar'
      ? `نتيجة فحص الاتصال: ${mode === 'LOCAL_CONNECTED' ? 'السيرفر المحلي متصل' : mode === 'CLOUD_CONNECTED' ? 'السيرفر السحابي متصل' : 'وضع بدون اتصال (Offline)'}`
      : `Test result: ${mode}`);
  };

  const renderBadge = () => {
    switch (connState.mode) {
      case 'LOCAL_CONNECTED':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-semibold hover:bg-emerald-500/20 transition-all cursor-pointer shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <Wifi className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'محلي (LAN) متصل' : 'Local Connected'}</span>
          </div>
        );
      case 'CLOUD_CONNECTED':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 text-sky-500 border border-sky-500/20 text-xs font-semibold hover:bg-sky-500/20 transition-all cursor-pointer shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
            <Cloud className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'سحابي متصل' : 'Cloud Connected'}</span>
          </div>
        );
      case 'SYNCHRONIZING':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 text-xs font-semibold cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>{language === 'ar' ? 'جاري المزامنة...' : 'Synchronizing...'}</span>
          </div>
        );
      case 'SYNC_ERROR':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs font-semibold hover:bg-rose-500/20 transition-all cursor-pointer">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'خطأ مزامنة' : 'Sync Error'}</span>
          </div>
        );
      case 'OFFLINE':
      default:
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-semibold hover:bg-amber-500/20 transition-all cursor-pointer shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <WifiOff className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'غير متصل (Offline)' : 'Offline Mode'}</span>
          </div>
        );
    }
  };

  return (
    <>
      <div onClick={() => setIsDrawerOpen(true)}>
        {renderBadge()}
      </div>

      {/* Connection Diagnostic Modal rendered at document body via Portal */}
      {isDrawerOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div 
            className={`w-full max-w-lg rounded-2xl p-6 shadow-2xl border ${
              isDark ? 'bg-[#0f172a] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            } relative transition-all max-h-[90vh] overflow-y-auto`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-teal-600 text-white shadow-md">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">
                    {language === 'ar' ? 'تشخيص حالة الاتصال والمزامنة' : 'Connection & Sync Diagnostics'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {language === 'ar' ? 'معلومات الشبكة، السيرفر، وقائمة الانتظار' : 'Network, server info and sync queue'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Diagnostic Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 my-5">
              <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <Server className="w-4 h-4 text-teal-400" />
                  <span>{language === 'ar' ? 'وضع الاتصال الفعال' : 'Active Connection'}</span>
                </div>
                <div className="text-sm font-semibold capitalize">
                  {connState.mode.replace('_', ' ')}
                </div>
              </div>

              <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <HardDrive className="w-4 h-4 text-sky-400" />
                  <span>{language === 'ar' ? 'معرف الجهاز' : 'Device ID'}</span>
                </div>
                <div className="text-xs font-mono font-bold truncate">
                  {connState.deviceId}
                </div>
              </div>

              <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>{language === 'ar' ? 'عمليات منتظرة' : 'Pending Queue'}</span>
                </div>
                <div className="text-sm font-semibold">
                  {connState.pendingChangesCount} {language === 'ar' ? 'عملية' : 'changes'}
                </div>
              </div>

              <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>{language === 'ar' ? 'آخر مزامنة' : 'Last Sync'}</span>
                </div>
                <div className="text-xs text-slate-300 font-mono">
                  {connState.lastSyncTime ? new Date(connState.lastSyncTime).toLocaleTimeString() : (language === 'ar' ? 'لم تتم بعد' : 'Never')}
                </div>
              </div>
            </div>

            {/* Server Details Box */}
            <div className={`p-3.5 rounded-xl border mb-4 text-xs font-mono space-y-1.5 ${isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
              <div><span className="text-slate-500">Active URL:</span> {connState.activeBaseUrl}</div>
              <div><span className="text-slate-500">Local Server:</span> {connState.localServerUrl}</div>
              <div><span className="text-slate-500">Cloud API:</span> {connState.cloudServerUrl}</div>
              <div><span className="text-slate-500">Schedule:</span> {syncEngine.getSchedule()}</div>
            </div>

            {/* Test result status message */}
            {testResult && (
              <div className="p-3 mb-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-white text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{testResult}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium text-xs transition-colors shadow-lg shadow-teal-600/20 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{language === 'ar' ? 'مزامنة الآن (Sync Now)' : 'Sync Now'}</span>
              </button>

              <button
                onClick={handleTestConnection}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium text-xs transition-colors"
              >
                <Wifi className="w-4 h-4 text-sky-400" />
                <span>{language === 'ar' ? 'اختبار الاتصال' : 'Test Connection'}</span>
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
};
