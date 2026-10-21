/**
 * test_iraq_tax_engine.cjs
 * Automated Verification Suite for Iraqi Social Security & Income Tax Engine
 * Testing all required legal scenarios according to Section 6 and Section 11 of the prompt.
 */

const {
  calculateSocialSecurity,
  calculateIncomeTax,
  calculateCombinedPayrollTaxAndSecurity,
  validateTaxBrackets,
  getDefaultLegalSettings,
  getDefaultTaxBrackets
} = require('../dist/test_engine_bundle.cjs');

console.log('========================================================================');
console.log('🧪 AUTOMATED TEST SUITE: IRAQI SOCIAL SECURITY & INCOME TAX ENGINE');
console.log('========================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ [PASS] ${testName}`);
  } else {
    console.error(`❌ [FAIL] ${testName} - ${details}`);
  }
}

const settings = getDefaultLegalSettings();
const brackets = getDefaultTaxBrackets();

// ========================================================================
// TEST 1: Mandatory Benchmark Scenario from Section 6 of Prompt
// Basic: 750,000 IQD, Married, 4 children, SS 5% emp, 12% employer.
// Expected SS: Emp 37,500 | Empr 90,000 | Total 127,500 | Net before tax 712,500
// ========================================================================
console.log('\n--- 1. Section 6 Benchmark Test Scenario ---');
const empBenchmark = {
  id: 'EMP_BENCH_01',
  basic_salary: 750000,
  marital_status: 'married',
  children_count: 4,
  spouse_has_income: false,
  is_ss_tax_exempt: false,
  allowances: {}
};

const benchRes = calculateCombinedPayrollTaxAndSecurity(empBenchmark, settings, brackets);

assert(benchRes.item_5_employee_ss_amount === 37500, 'Section 6: Employee SS deduction is exactly 37,500 IQD', `Got ${benchRes.item_5_employee_ss_amount}`);
assert(benchRes.item_6_employer_ss_amount === 90000, 'Section 6: Employer SS contribution is exactly 90,000 IQD', `Got ${benchRes.item_6_employer_ss_amount}`);
assert(benchRes.social_security.total_insurance === 127500, 'Section 6: Total SS contribution is exactly 127,500 IQD', `Got ${benchRes.social_security.total_insurance}`);
assert(benchRes.social_security.net_salary_before_tax === 712500, 'Section 6: Net salary before tax is exactly 712,500 IQD', `Got ${benchRes.social_security.net_salary_before_tax}`);

// Verify that Tax is calculated dynamically from settings, not hardcoded
const expectedAnnualGross = 750000 * 12; // 9,000,000
const expectedPersonal = 2500000;
const expectedSpouse = 2000000;
const expectedChildren = 4 * 200000; // 800,000
const expectedTotalAllowances = expectedPersonal + expectedSpouse + expectedChildren; // 5,300,000
const expectedDeductibleSS = 37500 * 12; // 450,000
const expectedTaxableBase = Math.max(0, expectedAnnualGross - expectedTotalAllowances - expectedDeductibleSS); // 9,000,000 - 5,300,000 - 450,000 = 3,250,000 IQD

assert(benchRes.item_7_annual_gross_taxable_income === expectedAnnualGross, 'Benchmark: Annual Gross is 9,000,000 IQD');
assert(benchRes.item_8_personal_allowance === expectedPersonal, 'Benchmark: Personal Allowance is 2,500,000 IQD');
assert(benchRes.item_9_spouse_allowance_amount === expectedSpouse, 'Benchmark: Spouse Allowance is 2,000,000 IQD');
assert(benchRes.item_10_children_allowance_total === expectedChildren, 'Benchmark: 4 Children Allowance is 800,000 IQD');
assert(benchRes.item_11_tax_deductible_insurance === expectedDeductibleSS, 'Benchmark: Deductible SS is 450,000 IQD');
assert(benchRes.item_12_taxable_income_base === expectedTaxableBase, `Benchmark: Taxable Income Base is ${expectedTaxableBase} IQD`, `Got ${benchRes.item_12_taxable_income_base}`);
assert(benchRes.item_15_annual_tax > 0, 'Benchmark: Annual tax calculated dynamically across brackets');

// ========================================================================
// TEST 2: Salary below exemption limit (Tax = 0)
// ========================================================================
console.log('\n--- 2. Salary Below Tax Exemption Limit ---');
const empLow = {
  id: 'EMP_LOW',
  basic_salary: 350000, // Annual = 4,200,000. Allowances for married + 2 kids = 2.5M + 2M + 0.4M = 4.9M > Gross
  marital_status: 'married',
  children_count: 2,
  spouse_has_income: false,
  allowances: {}
};
const lowRes = calculateCombinedPayrollTaxAndSecurity(empLow, settings, brackets);
assert(lowRes.item_12_taxable_income_base === 0, 'Low salary taxable base is 0 IQD');
assert(lowRes.item_15_annual_tax === 0, 'Low salary annual tax is 0 IQD');
assert(lowRes.item_16_monthly_tax === 0, 'Low salary monthly tax is 0 IQD');

