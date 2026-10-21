import React, { useState } from 'react';
import { StorageService } from '../services/storage';
import {
  LoanOfficerEntitlement,
  SupervisorEntitlement,
  PeriodSummary,
  CalculationPeriodStatus,
} from '../types';
import {
  Play,
  RotateCcw,
  CheckCircle,
  Lock,
  Eye,
  X,
  FileCheck,
  AlertTriangle,
  Building,
  Users,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Send
} from 'lucide-react';

interface CalculationWorkbenchViewProps {
  period: string;
  onPeriodChange: (p: string) => void;
  onNavigateToReports: () => void;
  isDark?: boolean;
  vitasEmployees?: any[];
}

export const IncentivesCalculationWorkbenchView: React.FC<CalculationWorkbenchViewProps> = ({
  period,
  onPeriodChange,
  onNavigateToReports,
  isDark = false,
  vitasEmployees = [],
}) => {
  const currentUser = StorageService.getCurrentUser();
  const [loResults, setLoResults] = useState<LoanOfficerEntitlement[]>(
    StorageService.getLOEntitlements(period)
  );
  const [supResults, setSupResults] = useState<SupervisorEntitlement[]>(
    StorageService.getSupervisorEntitlements(period)
  );
  const [summary, setSummary] = useState<PeriodSummary | null>(
    StorageService.getPeriodSummary(period)
  );
  const [activeTab, setActiveTab] = useState<'lo' | 'supervisors'>('lo');

  // Breakdown detail modal
  const [selectedLo, setSelectedLo] = useState<LoanOfficerEntitlement | null>(null);
  const [selectedSup, setSelectedSup] = useState<SupervisorEntitlement | null>(null);

  // Recalculation Reason Modal
  const [isRecalcModalOpen, setIsRecalcModalOpen] = useState(false);
  const [recalcReason, setRecalcReason] = useState('');
  const [pushStatusMessage, setPushStatusMessage] = useState<string | null>(null);

  const currentStatus: CalculationPeriodStatus =
    summary?.status || (loResults.length > 0 ? 'Calculated' : 'Draft');

  // Trigger Calculation
  const handleExecuteCalculation = (isRecalc = false, reason = '') => {
    try {
      const res = StorageService.calculatePeriod(period, {
        recalculate: isRecalc,
        reason,
      });
      setLoResults(res.loResults);
      setSupResults(res.supResults);
      setSummary(res.summary);
      setIsRecalcModalOpen(false);
      setRecalcReason('');
    } catch (err: any) {
      alert(`فشل تنفيذ عملية الاحتساب: ${err.message || err}`);
    }
  };

  // Change Period Status (Workflow transition)
  const handleUpdateStatus = (newStatus: CalculationPeriodStatus) => {
    try {
      StorageService.updatePeriodStatus(period, newStatus);
      setSummary(StorageService.getPeriodSummary(period));
      setLoResults(StorageService.getLOEntitlements(period));
      setSupResults(StorageService.getSupervisorEntitlements(period));
    } catch (err: any) {
      alert(`خطأ في تحديث الحالة: ${err.message || err}`);
    }
  };

  // Push to Monthly Payroll in App
  const handlePushToPayroll = () => {
    const res = StorageService.pushToMonthlyPayroll(period, vitasEmployees);
    setPushStatusMessage(res.message);
    setTimeout(() => setPushStatusMessage(null), 4000);
  };

  const getStatusBadge = (st: CalculationPeriodStatus) => {
    switch (st) {
      case 'Draft':
        return <span className="text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-bold font-mono">مسودة (Draft)</span>;
      case 'Calculated':
        return <span className="text-blue-400 bg-blue-500/10 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-bold font-mono">تم الاحتساب (Calculated)</span>;
      case 'Under Review':
        return <span className="text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-bold font-mono">قيد التدقيق (Under Review)</span>;
      case 'Approved':
        return <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold font-mono">معتمد (Approved)</span>;
      case 'Locked':
        return <span className="text-purple-400 bg-purple-500/10 border border-purple-500/30 px-3 py-1 rounded-full text-xs font-bold font-mono">مقفل ونهائي (Locked)</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className={`p-6 rounded-3xl border transition-all ${
        isDark ? 'bg-[#0a0c10] border-white/10 text-white shadow-xl' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      } flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-teal-400 text-lg">calculate</span>
            <span className="text-xs font-mono text-teal-400 uppercase tracking-wider font-bold">
              CALCULATION WORKBENCH & WORKFLOW ENGINE
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            منصة احتساب واعتماد المستحقات المالية
          </h2>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            تشغيل المحرك لفترة {period}، تدقيق معادلات المسؤولين، تجميع حوافز المشرفين، وقفل الدورة المالية
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold">فترة العمل:</span>
            <input
              type="month"
              value={period}
              onChange={(e) => {
                onPeriodChange(e.target.value);
                setLoResults(StorageService.getLOEntitlements(e.target.value));
                setSupResults(StorageService.getSupervisorEntitlements(e.target.value));
                setSummary(StorageService.getPeriodSummary(e.target.value));
              }}
              className={`px-3 py-1.5 rounded-xl border focus:outline-none focus:border-teal-500 font-mono font-bold text-xs ${
                isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>

          {/* Recalculate or Execute Action Button */}
          {loResults.length === 0 ? (
            <button
              onClick={() => handleExecuteCalculation(false)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-600/30 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4" />
              <span>تشغيل محرك الاحتساب</span>
            </button>
          ) : (
            <button
              onClick={() => {
                if (currentStatus === 'Locked') {
                  alert('الفترة مقفلة نهائياً ولا يمكن إعادة احتسابها.');
                  return;
                }
                setIsRecalcModalOpen(true);
              }}
              disabled={currentStatus === 'Locked'}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentStatus === 'Locked'
                  ? 'opacity-50 cursor-not-allowed bg-white/5 text-slate-500'
                  : isDark ? 'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-teal-400" />
              <span>إعادة الاحتساب بمبرر</span>
            </button>
          )}

          {/* Workflow Status Action Buttons */}
          {currentStatus === 'Calculated' && (
            <button
              onClick={() => handleUpdateStatus('Under Review')}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 cursor-pointer"
            >
              إرسال للمراجعة والتدقيق
            </button>
          )}

          {currentStatus === 'Under Review' && (currentUser.role === 'admin' || currentUser.role === 'approver') && (
            <button
              onClick={() => handleUpdateStatus('Approved')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>اعتماد النتائج (Approve)</span>
            </button>
          )}

          {currentStatus === 'Approved' && (
            <>
              <button
                onClick={handlePushToPayroll}
                className="px-4 py-2.5 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 cursor-pointer flex items-center gap-1.5"
                title="ترحيل الحوافز وبدل النقل تلقائياً إلى شاشة إدارة الرواتب الشهرية"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ترحيل لمسير الرواتب الرئيسي</span>
              </button>

              {(currentUser.role === 'admin' || currentUser.role === 'approver') && (
                <button
                  onClick={() => handleUpdateStatus('Locked')}
                  className="px-4 py-2.5 bg-purple-700 hover:bg-purple-600 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-700/20 cursor-pointer flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>قفل الفترة نهائياً (Lock)</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Push Feedback Alert */}
      {pushStatusMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2.5 animate-in fade-in duration-200">
          <CheckCircle className="w-4 h-4" />
          <span>{pushStatusMessage}</span>
        </div>
      )}

      {/* Financial Summary KPIs */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0a0c10] border-teal-500/30' : 'bg-teal-50 border-teal-200'}`}>
            <span className="text-slate-400 block font-medium">إجمالي الحوافز المحسوبة</span>
            <p className="text-xl font-black text-teal-400 font-mono mt-1">
              {summary.totalIncentives.toLocaleString()} د.ع
            </p>
          </div>
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0a0c10] border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
            <span className="text-slate-400 block font-medium">إجمالي بدل النقل الميداني</span>
            <p className="text-xl font-black text-blue-400 font-mono mt-1">
              {summary.totalTransportation.toLocaleString()} د.ع
            </p>
          </div>
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0a0c10] border-purple-500/30' : 'bg-purple-50 border-purple-200'}`}>
            <span className="text-slate-400 block font-medium">إجمالي مكافآت التميز</span>
            <p className="text-xl font-black text-purple-400 font-mono mt-1">
              {summary.totalBonus.toLocaleString()} د.ع
            </p>
          </div>
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0a0c10] border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'}`}>
            <span className="text-slate-400 block font-medium">المجموع الإجمالي للمستحقات</span>
            <p className="text-xl font-black text-emerald-400 font-mono mt-1">
              {summary.grandTotal.toLocaleString()} د.ع
            </p>
          </div>
        </div>
      )}

      {/* Tabs: Loan Officers vs Supervisors */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('lo')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'lo'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
              : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>مسؤولو القروض ({loResults.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('supervisors')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'supervisors'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
              : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>مشرفو مسؤولي القروض ({supResults.length})</span>
        </button>
      </div>

      {/* TAB 1: Loan Officers Entitlements Table */}
      {activeTab === 'lo' && (
        <div className={`rounded-3xl border overflow-hidden ${
          isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-right border-collapse">
              <thead className={`${isDark ? 'bg-[#06080d] text-slate-300' : 'bg-slate-50 text-slate-700'} border-b font-bold`}>
                <tr>
                  <th className="p-3.5">الرقم المؤسسي</th>
                  <th className="p-3.5">اسم مسؤول القروض</th>
                  <th className="p-3.5">الفرع</th>
                  <th className="p-3.5 text-center">الحوافز</th>
                  <th className="p-3.5 text-center">بدل النقل</th>
                  <th className="p-3.5 text-center">المكافأة</th>
                  <th className="p-3.5 text-center">إجمالي المستحق</th>
                  <th className="p-3.5 text-center">الإصدارات</th>
                  <th className="p-3.5 text-center">تفاصيل الحساب</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-200'}`}>
                {loResults.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500 font-medium">
                      لم يتم احتساب الفترة بعد. يرجى النقر على "تشغيل محرك الاحتساب" أعلاه.
                    </td>
                  </tr>
                ) : (
                  loResults.map((lo) => (
                    <tr key={lo.id} className={`${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'} transition-colors`}>
                      <td className="p-3.5 font-mono font-bold text-teal-400">{lo.employeeId}</td>
                      <td className="p-3.5 font-bold">{lo.employeeName}</td>
                      <td className="p-3.5 text-slate-400">{lo.office}</td>
                      <td className="p-3.5 text-center font-mono font-bold text-teal-400">
                        {lo.incentives.toLocaleString()} د.ع
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-blue-400">
                        {lo.transportation.toLocaleString()} د.ع
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-purple-400">
                        {lo.bonus.toLocaleString()} د.ع
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-emerald-400 text-sm">
                        {lo.totalEntitlements.toLocaleString()} د.ع
                      </td>
                      <td className="p-3.5 text-center font-mono text-[11px] text-slate-400">
                        v{lo.formulaVersionsUsed.incentivesVersion}/v{lo.formulaVersionsUsed.transportationVersion}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => setSelectedLo(lo)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 mx-auto ${
                            isDark ? 'bg-white/5 hover:bg-white/10 text-teal-300 border-white/10' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>تتبع الحساب</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Supervisors Rollup Table */}
      {activeTab === 'supervisors' && (
        <div className={`rounded-3xl border overflow-hidden ${
          isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-right border-collapse">
              <thead className={`${isDark ? 'bg-[#06080d] text-slate-300' : 'bg-slate-50 text-slate-700'} border-b font-bold`}>
                <tr>
                  <th className="p-3.5">الرقم المؤسسي</th>
                  <th className="p-3.5">اسم المشرف</th>
                  <th className="p-3.5">الفرع</th>
                  <th className="p-3.5 text-center">فريق المسؤولين</th>
                  <th className="p-3.5 text-center">صرف الفريق</th>
                  <th className="p-3.5 text-center">متوسط سداد الفريق</th>
                  <th className="p-3.5 text-center">حافز الإشراف</th>
                  <th className="p-3.5 text-center">المستحق الكلي</th>
                  <th className="p-3.5 text-center">التتبع الرياضي</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-200'}`}>
                {supResults.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500 font-medium">
                      لا توجد سجلات مشرفين محسوبة للفترة
                    </td>
                  </tr>
                ) : (
                  supResults.map((sup) => (
                    <tr key={sup.id} className={`${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'} transition-colors`}>
                      <td className="p-3.5 font-mono font-bold text-teal-400">{sup.supervisorId}</td>
                      <td className="p-3.5 font-bold">{sup.supervisorName}</td>
                      <td className="p-3.5 text-slate-400">{sup.office}</td>
                      <td className="p-3.5 text-center font-mono font-bold">
                        {sup.supervisedOfficersCount} مسؤول
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-blue-400">
                        {sup.totalDisbursedAmount.toLocaleString()} د.ع
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-amber-400">
                        {sup.averageRepaymentRate}%
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-teal-400">
                        {sup.incentives.toLocaleString()} د.ع
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-emerald-400 text-sm">
                        {sup.totalEntitlements.toLocaleString()} د.ع
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => setSelectedSup(sup)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 mx-auto ${
                            isDark ? 'bg-white/5 hover:bg-white/10 text-teal-300 border-white/10' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>تتبع التجميع</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Loan Officer Mathematical Trace Modal */}
      {selectedLo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`p-6 border-b ${isDark ? 'border-white/10 bg-[#0a0c10]' : 'border-slate-200 bg-slate-50'} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">سجل التتبع الحسابي المفصل لمسؤول القروض</h3>
                  <p className="text-xs text-slate-400">
                    {selectedLo.employeeName} ({selectedLo.employeeId}) · {selectedLo.office}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedLo(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-4 text-xs overflow-y-auto max-h-[70vh]">
              {/* Snapshot Variables */}
              <div className={`p-4 rounded-2xl border space-y-2 ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                <span className="font-bold text-teal-400 block">مدخلات المتغيرات المعتمدة للشهر:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                  {Object.entries(selectedLo.variablesSnapshot).map(([k, v]) => (
                    <div key={k} className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-slate-400 block">{k}:</span>
                      <span className="text-teal-300 font-bold">{v.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step By Step Formula Evaluation */}
              <div className="space-y-3 font-mono">
                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0a0c10] border-teal-500/30' : 'bg-teal-50 border-teal-200'}`}>
                  <div className="font-bold text-teal-400 mb-1">1. حافز الإنتاجية والسداد (Incentives): {selectedLo.incentives.toLocaleString()} د.ع</div>
                  <div className="text-[11px] text-slate-400 mb-2">المعادلة: {selectedLo.breakdown.incentivesSteps?.[0]?.formula}</div>
                  {selectedLo.breakdown.incentivesSteps?.map((st, i) => (
                    <div key={i} className="text-[11px] text-slate-300">• {st.evaluatedExpression}</div>
                  ))}
                </div>

                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0a0c10] border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
                  <div className="font-bold text-blue-400 mb-1">2. بدل الانتقال الميداني (Transportation): {selectedLo.transportation.toLocaleString()} د.ع</div>
                  <div className="text-[11px] text-slate-400 mb-2">المعادلة: {selectedLo.breakdown.transportationSteps?.[0]?.formula}</div>
                  {selectedLo.breakdown.transportationSteps?.map((st, i) => (
                    <div key={i} className="text-[11px] text-slate-300">• {st.evaluatedExpression}</div>
                  ))}
                </div>

                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0a0c10] border-purple-500/30' : 'bg-purple-50 border-purple-200'}`}>
                  <div className="font-bold text-purple-400 mb-1">3. مكافأة التميز (Bonus): {selectedLo.bonus.toLocaleString()} د.ع</div>
                  <div className="text-[11px] text-slate-400 mb-2">المعادلة: {selectedLo.breakdown.bonusSteps?.[0]?.formula}</div>
                  {selectedLo.breakdown.bonusSteps?.map((st, i) => (
                    <div key={i} className="text-[11px] text-slate-300">• {st.evaluatedExpression}</div>
                  ))}
                </div>
              </div>

              {/* Total Calculation */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                isDark ? 'bg-[#06080d] border-emerald-500/40 text-white' : 'bg-emerald-50 border-emerald-300 text-slate-900'
              }`}>
                <span className="font-bold text-xs">إجمالي الاستحقاق المحتسب (Total Entitlement):</span>
                <span className="font-mono text-lg font-black text-emerald-400">
                  {selectedLo.totalEntitlements.toLocaleString()} د.ع
                </span>
              </div>
            </div>

            <div className={`p-4 border-t ${isDark ? 'border-white/10 bg-[#0a0c10]' : 'border-slate-200 bg-slate-50'} flex justify-end`}>
              <button
                onClick={() => setSelectedLo(null)}
                className={`px-5 py-2 rounded-xl text-xs font-bold ${
                  isDark ? 'bg-white/10 hover:bg-white/15 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                }`}
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recalculation Modal with Required Reason */}
      {isRecalcModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">إعادة احتساب المستحقات المالية للفترة</h3>
                  <p className="text-xs text-slate-400">توثيق السبب في سجل التدقيق المالي</p>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">سبب إعادة الاحتساب الإلزامي *</label>
                <textarea
                  rows={3}
                  required
                  value={recalcReason}
                  onChange={(e) => setRecalcReason(e.target.value)}
                  placeholder="مثال: تعديل نسب سداد فرع بابل أو تصحيح بيانات ملف الإكسل..."
                  className={`w-full p-3 rounded-xl border focus:outline-none focus:border-teal-500 ${
                    isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRecalcModalOpen(false)}
                  className={`px-4 py-2 rounded-xl font-bold ${isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-200 text-slate-700'}`}
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!recalcReason.trim()) {
                      alert('يرجى إدخال سبب إعادة الاحتساب لتوثيقه بسجل الأمان');
                      return;
                    }
                    handleExecuteCalculation(true, recalcReason);
                  }}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold shadow-lg shadow-teal-600/30"
                >
                  تأكيد وإعادة الاحتساب
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
