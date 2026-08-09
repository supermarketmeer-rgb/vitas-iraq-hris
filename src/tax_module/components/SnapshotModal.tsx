import React from 'react';
import { useApp } from '../context/AppContext.js';
import {
  X,
  ShieldCheck,
  Calendar,
  Layers,
  CheckCircle2,
  FileSpreadsheet,
  Receipt,
  Sparkles,
} from 'lucide-react';

export const SnapshotModal: React.FC = () => {
  const { lang, t, selectedSnapshot, setSelectedSnapshot } = useApp();

  if (!selectedSnapshot) return null;

  const currency = t('currency');
  const snap = selectedSnapshot;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {lang === 'ar' ? 'سجل الاحتساب غير القابل للتعديل' : 'Immutable Calculation Snapshot'}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                {snap.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              ID: {snap.id} | {snap.payroll_period}
            </p>
          </div>

          <button
            onClick={() => setSelectedSnapshot(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Employee & Period Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">{lang === 'ar' ? 'الموظف' : 'Employee'}</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {lang === 'ar' ? snap.employee_name_ar : snap.employee_name_en}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">{lang === 'ar' ? 'الرقم الوظيفي' : 'Employee No'}</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{snap.employee_number}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">{lang === 'ar' ? 'القسم والفرع' : 'Department'}</span>
              <span className="text-slate-700 dark:text-slate-300">
                {snap.department_name} ({snap.branch_name})
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">{lang === 'ar' ? 'تاريخ الحساب' : 'Calculated At'}</span>
              <span className="font-mono text-slate-500">{snap.calculation_date}</span>
            </div>
          </div>

          {/* Results Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[10px] text-slate-400 block">{t('total_gross_salaries')}</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {(snap.calculation_result?.gross_salary ?? 0).toLocaleString()} {currency}
              </span>
            </div>

            <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20">
              <span className="text-[10px] text-slate-400 block">{t('employee_social_security')}</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {(snap.calculation_result?.employee_social_security ?? 0).toLocaleString()} {currency}
              </span>
            </div>

            <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20">
              <span className="text-[10px] text-slate-400 block">{t('total_income_tax')}</span>
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                {(snap.calculation_result?.income_tax ?? 0).toLocaleString()} {currency}
              </span>
            </div>

            <div className="p-3 rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/40 dark:bg-teal-950/20">
              <span className="text-[10px] text-slate-400 block">{t('total_net_payout')}</span>
              <span className="text-sm font-extrabold text-teal-600 dark:text-teal-400">
                {(snap.calculation_result?.net_salary ?? 0).toLocaleString()} {currency}
              </span>
            </div>
          </div>

          {/* Progressive Brackets Applied */}
          {snap.bracket_breakdown && snap.bracket_breakdown.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-500" />
                <span>{t('progressive_brackets_breakdown')}</span>
              </h4>
              <div className="space-y-1.5">
                {snap.bracket_breakdown.map((b) => (
                  <div
                    key={b.bracket_order}
                    className="p-2.5 rounded-lg border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {lang === 'ar' ? b.name_ar : b.name_en} ({b.rate}%)
                      </span>
                      <span className="text-[11px] text-slate-500 ms-2">
                        {lang === 'ar' ? 'المبلغ الخاضع:' : 'Taxable:'} {((b as any).taxable_amount ?? (b as any).taxable_amount_in_bracket ?? 0).toLocaleString()} {currency}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                      {((b as any).tax_amount ?? 0).toLocaleString()} {currency}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step-by-Step Traces */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('step_by_step_trace')}</span>
            </h4>
            <div className="space-y-2">
              {(snap.step_traces || (snap as any).calculation_steps || []).map((trace: any) => (
                <div
                  key={trace.step_number}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-slate-900 dark:text-white">
                      {trace.step_number}. {lang === 'ar' ? trace.rule_name_ar : trace.rule_name_en}
                    </span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      {(trace.calculated_value ?? trace.result_value ?? 0).toLocaleString()} {currency}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    {lang === 'ar' ? trace.explanation_ar : trace.explanation_en}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-900/60">
          <button
            onClick={() => setSelectedSnapshot(null)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 transition-colors"
          >
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
