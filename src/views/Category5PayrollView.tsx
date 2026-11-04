import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { EmptyState } from '../components/EmptyState';
import { generatePayrollTemplateExcel, parsePayrollExcel } from '../utils/payrollExcelHelper';
import {
  PayrollLegalSettings,
  TaxBracketConfig,
  FullPayrollTaxResult,
  EmployeeInputForCalculation,
  getDefaultLegalSettings,
  getDefaultTaxBrackets,
  calculateCombinedPayrollTaxAndSecurity,
  isKurdistanLocation
} from '../utils/iraqPayrollTaxEngine';
import { CalculationTraceDetailsModal } from '../components/payroll/CalculationTraceDetailsModal';
import { PoliciesSection } from '../components/PoliciesSection';

interface EmployeeAdjustment {
  absenceDays?: number;
  basicSalary?: number;
  phoneAllowance?: number;
  familyAllowance?: number;
  certAllowance?: number;
  insurance?: number;
  incentives?: number;
  transportation?: number;
  bonus?: number;
  overtime?: number;
  overtimeHours?: number;
  overtimeAmount?: number;
  earnedLeave?: number;
  socialSecurity?: number;
  incomeTax?: number;
  loanPayment?: number;
  otherDeductions?: number;
  bonusExtra?: number;
}

interface CellCommentItem {
  empId: string;
  fieldKey: string;
  value: number;
  note: string;
  author: string;
  updatedAt: string;
}

interface EditingCellState {
  empId: string;
  empName: string;
  badgeNo: string;
  fieldKey: string;
  fieldLabel: string;
  fieldLabelAr: string;
  currentValue: number;
  currentNote: string;
  existingAuthor?: string;
  existingDate?: string;
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

/**
 * Robust date parser supporting YYYY-MM-DD, YYYY/MM/DD, DD-MM-YYYY, or ISO string.
 * Returns year, month (1-12), and day (1-31).
 */
function parseDateParts(dateVal: any): { year: number; month: number; day: number } | null {
  if (!dateVal || dateVal === 'N/A') return null;
  const str = String(dateVal).trim();
  if (!str || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') return null;

  // Standard YYYY-MM-DD or YYYY/MM/DD
  const matchIso = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (matchIso) {
    const y = parseInt(matchIso[1], 10);
    const m = parseInt(matchIso[2], 10);
    const d = parseInt(matchIso[3], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d) && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { year: y, month: m, day: d };
    }
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const matchDmY = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (matchDmY) {
    const d = parseInt(matchDmY[1], 10);
    const m = parseInt(matchDmY[2], 10);
    const y = parseInt(matchDmY[3], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d) && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { year: y, month: m, day: d };
    }
  }

  const dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    return {
      year: dt.getFullYear(),
      month: dt.getMonth() + 1,
      day: dt.getDate()
    };
  }

  return null;
}

