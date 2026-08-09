import config from '../database/config.mjs';
import mysql from 'mysql2/promise';

async function seedTaxData() {
  try {
    const conn = await mysql.createConnection(config);
    console.log('Connected to MySQL database:', config.database);

    // 1. Seed tax_calculation_variables
    const [existingVars] = await conn.query('SELECT COUNT(*) as count FROM tax_calculation_variables');
    if (existingVars[0].count === 0) {
      const variables = [
        ['var_1', 'BASIC_SALARY', 'الراتب الأساسي', 'Basic Salary', 'INPUT', 'CURRENCY', 'الراتب الاساسي للموظف المحدد في عقد العمل', 'Base contractual monthly salary of employee', 1, '1200000', 'EMPLOYEE_PROFILE', JSON.stringify({ table: 'employees', column: 'basic_salary' }), 'employees', 'basic_salary', 1, 'ACTIVE'],
        ['var_2', 'TOTAL_ALLOWANCES', 'إجمالي المخصصات والبدلات', 'Total Allowances', 'INPUT', 'CURRENCY', 'مجموع المخصصات الثابتة (سكن، نقل، معيشة، طعام، مهنة)', 'Sum of all monthly allowances', 1, '300000', 'CALCULATED_AGGREGATE', JSON.stringify({ formula_expression: 'housing + transport + living + food + other' }), 'employees', 'allowances_total', 1, 'ACTIVE'],
        ['var_3', 'GROSS_SALARY', 'الراتب الإجمالي (الأجر الإجمالي)', 'Gross Salary', 'INTERMEDIATE', 'CURRENCY', 'مجموع الراتب الأساسي والمخصصات الخاضعة', 'Sum of basic salary and all applicable allowances', 1, '0', 'CALCULATED_AGGREGATE', JSON.stringify({ formula_expression: 'BASIC_SALARY + TOTAL_ALLOWANCES' }), null, null, 0, 'ACTIVE'],
        ['var_4', 'SOCIAL_SECURITY_BASE', 'أجر الاشتراك الخاضع للضمان', 'Social Security Contribution Base', 'INTERMEDIATE', 'CURRENCY', 'الوعاء المعتمد لحساب الضمان بعد تطبيق الحدود الدنيا والعليا', 'Applicable salary base after applying min and max caps', 1, '0', 'COMPANY_POLICY', JSON.stringify({ parameter_code: 'SS_MIN_BASE / SS_MAX_BASE' }), null, null, 0, 'ACTIVE'],
        ['var_5', 'EMPLOYEE_SOCIAL_SECURITY', 'حصة الموظف من الضمان الاجتماعي', 'Employee Social Security Contribution', 'OUTPUT', 'CURRENCY', 'نسبة الاستقطاع الشهري من راتب الموظف للضمان (5%)', 'Monthly social security deduction from employee salary', 1, '0', 'TAX_TABLE', JSON.stringify({ parameter_code: 'SS_EMPLOYEE_RATE' }), null, null, 0, 'ACTIVE'],
        ['var_6', 'EMPLOYER_SOCIAL_SECURITY', 'مساهمة جهة العمل في الضمان', 'Employer Social Security Contribution', 'OUTPUT', 'CURRENCY', 'حصة صاحب العمل المدفوعة لصندوق التقاعد والضمان (12%)', 'Employer contribution payable to social security fund', 1, '0', 'TAX_TABLE', JSON.stringify({ parameter_code: 'SS_EMPLOYER_RATE' }), null, null, 0, 'ACTIVE'],
        ['var_7', 'TAX_EXEMPTION', 'الإعفاءات الضريبية القانونية', 'Total Tax Exemptions', 'INTERMEDIATE', 'CURRENCY', 'مجموع الإعفاء الشخصي، إعفاء الزوجة، إعفاء الأبناء، وحصة الضمان', 'Sum of statutory tax exemptions under Law No. 113', 1, '0', 'TAX_TABLE', JSON.stringify({ description: 'Aggregated legal tax allowances' }), null, null, 0, 'ACTIVE'],
        ['var_8', 'TAXABLE_INCOME', 'الدخل الخاضع لضريبة الدخل', 'Taxable Income Base', 'INTERMEDIATE', 'CURRENCY', 'الدخل الإجمالي بعد طرح الاستقطاعات والإعفاءات المسموحة', 'Net taxable income base subject to progressive tax brackets', 1, '0', 'CALCULATED_AGGREGATE', null, null, null, 0, 'ACTIVE'],
        ['var_9', 'DEPENDENTS_COUNT', 'عدد المعالين / الأطفال', 'Dependents Count', 'INPUT', 'NUMBER', 'عدد أفراد العائلة أو الأطفال المشمولين بالإعفاء الضريبي', 'Number of eligible family dependents', 1, '2', 'EMPLOYEE_PROFILE', JSON.stringify({ table: 'employees', column: 'children_details' }), 'employees', 'children_details', 1, 'ACTIVE'],
        ['var_10', 'TAX_AMOUNT', 'مبلغ ضريبة الدخل المستحقة', 'Income Tax Amount', 'OUTPUT', 'CURRENCY', 'مبلغ ضريبة الدخل المستقطع شهرياً بحسب الشرائح', 'Monthly income tax calculated across progressive brackets', 1, '0', 'TAX_TABLE', null, null, null, 0, 'ACTIVE'],
        ['var_11', 'TOTAL_DEDUCTIONS', 'إجمالي الاستقطاعات القانونية', 'Total Statutory Deductions', 'OUTPUT', 'CURRENCY', 'مجموع استقطاع الضمان الضريبة والتأمين', 'Total legal deductions', 1, '0', 'CALCULATED_AGGREGATE', null, null, null, 0, 'ACTIVE'],
        ['var_12', 'NET_SALARY', 'صافي الراتب المستحق للصرف', 'Net Payable Salary', 'OUTPUT', 'CURRENCY', 'الراتب الصافي النهائي المحول لحساب الموظف المصرفي', 'Final net salary transferred to employee bank account', 1, '0', 'CALCULATED_AGGREGATE', null, null, null, 0, 'ACTIVE']
      ];

      for (const v of variables) {
        await conn.query(
          `INSERT INTO tax_calculation_variables (id, code, name_ar, name_en, category, data_type, description_ar, description_en, is_system, default_value, source_type, source_mapping, source_table, source_column, is_input, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          v
        );
      }
      console.log('Seeded tax_calculation_variables successfully.');
    }

    // 2. Seed tax_calculation_parameters
    const [existingParams] = await conn.query('SELECT COUNT(*) as count FROM tax_calculation_parameters');
    if (existingParams[0].count === 0) {
      const parameters = [
        ['param_1', 'SS_EMPLOYEE_RATE', 'نسبة الضمان الاجتماعي - حصة الموظف', 'Employee Social Security Contribution Rate', 5.0, '%', '2023-01-01', null, 'نسبة الاستقطاع الإلزامي من أجر الموظف بموجب قانون التقاعد والضمان الاجتماعي رقم 18 لسنة 2023', 'Statutory employee contribution rate under Law No. 18 of 2023', 'ACTIVE'],
        ['param_2', 'SS_EMPLOYER_RATE', 'نسبة الضمان الاجتماعي - حصة صاحب العمل', 'Employer Social Security Contribution Rate', 12.0, '%', '2023-01-01', null, 'نسبة المساهمة الإلزامية التي يدفعها صاحب العمل لحساب صندوق التقاعد والضمان الاجتماعي (12%)', 'Statutory employer contribution rate payable to social security fund', 'ACTIVE'],
        ['param_3', 'SS_MIN_BASE', 'الحد الأدنى لأجر الاشتراك بالضمان', 'Minimum Social Security Contribution Floor', 350000.0, 'IQD', '2023-01-01', null, 'الحد الأدنى المقبول قانوناً لأجر الاشتراك الشهري للعمال والشركات بالضمان الاجتماعي', 'Minimum statutory monthly salary floor for social security calculations', 'ACTIVE'],
        ['param_4', 'SS_MAX_BASE', 'الحد الأعلى لأجر الاشتراك بالضمان', 'Maximum Social Security Contribution Ceiling', 5000000.0, 'IQD', '2023-01-01', null, 'الحد الأقصى لأجر الاشتراك بالضمان الخاضع للاستقطاع', 'Maximum monthly salary cap subject to social security contribution', 'ACTIVE'],
        ['param_5', 'TAX_PERSONAL_EXEMPTION', 'الإعفاء الشخصي السنوي للمكلف', 'Personal Annual Tax Exemption', 2500000.0, 'IQD', '2024-01-01', null, 'مبلغ الإعفاء الشخصي السنوي المقر قانوناً للمقيم بدون معالين بموجب قانون ضريبة الدخل رقم 113', 'Annual statutory tax deduction allowance for personal individual taxpayer', 'ACTIVE'],
        ['param_6', 'TAX_SPOUSE_EXEMPTION', 'إعفاء الزوجة السنوي المقر', 'Spouse Annual Tax Exemption Allowance', 2000000.0, 'IQD', '2024-01-01', null, 'مبلغ الإعفاء السنوي الإضافي الممنوح للزوج المقيم عن زوجته التي لا تتقاضى راتباً', 'Additional annual tax exemption for non-working spouse', 'ACTIVE'],
        ['param_7', 'TAX_DEPENDENT_EXEMPTION', 'إعفاء الابن/الطفل السنوي', 'Per Dependent Child Annual Exemption', 200000.0, 'IQD', '2024-01-01', null, 'مبلغ الإعفاء السنوي الممنوح لكل طفل/معيل يستوفي الشروط القانونية (حتى 18 سنة)', 'Annual tax exemption granted per dependent child below 18 years', 'ACTIVE']
      ];

      for (const p of parameters) {
        await conn.query(
          `INSERT INTO tax_calculation_parameters (id, code, name_ar, name_en, value, unit, effective_from, effective_to, description_ar, description_en, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          p
        );
      }
      console.log('Seeded tax_calculation_parameters successfully.');
    }

    // 3. Seed tax_calculation_rules
    const [existingRules] = await conn.query('SELECT COUNT(*) as count FROM tax_calculation_rules');
    if (existingRules[0].count === 0) {
      const rules = [
        ['rule_1', 'GROSS_SALARY', 'GENERAL_PAYROLL', 'حساب الراتب الإجمالي', 'Calculate Gross Salary', 'FORMULA', 'حساب مجموع الراتب الأساسي والبدلات المباشرة الخاضعة', 'Calculates sum of basic salary and all allowances', 1, 'GROSS_SALARY', JSON.stringify(['BASIC_SALARY', 'TOTAL_ALLOWANCES']), 'ver_gross_1', 'ACTIVE', '2024-01-01', null],
        ['rule_2', 'SOCIAL_SECURITY_BASE', 'SOCIAL_SECURITY', 'تحديد وعاء الضمان الاجتماعي', 'Determine Social Security Salary Base', 'FORMULA', 'تطبيق الحدود الدنيا والعليا لأجر الاشتراك المشمول بالضمان', 'Applies statutory minimum and maximum salary limits to social security base', 2, 'SOCIAL_SECURITY_BASE', JSON.stringify(['GROSS_SALARY', 'SS_MIN_BASE', 'SS_MAX_BASE']), 'ver_ss_base_1', 'ACTIVE', '2023-01-01', null],
        ['rule_3', 'EMPLOYEE_SOCIAL_SECURITY', 'SOCIAL_SECURITY', 'استقطاع الضمان الاجتماعي من الموظف', 'Employee Social Security Contribution', 'PERCENTAGE', 'حساب حصة استقطاع العامل من الضمان الاجتماعي (5%)', 'Calculates mandatory 5% employee social security deduction', 3, 'EMPLOYEE_SOCIAL_SECURITY', JSON.stringify(['SOCIAL_SECURITY_BASE', 'SS_EMPLOYEE_RATE']), 'ver_ss_emp_1', 'ACTIVE', '2023-01-01', null],
        ['rule_4', 'EMPLOYER_SOCIAL_SECURITY', 'SOCIAL_SECURITY', 'مساهمة جهة العمل في الضمان الاجتماعي', 'Employer Social Security Contribution', 'PERCENTAGE', 'حساب حصة مساهمة صاحب العمل لصندوق الضمان الاجتماعي (12%)', 'Calculates 12% employer social security contribution', 4, 'EMPLOYER_SOCIAL_SECURITY', JSON.stringify(['SOCIAL_SECURITY_BASE', 'SS_EMPLOYER_RATE']), 'ver_ss_empr_1', 'ACTIVE', '2023-01-01', null],
        ['rule_5', 'TAX_EXEMPTION', 'EXEMPTION', 'حساب الإعفاءات الضريبية القانونية', 'Calculate Statutory Tax Exemptions', 'FORMULA', 'تجميع الإعفاء الشخصي وإعفاءات العائلة واستقطاع الضمان الاجتماعي المسموح', 'Aggregates personal, family exemptions and employee social security deduction', 5, 'TAX_EXEMPTION', JSON.stringify(['DEPENDENTS_COUNT', 'EMPLOYEE_SOCIAL_SECURITY', 'TAX_PERSONAL_EXEMPTION', 'TAX_SPOUSE_EXEMPTION', 'TAX_DEPENDENT_EXEMPTION']), 'ver_exemp_1', 'ACTIVE', '2024-01-01', null],
        ['rule_6', 'TAXABLE_INCOME', 'INCOME_TAX', 'احتساب الوعاء الخاضع لضريبة الدخل', 'Calculate Taxable Income Base', 'FORMULA', 'طرح الإعفاءات والاستقطاعات المسموحة من الراتب الإجمالي', 'Subtracts tax exemptions from gross monthly salary', 6, 'TAXABLE_INCOME', JSON.stringify(['GROSS_SALARY', 'TAX_EXEMPTION']), 'ver_taxable_1', 'ACTIVE', '2024-01-01', null],
        ['rule_7', 'TAX_AMOUNT', 'INCOME_TAX', 'حساب ضريبة الدخل على الشرائح التصاعدية', 'Compute Income Tax via Progressive Brackets', 'PROGRESSIVE_TAX', 'تطبيق الشرائح الضريبية الرسمية العراقية بموجب قانون 113 وتعديلاته', 'Computes income tax across official statutory progressive tax brackets', 7, 'TAX_AMOUNT', JSON.stringify(['TAXABLE_INCOME']), 'ver_tax_1', 'ACTIVE', '2024-01-01', null],
        ['rule_8', 'TOTAL_DEDUCTIONS', 'GENERAL_PAYROLL', 'حساب إجمالي الاستقطاعات القانونية', 'Calculate Total Statutory Deductions', 'FORMULA', 'مجموع استقطاع الضمان الاجتماعي وضريبة الدخل المقررة والتأمين', 'Calculates total statutory deductions (SS + Tax + Insurance)', 8, 'TOTAL_DEDUCTIONS', JSON.stringify(['EMPLOYEE_SOCIAL_SECURITY', 'TAX_AMOUNT']), 'ver_ded_1', 'ACTIVE', '2024-01-01', null],
        ['rule_9', 'NET_SALARY', 'GENERAL_PAYROLL', 'احتساب صافي الراتب المستحق للصرف', 'Calculate Net Payable Salary', 'FORMULA', 'طرح إجمالي الاستقطاعات القانونية من الراتب الإجمالي', 'Calculates net payable salary transferred to employee', 9, 'NET_SALARY', JSON.stringify(['GROSS_SALARY', 'TOTAL_DEDUCTIONS']), 'ver_net_1', 'ACTIVE', '2024-01-01', null]
      ];

      for (const r of rules) {
        await conn.query(
          `INSERT INTO tax_calculation_rules (id, code, category, name_ar, name_en, rule_type, description_ar, description_en, execution_order, output_variable, dependencies, active_version_id, status, effective_from, effective_to) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          r
        );
      }
      console.log('Seeded tax_calculation_rules successfully.');
    }

    // 4. Seed tax_rule_versions
    const [existingVersions] = await conn.query('SELECT COUNT(*) as count FROM tax_rule_versions');
    if (existingVersions[0].count === 0) {
      const versions = [
        ['ver_gross_1', 'rule_1', 1, 'v1.0', 'BASIC_SALARY + TOTAL_ALLOWANCES', null, '2024-01-01', null, 'ACTIVE', 'نسخة مبدئية لحساب الراتب الإجمالي', '2024-01-01 00:00:00', 'SUPER_ADMIN', '2024-01-01 00:00:00'],
        ['ver_ss_base_1', 'rule_2', 1, 'v1.0', 'CLAMP(GROSS_SALARY, SS_MIN_BASE, SS_MAX_BASE)', null, '2023-01-01', null, 'ACTIVE', 'نسخة مبدئية لوعاء الضمان الاجتماعي بموجب قانون الضمان رقم 18', '2023-01-01 00:00:00', 'SUPER_ADMIN', '2023-01-01 00:00:00'],
        ['ver_ss_emp_1', 'rule_3', 1, 'v1.0', 'SOCIAL_SECURITY_BASE * (SS_EMPLOYEE_RATE / 100)', null, '2023-01-01', null, 'ACTIVE', 'حصة الموظف 5% من أجر الاشتراك في الضمان الاجتماعي', '2023-01-01 00:00:00', 'SUPER_ADMIN', '2023-01-01 00:00:00'],
        ['ver_ss_empr_1', 'rule_4', 1, 'v1.0', 'SOCIAL_SECURITY_BASE * (SS_EMPLOYER_RATE / 100)', null, '2023-01-01', null, 'ACTIVE', 'حصة صاحب العمل 12% للضمان الاجتماعي', '2023-01-01 00:00:00', 'SUPER_ADMIN', '2023-01-01 00:00:00'],
        ['ver_exemp_1', 'rule_5', 1, 'v1.0', '(TAX_PERSONAL_EXEMPTION / 12) + (TAX_SPOUSE_EXEMPTION / 12) + (DEPENDENTS_COUNT * (TAX_DEPENDENT_EXEMPTION / 12)) + EMPLOYEE_SOCIAL_SECURITY', null, '2024-01-01', null, 'ACTIVE', 'نسخة حساب الإعفاءات القانونية الشهرية لضريبة الدخل', '2024-01-01 00:00:00', 'SUPER_ADMIN', '2024-01-01 00:00:00'],
        ['ver_taxable_1', 'rule_6', 1, 'v1.0', 'MAX(0, GROSS_SALARY - TAX_EXEMPTION)', null, '2024-01-01', null, 'ACTIVE', 'حساب صافي الوعاء الشهري الخاضع للضريبة', '2024-01-01 00:00:00', 'SUPER_ADMIN', '2024-01-01 00:00:00'],
        ['ver_tax_1', 'rule_7', 1, 'v1.0', 'PROGRESSIVE_BRACKETS_CALCULATOR', null, '2024-01-01', null, 'ACTIVE', 'تطبيق شرائح ضريبة الدخل بموجب تعديلات قانون 113', '2024-01-01 00:00:00', 'SUPER_ADMIN', '2024-01-01 00:00:00'],
        ['ver_ded_1', 'rule_8', 1, 'v1.0', 'EMPLOYEE_SOCIAL_SECURITY + TAX_AMOUNT + 25000', null, '2024-01-01', null, 'ACTIVE', 'مجموع استقطاع الضمان والضريبة والتأمين', '2024-01-01 00:00:00', 'SUPER_ADMIN', '2024-01-01 00:00:00'],
        ['ver_net_1', 'rule_9', 1, 'v1.0', 'GROSS_SALARY - TOTAL_DEDUCTIONS', null, '2024-01-01', null, 'ACTIVE', 'صافي الراتب النهائي بعد طرح جميع الاستقطاعات', '2024-01-01 00:00:00', 'SUPER_ADMIN', '2024-01-01 00:00:00']
      ];

      for (const v of versions) {
        await conn.query(
          `INSERT INTO tax_rule_versions (id, rule_id, version_number, version_code, formula_or_query, parameters_json, effective_from, effective_to, status, change_notes, created_at, created_by, activated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          v
        );
      }
      console.log('Seeded tax_rule_versions successfully.');
    }

    // 5. Seed tax_brackets
    const [existingBrackets] = await conn.query('SELECT COUNT(*) as count FROM tax_brackets');
    if (existingBrackets[0].count === 0) {
      const brackets = [
        ['brk_1', 'ver_tax_1', 1, 'الشريحة الأولى (حتى 250,000 د.ع)', 'First Bracket (0 - 250k IQD)', 0.0, 250000.0, 3.0, 0.0, '2024-01-01', null, 'ACTIVE'],
        ['brk_2', 'ver_tax_1', 2, 'الشريحة الثانية (250,001 - 500,000 د.ع)', 'Second Bracket (250k - 500k IQD)', 250000.0, 500000.0, 5.0, 0.0, '2024-01-01', null, 'ACTIVE'],
        ['brk_3', 'ver_tax_1', 3, 'الشريحة الثالثة (500,001 - 1,000,000 د.ع)', 'Third Bracket (500k - 1M IQD)', 500000.0, 1000000.0, 10.0, 0.0, '2024-01-01', null, 'ACTIVE'],
        ['brk_4', 'ver_tax_1', 4, 'الشريحة الرابعة (ما زاد عن 1,000,000 د.ع)', 'Fourth Bracket (Above 1M IQD)', 1000000.0, null, 15.0, 0.0, '2024-01-01', null, 'ACTIVE']
      ];

      for (const b of brackets) {
        await conn.query(
          `INSERT INTO tax_brackets (id, rule_version_id, bracket_order, name_ar, name_en, min_income, max_income, tax_rate, fixed_tax, effective_from, effective_to, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          b
        );
      }
      console.log('Seeded tax_brackets successfully.');
    }

    console.log('All statutory tax data seeded successfully into MySQL!');
    await conn.end();
  } catch (err) {
    console.error('Error seeding tax data:', err.message);
  }
}

seedTaxData();
