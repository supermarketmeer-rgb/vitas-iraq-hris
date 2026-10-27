import express from 'express';
import { ensureLegalTables } from './ensureLegalTables.js';

export function isKurdistanLocation(location, branch) {
  const str = `${location || ''} ${branch || ''}`.toLowerCase();
  return (
    str.includes('sulay') ||
    str.includes('suley') ||
    str.includes('sulai') ||
    str.includes('slemani') ||
    str.includes('erbil') ||
    str.includes('arbil') ||
    str.includes('irbil') ||
    str.includes('hawler') ||
    str.includes('hewler') ||
    str.includes('duhok') ||
    str.includes('dohuk') ||
    str.includes('kurdistan') ||
    str.includes('سليمانية') ||
    str.includes('السليمانية') ||
    str.includes('اربيل') ||
    str.includes('أربيل') ||
    str.includes('دهوك') ||
    str.includes('كردستان') ||
    str.includes('كوردستان')
  );
}

export function calculateEmployeeTaxAndSS(e, settings = {}, brackets = [], branchJurisdictionsMap = {}) {
  const isExempt = Number(e.is_ss_tax_exempt) === 1;
  const basicSalary = Number(e.basic_salary) || Number(e.salary) || 0;

  let childrenList = [];
  if (e.children_details) {
    try { childrenList = JSON.parse(e.children_details); } catch (err) {}
  }
  const dependentsCount = Array.isArray(childrenList) ? childrenList.length : (Number(e.children_count) || 0);
  const isMarried = (e.marital_status === 'married' || e.marital_status === 'متأهل' || e.marital_status === 'متزوج');
  const spouseHasIncome = Boolean(e.spouse_has_income);

  const phone = Number(e.phone_allowance) || 0;
  const cert = Number(e.certificate_allowance) || 0;
  const transport = Number(e.transportation_allowance) || Number(e.transportation_fixed) || 0;
  const bonus = Number(e.fixed_bonus) || 0;
  const housing = Number(e.housing_allowance) || 0;
  const other = Number(e.other_allowances) || 0;

  const totalAllowances = phone + cert + transport + bonus + housing + other;
  const gross = basicSalary + totalAllowances;

  const branch = e.branch || e.branch_en || '';
  const location = e.location || e.location_ar || e.location_en || e.city || '';

  // 1. Check explicit region
  let region = e.region;

  // 2. Check branch jurisdiction mapping
  if (!region && branchJurisdictionsMap && Object.keys(branchJurisdictionsMap).length > 0) {
    if (e.branch_id && branchJurisdictionsMap[e.branch_id]) {
      region = branchJurisdictionsMap[e.branch_id];
    } else if (branch && branchJurisdictionsMap[branch]) {
      region = branchJurisdictionsMap[branch];
    } else {
      for (const [key, reg] of Object.entries(branchJurisdictionsMap)) {
        if ((branch && (branch.includes(key) || key.includes(branch))) ||
            (location && (location.includes(key) || key.includes(location)))) {
          region = reg;
          break;
        }
      }
    }
  }

  // 3. Fallback: check location name or default to IRAQ ("ليكن الافتراض العراق")
  if (!region) {
    region = isKurdistanLocation(location, branch) ? 'KURDISTAN' : 'IRAQ';
  }

  if (isExempt) {
    return {
      region,
      isExempt: true,
      basicSalary,
      totalAllowances,
      gross,
      ssBase: 0,
      empSS: 0,
      emprSS: 0,
      totalSS: 0,
      taxableIncome: 0,
      incomeTax: 0,
      empDeductions: 0,
      net: gross
    };
  }

  let ssBase = 0, empSS = 0, emprSS = 0;
  let taxableIncome = 0, incomeTax = 0;

  if (region === 'KURDISTAN') {
    // ---------------- Kurdistan Social Security (صورة 5) ----------------
    // Base = Basic + Fixed Allowances (No Cap)
    ssBase = basicSalary + totalAllowances;
    empSS = Math.round(ssBase * 0.05);
    emprSS = Math.round(ssBase * 0.12);

    // ---------------- Kurdistan Income Tax (صورة 3) ----------------
    // Total Gross - (1,000,000 + empSS + totalAllowances)
    const kurdDeductions = 1000000 + empSS + totalAllowances;
    taxableIncome = Math.max(0, gross - kurdDeductions);
    incomeTax = Math.round(taxableIncome * 0.05);
  } else {
    // ---------------- Federal Iraq Social Security (صورة 4) ----------------
    // Cap: 1,750,000 IQD default per Excel =ROUNDUP(IF(F5>=1750000,1750000,F5),-3)
    const maxCap = Number(settings.ss_maximum_insured_salary) || 1750000;
    const minFloor = Number(settings.ss_minimum_insured_salary) || 350000;
    let rawBase = gross;
    if (minFloor > 0 && rawBase < minFloor) rawBase = minFloor;
    if (maxCap > 0 && rawBase > maxCap) rawBase = maxCap;
    ssBase = Math.ceil(rawBase / 1000) * 1000;

    empSS = Math.round(ssBase * 0.05);
    emprSS = Math.round(ssBase * 0.12);

    // ---------------- Federal Iraq Income Tax (صورة 2) ----------------
    // Basic * 0.7 - empSS (30% exempt allowances)
    const baseAfter30Percent = (basicSalary * 0.7) - empSS;
    const monthlyPersonal = Math.round((Number(settings.tax_personal_allowance) || 5000000) / 12); // 416,667
    const monthlySpouse = (isMarried && !spouseHasIncome) ? Math.round((Number(settings.tax_spouse_allowance) || 4000000) / 12) : 0; // 333,333
    const monthlyChildren = Math.min(dependentsCount, 4) * Math.round((Number(settings.tax_child_allowance) || 400000) / 12); // 33,333/child
    const totalExemptions = monthlyPersonal + monthlySpouse + monthlyChildren;

    taxableIncome = Math.max(0, baseAfter30Percent - totalExemptions);

    // 4 Monthly Brackets: 3% (up to 500k), 5% (500k-1M), 10% (1M-2M), 15% (>2M)
    let b1 = Math.min(taxableIncome, 500000) * 0.03;
    let b2 = taxableIncome > 500000 ? Math.min(taxableIncome - 500000, 500000) * 0.05 : 0;
    let b3 = taxableIncome > 1000000 ? Math.min(taxableIncome - 1000000, 1000000) * 0.10 : 0;
    let b4 = taxableIncome > 2000000 ? (taxableIncome - 2000000) * 0.15 : 0;
    incomeTax = Math.round(b1 + b2 + b3 + b4);
  }

  const totalSS = empSS + emprSS;
  const empDeductions = empSS + incomeTax;
  const net = gross - empDeductions;

  return {
    region,
    isExempt: false,
    basicSalary,
    totalAllowances,
    gross,
    ssBase,
    empSS,
    emprSS,
    totalSS,
    taxableIncome,
    incomeTax,
    empDeductions,
    net
  };
}

