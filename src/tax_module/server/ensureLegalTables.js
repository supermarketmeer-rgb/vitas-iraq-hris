/**
 * ensureLegalTables.js
 * Ensures required database tables for Iraqi Social Security & Income Tax Engine
 * Conforming to:
 * - Iraqi Retirement & Social Security Law No. 18 of 2023 (Private Sector)
 * - Iraqi Income Tax Law No. 113 of 1982 and applicable amendments
 */

export async function ensureLegalTables(query) {
  try {
    // 1. Create payroll_legal_settings table
    await query(`
      CREATE TABLE IF NOT EXISTS payroll_legal_settings (
        id VARCHAR(100) PRIMARY KEY,
        version_code VARCHAR(50) NOT NULL,
        version_name VARCHAR(255) NOT NULL,
        status ENUM('ACTIVE', 'DRAFT', 'ARCHIVED') DEFAULT 'ACTIVE',
        effective_from DATE NOT NULL,
        effective_to DATE NULL,
        
        -- Social Security Parameters (Law 18 of 2023)
        ss_employee_rate DECIMAL(5,2) NOT NULL DEFAULT 5.00,
        ss_employer_rate DECIMAL(5,2) NOT NULL DEFAULT 12.00,
        ss_insured_salary_rate DECIMAL(5,2) NOT NULL DEFAULT 100.00,
        ss_minimum_insured_salary DECIMAL(15,2) NULL DEFAULT 350000.00,
        ss_maximum_insured_salary DECIMAL(15,2) NULL DEFAULT 5000000.00,
        ss_eligible_components JSON NULL,

        -- Tax Allowances & Deductions (Law 113 of 1982)
        tax_personal_allowance DECIMAL(15,2) NOT NULL DEFAULT 2500000.00,
        tax_spouse_allowance DECIMAL(15,2) NOT NULL DEFAULT 2000000.00,
        tax_child_allowance DECIMAL(15,2) NOT NULL DEFAULT 200000.00,
        tax_eligible_children_limit INT NOT NULL DEFAULT 4,
        tax_spouse_income_condition TINYINT(1) NOT NULL DEFAULT 1,
        tax_employee_insurance_deductible TINYINT(1) NOT NULL DEFAULT 1,
        tax_other_allowed_deductions DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        tax_taxable_income_method VARCHAR(50) NOT NULL DEFAULT 'ANNUAL_STANDARD',

        -- Income Tax General Parameters
        tax_payroll_periods_per_year INT NOT NULL DEFAULT 12,
        tax_rounding_method VARCHAR(50) NOT NULL DEFAULT 'NEAREST_1000',
        tax_eligible_components JSON NULL,

        -- Documentation & Audit
        legal_reference TEXT NULL,
        notes TEXT NULL,
        created_by VARCHAR(100) NULL,
        updated_by VARCHAR(100) NULL,
        approved_by VARCHAR(100) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. Ensure columns in tax_brackets
    const bracketCols = await query('DESCRIBE tax_brackets').catch(() => []);
    const colNames = bracketCols.map(c => c.Field);
    
    if (!colNames.includes('calculation_method')) {
      await query(`ALTER TABLE tax_brackets ADD COLUMN calculation_method VARCHAR(50) DEFAULT 'PROGRESSIVE_TIER' AFTER fixed_tax`).catch(() => {});
    }
    if (!colNames.includes('legal_reference')) {
      await query(`ALTER TABLE tax_brackets ADD COLUMN legal_reference VARCHAR(255) NULL AFTER calculation_method`).catch(() => {});
    }
    if (!colNames.includes('notes')) {
      await query(`ALTER TABLE tax_brackets ADD COLUMN notes TEXT NULL AFTER legal_reference`).catch(() => {});
    }

    // 3. Ensure tax_audit_logs exists
    await query(`
      CREATE TABLE IF NOT EXISTS tax_audit_logs (
        id VARCHAR(100) PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user VARCHAR(100) NOT NULL,
        role VARCHAR(100) NOT NULL,
        action VARCHAR(100) NOT NULL,
        target_entity VARCHAR(100) NOT NULL,
        target_id VARCHAR(100) NULL,
        target_name_ar VARCHAR(255) NULL,
        summary_ar TEXT NULL,
        summary_en TEXT NULL,
        details_before LONGTEXT NULL,
        details_after LONGTEXT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 4. Seed initial active legal settings record if table is empty
    const [existingCount] = await query('SELECT COUNT(*) as cnt FROM payroll_legal_settings').catch(() => [{ cnt: 0 }]);
    if (!existingCount || existingCount.cnt === 0) {
      const defaultEligibleSS = JSON.stringify(['basic_salary', 'housing', 'transport', 'living', 'food', 'other_allowance']);
      const defaultEligibleTax = JSON.stringify(['basic_salary', 'housing', 'transport', 'living', 'food', 'overtime', 'bonus', 'other_allowance']);

      await query(`
        INSERT INTO payroll_legal_settings (
          id, version_code, version_name, status, effective_from, effective_to,
          ss_employee_rate, ss_employer_rate, ss_insured_salary_rate,
          ss_minimum_insured_salary, ss_maximum_insured_salary, ss_eligible_components,
          tax_personal_allowance, tax_spouse_allowance, tax_child_allowance,
          tax_eligible_children_limit, tax_spouse_income_condition,
          tax_employee_insurance_deductible, tax_other_allowed_deductions,
          tax_taxable_income_method, tax_payroll_periods_per_year,
          tax_rounding_method, tax_eligible_components,
          legal_reference, notes, created_by, approved_by
        ) VALUES (
          'legal_set_2026_01', 'v2026.1', 'الإصدار التشريعي المعتمد لعام 2026 (قانون 18 وقانون 113)', 'ACTIVE', '2026-01-01', NULL,
          5.00, 12.00, 100.00,
          350000.00, 5000000.00, ?,
          2500000.00, 2000000.00, 200000.00,
          4, 1,
          1, 0.00,
          'ANNUAL_STANDARD', 12,
          'NEAREST_1000', ?,
          'قانون التقاعد والضمان الاجتماعي للعمال رقم 18 لسنة 2023، وقانون ضريبة الدخل رقم 113 لسنة 1982 وتعديلاته للقطاع الخاص',
          'الإعدادات المعتمدة المركزية لحساب استقطاعات الضمان وضريبة الدخل لموظفي الشركة في العراق',
          'Admin HR', 'HR Director'
        )
      `, [defaultEligibleSS, defaultEligibleTax]);

      console.log('✅ Initialized and seeded payroll_legal_settings successfully');
    }

    // 5. Ensure default 4 tax brackets exist in tax_brackets table if empty
    const [bracketCount] = await query('SELECT COUNT(*) as cnt FROM tax_brackets').catch(() => [{ cnt: 0 }]);
    if (!bracketCount || bracketCount.cnt === 0) {
      await query(`
        INSERT INTO tax_brackets (id, rule_version_id, bracket_order, name_ar, name_en, min_income, max_income, tax_rate, fixed_tax, calculation_method, legal_reference, effective_from, status) VALUES
        ('brk_1', 'ver_tax_1', 1, 'الشريحة الأولى (حتى 250,000 د.ع)', 'First Tier (0 - 250k IQD)', 0.00, 250000.00, 3.00, 0.00, 'PROGRESSIVE_TIER', 'المادة 13 من قانون ضريبة الدخل رقم 113', '2023-10-03', 'ACTIVE'),
        ('brk_2', 'ver_tax_1', 2, 'الشريحة الثانية (250,001 - 500,000 د.ع)', 'Second Tier (250k - 500k IQD)', 250000.00, 500000.00, 5.00, 0.00, 'PROGRESSIVE_TIER', 'المادة 13 من قانون ضريبة الدخل رقم 113', '2023-10-03', 'ACTIVE'),
        ('brk_3', 'ver_tax_1', 3, 'الشريحة الثالثة (500,001 - 1,000,000 د.ع)', 'Third Tier (500k - 1M IQD)', 500000.00, 1000000.00, 10.00, 0.00, 'PROGRESSIVE_TIER', 'المادة 13 من قانون ضريبة الدخل رقم 113', '2023-10-03', 'ACTIVE'),
        ('brk_4', 'ver_tax_1', 4, 'الشريحة الرابعة (ما زاد عن 1,000,000 د.ع)', 'Fourth Tier (Above 1M IQD)', 1000000.00, NULL, 15.00, 0.00, 'PROGRESSIVE_TIER', 'المادة 13 من قانون ضريبة الدخل رقم 113', '2023-10-03', 'ACTIVE')
      `);
      console.log('✅ Seeded default progressive tax brackets');
    }

  } catch (err) {
    console.error('Error in ensureLegalTables:', err);
  }
}
