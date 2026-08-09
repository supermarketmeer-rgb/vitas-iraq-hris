import React, { createContext, useContext, useState, useEffect } from 'react';
import { useApp as useMainApp } from '../../context/AppContext';
import {
  CalculationParameter,
  CalculationRule,
  CalculationVariable,
  Department,
  Branch,
  HREmployee,
  PayrollCalculationSnapshot,
  TaxBracket,
} from '../types.js';

export type Language = 'ar' | 'en';
export type Theme = 'light' | 'dark';

export type NavTab =
  | 'dashboard'
  | 'social_security'
  | 'income_tax'
  | 'calculation_rules'
  | 'simulator'
  | 'reports'
  | 'settings'
  | 'php_architecture';

export interface AppContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  activePeriod: string;
  setActivePeriod: (period: string) => void;
  activeDepartmentId: string;
  setActiveDepartmentId: (deptId: string) => void;
  activeBranchId: string;
  setActiveBranchId: (branchId: string) => void;

  // Data
  rules: CalculationRule[];
  taxBrackets: TaxBracket[];
  variables: CalculationVariable[];
  parameters: CalculationParameter[];
  snapshots: PayrollCalculationSnapshot[];
  employees: HREmployee[];
  departments: Department[];
  branches: Branch[];
  loading: boolean;

  // Actions
  refreshData: () => Promise<void>;
  selectedSnapshot: PayrollCalculationSnapshot | null;
  setSelectedSnapshot: (snap: PayrollCalculationSnapshot | null) => void;
  editingRule: CalculationRule | null;
  setEditingRule: (rule: CalculationRule | null) => void;
  isRuleModalOpen: boolean;
  setIsRuleModalOpen: (open: boolean) => void;
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  t: (key: string) => string;
}

