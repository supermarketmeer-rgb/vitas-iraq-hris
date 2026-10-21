import React, { useState } from 'react';
import {
  FullPayrollTaxResult,
  StepTraceItem,
  BracketCalculationDetail
} from '../../utils/iraqPayrollTaxEngine';

interface CalculationTraceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: FullPayrollTaxResult | null;
  employeeName?: string;
  employeeCode?: string;
  lang?: 'ar' | 'en';
}

export const CalculationTraceDetailsModal: React.FC<CalculationTraceDetailsModalProps> = ({
  isOpen,
  onClose,
  result,
  employeeName = 'الموظف التجريبي',
  employeeCode = 'EMP-964',
  lang = 'ar'
}) => {
  const [showFormulaDetails, setShowFormulaDetails] = useState<boolean>(false);
  const isAr = lang === 'ar';

  if (!isOpen || !result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-xl border border-teal-500/20">
              <span className="material-symbols-outlined text-2xl">receipt_long</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  {isAr ? 'تفاصيل ومعادلة احتساب الضمان وضريبة الدخل' : 'Social Security & Tax Calculation Breakdown'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-700">
                  {result.item_18_legal_settings_version}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {employeeName} ({employeeCode}) — {isAr ? 'المحرك المركزي المعتمد وفق قانون 18 لسنة 2023 وقانون 113' : 'Central Engine compliant with Iraqi Law 18 & Law 113'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFormulaDetails(!showFormulaDetails)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-sm ${
                showFormulaDetails
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/40'
              }`}
            >
              <span className="material-symbols-outlined text-sm">functions</span>
              <span>{showFormulaDetails ? (isAr ? 'عرض الملخص' : 'Show Summary') : (isAr ? 'عرض معادلة الاحتساب' : 'Show Calculation Formula')}</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {showFormulaDetails ? (
            /* =========================================================================
               VIEW A: Detailed Step-by-Step Formula Trace ("عرض معادلة الاحتساب")
               ========================================================================= */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 text-xs text-teal-900 dark:text-teal-200 flex items-start gap-3">
                <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-lg shrink-0">info</span>
                <div>
                  <div className="font-bold mb-0.5">
                    {isAr ? 'تتبع خطوات الاحتساب والقيم الفعلية المستخدمة:' : 'Calculation Formula Steps & Actual Values Used:'}
                  </div>
                  <div>
                    {isAr
                      ? 'يعرض هذا السجل كل خطوة رياضية مع القانون المرجعي، والصيغة الرياضية، والأرقام الحقيقية المأخوذة من إعدادات النظام ومسير الرواتب.'
                      : 'This trace details each calculation step, the statutory reference, formula, and values loaded from settings.'}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {result.calculation_steps.map((step) => (
                  <div
                    key={step.step_number}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 shadow-xs hover:border-teal-400 dark:hover:border-teal-600 transition"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-teal-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                          {step.step_number}
                        </span>
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {isAr ? step.title_ar : step.title_en}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-teal-700 dark:text-teal-300">
                        {step.result_value}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 font-mono">
                        <span className="text-[10px] text-slate-400 block mb-0.5 font-sans font-bold">{isAr ? 'المعادلة الرياضية:' : 'Formula:'}</span>
                        <span className="text-teal-700 dark:text-teal-300 font-semibold">{step.formula_expression}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 font-mono">
                        <span className="text-[10px] text-slate-400 block mb-0.5 font-sans font-bold">{isAr ? 'القيم الفعلية المطبقة:' : 'Values Applied:'}</span>
                        <span className="text-slate-700 dark:text-slate-300">{step.actual_values_used}</span>
                      </div>
                    </div>

                    <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-xs text-amber-500">gavel</span>
                      <span>{step.legal_note}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* =========================================================================
               VIEW B: The 18 Standard Items Specified in Section 7 of Prompt
               ========================================================================= */
            <div className="space-y-6">
              
              {/* Top KPI Cards: Gross, Deductions, Net */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <div className="text-xs text-slate-500 dark:text-slate-400">{isAr ? 'الراتب الإجمالي الشهري' : 'Gross Monthly Salary'}</div>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {(result.item_17_net_salary + result.total_deductions_monthly).toLocaleString()} <span className="text-xs font-normal text-slate-500">د.ع</span>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40">
                  <div className="text-xs text-red-600 dark:text-red-400 font-bold">{isAr ? 'إجمالي الاستقطاعات الشهرية' : 'Total Monthly Deductions'}</div>
                  <div className="text-xl font-black text-red-700 dark:text-red-300 mt-1">
                    {result.total_deductions_monthly.toLocaleString()} <span className="text-xs font-normal text-red-500">د.ع</span>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">{isAr ? 'صافي الراتب المستحق للصرف' : 'Net Salary Payable'}</div>
                  <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
                    {result.item_17_net_salary.toLocaleString()} <span className="text-xs font-normal text-emerald-500">د.ع</span>
                  </div>
                </div>
              </div>

              {/* The 18 Detailed Line Items Table */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2.5 font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>{isAr ? 'عناصر الاحتساب الـ 18 المعتمدة' : 'The 18 Standard Calculation Line Items'}</span>
                  <span className="text-[11px] font-normal text-slate-500">قانون 18 لسنة 2023 وقانون 113 لسنة 1982</span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                  {/* Item 1 */}
                  <div className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <span className="text-slate-600 dark:text-slate-400">1. {isAr ? 'الراتب الاسمي (الأساسي)' : 'Nominal Basic Salary'}</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{result.item_1_nominal_basic.toLocaleString()} د.ع</span>
                  </div>

                  {/* Item 2 */}
                  <div className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <span className="text-slate-600 dark:text-slate-400">2. {isAr ? 'مكونات الراتب المعتمدة ضريبياً (شهرياً)' : 'Taxable Salary Components (Monthly)'}</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{result.item_2_taxable_components_monthly.toLocaleString()} د.ع</span>
                  </div>

                  {/* Item 3 */}
                  <div className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <span className="text-slate-600 dark:text-slate-400">3. {isAr ? 'مكونات الأجر المعتمدة للضمان (شهرياً)' : 'Insured Wage Components (Monthly)'}</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{result.item_3_insured_components_monthly.toLocaleString()} د.ع</span>
                  </div>

                  {/* Item 4 */}
                  <div className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 bg-teal-50/40 dark:bg-teal-950/10">
                    <span className="text-teal-900 dark:text-teal-200 font-semibold">4. {isAr ? 'الأجر الخاضع للضمان بعد تطبيق الحدود (الوعاء)' : 'Insured Salary Base (After Limits)'}</span>
                    <span className="font-mono font-bold text-teal-700 dark:text-teal-300">{result.item_4_insured_salary_base.toLocaleString()} د.ع</span>
                  </div>

                  {/* Item 5 */}
                  <div className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <span className="text-slate-600 dark:text-slate-400">5. {isAr ? 'نسبة وقيمة استقطاع الموظف للضمان الاجتماعي' : 'Employee Social Security Rate & Amount'}</span>
                    <span className="font-mono font-bold text-red-600 dark:text-red-400">
                      {result.item_5_employee_ss_rate}% ({result.item_5_employee_ss_amount.toLocaleString()} د.ع)
                    </span>
                  </div>

                  {/* Item 6 */}
                  <div className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <span className="text-slate-600 dark:text-slate-400">6. {isAr ? 'نسبة وقيمة مساهمة المؤسسة بالضمان (لا تخصم من الموظف)' : 'Employer Contribution Rate & Amount (Not Deducted)'}</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {result.item_6_employer_ss_rate}% ({result.item_6_employer_ss_amount.toLocaleString()} د.ع)
                    </span>
                  </div>

                  {/* Item 7 */}
                  <div className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 bg-slate-50/50 dark:bg-slate-800/30">
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">7. {isAr ? 'الدخل السنوي المعتمد ضريبياً (Gross Annual Income)' : 'Annual Gross Taxable Income'}</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{result.item_7_annual_gross_taxable_income.toLocaleString()} د.ع</span>
                  </div>

                  {/* Item 8 */}
                  <div className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <span className="text-slate-600 dark:text-slate-400">8. {isAr ? 'السماح الشخصي السنوي المقر' : 'Personal Annual Exemption Allowance'}</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{result.item_8_personal_allowance.toLocaleString()} د.ع</span>
                  </div>

                  {/* Item 9 */}
                  <div className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <span className="text-slate-600 dark:text-slate-400">
                      9. {isAr ? 'سماح الزوجة ومدى استحقاقه' : 'Spouse Allowance & Eligibility'}
                      <span className="text-[10px] text-slate-400 block">{result.income_tax.spouse_eligibility_reason}</span>
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {result.item_9_spouse_allowance_amount.toLocaleString()} د.ع ({result.item_9_spouse_eligible ? (isAr ? 'مستحق' : 'Eligible') : (isAr ? 'غير مستحق' : 'Ineligible')})
                    </span>
                  </div>

                  {/* Item 10 */}
                  <div className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <span className="text-slate-600 dark:text-slate-400">10. {isAr ? `عدد الأطفال المستحقين للسماح ومجموع السماحات (${result.item_10_eligible_children_count} أطفال)` : `Eligible Children & Total Allowance (${result.item_10_eligible_children_count})`}</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{result.item_10_children_allowance_total.toLocaleString()} د.ع</span>
                  </div>

                  {/* Item 11 */}
                  <div className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <span className="text-slate-600 dark:text-slate-400">11. {isAr ? 'الخصومات الضريبية المسموح بها (خصم الضمان السنوي + أخرى)' : 'Allowed Tax Deductions (Deductible SS + Other)'}</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {(result.item_11_tax_deductible_insurance + result.item_11_other_deductions).toLocaleString()} د.ع
                    </span>
                  </div>

                  {/* Item 12 */}
                  <div className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 bg-amber-50/50 dark:bg-amber-950/20">
                    <span className="text-amber-900 dark:text-amber-200 font-bold">12. {isAr ? 'الوعاء الضريبي النهائي الخاضع للشرائح (Taxable Income Base)' : 'Final Taxable Income Base'}</span>
                    <span className="font-mono font-black text-amber-700 dark:text-amber-300">{result.item_12_taxable_income_base.toLocaleString()} د.ع</span>
                  </div>

                  {/* Item 13 & 14: Progressive Brackets Breakdown */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/60">
                    <div className="font-bold text-slate-800 dark:text-slate-200 mb-2">
                      {isAr ? '13 & 14. تفصيل الدخل والضريبة لكل شريحة من الشرائح التصاعدية:' : '13 & 14. Income and Tax Breakdown Per Progressive Bracket:'}
                    </div>
                    <div className="space-y-1.5 font-mono">
                      {result.item_14_brackets_tax_breakdown.map((b) => (
                        <div
                          key={b.bracket_order}
                          className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white font-sans">{b.name_ar} ({b.tax_rate}%)</span>
                            <span className="text-slate-400 text-[10px] block font-sans">{b.formula_note}</span>
                          </div>
                          <div className="text-end">
                            <div className="font-bold text-red-600 dark:text-red-400">{b.bracket_tax.toLocaleString()} د.ع</div>
                            <div className="text-[10px] text-slate-400">دخل الشريحة: {b.bracket_income.toLocaleString()} د.ع</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Item 15 */}
                  <div className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <span className="text-slate-600 dark:text-slate-400">15. {isAr ? 'الضريبة السنوية التقديرية (مجموع الشرائح)' : 'Estimated Annual Tax'}</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{result.item_15_annual_tax.toLocaleString()} د.ع</span>
                  </div>

                  {/* Item 16 */}
                  <div className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 bg-red-50/30 dark:bg-red-950/10">
                    <span className="text-red-900 dark:text-red-200 font-semibold">16. {isAr ? `الضريبة الشهرية (استقطاع الفترة - مقربة ${result.income_tax.rounding_method})` : 'Monthly Tax Deduction'}</span>
                    <span className="font-mono font-bold text-red-600 dark:text-red-400">{result.item_16_monthly_tax.toLocaleString()} د.ع</span>
                  </div>

                  {/* Item 17 */}
                  <div className="px-4 py-3 flex items-center justify-between bg-emerald-50/60 dark:bg-emerald-950/30">
                    <span className="text-emerald-950 dark:text-emerald-200 font-black text-sm">17. {isAr ? 'صافي الراتب بعد كافة الاستقطاعات' : 'Net Salary Payable'}</span>
                    <span className="font-mono font-black text-base text-emerald-700 dark:text-emerald-300">{result.item_17_net_salary.toLocaleString()} د.ع</span>
                  </div>

                  {/* Item 18 */}
                  <div className="px-4 py-2 flex items-center justify-between bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
                    <span>18. {isAr ? 'إصدار الإعدادات القانونية المعتمد في الحساب' : 'Legal Settings Version Used'}</span>
                    <span className="font-mono font-bold">{result.item_18_legal_settings_version}</span>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <button
            onClick={() => setShowFormulaDetails(!showFormulaDetails)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/30 transition flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">functions</span>
            <span>{showFormulaDetails ? (isAr ? 'الرجوع إلى العناصر الـ 18' : 'Back to 18 Line Items') : (isAr ? 'عرض معادلة الاحتساب بالتفصيل' : 'Show Detailed Formula Trace')}</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold transition shadow-sm"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
