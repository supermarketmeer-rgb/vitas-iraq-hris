import React, { useState, useMemo, useEffect } from 'react';
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
  Eye,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coins,
  Receipt,
  Gift,
  Clock,
  HeartPulse,
  BadgePercent,
  Briefcase,
  UserCheck,
  Info
} from 'lucide-react';

interface EmployeePayrollProps {
  employee: any;
  onLogout?: () => void;
}

interface MonthOption {
  key: string; // YYYY-MM
  year: number;
  month: number;
  nameAr: string;
  nameEn: string;
  shortMonthAr: string;
  shortMonthEn: string;
  statusAr: string;
  statusEn: string;
  isPaid: boolean;
  disbursementDate: string;
}

// Generate selectable months for 2026 and 2025
const MONTH_NAMES_AR = [
  'كانون الثاني (يناير)',
  'شباط (فبراير)',
  'آذار (مارس)',
  'نيسان (أبريل)',
  'أيار (مايو)',
  'حزيران (يونيو)',
  'تموز (يوليو)',
  'آب (أغسطس)',
  'أيلول (سبتمبر)',
  'تشرين الأول (أكتوبر)',
  'تشرين الثاني (نوفمبر)',
  'كانون الأول (ديسمبر)'
];

const MONTH_NAMES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

const SHORT_NAMES_AR = [
  'كانون 2',
  'شباط',
  'آذار',
  'نيسان',
  'أيار',
  'حزيران',
  'تموز',
  'آب',
  'أيلول',
  'تشرين 1',
  'تشرين 2',
  'كانون 1'
];

const SHORT_NAMES_EN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
];

// Pre-build available months (2026 & 2025)
const AVAILABLE_PERIODS: MonthOption[] = [];

// Year 2026 (From October down to January, plus future Nov/Dec)
[10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 11, 12].forEach(m => {
  const isCurrent = m === 10;
  const isPast = m <= 9;
  const isFuture = m > 10;
  AVAILABLE_PERIODS.push({
    key: `2026-${String(m).padStart(2, '0')}`,
    year: 2026,
    month: m,
    nameAr: `${MONTH_NAMES_AR[m - 1]} 2026`,
    nameEn: `${MONTH_NAMES_EN[m - 1]} 2026`,
    shortMonthAr: `${SHORT_NAMES_AR[m - 1]} 2026`,
    shortMonthEn: `${SHORT_NAMES_EN[m - 1]} 2026`,
    statusAr: isCurrent ? 'الشهر المالي الحالي' : isPast ? 'معتمد ومصروف للحساب' : 'مسير مالي مستقبلي',
    statusEn: isCurrent ? 'Current Fiscal Month' : isPast ? 'Paid & Transferred' : 'Upcoming Period',
    isPaid: isPast || m === 8, // Aug 2026 officially disbursed
    disbursementDate: `2026-${String(m).padStart(2, '0')}-27`
  });
});

// Year 2025 (Archived previous year)
[12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].forEach(m => {
  AVAILABLE_PERIODS.push({
    key: `2025-${String(m).padStart(2, '0')}`,
    year: 2025,
    month: m,
    nameAr: `${MONTH_NAMES_AR[m - 1]} 2025`,
    nameEn: `${MONTH_NAMES_EN[m - 1]} 2025`,
    shortMonthAr: `${SHORT_NAMES_AR[m - 1]} 2025`,
    shortMonthEn: `${SHORT_NAMES_EN[m - 1]} 2025`,
    statusAr: 'مؤرشف ومصروف سابقاً',
    statusEn: 'Archived & Disbursed',
    isPaid: true,
    disbursementDate: `2025-${String(m).padStart(2, '0')}-27`
  });
});

