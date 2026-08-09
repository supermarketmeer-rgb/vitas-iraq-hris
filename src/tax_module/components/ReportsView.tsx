import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import {
  FileText,
  Download,
  Printer,
  Shield,
  Percent,
  Calendar,
  Layers,
  ArrowRightLeft,
  CheckCircle2,
  Filter,
  FileSpreadsheet,
  FileCheck,
  Check,
  Building,
  DollarSign,
  UserCheck,
  X,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { PayrollCalculationSnapshot } from '../types.js';

export const ReportsView: React.FC = () => {
  const { lang, t, snapshots, activePeriod, setSelectedSnapshot, showNotification } = useApp();

  const [activeReportTab, setActiveReportTab] = useState<'social_security' | 'income_tax' | 'monthly_summary' | 'comparator'>('social_security');

  const [compSnap1, setCompSnap1] = useState<string>('');
  const [compSnap2, setCompSnap2] = useState<string>('');

  // Data Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportType, setExportType] = useState<'all' | 'social_security' | 'income_tax' | 'summary'>('all');
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');
  const [selectedPeriod, setSelectedPeriod] = useState<string>(activePeriod || 'ALL');
  const [isPdfPrintPreviewOpen, setIsPdfPrintPreviewOpen] = useState<boolean>(false);

  // Column toggles for export customization
  const [exportColumns, setExportColumns] = useState<Record<string, boolean>>({
    employee_number: true,
    employee_name: true,
    department: true,
    branch: true,
    gross_salary: true,
    ss_base: true,
    ss_employee: true,
    ss_employer: true,
    total_ss: true,
    tax_exemptions: true,
    taxable_income: true,
    income_tax: true,
    total_deductions: true,
    net_salary: true,
  });

  const currency = t('currency');

  const availablePeriods = Array.from(new Set(snapshots.map((s) => s.payroll_period))).sort().reverse();

  // Filter snapshots based on selected period in modal or active period
  const filteredSnapshots = snapshots.filter((s) => {
    if (s.status !== 'FINALIZED') return false;
    if (selectedPeriod === 'ALL') return true;
    return s.payroll_period === (selectedPeriod || activePeriod);
  });

  const activePeriodSnapshots = snapshots.filter(
    (s) => s.status === 'FINALIZED' && (activePeriod ? s.payroll_period === activePeriod : true)
  );

  const displaySnapshots = activePeriodSnapshots.length > 0 ? activePeriodSnapshots : snapshots.filter((s) => s.status === 'FINALIZED');

  // Generic CSV Exporter with UTF-8 BOM
  const handleExportCSV = (filename: string, rows: any[]) => {
    if (!rows.length) {
      showNotification('No data available to export', 'error');
      return;
    }
    const headers = Object.keys(rows[0]).join(',');
    const values = rows
      .map((r) =>
        Object.values(r)
          .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + headers + '\n' + values;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${selectedPeriod === 'ALL' ? 'ALL' : selectedPeriod || activePeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification(
      lang === 'ar' ? 'تم تنزيل ملف CSV بنجاح' : 'CSV file downloaded successfully',
      'success'
    );
  };

  // Build rows for Export Modal execution
  const executeCustomExport = () => {
    const dataToExport = filteredSnapshots.map((s) => {
      const row: Record<string, any> = {};
      if (exportColumns.employee_number) row['Employee Number'] = s.employee_number;
      if (exportColumns.employee_name) row['Employee Name'] = s.employee_name_ar;
      if (exportColumns.department) row['Department'] = s.department_name;
      if (exportColumns.branch) row['Branch'] = s.branch_name;
      if (exportColumns.gross_salary) row['Gross Salary'] = s.calculation_result.gross_salary;
      if (exportColumns.ss_base) row['SS Base'] = s.calculation_result.social_security_base;
      if (exportColumns.ss_employee) row['Employee SS'] = s.calculation_result.employee_social_security;
      if (exportColumns.ss_employer) row['Employer SS'] = s.calculation_result.employer_social_security;
      if (exportColumns.total_ss) row['Total SS'] = s.calculation_result.total_social_security;
      if (exportColumns.tax_exemptions) row['Tax Exemptions'] = s.calculation_result.tax_exemptions;
      if (exportColumns.taxable_income) row['Taxable Income'] = s.calculation_result.taxable_income;
      if (exportColumns.income_tax) row['Income Tax'] = s.calculation_result.income_tax;
      if (exportColumns.total_deductions) row['Total Deductions'] = s.calculation_result.total_deductions;
      if (exportColumns.net_salary) row['Net Salary'] = s.calculation_result.net_salary;
      return row;
    });

    if (exportFormat === 'csv') {
      handleExportCSV(`Payroll_Tax_SS_Export_${exportType}`, dataToExport);
      setIsExportModalOpen(false);
    } else {
      // PDF mode
      setIsExportModalOpen(false);
      setIsPdfPrintPreviewOpen(true);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const s1 = snapshots.find((s) => s.id === compSnap1);
  const s2 = snapshots.find((s) => s.id === compSnap2);

  // Aggregated figures for active period with safe null checks
  const totalGross = displaySnapshots.reduce((acc, s) => acc + (s.calculation_result?.gross_salary ?? 0), 0);
  const totalEmpSS = displaySnapshots.reduce((acc, s) => acc + (s.calculation_result?.employee_social_security ?? 0), 0);
  const totalEmprSS = displaySnapshots.reduce((acc, s) => acc + (s.calculation_result?.employer_social_security ?? 0), 0);
  const totalSS = totalEmpSS + totalEmprSS;
  const totalTax = displaySnapshots.reduce((acc, s) => acc + (s.calculation_result?.income_tax ?? 0), 0);
  const totalNet = displaySnapshots.reduce((acc, s) => acc + (s.calculation_result?.net_salary ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header & Report Selectors */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            {t('reports')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {lang === 'ar'
              ? 'تقارير الضريبة، اشتراكات الضمان، الكشوفات الشهرية المعتمدة، وأداة تصدير البيانات (Data Export CSV & PDF)'
              : 'Exportable tax deduction schedules, social security remittances, and multi-format CSV & PDF export utility'}
          </p>
        </div>

        {/* Tab Buttons & Global Export Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80">
            <button
              onClick={() => setActiveReportTab('social_security')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeReportTab === 'social_security'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {lang === 'ar' ? 'تقرير الضمان' : 'Social Security'}
            </button>
            <button
              onClick={() => setActiveReportTab('income_tax')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeReportTab === 'income_tax'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {lang === 'ar' ? 'تقرير ضريبة الدخل' : 'Income Tax'}
            </button>
            <button
              onClick={() => setActiveReportTab('monthly_summary')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeReportTab === 'monthly_summary'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {lang === 'ar' ? 'الملخص الشهري' : 'Monthly Summary'}
            </button>
            <button
              onClick={() => setActiveReportTab('comparator')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeReportTab === 'comparator'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {t('snapshot_comparator')}
            </button>
          </div>

          {/* Dedicated Data Export Hub Button */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'تصدير البيانات (Data Export)' : 'Data Export Utility'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1"
            title={t('print_report')}
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 1. Social Security Report */}
      {activeReportTab === 'social_security' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                {t('social_security_report')} - {activePeriod || 'All Periods'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {lang === 'ar' ? 'جدول استقطاعات الضمان الاجتماعي ومساهمة جهة العمل المعتمدة' : 'Official social security remittance schedule'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  handleExportCSV(
                    'Social_Security_Report',
                    displaySnapshots.map((s) => ({
                      EmployeeNumber: s.employee_number,
                      Name: s.employee_name_ar,
                      Department: s.department_name,
                      Gross: s.calculation_result.gross_salary,
                      Base: s.calculation_result.social_security_base,
                      EmployeeSS: s.calculation_result.employee_social_security,
                      EmployerSS: s.calculation_result.employer_social_security,
                      TotalSS: s.calculation_result.total_social_security,
                    }))
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'تصدير CSV' : 'Export CSV'}</span>
              </button>

              <button
                onClick={() => {
                  setExportType('social_security');
                  setIsPdfPrintPreviewOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'تنزيل / طباعة PDF' : 'PDF Statement'}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-start">{lang === 'ar' ? 'الموظف والرقم' : 'Employee'}</th>
                  <th className="p-3 text-start">{lang === 'ar' ? 'القسم والفرع' : 'Department'}</th>
                  <th className="p-3 text-end">{lang === 'ar' ? 'الراتب الإجمالي' : 'Gross Salary'}</th>
                  <th className="p-3 text-end">{lang === 'ar' ? 'وعاء الاشتراك الخاضع' : 'SS Base'}</th>
                  <th className="p-3 text-end">{lang === 'ar' ? 'استقطاع الموظف (5%)' : 'Emp (5%)'}</th>
                  <th className="p-3 text-end">{lang === 'ar' ? 'مساهمة جهة العمل (12%)' : 'Empr (12%)'}</th>
                  <th className="p-3 text-end">{lang === 'ar' ? 'إجمالي الاشتراك (17%)' : 'Total SS (17%)'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displaySnapshots.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {lang === 'ar' ? s.employee_name_ar : s.employee_name_en}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">{s.employee_number}</div>
                    </td>
                    <td className="p-3">
                      <div className="text-slate-700 dark:text-slate-300">{s.department_name}</div>
                      <div className="text-[10px] text-slate-400">{s.branch_name}</div>
                    </td>
                    <td className="p-3 text-end font-semibold text-slate-900 dark:text-white">
                      {s.calculation_result.gross_salary.toLocaleString()} {currency}
                    </td>
                    <td className="p-3 text-end font-semibold text-slate-700 dark:text-slate-300">
                      {s.calculation_result.social_security_base.toLocaleString()} {currency}
                    </td>
                    <td className="p-3 text-end font-bold text-emerald-600 dark:text-emerald-400">
                      {s.calculation_result.employee_social_security.toLocaleString()} {currency}
                    </td>
                    <td className="p-3 text-end font-bold text-purple-600 dark:text-purple-400">
                      {s.calculation_result.employer_social_security.toLocaleString()} {currency}
                    </td>
                    <td className="p-3 text-end font-bold text-teal-600 dark:text-teal-400">
                      {s.calculation_result.total_social_security.toLocaleString()} {currency}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50/80 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-800">
                <tr>
                  <td colSpan={2} className="p-3 text-slate-900 dark:text-white">
                    {lang === 'ar' ? 'الإجمالي العام للموظفين' : 'Total Aggregate'} ({displaySnapshots.length})
                  </td>
                  <td className="p-3 text-end text-slate-900 dark:text-white">
                    {totalGross.toLocaleString()} {currency}
                  </td>
                  <td className="p-3 text-end text-slate-700 dark:text-slate-300">-</td>
                  <td className="p-3 text-end text-emerald-600 dark:text-emerald-400">
                    {totalEmpSS.toLocaleString()} {currency}
                  </td>
                  <td className="p-3 text-end text-purple-600 dark:text-purple-400">
                    {totalEmprSS.toLocaleString()} {currency}
                  </td>
                  <td className="p-3 text-end text-teal-600 dark:text-teal-400 font-extrabold">
                    {totalSS.toLocaleString()} {currency}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 2. Income Tax Report */}
      {activeReportTab === 'income_tax' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Percent className="w-4 h-4 text-amber-500" />
                {t('income_tax_report')} - {activePeriod || 'All Periods'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {lang === 'ar' ? 'كشف الاستقطاع الضريبي التصاعدي بالشرائح والإعفاءات القانونية' : 'Progressive tax bracket calculation schedule'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  handleExportCSV(
                    'Income_Tax_Report',
                    displaySnapshots.map((s) => ({
                      EmployeeNumber: s.employee_number,
                      Name: s.employee_name_ar,
                      Gross: s.calculation_result.gross_salary,
                      Exemptions: s.calculation_result.tax_exemptions,
                      TaxableIncome: s.calculation_result.taxable_income,
                      TaxAmount: s.calculation_result.income_tax,
                      NetSalary: s.calculation_result.net_salary,
                    }))
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'تصدير CSV' : 'Export CSV'}</span>
              </button>

              <button
                onClick={() => {
                  setExportType('income_tax');
                  setIsPdfPrintPreviewOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'تنزيل / طباعة PDF' : 'PDF Statement'}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-start">{lang === 'ar' ? 'الموظف والرقم' : 'Employee'}</th>
                  <th className="p-3 text-end">{lang === 'ar' ? 'الراتب الإجمالي' : 'Gross'}</th>
                  <th className="p-3 text-end">{lang === 'ar' ? 'الإعفاءات الضريبية' : 'Exemptions'}</th>
                  <th className="p-3 text-end">{lang === 'ar' ? 'الدخل الخاضع للضريبة' : 'Taxable Base'}</th>
                  <th className="p-3 text-end">{lang === 'ar' ? 'ضريبة الدخل' : 'Tax Amount'}</th>
                  <th className="p-3 text-end">{lang === 'ar' ? 'صافي الراتب' : 'Net Salary'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displaySnapshots.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {lang === 'ar' ? s.employee_name_ar : s.employee_name_en}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">{s.employee_number}</div>
                    </td>
                    <td className="p-3 text-end font-semibold text-slate-900 dark:text-white">
                      {s.calculation_result.gross_salary.toLocaleString()} {currency}
                    </td>
                    <td className="p-3 text-end font-semibold text-blue-600 dark:text-blue-400">
                      {s.calculation_result.tax_exemptions.toLocaleString()} {currency}
                    </td>
                    <td className="p-3 text-end font-semibold text-slate-700 dark:text-slate-300">
                      {s.calculation_result.taxable_income.toLocaleString()} {currency}
                    </td>
                    <td className="p-3 text-end font-bold text-amber-600 dark:text-amber-400">
                      {s.calculation_result.income_tax.toLocaleString()} {currency}
                    </td>
                    <td className="p-3 text-end font-bold text-teal-600 dark:text-teal-400">
                      {s.calculation_result.net_salary.toLocaleString()} {currency}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50/80 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-800">
                <tr>
                  <td className="p-3 text-slate-900 dark:text-white">
                    {lang === 'ar' ? 'الإجمالي العام' : 'Total Aggregate'} ({displaySnapshots.length})
                  </td>
                  <td className="p-3 text-end text-slate-900 dark:text-white">
                    {totalGross.toLocaleString()} {currency}
                  </td>
                  <td className="p-3 text-end text-blue-600 dark:text-blue-400">-</td>
                  <td className="p-3 text-end text-slate-700 dark:text-slate-300">-</td>
                  <td className="p-3 text-end text-amber-600 dark:text-amber-400 font-extrabold">
                    {totalTax.toLocaleString()} {currency}
                  </td>
                  <td className="p-3 text-end text-teal-600 dark:text-teal-400 font-extrabold">
                    {totalNet.toLocaleString()} {currency}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 3. Monthly Consolidated Summary */}
      {activeReportTab === 'monthly_summary' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {lang === 'ar' ? 'الكشف المالي والضريبي الشامل للشهر' : 'Consolidated Monthly Remittance Statement'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {lang === 'ar'
                  ? 'إجمالي التزامات الشركة، مستحقات دائرة التقاعد والضمان الاجتماعي، ومستحقات الهيئة العامة للضرائب'
                  : 'Summary of company liabilities, social security remittances, and tax withholding'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  handleExportCSV(
                    'Consolidated_Payroll_Summary',
                    displaySnapshots.map((s) => ({
                      EmployeeNumber: s.employee_number,
                      Name: s.employee_name_ar,
                      Gross: s.calculation_result.gross_salary,
                      TotalSS: s.calculation_result.total_social_security,
                      IncomeTax: s.calculation_result.income_tax,
                      TotalDeductions: s.calculation_result.total_deductions,
                      NetSalary: s.calculation_result.net_salary,
                    }))
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'تصدير CSV' : 'Export CSV'}</span>
              </button>

              <button
                onClick={() => {
                  setExportType('summary');
                  setIsPdfPrintPreviewOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'تنزيل / طباعة PDF' : 'PDF Statement'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 space-y-1">
              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">
                {lang === 'ar' ? 'مستحقات صندوق الضمان الاجتماعي' : 'Social Security Remittance'}
              </span>
              <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400">
                {totalSS.toLocaleString()} {currency}
              </div>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                {lang === 'ar' ? 'تشمل حصة الموظف (5%) ومساهمة جهة العمل (12%)' : 'Combined employee & employer share'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 space-y-1">
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase">
                {lang === 'ar' ? 'مستحقات هيئة ضريبة الدخل' : 'Income Tax Remittance'}
              </span>
              <div className="text-xl font-extrabold text-amber-700 dark:text-amber-400">
                {totalTax.toLocaleString()} {currency}
              </div>
              <p className="text-[10px] text-amber-600 dark:text-amber-400">
                {lang === 'ar' ? 'الضريبة المستقطعة من الرواتب' : 'Total monthly tax withheld'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-900/60 space-y-1">
              <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 uppercase">
                {lang === 'ar' ? 'صافي التحويلات المصرفية للرواتب' : 'Net Bank Payroll Disbursement'}
              </span>
              <div className="text-xl font-extrabold text-teal-700 dark:text-teal-400">
                {totalNet.toLocaleString()} {currency}
              </div>
              <p className="text-[10px] text-teal-600 dark:text-teal-400">
                {lang === 'ar' ? 'المبلغ الصافي المحول لحسابات الموظفين' : 'Total net take-home salary'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. Snapshot Version Comparator */}
      {activeReportTab === 'comparator' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
              {t('snapshot_comparator')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {lang === 'ar'
                ? 'قارن نتائج عمليتي احتساب مختلفتين، أو قارن نتيجة راتب موظف قبل وبعد تغيير إصدار القاعدة.'
                : 'Compare two historical calculation snapshots side-by-side to audit formula or rule version changes.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {lang === 'ar' ? 'اختر السجل الأول (Snapshot A):' : 'Select Snapshot A:'}
              </label>
              <select
                value={compSnap1}
                onChange={(e) => setCompSnap1(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              >
                <option value="">{lang === 'ar' ? '-- اختر سجلاً --' : '-- Choose record --'}</option>
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.payroll_period} | {s.employee_name_ar} (Net: {s.calculation_result.net_salary.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {lang === 'ar' ? 'اختر السجل الثاني (Snapshot B):' : 'Select Snapshot B:'}
              </label>
              <select
                value={compSnap2}
                onChange={(e) => setCompSnap2(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              >
                <option value="">{lang === 'ar' ? '-- اختر سجلاً --' : '-- Choose record --'}</option>
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.payroll_period} | {s.employee_name_ar} (Net: {s.calculation_result.net_salary.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {s1 && s2 && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 dark:bg-slate-800/80 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3 text-start">{lang === 'ar' ? 'بند الحساب' : 'Metric'}</th>
                    <th className="p-3 text-end font-mono">
                      {s1.employee_name_ar} ({s1.payroll_period})
                    </th>
                    <th className="p-3 text-end font-mono">
                      {s2.employee_name_ar} ({s2.payroll_period})
                    </th>
                    <th className="p-3 text-end">{lang === 'ar' ? 'الفارق' : 'Delta'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="p-3 font-semibold">{t('total_gross_salaries')}</td>
                    <td className="p-3 text-end">{(s1?.calculation_result?.gross_salary ?? 0).toLocaleString()}</td>
                    <td className="p-3 text-end">{(s2?.calculation_result?.gross_salary ?? 0).toLocaleString()}</td>
                    <td className="p-3 text-end font-bold">
                      {((s2?.calculation_result?.gross_salary ?? 0) - (s1?.calculation_result?.gross_salary ?? 0)).toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold">{t('employee_social_security')}</td>
                    <td className="p-3 text-end text-emerald-600">
                      {(s1?.calculation_result?.employee_social_security ?? 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-end text-emerald-600">
                      {(s2?.calculation_result?.employee_social_security ?? 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-end font-bold">
                      {(
                        (s2?.calculation_result?.employee_social_security ?? 0) -
                        (s1?.calculation_result?.employee_social_security ?? 0)
                      ).toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold">{t('total_income_tax')}</td>
                    <td className="p-3 text-end text-amber-600">
                      {(s1?.calculation_result?.income_tax ?? 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-end text-amber-600">
                      {(s2?.calculation_result?.income_tax ?? 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-end font-bold">
                      {((s2?.calculation_result?.income_tax ?? 0) - (s1?.calculation_result?.income_tax ?? 0)).toLocaleString()}
                    </td>
                  </tr>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                    <td className="p-3 font-bold">{t('total_net_payout')}</td>
                    <td className="p-3 text-end font-bold text-teal-600">
                      {(s1?.calculation_result?.net_salary ?? 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-end font-bold text-teal-600">
                      {(s2?.calculation_result?.net_salary ?? 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-end font-extrabold text-teal-600">
                      {((s2?.calculation_result?.net_salary ?? 0) - (s1?.calculation_result?.net_salary ?? 0)).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* Interactive Data Export Hub Modal (CSV & PDF Options) */}
      {/* ========================================================================= */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Download className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {lang === 'ar' ? 'أداة تصدير البيانات (Data Export Utility)' : 'Data Export Utility'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {lang === 'ar' ? 'تصدير كشوفات الرواتب وحسابات الضرائب بصيغة CSV أو PDF' : 'Download payroll summaries and tax calculations as CSV or PDF'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. Format Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-900 dark:text-white block">
                {lang === 'ar' ? '1. اختر صيغة التصدير (Export Format):' : '1. Select Export Format:'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setExportFormat('csv')}
                  className={`p-3 rounded-xl border text-start flex items-center gap-3 transition-all ${
                    exportFormat === 'csv'
                      ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <FileSpreadsheet className={`w-5 h-5 ${exportFormat === 'csv' ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-xs font-bold">CSV Spreadsheet (.csv)</div>
                    <div className="text-[10px] text-slate-500">UTF-8 Excel compatible table</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat('pdf')}
                  className={`p-3 rounded-xl border text-start flex items-center gap-3 transition-all ${
                    exportFormat === 'pdf'
                      ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <Printer className={`w-5 h-5 ${exportFormat === 'pdf' ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-xs font-bold">PDF Document (.pdf)</div>
                    <div className="text-[10px] text-slate-500">Official statutory statement</div>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. Period Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-900 dark:text-white block">
                {lang === 'ar' ? '2. اختر الفترة المحاسبية (Payroll Period):' : '2. Select Payroll Period:'}
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
              >
                <option value="ALL">{lang === 'ar' ? 'جميع الفترات التاريخية (All Periods)' : 'All Historical Periods'}</option>
                {availablePeriods.map((p) => (
                  <option key={p} value={p}>
                    {p} {p === activePeriod ? `(${lang === 'ar' ? 'الشهر النشط' : 'Current Active'})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Column Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 dark:text-white">
                  {lang === 'ar' ? '3. اختر الأعمدة المتضمنة في التصدير:' : '3. Columns to Include:'}
                </label>
                <div className="flex items-center gap-2 text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      const allOn = Object.keys(exportColumns).reduce((acc, k) => ({ ...acc, [k]: true }), {});
                      setExportColumns(allOn);
                    }}
                    className="text-indigo-600 hover:underline"
                  >
                    Select All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                {Object.entries(exportColumns).map(([key, val]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={val}
                      onChange={(e) => setExportColumns((prev) => ({ ...prev, [key]: e.target.checked }))}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={executeCustomExport}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm inline-flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>
                  {exportFormat === 'csv'
                    ? lang === 'ar'
                      ? 'تنزيل ملف CSV الآن'
                      : 'Download CSV File'
                    : lang === 'ar'
                    ? 'فتح ومعاينة وثيقة PDF'
                    : 'Generate PDF Document'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Official Printable / PDF Document View */}
      {/* ========================================================================= */}
      {isPdfPrintPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto p-8 space-y-6 animate-in fade-in duration-150">
            {/* Action Bar (Not visible during print) */}
            <div className="print:hidden flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-600" />
                <span className="text-sm font-bold text-slate-900">
                  {lang === 'ar' ? 'معاينة الوثيقة الرسمية للطباعة أو التنزيل كـ PDF' : 'Official PDF Document Preview'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'طباعة / حفظ كـ PDF' : 'Print / Save as PDF'}</span>
                </button>
                <button
                  onClick={() => setIsPdfPrintPreviewOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Official Statutory Document Header */}
            <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
              <div className="text-xs font-bold tracking-widest text-slate-500 uppercase">
                {lang === 'ar' ? 'جمهورية العراق - وزارة العمل والشؤون الاجتماعية / الهيئة العامة للضرائب' : 'Republic of Iraq - Ministry of Labor & Social Affairs / General Commission for Taxes'}
              </div>
              <h1 className="text-lg font-extrabold text-slate-900">
                {lang === 'ar'
                  ? 'كشف ملخص الرواتب والاستقطاعات الضريبية والضمان الاجتماعي المعتمد'
                  : 'Certified Payroll, Income Tax & Social Security Remittance Statement'}
              </h1>
              <div className="text-xs text-slate-600 flex items-center justify-center gap-4 pt-1 font-mono">
                <span>Period: {selectedPeriod === 'ALL' ? 'All Active Periods' : selectedPeriod || activePeriod}</span>
                <span>•</span>
                <span>Date: {new Date().toISOString().split('T')[0]}</span>
                <span>•</span>
                <span>Currency: IQD (د.ع)</span>
              </div>
            </div>

            {/* Summary KPI Cards for the statement */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 border border-slate-300 rounded-xl bg-slate-50">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Total Gross Payroll</div>
                <div className="text-base font-extrabold font-mono text-slate-900">
                  {totalGross.toLocaleString()} IQD
                </div>
              </div>
              <div className="p-3 border border-slate-300 rounded-xl bg-slate-50">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Total Social Security (17%)</div>
                <div className="text-base font-extrabold font-mono text-emerald-700">
                  {totalSS.toLocaleString()} IQD
                </div>
              </div>
              <div className="p-3 border border-slate-300 rounded-xl bg-slate-50">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Total Income Tax Withholding</div>
                <div className="text-base font-extrabold font-mono text-amber-700">
                  {totalTax.toLocaleString()} IQD
                </div>
              </div>
            </div>

            {/* Document Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start border border-slate-300">
                <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2 border-r border-slate-300">#</th>
                    <th className="p-2 border-r border-slate-300 text-start">Employee</th>
                    <th className="p-2 border-r border-slate-300 text-start">Department</th>
                    <th className="p-2 border-r border-slate-300 text-end">Gross</th>
                    <th className="p-2 border-r border-slate-300 text-end">SS Base</th>
                    <th className="p-2 border-r border-slate-300 text-end">Emp SS (5%)</th>
                    <th className="p-2 border-r border-slate-300 text-end">Empr SS (12%)</th>
                    <th className="p-2 border-r border-slate-300 text-end">Tax Amount</th>
                    <th className="p-2 text-end">Net Salary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredSnapshots.map((s, idx) => (
                    <tr key={s.id} className="even:bg-slate-50">
                      <td className="p-2 border-r border-slate-200 font-mono text-center">{idx + 1}</td>
                      <td className="p-2 border-r border-slate-200 font-bold">
                        {s.employee_name_ar}
                        <div className="text-[10px] font-mono text-slate-500">{s.employee_number}</div>
                      </td>
                      <td className="p-2 border-r border-slate-200">{s.department_name}</td>
                      <td className="p-2 border-r border-slate-200 text-end font-mono">
                        {(s.calculation_result?.gross_salary ?? 0).toLocaleString()}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-end font-mono">
                        {(s.calculation_result?.social_security_base ?? 0).toLocaleString()}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-end font-mono text-emerald-700">
                        {(s.calculation_result?.employee_social_security ?? 0).toLocaleString()}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-end font-mono text-purple-700">
                        {(s.calculation_result?.employer_social_security ?? 0).toLocaleString()}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-end font-mono text-amber-700">
                        {(s.calculation_result?.income_tax ?? 0).toLocaleString()}
                      </td>
                      <td className="p-2 text-end font-mono font-bold text-teal-800">
                        {(s.calculation_result?.net_salary ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-900">
                  <tr>
                    <td colSpan={3} className="p-2 text-slate-900">Total Company Liabilities</td>
                    <td className="p-2 text-end font-mono">{(totalGross ?? 0).toLocaleString()}</td>
                    <td className="p-2 text-end font-mono">-</td>
                    <td className="p-2 text-end font-mono text-emerald-800">{(totalEmpSS ?? 0).toLocaleString()}</td>
                    <td className="p-2 text-end font-mono text-purple-800">{(totalEmprSS ?? 0).toLocaleString()}</td>
                    <td className="p-2 text-end font-mono text-amber-800">{(totalTax ?? 0).toLocaleString()}</td>
                    <td className="p-2 text-end font-mono font-extrabold text-teal-900">{(totalNet ?? 0).toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Official Sign-off & Audit Seal Section */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-300 text-center text-xs">
              <div className="space-y-8">
                <div className="font-bold text-slate-800">
                  {lang === 'ar' ? 'إعداد المحاسب المسؤول' : 'Prepared by (Accountant)'}
                </div>
                <div className="border-b border-dashed border-slate-400 w-36 mx-auto"></div>
                <div className="text-[10px] text-slate-500">Signature / التوقيع</div>
              </div>

              <div className="space-y-8">
                <div className="font-bold text-slate-800">
                  {lang === 'ar' ? 'تدقيق مدير الحسابات' : 'Reviewed by (Chief Auditor)'}
                </div>
                <div className="border-b border-dashed border-slate-400 w-36 mx-auto"></div>
                <div className="text-[10px] text-slate-500">Signature & Date</div>
              </div>

              <div className="space-y-8">
                <div className="font-bold text-slate-800">
                  {lang === 'ar' ? 'اعتماد الإدارة المالية والختم' : 'Financial Approval & Corporate Seal'}
                </div>
                <div className="border-b border-dashed border-slate-400 w-36 mx-auto"></div>
                <div className="text-[10px] text-slate-500">Official Stamp / الختم الرسمي</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
