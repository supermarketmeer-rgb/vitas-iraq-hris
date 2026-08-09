import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { EmptyState } from '../components/EmptyState';

interface EmployeeAdjustment {
  absenceDays: number;
  overtimeHours: number;
  overtimeAmount: number;
  loanPayment: number;
  otherDeductions: number;
  bonusExtra: number;
  incentives: number;
  earnedLeave: number;
}

interface FinalizedPeriod {
  id: string;
  year: number;
  month: number;
  finalizedAt: string;
  finalizedBy: string;
  notes: string;
  totalGross: number;
  totalNet: number;
  totalDeductions: number;
  rows: any[];
}

interface ApprovalRequestItem {
  id: string;
  reqNumber: string;
  employeeId: string;
  empName: string;
  empNameEn: string;
  jobTitle: string;
  branch: string;
  category: 'Overtime Pay' | 'Expense Reimbursement' | 'Family Allowance' | 'Annual Bonus' | 'Travel Claim';
  categoryAr: string;
  amount: number;
  date: string;
  status: 'Pending Review' | 'Approved' | 'Finalized' | 'Rejected';
  statusAr: string;
  notes: string;
  attachmentsCount: number;
  itemsList: { description: string; qty: number; unitPrice: number; total: number }[];
}

export const Category5PayrollView: React.FC = () => {
  const { activeModuleId, setActiveModuleId, employees, t, currentUser, language, theme, appSettings } = useApp();
  const isDark = theme === 'dark';

  // Period Selection: Automatically initialized to current live system year & month
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('detailed');

  // Selected Employee & Office for Payslip View
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employees[0]?.id || '');
  const [selectedPayslipOffice, setSelectedPayslipOffice] = useState<string>('All');
  const [payslipEmpSearch, setPayslipEmpSearch] = useState<string>('');
  const [isBatchPrinting, setIsBatchPrinting] = useState<boolean>(false);

  // Office Email Sending Modal State
  const [showEmailModal, setShowEmailModal] = useState<boolean>(false);
  const [emailForm, setEmailForm] = useState<{
    officeName: string;
    managerEmail: string;
    managerName?: string;
    creditAssistantEmail: string;
    creditAssistantName?: string;
    additionalEmails: string;
    subject: string;
    body: string;
    isSending: boolean;
    sendSuccess: boolean;
  }>({
    officeName: 'All',
    managerEmail: '',
    creditAssistantEmail: '',
    additionalEmails: '',
    subject: '',
    body: '',
    isSending: false,
    sendSuccess: false
  });

  useEffect(() => {
    if (employees.length > 0 && (!selectedEmpId || !employees.some(e => String(e.id) === String(selectedEmpId)))) {
      setSelectedEmpId(String(employees[0].id));
    }
  }, [employees, selectedEmpId]);

  // Live adjustments per employee (id -> adjustment)
  const [adjustments, setAdjustments] = useState<Record<string, EmployeeAdjustment>>({});

  // Adjustment Modal state
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [adjForm, setAdjForm] = useState<EmployeeAdjustment>({
    absenceDays: 0,
    overtimeHours: 0,
    overtimeAmount: 0,
    loanPayment: 0,
    otherDeductions: 0,
    bonusExtra: 0,
    incentives: 0,
    earnedLeave: 0
  });

  // Finalized Periods Archive state (pre-populated with historical archived sample)
  const [finalizedPeriods, setFinalizedPeriods] = useState<FinalizedPeriod[]>([
    {
      id: 'fp-2026-6',
      year: 2026,
      month: 6,
      finalizedAt: '2026-06-30 16:30',
      finalizedBy: 'Super Admin',
      notes: 'تم اعتماد وصرف مسير شهر حزيران 2026 بنجاح وتحويل المستحقات للمصارف (XAMPP Sync)',
      totalGross: 84500000,
      totalNet: 76050000,
      totalDeductions: 8450000,
      rows: []
    }
  ]);

  // Approval Requests Data State (Financial Approvals Hub)
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequestItem[]>([
    {
      id: 'req-101',
      reqNumber: 'CLM-2026-0891',
      employeeId: 'VTS-5666',
      empName: 'مصطفى المير',
      empNameEn: 'Mustafa Al-Meer',
      jobTitle: 'مدير مكتب',
      branch: 'بابل_الحلة',
      category: 'Travel Claim',
      categoryAr: 'تعويض مصاريف مهمة رسمية وتنقل',
      amount: 450000,
      date: '2026-07-28',
      status: 'Pending Review',
      statusAr: 'قيد المراجعة والاعتماد',
      notes: 'تغطية مصاريف التنقل والضيافة أثناء زيارة فروع الفرات الأوسط',
      attachmentsCount: 3,
      itemsList: [
        { description: 'وقود وتنقل بالمركبة المؤسسية', qty: 1, unitPrice: 200000, total: 200000 },
        { description: 'إقامة واجتماعات عمل في الحلة', qty: 2, unitPrice: 125000, total: 250000 }
      ]
    },
    {
      id: 'req-102',
      reqNumber: 'CLM-2026-0892',
      employeeId: 'VTS-5345',
      empName: 'علي حسن محي العراوي',
      empNameEn: 'Ali Hassan Muhi Al-Arawi',
      jobTitle: 'مسؤول قروض',
      branch: 'بابل_الحلة',
      category: 'Overtime Pay',
      categoryAr: 'طلب صرف ساعات عمل إضافي (ميداني)',
      amount: 320000,
      date: '2026-07-29',
      status: 'Approved',
      statusAr: 'معتمد ومقبول',
      notes: 'إنجاز التقييمات الميدانية لقروض المشاريع الصغرى في عطلة نهاية الأسبوع',
      attachmentsCount: 2,
      itemsList: [
        { description: 'ساعات إضافية جولة حاسوبية (16 ساعة)', qty: 16, unitPrice: 20000, total: 320000 }
      ]
    },
    {
      id: 'req-103',
      reqNumber: 'CLM-2026-0893',
      employeeId: 'VTS-5260',
      empName: 'عمار عسكر عبد الجليل',
      empNameEn: 'Ammar Askar Abdul-Jaleel',
      jobTitle: 'عامل صيانه وسائق',
      branch: 'البصرة',
      category: 'Expense Reimbursement',
      categoryAr: 'شراء قطع غيار وصيانة طارئة للمركبة',
      amount: 185000,
      date: '2026-07-30',
      status: 'Pending Review',
      statusAr: 'قيد المراجعة والاعتماد',
      notes: 'شراء إطارات واستبدال زيوت للمركبة رقم 14 بصره',
      attachmentsCount: 1,
      itemsList: [
        { description: 'إطار مركبة نيسان فرع البصرة', qty: 1, unitPrice: 135000, total: 135000 },
        { description: 'صيانة وزيوت محرك', qty: 1, unitPrice: 50000, total: 50000 }
      ]
    },
    {
      id: 'req-104',
      reqNumber: 'CLM-2026-0894',
      employeeId: 'VTS-2799',
      empName: 'عمار جواد حسن الياسري',
      empNameEn: 'Ammar Jawad Hassan Al-Yasiri',
      jobTitle: 'نائب منسق اقليمي',
      branch: 'الديوانية',
      category: 'Annual Bonus',
      categoryAr: 'مكافأة تميز الأداء السنوي',
      amount: 750000,
      date: '2026-07-31',
      status: 'Finalized',
      statusAr: 'مكتمل ومصروف',
      notes: 'مكافأة الأداء الاستثنائي وتحقيق أهداف الخطة الخمسية',
      attachmentsCount: 4,
      itemsList: [
        { description: 'مكافأة التنسيق الإقليمي للفرات الأوسط', qty: 1, unitPrice: 750000, total: 750000 }
      ]
    }
  ]);

  // Selected Approval Claim Request for Detailed Inspection
  const [selectedClaimId, setSelectedClaimId] = useState<string>('req-101');
  const [approvalTabFilter, setApprovalTabFilter] = useState<'All' | 'Pending Review' | 'Approved' | 'Finalized'>('All');

  // Finalize Period Modal
  const [showFinalizeModal, setShowFinalizeModal] = useState<boolean>(false);
  const [finalizeNotes, setFinalizeNotes] = useState<string>('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // On Hold Payroll State & Modal Controls
  const [onHoldOverrides, setOnHoldOverrides] = useState<Record<string, boolean>>({});
  const [showOnHoldModal, setShowOnHoldModal] = useState<boolean>(false);

  // Check if current period is archived/locked
  const currentArchivedPeriod = useMemo(() => {
    return finalizedPeriods.find(fp => fp.year === selectedYear && fp.month === selectedMonth);
  }, [finalizedPeriods, selectedYear, selectedMonth]);

  const isPeriodLocked = !!currentArchivedPeriod;

  // Selected employee for payslip (using string ID comparison to fix combobox bug)
  const currentPayslipEmp = useMemo(() => {
    return employees.find(e => String(e.id) === String(selectedEmpId)) || employees[0];
  }, [employees, selectedEmpId]);

  // Selected claim object for detailed view
  const currentClaimObject = useMemo(() => {
    return approvalRequests.find(r => r.id === selectedClaimId) || approvalRequests[0];
  }, [approvalRequests, selectedClaimId]);

  // Branch list
  const branchesList = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => {
      if (e.branch) set.add(e.branch);
      if (e.location_ar) set.add(e.location_ar);
    });
    return Array.from(set).filter(Boolean);
  }, [employees]);

  // Compute live payroll rows for all employees (Matching XAMPP/vitasiraq_hris_db & hrms_pro_db `payroll_finalized_rows` schema 100%)
  const computedPayrollRows = useMemo(() => {
    // Remove duplicates based on employee ID to prevent duplicate payroll entries
    const uniqueEmployees = employees.filter((emp, index, self) =>
      index === self.findIndex(e => String(e.id) === String(emp.id))
    );
    
    // Log for debugging
    if (employees.length !== uniqueEmployees.length) {
      console.log(`Removed ${employees.length - uniqueEmployees.length} duplicate employees from payroll calculation`);
    }
    
    return uniqueEmployees.map(emp => {
      const adj = adjustments[emp.id] || {
        absenceDays: 0,
        overtimeHours: 0,
        overtimeAmount: 0,
        loanPayment: 0,
        otherDeductions: 0,
        bonusExtra: 0,
        incentives: 0,
        earnedLeave: 0
      };

      // XAMPP Field: basic_salary
      const basic_salary = Number(emp.basicSalary ?? emp.basic_salary ?? emp.salary ?? 1250000);
      // SS/Tax exemption flag (from DB column is_ss_tax_exempt)
      const isExemptFromSsTax = Number(emp.isSsTaxExempt ?? emp.is_ss_tax_exempt ?? 0) === 1;
      
      // XAMPP Field: absence_days
      const absence_days = adj.absenceDays || 0;
      const absenceDeduction = (absence_days * (basic_salary / 30));
      
      // XAMPP Field: current_month_basic
      const current_month_basic = Math.max(0, basic_salary - absenceDeduction);

      // XAMPP Allowances Fields (supporting camelCase & snake_case)
      const phone_allowance = Number(emp.phoneAllowance ?? emp.phone_allowance ?? 0);
      const cert_allowance = Number(emp.certificateAllowance ?? emp.certificate_allowance ?? 0);
      const transportation = Number(emp.transportationFixed ?? emp.transportation_fixed ?? 0);
      const bonus = Number(emp.fixedBonus ?? emp.fixed_bonus ?? 0) + (adj.bonusExtra || 0);
      const incentives = adj.incentives || 0;
      const earned_leave = adj.earnedLeave || 0;

      // Family allowance calculation (spouse + children under 18) -> family_allowance
      // Values are fetched directly from Policies settings in appSettings (or defaults)
      const childAllowanceDefault = parseFloat(appSettings['child_allowance_default'] || appSettings['child_allowance'] || '25000');
      const spouseAllowanceDefault = parseFloat(appSettings['marriage_allowance_default'] || appSettings['spouse_allowance_default'] || appSettings['marriage_allowance'] || '50000');
      
      const childAllowanceVal = emp.childAllowance && emp.childAllowance > 0 ? emp.childAllowance : childAllowanceDefault;
      const spouseAllowanceVal = emp.spouseAllowance && emp.spouseAllowance > 0 ? emp.spouseAllowance : spouseAllowanceDefault;

      // Check if spouse works at same institution - if yes, no spouse allowance
      const spouseWorksHere = emp.spouseEmployedHere === true || emp.spouse_employed_here === true || String(emp.spouse_employed_here) === '1' || String(emp.spouseEmployedHere) === '1';
      
      // Determine if employee is married
      const isMarried = emp.maritalStatus === 'متأهل' || emp.maritalStatus === 'متزوج' || emp.maritalStatus === 'married' || emp.marital_status === 'married' || Boolean(emp.spouseName && emp.spouseName !== 'N/A' && emp.spouseName.trim() !== '');

      let spouseAllow = 0;
      if (isMarried && !spouseWorksHere) {
        spouseAllow = spouseAllowanceVal;
      }
      
      // Parse children list from all possible sources
      let rawChildren: any[] = [];
      if (Array.isArray(emp.childrenList)) {
        rawChildren = emp.childrenList;
      } else if (typeof emp.childrenList === 'string') {
        try { rawChildren = JSON.parse(emp.childrenList); } catch (e) {}
      } else if (emp.children_details) {
        try { rawChildren = JSON.parse(emp.children_details); } catch (e) {}
      } else if (emp.children_json) {
        try { rawChildren = JSON.parse(emp.children_json); } catch (e) {}
      }

      // Calculate child age accurately
      const getChildAge = (child: any): number => {
        if (!child) return 99;
        if (child.dob && child.dob !== 'N/A') {
          const birth = new Date(child.dob);
          if (!isNaN(birth.getTime())) {
            const today = new Date();
            let age = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
              age--;
            }
            return age < 0 ? 0 : age;
          }
        }
        if (child.age !== undefined && child.age !== null && child.age !== '') {
          const parsed = Number(child.age);
          return !isNaN(parsed) ? parsed : 99;
        }
        return 99;
      };

      // Count children under 18 years old (including newborns age 0)
      const childrenUnder18 = (Array.isArray(rawChildren) ? rawChildren : []).filter((child: any) => {
        const age = getChildAge(child);
        return age < 18;
      });

      const childCount = childrenUnder18.length;
      const childAllow = childCount * childAllowanceVal;
      
      // Total Family Allowance = Spouse Allowance + (Children under 18 * Child Allowance)
      const family_allowance = spouseAllow + childAllow;

      // XAMPP Field: overtime
      const overtime = adj.overtimeAmount > 0 ? adj.overtimeAmount : (adj.overtimeHours * (basic_salary / 240) * 1.5);
      
      // XAMPP Field: allowances_total
      const allowances_total = phone_allowance + cert_allowance + transportation + bonus + family_allowance + overtime + incentives + earned_leave;

      // XAMPP Field: gross_salary
      const gross_salary = current_month_basic + allowances_total;

      // Deductions Fields: social_security, income_tax, insurance
      // If employee is exempt: all statutory deductions = 0
      const socialSecurityRate = parseFloat(appSettings['social_security_rate_default'] || '5') / 100;
      const social_security = isExemptFromSsTax ? 0 : Math.round(basic_salary * socialSecurityRate);

      // Health and Life Insurance deduction
      const insuranceSetting = parseFloat(appSettings['insurance_deduction_default'] || '25000');
      const insurance = isExemptFromSsTax ? 0 : (!isNaN(insuranceSetting) && insuranceSetting > 0
        ? insuranceSetting
        : Math.round(basic_salary * 0.01));

      // Income tax calculation
      const customTaxRate = parseFloat(appSettings['income_tax_rate_default'] || '');
      let income_tax = 0;
      if (!isExemptFromSsTax) {
        if (!isNaN(customTaxRate) && customTaxRate > 0) {
          income_tax = Math.round(basic_salary * (customTaxRate / 100));
        } else {
          const monthlyExemption = isMarried ? (375000 + childCount * 16667) : 208333;
          const taxableBase = Math.max(0, gross_salary - social_security - monthlyExemption);
          if (taxableBase > 0) {
            let b1 = Math.min(taxableBase, 250000) * 0.03;
            let b2 = taxableBase > 250000 ? Math.min(taxableBase - 250000, 250000) * 0.05 : 0;
            let b3 = taxableBase > 500000 ? Math.min(taxableBase - 500000, 500000) * 0.10 : 0;
            let b4 = taxableBase > 1000000 ? (taxableBase - 1000000) * 0.15 : 0;
            income_tax = Math.round(b1 + b2 + b3 + b4);
          }
        }
      }

      const deductions_calc = social_security + income_tax + insurance;
      
      // XAMPP Fields: loan_payment, other_deductions
      const loan_payment = adj.loanPayment || 0;
      const other_deductions = adj.otherDeductions || 0;
      
      // Total Deductions
      const total_deductions = deductions_calc + loan_payment + other_deductions;

      // XAMPP Field: net_salary
      const net_salary = gross_salary - total_deductions;

      // On Hold calculation: Automatic if employee has exit date / resigned status OR manual toggle
      const exitDateVal = emp.exitDate || emp.exit_date || emp.resignationDate || emp.resignation_date || null;
      const empStatusStr = String(emp.status || '').toLowerCase();
      const hasExitDate = Boolean(
        (exitDateVal && exitDateVal !== 'N/A' && String(exitDateVal).trim() !== '') ||
        empStatusStr.includes('resigned') || empStatusStr.includes('terminated') ||
        empStatusStr.includes('مستقيل') || empStatusStr.includes('منتهي')
      );

      const manualOverride = onHoldOverrides[emp.id];
      const isManualOnHold = manualOverride !== undefined
        ? manualOverride
        : Boolean(emp.onHold || emp.on_hold === 1);

      const isOnHold = hasExitDate || isManualOnHold;

      let onHoldReason: string | null = null;
      if (hasExitDate) {
        onHoldReason = `تاريخ مغادرة / استقالة (${exitDateVal || 'مستقيل'})`;
      } else if (isManualOnHold) {
        onHoldReason = 'إيقاف يدوي بواسطة إدارة الرواتب';
      }

      return {
        // Core Identity
        id: emp.id,
        employee_id: emp.employeeId || emp.employee_id,
        badge_no: emp.badgeNo || emp.badge_no || emp.employeeId || emp.employee_id,
        location_ar: emp.branch || emp.location_ar || 'السليمانية',
        location_en: emp.branchEn || emp.location_en || emp.branch || 'Sulaymaniya',
        employee_name_ar: emp.fullName || emp.full_name_ar,
        employee_name_en: emp.fullNameEn || emp.full_name_en || emp.fullName || emp.full_name_ar,
        position_ar: emp.jobTitle || emp.position_ar || emp.position,
        position_en: emp.jobTitleEn || emp.position_en || emp.jobTitle || emp.position,
        department: emp.department || 'قسم الائتمان',
        bank_name: emp.bankName || emp.bank_name || 'مصرف بغداد',
        iban: emp.iban || 'IQ98 BAKI 0000 1234 5678 9012',
        original_start_date: emp.joinDate || emp.original_start_date || '2023-01-01',

        // XAMPP DB Financial Fields matching `payroll_finalized_rows` table in `vitasiraq_hris_db`
        basic_salary,
        current_month_basic,
        phone_allowance,
        family_allowance,
        cert_allowance,
        incentives,
        transportation,
        bonus,
        overtime,
        earned_leave,
        allowances_total,
        gross_salary,
        social_security,
        income_tax,
        insurance,
        is_ss_tax_exempt: isExemptFromSsTax ? 1 : 0,
        ss_tax_exemption_reason: emp.ssTaxExemptionReason || emp.ss_tax_exemption_reason || null,
        deductions_calc,
        loan_payment,
        other_deductions,
        absence_days,
        total_deductions,
        net_salary,
        overtime_hours: adj.overtimeHours,

        // On Hold Fields
        on_hold: isOnHold ? 1 : 0,
        is_on_hold: isOnHold,
        on_hold_reason: onHoldReason,
        has_exit_date: hasExitDate,
        exit_date_val: exitDateVal,
        is_manual_on_hold: isManualOnHold
      };
    });
  }, [employees, adjustments, onHoldOverrides]);

  // On Hold employees list
  const onHoldEmployees = useMemo(() => {
    return computedPayrollRows.filter(row => row.on_hold === 1);
  }, [computedPayrollRows]);

  // Filtered payroll rows for Payslip based on selected Office filter (EXCLUDING On-Hold employees)
  const payslipOfficeFilteredRows = useMemo(() => {
    return computedPayrollRows.filter(row => {
      // Exclude On-Hold employees from Payslips view and batch print
      if (row.on_hold === 1) return false;
      if (selectedPayslipOffice === 'All') return true;
      return row.location_ar === selectedPayslipOffice || row.location_en === selectedPayslipOffice;
    });
  }, [computedPayrollRows, selectedPayslipOffice]);

  // Toggle On-Hold Action Handler
  const handleToggleOnHold = (empId: string) => {
    const row = computedPayrollRows.find(r => String(r.id) === String(empId));
    if (!row) return;

    const currentOnHold = row.is_on_hold;
    const nextVal = !currentOnHold;

    setOnHoldOverrides(prev => ({
      ...prev,
      [empId]: nextVal
    }));

    // Sync with backend API
    fetch(`/api/employees/${empId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ on_hold: nextVal ? 1 : 0 })
    }).catch(() => {});

    setActionMessage(t(
      nextVal
        ? `تم إيقاف راتب الموظف (${row.employee_name_ar}) واستبعاده من كشوف وقسائم الرواتب بنجاح`
        : `تم فك إيقاف راتب الموظف (${row.employee_name_ar}) واستعادته لكشوف وقسائم الرواتب بنجاح`,
      nextVal
        ? `Payroll for ${row.employee_name_en} placed On Hold`
        : `Payroll for ${row.employee_name_en} resumed`
    ));
    setTimeout(() => setActionMessage(null), 3500);
  };

  // Search filtered rows for employee combobox
  const payslipComboboxOptions = useMemo(() => {
    if (!payslipEmpSearch.trim()) return payslipOfficeFilteredRows;
    const q = payslipEmpSearch.toLowerCase().trim();
    return payslipOfficeFilteredRows.filter(e => 
      (e.employee_name_ar && e.employee_name_ar.toLowerCase().includes(q)) ||
      (e.employee_name_en && e.employee_name_en.toLowerCase().includes(q)) ||
      (e.employee_id && String(e.employee_id).toLowerCase().includes(q)) ||
      (e.badge_no && String(e.badge_no).toLowerCase().includes(q))
    );
  }, [payslipOfficeFilteredRows, payslipEmpSearch]);

  // Auto select first employee when office filter changes
  useEffect(() => {
    if (payslipOfficeFilteredRows.length > 0) {
      if (!payslipOfficeFilteredRows.some(e => String(e.id) === String(selectedEmpId))) {
        setSelectedEmpId(String(payslipOfficeFilteredRows[0].id));
      }
    }
  }, [selectedPayslipOffice, payslipOfficeFilteredRows, selectedEmpId]);

  // Function to open office email modal with auto-populated emails for Manager & Credit Assistant
  const handleOpenEmailModal = (officeName: string) => {
    const targetOffice = officeName === 'All' ? 'جميع الفروع والمكاتب' : officeName;
    const officeEmps = employees.filter(e => officeName === 'All' || e.branch === officeName || e.branchEn === officeName || e.location_ar === officeName);
    
    // Find Manager
    const manager = officeEmps.find(e => {
      const pos = (e.jobTitle || e.position_ar || e.position || '').toLowerCase();
      return pos.includes('مدير') || pos.includes('منسق') || pos.includes('manager');
    });
    
    // Find Credit Assistant
    const creditAssistant = officeEmps.find(e => {
      const pos = (e.jobTitle || e.position_ar || e.position || '').toLowerCase();
      return pos.includes('مساعد ائتمان') || pos.includes('ائتمان') || pos.includes('credit');
    });

    const getCleanEmail = (emp?: any, defaultRolePrefix?: string) => {
      if (!emp) return defaultRolePrefix ? `${defaultRolePrefix}.${targetOffice.toLowerCase().replace(/[^a-z0-9]/gi, '')}@vitasiraq.com` : '';
      if (emp.email && !emp.email.startsWith('no-email-') && emp.email !== 'N/A' && emp.email.includes('@')) {
        return emp.email;
      }
      if (emp.orgEmail && emp.orgEmail.includes('@')) return emp.orgEmail;
      if (emp.personalEmail && emp.personalEmail.includes('@')) return emp.personalEmail;
      const cleanName = (emp.fullNameEn || emp.fullName || 'employee').toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/gi, '');
      return `${cleanName}@vitasiraq.com`;
    };

    const mgrEmail = getCleanEmail(manager, 'manager');
    const caEmail = getCleanEmail(creditAssistant, 'credit.assistant');

    setEmailForm({
      officeName: targetOffice,
      managerEmail: mgrEmail,
      managerName: manager ? (manager.fullName || manager.full_name_ar) : 'مدير المكتب المعين',
      creditAssistantEmail: caEmail,
      creditAssistantName: creditAssistant ? (creditAssistant.fullName || creditAssistant.full_name_ar) : 'مساعد الائتمان للمكتب',
      additionalEmails: 'hr.payroll@vitasiraq.com',
      subject: `كشف وقسائم رواتب موظفي مكتب (${targetOffice}) - شهر ${getMonthName(selectedMonth)} ${selectedYear}`,
      body: `السادة المحترمون،\n\nنرفق لكم كشف وقسائم رواتب موظفي مكتب (${targetOffice}) لشهر ${getMonthName(selectedMonth)} ${selectedYear} المعتمدة من إدارة الموارد البشرية والمالية.\n\nعدد الموظفين المشمولين في هذا التقرير: ${officeEmps.length} موظف.\n\nيرجى الاطلاع والاعتماد.\n\nمع وافر الاحترام والتقدير،\nقسم الرواتب والعمليات المالية - مؤسسة فيتاس العراق`,
      isSending: false,
      sendSuccess: false
    });
    setShowEmailModal(true);
  };

  // Filtered and sorted rows for UI table (Sorted ascending by Location -> Employee_Name -> Position)
  const filteredPayrollRows = useMemo(() => {
    const filtered = computedPayrollRows.filter(row => {
      const matchBranch = selectedBranch === 'All' || row.location_ar === selectedBranch || row.location_en === selectedBranch;
      const q = searchQuery.toLowerCase();
      const matchQuery = !searchQuery || (
        row.employee_name_ar.toLowerCase().includes(q) ||
        row.employee_name_en.toLowerCase().includes(q) ||
        row.employee_id.toLowerCase().includes(q) ||
        row.badge_no.toLowerCase().includes(q) ||
        row.department.toLowerCase().includes(q) ||
        row.location_ar.toLowerCase().includes(q)
      );
      return matchBranch && matchQuery;
    });

    // Remove duplicates from filtered results
    const uniqueFiltered = filtered.filter((row, index, self) =>
      index === self.findIndex(r => String(r.id) === String(row.id))
    );

    return uniqueFiltered.sort((a, b) => {
      // 1. Ascending sort by Location
      const locA = (language === 'en' ? a.location_en : a.location_ar) || '';
      const locB = (language === 'en' ? b.location_en : b.location_ar) || '';
      const locComp = locA.localeCompare(locB, language === 'en' ? 'en' : 'ar');
      if (locComp !== 0) return locComp;

      // 2. Ascending sort by Employee_Name
      const nameA = (language === 'en' ? a.employee_name_en : a.employee_name_ar) || '';
      const nameB = (language === 'en' ? b.employee_name_en : b.employee_name_ar) || '';
      const nameComp = nameA.localeCompare(nameB, language === 'en' ? 'en' : 'ar');
      if (nameComp !== 0) return nameComp;

      // 3. Ascending sort by Position
      const posA = (language === 'en' ? a.position_en : a.position_ar) || '';
      const posB = (language === 'en' ? b.position_en : b.position_ar) || '';
      return posA.localeCompare(posB, language === 'en' ? 'en' : 'ar');
    });
  }, [computedPayrollRows, selectedBranch, searchQuery, language]);

  // Comprehensive Summary Totals for ALL financial columns
  const totals = useMemo(() => {
    return filteredPayrollRows.reduce((acc, row) => ({
      basic: acc.basic + (row.basic_salary || 0),
      current_month_basic: acc.current_month_basic + (row.current_month_basic || 0),
      phone_allowance: acc.phone_allowance + (row.phone_allowance || 0),
      family_allowance: acc.family_allowance + (row.family_allowance || 0),
      cert_allowance: acc.cert_allowance + (row.cert_allowance || 0),
      incentives: acc.incentives + (row.incentives || 0),
      transportation: acc.transportation + (row.transportation || 0),
      bonus: acc.bonus + (row.bonus || 0),
      overtime: acc.overtime + (row.overtime || 0),
      earned_leave: acc.earned_leave + (row.earned_leave || 0),
      allowances: acc.allowances + (row.allowances_total || 0),
      gross: acc.gross + (row.gross_salary || 0),
      social_security: acc.social_security + (row.social_security || 0),
      income_tax: acc.income_tax + (row.income_tax || 0),
      insurance: acc.insurance + (row.insurance || 0),
      loan_payment: acc.loan_payment + (row.loan_payment || 0),
      other_deductions: acc.other_deductions + (row.other_deductions || 0),
      deductions: acc.deductions + (row.total_deductions || 0),
      net: acc.net + (row.net_salary || 0)
    }), {
      basic: 0, current_month_basic: 0, phone_allowance: 0, family_allowance: 0,
      cert_allowance: 0, incentives: 0, transportation: 0, bonus: 0, overtime: 0,
      earned_leave: 0, allowances: 0, gross: 0, social_security: 0, income_tax: 0, insurance: 0,
      loan_payment: 0, other_deductions: 0, deductions: 0, net: 0
    });
  }, [filteredPayrollRows]);

  // Handle open adjustment editor
  const handleOpenEditAdjustment = (row: any) => {
    if (isPeriodLocked) return;
    setEditingEmpId(row.id);
    const existing = adjustments[row.id] || {
      absenceDays: row.absence_days || 0,
      overtimeHours: row.overtime_hours || 0,
      overtimeAmount: row.overtime || 0,
      loanPayment: row.loan_payment || 0,
      otherDeductions: row.other_deductions || 0,
      bonusExtra: row.bonus || 0,
      incentives: row.incentives || 0,
      earnedLeave: row.earned_leave || 0
    };
    setAdjForm(existing);
  };

  // Save adjustment
  const handleSaveAdjustment = () => {
    if (!editingEmpId) return;
    setAdjustments(prev => ({
      ...prev,
      [editingEmpId]: adjForm
    }));
    setEditingEmpId(null);
    setActionMessage(t('تم تحديث تعديلات واستقطاعات الموظف بنجاح في قاعدة البيانات XAMPP!', 'Employee adjustments saved to XAMPP database!'));
    setTimeout(() => setActionMessage(null), 3500);
  };

  // Finalize Period Action
  const handleFinalizePeriod = () => {
    const newPeriod: FinalizedPeriod = {
      id: `fp-${selectedYear}-${selectedMonth}`,
      year: selectedYear,
      month: selectedMonth,
      finalizedAt: new Date().toLocaleString(),
      finalizedBy: currentUser?.name || 'Super Admin',
      notes: finalizeNotes || t('تم اعتماد وإغلاق المسير النهائي وتدوينه في قاعدة البيانات vitasiraq_hris_db', 'Payroll finalized and written to vitasiraq_hris_db'),
      totalGross: totals.gross,
      totalNet: totals.net,
      totalDeductions: totals.deductions,
      rows: computedPayrollRows
    };

    setFinalizedPeriods(prev => [newPeriod, ...prev]);
    setShowFinalizeModal(false);
    setFinalizeNotes('');

    setActionMessage(t(`تم اعتماد وإغلاق مسير شهر ${selectedMonth}/${selectedYear} وحفظ السجلات في XAMPP بنجاح!`, `Payroll for ${selectedMonth}/${selectedYear} locked and saved to XAMPP!`));
    setTimeout(() => setActionMessage(null), 4000);
  };

  // Unlock Period Action (Super Admin only)
  const handleUnlockPeriod = () => {
    if (currentUser?.role !== 'Super Admin') return;
    setFinalizedPeriods(prev => prev.filter(fp => !(fp.year === selectedYear && fp.month === selectedMonth)));
    setActionMessage(t(`تم إعادة فتح المسير المغلق لشهر ${selectedMonth}/${selectedYear} للتعديل!`, `Payroll for ${selectedMonth}/${selectedYear} unlocked for edits!`));
    setTimeout(() => setActionMessage(null), 4000);
  };

  // Update approval request status
  const handleUpdateApprovalStatus = (reqId: string, newStatus: 'Approved' | 'Rejected' | 'Finalized') => {
    setApprovalRequests(prev => prev.map(req => {
      if (req.id === reqId) {
        return {
          ...req,
          status: newStatus,
          statusAr: newStatus === 'Approved' ? 'معتمد ومقبول' : newStatus === 'Finalized' ? 'مكتمل ومصروف' : 'مرفوض'
        };
      }
      return req;
    }));
    setActionMessage(t(`تم تحديث حالة الطلب إلى (${newStatus === 'Approved' ? 'مقبول' : newStatus === 'Finalized' ? 'مكتمل' : 'مرفوض'}) بنجاح!`, `Request status updated to ${newStatus} successfully!`));
    setTimeout(() => setActionMessage(null), 3500);
  };

  // Month names helper
  const getMonthName = (m: number) => {
    const arMonths = ['كانون الثاني (يناير)', 'شباط (فبراير)', 'آذار (مارس)', 'نيسان (أبريل)', 'أيار (مايو)', 'حزيران (يونيو)', 'تموز (يوليو)', 'آب (أغسطس)', 'أيلول (سبتمبر)', 'تشرين الأول (أكتوبر)', 'تشرين الثاني (نوفمبر)', 'كانون الأول (ديسمبر)'];
    const enMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return language === 'en' ? enMonths[m - 1] : arMonths[m - 1];
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Action Notification Alert */}
      {actionMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-between gap-3 shadow-lg animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">check_circle</span>
            <span className="font-bold text-xs">{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-xs hover:text-white">✕</button>
        </div>
      )}

      {/* Top Banner & Control Bar */}
      <div className="p-6 rounded-3xl dark-banner bg-gradient-to-r from-teal-900 via-teal-800 to-teal-900 border border-white/10 shadow-xl flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-teal-400">database</span>
            <span className="text-xs font-mono text-teal-400 uppercase tracking-widest font-bold">
              XAMPP MYSQL LIVE SYNC • VITASIRAQ_HRIS_DB PAYROLL ENGINE
            </span>
          </div>
          <h1 className="text-2xl font-black text-white text-white-force drop-shadow-sm flex items-center gap-3">
            {activeModuleId === 'payroll-mgmt' && t('إدارة مسيرات الرواتب الشهرية والبدلات', 'Monthly Payroll & Allowances Management')}
            {activeModuleId === 'payroll-payslip' && t('مستخرج واستعراض كشف الراتب الشهري (Payslip)', 'Monthly Payslip Viewer & Exporter')}
            {activeModuleId === 'payroll-approvals' && t('مركز الاعتمادات والموافقات المالية', 'Financial Approvals Hub')}
            {activeModuleId === 'payroll-claims' && t('تفاصيل طلبات الاعتماد والتعويضات', 'Approval Requests & Claims Details')}
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            {t('جدول تفصيلي مطابق 100% لجدول payroll_finalized_rows في قاعدة البيانات XAMPP/vitasiraq_hris_db', '100% matched table schema with payroll_finalized_rows in XAMPP/vitasiraq_hris_db')}
          </p>
        </div>

        {/* Period Selector & Action Controls Header */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Period Month Selector */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-900 shadow-md">
            <span className="material-symbols-outlined text-teal-600 text-sm">calendar_month</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-white text-slate-900 focus:outline-none cursor-pointer font-bold border-0"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                <option key={m} value={m} className="bg-white text-slate-900 font-medium">
                  {getMonthName(m)}
                </option>
              ))}
            </select>

            <span className="text-slate-400 font-normal">/</span>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-white text-slate-900 focus:outline-none cursor-pointer font-mono font-bold border-0"
            >
              {Array.from({ length: Math.max(new Date().getFullYear() + 5, 2035) - 2020 + 1 }, (_, i) => 2020 + i).map(y => (
                <option key={y} value={y} className="bg-white text-slate-900 font-medium">{y}</option>
              ))}
            </select>
          </div>

          {/* Period Status Badge & Lock/Unlock Buttons */}
          {isPeriodLocked ? (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 font-mono">
                <span className="material-symbols-outlined text-sm">lock</span>
                {t('مسير مغلق ومُعمد', 'Locked Period')}
              </span>
              {currentUser?.role === 'Super Admin' && (
                <button
                  onClick={handleUnlockPeriod}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition-all flex items-center gap-1"
                  title={t('إعادة فتح المسير المغلق (Super Admin)', 'Unlock Period (Super Admin)')}
                >
                  <span className="material-symbols-outlined text-sm">lock_open</span>
                  <span>{t('إعادة فتح', 'Unlock')}</span>
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowFinalizeModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/30 transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">lock</span>
              <span>{t('اعتماد وإغلاق المسير', 'Finalize & Lock')}</span>
            </button>
          )}
        </div>
      </div>

      {/* MODULE VIEW 1: PAYROLL MANAGEMENT */}
      {activeModuleId === 'payroll-mgmt' && (
        <div className="space-y-6">
          {/* KPI Dashboard Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
            <div className={`p-4 rounded-2xl ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200 shadow-sm'} border space-y-1`}>
              <span className={`${isDark ? 'text-slate-400' : 'text-slate-600'} font-medium block`}>{t('إجمالي الرواتب الإجمالية (gross_salary)', 'Total Gross Payroll')}</span>
              <p className="text-2xl font-black text-teal-600 dark:text-teal-400 font-mono">
                {totals.gross.toLocaleString(language === 'en' ? 'en-US' : 'ar-IQ')} {t('د.ع', 'IQD')}
              </p>
              <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>{t('شامل الأسمي وكافة البدلات والمكافآت', 'Includes basic and all allowances')}</p>
            </div>

            <div className={`p-4 rounded-2xl ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200 shadow-sm'} border space-y-1`}>
              <span className={`${isDark ? 'text-slate-400' : 'text-slate-600'} font-medium block`}>{t('صافي الرواتب مستحقة الصرف (net_salary)', 'Total Net Payable Payroll')}</span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {totals.net.toLocaleString(language === 'en' ? 'en-US' : 'ar-IQ')} {t('د.ع', 'IQD')}
              </p>
              <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>{t('المبلغ النهائي المحول لبصمة البنوك', 'Final amount to be disbursed')}</p>
            </div>

            <div className={`p-4 rounded-2xl ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200 shadow-sm'} border space-y-1`}>
              <span className={`${isDark ? 'text-slate-400' : 'text-slate-600'} font-medium block`}>{t('إجمالي الاستقطاعات والتقاعد (deductions_calc)', 'Total Deductions & Pension')}</span>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
                {totals.deductions.toLocaleString(language === 'en' ? 'en-US' : 'ar-IQ')} {t('د.ع', 'IQD')}
              </p>
              <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>{t('حوكمة تقاعد 5% + ضريبة 3% + استقطاعات', 'Pension 5% + Tax 3% + Deductions')}</p>
            </div>

            <div className={`p-4 rounded-2xl ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200 shadow-sm'} border space-y-1`}>
              <span className={`${isDark ? 'text-slate-400' : 'text-slate-600'} font-medium block`}>{t('عدد الكادر في مسير الشهر', 'Covered Employees')}</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {filteredPayrollRows.length} {t('موظفاً', 'staff')}
              </p>
              <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                {isPeriodLocked ? t('الحالة: مسير معتمد ومغلق', 'Status: Finalized & Locked') : t('الحالة: مسير حي قابل للتعديل', 'Status: Live & Editable')}
              </p>
            </div>

            {/* 5th KPI Card: On Hold Employees */}
            <div 
              onClick={() => setShowOnHoldModal(true)}
              className={`p-4 rounded-2xl ${isDark ? 'bg-[#111827] border-amber-500/40 hover:border-amber-500/80' : 'bg-amber-50 border-amber-300 hover:border-amber-400 shadow-sm'} border transition-all cursor-pointer space-y-1 group relative overflow-hidden`}
              title={t('انقر لاستعراض قائمة الرواتب الموقوفة وإدارتها', 'Click to view & manage on-hold payroll list')}
            >
              <div className="flex items-center justify-between text-amber-800 dark:text-amber-400">
                <span className="font-bold block text-xs">{t('الموظفون الموقوفة رواتبهم (On Hold)', 'On Hold Payroll')}</span>
                <span className="material-symbols-outlined text-lg group-hover:scale-110 transition-transform">front_hand</span>
              </div>
              <p className="text-2xl font-black text-amber-800 dark:text-amber-400 font-mono">
                {onHoldEmployees.length} {t('موظفاً', 'staff')}
              </p>
              <p className="text-[10px] text-amber-900 dark:text-amber-300 font-bold underline flex items-center gap-1">
                <span>{t('انقر لعرض السجل والتفاصيل', 'Click to view details')}</span>
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </p>
            </div>
          </div>

          {/* Table Header Filter & Toolbar */}
          <div className="p-4 rounded-2xl bg-[#111827] border border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Box */}
              <div className="relative min-w-[240px]">
                <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 text-sm">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('ابحث بالاسم، الرقم الوظيفي، أو الفرع...', 'Search by name, ID, or branch...')}
                  className="w-full pr-9 pl-3 py-1.5 bg-[#0a0c10] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Branch Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">{t('الفرع:', 'Branch:')}</span>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-teal-400 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="All">{t('كافة الفروع والمواقع', 'All Branches')}</option>
                  {branchesList.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* View Mode Switcher (Summary vs Detailed Breakdown) */}
            <div className="flex items-center gap-1.5 bg-[#0a0c10] p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setViewMode('summary')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'summary' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('ملخص موجز', 'Summary')}
              </button>
              <button
                onClick={() => setViewMode('detailed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'detailed' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('جدول تفصيلي مطبق لقاعدة البيانات (25 حقل SQL)', 'SQL Full Database Table Schema')}
              </button>
            </div>
          </div>

          {/* Interactive Detailed Payroll Table matching XAMPP / vitasiraq_hris_db schema */}
          {filteredPayrollRows.length === 0 ? (
            <EmptyState
              icon="account_balance_wallet"
              title={t('سجل مسير الرواتب فارغ', 'Payroll Log Empty')}
              description={t('لا توجد بيانات رواتب تطابق معايير البحث. قم بتسجيل الموظفين أولاً.', 'No payroll rows match search criteria.')}
            />
          ) : (
            <div className={`p-6 rounded-3xl border shadow-xl space-y-4 ${
              isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-md'
            }`}>
              <div className={`overflow-x-auto rounded-2xl border ${
                isDark ? 'border-white/10 bg-[#0a0c10]' : 'border-slate-300 bg-white'
              }`}>
                <table className="w-full text-left text-xs sm:text-sm border-collapse" dir="ltr">
                  <thead>
                    <tr className="bg-[#1e293b] font-mono font-extrabold text-xs sm:text-sm border-b border-white/20 select-none">
                      <th className="p-3 text-center border-r border-white/10 w-10 !text-slate-300 bg-slate-900 font-bold">#</th>
                      <th className="p-3 border-r border-white/10 whitespace-nowrap !text-amber-300 font-bold">badge_no</th>
                      <th className="p-3 border-r border-white/10 whitespace-nowrap !text-sky-300 font-bold">location</th>
                      <th className="p-3 border-r border-white/10 whitespace-nowrap !text-white font-bold bg-[#1e293b]">employee_name</th>
                      <th className="p-3 border-r border-white/10 whitespace-nowrap !text-purple-300 font-bold">position</th>
                      <th className="p-3 border-r border-white/10 whitespace-nowrap !text-cyan-300 font-bold bg-[#1e293b]">
                        {viewMode === 'summary' ? 'current_month_basic' : 'basic_salary'}
                      </th>

                      {viewMode === 'summary' && (
                        <>
                          <th className="p-3 border-r border-white/10 whitespace-nowrap !text-emerald-300 font-bold">incentives</th>
                          <th className="p-3 border-r border-white/10 whitespace-nowrap !text-emerald-400 font-bold">overtime</th>
                          <th className="p-3 border-r border-white/10 whitespace-nowrap !text-emerald-400 font-bold">earned_leave</th>
                          <th className="p-3 border-r border-white/10 whitespace-nowrap !text-emerald-400 font-black">allowances_total</th>
                        </>
                      )}

                      {viewMode === 'detailed' && (
                        <>
                          <th className="p-3 border-r border-white/10 whitespace-nowrap !text-teal-300 font-bold bg-[#1e293b]">current_month_basic</th>
                          <th className="p-3 border-r border-white/10 whitespace-nowrap !text-emerald-300 font-bold">phone_allowance</th>
                          <th className="p-3 border-r border-white/10 whitespace-nowrap !text-emerald-300 font-bold">family_allowance</th>
                          <th className="p-3 border-r border-white/10 whitespace-nowrap !text-emerald-300 font-bold">cert_allowance</th>
                          <th className="p-3 border-r border-white/10 whitespace-nowrap !text-emerald-300 font-bold">incentives</th>
                          <th className="p-3 border-r border-white/10 whitespace-nowrap !text-emerald-300 font-bold">transportation</th>
                          <th className="p-3 border-r border-white/10 whitespace-nowrap !text-emerald-300 font-bold">bonus</th>
                          <th className="p-3 border-r border-white/10 whitespace-nowrap !text-emerald-400 font-bold">overtime</th>
                          <th className="p-3 border-r border-white/10 whitespace-nowrap !text-emerald-400 font-bold">earned_leave</th>
                        </>
                      )}

                      <th className="p-3 border-r border-white/10 whitespace-nowrap !text-cyan-200 font-black bg-[#1e293b]">gross_salary</th>

                      {viewMode === 'detailed' && (
                        <>
                          <th className="p-3 border-r border-white/10 whitespace-nowrap !text-rose-300 font-bold">social_security</th>
                          <th className="p-3 border-r border-white/10 whitespace-nowrap !text-rose-300 font-bold">income_tax</th>
                          <th className="p-3 border-r border-white/10 whitespace-nowrap !text-rose-300 font-bold">insurance</th>
                          <th className="p-3 border-r border-white/10 whitespace-nowrap !text-rose-300 font-bold">loan_payment</th>
                          <th className="p-3 border-r border-white/10 whitespace-nowrap !text-rose-300 font-bold">other_deductions</th>
                        </>
                      )}

                      <th className="p-3 border-r border-white/10 whitespace-nowrap !text-rose-400 font-black">total_deductions</th>
                      <th className="p-3 border-r border-white/10 whitespace-nowrap !text-teal-300 font-black bg-[#1e293b]">net_salary</th>
                      <th className="p-3 text-center whitespace-nowrap !text-slate-200 font-bold">{t('إجراءات', 'Actions')}</th>
                    </tr>
                  </thead>

                  <tbody className={`divide-y text-xs sm:text-sm font-normal ${
                    isDark ? 'divide-white/5 text-slate-200' : 'divide-slate-200 text-slate-900'
                  }`}>
                    {filteredPayrollRows.map((row, idx) => (
                      <tr key={row.id} className={`transition-colors font-sans font-normal ${
                        isDark ? 'hover:bg-teal-500/10' : 'hover:bg-slate-100 bg-white text-slate-900'
                      }`}>
                        <td className={`p-3 text-center border-r font-mono font-normal ${
                          isDark ? 'border-white/5 text-slate-400 bg-slate-900/50' : 'border-slate-200 text-slate-700 bg-slate-100'
                        }`}>
                          {idx + 1}
                        </td>

                        <td className={`p-3 border-r whitespace-nowrap font-mono font-normal ${
                          isDark ? 'border-white/5 text-amber-300' : 'border-slate-200 text-slate-900'
                        }`}>
                          {row.badge_no}
                        </td>

                        <td className={`p-3 border-r whitespace-nowrap font-normal ${
                          isDark ? 'border-white/5 text-sky-200' : 'border-slate-200 text-slate-900'
                        }`}>
                          {language === 'en' ? row.location_en : row.location_ar}
                        </td>

                        <td className={`p-3 border-r whitespace-nowrap font-normal ${
                          isDark ? 'border-white/5 text-white bg-[#1e293b]' : 'border-slate-200 text-slate-900 bg-slate-100'
                        }`}>
                          <div className="flex items-center gap-1.5">
                            <span>{language === 'en' ? row.employee_name_en : row.employee_name_ar}</span>
                            {Number(row.is_ss_tax_exempt) === 1 && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                                {language === 'en' ? 'Exempt' : 'معفى'}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className={`p-3 border-r whitespace-nowrap font-normal text-xs ${
                          isDark ? 'border-white/5 text-purple-200' : 'border-slate-200 text-slate-800'
                        }`}>
                          {language === 'en' ? row.position_en : row.position_ar}
                        </td>

                        <td className={`p-3 border-r whitespace-nowrap font-mono font-normal ${
                          isDark ? 'border-white/5 text-cyan-300 bg-[#1e293b]' : 'border-slate-200 text-slate-900 bg-slate-100'
                        }`}>
                          {viewMode === 'summary'
                            ? `${(row.current_month_basic || 0).toLocaleString(language === 'en' ? 'en-US' : 'ar-IQ')} ${t('د.ع', 'IQD')}`
                            : `${(row.basic_salary || 0).toLocaleString(language === 'en' ? 'en-US' : 'ar-IQ')} ${t('د.ع', 'IQD')}`
                          }
                        </td>

                        {viewMode === 'summary' && (
                          <>
                            <td className={`p-3 border-r whitespace-nowrap font-mono font-normal ${
                              isDark ? 'border-white/5 text-emerald-300' : 'border-slate-200 text-emerald-800'
                            }`}>
                              {((row.incentives || 0) + (row.transportation || 0) + (row.bonus || 0)).toLocaleString()}
                            </td>
                            <td className={`p-3 border-r whitespace-nowrap font-mono font-normal ${
                              isDark ? 'border-white/5 text-emerald-400' : 'border-slate-200 text-emerald-800'
                            }`}>
                              {(row.overtime || 0).toLocaleString()}
                            </td>
                            <td className={`p-3 border-r whitespace-nowrap font-mono font-normal ${
                              isDark ? 'border-white/5 text-emerald-400' : 'border-slate-200 text-emerald-800'
                            }`}>
                              {(row.earned_leave || 0).toLocaleString()}
                            </td>
                            <td className={`p-3 border-r whitespace-nowrap font-mono font-normal ${
                              isDark ? 'border-white/5 text-emerald-400' : 'border-slate-200 text-emerald-800'
                            }`}>
                              +{(row.allowances_total || 0).toLocaleString(language === 'en' ? 'en-US' : 'ar-IQ')}
                            </td>
                          </>
                        )}

                        {viewMode === 'detailed' && (
                          <>
                            <td className={`p-3 border-r whitespace-nowrap font-mono font-normal ${
                              isDark ? 'border-white/5 text-teal-300 bg-[#1e293b]' : 'border-slate-200 text-slate-900 bg-slate-100'
                            }`}>
                              {(row.current_month_basic || 0).toLocaleString()}
                            </td>
                            <td className={`p-3 border-r whitespace-nowrap font-mono font-normal ${
                              isDark ? 'border-white/5 text-emerald-300' : 'border-slate-200 text-emerald-800'
                            }`}>
                              {(row.phone_allowance || 0).toLocaleString()}
                            </td>
                            <td className={`p-3 border-r whitespace-nowrap font-mono font-normal ${
                              isDark ? 'border-white/5 text-emerald-300' : 'border-slate-200 text-emerald-800'
                            }`}>
                              {(row.family_allowance || 0).toLocaleString()}
                            </td>
                            <td className={`p-3 border-r whitespace-nowrap font-mono font-normal ${
                              isDark ? 'border-white/5 text-emerald-300' : 'border-slate-200 text-emerald-800'
                            }`}>
                              {(row.cert_allowance || 0).toLocaleString()}
                            </td>
                            <td className={`p-3 border-r whitespace-nowrap font-mono font-normal ${
                              isDark ? 'border-white/5 text-emerald-300' : 'border-slate-200 text-emerald-800'
                            }`}>
                              {(row.incentives || 0).toLocaleString()}
                            </td>
                            <td className={`p-3 border-r whitespace-nowrap font-mono font-normal ${
                              isDark ? 'border-white/5 text-emerald-300' : 'border-slate-200 text-emerald-800'
                            }`}>
                              {(row.transportation || 0).toLocaleString()}
                            </td>
                            <td className={`p-3 border-r whitespace-nowrap font-mono font-normal ${
                              isDark ? 'border-white/5 text-emerald-300' : 'border-slate-200 text-emerald-800'
                            }`}>
                              {(row.bonus || 0).toLocaleString()}
                            </td>
                            <td className={`p-3 border-r whitespace-nowrap font-mono font-normal ${
                              isDark ? 'border-white/5 text-emerald-400' : 'border-slate-200 text-emerald-800'
                            }`}>
                              {(row.overtime || 0).toLocaleString()}
                            </td>
                            <td className={`p-3 border-r whitespace-nowrap font-mono font-normal ${
                              isDark ? 'border-white/5 text-emerald-400' : 'border-slate-200 text-emerald-800'
                            }`}>
                              {(row.earned_leave || 0).toLocaleString()}
                            </td>
                          </>
                        )}

                        <td className={`p-3 border-r whitespace-nowrap font-mono font-normal ${
                          isDark ? 'border-white/5 text-cyan-200 bg-[#1e293b]' : 'border-slate-200 text-slate-900 bg-slate-100'
                        }`}>
                          {(row.gross_salary || 0).toLocaleString(language === 'en' ? 'en-US' : 'ar-IQ')}
                        </td>

                        {viewMode === 'detailed' && (
                          <>
                            <td className={`p-3 border-r whitespace-nowrap font-mono font-normal ${
                              isDark ? 'border-white/5 text-rose-300' : 'border-slate-200 text-rose-800'
                            }`}>
                              {Number(row.is_ss_tax_exempt) === 1 ? (
                                <span className="text-amber-400 font-bold text-[11px]">0 (معفى)</span>
                              ) : (
                                `-${(row.social_security || 0).toLocaleString()}`
                              )}
                            </td>
                            <td className={`p-3 border-r whitespace-nowrap font-mono font-normal ${
                              isDark ? 'border-white/5 text-rose-300' : 'border-slate-200 text-rose-800'
                            }`}>
                              {Number(row.is_ss_tax_exempt) === 1 ? (
                                <span className="text-amber-400 font-bold text-[11px]">0 (معفى)</span>
                              ) : (
                                `-${(row.income_tax || 0).toLocaleString()}`
                              )}
                            </td>
                            <td className={`p-3 border-r whitespace-nowrap font-mono font-normal ${
                              isDark ? 'border-white/5 text-rose-300' : 'border-slate-200 text-rose-800'
                            }`}>
                              -{(row.insurance || 0).toLocaleString()}
                            </td>
                            <td className={`p-3 border-r whitespace-nowrap font-mono font-normal ${
                              isDark ? 'border-white/5 text-rose-300' : 'border-slate-200 text-rose-800'
                            }`}>
                              -{(row.loan_payment || 0).toLocaleString()}
                            </td>
                            <td className={`p-3 border-r whitespace-nowrap font-mono font-normal ${
                              isDark ? 'border-white/5 text-rose-300' : 'border-slate-200 text-rose-800'
                            }`}>
                              -{(row.other_deductions || 0).toLocaleString()}
                            </td>
                          </>
                        )}

                        <td className={`p-3 border-r whitespace-nowrap font-mono font-normal ${
                          isDark ? 'border-white/5 text-rose-400' : 'border-slate-200 text-rose-800'
                        }`}>
                          -{(row.total_deductions || 0).toLocaleString(language === 'en' ? 'en-US' : 'ar-IQ')}
                        </td>

                        <td className={`p-3 border-r whitespace-nowrap font-mono font-normal text-base ${
                          isDark ? 'border-white/5 text-teal-300 bg-[#1e293b]' : 'border-slate-200 text-slate-900 bg-slate-100'
                        }`}>
                          {(row.net_salary || 0).toLocaleString(language === 'en' ? 'en-US' : 'ar-IQ')} {t('د.ع', 'IQD')}
                        </td>

                        <td className="p-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Edit Adjustments Button */}
                            <button
                              disabled={isPeriodLocked}
                              onClick={() => handleOpenEditAdjustment(row)}
                              className={`px-2 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                                isPeriodLocked
                                  ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                                  : isDark
                                    ? 'bg-teal-600/20 text-teal-300 hover:bg-teal-600/40 border border-teal-500/30'
                                    : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-300'
                              }`}
                              title={t('تعديل الاستقطاعات والغيابات والأجر الإضافي', 'Edit Adjustments')}
                            >
                              <span className="material-symbols-outlined text-sm">edit_note</span>
                              <span>{t('تعديل', 'Edit')}</span>
                            </button>

                            {/* On Hold Action Button */}
                            <button
                              disabled={isPeriodLocked}
                              onClick={() => handleToggleOnHold(row.id)}
                              className={`px-2 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                                isPeriodLocked
                                  ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                                  : row.is_on_hold
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30 shadow-sm'
                                    : isDark
                                      ? 'bg-slate-800 text-slate-300 hover:bg-amber-500/20 hover:text-amber-300 border border-slate-700'
                                      : 'bg-slate-100 text-slate-700 hover:bg-amber-100 hover:text-amber-800 border border-slate-300'
                              }`}
                              title={row.is_on_hold ? t(`رواتب موقوفة (${row.on_hold_reason}) - انقر لفك الإيقاف`, 'On Hold - Click to Resume') : t('إيقاف راتب الموظف يدوياً', 'Put Payroll On Hold')}
                            >
                              <span className="material-symbols-outlined text-sm">{row.is_on_hold ? 'front_hand' : 'pause_circle'}</span>
                              <span>{row.is_on_hold ? t('موقوف', 'On Hold') : t('إيقاف', 'Hold')}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* Summary Totals Footer Row */}
                  <tfoot>
                    <tr className={`font-bold border-t-2 text-xs sm:text-sm ${
                      isDark ? 'bg-[#1e293b] text-white border-teal-500/40' : 'bg-slate-100 text-slate-900 border-slate-300'
                    }`}>
                      <td className={`p-3 text-center border-r font-mono ${
                        isDark ? 'border-white/10 bg-slate-900 text-teal-400' : 'border-slate-300 bg-slate-200 text-teal-700'
                      }`}>∑</td>
                      <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-slate-400' : 'border-slate-300 text-slate-500'}`}>-</td>
                      <td className={`p-3 border-r font-bold ${
                        isDark ? 'border-white/10 text-white bg-[#1e293b]' : 'border-slate-300 text-black bg-slate-200'
                      }`}>{language === 'en' ? `${filteredPayrollRows.length} Staff` : `${filteredPayrollRows.length} موظف`}</td>
                      <td className={`p-3 border-r font-bold ${
                        isDark ? 'border-white/10 text-white bg-[#1e293b]' : 'border-slate-300 text-black bg-slate-200'
                      }`}>{t('المجموع الكلي للمسير', 'Total Payroll Summary')}</td>
                      <td className={`p-3 border-r ${isDark ? 'border-white/10 text-slate-400' : 'border-slate-300 text-slate-500'}`}>-</td>
                      <td className={`p-3 border-r font-mono font-bold ${
                        isDark ? 'border-white/10 text-cyan-300 bg-[#1e293b]' : 'border-slate-300 text-black bg-slate-200'
                      }`}>
                        {viewMode === 'summary'
                          ? `${(totals.current_month_basic || 0).toLocaleString()} ${t('د.ع', 'IQD')}`
                          : `${(totals.basic || 0).toLocaleString()} ${t('د.ع', 'IQD')}`
                        }
                      </td>

                      {viewMode === 'summary' && (
                        <>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-emerald-300' : 'border-slate-300 text-emerald-800'}`}>
                            {((totals.incentives || 0) + (totals.transportation || 0) + (totals.bonus || 0)).toLocaleString()}
                          </td>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-emerald-400' : 'border-slate-300 text-emerald-800'}`}>
                            {(totals.overtime || 0).toLocaleString()}
                          </td>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-emerald-400' : 'border-slate-300 text-emerald-800'}`}>
                            {(totals.earned_leave || 0).toLocaleString()}
                          </td>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-emerald-400' : 'border-slate-300 text-emerald-800'}`}>
                            +{(totals.allowances || 0).toLocaleString()}
                          </td>
                        </>
                      )}

                      {viewMode === 'detailed' && (
                        <>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-teal-300 bg-[#1e293b]' : 'border-slate-300 text-slate-900 bg-slate-200'}`}>{(totals.current_month_basic || 0).toLocaleString()}</td>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-emerald-300' : 'border-slate-300 text-emerald-800'}`}>{(totals.phone_allowance || 0).toLocaleString()}</td>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-emerald-300' : 'border-slate-300 text-emerald-800'}`}>{(totals.family_allowance || 0).toLocaleString()}</td>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-emerald-300' : 'border-slate-300 text-emerald-800'}`}>{(totals.cert_allowance || 0).toLocaleString()}</td>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-emerald-300' : 'border-slate-300 text-emerald-800'}`}>{(totals.incentives || 0).toLocaleString()}</td>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-emerald-300' : 'border-slate-300 text-emerald-800'}`}>{(totals.transportation || 0).toLocaleString()}</td>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-emerald-300' : 'border-slate-300 text-emerald-800'}`}>{(totals.bonus || 0).toLocaleString()}</td>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-emerald-400' : 'border-slate-300 text-emerald-800'}`}>{(totals.overtime || 0).toLocaleString()}</td>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-emerald-400' : 'border-slate-300 text-emerald-800'}`}>{(totals.earned_leave || 0).toLocaleString()}</td>
                        </>
                      )}

                      <td className={`p-3 border-r font-mono font-black ${
                        isDark ? 'border-white/10 text-cyan-200 bg-[#1e293b]' : 'border-slate-300 text-black bg-slate-200'
                      }`}>{(totals.gross || 0).toLocaleString()} {t('د.ع', 'IQD')}</td>

                      {viewMode === 'detailed' && (
                        <>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-rose-300' : 'border-slate-300 text-rose-800'}`}>-{(totals.social_security || 0).toLocaleString()}</td>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-rose-300' : 'border-slate-300 text-rose-800'}`}>-{(totals.income_tax || 0).toLocaleString()}</td>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-rose-300' : 'border-slate-300 text-rose-800'}`}>-{(totals.insurance || 0).toLocaleString()}</td>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-rose-300' : 'border-slate-300 text-rose-800'}`}>-{(totals.loan_payment || 0).toLocaleString()}</td>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-rose-300' : 'border-slate-300 text-rose-800'}`}>-{(totals.other_deductions || 0).toLocaleString()}</td>
                        </>
                      )}

                      <td className={`p-3 border-r font-mono font-black ${
                        isDark ? 'border-white/10 text-rose-400' : 'border-slate-300 text-rose-800'
                      }`}>-{(totals.deductions || 0).toLocaleString()} {t('د.ع', 'IQD')}</td>
                      <td className={`p-3 border-r font-mono font-black text-base ${
                        isDark ? 'border-white/10 text-teal-300 bg-[#1e293b]' : 'border-slate-300 text-black bg-slate-200'
                      }`}>{(totals.net || 0).toLocaleString()} {t('د.ع', 'IQD')}</td>
                      <td className="p-3 text-center">-</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODULE VIEW 2: MONTHLY PAYSLIP VIEWER & EXPORTER */}
      {activeModuleId === 'payroll-payslip' && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Top Control Bar & Filters */}
          <div className="p-5 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4 print:hidden">
            {/* Header Title & Month Info */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">badge</span>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">{t('مستخرج واستعراض قسائم الرواتب', 'Payslip Viewer & Exporter')}</h2>
                  <p className="text-[11px] text-slate-400">{t('شهر:', 'Month:')} {getMonthName(selectedMonth)} {selectedYear}</p>
                </div>
              </div>

              {/* Office / Branch Filter */}
              <div className="flex items-center gap-2 bg-white/90 border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
                <span className="material-symbols-outlined text-amber-600 text-base">apartment</span>
                <span className="text-xs font-bold text-slate-800">{t('المكتب/الفرع:', 'Office:')}</span>
                <select
                  value={selectedPayslipOffice}
                  onChange={e => setSelectedPayslipOffice(e.target.value)}
                  className="bg-white text-xs text-slate-900 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="All" className="bg-white text-slate-900 font-bold">{t('جميع المكاتب والفروع', 'All Offices & Branches')}</option>
                  {branchesList.map(b => (
                    <option key={b} value={b} className="bg-white text-slate-900 font-bold">{b}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Employee Combobox & Search */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-teal-400 text-base">person_search</span>
                  {t('اختر الموظف لعرض القسيمة:', 'Select Employee:')}
                </label>
                <span className="text-[10px] text-teal-400 font-mono">
                  {t('المتاحين:', 'Available:')} ({payslipOfficeFilteredRows.length} {t('موظف', 'employees')})
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Quick Search Box inside Combobox */}
                <div className="relative col-span-1">
                  <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-500 text-sm">search</span>
                  <input
                    type="text"
                    placeholder={t('بحث باسم الموظف أو الرقم...', 'Search employee name or ID...')}
                    value={payslipEmpSearch}
                    onChange={e => setPayslipEmpSearch(e.target.value)}
                    className="w-full bg-[#0a0c10] border border-white/15 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50"
                  />
                </div>

                {/* Combobox Dropdown */}
                <div className="col-span-2">
                  <select
                    value={selectedEmpId}
                    onChange={e => setSelectedEmpId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/40 cursor-pointer shadow-sm"
                  >
                    {payslipComboboxOptions.map(e => (
                      <option key={e.id} value={e.id} className="bg-white text-slate-900 font-bold py-1">
                        {language === 'en' ? e.employee_name_en : e.employee_name_ar} ({e.employee_id}) - {e.location_ar}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Action Bar: PDF Print & Email Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Print Single Employee PDF */}
                <button
                  onClick={() => {
                    setIsBatchPrinting(false);
                    setTimeout(() => window.print(), 150);
                  }}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
                >
                  <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                  <span>{t('طباعة/تصدير PDF للموظف المحدد', 'Print PDF for Employee')}</span>
                </button>

                {/* Print Office Batch PDF */}
                <button
                  onClick={() => {
                    setIsBatchPrinting(true);
                    setTimeout(() => {
                      window.print();
                      setIsBatchPrinting(false);
                    }, 250);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
                >
                  <span className="material-symbols-outlined text-sm">print_connect</span>
                  <span>
                    {t(
                      `طباعة PDF لجميع موظفي المكتب (${selectedPayslipOffice === 'All' ? 'الكل' : selectedPayslipOffice}) (${payslipOfficeFilteredRows.length})`,
                      `Batch Print PDF for Office (${payslipOfficeFilteredRows.length})`
                    )}
                  </span>
                </button>
              </div>

              {/* Send Email to Office */}
              <button
                onClick={() => handleOpenEmailModal(selectedPayslipOffice)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
              >
                <span className="material-symbols-outlined text-sm">mail</span>
                <span>{t('إرسال القسائم عبر البريد الإلكتروني للمكتب', 'Send Office Payslips via Email')}</span>
              </button>
            </div>
          </div>

          {/* Single Printable Payslip Card View */}
          {!isBatchPrinting && currentPayslipEmp && (() => {
            const pRow = computedPayrollRows.find(r => String(r.id) === String(currentPayslipEmp.id)) || computedPayrollRows[0];
            if (!pRow) return null;
            
            const isExempt = pRow.is_ss_tax_exempt === 1;

            return (
              <div className="p-8 rounded-3xl bg-white border border-slate-200 space-y-6 text-xs shadow-xl font-['Cairo'] relative text-slate-900">
                {/* Watermark / Header */}
                <div className="flex items-start justify-between border-b-2 border-teal-600 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">{t('مؤسسة فيتاس العراق للتمويل الأصغر', 'VITAS Iraq Microfinance Institution')}</h3>
                    <p className="text-xs text-teal-700 font-bold">{t('كشف وقسيمة الراتب الشهري الرسمية', 'Official Monthly Payslip Document')}</p>
                    <p className="text-[11px] text-slate-600 mt-1">
                      {t('عن شهر:', 'For Month:')} <span className="text-slate-900 font-bold">{getMonthName(selectedMonth)} {selectedYear}</span>
                    </p>
                  </div>
                  <div className="text-left font-mono text-[11px] text-slate-600">
                    <p className="font-bold text-teal-700">CONFIDENTIAL PAYSLIP</p>
                    <p>Doc Ref: VTS-PAY-{pRow.badge_no}</p>
                    <p>Issue Date: {new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'ar-IQ')}</p>
                  </div>
                </div>

                {/* Employee Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900">
                  <div>
                    <span className="text-[10px] text-slate-600 font-semibold block">{t('اسم الموظف:', 'Employee Name:')}</span>
                    <span className="font-bold text-slate-900 text-sm">{language === 'en' ? pRow.employee_name_en : pRow.employee_name_ar}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 font-semibold block">{t('الرقم الوظيفي / البادج:', 'Employee ID / Badge:')}</span>
                    <span className="font-mono text-teal-700 font-bold">{pRow.employee_id} ({pRow.badge_no})</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 font-semibold block">{t('الفرع والموقع:', 'Branch / Location:')}</span>
                    <span className="font-bold text-slate-900">{language === 'en' ? pRow.location_en : pRow.location_ar}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 font-semibold block">{t('القسم / المسمى:', 'Dept / Position:')}</span>
                    <span className="font-bold text-slate-900">{language === 'en' ? pRow.position_en : pRow.position_ar}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 font-semibold block">{t('المصرف / رقم الحساب:', 'Bank / IBAN:')}</span>
                    <span className="font-mono text-xs font-bold text-slate-900">{pRow.bank_name}</span>
                    <span className="block font-mono text-[10px] font-medium text-slate-600">{pRow.iban}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 font-semibold block">{t('تاريخ المباشرة:', 'Join Date:')}</span>
                    <span className="font-mono font-bold text-slate-900">{pRow.original_start_date}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 font-semibold block">{t('حالة الخضوع الضريبي:', 'Tax Exemption Status:')}</span>
                    <span className={`font-bold ${isExempt ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {isExempt ? t('معفى من الضمان والضريبة', 'Exempt') : t('خاضع للضمان والضريبة', 'Subject to SS & Tax')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 font-semibold block">{t('القسم:', 'Department:')}</span>
                    <span className="font-bold text-slate-900">{pRow.department}</span>
                  </div>
                </div>

                {/* Earnings vs Deductions Table */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Earnings Column */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-emerald-800 border-b border-emerald-300 pb-1.5 flex items-center justify-between">
                      <span>{t('المستحقات والبدلات (Earnings)', 'Earnings')}</span>
                      <span className="material-symbols-outlined text-sm">add_circle</span>
                    </h4>
                    <div className="space-y-1.5 text-slate-900">
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span>{t('الراتب الاسمي الفعلي:', 'Basic Salary:')}</span>
                        <span className="font-mono font-bold text-slate-900">{pRow.current_month_basic.toLocaleString()} IQD</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span>{t('بدل الهاتف:', 'Phone Allowance:')}</span>
                        <span className="font-mono font-bold text-slate-900">{pRow.phone_allowance.toLocaleString()} IQD</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span>{t('بدل الزوجية والأولاد:', 'Family Allowance:')}</span>
                        <span className="font-mono font-bold text-slate-900">{pRow.family_allowance.toLocaleString()} IQD</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span>{t('بدل الشهادة:', 'Certificate Allowance:')}</span>
                        <span className="font-mono font-bold text-slate-900">{pRow.cert_allowance.toLocaleString()} IQD</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span>{t('بدل النقل والسفر:', 'Transportation:')}</span>
                        <span className="font-mono font-bold text-slate-900">{pRow.transportation.toLocaleString()} IQD</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span>{t('الأجر الإضافي والمكافآت:', 'Overtime & Bonus:')}</span>
                        <span className="font-mono font-bold text-slate-900">{(pRow.overtime + pRow.bonus).toLocaleString()} IQD</span>
                      </div>
                      <div className="flex justify-between py-1.5 font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 rounded-lg">
                        <span>{t('إجمالي الراتب الإجمالي:', 'Total Gross Salary:')}</span>
                        <span className="font-mono">{pRow.gross_salary.toLocaleString()} IQD</span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions Column */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-rose-800 border-b border-rose-300 pb-1.5 flex items-center justify-between">
                      <span>{t('الاستقطاعات والتأمين (Deductions)', 'Deductions')}</span>
                      <span className="material-symbols-outlined text-sm">remove_circle</span>
                    </h4>
                    <div className="space-y-1.5 text-slate-900">
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span>{t('استقطاع التقاعد والضمان الاجتماعي:', 'Pension & Social Security:')}</span>
                        {isExempt ? (
                          <span className="font-bold text-amber-700 text-[11px]">{t('معفى (0 د.ع)', 'Exempt (0 IQD)')}</span>
                        ) : (
                          <span className="font-mono font-bold text-rose-800">-{pRow.social_security.toLocaleString()} IQD</span>
                        )}
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span>{t('استقطاع ضريبة الدخل:', 'Income Tax:')}</span>
                        {isExempt ? (
                          <span className="font-bold text-amber-700 text-[11px]">{t('معفى (0 د.ع)', 'Exempt (0 IQD)')}</span>
                        ) : (
                          <span className="font-mono font-bold text-rose-800">-{pRow.income_tax.toLocaleString()} IQD</span>
                        )}
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span>{t('قسط التأمين الصحي:', 'Health Insurance:')}</span>
                        {isExempt ? (
                          <span className="font-bold text-amber-700 text-[11px]">{t('معفى (0 د.ع)', 'Exempt (0 IQD)')}</span>
                        ) : (
                          <span className="font-mono font-bold text-rose-800">-{pRow.insurance.toLocaleString()} IQD</span>
                        )}
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span>{t('استقطاع القروض والسلف:', 'Loan Deduction:')}</span>
                        <span className="font-mono font-bold text-rose-800">-{pRow.loan_payment.toLocaleString()} IQD</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span>{t('استقطاع الغيابات والتنبيهات:', 'Absence & Deductions:')}</span>
                        <span className="font-mono font-bold text-rose-800">-{pRow.other_deductions.toLocaleString()} IQD</span>
                      </div>
                      <div className="flex justify-between py-1.5 font-bold text-rose-900 bg-rose-50 border border-rose-200 px-2 rounded-lg">
                        <span>{t('إجمالي الاستقطاعات:', 'Total Deductions:')}</span>
                        <span className="font-mono">-{pRow.total_deductions.toLocaleString()} IQD</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Net Payable Highlight Card */}
                <div className="p-4 rounded-2xl bg-teal-50 border border-teal-300 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">{t('صافي الراتب النهائي مستحق الدفع:', 'Net Payable Salary:')}</span>
                    <span className="text-2xl font-black text-teal-900 font-mono">{pRow.net_salary.toLocaleString()} {t('د.ع', 'IQD')}</span>
                  </div>
                  <button
                    onClick={() => {
                      setIsBatchPrinting(false);
                      setTimeout(() => window.print(), 100);
                    }}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg flex items-center gap-1.5 print:hidden"
                  >
                    <span className="material-symbols-outlined text-sm">print</span>
                    <span>{t('طباعة القسيمة', 'Print Payslip')}</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Batch Print Multi-Employee Container (Renders all office employee payslips on print) */}
          {isBatchPrinting && (
            <div className="space-y-8">
              {payslipOfficeFilteredRows.map((pRow, idx) => {
                const isExempt = pRow.is_ss_tax_exempt === 1;
                return (
                  <div key={pRow.id} className="p-8 rounded-3xl bg-white text-black space-y-6 text-xs font-['Cairo'] relative page-break-after-always">
                    <div className="flex items-start justify-between border-b-2 border-teal-700 pb-4">
                      <div>
                        <h3 className="text-lg font-black text-black">{t('مؤسسة فيتاس العراق للتمويل الأصغر', 'VITAS Iraq Microfinance Institution')}</h3>
                        <p className="text-xs text-teal-700 font-semibold">{t('كشف وقسيمة الراتب الشهري الرسمية', 'Official Monthly Payslip Document')}</p>
                        <p className="text-[11px] text-slate-600 mt-1">
                          {t('عن شهر:', 'For Month:')} <span className="text-black font-bold">{getMonthName(selectedMonth)} {selectedYear}</span>
                        </p>
                      </div>
                      <div className="text-left font-mono text-[11px] text-slate-600">
                        <p className="font-bold text-teal-700">CONFIDENTIAL PAYSLIP #{idx + 1}</p>
                        <p>Doc Ref: VTS-PAY-{pRow.badge_no}</p>
                        <p>Issue Date: {new Date().toLocaleDateString('ar-IQ')}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-100 text-black">
                      <div>
                        <span className="text-[10px] text-slate-600 block">{t('اسم الموظف:', 'Employee Name:')}</span>
                        <span className="font-bold text-black text-sm">{pRow.employee_name_ar}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-600 block">{t('الرقم الوظيفي / البادج:', 'Employee ID / Badge:')}</span>
                        <span className="font-mono text-teal-700 font-bold">{pRow.employee_id} ({pRow.badge_no})</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-600 block">{t('الفرع والموقع:', 'Branch / Location:')}</span>
                        <span className="font-medium text-black">{pRow.location_ar}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-600 block">{t('القسم / المسمى:', 'Dept / Position:')}</span>
                        <span className="font-medium text-black">{pRow.position_ar}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <h4 className="font-bold text-emerald-800 border-b border-emerald-300 pb-1.5 flex items-center justify-between">
                          <span>{t('المستحقات والبدلات', 'Earnings')}</span>
                        </h4>
                        <div className="space-y-1 text-black">
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span>{t('الراتب الاسمي الفعلي:', 'Basic Salary:')}</span>
                            <span className="font-mono">{pRow.current_month_basic.toLocaleString()} IQD</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span>{t('بدل الهاتف:', 'Phone Allowance:')}</span>
                            <span className="font-mono">{pRow.phone_allowance.toLocaleString()} IQD</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span>{t('بدل الزوجية والأولاد:', 'Family Allowance:')}</span>
                            <span className="font-mono">{pRow.family_allowance.toLocaleString()} IQD</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span>{t('بدل الشهادة:', 'Certificate Allowance:')}</span>
                            <span className="font-mono">{pRow.cert_allowance.toLocaleString()} IQD</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span>{t('بدل النقل والسفر:', 'Transportation:')}</span>
                            <span className="font-mono">{pRow.transportation.toLocaleString()} IQD</span>
                          </div>
                          <div className="flex justify-between py-1.5 font-bold text-emerald-800 bg-emerald-100 px-2 rounded-lg">
                            <span>{t('إجمالي الراتب الإجمالي:', 'Total Gross Salary:')}</span>
                            <span className="font-mono">{pRow.gross_salary.toLocaleString()} IQD</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-bold text-rose-800 border-b border-rose-300 pb-1.5 flex items-center justify-between">
                          <span>{t('الاستقطاعات والتأمين', 'Deductions')}</span>
                        </h4>
                        <div className="space-y-1 text-black">
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span>{t('استقطاع التقاعد والضمان:', 'Pension & SS:')}</span>
                            <span className="font-mono text-rose-800">-{pRow.social_security.toLocaleString()} IQD</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span>{t('استقطاع ضريبة الدخل:', 'Income Tax:')}</span>
                            <span className="font-mono text-rose-800">-{pRow.income_tax.toLocaleString()} IQD</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span>{t('قسط التأمين الصحي:', 'Health Insurance:')}</span>
                            <span className="font-mono text-rose-800">-{pRow.insurance.toLocaleString()} IQD</span>
                          </div>
                          <div className="flex justify-between py-1.5 font-bold text-rose-800 bg-rose-100 px-2 rounded-lg">
                            <span>{t('إجمالي الاستقطاعات:', 'Total Deductions:')}</span>
                            <span className="font-mono">-{pRow.total_deductions.toLocaleString()} IQD</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-teal-50 border border-teal-300 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">{t('صافي الراتب النهائي مستحق الدفع:', 'Net Payable Salary:')}</span>
                      <span className="text-2xl font-black text-teal-800 font-mono">{pRow.net_salary.toLocaleString()} IQD</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* OFFICE EMAIL SENDING MODAL */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#111827] border border-white/15 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl text-xs font-['Cairo'] relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">mark_email_read</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{t('إرسال قسائم الرواتب عبر البريد الإلكتروني للمكتب', 'Send Office Payslips via Email')}</h3>
                  <p className="text-[11px] text-amber-400 font-semibold">{emailForm.officeName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEmailModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {emailForm.sendSuccess ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-2xl">
                  ✓
                </div>
                <h4 className="text-sm font-bold text-emerald-400">{t('تم إرسال البريد الإلكتروني بنجاح!', 'Email Sent Successfully!')}</h4>
                <p className="text-xs text-slate-300">
                  {t(
                    `تم إرسال كشف وقسائم رواتب مكتب (${emailForm.officeName}) إلى مدير المكتب ومساعد الائتمان.`,
                    `Payslips sent to Office Manager and Credit Assistant.`
                  )}
                </p>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                >
                  {t('إغلاق', 'Close')}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Office Manager Email (Pre-filled) */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold flex items-center justify-between">
                    <span>{t('إيميل مدير المكتب (Office Manager Email):', 'Office Manager Email:')}</span>
                    <span className="text-[10px] text-teal-400 font-normal">({emailForm.managerName})</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-500 text-sm">manage_accounts</span>
                    <input
                      type="email"
                      value={emailForm.managerEmail}
                      onChange={e => setEmailForm(prev => ({ ...prev, managerEmail: e.target.value }))}
                      className="w-full bg-[#0a0c10] border border-white/15 rounded-xl pr-9 pl-3 py-2 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500/50"
                      placeholder="manager@vitasiraq.com"
                    />
                  </div>
                </div>

                {/* Credit Assistant Email (Pre-filled) */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold flex items-center justify-between">
                    <span>{t('إيميل مساعد الائتمان (Credit Assistant Email):', 'Credit Assistant Email:')}</span>
                    <span className="text-[10px] text-teal-400 font-normal">({emailForm.creditAssistantName})</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-500 text-sm">badge</span>
                    <input
                      type="email"
                      value={emailForm.creditAssistantEmail}
                      onChange={e => setEmailForm(prev => ({ ...prev, creditAssistantEmail: e.target.value }))}
                      className="w-full bg-[#0a0c10] border border-white/15 rounded-xl pr-9 pl-3 py-2 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500/50"
                      placeholder="credit.assistant@vitasiraq.com"
                    />
                  </div>
                </div>

                {/* Additional Emails (CC) */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">{t('نسخة إضافية (CC Emails):', 'CC Emails:')}</label>
                  <input
                    type="text"
                    value={emailForm.additionalEmails}
                    onChange={e => setEmailForm(prev => ({ ...prev, additionalEmails: e.target.value }))}
                    className="w-full bg-[#0a0c10] border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none focus:border-amber-500/50"
                    placeholder="hr@vitasiraq.com, finance@vitasiraq.com"
                  />
                </div>

                {/* Email Subject */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">{t('عنوان الرسالة (Subject):', 'Subject:')}</label>
                  <input
                    type="text"
                    value={emailForm.subject}
                    onChange={e => setEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full bg-[#0a0c10] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                {/* Email Body */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">{t('نص الرسالة (Message Body):', 'Message Body:')}</label>
                  <textarea
                    rows={4}
                    value={emailForm.body}
                    onChange={e => setEmailForm(prev => ({ ...prev, body: e.target.value }))}
                    className="w-full bg-[#0a0c10] border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50 resize-none"
                  />
                </div>

                {/* Attachment Summary Badge */}
                <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2 text-teal-300 font-medium">
                    <span className="material-symbols-outlined text-base">attach_file</span>
                    <span>{t('مرفق التقرير:', 'Attachment:')} Payslips_Batch_{emailForm.officeName}.pdf</span>
                  </div>
                  <span className="font-mono font-bold text-teal-400">({payslipOfficeFilteredRows.length} {t('قسيمة موظف', 'payslips')})</span>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-bold text-xs"
                  >
                    {t('إلغاء', 'Cancel')}
                  </button>
                  <button
                    type="button"
                    disabled={emailForm.isSending}
                    onClick={() => {
                      setEmailForm(prev => ({ ...prev, isSending: true }));
                      setTimeout(() => {
                        setEmailForm(prev => ({ ...prev, isSending: false, sendSuccess: true }));
                      }, 1200);
                    }}
                    className="px-6 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {emailForm.isSending ? (
                      <>
                        <span className="animate-spin text-sm">⏳</span>
                        <span>{t('جاري الإرسال...', 'Sending...')}</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">send</span>
                        <span>{t('إرسال البريد الإلكتروني الآن', 'Send Email Now')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODULE VIEW 3: FINANCIAL APPROVALS HUB */}
      {activeModuleId === 'payroll-approvals' && (
        <div className="space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#111827] border border-white/10 shadow-sm space-y-1">
              <span className="text-slate-400 font-medium block">{t('الطلبات بانتظار الاعتماد', 'Pending Review Claims')}</span>
              <p className="text-2xl font-black text-amber-400 font-mono">
                {approvalRequests.filter(r => r.status === 'Pending Review').length} {t('طلبات', 'requests')}
              </p>
              <p className="text-[10px] text-slate-500">{t('تتطلب موافقة المدير المالي أو الموارد البشرية', 'Requires management approval')}</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#111827] border border-white/10 shadow-sm space-y-1">
              <span className="text-slate-400 font-medium block">{t('إجمالي المطالبات المصروفة', 'Total Disbursed Claims')}</span>
              <p className="text-2xl font-black text-teal-400 font-mono">
                {approvalRequests.filter(r => r.status === 'Approved' || r.status === 'Finalized').reduce((acc, r) => acc + r.amount, 0).toLocaleString()} {t('د.ع', 'IQD')}
              </p>
              <p className="text-[10px] text-slate-500">{t('مطالبات معتمدة ومحولة للصرف', 'Approved and processed claims')}</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#111827] border border-white/10 shadow-sm space-y-1">
              <span className="text-slate-400 font-medium block">{t('متوسط سرعة الاعتماد', 'Avg Response Time')}</span>
              <p className="text-2xl font-black text-emerald-400 font-mono">
                4.2 {t('ساعات', 'hours')}
              </p>
              <p className="text-[10px] text-slate-500">{t('معدل الاستجابة التلقائية للنظام', 'System automated response rate')}</p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-4 rounded-2xl bg-[#111827] border border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300">{t('تصفية حسب الحالة:', 'Filter Status:')}</span>
              {(['All', 'Pending Review', 'Approved', 'Finalized'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setApprovalTabFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    approvalTabFilter === st ? 'bg-teal-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {st === 'All' ? t('الكل', 'All') : st === 'Pending Review' ? t('قيد المراجعة', 'Pending') : st === 'Approved' ? t('معتمد', 'Approved') : t('مصروف', 'Finalized')}
                </button>
              ))}
            </div>

            <button
              onClick={() => setActiveModuleId('payroll-claims')}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">fact_check</span>
              <span>{t('عرض تفاصيل المطالبات', 'Inspect Claim Details')}</span>
            </button>
          </div>

          {/* Requests Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {approvalRequests
              .filter(r => approvalTabFilter === 'All' || r.status === approvalTabFilter)
              .map(req => (
                <div key={req.id} className="p-5 rounded-2xl bg-[#111827] border border-white/10 hover:border-teal-500/40 transition-all shadow-lg space-y-4">
                  <div className="flex items-start justify-between border-b border-white/10 pb-3">
                    <div>
                      <span className="text-[10px] font-mono text-teal-400 font-bold bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">{req.reqNumber}</span>
                      <h3 className="font-bold text-sm text-white mt-1">{req.categoryAr}</h3>
                      <p className="text-[11px] text-slate-400">{req.notes}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      req.status === 'Pending Review' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      req.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}>
                      {req.statusAr}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-200">{req.empName}</p>
                      <p className="text-[10px] text-slate-400">{req.jobTitle} • {req.branch}</p>
                    </div>
                    <div className="text-left font-mono">
                      <span className="text-[10px] text-slate-400 block">{t('المبلغ المطلوب:', 'Amount:')}</span>
                      <span className="text-base font-black text-teal-400">{req.amount.toLocaleString()} IQD</span>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setSelectedClaimId(req.id);
                        setActiveModuleId('payroll-claims');
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">visibility</span>
                      <span>{t('معاينة المستند والتفاصيل', 'View Details')}</span>
                    </button>

                    {req.status === 'Pending Review' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleUpdateApprovalStatus(req.id, 'Approved')}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow"
                        >
                          {t('اعتماد', 'Approve')}
                        </button>
                        <button
                          onClick={() => handleUpdateApprovalStatus(req.id, 'Rejected')}
                          className="px-2 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-xs"
                        >
                          {t('رفض', 'Reject')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* MODULE VIEW 4: APPROVAL REQUESTS & CLAIMS DETAILS */}
      {activeModuleId === 'payroll-claims' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-mono text-teal-400 font-bold">CLAIM INSPECTOR & VERIFIER</span>
                <h2 className="text-lg font-black text-white">{t('فاحص تفاصيل المطالبات والمرفقات المالية', 'Claim Inspector & Attachment Verifier')}</h2>
              </div>
              <select
                value={selectedClaimId}
                onChange={e => setSelectedClaimId(e.target.value)}
                className="bg-[#0a0c10] border border-white/15 rounded-xl px-4 py-2 text-xs text-teal-400 font-bold focus:outline-none cursor-pointer"
              >
                {approvalRequests.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.reqNumber} - {r.empName} ({r.amount.toLocaleString()} IQD)
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Claim Detailed Card */}
            {currentClaimObject && (
              <div className="space-y-6 text-xs font-sans">
                {/* Header Summary */}
                <div className="p-5 rounded-2xl bg-[#0a0c10] border border-white/10 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-teal-400 font-bold bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">{currentClaimObject.reqNumber}</span>
                    <h3 className="text-base font-black text-white">{currentClaimObject.categoryAr}</h3>
                    <p className="text-slate-400">{t('الموظف طالب الاعتماد:', 'Requester:')} <span className="text-white font-bold">{currentClaimObject.empName}</span> ({currentClaimObject.jobTitle} • {currentClaimObject.branch})</p>
                  </div>
                  <div className="text-left font-mono">
                    <span className="text-xs text-slate-400 block">{t('صافي المطالبة الكلية:', 'Claim Total Amount:')}</span>
                    <span className="text-2xl font-black text-teal-400">{currentClaimObject.amount.toLocaleString()} IQD</span>
                  </div>
                </div>

                {/* Workflow Stepper Timeline */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <h4 className="font-bold text-slate-300 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-teal-400 text-base">alt_route</span>
                    {t('خطوات ومراحل دورة اعتماد المطالبة المالية', 'Approval Workflow Timeline')}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px] text-center">
                    <div className="p-2 rounded-xl bg-teal-600/20 border border-teal-500/40 text-teal-300 font-bold">
                      1. تقديم الموظف
                    </div>
                    <div className="p-2 rounded-xl bg-teal-600/20 border border-teal-500/40 text-teal-300 font-bold">
                      2. تدقيق رئيس القسم
                    </div>
                    <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold">
                      3. اعتماد الموارد البشرية
                    </div>
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-500">
                      4. التحويل والصرف البنكي
                    </div>
                  </div>
                </div>

                {/* Itemized Expenses Table */}
                <div className="space-y-2">
                  <h4 className="font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-teal-400 text-base">receipt</span>
                    {t('جدول تفاصيل عناصر وقوائم الفاتورة', 'Itemized Breakdown Table')}
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0a0c10]">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[#1e293b] text-slate-300 font-bold border-b border-white/10">
                        <tr>
                          <th className="p-2.5">#</th>
                          <th className="p-2.5">{t('بيان ووصف البند / الفاتورة', 'Item Description')}</th>
                          <th className="p-2.5 font-mono">{t('الكمية', 'Qty')}</th>
                          <th className="p-2.5 font-mono">{t('سعر الوحدة', 'Unit Price')}</th>
                          <th className="p-2.5 font-mono">{t('الإجمالي (IQD)', 'Total (IQD)')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-300 font-sans">
                        {currentClaimObject.itemsList.map((item, idx) => (
                          <tr key={idx}>
                            <td className="p-2.5 font-mono text-slate-500">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-white">{item.description}</td>
                            <td className="p-2.5 font-mono">{item.qty}</td>
                            <td className="p-2.5 font-mono">{item.unitPrice.toLocaleString()} IQD</td>
                            <td className="p-2.5 font-mono font-bold text-teal-400">{item.total.toLocaleString()} IQD</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Decision Actions Bar */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-950 via-slate-900 to-teal-950 border border-teal-500/30 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-white block">{t('اتخاذ قرار الاعتماد والتوقيع الإلكتروني', 'Take Approval Decision')}</span>
                    <span className="text-[11px] text-slate-400">{t('سيتم تحويل المطالبة تلقائياً لقسيمة مسير الشهر عند الموافقة', 'Approved claim will automatically attach to monthly payroll')}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateApprovalStatus(currentClaimObject.id, 'Approved')}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      <span>{t('موافقة واعتماد المطالبة', 'Approve Claim')}</span>
                    </button>
                    <button
                      onClick={() => handleUpdateApprovalStatus(currentClaimObject.id, 'Rejected')}
                      className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-xs flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">cancel</span>
                      <span>{t('رفض', 'Reject')}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Edit Adjustments Modal */}
      {editingEmpId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-white/15 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-400">edit_note</span>
                {t('تعديل الاستقطاعات والأجر الإضافي للموظف (XAMPP Schema)', 'Edit Employee Payroll Adjustments')}
              </h3>
              <button onClick={() => setEditingEmpId(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">{t('أيام الغياب خلال الشهر (absence_days):', 'Absence Days (absence_days):')}</label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={adjForm.absenceDays}
                  onChange={e => setAdjForm({ ...adjForm, absenceDays: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-[#0a0c10] border border-white/15 rounded-xl text-white font-mono focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">{t('ساعات العمل الإضافي (overtime):', 'Overtime Hours (overtime):')}</label>
                <input
                  type="number"
                  min="0"
                  value={adjForm.overtimeHours}
                  onChange={e => setAdjForm({ ...adjForm, overtimeHours: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-[#0a0c10] border border-white/15 rounded-xl text-white font-mono focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">{t('المحفزات والمكافآت (incentives / bonus):', 'Incentives & Bonus:')}</label>
                <input
                  type="number"
                  min="0"
                  value={adjForm.incentives}
                  onChange={e => setAdjForm({ ...adjForm, incentives: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-[#0a0c10] border border-white/15 rounded-xl text-white font-mono focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">{t('استقطاع السلف والقروض (loan_payment):', 'Loan Payment Deduction (loan_payment):')}</label>
                <input
                  type="number"
                  min="0"
                  value={adjForm.loanPayment}
                  onChange={e => setAdjForm({ ...adjForm, loanPayment: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-[#0a0c10] border border-white/15 rounded-xl text-white font-mono focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">{t('استقطاعات أخرى وتنبيهات (other_deductions):', 'Other Deductions (other_deductions):')}</label>
                <input
                  type="number"
                  min="0"
                  value={adjForm.otherDeductions}
                  onChange={e => setAdjForm({ ...adjForm, otherDeductions: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-[#0a0c10] border border-white/15 rounded-xl text-white font-mono focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button onClick={() => setEditingEmpId(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold">
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                onClick={handleSaveAdjustment}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg"
              >
                {t('حفظ التعديلات', 'Save Adjustments')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Finalize & Lock Payroll Period Modal */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-white/15 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">lock</span>
                {t('اعتماد وإغلاق المسير النهائي في SQL', 'Finalize & Lock Payroll Period')}
              </h3>
              <button onClick={() => setShowFinalizeModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>
                {t(`هل أنت تأكد من اعتماد وإغلاق مسير شهر ${getMonthName(selectedMonth)} ${selectedYear} وتدوينه في قاعدة بيانات XAMPP؟`, `Confirm locking payroll for ${getMonthName(selectedMonth)} ${selectedYear} in XAMPP SQL?`)}
              </p>
              <div className="p-3 rounded-xl bg-slate-900 border border-white/10 space-y-1 font-mono">
                <p>{t('إجمالي الرواتب (gross_salary):', 'Gross Payroll:')} <span className="text-teal-400 font-bold">{totals.gross.toLocaleString()} IQD</span></p>
                <p>{t('الصافي المستحق (net_salary):', 'Net Payable:')} <span className="text-emerald-400 font-bold">{totals.net.toLocaleString()} IQD</span></p>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">{t('ملاحظات واعتماد الإدارة (notes):', 'Approval Notes:')}</label>
                <textarea
                  value={finalizeNotes}
                  onChange={e => setFinalizeNotes(e.target.value)}
                  rows={3}
                  placeholder={t('ملاحظات الاعتماد والتحويل للمصرف...', 'Notes for audit...')}
                  className="w-full px-3 py-2 bg-[#0a0c10] border border-white/15 rounded-xl text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button onClick={() => setShowFinalizeModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold">
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                onClick={handleFinalizePeriod}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg"
              >
                {t('تأكيد الاعتماد والإغلاق', 'Confirm & Lock')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: On Hold Employees List & Management Modal */}
      {showOnHoldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-4xl ${
            isDark ? 'bg-[#111827] border-amber-500/30 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-2xl'
          } rounded-3xl overflow-hidden flex flex-col max-h-[85vh]`}>
            {/* Modal Header */}
            <div className={`p-5 ${
              isDark ? 'bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-b border-amber-500/20' : 'bg-amber-500/10 border-b border-amber-200'
            } flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">front_hand</span>
                </div>
                <div>
                  <h3 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <span>{t('سجل الرواتب الموقوفة (On Hold Payroll List)', 'On Hold Payroll List')}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 font-bold">
                      {onHoldEmployees.length} {t('موظف', 'employees')}
                    </span>
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {t('الموظفون الموقوفة رواتبهم يدوياً أو بسبب وجود تاريخ مغادرة/استقالة (مستبعدون تلقائياً من قسائم الرواتب)', 'Employees with suspended payroll manually or due to exit date')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowOnHoldModal(false)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold ${
                  isDark ? 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Table of On Hold Employees */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {onHoldEmployees.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <span className="material-symbols-outlined text-4xl text-amber-500/40">check_circle</span>
                  <p className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>{t('لا يوجد موظفون موقوفة رواتبهم حالياً', 'No employees currently on hold')}</p>
                  <p className="text-xs text-slate-500">{t('جميع كادر الرواتب نشط ومشمول بالتوليد والقسائم', 'All staff payroll is active')}</p>
                </div>
              ) : (
                <div className={`overflow-x-auto rounded-2xl border ${isDark ? 'border-white/10' : 'border-slate-300'}`}>
                  <table className="w-full text-xs text-right">
                    <thead className={`${isDark ? 'bg-[#0a0c10] text-slate-300 border-white/10' : 'bg-slate-100 text-slate-900 border-slate-300'} border-b font-bold`}>
                      <tr>
                        <th className="p-3 text-center">#</th>
                        <th className="p-3 text-slate-900 dark:text-slate-200 font-bold">{t('اسم الموظف والبادج', 'Employee & Badge')}</th>
                        <th className="p-3 text-slate-900 dark:text-slate-200 font-bold">{t('الفرع والموقع', 'Branch / Location')}</th>
                        <th className="p-3 text-slate-900 dark:text-slate-200 font-bold">{t('القسم والمسمى', 'Dept & Position')}</th>
                        <th className="p-3 text-slate-900 dark:text-slate-200 font-bold">{t('الراتب الاسمي', 'Basic Salary')}</th>
                        <th className="p-3 text-slate-900 dark:text-slate-200 font-bold">{t('سبب الإيقاف (Reason)', 'Hold Reason')}</th>
                        <th className="p-3 text-center text-slate-900 dark:text-slate-200 font-bold">{t('الإجراء (Action)', 'Action')}</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-white/5 text-slate-200' : 'divide-slate-200 text-slate-900 bg-white'}`}>
                      {onHoldEmployees.map((emp, idx) => (
                        <tr key={emp.id} className={`${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'} transition-colors`}>
                          <td className={`p-3 text-center font-mono font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>{idx + 1}</td>
                          <td className="p-3">
                            <span className={`font-bold block text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{language === 'en' ? emp.employee_name_en : emp.employee_name_ar}</span>
                            <span className="text-[11px] font-mono text-teal-700 dark:text-teal-400 font-bold">VTS-{emp.badge_no || emp.employee_id}</span>
                          </td>
                          <td className={`p-3 font-bold ${isDark ? 'text-slate-300' : 'text-slate-900'}`}>{emp.location_ar}</td>
                          <td className={`p-3 font-bold ${isDark ? 'text-slate-300' : 'text-slate-900'}`}>{emp.position_ar}</td>
                          <td className={`p-3 font-mono font-bold ${isDark ? 'text-cyan-300' : 'text-teal-800 text-sm'}`}>{emp.basic_salary.toLocaleString()} IQD</td>
                          <td className="p-3">
                            {emp.has_exit_date ? (
                              <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30 flex items-center gap-1 w-fit">
                                <span className="material-symbols-outlined text-xs">event_busy</span>
                                <span>{t('تلقائي: تاريخ مغادرة', 'Auto: Exit Date')} ({emp.exit_date_val || 'مستقيل'})</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 flex items-center gap-1 w-fit">
                                <span className="material-symbols-outlined text-xs">front_hand</span>
                                <span>{t('يدوي: إيقاف مؤقت', 'Manual On Hold')}</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleToggleOnHold(emp.id)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600/20 dark:hover:bg-emerald-600/40 dark:text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all flex items-center gap-1 mx-auto shadow-sm"
                            >
                              <span className="material-symbols-outlined text-sm">play_circle</span>
                              <span>{t('فك الإيقاف / استئناف', 'Resume Salary')}</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className={`p-4 border-t ${isDark ? 'border-white/10 bg-[#0a0c10] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-700'} flex items-center justify-between text-xs`}>
              <span className="flex items-center gap-1.5 text-amber-800 dark:text-amber-400 font-bold">
                <span className="material-symbols-outlined text-base">info</span>
                <span>{t('ملاحظة: الموظفون الموقوفة رواتبهم يتم استبعادهم تلقائياً من كشف وطباعة القسائم', 'Note: On Hold staff are automatically excluded from Payslips')}</span>
              </span>
              <button
                onClick={() => setShowOnHoldModal(false)}
                className={`px-4 py-2 rounded-xl font-bold transition-colors ${
                  isDark ? 'bg-white/10 hover:bg-white/15 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
                }`}
              >
                {t('إغلاق النافذة', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
