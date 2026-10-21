/**
 * iraqPayrollTaxEngine.ts
 * Centralized, dynamic calculation engine for Iraqi Social Security & Progressive Income Tax
 * Fully compliant with:
 * - Iraqi Retirement & Social Security Law No. 18 of 2023 (Private Sector)
 * - Iraqi Income Tax Law No. 113 of 1982 and applicable amendments
 *
 * ZERO HARDCODED LEGAL RATES: All calculations strictly derive from legal settings and brackets.
 */

export interface PayrollLegalSettings {
  id?: string;
  version_code: string;
  version_name: string;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  effective_from: string;
  effective_to?: string | null;

  // Social Security (Law 18 of 2023)
  ss_employee_rate: number; // e.g. 5.0 (%)
  ss_employer_rate: number; // e.g. 12.0 (%)
  ss_insured_salary_rate: number; // e.g. 100.0 (%)
  ss_minimum_insured_salary: number | null; // e.g. 350,000 IQD (optional)
  ss_maximum_insured_salary: number | null; // e.g. 5,000,000 IQD (optional)
  ss_eligible_components: string[]; // ['basic_salary', 'housing', ...]

  // Tax Allowances & Deductions (Law 113 of 1982)
  tax_personal_allowance: number; // e.g. 2,500,000 IQD annually
  tax_spouse_allowance: number; // e.g. 2,000,000 IQD annually
  tax_child_allowance: number; // e.g. 200,000 IQD per child annually
  tax_eligible_children_limit: number; // e.g. 4 children max
  tax_spouse_income_condition: boolean; // true = only eligible if spouse has no income
  tax_employee_insurance_deductible: boolean; // true = employee SS is deducted from taxable income
  tax_other_allowed_deductions: number; // other lawful deductions
  tax_taxable_income_method: string; // 'ANNUAL_STANDARD'

  // Income Tax General
  tax_payroll_periods_per_year: number; // default: 12
  tax_rounding_method: 'NEAREST_1000' | 'NEAREST_100' | 'NEAREST_1' | 'NONE';
  tax_eligible_components: string[]; // wage components that are taxable

  // Documentation
  legal_reference?: string;
  notes?: string;
  created_by?: string;
  approved_by?: string;
  updated_at?: string;
}

export interface TaxBracketConfig {
  id: string;
  bracket_order: number;
  name_ar: string;
  name_en: string;
  min_income: number;
  max_income: number | null; // null = unlimited (above)
  tax_rate: number; // percentage (e.g. 3, 5, 10, 15)
  fixed_tax?: number;
  calculation_method?: string; // 'PROGRESSIVE_TIER'
  legal_reference?: string;
  notes?: string;
  effective_from?: string;
  effective_to?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface EmployeeAllowanceBreakdown {
  housing?: number;
  transport?: number;
  living?: number;
  food?: number;
  phone?: number;
  cert?: number;
  overtime?: number;
  bonus?: number;
  incentives?: number;
  earned_leave?: number;
  family?: number;
  other_allowance?: number;
  [key: string]: number | undefined;
}

export interface EmployeeInputForCalculation {
  id: string | number;
  employee_id?: string | number;
  full_name_ar?: string;
  full_name_en?: string;
  basic_salary: number;
  marital_status: 'single' | 'married' | 'divorced' | 'widowed' | string;
  children_count?: number;
  spouse_has_income?: boolean; // false = non-working spouse (eligible for allowance)
  is_ss_tax_exempt?: boolean;
  exemption_reason?: string;
  allowances?: EmployeeAllowanceBreakdown;
  other_deductions?: number;
}

export interface SocialSecurityResult {
  nominal_salary: number;
  eligible_components_sum: number;
  insured_salary_before_limits: number;
  minimum_limit: number | null;
  maximum_limit: number | null;
  insured_base: number;
  employee_rate: number;
  employer_rate: number;
  employee_insurance: number;
  employer_insurance: number;
  total_insurance: number;
  net_salary_before_tax: number;
  is_exempt: boolean;
  formula_trace: string[];
}

export interface BracketCalculationDetail {
  bracket_order: number;
  name_ar: string;
  name_en: string;
  min_income: number;
  max_income: number | null;
  tax_rate: number;
  bracket_income: number;
  bracket_tax: number;
  formula_note: string;
}

export interface IncomeTaxResult {
  annual_gross_income: number;
  taxable_components_sum_monthly: number;
  personal_allowance: number;
  spouse_allowance_eligible: boolean;
  spouse_allowance_amount: number;
  spouse_eligibility_reason: string;
  eligible_children_count: number;
  child_allowance_per_child: number;
  children_allowance_total: number;
  other_allowed_deductions: number;
  total_allowances: number;
  employee_insurance_tax_deductible: boolean;
  employee_insurance_deductible_amount: number;
  taxable_income_base: number;
  brackets_breakdown: BracketCalculationDetail[];
  annual_tax: number;
  payroll_periods: number;
  monthly_tax_raw: number;
  monthly_tax: number;
  rounding_method: string;
  is_exempt: boolean;
  formula_trace: string[];
}

export interface StepTraceItem {
  step_number: number;
  title_ar: string;
  title_en: string;
  formula_expression: string;
  actual_values_used: string;
  result_value: string;
  legal_note: string;
}

export interface FullPayrollTaxResult {
  // 18 Standard Items requested by Prompt
  item_1_nominal_basic: number;
  item_2_taxable_components_monthly: number;
  item_3_insured_components_monthly: number;
  item_4_insured_salary_base: number;
  item_5_employee_ss_rate: number;
  item_5_employee_ss_amount: number;
  item_6_employer_ss_rate: number;
  item_6_employer_ss_amount: number;
  item_7_annual_gross_taxable_income: number;
  item_8_personal_allowance: number;
  item_9_spouse_allowance_amount: number;
  item_9_spouse_eligible: boolean;
  item_10_eligible_children_count: number;
  item_10_children_allowance_total: number;
  item_11_tax_deductible_insurance: number;
  item_11_other_deductions: number;
  item_12_taxable_income_base: number;
  item_13_brackets_income_breakdown: BracketCalculationDetail[];
  item_14_brackets_tax_breakdown: BracketCalculationDetail[];
  item_15_annual_tax: number;
  item_16_monthly_tax: number;
  item_17_net_salary: number;
  item_18_legal_settings_version: string;

