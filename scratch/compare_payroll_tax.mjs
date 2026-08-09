import mysql from 'mysql2/promise';
import config from '../database/config.mjs';

async function compareCalculations() {
  const db = await mysql.createConnection(config);
  const [emps] = await db.query('SELECT * FROM employees');
  const [settings] = await querySettings(db);

  console.log(`Analyzing ${emps.length} employees...`);

  // Calculation Method A: taxRoutes.js
  let taxRoutesSS = 0;
  let taxRoutesTax = 0;

  // Calculation Method B: Category5PayrollView.tsx
  let payrollSS = 0;
  let payrollTax = 0;

  for (const e of emps) {
    let childrenList = [];
    if (e.children_details) {
      try { childrenList = JSON.parse(e.children_details); } catch (err) {}
    }
    const dependentsCount = Array.isArray(childrenList) ? childrenList.length : 0;
    const isMarried = (e.marital_status === 'married' || e.marital_status === 'متأهل' || e.maritalStatus === 'متأهل');

    // Method A (taxRoutes.js)
    const basicA = Number(e.basic_salary) || 1200000;
    const ssBaseA = Math.max(350000, Math.min(5000000, basicA));
    const empSSA = Math.round(ssBaseA * 0.05);

    const housingA = Number(e.housing_allowance) || 0;
    const transportA = Number(e.transportation_allowance) || 100000;
    const livingA = Number(e.phone_allowance) || 0;
    const spouseA = isMarried ? 15000 : 0;
    const childA = dependentsCount * 7500;
    const grossA = basicA + housingA + transportA + livingA + spouseA + childA;

    const totalExemptionA = (2500000/12) + (isMarried ? 2000000/12 : 0) + (dependentsCount * 200000/12) + empSSA;
    const taxableA = Math.max(0, grossA - totalExemptionA);
    const taxA = Math.round(taxableA * 0.03);

    taxRoutesSS += empSSA;
    taxRoutesTax += taxA;

    // Method B (Category5PayrollView.tsx)
    const basicB = Number(e.basic_salary || e.basicSalary || e.salary || 1200000);
    const empSSB = Math.round(basicB * 0.05);

    const phoneB = Number(e.phone_allowance || e.phoneAllowance || 0);
    const certB = Number(e.certificate_allowance || e.certificateAllowance || 0);
    const transB = Number(e.transportation_allowance || e.transportationFixed || 0);
    const bonusB = Number(e.fixed_bonus || e.fixedBonus || 0);
    const spouseB = isMarried ? (Number(settings['marriage_allowance_default']) || 50000) : 0;
    const childB = dependentsCount * (Number(settings['child_allowance_default']) || 25000);
    const grossB = basicB + phoneB + certB + transB + bonusB + spouseB + childB;

    const monthlyExemptionB = isMarried ? (375000 + dependentsCount * 16667) : 208333;
    const taxableB = Math.max(0, grossB - empSSB - monthlyExemptionB);
    
    let b1 = Math.min(taxableB, 250000) * 0.03;
    let b2 = taxableB > 250000 ? Math.min(taxableB - 250000, 250000) * 0.05 : 0;
    let b3 = taxableB > 500000 ? Math.min(taxableB - 500000, 500000) * 0.10 : 0;
    let b4 = taxableB > 1000000 ? (taxableB - 1000000) * 0.15 : 0;
    const taxB = Math.round(b1 + b2 + b3 + b4);

    payrollSS += empSSB;
    payrollTax += taxB;
  }

  console.log('--- TAX ROUTES (Tax Engine) ---');
  console.log('Social Security Emp (5%):', taxRoutesSS.toLocaleString());
  console.log('Income Tax:', taxRoutesTax.toLocaleString());

  console.log('\n--- PAYROLL VIEW (Category5) ---');
  console.log('Social Security Emp (5%):', payrollSS.toLocaleString());
  console.log('Income Tax:', payrollTax.toLocaleString());

  await db.end();
}

async function querySettings(db) {
  const [rows] = await db.query('SELECT setting_key, setting_value FROM app_settings').catch(() => [[]]);
  const map = {};
  (Array.isArray(rows) ? rows : []).forEach(r => { map[r.setting_key] = r.setting_value; });
  return [map];
}

compareCalculations().catch(console.error);
