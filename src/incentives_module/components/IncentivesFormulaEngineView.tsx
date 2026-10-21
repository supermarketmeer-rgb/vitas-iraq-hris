import React, { useState } from 'react';
import { FormulaDefinition, FormulaType } from '../types';
import { StorageService } from '../services/storage';
import { FormulaEngine } from '../services/formulaEngine';
import {
  Calculator,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  History,
  HelpCircle,
  Save,
  RotateCcw,
  Sparkles,
  Layers
} from 'lucide-react';

interface FormulaEngineViewProps {
  isDark?: boolean;
}

export const IncentivesFormulaEngineView: React.FC<FormulaEngineViewProps> = ({ isDark = false }) => {
  const formulas = StorageService.getFormulas();
  const variables = StorageService.getVariables();

  const [selectedType, setSelectedType] = useState<FormulaType>('lo_incentives');
  const activeFormula = formulas.find((f) => f.type === selectedType) || formulas[0];

  const [expression, setExpression] = useState<string>(activeFormula.expression);
  const [description, setDescription] = useState<string>(activeFormula.description);
  const [effectiveFrom, setEffectiveFrom] = useState<string>(activeFormula.effectiveFrom);

  // Test inputs state
  const [testInputs, setTestInputs] = useState<Record<string, number>>({
    Variable01: 25,
    Variable02: 30000000,
    Variable03: 96.5,
    Variable04: 110,
    Variable05: 1.5,
    Variable06: 22,
    Variable07: 7,
    Variable08: 95,
    Variable09: 22,
    Variable10: 4,
    // Supervisor Rollup test variables
    LO_COUNT: 3,
    LO_TOTAL_INCENTIVES: 1250000,
    LO_AVG_REPAYMENT: 96.2,
    LO_QUALIFIED_COUNT: 3,
    LO_TOTAL_DISBURSED: 85000000,
  });

  const [testResult, setTestResult] = useState<{
    value: number;
    steps: string[];
    error?: string;
  } | null>(null);

  const [saveSuccess, setSaveSuccess] = useState(false);

  // Validation
  const validation = FormulaEngine.validate(expression);

  // Switch Formula Type
  const handleSelectType = (type: FormulaType) => {
    setSelectedType(type);
    const target = formulas.find((f) => f.type === type);
    if (target) {
      setExpression(target.expression);
      setDescription(target.description);
      setEffectiveFrom(target.effectiveFrom);
      setTestResult(null);
    }
  };

  // Run Test Calculation
  const handleRunTest = () => {
    const res = FormulaEngine.evaluate(expression, testInputs);
    setTestResult(res);
  };

  // Save Formula
  const handleSaveFormula = () => {
    if (!validation.isValid) {
      alert(`لا يمكن حفظ المعادلة: ${validation.error}`);
      return;
    }

    const updated: FormulaDefinition = {
      ...activeFormula,
      expression,
      description,
      effectiveFrom,
      updatedBy: StorageService.getCurrentUser().name,
      updatedAt: new Date().toISOString(),
    };

    StorageService.saveFormula(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const formulaTypesList: Array<{ type: FormulaType; titleAr: string; desc: string }> = [
    {
      type: 'lo_incentives',
      titleAr: 'حوافز مسؤولي القروض الأساسية',
      desc: 'المعادلة الرئيسية لإنتاجية وحجم صرف ونسب سداد وتعثر مسؤولي القروض',
    },
    {
      type: 'lo_transportation',
      titleAr: 'مخصصات بدل الانتقال الميداني',
      desc: 'المعادلة المحددة لبدل الانتقال بناءً على عدد الزيارات الميدانية المنفذة',
    },
    {
      type: 'lo_bonus',
      titleAr: 'مكافآت التميز والعملاء الجدد',
      desc: 'المكافأة التشجيعية عند تحقيق سداد قياسي واكتساب عملاء جدد ومؤشر التميز',
    },
    {
      type: 'supervisor_incentives',
      titleAr: 'حوافز مشرفي مسؤولي القروض (Rollup)',
      desc: 'معادلة تجميعية تحتسب حوافز المشرف بناءً على مجموع أداء الفريق ومتوسط سدادهم',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className={`p-6 rounded-3xl border transition-all ${
        isDark ? 'bg-[#0a0c10] border-white/10 text-white shadow-xl' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-teal-400 text-lg">functions</span>
            <span className="text-xs font-mono text-teal-400 uppercase tracking-wider font-bold">
              SAFE AST FINANCIAL FORMULA ENGINE
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            محرر ومحرك المعادلات الرياضية الآمن
          </h2>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            صياغة واختبار المعادلات الرياضية بصيغة AST الآمنة (بدون eval وبدون حقن برمجي)، مع تعقب الإصدارات والتأثير المستقبلي
          </p>
        </div>

        <button
          onClick={handleSaveFormula}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-600/30 transition-all cursor-pointer"
        >
          {saveSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>تم حفظ الإصدار الجديد</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>حفظ واعتماد المعادلة</span>
            </>
          )}
        </button>
      </div>

      {/* Formula Type Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {formulaTypesList.map((item) => {
          const isSelected = selectedType === item.type;
          return (
            <button
              key={item.type}
              onClick={() => handleSelectType(item.type)}
              className={`p-4 rounded-2xl border text-right transition-all cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-br from-teal-600/20 to-emerald-600/20 border-teal-500/60 shadow-lg shadow-teal-500/10'
                  : isDark ? 'bg-[#0a0c10] border-white/10 hover:border-white/20' : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`font-bold text-sm ${isSelected ? 'text-teal-400' : isDark ? 'text-white' : 'text-slate-900'}`}>
                  {item.titleAr}
                </span>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                )}
              </div>
              <p className={`text-[11px] line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {item.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Formula Editor & AST Validator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor (2 Cols) */}
        <div className={`lg:col-span-2 p-6 rounded-3xl border space-y-4 ${
          isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-teal-400">محرر نص المعادلة</span>
              <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                الإصدار v{activeFormula.version}
              </span>
            </div>

            {validation.isValid ? (
              <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold font-mono flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>صيغة AST صالحة وآمنة 100%</span>
              </span>
            ) : (
              <span className="text-rose-400 bg-rose-500/10 border border-rose-500/30 px-3 py-1 rounded-full text-xs font-bold font-mono flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>خطأ: {validation.error}</span>
              </span>
            )}
          </div>

          <div>
            <textarea
              rows={4}
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              className={`w-full p-4 rounded-2xl border font-mono text-sm leading-relaxed focus:outline-none focus:border-teal-500 transition-colors ${
                isDark ? 'bg-[#06080d] border-white/10 text-teal-300' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
              dir="ltr"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">وصف المعادلة وضوابطها باللغة العربية</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:border-teal-500 ${
                  isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">تاريخ بدء سريان هذه المعادلة</label>
              <input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:border-teal-500 font-mono font-bold ${
                  isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
          </div>

          {/* Quick Syntax Reference Helper */}
          <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
            isDark ? 'bg-teal-950/20 border-teal-500/20 text-slate-300' : 'bg-teal-50/50 border-teal-200 text-slate-700'
          }`}>
            <div className="font-bold text-teal-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>دليل الدوال المدعومة في محرك AST:</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
              <div><code className="text-teal-300">IF(cond, t, f)</code> الشرط</div>
              <div><code className="text-teal-300">MIN(a, b, c)</code> الأدنى</div>
              <div><code className="text-teal-300">MAX(a, b, c)</code> الأقصى</div>
              <div><code className="text-teal-300">ROUND(val, dec)</code> التقريب</div>
              <div><code className="text-teal-300">AND / OR</code> الربط المنطقي</div>
              <div><code className="text-teal-300">LO_COUNT</code> عدد المسؤولين</div>
              <div><code className="text-teal-300">LO_TOTAL_INCENTIVES</code> حوافز الفريق</div>
              <div><code className="text-teal-300">LO_AVG_REPAYMENT</code> سداد الفريق</div>
            </div>
          </div>
        </div>

        {/* Live Test Sandbox (1 Col) */}
        <div className={`p-6 rounded-3xl border space-y-4 ${
          isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="font-bold text-sm text-teal-400">محاكي اختبار النتيجة حياً</h3>
            <button
              onClick={handleRunTest}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>تنفيذ الحساب</span>
            </button>
          </div>

          <div className="space-y-2 text-xs max-h-60 overflow-y-auto pr-1">
            {selectedType === 'supervisor_incentives' ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-mono">LO_COUNT (المسؤولين):</span>
                  <input
                    type="number"
                    value={testInputs.LO_COUNT}
                    onChange={(e) => setTestInputs({ ...testInputs, LO_COUNT: Number(e.target.value) })}
                    className={`w-24 px-2 py-1 rounded-lg border font-mono text-center font-bold ${
                      isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-mono">LO_AVG_REPAYMENT (%):</span>
                  <input
                    type="number"
                    value={testInputs.LO_AVG_REPAYMENT}
                    onChange={(e) => setTestInputs({ ...testInputs, LO_AVG_REPAYMENT: Number(e.target.value) })}
                    className={`w-24 px-2 py-1 rounded-lg border font-mono text-center font-bold ${
                      isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-mono">LO_TOTAL_INCENTIVES:</span>
                  <input
                    type="number"
                    value={testInputs.LO_TOTAL_INCENTIVES}
                    onChange={(e) => setTestInputs({ ...testInputs, LO_TOTAL_INCENTIVES: Number(e.target.value) })}
                    className={`w-24 px-2 py-1 rounded-lg border font-mono text-center font-bold ${
                      isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-mono">LO_TOTAL_DISBURSED:</span>
                  <input
                    type="number"
                    value={testInputs.LO_TOTAL_DISBURSED}
                    onChange={(e) => setTestInputs({ ...testInputs, LO_TOTAL_DISBURSED: Number(e.target.value) })}
                    className={`w-24 px-2 py-1 rounded-lg border font-mono text-center font-bold ${
                      isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </>
            ) : (
              <>
                {variables.slice(0, 6).map((v) => (
                  <div key={v.code} className="flex items-center justify-between">
                    <span className="text-slate-400 font-mono">
                      {v.code} ({v.nameAr.slice(0, 14)}...):
                    </span>
                    <input
                      type="number"
                      value={testInputs[v.code] !== undefined ? testInputs[v.code] : v.defaultValue}
                      onChange={(e) => setTestInputs({ ...testInputs, [v.code]: Number(e.target.value) })}
                      className={`w-24 px-2 py-1 rounded-lg border font-mono text-center font-bold ${
                        isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Test Output Box */}
          {testResult && (
            <div className={`p-4 rounded-2xl border space-y-2 ${
              isDark ? 'bg-[#06080d] border-teal-500/40 text-white' : 'bg-teal-50 border-teal-300 text-slate-900'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">النتيجة المحسوبة:</span>
                <span className="font-mono text-lg font-black text-teal-400">
                  {testResult.value.toLocaleString()} د.ع
                </span>
              </div>

              {testResult.steps && testResult.steps.length > 0 && (
                <div className="pt-2 border-t border-white/10 text-[11px] font-mono space-y-1 text-slate-300">
                  <div className="text-[10px] text-teal-400 font-bold uppercase tracking-wider">خطوات التتبع الرياضي (Trace):</div>
                  {testResult.steps.map((st, i) => (
                    <div key={i} className="flex items-start gap-1">
                      <span className="text-teal-400 font-bold">•</span>
                      <span>{st}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