// ========================================================================
// TEST 3: Single employee (Personal allowance only, no spouse/child)
// ========================================================================
console.log('\n--- 3. Single Employee Allowances Verification ---');
const empSingle = {
  id: 'EMP_SINGLE',
  basic_salary: 800000,
  marital_status: 'single',
  children_count: 0,
  allowances: {}
};
const singleRes = calculateCombinedPayrollTaxAndSecurity(empSingle, settings, brackets);
assert(singleRes.item_8_personal_allowance === 2500000, 'Single employee gets personal allowance');
assert(singleRes.item_9_spouse_allowance_amount === 0, 'Single employee gets 0 spouse allowance');
assert(singleRes.item_9_spouse_eligible === false, 'Single employee spouse eligibility is false');
assert(singleRes.item_10_children_allowance_total === 0, 'Single employee children allowance is 0');

// ========================================================================
// TEST 4: Spouse with income vs Spouse without income
// ========================================================================
console.log('\n--- 4. Spouse Income Condition Verification ---');
const empSpouseWorking = {
  id: 'EMP_SPOUSE_WORK',
  basic_salary: 800000,
  marital_status: 'married',
  spouse_has_income: true, // Working spouse
  children_count: 0
};
const spouseWorkingRes = calculateCombinedPayrollTaxAndSecurity(empSpouseWorking, settings, brackets);
assert(spouseWorkingRes.item_9_spouse_allowance_amount === 0, 'Working spouse: Spouse allowance is 0 IQD');
assert(spouseWorkingRes.item_9_spouse_eligible === false, 'Working spouse: Spouse eligibility is false');

const empSpouseNonWorking = {
  id: 'EMP_SPOUSE_NOWORK',
  basic_salary: 800000,
  marital_status: 'married',
  spouse_has_income: false, // Non-working spouse
  children_count: 0
};
const spouseNoWorkRes = calculateCombinedPayrollTaxAndSecurity(empSpouseNonWorking, settings, brackets);
assert(spouseNoWorkRes.item_9_spouse_allowance_amount === 2000000, 'Non-working spouse: Spouse allowance is 2,000,000 IQD');
assert(spouseNoWorkRes.item_9_spouse_eligible === true, 'Non-working spouse: Spouse eligibility is true');

// ========================================================================
// TEST 5: Children count capping at eligible_children_limit (4)
// ========================================================================
console.log('\n--- 5. Children Limit Capping Verification ---');
const emp6Kids = {
  id: 'EMP_6_KIDS',
  basic_salary: 1000000,
  marital_status: 'married',
  children_count: 6, // 6 kids, but limit is 4
  spouse_has_income: false
};
const kidsRes = calculateCombinedPayrollTaxAndSecurity(emp6Kids, settings, brackets);
assert(kidsRes.item_10_eligible_children_count === 4, 'Children count capped at 4 eligible children');
assert(kidsRes.item_10_children_allowance_total === 800000, 'Total children allowance capped at 800,000 IQD (4 × 200,000)');

// ========================================================================
// TEST 6: High earner traversing multiple progressive tax brackets
// ========================================================================
console.log('\n--- 6. Multi-Bracket Traversal Verification ---');
const empHigh = {
  id: 'EMP_HIGH',
  basic_salary: 3000000, // 3M/mo -> 36M/yr
  marital_status: 'single',
  children_count: 0
};
const highRes = calculateCombinedPayrollTaxAndSecurity(empHigh, settings, brackets);
const activeBreakdown = highRes.item_14_brackets_tax_breakdown.filter(b => b.bracket_income > 0);
assert(activeBreakdown.length === 4, 'High earner traverses all 4 tax brackets (3%, 5%, 10%, 15%)');
assert(activeBreakdown[0].tax_rate === 3, 'First bracket rate is 3%');
assert(activeBreakdown[1].tax_rate === 5, 'Second bracket rate is 5%');
assert(activeBreakdown[2].tax_rate === 10, 'Third bracket rate is 10%');
assert(activeBreakdown[3].tax_rate === 15, 'Fourth bracket rate is 15%');

// ========================================================================
// TEST 7: Social Security Minimum Floor and Maximum Ceiling
// ========================================================================
console.log('\n--- 7. Social Security Minimum Floor and Maximum Cap ---');
const empUnderFloor = {
  id: 'EMP_FLOOR',
  basic_salary: 200000, // Under 350,000 min limit
  marital_status: 'single'
};
const floorRes = calculateSocialSecurity(empUnderFloor, settings);
assert(floorRes.insured_base === 350000, 'SS Base elevated to statutory minimum floor (350,000 IQD)');
assert(floorRes.employee_insurance === 17500, 'SS Employee deduction on floor is 17,500 IQD (5% of 350k)');

