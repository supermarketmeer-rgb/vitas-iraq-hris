import React, { useState } from 'react';
import { StorageService } from '../services/storage';
import { SupervisorEntitlement, LoanOfficerEntitlement } from '../types';
import { ExcelService } from '../services/excelService';
import {
  ShieldCheck,
  Users,
  Search,
  Filter,
  Eye,
  X,
  FileSpreadsheet,
  Printer,
  Sparkles,
  TrendingUp,
  Building,
  Award,
  Layers,
  Calculator,
  Calendar,
  ChevronDown,
  ChevronUp,
  Info,
  DollarSign
} from 'lucide-react';

interface SupervisorsViewProps {
  period: string;
  onPeriodChange?: (period: string) => void;
  isDark?: boolean;
}

export const IncentivesSupervisorsView: React.FC<SupervisorsViewProps> = ({
  period,
  onPeriodChange,
  isDark = true,
}) => {
  const [search, setSearch] = useState('');
  const [selectedOffice, setSelectedOffice] = useState<string>('all');
  const [selectedSupForTrace, setSelectedSupForTrace] = useState<SupervisorEntitlement | null>(null);
  const [selectedSupForTeam, setSelectedSupForTeam] = useState<SupervisorEntitlement | null>(null);

  const supList = StorageService.getSupervisorEntitlements(period);
  const loList = StorageService.getLOEntitlements(period);
  const formulas = StorageService.getFormulas();
  const supFormula = formulas.find((f) => f.type === 'supervisor_incentives' && f.isActive) || formulas[3];

  // Unique offices
  const offices = Array.from(new Set(supList.map((sup) => sup.office).filter(Boolean)));

  // Filtered list
  const filteredSups = supList.filter((sup) => {
    const matchesSearch =
      sup.supervisorName.toLowerCase().includes(search.toLowerCase()) ||
      sup.supervisorId.toLowerCase().includes(search.toLowerCase());
    const matchesOffice = selectedOffice === 'all' || sup.office === selectedOffice;
    return matchesSearch && matchesOffice;
  });

  // Calculate statistics
  const totalSupIncentives = supList.reduce((acc, curr) => acc + curr.incentives, 0);
  const totalSupTransportation = supList.reduce((acc, curr) => acc + curr.transportation, 0);
  const totalSupBonus = supList.reduce((acc, curr) => acc + curr.bonus, 0);
  const grandTotalEntitlements = supList.reduce((acc, curr) => acc + curr.totalEntitlements, 0);
  const totalTeamLOIncentives = supList.reduce((acc, curr) => acc + curr.totalTeamIncentives, 0);
  const avgSupEntitlement = supList.length > 0 ? grandTotalEntitlements / supList.length : 0;
  const totalSupervisedOfficers = supList.reduce((acc, curr) => acc + curr.supervisedOfficersCount, 0);

  const handleExportExcel = () => {
    ExcelService.exportEntitlementsReport(period);
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper to get supervised loan officers for a given supervisor
  const getSupervisedLOs = (supId: string): LoanOfficerEntitlement[] => {
    return loList.filter((lo) => lo.supervisorId === supId);
  };

  return (
    <div className="space-y-6 font-['Cairo',sans-serif] animate-in fade-in duration-300">
      {/* Dependency Rule Callout Banner */}
      <div
        className={`p-5 rounded-3xl border transition-all ${
          isDark
            ? 'bg-gradient-to-r from-teal-950/40 via-[#0a0c10] to-emerald-950/40 border-teal-500/30'
            : 'bg-teal-50/80 border-teal-200'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">
                  قاعدة احتساب حوافز المشرفين (Supervisors Rollup Entitlement)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  معتمدة على نتائج مسؤولي القروض
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                تخضع حوافز السوبرفايزرز لمعادلات تشتق مدخلاتها مباشرة من مجموع حوافز مسؤولي القروض التابعين لهم (
                <code className="text-teal-400 font-mono">LO_TOTAL_INCENTIVES</code>)، ونسبة المؤهلين للحافز، ومتوسط السداد.
              </p>
              <div className="mt-2 text-[11px] font-mono bg-black/40 px-3 py-1.5 rounded-xl border border-white/10 text-teal-300 inline-block">
                الصيغة المعتمدة: {supFormula?.expression || 'IF(LO_AVG_REPAYMENT >= 95, (LO_TOTAL_INCENTIVES * 0.16)...)'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>تصدير Excel</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Supervisor Entitlements */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            isDark ? 'bg-[#0a0c10] border-white/10 shadow-lg' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-bold">إجمالي مستحقات المشرفين</span>
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-teal-400">
            {grandTotalEntitlements.toLocaleString()} <span className="text-xs font-normal text-slate-400">د.ع</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
            <span>حافز: {totalSupIncentives.toLocaleString()}</span>
            <span>•</span>
            <span>نقل وبونص: {(totalSupTransportation + totalSupBonus).toLocaleString()}</span>
          </div>
        </div>

        {/* KPI 2: Total Team LO Incentives Supervised */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            isDark ? 'bg-[#0a0c10] border-white/10 shadow-lg' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-bold">مجموع حوافز الفرق المدارة</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {totalTeamLOIncentives.toLocaleString()} <span className="text-xs font-normal text-slate-400">د.ع</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            <span>القاعدة المالية التي استندت إليها حوافز الإشراف</span>
          </div>
        </div>

        {/* KPI 3: Average Supervisor Entitlement */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            isDark ? 'bg-[#0a0c10] border-white/10 shadow-lg' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-bold">متوسط استحقاق المشرف</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {Math.round(avgSupEntitlement).toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">د.ع</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            <span>معدل لعدد {supList.length} مشرفين معتمدين</span>
          </div>
        </div>

        {/* KPI 4: Supervised Officers Count */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            isDark ? 'bg-[#0a0c10] border-white/10 shadow-lg' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-bold">إجمالي مسؤولي القروض المدارين</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-400">
            {totalSupervisedOfficers} <span className="text-xs font-normal text-slate-400">مسؤول</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            <span>موزعين على الفروع والمكاتب الميدانية</span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div
        className={`p-6 rounded-3xl border ${
          isDark ? 'bg-[#0a0c10] border-white/10 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="البحث باسم المشرف أو الرقم الوظيفي..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full text-xs pr-9 pl-3 py-2 rounded-xl border focus:outline-none focus:border-teal-500 transition-colors ${
                  isDark ? 'bg-[#06080d] border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200'
                }`}
              />
            </div>

            {/* Office Filter */}
            <div className="relative w-full sm:w-56">
              <select
                value={selectedOffice}
                onChange={(e) => setSelectedOffice(e.target.value)}
                className={`w-full text-xs px-3 py-2 rounded-xl border focus:outline-none focus:border-teal-500 transition-colors cursor-pointer ${
                  isDark ? 'bg-[#06080d] border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <option value="all">جميع الفروع</option>
                {offices.map((off) => (
                  <option key={off} value={off}>
                    {off}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {onPeriodChange && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${
                isDark ? 'bg-[#0f172a] border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-teal-400" />
              <span>الفترة:</span>
              <input
                type="month"
                value={period}
                onChange={(e) => onPeriodChange(e.target.value)}
                className="bg-transparent focus:outline-none font-bold text-teal-400 cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-xs text-right">
            <thead className={isDark ? 'bg-[#06080d] text-slate-400 font-bold' : 'bg-slate-100 text-slate-700'}>
              <tr className="border-b border-white/10">
                <th className="p-3">#</th>
                <th className="p-3">المشرف (السوبرفايزر)</th>
                <th className="p-3">الفرع</th>
                <th className="p-3 text-center">أعضاء فريقه</th>
                <th className="p-3 text-center">المؤهلون للحافز</th>
                <th className="p-3 text-left font-black text-amber-300">مجموع حوافز فريقه (LO)</th>
                <th className="p-3 text-left text-slate-400">متوسط حافز الفرد</th>
                <th className="p-3 text-center">سداد الفريق</th>
                <th className="p-3 text-left">حافز الإشراف</th>
                <th className="p-3 text-left">النقل والبونص</th>
                <th className="p-3 text-left font-black text-teal-400">إجمالي مستحق المشرف</th>
                <th className="p-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredSups.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-10 text-slate-500">
                    لا توجد سجلات مشرفين مطابقة للفترة أو الفلاتر المحددة.
                  </td>
                </tr>
              ) : (
                filteredSups.map((sup, idx) => (
                  <tr
                    key={sup.id}
                    className={`hover:bg-white/[0.02] transition-colors ${
                      idx % 2 === 0 ? 'bg-transparent' : isDark ? 'bg-white/[0.01]' : 'bg-slate-50/50'
                    }`}
                  >
                    <td className="p-3 text-slate-500 font-mono">{idx + 1}</td>
                    <td className="p-3">
                      <div className="font-bold text-white">{sup.supervisorName}</div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono mt-0.5">
                        <span className="text-teal-400/80">{sup.supervisorId}</span>
                        {sup.badgeNo && (
                          <span className="text-slate-400 bg-white/5 px-1.5 py-0.2 rounded border border-white/10">{sup.badgeNo}</span>
                        )}
                        {sup.waid && (
                          <span className="text-teal-300 bg-teal-500/10 px-1.5 py-0.2 rounded border border-teal-500/20 font-bold">WAID: {sup.waid}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-slate-300">
                      <span className="flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-500" />
                        {sup.office}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="font-mono font-bold px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        {sup.supervisedOfficersCount} مسؤولي قروض
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono">
                      <span
                        className={`px-2 py-0.5 rounded-lg font-bold ${
                          sup.qualifiedOfficersCount === sup.supervisedOfficersCount
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {sup.qualifiedOfficersCount} / {sup.supervisedOfficersCount}
                      </span>
                    </td>
                    <td className="p-3 text-left font-mono font-black text-amber-300 text-sm">
                      {sup.totalTeamIncentives.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">د.ع</span>
                    </td>
                    <td className="p-3 text-left font-mono text-slate-400">
                      {sup.averageTeamIncentives.toLocaleString()} د.ع
                    </td>
                    <td className="p-3 text-center font-mono text-slate-300">
                      <span className="px-1.5 py-0.5 rounded bg-white/5 font-bold">
                        {sup.averageRepaymentRate}%
                      </span>
                    </td>
                    <td className="p-3 text-left font-mono font-bold text-slate-200">
                      {sup.incentives.toLocaleString()}
                    </td>
                    <td className="p-3 text-left font-mono text-slate-400">
                      {(sup.transportation + sup.bonus).toLocaleString()}
                    </td>
                    <td className="p-3 text-left font-mono font-black text-emerald-400 text-sm">
                      {sup.totalEntitlements.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">د.ع</span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Team Drilldown button */}
                        <button
                          onClick={() => setSelectedSupForTeam(sup)}
                          className="px-2.5 py-1 rounded-lg border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                          title="عرض مسؤولي القروض التابعين له وحوافزهم الفردية"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>أعضاء الفريق</span>
                        </button>

                        {/* Trace formula button */}
                        <button
                          onClick={() => setSelectedSupForTrace(sup)}
                          className="px-2.5 py-1 rounded-lg border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                          title="تتبع خطوات معادلة المشرف الرياضية"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>تتبع الحساب</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Team Drilldown Modal */}
      {selectedSupForTeam && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-3xl rounded-3xl border p-6 space-y-5 animate-in zoom-in-95 duration-200 ${
              isDark ? 'bg-[#0a0c10] border-purple-500/30 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">فريق مسؤولي القروض التابعين للمشرف</h3>
                  <p className="text-xs text-slate-400">
                    {selectedSupForTeam.supervisorName} ({selectedSupForTeam.supervisorId}) — {selectedSupForTeam.office}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSupForTeam(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Team Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <span className="text-[11px] text-purple-300 block">عدد مسؤولي القروض:</span>
                <span className="text-lg font-black text-white font-mono">
                  {selectedSupForTeam.supervisedOfficersCount} موظفين
                </span>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-[11px] text-amber-300 block">مجموع حوافزهم المعتمدة:</span>
                <span className="text-lg font-black text-amber-300 font-mono">
                  {selectedSupForTeam.totalTeamIncentives.toLocaleString()} د.ع
                </span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[11px] text-emerald-300 block">حافز الإشراف المحسوب:</span>
                <span className="text-lg font-black text-emerald-400 font-mono">
                  {selectedSupForTeam.incentives.toLocaleString()} د.ع
                </span>
              </div>
            </div>

            {/* Subordinate Loan Officers Table */}
            <div className="overflow-x-auto rounded-xl border border-white/10 max-h-64 overflow-y-auto">
              <table className="w-full text-xs text-right">
                <thead className={isDark ? 'bg-[#06080d] text-slate-400 sticky top-0' : 'bg-slate-100'}>
                  <tr className="border-b border-white/10">
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">مسؤول القرض</th>
                    <th className="p-2.5 text-center">عدد القروض (V1)</th>
                    <th className="p-2.5 text-center">مبلغ الصرف (V2)</th>
                    <th className="p-2.5 text-center">نسبة السداد (V3)</th>
                    <th className="p-2.5 text-left font-black text-amber-300">حافزه الفردي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {getSupervisedLOs(selectedSupForTeam.supervisorId).map((lo, i) => (
                    <tr key={lo.id} className="hover:bg-white/[0.02]">
                      <td className="p-2.5 text-slate-500 font-mono">{i + 1}</td>
                      <td className="p-2.5">
                        <div className="font-bold text-white">{lo.employeeName}</div>
                        <div className="text-[10px] font-mono text-teal-400">{lo.employeeId}</div>
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-slate-200">
                        {lo.variablesSnapshot['Variable01'] || 0}
                      </td>
                      <td className="p-2.5 text-center font-mono text-slate-300">
                        {((lo.variablesSnapshot['Variable02'] || 0) / 1000000).toFixed(1)}M
                      </td>
                      <td className="p-2.5 text-center font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-white/5 font-bold text-slate-200">
                          {lo.variablesSnapshot['Variable03'] || 0}%
                        </span>
                      </td>
                      <td className="p-2.5 text-left font-mono font-black text-amber-300 text-sm">
                        {lo.incentives.toLocaleString()} د.ع
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedSupForTeam(null)}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step Trace Modal */}
      {selectedSupForTrace && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-2xl rounded-3xl border p-6 space-y-5 animate-in zoom-in-95 duration-200 ${
              isDark ? 'bg-[#0a0c10] border-teal-500/30 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">تتبع معادلة احتساب حافز المشرف</h3>
                  <p className="text-xs text-slate-400">
                    {selectedSupForTrace.supervisorName} ({selectedSupForTrace.supervisorId}) — {selectedSupForTrace.office}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSupForTrace(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Trace Steps Content */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* Rollup Input Variables */}
              <div className="p-3.5 rounded-2xl bg-[#06080d] border border-white/10 space-y-2">
                <div className="text-xs font-bold text-teal-400">
                  المدخلات المشتقة من نتائج فريق مسؤولي القروض:
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 flex justify-between">
                    <span className="text-slate-400">عدد مسؤولي القروض (LO_COUNT):</span>
                    <span className="text-white font-bold">{selectedSupForTrace.supervisedOfficersCount}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 flex justify-between">
                    <span className="text-slate-400">المؤهلون (LO_QUALIFIED_COUNT):</span>
                    <span className="text-white font-bold">{selectedSupForTrace.qualifiedOfficersCount}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 flex justify-between col-span-2">
                    <span className="text-slate-400">مجموع حوافز الفريق (LO_TOTAL_INCENTIVES):</span>
                    <span className="text-amber-300 font-bold">{selectedSupForTrace.totalTeamIncentives.toLocaleString()} د.ع</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 flex justify-between">
                    <span className="text-slate-400">متوسط الحافز (LO_AVG_INCENTIVES):</span>
                    <span className="text-white font-bold">{selectedSupForTrace.averageTeamIncentives.toLocaleString()} د.ع</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 flex justify-between">
                    <span className="text-slate-400">متوسط السداد (LO_AVG_REPAYMENT):</span>
                    <span className="text-white font-bold">{selectedSupForTrace.averageRepaymentRate}%</span>
                  </div>
                </div>
              </div>

              {/* Formula Evaluation */}
              <div className="p-4 rounded-2xl bg-teal-500/5 border border-teal-500/20 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-teal-300">صيغة المعادلة الرياضية المطبقة:</span>
                  <span className="text-xs font-mono font-black text-teal-400">
                    {selectedSupForTrace.incentives.toLocaleString()} د.ع
                  </span>
                </div>
                <div className="text-[11px] font-mono bg-black/40 p-2.5 rounded-xl border border-white/5 text-slate-300">
                  {selectedSupForTrace.formulaExpression}
                </div>
                {selectedSupForTrace.breakdownSteps?.map((st, i) => (
                  <div key={i} className="text-xs font-mono bg-black/60 p-2.5 rounded-xl border border-teal-500/20 text-teal-300">
                    {st.evaluatedExpression}
                  </div>
                ))}
              </div>

              {/* Transportation & Bonus */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                  <span className="text-[11px] text-blue-300 block">بدل الانتقال الإشرافي:</span>
                  <span className="text-sm font-black font-mono text-blue-400">
                    {selectedSupForTrace.transportation.toLocaleString()} د.ع
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <span className="text-[11px] text-amber-300 block">بونص جودة المحفظة:</span>
                  <span className="text-sm font-black font-mono text-amber-400">
                    {selectedSupForTrace.bonus.toLocaleString()} د.ع
                  </span>
                </div>
              </div>

              {/* Total Calculation */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex justify-between items-center">
                <span className="text-sm font-black text-white">إجمالي استحقاق المشرف:</span>
                <span className="text-lg font-black text-emerald-400 font-mono">
                  {selectedSupForTrace.totalEntitlements.toLocaleString()} د.ع
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedSupForTrace(null)}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
