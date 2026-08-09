import mysql from 'mysql2/promise';
import config from '../database/config.mjs';

async function seedSnapshots() {
  const db = await mysql.createConnection(config);
  
  await db.query(`CREATE TABLE IF NOT EXISTS tax_payroll_snapshots (
    id VARCHAR(100) PRIMARY KEY,
    employee_id VARCHAR(100),
    employee_name_ar VARCHAR(255),
    employee_name_en VARCHAR(255),
    employee_number VARCHAR(100),
    department_id VARCHAR(100),
    department_name VARCHAR(255),
    branch_id VARCHAR(100),
    branch_name VARCHAR(255),
    payroll_id VARCHAR(100),
    payroll_period VARCHAR(20),
    calculation_date VARCHAR(20),
    input_values JSON,
    output_results JSON,
    rules_applied_trace JSON,
    calculation_engine_version VARCHAR(50),
    status VARCHAR(50) DEFAULT 'FINALIZED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  const [emps] = await db.query('SELECT * FROM employees');
  console.log(`Found ${emps.length} employees to generate snapshots for.`);

  let inserted = 0;
  for (const e of emps) {
    let childrenList = [];
    if (e.children_details) {
      try { childrenList = JSON.parse(e.children_details); } catch (err) {}
    }
    const dependentsCount = Array.isArray(childrenList) ? childrenList.length : 0;
    const isMarried = (e.marital_status === 'married' || e.marital_status === 'متأهل');

    const basicSalary = Number(e.basic_salary) || 1200000;
    const phone = Number(e.phone_allowance) || 0;
    const cert = Number(e.certificate_allowance) || 0;
    const transport = Number(e.transportation_allowance) || 0;
    const bonus = Number(e.fixed_bonus) || 0;
    const spouseAllowance = isMarried ? 50000 : 0;
    const childAllowance = dependentsCount * 25000;
    const totalAllowances = phone + cert + transport + bonus + spouseAllowance + childAllowance;
    const grossSalary = basicSalary + totalAllowances;

    const ssBase = Math.max(350000, Math.min(5000000, basicSalary));
    const empSS = Math.round(ssBase * 0.05);
    const employerSS = Math.round(ssBase * 0.12);

    const monthlyExemption = isMarried ? (375000 + dependentsCount * 16667) : 208333;
    const taxableIncome = Math.max(0, grossSalary - empSS - monthlyExemption);
    
    let b1 = Math.min(taxableIncome, 250000) * 0.03;
    let b2 = taxableIncome > 250000 ? Math.min(taxableIncome - 250000, 250000) * 0.05 : 0;
    let b3 = taxableIncome > 500000 ? Math.min(taxableIncome - 500000, 500000) * 0.10 : 0;
    let b4 = taxableIncome > 1000000 ? (taxableIncome - 1000000) * 0.15 : 0;
    const incomeTax = Math.round(b1 + b2 + b3 + b4);

    const totalDeductions = empSS + incomeTax;
    const netSalary = grossSalary - totalDeductions;

    const snapId = `snap_${e.id}_2026_08`;
    const input_values = JSON.stringify({
      basic_salary: basicSalary,
      allowances: { phone, cert, transport, bonus, spouse: spouseAllowance, children: childAllowance },
      total_allowances: totalAllowances,
      gross_salary: grossSalary,
      dependents_count: dependentsCount,
      is_resident: true,
      marital_status: isMarried ? 'MARRIED' : 'SINGLE',
      contract_type: 'PERMANENT'
    });

    const output_results = JSON.stringify({
      gross_salary: grossSalary,
      social_security_base: ssBase,
      employee_social_security: empSS,
      employer_social_security: employerSS,
      total_social_security: empSS + employerSS,
      tax_exemptions: Math.round(monthlyExemption),
      taxable_income: Math.round(taxableIncome),
      income_tax: incomeTax,
      total_deductions: totalDeductions,
      net_salary: Math.round(netSalary)
    });

    await db.query(
      `INSERT INTO tax_payroll_snapshots (id, employee_id, employee_name_ar, employee_name_en, employee_number, department_id, department_name, branch_id, branch_name, payroll_id, payroll_period, calculation_date, input_values, output_results, rules_applied_trace, calculation_engine_version, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE input_values=VALUES(input_values), output_results=VALUES(output_results), status=VALUES(status)`,
      [
        snapId,
        String(e.id),
        e.full_name_ar || e.fullName || 'موظف',
        e.full_name_en || e.fullNameEn || 'Employee',
        e.badge_no || e.employee_id || `EMP-${e.id}`,
        e.department || 'DEP-10',
        e.department || 'الإدارة العامة',
        e.branch || 'BR-BAGHDAD',
        e.branch || 'فرع بغداد الرئيسي',
        'PAY-2026-08',
        '2026-08',
        '2026-08-08',
        input_values,
        output_results,
        '[]',
        'v2.4.0-PRO',
        'FINALIZED'
      ]
    );
    inserted++;
  }

  console.log(`Successfully generated and seeded ${inserted} snapshots in tax_payroll_snapshots!`);
  await db.end();
}

seedSnapshots().catch(console.error);
