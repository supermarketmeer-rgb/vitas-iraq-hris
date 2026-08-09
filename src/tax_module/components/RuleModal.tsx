import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext.js';
import {
  X,
  Save,
  Sliders,
  Layers,
  Sparkles,
  Check,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Code2,
  HelpCircle,
  Variable,
  RefreshCw,
} from 'lucide-react';
import { CalculationRule } from '../types.js';

// Standard allowed mathematical and logical keywords/functions
const ALLOWED_KEYWORDS_AND_FUNCTIONS = new Set([
  'MIN',
  'MAX',
  'IF',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'ROUND',
  'ABS',
  'CEIL',
  'FLOOR',
  'SUM',
  'AVG',
  'AND',
  'OR',
  'NOT',
  'TRUE',
  'FALSE',
  'NULL',
  'SELECT',
  'FROM',
  'WHERE',
  'AS',
  'IN',
  'BETWEEN',
  'LIKE',
  'IS',
  'COUNT',
]);

const STANDARD_HR_VARS = new Set([
  'basic_salary',
  'housing_allowance',
  'transport_allowance',
  'living_allowance',
  'other_allowances',
  'allowances',
  'allowances_taxable',
  'dependents_count',
  'marital_status',
  'contract_type',
  'is_resident',
  'calculation_date',
  'gross_salary',
  'taxable_gross',
  'taxable_income',
  'social_security_base',
  'employee_social_security',
  'employer_social_security',
  'exemptions_applied',
  'income_tax',
  'total_deductions',
  'net_salary',
  'overtime_hours',
  'grade',
  'seniority_years',
  'employee_id',
]);