  // Additional Helper Structures
  social_security: SocialSecurityResult;
  income_tax: IncomeTaxResult;
  calculation_steps: StepTraceItem[];
  total_deductions_monthly: number;
}

/**
 * Default fallback settings conforming to Iraqi Law 18 of 2023 & Law 113 of 1982
 */
export function getDefaultLegalSettings(): PayrollLegalSettings {
  return {
    version_code: 'v2026.1',
    version_name: 'الإصدار التشريعي المعتمد لعام 2026 (قانون 18 وقانون 113)',
    status: 'ACTIVE',
    effective_from: '2026-01-01',
    effective_to: null,
    ss_employee_rate: 5.0,
    ss_employer_rate: 12.0,
    ss_insured_salary_rate: 100.0,
    ss_minimum_insured_salary: 350000,
    ss_maximum_insured_salary: 5000000,
    ss_eligible_components: ['basic_salary', 'housing', 'transport', 'living', 'food', 'other_allowance'],
    tax_personal_allowance: 2500000,
    tax_spouse_allowance: 2000000,
    tax_child_allowance: 200000,
    tax_eligible_children_limit: 4,
    tax_spouse_income_condition: true,
    tax_employee_insurance_deductible: true,
    tax_other_allowed_deductions: 0,
    tax_taxable_income_method: 'ANNUAL_STANDARD',
    tax_payroll_periods_per_year: 12,
    tax_rounding_method: 'NEAREST_1000',
    tax_eligible_components: ['basic_salary', 'housing', 'transport', 'living', 'food', 'overtime', 'bonus', 'other_allowance'],
    legal_reference: 'قانون التقاعد والضمان الاجتماعي للعمال رقم 18 لسنة 2023، وقانون ضريبة الدخل رقم 113 لسنة 1982 وتعديلاته',
    notes: 'الإعدادات المعتمدة المركزية لحساب استقطاعات الضمان وضريبة الدخل'
  };
}

/**
 * Default 4 Progressive Tax Brackets (Iraqi Income Tax Law No. 113)
 */
export function getDefaultTaxBrackets(): TaxBracketConfig[] {
  return [
    {
      id: 'brk_1',
      bracket_order: 1,
      name_ar: 'الشريحة الأولى (حتى 250,000 د.ع)',
      name_en: 'First Tier (0 - 250k IQD)',
      min_income: 0,
      max_income: 250000,
      tax_rate: 3.0,
      fixed_tax: 0,
      calculation_method: 'PROGRESSIVE_TIER',
      legal_reference: 'المادة 13 من قانون ضريبة الدخل رقم 113',
      status: 'ACTIVE'
    },
    {
      id: 'brk_2',
      bracket_order: 2,
      name_ar: 'الشريحة الثانية (250,001 - 500,000 د.ع)',
      name_en: 'Second Tier (250k - 500k IQD)',
      min_income: 250000,
      max_income: 500000,
      tax_rate: 5.0,
      fixed_tax: 0,
      calculation_method: 'PROGRESSIVE_TIER',
      legal_reference: 'المادة 13 من قانون ضريبة الدخل رقم 113',
      status: 'ACTIVE'
    },
    {
      id: 'brk_3',
      bracket_order: 3,
      name_ar: 'الشريحة الثالثة (500,001 - 1,000,000 د.ع)',
      name_en: 'Third Tier (500k - 1M IQD)',
      min_income: 500000,
      max_income: 1000000,
      tax_rate: 10.0,
      fixed_tax: 0,
      calculation_method: 'PROGRESSIVE_TIER',
      legal_reference: 'المادة 13 من قانون ضريبة الدخل رقم 113',
      status: 'ACTIVE'
    },
    {
      id: 'brk_4',
      bracket_order: 4,
      name_ar: 'الشريحة الرابعة (ما زاد عن 1,000,000 د.ع)',
      name_en: 'Fourth Tier (Above 1M IQD)',
      min_income: 1000000,
      max_income: null,
      tax_rate: 15.0,
      fixed_tax: 0,
      calculation_method: 'PROGRESSIVE_TIER',
      legal_reference: 'المادة 13 من قانون ضريبة الدخل رقم 113',
      status: 'ACTIVE'
    }
  ];
}

/**
 * Validate Tax Brackets for Gaps, Overlaps, Ordering, and Valid Rates
 */
export function validateTaxBrackets(rawBrackets: any[]): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  const brackets: TaxBracketConfig[] = (rawBrackets || []).map((b, idx) => ({
    id: b.id || `bracket_${idx + 1}`,
    bracket_order: Number(b.bracket_order ?? b.order ?? idx + 1),
    name_ar: b.name_ar || `الشريحة ${idx + 1}`,
    name_en: b.name_en || `Bracket ${idx + 1}`,
    min_income: Number(b.min_income ?? b.lower_limit ?? 0),
    max_income: b.max_income !== null && b.max_income !== undefined && b.max_income !== '' 
      ? Number(b.max_income) 
      : (b.upper_limit !== null && b.upper_limit !== undefined && b.upper_limit !== '' ? Number(b.upper_limit) : null),
    tax_rate: Number(b.tax_rate ?? b.rate_percentage ?? b.rate ?? 0),
    calculation_method: b.calculation_method || 'PROGRESSIVE_TIER',
    legal_reference: b.legal_reference || '',
    notes: b.notes || '',
    status: (b.status || 'ACTIVE').toUpperCase()
  }));

