import React, { useState } from 'react';
import { useEmployeeContext } from '../context/EmployeeContext';
import { 
  CreditCard, 
  Download, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  Building,
  Printer,
  FileText,
  X,
  ShieldCheck,
  Calendar,
  Eye
} from 'lucide-react';

interface EmployeePayrollProps {
  employee: any;
  onLogout?: () => void;
}

export const EmployeePayroll: React.FC<EmployeePayrollProps> = ({ employee: propEmployee }) => {
  const { theme, language, employee: contextEmployee } = useEmployeeContext();
  const employee = contextEmployee || propEmployee;
  const isDark = theme === 'dark';
  const isEn = language === 'en';

  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);
  const [showPayslipModal, setShowPayslipModal] = useState(false);

  // Dynamic salary derivation from real employee profile
  const baseSalary = Number(employee?.salary || employee?.basicSalary || employee?.basic_salary || 950000);
  const phoneAllowance = 40000;
  const familyAllowance = employee?.familyAllowance !== undefined ? Number(employee.familyAllowance) : 50000;
  const certAllowance = 80000;
  const transportAllowance = 100000;
  const bonus = 120000;

  const grossSalary = baseSalary + phoneAllowance + familyAllowance + certAllowance + transportAllowance + bonus;

  const isExempt = employee?.is_ss_tax_exempt === 1 || employee?.isSsTaxExempt === true || false;
  const socialSecurityDeduction = isExempt ? 0 : Math.round(baseSalary * 0.05);
  const taxDeduction = isExempt ? 0 : 25000;
  const insuranceDeduction = isExempt ? 0 : 15000;
  const loanDeduction = 0;
  const absenceDeduction = 0;

  const totalDeductions = socialSecurityDeduction + taxDeduction + insuranceDeduction + loanDeduction + absenceDeduction;
  const netSalary = grossSalary - totalDeductions;

  const bankName = employee?.bankName || employee?.bank_name || (isEn ? 'Trade Bank of Iraq (TBI)' : 'المصرف العراقي للتجارة (TBI)');
  const ibanNumber = employee?.iban || 'IQ88TBIQ0000000000123456';
  const badgeNo = employee?.badgeNo || employee?.badge_no || 'V167';
  const employeeId = employee?.employeeId || employee?.employee_id || 'VIT-0037';
  const joinDate = employee?.joinDate || employee?.join_date || employee?.originalStartDate || employee?.original_start_date || employee?.contractStartDate || employee?.contract_start_date || '-';
  const branchName = isEn 
    ? (employee?.branchEn || employee?.branch || 'Najaf Office') 
    : (employee?.branch || employee?.location_ar || 'مكتب النجف');
  const positionName = isEn 
    ? (employee?.positionEn || employee?.position || 'Receptionist') 
    : (employee?.position_ar || employee?.position || 'موظف استقبال');
  const deptName = isEn 
    ? (employee?.departmentEn || employee?.department || 'Credit Department') 
    : (employee?.department || 'قسم الائتمان');
  const empName = isEn 
    ? (employee?.fullNameEn || 'Dina Haider Qasim') 
    : (employee?.full_name_ar || employee?.fullNameAr || employee?.fullName || employee?.name || 'دينا حيدر قاسم');

  const payslipHistory = [
    {
      monthAr: 'آب (أغسطس) 2026',
      monthEn: 'August 2026',
      shortMonthAr: 'آب 2026',
      shortMonthEn: 'Aug 2026',
      date: '2026-08-27',
      status: 'paid',
      basic: baseSalary,
      phone: phoneAllowance,
      family: familyAllowance,
      cert: certAllowance,
      transport: transportAllowance,
      bonus: bonus,
      gross: grossSalary,
      socialSecurity: socialSecurityDeduction,
      tax: taxDeduction,
      insurance: insuranceDeduction,
      loan: loanDeduction,
      absence: absenceDeduction,
      totalDeductions: totalDeductions,
      net: netSalary,
      bank: bankName,
      iban: ibanNumber
    },
    {
      monthAr: 'تموز (يوليو) 2026',
      monthEn: 'July 2026',
      shortMonthAr: 'تموز 2026',
      shortMonthEn: 'Jul 2026',
      date: '2026-07-27',
      status: 'paid',
      basic: baseSalary,
      phone: phoneAllowance,
      family: familyAllowance,
      cert: certAllowance,
      transport: transportAllowance,
      bonus: Math.max(0, bonus - 20000),
      gross: grossSalary - 20000,
      socialSecurity: socialSecurityDeduction,
      tax: taxDeduction,
      insurance: insuranceDeduction,
      loan: loanDeduction,
      absence: absenceDeduction,
      totalDeductions: totalDeductions,
      net: netSalary - 20000,
      bank: bankName,
      iban: ibanNumber
    },
    {
      monthAr: 'حزيران (يونيو) 2026',
      monthEn: 'June 2026',
      shortMonthAr: 'حزيران 2026',
      shortMonthEn: 'Jun 2026',
      date: '2026-06-27',
      status: 'paid',
      basic: baseSalary,
      phone: phoneAllowance,
      family: familyAllowance,
      cert: certAllowance,
      transport: transportAllowance,
      bonus: bonus,
      gross: grossSalary,
      socialSecurity: socialSecurityDeduction,
      tax: taxDeduction,
      insurance: insuranceDeduction,
      loan: loanDeduction,
      absence: absenceDeduction,
      totalDeductions: totalDeductions,
      net: netSalary,
      bank: bankName,
      iban: ibanNumber
    }
  ];

  const activeSlip = payslipHistory[selectedMonthIndex];
  const activeMonth = isEn ? activeSlip.monthEn : activeSlip.monthAr;
  const activeShortMonth = isEn ? activeSlip.shortMonthEn : activeSlip.shortMonthAr;
  const currencyLabel = isEn ? 'IQD' : 'د.ع';

  const handleDownloadSlip = () => {
    const content = `================================================================================
          VITAS IRAQ MICROFINANCE INSTITUTION / مؤسسة فيتاس العراق
             OFFICIAL MONTHLY PAYSLIP DOCUMENT / كشف وقسيمة الراتب الرسمي
================================================================================
Reference: VTS-PAY-${badgeNo}
Month: ${activeMonth}
Issue Date: ${activeSlip.date}
Employee Name: ${empName}
Badge No: ${badgeNo} | Employee ID: ${employeeId}
Branch: ${branchName} | Department: ${deptName}
Position: ${positionName}
Bank: ${activeSlip.bank}
IBAN: ${activeSlip.iban}
Tax Status: ${isExempt ? (isEn ? 'Exempt' : 'معفى') : (isEn ? 'Subject to Tax & SS' : 'خاضع للضمان والضريبة')}

--------------------------------------------------------------------------------
1. EARNINGS & ALLOWANCES / المستحقات والبدلات
--------------------------------------------------------------------------------
- Basic Salary / الراتب الاسمي: ${activeSlip.basic.toLocaleString()} IQD
- Phone Allowance / بدل الهاتف: ${activeSlip.phone.toLocaleString()} IQD
- Family Allowance / بدل الزوجية والأولاد: ${activeSlip.family.toLocaleString()} IQD
- Certificate Allowance / بدل الشهادة: ${activeSlip.cert.toLocaleString()} IQD
- Transportation / بدل النقل والسفر: ${activeSlip.transport.toLocaleString()} IQD
- Overtime & Bonus / الأجر الإضافي والمكافآت: ${activeSlip.bonus.toLocaleString()} IQD
--------------------------------------------------------------------------------
TOTAL GROSS SALARY / إجمالي الراتب: ${activeSlip.gross.toLocaleString()} IQD

--------------------------------------------------------------------------------
2. DEDUCTIONS & INSURANCE / الاستقطاعات والتأمين
--------------------------------------------------------------------------------
- Social Security (5%) / استقطاع الضمان: -${activeSlip.socialSecurity.toLocaleString()} IQD
- Income Tax / استقطاع ضريبة الدخل: -${activeSlip.tax.toLocaleString()} IQD
- Health Insurance / قسط التأمين الصحي: -${activeSlip.insurance.toLocaleString()} IQD
- Loan Payments / استقطاع السلف والقروض: -${activeSlip.loan.toLocaleString()} IQD
- Absence & Deductions / الغيابات والتنبيهات: -${activeSlip.absence.toLocaleString()} IQD
--------------------------------------------------------------------------------
TOTAL DEDUCTIONS / إجمالي الاستقطاعات: -${activeSlip.totalDeductions.toLocaleString()} IQD

================================================================================
NET PAYABLE SALARY / صافي الراتب المستحق: ${activeSlip.net.toLocaleString()} IQD
STATUS: PAID & TRANSFERRED TO ACCOUNT / مدفوع ومحول للحساب المصرفي
================================================================================
Generated officially from VITAS Iraq HRMS Portal. Verified electronically.`;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = isEn ? `Payslip_${badgeNo}_${activeShortMonth.replace(/\s+/g, '_')}.txt` : `قسيمة_راتب_${badgeNo}_${activeShortMonth.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadSuccessToast(isEn ? `Payslip for ${activeShortMonth} saved successfully` : `تم حفظ قسيمة راتب ${activeShortMonth} بنجاح`);
    setTimeout(() => setDownloadSuccessToast(null), 3500);
  };

  const handlePrintPayslip = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-4 pb-20 animate-in fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
            <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className={`text-base font-black leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isEn ? 'Payroll & Official Payslip' : 'الرواتب وقسيمة الراتب الرسمية'}
            </h1>
            <p className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
              {isEn ? 'Monthly breakdown, official allowances, and deductions' : 'مفردات الراتب والبدلات والاستقطاعات الرسمية المعتمدة'}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowPayslipModal(true)}
            className="px-2.5 py-1.5 rounded-xl text-[11px] font-black bg-teal-600 hover:bg-teal-500 text-white transition-all flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
            title={isEn ? 'View Official Payslip' : 'معاينة القسيمة الرسمية'}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isEn ? 'Payslip' : 'القسيمة'}</span>
          </button>

          <button
            onClick={handleDownloadSlip}
            className={`p-1.5 rounded-xl border text-[11px] font-bold transition-all flex items-center justify-center cursor-pointer shadow-xs active:scale-95 ${
              isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
            }`}
            title={isEn ? 'Download Slip' : 'تحميل القسيمة'}
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {downloadSuccessToast && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{downloadSuccessToast}</span>
        </div>
      )}

      {/* Month Selector Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {payslipHistory.map((slip, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedMonthIndex(idx)}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
              selectedMonthIndex === idx
                ? 'bg-teal-700 text-white shadow-xs font-black'
                : isDark 
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' 
                  : 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-100'
            }`}
          >
            {isEn ? slip.shortMonthEn : slip.shortMonthAr}
          </button>
        ))}
      </div>

      {/* Hero Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-800 via-teal-900 to-slate-950 text-white shadow-xl relative overflow-hidden border border-emerald-500/30">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {isEn ? 'Paid & Transferred to Account' : 'مدفوع ومحوّل للحساب المصرفي'}
            </span>
            <span className="text-[11px] font-mono text-emerald-200">
              {activeMonth}
            </span>
          </div>

          <div>
            <p className="text-xs text-slate-300">
              {isEn ? 'Net Payable Salary' : 'صافي الراتب المستحق'}
            </p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl font-black font-mono tracking-tight text-emerald-300">
                {activeSlip.net.toLocaleString('en-US')}
              </span>
              <span className="text-xs font-bold text-slate-200">
                {isEn ? 'IQD' : 'دينار عراقي'}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-300">
            <span>{isEn ? `Disbursement Date: ${activeSlip.date}` : `تاريخ الإيداع: ${activeSlip.date}`}</span>
            <span className="flex items-center gap-1 text-emerald-300">
              <Building className="w-3 h-3" />
              <span>{activeSlip.bank}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Open Official Payslip Document Banner */}
      <div 
        onClick={() => setShowPayslipModal(true)}
        className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] active:scale-95 shadow-xs ${
          isDark 
            ? 'bg-[#131b2e] border-teal-500/30 text-white' 
            : 'bg-white border-teal-300 text-slate-900'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h3 className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isEn ? 'Official Monthly Payslip Document' : 'كشف وقسيمة الراتب الشهري الرسمية'}
            </h3>
            <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-700 font-medium'}`}>
              {isEn ? 'Doc Ref: VTS-PAY-' + badgeNo + ' • Includes official stamp' : 'رقم المرجع: VTS-PAY-' + badgeNo + ' • متضمنة الختم والاعتماد'}
            </p>
          </div>
        </div>

        <button 
          type="button"
          className="px-2.5 py-1 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold shadow-xs shrink-0"
        >
          {isEn ? 'View & Print' : 'معاينة وطباعة'}
        </button>
      </div>

      {/* 1. Earnings & Allowances (المستحقات والبدلات) - Exactly Matching Category5PayrollView */}
      <div className={`p-4 rounded-2xl border ${
        isDark ? 'bg-slate-900/80 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-xs'
      }`}>
        <div className={`flex items-center justify-between mb-3 pb-2 border-b ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-1.5">
            <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className={`text-xs font-black ${isDark ? 'text-emerald-400' : 'text-slate-900'}`}>
              {isEn ? 'Earnings & Allowances (المستحقات والبدلات)' : 'المستحقات والبدلات الإجمالية'}
            </h3>
          </div>
          <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
            +{activeSlip.gross.toLocaleString('en-US')} {currencyLabel}
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center py-0.5">
            <span className={`${isDark ? 'text-slate-300' : 'text-slate-700 font-bold'}`}>
              {isEn ? 'Basic Salary:' : 'الراتب الاسمي الفعلي:'}
            </span>
            <span className={`font-mono font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {activeSlip.basic.toLocaleString()} {currencyLabel}
            </span>
          </div>

          <div className="flex justify-between items-center py-0.5">
            <span className={`${isDark ? 'text-slate-300' : 'text-slate-700 font-bold'}`}>
              {isEn ? 'Phone Allowance:' : 'بدل الهاتف:'}
            </span>
            <span className={`font-mono font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {activeSlip.phone.toLocaleString()} {currencyLabel}
            </span>
          </div>

          <div className="flex justify-between items-center py-0.5">
            <span className={`${isDark ? 'text-slate-300' : 'text-slate-700 font-bold'}`}>
              {isEn ? 'Family Allowance:' : 'بدل الزوجية والأولاد:'}
            </span>
            <span className={`font-mono font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {activeSlip.family.toLocaleString()} {currencyLabel}
            </span>
          </div>

          <div className="flex justify-between items-center py-0.5">
            <span className={`${isDark ? 'text-slate-300' : 'text-slate-700 font-bold'}`}>
              {isEn ? 'Certificate Allowance:' : 'بدل الشهادة:'}
            </span>
            <span className={`font-mono font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {activeSlip.cert.toLocaleString()} {currencyLabel}
            </span>
          </div>

          <div className="flex justify-between items-center py-0.5">
            <span className={`${isDark ? 'text-slate-300' : 'text-slate-700 font-bold'}`}>
              {isEn ? 'Transportation:' : 'بدل النقل والسفر:'}
            </span>
            <span className={`font-mono font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {activeSlip.transport.toLocaleString()} {currencyLabel}
            </span>
          </div>

          <div className="flex justify-between items-center py-0.5">
            <span className={`${isDark ? 'text-slate-300' : 'text-slate-700 font-bold'}`}>
              {isEn ? 'Overtime & Bonus:' : 'الأجر الإضافي والمكافآت:'}
            </span>
            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
              +{activeSlip.bonus.toLocaleString()} {currencyLabel}
            </span>
          </div>

          <div className={`flex justify-between items-center pt-2 mt-1 border-t font-black text-xs ${
            isDark ? 'border-slate-800 text-emerald-300 bg-emerald-950/20 p-2 rounded-xl' : 'border-slate-200 text-emerald-900 bg-emerald-50/80 p-2 rounded-xl'
          }`}>
            <span>{isEn ? 'Total Gross Salary:' : 'إجمالي الراتب الإجمالي:'}</span>
            <span className="font-mono text-sm">{activeSlip.gross.toLocaleString()} {currencyLabel}</span>
          </div>
        </div>
      </div>

      {/* 2. Deductions & Insurances (الاستقطاعات والتأمين) - Exactly Matching Category5PayrollView */}
      <div className={`p-4 rounded-2xl border ${
        isDark ? 'bg-slate-900/80 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-xs'
      }`}>
        <div className={`flex items-center justify-between mb-3 pb-2 border-b ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-1.5">
            <ArrowDownRight className="w-4 h-4 text-rose-500" />
            <h3 className={`text-xs font-black ${isDark ? 'text-rose-400' : 'text-slate-900'}`}>
              {isEn ? 'Deductions & Insurances (الاستقطاعات والتأمين)' : 'الاستقطاعات والتأمينات الرسمية'}
            </h3>
          </div>
          <span className="text-xs font-mono font-black text-rose-600 dark:text-rose-400">
            -{activeSlip.totalDeductions.toLocaleString('en-US')} {currencyLabel}
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center py-0.5">
            <span className={`${isDark ? 'text-slate-300' : 'text-slate-700 font-bold'}`}>
              {isEn ? 'Pension & Social Security (5%):' : 'استقطاع التقاعد والضمان الاجتماعي (5%):'}
            </span>
            {isExempt ? (
              <span className="font-bold text-amber-600 dark:text-amber-400 text-[11px]">{isEn ? 'Exempt (0 IQD)' : 'معفى (0 د.ع)'}</span>
            ) : (
              <span className="font-mono font-black text-rose-600 dark:text-rose-400">
                -{activeSlip.socialSecurity.toLocaleString()} {currencyLabel}
              </span>
            )}
          </div>

          <div className="flex justify-between items-center py-0.5">
            <span className={`${isDark ? 'text-slate-300' : 'text-slate-700 font-bold'}`}>
              {isEn ? 'Income Tax:' : 'استقطاع ضريبة الدخل:'}
            </span>
            {isExempt ? (
              <span className="font-bold text-amber-600 dark:text-amber-400 text-[11px]">{isEn ? 'Exempt (0 IQD)' : 'معفى (0 د.ع)'}</span>
            ) : (
              <span className="font-mono font-black text-rose-600 dark:text-rose-400">
                -{activeSlip.tax.toLocaleString()} {currencyLabel}
              </span>
            )}
          </div>

          <div className="flex justify-between items-center py-0.5">
            <span className={`${isDark ? 'text-slate-300' : 'text-slate-700 font-bold'}`}>
              {isEn ? 'Health Insurance:' : 'قسط التأمين الصحي:'}
            </span>
            {isExempt ? (
              <span className="font-bold text-amber-600 dark:text-amber-400 text-[11px]">{isEn ? 'Exempt (0 IQD)' : 'معفى (0 د.ع)'}</span>
            ) : (
              <span className="font-mono font-black text-rose-600 dark:text-rose-400">
                -{activeSlip.insurance.toLocaleString()} {currencyLabel}
              </span>
            )}
          </div>

          <div className="flex justify-between items-center py-0.5">
            <span className={`${isDark ? 'text-slate-300' : 'text-slate-700 font-bold'}`}>
              {isEn ? 'Loan Deductions:' : 'استقطاع القروض والسلف:'}
            </span>
            <span className={`font-mono font-bold ${activeSlip.loan > 0 ? 'text-rose-600 dark:text-rose-400' : isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {activeSlip.loan > 0 ? `-${activeSlip.loan.toLocaleString()} ${currencyLabel}` : `0 ${currencyLabel}`}
            </span>
          </div>

          <div className="flex justify-between items-center py-0.5">
            <span className={`${isDark ? 'text-slate-300' : 'text-slate-700 font-bold'}`}>
              {isEn ? 'Absence & Sanctions:' : 'استقطاع الغيابات والتنبيهات:'}
            </span>
            <span className={`font-mono font-bold ${activeSlip.absence > 0 ? 'text-rose-600 dark:text-rose-400' : isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {activeSlip.absence > 0 ? `-${activeSlip.absence.toLocaleString()} ${currencyLabel}` : `0 ${currencyLabel}`}
            </span>
          </div>

          <div className={`flex justify-between items-center pt-2 mt-1 border-t font-black text-xs ${
            isDark ? 'border-slate-800 text-rose-300 bg-rose-950/20 p-2 rounded-xl' : 'border-slate-200 text-rose-900 bg-rose-50/80 p-2 rounded-xl'
          }`}>
            <span>{isEn ? 'Total Deductions:' : 'إجمالي الاستقطاعات:'}</span>
            <span className="font-mono text-sm">-{activeSlip.totalDeductions.toLocaleString()} {currencyLabel}</span>
          </div>
        </div>
      </div>

      {/* 3. Official Printable Payslip Document Modal (قسيمة الراتب الرسمية المعتمدة) */}
      {showPayslipModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in overflow-y-auto">
          <div className={`w-full max-w-lg max-h-[92vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
            isDark ? 'bg-[#0f172a] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className={`p-4 border-b flex items-center justify-between gap-2 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-xs sm:text-sm font-black leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {isEn ? 'Official Monthly Payslip' : 'كشف وقسيمة الراتب الشهري المعتمدة'}
                  </h3>
                  <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
                    {isEn ? `Ref: VTS-PAY-${badgeNo} • ${activeMonth}` : `المرجع: VTS-PAY-${badgeNo} • ${activeMonth}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handlePrintPayslip}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Print' : 'طباعة'}</span>
                </button>
                <button
                  onClick={() => setShowPayslipModal(false)}
                  className={`p-1.5 rounded-xl cursor-pointer ${
                    isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Printable Sheet (Directly matching Category5PayrollView) */}
            <div className={`p-4 overflow-y-auto flex-1 ${isDark ? 'bg-[#080d1a]' : 'bg-slate-100'}`}>
              <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-5 text-xs shadow-xl font-['Cairo'] relative text-slate-900">
                {/* Official Letterhead Header */}
                <div className="flex items-start justify-between border-b-2 border-teal-600 pb-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                      {isEn ? 'VITAS Iraq Microfinance Institution' : 'مؤسسة فيتاس العراق للتمويل الأصغر'}
                    </h3>
                    <p className="text-xs text-teal-700 font-bold">
                      {isEn ? 'Official Monthly Payslip Document' : 'كشف وقسيمة الراتب الشهري الرسمية'}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {isEn ? 'For Month:' : 'عن شهر:'} <span className="text-slate-900 font-bold">{activeMonth}</span>
                    </p>
                  </div>
                  <div className="text-left font-mono text-[10px] text-slate-600">
                    <p className="font-bold text-teal-700">CONFIDENTIAL PAYSLIP</p>
                    <p>Doc Ref: VTS-PAY-{badgeNo}</p>
                    <p>Issue Date: {activeSlip.date}</p>
                  </div>
                </div>

                {/* Employee Info Grid (Exact match to Category5PayrollView) */}
                <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900">
                  <div>
                    <span className="text-[10px] text-slate-600 font-bold block">{isEn ? 'Employee Name:' : 'اسم الموظف:'}</span>
                    <span className="font-bold text-slate-900 text-xs">{empName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 font-bold block">{isEn ? 'ID / Badge:' : 'الرقم الوظيفي / البادج:'}</span>
                    <span className="font-mono text-teal-700 font-bold text-xs">{employeeId} ({badgeNo})</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 font-bold block">{isEn ? 'Branch / Location:' : 'الفرع والموقع:'}</span>
                    <span className="font-bold text-slate-900 text-xs">{branchName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 font-bold block">{isEn ? 'Dept / Position:' : 'القسم / المسمى:'}</span>
                    <span className="font-bold text-slate-900 text-xs">{positionName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 font-bold block">{isEn ? 'Bank / Account:' : 'المصرف / الحساب:'}</span>
                    <span className="font-mono text-[11px] font-bold text-slate-900 block">{activeSlip.bank}</span>
                    <span className="font-mono text-[9px] text-slate-600 block truncate">{activeSlip.iban}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 font-bold block">{isEn ? 'Join Date:' : 'تاريخ المباشرة:'}</span>
                    <span className="font-mono font-bold text-slate-900 text-xs">{joinDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 font-bold block">{isEn ? 'Tax Exemption Status:' : 'حالة الخضوع الضريبي:'}</span>
                    <span className={`font-bold text-[11px] ${isExempt ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {isExempt ? (isEn ? 'Exempt' : 'معفى من الضمان والضريبة') : (isEn ? 'Subject to SS & Tax' : 'خاضع للضمان والضريبة')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 font-bold block">{isEn ? 'Department:' : 'القسم:'}</span>
                    <span className="font-bold text-slate-900 text-xs">{deptName}</span>
                  </div>
                </div>

                {/* Earnings vs Deductions Breakdown */}
                <div className="space-y-4">
                  {/* Earnings */}
                  <div className="space-y-1.5 border rounded-2xl p-3 bg-emerald-50/40 border-emerald-200">
                    <h4 className="font-bold text-emerald-800 border-b border-emerald-300 pb-1 flex items-center justify-between text-xs">
                      <span>{isEn ? 'Earnings & Allowances' : 'المستحقات والبدلات (Earnings)'}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                    </h4>
                    <div className="space-y-1 text-slate-900 text-[11px]">
                      <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                        <span>{isEn ? 'Basic Salary:' : 'الراتب الاسمي الفعلي:'}</span>
                        <span className="font-mono font-bold">{activeSlip.basic.toLocaleString()} IQD</span>
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                        <span>{isEn ? 'Phone Allowance:' : 'بدل الهاتف:'}</span>
                        <span className="font-mono font-bold">{activeSlip.phone.toLocaleString()} IQD</span>
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                        <span>{isEn ? 'Family Allowance:' : 'بدل الزوجية والأولاد:'}</span>
                        <span className="font-mono font-bold">{activeSlip.family.toLocaleString()} IQD</span>
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                        <span>{isEn ? 'Certificate Allowance:' : 'بدل الشهادة:'}</span>
                        <span className="font-mono font-bold">{activeSlip.cert.toLocaleString()} IQD</span>
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                        <span>{isEn ? 'Transportation:' : 'بدل النقل والسفر:'}</span>
                        <span className="font-mono font-bold">{activeSlip.transport.toLocaleString()} IQD</span>
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                        <span>{isEn ? 'Overtime & Bonus:' : 'الأجر الإضافي والمكافآت:'}</span>
                        <span className="font-mono font-bold">+{activeSlip.bonus.toLocaleString()} IQD</span>
                      </div>
                      <div className="flex justify-between py-1 font-black text-emerald-900 bg-emerald-100/70 border border-emerald-300 px-2 rounded-lg mt-1">
                        <span>{isEn ? 'Total Gross Salary:' : 'إجمالي الراتب الإجمالي:'}</span>
                        <span className="font-mono">{activeSlip.gross.toLocaleString()} IQD</span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="space-y-1.5 border rounded-2xl p-3 bg-rose-50/40 border-rose-200">
                    <h4 className="font-bold text-rose-800 border-b border-rose-300 pb-1 flex items-center justify-between text-xs">
                      <span>{isEn ? 'Deductions & Insurance' : 'الاستقطاعات والتأمين (Deductions)'}</span>
                      <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                    </h4>
                    <div className="space-y-1 text-slate-900 text-[11px]">
                      <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                        <span>{isEn ? 'Pension & Social Security (5%):' : 'استقطاع التقاعد والضمان الاجتماعي:'}</span>
                        {isExempt ? (
                          <span className="font-bold text-amber-700 text-[10px]">{isEn ? 'Exempt (0 IQD)' : 'معفى (0 د.ع)'}</span>
                        ) : (
                          <span className="font-mono font-bold text-rose-800">-{activeSlip.socialSecurity.toLocaleString()} IQD</span>
                        )}
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                        <span>{isEn ? 'Income Tax:' : 'استقطاع ضريبة الدخل:'}</span>
                        {isExempt ? (
                          <span className="font-bold text-amber-700 text-[10px]">{isEn ? 'Exempt (0 IQD)' : 'معفى (0 د.ع)'}</span>
                        ) : (
                          <span className="font-mono font-bold text-rose-800">-{activeSlip.tax.toLocaleString()} IQD</span>
                        )}
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                        <span>{isEn ? 'Health Insurance:' : 'قسط التأمين الصحي:'}</span>
                        {isExempt ? (
                          <span className="font-bold text-amber-700 text-[10px]">{isEn ? 'Exempt (0 IQD)' : 'معفى (0 د.ع)'}</span>
                        ) : (
                          <span className="font-mono font-bold text-rose-800">-{activeSlip.insurance.toLocaleString()} IQD</span>
                        )}
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                        <span>{isEn ? 'Loan Deduction:' : 'استقطاع القروض والسلف:'}</span>
                        <span className="font-mono font-bold text-slate-700">0 IQD</span>
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                        <span>{isEn ? 'Absence & Sanctions:' : 'استقطاع الغيابات والتنبيهات:'}</span>
                        <span className="font-mono font-bold text-slate-700">0 IQD</span>
                      </div>
                      <div className="flex justify-between py-1 font-black text-rose-900 bg-rose-100/70 border border-rose-300 px-2 rounded-lg mt-1">
                        <span>{isEn ? 'Total Deductions:' : 'إجمالي الاستقطاعات:'}</span>
                        <span className="font-mono">-{activeSlip.totalDeductions.toLocaleString()} IQD</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Net Payable Highlight Card (Matching Category5PayrollView) */}
                <div className="p-4 rounded-2xl bg-teal-50 border-2 border-teal-400 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-700 block">
                      {isEn ? 'Net Payable Salary (Disbursed to Bank):' : 'صافي الراتب النهائي مستحق الدفع (المحول للمصرف):'}
                    </span>
                    <span className="text-2xl font-black text-teal-900 font-mono">
                      {activeSlip.net.toLocaleString()} {isEn ? 'IQD' : 'د.ع'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{isEn ? 'Disbursed & Audited' : 'مدفوع ومصادق عليه'}</span>
                    </span>
                  </div>
                </div>

                {/* Official Stamps & Signatures Footer */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-bold text-slate-500">
                      {isEn ? 'Human Resources & Payroll' : 'إدارة الموارد البشرية والرواتب'}
                    </p>
                    <p className="text-[10px] font-black text-teal-700 mt-0.5">
                      {isEn ? 'Electronically Generated & Certified' : 'معتمد وموثق إلكترونياً'}
                    </p>
                  </div>

                  {/* Stamp Graphic */}
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-teal-600 p-0.5 flex items-center justify-center rotate-[-6deg] select-none text-center">
                    <div className="w-full h-full rounded-full border border-teal-600/70 flex flex-col items-center justify-center p-0.5 text-[7px] font-black text-teal-700 leading-tight">
                      <span>فيتاس العراق</span>
                      <span className="my-0.5">★ معتمد ★</span>
                      <span>قسم الرواتب</span>
                    </div>
                  </div>

                  <div className="text-left font-mono text-[9px] text-slate-500">
                    <p>Doc Ref: VTS-PAY-{badgeNo}</p>
                    <p>Audit Hash: #{activeSlip.net.toString().slice(-4)}-{badgeNo}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