const translations: Record<string, { ar: string; en: string }> = {
  // Navigation & Branding
  module_title: { ar: 'الضمان الاجتماعي وضريبة الدخل', en: 'Social Security & Income Tax' },
  module_subtitle: { ar: 'محرك القواعد الديناميكي لنظام الموارد البشرية HRMS', en: 'Dynamic Rules Engine for HR Management System' },
  hr_integrated_badge: { ar: 'متكامل مع نظام الموارد البشرية', en: 'Integrated with HR System' },
  dashboard: { ar: 'لوحة التحكم والمؤشرات', en: 'Dashboard' },
  social_security: { ar: 'الضمان الاجتماعي', en: 'Social Security' },
  income_tax: { ar: 'ضريبة الدخل', en: 'Income Tax' },
  calculation_rules: { ar: 'قواعد الحساب (Rules)', en: 'Calculation Rules' },
  rule_simulator: { ar: 'محاكي القواعد (Simulator)', en: 'Rule Simulator' },
  reports: { ar: 'التقارير والمطابقات', en: 'Reports & Audits' },
  settings: { ar: 'الإعدادات والمتغيرات', en: 'Settings & Variables' },
  php_architecture: { ar: 'بنية PHP ومخطط SQL', en: 'PHP Architecture & SQL' },

  // Periods & Filters
  payroll_period: { ar: 'فترة الراتب', en: 'Payroll Period' },
  all_departments: { ar: 'جميع الأقسام', en: 'All Departments' },
  all_branches: { ar: 'جميع الفروع', en: 'All Branches' },
  filter_by_month: { ar: 'تصفية حسب الشهر', en: 'Filter by Month' },

  // KPI Metrics
  total_employees: { ar: 'إجمالي الموظفين', en: 'Total Employees' },
  total_gross_salaries: { ar: 'إجمالي الرواتب الكلية', en: 'Total Gross Salaries' },
  employee_social_security: { ar: 'ضمان الموظف (الاستقطاع)', en: 'Employee Social Security' },
  employer_social_security: { ar: 'مساهمة جهة العمل (الضمان)', en: 'Employer Social Security' },
  total_social_security: { ar: 'إجمالي اشتراك الضمان', en: 'Total Social Security' },
  total_income_tax: { ar: 'إجمالي ضريبة الدخل', en: 'Total Income Tax' },
  total_deductions: { ar: 'إجمالي الاستقطاعات', en: 'Total Deductions' },
  total_net_payout: { ar: 'صافي الرواتب المستحقة', en: 'Net Payable Salaries' },

  // Rule management
  add_new_rule: { ar: 'إضافة قاعدة حساب جديدة', en: 'Add Calculation Rule' },
  rule_code: { ar: 'رمز القاعدة (Code)', en: 'Rule Code' },
  rule_name_ar: { ar: 'اسم القاعدة (عربي)', en: 'Rule Name (Arabic)' },
  rule_name_en: { ar: 'اسم القاعدة (إنجليزي)', en: 'Rule Name (English)' },
  rule_type: { ar: 'نوع القاعدة', en: 'Rule Type' },
  execution_order: { ar: 'ترتيب التنفيذ', en: 'Execution Order' },
  output_variable: { ar: 'المتغير الناتج', en: 'Output Variable' },
  dependencies: { ar: 'الاعتماديات (Dependencies)', en: 'Dependencies' },
  status: { ar: 'الحالة', en: 'Status' },
  active: { ar: 'نشط', en: 'Active' },
  draft: { ar: 'مسودة', en: 'Draft' },
  inactive: { ar: 'معطل', en: 'Inactive' },
  scheduled: { ar: 'مجدول', en: 'Scheduled' },
  effective_from: { ar: 'ساري من تاريخ', en: 'Effective From' },
  effective_to: { ar: 'ساري حتى تاريخ', en: 'Effective To' },
  version: { ar: 'الإصدار (Version)', en: 'Version' },
  create_new_version: { ar: 'إنشاء إصدار جديد (New Version)', en: 'Create New Version' },
  no_hardcoded_notice: {
    ar: 'ملاحظة: لا توجد أي نسب أو شرائح قانونية ثابتة داخل الكود (PHP/TS)؛ كل القواعد والشرائح تقرأ ديناميكياً من قاعدة البيانات.',
    en: 'Note: Zero hardcoded legal rates in code; all formulas, brackets, and parameters are dynamically loaded from database and versioned.',
  },

  // Tax Brackets
  tax_brackets_title: { ar: 'جدول شرائح ضريبة الدخل التصاعدية', en: 'Progressive Tax Brackets Table' },
  add_bracket: { ar: 'إضافة شريحة ضريبية', en: 'Add Tax Bracket' },
  bracket_order: { ar: 'رقم الشريحة', en: 'Bracket Tier' },
  min_income: { ar: 'الحد الأدنى للدخل', en: 'Min Income' },
  max_income: { ar: 'الحد الأعلى للدخل', en: 'Max Income' },
  tax_rate_percent: { ar: 'نسبة الضريبة (%)', en: 'Tax Rate (%)' },
  fixed_tax_amount: { ar: 'ضريبة ثابتة إضافية', en: 'Fixed Tax Add-on' },
  unlimited: { ar: 'غير محدد (ما زاد عن ذلك)', en: 'Unlimited (Above)' },

  // Simulator
  simulator_title: { ar: 'محاكي واختبار قواعد الحساب', en: 'Rule Simulator & Test Bench' },
  simulator_desc: {
    ar: 'اختبر القواعد والمعادلات وتأكد من صحة النتائج وخطوات الاحتساب قبل اعتمادها على الرواتب الفعلية.',
    en: 'Test calculation rules, verify progressive bracket breakdowns, and trace formula steps before running payroll.',
  },
  load_employee: { ar: 'تحميل بيانات موظف من HR', en: 'Load HR Employee' },
  basic_salary: { ar: 'الراتب الأساسي', en: 'Basic Salary' },
  allowances: { ar: 'المخصصات والبدلات', en: 'Allowances' },
  housing_allowance: { ar: 'مخصصات السكن', en: 'Housing Allowance' },
  transport_allowance: { ar: 'مخصصات النقل', en: 'Transport Allowance' },
  living_allowance: { ar: 'مخصصات المعيشة', en: 'Living Allowance' },
  dependents_count: { ar: 'عدد المعالين / الأطفال', en: 'Dependents Count' },
  calculation_date: { ar: 'تاريخ الحساب (Calculation Date)', en: 'Calculation Date' },
  calculate_and_trace: { ar: 'احسب وتتبع الخطوات', en: 'Calculate & Trace Steps' },
  step_by_step_trace: { ar: 'تتبع خطوات الاحتساب التفصيلية', en: 'Step-by-Step Calculation Trace' },
  progressive_brackets_breakdown: { ar: 'تفصيل الشرائح التصاعدية المطبقة', en: 'Progressive Brackets Breakdown' },

  // Snapshots & Reports
  social_security_report: { ar: 'تقرير الضمان الاجتماعي', en: 'Social Security Report' },
  income_tax_report: { ar: 'تقرير ضريبة الدخل', en: 'Income Tax Report' },
  monthly_summary: { ar: 'ملخص الرواتب الشهري', en: 'Monthly Payroll Summary' },
  snapshot_comparator: { ar: 'مقارنة الإصدارات (Snapshot Comparator)', en: 'Version Snapshot Comparator' },
  immutable_snapshots_notice: {
    ar: 'يتم حفظ كل عملية احتساب في سجل غير قابل للتعديل (Snapshot) متضمناً الإصدار والمعادلة وقيم المدخلات، لضمان عدم تغير الرواتب السابقة إطلاقاً عند تحديث القواعد.',
    en: 'Every payroll run is archived as an immutable snapshot with exact rule versions and parameters, guaranteeing historical calculations never alter.',
  },
  currency: { ar: 'د.ع', en: 'IQD' },
  export_csv: { ar: 'تصدير CSV', en: 'Export CSV' },
  print_report: { ar: 'طباعة التقرير', en: 'Print Report' },
};

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mainApp = useMainApp();

  const lang: Language = (mainApp?.language as Language) || 'ar';
  const theme: Theme = (mainApp?.theme as Theme) || 'light';

  const setLang = (newLang: Language) => {
    if (mainApp?.setLanguage) mainApp.setLanguage(newLang);
  };

  const setTheme = (newTheme: Theme) => {
    if (mainApp?.setTheme) mainApp.setTheme(newTheme);
  };

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [activePeriod, setActivePeriod] = useState<string>('2026-08');
  const [activeDepartmentId, setActiveDepartmentId] = useState<string>('');
  const [activeBranchId, setActiveBranchId] = useState<string>('');

  const [rules, setRules] = useState<CalculationRule[]>([]);
  const [taxBrackets, setTaxBrackets] = useState<TaxBracket[]>([]);
  const [variables, setVariables] = useState<CalculationVariable[]>([]);
  const [parameters, setParameters] = useState<CalculationParameter[]>([]);
  const [snapshots, setSnapshots] = useState<PayrollCalculationSnapshot[]>([]);
  const [employees, setEmployees] = useState<HREmployee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedSnapshot, setSelectedSnapshot] = useState<PayrollCalculationSnapshot | null>(null);
  const [editingRule, setEditingRule] = useState<CalculationRule | null>(null);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const t = (key: string): string => {
    if (translations[key]) {
      return translations[key][lang] || key;
    }
    return key;
  };

  const refreshData = async () => {
    try {
      setLoading(true);
      const baseUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:5000/api` : 'http://localhost:5000/api';

      const safeFetch = (path: string) => 
        fetch(`${baseUrl}${path}`)
          .then((r) => r.json())
          .catch(() => fetch(`/api${path}`).then((r) => r.json()).catch(() => []));

      const [
        rulesRes,
        bracketsRes,
        varsRes,
        paramsRes,
        snapsRes,
        empsRes,
        deptsRes,
        branchesRes,
      ] = await Promise.all([
        safeFetch('/tax-module/rules'),
        safeFetch('/tax-module/tax-brackets'),
        safeFetch('/tax-module/variables'),
        safeFetch('/tax-module/parameters'),
        safeFetch(`/tax-module/snapshots?period=${activePeriod}`),
        safeFetch('/tax-module/hr-bridge/employees'),
        safeFetch('/employees'),
        safeFetch('/employees'),
      ]);

      setRules(Array.isArray(rulesRes) ? rulesRes : (rulesRes.rules || []));
      setTaxBrackets(Array.isArray(bracketsRes) ? bracketsRes : (bracketsRes.tax_brackets || []));
      setVariables(Array.isArray(varsRes) ? varsRes : (varsRes.variables || []));
      setParameters(Array.isArray(paramsRes) ? paramsRes : (paramsRes.parameters || []));
      setSnapshots(Array.isArray(snapsRes) ? snapsRes : (snapsRes.snapshots || []));
      setEmployees(Array.isArray(empsRes) ? empsRes : (empsRes.employees || []));
    } catch (err) {
      console.error('Failed to load payroll rules data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [activePeriod]);

  return (
    <AppContext.Provider
      value={{
        lang,
        setLang,
        theme,
        setTheme,
        activeTab,
        setActiveTab,
        activePeriod,
        setActivePeriod,
        activeDepartmentId,
        setActiveDepartmentId,
        activeBranchId,
        setActiveBranchId,
        rules,
        taxBrackets,
        variables,
        parameters,
        snapshots,
        employees,
        departments,
        branches,
        loading,
        refreshData,
        selectedSnapshot,
        setSelectedSnapshot,
        editingRule,
        setEditingRule,
        isRuleModalOpen,
        setIsRuleModalOpen,
        showNotification,
        t,
      }}
    >
      <div className="contents">
        {children}
        {notification && (
          <div
            className={`fixed bottom-5 end-5 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border text-sm font-medium transition-all ${
              notification.type === 'error'
                ? 'bg-red-950/90 text-red-200 border-red-800'
                : 'bg-emerald-950/90 text-emerald-200 border-emerald-800'
            }`}
          >
            <span>{notification.message}</span>
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