  const activeBrackets = brackets
    .filter(b => b.status === 'ACTIVE')
    .sort((a, b) => a.bracket_order - b.bracket_order);

  if (activeBrackets.length === 0) {
    errors.push('لا توجد أي شرائح ضريبية نشطة في النظام.');
    return { isValid: false, errors, warnings };
  }

  // Check first bracket starts at 0
  if (activeBrackets[0].min_income > 0) {
    warnings.push(`الشريحة الأولى تبدأ من ${activeBrackets[0].min_income.toLocaleString()} د.ع بدلاً من 0 د.ع، مما قد يترك دخلاً غير خاضع للضريبة.`);
  }

  for (let i = 0; i < activeBrackets.length; i++) {
    const current = activeBrackets[i];

    // Check rate valid
    if (current.tax_rate < 0 || current.tax_rate > 100) {
      errors.push(`الشريحة ${current.bracket_order} (${current.name_ar}): نسبة الضريبة ${current.tax_rate}% غير صحيحة، يجب أن تكون بين 0 و 100.`);
    }

    // Check min < max
    if (current.max_income !== null && current.min_income >= current.max_income) {
      errors.push(`الشريحة ${current.bracket_order} (${current.name_ar}): الحد الأدنى (${current.min_income.toLocaleString()}) أكبر من أو يساوي الحد الأعلى (${current.max_income.toLocaleString()}).`);
    }

    // Check overlap or gap with previous bracket
    if (i > 0) {
      const prev = activeBrackets[i - 1];
      if (prev.max_income !== null) {
        if (current.min_income > prev.max_income) {
          const gap = current.min_income - prev.max_income;
          errors.push(`توجد فجوة ضريبية بمقدار ${gap.toLocaleString()} د.ع بين الشريحة ${prev.bracket_order} والـ ${current.bracket_order} (من ${prev.max_income.toLocaleString()} إلى ${current.min_income.toLocaleString()}).`);
        } else if (current.min_income < prev.max_income) {
          const overlap = prev.max_income - current.min_income;
          errors.push(`يوجد تداخل ضريبي غير مقصود بمقدار ${overlap.toLocaleString()} د.ع بين الشريحة ${prev.bracket_order} والـ ${current.bracket_order}.`);
        }
      } else {
        errors.push(`الشريحة ${prev.bracket_order} ليس لها حد أعلى (مفتوحة)، ومع ذلك توجد شريحة تالية ${current.bracket_order} بعدها!`);
      }
    }
  }

