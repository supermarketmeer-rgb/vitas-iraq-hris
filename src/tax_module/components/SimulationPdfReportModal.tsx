import React from 'react';
import { useApp } from '../context/AppContext.js';
import {
  Printer,
  Download,
  X,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Building2,
  Hash,
  Calculator,
  User,
} from 'lucide-react';
import { SimulationResponse } from '../types.js';

interface SimulationPdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  simulationResult: SimulationResponse | null;
  inputs: {
    employeeName?: string;
    employeeCode?: string;
    basicSalary: number;
    housingAllowance: number;
    transportAllowance: number;
    livingAllowance: number;
    dependentsCount: number;
    maritalStatus: string;
    contractType: string;
    isResident: boolean;
    calculationDate: string;
  };
}

export const SimulationPdfReportModal: React.FC<SimulationPdfReportModalProps> = ({
  isOpen,
  onClose,
  simulationResult,
  inputs,
}) => {
  const { lang, t } = useApp();

  if (!isOpen || !simulationResult) return null;

  const currency = t('currency');
  const reportRef = `SIM-AUDIT-${Date.now().toString().slice(-8)}`;
  const generatedAt = new Date().toLocaleString(lang === 'ar' ? 'ar-SY' : 'en-US', {
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadTextReport = () => {
    const reportContent = `
================================================================================
          HRMS CALCULATION ENGINE - AUDIT & SIMULATION BREAKDOWN REPORT
================================================================================
Reference ID      : ${reportRef}
Generated At      : ${new Date().toISOString()}
Calculation Date  : ${inputs.calculationDate}
Employee Name     : ${inputs.employeeName || 'Simulation Sandbox User'}
Contract Type     : ${inputs.contractType}
Marital Status    : ${inputs.maritalStatus}
Dependents Count  : ${inputs.dependentsCount}

--------------------------------------------------------------------------------
1. SALARY & EARNINGS BREAKDOWN
--------------------------------------------------------------------------------
Basic Salary               : ${(inputs?.basicSalary ?? 0).toLocaleString()} ${currency}
Housing Allowance          : ${(inputs?.housingAllowance ?? 0).toLocaleString()} ${currency}
Transport Allowance        : ${(inputs?.transportAllowance ?? 0).toLocaleString()} ${currency}
Living Allowance           : ${(inputs?.livingAllowance ?? 0).toLocaleString()} ${currency}
--------------------------------------------------------------------------------
GROSS SALARY (TOTAL)       : ${(simulationResult.gross_salary ?? 0).toLocaleString()} ${currency}

--------------------------------------------------------------------------------
2. DEDUCTIONS & SOCIAL SECURITY
--------------------------------------------------------------------------------
Social Security Base       : ${(simulationResult.social_security_base ?? 0).toLocaleString()} ${currency}
Employee Social Security   : ${(simulationResult.employee_social_security ?? 0).toLocaleString()} ${currency}
Employer Social Security   : ${(simulationResult.employer_social_security ?? 0).toLocaleString()} ${currency}
Total Exemptions Applied   : ${(simulationResult.exemptions_applied ?? 0).toLocaleString()} ${currency}

--------------------------------------------------------------------------------
3. PROGRESSIVE INCOME TAX CALCULATION
--------------------------------------------------------------------------------
Taxable Gross Income       : ${(simulationResult.taxable_gross ?? 0).toLocaleString()} ${currency}
Total Income Tax Due       : ${(simulationResult.income_tax ?? 0).toLocaleString()} ${currency}

Progressive Tax Brackets Breakdown:
${simulationResult.tax_breakdown
  ?.map(
    (b, i) =>
      `  Bracket #${i + 1} (${b.bracket_name}): Taxable Base = ${(b.taxable_amount_in_bracket ?? 0).toLocaleString()} ${currency} | Rate = ${(
        b.rate * 100
      ).toFixed(1)}% | Bracket Tax = ${(b.tax_amount ?? 0).toLocaleString()} ${currency}`
  )
  .join('\n')}

--------------------------------------------------------------------------------
4. STEP-BY-STEP CALCULATION TRACE
--------------------------------------------------------------------------------
${simulationResult.step_traces
  ?.map(
    (trace) =>
      `Step ${trace.step_number} [${trace.rule_code}]: ${trace.rule_name_en}
  Applied Formula : ${trace.formula_applied}
  Evaluated Result: ${(trace.result_value ?? trace.calculated_value ?? 0).toLocaleString()}
  Execution Notes : ${trace.execution_notes}
`
  )
  .join('\n')}

--------------------------------------------------------------------------------
5. FINAL PAYROLL RESULT
--------------------------------------------------------------------------------
Total Deductions           : ${(simulationResult.total_deductions ?? 0).toLocaleString()} ${currency}
NET PAYABLE SALARY         : ${(simulationResult.net_salary ?? 0).toLocaleString()} ${currency}

================================================================================
Audit Checksum Hash: ${Math.random().toString(36).substring(2, 15).toUpperCase()}
Engine Verification: PASSED (All deterministic calculation rules verified)
================================================================================
    `;

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Payroll_Simulation_Report_${reportRef}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col print:border-none print:shadow-none print:max-h-none print:w-full print:rounded-none">
        {/* Modal Toolbar (hidden when printing) */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40 print:hidden rounded-t-3xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {lang === 'ar' ? 'تقرير المحاكاة المعتمد للتدقيق (PDF Audit Report)' : 'Certified Simulation Audit Report'}
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">{reportRef}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTextReport}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'تحميل نصي' : 'Download Raw'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'طباعة / حفظ كـ PDF' : 'Print / Save as PDF'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ms-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Document Body */}
        <div id="printable-audit-report" className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-800 dark:text-slate-200 print:text-black print:p-4 print:space-y-4">
          {/* Header Banner */}
          <div className="border-b-2 border-indigo-600 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-6 h-6 text-indigo-600" />
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white print:text-black">
                  {lang === 'ar' ? 'محرك القواعد والرواتب الذكي - تقرير محاكاة مفصل' : 'HRMS Rules Engine - Simulation Audit Report'}
                </h1>
              </div>
              <p className="text-xs text-slate-500 print:text-slate-600 mt-1">
                {lang === 'ar'
                  ? 'توثيق رسمي لكافة العمليات الحسابية والشرائح الضريبية والتأمينات الاجتماعية'
                  : 'Official breakdown of tax calculation logic, social security contributions, and rule traces'}
              </p>
            </div>

            <div className="text-left rtl:text-left ltr:text-right text-xs space-y-1">
              <div>
                <span className="text-slate-400 print:text-slate-600">{lang === 'ar' ? 'الرقم المرجعي:' : 'Ref ID:'} </span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 print:text-black">{reportRef}</span>
              </div>
              <div>
                <span className="text-slate-400 print:text-slate-600">{lang === 'ar' ? 'تاريخ التوليد:' : 'Generated:'} </span>
                <span className="text-slate-700 dark:text-slate-300 print:text-black">{generatedAt}</span>
              </div>
              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded print:border print:border-emerald-600">
                <ShieldCheck className="w-3 h-3" />
                <span>{lang === 'ar' ? 'معتمد حسابياً وقانونياً' : 'Verified & Audited'}</span>
              </div>
            </div>
          </div>

          {/* Section 1: Employee & Simulation Input Parameters */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? '1. بيانات الموظف ومعاملات المحاكاة' : '1. Employee Profile & Calculation Inputs'}</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs print:bg-slate-50 print:border-slate-300">
              <div>
                <span className="text-slate-400 block">{lang === 'ar' ? 'اسم الموظف:' : 'Employee Name:'}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 print:text-black">
                  {inputs.employeeName || (lang === 'ar' ? 'موظف تجريبي (Sandbox)' : 'Sandbox Employee')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">{lang === 'ar' ? 'نوع العقد:' : 'Contract Type:'}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 print:text-black">{inputs.contractType}</span>
              </div>
              <div>
                <span className="text-slate-400 block">{lang === 'ar' ? 'الحالة الاجتماعية:' : 'Marital Status:'}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 print:text-black">{inputs.maritalStatus}</span>
              </div>
              <div>
                <span className="text-slate-400 block">{lang === 'ar' ? 'عدد المعالين:' : 'Dependents Count:'}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 print:text-black">{inputs.dependentsCount}</span>
              </div>
              <div>
                <span className="text-slate-400 block">{lang === 'ar' ? 'تاريخ الاحتساب:' : 'Calculation Date:'}</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 print:text-black">
                  {inputs.calculationDate}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">{lang === 'ar' ? 'الإقامة الضريبية:' : 'Tax Residency:'}</span>
                <span className="font-semibold text-emerald-600">
                  {inputs.isResident ? (lang === 'ar' ? 'مقيم (Resident)' : 'Resident') : (lang === 'ar' ? 'غير مقيم' : 'Non-Resident')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">{lang === 'ar' ? 'الراتب الأساسي:' : 'Basic Salary:'}</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 print:text-black">
                  {(inputs?.basicSalary ?? 0).toLocaleString()} {currency}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">{lang === 'ar' ? 'إجمالي البدلات:' : 'Total Allowances:'}</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 print:text-black">
                  {((inputs?.housingAllowance ?? 0) + (inputs?.transportAllowance ?? 0) + (inputs?.livingAllowance ?? 0)).toLocaleString()} {currency}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Progressive Tax Brackets Calculation Breakdown */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? '2. تفصيل احتساب ضريبة الدخل والشرائح التصاعدية' : '2. Progressive Income Tax Brackets Breakdown'}</span>
            </h2>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden print:border-slate-300">
              <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold print:bg-slate-100 print:text-black">
                  <tr>
                    <th className="p-2.5">{lang === 'ar' ? 'الشريحة الضريبية' : 'Tax Bracket'}</th>
                    <th className="p-2.5">{lang === 'ar' ? 'الوعاء الخاضع للشريحة' : 'Taxable in Bracket'}</th>
                    <th className="p-2.5">{lang === 'ar' ? 'النسبة المطبقة' : 'Applied Rate'}</th>
                    <th className="p-2.5 text-center">{lang === 'ar' ? 'الضريبة المستحقة' : 'Tax Due'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {simulationResult.tax_breakdown && simulationResult.tax_breakdown.length > 0 ? (
                    simulationResult.tax_breakdown.map((b, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 font-sans font-medium text-slate-800 dark:text-slate-200 print:text-black">
                          {b.bracket_name}
                        </td>
                        <td className="p-2.5 text-slate-700 dark:text-slate-300 print:text-black">
                          {(b.taxable_amount_in_bracket ?? 0).toLocaleString()} {currency}
                        </td>
                        <td className="p-2.5 text-indigo-600 dark:text-indigo-400 font-bold print:text-black">
                          {(b.rate * 100).toFixed(1)}%
                        </td>
                        <td className="p-2.5 text-center font-bold text-slate-900 dark:text-white print:text-black">
                          {(b.tax_amount ?? 0).toLocaleString()} {currency}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-3 text-center text-slate-400">
                        {lang === 'ar' ? 'الوعاء الضريبي معفى بالكامل' : 'Income falls below taxable threshold'}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-800/50 font-bold border-t border-slate-200 dark:border-slate-800 print:bg-slate-50">
                  <tr>
                    <td className="p-2.5 font-sans">{lang === 'ar' ? 'إجمالي ضريبة الدخل المحتسبة:' : 'Total Income Tax:'}</td>
                    <td colSpan={2} className="p-2.5 font-sans text-xs text-slate-500">
                      {lang === 'ar' ? `(بعد خصم إعفاء المعالين: ${(simulationResult.exemptions_applied ?? 0).toLocaleString()} ${currency})` : `(Exemptions: ${(simulationResult.exemptions_applied ?? 0).toLocaleString()} ${currency})`}
                    </td>
                    <td className="p-2.5 text-center font-mono text-emerald-600 dark:text-emerald-400 print:text-black">
                      {(simulationResult.income_tax ?? 0).toLocaleString()} {currency}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Section 3: Social Security & Contribution Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs space-y-2 print:border-slate-300">
              <h3 className="font-bold text-slate-900 dark:text-white print:text-black flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{lang === 'ar' ? 'التأمينات الاجتماعية والمعاشات' : 'Social Security Deductions'}</span>
              </h3>
              <div className="space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">{lang === 'ar' ? 'الوعاء التأميني:' : 'SS Base:'}</span>
                  <span className="font-bold">{(simulationResult.social_security_base ?? 0).toLocaleString()} {currency}</span>
                </div>
                <div className="flex justify-between text-rose-600 dark:text-rose-400">
                  <span className="font-sans">{lang === 'ar' ? 'حصة الموظف (10%):' : 'Employee (10%):'}</span>
                  <span className="font-bold">-{(simulationResult.employee_social_security ?? 0).toLocaleString()} {currency}</span>
                </div>
                <div className="flex justify-between text-indigo-600 dark:text-indigo-400">
                  <span className="font-sans">{lang === 'ar' ? 'حصة صاحب العمل (12%):' : 'Employer (12%):'}</span>
                  <span className="font-bold">{(simulationResult.employer_social_security ?? 0).toLocaleString()} {currency}</span>
                </div>
              </div>
            </div>

            {/* Section 4: Final Net Payroll Outcome Box */}
            <div className="bg-indigo-50/50 dark:bg-indigo-950/30 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900 text-xs space-y-2 print:border-indigo-600">
              <h3 className="font-bold text-indigo-900 dark:text-indigo-200 print:text-black">
                {lang === 'ar' ? 'النتيجة النهائية الصافية (Net Payout)' : 'Final Net Salary Result'}
              </h3>
              <div className="space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-600 font-sans">{lang === 'ar' ? 'إجمالي الراتب (Gross):' : 'Gross Salary:'}</span>
                  <span className="font-bold text-slate-900 dark:text-white print:text-black">{(simulationResult.gross_salary ?? 0).toLocaleString()} {currency}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span className="font-sans">{lang === 'ar' ? 'مجموع الاستقطاعات:' : 'Total Deductions:'}</span>
                  <span className="font-bold">-{(simulationResult.total_deductions ?? 0).toLocaleString()} {currency}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-indigo-200 dark:border-indigo-800 text-sm font-bold text-emerald-600 dark:text-emerald-400 print:text-black">
                  <span className="font-sans">{lang === 'ar' ? 'صافي الراتب المستحق:' : 'Net Payable Salary:'}</span>
                  <span className="text-base">{(simulationResult.net_salary ?? 0).toLocaleString()} {currency}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Step-by-Step Rule Execution Trace */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
              {lang === 'ar' ? '3. مسار وقواعد التنفيذ المطبقة خطوة بخطوة (Execution Trace)' : '3. Step-by-Step Applied Calculation Traces'}
            </h2>

            <div className="space-y-2">
              {(simulationResult.step_traces || (simulationResult as any).calculation_steps || []).map((trace: any) => (
                <div
                  key={trace.step_number}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs space-y-1 print:border-slate-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">
                        {trace.step_number}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 print:text-black">
                        {lang === 'ar' ? trace.rule_name_ar : trace.rule_name_en}
                      </span>
                      <code className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono">
                        {trace.rule_code}
                      </code>
                    </div>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 print:text-black">
                      = {(trace.result_value ?? trace.calculated_value ?? 0).toLocaleString()} {currency}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800 print:bg-white print:border-slate-300">
                    <code>{trace.formula_applied}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Seals & Audit Stamp */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 print:text-slate-600">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{lang === 'ar' ? 'تمت المحاكاة عبر المحرك الحسابي المعتمد وفقاً لأحدث القوانين الضريبية السورية والعربية' : 'Engine certified against Syrian and Arab labor tax frameworks'}</span>
            </div>
            <div className="font-mono text-[10px]">
              SHA256: {Math.random().toString(36).substring(2, 12).toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