export const EmployeePayroll: React.FC<EmployeePayrollProps> = ({ employee: propEmployee }) => {
  const { theme, language, employee: contextEmployee } = useEmployeeContext();
  const rawEmployee = contextEmployee || propEmployee;
  const isDark = theme === 'dark';
  const isEn = language === 'en';

  // Selected period key in combobox (default: '2026-10' matching October 2026 in screenshot)
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>('2026-10');
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);
  const [showPayslipModal, setShowPayslipModal] = useState<boolean>(false);

  // Active period object
  const activePeriod = useMemo(() => {
    return AVAILABLE_PERIODS.find(p => p.key === selectedPeriodKey) || AVAILABLE_PERIODS[0]; // Default to Oct 2026
  }, [selectedPeriodKey]);

  // Rehydrate with full employee profile from localStorage (vitas_employees) to match Category5PayrollView 100%
  const fullEmployee = useMemo(() => {
    try {
      const savedEmps = localStorage.getItem('vitas_employees');
      if (savedEmps) {
        const emps = JSON.parse(savedEmps);
        if (Array.isArray(emps)) {
          const bNo = String(rawEmployee?.badgeNo || rawEmployee?.badge_no || '').trim().toUpperCase();
          const eid = String(rawEmployee?.employeeId || rawEmployee?.employee_id || '').trim().toUpperCase();
          const empId = String(rawEmployee?.id || '').trim();
          const match = emps.find((e: any) => {
            const eb = String(e.badgeNo || e.badge_no || '').trim().toUpperCase();
            const eeid = String(e.employeeId || e.employee_id || '').trim().toUpperCase();
            const eidStr = String(e.id || '').trim();
            return (bNo && eb === bNo) || (eid && eeid === eid) || (empId && eidStr === empId);
          });
          if (match) return { ...rawEmployee, ...match };
        }
      }
    } catch (e) {
      console.warn('Failed to load full employee from storage', e);
    }
    return rawEmployee;
  }, [rawEmployee]);

  // Read live manual adjustments entered in Category5PayrollView (vitas_payroll_manual_adjustments)
  const manualAdjustments = useMemo(() => {
    try {
      const saved = localStorage.getItem('vitas_payroll_manual_adjustments');
      if (saved) {
        const adjs = JSON.parse(saved);
        const idKey = String(fullEmployee?.id || rawEmployee?.id || '');
        const badgeKey = String(fullEmployee?.badgeNo || fullEmployee?.badge_no || rawEmployee?.badgeNo || '');
        return adjs[idKey] || adjs[badgeKey] || {};
      }
    } catch (e) {}
    return {};
  }, [fullEmployee, rawEmployee]);

  // -------------------------------------------------------------------------------------------------
  // FINANCIAL CALCULATIONS: 100% Matching Category5PayrollView.tsx / XAMPP vitasiraq_hris_db schema
  // -------------------------------------------------------------------------------------------------

  // 1. Basic Salary & Exemption
  const basicSalary = Number(
    fullEmployee?.basicSalary ?? 
    fullEmployee?.basic_salary ?? 
    fullEmployee?.salary ?? 
    rawEmployee?.basicSalary ?? 
    rawEmployee?.basic_salary ?? 
    rawEmployee?.salary ?? 
    0
  );

  const isExempt = fullEmployee?.is_ss_tax_exempt === 1 || 
    fullEmployee?.isSsTaxExempt === true || 
    String(fullEmployee?.is_ss_tax_exempt) === '1' ||
    rawEmployee?.is_ss_tax_exempt === 1 || 
    rawEmployee?.isSsTaxExempt === true || 
    false;

  // 2. Absence Days & Current Month Basic
  const absenceDays = manualAdjustments.absenceDays !== undefined ? Number(manualAdjustments.absenceDays) : 0;
  const absenceDeduction = Math.round(absenceDays * (basicSalary / 30));
  const currentMonthBasic = Math.max(0, basicSalary - absenceDeduction);

  // 3. Allowances (Earnings) - Matching Category5PayrollView fields
  // Phone allowance
  const phoneAllowance = manualAdjustments.phoneAllowance !== undefined
    ? Number(manualAdjustments.phoneAllowance)
    : Number(fullEmployee?.phoneAllowance ?? fullEmployee?.phone_allowance ?? 0);

  // Certificate allowance
  const certAllowance = manualAdjustments.certAllowance !== undefined
    ? Number(manualAdjustments.certAllowance)
    : Number(fullEmployee?.certificateAllowance ?? fullEmployee?.certificate_allowance ?? 0);

  // Transportation allowance
  const transportation = manualAdjustments.transportation !== undefined
    ? Number(manualAdjustments.transportation)
    : Number(fullEmployee?.transportationFixed ?? fullEmployee?.transportation_fixed ?? 0);

  // Bonus
  const bonus = manualAdjustments.bonus !== undefined
    ? Number(manualAdjustments.bonus)
    : (Number(fullEmployee?.fixedBonus ?? fullEmployee?.fixed_bonus ?? 0) + (Number(manualAdjustments.bonusExtra) || 0));

  // Incentives (المحفزات التشجيعية)
  const incentives = manualAdjustments.incentives !== undefined
    ? Number(manualAdjustments.incentives)
    : Number(fullEmployee?.incentives ?? 0);

  // Earned Leave (بدل رصيد الإجازات المكتسبة)
  const earnedLeave = manualAdjustments.earnedLeave !== undefined
    ? Number(manualAdjustments.earnedLeave)
    : Number(fullEmployee?.earnedLeave ?? fullEmployee?.earned_leave ?? 0);

  // Overtime pay
  const overtime = manualAdjustments.overtime !== undefined
    ? Number(manualAdjustments.overtime)
    : (Number(manualAdjustments.overtimeAmount) > 0
        ? Number(manualAdjustments.overtimeAmount)
        : ((Number(manualAdjustments.overtimeHours) || 0) * (basicSalary / 240) * 1.5 || 0));

  // Family allowance calculation (exact Category5PayrollView formula)
  const childAllowanceVal = 25000;
  const spouseAllowanceVal = 50000;
  const spouseWorksHere = fullEmployee?.spouseEmployedHere === true || 
    fullEmployee?.spouse_employed_here === true || 
    String(fullEmployee?.spouse_employed_here) === '1';

  const isMarried = fullEmployee?.maritalStatus === 'متأهل' || 
    fullEmployee?.maritalStatus === 'متزوج' || 
    fullEmployee?.maritalStatus === 'married' || 
    fullEmployee?.marital_status === 'married' || 
    Boolean(fullEmployee?.spouseName && fullEmployee?.spouseName !== 'N/A' && String(fullEmployee?.spouseName).trim() !== '');

  let spouseAllow = 0;
  if (isMarried && !spouseWorksHere) {
    spouseAllow = spouseAllowanceVal;
  }

  let rawChildren: any[] = [];
  if (Array.isArray(fullEmployee?.childrenList)) {
    rawChildren = fullEmployee.childrenList;
  } else if (typeof fullEmployee?.childrenList === 'string') {
    try { rawChildren = JSON.parse(fullEmployee.childrenList); } catch (e) {}
  } else if (fullEmployee?.children_details) {
    try { rawChildren = JSON.parse(fullEmployee.children_details); } catch (e) {}
  }
  const childCount = rawChildren.length;
  const childAllow = childCount * childAllowanceVal;
  const derivedFamilyAllowance = spouseAllow + childAllow;

  const familyAllowance = manualAdjustments.familyAllowance !== undefined
    ? Number(manualAdjustments.familyAllowance)
    : (fullEmployee?.familyAllowance !== undefined && Number(fullEmployee.familyAllowance) >= 0
        ? Number(fullEmployee.familyAllowance)
        : (derivedFamilyAllowance > 0 ? derivedFamilyAllowance : 50000));

  // Total Allowances & Gross Salary
  const allowancesTotal = phoneAllowance + certAllowance + transportation + bonus + familyAllowance + overtime + incentives + earnedLeave;
  const grossSalary = currentMonthBasic + allowancesTotal;

  // 4. Deductions & Insurance - Matching Category5PayrollView fields
  // Social Security (5% of basic salary)
  const autoSocialSecurity = isExempt ? 0 : Math.round(basicSalary * 0.05);
  const socialSecurity = manualAdjustments.socialSecurity !== undefined
    ? Number(manualAdjustments.socialSecurity)
    : autoSocialSecurity;

  // Health and Life Insurance (25,000 IQD standard)
  const insurance = isExempt ? 0 : 25000;

  // Income Tax calculation (tax brackets matching Category5)
  let autoIncomeTax = 0;
  if (!isExempt) {
    const monthlyExemption = isMarried ? (375000 + childCount * 16667) : 208333;
    const taxableBase = Math.max(0, grossSalary - socialSecurity - monthlyExemption);
    if (taxableBase > 0) {
      const b1 = Math.min(taxableBase, 250000) * 0.03;
      const b2 = taxableBase > 250000 ? Math.min(taxableBase - 250000, 250000) * 0.05 : 0;
      const b3 = taxableBase > 500000 ? Math.min(taxableBase - 500000, 500000) * 0.10 : 0;
      const b4 = taxableBase > 1000000 ? (taxableBase - 1000000) * 0.15 : 0;
      autoIncomeTax = Math.round(b1 + b2 + b3 + b4);
    }
  }
  const incomeTax = manualAdjustments.incomeTax !== undefined
    ? Number(manualAdjustments.incomeTax)
    : autoIncomeTax;

  // Loan Payment & Other Deductions
  const loanPayment = manualAdjustments.loanPayment !== undefined
    ? Number(manualAdjustments.loanPayment)
    : Number(fullEmployee?.loanPayment ?? fullEmployee?.loan_payment ?? 0);

  const otherDeductions = manualAdjustments.otherDeductions !== undefined
    ? Number(manualAdjustments.otherDeductions)
    : Number(fullEmployee?.otherDeductions ?? fullEmployee?.other_deductions ?? 0);

  // Total Deductions
  const totalDeductions = socialSecurity + incomeTax + insurance + loanPayment + otherDeductions + absenceDeduction;

  // Net Payable Salary
  const netSalary = grossSalary - totalDeductions;

  // -------------------------------------------------------------------------------------------------
  // EMPLOYEE METADATA
  // -------------------------------------------------------------------------------------------------
  const bankName = fullEmployee?.bankName || fullEmployee?.bank_name || 'غير محدد';
  const ibanNumber = fullEmployee?.iban || fullEmployee?.bankAccount || fullEmployee?.bank_account || 'N/A';
  const badgeNo = fullEmployee?.badgeNo || fullEmployee?.badge_no || rawEmployee?.badgeNo || rawEmployee?.badge_no || 'V167';
  const employeeId = fullEmployee?.employeeId || fullEmployee?.employee_id || rawEmployee?.employeeId || rawEmployee?.employee_id || 'VIT-0037';
  const joinDate = fullEmployee?.joinDate || fullEmployee?.join_date || fullEmployee?.originalStartDate || fullEmployee?.original_start_date || fullEmployee?.contractStartDate || fullEmployee?.contract_start_date || '2026-10-17';
  const branchName = fullEmployee?.branchEn || fullEmployee?.location_en || fullEmployee?.branch || fullEmployee?.location_ar || fullEmployee?.location || 'Bassrah';
  const positionName = fullEmployee?.positionEn || fullEmployee?.jobTitleEn || fullEmployee?.position || fullEmployee?.jobTitle || 'N/A';
  const deptName = fullEmployee?.departmentEn || fullEmployee?.department || fullEmployee?.dept || 'Credit';
  const empName = fullEmployee?.nameEn || fullEmployee?.fullNameEn || fullEmployee?.full_name_en || fullEmployee?.name || fullEmployee?.fullName || fullEmployee?.full_name_ar || 'Mustafa Ali Meer';

  const activeMonthName = activePeriod.nameEn; // 'October 2026' matching screenshot
  const activeShortMonth = activePeriod.shortMonthEn;
  const currencyLabel = 'IQD';
  const issueDate = '10/18/2026';

  // Navigation handlers for next / previous month
  const currentIndex = AVAILABLE_PERIODS.findIndex(p => p.key === selectedPeriodKey);
  const handlePrevMonth = () => {
    if (currentIndex < AVAILABLE_PERIODS.length - 1) {
      setSelectedPeriodKey(AVAILABLE_PERIODS[currentIndex + 1].key);
    }
  };
  const handleNextMonth = () => {
    if (currentIndex > 0) {
      setSelectedPeriodKey(AVAILABLE_PERIODS[currentIndex - 1].key);
    }
  };

  // Download official payslip document as formatted text file
  const handleDownloadSlip = () => {
    const content = `================================================================================
          VITAS IRAQ MICROFINANCE INSTITUTION / مؤسسة فيتاس العراق
             OFFICIAL MONTHLY PAYSLIP DOCUMENT / كشف وقسيمة الراتب الرسمي
================================================================================
Reference: VTS-PAY-${badgeNo}
Period: ${activeMonthName}
Issue / Disbursement Date: ${activePeriod.disbursementDate}
Employee Name: ${empName}
Badge No: ${badgeNo} | Employee ID: ${employeeId}
Branch: ${branchName} | Department: ${deptName}
Position: ${positionName}
Bank: ${bankName}
IBAN: ${ibanNumber}
Join Date: ${joinDate}
Tax Status: ${isExempt ? (isEn ? 'Exempt from SS & Tax' : 'معفى من الضمان والضريبة') : (isEn ? 'Subject to Tax & SS' : 'خاضع للضمان والضريبة')}

--------------------------------------------------------------------------------
1. EARNINGS & ALLOWANCES / المستحقات والبدلات الرسمية
--------------------------------------------------------------------------------
- Basic Salary / الراتب الاسمي: ${basicSalary.toLocaleString()} IQD
${absenceDays > 0 ? `- Absence Deduction (${absenceDays} days) / استقطاع أيام الغياب: -${absenceDeduction.toLocaleString()} IQD\n- Current Month Basic / الراتب الاسمي الفعلي للشهر: ${currentMonthBasic.toLocaleString()} IQD` : `- Current Month Basic / الراتب الاسمي الفعلي للشهر: ${currentMonthBasic.toLocaleString()} IQD`}
- Phone Allowance / بدل الهاتف: ${phoneAllowance.toLocaleString()} IQD
- Family Allowance / بدل الزوجية والأولاد: ${familyAllowance.toLocaleString()} IQD
- Certificate Allowance / بدل الشهادة العلمية: ${certAllowance.toLocaleString()} IQD
- Incentives / المحفزات والمكافآت التشجيعية: ${incentives.toLocaleString()} IQD
- Transportation Allowance / بدل النقل والمواصلات: ${transportation.toLocaleString()} IQD
- Operational Bonus / المكافآت والمنح: ${bonus.toLocaleString()} IQD
- Overtime Pay / أجر العمل الإضافي: ${overtime.toLocaleString()} IQD
- Earned Leave Allowance / بدل رصيد الإجازات المكتسبة: ${earnedLeave.toLocaleString()} IQD
--------------------------------------------------------------------------------
TOTAL ALLOWANCES / إجمالي البدلات المضافة: +${allowancesTotal.toLocaleString()} IQD
TOTAL GROSS SALARY / إجمالي الراتب الإجمالي: ${grossSalary.toLocaleString()} IQD

--------------------------------------------------------------------------------
2. DEDUCTIONS & STATUTORY / الاستقطاعات والتأمين
--------------------------------------------------------------------------------
- Pension & Social Security (5%) / استقطاع التقاعد والضمان: ${isExempt ? '0 IQD (Exempt / معفى)' : `-${socialSecurity.toLocaleString()} IQD`}
- Income Tax / استقطاع ضريبة الدخل: ${isExempt ? '0 IQD (Exempt / معفى)' : `-${incomeTax.toLocaleString()} IQD`}
- Health & Life Insurance / قسط التأمين الصحي والحياة: ${isExempt ? '0 IQD (Exempt / معفى)' : `-${insurance.toLocaleString()} IQD`}
- Loan Payments / استقطاع السلف والقروض: ${loanPayment > 0 ? `-${loanPayment.toLocaleString()} IQD` : '0 IQD'}
- Absence Deduction / استقطاع أيام الغياب: ${absenceDeduction > 0 ? `-${absenceDeduction.toLocaleString()} IQD` : '0 IQD'}
- Other Deductions & Penalties / استقطاعات أخرى وتنبيهات: ${otherDeductions > 0 ? `-${otherDeductions.toLocaleString()} IQD` : '0 IQD'}
--------------------------------------------------------------------------------
TOTAL DEDUCTIONS / إجمالي الاستقطاعات: -${totalDeductions.toLocaleString()} IQD

================================================================================
NET PAYABLE SALARY / صافي الراتب النهائي مستحق الدفع: ${netSalary.toLocaleString()} IQD
STATUS: ${isEn ? activePeriod.statusEn : activePeriod.statusAr}
================================================================================
Generated officially from VITAS Iraq HRMS Portal. Verified and Certified electronically.`;
    
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
    <div className="w-full max-w-3xl mx-auto p-3 sm:p-5 space-y-4 pb-20 animate-in fade-in">
      {/* Month Selector Bar at Top */}
      <div className={`p-3.5 rounded-2xl border transition-all ${
        isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-xs'
      }`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <label htmlFor="payroll-month-select" className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Select Month / Period:
            </label>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={currentIndex >= AVAILABLE_PERIODS.length - 1}
              className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300' : 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title="Previous Month"
            >
              <ChevronRight className="w-3.5 h-3.5 rtl:rotate-0 ltr:rotate-180" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              disabled={currentIndex <= 0}
              className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300' : 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title="Next Month"
            >
              <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-0 ltr:rotate-180" />
            </button>
            <button
              onClick={handlePrintPayslip}
              className="ms-2 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm flex items-center gap-1 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={handleDownloadSlip}
              className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
              title="Download Slip"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Combobox Select */}
        <div className="relative mt-2">
          <select
            id="payroll-month-select"
            value={selectedPeriodKey}
            onChange={(e) => setSelectedPeriodKey(e.target.value)}
            className={`w-full py-2 px-3.5 pe-9 rounded-xl text-xs font-bold border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none ${
              isDark 
                ? 'bg-slate-800 border-slate-700 text-white hover:border-teal-500/50' 
                : 'bg-slate-50 border-slate-300 text-slate-900 hover:border-teal-500 shadow-xs'
            }`}
          >
            {AVAILABLE_PERIODS.map(p => (
              <option key={p.key} value={p.key}>
                {p.nameEn} — [{p.statusEn}]
              </option>
            ))}
          </select>
          <div className="absolute top-1/2 -translate-y-1/2 end-3 pointer-events-none text-teal-600 dark:text-teal-400">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </div>

      {downloadSuccessToast && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{downloadSuccessToast}</span>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* OFFICIAL MONTHLY PAYSLIP DOCUMENT - EXACT 1:1 MATCH TO USER SCREENSHOT */}
      {/* ========================================================================================= */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 space-y-6 text-xs shadow-xl font-['Cairo'] relative text-slate-900 overflow-hidden">
        {/* Document Header */}
        <div className="flex items-start justify-between border-b-2 border-teal-600 pb-4 gap-2">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-teal-800 tracking-tight">
              VITAS Iraq Microfinance Institution
            </h3>
            <p className="text-xs font-bold text-slate-800 mt-0.5">
              Official Monthly Payslip Document
            </p>
            <p className="text-[11px] text-slate-600 mt-1">
              For Month: <span className="text-slate-900 font-bold">{activeMonthName}</span>
            </p>
          </div>
          <div className="text-left font-mono text-[11px] text-slate-600 shrink-0">
            <p className="font-bold text-teal-800">CONFIDENTIAL PAYSLIP</p>
            <p>Doc Ref: VTS-PAY-{badgeNo}</p>
            <p>Issue Date: {issueDate}</p>
          </div>
        </div>

        {/* Employee Info Grid (4 Columns x 2 Rows) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900">
          <div>
            <span className="text-[10px] text-slate-500 font-semibold block">Employee Name:</span>
            <span className="font-bold text-slate-900 text-sm block">{empName}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-semibold block">Employee ID / Badge:</span>
            <span className="font-mono text-teal-800 font-bold text-xs block">{employeeId} ({badgeNo})</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-semibold block">Branch / Location:</span>
            <span className="font-bold text-slate-900 text-xs block">{branchName}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-semibold block">Dept / Position:</span>
            <span className="font-bold text-slate-900 text-xs block">{positionName}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-semibold block">Bank / IBAN:</span>
            <span className="font-bold text-slate-900 text-xs block">{bankName}</span>
            <span className="font-mono text-[10px] text-slate-500 block truncate">{ibanNumber}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-semibold block">Join Date:</span>
            <span className="font-mono font-bold text-slate-900 text-xs block">{joinDate}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-semibold block">Tax Exemption Status:</span>
            <span className={`font-bold text-xs block ${isExempt ? 'text-amber-700' : 'text-emerald-700'}`}>
              {isExempt ? 'Exempt from SS & Tax' : 'Subject to SS & Tax'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-semibold block">Department:</span>
            <span className="font-bold text-slate-900 text-xs block">{deptName}</span>
          </div>
        </div>

        {/* Earnings vs Deductions Table (Side-by-Side Two Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Earnings Column */}
          <div className="space-y-2">
            <div className="border-b border-slate-200 pb-1.5 flex items-center justify-between">
              <h4 className="font-bold text-emerald-800 text-xs">Earnings</h4>
              <span className="material-symbols-outlined text-base text-emerald-700 font-bold">add_circle</span>
            </div>
            <div className="space-y-1.5 text-slate-900 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/70">
                <span>Nominal Basic Salary:</span>
                <span className="font-mono font-bold">{basicSalary.toLocaleString()} IQD</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/70">
                <span>Current Month Basic:</span>
                <span className="font-mono font-bold">{currentMonthBasic.toLocaleString()} IQD</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/70">
                <span>Phone Allowance:</span>
                <span className="font-mono font-bold">{phoneAllowance.toLocaleString()} IQD</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/70">
                <span>Family Allowance:</span>
                <span className="font-mono font-bold">{familyAllowance.toLocaleString()} IQD</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/70">
                <span>Certificate Allowance:</span>
                <span className="font-mono font-bold">{certAllowance.toLocaleString()} IQD</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/70">
                <span>Incentives:</span>
                <span className="font-mono font-bold">{incentives.toLocaleString()} IQD</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/70">
                <span>Transportation:</span>
                <span className="font-mono font-bold">{transportation.toLocaleString()} IQD</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/70">
                <span>Operational Bonus:</span>
                <span className="font-mono font-bold">{bonus.toLocaleString()} IQD</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/70">
                <span>Overtime Pay:</span>
                <span className="font-mono font-bold">{overtime.toLocaleString()} IQD</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/70">
                <span>Earned Leave Allowance:</span>
                <span className="font-mono font-bold">{earnedLeave.toLocaleString()} IQD</span>
              </div>
              <div className="flex justify-between py-1 text-xs font-semibold text-teal-800 border-b border-dashed border-teal-300">
                <span>Total Allowances Added:</span>
                <span className="font-mono font-bold">{allowancesTotal.toLocaleString()} IQD</span>
              </div>
              <div className="flex justify-between py-1.5 font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-3 rounded-lg mt-2">
                <span>Total Gross Salary:</span>
                <span className="font-mono">{grossSalary.toLocaleString()} IQD</span>
              </div>
            </div>
          </div>

          {/* Deductions Column */}
          <div className="space-y-2">
            <div className="border-b border-slate-200 pb-1.5 flex items-center justify-between">
              <h4 className="font-bold text-emerald-800 text-xs">Deductions</h4>
              <span className="material-symbols-outlined text-base text-emerald-700 font-bold">remove_circle</span>
            </div>
            <div className="space-y-1.5 text-slate-900 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/70">
                <span>Pension & Social Security:</span>
                <span className="font-mono font-bold text-rose-800">
                  {isExempt ? '0 IQD' : `-${socialSecurity.toLocaleString()} IQD`}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/70">
                <span>Income Tax:</span>
                <span className="font-mono font-bold text-rose-800">
                  {isExempt ? '0 IQD' : `-${incomeTax.toLocaleString()} IQD`}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/70">
                <span>Health Insurance:</span>
                <span className="font-mono font-bold text-rose-800">
                  {isExempt ? '0 IQD' : `-${insurance.toLocaleString()} IQD`}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/70">
                <span>Loan Deduction:</span>
                <span className="font-mono font-bold text-rose-800">
                  -{loanPayment.toLocaleString()} IQD
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/70">
                <span>Absence & Deductions:</span>
                <span className="font-mono font-bold text-rose-800">
                  -{(absenceDeduction + otherDeductions).toLocaleString()} IQD
                </span>
              </div>
              {/* Total Deductions: Exact pink rounded box matching screenshot */}
              <div className="flex justify-between py-1.5 font-bold text-rose-800 bg-[#ffebee]/90 border border-rose-200/80 px-3 rounded-lg mt-2">
                <span>Total Deductions:</span>
                <span className="font-mono">-{totalDeductions.toLocaleString()} IQD</span>
              </div>
            </div>
          </div>
        </div>

        {/* Net Payable Highlight Card */}
        <div className="p-4 rounded-2xl bg-teal-50 border border-teal-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-slate-700 block">Net Payable Salary:</span>
            <span className="text-2xl sm:text-3xl font-black text-teal-900 font-mono">
              {netSalary.toLocaleString()} IQD
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintPayslip}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print Payslip</span>
            </button>
            <button
              onClick={handleDownloadSlip}
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* Official Certification Footer */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
          <div>
            <p className="font-bold text-slate-700">VITAS Iraq Microfinance Institution</p>
            <p className="text-teal-700 font-semibold">Human Resources & Payroll Department • Certified Document</p>
          </div>
          <div className="text-left font-mono">
            <p>Doc Ref: VTS-PAY-{badgeNo}</p>
            <p>Issue Date: {issueDate}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeePayroll;
