import React, { useState } from 'react';
import { StorageService } from '../services/storage';
import {
  Network,
  Key,
  Code,
  Send,
  CheckCircle2,
  Copy,
  Check,
  FileText,
  ShieldCheck,
  ExternalLink,
  Cpu
} from 'lucide-react';

interface HRIntegrationViewProps {
  isDark?: boolean;
}

export const IncentivesHRIntegrationView: React.FC<HRIntegrationViewProps> = ({ isDark = false }) => {
  const settings = StorageService.getSettings();
  const [copied, setCopied] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('get_entitlements');
  const [requestPeriod, setRequestPeriod] = useState<string>('2026-10');
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [apiStatusCode, setApiStatusCode] = useState<number>(200);
  const [latencyMs, setLatencyMs] = useState<number>(15);

  const endpoints = [
    {
      id: 'get_entitlements',
      method: 'GET',
      path: `/api/hr/entitlements?period=${requestPeriod}&status=Approved`,
      desc: 'قراءة المستحقات المعتمدة لترحيلها لمسير رواتب نظام الـ HR (Payroll Push/Pull)',
    },
    {
      id: 'sync_employees',
      method: 'POST',
      path: '/api/hr/employees/sync',
      desc: 'مزامنة وتحديث بيانات مسؤولي القروض ومشرفيهم من نظام الموارد البشرية دورياً',
    },
    {
      id: 'calculate',
      method: 'POST',
      path: '/api/hr/calculate',
      desc: 'طلب تنفيذ الاحتساب الآلي من نظام الـ HR لفترة استحقاق محددة',
    },
    {
      id: 'get_status',
      method: 'GET',
      path: `/api/hr/status?period=${requestPeriod}`,
      desc: 'قراءة حالة دورة العمل الحالية لفترة استحقاق معينة',
    },
  ];

  const handleCopyToken = () => {
    navigator.clipboard.writeText(settings.hrApiToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleExecuteApi = () => {
    const start = performance.now();

    if (selectedEndpoint === 'get_entitlements') {
      const loList = StorageService.getLOEntitlements(requestPeriod);
      const supList = StorageService.getSupervisorEntitlements(requestPeriod);
      const summary = StorageService.getPeriodSummary(requestPeriod);

      const resp = {
        success: true,
        period: requestPeriod,
        status: summary?.status || 'Calculated',
        currency: settings.currency,
        counts: {
          loanOfficers: loList.length,
          supervisors: supList.length,
        },
        totals: {
          totalIncentives: summary?.totalIncentives || loList.reduce((s, r) => s + r.incentives, 0),
          totalTransportation: summary?.totalTransportation || loList.reduce((s, r) => s + r.transportation, 0),
          totalBonus: summary?.totalBonus || loList.reduce((s, r) => s + r.bonus, 0),
          grandTotal: summary?.grandTotal || loList.reduce((s, r) => s + r.totalEntitlements, 0),
        },
        loanOfficersSample: loList.slice(0, 3).map((lo) => ({
          employeeId: lo.employeeId,
          name: lo.employeeName,
          office: lo.office,
          incentives: lo.incentives,
          transportation: lo.transportation,
          bonus: lo.bonus,
          totalEntitlements: lo.totalEntitlements,
          formulaVersion: lo.formulaVersionsUsed.incentivesVersion,
        })),
      };
      setApiResponse(resp);
      setApiStatusCode(200);
    } else if (selectedEndpoint === 'sync_employees') {
      setApiResponse({
        success: true,
        message: 'تمت مطابقة وتحديث 8 موظفين بنجاح دون أية تعارضات مع قاعدة بيانات فيتاس العراق',
        syncedCount: 8,
        timestamp: new Date().toISOString(),
      });
      setApiStatusCode(200);
    } else if (selectedEndpoint === 'calculate') {
      try {
        const calcRes = StorageService.calculatePeriod(requestPeriod);
        setApiResponse({
          success: true,
          period: requestPeriod,
          status: 'Calculated',
          loCalculated: calcRes.loResults.length,
          supervisorsCalculated: calcRes.supResults.length,
          grandTotal: calcRes.summary.grandTotal,
          timestamp: new Date().toISOString(),
        });
        setApiStatusCode(200);
      } catch (e: any) {
        setApiResponse({ success: false, error: e.message || String(e) });
        setApiStatusCode(400);
      }
    } else {
      const summary = StorageService.getPeriodSummary(requestPeriod);
      setApiResponse({
        period: requestPeriod,
        status: summary?.status || 'Draft',
        lastCalculatedAt: summary?.lastCalculatedAt || null,
        approvedBy: summary?.approvedBy || null,
      });
      setApiStatusCode(200);
    }

    setLatencyMs(Math.round(performance.now() - start + 12));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className={`p-6 rounded-3xl border transition-all ${
        isDark ? 'bg-[#0a0c10] border-white/10 text-white shadow-xl' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-teal-400 text-lg">api</span>
            <span className="text-xs font-mono text-teal-400 uppercase tracking-wider font-bold">
              REST API & HR INTEGRATION GATEWAY
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            بوابة الربط والتكامل مع نظام الموارد البشرية (HRMS API)
          </h2>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            واجهات برمجية قياسية بتنسيق JSON محمية برمز مصادقة Bearer Token للربط التلقائي وتغذية مسير الرواتب
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-mono font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>API Gateway Live</span>
          </div>
        </div>
      </div>

      {/* Security Credentials Card */}
      <div className={`p-6 rounded-3xl border ${
        isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200 shadow-sm'
      } space-y-4`}>
        <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs">
          <div className="flex items-center gap-2 font-bold text-sm text-teal-400">
            <Key className="w-4 h-4" />
            <span>ترويسة المصادقة والأمان الإلزامية (Bearer Token Authentication)</span>
          </div>
          <span className="text-slate-400 font-mono text-[11px]">RFC 6750 Standard</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className={`flex-1 w-full p-3 rounded-2xl border font-mono text-xs flex items-center justify-between ${
            isDark ? 'bg-[#06080d] border-white/10 text-teal-300' : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <span className="truncate">Authorization: Bearer {settings.hrApiToken}</span>
          </div>
          <button
            onClick={handleCopyToken}
            className={`px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              isDark ? 'bg-white/10 hover:bg-white/15 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>تم النسخ للحافظة</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>نسخ الرمز</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Interactive API Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Endpoints List (1 Col) */}
        <div className={`p-6 rounded-3xl border space-y-3 ${
          isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="font-bold text-xs text-slate-400 mb-2">المسارات البرمجية المتاحة (Endpoints):</div>
          {endpoints.map((ep) => {
            const isSelected = selectedEndpoint === ep.id;
            return (
              <button
                key={ep.id}
                onClick={() => {
                  setSelectedEndpoint(ep.id);
                  setApiResponse(null);
                }}
                className={`w-full p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-teal-500/20 border-teal-500/60 shadow-md text-white'
                    : isDark ? 'bg-[#111827] border-white/10 hover:border-white/20' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold ${
                      ep.method === 'GET'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span className="font-mono text-xs font-bold truncate">{ep.path.split('?')[0]}</span>
                </div>
                <p className={`text-[11px] line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{ep.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Live Execution Console (2 Cols) */}
        <div className={`lg:col-span-2 p-6 rounded-3xl border space-y-4 ${
          isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-teal-400">فترة الاستعلام:</span>
              <input
                type="month"
                value={requestPeriod}
                onChange={(e) => setRequestPeriod(e.target.value)}
                className={`px-3 py-1.5 rounded-xl border focus:outline-none focus:border-teal-500 font-mono font-bold ${
                  isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <button
              onClick={handleExecuteApi}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl font-bold shadow-md shadow-teal-600/20 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>إرسال الطلب التجريبي (Live Test)</span>
            </button>
          </div>

          {/* Response Payload Viewer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400">استجابة الخادم (JSON Response):</span>
              {apiResponse && (
                <div className="flex items-center gap-3 font-mono text-[11px]">
                  <span className="text-emerald-400 font-bold">Status: {apiStatusCode} OK</span>
                  <span className="text-slate-400">Latency: {latencyMs}ms</span>
                </div>
              )}
            </div>

            <pre
              className={`p-4 rounded-2xl border font-mono text-xs overflow-x-auto max-h-96 leading-relaxed ${
                isDark ? 'bg-[#06080d] border-white/10 text-emerald-400' : 'bg-slate-900 border-slate-800 text-emerald-400'
              }`}
              dir="ltr"
            >
              {apiResponse
                ? JSON.stringify(apiResponse, null, 2)
                : '// انقر على "إرسال الطلب التجريبي" لمعاينة استجابة JSON الفعلية'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
