import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import {
  Shield,
  Plus,
  Edit,
  History,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Sliders,
  Sparkles,
} from 'lucide-react';

export const SocialSecurityView: React.FC = () => {
  const {
    lang,
    t,
    theme,
    rules,
    parameters,
    snapshots,
    activePeriod,
    refreshData,
    showNotification,
    setEditingRule,
    setIsRuleModalOpen,
  } = useApp();
  const isDark = theme === 'dark';

  const [activeSubTab, setActiveSubTab] = useState<'rules' | 'parameters' | 'reports'>('rules');
  const [exemptEmployees, setExemptEmployees] = useState<any[]>([]);

  React.useEffect(() => {
    fetch('http://localhost:5000/api/tax-module/dashboard')
      .then((r) => r.json())
      .then((d) => {
        if (d?.exempt_employees) setExemptEmployees(d.exempt_employees);
      })
      .catch(() => {});
  }, [activePeriod]);

  const ssRules = rules.filter((r) => r.category === 'SOCIAL_SECURITY');
  const ssParams = parameters.filter((p) => p.code.startsWith('SS_'));

  const currency = t('currency');

  // Filter snapshots for social security report
  const ssSnapshots = snapshots.filter((s) => s.status === 'FINALIZED');

  const handleUpdateParameter = async (param: any, newValue: number) => {
    try {
      const res = await fetch(`/api/tax-module/parameters/${param.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: newValue }),
      });
      if (res.ok) {
        showNotification(
          lang === 'ar'
            ? `تم تحديث المعامل ${param.name_ar} بنجاح`
            : `Parameter ${param.name_en} updated successfully`
        );
        refreshData();
      }
    } catch (err) {
      showNotification('Update failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            {t('social_security')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {lang === 'ar'
              ? 'إدارة قواعد الضمان، وعاء الاشتراك، نسب استقطاع الموظف ومساهمة جهة العمل، والتقارير القانونية'
              : 'Manage social security contribution base rules, employee & employer rates, and legal compliance reports'}
          </p>
        </div>

        {/* Sub-tab Switcher */}
        <div className={`flex items-center gap-1 p-1 rounded-xl border ${
          isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            onClick={() => setActiveSubTab('rules')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'rules'
                ? isDark ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
            }`}
          >
            {lang === 'ar' ? 'قواعد الحساب' : 'Calculation Rules'}
          </button>
          <button
            onClick={() => setActiveSubTab('parameters')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'parameters'
                ? isDark ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
            }`}
          >
            {lang === 'ar' ? 'النسب والحدود (Parameters)' : 'Rates & Caps'}
          </button>
          <button
            onClick={() => setActiveSubTab('reports')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'reports'
                ? isDark ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
            }`}
          >
            {lang === 'ar' ? 'التقارير وسجل الاشتراكات' : 'Reports & Schedule'}
          </button>
        </div>
      </div>

      {/* 1. Sub-Tab: Rules */}
      {activeSubTab === 'rules' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ssRules.map((rule) => {
              const activeVer = rule.versions.find((v) => v.status === 'ACTIVE') || rule.versions[0];
              return (
                <div
                  key={rule.id}
                  className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-emerald-500/50 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono">
                        {rule.code}
                      </span>
                      <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                        <History className="w-3.5 h-3.5" />
                        {activeVer?.version_code || 'v1.0'}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 dark:text-white text-sm mt-3">
                      {lang === 'ar' ? rule.name_ar : rule.name_en}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {lang === 'ar' ? rule.description_ar : rule.description_en}
                    </p>

                    <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50">
                      <div className="text-[11px] font-semibold text-slate-400 mb-1">
                        {lang === 'ar' ? 'المعادلة / الاستعلام النشط:' : 'Active Formula / Query:'}
                      </div>
                      <code className="text-xs font-mono text-emerald-600 dark:text-emerald-400 block break-words">
                        {activeVer?.formula_or_query || 'N/A'}
                      </code>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {activeVer?.effective_from}
                    </span>
                    <button
                      onClick={() => {
                        setEditingRule(rule);
                        setIsRuleModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'تعديل / إصدار جديد' : 'Edit / New Version'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Sub-Tab: Parameters & Rates */}
      {activeSubTab === 'parameters' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-5">
          <div className="mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              {lang === 'ar' ? 'معاملات الضمان الاجتماعي (Dynamic Parameters)' : 'Social Security Dynamic Parameters'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'ar'
                ? 'يمكنك تعديل أي نسبة أو حد أدنى أو أعلى مباشرة دون تعديل الكود البرمجي؛ وتطبق فوراً على الحسابات القادمة.'
                : 'Modify rates, minimum and maximum salary thresholds directly; future payroll runs immediately reflect new values.'}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5 text-start">{lang === 'ar' ? 'الرمز والمعامل' : 'Parameter Code'}</th>
                  <th className="p-3.5 text-start">{lang === 'ar' ? 'الوصف والتطبيق القانوني' : 'Description'}</th>
                  <th className="p-3.5 text-start">{lang === 'ar' ? 'القيمة الحالية' : 'Current Value'}</th>
                  <th className="p-3.5 text-start">{lang === 'ar' ? 'تاريخ السريان' : 'Effective From'}</th>
                  <th className="p-3.5 text-center">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {ssParams.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3.5">
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{p.code}</span>
                      <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                        {lang === 'ar' ? p.name_ar : p.name_en}
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400 max-w-xs">
                      {lang === 'ar' ? p.description_ar : p.description_en}
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          defaultValue={p.value}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val !== p.value) {
                              handleUpdateParameter(p, val);
                            }
                          }}
                          className="w-28 px-2 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                        />
                        <span className="text-xs font-bold text-slate-400">{p.unit}</span>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-slate-500">{p.effective_from}</td>
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Sub-Tab: Reports */}
      {activeSubTab === 'reports' && (
        <div className="space-y-6">
          {/* Exempt Employees Schedule */}
          {exemptEmployees.length > 0 && (
            <div className="bg-amber-500/5 dark:bg-amber-950/20 p-5 rounded-2xl border border-amber-500/20 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    {lang === 'ar' ? 'تقرير الموظفين غير الخاضعين للضمان والضريبة (المعفيين)' : 'Exempt Employees Schedule'} ({exemptEmployees.length})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {lang === 'ar'
                      ? 'قائمة الموظفين غير الخاضعين للاستقطاع القانوني مع بيان سبب عدم الخضوع المعتمد'
                      : 'List of employees exempted from statutory deductions with documented exemption reasons'}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-amber-500/10 text-amber-900 dark:text-amber-200 font-semibold border-b border-amber-500/20">
                    <tr>
                      <th className="p-3 text-start">{lang === 'ar' ? 'اسم الموظف' : 'Employee Name'}</th>
                      <th className="p-3 text-start">{lang === 'ar' ? 'القسم' : 'Department'}</th>
                      <th className="p-3 text-end">{lang === 'ar' ? 'الراتب الاسمي' : 'Basic Salary'}</th>
                      <th className="p-3 text-start">{lang === 'ar' ? 'سبب عدم الخضوع للضمان/الضريبة' : 'Exemption Reason'}</th>
                      <th className="p-3 text-center">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-500/10">
                    {exemptEmployees.map((e: any) => (
                      <tr key={e.id} className="hover:bg-amber-500/10">
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{e.name}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{e.department || '-'}</td>
                        <td className="p-3 text-end font-mono text-slate-700 dark:text-slate-300">
                          {(e.basic_salary || 0).toLocaleString()} {currency}
                        </td>
                        <td className="p-3 text-amber-600 dark:text-amber-300 font-medium">
                          {e.exemption_reason || (lang === 'ar' ? 'غير محدد' : 'Not specified')}
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            {lang === 'ar' ? 'معفى من الضمان' : 'Exempt'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Regular SS Contribution Schedule */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  {t('social_security_report')} ({activePeriod})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {lang === 'ar'
                    ? 'جدول مفصل باشتراكات الموظفين ومساهمات جهة العمل المحسوبة للفترة المحددة'
                    : 'Itemized schedule of employee and employer contributions calculated for the period'}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5 text-start">{lang === 'ar' ? 'الموظف والرقم' : 'Employee & No.'}</th>
                    <th className="p-3.5 text-start">{lang === 'ar' ? 'القسم والفرع' : 'Department'}</th>
                    <th className="p-3.5 text-end">{lang === 'ar' ? 'الراتب الأساسي' : 'Basic Salary'}</th>
                    <th className="p-3.5 text-end">{lang === 'ar' ? 'وعاء الاشتراك' : 'Contribution Base'}</th>
                    <th className="p-3.5 text-end">{lang === 'ar' ? 'استقطاع الموظف' : 'Emp Contribution'}</th>
                    <th className="p-3.5 text-end">{lang === 'ar' ? 'مساهمة جهة العمل' : 'Empr Contribution'}</th>
                    <th className="p-3.5 text-end">{lang === 'ar' ? 'إجمالي الاشتراك' : 'Total Contribution'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {ssSnapshots.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {lang === 'ar' ? s.employee_name_ar : s.employee_name_en}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400">{s.employee_number}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="text-slate-700 dark:text-slate-300 font-medium">{s.department_name}</div>
                        <div className="text-[11px] text-slate-400">{s.branch_name}</div>
                      </td>
                      <td className="p-3.5 text-end font-semibold text-slate-900 dark:text-white">
                        {(s.input_values?.basic_salary ?? 0).toLocaleString()} {currency}
                      </td>
                      <td className="p-3.5 text-end font-semibold text-slate-700 dark:text-slate-300">
                        {(s.calculation_result?.social_security_base ?? 0).toLocaleString()} {currency}
                      </td>
                      <td className="p-3.5 text-end font-bold text-emerald-600 dark:text-emerald-400">
                        {(s.calculation_result?.employee_social_security ?? 0).toLocaleString()} {currency}
                      </td>
                      <td className="p-3.5 text-end font-bold text-purple-600 dark:text-purple-400">
                        {(s.calculation_result?.employer_social_security ?? 0).toLocaleString()} {currency}
                      </td>
                      <td className="p-3.5 text-end font-bold text-teal-600 dark:text-teal-400">
                        {(s.calculation_result?.total_social_security ?? 0).toLocaleString()} {currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