const empAboveCeiling = {
  id: 'EMP_CEIL',
  basic_salary: 7000000, // Above 5,000,000 max limit
  marital_status: 'single'
};
const ceilRes = calculateSocialSecurity(empAboveCeiling, settings);
assert(ceilRes.insured_base === 5000000, 'SS Base capped at statutory maximum ceiling (5,000,000 IQD)');
assert(ceilRes.employee_insurance === 250000, 'SS Employee deduction capped at 250,000 IQD (5% of 5M)');
assert(ceilRes.employer_insurance === 600000, 'SS Employer contribution capped at 600,000 IQD (12% of 5M)');

// ========================================================================
// TEST 8: Wage Components Discrimination (Eligible vs Non-Eligible)
// ========================================================================
console.log('\n--- 8. Wage Components Classification Verification ---');
const empComponents = {
  id: 'EMP_COMP',
  basic_salary: 1000000,
  marital_status: 'single',
  allowances: {
    housing: 200000,
    transport: 100000,
    overtime: 150000, // Taxable, but not in SS default components
    bonus: 50000
  }
};
const compRes = calculateCombinedPayrollTaxAndSecurity(empComponents, settings, brackets);
assert(compRes.item_4_insured_salary_base === 1300000, 'SS Base includes basic + housing + transport (1.3M IQD)');
assert(compRes.item_2_taxable_components_monthly === 1500000, 'Taxable income includes all wage components (1.5M IQD)');

// ========================================================================
// TEST 9: Tax Bracket Validation - Gap & Overlap Detection
// ========================================================================
console.log('\n--- 9. Bracket Validation (Gaps & Overlaps) ---');
const validBrackets = getDefaultTaxBrackets();
const val1 = validateTaxBrackets(validBrackets);
assert(val1.isValid === true && val1.errors.length === 0, 'Default brackets pass validation with 0 errors');

// Corrupted with Gap
const gapBrackets = [
  { ...validBrackets[0], max_income: 200000 },
  { ...validBrackets[1], min_income: 250000 } // Gap from 200k to 250k
];
const valGap = validateTaxBrackets(gapBrackets);
assert(valGap.isValid === false, 'Gap detection triggers validation failure');
assert(valGap.errors.some(e => e.includes('فجوة ضريبية')), 'Error message explicitly reports tax gap');

// Corrupted with Overlap
const overlapBrackets = [
  { ...validBrackets[0], max_income: 300000 },
  { ...validBrackets[1], min_income: 250000 } // Overlap from 250k to 300k
];
const valOverlap = validateTaxBrackets(overlapBrackets);
assert(valOverlap.isValid === false, 'Overlap detection triggers validation failure');
assert(valOverlap.errors.some(e => e.includes('تداخل ضريبي')), 'Error message explicitly reports overlap');

// ========================================================================
// TEST 10: Exempt Employee Verification (SS = 0, Tax = 0)
// ========================================================================
console.log('\n--- 10. Exempt Employee Verification ---');
const empExempt = {
  id: 'EMP_EXEMPT',
  basic_salary: 2000000,
  marital_status: 'married',
  children_count: 3,
  is_ss_tax_exempt: true,
  exemption_reason: 'قانون الاستثمار والخبراء الأجانب'
};
const exemptRes = calculateCombinedPayrollTaxAndSecurity(empExempt, settings, brackets);
assert(exemptRes.item_5_employee_ss_amount === 0, 'Exempt employee has 0 employee SS');
assert(exemptRes.item_6_employer_ss_amount === 0, 'Exempt employee has 0 employer SS');
assert(exemptRes.item_16_monthly_tax === 0, 'Exempt employee has 0 monthly tax');
assert(exemptRes.item_17_net_salary === 2000000, 'Exempt employee receives 100% of salary without statutory deductions');

// ========================================================================
// TEST 11: Dynamic Reflection of Settings Changes (Zero Hardcoding)
// ========================================================================
console.log('\n--- 11. Dynamic Reflection of Settings Changes ---');
const modifiedSettings = {
  ...settings,
  ss_employee_rate: 7.0, // Changed from 5% to 7%
  ss_employer_rate: 15.0, // Changed from 12% to 15%
  tax_personal_allowance: 3000000 // Changed from 2.5M to 3M
};
const dynamicRes = calculateCombinedPayrollTaxAndSecurity(empBenchmark, modifiedSettings, brackets);
assert(dynamicRes.item_5_employee_ss_rate === 7.0, 'Dynamic settings reflect new employee SS rate (7%)');
assert(dynamicRes.item_5_employee_ss_amount === 750000 * 0.07, 'Employee deduction dynamically recalculates to 52,500 IQD');
assert(dynamicRes.item_6_employer_ss_amount === 750000 * 0.15, 'Employer contribution dynamically recalculates to 112,500 IQD');
assert(dynamicRes.item_8_personal_allowance === 3000000, 'Personal allowance dynamically updates to 3,000,000 IQD');

// ========================================================================
// SUMMARY
// ========================================================================
console.log('\n========================================================================');
console.log(`📊 TEST SUITE SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests/totalTests)*100)}%)`);
console.log('========================================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
