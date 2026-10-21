import React from 'react';
import { StorageService } from '../services/storage';
import {
  Banknote,
  Users,
  CheckCircle,
  FileSpreadsheet,
  ArrowRight,
  TrendingUp,
  Clock,
  Building2,
  Sparkles,
  Layers,
  ChevronRight
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: any) => void;
  period: string;
  isDark?: boolean;
}

export const IncentivesDashboardView: React.FC<DashboardViewProps> = ({ onNavigate, period, isDark = false }) => {
  const employees = StorageService.getEmployees();
  const loCount = employees.filter((e) => e.category === 'Loan Officer').length;
  const supCount = employees.filter((e) => e.category === 'Loan Officer Supervisor').length;

  const loEntitlements = StorageService.getLOEntitlements(period);
  const supEntitlements = StorageService.getSupervisorEntitlements(period);
  const summary = StorageService.getPeriodSummary(period);
  const importBatches = StorageService.getImportBatches();
  const currentBatch = importBatches.find((b) => b.period === period);
  const settings = StorageService.getSettings();

  const totalIncentives = summary?.totalIncentives || (
    loEntitlements.reduce((s, r) => s + r.incentives, 0) +
    supEntitlements.reduce((s, r) => s + r.incentives, 0)
  );

  const totalTransportation = summary?.totalTransportation || (
    loEntitlements.reduce((s, r) => s + r.transportation, 0) +
    supEntitlements.reduce((s, r) => s + r.transportation, 0)
  );

  const totalBonus = summary?.totalBonus || (
    loEntitlements.reduce((s, r) => s + r.bonus, 0) +
    supEntitlements.reduce((s, r) => s + r.bonus, 0)
  );

  const grandTotal = summary?.grandTotal || (totalIncentives + totalTransportation + totalBonus);
  const periodStatus = summary?.status || (loEntitlements.length > 0 ? 'Calculated' : 'Draft');

  const offices = Array.from(new Set(employees.map((e) => e.office)));

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'Draft':
        return <span className="text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-bold font-mono">مسودة (Draft)</span>;
      case 'Calculated':
        return <span className="text-blue-400 bg-blue-500/10 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-bold font-mono">تم الاحتساب (Calculated)</span>;
      case 'Under Review':
        return <span className="text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-bold font-mono">قيد المراجعة (Under Review)</span>;
      case 'Approved':
        return <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold font-mono">معتمد (Approved)</span>;
      case 'Locked':
        return <span className="text-purple-400 bg-purple-500/10 border border-purple-500/30 px-3 py-1 rounded-full text-xs font-bold font-mono">مقفل ونهائي (Locked)</span>;
      default:
        return <span>{st}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Status Banner */}
      <div className={`p-6 rounded-3xl border transition-all ${
        isDark ? 'bg-[#0a0c10] border-white/10 text-white shadow-xl' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      } flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-teal-400 text-lg">finance_mode</span>
            <span className="text-xs font-mono text-teal-400 uppercase tracking-wider font-bold">
              VITAS IRAQ INCENTIVES OVERVIEW
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            مستحقات وحوافز شهر {period}
          </h2>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            احتساب ديناميكي مستقل لحوافز مسؤولي القروض، مخصصات النقل الميداني، وبدل الإشراف وفق معادلات معتمدة
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>حالة دورة العمل الحالية:</div>
            <div className="mt-1">{getStatusBadge(periodStatus)}</div>
          </div>
          {periodStatus === 'Draft' ? (
            <button
              onClick={() => onNavigate('calculate')}
              className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-600/30 transition-all cursor-pointer flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">play_arrow</span>
              <span>بدء احتساب الفترة</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigate('reports')}
              className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-600/30 transition-all cursor-pointer flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">summarize</span>
              <span>عرض التقرير المعتمد</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        {/* Total Grand Entitlements */}
        <div className={`p-5 rounded-3xl border ${
          isDark ? 'bg-[#0a0c10] border-teal-500/30 text-white' : 'bg-teal-50/70 border-teal-200 text-slate-900 shadow-sm'
        } space-y-1 relative overflow-hidden group`}>
          <div className="flex items-center justify-between">
            <span className={`${isDark ? 'text-slate-400' : 'text-slate-600'} font-medium`}>إجمالي المستحقات المعتمدة</span>
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-teal-400 font-mono mt-1">
            {grandTotal.toLocaleString()} {settings.currency}
          </p>
          <div className="flex items-center gap-1.5 pt-1 text-[11px] text-teal-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>شامل الحوافز وبدل النقل والمكافأة</span>
          </div>
        </div>

        {/* Loan Officers Net Incentives */}
        <div className={`p-5 rounded-3xl border ${
          isDark ? 'bg-[#0a0c10] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        } space-y-1`}>
          <div className="flex items-center justify-between">
            <span className={`${isDark ? 'text-slate-400' : 'text-slate-600'} font-medium`}>حوافز مسؤولي القروض</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-400 font-mono mt-1">
            {totalIncentives.toLocaleString()} {settings.currency}
          </p>
          <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'} pt-1`}>
            مستحقة لـ {loCount} مسؤول قروض نشط
          </p>
        </div>

        {/* Transportation & Bonus */}
        <div className={`p-5 rounded-3xl border ${
          isDark ? 'bg-[#0a0c10] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        } space-y-1`}>
          <div className="flex items-center justify-between">
            <span className={`${isDark ? 'text-slate-400' : 'text-slate-600'} font-medium`}>بدل النقل والمكافآت</span>
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-purple-400 font-mono mt-1">
            {(totalTransportation + totalBonus).toLocaleString()} {settings.currency}
          </p>
          <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'} pt-1`}>
            نقل: {totalTransportation.toLocaleString()} · مكافآت: {totalBonus.toLocaleString()}
          </p>
        </div>

        {/* Active Covered Staff */}
        <div className={`p-5 rounded-3xl border ${
          isDark ? 'bg-[#0a0c10] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        } space-y-1`}>
          <div className="flex items-center justify-between">
            <span className={`${isDark ? 'text-slate-400' : 'text-slate-600'} font-medium`}>الكادر المشمول بالاحتساب</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400 font-mono mt-1">
            {employees.length} <span className="text-xs font-normal text-slate-400">موظف</span>
          </p>
          <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'} pt-1`}>
            {loCount} مسؤول قروض + {supCount} مشرفين
          </p>
        </div>
      </div>

      {/* Workflow Navigation Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Step 1: Import */}
        <div className={`p-6 rounded-3xl border ${
          isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        } flex flex-col justify-between space-y-4`}>
          <div>
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">1. استيراد متغيرات Excel</h3>
              {currentBatch ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                  مستورد
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                  مطلوب
                </span>
              )}
            </div>
            <p className={`text-xs mt-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {currentBatch
                ? `تم استيراد ${currentBatch.validRows} موظفاً من ملف: ${currentBatch.fileName}`
                : 'تحميل ملف المتغيرات الشهرية (أرقام الصرف والتحصيل والزيارات)'}
            </p>
          </div>
          <button
            onClick={() => onNavigate('import')}
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isDark ? 'bg-white/5 hover:bg-white/10 text-teal-400 border border-teal-500/20' : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200'
            }`}
          >
            <span>معالج استيراد الإكسل</span>
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>

        {/* Step 2: Calculate */}
        <div className={`p-6 rounded-3xl border ${
          isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        } flex flex-col justify-between space-y-4`}>
          <div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">2. منصة الاحتساب والتدقيق</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold">
                محرك AST
              </span>
            </div>
            <p className={`text-xs mt-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              تنفيذ محرك المعادلات التلقائي لمسؤولي القروض وتجميع مؤشرات المشرفين خطوة بخطوة مع سجل الأثر.
            </p>
          </div>
          <button
            onClick={() => onNavigate('calculate')}
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isDark ? 'bg-white/5 hover:bg-white/10 text-blue-400 border border-blue-500/20' : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200'
            }`}
          >
            <span>منصة الاحتساب والاعتماد</span>
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>

        {/* Step 3: Reports & Push to Payroll */}
        <div className={`p-6 rounded-3xl border ${
          isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        } flex flex-col justify-between space-y-4`}>
          <div>
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">3. التقارير والترحيل للمسير</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/20 text-purple-400 border border-purple-500/30 font-bold">
                XLSX / Print
              </span>
            </div>
            <p className={`text-xs mt-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              تصدير كشوف المستحقات المعتمدة بصيغة Excel، طباعة التقارير، وترحيل الحوافز مباشرة إلى مسير الرواتب الرئيسي.
            </p>
          </div>
          <button
            onClick={() => onNavigate('reports')}
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isDark ? 'bg-white/5 hover:bg-white/10 text-purple-400 border border-purple-500/20' : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200'
            }`}
          >
            <span>التقارير وترحيل الرواتب</span>
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>
      </div>

      {/* Offices Breakdown Table */}
      <div className={`rounded-3xl border overflow-hidden ${
        isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className={`p-5 border-b ${isDark ? 'border-white/10' : 'border-slate-200'} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white dark:text-white text-slate-900">
                توزيع المستحقات حسب الفروع ومواقع العمل
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>
                ملخص مسؤولي القروض ومجموع الحوافز وبدل النقل لكل فرع في العراق
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20">
            {offices.length} فروع ومواقع
          </span>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-right border-collapse">
            <thead className={`${isDark ? 'bg-[#06080d] text-slate-300 border-white/10' : 'bg-slate-50 text-slate-700 border-slate-200'} border-b font-bold`}>
              <tr>
                <th className="p-3.5">الفرع / الموقع</th>
                <th className="p-3.5 text-center">عدد مسؤولي القروض</th>
                <th className="p-3.5 text-center">المشرف المسؤول</th>
                <th className="p-3.5 text-center">مجموع الحوافز</th>
                <th className="p-3.5 text-center">مجموع بدل النقل</th>
                <th className="p-3.5 text-center">المجموع الكلي</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-200'}`}>
              {offices.map((office) => {
                const officeLOs = loEntitlements.filter((r) => r.office === office);
                const officeEmployees = employees.filter((e) => e.office === office && e.category === 'Loan Officer');
                const sup = employees.find((e) => e.office === office && e.category === 'Loan Officer Supervisor');
                const officeInc = officeLOs.reduce((s, r) => s + r.incentives, 0);
                const officeTrans = officeLOs.reduce((s, r) => s + r.transportation, 0);
                const officeTotal = officeLOs.reduce((s, r) => s + r.totalEntitlements, 0);

                return (
                  <tr key={office} className={`${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'} transition-colors`}>
                    <td className="p-3.5 font-bold flex items-center gap-2">
                      <span className="material-symbols-outlined text-teal-400 text-sm">location_on</span>
                      <span>{office}</span>
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold">
                      {officeEmployees.length} موظف
                    </td>
                    <td className="p-3.5 text-center">
                      {sup ? (
                        <span className="px-2 py-0.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 font-medium">
                          {sup.name}
                        </span>
                      ) : (
                        <span className="text-slate-500">غير محدد</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold text-teal-400">
                      {officeInc.toLocaleString()} {settings.currency}
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold text-blue-400">
                      {officeTrans.toLocaleString()} {settings.currency}
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold text-emerald-400">
                      {officeTotal.toLocaleString()} {settings.currency}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
