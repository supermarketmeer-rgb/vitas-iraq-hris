import React, { useState } from 'react';
import { StorageService } from '../services/storage';
import { LoanOfficerEntitlement } from '../types';
import { ExcelService } from '../services/excelService';
import {
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
  UserCheck,
  Award,
  Layers,
  ArrowUpDown,
  Calculator,
  Calendar
} from 'lucide-react';

interface LoanOfficersViewProps {
  period: string;
  onPeriodChange?: (period: string) => void;
  isDark?: boolean;
}

export const IncentivesLoanOfficersView: React.FC<LoanOfficersViewProps> = ({
  period,
  onPeriodChange,
  isDark = true,
}) => {
  const [search, setSearch] = useState('');
  const [selectedOffice, setSelectedOffice] = useState<string>('all');
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>('all');
  const [selectedLoForTrace, setSelectedLoForTrace] = useState<LoanOfficerEntitlement | null>(null);

  const loList = StorageService.getLOEntitlements(period);
  const employees = StorageService.getEmployees();
  const summary = StorageService.getPeriodSummary(period);

  // Unique lists for filters
  const offices = Array.from(new Set(loList.map((lo) => lo.office).filter(Boolean)));
  const supervisors = Array.from(
    new Set(loList.map((lo) => lo.supervisorName).filter(Boolean))
  ) as string[];

  // Filtered list
  const filteredLOs = loList.filter((lo) => {
    const matchesSearch =
      lo.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      lo.employeeId.toLowerCase().includes(search.toLowerCase());
    const matchesOffice = selectedOffice === 'all' || lo.office === selectedOffice;
    const matchesSupervisor = selectedSupervisor === 'all' || lo.supervisorName === selectedSupervisor;
    return matchesSearch && matchesOffice && matchesSupervisor;
  });

  // Calculate statistics
  const totalLoIncentives = loList.reduce((acc, curr) => acc + curr.incentives, 0);
  const totalLoTransportation = loList.reduce((acc, curr) => acc + curr.transportation, 0);
  const totalLoBonus = loList.reduce((acc, curr) => acc + curr.bonus, 0);
  const grandTotalEntitlements = loList.reduce((acc, curr) => acc + curr.totalEntitlements, 0);
  const avgLoIncentive = loList.length > 0 ? totalLoIncentives / loList.length : 0;
  const maxIncentive = loList.length > 0 ? Math.max(...loList.map((l) => l.totalEntitlements)) : 0;

  const handleExportExcel = () => {
    ExcelService.exportEntitlementsReport(period);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 font-['Cairo',sans-serif] animate-in fade-in duration-300">
      {/* Top Banner & KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total LO Incentives */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            isDark ? 'bg-[#0a0c10] border-white/10 shadow-lg' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-bold">إجمالي حوافز مسؤولي القروض</span>
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-teal-400">
            {totalLoIncentives.toLocaleString()} <span className="text-xs font-normal text-slate-400">د.ع</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>الأساسي المحسوب من معادلة القروض</span>
          </div>
        </div>

        {/* KPI 2: Total Entitlements (With transport & bonus) */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            isDark ? 'bg-[#0a0c10] border-white/10 shadow-lg' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-bold">إجمالي المستحقات الشاملة</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {grandTotalEntitlements.toLocaleString()} <span className="text-xs font-normal text-slate-400">د.ع</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
            <span>نقل: {totalLoTransportation.toLocaleString()}</span>
            <span>•</span>
            <span>بونص: {totalLoBonus.toLocaleString()}</span>
          </div>
        </div>

        {/* KPI 3: Average Incentive */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            isDark ? 'bg-[#0a0c10] border-white/10 shadow-lg' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-bold">متوسط استحقاق مسؤول القرض</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {Math.round(avgLoIncentive).toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">د.ع</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            <span>معدل الفرد لعدد {loList.length} مسؤول إقراض</span>
          </div>
        </div>

        {/* KPI 4: Top Entitlement */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            isDark ? 'bg-[#0a0c10] border-white/10 shadow-lg' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-bold">أعلى استحقاق محقق</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400">
            {maxIncentive.toLocaleString()} <span className="text-xs font-normal text-slate-400">د.ع</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            <span>أفضل أداء في الفترة المحددة</span>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div
        className={`p-6 rounded-3xl border ${
          isDark ? 'bg-[#0a0c10] border-white/10 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        {/* Action Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                كشف حوافز ومستحقات مسؤولي القروض
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  فترة {period}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                جدول مفصل بحوافز مسؤولي الإقراض الأفراد، بدل النقل، بونص التميز، والمتغيرات التشغيلية
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Period Selector */}
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

            {/* Export Excel */}
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>تصدير Excel</span>
            </button>

            {/* Print */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الكشف</span>
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="البحث بالاسم أو الرقم الوظيفي..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full text-xs pr-9 pl-3 py-2 rounded-xl border focus:outline-none focus:border-teal-500 transition-colors ${
                isDark ? 'bg-[#06080d] border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200'
              }`}
            />
          </div>

          {/* Office Filter */}
          <div className="relative">
            <select
              value={selectedOffice}
              onChange={(e) => setSelectedOffice(e.target.value)}
              className={`w-full text-xs px-3 py-2 rounded-xl border focus:outline-none focus:border-teal-500 transition-colors cursor-pointer ${
                isDark ? 'bg-[#06080d] border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <option value="all">جميع الفروع والمكاتب</option>
              {offices.map((off) => (
                <option key={off} value={off}>
                  {off}
                </option>
              ))}
            </select>
          </div>

          {/* Supervisor Filter */}
          <div className="relative">
            <select
              value={selectedSupervisor}
              onChange={(e) => setSelectedSupervisor(e.target.value)}
              className={`w-full text-xs px-3 py-2 rounded-xl border focus:outline-none focus:border-teal-500 transition-colors cursor-pointer ${
                isDark ? 'bg-[#06080d] border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <option value="all">جميع المشرفين</option>
              {supervisors.map((sup) => (
                <option key={sup} value={sup}>
                  المشرف: {sup}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-xs text-right">
            <thead className={isDark ? 'bg-[#06080d] text-slate-400 font-bold' : 'bg-slate-100 text-slate-700'}>
              <tr className="border-b border-white/10">
                <th className="p-3">#</th>
                <th className="p-3">مسؤول القرض</th>
                <th className="p-3">الفرع</th>
                <th className="p-3">المشرف المباشر</th>
                <th className="p-3 text-center">عدد القروض (V1)</th>
                <th className="p-3 text-center">مبلغ الصرف (V2)</th>
                <th className="p-3 text-center">نسبة السداد (V3)</th>
                <th className="p-3 text-center">تعثر PAR (V5)</th>
                <th className="p-3 text-left">الحافز الأساسي</th>
                <th className="p-3 text-left">بدل الانتقال</th>
                <th className="p-3 text-left">المكافأة</th>
                <th className="p-3 text-left font-black text-teal-400">إجمالي المستحق</th>
                <th className="p-3 text-center">خطوات الحساب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLOs.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-10 text-slate-500">
                    لا توجد سجلات مسؤولي قروض مطابقة للفلاتر أو لم يتم الاحتساب بعد لهذه الفترة.
                  </td>
                </tr>
              ) : (
                filteredLOs.map((lo, idx) => {
                  const v1 = lo.variablesSnapshot['Variable01'] ?? '-';
                  const v2 = lo.variablesSnapshot['Variable02']
                    ? `${(lo.variablesSnapshot['Variable02'] / 1000000).toFixed(1)}M`
                    : '-';
                  const v3 = lo.variablesSnapshot['Variable03']
                    ? `${lo.variablesSnapshot['Variable03']}%`
                    : '-';
                  const v5 = lo.variablesSnapshot['Variable05']
                    ? `${lo.variablesSnapshot['Variable05']}%`
                    : '-';

                  return (
                    <tr
                      key={lo.id}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        idx % 2 === 0 ? 'bg-transparent' : isDark ? 'bg-white/[0.01]' : 'bg-slate-50/50'
                      }`}
                    >
                      <td className="p-3 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="p-3">
                        <div className="font-bold text-white">{lo.employeeName}</div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono mt-0.5">
                          <span className="text-teal-400/80">{lo.employeeId}</span>
                          {lo.badgeNo && (
                            <span className="text-slate-400 bg-white/5 px-1.5 py-0.2 rounded border border-white/10">{lo.badgeNo}</span>
                          )}
                          {lo.waid && (
                            <span className="text-teal-300 bg-teal-500/10 px-1.5 py-0.2 rounded border border-teal-500/20 font-bold">WAID: {lo.waid}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-slate-300">
                        <span className="flex items-center gap-1">
                          <Building className="w-3 h-3 text-slate-500" />
                          {lo.office}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">
                        {lo.supervisorName ? (
                          <span className="text-slate-300 font-medium">{lo.supervisorName}</span>
                        ) : (
                          <span className="text-slate-600 italic">غير محدد</span>
                        )}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-200">{v1}</td>
                      <td className="p-3 text-center font-mono text-slate-300">{v2}</td>
                      <td className="p-3 text-center font-mono">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                            Number(lo.variablesSnapshot['Variable03'] || 0) >= 95
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {v3}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono text-slate-400">{v5}</td>
                      <td className="p-3 text-left font-mono font-bold text-slate-200">
                        {lo.incentives.toLocaleString()}
                      </td>
                      <td className="p-3 text-left font-mono text-slate-400">
                        {lo.transportation.toLocaleString()}
                      </td>
                      <td className="p-3 text-left font-mono text-slate-400">
                        {lo.bonus.toLocaleString()}
                      </td>
                      <td className="p-3 text-left font-mono font-black text-emerald-400 text-sm">
                        {lo.totalEntitlements.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">د.ع</span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setSelectedLoForTrace(lo)}
                          className="px-2.5 py-1 rounded-lg border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-[11px] font-bold flex items-center gap-1 mx-auto transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>تتبع الحساب</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Step Trace Modal */}
      {selectedLoForTrace && (
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
                  <h3 className="font-bold text-base">تتبع احتساب حافز مسؤول القرض</h3>
                  <p className="text-xs text-slate-400">
                    {selectedLoForTrace.employeeName} ({selectedLoForTrace.employeeId}) — {selectedLoForTrace.office}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLoForTrace(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step Trace Contents */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* Snapshot Variables */}
              <div className="p-3.5 rounded-2xl bg-[#06080d] border border-white/10">
                <div className="text-xs font-bold text-teal-400 mb-2">المتغيرات المدخلة في المعادلة:</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                  {Object.entries(selectedLoForTrace.variablesSnapshot).map(([k, v]) => (
                    <div key={k} className="p-2 rounded-lg bg-white/[0.02] border border-white/5 flex justify-between">
                      <span className="text-slate-400">{k}:</span>
                      <span className="text-white font-bold">{v.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Incentives Formula Step */}
              <div className="p-4 rounded-2xl bg-teal-500/5 border border-teal-500/20 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-teal-300">1. احتساب الحافز الأساسي (Incentives):</span>
                  <span className="text-xs font-mono font-black text-teal-400">
                    {selectedLoForTrace.incentives.toLocaleString()} د.ع
                  </span>
                </div>
                {selectedLoForTrace.breakdown.incentivesSteps?.map((st, i) => (
                  <div key={i} className="text-xs font-mono bg-black/40 p-2.5 rounded-xl border border-white/5 text-slate-300">
                    {st.evaluatedExpression}
                  </div>
                ))}
              </div>

              {/* Transportation Step */}
              <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-blue-300">2. مخصصات بدل الانتقال (Transportation):</span>
                  <span className="text-xs font-mono font-black text-blue-400">
                    {selectedLoForTrace.transportation.toLocaleString()} د.ع
                  </span>
                </div>
                {selectedLoForTrace.breakdown.transportationSteps?.map((st, i) => (
                  <div key={i} className="text-xs font-mono bg-black/40 p-2.5 rounded-xl border border-white/5 text-slate-300">
                    {st.evaluatedExpression}
                  </div>
                ))}
              </div>

              {/* Bonus Step */}
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-300">3. مكافأة التميز والأداء (Bonus):</span>
                  <span className="text-xs font-mono font-black text-amber-400">
                    {selectedLoForTrace.bonus.toLocaleString()} د.ع
                  </span>
                </div>
                {selectedLoForTrace.breakdown.bonusSteps?.map((st, i) => (
                  <div key={i} className="text-xs font-mono bg-black/40 p-2.5 rounded-xl border border-white/5 text-slate-300">
                    {st.evaluatedExpression}
                  </div>
                ))}
              </div>

              {/* Total Calculation */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex justify-between items-center">
                <span className="text-sm font-black text-white">إجمالي المستحق النهائي:</span>
                <span className="text-lg font-black text-emerald-400 font-mono">
                  {selectedLoForTrace.totalEntitlements.toLocaleString()} د.ع
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLoForTrace(null)}
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
