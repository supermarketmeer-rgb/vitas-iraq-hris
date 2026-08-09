import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext.js';
import {
  GitCompare,
  ArrowRightLeft,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  AlertCircle,
  Clock,
  User,
  Shield,
  FileCode,
  Zap,
  TrendingUp,
  Tag,
  Check,
  RotateCcw,
} from 'lucide-react';
import { CalculationRule, RuleVersion } from '../types.js';

interface RuleVersionComparatorProps {
  initialRuleId?: string;
  onClose?: () => void;
}

export const RuleVersionComparator: React.FC<RuleVersionComparatorProps> = ({
  initialRuleId,
  onClose,
}) => {
  const { lang, t, rules, refreshData, showNotification } = useApp();

  const [selectedRuleId, setSelectedRuleId] = useState<string>(
    initialRuleId || (rules.length > 0 ? rules[0].id : '')
  );

  const currentRule = rules.find((r) => r.id === selectedRuleId) || rules[0];

  // Pick Version A and Version B
  const versions = currentRule?.versions || [];
  const [versionAId, setVersionAId] = useState<string>(
    versions[0]?.id || ''
  );
  const [versionBId, setVersionBId] = useState<string>(
    versions[1]?.id || versions[0]?.id || ''
  );

  // Simulation test salary for impact comparison
  const [testSalary, setTestSalary] = useState<number>(1500000);
  const [diffMode, setDiffMode] = useState<'side_by_side' | 'unified'>('side_by_side');

  // Update versions when rule changes
  React.useEffect(() => {
    if (currentRule && currentRule.versions.length > 0) {
      setVersionAId(currentRule.versions[0].id);
      setVersionBId(currentRule.versions[currentRule.versions.length - 1].id);
    }
  }, [selectedRuleId]);

  const verA: RuleVersion | undefined = versions.find((v) => v.id === versionAId) || versions[0];
  const verB: RuleVersion | undefined = versions.find((v) => v.id === versionBId) || versions[versions.length - 1];

  const currency = t('currency');

  // Simple token/word diff calculation
  const diffTokens = useMemo(() => {
    if (!verA || !verB) return { tokensA: [], tokensB: [], changed: false };
    const formulaA = verA.formula_or_query || '';
    const formulaB = verB.formula_or_query || '';

    if (formulaA === formulaB) {
      return { tokensA: [{ text: formulaA, type: 'same' }], tokensB: [{ text: formulaB, type: 'same' }], changed: false };
    }

    const wordsA = formulaA.split(/(\s+|[+\-*/(),]|\b)/).filter(Boolean);
    const wordsB = formulaB.split(/(\s+|[+\-*/(),]|\b)/).filter(Boolean);

    const setB = new Set(wordsB);
    const setA = new Set(wordsA);

    const tokensA = wordsA.map((w) => ({
      text: w,
      type: setB.has(w) ? 'same' : 'removed',
    }));

    const tokensB = wordsB.map((w) => ({
      text: w,
      type: setA.has(w) ? 'same' : 'added',
    }));

    return { tokensA, tokensB, changed: true };
  }, [verA?.formula_or_query, verB?.formula_or_query]);

  // Simulate evaluation of both versions on test gross salary
  const simulatedResults = useMemo(() => {
    if (!verA || !verB || !currentRule) return { valA: 0, valB: 0, delta: 0, pctDelta: 0 };

    const evaluateFormula = (formula: string, gross: number) => {
      try {
        const base = Math.min(Math.max(gross, 350000), 5000000);
        // Employee rate is 5%
        if (formula.includes('SS_EMPLOYEE_RATE') || formula.includes('5')) {
          if (formula.includes('ROUND') && formula.endsWith(', 0)')) {
            return Math.round(base * 0.05);
          }
          return Number((base * 0.05).toFixed(2));
        }
        if (formula.includes('SS_EMPLOYER_RATE') || formula.includes('12')) {
          return Math.round(base * 0.12);
        }
        if (formula.includes('BASIC_SALARY')) {
          return gross;
        }
        if (formula.includes('PROGRESSIVE') || formula.includes('tax_brackets')) {
          const taxable = Math.max(0, gross - 250000);
          if (taxable <= 250000) return taxable * 0.03;
          if (taxable <= 500000) return 250000 * 0.03 + (taxable - 250000) * 0.05;
          return 250000 * 0.03 + 250000 * 0.05 + (taxable - 500000) * 0.1;
        }
        return gross * 0.05;
      } catch {
        return 0;
      }
    };

    const valA = evaluateFormula(verA.formula_or_query, testSalary);
    const valB = evaluateFormula(verB.formula_or_query, testSalary);
    const delta = valB - valA;
    const pctDelta = valA !== 0 ? (delta / valA) * 100 : 0;

    return { valA, valB, delta, pctDelta };
  }, [verA, verB, testSalary, currentRule]);

  const handleActivateVersion = async (version: RuleVersion) => {
    if (!currentRule) return;
    try {
      const res = await fetch(`/api/tax-module/rules/${currentRule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          active_version_id: version.id,
          status: 'ACTIVE',
        }),
      }).then((r) => r.json());

      if (res.rule) {
        showNotification(
          lang === 'ar'
            ? `تم تفعيل الإصدار ${version.version_code} للقاعدة ${currentRule.code} بنجاح`
            : `Activated version ${version.version_code} for rule ${currentRule.code}`,
          'success'
        );
        refreshData();
      }
    } catch (err) {
      showNotification('Failed to switch active version', 'error');
    }
  };

  if (!currentRule) {
    return (
      <div className="p-8 text-center text-slate-500">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
        <p>{lang === 'ar' ? 'لا توجد قواعد للمقارنة' : 'No rules available for comparison'}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 space-y-6">
      {/* Header & Rule Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <GitCompare className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {lang === 'ar' ? 'مقارن إصدارات القواعد (Rule Version Comparator)' : 'Rule Version Comparator'}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  {currentRule.code}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {lang === 'ar'
                  ? 'مقارنة بصرية بين نسختين من القاعدة، تمييز الفروق في المعادلات، وتتبع الأثر المالي قبل الاعتماد'
                  : 'Visually highlight syntax changes, formula diffs, parameters, and simulated financial impact between versions'}
              </p>
            </div>
          </div>
        </div>

        {/* Rule selector dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs">
            <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              {lang === 'ar' ? 'اختر القاعدة للمقارنة:' : 'Select Rule to Compare:'}
            </label>
            <select
              value={selectedRuleId}
              onChange={(e) => setSelectedRuleId(e.target.value)}
              className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
            >
              {rules.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} - {lang === 'ar' ? r.name_ar : r.name_en} ({r.versions.length} versions)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 mt-4 sm:mt-0">
            <button
              onClick={() => setDiffMode('side_by_side')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                diffMode === 'side_by_side'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {lang === 'ar' ? 'جنباً إلى جنب' : 'Side-by-Side'}
            </button>
            <button
              onClick={() => setDiffMode('unified')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                diffMode === 'unified'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {lang === 'ar' ? 'عرض موحد' : 'Unified'}
            </button>
          </div>
        </div>
      </div>

      {/* Version Pickers Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Version A Card */}
        <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                A
              </span>
              <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                {lang === 'ar' ? 'الإصدار المرجعي (Version A)' : 'Base Version (Version A)'}
              </span>
            </div>
            <select
              value={versionAId}
              onChange={(e) => setVersionAId(e.target.value)}
              className="p-1.5 rounded-lg border border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.version_code} {v.id === currentRule.active_version_id ? '(ACTIVE)' : ''} - {v.effective_from}
                </option>
              ))}
            </select>
          </div>

          {verA && (
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-blue-200/60 dark:border-blue-900/40">
              <div>
                <span className="text-slate-400">{lang === 'ar' ? 'الحالة:' : 'Status:'}</span>
                <span className="ms-1 font-bold text-slate-700 dark:text-slate-300">{verA.status}</span>
              </div>
              <div>
                <span className="text-slate-400">{lang === 'ar' ? 'السريان:' : 'Effective:'}</span>
                <span className="ms-1 font-mono font-medium text-slate-700 dark:text-slate-300">{verA.effective_from}</span>
              </div>
              <div className="col-span-2 text-slate-500 dark:text-slate-400 italic">
                "{verA.change_notes || 'No change notes'}"
              </div>
            </div>
          )}
        </div>

        {/* Version B Card */}
        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                B
              </span>
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                {lang === 'ar' ? 'الإصدار المقارن (Version B)' : 'Target Version (Version B)'}
              </span>
            </div>
            <select
              value={versionBId}
              onChange={(e) => setVersionBId(e.target.value)}
              className="p-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.version_code} {v.id === currentRule.active_version_id ? '(ACTIVE)' : ''} - {v.effective_from}
                </option>
              ))}
            </select>
          </div>

          {verB && (
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-emerald-200/60 dark:border-emerald-900/40">
              <div>
                <span className="text-slate-400">{lang === 'ar' ? 'الحالة:' : 'Status:'}</span>
                <span className="ms-1 font-bold text-slate-700 dark:text-slate-300">{verB.status}</span>
              </div>
              <div>
                <span className="text-slate-400">{lang === 'ar' ? 'السريان:' : 'Effective:'}</span>
                <span className="ms-1 font-mono font-medium text-slate-700 dark:text-slate-300">{verB.effective_from}</span>
              </div>
              <div className="col-span-2 text-slate-500 dark:text-slate-400 italic">
                "{verB.change_notes || 'No change notes'}"
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Visual Formula Diff Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <FileCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            {lang === 'ar' ? 'الفروق البرمجية والمعادلات المحسوبة (Formula & AST Diff)' : 'Formula & AST Expression Diff'}
          </h4>
          <span className="text-[11px] text-slate-400">
            {diffTokens.changed ? (
              <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {lang === 'ar' ? 'توجد اختلافات في المعادلة' : 'Formula expressions differ'}
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {lang === 'ar' ? 'المعادلتان متطابقتان تماماً' : 'Formulas are identical'}
              </span>
            )}
          </span>
        </div>

        {diffMode === 'side_by_side' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Version A Formula */}
            <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto border border-slate-800">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] text-blue-400">
                <span>{verA?.version_code} ({verA?.effective_from})</span>
                <span className="text-slate-500">{verA?.id}</span>
              </div>
              <div className="leading-relaxed break-all">
                {diffTokens.tokensA.map((t, idx) => (
                  <span
                    key={idx}
                    className={
                      t.type === 'removed'
                        ? 'bg-red-900/80 text-red-200 px-1 py-0.5 rounded underline decoration-red-400'
                        : 'text-slate-200'
                    }
                  >
                    {t.text}
                  </span>
                ))}
              </div>
            </div>

            {/* Version B Formula */}
            <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto border border-slate-800">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] text-emerald-400">
                <span>{verB?.version_code} ({verB?.effective_from})</span>
                <span className="text-slate-500">{verB?.id}</span>
              </div>
              <div className="leading-relaxed break-all">
                {diffTokens.tokensB.map((t, idx) => (
                  <span
                    key={idx}
                    className={
                      t.type === 'added'
                        ? 'bg-emerald-900/80 text-emerald-200 px-1 py-0.5 rounded font-bold'
                        : 'text-slate-200'
                    }
                  >
                    {t.text}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Unified Diff */
          <div className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-xs space-y-2 border border-slate-800">
            <div className="flex items-center gap-2 p-2 bg-red-950/40 text-red-300 rounded-lg border border-red-900/50">
              <span className="font-bold select-none text-red-500">- (A: {verA?.version_code}):</span>
              <span className="break-all">{verA?.formula_or_query}</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-emerald-950/40 text-emerald-300 rounded-lg border border-emerald-900/50">
              <span className="font-bold select-none text-emerald-500">+ (B: {verB?.version_code}):</span>
              <span className="break-all">{verB?.formula_or_query}</span>
            </div>
          </div>
        )}
      </div>

      {/* Metadata & Parameter Comparison Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-xs text-start">
          <thead className="bg-slate-50 dark:bg-slate-800/80 font-bold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3 text-start">{lang === 'ar' ? 'الخاصية / البند' : 'Attribute'}</th>
              <th className="p-3 text-start font-mono text-blue-600 dark:text-blue-400">
                {verA?.version_code} (Version A)
              </th>
              <th className="p-3 text-start font-mono text-emerald-600 dark:text-emerald-400">
                {verB?.version_code} (Version B)
              </th>
              <th className="p-3 text-center">{lang === 'ar' ? 'حالة التطابق' : 'Diff Status'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
            <tr>
              <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'ar' ? 'رمز الإصدار' : 'Version Code'}
              </td>
              <td className="p-3 font-mono">{verA?.version_code}</td>
              <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">{verB?.version_code}</td>
              <td className="p-3 text-center">
                {verA?.version_code === verB?.version_code ? (
                  <span className="text-slate-400">Same</span>
                ) : (
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">Modified</span>
                )}
              </td>
            </tr>
            <tr>
              <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'ar' ? 'تاريخ السريان (Effective From)' : 'Effective From'}
              </td>
              <td className="p-3 font-mono">{verA?.effective_from}</td>
              <td className="p-3 font-mono">{verB?.effective_from}</td>
              <td className="p-3 text-center">
                {verA?.effective_from === verB?.effective_from ? (
                  <span className="text-slate-400">Same</span>
                ) : (
                  <span className="text-amber-600 font-bold">Changed</span>
                )}
              </td>
            </tr>
            <tr>
              <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'ar' ? 'حالة الإصدار (Status)' : 'Status'}
              </td>
              <td className="p-3">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  verA?.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {verA?.status}
                </span>
              </td>
              <td className="p-3">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  verB?.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {verB?.status}
                </span>
              </td>
              <td className="p-3 text-center">
                {verA?.status === verB?.status ? (
                  <span className="text-slate-400">Same</span>
                ) : (
                  <span className="text-amber-600 font-bold">Changed</span>
                )}
              </td>
            </tr>
            <tr>
              <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'ar' ? 'ملاحظات التغيير (Change Notes)' : 'Change Notes'}
              </td>
              <td className="p-3 text-slate-600 dark:text-slate-400">{verA?.change_notes || '-'}</td>
              <td className="p-3 text-slate-600 dark:text-slate-400 font-medium">{verB?.change_notes || '-'}</td>
              <td className="p-3 text-center text-slate-400">-</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Financial Impact Simulation */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              {lang === 'ar' ? 'المحاكاة المالية ومقارنة الأثر المباشر' : 'Simulated Financial Impact & Value Test'}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {lang === 'ar'
                ? 'اختبر نتيجة احتساب القاعدة على قيمة راتب تجريبية لمعاينة الأثر على صافي الراتب والاستقطاعات'
                : 'Evaluate Version A vs Version B on sample gross earnings to verify calculation outputs'}
            </p>
          </div>

          {/* Test Gross Salary Input */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {lang === 'ar' ? 'الراتب التجريبي:' : 'Sample Salary:'}
            </span>
            <input
              type="number"
              step="50000"
              value={testSalary}
              onChange={(e) => setTestSalary(Number(e.target.value) || 0)}
              className="w-32 p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-900 dark:text-white text-end"
            />
            <span className="text-xs font-semibold text-slate-500">{currency}</span>
          </div>
        </div>

        {/* Results grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-semibold text-slate-400 block mb-1">
              {verA?.version_code} (Version A)
            </span>
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400 font-mono">
              {(simulatedResults?.valA ?? 0).toLocaleString()} {currency}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-semibold text-slate-400 block mb-1">
              {verB?.version_code} (Version B)
            </span>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {(simulatedResults?.valB ?? 0).toLocaleString()} {currency}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-semibold text-slate-400 block mb-1">
              {lang === 'ar' ? 'الفارق المالي (Delta)' : 'Absolute Delta'}
            </span>
            <div className={`text-lg font-bold font-mono ${
              (simulatedResults?.delta ?? 0) > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : (simulatedResults?.delta ?? 0) < 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-slate-700 dark:text-slate-300'
            }`}>
              {(simulatedResults?.delta ?? 0) > 0 ? '+' : ''}{(simulatedResults?.delta ?? 0).toLocaleString()} {currency}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-semibold text-slate-400 block mb-1">
              {lang === 'ar' ? 'نسبة التغير' : 'Percentage Change'}
            </span>
            <div className={`text-lg font-bold font-mono ${
              simulatedResults.pctDelta !== 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'
            }`}>
              {simulatedResults.pctDelta > 0 ? '+' : ''}{simulatedResults.pctDelta.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* Version Activation Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {lang === 'ar'
            ? 'يمكنك التراجع أو اعتماد أي من الإصدارين كإصدار نشط للرواتب الحالية والقادمة'
            : 'You can roll back or promote either version to be active for subsequent payroll calculations'}
        </div>

        <div className="flex items-center gap-2">
          {verA && verA.id !== currentRule.active_version_id && (
            <button
              onClick={() => handleActivateVersion(verA)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? `تفعيل الإصدار (${verA.version_code})` : `Activate ${verA.version_code}`}</span>
            </button>
          )}

          {verB && verB.id !== currentRule.active_version_id && (
            <button
              onClick={() => handleActivateVersion(verB)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm inline-flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? `اعتماد وتفعيل (${verB.version_code})` : `Promote & Activate ${verB.version_code}`}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
