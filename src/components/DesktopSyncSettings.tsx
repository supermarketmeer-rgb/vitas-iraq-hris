import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { connectionManager, ConnectionState } from '../services/connectionManager';
import { syncEngine, SyncScheduleOption } from '../services/syncEngine';
import { offlineQueue } from '../services/offlineQueue';
import { logger, LogEntry } from '../utils/logger';
import { 
  Server, 
  Wifi, 
  Cloud, 
  Clock, 
  RefreshCw, 
  Activity, 
  ShieldCheck, 
  CheckCircle2, 
  AlertOctagon, 
  Database,
  Monitor,
  Download,
  Trash2,
  Settings
} from 'lucide-react';

export const DesktopSyncSettings: React.FC = () => {
  const { language, theme } = useApp();
  const isDark = theme === 'dark';

  const [connState, setConnState] = useState<ConnectionState>(connectionManager.getState());
  const [localServerUrl, setLocalServerUrl] = useState(connState.localServerUrl);
  const [cloudServerUrl, setCloudServerUrl] = useState(connState.cloudServerUrl);
  const [syncSchedule, setSyncSchedule] = useState<SyncScheduleOption>(syncEngine.getSchedule());
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    const unsub = connectionManager.subscribe(s => setConnState(s));
    setLogs(logger.getLogs());
    return unsub;
  }, []);

  const handleSaveConnectionConfig = (e: React.FormEvent) => {
    e.preventDefault();
    connectionManager.updateConfig(localServerUrl, cloudServerUrl);
    alert(language === 'ar' ? 'تم حفظ إعدادات الشبكة والسيرفر بنجاح.' : 'Network & Server configuration saved successfully.');
  };

  const handleScheduleChange = (schedule: SyncScheduleOption) => {
    setSyncSchedule(schedule);
    syncEngine.setSchedule(schedule);
  };

  const handleRunDiagnosticTest = async () => {
    setIsTesting(true);
    setTestOutput(language === 'ar' ? 'جاري تنفيذ فحص الشامل للسيرفر المحلي والشبكة والسحابة...' : 'Running full diagnostic check...');
    
    const localRes = await connectionManager.checkConnectionNow();
    const queueLen = offlineQueue.getQueueLength();
    
    setTestOutput(language === 'ar'
      ? `نتائج الفحص التشخيصي:\n- حالة الاتصال: ${localRes}\n- السيرفر الفعال: ${connectionManager.getState().activeBaseUrl}\n- معرف الجهاز: ${connState.deviceId}\n- قائمة الانتظار المحلية: ${queueLen} عناصر\n- جدولة المزامنة: ${syncSchedule}`
      : `Diagnostic Check Results:\n- Connection Status: ${localRes}\n- Active Base URL: ${connectionManager.getState().activeBaseUrl}\n- Device ID: ${connState.deviceId}\n- Pending Queue: ${queueLen} items\n- Sync Schedule: ${syncSchedule}`);
    
    setIsTesting(false);
  };

  const handleClearLogs = () => {
    logger.clearLogs();
    setLogs([]);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Overview Banner */}
      <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}>
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-teal-600 text-white shadow-md border border-teal-500/20">
            <Monitor className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold">
              {language === 'ar' ? 'إعدادات Desktop والمزامنة متعددة الأجهزة' : 'Desktop & Multi-Node Sync Settings'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {language === 'ar' 
                ? 'إدارة اتصال Local Server و Cloud Mode والمزامنة التزايدية الذكية'
                : 'Manage Local Server LAN connectivity, Cloud Mode, and incremental dynamic sync'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunDiagnosticTest}
            disabled={isTesting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium text-xs transition-colors shadow-lg shadow-teal-600/20"
          >
            <Activity className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{language === 'ar' ? 'تشغيل فحص التشخيص' : 'Run Full Diagnostics'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Connection Configuration */}
        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm space-y-4`}>
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800 font-bold text-base">
            <Server className="w-5 h-5 text-teal-400" />
            <span>{language === 'ar' ? 'عنوان السيرفر المحلي والسحابي' : 'Server Connection Endpoints'}</span>
          </div>

          <form onSubmit={handleSaveConnectionConfig} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1.5">
                {language === 'ar' ? 'عنوان السيرفر المحلي (Local Server URL):' : 'Local Server LAN URL:'}
              </label>
              <input
                type="text"
                value={localServerUrl}
                onChange={(e) => setLocalServerUrl(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border font-mono ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'} focus:outline-none focus:border-teal-500`}
                placeholder="http://192.168.1.100:5000"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                {language === 'ar' ? 'عنوان IP الخاص بالسيرفر المحلي داخل شبكة المؤسسة LAN.' : 'LAN IP address of the dedicated Local Server machine.'}
              </p>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1.5">
                {language === 'ar' ? 'عنوان السحابة (Cloud API URL):' : 'Cloud API Endpoint:'}
              </label>
              <input
                type="text"
                value={cloudServerUrl}
                onChange={(e) => setCloudServerUrl(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border font-mono ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'} focus:outline-none focus:border-teal-500`}
                placeholder="https://vitas-iraq-hris-production.up.railway.app"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors flex items-center justify-center gap-2 border border-slate-700"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{language === 'ar' ? 'حفظ إعدادات الاتصال' : 'Save Connection Settings'}</span>
            </button>
          </form>
        </div>

        {/* Sync Scheduling Options */}
        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm space-y-4`}>
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800 font-bold text-base">
            <Clock className="w-5 h-5 text-amber-400" />
            <span>{language === 'ar' ? 'جدولة المزامنة التلقائية (Sync Schedule)' : 'Dynamic Sync Schedule'}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { id: '1min', labelAr: 'كل دقيقة', labelEn: 'Every 1 Min' },
              { id: '5min', labelAr: 'كل 5 دقائق', labelEn: 'Every 5 Mins' },
              { id: '10min', labelAr: 'كل 10 دقائق', labelEn: 'Every 10 Mins' },
              { id: '15min', labelAr: 'كل 15 دقيقة', labelEn: 'Every 15 Mins' },
              { id: '30min', labelAr: 'كل 30 دقيقة', labelEn: 'Every 30 Mins' },
              { id: '1hr', labelAr: 'كل ساعة', labelEn: 'Every Hour' },
              { id: 'daily', labelAr: 'مرة يومياً', labelEn: 'Daily' },
              { id: 'manual', labelAr: 'يدوي فقط', labelEn: 'Manual Only' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => handleScheduleChange(opt.id as SyncScheduleOption)}
                className={`py-2.5 px-3 rounded-xl border text-center font-medium transition-all ${syncSchedule === opt.id ? 'bg-teal-600 text-white border-teal-500 shadow-md' : (isDark ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-850' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100')}`}
              >
                {language === 'ar' ? opt.labelAr : opt.labelEn}
              </button>
            ))}
          </div>

          <div className={`p-3.5 rounded-xl border text-xs text-slate-400 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            {language === 'ar'
              ? 'تتم المزامنة التزايدية الفعالة في الخلفية دون تعطيل أو تجميد الواجهة.'
              : 'Incremental sync executes smoothly in background without UI thread blockage.'}
          </div>
        </div>

      </div>

      {/* Diagnostics Console Output */}
      {testOutput && (
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-900 text-slate-100'} font-mono text-xs space-y-2`}>
          <div className="flex items-center justify-between text-teal-400 font-bold border-b border-slate-800 pb-2">
            <span>Diagnostics Output Log</span>
            <button onClick={() => setTestOutput(null)} className="text-slate-400 hover:text-white">Close</button>
          </div>
          <pre className="whitespace-pre-wrap leading-relaxed text-slate-300">{testOutput}</pre>
        </div>
      )}

      {/* System Audit Logs */}
      <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm space-y-4`}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 font-bold text-base">
            <Activity className="w-5 h-5 text-sky-400" />
            <span>{language === 'ar' ? 'سجل الأحداث والمزامنة (System Logs)' : 'Sync & System Event Logs'}</span>
          </div>
          <button
            onClick={handleClearLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 text-xs font-medium transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'مسح السجل' : 'Clear Logs'}</span>
          </button>
        </div>

        <div className={`max-h-60 overflow-y-auto rounded-xl border p-3 font-mono text-xs space-y-1.5 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-900 text-slate-200'}`}>
          {logs.length === 0 ? (
            <div className="text-slate-500 text-center py-4">{language === 'ar' ? 'لا يوجد سجلات حالية' : 'No logs recorded'}</div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="flex items-start gap-2 border-b border-slate-800/40 pb-1">
                <span className="text-slate-500 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${log.level === 'ERROR' ? 'bg-rose-500/20 text-rose-400' : log.level === 'WARN' ? 'bg-amber-500/20 text-amber-400' : 'bg-sky-500/20 text-sky-400'}`}>{log.level}</span>
                <span className="text-teal-400 shrink-0">[{log.eventType}]</span>
                <span className="text-slate-300">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};
