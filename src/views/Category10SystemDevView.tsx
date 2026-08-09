import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { EmptyState } from '../components/EmptyState';
import { DatabaseSchemaViewer } from '../components/DatabaseSchemaViewer';
import { DynamicReportBuilder } from '../components/DynamicReportBuilder';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface TelemetryPoint {
  time: string;
  memoryMB: number;
  memoryPercent: number;
  apiLatency: number;
  authLatency: number;
  leaveLatency: number;
  reqPerSec: number;
}

export const Category10SystemDevView: React.FC = () => {
  const { activeModuleId, t } = useApp();
  const [healthStatus, setHealthStatus] = useState<'Optimal' | 'Checking'>('Optimal');
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);

  // Recharts Telemetry Data State
  const [telemetryData, setTelemetryData] = useState<TelemetryPoint[]>([
    { time: '10:00:00', memoryMB: 1024, memoryPercent: 25.6, apiLatency: 16, authLatency: 12, leaveLatency: 22, reqPerSec: 140 },
    { time: '10:01:00', memoryMB: 1048, memoryPercent: 26.2, apiLatency: 18, authLatency: 14, leaveLatency: 24, reqPerSec: 155 },
    { time: '10:02:00', memoryMB: 1090, memoryPercent: 27.2, apiLatency: 22, authLatency: 15, leaveLatency: 30, reqPerSec: 190 },
    { time: '10:03:00', memoryMB: 1060, memoryPercent: 26.5, apiLatency: 17, authLatency: 13, leaveLatency: 20, reqPerSec: 162 },
    { time: '10:04:00', memoryMB: 1120, memoryPercent: 28.0, apiLatency: 25, authLatency: 18, leaveLatency: 34, reqPerSec: 210 },
    { time: '10:05:00', memoryMB: 1085, memoryPercent: 27.1, apiLatency: 19, authLatency: 14, leaveLatency: 25, reqPerSec: 175 },
    { time: '10:06:00', memoryMB: 1140, memoryPercent: 28.5, apiLatency: 21, authLatency: 16, leaveLatency: 28, reqPerSec: 188 },
    { time: '10:07:00', memoryMB: 1105, memoryPercent: 27.6, apiLatency: 18, authLatency: 13, leaveLatency: 23, reqPerSec: 168 },
    { time: '10:08:00', memoryMB: 1160, memoryPercent: 29.0, apiLatency: 24, authLatency: 19, leaveLatency: 31, reqPerSec: 205 },
    { time: '10:09:00', memoryMB: 1130, memoryPercent: 28.2, apiLatency: 18, authLatency: 14, leaveLatency: 22, reqPerSec: 172 },
  ]);

  // Simulated live telemetry stream updates
  useEffect(() => {
    if (!isLiveStreaming) return;

    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      
      const lastPoint = telemetryData[telemetryData.length - 1];
      const memDelta = Math.floor(Math.random() * 40) - 20;
      const nextMemMB = Math.min(Math.max(lastPoint.memoryMB + memDelta, 980), 1600);
      const nextMemPct = Number(((nextMemMB / 4096) * 100).toFixed(1));
      
      const nextApiLatency = Math.min(Math.max(lastPoint.apiLatency + (Math.floor(Math.random() * 10) - 5), 12), 65);
      const nextAuthLatency = Math.min(Math.max(lastPoint.authLatency + (Math.floor(Math.random() * 6) - 3), 9), 40);
      const nextLeaveLatency = Math.min(Math.max(lastPoint.leaveLatency + (Math.floor(Math.random() * 8) - 4), 15), 55);
      const nextRps = Math.min(Math.max(lastPoint.reqPerSec + (Math.floor(Math.random() * 30) - 15), 100), 350);

      const newPoint: TelemetryPoint = {
        time: timeStr,
        memoryMB: nextMemMB,
        memoryPercent: nextMemPct,
        apiLatency: nextApiLatency,
        authLatency: nextAuthLatency,
        leaveLatency: nextLeaveLatency,
        reqPerSec: nextRps,
      };

      setTelemetryData(prev => [...prev.slice(1), newPoint]);
    }, 3000);

    return () => clearInterval(interval);
  }, [isLiveStreaming, telemetryData]);

  const currentMemPoint = telemetryData[telemetryData.length - 1];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Banner */}
      <div className="dark-banner p-6 rounded-3xl bg-gradient-to-r from-teal-900 via-teal-800 to-teal-900 border border-white/10 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-teal-400">developer_board</span>
            <span className="text-xs font-mono text-teal-400 uppercase tracking-widest font-bold">
              SYSTEM & DEVELOPER INFRASTRUCTURE
            </span>
          </div>
          <h1 className="text-2xl font-black text-white text-white-force drop-shadow-sm">
            {activeModuleId === 'sys-health-monitor' && t('مراقبة صحة وتوفر خوادم النظام (Health Monitor)', 'Server Health & Uptime Monitor')}
            {activeModuleId === 'sys-health-config' && t('تهيئة قواعد وفحوصات صحة السيرفرات', 'Server Health Rules & Check Config')}
            {activeModuleId === 'sys-endpoint-perf' && t('مراقب أداء نقاط النهاية وسرعة الاستجابة (APM)', 'Endpoint Performance & APM Monitor')}
            {activeModuleId === 'sys-n8n-automation' && t('أتمتة سير العمل والمستندات بـ n8n Engine', 'Workflow & Document Automation with n8n Engine')}
            {activeModuleId === 'sys-api-gateway' && t('بوابة وحاوية الواجهات البرمجية (API Gateway)', 'API Gateway & Middleware Container')}
            {activeModuleId === 'sys-api-manager' && t('إدارة نقاط النهاية والإصدارات البرمجية', 'API Endpoints & Version Management')}
            {activeModuleId === 'sys-dev-docs' && t('دليل ووثائق المطورين والتكامل الخارجي', 'Developer Documentation & API Integration')}
            {activeModuleId === 'sys-db-schema' && t('إدارة المخطط والكيانات لقاعدة البيانات', 'Database Schema & Entity Management')}
            {activeModuleId === 'sys-dynamic-reports' && t('منشئ التقارير الديناميكية والمحرك الاستعلامي', 'Dynamic Query Builder & Excel Sheet Engine')}
            {activeModuleId === 'sys-it-handbook' && t('دليل مسؤول تقنية المعلومات والصيانة', 'IT Administrator Handbook & Maintenance Guide')}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {t('مراقبة البنية السحابية وقواعد البيانات والمستندات لنظام VITAS IRAQ HRMS', 'Cloud infrastructure, database & telemetry monitor for VITAS IRAQ HRMS')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLiveStreaming(!isLiveStreaming)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
              isLiveStreaming
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
            }`}
          >
            <span className="material-symbols-outlined text-sm">
              {isLiveStreaming ? 'pause_circle' : 'play_circle'}
            </span>
            {isLiveStreaming ? t('البث المباشر نشط', 'Live Stream Active') : t('استئناف البث', 'Resume Stream')}
          </button>

          <button
            onClick={() => {
              setHealthStatus('Checking');
              setTimeout(() => setHealthStatus('Optimal'), 1200);
            }}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/25 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">monitor_heart</span>
            {t('فحص الآن', 'Check Now')}
          </button>
        </div>
      </div>

      {(activeModuleId === 'sys-health-monitor' || activeModuleId === 'sys-endpoint-perf') && (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-4 rounded-2xl bg-[#111827] border border-white/10 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <p className="text-slate-400 font-medium font-sans">{t('حالة النظام الكلية', 'Global System Status')}</p>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <p className="text-2xl font-black text-emerald-400 mt-1">
                {healthStatus === 'Optimal' ? '100% ONLINE' : 'CHECKING...'}
              </p>
              <p className="text-[10px] text-slate-500 font-sans mt-0.5">{t('جميع الخدمات ومسارات API متصلة', 'All services and API routes operational')}</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#111827] border border-white/10 shadow-sm">
              <p className="text-slate-400 font-medium font-sans">{t('زمن الاستجابة (Latency)', 'API Latency')}</p>
              <p className="text-2xl font-black text-teal-400 mt-1">
                {currentMemPoint ? `${currentMemPoint.apiLatency}ms` : '18ms'}
              </p>
              <p className="text-[10px] text-slate-500 font-sans mt-0.5">{t('منطقة بغداد / Cloud Run', 'Baghdad Region / Cloud Run')}</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#111827] border border-white/10 shadow-sm">
              <p className="text-slate-400 font-medium font-sans">{t('استخدام الذاكرة (RAM)', 'Memory Usage (RAM)')}</p>
              <p className="text-2xl font-black text-teal-400 mt-1">
                {currentMemPoint ? `${currentMemPoint.memoryPercent}%` : '27.6%'}
              </p>
              <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                {currentMemPoint ? `${(currentMemPoint.memoryMB / 1024).toFixed(2)} GB / 4.0 GB` : '1.1 GB / 4.0 GB'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#111827] border border-white/10 shadow-sm">
              <p className="text-slate-400 font-medium font-sans">{t('معدل الطلبات (Throughput)', 'Throughput Rate')}</p>
              <p className="text-2xl font-black text-emerald-400 mt-1">
                {currentMemPoint ? `${currentMemPoint.reqPerSec} req/s` : '172 req/s'}
              </p>
              <p className="text-[10px] text-slate-500 font-sans mt-0.5">RESTful Local API Engine</p>
            </div>
          </div>

          {/* Recharts Graphs Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Memory Usage Trend */}
            <div className="p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-teal-400">memory</span>
                  <h2 className="text-sm font-bold text-white">{t('مراقب استخدام الذاكرة (Memory Usage - RAM)', 'Memory Usage Monitor (RAM)')}</h2>
                </div>
                <span className="text-xs bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded font-mono font-bold">
                  Recharts Telemetry
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={telemetryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 40]} unit="%" tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0a0c10', borderColor: '#ffffff20', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                      formatter={(val: number) => [`${val}%`, t('استخدام الذاكرة', 'Memory Usage')]}
                      labelFormatter={(label) => `${t('الوقت:', 'Time:')} ${label}`}
                    />
                    <Area type="monotone" dataKey="memoryPercent" stroke="#0d9488" strokeWidth={2.5} fillOpacity={1} fill="url(#colorMemory)" name={t('نسبة الذاكرة المستهلكة', 'RAM Usage %')} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/5">
                <span>{t('حد التنبيه الأقصى:', 'Max Warning Threshold:')} <strong className="text-amber-400">85%</strong></span>
                <span>{t('الحالة الحالية:', 'Current Status:')} <strong className="text-emerald-400">{t('طبيعية وجيدة جداً', 'Optimal & Normal')}</strong></span>
              </div>
            </div>

            {/* Chart 2: API Latency per Endpoint */}
            <div className="p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-teal-400">speed</span>
                  <h2 className="text-sm font-bold text-white">{t('زمن استجابة نقاط النهاية (API Latency - ms)', 'API Endpoint Latency (ms)')}</h2>
                </div>
                <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-bold">
                  APM Live
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={telemetryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit="ms" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0a0c10', borderColor: '#ffffff20', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                      formatter={(val: number, name: string) => [`${val} ms`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Line type="monotone" dataKey="apiLatency" stroke="#0d9488" strokeWidth={2} dot={false} name={t('المسار الرئيسي (Global API)', 'Global API Route')} />
                    <Line type="monotone" dataKey="authLatency" stroke="#10b981" strokeWidth={2} dot={false} name={t('مصادقة SSO / Auth', 'SSO / Auth Service')} />
                    <Line type="monotone" dataKey="leaveLatency" stroke="#f59e0b" strokeWidth={2} dot={false} name={t('بوابة الإجازات والرواتب', 'Leave & Payroll API')} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/5">
                <span>{t('متوسط استجابة النظام:', 'Avg System Latency:')} <strong className="text-teal-400 font-mono">18.4 ms</strong></span>
                <span>{t('معدل الخطأ (SLA Error Rate):', 'SLA Error Rate:')} <strong className="text-emerald-400 font-mono">0.00%</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModuleId === 'sys-n8n-automation' && (
        <div className="p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-bold text-white">{t('أتمتة سير العمل باسرع طريقة (n8n Automation Engine)', 'Workflow Automation (n8n Automation Engine)')}</h2>
            <span className="text-emerald-400 font-mono font-bold">n8n Connected</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0a0c10] border border-white/10 space-y-2 shadow-sm text-slate-300">
            <p className="font-bold text-teal-400">{t('مسارات العمل النشطة تلقائياً:', 'Active Workflows:')}</p>
            <p>{t('1. إرسال تنبيه البريد الإلكتروني فور إدخال موظف جديد', '1. Send welcome email alert upon onboarding new employee')}</p>
            <p>{t('2. أرشفة طلبات الإجازة المقبولة في مجلد المستندات', '2. Archive approved leave requests into Document Management')}</p>
            <p>{t('3. إنشاء واستخراج قسائم الرواتب شهرياً', '3. Monthly automated payslip generation')}</p>
          </div>
        </div>
      )}

      {activeModuleId === 'sys-db-schema' && (
        <DatabaseSchemaViewer />
      )}

      {activeModuleId === 'sys-dynamic-reports' && (
        <DynamicReportBuilder />
      )}

      {(activeModuleId === 'sys-health-config' ||
        activeModuleId === 'sys-api-gateway' ||
        activeModuleId === 'sys-api-manager' ||
        activeModuleId === 'sys-dev-docs' ||
        activeModuleId === 'sys-it-handbook') && (
        <div className="p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white border-b border-white/10 pb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-400">terminal</span>
            {t('وثائق المطورين والبنية البرمجية', 'Developer Documentation & API Infrastructure')}
          </h2>
          <EmptyState
            icon="terminal"
            title={t('بوابة المطورين والبنية التحتية', 'Developer Portal & Infrastructure')}
            description={t('دليل المطور وأدوات التحكم في الواجهات البرمجية جاهزة للربط والاستدعاء.', 'Developer handbook & API gateways ready for integration.')}
          />
        </div>
      )}
    </div>
  );
};