export const Category5PayrollView: React.FC = () => {
  const { activeModuleId, setActiveModuleId, employees, updateEmployee, t, currentUser, language, theme, appSettings, updateAppSetting, updateAppSettings, refreshAllData } = useApp();
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
  const [showPoliciesModal, setShowPoliciesModal] = useState<boolean>(false);

  // Central Iraqi Legal Settings & Tax Brackets State
  const [legalSettings, setLegalSettings] = useState<PayrollLegalSettings>(getDefaultLegalSettings());
  const [taxBrackets, setTaxBrackets] = useState<TaxBracketConfig[]>(getDefaultTaxBrackets());
  const [traceCalculationResult, setTraceCalculationResult] = useState<FullPayrollTaxResult | null>(null);
  const [traceModalRow, setTraceModalRow] = useState<any | null>(null);
  const [isTraceModalOpen, setIsTraceModalOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      const cachedSettings = localStorage.getItem('iraq_payroll_legal_settings');
      if (cachedSettings) {
        const parsed = JSON.parse(cachedSettings);
        if (parsed && typeof parsed === 'object') setLegalSettings(parsed);
      }
      const cachedBrackets = localStorage.getItem('iraq_tax_brackets');
      if (cachedBrackets) {
        const parsedB = JSON.parse(cachedBrackets);
        if (Array.isArray(parsedB) && parsedB.length > 0) setTaxBrackets(parsedB);
      }
    } catch (e) {
      console.warn('Error reading cached legal tax settings:', e);
    }

    fetch('/api/tax-module/legal-settings')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.active) {
          setLegalSettings(d.active);
          try { localStorage.setItem('iraq_payroll_legal_settings', JSON.stringify(d.active)); } catch (e) {}
        }
      })
      .catch(() => {});
    fetch('/api/tax-module/tax-brackets')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (Array.isArray(d) && d.length > 0) {
          setTaxBrackets(d);
          try { localStorage.setItem('iraq_tax_brackets', JSON.stringify(d)); } catch (e) {}
        }
      })
      .catch(() => {});
  }, []);

  const handleOpenTraceModal = (row: any) => {
    const isMarried = row.marital_status === 'married' || row.marital_status === 'متزوج' || row.marital_status === 'متأهل';
    const branchName = row.branch || row.branch_ar || row.branch_en || row.office || '';
    const locationName = row.location || row.city || row.location_ar || row.location_en || '';
    const isKurd = isKurdistanLocation(locationName, branchName);
    const empInput: EmployeeInputForCalculation = {
      id: row.id,
      full_name_ar: row.name_ar || row.name,
      basic_salary: Number(row.basic_salary) || 0,
      marital_status: isMarried ? 'married' : 'single',
      gender: row.gender,
      children_count: row.children_count || 0,
      spouse_has_income: false,
      is_ss_tax_exempt: Number(row.is_ss_tax_exempt) === 1,
      exemption_reason: row.ss_tax_exemption_reason,
      branch: branchName,
      location: locationName,
      region: isKurd ? 'KURDISTAN' : 'IRAQ',
      allowances: {
        housing: Number(row.housing_allowance) || 0,
        transport: Number(row.transportation) || 0,
        phone: Number(row.phone_allowance) || 0,
        cert: Number(row.cert_allowance) || 0,
        overtime: Number(row.overtime) || 0,
        bonus: Number(row.bonus) || 0,
        incentives: Number(row.incentives) || 0,
        family: Number(row.family_allowance) || 0
      }
    };
    const res = calculateCombinedPayrollTaxAndSecurity(empInput, legalSettings, taxBrackets);
    setTraceCalculationResult(res);
    setTraceModalRow(row);
    setIsTraceModalOpen(true);
  };
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

  // Live adjustments per employee (id -> adjustment) persisted in localStorage
  const [adjustments, setAdjustments] = useState<Record<string, EmployeeAdjustment>>(() => {
    try {
      const saved = localStorage.getItem('vitas_payroll_manual_adjustments');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Listen for real-time updates from Incentives Module
  useEffect(() => {
    const reloadAdjustments = () => {
      try {
        const saved = localStorage.getItem('vitas_payroll_manual_adjustments');
        if (saved) {
          setAdjustments(JSON.parse(saved));
        }
      } catch (e) {}
    };
    window.addEventListener('vitas_payroll_adjustments_updated', reloadAdjustments);
    window.addEventListener('storage', reloadAdjustments);
    return () => {
      window.removeEventListener('vitas_payroll_adjustments_updated', reloadAdjustments);
      window.removeEventListener('storage', reloadAdjustments);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('vitas_payroll_manual_adjustments', JSON.stringify(adjustments));
    } catch (e) {
      console.warn('Failed to persist adjustments to localStorage', e);
    }
  }, [adjustments]);

  // Adjustment Modal state
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [adjForm, setAdjForm] = useState<EmployeeAdjustment>({
    absenceDays: 0,
    incentives: 0,
    transportation: 0,
    bonus: 0,
    overtime: 0,
    earnedLeave: 0,
    socialSecurity: 0,
    incomeTax: 0,
    loanPayment: 0,
    otherDeductions: 0,
    overtimeHours: 0,
    overtimeAmount: 0,
    bonusExtra: 0
  });

  // Cell Double-Click Editing & Notes State (Excel-like Sheet Behavior)
  const [editingCell, setEditingCell] = useState<EditingCellState | null>(null);
  const [cellValueInput, setCellValueInput] = useState<string>('0');
  const [cellNoteInput, setCellNoteInput] = useState<string>('');
  const [cellComments, setCellComments] = useState<Record<string, CellCommentItem>>(() => {
    try {
      const saved = localStorage.getItem('vitas_payroll_cell_comments');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('vitas_payroll_cell_comments', JSON.stringify(cellComments));
    } catch (e) {
      console.warn('Failed to persist cell comments to localStorage', e);
    }
  }, [cellComments]);

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

  // On Hold Payroll State & Modal Controls persisted in localStorage
  const [onHoldOverrides, setOnHoldOverrides] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('vitas_payroll_on_hold_overrides');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Comprehensive Salary Hold & Release Audit History Records
  const [salaryHoldRecords, setSalaryHoldRecords] = useState<SalaryHoldRecord[]>(() => {
    try {
      const saved = localStorage.getItem('vitas_payroll_salary_holds_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modal tab filter and search states
  const [onHoldModalTab, setOnHoldModalTab] = useState<'CURRENT' | 'RELEASED' | 'ALL'>('CURRENT');
  const [onHoldSearchQuery, setOnHoldSearchQuery] = useState<string>('');

  // Fetch salary hold records from server on mount & sync
  useEffect(() => {
    fetch('/api/payroll/salary-holds')
      .then(res => res.json())
      .then((data: any) => {
        if (Array.isArray(data) && data.length > 0) {
          setSalaryHoldRecords(prev => {
            const map = new Map<string, SalaryHoldRecord>();
            data.forEach((r: any) => map.set(String(r.id), r));
            prev.forEach(r => {
              if (!map.has(String(r.id))) map.set(String(r.id), r);
            });
            const merged = Array.from(map.values());
            try {
              localStorage.setItem('vitas_payroll_salary_holds_history', JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        }
      })
      .catch(() => {});
  }, []);

  // Save salary hold records to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem('vitas_payroll_salary_holds_history', JSON.stringify(salaryHoldRecords));
    } catch (e) {
      console.warn('Failed to persist salaryHoldRecords to localStorage', e);
    }
  }, [salaryHoldRecords]);

  // Listen for direct navigation to a specific payroll period (e.g. from On-Hold / Release history)
  useEffect(() => {
    const handleNavigate = (e: any) => {
      const detail = e.detail;
      if (detail && detail.year && detail.month) {
        setSelectedYear(Number(detail.year));
        setSelectedMonth(Number(detail.month));
        if (detail.empId) {
          setSelectedEmpId(String(detail.empId));
        }
      }
    };
    window.addEventListener('vitas_navigate_payroll_period', handleNavigate);

    try {
      const targetStr = localStorage.getItem('vitas_payroll_target_period');
      if (targetStr) {
        const target = JSON.parse(targetStr);
        if (target && target.year && target.month) {
          setSelectedYear(Number(target.year));
          setSelectedMonth(Number(target.month));
          if (target.empId) setSelectedEmpId(String(target.empId));
          localStorage.removeItem('vitas_payroll_target_period');
        }
      }
    } catch (e) {}

    return () => {
      window.removeEventListener('vitas_navigate_payroll_period', handleNavigate);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('vitas_payroll_on_hold_overrides', JSON.stringify(onHoldOverrides));
    } catch (e) {
      console.warn('Failed to persist onHoldOverrides to localStorage', e);
    }
  }, [onHoldOverrides]);

  const [showOnHoldModal, setShowOnHoldModal] = useState<boolean>(false);

  // Excel Template & Import States
  const [isExportingTemplate, setIsExportingTemplate] = useState<boolean>(false);
  const [isImportingExcel, setIsImportingExcel] = useState<boolean>(false);
  const [payrollImportModalData, setPayrollImportModalData] = useState<any | null>(null);
  const payrollFileInputRef = useRef<HTMLInputElement | null>(null);

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
    // Exchange rate for payroll calculations and policy allowances
    const fxRate = parseFloat(appSettings['usd_to_iqd_rate'] || '1310') || 1310;

    // Remove duplicates based on employee ID to prevent duplicate payroll entries
    const uniqueEmployees = employees.filter((emp, index, self) =>
      index === self.findIndex(e => String(e.id) === String(emp.id))
    );
    
    // Log for debugging
    if (employees.length !== uniqueEmployees.length) {
      console.log(`Removed ${employees.length - uniqueEmployees.length} duplicate employees from payroll calculation`);
    }
    
    return uniqueEmployees.map(emp => {
      const adj = adjustments[emp.id] || {};

      // XAMPP Field: basic_salary
      const basic_salary = adj.basicSalary !== undefined ? adj.basicSalary : Number(emp.basicSalary ?? emp.basic_salary ?? emp.salary ?? 1250000);
      // SS/Tax exemption flag (from DB column is_ss_tax_exempt)
      const isExemptFromSsTax = Number(emp.isSsTaxExempt ?? emp.is_ss_tax_exempt ?? 0) === 1;
      
      // XAMPP Field: absence_days (1. absence)
      const absence_days = adj.absenceDays !== undefined ? adj.absenceDays : 0;
      const absenceDeduction = (absence_days * (basic_salary / 30));
      
      // XAMPP Field: current_month_basic
      const current_month_basic = Math.max(0, basic_salary - absenceDeduction);

      // XAMPP Allowances Fields (supporting camelCase & snake_case)
      const phone_allowance = adj.phoneAllowance !== undefined ? adj.phoneAllowance : Number(emp.phoneAllowance ?? emp.phone_allowance ?? 0);
      // Dynamic certificate allowance from graduation degree policy if not individually overridden
      const deg = emp.graduationDegree || emp.graduation_degree || '';
      let policyCertVal = 0;
      if (deg === 'Diplome') {
        const raw = parseFloat(appSettings['certificate_allowance_diplome'] || '50000');
        policyCertVal = appSettings['certificate_allowance_currency'] === 'USD' ? Math.round(raw * fxRate) : raw;
      } else if (deg === 'Bachelar') {
        const raw = parseFloat(appSettings['certificate_allowance_bachelar'] || '100000');
        policyCertVal = appSettings['certificate_allowance_currency'] === 'USD' ? Math.round(raw * fxRate) : raw;
      } else if (deg === 'Master') {
        const raw = parseFloat(appSettings['certificate_allowance_master'] || '150000');
        policyCertVal = appSettings['certificate_allowance_currency'] === 'USD' ? Math.round(raw * fxRate) : raw;
      }

      const cert_allowance = adj.certAllowance !== undefined 
        ? adj.certAllowance 
        : (emp.certificateAllowance && Number(emp.certificateAllowance) > 0 
            ? Number(emp.certificateAllowance) 
            : (emp.certificate_allowance && Number(emp.certificate_allowance) > 0 
                ? Number(emp.certificate_allowance) 
                : policyCertVal));
      // 2. transportation
      const transportation = adj.transportation !== undefined ? adj.transportation : Number(emp.transportationFixed ?? emp.transportation_fixed ?? 0);
      // 3. bonus
      const bonus = adj.bonus !== undefined ? adj.bonus : (Number(emp.fixedBonus ?? emp.fixed_bonus ?? 0) + (adj.bonusExtra || 0));
      // 4. incentives
      const incentives = adj.incentives !== undefined ? adj.incentives : Number(emp.incentives ?? 0);
      // 5. earned_leave
      const earned_leave = adj.earnedLeave !== undefined ? adj.earnedLeave : Number(emp.earnedLeave ?? emp.earned_leave ?? 0);

      // Family allowance calculation (spouse + children under 18) -> family_allowance
      // Values are fetched directly from Policies settings in appSettings (or defaults)

      // Determine if employee is a Loan Officer (Loan Officer, Senior Loan Officer, SE Loan Officer - excluding supervisors & managers)
      const empPos = `${emp.position || ''} ${emp.position_en || ''} ${emp.position_ar || ''} ${emp.title || ''} ${emp.job_title || ''} ${emp.job_title_en || ''} ${emp.job_title_ar || ''}`.toLowerCase();
      const isLoanOfficer = ((): boolean => {
        if (!empPos) return false;
        if (
          empPos.includes('supervisor') || empPos.includes('مشرف') || 
          empPos.includes('manager') || empPos.includes('مدير') || 
          empPos.includes('coordinator') || empPos.includes('منسق') || 
          empPos.includes('assistant') || empPos.includes('مساعد') ||
          empPos.includes('head') || empPos.includes('رئيس')
        ) {
          return false;
        }
        return empPos.includes('se loan officer') || 
               empPos.includes('senior loan officer') || 
               empPos.includes('loan officer') || 
               empPos.includes('مسؤول قروض') || 
               empPos.includes('مسؤول القروض') || 
               empPos.includes('ضابط قروض');
      })();

      // Loan Officer: 5 USD default, Others: 4 USD default
      const loChildValRaw = parseFloat(appSettings['child_allowance_loan_officer_default'] || '5');
      const loChildCurr = appSettings['child_allowance_loan_officer_currency'] || 'USD';
      const loChildAllowance = loChildCurr === 'USD' ? Math.round(loChildValRaw * fxRate) : loChildValRaw;

      const otherChildValRaw = parseFloat(appSettings['child_allowance_default'] || appSettings['child_allowance'] || '4');
      const otherChildCurr = appSettings['child_allowance_currency'] || 'USD';
      const otherChildAllowance = otherChildCurr === 'USD' ? Math.round(otherChildValRaw * fxRate) : otherChildValRaw;

      const childAllowanceDefault = isLoanOfficer ? loChildAllowance : otherChildAllowance;

      const rawSpouse = parseFloat(appSettings['marriage_allowance_default'] || appSettings['spouse_allowance_default'] || appSettings['marriage_allowance'] || '10');
      const spouseAllowanceDefault = (appSettings['marriage_allowance_currency'] === 'USD') ? Math.round(rawSpouse * fxRate) : rawSpouse;
      
      const childAllowanceVal = emp.childAllowance && emp.childAllowance > 0 ? emp.childAllowance : childAllowanceDefault;
      const spouseAllowanceVal = emp.spouseAllowance && emp.spouseAllowance > 0 ? emp.spouseAllowance : spouseAllowanceDefault;

      // Check if spouse works at same institution - if yes, no spouse allowance
      const spouseWorksHere = emp.spouseEmployedHere === true || emp.spouse_employed_here === true || String(emp.spouse_employed_here) === '1' || String(emp.spouseEmployedHere) === '1';
      
      // Determine if employee is married
      const mStatus = String(emp.maritalStatus || emp.marital_status || '').toLowerCase().trim();
      const isExplicitlySingle = mStatus === 'single' || mStatus === 'أعزب' || mStatus === 'مطلق' || mStatus === 'divorced' || mStatus === 'أرمل' || mStatus === 'widow';
      const cleanSpouseName = (emp.spouseName && emp.spouseName !== 'غير محدد' && emp.spouseName !== 'N/A') ? String(emp.spouseName).trim() : '';
      const hasValidSpouseName = Boolean(cleanSpouseName);

      const isMarried = !isExplicitlySingle && (
        mStatus === 'متأهل' || mStatus === 'متزوج' || mStatus === 'married' || hasValidSpouseName
      );

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

      // Calculate child age accurately (with 2-digit year correction & ghost date filtering)
      const getChildAge = (child: any): number => {
        if (!child) return 99;
        const dobStr = String(child.dob || '').trim();
        // Ignore ghost dates generated from blank/0 Excel cells (e.g. 1899-12-30, 2000-01-01 or 2000-01-02)
        if (dobStr.startsWith('1899') || dobStr.startsWith('1900') || dobStr.includes('1899-12-30') || dobStr === '2000-01-01' || dobStr === '2000-01-02' || dobStr === '2000-01-03') {
          return 99;
        }
        if (dobStr && dobStr !== 'N/A' && dobStr !== '0') {
          const birth = new Date(dobStr);
          if (!isNaN(birth.getTime())) {
            let y = birth.getFullYear();
            if (y <= 1900 || y === 1899) return 99;
            // 2-digit year correction: e.g. 1911 -> 2011, 1915 -> 2015, 1920 -> 2020
            if (y >= 1900 && y <= 1945) {
              y += 100;
            }
            const today = new Date();
            let age = today.getFullYear() - y;
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
              age--;
            }
            if (age > 40) return 99;
            return age < 0 ? 0 : age;
          }
        }
        if (child.age !== undefined && child.age !== null && child.age !== '') {
          const parsed = Number(child.age);
          if (!isNaN(parsed)) {
            if (parsed > 100) return 99; // ghost child age (e.g. 126)
            return parsed;
          }
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
      const auto_family_allowance = spouseAllow + childAllow;
      const family_allowance = adj.familyAllowance !== undefined ? adj.familyAllowance : auto_family_allowance;

      // XAMPP Field: overtime (6. overtime)
      const overtime = adj.overtime !== undefined
        ? adj.overtime
        : (adj.overtimeAmount > 0 ? adj.overtimeAmount : ((adj.overtimeHours || 0) * (basic_salary / 240) * 1.5));
      
      // XAMPP Field: allowances_total
      const allowances_total = phone_allowance + cert_allowance + transportation + bonus + family_allowance + overtime + incentives + earned_leave;

      // XAMPP Field: gross_salary
      const gross_salary = current_month_basic + allowances_total;

      // Deductions Fields: social_security, income_tax, insurance
      // Central Iraqi Social Security & Income Tax Calculation
      const empBranch = emp.branch || emp.branch_en || emp.branch_ar || emp.office || '';
      const empLocation = emp.location || emp.location_en || emp.location_ar || emp.city || '';
      const isKurdistan = isKurdistanLocation(empLocation, empBranch);
      const combinedCalc = calculateCombinedPayrollTaxAndSecurity(
        {
          id: emp.id,
          basic_salary: current_month_basic,
          marital_status: isMarried ? 'married' : 'single',
          gender: emp.gender,
          children_count: childCount,
          spouse_has_income: false,
          is_ss_tax_exempt: isExemptFromSsTax,
          exemption_reason: emp.ss_tax_exemption_reason,
          branch: empBranch,
          location: empLocation,
          region: isKurdistan ? 'KURDISTAN' : 'IRAQ',
          allowances: {
            housing: Number(emp.housingAllowance ?? emp.housing_allowance ?? 0),
            transport: transportation,
            phone: phone_allowance,
            cert: cert_allowance,
            overtime,
            bonus,
            incentives,
            family: family_allowance
          }
        },
        legalSettings,
        taxBrackets
      );

      const auto_social_security = isExemptFromSsTax ? 0 : combinedCalc.item_5_employee_ss_amount;
      const social_security = adj.socialSecurity !== undefined ? adj.socialSecurity : auto_social_security;

      // Health and Life Insurance deduction calculation
      // Policies setting: monthly insurance value (default: 25,000 IQD)
      const insuranceSetting = parseFloat(appSettings['insurance_deduction_default'] || '25000');
      const fullMonthlyInsurance = (!isNaN(insuranceSetting) && insuranceSetting > 0)
        ? insuranceSetting
        : 25000;

      // Fixed 30 days calculation regardless of the calendar month (أياً كان الشهر يحتسب دائماً 30 يوم)
      const daysInMonth = 30;
      const dailyInsurance = fullMonthlyInsurance / 30;

      // 1. First hire date (تاريخ أول تعيين)
      const hireDateStr = emp.originalStartDate || emp.original_start_date || emp.contract_original_start || emp.joinDate || emp.join_date || emp.hireDate || emp.hire_date || emp.contractStartDate || emp.contract_start_date || null;
      const hireParts = parseDateParts(hireDateStr);

      // 2. Exit / Resignation date (تاريخ الاستقالة / المغادرة)
      const exitDateStr = emp.exitDate || emp.exit_date || emp.resignationDate || emp.resignation_date || null;
      const exitParts = parseDateParts(exitDateStr);

      // Determine active insurance days within this payroll month (out of 30 days)
      let activeInsuredDays = 30;
      let insuranceNote = '';

      const isHiredAfterThisMonth = Boolean(
        hireParts && (hireParts.year > selectedYear || (hireParts.year === selectedYear && hireParts.month > selectedMonth))
      );
      const isExitedBeforeThisMonth = Boolean(
        exitParts && (exitParts.year < selectedYear || (exitParts.year === selectedYear && exitParts.month < selectedMonth))
      );

      if (isExemptFromSsTax || isHiredAfterThisMonth || isExitedBeforeThisMonth) {
        activeInsuredDays = 0;
        insuranceNote = isExemptFromSsTax ? 'معفى من الاستقطاعات' : 'خارج فترة الخدمة لهذا الشهر';
      } else {
        const isHireMonth = Boolean(hireParts && hireParts.year === selectedYear && hireParts.month === selectedMonth);
        const isExitMonth = Boolean(exitParts && exitParts.year === selectedYear && exitParts.month === selectedMonth);

        const startDay = isHireMonth ? Math.max(1, Math.min(30, hireParts!.day)) : 1;
        const endDay = isExitMonth ? Math.max(1, Math.min(30, exitParts!.day)) : 30;

        activeInsuredDays = Math.max(0, Math.min(30, endDay - startDay + 1));

        if (isHireMonth && isExitMonth) {
          insuranceNote = `تعيين واستقالة في نفس الشهر (${activeInsuredDays} يوم من أصل 30: من يوم ${startDay} إلى ${endDay})`;
        } else if (isHireMonth) {
          insuranceNote = `شهر أول تعيين (${activeInsuredDays} يوم عمل: من تاريخ التعيين ${startDay} إلى نهاية الشهر 30)`;
        } else if (isExitMonth) {
          insuranceNote = `شهر استقالة / مغادرة (${activeInsuredDays} يوم عمل: من بداية الشهر إلى تاريخ الاستقالة ${endDay})`;
        } else {
          insuranceNote = `تأمين شهري كامل (30 يوم)`;
        }
      }

      const auto_insurance = isExemptFromSsTax || activeInsuredDays <= 0
        ? 0
        : (activeInsuredDays >= 30
            ? fullMonthlyInsurance
            : Math.round(dailyInsurance * activeInsuredDays));

      const insurance = adj.insurance !== undefined ? adj.insurance : auto_insurance;

      // 8. income_tax calculation (Central Engine)
      const customTaxRate = parseFloat(appSettings['income_tax_rate_default'] || '');
      const auto_income_tax = isExemptFromSsTax
        ? 0
        : (!isNaN(customTaxRate) && customTaxRate > 0
            ? Math.round(basic_salary * (customTaxRate / 100))
            : combinedCalc.item_16_monthly_tax);

      const income_tax = adj.incomeTax !== undefined ? adj.incomeTax : auto_income_tax;

      const deductions_calc = social_security + income_tax + insurance;
      
      // XAMPP Fields: loan_payment, other_deductions (9. loan_payment, 10. other_deductions)
      const loan_payment = adj.loanPayment !== undefined ? adj.loanPayment : Number(emp.loanPayment ?? emp.loan_payment ?? 0);
      const other_deductions = adj.otherDeductions !== undefined ? adj.otherDeductions : Number(emp.otherDeductions ?? emp.other_deductions ?? 0);
      
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

      const manualOverride = onHoldOverrides[emp.id] !== undefined
        ? onHoldOverrides[emp.id]
        : onHoldOverrides[String(emp.id)];

      // Manual override takes absolute precedence when toggled by user
      const isOnHold = manualOverride !== undefined
        ? manualOverride
        : (hasExitDate || Boolean(emp.onHold || emp.on_hold === 1));

      let onHoldReason: string | null = null;
      if (isOnHold) {
        if (manualOverride === true) {
          onHoldReason = 'إيقاف يدوي بواسطة إدارة الرواتب';
        } else if (hasExitDate) {
          onHoldReason = `تاريخ مغادرة / استقالة (${exitDateVal || 'مستقيل'})`;
        } else {
          onHoldReason = 'إيقاف مسجل في النظام';
        }
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
        bank_name: emp.bankName || emp.bank_name || '',
        iban: emp.iban || '',
        original_start_date: emp.joinDate || emp.original_start_date || '2023-01-01',

        // XAMPP DB Financial Fields matching `payroll_finalized_rows` table in `vitasiraq_hris_db`
        marital_status: isMarried ? 'married' : 'single',
        gender: emp.gender,
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
        insurance_days: activeInsuredDays,
        insurance_full: fullMonthlyInsurance,
        insurance_note: insuranceNote,
        is_insurance_prorated: activeInsuredDays < 30 && activeInsuredDays > 0,
        is_ss_tax_exempt: isExemptFromSsTax ? 1 : 0,
        ss_tax_exemption_reason: emp.ssTaxExemptionReason || emp.ss_tax_exemption_reason || null,
        deductions_calc,
        loan_payment,
        other_deductions,
        absence_days,
        total_deductions,
        net_salary,
        overtime_hours: adj.overtimeHours,

        // On Hold & Release Audit History Fields
        on_hold: isOnHold ? 1 : 0,
        is_on_hold: isOnHold,
        on_hold_reason: onHoldReason,
        has_exit_date: hasExitDate,
        exit_date_val: exitDateVal,
        is_manual_on_hold: manualOverride !== undefined ? manualOverride : Boolean(emp.onHold || emp.on_hold === 1),
        on_hold_date: (emp as any).on_hold_date || (isOnHold ? new Date().toISOString().split('T')[0] : null),
        on_hold_year: (emp as any).on_hold_year || selectedYear,
        on_hold_month: (emp as any).on_hold_month || selectedMonth,
        release_date: (emp as any).release_date || null,
        release_year: (emp as any).release_year || null,
        release_month: (emp as any).release_month || null,
        release_note: (emp as any).release_note || null
      };
    });
  }, [employees, adjustments, onHoldOverrides, selectedYear, selectedMonth, appSettings]);

  // On Hold employees list
  const onHoldEmployees = useMemo(() => {
    return computedPayrollRows.filter(row => row.on_hold === 1);
  }, [computedPayrollRows]);

  // Aggregated Salary Hold & Release Audit Records for Modal Display & Search
  const modalRecords = useMemo(() => {
    const currentOnHoldEmpIds = new Set(onHoldEmployees.map(e => String(e.id)));
    const list: Array<{
      id: string;
      employee_id: string;
      badge_no: string;
      employee_name_ar: string;
      employee_name_en: string;
      location_ar: string;
      position_ar: string;
      basic_salary: number;
      is_on_hold: boolean;
      status: 'ON_HOLD' | 'RELEASED';
      hold_date: string;
      hold_year: number;
      hold_month: number;
      hold_reason: string;
      release_date?: string | null;
      release_year?: number | null;
      release_month?: number | null;
      release_note?: string | null;
      has_exit_date?: boolean;
      exit_date_val?: string;
    }> = [];

    // 1. Add currently on-hold employees
    onHoldEmployees.forEach(emp => {
      const hist = salaryHoldRecords.find(r => String(r.employee_id) === String(emp.id) && r.status === 'ON_HOLD')
        || salaryHoldRecords.find(r => String(r.employee_id) === String(emp.id));

      list.push({
        id: `curr_${emp.id}`,
        employee_id: String(emp.id),
        badge_no: String(emp.badge_no || emp.employee_id || ''),
        employee_name_ar: emp.employee_name_ar || '',
        employee_name_en: emp.employee_name_en || '',
        location_ar: emp.location_ar || '',
        position_ar: emp.position_ar || '',
        basic_salary: emp.basic_salary || 0,
        is_on_hold: true,
        status: 'ON_HOLD',
        hold_date: hist?.hold_date || (emp as any).on_hold_date || new Date().toISOString().split('T')[0],
        hold_year: hist?.hold_year || (emp as any).on_hold_year || selectedYear,
        hold_month: hist?.hold_month || (emp as any).on_hold_month || selectedMonth,
        hold_reason: emp.on_hold_reason || hist?.hold_reason || 'إيقاف يدوي بواسطة إدارة الرواتب',
        release_date: null,
        release_year: null,
        release_month: null,
        release_note: null,
        has_exit_date: emp.has_exit_date,
        exit_date_val: emp.exit_date_val
      });
    });

    // 2. Add historical hold & release records (especially released ones)
    salaryHoldRecords.forEach(rec => {
      if (rec.status === 'ON_HOLD' && currentOnHoldEmpIds.has(String(rec.employee_id))) {
        return;
      }

      const empObj = employees.find(e => String(e.id) === String(rec.employee_id) || String(e.employeeId) === String(rec.employee_id));

      list.push({
        id: String(rec.id),
        employee_id: String(rec.employee_id),
        badge_no: String(rec.badge_no || empObj?.badgeNo || empObj?.employeeId || ''),
        employee_name_ar: empObj?.fullName || empObj?.full_name_ar || rec.employee_name || '',
        employee_name_en: empObj?.fullNameEn || empObj?.full_name_en || rec.employee_name || '',
        location_ar: empObj?.branch || rec.branch || '—',
        position_ar: empObj?.jobTitle || empObj?.position_ar || rec.position || '—',
        basic_salary: rec.basic_salary || empObj?.salary || 0,
        is_on_hold: rec.status === 'ON_HOLD',
        status: rec.status,
        hold_date: rec.hold_date,
        hold_year: rec.hold_year,
        hold_month: rec.hold_month,
        hold_reason: rec.hold_reason || 'إيقاف مسجل في النظام',
        release_date: rec.release_date,
        release_year: rec.release_year,
        release_month: rec.release_month,
        release_note: rec.release_note
      });
    });

    return list;
  }, [onHoldEmployees, salaryHoldRecords, employees, selectedYear, selectedMonth]);

  // Filtered records based on active modal tab & search query
  const filteredModalRecords = useMemo(() => {
    return modalRecords.filter(r => {
      if (onHoldModalTab === 'CURRENT' && r.status !== 'ON_HOLD') return false;
      if (onHoldModalTab === 'RELEASED' && r.status !== 'RELEASED') return false;

      if (onHoldSearchQuery.trim()) {
        const q = onHoldSearchQuery.toLowerCase().trim();
        const matchesName = r.employee_name_ar.toLowerCase().includes(q) || r.employee_name_en.toLowerCase().includes(q);
        const matchesBadge = r.badge_no.toLowerCase().includes(q) || r.employee_id.toLowerCase().includes(q);
        const matchesBranch = r.location_ar.toLowerCase().includes(q);
        const matchesReason = (r.hold_reason || '').toLowerCase().includes(q) || (r.release_note || '').toLowerCase().includes(q);
        if (!matchesName && !matchesBadge && !matchesBranch && !matchesReason) return false;
      }

      return true;
    });
  }, [modalRecords, onHoldModalTab, onHoldSearchQuery]);

  // Filtered payroll rows for Payslip based on selected Office filter (EXCLUDING On-Hold employees)
  const payslipOfficeFilteredRows = useMemo(() => {
    return computedPayrollRows.filter(row => {
      // Exclude On-Hold employees from Payslips view and batch print
      if (row.on_hold === 1) return false;
      if (selectedPayslipOffice === 'All') return true;
      return row.location_ar === selectedPayslipOffice || row.location_en === selectedPayslipOffice;
    });
  }, [computedPayrollRows, selectedPayslipOffice]);

  // Navigation Handler to directly switch to a specific Payroll Month & Year
  const handleNavigateToPayrollPeriod = (year: number, month: number, empId?: string | number) => {
    setSelectedYear(Number(year));
    setSelectedMonth(Number(month));
    if (empId) {
      setSelectedEmpId(String(empId));
    }
    setShowOnHoldModal(false);
    setActionMessage(t(
      `تم الانتقال مباشرة إلى مسير رواتب شهر (${getMonthName(Number(month))} ${year})`,
      `Navigated to payroll period (${month} / ${year})`
    ));
    setTimeout(() => setActionMessage(null), 3500);
  };

  // Toggle On-Hold Action Handler with Date, Month, Year & Audit History Persistence
  const handleToggleOnHold = (empId: string | number) => {
    const strId = String(empId);
    const row = computedPayrollRows.find(r => String(r.id) === strId);
    if (!row) return;

    const currentOnHold = row.is_on_hold;
    const nextVal = !currentOnHold;
    const todayDate = new Date().toISOString().split('T')[0];

    setOnHoldOverrides(prev => {
      const updated = {
        ...prev,
        [empId]: nextVal,
        [strId]: nextVal
      };
      try {
        localStorage.setItem('vitas_payroll_on_hold_overrides', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    if (nextVal) {
      // 1. Placing On Hold
      const newHoldRec: SalaryHoldRecord = {
        id: `HOLD_${strId}_${Date.now()}`,
        employee_id: strId,
        badge_no: String(row.badge_no || row.employee_id || ''),
        employee_name: language === 'en' ? (row.employee_name_en || '') : (row.employee_name_ar || ''),
        branch: row.location_ar || '',
        department: row.department || '',
        position: row.position_ar || '',
        basic_salary: row.basic_salary || 0,
        hold_date: todayDate,
        hold_year: selectedYear,
        hold_month: selectedMonth,
        hold_reason: row.on_hold_reason || 'إيقاف يدوي بواسطة إدارة الرواتب',
        is_manual: true,
        status: 'ON_HOLD',
        action_by: currentUser?.name || 'Payroll Admin'
      };

      setSalaryHoldRecords(prev => [
        newHoldRec,
        ...prev.filter(r => !(String(r.employee_id) === strId && r.status === 'ON_HOLD'))
      ]);

      // Sync with DB
      fetch('/api/payroll/salary-holds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newHoldRec)
      }).catch(() => {});

      // Update in AppContext / employees state
      const empObj = employees.find(e => String(e.id) === strId);
      if (empObj) {
        const updatedEmp = {
          ...empObj,
          on_hold: 1,
          onHold: true,
          on_hold_date: todayDate,
          on_hold_reason: newHoldRec.hold_reason,
          on_hold_year: selectedYear,
          on_hold_month: selectedMonth,
          release_date: null,
          release_year: null,
          release_month: null,
          release_note: null
        };
        if (typeof updateEmployee === 'function') {
          updateEmployee(updatedEmp as any).catch(() => {});
        }
      }

      fetch(`/api/employees/${strId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          on_hold: 1,
          on_hold_date: todayDate,
          on_hold_reason: newHoldRec.hold_reason,
          on_hold_year: selectedYear,
          on_hold_month: selectedMonth,
          release_date: null
        })
      }).catch(() => {});
    } else {
      // 2. Releasing Salary (Resume Salary)
      const releasePayload = {
        release_date: todayDate,
        release_year: selectedYear,
        release_month: selectedMonth,
        release_note: 'تم إطلاق الراتب واستئنافه بنجاح (Release)',
        action_by: currentUser?.name || 'Payroll Admin'
      };

      setSalaryHoldRecords(prev => {
        let found = false;
        const updated = prev.map(r => {
          if (String(r.employee_id) === strId && r.status === 'ON_HOLD') {
            found = true;
            return {
              ...r,
              status: 'RELEASED' as const,
              ...releasePayload
            };
          }
          return r;
        });

        if (!found) {
          const holdDate = (row as any).on_hold_date || todayDate;
          const syntheticRec: SalaryHoldRecord = {
            id: `HOLD_${strId}_${Date.now()}`,
            employee_id: strId,
            badge_no: String(row.badge_no || row.employee_id || ''),
            employee_name: language === 'en' ? (row.employee_name_en || '') : (row.employee_name_ar || ''),
            branch: row.location_ar || '',
            department: row.department || '',
            position: row.position_ar || '',
            basic_salary: row.basic_salary || 0,
            hold_date: holdDate,
            hold_year: (row as any).on_hold_year || selectedYear,
            hold_month: (row as any).on_hold_month || selectedMonth,
            hold_reason: row.on_hold_reason || 'إيقاف مسجل في النظام',
            is_manual: true,
            status: 'RELEASED',
            ...releasePayload
          };
          return [syntheticRec, ...updated];
        }
        return updated;
      });

      // Sync with DB
      fetch(`/api/payroll/salary-holds/${strId}/release`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(releasePayload)
      }).catch(() => {});

      // Update in AppContext / employees state
      const empObj = employees.find(e => String(e.id) === strId);
      if (empObj) {
        const updatedEmp = {
          ...empObj,
          on_hold: 0,
          onHold: false,
          release_date: todayDate,
          release_year: selectedYear,
          release_month: selectedMonth,
          release_note: releasePayload.release_note
        };
        if (typeof updateEmployee === 'function') {
          updateEmployee(updatedEmp as any).catch(() => {});
        }
      }

      fetch(`/api/employees/${strId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          on_hold: 0,
          release_date: todayDate,
          release_year: selectedYear,
          release_month: selectedMonth,
          release_note: releasePayload.release_note
        })
      }).catch(() => {});
    }

    setActionMessage(t(
      nextVal
        ? `تم إيقاف راتب الموظف (${row.employee_name_ar}) بتاريخ (${todayDate}) واستبعاده من كشوف وقسائم الرواتب بنجاح (On Hold)`
        : `تم إطلاق وتفعيل راتب الموظف (${row.employee_name_ar}) بتاريخ (${todayDate}) لمسير (${getMonthName(selectedMonth)} ${selectedYear}) وإعادته للرواتب بنجاح (Release)`,
      nextVal
        ? `Payroll for ${row.employee_name_en} placed On Hold on ${todayDate}`
        : `Payroll for ${row.employee_name_en} released on ${todayDate} for ${getMonthName(selectedMonth)} ${selectedYear}`
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
    const existing = adjustments[row.id];
    setAdjForm({
      absenceDays: existing?.absenceDays !== undefined ? existing.absenceDays : (row.absence_days || 0),
      incentives: existing?.incentives !== undefined ? existing.incentives : (row.incentives || 0),
      transportation: existing?.transportation !== undefined ? existing.transportation : (row.transportation || 0),
      bonus: existing?.bonus !== undefined ? existing.bonus : (row.bonus || 0),
      overtime: existing?.overtime !== undefined ? existing.overtime : (row.overtime || 0),
      earnedLeave: existing?.earnedLeave !== undefined ? existing.earnedLeave : (row.earned_leave || 0),
      socialSecurity: existing?.socialSecurity !== undefined ? existing.socialSecurity : (row.social_security || 0),
      incomeTax: existing?.incomeTax !== undefined ? existing.incomeTax : (row.income_tax || 0),
      loanPayment: existing?.loanPayment !== undefined ? existing.loanPayment : (row.loan_payment || 0),
      otherDeductions: existing?.otherDeductions !== undefined ? existing.otherDeductions : (row.other_deductions || 0),
      overtimeHours: existing?.overtimeHours || 0,
      overtimeAmount: existing?.overtimeAmount || 0,
      bonusExtra: existing?.bonusExtra || 0
    });
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

  // Handle cell double-click to edit cell value & note (Excel-like Sheet Behavior)
  const handleCellDoubleClick = (
    row: any,
    fieldKey: string,
    fieldLabel: string,
    fieldLabelAr: string,
    currentValue: number
  ) => {
    if (isPeriodLocked) {
      setActionMessage(t('لا يمكن التعديل: مسير الرواتب معتمد ومغلق نهائياً (Finalize & Lock)!', 'Cannot edit: Payroll period is finalized and locked!'));
      setTimeout(() => setActionMessage(null), 3500);
      return;
    }

    const commentKey = `${row.id}_${fieldKey}`;
    const existingComment = cellComments[commentKey];

    setEditingCell({
      empId: String(row.id),
      empName: language === 'en' ? row.employee_name_en : row.employee_name_ar,
      badgeNo: row.badge_no,
      fieldKey,
      fieldLabel,
      fieldLabelAr,
      currentValue,
      currentNote: existingComment?.note || '',
      existingAuthor: existingComment?.author,
      existingDate: existingComment?.updatedAt
    });
    setCellValueInput(String(currentValue));
    setCellNoteInput(existingComment?.note || '');
  };

  // Save edited cell value and note
  const handleSaveCellEdit = () => {
    if (!editingCell) return;
    if (isPeriodLocked) {
      setEditingCell(null);
      return;
    }

    const numVal = parseFloat(cellValueInput) || 0;
    const commentKey = `${editingCell.empId}_${editingCell.fieldKey}`;
    const authorName = currentUser?.name || currentUser?.username || 'مستخدم النظام (HR)';
    const nowStr = new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });

    // 1. Update Adjustments state
    setAdjustments(prev => {
      const empAdj = { ...(prev[editingCell.empId] || {}) };
      
      switch (editingCell.fieldKey) {
        case 'basic_salary':
        case 'current_month_basic':
          empAdj.basicSalary = numVal;
          break;
        case 'phone_allowance':
          empAdj.phoneAllowance = numVal;
          break;
        case 'family_allowance':
          empAdj.familyAllowance = numVal;
          break;
        case 'cert_allowance':
          empAdj.certAllowance = numVal;
          break;
        case 'incentives':
          empAdj.incentives = numVal;
          break;
        case 'transportation':
          empAdj.transportation = numVal;
          break;
        case 'bonus':
          empAdj.bonus = numVal;
          break;
        case 'overtime':
          empAdj.overtime = numVal;
          break;
        case 'earned_leave':
          empAdj.earnedLeave = numVal;
          break;
        case 'social_security':
          empAdj.socialSecurity = numVal;
          break;
        case 'income_tax':
          empAdj.incomeTax = numVal;
          break;
        case 'insurance':
          empAdj.insurance = numVal;
          break;
        case 'loan_payment':
          empAdj.loanPayment = numVal;
          break;
        case 'other_deductions':
          empAdj.otherDeductions = numVal;
          break;
      }

      return {
        ...prev,
        [editingCell.empId]: empAdj
      };
    });

    // 2. Update Cell Comments with Author and Timestamp
    setCellComments(prev => {
      const next = { ...prev };
      if (cellNoteInput.trim()) {
        next[commentKey] = {
          empId: editingCell.empId,
          fieldKey: editingCell.fieldKey,
          value: numVal,
          note: cellNoteInput.trim(),
          author: authorName,
          updatedAt: nowStr
        };
      } else {
        delete next[commentKey];
      }
      return next;
    });

    setEditingCell(null);
    setActionMessage(t(`تم حفظ تعديل الخلية (${editingCell.fieldLabelAr}) وإضافة الملاحظة بنجاح!`, `Cell ${editingCell.fieldLabel} and note saved successfully!`));
    setTimeout(() => setActionMessage(null), 3500);
  };

  // Reusable Excel-like Editable Table Cell with Note Indicator & Tooltip
  const renderEditableCell = (
    row: any,
    fieldKey: string,
    fieldLabel: string,
    fieldLabelAr: string,
    value: number,
    colorClasses: string,
    prefix: string = ''
  ) => {
    const commentKey = `${row.id}_${fieldKey}`;
    const comment = cellComments[commentKey];
    const hasComment = Boolean(comment?.note);

    return (
      <td
        onDoubleClick={() => handleCellDoubleClick(row, fieldKey, fieldLabel, fieldLabelAr, value)}
        title={
          isPeriodLocked
            ? t('المسير معتمد ومغلق (Finalize & Lock) - لا يمكن التعديل', 'Payroll locked - editing disabled')
            : t('نقر مزدوج للتعديل وإضافة ملاحظة (Excel)', 'Double click to edit cell and add note (Excel)')
        }
        className={`p-3 border-r whitespace-nowrap font-mono font-normal relative select-none group transition-all ${
          isPeriodLocked
            ? 'cursor-default'
            : 'cursor-pointer hover:bg-teal-500/10 hover:ring-1 hover:ring-teal-400/50'
        } ${colorClasses}`}
      >
        {/* Excel-style Red Triangle Corner Indicator for Notes */}
        {hasComment && (
          <div
            className="absolute top-0 right-0 w-0 h-0 border-t-[8px] border-t-rose-500 border-l-[8px] border-l-transparent z-10"
            title={`${comment.author}: ${comment.note}`}
          />
        )}

        {/* Value */}
        <span>
          {prefix}{value.toLocaleString('en-US')}
        </span>
        {fieldKey === 'insurance' && row.is_insurance_prorated && (
          <span
            className="ms-1 px-1 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-700 dark:text-amber-300 font-sans font-bold inline-block border border-amber-500/30"
            title={row.insurance_note}
          >
            ({row.insurance_days}ي)
          </span>
        )}

        {/* Excel Note Tooltip on Hover */}
        {hasComment && (
          <div className="absolute z-30 hidden group-hover:block top-full right-0 min-w-[220px] max-w-[280px] p-2.5 rounded-xl bg-slate-900/95 dark:bg-[#1e293b]/95 text-white border border-rose-500/40 shadow-2xl backdrop-blur-sm pointer-events-none text-right font-sans">
            <div className="flex items-center justify-between border-b border-white/10 pb-1 mb-1.5 text-[10px]">
              <span className="font-bold text-amber-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px] text-rose-400">comment</span>
                {comment.author}
              </span>
              <span className="text-slate-400 font-mono text-[9px]">{comment.updatedAt}</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-normal whitespace-normal break-words">
              {comment.note}
            </p>
          </div>
        )}
      </td>
    );
  };

  // Finalize Period Action
  const handleFinalizePeriod = () => {
    const newPeriod: FinalizedPeriod = {
      id: `fp-${selectedYear}-${selectedMonth}`,
      year: selectedYear,
      month: selectedMonth,
      finalizedAt: new Date().toLocaleString('en-US'),
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

  // Export Payroll Template with Windows File Save Dialog
  const handleExportPayrollTemplate = async () => {
    setIsExportingTemplate(true);
    try {
      const res = await generatePayrollTemplateExcel(computedPayrollRows, selectedYear, selectedMonth);
      if (res.success) {
        setActionMessage(t(`تم إنشاء وتنزيل قالب مسير الرواتب والبدلات لشهر ${selectedMonth}/${selectedYear} بنجاح!`, `Payroll template for ${selectedMonth}/${selectedYear} exported successfully!`));
        setTimeout(() => setActionMessage(null), 4000);
      } else if (!res.canceled) {
        alert(t('فشل في تصدير قالب الإكسل', 'Failed to export excel template'));
      }
    } catch (err: any) {
      console.error('Export template error:', err);
      alert(err?.message || 'Error exporting template');
    } finally {
      setIsExportingTemplate(false);
    }
  };

  // Trigger file selection for importing payroll Excel
  const handleTriggerPayrollImport = () => {
    if (payrollFileInputRef.current) {
      payrollFileInputRef.current.value = '';
      payrollFileInputRef.current.click();
    }
  };

  // Handle selected Excel file for payroll import
  const handleSelectPayrollImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImportingExcel(true);
    try {
      const parseResult = await parsePayrollExcel(file, employees);
      if (!parseResult.success) {
        alert(parseResult.error || t('فشل في قراءة ملف الإكسل', 'Failed to parse excel file'));
        return;
      }
      setPayrollImportModalData(parseResult);
    } catch (err: any) {
      console.error('Import excel error:', err);
      alert(err?.message || 'Error parsing excel');
    } finally {
      setIsImportingExcel(false);
      if (payrollFileInputRef.current) payrollFileInputRef.current.value = '';
    }
  };

  // Confirm and apply imported adjustments to live state
  const handleConfirmPayrollImport = () => {
    if (!payrollImportModalData?.parsedAdjustments) return;

    setAdjustments(prev => {
      const next = { ...prev };
      Object.entries(payrollImportModalData.parsedAdjustments).forEach(([empId, adj]: [string, any]) => {
        next[empId] = {
          ...(next[empId] || {}),
          ...adj
        };
      });
      return next;
    });

    const count = payrollImportModalData.matchedCount;
    setPayrollImportModalData(null);
    setActionMessage(t(`تم استيراد وتطبيق بدلات وحوافز ومكافآت ${count} موظفاً بنجاح وحفظها في المسير!`, `Imported and applied allowances & incentives for ${count} staff successfully!`));
    setTimeout(() => setActionMessage(null), 5000);
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

      {/* Top Header & Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {activeModuleId === 'payroll-mgmt' && t('إدارة مسيرات الرواتب الشهرية والبدلات', 'Monthly Payroll & Allowances Management')}
            {activeModuleId === 'payroll-payslip' && t('مستخرج واستعراض كشف الراتب الشهري (Payslip)', 'Monthly Payslip Viewer & Exporter')}
            {activeModuleId === 'payroll-approvals' && t('مركز الاعتمادات والموافقات المالية', 'Financial Approvals Hub')}
            {activeModuleId === 'payroll-claims' && t('تفاصيل طلبات الاعتماد والتعويضات', 'Approval Requests & Claims Details')}
          </h1>
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

          {/* Quick Link to Incentives Engine */}
          <button
            onClick={() => setActiveModuleId('payroll-incentives-module')}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs shadow-lg shadow-teal-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
            title={t('الانتقال لنظام ومحرك احتساب الحوافز المستقل', 'Open Standalone Incentives & Entitlements Engine')}
          >
            <span className="material-symbols-outlined text-sm">military_tech</span>
            <span>{t('نظام الحوافز (Incentives)', 'Incentives Engine')}</span>
          </button>

          {/* Quick Button to Open HR Policies & Rates Modal */}
          <button
            onClick={() => setShowPoliciesModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-900 font-medium text-xs border-2 border-slate-300 shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            title={t('عرض وتعديل سياسات الرواتب، أسعار الصرف، والبدلات والإجازات', 'View and adjust payroll policies, exchange rates, allowances, and leaves')}
          >
            <span className="material-symbols-outlined text-sm text-teal-600">policy</span>
            <span>{t('سياسات الرواتب واللوائح', 'Payroll Policies & Rates')}</span>
          </button>

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
                {totals.gross.toLocaleString('en-US')} {t('د.ع', 'IQD')}
              </p>
              <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>{t('شامل الأسمي وكافة البدلات والمكافآت', 'Includes basic and all allowances')}</p>
            </div>

            <div className={`p-4 rounded-2xl ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200 shadow-sm'} border space-y-1`}>
              <span className={`${isDark ? 'text-slate-400' : 'text-slate-600'} font-medium block`}>{t('صافي الرواتب مستحقة الصرف (net_salary)', 'Total Net Payable Payroll')}</span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {totals.net.toLocaleString('en-US')} {t('د.ع', 'IQD')}
              </p>
              <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>{t('المبلغ النهائي المحول لبصمة البنوك', 'Final amount to be disbursed')}</p>
            </div>

            <div className={`p-4 rounded-2xl ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200 shadow-sm'} border space-y-1`}>
              <span className={`${isDark ? 'text-slate-400' : 'text-slate-600'} font-medium block`}>{t('إجمالي الاستقطاعات والتقاعد (deductions_calc)', 'Total Deductions & Pension')}</span>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
                {totals.deductions.toLocaleString('en-US')} {t('د.ع', 'IQD')}
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

            {/* Actions & View Controls Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Hidden file input for Excel import */}
              <input
                type="file"
                ref={payrollFileInputRef}
                onChange={handleSelectPayrollImportFile}
                accept=".xlsx, .xls"
                className="hidden"
              />

              {/* Button: Export Excel Template with File Save Dialog */}
              <button
                onClick={handleExportPayrollTemplate}
                disabled={isExportingTemplate}
                title={t('انشاء وتنزيل قالب إكسل مع نافذة لاختيار مكان الحفظ، يحتوي بيانات الموظفين والمبالغ الثابتة لتعديل الحوافز والمكافآت', 'Download pre-filled Excel template with employee baseline and fixed amounts')}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">
                  {isExportingTemplate ? 'progress_activity' : 'download'}
                </span>
                <span>{isExportingTemplate ? t('جارِ التصدير...', 'Exporting...') : t('قالب إكسل (Template)', 'Excel Template')}</span>
              </button>

              {/* Button: Import Excel Sheet */}
              <button
                onClick={handleTriggerPayrollImport}
                disabled={isImportingExcel}
                title={t('استيراد الحوافز، بدل النقل، المكافآت، والعمل الإضافي من ملف إكسل وتطبيقها مباشرة', 'Import incentives, transportation, bonus, overtime from Excel sheet')}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">
                  {isImportingExcel ? 'progress_activity' : 'upload_file'}
                </span>
                <span>{isImportingExcel ? t('جارِ القراءة...', 'Reading...') : t('استيراد إكسل (Incentives / Bonus)', 'Import Excel')}</span>
              </button>

              {/* Button: Policies & Rates */}
              <button
                onClick={() => setShowPoliciesModal(true)}
                title={t('عرض وتعديل سياسات الرواتب، أسعار الصرف، والبدلات والإجازات', 'View & edit payroll policies, exchange rates & allowances')}
                className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-900 font-medium text-xs border border-slate-300 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-sm text-teal-600">tune</span>
                <span>{t('السياسات واللوائح', 'Policies & Rules')}</span>
              </button>

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
                  <thead className="payroll-dark-header sticky top-0 z-10 shadow-lg">
                    <tr className="payroll-dark-header font-mono font-extrabold text-xs sm:text-sm select-none border-b-2 border-teal-500">
                      <th className="p-3.5 text-center border-r border-slate-700 w-10 font-black text-slate-400">#</th>
                      <th className="th-badge p-3.5 border-r border-slate-700 whitespace-nowrap font-black tracking-wide">badge_no</th>
                      <th className="th-location p-3.5 border-r border-slate-700 whitespace-nowrap font-black tracking-wide">location</th>
                      <th className="th-name p-3.5 border-r border-slate-700 whitespace-nowrap font-black tracking-wide">employee_name</th>
                      <th className="th-position p-3.5 border-r border-slate-700 whitespace-nowrap font-black tracking-wide">position</th>
                      <th className="th-salary p-3.5 border-r border-slate-700 whitespace-nowrap font-black tracking-wide">
                        {viewMode === 'summary' ? 'current_month_basic' : 'basic_salary'}
                      </th>

                      {viewMode === 'summary' && (
                        <>
                          <th className="th-allowance p-3.5 border-r border-slate-700 whitespace-nowrap font-black tracking-wide">incentives</th>
                          <th className="th-allowance p-3.5 border-r border-slate-700 whitespace-nowrap font-black tracking-wide">transportation</th>
                          <th className="th-allowance p-3.5 border-r border-slate-700 whitespace-nowrap font-black tracking-wide">bonus</th>
                          <th className="th-allowance-green p-3.5 border-r border-slate-700 whitespace-nowrap font-black tracking-wide">overtime</th>
                          <th className="th-allowance-green p-3.5 border-r border-slate-700 whitespace-nowrap font-black tracking-wide">earned_leave</th>
                          <th className="th-allowance p-3.5 border-r border-slate-700 whitespace-nowrap font-black tracking-wide">allowances_total</th>
                        </>
                      )}

                      {viewMode === 'detailed' && (
                        <>
                          <th className="th-salary p-3.5 border-r border-slate-700 whitespace-nowrap font-black tracking-wide">current_month_basic</th>
                          <th className="th-allowance p-3.5 border-r border-slate-700 whitespace-nowrap font-black tracking-wide">phone_allowance</th>
                          <th className="th-allowance p-3.5 border-r border-slate-700 whitespace-nowrap font-black tracking-wide">family_allowance</th>
                          <th className="th-allowance p-3.5 border-r border-slate-700 whitespace-nowrap font-black tracking-wide">cert_allowance</th>
                          <th className="th-allowance p-3.5 border-r border-slate-700 whitespace-nowrap font-black tracking-wide">incentives</th>
                          <th className="th-allowance p-3.5 border-r border-slate-700 whitespace-nowrap font-black tracking-wide">transportation</th>
                          <th className="th-allowance p-3.5 border-r border-slate-700 whitespace-nowrap font-black tracking-wide">bonus</th>
                          <th className="th-allowance-green p-3.5 border-r border-slate-700 whitespace-nowrap font-black tracking-wide">overtime</th>
                          <th className="th-allowance-green p-3.5 border-r border-slate-700 whitespace-nowrap font-black tracking-wide">earned_leave</th>
                        </>
                      )}

                      <th className="th-gross p-3.5 border-r border-slate-700 whitespace-nowrap font-black tracking-wide">gross_salary</th>

                      {viewMode === 'detailed' && (
                        <>
                          <th className="th-deduction p-3.5 border-r border-slate-700 whitespace-nowrap font-black tracking-wide">social_security</th>
                          <th className="th-deduction p-3.5 border-r border-slate-700 whitespace-nowrap font-black tracking-wide">income_tax</th>
                          <th className="th-deduction p-3.5 border-r border-slate-700 whitespace-nowrap font-black tracking-wide">insurance</th>
                          <th className="th-deduction p-3.5 border-r border-slate-700 whitespace-nowrap font-black tracking-wide">loan_payment</th>
                          <th className="th-deduction p-3.5 border-r border-slate-700 whitespace-nowrap font-black tracking-wide">other_deductions</th>
                        </>
                      )}

                      <th className="th-total-ded p-3.5 border-r border-slate-700 whitespace-nowrap font-black tracking-wide">total_deductions</th>
                      <th className="th-net p-3.5 border-r border-slate-700 whitespace-nowrap font-black tracking-wide">net_salary</th>
                      <th className="th-action p-3.5 text-center whitespace-nowrap font-black">{t('إجراءات', 'Actions')}</th>
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
                            {row.is_on_hold && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30 flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[10px]">front_hand</span>
                                <span>{language === 'en' ? 'On Hold' : 'موقوف'}</span>
                              </span>
                            )}
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

                        {viewMode === 'summary' ? (
                          renderEditableCell(row, 'current_month_basic', 'Current Month Basic', 'الراتب الاسمي للشهر', row.current_month_basic || 0, isDark ? 'border-white/5 text-cyan-300 bg-[#1e293b]' : 'border-slate-200 text-slate-900 bg-slate-100')
                        ) : (
                          renderEditableCell(row, 'basic_salary', 'Basic Salary', 'الراتب الاسمي', row.basic_salary || 0, isDark ? 'border-white/5 text-cyan-300 bg-[#1e293b]' : 'border-slate-200 text-slate-900 bg-slate-100')
                        )}

                        {viewMode === 'summary' && (
                          <>
                            {renderEditableCell(row, 'incentives', 'Incentives', 'الحوافز', row.incentives || 0, isDark ? 'border-white/5 text-emerald-300' : 'border-slate-200 text-emerald-800')}
                            {renderEditableCell(row, 'transportation', 'Transportation', 'بدل النقل', row.transportation || 0, isDark ? 'border-white/5 text-emerald-300' : 'border-slate-200 text-emerald-800')}
                            {renderEditableCell(row, 'bonus', 'Bonus', 'المكافآت', row.bonus || 0, isDark ? 'border-white/5 text-emerald-300' : 'border-slate-200 text-emerald-800')}
                            {renderEditableCell(row, 'overtime', 'Overtime', 'أجر إضافي', row.overtime || 0, isDark ? 'border-white/5 text-emerald-400' : 'border-slate-200 text-emerald-800')}
                            {renderEditableCell(row, 'earned_leave', 'Earned Leave', 'إجازة مستحقة', row.earned_leave || 0, isDark ? 'border-white/5 text-emerald-400' : 'border-slate-200 text-emerald-800')}
                            <td className={`p-3 border-r whitespace-nowrap font-mono font-normal ${
                              isDark ? 'border-white/5 text-emerald-400' : 'border-slate-200 text-emerald-800'
                            }`}>
                              +{(row.allowances_total || 0).toLocaleString('en-US')}
                            </td>
                          </>
                        )}

                        {viewMode === 'detailed' && (
                          <>
                            {renderEditableCell(row, 'current_month_basic', 'Current Month Basic', 'الراتب الاسمي للشهر', row.current_month_basic || 0, isDark ? 'border-white/5 text-white bg-[#1e293b]' : 'border-slate-200 text-slate-900 bg-slate-100')}
                            {renderEditableCell(row, 'phone_allowance', 'Phone Allowance', 'بدل هاتف', row.phone_allowance || 0, isDark ? 'border-white/5 text-emerald-300' : 'border-slate-200 text-emerald-800')}
                            {renderEditableCell(row, 'family_allowance', 'Family Allowance', 'مخصصات عائلية', row.family_allowance || 0, isDark ? 'border-white/5 text-emerald-300' : 'border-slate-200 text-emerald-800')}
                            {renderEditableCell(row, 'cert_allowance', 'Certificate Allowance', 'مخصصات شهادة', row.cert_allowance || 0, isDark ? 'border-white/5 text-emerald-300' : 'border-slate-200 text-emerald-800')}
                            {renderEditableCell(row, 'incentives', 'Incentives', 'الحوافز', row.incentives || 0, isDark ? 'border-white/5 text-emerald-300' : 'border-slate-200 text-emerald-800')}
                            {renderEditableCell(row, 'transportation', 'Transportation', 'بدل النقل', row.transportation || 0, isDark ? 'border-white/5 text-emerald-300' : 'border-slate-200 text-emerald-800')}
                            {renderEditableCell(row, 'bonus', 'Bonus', 'المكافآت', row.bonus || 0, isDark ? 'border-white/5 text-emerald-300' : 'border-slate-200 text-emerald-800')}
                            {renderEditableCell(row, 'overtime', 'Overtime', 'أجر إضافي', row.overtime || 0, isDark ? 'border-white/5 text-emerald-400' : 'border-slate-200 text-emerald-800')}
                            {renderEditableCell(row, 'earned_leave', 'Earned Leave', 'إجازة مستحقة', row.earned_leave || 0, isDark ? 'border-white/5 text-emerald-400' : 'border-slate-200 text-emerald-800')}
                          </>
                        )}

                        <td className={`p-3 border-r whitespace-nowrap font-mono font-normal ${
                          isDark ? 'border-white/5 text-cyan-200 bg-[#1e293b]' : 'border-slate-200 text-slate-900 bg-slate-100'
                        }`}>
                          {(row.gross_salary || 0).toLocaleString('en-US')}
                        </td>

                        {viewMode === 'detailed' && (
                          <>
                            {Number(row.is_ss_tax_exempt) === 1 ? (
                              <td className={`p-3 border-r whitespace-nowrap font-mono font-normal ${
                                isDark ? 'border-white/5 text-rose-300' : 'border-slate-200 text-rose-800'
                              }`}>
                                <span className="text-amber-400 font-bold text-[11px]">0 (معفى)</span>
                              </td>
                            ) : (
                              renderEditableCell(row, 'social_security', 'Social Security', 'الضمان الاجتماعي', row.social_security || 0, isDark ? 'border-white/5 text-rose-300' : 'border-slate-200 text-rose-800', '-')
                            )}

                            {Number(row.is_ss_tax_exempt) === 1 ? (
                              <td className={`p-3 border-r whitespace-nowrap font-mono font-normal ${
                                isDark ? 'border-white/5 text-rose-300' : 'border-slate-200 text-rose-800'
                              }`}>
                                <span className="text-amber-400 font-bold text-[11px]">0 (معفى)</span>
                              </td>
                            ) : (
                              renderEditableCell(row, 'income_tax', 'Income Tax', 'ضريبة الدخل', row.income_tax || 0, isDark ? 'border-white/5 text-rose-300' : 'border-slate-200 text-rose-800', '-')
                            )}

                            {renderEditableCell(row, 'insurance', 'Insurance', 'التأمين الصحي', row.insurance || 0, isDark ? 'border-white/5 text-rose-300' : 'border-slate-200 text-rose-800', '-')}
                            {renderEditableCell(row, 'loan_payment', 'Loan Payment', 'تسديد القروض', row.loan_payment || 0, isDark ? 'border-white/5 text-rose-300' : 'border-slate-200 text-rose-800', '-')}
                            {renderEditableCell(row, 'other_deductions', 'Other Deductions', 'استقطاعات أخرى', row.other_deductions || 0, isDark ? 'border-white/5 text-rose-300' : 'border-slate-200 text-rose-800', '-')}
                          </>
                        )}

                        <td className={`p-3 border-r whitespace-nowrap font-mono font-normal ${
                          isDark ? 'border-white/5 text-rose-400' : 'border-slate-200 text-rose-800'
                        }`}>
                          -{(row.total_deductions || 0).toLocaleString('en-US')}
                        </td>

                        <td className={`p-3 border-r whitespace-nowrap font-mono font-normal text-base ${
                          isDark ? 'border-white/5 text-white bg-[#1e293b]' : 'border-slate-200 text-slate-900 bg-slate-100'
                        }`}>
                          {(row.net_salary || 0).toLocaleString('en-US')} {t('د.ع', 'IQD')}
                        </td>

                        <td className="p-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            {/* View Tax & Security Trace Button (Section 7) */}
                            <button
                              onClick={() => handleOpenTraceModal(row)}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm bg-teal-800 hover:bg-teal-700 text-white border border-teal-600"
                              style={{ color: '#ffffff' }}
                              title={t('معاينة تفاصيل ومعادلة الضمان والضريبة (18 عنصراً)', 'View Tax & SS Calculation Trace')}
                            >
                              <span className="material-symbols-outlined text-sm text-white" style={{ color: '#ffffff' }}>receipt_long</span>
                              <span className="text-white" style={{ color: '#ffffff' }}>{t('المعادلة', 'Trace')}</span>
                            </button>

                            {/* Release / On Hold Toggle Button */}
                            <button
                              disabled={isPeriodLocked}
                              onClick={() => handleToggleOnHold(row.id)}
                              className={`btn-payroll-release px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm border ${
                                isPeriodLocked
                                  ? 'bg-slate-700/50 text-slate-400 border-slate-600 cursor-not-allowed'
                                  : row.is_on_hold
                                    ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500'
                                    : 'bg-emerald-700 hover:bg-emerald-600 text-white border-emerald-600'
                              }`}
                              style={{ color: isPeriodLocked ? '#94a3b8' : '#ffffff' }}
                              title={row.is_on_hold ? t(`الراتب موقوف (${row.on_hold_reason}) - انقر للإطلاق (Release)`, 'Payroll On Hold - Click to Release') : t('الراتب مطلق ونشط - انقر للإيقاف (Hold)', 'Payroll Released - Click to put On Hold')}
                            >
                              <span className="material-symbols-outlined text-sm text-white" style={{ color: isPeriodLocked ? '#94a3b8' : '#ffffff' }}>
                                {row.is_on_hold ? 'front_hand' : 'check_circle'}
                              </span>
                              <span className="text-white" style={{ color: isPeriodLocked ? '#94a3b8' : '#ffffff' }}>
                                {row.is_on_hold ? t('موقوف (On Hold)', 'On Hold') : t('مطلق (Release)', 'Release')}
                              </span>
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
                          ? `${(totals.current_month_basic || 0).toLocaleString('en-US')} ${t('د.ع', 'IQD')}`
                          : `${(totals.basic || 0).toLocaleString('en-US')} ${t('د.ع', 'IQD')}`
                        }
                      </td>

                      {viewMode === 'summary' && (
                        <>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-emerald-300' : 'border-slate-300 text-emerald-800'}`}>
                            {(totals.incentives || 0).toLocaleString('en-US')}
                          </td>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-emerald-300' : 'border-slate-300 text-emerald-800'}`}>
                            {(totals.transportation || 0).toLocaleString('en-US')}
                          </td>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-emerald-300' : 'border-slate-300 text-emerald-800'}`}>
                            {(totals.bonus || 0).toLocaleString('en-US')}
                          </td>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-emerald-400' : 'border-slate-300 text-emerald-800'}`}>
                            {(totals.overtime || 0).toLocaleString('en-US')}
                          </td>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-emerald-400' : 'border-slate-300 text-emerald-800'}`}>
                            {(totals.earned_leave || 0).toLocaleString('en-US')}
                          </td>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-emerald-400' : 'border-slate-300 text-emerald-800'}`}>
                            +{(totals.allowances || 0).toLocaleString('en-US')}
                          </td>
                        </>
                      )}

                      {viewMode === 'detailed' && (
                        <>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-white bg-[#1e293b]' : 'border-slate-300 text-slate-900 bg-slate-200'}`}>{(totals.current_month_basic || 0).toLocaleString('en-US')}</td>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-emerald-300' : 'border-slate-300 text-emerald-800'}`}>{(totals.phone_allowance || 0).toLocaleString('en-US')}</td>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-emerald-300' : 'border-slate-300 text-emerald-800'}`}>{(totals.family_allowance || 0).toLocaleString('en-US')}</td>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-emerald-300' : 'border-slate-300 text-emerald-800'}`}>{(totals.cert_allowance || 0).toLocaleString('en-US')}</td>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-emerald-300' : 'border-slate-300 text-emerald-800'}`}>{(totals.incentives || 0).toLocaleString('en-US')}</td>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-emerald-300' : 'border-slate-300 text-emerald-800'}`}>{(totals.transportation || 0).toLocaleString('en-US')}</td>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-emerald-300' : 'border-slate-300 text-emerald-800'}`}>{(totals.bonus || 0).toLocaleString('en-US')}</td>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-emerald-400' : 'border-slate-300 text-emerald-800'}`}>{(totals.overtime || 0).toLocaleString('en-US')}</td>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-emerald-400' : 'border-slate-300 text-emerald-800'}`}>{(totals.earned_leave || 0).toLocaleString('en-US')}</td>
                        </>
                      )}

                      <td className={`p-3 border-r font-mono font-black ${
                        isDark ? 'border-white/10 text-cyan-200 bg-[#1e293b]' : 'border-slate-300 text-black bg-slate-200'
                      }`}>{(totals.gross || 0).toLocaleString('en-US')} {t('د.ع', 'IQD')}</td>

                      {viewMode === 'detailed' && (
                        <>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-rose-300' : 'border-slate-300 text-rose-800'}`}>-{(totals.social_security || 0).toLocaleString('en-US')}</td>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-rose-300' : 'border-slate-300 text-rose-800'}`}>-{(totals.income_tax || 0).toLocaleString('en-US')}</td>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-rose-300' : 'border-slate-300 text-rose-800'}`}>-{(totals.insurance || 0).toLocaleString('en-US')}</td>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-rose-300' : 'border-slate-300 text-rose-800'}`}>-{(totals.loan_payment || 0).toLocaleString('en-US')}</td>
                          <td className={`p-3 border-r font-mono ${isDark ? 'border-white/10 text-rose-300' : 'border-slate-300 text-rose-800'}`}>-{(totals.other_deductions || 0).toLocaleString('en-US')}</td>
                        </>
                      )}

                      <td className={`p-3 border-r font-mono font-black ${
                        isDark ? 'border-white/10 text-rose-400' : 'border-slate-300 text-rose-800'
                      }`}>-{(totals.deductions || 0).toLocaleString('en-US')} {t('د.ع', 'IQD')}</td>
                      <td className={`p-3 border-r font-mono font-black text-base ${
                        isDark ? 'border-white/10 text-white bg-[#1e293b]' : 'border-slate-300 text-black bg-slate-200'
                      }`}>{(totals.net || 0).toLocaleString('en-US')} {t('د.ع', 'IQD')}</td>
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
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
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
                    <p>Issue Date: {new Date().toLocaleDateString('en-US')}</p>
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
                        <span>{t('الراتب الاسمي الأساسي:', 'Nominal Basic Salary:')}</span>
                        <span className="font-mono font-bold text-slate-900">{pRow.basic_salary.toLocaleString('en-US')} IQD</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span>{t('الراتب الاسمي الفعلي للشهر:', 'Current Month Basic:')}</span>
                        <span className="font-mono font-bold text-slate-900">{pRow.current_month_basic.toLocaleString('en-US')} IQD</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span>{t('بدل الهاتف:', 'Phone Allowance:')}</span>
                        <span className="font-mono font-bold text-slate-900">{pRow.phone_allowance.toLocaleString('en-US')} IQD</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span>{t('بدل الزوجية والأولاد:', 'Family Allowance:')}</span>
                        <span className="font-mono font-bold text-slate-900">{pRow.family_allowance.toLocaleString('en-US')} IQD</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span>{t('بدل الشهادة:', 'Certificate Allowance:')}</span>
                        <span className="font-mono font-bold text-slate-900">{pRow.cert_allowance.toLocaleString('en-US')} IQD</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span>{t('المحفزات التشجيعية (incentives):', 'Incentives:')}</span>
                        <span className="font-mono font-bold text-emerald-700">{(pRow.incentives || 0).toLocaleString('en-US')} IQD</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span>{t('بدل النقل والمواصلات (transportation):', 'Transportation:')}</span>
                        <span className="font-mono font-bold text-slate-900">{(pRow.transportation || 0).toLocaleString('en-US')} IQD</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span>{t('المكافآت والمنح التشغيلية (bonus):', 'Operational Bonus:')}</span>
                        <span className="font-mono font-bold text-emerald-700">{(pRow.bonus || 0).toLocaleString('en-US')} IQD</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span>{t('أجر العمل الإضافي (overtime):', 'Overtime Pay:')}</span>
                        <span className="font-mono font-bold text-emerald-700">{(pRow.overtime || 0).toLocaleString('en-US')} IQD</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span>{t('بدل الإجازات المكتسبة (earned leave):', 'Earned Leave Allowance:')}</span>
                        <span className="font-mono font-bold text-emerald-700">{(pRow.earned_leave || 0).toLocaleString('en-US')} IQD</span>
                      </div>
                      <div className="flex justify-between py-1 text-xs font-semibold text-teal-800 border-b border-dashed border-teal-300">
                        <span>{t('مجموع البدلات المضافة:', 'Total Allowances Added:')}</span>
                        <span className="font-mono font-bold">{pRow.allowances_total.toLocaleString('en-US')} IQD</span>
                      </div>
                      <div className="flex justify-between py-1.5 font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 rounded-lg">
                        <span>{t('إجمالي الراتب الإجمالي:', 'Total Gross Salary:')}</span>
                        <span className="font-mono">{pRow.gross_salary.toLocaleString('en-US')} IQD</span>
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
                          <span className="font-mono font-bold text-rose-800">-{pRow.social_security.toLocaleString('en-US')} IQD</span>
                        )}
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span>{t('استقطاع ضريبة الدخل:', 'Income Tax:')}</span>
                        {isExempt ? (
                          <span className="font-bold text-amber-700 text-[11px]">{t('معفى (0 د.ع)', 'Exempt (0 IQD)')}</span>
                        ) : (
                          <span className="font-mono font-bold text-rose-800">-{pRow.income_tax.toLocaleString('en-US')} IQD</span>
                        )}
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="flex items-center gap-1">
                          <span>{t('قسط التأمين الصحي:', 'Health Insurance:')}</span>
                          {pRow.is_insurance_prorated && (
                            <span className="text-[10px] text-amber-700 bg-amber-50 px-1 rounded border border-amber-200 font-normal" title={pRow.insurance_note}>
                              ({pRow.insurance_days} {t('يوم', 'days')})
                            </span>
                          )}
                        </span>
                        {isExempt ? (
                          <span className="font-bold text-amber-700 text-[11px]">{t('معفى (0 د.ع)', 'Exempt (0 IQD)')}</span>
                        ) : (
                          <span className="font-mono font-bold text-rose-800">-{pRow.insurance.toLocaleString('en-US')} IQD</span>
                        )}
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span>{t('استقطاع القروض والسلف:', 'Loan Deduction:')}</span>
                        <span className="font-mono font-bold text-rose-800">-{pRow.loan_payment.toLocaleString('en-US')} IQD</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span>{t('استقطاع الغيابات والتنبيهات:', 'Absence & Deductions:')}</span>
                        <span className="font-mono font-bold text-rose-800">-{pRow.other_deductions.toLocaleString('en-US')} IQD</span>
                      </div>
                      <div className="flex justify-between py-1.5 font-bold text-rose-900 bg-rose-50 border border-rose-200 px-2 rounded-lg">
                        <span>{t('إجمالي الاستقطاعات:', 'Total Deductions:')}</span>
                        <span className="font-mono">-{pRow.total_deductions.toLocaleString('en-US')} IQD</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Net Payable Highlight Card */}
                <div className="p-4 rounded-2xl bg-teal-50 border border-teal-300 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">{t('صافي الراتب النهائي مستحق الدفع:', 'Net Payable Salary:')}</span>
                    <span className="text-2xl font-black text-teal-900 font-mono">{pRow.net_salary.toLocaleString('en-US')} {t('د.ع', 'IQD')}</span>
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
                        <p>Issue Date: {new Date().toLocaleDateString('en-US')}</p>
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
                            <span>{t('الراتب الاسمي الأساسي:', 'Basic Salary:')}</span>
                            <span className="font-mono">{pRow.basic_salary.toLocaleString('en-US')} IQD</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span>{t('الراتب الاسمي الفعلي:', 'Current Month Basic:')}</span>
                            <span className="font-mono">{pRow.current_month_basic.toLocaleString('en-US')} IQD</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span>{t('بدل الهاتف:', 'Phone Allowance:')}</span>
                            <span className="font-mono">{pRow.phone_allowance.toLocaleString('en-US')} IQD</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span>{t('بدل الزوجية والأولاد:', 'Family Allowance:')}</span>
                            <span className="font-mono">{pRow.family_allowance.toLocaleString('en-US')} IQD</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span>{t('بدل الشهادة:', 'Certificate Allowance:')}</span>
                            <span className="font-mono">{pRow.cert_allowance.toLocaleString('en-US')} IQD</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span>{t('المحفزات التشجيعية:', 'Incentives:')}</span>
                            <span className="font-mono">{(pRow.incentives || 0).toLocaleString('en-US')} IQD</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span>{t('بدل النقل والمواصلات:', 'Transportation:')}</span>
                            <span className="font-mono">{(pRow.transportation || 0).toLocaleString('en-US')} IQD</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span>{t('المكافآت والمنح:', 'Bonus:')}</span>
                            <span className="font-mono">{(pRow.bonus || 0).toLocaleString('en-US')} IQD</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span>{t('أجر العمل الإضافي:', 'Overtime Pay:')}</span>
                            <span className="font-mono">{(pRow.overtime || 0).toLocaleString('en-US')} IQD</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span>{t('بدل الإجازات المكتسبة:', 'Earned Leave:')}</span>
                            <span className="font-mono">{(pRow.earned_leave || 0).toLocaleString('en-US')} IQD</span>
                          </div>
                          <div className="flex justify-between py-1.5 font-bold text-emerald-800 bg-emerald-100 px-2 rounded-lg">
                            <span>{t('إجمالي الراتب الإجمالي:', 'Total Gross Salary:')}</span>
                            <span className="font-mono">{pRow.gross_salary.toLocaleString('en-US')} IQD</span>
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
                            <span className="font-mono text-rose-800">-{pRow.social_security.toLocaleString('en-US')} IQD</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span>{t('استقطاع ضريبة الدخل:', 'Income Tax:')}</span>
                            <span className="font-mono text-rose-800">-{pRow.income_tax.toLocaleString('en-US')} IQD</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span className="flex items-center gap-1">
                              <span>{t('قسط التأمين الصحي:', 'Health Insurance:')}</span>
                              {pRow.is_insurance_prorated && (
                                <span className="text-[9px] text-amber-700 font-normal">
                                  ({pRow.insurance_days} {t('يوم', 'days')})
                                </span>
                              )}
                            </span>
                            <span className="font-mono text-rose-800">-{pRow.insurance.toLocaleString('en-US')} IQD</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span>{t('استقطاع السلف والقروض:', 'Loan Payment:')}</span>
                            <span className="font-mono text-rose-800">-{(pRow.loan_payment || 0).toLocaleString('en-US')} IQD</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span>{t('استقطاعات أخرى وجزاءات:', 'Other Deductions:')}</span>
                            <span className="font-mono text-rose-800">-{(pRow.other_deductions || 0).toLocaleString('en-US')} IQD</span>
                          </div>
                          <div className="flex justify-between py-1.5 font-bold text-rose-800 bg-rose-100 px-2 rounded-lg">
                            <span>{t('إجمالي الاستقطاعات:', 'Total Deductions:')}</span>
                            <span className="font-mono">-{pRow.total_deductions.toLocaleString('en-US')} IQD</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-teal-50 border border-teal-300 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">{t('صافي الراتب النهائي مستحق الدفع:', 'Net Payable Salary:')}</span>
                      <span className="text-2xl font-black text-teal-800 font-mono">{pRow.net_salary.toLocaleString('en-US')} IQD</span>
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
                  className="px-6 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs"
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
                  <div className="flex items-center gap-2 text-white font-medium">
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
                {approvalRequests.filter(r => r.status === 'Approved' || r.status === 'Finalized').reduce((acc, r) => acc + r.amount, 0).toLocaleString('en-US')} {t('د.ع', 'IQD')}
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
              className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow flex items-center gap-1.5"
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
                      <span className="text-base font-black text-teal-400">{req.amount.toLocaleString('en-US')} IQD</span>
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
                          className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow"
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
                    {r.reqNumber} - {r.empName} ({r.amount.toLocaleString('en-US')} IQD)
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
                    <span className="text-2xl font-black text-teal-400">{currentClaimObject.amount.toLocaleString('en-US')} IQD</span>
                  </div>
                </div>

                {/* Workflow Stepper Timeline */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <h4 className="font-bold text-slate-300 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-teal-400 text-base">alt_route</span>
                    {t('خطوات ومراحل دورة اعتماد المطالبة المالية', 'Approval Workflow Timeline')}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px] text-center">
                    <div className="p-2 rounded-xl bg-teal-600/20 border border-teal-500/40 text-white font-bold">
                      1. تقديم الموظف
                    </div>
                    <div className="p-2 rounded-xl bg-teal-600/20 border border-teal-500/40 text-white font-bold">
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
                            <td className="p-2.5 font-mono">{item.unitPrice.toLocaleString('en-US')} IQD</td>
                            <td className="p-2.5 font-mono font-bold text-teal-400">{item.total.toLocaleString('en-US')} IQD</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Decision Actions Bar */}
                <div className={`p-5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
                  isDark ? 'bg-[#0a0c10] border-teal-500/30 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                }`}>
                  <div>
                    <span className={`font-bold block ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('اتخاذ قرار الاعتماد والتوقيع الإلكتروني', 'Take Approval Decision')}</span>
                    <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('سيتم تحويل المطالبة تلقائياً لقسيمة مسير الشهر عند الموافقة', 'Approved claim will automatically attach to monthly payroll')}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateApprovalStatus(currentClaimObject.id, 'Approved')}
                      className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg flex items-center gap-1.5"
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
      {editingEmpId && (() => {
        const targetRow = computedPayrollRows.find(r => String(r.id) === String(editingEmpId));
        const basicSalary = targetRow?.basic_salary || 0;
        const absenceDeduction = (Number(adjForm.absenceDays || 0) * (basicSalary / 30));
        const currentMonthBasic = Math.max(0, basicSalary - absenceDeduction);
        const phoneAllow = targetRow?.phone_allowance || 0;
        const certAllow = targetRow?.cert_allowance || 0;
        const familyAllow = targetRow?.family_allowance || 0;
        const transAllow = Number(adjForm.transportation ?? targetRow?.transportation ?? 0);
        const bonusAllow = Number(adjForm.bonus ?? targetRow?.bonus ?? 0);
        const incAllow = Number(adjForm.incentives ?? targetRow?.incentives ?? 0);
        const elAllow = Number(adjForm.earnedLeave ?? targetRow?.earned_leave ?? 0);
        const otAllow = Number(adjForm.overtime ?? targetRow?.overtime ?? 0);
        const totalAllowances = phoneAllow + certAllow + familyAllow + transAllow + bonusAllow + incAllow + elAllow + otAllow;
        const grossEst = currentMonthBasic + totalAllowances;

        const ssDed = Number(adjForm.socialSecurity ?? targetRow?.social_security ?? 0);
        const taxDed = Number(adjForm.incomeTax ?? targetRow?.income_tax ?? 0);
        const insDed = targetRow?.insurance || 0;
        const loanDed = Number(adjForm.loanPayment ?? targetRow?.loan_payment ?? 0);
        const otherDed = Number(adjForm.otherDeductions ?? targetRow?.other_deductions ?? 0);
        const totalDeductionsEst = ssDed + taxDed + insDed + loanDed + otherDed;
        const netEst = grossEst - totalDeductionsEst;

        const handleResetDefaults = () => {
          if (!targetRow) return;
          const defaultEmp = employees.find(e => String(e.id) === String(editingEmpId));
          const isExempt = Number(defaultEmp?.isSsTaxExempt ?? defaultEmp?.is_ss_tax_exempt ?? 0) === 1;
          const ssRate = parseFloat(appSettings['social_security_rate_default'] || '5') / 100;
          const autoSS = isExempt ? 0 : Math.round(basicSalary * ssRate);

          setAdjForm({
            absenceDays: 0,
            incentives: Number(defaultEmp?.incentives || 0),
            transportation: Number(defaultEmp?.transportationFixed ?? defaultEmp?.transportation_fixed ?? 0),
            bonus: Number(defaultEmp?.fixedBonus ?? defaultEmp?.fixed_bonus ?? 0),
            overtime: 0,
            earnedLeave: Number(defaultEmp?.earnedLeave ?? defaultEmp?.earned_leave ?? 0),
            socialSecurity: autoSS,
            incomeTax: 0,
            loanPayment: Number(defaultEmp?.loanPayment ?? defaultEmp?.loan_payment ?? 0),
            otherDeductions: Number(defaultEmp?.otherDeductions ?? defaultEmp?.other_deductions ?? 0),
            overtimeHours: 0,
            overtimeAmount: 0,
            bonusExtra: 0
          });
        };

        return (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden my-6 transition-all ${
              isDark ? 'bg-[#111827] border-white/15 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}>
              {/* Modal Header */}
              <div className={`p-5 flex items-center justify-between border-b ${
                isDark ? 'border-white/10 bg-[#0a0c10]' : 'border-slate-200 bg-slate-50'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">edit_note</span>
                  </div>
                  <div>
                    <h3 className="text-base font-black flex items-center gap-2">
                      <span>{t('تعديل الاستحقاقات والاستقطاعات اليدوية', 'Edit Employee Payroll Adjustments')}</span>
                    </h3>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {language === 'en' ? targetRow?.employee_name_en : targetRow?.employee_name_ar} • VTS-{targetRow?.badge_no || targetRow?.employee_id} • {targetRow?.location_ar} • {t('الراتب الاسمي:', 'Basic:')} {basicSalary.toLocaleString('en-US')} IQD
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingEmpId(null)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold ${
                    isDark ? 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  ✕
                </button>
              </div>

              {/* Modal Body: 2 Columns (Allowances vs Deductions) */}
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Column 1: Allowances & Additions */}
                  <div className={`p-4 rounded-2xl border space-y-3.5 ${
                    isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-2 pb-2 border-b border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      <span className="material-symbols-outlined text-lg">add_circle</span>
                      <h4 className="font-bold text-xs uppercase tracking-wider">{t('البدلات والمستحقات المضافة (Allowances)', 'Allowances & Earnings')}</h4>
                    </div>

                    {/* 1. Incentives */}
                    <div>
                      <label className="block text-[11px] font-bold mb-1 text-slate-700 dark:text-slate-300">
                        {t('المحفزات والمكافآت (incentives):', 'Incentives (incentives):')}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={adjForm.incentives ?? ''}
                        onChange={e => setAdjForm({ ...adjForm, incentives: Number(e.target.value) })}
                        placeholder="0"
                        className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold focus:outline-none border ${
                          isDark ? 'bg-[#0a0c10] border-white/15 text-emerald-300 focus:border-teal-500' : 'bg-white border-slate-300 text-slate-900 focus:border-teal-600 shadow-sm'
                        }`}
                      />
                    </div>

                    {/* 2. Transportation */}
                    <div>
                      <label className="block text-[11px] font-bold mb-1 text-slate-700 dark:text-slate-300">
                        {t('بدل النقل والمواصلات (transportation):', 'Transportation (transportation):')}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={adjForm.transportation ?? ''}
                        onChange={e => setAdjForm({ ...adjForm, transportation: Number(e.target.value) })}
                        placeholder="0"
                        className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold focus:outline-none border ${
                          isDark ? 'bg-[#0a0c10] border-white/15 text-emerald-300 focus:border-teal-500' : 'bg-white border-slate-300 text-slate-900 focus:border-teal-600 shadow-sm'
                        }`}
                      />
                    </div>

                    {/* 3. Bonus */}
                    <div>
                      <label className="block text-[11px] font-bold mb-1 text-slate-700 dark:text-slate-300">
                        {t('المكافآت والمنح (bonus):', 'Bonus (bonus):')}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={adjForm.bonus ?? ''}
                        onChange={e => setAdjForm({ ...adjForm, bonus: Number(e.target.value) })}
                        placeholder="0"
                        className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold focus:outline-none border ${
                          isDark ? 'bg-[#0a0c10] border-white/15 text-emerald-300 focus:border-teal-500' : 'bg-white border-slate-300 text-slate-900 focus:border-teal-600 shadow-sm'
                        }`}
                      />
                    </div>

                    {/* 4. Overtime Pay */}
                    <div>
                      <label className="block text-[11px] font-bold mb-1 text-slate-700 dark:text-slate-300">
                        {t('أجر العمل الإضافي (overtime):', 'Overtime Pay (overtime):')}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={adjForm.overtime ?? ''}
                        onChange={e => setAdjForm({ ...adjForm, overtime: Number(e.target.value) })}
                        placeholder="0"
                        className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold focus:outline-none border ${
                          isDark ? 'bg-[#0a0c10] border-white/15 text-emerald-300 focus:border-teal-500' : 'bg-white border-slate-300 text-slate-900 focus:border-teal-600 shadow-sm'
                        }`}
                      />
                    </div>

                    {/* 5. Earned Leave */}
                    <div>
                      <label className="block text-[11px] font-bold mb-1 text-slate-700 dark:text-slate-300">
                        {t('بدل الإجازات المستحقة (earned leave):', 'Earned Leave (earned_leave):')}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={adjForm.earnedLeave ?? ''}
                        onChange={e => setAdjForm({ ...adjForm, earnedLeave: Number(e.target.value) })}
                        placeholder="0"
                        className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold focus:outline-none border ${
                          isDark ? 'bg-[#0a0c10] border-white/15 text-emerald-300 focus:border-teal-500' : 'bg-white border-slate-300 text-slate-900 focus:border-teal-600 shadow-sm'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Column 2: Deductions & Absences */}
                  <div className={`p-4 rounded-2xl border space-y-3.5 ${
                    isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-2 pb-2 border-b border-rose-500/20 text-rose-600 dark:text-rose-400">
                      <span className="material-symbols-outlined text-lg">remove_circle</span>
                      <h4 className="font-bold text-xs uppercase tracking-wider">{t('الاستقطاعات والغيابات (Deductions)', 'Deductions & Statutory')}</h4>
                    </div>

                    {/* 6. Absence Days */}
                    <div>
                      <label className="block text-[11px] font-bold mb-1 text-slate-700 dark:text-slate-300">
                        {t('أيام الغياب (absence / absence_days):', 'Absence Days (absence):')}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="30"
                          value={adjForm.absenceDays ?? 0}
                          onChange={e => setAdjForm({ ...adjForm, absenceDays: Number(e.target.value) })}
                          className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold focus:outline-none border ${
                            isDark ? 'bg-[#0a0c10] border-white/15 text-rose-300 focus:border-rose-500' : 'bg-white border-slate-300 text-slate-900 focus:border-rose-600 shadow-sm'
                          }`}
                        />
                        <span className="absolute left-3 top-2 text-[10px] text-slate-400 font-mono">
                          {absenceDeduction > 0 ? `-${Math.round(absenceDeduction).toLocaleString('en-US')} IQD` : '0 IQD'}
                        </span>
                      </div>
                    </div>

                    {/* 7. Social Security */}
                    <div>
                      <label className="block text-[11px] font-bold mb-1 text-slate-700 dark:text-slate-300">
                        {t('الضمان الاجتماعي (social security):', 'Social Security (social_security):')}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="500"
                        value={adjForm.socialSecurity ?? ''}
                        onChange={e => setAdjForm({ ...adjForm, socialSecurity: Number(e.target.value) })}
                        placeholder="0"
                        className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold focus:outline-none border ${
                          isDark ? 'bg-[#0a0c10] border-white/15 text-rose-300 focus:border-rose-500' : 'bg-white border-slate-300 text-slate-900 focus:border-rose-600 shadow-sm'
                        }`}
                      />
                    </div>

                    {/* 8. Income Tax */}
                    <div>
                      <label className="block text-[11px] font-bold mb-1 text-slate-700 dark:text-slate-300">
                        {t('ضريبة الدخل (income tax):', 'Income Tax (income_tax):')}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="500"
                        value={adjForm.incomeTax ?? ''}
                        onChange={e => setAdjForm({ ...adjForm, incomeTax: Number(e.target.value) })}
                        placeholder="0"
                        className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold focus:outline-none border ${
                          isDark ? 'bg-[#0a0c10] border-white/15 text-rose-300 focus:border-rose-500' : 'bg-white border-slate-300 text-slate-900 focus:border-rose-600 shadow-sm'
                        }`}
                      />
                    </div>

                    {/* 9. Loan Payment */}
                    <div>
                      <label className="block text-[11px] font-bold mb-1 text-slate-700 dark:text-slate-300">
                        {t('استقطاع السلف والقروض (loan payment):', 'Loan Payment (loan_payment):')}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={adjForm.loanPayment ?? ''}
                        onChange={e => setAdjForm({ ...adjForm, loanPayment: Number(e.target.value) })}
                        placeholder="0"
                        className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold focus:outline-none border ${
                          isDark ? 'bg-[#0a0c10] border-white/15 text-rose-300 focus:border-rose-500' : 'bg-white border-slate-300 text-slate-900 focus:border-rose-600 shadow-sm'
                        }`}
                      />
                    </div>

                    {/* 10. Other Deductions */}
                    <div>
                      <label className="block text-[11px] font-bold mb-1 text-slate-700 dark:text-slate-300">
                        {t('استقطاعات أخرى وتنبيهات (other deductions):', 'Other Deductions (other_deductions):')}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={adjForm.otherDeductions ?? ''}
                        onChange={e => setAdjForm({ ...adjForm, otherDeductions: Number(e.target.value) })}
                        placeholder="0"
                        className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold focus:outline-none border ${
                          isDark ? 'bg-[#0a0c10] border-white/15 text-rose-300 focus:border-rose-500' : 'bg-white border-slate-300 text-slate-900 focus:border-rose-600 shadow-sm'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Live Real-time Calculated Summary Box */}
                <div className={`p-4 rounded-2xl border ${
                  isDark ? 'bg-[#0a0c10] border-teal-500/30' : 'bg-teal-50/50 border-teal-200'
                }`}>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">{t('إجمالي الراتب الاسمي والبدلات', 'Gross Salary')}</span>
                      <span className="text-sm font-mono font-black text-cyan-600 dark:text-cyan-300">{Math.round(grossEst).toLocaleString('en-US')} IQD</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">{t('إجمالي الاستقطاعات', 'Total Deductions')}</span>
                      <span className="text-sm font-mono font-black text-rose-600 dark:text-rose-400">-{Math.round(totalDeductionsEst).toLocaleString('en-US')} IQD</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">{t('صافي الراتب التقديري', 'Estimated Net')}</span>
                      <span className="text-sm font-mono font-black text-emerald-600 dark:text-emerald-400">{Math.round(netEst).toLocaleString('en-US')} IQD</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className={`p-4 border-t flex flex-wrap items-center justify-between gap-2 ${
                isDark ? 'border-white/10 bg-[#0a0c10]' : 'border-slate-200 bg-slate-50'
              }`}>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isDark ? 'bg-white/5 text-amber-300 hover:bg-white/10 border border-amber-500/30' : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">restart_alt</span>
                  <span>{t('استعادة التلقائي', 'Reset to Defaults')}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingEmpId(null)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                      isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {t('إلغاء', 'Cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAdjustment}
                    className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">save</span>
                    <span>{t('حفظ التعديلات', 'Save Adjustments')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* SIMPLIFIED EXCEL NOTE WINDOW (Excel Sticky Note Design) */}
      {editingCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className={`${
            isDark
              ? 'bg-[#111827] border-white/20 text-white shadow-2xl'
              : 'bg-[#fffef0] border-[#d6cb85] text-slate-900 shadow-2xl'
          } border rounded-xl max-w-sm w-full p-4 space-y-3 font-sans text-xs sm:text-sm relative`}>
            {/* Excel Note Header: Author Name in Bold */}
            <div className={`flex items-start justify-between border-b ${isDark ? 'border-white/10' : 'border-[#e2d79c]'} pb-2`}>
              <div>
                <div className={`flex items-center gap-1.5 font-bold text-xs sm:text-sm ${isDark ? 'text-amber-400' : 'text-slate-900'}`}>
                  <span className={`material-symbols-outlined text-base ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>sticky_note_2</span>
                  <span>{currentUser?.name || currentUser?.username || 'مدير الموارد البشرية'}:</span>
                </div>
                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-700'} mt-0.5`}>
                  {editingCell.empName} • <span className={`font-mono font-bold ${isDark ? 'text-teal-300' : 'text-slate-900'}`}>{editingCell.badgeNo}</span> ({editingCell.fieldLabelAr || editingCell.fieldLabel})
                </p>
              </div>
              <button
                onClick={() => setEditingCell(null)}
                className={`p-1 rounded transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-900 hover:bg-black/5'}`}
                title={t('إغلاق', 'Close')}
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {/* Cell Value Input */}
            <div className="flex items-center gap-2">
              <label className={`font-bold text-xs sm:text-sm shrink-0 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                {t('القيمة:', 'Value:')}
              </label>
              <input
                type="number"
                step="1000"
                value={cellValueInput}
                onChange={e => setCellValueInput(e.target.value)}
                className={`flex-1 rounded px-2.5 py-1 text-xs sm:text-sm font-mono font-bold focus:outline-none shadow-xs border ${
                  isDark
                    ? 'bg-[#0a0c10] border-white/20 text-white focus:border-teal-400'
                    : 'bg-white border-[#c9bd78] text-slate-900 focus:border-slate-700'
                }`}
                placeholder="0"
                autoFocus
              />
              <span className={`text-xs sm:text-sm font-bold shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-800'}`}>
                {t('د.ع', 'IQD')}
              </span>
            </div>

            {/* Note Textarea (Excel Note Body) */}
            <div className="space-y-1">
              <label className={`font-bold text-xs sm:text-sm block ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                {t('الملاحظة:', 'Note:')}
              </label>
              <textarea
                value={cellNoteInput}
                onChange={e => setCellNoteInput(e.target.value)}
                rows={3}
                placeholder={t('اكتب ملاحظة الخلية هنا...', 'Type cell note here...')}
                className={`w-full rounded p-2 text-xs sm:text-sm font-sans focus:outline-none resize-none shadow-xs border ${
                  isDark
                    ? 'bg-[#0a0c10] border-white/20 text-white focus:border-teal-400'
                    : 'bg-white border-[#c9bd78] text-slate-900 focus:border-slate-700'
                }`}
              />
            </div>

            {/* Actions Bar */}
            <div className={`flex items-center justify-between pt-1 border-t ${isDark ? 'border-white/10' : 'border-[#e2d79c]'}`}>
              <div>
                {editingCell.currentNote && (
                  <button
                    type="button"
                    onClick={() => setCellNoteInput('')}
                    className={`text-xs font-bold underline transition-colors ${
                      isDark ? 'text-rose-400 hover:text-rose-300' : 'text-rose-700 hover:text-rose-900'
                    }`}
                  >
                    {t('حذف الملاحظة', 'Delete Note')}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Cancel Button with distinct dark / light mode styling */}
                <button
                  type="button"
                  onClick={() => setEditingCell(null)}
                  className={`px-3 py-1 rounded font-bold text-xs sm:text-sm transition-colors border shadow-xs ${
                    isDark
                      ? 'bg-slate-700 hover:bg-slate-600 text-white border-slate-500'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-900 border-slate-300'
                  }`}
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveCellEdit}
                  className="px-4 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors flex items-center gap-1 border border-emerald-600"
                  style={{ color: '#ffffff' }}
                >
                  <span style={{ color: '#ffffff' }}>{t('حفظ', 'Save')}</span>
                </button>
              </div>
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
                <p>{t('إجمالي الرواتب (gross_salary):', 'Gross Payroll:')} <span className="text-teal-400 font-bold">{totals.gross.toLocaleString('en-US')} IQD</span></p>
                <p>{t('الصافي المستحق (net_salary):', 'Net Payable:')} <span className="text-emerald-400 font-bold">{totals.net.toLocaleString('en-US')} IQD</span></p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-6xl ${
            isDark ? 'bg-[#0f172a] border-white/15 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-2xl'
          } rounded-3xl overflow-hidden flex flex-col max-h-[90vh] border`}>
            {/* Modal Header */}
            <div className={`p-4 sm:p-5 ${
              isDark ? 'bg-gradient-to-r from-amber-950/80 via-slate-900 to-emerald-950/80 border-b border-white/10' : 'bg-slate-100 border-b border-slate-200'
            } flex flex-wrap items-center justify-between gap-3`}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-500 flex items-center justify-center shadow-inner">
                  <span className="material-symbols-outlined text-2xl">front_hand</span>
                </div>
                <div>
                  <h3 className={`text-base sm:text-lg font-black flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <span>{t('سجل الرواتب الموقوفة والمُطلقة (On Hold & Released Payroll Audit)', 'On Hold & Released Payroll Audit')}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 font-bold">
                      {modalRecords.filter(r => r.status === 'ON_HOLD').length} {t('موقوف حالياً', 'on hold')}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 font-bold">
                      {modalRecords.filter(r => r.status === 'RELEASED').length} {t('تم إطلاقه', 'released')}
                    </span>
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} font-medium`}>
                    {t('توثيق تاريخ وضع الراتب onhold وتاريخ الـ Release وشهر وسنة البيرول المرتبط مع إمكانية الانتقال المباشر للمسير', 'Complete audit of Hold date, Release date, and associated Payroll periods with one-click period navigation')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowOnHoldModal(false)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-colors ${
                  isDark ? 'bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >
                ✕
              </button>
            </div>

            {/* Filter Tabs & Search Bar Row */}
            <div className={`p-3.5 border-b ${isDark ? 'border-white/10 bg-[#06080d]/80' : 'border-slate-200 bg-slate-50'} flex flex-wrap items-center justify-between gap-3`}>
              {/* Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/10 dark:bg-white/5 border border-black/5 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setOnHoldModalTab('CURRENT')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    onHoldModalTab === 'CURRENT'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">front_hand</span>
                  <span>{t('الموقوفة رواتبهم حالياً', 'Currently On Hold')}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/20">{modalRecords.filter(r => r.status === 'ON_HOLD').length}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOnHoldModalTab('RELEASED')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    onHoldModalTab === 'RELEASED'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  <span>{t('الرواتب المُطلقة والمستأنفة', 'Released Salaries')}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/20">{modalRecords.filter(r => r.status === 'RELEASED').length}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOnHoldModalTab('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    onHoldModalTab === 'ALL'
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">history</span>
                  <span>{t('السجل التاريخي الشامل', 'All Audit History')}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/20">{modalRecords.length}</span>
                </button>
              </div>

              {/* Fast Real-time Search Input */}
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <input
                  type="text"
                  placeholder={t('ابحث بالاسم، البادج، الفرع، أو سبب الإيقاف...', 'Search by name, badge, branch, or reason...')}
                  value={onHoldSearchQuery}
                  onChange={e => setOnHoldSearchQuery(e.target.value)}
                  className={`w-full rounded-xl px-3 py-1.5 ${language === 'ar' ? 'pr-8 pl-8' : 'pl-8 pr-8'} text-xs font-bold ${
                    isDark ? 'bg-white/5 border-white/10 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  } border focus:outline-none focus:border-teal-500 transition-all`}
                />
                <span className={`material-symbols-outlined absolute ${language === 'ar' ? 'right-2.5' : 'left-2.5'} top-1.5 text-slate-400 text-sm pointer-events-none`}>
                  search
                </span>
                {onHoldSearchQuery && (
                  <button
                    onClick={() => setOnHoldSearchQuery('')}
                    className={`material-symbols-outlined absolute ${language === 'ar' ? 'left-2.5' : 'right-2.5'} top-1.5 text-xs text-slate-400 hover:text-rose-500`}
                  >
                    close
                  </button>
                )}
              </div>
            </div>

            {/* Modal Body: Table of On Hold & Released Employees */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {filteredModalRecords.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <span className="material-symbols-outlined text-4xl text-teal-500/40">fact_check</span>
                  <p className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    {onHoldSearchQuery
                      ? t('لا توجد سجلات مطابقة لمعايير البحث الحالية', 'No records match search query')
                      : t('لا توجد سجلات في هذا القسم حالياً', 'No records in this tab')}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t('استخدم شريط البحث أو بدّل بين التبويبات لعرض السجلات التاريخية', 'Use search or switch tabs to review history')}
                  </p>
                </div>
              ) : (
                <div className={`overflow-x-auto rounded-2xl border ${isDark ? 'border-white/10' : 'border-slate-300'}`}>
                  <table className="w-full text-xs text-right border-collapse">
                    <thead className="incentives-table-header">
                      <tr className={`border-b font-bold ${isDark ? 'bg-[#0a0c10] text-slate-200 border-white/10' : 'bg-slate-200 text-slate-900 border-slate-300'}`}>
                        <th className="p-2.5 text-center w-10">#</th>
                        <th className="p-2.5 text-start font-bold">{t('اسم الموظف والبادج', 'Employee & Badge')}</th>
                        <th className="p-2.5 text-start font-bold">{t('الفرع والمسمى', 'Branch & Title')}</th>
                        <th className="p-2.5 text-center font-bold">{t('حالة الراتب', 'Salary Status')}</th>
                        <th className="p-2.5 text-center font-bold">{t('الراتب الاسمي', 'Basic Salary')}</th>
                        <th className="p-2.5 text-center font-bold bg-amber-500/10 text-amber-900 dark:text-amber-300">{t('تاريخ الإيقاف (Hold Date)', 'Hold Date')}</th>
                        <th className="p-2.5 text-center font-bold bg-amber-500/10 text-amber-900 dark:text-amber-300">{t('بيرول الإيقاف (Hold Period)', 'Hold Period')}</th>
                        <th className="p-2.5 text-center font-bold bg-emerald-500/10 text-emerald-900 dark:text-emerald-300">{t('تاريخ الإطلاق (Release Date)', 'Release Date')}</th>
                        <th className="p-2.5 text-center font-bold bg-emerald-500/10 text-emerald-900 dark:text-emerald-300">{t('بيرول الإطلاق (Release Period)', 'Release Period')}</th>
                        <th className="p-2.5 text-start font-bold">{t('سبب الإيقاف / الملاحظة', 'Hold Reason / Note')}</th>
                        <th className="p-2.5 text-center font-bold">{t('الإجراء (Action)', 'Action')}</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-white/5 text-slate-200' : 'divide-slate-200 text-slate-900 bg-white'}`}>
                      {filteredModalRecords.map((r, idx) => (
                        <tr key={r.id + idx} className={`transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                          <td className={`p-2.5 text-center font-mono font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>{idx + 1}</td>
                          <td className="p-2.5">
                            <span className={`font-black block text-xs sm:text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {language === 'en' ? (r.employee_name_en || r.employee_name_ar) : (r.employee_name_ar || r.employee_name_en)}
                            </span>
                            <span className="text-[11px] font-mono text-teal-700 dark:text-teal-400 font-bold">VTS-{r.badge_no || r.employee_id}</span>
                          </td>
                          <td className="p-2.5">
                            <span className="font-bold block">{r.location_ar}</span>
                            <span className="text-[11px] text-slate-500">{r.position_ar}</span>
                          </td>
                          <td className="p-2.5 text-center">
                            {r.status === 'ON_HOLD' ? (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 inline-flex items-center gap-1 shadow-xs">
                                <span className="material-symbols-outlined text-xs">front_hand</span>
                                <span>{t('موقوف حالياً', 'On Hold')}</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1 shadow-xs">
                                <span className="material-symbols-outlined text-xs">check_circle</span>
                                <span>{t('تم إطلاق الراتب', 'Released')}</span>
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-teal-800 dark:text-teal-300">
                            {Number(r.basic_salary).toLocaleString('en-US')} د.ع
                          </td>

                          {/* Hold Date */}
                          <td className="p-2.5 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                            <div className="flex items-center justify-center gap-1">
                              <span className="material-symbols-outlined text-xs text-amber-600 dark:text-amber-400">calendar_today</span>
                              <span>{r.hold_date || '—'}</span>
                            </div>
                          </td>

                          {/* Hold Payroll Period (Clickable -> Jumps to that Payroll) */}
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleNavigateToPayrollPeriod(r.hold_year, r.hold_month, r.employee_id)}
                              className="px-2.5 py-1 rounded-xl text-xs font-mono font-black bg-amber-500/15 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 border border-amber-500/40 inline-flex items-center gap-1 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
                              title={t(`انقر للانتقال مباشرة إلى مسير رواتب شهر (${r.hold_month} / ${r.hold_year})`, `Click to open payroll period ${r.hold_month} / ${r.hold_year}`)}
                            >
                              <span className="material-symbols-outlined text-xs">open_in_new</span>
                              <span>{r.hold_month} / {r.hold_year}</span>
                            </button>
                          </td>

                          {/* Release Date */}
                          <td className="p-2.5 text-center font-mono font-bold">
                            {r.release_date ? (
                              <div className="flex items-center justify-center gap-1 text-emerald-700 dark:text-emerald-300">
                                <span className="material-symbols-outlined text-xs">verified</span>
                                <span>{r.release_date}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-normal italic">{t('— قيد الإيقاف', '— Pending')}</span>
                            )}
                          </td>

                          {/* Release Payroll Period (Clickable -> Jumps to that Payroll) */}
                          <td className="p-2.5 text-center">
                            {r.release_year && r.release_month ? (
                              <button
                                type="button"
                                onClick={() => handleNavigateToPayrollPeriod(r.release_year!, r.release_month!, r.employee_id)}
                                className="px-2.5 py-1 rounded-xl text-xs font-mono font-black bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-900 dark:text-emerald-200 border border-emerald-500/40 inline-flex items-center gap-1 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
                                title={t(`انقر للانتقال مباشرة إلى مسير رواتب شهر (${r.release_month} / ${r.release_year})`, `Click to open release payroll period ${r.release_month} / ${r.release_year}`)}
                              >
                                <span className="material-symbols-outlined text-xs">open_in_new</span>
                                <span>{r.release_month} / {r.release_year}</span>
                              </button>
                            ) : (
                              <span className="text-slate-400 font-normal">—</span>
                            )}
                          </td>

                          {/* Reason & Notes */}
                          <td className="p-2.5 text-start max-w-[200px]">
                            <div className="truncate text-[11px]" title={r.release_note || r.hold_reason}>
                              <span className="font-bold text-slate-800 dark:text-slate-200 block">{r.hold_reason}</span>
                              {r.release_note && (
                                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium block truncate">
                                  ✓ {r.release_note}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Action Button */}
                          <td className="p-2.5 text-center">
                            {r.status === 'ON_HOLD' ? (
                              <button
                                onClick={() => handleToggleOnHold(r.employee_id)}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600/30 dark:hover:bg-emerald-600/50 dark:text-emerald-200 border border-emerald-500/40 text-xs font-bold transition-all flex items-center gap-1 mx-auto shadow-sm cursor-pointer hover:scale-105 active:scale-95"
                              >
                                <span className="material-symbols-outlined text-sm">play_circle</span>
                                <span>{t('فك الإيقاف / Release', 'Resume Salary')}</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleOnHold(r.employee_id)}
                                className="px-2 py-1 rounded-xl bg-slate-200 hover:bg-amber-100 dark:bg-white/5 dark:hover:bg-amber-500/20 text-slate-600 hover:text-amber-800 dark:text-slate-400 dark:hover:text-amber-300 border border-slate-300 dark:border-white/10 text-[11px] font-bold transition-all flex items-center gap-1 mx-auto cursor-pointer"
                                title={t('إعادة الإيقاف إذا لزم الأمر', 'Re-hold if necessary')}
                              >
                                <span className="material-symbols-outlined text-xs">restart_alt</span>
                                <span>{t('إيقاف مجدداً', 'Re-hold')}</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className={`p-4 border-t ${isDark ? 'border-white/10 bg-[#06080d] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-700'} flex flex-wrap items-center justify-between gap-3 text-xs`}>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-bold">
                  <span className="material-symbols-outlined text-sm">info</span>
                  <span>{t('النقر على زر أي شهر وسنة ينقلك فوراً إلى مسير الرواتب التابع له', 'Clicking any month/year badge opens its associated payroll')}</span>
                </span>
              </div>
              <button
                onClick={() => setShowOnHoldModal(false)}
                className={`px-5 py-2 rounded-xl font-bold transition-colors ${
                  isDark ? 'bg-white/10 hover:bg-white/15 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
                }`}
              >
                {t('إغلاق النافذة', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Preview & Confirmation Modal */}
      {payrollImportModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-4xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
            isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className={`p-6 border-b ${isDark ? 'border-white/10 bg-[#0a0c10]' : 'border-slate-200 bg-slate-50'} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20 text-white">
                  <span className="material-symbols-outlined text-2xl">table_chart</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <span>{t('معاينة واعتماد استيراد بيانات الإكسل', 'Preview & Confirm Excel Import')}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {payrollImportModalData.matchedCount} {t('موظفاً مطابقاً', 'Matched Staff')}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t('تمت قراءة وتجهيز الحوافز، بدل النقل، المكافآت وساعات الإضافي بنجاح. راجع المبالغ قبل التطبيق.', 'Allowances and incentives parsed from Excel. Review amounts before applying.')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPayrollImportModalData(null)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold ${
                  isDark ? 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-[#0a0c10] border-teal-500/30' : 'bg-teal-50 border-teal-200'}`}>
                  <span className="text-slate-400 block text-[11px] font-medium">{t('إجمالي الحوافز', 'Total Incentives')}</span>
                  <p className="text-base font-black text-teal-500 font-mono mt-0.5">
                    {payrollImportModalData.summary.totalIncentives.toLocaleString('en-US')} {t('د.ع', 'IQD')}
                  </p>
                </div>

                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-[#0a0c10] border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
                  <span className="text-slate-400 block text-[11px] font-medium">{t('إجمالي بدل النقل', 'Total Transportation')}</span>
                  <p className="text-base font-black text-blue-400 font-mono mt-0.5">
                    {payrollImportModalData.summary.totalTransportation.toLocaleString('en-US')} {t('د.ع', 'IQD')}
                  </p>
                </div>

                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-[#0a0c10] border-purple-500/30' : 'bg-purple-50 border-purple-200'}`}>
                  <span className="text-slate-400 block text-[11px] font-medium">{t('إجمالي المكافآت', 'Total Bonus')}</span>
                  <p className="text-base font-black text-purple-400 font-mono mt-0.5">
                    {payrollImportModalData.summary.totalBonus.toLocaleString('en-US')} {t('د.ع', 'IQD')}
                  </p>
                </div>

                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-[#0a0c10] border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
                  <span className="text-slate-400 block text-[11px] font-medium">{t('إجمالي الإضافي والبدلات', 'Total Overtime')}</span>
                  <p className="text-base font-black text-amber-400 font-mono mt-0.5">
                    {payrollImportModalData.summary.totalOvertime.toLocaleString('en-US')} {t('د.ع', 'IQD')}
                  </p>
                </div>
              </div>

              {/* Warnings if any rows were unmatched */}
              {payrollImportModalData.unmatchedRows && payrollImportModalData.unmatchedRows.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-base shrink-0">warning</span>
                  <span>
                    {t(
                      `تنبيه: تم تخطي ${payrollImportModalData.unmatchedRows.length} صفاً لعدم تطابق الرقم الوظيفي أو الاسم مع قاعدة البيانات.`,
                      `Notice: ${payrollImportModalData.unmatchedRows.length} rows were skipped due to unmatched badge or name.`
                    )}
                  </span>
                </div>
              )}

              {/* Detailed Breakdown Preview Table */}
              <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead className={`sticky top-0 ${isDark ? 'bg-[#0a0c10] text-slate-300' : 'bg-slate-100 text-slate-800'} font-bold`}>
                      <tr className="border-b border-white/10">
                        <th className="p-2.5 text-center">#</th>
                        <th className="p-2.5">{t('الموظف والبادج', 'Employee & Badge')}</th>
                        <th className="p-2.5 text-center">{t('الحوافز', 'Incentives')}</th>
                        <th className="p-2.5 text-center">{t('بدل النقل', 'Transportation')}</th>
                        <th className="p-2.5 text-center">{t('المكافآت', 'Bonus')}</th>
                        <th className="p-2.5 text-center">{t('الإضافي', 'Overtime')}</th>
                        <th className="p-2.5 text-center">{t('إجازات مستحقة', 'Earned Leave')}</th>
                        <th className="p-2.5 text-center">{t('استقطاعات/سلف', 'Deductions/Loans')}</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-200'}`}>
                      {Object.entries(payrollImportModalData.parsedAdjustments).map(([empId, adj]: [string, any], idx) => {
                        const emp = employees.find(e => String(e.id) === String(empId));
                        return (
                          <tr key={empId} className={`${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                            <td className="p-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-2.5">
                              <span className="font-bold block">{emp ? (language === 'en' ? (emp.name_en || emp.name) : (emp.name_ar || emp.name)) : empId}</span>
                              <span className="text-[10px] font-mono text-teal-400">VTS-{emp?.badge_no || empId}</span>
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-teal-400">
                              {(adj.incentives || 0).toLocaleString('en-US')}
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-blue-400">
                              {(adj.transportation || 0).toLocaleString('en-US')}
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-purple-400">
                              {(adj.bonus || 0).toLocaleString('en-US')}
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-amber-400">
                              {(adj.overtimeAmount || adj.overtime || 0).toLocaleString('en-US')}
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-emerald-400">
                              {(adj.earnedLeave || 0).toLocaleString('en-US')}
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-rose-400">
                              {((adj.loanPayment || 0) + (adj.otherDeductions || 0)).toLocaleString('en-US')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`p-4 border-t ${isDark ? 'border-white/10 bg-[#0a0c10]' : 'border-slate-200 bg-slate-50'} flex items-center justify-between`}>
              <p className="text-xs text-slate-400">
                {t('سيتم تحديث حقول البدلات والحوافز لجميع الموظفين المشمولين فور النقر على اعتماد.', 'Allowances will be updated immediately upon confirmation.')}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPayrollImportModalData(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isDark ? 'bg-white/10 hover:bg-white/15 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  onClick={handleConfirmPayrollImport}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs shadow-lg shadow-teal-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  <span>{t('اعتماد وتطبيق البيانات على المسير', 'Apply & Save to Payroll')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HR Policies & Regulations Modal */}
      {showPoliciesModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-7xl w-full max-h-[92vh] flex flex-col shadow-2xl border-2 border-slate-900 overflow-hidden text-black animate-in zoom-in-95 duration-200" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-white border-b-2 border-slate-200 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border-2 border-teal-600 text-teal-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-2xl text-teal-700">policy</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-black">
                      {t('سياسات الرواتب واللوائح التنظيمية المعتمدة', 'Enterprise HR Policies & Payroll Regulations')}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-normal bg-gray-100 text-black border border-gray-400">
                      {t('تحديث حي وفوري للمسير', 'Live Payroll Sync')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 font-normal mt-0.5">
                    {t(
                      'تعديل سعر الصرف، مخصصات الزوجية والأطفال، لائحة الإجازات، والضمان والضرائب مع انعكاس فوري على احتساب المسير',
                      'Update exchange rate, spouse & child allowances, leave entitlements, taxes & deductions with instant payroll recalculation'
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    setShowPoliciesModal(false);
                    if (refreshAllData) await refreshAllData();
                  }}
                  className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-black border border-gray-300 flex items-center justify-center transition-all cursor-pointer font-black text-lg"
                  title={t('إغلاق', 'Close')}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body: Scrollable PoliciesSection */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-white space-y-4">
              <PoliciesSection
                appSettings={appSettings}
                onSettingChange={(key, value) => {
                  if (updateAppSetting) {
                    updateAppSetting(key, value);
                  }
                }}
                onSaveAll={async () => {
                  if (refreshAllData) await refreshAllData();
                  setActionMessage(t('تم حفظ وتطبيق السياسات وتحديث مسير الرواتب بنجاح!', 'Policies saved and payroll recalculated successfully!'));
                  setTimeout(() => setActionMessage(null), 4000);
                }}
                language={language}
                t={t}
                employees={employees}
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t-2 border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 text-xs text-gray-700 font-normal">
                <span className="material-symbols-outlined text-teal-600 text-base">sync</span>
                <span>{t('أي تعديل على سعر الصرف أو البدلات سينعكس فوراً على جدول الرواتب الحالي', 'Any changes will immediately update the active payroll table')}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    setShowPoliciesModal(false);
                    if (refreshAllData) await refreshAllData();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-black hover:bg-gray-800 text-white font-normal text-xs transition-all cursor-pointer border border-black shadow"
                >
                  {t('تم وإغلاق النافذة', 'Done & Close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Iraqi Tax & Social Security Calculation Trace Modal (18 Items & Formulas) */}
      <CalculationTraceDetailsModal
        isOpen={isTraceModalOpen}
        onClose={() => setIsTraceModalOpen(false)}
        result={traceCalculationResult}
        employeeName={traceModalRow?.name_ar || traceModalRow?.name || 'الموظف'}
        employeeCode={traceModalRow?.emp_no || traceModalRow?.id || 'EMP'}
        lang={language as any}
      />
    </div>
  );
};