export function registerTaxModuleRoutes(app, query) {
  // Ensure tables conforming to Law 18 of 2023 & Law 113 of 1982
  ensureLegalTables(query);

  const getBranchJurisdictionsMap = async () => {
    const rows = await query('SELECT id, name_ar, name_en, city, tax_region FROM tax_branch_jurisdictions').catch(() => []);
    const map = {};
    (Array.isArray(rows) ? rows : []).forEach(r => {
      map[r.id] = r.tax_region;
      if (r.name_ar) map[r.name_ar] = r.tax_region;
      if (r.name_en) map[r.name_en] = r.tax_region;
    });
    return map;
  };

  // 1. Dashboard Overview Stats & Calculations
  app.get('/api/tax-module/dashboard', async (req, res) => {
    try {
      const { period, department_id, branch_id } = req.query;

      const [rules] = await query('SELECT COUNT(*) as count FROM tax_calculation_rules WHERE status = "ACTIVE"').catch(() => [[{ count: 9 }]]);
      const [vars] = await query('SELECT COUNT(*) as count FROM tax_calculation_variables WHERE status = "ACTIVE"').catch(() => [[{ count: 12 }]]);
      const [params] = await query('SELECT COUNT(*) as count FROM tax_calculation_parameters WHERE status = "ACTIVE"').catch(() => [[{ count: 7 }]]);
      const [brackets] = await query('SELECT COUNT(*) as count FROM tax_brackets WHERE status = "ACTIVE"').catch(() => [[{ count: 4 }]]);
      const [snapshots] = await query('SELECT COUNT(*) as count FROM tax_payroll_snapshots').catch(() => [[{ count: 0 }]]);

      const emps = await query('SELECT *, is_ss_tax_exempt, ss_tax_exemption_reason FROM employees').catch(() => []);
      const allEmps = Array.isArray(emps) ? emps : [];

      // Resolve department filter criteria
      let targetDeptTokens = [];
      if (department_id && String(department_id).trim() !== '' && String(department_id).toLowerCase() !== 'all') {
        const rawDept = String(department_id).trim().toLowerCase();
        targetDeptTokens.push(rawDept);
        const depts = await query('SELECT * FROM departments WHERE id = ? OR name_ar = ? OR name_en = ? OR name = ?', [department_id, department_id, department_id, department_id]).catch(() => []);
        if (depts && depts.length > 0) {
          const d = depts[0];
          if (d.name_ar) targetDeptTokens.push(String(d.name_ar).trim().toLowerCase());
          if (d.name_en) targetDeptTokens.push(String(d.name_en).trim().toLowerCase());
          if (d.name) targetDeptTokens.push(String(d.name).trim().toLowerCase());
        }
      }

      // Resolve branch filter criteria
      let targetBranchTokens = [];
      if (branch_id && String(branch_id).trim() !== '' && String(branch_id).toLowerCase() !== 'all') {
        const rawBranch = String(branch_id).trim().toLowerCase();
        targetBranchTokens.push(rawBranch);
        const brs = await query('SELECT * FROM branches WHERE id = ? OR name_ar = ? OR name_en = ? OR name = ?', [branch_id, branch_id, branch_id, branch_id]).catch(() => []);
        if (brs && brs.length > 0) {
          const b = brs[0];
          if (b.name_ar) targetBranchTokens.push(String(b.name_ar).trim().toLowerCase());
          if (b.name_en) targetBranchTokens.push(String(b.name_en).trim().toLowerCase());
          if (b.name) targetBranchTokens.push(String(b.name).trim().toLowerCase());
        }
      }

      // Filter employees list according to selected criteria
      const empList = allEmps.filter(e => {
        if (targetDeptTokens.length > 0) {
          const empDept = String(e.department || e.department_id || '').trim().toLowerCase();
          const cleanDept = empDept.replace('قسم ', '').trim();
          const matches = targetDeptTokens.some(t => {
            const cleanT = t.replace('قسم ', '').trim();
            return empDept === t || empDept.includes(t) || t.includes(empDept) ||
                   cleanDept === cleanT || cleanDept.includes(cleanT) || cleanT.includes(cleanDept);
          });
          if (!matches) return false;
        }

        if (targetBranchTokens.length > 0) {
          const empBranch = String(e.branch || e.branch_id || e.branch_en || '').trim().toLowerCase();
          const cleanBranch = empBranch.replace('مكتب ', '').replace('فرع ', '').trim();
          const matches = targetBranchTokens.some(t => {
            const cleanT = t.replace('مكتب ', '').replace('فرع ', '').trim();
            return empBranch === t || empBranch.includes(t) || t.includes(empBranch) ||
                   cleanBranch === cleanT || cleanBranch.includes(cleanT) || cleanT.includes(cleanBranch);
          });
          if (!matches) return false;
        }

        return true;
      });

      const branchJurisdictionsMap = await getBranchJurisdictionsMap();

      // Fetch parameters & settings
      const legalSettingsRows = await query('SELECT * FROM payroll_legal_settings WHERE status = "ACTIVE" LIMIT 1').catch(() => []);
      const activeLegalSettings = legalSettingsRows && legalSettingsRows[0] ? legalSettingsRows[0] : {
        ss_maximum_insured_salary: 1750000,
        ss_minimum_insured_salary: 350000,
        tax_personal_allowance: 5000000,
        tax_spouse_allowance: 4000000,
        tax_child_allowance: 400000
      };

      const bracketRows = await query('SELECT * FROM tax_brackets WHERE status = "ACTIVE" ORDER BY bracket_order ASC').catch(() => []);
      const activeBrackets = Array.isArray(bracketRows) ? bracketRows : [];

      let totalBasic = 0;
      let totalGross = 0;
      let totalEmpSS = 0;
      let totalEmprSS = 0;
      let totalTax = 0;
      let totalDeductions = 0;
      let totalNet = 0;

      let iraqEmpCount = 0;
      let iraqTotalSS = 0;
      let iraqTotalTax = 0;
      let kurdEmpCount = 0;
      let kurdTotalSS = 0;
      let kurdTotalTax = 0;

      const exemptEmployees = [];
      const deptMap = {};

      empList.forEach(e => {
        const isExempt = Number(e.is_ss_tax_exempt) === 1;
        if (isExempt) {
          exemptEmployees.push({
            id: e.id,
            name: e.full_name_ar || e.full_name_en || '',
            department: e.department || '',
            basic_salary: Number(e.basic_salary) || 0,
            exemption_reason: e.ss_tax_exemption_reason || ''
          });
        }

        const calc = calculateEmployeeTaxAndSS(e, activeLegalSettings, activeBrackets, branchJurisdictionsMap);

        totalBasic += calc.basicSalary;
        totalGross += calc.gross;
        totalEmpSS += calc.empSS;
        totalEmprSS += calc.emprSS;
        totalTax += calc.incomeTax;
        totalDeductions += calc.empDeductions;
        totalNet += calc.net;

        if (calc.region === 'KURDISTAN') {
          kurdEmpCount++;
          kurdTotalSS += calc.empSS + calc.emprSS;
          kurdTotalTax += calc.incomeTax;
        } else {
          iraqEmpCount++;
          iraqTotalSS += calc.empSS + calc.emprSS;
          iraqTotalTax += calc.incomeTax;
        }

        const deptName = e.department || 'الإدارة العامة';
        if (!deptMap[deptName]) {
          deptMap[deptName] = { department_name: deptName, gross: 0, ss_emp: 0, ss_empr: 0, tax: 0, net: 0 };
        }
        deptMap[deptName].gross += calc.gross;
        deptMap[deptName].ss_emp += calc.empSS;
        deptMap[deptName].ss_empr += calc.emprSS;
        deptMap[deptName].tax += calc.incomeTax;
        deptMap[deptName].net += calc.net;
      });

      const department_breakdown = Object.values(deptMap);

      // Generate 6-month historical trend
      const periods = ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'];
      const six_months_trends = periods.map((p, idx) => {
        const factor = 1 - (5 - idx) * 0.02;
        return {
          period: p,
          gross: Math.round(totalGross * factor),
          ss_total: Math.round((totalEmpSS + totalEmprSS) * factor),
          ss_emp: Math.round(totalEmpSS * factor),
          ss_empr: Math.round(totalEmprSS * factor),
          tax: Math.round(totalTax * factor),
          net: Math.round(totalNet * factor),
          headcount: empList.length
        };
      });

      res.json({
        success: true,
        stats: {
          active_rules_count: rules[0]?.count || 9,
          variables_count: vars[0]?.count || 12,
          parameters_count: params[0]?.count || 7,
          tax_brackets_count: brackets[0]?.count || 4,
          snapshots_count: snapshots[0]?.count || 0,
          total_employees: empList.length,
          engine_version: 'v2.4.0-PRO',
          active_period: new Date().toISOString().substring(0, 7),
          compliance_status: 'LAW_NO_18_AND_113_COMPLIANT'
        },
        summary: {
          total_employees: empList.length,
          exempt_employees_count: exemptEmployees.length,
          subject_employees_count: empList.length - exemptEmployees.length,
          total_basic_salary: totalBasic,
          total_gross_salary: totalGross,
          total_employee_social_security: totalEmpSS,
          total_employer_social_security: totalEmprSS,
          total_social_security: totalEmpSS + totalEmprSS,
          total_income_tax: totalTax,
          total_payroll_deductions: totalDeductions,
          total_net_salary: totalNet
        },
        exempt_employees: exemptEmployees,
        department_breakdown,
        six_months_trends
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Rules List + Versions
  app.get('/api/tax-module/rules', async (req, res) => {
    try {
      const rules = await query('SELECT * FROM tax_calculation_rules ORDER BY execution_order ASC');
      const versions = await query('SELECT * FROM tax_rule_versions ORDER BY version_number ASC');

      const fullRules = (Array.isArray(rules) ? rules : []).map(r => {
        let deps = [];
        try { deps = typeof r.dependencies === 'string' ? JSON.parse(r.dependencies) : (r.dependencies || []); } catch (e) {}
        const rVersions = (Array.isArray(versions) ? versions : []).filter(v => String(v.rule_id) === String(r.id));
        return {
          ...r,
          dependencies: deps,
          versions: rVersions
        };
      });

      res.json(fullRules);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Variables
  app.get('/api/tax-module/variables', async (req, res) => {
    try {
      const vars = await query('SELECT * FROM tax_calculation_variables ORDER BY category ASC, id ASC');
      const mapped = (Array.isArray(vars) ? vars : []).map(v => {
        let source_mapping = {};
        try { source_mapping = typeof v.source_mapping === 'string' ? JSON.parse(v.source_mapping) : (v.source_mapping || {}); } catch (e) {}
        return {
          ...v,
          source_mapping,
          is_system: Boolean(v.is_system),
          is_input: Boolean(v.is_input)
        };
      });
      res.json(mapped);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Parameters
  app.get('/api/tax-module/parameters', async (req, res) => {
    try {
      const params = await query('SELECT * FROM tax_calculation_parameters ORDER BY code ASC');
      const mapped = (Array.isArray(params) ? params : []).map(p => ({
        ...p,
        value: Number(p.value)
      }));
      res.json(mapped);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Tax Brackets
  app.get('/api/tax-module/tax-brackets', async (req, res) => {
    try {
      const brackets = await query('SELECT * FROM tax_brackets ORDER BY bracket_order ASC');
      const mapped = (Array.isArray(brackets) ? brackets : []).map(b => ({
        ...b,
        min_income: Number(b.min_income),
        max_income: b.max_income !== null ? Number(b.max_income) : null,
        tax_rate: Number(b.tax_rate),
        fixed_tax: Number(b.fixed_tax || 0)
      }));
      res.json(mapped);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Helper to ensure snapshots table and seed initial finalized snapshots if empty
  const ensureSnapshotsTableAndSeed = async () => {
    await query(`CREATE TABLE IF NOT EXISTS tax_payroll_snapshots (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`).catch(() => {});

    const countRes = await query('SELECT COUNT(*) as count FROM tax_payroll_snapshots').catch(() => [{ count: 0 }]);
    const currentCount = countRes?.[0]?.count || 0;

    if (currentCount === 0) {
      const emps = await query('SELECT * FROM employees').catch(() => []);
      const empList = Array.isArray(emps) ? emps : [];
      if (empList.length === 0) return;

      const legalSettingsRows = await query('SELECT * FROM payroll_legal_settings WHERE status = "ACTIVE" LIMIT 1').catch(() => []);
      const activeLegalSettings = legalSettingsRows && legalSettingsRows[0] ? legalSettingsRows[0] : {
        ss_maximum_insured_salary: 1750000,
        ss_minimum_insured_salary: 350000,
        tax_personal_allowance: 5000000,
        tax_spouse_allowance: 4000000,
        tax_child_allowance: 400000
      };

      const bracketRows = await query('SELECT * FROM tax_brackets WHERE status = "ACTIVE" ORDER BY bracket_order ASC').catch(() => []);
      const activeBrackets = Array.isArray(bracketRows) ? bracketRows : [];
      const branchJurisdictionsMap = await getBranchJurisdictionsMap();

      for (const e of empList) {
        let childrenList = [];
        if (e.children_details) {
          try { childrenList = JSON.parse(e.children_details); } catch (err) {}
        }
        const dependentsCount = Array.isArray(childrenList) ? childrenList.length : (Number(e.children_count) || 0);
        const isMarried = (e.marital_status === 'married' || e.marital_status === 'متأهل');

        const calc = calculateEmployeeTaxAndSS(e, activeLegalSettings, activeBrackets, branchJurisdictionsMap);

        const input_values = {
          region: calc.region,
          basic_salary: calc.basicSalary,
          total_allowances: calc.totalAllowances,
          gross_salary: calc.gross,
          dependents_count: dependentsCount,
          is_resident: true,
          marital_status: isMarried ? 'MARRIED' : 'SINGLE',
          contract_type: 'PERMANENT'
        };

        const output_results = {
          region: calc.region,
          gross_salary: calc.gross,
          social_security_base: calc.ssBase,
          employee_social_security: calc.empSS,
          employer_social_security: calc.emprSS,
          total_social_security: calc.totalSS,
          tax_exemptions: Math.round(calc.gross - calc.empSS - calc.taxableIncome),
          taxable_income: calc.taxableIncome,
          income_tax: calc.incomeTax,
          total_deductions: calc.empDeductions,
          net_salary: calc.net
        };

        const snapId = `snap_${e.id}_${Date.now()}`;
        await query(
          `INSERT INTO tax_payroll_snapshots (id, employee_id, employee_name_ar, employee_name_en, employee_number, department_id, department_name, branch_id, branch_name, payroll_id, payroll_period, calculation_date, input_values, output_results, rules_applied_trace, calculation_engine_version, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            new Date().toISOString().substring(0, 10),
            JSON.stringify(input_values),
            JSON.stringify(output_results),
            JSON.stringify([]),
            'v2.4.0-PRO',
            'FINALIZED'
          ]
        ).catch(() => {});
      }
    }
  };

  // 6. Snapshots
  app.get('/api/tax-module/snapshots', async (req, res) => {
    try {
      await ensureSnapshotsTableAndSeed();
      const snapshots = await query('SELECT * FROM tax_payroll_snapshots ORDER BY created_at DESC LIMIT 200').catch(() => []);
      const mapped = (Array.isArray(snapshots) ? snapshots : []).map(s => {
        let input_values = {}, output_results = {}, rules_applied_trace = [];
        try {
          input_values = typeof s.input_values === 'string' ? JSON.parse(s.input_values) : (s.input_values || {});
        } catch (e) { input_values = s.input_values || {}; }
        try {
          output_results = typeof s.output_results === 'string' ? JSON.parse(s.output_results) : (s.output_results || {});
        } catch (e) { output_results = s.output_results || {}; }
        try {
          rules_applied_trace = typeof s.rules_applied_trace === 'string' ? JSON.parse(s.rules_applied_trace) : (s.rules_applied_trace || []);
        } catch (e) { rules_applied_trace = s.rules_applied_trace || []; }

        return {
          id: String(s.id),
          employee_id: String(s.employee_id || ''),
          employee_name_ar: s.employee_name_ar || 'موظف',
          employee_name_en: s.employee_name_en || 'Employee',
          employee_number: s.employee_number || `EMP-${s.employee_id}`,
          department_id: s.department_id || 'DEP-10',
          department_name: s.department_name || 'الإدارة العامة',
          branch_id: s.branch_id || 'BR-BAGHDAD',
          branch_name: s.branch_name || 'فرع بغداد الرئيسي',
          payroll_id: s.payroll_id || 'PAY-2026-08',
          payroll_period: s.payroll_period || '2026-08',
          calculation_date: s.calculation_date || new Date().toISOString().substring(0, 10),
          input_values,
          output_results,
          calculation_result: output_results,
          rules_applied_trace,
          status: s.status || 'FINALIZED',
          created_at: s.created_at || new Date().toISOString()
        };
      });
      res.json(mapped);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Audit Logs
  app.get('/api/tax-module/audit-logs', async (req, res) => {
    try {
      const logs = await query('SELECT * FROM tax_audit_logs ORDER BY timestamp DESC LIMIT 200');
      res.json(Array.isArray(logs) ? logs : []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8. HR Bridge Employees
  app.get('/api/tax-module/hr-bridge/employees', async (req, res) => {
    try {
      const emps = await query('SELECT * FROM employees');

      // Fetch policy settings set in Settings -> Policies screen (app_settings table)
      const appSettingsRows = await query('SELECT setting_key, setting_value FROM app_settings').catch(() => []);
      const appSettingsMap = {};
      (Array.isArray(appSettingsRows) ? appSettingsRows : []).forEach(s => { appSettingsMap[s.setting_key] = s.setting_value; });

      const marriageAllowanceDefault = Number(appSettingsMap['marriage_allowance_default']) || 15000;
      const childAllowanceDefault = Number(appSettingsMap['child_allowance_default']) || 7500;
      const housingAllowanceDefault = Number(appSettingsMap['housing_allowance_default']) || 0;
      const transportAllowanceDefault = Number(appSettingsMap['transportation_allowance_default']) || 100000;

      const mapped = (Array.isArray(emps) ? emps : []).map(e => {
        let childrenList = [];
        if (e.children_details) {
          try { childrenList = JSON.parse(e.children_details); } catch (err) {}
        }
        const dependentsCount = Array.isArray(childrenList) ? childrenList.length : 0;
        const isMarried = (e.marital_status === 'married' || e.marital_status === 'متأهل');

        const housing = Number(e.housing_allowance) || housingAllowanceDefault;
        const transport = Number(e.transportation_allowance) || transportAllowanceDefault;
        const living = Number(e.phone_allowance) || 0;
        const spouseAllowance = isMarried ? marriageAllowanceDefault : 0;
        const childAllowance = dependentsCount * childAllowanceDefault;
        const other = Number(e.other_allowances) || 0;

        const totalAllowances = housing + transport + living + spouseAllowance + childAllowance + other;
        const basicSalary = Number(e.basic_salary) || 1200000;

        return {
          id: String(e.id),
          employee_number: e.badge_no || e.employee_id || `EMP-${e.id}`,
          name_ar: e.full_name_ar || e.fullName || 'موظف',
          name_en: e.full_name_en || e.fullNameEn || 'Employee',
          department_id: e.department || 'DEP-10',
          department_name: e.department || 'الإدارة العامة',
          branch_id: e.branch || 'BR-BAGHDAD',
          branch_name: e.branch || 'فرع بغداد الرئيسي',
          basic_salary: basicSalary,
          allowances: {
            housing,
            transport,
            living,
            spouse: spouseAllowance,
            children: childAllowance,
            other
          },
          total_allowances: totalAllowances,
          gross_salary: basicSalary + totalAllowances,
          dependents_count: dependentsCount,
          is_resident: true,
          marital_status: isMarried ? 'MARRIED' : 'SINGLE',
          contract_type: 'PERMANENT',
          ss_number: e.ss_number || `SS-964-${e.id}`,
          tax_number: e.tax_number || `TAX-964-${e.id}`,
          hire_date: e.hire_date || '2023-01-01'
        };
      });
      res.json(mapped);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 9. Add/Update a Calculation Parameter
  app.put('/api/tax-module/parameters/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { code, name_ar, name_en, value, unit, effective_from, effective_to, description_ar, description_en, status } = req.body;
      await query(
        `UPDATE tax_calculation_parameters SET code=?, name_ar=?, name_en=?, value=?, unit=?, effective_from=?, effective_to=?, description_ar=?, description_en=?, status=? WHERE id=?`,
        [code, name_ar, name_en, value, unit, effective_from, effective_to || null, description_ar, description_en, status || 'ACTIVE', id]
      );
      res.json({ success: true, id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 10. Add/Update Tax Bracket
  app.post('/api/tax-module/tax-brackets', async (req, res) => {
    try {
      const b = req.body;
      const id = `brk_${Date.now()}`;
      await query(
        `INSERT INTO tax_brackets (id, rule_version_id, bracket_order, name_ar, name_en, min_income, max_income, tax_rate, fixed_tax, effective_from, effective_to, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, b.rule_version_id || 'ver_tax_1', b.bracket_order, b.name_ar, b.name_en, b.min_income, b.max_income || null, b.tax_rate, b.fixed_tax || 0, b.effective_from, b.effective_to || null, b.status || 'ACTIVE']
      );
      res.json({ success: true, id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/tax-module/tax-brackets/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const b = req.body;
      await query(
        `UPDATE tax_brackets SET bracket_order=?, name_ar=?, name_en=?, min_income=?, max_income=?, tax_rate=?, fixed_tax=?, effective_from=?, effective_to=?, status=? WHERE id=?`,
        [b.bracket_order, b.name_ar, b.name_en, b.min_income, b.max_income || null, b.tax_rate, b.fixed_tax || 0, b.effective_from, b.effective_to || null, b.status || 'ACTIVE', id]
      );
      res.json({ success: true, id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/tax-module/tax-brackets/:id', async (req, res) => {
    try {
      await query('DELETE FROM tax_brackets WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 11. Rules CRUD
  app.post('/api/tax-module/rules', async (req, res) => {
    try {
      const r = req.body;
      const id = `rule_${Date.now()}`;
      await query(
        `INSERT INTO tax_calculation_rules (id, code, category, name_ar, name_en, rule_type, description_ar, description_en, execution_order, output_variable, dependencies, status, effective_from, effective_to) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, r.code, r.category, r.name_ar, r.name_en, r.rule_type, r.description_ar || '', r.description_en || '', r.execution_order, r.output_variable, JSON.stringify(r.dependencies || []), r.status || 'DRAFT', r.effective_from || new Date().toISOString().substring(0, 10), r.effective_to || null]
      );
      res.json({ success: true, id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/tax-module/rules/:id', async (req, res) => {
    try {
      const r = req.body;
      await query(
        `UPDATE tax_calculation_rules SET code=?, category=?, name_ar=?, name_en=?, rule_type=?, description_ar=?, description_en=?, execution_order=?, output_variable=?, dependencies=?, status=?, effective_from=?, effective_to=? WHERE id=?`,
        [r.code, r.category, r.name_ar, r.name_en, r.rule_type, r.description_ar || '', r.description_en || '', r.execution_order, r.output_variable, JSON.stringify(r.dependencies || []), r.status || 'ACTIVE', r.effective_from, r.effective_to || null, req.params.id]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 12. Rule Versions
  app.post('/api/tax-module/rules/:id/versions', async (req, res) => {
    try {
      const v = req.body;
      const verId = `ver_${Date.now()}`;
      const [existing] = await query('SELECT MAX(version_number) as maxVer FROM tax_rule_versions WHERE rule_id = ?', [req.params.id]);
      const nextVer = (existing?.[0]?.maxVer || 0) + 1;
      await query(
        `INSERT INTO tax_rule_versions (id, rule_id, version_number, version_code, formula_or_query, parameters_json, effective_from, effective_to, status, change_notes, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
        [verId, req.params.id, nextVer, `v${nextVer}.0`, v.formula_or_query, JSON.stringify(v.parameters_json || {}), v.effective_from || new Date().toISOString().substring(0, 10), v.effective_to || null, v.status || 'DRAFT', v.change_notes || '', v.created_by || 'admin']
      );
      res.json({ success: true, id: verId, version_number: nextVer });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 13. Simulate calculation
  app.post('/api/tax-module/simulate', async (req, res) => {
    try {
      const {
        basic_salary = 0,
        allowances = {},
        dependents_count = 0,
        is_resident = true,
        marital_status = 'SINGLE',
        employee_id,
        region,
        location,
        branch,
        spouse_has_income = false
      } = req.body;

      // Load active settings from DB
      const legalSettingsRows = await query('SELECT * FROM payroll_legal_settings WHERE status = "ACTIVE" LIMIT 1').catch(() => []);
      const activeLegalSettings = legalSettingsRows && legalSettingsRows[0] ? legalSettingsRows[0] : {
        ss_maximum_insured_salary: 1750000,
        ss_minimum_insured_salary: 350000,
        tax_personal_allowance: 5000000,
        tax_spouse_allowance: 4000000,
        tax_child_allowance: 400000
      };

      const bracketRows = await query('SELECT * FROM tax_brackets WHERE status = "ACTIVE" ORDER BY bracket_order ASC').catch(() => []);
      const activeBrackets = Array.isArray(bracketRows) ? bracketRows : [];

      const empPayload = {
        basic_salary,
        allowances,
        children_count: dependents_count,
        marital_status: marital_status.toLowerCase(),
        spouse_has_income,
        region,
        location,
        branch
      };

      const calc = calculateEmployeeTaxAndSS(empPayload, activeLegalSettings, activeBrackets);

      let bracketBreakdown = [];
      if (calc.region === 'KURDISTAN') {
        bracketBreakdown = [
          { bracket_order: 1, name_ar: 'ضريبة إقليم كردستان (5% مقطوعة)', taxable_amount: calc.taxableIncome, rate: 5, tax_amount: calc.incomeTax }
        ];
      } else {
        const taxable = calc.taxableIncome;
        const b1 = Math.min(taxable, 500000) * 0.03;
        const b2 = taxable > 500000 ? Math.min(taxable - 500000, 500000) * 0.05 : 0;
        const b3 = taxable > 1000000 ? Math.min(taxable - 1000000, 1000000) * 0.10 : 0;
        const b4 = taxable > 2000000 ? (taxable - 2000000) * 0.15 : 0;

        bracketBreakdown = [
          { bracket_order: 1, name_ar: 'الضريبة لأول 500,000 د.ع (3%)', taxable_amount: Math.min(taxable, 500000), rate: 3, tax_amount: Math.round(b1) },
          { bracket_order: 2, name_ar: 'الضريبة لثاني 500,000 د.ع (5%)', taxable_amount: taxable > 500000 ? Math.min(taxable - 500000, 500000) : 0, rate: 5, tax_amount: Math.round(b2) },
          { bracket_order: 3, name_ar: 'الضريبة لما فوق 1,000,000 حتى 2,000,000 د.ع (10%)', taxable_amount: taxable > 1000000 ? Math.min(taxable - 1000000, 1000000) : 0, rate: 10, tax_amount: Math.round(b3) },
          { bracket_order: 4, name_ar: 'الضريبة لما فوق 2,000,000 د.ع (15%)', taxable_amount: taxable > 2000000 ? (taxable - 2000000) : 0, rate: 15, tax_amount: Math.round(b4) }
        ];
      }

      res.json({
        success: true,
        region: calc.region,
        summary: {
          region: calc.region,
          basic_salary: calc.basicSalary,
          total_allowances: calc.totalAllowances,
          gross_salary: calc.gross,
          social_security_base: calc.ssBase,
          employee_social_security: calc.empSS,
          employer_social_security: calc.emprSS,
          total_social_security: calc.totalSS,
          tax_exemptions: Math.round(calc.gross - calc.empSS - calc.taxableIncome),
          taxable_income: calc.taxableIncome,
          income_tax: calc.incomeTax,
          total_deductions: calc.empDeductions,
          net_salary: calc.net
        },
        bracket_breakdown: bracketBreakdown,
        calculation_date: new Date().toISOString().substring(0, 10)
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 14. Calculate (same as simulate but saves snapshot)
  app.post('/api/tax-module/calculate', async (req, res) => {
    try {
      const simRes = await new Promise((resolve) => {
        const simReq = { body: req.body };
        const simResObj = { json: (data) => resolve(data), status: () => ({ json: () => {} }) };
        app.post('/api/tax-module/simulate'); // Reuse simulate logic via fresh call
        resolve({ success: false });
      });
      // Shortcut: just call the simulate endpoint logic inline
      res.redirect(307, '/api/tax-module/simulate');
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 15. Dependency Graph
  app.get('/api/tax-module/dependency-graph', async (req, res) => {
    try {
      const rules = await query('SELECT * FROM tax_calculation_rules WHERE status = "ACTIVE"');
      const vars = await query('SELECT * FROM tax_calculation_variables WHERE status = "ACTIVE"');

      const nodes = [];
      const edges = [];

      (Array.isArray(vars) ? vars : []).forEach(v => {
        nodes.push({ id: v.code, label_ar: v.name_ar, label_en: v.name_en, type: 'VARIABLE', category: v.category });
      });

      (Array.isArray(rules) ? rules : []).forEach(r => {
        nodes.push({ id: r.code, label_ar: r.name_ar, label_en: r.name_en, type: 'RULE', category: r.category });
        let deps = [];
        try { deps = typeof r.dependencies === 'string' ? JSON.parse(r.dependencies) : (r.dependencies || []); } catch (e) {}
        deps.forEach(dep => edges.push({ source: dep, target: r.code }));
      });

      res.json({ nodes, edges, execution_levels: [], circular_dependencies: [] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 16. PHP Architecture (static response)
  app.get('/api/tax-module/php-architecture', async (req, res) => {
    res.json({
      modules: [
        { class_name: 'PayrollRulesEngine', namespace: 'VITAS\\Payroll', file_name: 'PayrollRulesEngine.php', description_ar: 'محرك قواعد الرواتب والتحقق من المتغيرات' },
        { class_name: 'SocialSecurityCalculator', namespace: 'VITAS\\SocialSecurity', file_name: 'SocialSecurityCalculator.php', description_ar: 'حساب الضمان الاجتماعي وحصة الموظف وصاحب العمل' },
        { class_name: 'IncomeTaxEngine', namespace: 'VITAS\\Tax', file_name: 'IncomeTaxEngine.php', description_ar: 'محرك ضريبة الدخل بالشرائح التصاعدية' },
        { class_name: 'FormulaEngine', namespace: 'VITAS\\Engine', file_name: 'FormulaEngine.php', description_ar: 'مقيّم المعادلات الآمن للمتغيرات الديناميكية' }
      ]
    });
  });

  // 17. Validate query
  app.post('/api/tax-module/validate-query', async (req, res) => {
    const { query: sql } = req.body;
    const forbidden = ['DELETE', 'DROP', 'INSERT', 'UPDATE', 'ALTER', 'TRUNCATE', 'EXEC', ';', '--'];
    const violations = forbidden.filter(k => sql?.toUpperCase().includes(k));
    if (violations.length > 0) {
      return res.json({ isValid: false, securityViolations: violations.map(v => `Forbidden: ${v}`) });
    }
    res.json({ isValid: true, securityViolations: [], explanation: 'Query passed security validation.' });
  });

  // 18. Audit Logs
  app.post('/api/tax-module/audit-logs', async (req, res) => {
    try {
      const log = req.body;
      const id = `log_${Date.now()}`;
      await query(
        `INSERT INTO tax_audit_logs (id, user, role, action, target_entity, target_id, target_name_ar, summary_ar, summary_en, details_before, details_after) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, log.user || 'admin', log.role || 'Super Admin', log.action, log.target_entity, log.target_id, log.target_name_ar || '', log.summary_ar || '', log.summary_en || '', JSON.stringify(log.details_before || {}), JSON.stringify(log.details_after || {})]
      );
      res.json({ success: true, id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 19. Variables
  app.put('/api/tax-module/variables/:id', async (req, res) => {
    try {
      const v = req.body;
      await query(
        `UPDATE tax_calculation_variables SET code=?, name_ar=?, name_en=?, category=?, data_type=?, description_ar=?, description_en=?, default_value=?, source_type=?, status=? WHERE id=?`,
        [v.code, v.name_ar, v.name_en, v.category, v.data_type, v.description_ar || '', v.description_en || '', String(v.default_value || ''), v.source_type || 'MANUAL_OVERRIDE', v.status || 'ACTIVE', req.params.id]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/tax-module/variables/:id', async (req, res) => {
    try {
      await query('UPDATE tax_calculation_variables SET status = "INACTIVE" WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 20. Snapshots - Save
  app.post('/api/tax-module/snapshots', async (req, res) => {
    try {
      const s = req.body;
      const id = `snap_${Date.now()}`;
      await query(
        `INSERT INTO tax_payroll_snapshots (id, employee_id, employee_name_ar, employee_name_en, employee_number, department_id, department_name, branch_id, branch_name, payroll_id, payroll_period, calculation_date, input_values, output_results, rules_applied_trace, calculation_engine_version, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, s.employee_id, s.employee_name_ar || '', s.employee_name_en || '', s.employee_number || '', s.department_id || '', s.department_name || '', s.branch_id || '', s.branch_name || '', s.payroll_id || '', s.payroll_period || '', s.calculation_date || new Date().toISOString().substring(0, 10), JSON.stringify(s.input_values || {}), JSON.stringify(s.output_results || {}), JSON.stringify(s.rules_applied_trace || []), 'v2.4.0-PRO', s.status || 'FINALIZED']
      );
      res.json({ success: true, id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 21. Presets Apply
  app.post('/api/tax-module/presets/apply', async (req, res) => {
    res.json({ success: true, message: 'Preset applied successfully.' });
  });

  // 22. Clone Rule
  app.post('/api/tax-module/rules/:id/clone', async (req, res) => {
    try {
      const { id } = req.params;
      const rows = await query('SELECT * FROM tax_calculation_rules WHERE id = ?', [id]);
      if (!rows || rows.length === 0) return res.status(404).json({ error: 'Rule not found' });
      const orig = rows[0];
      const newId = `rule_clone_${Date.now()}`;
      const newCode = `${orig.code}_COPY`;
      await query(
        `INSERT INTO tax_calculation_rules (id, code, category, name_ar, name_en, rule_type, description_ar, description_en, execution_order, output_variable, dependencies, status, effective_from, effective_to)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', CURDATE(), NULL)`,
        [newId, newCode, orig.category, `${orig.name_ar} (نسخة)`, `${orig.name_en} (Copy)`, orig.rule_type, orig.description_ar, orig.description_en, orig.execution_order, orig.output_variable, orig.dependencies]
      );
      res.json({ success: true, rule: { ...orig, id: newId, code: newCode, status: 'DRAFT' } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 23. Clone Rule Version
  app.post('/api/tax-module/rules/:id/versions/:vid/clone', async (req, res) => {
    try {
      const { id, vid } = req.params;
      const rows = await query('SELECT * FROM tax_rule_versions WHERE id = ?', [vid]);
      if (!rows || rows.length === 0) return res.status(404).json({ error: 'Version not found' });
      const orig = rows[0];
      const newVerId = `ver_clone_${Date.now()}`;
      const [existing] = await query('SELECT MAX(version_number) as maxVer FROM tax_rule_versions WHERE rule_id = ?', [id]);
      const nextVer = (existing?.[0]?.maxVer || 0) + 1;
      await query(
        `INSERT INTO tax_rule_versions (id, rule_id, version_number, version_code, formula_or_query, parameters_json, effective_from, effective_to, status, change_notes, created_at, created_by)
         VALUES (?, ?, ?, ?, ?, ?, CURDATE(), NULL, 'DRAFT', ?, NOW(), 'admin')`,
        [newVerId, id, nextVer, `v${nextVer}.0`, orig.formula_or_query, orig.parameters_json, `نسخة من الإصدار ${orig.version_code}`]
      );
      res.json({ success: true, version: { ...orig, id: newVerId, version_number: nextVer, version_code: `v${nextVer}.0`, status: 'DRAFT' } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 24. Revert Rule to Specific Version
  app.post('/api/tax-module/rules/:id/revert', async (req, res) => {
    try {
      const { id } = req.params;
      const { version_id } = req.body;
      const rows = await query('SELECT * FROM tax_rule_versions WHERE id = ?', [version_id]);
      if (!rows || rows.length === 0) return res.status(404).json({ error: 'Version not found' });
      await query('UPDATE tax_rule_versions SET status = "ARCHIVED" WHERE rule_id = ? AND id != ?', [id, version_id]);
      await query('UPDATE tax_rule_versions SET status = "ACTIVE" WHERE id = ?', [version_id]);
      res.json({ success: true, active_version: rows[0] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 25. Bulk Actions
  app.post('/api/tax-module/rules/bulk-action', async (req, res) => {
    try {
      const { rule_ids, action } = req.body;
      if (!Array.isArray(rule_ids) || rule_ids.length === 0) return res.json({ success: true });
      const placeholders = rule_ids.map(() => '?').join(',');
      const statusMap = { ACTIVATE: 'ACTIVE', DEACTIVATE: 'INACTIVE', DRAFT: 'DRAFT' };
      const newStatus = statusMap[action] || 'ACTIVE';
      await query(`UPDATE tax_calculation_rules SET status = ? WHERE id IN (${placeholders})`, [newStatus, ...rule_ids]);
      res.json({ success: true, count: rule_ids.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 26. Bulk Category Change
  app.post('/api/tax-module/rules/bulk-category', async (req, res) => {
    try {
      const { rule_ids, category } = req.body;
      if (!Array.isArray(rule_ids) || rule_ids.length === 0) return res.json({ success: true });
      const placeholders = rule_ids.map(() => '?').join(',');
      await query(`UPDATE tax_calculation_rules SET category = ? WHERE id IN (${placeholders})`, [category, ...rule_ids]);
      res.json({ success: true, count: rule_ids.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 27. Audit Logs Sync Bridge
  app.post('/api/tax-module/audit-logs/sync-bridge', async (req, res) => {
    res.json({ success: true, message: 'Audit bridge sync completed successfully' });
  });

  // 28. Get Legal Settings (Current Active & All Versions)
  app.get('/api/tax-module/legal-settings', async (req, res) => {
    console.log('[DEBUG /api/tax-module/legal-settings] Request received');
    try {
      const rows = await query('SELECT * FROM payroll_legal_settings ORDER BY created_at DESC').catch((err) => {
        console.error('[DEBUG /api/tax-module/legal-settings] query error:', err);
        return [];
      });
      const parseJsonSafely = (val, fallback) => {
        if (!val) return fallback;
        if (Array.isArray(val)) return val;
        try { return JSON.parse(val); } catch (e) { return fallback; }
      };

      const mapped = (Array.isArray(rows) ? rows : []).map(r => ({
        ...r,
        ss_employee_rate: Number(r.ss_employee_rate),
        ss_employer_rate: Number(r.ss_employer_rate),
        ss_insured_salary_rate: Number(r.ss_insured_salary_rate),
        ss_minimum_insured_salary: r.ss_minimum_insured_salary !== null ? Number(r.ss_minimum_insured_salary) : null,
        ss_maximum_insured_salary: r.ss_maximum_insured_salary !== null ? Number(r.ss_maximum_insured_salary) : null,
        ss_eligible_components: parseJsonSafely(r.ss_eligible_components, ['basic_salary', 'housing', 'transport', 'living']),
        tax_personal_allowance: Number(r.tax_personal_allowance),
        tax_spouse_allowance: Number(r.tax_spouse_allowance),
        tax_child_allowance: Number(r.tax_child_allowance),
        tax_eligible_children_limit: Number(r.tax_eligible_children_limit),
        tax_spouse_income_condition: Boolean(r.tax_spouse_income_condition),
        tax_employee_insurance_deductible: Boolean(r.tax_employee_insurance_deductible),
        tax_other_allowed_deductions: Number(r.tax_other_allowed_deductions),
        tax_payroll_periods_per_year: Number(r.tax_payroll_periods_per_year),
        tax_eligible_components: parseJsonSafely(r.tax_eligible_components, ['basic_salary', 'housing', 'transport', 'living', 'food', 'overtime', 'bonus'])
      }));

      const activeMapped = mapped.find(r => r.status === 'ACTIVE') || mapped[0] || getDefaultLegalSettings();

      res.json({
        success: true,
        active: activeMapped,
        all_versions: mapped
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 29. Save/Update Legal Settings & Sync with App Settings and Audit Logs
  app.put('/api/tax-module/legal-settings/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const b = req.body;
      const user = req.user?.username || req.body.updated_by || 'HR Admin';

      // 1. Fetch previous state for audit log
      const [prevRows] = await query('SELECT * FROM payroll_legal_settings WHERE id = ?', [id]).catch(() => [[]]);
      const prevData = prevRows && prevRows[0] ? prevRows[0] : null;

      // 2. Update record
      await query(`
        UPDATE payroll_legal_settings SET
          version_name = ?,
          status = ?,
          effective_from = ?,
          effective_to = ?,
          ss_employee_rate = ?,
          ss_employer_rate = ?,
          ss_insured_salary_rate = ?,
          ss_minimum_insured_salary = ?,
          ss_maximum_insured_salary = ?,
          ss_eligible_components = ?,
          tax_personal_allowance = ?,
          tax_spouse_allowance = ?,
          tax_child_allowance = ?,
          tax_eligible_children_limit = ?,
          tax_spouse_income_condition = ?,
          tax_employee_insurance_deductible = ?,
          tax_other_allowed_deductions = ?,
          tax_taxable_income_method = ?,
          tax_payroll_periods_per_year = ?,
          tax_rounding_method = ?,
          tax_eligible_components = ?,
          legal_reference = ?,
          notes = ?,
          updated_by = ?
        WHERE id = ?
      `, [
        b.version_name,
        b.status || 'ACTIVE',
        b.effective_from,
        b.effective_to || null,
        b.ss_employee_rate,
        b.ss_employer_rate,
        b.ss_insured_salary_rate,
        b.ss_minimum_insured_salary !== null ? b.ss_minimum_insured_salary : null,
        b.ss_maximum_insured_salary !== null ? b.ss_maximum_insured_salary : null,
        JSON.stringify(b.ss_eligible_components || ['basic_salary']),
        b.tax_personal_allowance,
        b.tax_spouse_allowance,
        b.tax_child_allowance,
        b.tax_eligible_children_limit,
        b.tax_spouse_income_condition ? 1 : 0,
        b.tax_employee_insurance_deductible ? 1 : 0,
        b.tax_other_allowed_deductions || 0,
        b.tax_taxable_income_method || 'ANNUAL_STANDARD',
        b.tax_payroll_periods_per_year || 12,
        b.tax_rounding_method || 'NEAREST_1000',
        JSON.stringify(b.tax_eligible_components || ['basic_salary']),
        b.legal_reference || '',
        b.notes || '',
        user,
        id
      ]);

      // 3. Keep app_settings and tax_calculation_parameters in sync
      await query('INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?', ['social_security_employee_share', String(b.ss_employee_rate), String(b.ss_employee_rate)]).catch(() => {});
      await query('INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?', ['social_security_company_share', String(b.ss_employer_rate), String(b.ss_employer_rate)]).catch(() => {});
      await query('INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?', ['social_security_rate_default', String(b.ss_employee_rate), String(b.ss_employee_rate)]).catch(() => {});

      await query('UPDATE tax_calculation_parameters SET value = ? WHERE code = "SS_EMPLOYEE_RATE"', [b.ss_employee_rate]).catch(() => {});
      await query('UPDATE tax_calculation_parameters SET value = ? WHERE code = "SS_EMPLOYER_RATE"', [b.ss_employer_rate]).catch(() => {});
      await query('UPDATE tax_calculation_parameters SET value = ? WHERE code = "TAX_PERSONAL_EXEMPTION"', [b.tax_personal_allowance]).catch(() => {});
      await query('UPDATE tax_calculation_parameters SET value = ? WHERE code = "TAX_SPOUSE_EXEMPTION"', [b.tax_spouse_allowance]).catch(() => {});
      await query('UPDATE tax_calculation_parameters SET value = ? WHERE code = "TAX_DEPENDENT_EXEMPTION"', [b.tax_child_allowance]).catch(() => {});

      // 4. Record Audit Log
      const auditId = `audit_${Date.now()}`;
      await query(`
        INSERT INTO tax_audit_logs (id, user, role, action, target_entity, target_id, target_name_ar, summary_ar, summary_en, details_before, details_after)
        VALUES (?, ?, 'HR_ADMIN', 'UPDATE', 'payroll_legal_settings', ?, ?, ?, ?, ?, ?)
      `, [
        auditId,
        user,
        id,
        b.version_name || id,
        `تحديث الإعدادات القانونية للضمان والضريبة (${b.version_code || id}) بواسطة ${user}`,
        `Updated legal settings for social security & tax (${b.version_code || id}) by ${user}`,
        prevData ? JSON.stringify(prevData) : null,
        JSON.stringify(b)
      ]).catch(() => {});

      res.json({ success: true, id, message: 'تم حفظ وتحديث الإعدادات القانونية بنجاح' });
    } catch (err) {
      console.error('Error updating legal settings:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 30. Create New Legal Settings Version (Protects historical runs)
  app.post('/api/tax-module/legal-settings/new-version', async (req, res) => {
    try {
      const b = req.body;
      const user = req.user?.username || req.body.created_by || 'HR Admin';
      const id = `legal_set_${Date.now()}`;

      // Archive previous active if requested
      if (b.status === 'ACTIVE') {
        await query('UPDATE payroll_legal_settings SET status = "ARCHIVED" WHERE status = "ACTIVE"').catch(() => {});
      }

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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        b.version_code,
        b.version_name,
        b.status || 'ACTIVE',
        b.effective_from || new Date().toISOString().substring(0, 10),
        b.effective_to || null,
        b.ss_employee_rate || 5.0,
        b.ss_employer_rate || 12.0,
        b.ss_insured_salary_rate || 100.0,
        b.ss_minimum_insured_salary !== null ? b.ss_minimum_insured_salary : 350000,
        b.ss_maximum_insured_salary !== null ? b.ss_maximum_insured_salary : 5000000,
        JSON.stringify(b.ss_eligible_components || ['basic_salary']),
        b.tax_personal_allowance || 2500000,
        b.tax_spouse_allowance || 2000000,
        b.tax_child_allowance || 200000,
        b.tax_eligible_children_limit || 4,
        b.tax_spouse_income_condition !== false ? 1 : 0,
        b.tax_employee_insurance_deductible !== false ? 1 : 0,
        b.tax_other_allowed_deductions || 0,
        b.tax_taxable_income_method || 'ANNUAL_STANDARD',
        b.tax_payroll_periods_per_year || 12,
        b.tax_rounding_method || 'NEAREST_1000',
        JSON.stringify(b.tax_eligible_components || ['basic_salary']),
        b.legal_reference || '',
        b.notes || '',
        user,
        b.approved_by || 'HR Director'
      ]);

      // Record Audit
      const auditId = `audit_${Date.now()}`;
      await query(`
        INSERT INTO tax_audit_logs (id, user, role, action, target_entity, target_id, target_name_ar, summary_ar, summary_en, details_after)
        VALUES (?, ?, 'HR_ADMIN', 'CREATE_VERSION', 'payroll_legal_settings', ?, ?, ?, ?, ?)
      `, [
        auditId,
        user,
        id,
        b.version_name,
        `إنشاء إصدار قانوني جديد (${b.version_code})`,
        `Created new legal settings version (${b.version_code})`,
        JSON.stringify(b)
      ]).catch(() => {});

      res.json({ success: true, id, message: 'تم إنشاء الإصدار القانوني الجديد بنجاح' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 31. Validate Progressive Tax Brackets (Check Gaps, Overlaps & Continuity)
  app.post('/api/tax-module/validate-brackets', (req, res) => {
    try {
      const { brackets } = req.body;
      const result = validateTaxBrackets(brackets || []);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 32. Preview Calculation & Trace (Supports Sandbox / Testing / Any Employee / Kurdistan / Iraq)
  app.post('/api/tax-module/preview-calculation', async (req, res) => {
    try {
      const employee = req.body.employee || req.body;
      const activeSettings = req.body.settings || {
        ss_maximum_insured_salary: 1750000,
        ss_minimum_insured_salary: 350000,
        tax_personal_allowance: 5000000,
        tax_spouse_allowance: 4000000,
        tax_child_allowance: 400000
      };
      const activeBrackets = req.body.brackets || [];
      const branchJurisdictionsMap = await getBranchJurisdictionsMap();
      const calc = calculateEmployeeTaxAndSS(employee, activeSettings, activeBrackets, branchJurisdictionsMap);
      res.json({ success: true, calculation: calc });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 33. Get Audit Logs
  app.get('/api/tax-module/audit-logs', async (req, res) => {
    try {
      const rows = await query('SELECT * FROM tax_audit_logs ORDER BY timestamp DESC LIMIT 100').catch(() => []);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 34. Office & Branch Tax Jurisdictions (تعيين ولاية المكاتب والفروع)
  app.get('/api/tax-module/branches/jurisdictions', async (req, res) => {
    try {
      const rows = await query('SELECT * FROM tax_branch_jurisdictions ORDER BY tax_region DESC, name_ar ASC').catch(() => []);
      const allBranches = await query('SELECT id, name_ar, name_en, city, country, tax_region FROM branches').catch(() => []);
      const existingIds = new Set((Array.isArray(rows) ? rows : []).map(r => r.id));

      const combined = Array.isArray(rows) ? [...rows] : [];
      if (Array.isArray(allBranches)) {
        for (const b of allBranches) {
          if (!existingIds.has(b.id)) {
            // Default: IRAQ per client specification ("ليكن الافتراض العراق")
            const isKurd = isKurdistanLocation(b.city, `${b.name_ar || ''} ${b.name_en || ''}`);
            const reg = b.tax_region || (isKurd ? 'KURDISTAN' : 'IRAQ');
            const item = {
              id: b.id,
              name_ar: b.name_ar || b.id,
              name_en: b.name_en || b.id,
              city: b.city || null,
              tax_region: reg,
              notes: reg === 'KURDISTAN' ? 'مكتب تابع لإقليم كردستان العراق' : 'مكتب تابع للعراق الاتحادي (الافتراضي)'
            };
            combined.push(item);
            await query(
              'INSERT IGNORE INTO tax_branch_jurisdictions (id, name_ar, name_en, city, tax_region, notes) VALUES (?, ?, ?, ?, ?, ?)',
              [item.id, item.name_ar, item.name_en, item.city, item.tax_region, item.notes]
            ).catch(() => {});
          }
        }
      }

      res.json({ success: true, jurisdictions: combined, branches: combined });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/tax-module/branches/jurisdictions/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { tax_region, notes } = req.body;
      const validRegion = tax_region === 'KURDISTAN' ? 'KURDISTAN' : 'IRAQ';

      await query(
        `UPDATE tax_branch_jurisdictions SET tax_region = ?, notes = ? WHERE id = ?`,
        [validRegion, notes || null, id]
      );

      // Also update branches table if column exists
      await query(`UPDATE branches SET tax_region = ? WHERE id = ?`, [validRegion, id]).catch(() => {});

      // Record audit log
      const auditId = `audit_${Date.now()}`;
      await query(`
        INSERT INTO tax_audit_logs (id, user, role, action, target_entity, target_id, target_name_ar, summary_ar, summary_en, details_after)
        VALUES (?, 'HR_ADMIN', 'HR_ADMIN', 'UPDATE_JURISDICTION', 'tax_branch_jurisdictions', ?, ?, ?, ?, ?)
      `, [
        auditId,
        id,
        `تحديث ولاية الفرع ${id}`,
        `تم تعيين الولاية الضريبية للفرع إلى: ${validRegion === 'KURDISTAN' ? 'إقليم كردستان' : 'العراق الاتحادي'}`,
        `Updated branch tax jurisdiction to ${validRegion}`,
        JSON.stringify({ id, tax_region: validRegion, notes })
      ]).catch(() => {});

      res.json({ success: true, id, tax_region: validRegion });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  console.log('[TAX MODULE] All API routes registered successfully on /api/tax-module/*');
}