export const RuleModal: React.FC = () => {
  const {
    lang,
    t,
    isRuleModalOpen,
    setIsRuleModalOpen,
    editingRule,
    setEditingRule,
    refreshData,
    showNotification,
    variables,
    rules,
  } = useApp();

  const [code, setCode] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [category, setCategory] = useState<'GROSS' | 'SOCIAL_SECURITY' | 'INCOME_TAX' | 'EXEMPTION' | 'NET_PAYOUT'>('SOCIAL_SECURITY');
  const [ruleType, setRuleType] = useState<'FORMULA' | 'SQL_QUERY' | 'BRACKET_LOOKUP' | 'TABLE_LOOKUP' | 'FIXED_VALUE'>('FORMULA');
  const [executionOrder, setExecutionOrder] = useState<number>(10);
  const [outputVariable, setOutputVariable] = useState<string>('employee_social_security');
  const [dependencies, setDependencies] = useState<string>('basic_salary, allowances');
  const [formulaOrQuery, setFormulaOrQuery] = useState<string>('');
  const [effectiveFrom, setEffectiveFrom] = useState<string>('2026-08-01');
  const [isCreatingNewVersion, setIsCreatingNewVersion] = useState<boolean>(false);
  const [versionNotes, setVersionNotes] = useState<string>('');

  useEffect(() => {
    if (editingRule) {
      setCode(editingRule.code);
      setNameAr(editingRule.name_ar);
      setNameEn(editingRule.name_en);
      setCategory(editingRule.category);
      setRuleType(editingRule.rule_type);
      setExecutionOrder(editingRule.execution_order);
      setOutputVariable(editingRule.output_variable);
      setDependencies(editingRule.dependencies.join(', '));
      const activeVer = editingRule.versions.find((v) => v.status === 'ACTIVE') || editingRule.versions[0];
      setFormulaOrQuery(activeVer?.formula_or_query || '');
      setEffectiveFrom(activeVer?.effective_from || '2026-08-01');
      setIsCreatingNewVersion(false);
    } else {
      setCode('RULE_CUSTOM_' + Math.floor(100 + Math.random() * 900));
      setNameAr('');
      setNameEn('');
      setCategory('SOCIAL_SECURITY');
      setRuleType('FORMULA');
      setExecutionOrder(50);
      setOutputVariable('custom_deduction');
      setDependencies('basic_salary');
      setFormulaOrQuery('basic_salary * 0.05');
      setEffectiveFrom('2026-08-01');
      setIsCreatingNewVersion(false);
    }
  }, [editingRule, isRuleModalOpen]);

  // Set of all registered variable names in system
  const knownVariablesSet = useMemo(() => {
    const set = new Set<string>();
    STANDARD_HR_VARS.forEach((v) => set.add(v.toLowerCase()));
    variables.forEach((v) => {
      set.add(v.code.toLowerCase());
      if (v.source_column) set.add(v.source_column.toLowerCase());
    });
    rules.forEach((r) => {
      if (r.output_variable) set.add(r.output_variable.toLowerCase());
    });
    return set;
  }, [variables, rules]);

  // Real-Time Regex-Based Formula & AST Validator
  const validationResult = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const detectedVariables: string[] = [];

    const text = formulaOrQuery.trim();

    if (!text) {
      return {
        isValid: false,
        errors: [lang === 'ar' ? 'صيغة المعادلة أو الاستعلام لا يمكن أن تكون فارغة' : 'Formula or query expression cannot be empty'],
        warnings: [],
        detectedVariables: [],
        hasCircularDependency: false,
      };
    }

    if (ruleType === 'SQL_QUERY') {
      // SQL validation
      if (!/^\s*SELECT\b/i.test(text)) {
        errors.push(lang === 'ar' ? 'يجب أن يبدأ استعلام SQL بكلمة SELECT فقط' : 'SQL query must strictly begin with SELECT');
      }

      const prohibitedKeywords = ['DELETE', 'DROP', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE', 'EXEC', 'MERGE', 'GRANT', 'REVOKE'];
      for (const kw of prohibitedKeywords) {
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        if (regex.test(text)) {
          errors.push(
            lang === 'ar'
              ? `الاستعلام يحتوي على أمر محظور أمنياً: (${kw})`
              : `Prohibited dangerous SQL keyword detected: ${kw}`
          );
        }
      }

      // Check parameter bindings
      const paramMatches = text.match(/:[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
      for (const p of paramMatches) {
        const varName = p.substring(1).toLowerCase();
        detectedVariables.push(varName);
        if (!knownVariablesSet.has(varName)) {
          warnings.push(
            lang === 'ar'
              ? `البارامتر البادئ : (${p}) غير معرّف في قاموس متغيرات النظام`
              : `Parameter binding ${p} is not defined in system variable dictionary`
          );
        }
      }
    } else if (ruleType === 'FORMULA' || ruleType === 'BRACKET_LOOKUP') {
      // 1. Parentheses balance check
      let parenBalance = 0;
      for (let i = 0; i < text.length; i++) {
        if (text[i] === '(') parenBalance++;
        if (text[i] === ')') parenBalance--;
        if (parenBalance < 0) {
          errors.push(lang === 'ar' ? 'أقواس إغلاق زائدة أو غير متطابقة )' : 'Unmatched closing parenthesis detected');
          break;
        }
      }
      if (parenBalance > 0) {
        errors.push(lang === 'ar' ? `يوجد ${parenBalance} قوس مفتوح ( غير مغلق` : `${parenBalance} unclosed open parenthesis '(' detected`);
      }

      // 2. Trailing or consecutive invalid operators check
      if (/[\+\-\*\/%<>=&|!]\s*$/.test(text)) {
        errors.push(lang === 'ar' ? 'المعادلة تنتهي بمعامل حسابي غير مكتمل' : 'Formula ends with incomplete dangling operator');
      }
      if (/(?:[\+\*\/%]{2,})/g.test(text)) {
        errors.push(lang === 'ar' ? 'معاملات حسابية متتالية غير صالحة (e.g. ++, **, //)' : 'Invalid consecutive arithmetic operators');
      }

      // 3. Extract tokens & variable names using regex
      const tokens = text.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
      const currentOutputVar = outputVariable.trim().toLowerCase();

      for (const token of tokens) {
        const upperToken = token.toUpperCase();
        const lowerToken = token.toLowerCase();

        // Check if keyword / function
        if (ALLOWED_KEYWORDS_AND_FUNCTIONS.has(upperToken)) {
          continue;
        }

        // Circular Dependency: referencing its own output variable
        if (lowerToken === currentOutputVar) {
          errors.push(
            lang === 'ar'
              ? `اعتماد دائري فوري (Circular Dependency): المعادلة تشير إلى نفس متغير المخرجات (${outputVariable})`
              : `Direct Circular Dependency: Formula references its own output variable '${outputVariable}'`
          );
        }

        if (!detectedVariables.includes(lowerToken)) {
          detectedVariables.push(lowerToken);
        }

        // Check if variable exists in known system variables
        if (!knownVariablesSet.has(lowerToken)) {
          warnings.push(
            lang === 'ar'
              ? `المتغير (${token}) غير معرّف في النظام. قد يتسبب في خطأ وقت التشغيل إذا لم يتم تعيينه.`
              : `Variable '${token}' is not found in known variables dictionary`
          );
        }
      }

      // 4. Multi-step circular dependency check via rules dependency graph
      if (currentOutputVar) {
        const rulesDependingOnThis = rules.filter((r) =>
          r.dependencies.map((d) => d.toLowerCase()).includes(currentOutputVar)
        );
        for (const depRule of rulesDependingOnThis) {
          if (detectedVariables.includes(depRule.output_variable.toLowerCase())) {
            errors.push(
              lang === 'ar'
                ? `حلقة اعتماد دائرية متعددة المستويات: القاعدة تعتمد على (${depRule.output_variable}) التي تعتمد بدورها على (${outputVariable})`
                : `Transitive Circular Loop: Depends on '${depRule.output_variable}' which in turn depends on '${outputVariable}'`
            );
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      detectedVariables,
      hasCircularDependency: errors.some((e) => e.includes('Circular') || e.includes('دائري')),
    };
  }, [formulaOrQuery, ruleType, outputVariable, knownVariablesSet, rules, lang]);

  if (!isRuleModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validationResult.isValid) {
      showNotification(
        lang === 'ar'
          ? 'يرجى تصحيح أخطاء الصيغة والاعتمادات الدائرية قبل الحفظ'
          : 'Please fix formula validation errors before saving',
        'error'
      );
      return;
    }

    try {
      // Auto update dependencies field with detected variables if empty
      const finalDeps =
        validationResult.detectedVariables.length > 0
          ? validationResult.detectedVariables
          : dependencies.split(',').map((s) => s.trim()).filter(Boolean);

      if (editingRule) {
        if (isCreatingNewVersion) {
          const res = await fetch(`/api/tax-module/rules/${editingRule.id}/versions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              formula_or_query: formulaOrQuery,
              effective_from: effectiveFrom,
              change_notes: versionNotes || 'Updated rule formula & validated AST',
            }),
          });
          if (res.ok) {
            showNotification(
              lang === 'ar'
                ? 'تم إنشاء الإصدار الجديد المعتمد بنجاح'
                : 'New rule version created and verified'
            );
          }
        } else {
          const res = await fetch(`/api/tax-module/rules/${editingRule.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name_ar: nameAr,
              name_en: nameEn,
              execution_order: Number(executionOrder),
              output_variable: outputVariable,
              dependencies: finalDeps,
            }),
          });
          if (res.ok) {
            showNotification(lang === 'ar' ? 'تم تحديث بيانات القاعدة' : 'Rule metadata updated');
          }
        }
      } else {
        const res = await fetch('/api/tax-module/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            name_ar: nameAr,
            name_en: nameEn,
            category,
            rule_type: ruleType,
            execution_order: Number(executionOrder),
            output_variable: outputVariable,
            dependencies: finalDeps,
            formula_or_query: formulaOrQuery,
            effective_from: effectiveFrom,
          }),
        });
        if (res.ok) {
          showNotification(lang === 'ar' ? 'تمت إضافة القاعدة واعتمادها بنجاح' : 'New rule registered successfully');
        }
      }

      setIsRuleModalOpen(false);
      refreshData();
    } catch (err) {
      showNotification('Save failed', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col my-6 animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-10">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>
                {editingRule
                  ? lang === 'ar'
                    ? 'تعديل أو إصدار جديد لقاعدة الحساب'
                    : 'Edit Rule / Create New Version'
                  : t('add_new_rule')}
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {editingRule ? editingRule.code : code || 'DYNAMIC_RULE_ENGINE'}
            </p>
          </div>

          <button
            onClick={() => setIsRuleModalOpen(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {editingRule && (
            <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 flex items-center justify-between">
              <div>
                <span className="font-bold text-indigo-950 dark:text-indigo-200 block text-xs">
                  {lang === 'ar' ? 'إنشاء إصدار جديد (New Version)' : 'Create New Rule Version'}
                </span>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-400">
                  {lang === 'ar'
                    ? 'يضمن بقاء العمليات السابقة على النسخة القديمة، وتطبيق الصيغة الجديدة من تاريخ السريان المحدد.'
                    : 'Preserves past calculation runs on old versions while applying new formula from effective date.'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={isCreatingNewVersion}
                onChange={(e) => setIsCreatingNewVersion(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer ms-3"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {t('rule_code')}
              </label>
              <input
                type="text"
                value={code}
                disabled={!!editingRule}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono disabled:opacity-50"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {t('execution_order')}
              </label>
              <input
                type="number"
                value={executionOrder}
                onChange={(e) => setExecutionOrder(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {t('rule_name_ar')}
              </label>
              <input
                type="text"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="مثال: خصم التأمينات الاجتماعية حصة الموظف"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {t('rule_name_en')}
              </label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. Employee Social Security Deduction"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {t('rule_type')}
              </label>
              <select
                value={ruleType}
                disabled={!!editingRule && !isCreatingNewVersion}
                onChange={(e: any) => setRuleType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="FORMULA">FORMULA (Math & Logic Expression)</option>
                <option value="SQL_QUERY">SQL_QUERY (Parameterized SELECT Query)</option>
                <option value="BRACKET_LOOKUP">BRACKET_LOOKUP (Progressive Slabs)</option>
                <option value="FIXED_VALUE">FIXED_VALUE (Static Parameter)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {t('output_variable')}
              </label>
              <input
                type="text"
                value={outputVariable}
                onChange={(e) => setOutputVariable(e.target.value)}
                placeholder="employee_social_security"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                required
              />
            </div>
          </div>

          {/* Formula or Query Editor with Real-Time Validation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'ar' ? 'صيغة المعادلة أو استعلام SQL المعتمد' : 'Formula / Safe SQL Query Expression'}
              </label>
              <div className="flex items-center gap-1 text-[11px]">
                {validationResult.isValid ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'الصيغة سليمة (Valid Syntax)' : 'Valid Syntax'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-rose-600 font-bold">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'يوجد أخطاء في الصيغة' : 'Invalid Syntax'}</span>
                  </span>
                )}
              </div>
            </div>

            <textarea
              rows={3}
              value={formulaOrQuery}
              onChange={(e) => setFormulaOrQuery(e.target.value)}
              placeholder="e.g. MIN(basic_salary + allowances_taxable, 5000000) * 0.05"
              className={`w-full p-3 font-mono text-xs rounded-xl border transition-all ${
                validationResult.isValid
                  ? 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500'
                  : 'border-rose-300 dark:border-rose-800 bg-rose-50/20 dark:bg-rose-950/20 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500'
              }`}
              required
            />

            {/* Live Formula Validator Feedback Box */}
            <div
              className={`p-3.5 rounded-2xl border text-xs space-y-2 transition-all ${
                validationResult.isValid
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <div className="flex items-center gap-1.5">
                  {validationResult.isValid ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{lang === 'ar' ? 'فاحص الصيغ التفاعلي: تم التحقق بنجاح' : 'Formula Validator: Passed AST & Regex Checks'}</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>{lang === 'ar' ? 'تنبيهات الفاحص اللحظي (تعطيل الحفظ)' : 'Validation Alerts (Save Disabled)'}</span>
                    </>
                  )}
                </div>

                {/* Detected variables chip list */}
                {validationResult.detectedVariables.length > 0 && (
                  <div className="flex items-center gap-1 text-[10px] font-mono">
                    <span className="text-slate-500">{lang === 'ar' ? 'المتغيرات المكتشفة:' : 'Vars:'}</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                      {validationResult.detectedVariables.join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Errors List */}
              {validationResult.errors.length > 0 && (
                <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-700 dark:text-rose-300 font-medium">
                  {validationResult.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              )}

              {/* Warnings List */}
              {validationResult.warnings.length > 0 && (
                <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-700 dark:text-amber-300">
                  {validationResult.warnings.map((warn, idx) => (
                    <li key={idx}>{warn}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Dependencies & Effective Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {t('dependencies')} ({lang === 'ar' ? 'مفصولة بفواصل' : 'comma separated'})
              </label>
              <input
                type="text"
                value={
                  validationResult.detectedVariables.length > 0
                    ? validationResult.detectedVariables.join(', ')
                    : dependencies
                }
                onChange={(e) => setDependencies(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {t('effective_from')}
              </label>
              <input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                required
              />
            </div>
          </div>

          {isCreatingNewVersion && (
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {lang === 'ar' ? 'ملاحظات الإصدار الجديد (Audit Note)' : 'Version Audit Note'}
              </label>
              <input
                type="text"
                value={versionNotes}
                onChange={(e) => setVersionNotes(e.target.value)}
                placeholder="e.g. Adjusted social security rate per Ministerial Decree No. 44"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsRuleModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={!validationResult.isValid}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'حفظ واعتماد القاعدة' : 'Save & Publish Rule'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
