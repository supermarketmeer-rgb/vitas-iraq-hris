import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import {
  Sparkles,
  Calculator,
  UserCheck,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  Shield,
  Percent,
  Receipt,
  FileCheck,
  Sliders,
  ChevronDown,
  Download,
  FileText,
  Printer,
} from 'lucide-react';
import { SimulationRequest, SimulationResponse } from '../types.js';
import { SimulationPdfReportModal } from './SimulationPdfReportModal.js';

export const RuleSimulatorView: React.FC = () => {
  const { lang, t, employees, showNotification, refreshData } = useApp();

  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [basicSalary, setBasicSalary] = useState<number>(1800000);
  const [housingAllowance, setHousingAllowance] = useState<number>(350000);
  const [transportAllowance, setTransportAllowance] = useState<number>(150000);
  const [livingAllowance, setLivingAllowance] = useState<number>(100000);
  const [dependentsCount, setDependentsCount] = useState<number>(3);
  const [isResident, setIsResident] = useState<boolean>(true);
  const [maritalStatus, setMaritalStatus] = useState<'SINGLE' | 'MARRIED' | 'MARRIED_WITH_DEPENDENTS'>('MARRIED_WITH_DEPENDENTS');
  const [contractType, setContractType] = useState<'PERMANENT' | 'TEMPORARY' | 'PART_TIME' | 'SPECIAL'>('PERMANENT');
  const [calculationDate, setCalculationDate] = useState<string>('2026-08-01');

  const [simulationResult, setSimulationResult] = useState<SimulationResponse | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const currency = t('currency');

  const handleSelectEmployee = (empId: string) => {
    setSelectedEmpId(empId);
    const emp = employees.find((e) => e.id === empId);
    if (emp) {
      setBasicSalary(emp.basic_salary);
      setHousingAllowance(emp.housing_allowance);
      setTransportAllowance(emp.transport_allowance);
      setLivingAllowance(emp.living_allowance);
      setDependentsCount(emp.dependents_count);
      setIsResident(emp.is_resident);
      setMaritalStatus(emp.marital_status);
      setContractType(emp.contract_type);
    }
  };

  const handleRunSimulation = async () => {
    try {
      setIsSimulating(true);
      const reqPayload: SimulationRequest = {
        employee_id: selectedEmpId || undefined,
        basic_salary: Number(basicSalary),
        allowances: {
          housing: Number(housingAllowance),
          transport: Number(transportAllowance),
          living: Number(livingAllowance),
        },
        dependents_count: Number(dependentsCount),
        marital_status: maritalStatus,
        is_resident: isResident,
        contract_type: contractType,
        calculation_date: calculationDate,
      };

      const res = await fetch('/api/tax-module/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqPayload),
      }).then((r) => r.json());

      setSimulationResult(res);
      showNotification(
        lang === 'ar' ? 'تمت عملية المحاكاة والاحتساب بنجاح' : 'Simulation and calculation trace completed successfully'
      );
    } catch (err) {
      showNotification('Simulation error', 'error');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSaveAsPayrollSnapshot = async () => {
    if (!selectedEmpId) {
      showNotification(
        lang === 'ar' ? 'يرجى اختيار موظف لحفظ السجل الدائم' : 'Please select an HR employee to record permanent snapshot',
        'info'
      );
      return;
    }
    try {
      const res = await fetch('/api/tax-module/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: selectedEmpId,
          payroll_date: calculationDate,
        }),
      }).then((r) => r.json());

      if (res.success) {
        showNotification(
          lang === 'ar' ? 'تم حفظ سجل الراتب الدائم (Snapshot) بنجاح' : 'Immutable calculation snapshot archived'
        );
        refreshData();
      }
    } catch (err) {
      showNotification('Save failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            {t('simulator_title')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('simulator_desc')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {simulationResult && (
            <button
              onClick={() => setIsPdfModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 transition-all shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{lang === 'ar' ? 'تحميل التقرير (PDF)' : 'Download Report'}</span>
            </button>
          )}

          <button
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 transition-all shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Calculator className="w-4 h-4" />
            <span>{isSimulating ? 'Calculating...' : t('calculate_and_trace')}</span>
          </button>
        </div>
      </div>

      {/* Input Sandbox Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Input Parameters Panel */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-600" />
              <span>{lang === 'ar' ? 'مدخلات الراتب والموظف' : 'Salary & Employee Inputs'}</span>
            </h3>

            {/* Quick load from employee select */}
            <select
              value={selectedEmpId}
              onChange={(e) => handleSelectEmployee(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 focus:outline-none"
            >
              <option value="">{t('load_employee')}...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.employee_number} - {lang === 'ar' ? emp.name_ar : emp.name_en}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3 text-xs">
            {/* Basic Salary */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {t('basic_salary')} ({currency})
              </label>
              <input
                type="number"
                value={basicSalary}
                onChange={(e) => setBasicSalary(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              />
            </div>

            {/* Allowances Breakdown */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {t('allowances')}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block">{t('housing_allowance')}</span>
                  <input
                    type="number"
                    value={housingAllowance}
                    onChange={(e) => setHousingAllowance(Number(e.target.value))}
                    className="w-full px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">{t('transport_allowance')}</span>
                  <input
                    type="number"
                    value={transportAllowance}
                    onChange={(e) => setTransportAllowance(Number(e.target.value))}
                    className="w-full px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">{t('living_allowance')}</span>
                  <input
                    type="number"
                    value={livingAllowance}
                    onChange={(e) => setLivingAllowance(Number(e.target.value))}
                    className="w-full px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Dependents & Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {t('dependents_count')}
                </label>
                <input
                  type="number"
                  min="0"
                  max="15"
                  value={dependentsCount}
                  onChange={(e) => setDependentsCount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {t('calculation_date')}
                </label>
                <input
                  type="date"
                  value={calculationDate}
                  onChange={(e) => setCalculationDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs"
                />
              </div>
            </div>

            {/* Marital & Contract */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {lang === 'ar' ? 'الحالة الاجتماعية' : 'Marital Status'}
                </label>
                <select
                  value={maritalStatus}
                  onChange={(e: any) => setMaritalStatus(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="SINGLE">{lang === 'ar' ? 'أعزب / عزباء' : 'Single'}</option>
                  <option value="MARRIED">{lang === 'ar' ? 'متزوج (بدون أطفال)' : 'Married'}</option>
                  <option value="MARRIED_WITH_DEPENDENTS">
                    {lang === 'ar' ? 'متزوج ولديه أطفال' : 'Married with Dependents'}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {lang === 'ar' ? 'نوع العقد' : 'Contract Type'}
                </label>
                <select
                  value={contractType}
                  onChange={(e: any) => setContractType(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="PERMANENT">{lang === 'ar' ? 'عقد دائم (مثبت)' : 'Permanent'}</option>
                  <option value="TEMPORARY">{lang === 'ar' ? 'عقد مؤقت' : 'Temporary'}</option>
                  <option value="PART_TIME">{lang === 'ar' ? 'دوام جزئي' : 'Part-time'}</option>
                </select>
              </div>
            </div>

            {/* Run Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleRunSimulation}
                className="w-full py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <Calculator className="w-4 h-4" />
                <span>{t('calculate_and_trace')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Simulation Results & Trace (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {simulationResult ? (
            <>
              {/* Summary KPIs Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                  <span className="text-[10px] text-slate-400 block">{t('total_gross_salaries')}</span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {simulationResult.summary.gross_salary.toLocaleString()} {currency}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">{t('employee_social_security')}</span>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {simulationResult.summary.employee_social_security.toLocaleString()} {currency}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">{t('total_income_tax')}</span>
                  <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
                    {simulationResult.summary.income_tax.toLocaleString()} {currency}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">{t('total_net_payout')}</span>
                  <div className="text-base font-extrabold text-teal-600 dark:text-teal-400">
                    {simulationResult.summary.net_salary.toLocaleString()} {currency}
                  </div>
                </div>
              </div>

              {/* Progressive Brackets Breakdown */}
              {simulationResult.bracket_breakdown && simulationResult.bracket_breakdown.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                  <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-500" />
                    {t('progressive_brackets_breakdown')}
                  </h3>

                  <div className="space-y-2">
                    {simulationResult.bracket_breakdown.map((b) => (
                      <div
                        key={b.bracket_order}
                        className="p-3 rounded-xl border border-amber-200/70 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {lang === 'ar' ? b.name_ar : b.name_en} ({b.rate}%)
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {lang === 'ar' ? 'المبلغ المشمول بالشريحة:' : 'Taxable in Tier:'}{' '}
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                              {b.taxable_amount.toLocaleString()} {currency}
                            </span>
                          </div>
                        </div>

                        <div className="text-end">
                          <span className="text-[10px] text-slate-400 block">{lang === 'ar' ? 'الضريبة المستحقة' : 'Tax'}</span>
                          <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                            {b.tax_amount.toLocaleString()} {currency}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step-by-Step Trace */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {t('step_by_step_trace')}
                  </h3>

                  {selectedEmpId && (
                    <button
                      onClick={handleSaveAsPayrollSnapshot}
                      className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200 transition-colors"
                    >
                      {lang === 'ar' ? 'اعتماد وحفظ كسجل دائم (Snapshot)' : 'Save as Final Snapshot'}
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {simulationResult.step_traces.map((trace) => (
                    <div
                      key={trace.step_number}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">
                            {trace.step_number}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {lang === 'ar' ? trace.rule_name_ar : trace.rule_name_en}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {trace.output_variable}
                          </span>
                        </div>

                        <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                          {trace.calculated_value.toLocaleString()} {currency}
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-600 dark:text-slate-300 font-mono bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                        {lang === 'ar' ? trace.explanation_ar : trace.explanation_en}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-12 text-center text-slate-400 space-y-3">
              <Calculator className="w-12 h-12 mx-auto text-emerald-600/40" />
              <div className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                {lang === 'ar' ? 'جاهز لتشغيل المحاكي وتتبع الخطوات' : 'Ready to Run Rule Simulator'}
              </div>
              <p className="text-xs max-w-md mx-auto text-slate-500">
                {lang === 'ar'
                  ? 'اضغط على "احسب وتتبع الخطوات" بالأعلى لمشاهدة تفصيل الحساب خطوة بخطوة وتأكيد تطبيق القواعد والشرائح.'
                  : 'Click "Calculate & Trace Steps" to inspect complete progressive tax breakdowns and formula execution steps.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* PDF Simulation & Audit Report Modal */}
      <SimulationPdfReportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        simulationResult={simulationResult}
        inputs={{
          employeeName:
            employees.find((e) => e.id === selectedEmpId)?.name_ar ||
            employees.find((e) => e.id === selectedEmpId)?.name_en,
          employeeCode: employees.find((e) => e.id === selectedEmpId)?.employee_number,
          basicSalary: Number(basicSalary),
          housingAllowance: Number(housingAllowance),
          transportAllowance: Number(transportAllowance),
          livingAllowance: Number(livingAllowance),
          dependentsCount: Number(dependentsCount),
          maritalStatus,
          contractType,
          isResident,
          calculationDate,
        }}
      />
    </div>
  );
};