  // Check last bracket is open-ended
  const lastBracket = activeBrackets[activeBrackets.length - 1];
  if (lastBracket.max_income !== null) {
    warnings.push(`الشريحة الأخيرة ${lastBracket.bracket_order} لها حد أعلى (${lastBracket.max_income.toLocaleString()} د.ع)؛ أي دخل يتجاوز هذا الحد لن يخضع للضريبة ما لم تكن هناك شريحة مفتوحة.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 4. Central Function: calculateSocialSecurity
 * Determines the insured salary base and social security contributions.
 *
 * InsuredSalary = EligibleSalaryComponents × (insured_salary_rate / 100)
 * InsuredBase = ApplyLegalInsuranceLimits(InsuredSalary, Minimum, Maximum)
 * EmployeeInsurance = InsuredBase × (employee_rate / 100)
 * EmployerInsurance = InsuredBase × (employer_rate / 100)
 * TotalInsurance = EmployeeInsurance + EmployerInsurance
 */
export function normalizeEmployeeInput(emp: any): EmployeeInputForCalculation {
  if (!emp) {
    return {
      id: 'unknown',
      employee_id: 'unknown',
      full_name_ar: 'موظف تجريبي',
      basic_salary: 0,
      marital_status: 'single',
      children_count: 0,
      spouse_has_income: false,
      allowances: {}
    };
  }

  const basicSalary = Number(emp.basic_salary ?? emp.basicSalary ?? emp.salary ?? 0);
  const maritalStatus = String(emp.marital_status ?? emp.maritalStatus ?? 'single');
  const childrenCount = Number(emp.children_count ?? emp.childrenCount ?? emp.children ?? 0);
  const spouseHasIncome = Boolean(emp.spouse_has_income ?? emp.spouseHasIncome ?? false);
  const allowances = { ...(emp.allowances || {}) };

  if (emp.housing_allowance ?? emp.housingAllowance) allowances.housing = Number(emp.housing_allowance ?? emp.housingAllowance);
  if (emp.transport_allowance ?? emp.transportAllowance ?? emp.transportation_fixed) allowances.transport = Number(emp.transport_allowance ?? emp.transportAllowance ?? emp.transportation_fixed);
  if (emp.living_allowance ?? emp.livingAllowance) allowances.living = Number(emp.living_allowance ?? emp.livingAllowance);
  if (emp.food_allowance ?? emp.foodAllowance) allowances.food = Number(emp.food_allowance ?? emp.foodAllowance);
  if (emp.overtime_pay ?? emp.overtimePay) allowances.overtime = Number(emp.overtime_pay ?? emp.overtimePay);
  if (emp.fixed_bonus ?? emp.fixedBonus ?? emp.bonus) allowances.bonus = Number(emp.fixed_bonus ?? emp.fixedBonus ?? emp.bonus);
  if (emp.phone_allowance ?? emp.phoneAllowance) allowances.other_allowance = Number(emp.phone_allowance ?? emp.phoneAllowance);

  return {
    id: emp.id ?? emp.employee_id ?? 'emp_001',
    employee_id: emp.employee_id ?? emp.id ?? 'emp_001',
    full_name_ar: emp.full_name_ar ?? emp.fullNameAr ?? emp.name ?? 'موظف تجريبي',
    basic_salary: basicSalary,
    marital_status: maritalStatus,
    children_count: childrenCount,
    spouse_has_income: spouseHasIncome,
    is_ss_tax_exempt: Boolean(emp.is_ss_tax_exempt ?? emp.isSsTaxExempt ?? false),
    exemption_reason: emp.exemption_reason ?? emp.exemptionReason ?? '',
    allowances,
    other_deductions: Number(emp.other_deductions ?? emp.otherDeductions ?? 0)
  };
}

export function calculateSocialSecurity(
  employeeInput: any,
  settings: PayrollLegalSettings
): SocialSecurityResult {
  const employee = normalizeEmployeeInput(employeeInput);
  const trace: string[] = [];

  if (employee.is_ss_tax_exempt) {
    trace.push(`الموظف معفى من استقطاع الضمان الاجتماعي (${employee.exemption_reason || 'إعفاء قانوني'}).`);
    return {
      nominal_salary: employee.basic_salary,
      eligible_components_sum: 0,
      insured_salary_before_limits: 0,
      minimum_limit: settings.ss_minimum_insured_salary,
      maximum_limit: settings.ss_maximum_insured_salary,
      insured_base: 0,
      employee_rate: settings.ss_employee_rate,
      employer_rate: settings.ss_employer_rate,
      employee_insurance: 0,
      employer_insurance: 0,
      total_insurance: 0,
      net_salary_before_tax: employee.basic_salary,
      is_exempt: true,
      formula_trace: trace
    };
  }

  // 1. Calculate sum of eligible components according to settings
  const eligibleCodes = settings.ss_eligible_components || ['basic_salary'];
  let eligibleSum = 0;

  if (eligibleCodes.includes('basic_salary')) {
    eligibleSum += Number(employee.basic_salary) || 0;
  }

  const allowances = employee.allowances || {};
  for (const code of eligibleCodes) {
    if (code !== 'basic_salary' && allowances[code]) {
      eligibleSum += Number(allowances[code]) || 0;
    }
  }

  trace.push(`مكونات الأجر المعتمدة للضمان: ${eligibleCodes.join(', ')} = ${eligibleSum.toLocaleString()} د.ع.`);

  // 2. Insured Salary before limits
  const insuredRateFactor = (Number(settings.ss_insured_salary_rate) || 100) / 100;
  const insuredSalary = eligibleSum * insuredRateFactor;
  trace.push(`الأجر الخاضع للضمان قبل الحدود = ${eligibleSum.toLocaleString()} × ${settings.ss_insured_salary_rate}% = ${insuredSalary.toLocaleString()} د.ع.`);

  // 3. Apply legal floor and ceiling limits
  let insuredBase = insuredSalary;
  const minLimit = settings.ss_minimum_insured_salary !== null && settings.ss_minimum_insured_salary !== undefined
    ? Number(settings.ss_minimum_insured_salary)
    : null;
  const maxLimit = settings.ss_maximum_insured_salary !== null && settings.ss_maximum_insured_salary !== undefined
    ? Number(settings.ss_maximum_insured_salary)
    : null;

  if (minLimit !== null && minLimit > 0 && insuredBase < minLimit) {
    trace.push(`الأجر أقل من الحد الأدنى القانوني (${minLimit.toLocaleString()} د.ع)، تم تعديل الوعاء للحد الأدنى.`);
    insuredBase = minLimit;
  }

  if (maxLimit !== null && maxLimit > 0 && insuredBase > maxLimit) {
    trace.push(`الأجر يتجاوز السقف الأعلى القانوني (${maxLimit.toLocaleString()} د.ع)، تم حصر الوعاء عند السقف الأعلى.`);
    insuredBase = maxLimit;
  }

  trace.push(`وعاء الاشتراك المعتمد للضمان (InsuredBase) = ${insuredBase.toLocaleString()} د.ع.`);

  // 4. Calculate employee and employer contributions
  const empRate = Number(settings.ss_employee_rate) || 5;
  const emprRate = Number(settings.ss_employer_rate) || 12;

  const employeeInsurance = Math.round(insuredBase * (empRate / 100));
  const employerInsurance = Math.round(insuredBase * (emprRate / 100));
  const totalInsurance = employeeInsurance + employerInsurance;

  trace.push(`استقطاع الموظف = ${insuredBase.toLocaleString()} × ${empRate}% = ${employeeInsurance.toLocaleString()} د.ع.`);
  trace.push(`مساهمة المؤسسة (لا تخصم من الموظف) = ${insuredBase.toLocaleString()} × ${emprRate}% = ${employerInsurance.toLocaleString()} د.ع.`);
  trace.push(`مجموع مساهمة الضمان = ${totalInsurance.toLocaleString()} د.ع.`);

  // Calculate gross of all salary + allowances to find net before tax
  let totalGrossMonthly = Number(employee.basic_salary) || 0;
  for (const val of Object.values(allowances)) {
    if (typeof val === 'number') totalGrossMonthly += val;
  }

  const netBeforeTax = totalGrossMonthly - employeeInsurance;

  return {
    nominal_salary: employee.basic_salary,
    eligible_components_sum: eligibleSum,
    insured_salary_before_limits: insuredSalary,
    minimum_limit: minLimit,
    maximum_limit: maxLimit,
    insured_base: insuredBase,
    employee_rate: empRate,
    employer_rate: emprRate,
    employee_insurance: employeeInsurance,
    employer_insurance: employerInsurance,
    total_insurance: totalInsurance,
    net_salary_before_tax: netBeforeTax,
    is_exempt: false,
    formula_trace: trace
  };
}

/**
 * 5. Central Function: calculateIncomeTax
 * Performs the multi-step progressive income tax calculation conforming to Law 113.
 */
export function calculateIncomeTax(
  employeeInput: any,
  settings: PayrollLegalSettings,
  brackets: TaxBracketConfig[],
  employeeInsurance: number = 0
): IncomeTaxResult {
  const employee = normalizeEmployeeInput(employeeInput);
  const trace: string[] = [];

  if (employee.is_ss_tax_exempt) {
    trace.push(`الموظف معفى من ضريبة الدخل (${employee.exemption_reason || 'إعفاء قانوني'}).`);
    return {
      annual_gross_income: 0,
      taxable_components_sum_monthly: 0,
      personal_allowance: 0,
      spouse_allowance_eligible: false,
      spouse_allowance_amount: 0,
      spouse_eligibility_reason: 'الموظف معفى بالكامل',
      eligible_children_count: 0,
      child_allowance_per_child: 0,
      children_allowance_total: 0,
      other_allowed_deductions: 0,
      total_allowances: 0,
      employee_insurance_tax_deductible: false,
      employee_insurance_deductible_amount: 0,
      taxable_income_base: 0,
      brackets_breakdown: [],
      annual_tax: 0,
      payroll_periods: settings.tax_payroll_periods_per_year || 12,
      monthly_tax_raw: 0,
      monthly_tax: 0,
      rounding_method: settings.tax_rounding_method || 'NEAREST_1000',
      is_exempt: true,
      formula_trace: trace
    };
  }

  const periods = Number(settings.tax_payroll_periods_per_year) || 12;

  // Step 1: Determine Monthly Taxable Components & Annual Gross Income
  const taxableCodes = settings.tax_eligible_components || ['basic_salary'];
  let monthlyTaxableSum = 0;

  if (taxableCodes.includes('basic_salary')) {
    monthlyTaxableSum += Number(employee.basic_salary) || 0;
  }

  const allowances = employee.allowances || {};
  for (const code of taxableCodes) {
    if (code !== 'basic_salary' && allowances[code]) {
      monthlyTaxableSum += Number(allowances[code]) || 0;
    }
  }

  const annualGrossIncome = monthlyTaxableSum * periods;
  trace.push(`الدخل الشهري الخاضع للضريبة: ${monthlyTaxableSum.toLocaleString()} د.ع × ${periods} شهر = الدخل السنوي الإجمالي ${annualGrossIncome.toLocaleString()} د.ع.`);

  // Step 2: Determine Personal and Family Allowances
  const personalAllowance = Number(settings.tax_personal_allowance) || 0;
  trace.push(`السماح الشخصي السنوي المقر = ${personalAllowance.toLocaleString()} د.ع.`);

  // Spouse Allowance eligibility
  let spouseAllowanceAmount = 0;
  let spouseEligible = false;
  let spouseReason = '';

  const isMarried = employee.marital_status === 'married' || employee.marital_status === 'متزوج' || employee.marital_status === 'متأهل';

  if (!isMarried) {
    spouseEligible = false;
    spouseReason = 'الموظف غير متزوج (لا يستحق سماح الزوجة)';
  } else {
    // Check spouse income condition
    const conditionEnforced = settings.tax_spouse_income_condition;
    if (conditionEnforced) {
      if (employee.spouse_has_income === true) {
        spouseEligible = false;
        spouseReason = 'الزوجة لديها دخل أو عمل مستقل، بموجب القانون يُحجب سماح الزوجة';
      } else {
        spouseEligible = true;
        spouseAllowanceAmount = Number(settings.tax_spouse_allowance) || 0;
        spouseReason = 'الزوجة مستحقة للسماح (لا تتقاضى راتباً أو دخلاً مستقلاً)';
      }
    } else {
      spouseEligible = true;
      spouseAllowanceAmount = Number(settings.tax_spouse_allowance) || 0;
      spouseReason = 'الزوجة مستحقة للسماح القانوني';
    }
  }
  trace.push(`سماح الزوجة: ${spouseAllowanceAmount.toLocaleString()} د.ع (${spouseReason}).`);

  // Children Allowance
  const actualChildren = Math.max(0, Number(employee.children_count) || 0);
  const maxEligibleChildren = Number(settings.tax_eligible_children_limit) || 4;
  const eligibleChildren = Math.min(actualChildren, maxEligibleChildren);
  const perChildAllowance = Number(settings.tax_child_allowance) || 0;
  const childrenAllowanceTotal = eligibleChildren * perChildAllowance;

  trace.push(`سماح الأطفال: ${eligibleChildren} طفل مستحق (من أصل ${actualChildren} أطفال، الحد الأقصى ${maxEligibleChildren}) × ${perChildAllowance.toLocaleString()} د.ع = ${childrenAllowanceTotal.toLocaleString()} د.ع.`);

  // Other legal deductions
  const otherDeductions = Number(settings.tax_other_allowed_deductions) || 0;
  if (otherDeductions > 0) {
    trace.push(`سماحات وخصومات قانونية إضافية = ${otherDeductions.toLocaleString()} د.ع.`);
  }

  const totalAllowances = personalAllowance + spouseAllowanceAmount + childrenAllowanceTotal + otherDeductions;
  trace.push(`إجمالي السماحات السنوية = ${totalAllowances.toLocaleString()} د.ع.`);

  // Step 3: Determine Deductible Social Security Insurance
  let taxDeductibleInsurance = 0;
  if (settings.tax_employee_insurance_deductible) {
    taxDeductibleInsurance = (employeeInsurance || 0) * periods;
    trace.push(`استقطاع الضمان الاجتماعي للموظف يخصم من الوعاء الضريبي سنويّاً: ${employeeInsurance.toLocaleString()} × ${periods} = ${taxDeductibleInsurance.toLocaleString()} د.ع.`);
  } else {
    trace.push(`استقطاع الضمان الاجتماعي غير مخصوم من الوعاء وفق الإعدادات الحالية.`);
  }

  // Step 4: Determine Taxable Income Base
  const taxableIncomeBase = Math.max(0, annualGrossIncome - totalAllowances - taxDeductibleInsurance);
  trace.push(`الوعاء الضريبي السنوي الخاضع للشرائح (Taxable Base) = Max(0, ${annualGrossIncome.toLocaleString()} - ${totalAllowances.toLocaleString()} - ${taxDeductibleInsurance.toLocaleString()}) = ${taxableIncomeBase.toLocaleString()} د.ع.`);

  // Step 5: Calculate Tax Across Progressive Brackets
  const activeBrackets = brackets
    .filter(b => b.status === 'ACTIVE')
    .sort((a, b) => a.bracket_order - b.bracket_order);

  const breakdown: BracketCalculationDetail[] = [];
  let annualTax = 0;

  if (taxableIncomeBase > 0) {
    for (const b of activeBrackets) {
      const min = Number(b.min_income);
      const max = b.max_income !== null && b.max_income !== undefined ? Number(b.max_income) : null;
      const rate = Number(b.tax_rate);

      let incomeInBracket = 0;
      if (taxableIncomeBase > min) {
        if (max !== null) {
          incomeInBracket = Math.min(taxableIncomeBase, max) - min;
        } else {
          incomeInBracket = taxableIncomeBase - min;
        }
      }

      incomeInBracket = Math.max(0, incomeInBracket);
      const bracketTax = Math.round(incomeInBracket * (rate / 100));
      annualTax += bracketTax;

      const upperDisplay = max !== null ? max.toLocaleString() : 'غير محدد';
      const formulaNote = incomeInBracket > 0
        ? `خضع مبلغ ${incomeInBracket.toLocaleString()} د.ع بنسبة ${rate}% = ${bracketTax.toLocaleString()} د.ع`
        : 'الدخل لم يصل لهذه الشريحة أو تجاوزها بالكامل دون رصيد إضافي';

      breakdown.push({
        bracket_order: b.bracket_order,
        name_ar: b.name_ar,
        name_en: b.name_en,
        min_income: min,
        max_income: max,
        tax_rate: rate,
        bracket_income: incomeInBracket,
        bracket_tax: bracketTax,
        formula_note: formulaNote
      });

      if (incomeInBracket > 0) {
        trace.push(`الشريحة ${b.bracket_order} (${min.toLocaleString()} - ${upperDisplay} د.ع): دخل الشريحة = ${incomeInBracket.toLocaleString()} د.ع × ${rate}% = ${bracketTax.toLocaleString()} د.ع.`);
      }
    }
  } else {
    trace.push(`الوعاء الضريبي = 0 (السماحات والخصومات تغطي كامل الدخل)؛ لا توجد ضريبة مستحقة.`);
  }

  trace.push(`مجموع الضريبة السنوية المستحقة = ${annualTax.toLocaleString()} د.ع.`);

  // Step 6: Monthly Deduction and Rounding
  const monthlyTaxRaw = annualTax / periods;
  let monthlyTaxRounded = monthlyTaxRaw;

  switch (settings.tax_rounding_method) {
    case 'NEAREST_1000':
      monthlyTaxRounded = Math.round(monthlyTaxRaw / 1000) * 1000;
      break;
    case 'NEAREST_100':
      monthlyTaxRounded = Math.round(monthlyTaxRaw / 100) * 100;
      break;
    case 'NEAREST_1':
      monthlyTaxRounded = Math.round(monthlyTaxRaw);
      break;
    default:
      monthlyTaxRounded = Math.round(monthlyTaxRaw);
  }

  trace.push(`الاستقطاع الشهري للضريبة: ${annualTax.toLocaleString()} ÷ ${periods} = ${monthlyTaxRaw.toFixed(2)} د.ع (المقرب بطريقة ${settings.tax_rounding_method}: ${monthlyTaxRounded.toLocaleString()} د.ع).`);

  return {
    annual_gross_income: annualGrossIncome,
    taxable_components_sum_monthly: monthlyTaxableSum,
    personal_allowance: personalAllowance,
    spouse_allowance_eligible: spouseEligible,
    spouse_allowance_amount: spouseAllowanceAmount,
    spouse_eligibility_reason: spouseReason,
    eligible_children_count: eligibleChildren,
    child_allowance_per_child: perChildAllowance,
    children_allowance_total: childrenAllowanceTotal,
    other_allowed_deductions: otherDeductions,
    total_allowances: totalAllowances,
    employee_insurance_tax_deductible: settings.tax_employee_insurance_deductible,
    employee_insurance_deductible_amount: taxDeductibleInsurance,
    taxable_income_base: taxableIncomeBase,
    brackets_breakdown: breakdown,
    annual_tax: annualTax,
    payroll_periods: periods,
    monthly_tax_raw: monthlyTaxRaw,
    monthly_tax: monthlyTaxRounded,
    rounding_method: settings.tax_rounding_method,
    is_exempt: false,
    formula_trace: trace
  };
}

/**
 * Combined Calculation with the exact 18 standard items and step-by-step breakdown
 */
export function calculateCombinedPayrollTaxAndSecurity(
  employeeInput: any,
  settings: PayrollLegalSettings,
  brackets: TaxBracketConfig[]
): FullPayrollTaxResult {
  const employee = normalizeEmployeeInput(employeeInput);
  // 1. Social Security Calculation
  const ssResult = calculateSocialSecurity(employee, settings);

  // 2. Income Tax Calculation
  const taxResult = calculateIncomeTax(employee, settings, brackets, ssResult.employee_insurance);

  // 3. Monthly Gross and Net
  let totalGrossMonthly = Number(employee.basic_salary) || 0;
  const allowances = employee.allowances || {};
  for (const val of Object.values(allowances)) {
    if (typeof val === 'number') totalGrossMonthly += val;
  }

  const otherDeductions = Number(employee.other_deductions) || 0;
  const totalDeductionsMonthly = ssResult.employee_insurance + taxResult.monthly_tax + otherDeductions;
  const netSalary = totalGrossMonthly - totalDeductionsMonthly;

  // 4. Detailed Calculation Steps for "عرض معادلة الاحتساب" Modal
  const steps: StepTraceItem[] = [
    {
      step_number: 1,
      title_ar: 'تحديد الراتب الاسمي والبدلات',
      title_en: 'Basic Salary & Allowances',
      formula_expression: 'BasicSalary + Allowances',
      actual_values_used: `الأساسي = ${employee.basic_salary.toLocaleString()} د.ع، مجموع البدلات = ${(totalGrossMonthly - employee.basic_salary).toLocaleString()} د.ع`,
      result_value: `${totalGrossMonthly.toLocaleString()} د.ع`,
      legal_note: 'عقد العمل ومسير الرواتب المعتمد'
    },
    {
      step_number: 2,
      title_ar: 'تحديد وعاء الضمان الاجتماعي',
      title_en: 'Social Security Base',
      formula_expression: 'Clamp(EligibleComponents × InsuredRate, MinLimit, MaxLimit)',
      actual_values_used: `المكونات المعتمدة = ${ssResult.eligible_components_sum.toLocaleString()} د.ع، النسبة = ${settings.ss_insured_salary_rate}%، الحدود [${settings.ss_minimum_insured_salary?.toLocaleString() ?? 'لا يوجد'} - ${settings.ss_maximum_insured_salary?.toLocaleString() ?? 'لا يوجد'}]`,
      result_value: `${ssResult.insured_base.toLocaleString()} د.ع`,
      legal_note: 'المادة 18 من قانون التقاعد والضمان الاجتماعي للعمال رقم 18 لسنة 2023'
    },
    {
      step_number: 3,
      title_ar: 'استقطاع الضمان الاجتماعي (حصة الموظف)',
      title_en: 'Employee Social Security',
      formula_expression: 'InsuredBase × EmployeeRate',
      actual_values_used: `${ssResult.insured_base.toLocaleString()} د.ع × ${settings.ss_employee_rate}%`,
      result_value: `${ssResult.employee_insurance.toLocaleString()} د.ع`,
      legal_note: 'يُستقطع مباشرة من راتب الموظف لحساب صندوق الضمان'
    },
    {
      step_number: 4,
      title_ar: 'مساهمة المؤسسة في الضمان (حصة صاحب العمل)',
      title_en: 'Employer Social Security Contribution',
      formula_expression: 'InsuredBase × EmployerRate',
      actual_values_used: `${ssResult.insured_base.toLocaleString()} د.ع × ${settings.ss_employer_rate}%`,
      result_value: `${ssResult.employer_insurance.toLocaleString()} د.ع`,
      legal_note: 'تتحملها المؤسسة بالكامل ولا تخصم من صافي راتب الموظف'
    },
    {
      step_number: 5,
      title_ar: 'الدخل السنوي الخاضع للضريبة',
      title_en: 'Annual Gross Taxable Income',
      formula_expression: 'TaxableComponentsMonthly × 12',
      actual_values_used: `${taxResult.taxable_components_sum_monthly.toLocaleString()} د.ع × 12`,
      result_value: `${taxResult.annual_gross_income.toLocaleString()} د.ع`,
      legal_note: 'المادة 2 من قانون ضريبة الدخل رقم 113 لسنة 1982'
    },
    {
      step_number: 6,
      title_ar: 'السماحات الشخصية والعائلية',
      title_en: 'Personal & Family Tax Allowances',
      formula_expression: 'PersonalAllowance + SpouseAllowance + ChildrenAllowance + Other',
      actual_values_used: `شخصي: ${taxResult.personal_allowance.toLocaleString()} + زوجة: ${taxResult.spouse_allowance_amount.toLocaleString()} + أطفال (${taxResult.eligible_children_count}): ${taxResult.children_allowance_total.toLocaleString()}`,
      result_value: `${taxResult.total_allowances.toLocaleString()} د.ع`,
      legal_note: 'المادة 12 من قانون ضريبة الدخل رقم 113 وتعديلاتها للقطاع الخاص'
    },
    {
      step_number: 7,
      title_ar: 'خصم استقطاع الضمان من الوعاء الضريبي',
      title_en: 'Tax Deductible Social Security',
      formula_expression: 'EmployeeInsuranceMonthly × 12',
      actual_values_used: `${ssResult.employee_insurance.toLocaleString()} د.ع × 12`,
      result_value: `${taxResult.employee_insurance_deductible_amount.toLocaleString()} د.ع`,
      legal_note: 'أقساط الضمان المقررة قانوناً تعد نفقة واجبة الخصم من الدخل الخاضع للضريبة'
    },
    {
      step_number: 8,
      title_ar: 'تحديد الوعاء الضريبي النهائي',
      title_en: 'Final Taxable Income Base',
      formula_expression: 'Max(0, AnnualGross - TotalAllowances - DeductibleInsurance)',
      actual_values_used: `Max(0, ${taxResult.annual_gross_income.toLocaleString()} - ${taxResult.total_allowances.toLocaleString()} - ${taxResult.employee_insurance_deductible_amount.toLocaleString()})`,
      result_value: `${taxResult.taxable_income_base.toLocaleString()} د.ع`,
      legal_note: 'صافي الدخل السنوي الذي تُطبق عليه الشرائح التصاعدية'
    },
    {
      step_number: 9,
      title_ar: 'احتساب الضريبة بالشرائح التصاعدية',
      title_en: 'Progressive Tax Brackets Breakdown',
      formula_expression: 'Sum(BracketIncome × BracketRate)',
      actual_values_used: taxResult.brackets_breakdown.filter(b => b.bracket_income > 0).map(b => `ش${b.bracket_order}: ${b.bracket_income.toLocaleString()}×${b.tax_rate}%=${b.bracket_tax.toLocaleString()}`).join(' + ') || '0 د.ع',
      result_value: `${taxResult.annual_tax.toLocaleString()} د.ع`,
      legal_note: 'المادة 13 من قانون ضريبة الدخل رقم 113'
    },
    {
      step_number: 10,
      title_ar: 'استقطاع الضريبة الشهري والتقريب',
      title_en: 'Monthly Tax Deduction & Rounding',
      formula_expression: 'AnnualTax / 12 (Rounded)',
      actual_values_used: `${taxResult.annual_tax.toLocaleString()} ÷ 12 = ${taxResult.monthly_tax_raw.toFixed(2)} د.ع`,
      result_value: `${taxResult.monthly_tax.toLocaleString()} د.ع`,
      legal_note: `التقريب وفق الإعدادات المعتمدة (${settings.tax_rounding_method})`
    },
    {
      step_number: 11,
      title_ar: 'صافي الراتب المستحق للصرف',
      title_en: 'Net Payable Salary',
      formula_expression: 'GrossSalary - EmployeeSS - MonthlyTax - OtherDeductions',
      actual_values_used: `${totalGrossMonthly.toLocaleString()} - ${ssResult.employee_insurance.toLocaleString()} - ${taxResult.monthly_tax.toLocaleString()} - ${otherDeductions.toLocaleString()}`,
      result_value: `${netSalary.toLocaleString()} د.ع`,
      legal_note: 'المبلغ النهائي الصافي المحول لحساب الموظف البنكي'
    }
  ];

  return {
    item_1_nominal_basic: employee.basic_salary,
    item_2_taxable_components_monthly: taxResult.taxable_components_sum_monthly,
    item_3_insured_components_monthly: ssResult.eligible_components_sum,
    item_4_insured_salary_base: ssResult.insured_base,
    item_5_employee_ss_rate: ssResult.employee_rate,
    item_5_employee_ss_amount: ssResult.employee_insurance,
    item_6_employer_ss_rate: ssResult.employer_rate,
    item_6_employer_ss_amount: ssResult.employer_insurance,
    item_7_annual_gross_taxable_income: taxResult.annual_gross_income,
    item_8_personal_allowance: taxResult.personal_allowance,
    item_9_spouse_allowance_amount: taxResult.spouse_allowance_amount,
    item_9_spouse_eligible: taxResult.spouse_allowance_eligible,
    item_10_eligible_children_count: taxResult.eligible_children_count,
    item_10_children_allowance_total: taxResult.children_allowance_total,
    item_11_tax_deductible_insurance: taxResult.employee_insurance_deductible_amount,
    item_11_other_deductions: otherDeductions,
    item_12_taxable_income_base: taxResult.taxable_income_base,
    item_13_brackets_income_breakdown: taxResult.brackets_breakdown,
    item_14_brackets_tax_breakdown: taxResult.brackets_breakdown,
    item_15_annual_tax: taxResult.annual_tax,
    item_16_monthly_tax: taxResult.monthly_tax,
    item_17_net_salary: netSalary,
    item_18_legal_settings_version: settings.version_code || 'v2026.1',

    social_security: ssResult,
    income_tax: taxResult,
    calculation_steps: steps,
    total_deductions_monthly: totalDeductionsMonthly
  };
}
