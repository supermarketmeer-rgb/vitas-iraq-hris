import React, { useState } from 'react';
import { StorageService } from '../services/storage';
import { ExcelService } from '../services/excelService';
import {
  FileText,
  Download,
  Printer,
  Search,
  Filter,
  Building2,
  Calendar,
  Layers,
  CheckCircle,
  Send
} from 'lucide-react';

interface ReportsViewProps {
  defaultPeriod?: string;
  isDark?: boolean;
  vitasEmployees?: any[];
}

export const IncentivesReportsView: React.FC<ReportsViewProps> = ({
  defaultPeriod = '2026-10',
  isDark = false,
  vitasEmployees = [],
}) => {
  const [period, setPeriod] = useState<string>(defaultPeriod);
  const [officeFilter, setOfficeFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'lo' | 'supervisors'>('all');
  const [search, setSearch] = useState('');
  const [pushStatusMessage, setPushStatusMessage] = useState<string | null>(null);

  const loList = StorageService.getLOEntitlements(period);
  const supList = StorageService.getSupervisorEntitlements(period);
  const summary = StorageService.getPeriodSummary(period);
  const employees = StorageService.getEmployees();
  const offices = Array.from(new Set(employees.map((e) => e.office)));
  const settings = StorageService.getSettings();

  // Filter LO records
  const filteredLOs = loList.filter((r) => {
    const matchesSearch =
      r.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      r.employeeId.toLowerCase().includes(search.toLowerCase());
    const matchesOffice = officeFilter === 'all' || r.office === officeFilter;
    return matchesSearch && matchesOffice;
  });

  // Filter Supervisor records
  const filteredSups = supList.filter((s) => {
    const matchesSearch =
      s.supervisorName.toLowerCase().includes(search.toLowerCase()) ||
      s.supervisorId.toLowerCase().includes(search.toLowerCase());
    const matchesOffice = officeFilter === 'all' || s.office === officeFilter;
    return matchesSearch && matchesOffice;
  });

  // Export to Excel
  const handleExportExcel = () => {
    ExcelService.exportEntitlementsToExcel(period, loList, supList, summary, settings.currency);
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  // Push to Payroll
  const handlePushToPayroll = () => {
    const res = StorageService.pushToMonthlyPayroll(period, vitasEmployees);
    setPushStatusMessage(res.message);
    setTimeout(() => setPushStatusMessage(null), 4000);
  };

  const totalLOIncentives = filteredLOs.reduce((s, r) => s + r.incentives, 0);
  const totalLOTrans = filteredLOs.reduce((s, r) => s + r.transportation, 0);
  const totalLOBonus = filteredLOs.reduce((s, r) => s + r.bonus, 0);
  const totalLOTotal = filteredLOs.reduce((s, r) => s + r.totalEntitlements, 0);

  const totalSupIncentives = filteredSups.reduce((s, r) => s + r.incentives, 0);
  const totalSupTrans = filteredSups.reduce((s, r) => s + r.transportation, 0);
  const totalSupBonus = filteredSups.reduce((s, r) => s + r.bonus, 0);
  const totalSupTotal = filteredSups.reduce((s, r) => s + r.totalEntitlements, 0);

  const grandFilteredTotal =
    (typeFilter === 'supervisors' ? 0 : totalLOTotal) +
    (typeFilter === 'lo' ? 0 : totalSupTotal);

  return (
    <div className="space-y-6">
      {/* Top Banner (Hidden in Print) */}
      <div className={`p-6 rounded-3xl border transition-all ${
        isDark ? 'bg-[#0a0c10] border-white/10 text-white shadow-xl' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      } flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-teal-400 text-lg">assessment</span>
            <span className="text-xs font-mono text-teal-400 uppercase tracking-wider font-bold">
              FINANCIAL REPORTS & ENTITLEMENTS DISBURSEMENT
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            التقارير المالية ومسير المستحقات المعتمدة
          </h2>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            كشوف تفصيلية وتجميعية لمستحقات مسؤولي القروض ومشرفيهم حسب الفروع، قابلة للتصدير والطباعة والترحيل
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handlePushToPayroll}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all cursor-pointer"
            title="ترحيل الحوافز مباشرة إلى مسير الرواتب الرئيسي"
          >
            <Send className="w-4 h-4" />
            <span>ترحيل لمسير الرواتب الرئيسي</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تصدير Excel (.xlsx)</span>
          </button>
          <button
            onClick={handlePrint}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              isDark ? 'bg-white/10 hover:bg-white/15 text-slate-200 border-white/10' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span>طباعة التقرير / PDF</span>
          </button>
        </div>
      </div>

      {/* Push Feedback Alert */}
      {pushStatusMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2.5 animate-in fade-in duration-200 print:hidden">
          <CheckCircle className="w-4 h-4" />
          <span>{pushStatusMessage}</span>
        </div>
      )}

      {/* Filter and Period Selection Bar (Hidden in Print) */}
      <div className={`p-4 rounded-2xl border ${
        isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200 shadow-sm'
      } flex flex-col md:flex-row gap-3 items-center justify-between text-xs print:hidden`}>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Period Selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold">فترة التقرير:</span>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className={`px-3 py-1.5 rounded-xl border focus:outline-none focus:border-teal-500 font-mono font-bold ${
                isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>

          {/* Office Filter */}
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <select
              value={officeFilter}
              onChange={(e) => setOfficeFilter(e.target.value)}
              className={`rounded-xl border px-3 py-1.5 focus:outline-none focus:border-teal-500 font-medium ${
                isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              <option value="all">كافة الفروع والمواقع</option>
              {offices.map((off) => (
                <option key={off} value={off}>
                  {off}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className={`rounded-xl border px-3 py-1.5 focus:outline-none focus:border-teal-500 font-medium ${
                isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              <option value="all">كافة الكادر (المسؤولين والمشرفين)</option>
              <option value="lo">مسؤولو القروض فقط</option>
              <option value="supervisors">المشرفون فقط</option>
            </select>
          </div>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="بحث بالاسم أو الرقم الوظيفي..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pr-9 pl-3 py-1.5 rounded-xl border focus:outline-none focus:border-teal-500 ${
              isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          />
        </div>
      </div>

      {/* Aggregate Report Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0a0c10] border-teal-500/30' : 'bg-teal-50 border-teal-200'}`}>
          <span className="text-slate-400 block font-medium">مجموع الحوافز للتقرير</span>
          <p className="text-lg font-black text-teal-400 font-mono mt-0.5">
            {(
              (typeFilter === 'supervisors' ? 0 : totalLOIncentives) +
              (typeFilter === 'lo' ? 0 : totalSupIncentives)
            ).toLocaleString()} {settings.currency}
          </p>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0a0c10] border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
          <span className="text-slate-400 block font-medium">مجموع بدل الانتقال</span>
          <p className="text-lg font-black text-blue-400 font-mono mt-0.5">
            {(
              (typeFilter === 'supervisors' ? 0 : totalLOTrans) +
              (typeFilter === 'lo' ? 0 : totalSupTrans)
            ).toLocaleString()} {settings.currency}
          </p>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0a0c10] border-purple-500/30' : 'bg-purple-50 border-purple-200'}`}>
          <span className="text-slate-400 block font-medium">مجموع المكافآت</span>
          <p className="text-lg font-black text-purple-400 font-mono mt-0.5">
            {(
              (typeFilter === 'supervisors' ? 0 : totalLOBonus) +
              (typeFilter === 'lo' ? 0 : totalSupBonus)
            ).toLocaleString()} {settings.currency}
          </p>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0a0c10] border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'}`}>
          <span className="text-slate-400 block font-medium">صافي مستحقات التقرير</span>
          <p className="text-lg font-black text-emerald-400 font-mono mt-0.5">
            {grandFilteredTotal.toLocaleString()} {settings.currency}
          </p>
        </div>
      </div>

      {/* Loan Officers Table Section */}
      {typeFilter !== 'supervisors' && (
        <div className={`rounded-3xl border overflow-hidden ${
          isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'} flex items-center justify-between text-xs`}>
            <span className="font-bold">كشف مستحقات مسؤولي القروض ({filteredLOs.length} مسؤول)</span>
            <span className="text-teal-400 font-mono font-bold">
              إجمالي: {totalLOTotal.toLocaleString()} {settings.currency}
            </span>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-right border-collapse">
              <thead className={`${isDark ? 'bg-[#06080d] text-slate-300' : 'bg-slate-50 text-slate-700'} border-b font-bold`}>
                <tr>
                  <th className="p-3">الرقم المؤسسي</th>
                  <th className="p-3">اسم مسؤول القروض</th>
                  <th className="p-3">الفرع</th>
                  <th className="p-3">المشرف المسؤول</th>
                  <th className="p-3 text-center">الحوافز</th>
                  <th className="p-3 text-center">بدل الانتقال</th>
                  <th className="p-3 text-center">المكافأة</th>
                  <th className="p-3 text-center">الإجمالي المستحق</th>
                  <th className="p-3 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-200'}`}>
                {filteredLOs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-500">
                      لا توجد بيانات مطابقة لخيارات التصفية
                    </td>
                  </tr>
                ) : (
                  filteredLOs.map((lo) => (
                    <tr key={lo.id} className={`${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                      <td className="p-3 font-mono font-bold text-teal-400">{lo.employeeId}</td>
                      <td className="p-3 font-bold">{lo.employeeName}</td>
                      <td className="p-3 text-slate-400">{lo.office}</td>
                      <td className="p-3 text-slate-400">{lo.supervisorName || '—'}</td>
                      <td className="p-3 text-center font-mono font-bold text-teal-400">
                        {lo.incentives.toLocaleString()} {settings.currency}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-blue-400">
                        {lo.transportation.toLocaleString()} {settings.currency}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-purple-400">
                        {lo.bonus.toLocaleString()} {settings.currency}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-emerald-400 text-sm">
                        {lo.totalEntitlements.toLocaleString()} {settings.currency}
                      </td>
                      <td className="p-3 text-center font-mono text-[11px]">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                          {lo.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Supervisors Table Section */}
      {typeFilter !== 'lo' && (
        <div className={`rounded-3xl border overflow-hidden ${
          isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'} flex items-center justify-between text-xs`}>
            <span className="font-bold">كشف مستحقات مشرفي مسؤولي القروض ({filteredSups.length} مشرف)</span>
            <span className="text-teal-400 font-mono font-bold">
              إجمالي: {totalSupTotal.toLocaleString()} {settings.currency}
            </span>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-right border-collapse">
              <thead className={`${isDark ? 'bg-[#06080d] text-slate-300' : 'bg-slate-50 text-slate-700'} border-b font-bold`}>
                <tr>
                  <th className="p-3">الرقم المؤسسي</th>
                  <th className="p-3">اسم المشرف</th>
                  <th className="p-3">الفرع</th>
                  <th className="p-3 text-center">أعضاء الفريق</th>
                  <th className="p-3 text-center">إجمالي صرف الفريق</th>
                  <th className="p-3 text-center">سداد الفريق %</th>
                  <th className="p-3 text-center">حافز الإشراف</th>
                  <th className="p-3 text-center">بدل الانتقال</th>
                  <th className="p-3 text-center">المستحق النهائي</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-200'}`}>
                {filteredSups.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-500">
                      لا توجد بيانات مشرفين للفترة المحددة
                    </td>
                  </tr>
                ) : (
                  filteredSups.map((sup) => (
                    <tr key={sup.id} className={`${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                      <td className="p-3 font-mono font-bold text-teal-400">{sup.supervisorId}</td>
                      <td className="p-3 font-bold">{sup.supervisorName}</td>
                      <td className="p-3 text-slate-400">{sup.office}</td>
                      <td className="p-3 text-center font-mono font-bold">{sup.supervisedOfficersCount} مسؤول</td>
                      <td className="p-3 text-center font-mono font-bold text-blue-400">
                        {sup.totalDisbursedAmount.toLocaleString()} {settings.currency}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-amber-400">
                        {sup.averageRepaymentRate}%
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-teal-400">
                        {sup.incentives.toLocaleString()} {settings.currency}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-blue-400">
                        {sup.transportation.toLocaleString()} {settings.currency}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-emerald-400 text-sm">
                        {sup.totalEntitlements.toLocaleString()} {settings.currency}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
