import React, { useState } from 'react';
import { useEmployeeContext } from '../context/EmployeeContext';
import { 
  CreditCard, 
  Download, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  Building
} from 'lucide-react';

interface EmployeePayrollProps {
  employee: any;
  onLogout?: () => void;
}

export const EmployeePayroll: React.FC<EmployeePayrollProps> = ({ employee }) => {
  const { theme, language } = useEmployeeContext();
  const isDark = theme === 'dark';
  const isEn = language === 'en';

  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  const baseSalary = Number(employee?.salary || 900000);
  const phoneAllowance = 40000;
  const transportAllowance = 100000;
  const certAllowance = 80000;
  const bonus = 120000;
  const grossSalary = baseSalary + phoneAllowance + transportAllowance + certAllowance + bonus;

  const socialSecurityDeduction = Math.round(baseSalary * 0.05);
  const taxDeduction = 25000;
  const insuranceDeduction = 15000;
  const totalDeductions = socialSecurityDeduction + taxDeduction + insuranceDeduction;
  const netSalary = grossSalary - totalDeductions;

  const payslipHistory = [
    {
      monthAr: 'آب (أغسطس) 2026',
      monthEn: 'August 2026',
      shortMonthAr: 'آب 2026',
      shortMonthEn: 'Aug 2026',
      date: '2026-08-27',
      status: 'paid',
      gross: grossSalary,
      net: netSalary,
      basic: baseSalary,
      phone: phoneAllowance,
      transport: transportAllowance,
      cert: certAllowance,
      bonus: bonus,
      socialSecurity: socialSecurityDeduction,
      tax: taxDeduction,
      insurance: insuranceDeduction,
      totalDeductions: totalDeductions,
      bankAr: 'المصرف العراقي للتجارة (TBI)',
      bankEn: 'Trade Bank of Iraq (TBI)'
    },
    {
      monthAr: 'تموز (يوليو) 2026',
      monthEn: 'July 2026',
      shortMonthAr: 'تموز 2026',
      shortMonthEn: 'Jul 2026',
      date: '2026-07-27',
      status: 'paid',
      gross: grossSalary - 20000,
      net: netSalary - 20000,
      basic: baseSalary,
      phone: phoneAllowance,
      transport: transportAllowance,
      cert: certAllowance,
      bonus: bonus - 20000,
      socialSecurity: socialSecurityDeduction,
      tax: taxDeduction,
      insurance: insuranceDeduction,
      totalDeductions: totalDeductions,
      bankAr: 'المصرف العراقي للتجارة (TBI)',
      bankEn: 'Trade Bank of Iraq (TBI)'
    },
    {
      monthAr: 'حزيران (يونيو) 2026',
      monthEn: 'June 2026',
      shortMonthAr: 'حزيران 2026',
      shortMonthEn: 'Jun 2026',
      date: '2026-06-27',
      status: 'paid',
      gross: grossSalary,
      net: netSalary,
      basic: baseSalary,
      phone: phoneAllowance,
      transport: transportAllowance,
      cert: certAllowance,
      bonus: bonus,
      socialSecurity: socialSecurityDeduction,
      tax: taxDeduction,
      insurance: insuranceDeduction,
      totalDeductions: totalDeductions,
      bankAr: 'المصرف العراقي للتجارة (TBI)',
      bankEn: 'Trade Bank of Iraq (TBI)'
    }
  ];

  const activeSlip = payslipHistory[selectedMonthIndex];
  const activeMonth = isEn ? activeSlip.monthEn : activeSlip.monthAr;
  const activeShortMonth = isEn ? activeSlip.shortMonthEn : activeSlip.shortMonthAr;
  const activeBank = isEn ? activeSlip.bankEn : activeSlip.bankAr;
  const currencyLabel = isEn ? 'IQD' : 'د.ع';

  const handleDownloadSlip = () => {
    const empName = isEn ? (employee?.fullNameEn || 'Dina Haider Qasim') : (employee?.fullName || 'دينا حيدر قاسم');
    const content = `=== VITAS IRAQ OFFICIAL PAYSLIP ===\nEmployee: ${empName}\nBadge: ${employee?.badgeNo || 'V167'}\nMonth: ${activeMonth}\nBasic Salary: ${activeSlip.basic.toLocaleString()} IQD\nGross Salary: ${activeSlip.gross.toLocaleString()} IQD\nDeductions: ${activeSlip.totalDeductions.toLocaleString()} IQD\nNet Disbursed: ${activeSlip.net.toLocaleString()} IQD\nBank: ${activeBank}\nDate: ${activeSlip.date}\nStatus: Verified & Disbursed`;
    
    const blob = new Blob([content], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = isEn ? `Payslip_${employee?.badgeNo || 'V167'}_${activeShortMonth}.pdf` : `قسيمة_راتب_${employee?.badgeNo || 'V167'}_${activeShortMonth}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadSuccessToast(isEn ? `Payslip for ${activeShortMonth} downloaded successfully` : `تم تحميل قسيمة راتب ${activeShortMonth} بنجاح`);
    setTimeout(() => setDownloadSuccessToast(null), 3500);
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-4 pb-20 animate-in fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shadow-xs">
            <CreditCard className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h1 className={`text-base font-black leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isEn ? 'Payroll & Financial Compensation' : 'الرواتب والمستحقات المالية'}
            </h1>
            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {isEn ? 'Monthly salary slips, allowances, and official deductions' : 'كشوفات الرواتب الشهرية والبدلات والاستقطاعات الرسمية'}
            </p>
          </div>
        </div>

        <button
          onClick={handleDownloadSlip}
          className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isEn ? 'Download (PDF)' : 'تحميل (PDF)'}</span>
        </button>
      </div>

      {downloadSuccessToast && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
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
                ? 'bg-emerald-600 text-white shadow-sm'
                : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
              {isEn ? 'Paid & Transferred to Account' : 'مدفوع ومحوّل للحساب'}
            </span>
            <span className="text-[11px] font-mono text-emerald-200">
              {activeMonth}
            </span>
          </div>

          <div>
            <p className="text-xs text-slate-300">
              {isEn ? 'Net Salary Payable' : 'صافي الراتب المستحق'}
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
              <span>{activeBank}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Earnings & Allowances */}
      <div className={`p-4 rounded-2xl border ${
        isDark ? 'bg-slate-900/80 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
      }`}>
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-bold">
              {isEn ? 'Gross Earnings & Allowances' : 'المستحقات والبدلات الإجمالية'}
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-500">
            +{activeSlip.gross.toLocaleString('en-US')} {currencyLabel}
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-400">
            <span>{isEn ? 'Basic Salary' : 'الراتب الأساسي'}</span>
            <span className="font-mono font-bold text-slate-200 dark:text-slate-100">{activeSlip.basic.toLocaleString()} {currencyLabel}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>{isEn ? 'Transportation & Presentation Allowance' : 'بدل النقل والمظهر'}</span>
            <span className="font-mono font-bold text-slate-200 dark:text-slate-100">{activeSlip.transport.toLocaleString()} {currencyLabel}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>{isEn ? 'Academic Degree Allowance' : 'بدل الشهادة الأكاديمية'}</span>
            <span className="font-mono font-bold text-slate-200 dark:text-slate-100">{activeSlip.cert.toLocaleString()} {currencyLabel}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>{isEn ? 'Phone & Communications Allowance' : 'بدل الهاتف والاتصالات'}</span>
            <span className="font-mono font-bold text-slate-200 dark:text-slate-100">{activeSlip.phone.toLocaleString()} {currencyLabel}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>{isEn ? 'Performance & Productivity Incentive' : 'حافز الإنتاجية والأداء'}</span>
            <span className="font-mono font-bold text-emerald-400">+{activeSlip.bonus.toLocaleString()} {currencyLabel}</span>
          </div>
        </div>
      </div>

      {/* Deductions & Taxes */}
      <div className={`p-4 rounded-2xl border ${
        isDark ? 'bg-slate-900/80 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
      }`}>
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            <ArrowDownRight className="w-4 h-4 text-rose-500" />
            <h3 className="text-xs font-bold">
              {isEn ? 'Deductions & Insurances' : 'الاستقطاعات والتأمينات'}
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-rose-500">
            -{activeSlip.totalDeductions.toLocaleString('en-US')} {currencyLabel}
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-400">
            <span>{isEn ? 'Social Security & Pension (5%)' : 'استقطاع التقاعد والضمان الاجتماعي (5%)'}</span>
            <span className="font-mono font-bold text-rose-400">-{activeSlip.socialSecurity.toLocaleString()} {currencyLabel}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>{isEn ? 'Withholding Income Tax' : 'ضريبة الدخل المستقطعة'}</span>
            <span className="font-mono font-bold text-rose-400">-{activeSlip.tax.toLocaleString()} {currencyLabel}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>{isEn ? 'Comprehensive Medical Insurance' : 'التأمين الصحي الشامل'}</span>
            <span className="font-mono font-bold text-rose-400">-{activeSlip.insurance.toLocaleString()} {currencyLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
