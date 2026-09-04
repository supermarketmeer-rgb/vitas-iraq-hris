import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext.js';
import {
  Percent,
  Plus,
  Trash2,
  Edit,
  Sliders,
  FileSpreadsheet,
  AlertCircle,
  Calendar,
  Layers,
  ChevronRight,
  Download,
  Upload,
  CheckCircle2,
} from 'lucide-react';
import { TaxBracket } from '../types.js';
import {
  generateIncomeTaxTemplateExcel,
  parseIncomeTaxExcel,
} from '../../utils/payrollExcelHelper';

export const IncomeTaxView: React.FC = () => {
  const {
    lang,
    t,
    theme,
    taxBrackets,
    rules,
    parameters,
    snapshots,
    employees,
    activePeriod,
    refreshData,
    showNotification,
    setEditingRule,
    setIsRuleModalOpen,
  } = useApp();
  const isDark = theme === 'dark';

  const [activeSubTab, setActiveSubTab] = useState<'brackets' | 'rules' | 'reports'>('brackets');
  const [isAddingBracket, setIsAddingBracket] = useState(false);

  // Excel Template & Import States
  const [isExportingTemplate, setIsExportingTemplate] = useState<boolean>(false);
  const [isImportingExcel, setIsImportingExcel] = useState<boolean>(false);
  const [taxImportModalData, setTaxImportModalData] = useState<any | null>(null);
  const taxFileInputRef = useRef<HTMLInputElement | null>(null);

  // Export Income Tax Template
  const handleExportTemplate = async () => {
    setIsExportingTemplate(true);
    try {
      const res = await generateIncomeTaxTemplateExcel(employees || [], activePeriod);
      if (res.success) {
        showNotification(
          lang === 'ar'
            ? 'تم إنشاء وتنزيل قالب إكسل لضريبة الدخل بنجاح!'
            : 'Income Tax Excel template saved successfully!'
        );
      }
    } catch (err: any) {
      showNotification(err?.message || 'Failed to export Tax template', 'error');
    } finally {
      setIsExportingTemplate(false);
    }
  };

  // Trigger File Import
  const handleTriggerImport = () => {
    if (taxFileInputRef.current) {
      taxFileInputRef.current.value = '';
      taxFileInputRef.current.click();
    }
  };

  // Handle Selected File
  const handleSelectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImportingExcel(true);
    try {
      const parseResult = await parseIncomeTaxExcel(file, employees || []);
      if (!parseResult.success) {
        showNotification(parseResult.error || 'Failed to parse Tax excel file', 'error');
        return;
      }
      setTaxImportModalData(parseResult);
    } catch (err: any) {
      showNotification(err?.message || 'Error parsing Tax excel', 'error');
    } finally {
      setIsImportingExcel(false);
      if (taxFileInputRef.current) taxFileInputRef.current.value = '';
    }
  };

  // Confirm Import
  const handleConfirmImport = () => {
    if (!taxImportModalData?.parsedData) return;
    const count = taxImportModalData.matchedCount;
    const exemptCount = taxImportModalData.exemptCount;
    setTaxImportModalData(null);
    showNotification(
      lang === 'ar'
        ? `تم استيراد واعتماد بيانات ضريبة الدخل لـ ${count} موظفاً (منهم ${exemptCount} معفيين)!`
        : `Successfully imported Tax data for ${count} staff (${exemptCount} exempt)!`
    );
  };
  const [newBracket, setNewBracket] = useState<Partial<TaxBracket>>({
    bracket_order: taxBrackets.length + 1,
    name_ar: `الشريحة ${taxBrackets.length + 1}`,
    name_en: `Bracket ${taxBrackets.length + 1}`,
    min_income: 0,
    max_income: 500000,
    tax_rate: 5.0,
    fixed_tax: 0,
    effective_from: '2026-01-01',
    status: 'ACTIVE',
  });

  const currency = t('currency');
  const taxRules = rules.filter((r) => r.category === 'INCOME_TAX' || r.category === 'EXEMPTION');
  const taxSnapshots = snapshots.filter((s) => s.status === 'FINALIZED');

  const handleSaveBracket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/tax-module/tax-brackets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBracket),
      });
      if (res.ok) {
        showNotification(lang === 'ar' ? 'تمت إضافة الشريحة الضريبية بنجاح' : 'Tax bracket created successfully');
        setIsAddingBracket(false);
        refreshData();
      }
    } catch (err) {
      showNotification('Failed to create bracket', 'error');
    }
  };

  const handleDeleteBracket = async (id: string) => {
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذه الشريحة؟' : 'Delete this tax bracket?')) return;
    try {
      const res = await fetch(`/api/tax-module/tax-brackets/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showNotification(lang === 'ar' ? 'تم حذف الشريحة' : 'Bracket deleted');
        refreshData();
      }
    } catch (err) {
      showNotification('Delete failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Percent className="w-5 h-5 text-amber-500" />
            {t('income_tax')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {lang === 'ar'
              ? 'إدارة شرائح ضريبة الدخل التصاعدية، الإعفاءات القانونية، وقواعد احتساب الدخل الخاضع للضريبة'
              : 'Manage progressive tax brackets, statutory personal & family relief, and taxable income rules'}
          </p>
        </div>

        {/* Header Action Buttons & Sub-tab navigation */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={taxFileInputRef}
            onChange={handleSelectFile}
            accept=".xlsx, .xls"
            className="hidden"
          />

          {/* Export Tax Template */}
          <button
            onClick={handleExportTemplate}
            disabled={isExportingTemplate}
            title={lang === 'ar' ? 'انشاء وتنزيل قالب إكسل لضريبة الدخل مع نافذة لحفظ الملف' : 'Download Income Tax Excel Template'}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExportingTemplate ? (lang === 'ar' ? 'جارِ التصدير...' : 'Exporting...') : (lang === 'ar' ? 'قالب الضريبة (Template)' : 'Tax Template')}</span>
          </button>

          {/* Import Tax Excel */}
          <button
            onClick={handleTriggerImport}
            disabled={isImportingExcel}
            title={lang === 'ar' ? 'استيراد إعفاءات واستقطاعات ضريبة الدخل من ملف إكسل' : 'Import Income Tax from Excel'}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isImportingExcel ? (lang === 'ar' ? 'جارِ القراءة...' : 'Reading...') : (lang === 'ar' ? 'استيراد إكسل الضريبة' : 'Import Tax')}</span>
          </button>

          {/* Sub-tab navigation */}
          <div className={`flex items-center gap-1 p-1 rounded-xl border ${
            isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setActiveSubTab('brackets')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === 'brackets'
                  ? isDark ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              {t('tax_brackets_title')}
            </button>
            <button
              onClick={() => setActiveSubTab('rules')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === 'rules'
                  ? isDark ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              {lang === 'ar' ? 'قواعد ومعادلات الضريبة' : 'Tax & Exemption Rules'}
            </button>
            <button
              onClick={() => setActiveSubTab('reports')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === 'reports'
                  ? isDark ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              {t('income_tax_report')}
            </button>
          </div>
        </div>
      </div>

      {/* 1. Sub-Tab: Tax Brackets Table */}
      {activeSubTab === 'brackets' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-500" />
                  {t('tax_brackets_title')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {lang === 'ar'
                    ? 'جدول الشرائح التصاعدية المعتمد في احتساب ضريبة الرواتب مع نسب وسقوف كل شريحة'
                    : 'Progressive tax tiers applied successively to determine monthly tax liability'}
                </p>
              </div>

              <button
                onClick={() => setIsAddingBracket(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-all shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{t('add_bracket')}</span>
              </button>
            </div>

            {/* Brackets Grid Visualization */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {taxBrackets.map((b, idx) => (
                <div
                  key={b.id}
                  className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 relative"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-300">
                    <span>
                      {lang === 'ar' ? `الشريحة ${b.bracket_order}` : `Tier ${b.bracket_order}`}
                    </span>
                    <span className="text-sm px-2 py-0.5 rounded-md bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-100 font-mono">
                      {b.tax_rate}%
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-slate-900 dark:text-white mt-2">
                    {lang === 'ar' ? b.name_ar : b.name_en}
                  </div>

                  <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                    {b.min_income.toLocaleString()} {currency} &rarr;{' '}
                    {b.max_income !== null ? `${b.max_income.toLocaleString()} ${currency}` : t('unlimited')}
                  </div>

                  <div className="mt-3 pt-2 border-t border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{b.effective_from}</span>
                    <button
                      onClick={() => handleDeleteBracket(b.id)}
                      className="text-red-500 hover:text-red-700"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Bracket Form */}
            {isAddingBracket && (
              <form
                onSubmit={handleSaveBracket}
                className="mb-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3"
              >
                <div className="font-bold text-xs text-slate-900 dark:text-white">
                  {lang === 'ar' ? 'إضافة شريحة ضريبية جديدة' : 'Add New Progressive Bracket'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      {t('bracket_order')}
                    </label>
                    <input
                      type="number"
                      value={newBracket.bracket_order}
                      onChange={(e) => setNewBracket({ ...newBracket, bracket_order: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      {t('min_income')}
                    </label>
                    <input
                      type="number"
                      value={newBracket.min_income}
                      onChange={(e) => setNewBracket({ ...newBracket, min_income: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      {t('max_income')} ({t('unlimited')})
                    </label>
                    <input
                      type="number"
                      placeholder="Empty = Unlimited"
                      value={newBracket.max_income ?? ''}
                      onChange={(e) =>
                        setNewBracket({
                          ...newBracket,
                          max_income: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      {t('tax_rate_percent')}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={newBracket.tax_rate}
                      onChange={(e) => setNewBracket({ ...newBracket, tax_rate: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingBracket(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    {lang === 'ar' ? 'حفظ الشريحة' : 'Save Bracket'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 2. Sub-Tab: Tax Rules */}
      {activeSubTab === 'rules' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {taxRules.map((rule) => {
            const activeVer = rule.versions.find((v) => v.status === 'ACTIVE') || rule.versions[0];
            return (
              <div
                key={rule.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-amber-500/50 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-mono">
                      {rule.code}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
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
                      {lang === 'ar' ? 'معادلة الاحتساب:' : 'Formula:'}
                    </div>
                    <code className="text-xs font-mono text-amber-600 dark:text-amber-400 block break-words">
                      {activeVer?.formula_or_query || 'N/A'}
                    </code>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">{activeVer?.effective_from}</span>
                  <button
                    onClick={() => {
                      setEditingRule(rule);
                      setIsRuleModalOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 hover:text-amber-600 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'تعديل / إصدار جديد' : 'Edit / Version'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Sub-Tab: Income Tax Report */}
      {activeSubTab === 'reports' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-amber-500" />
              {t('income_tax_report')} ({activePeriod})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'ar'
                ? 'كشف تفصيلي بالدخل الخاضع للضريبة والإعفاءات الممنوحة وضريبة الدخل المحسوبة'
                : 'Detailed schedule of gross earnings, statutory relief, taxable base, and calculated income tax'}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5 text-start">{lang === 'ar' ? 'الموظف والرقم' : 'Employee & No.'}</th>
                  <th className="p-3.5 text-start">{lang === 'ar' ? 'القسم' : 'Department'}</th>
                  <th className="p-3.5 text-end">{lang === 'ar' ? 'الراتب الإجمالي' : 'Gross Earnings'}</th>
                  <th className="p-3.5 text-end">{lang === 'ar' ? 'الإعفاءات الضريبية' : 'Exemptions'}</th>
                  <th className="p-3.5 text-end">{lang === 'ar' ? 'الدخل الخاضع للضريبة' : 'Taxable Income'}</th>
                  <th className="p-3.5 text-end">{lang === 'ar' ? 'ضريبة الدخل المستحقة' : 'Income Tax'}</th>
                  <th className="p-3.5 text-end">{lang === 'ar' ? 'صافي الراتب' : 'Net Salary'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {taxSnapshots.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {lang === 'ar' ? s.employee_name_ar : s.employee_name_en}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400">{s.employee_number}</div>
                    </td>
                    <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                      {s.department_name}
                    </td>
                    <td className="p-3.5 text-end font-semibold text-slate-900 dark:text-white">
                      {(s.calculation_result?.gross_salary ?? 0).toLocaleString()} {currency}
                    </td>
                    <td className="p-3.5 text-end font-semibold text-blue-600 dark:text-blue-400">
                      {(s.calculation_result?.tax_exemptions ?? 0).toLocaleString()} {currency}
                    </td>
                    <td className="p-3.5 text-end font-semibold text-slate-700 dark:text-slate-300">
                      {(s.calculation_result?.taxable_income ?? 0).toLocaleString()} {currency}
                    </td>
                    <td className="p-3.5 text-end font-bold text-amber-600 dark:text-amber-400">
                      {(s.calculation_result?.income_tax ?? 0).toLocaleString()} {currency}
                    </td>
                    <td className="p-3.5 text-end font-bold text-teal-600 dark:text-teal-400">
                      {(s.calculation_result?.net_salary ?? 0).toLocaleString()} {currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Income Tax Import Preview Modal */}
      {taxImportModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {lang === 'ar' ? 'معاينة استيراد بيانات ضريبة الدخل' : 'Preview Income Tax Excel Import'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {lang === 'ar'
                      ? `تمت مطابقة ${taxImportModalData.matchedCount} موظفاً (منهم ${taxImportModalData.exemptCount} معفيين)`
                      : `Matched ${taxImportModalData.matchedCount} staff (${taxImportModalData.exemptCount} exempt)`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTaxImportModalData(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                <span className="text-slate-500 block text-[11px]">{lang === 'ar' ? 'إجمالي الاستقطاع الضريبي المستورد' : 'Total Imported Tax Deductions'}</span>
                <p className="text-base font-bold text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                  {taxImportModalData.summary.totalTaxDeductions.toLocaleString()} {currency}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-xs text-start">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 sticky top-0 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-2.5 text-start">{lang === 'ar' ? 'الموظف' : 'Employee'}</th>
                        <th className="p-2.5 text-center">{lang === 'ar' ? 'حالة الإعفاء' : 'Exemption'}</th>
                        <th className="p-2.5 text-end">{lang === 'ar' ? 'الإعفاء المخصص' : 'Tax Relief'}</th>
                        <th className="p-2.5 text-end">{lang === 'ar' ? 'مبلغ الاستقطاع الضريبي' : 'Tax Deduction'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {Object.entries(taxImportModalData.parsedData).map(([empId, d]: [string, any]) => {
                        const emp = (employees || []).find((e) => String(e.id) === String(empId));
                        return (
                          <tr key={empId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="p-2.5">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {emp ? (lang === 'ar' ? (emp.name_ar || emp.name) : (emp.name_en || emp.name)) : empId}
                              </div>
                              <div className="font-mono text-[10px] text-slate-400">VTS-{emp?.badge_no || empId}</div>
                            </td>
                            <td className="p-2.5 text-center">
                              {d.isExempt ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                  {lang === 'ar' ? 'معفى' : 'Exempt'}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                  {lang === 'ar' ? 'خاضع' : 'Taxable'}
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-end font-mono font-bold text-blue-600 dark:text-blue-400">
                              {(d.customTaxRelief || 0).toLocaleString()}
                            </td>
                            <td className="p-2.5 text-end font-mono font-bold text-amber-600 dark:text-amber-400">
                              {(d.customTaxDeduction || 0).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50 dark:bg-slate-900/50">
              <button
                onClick={() => setTaxImportModalData(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{lang === 'ar' ? 'اعتماد وتطبيق بيانات الضريبة' : 'Apply Tax Data'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
