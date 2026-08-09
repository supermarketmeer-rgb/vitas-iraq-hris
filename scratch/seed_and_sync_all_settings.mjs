import mysql from 'mysql2/promise';
import config from '../database/config.mjs';

async function seedAndSync() {
  const conn = await mysql.createConnection(config);
  console.log('Connected to MySQL for seeding & syncing settings...');

  // 1. Default Seeds for contract_types if empty
  const [ctRows] = await conn.query('SELECT COUNT(*) as cnt FROM contract_types');
  if (ctRows[0].cnt === 0) {
    console.log('Seeding default contract_types...');
    await conn.query(`
      INSERT INTO contract_types (name_en, name_ar, sort_order, status) VALUES
      ('Full Time Contract', 'عقد دوام كامل', 1, 'Active'),
      ('Part Time Contract', 'عقد دوام جزئي', 2, 'Active'),
      ('Temporary Contract', 'عقد مؤقت', 3, 'Active'),
      ('Consultancy Contract', 'عقد استشاري', 4, 'Active')
    `);
  }

  // 2. Default Seeds for status_changes if empty
  const [scRows] = await conn.query('SELECT COUNT(*) as cnt FROM status_changes');
  if (scRows[0].cnt === 0) {
    console.log('Seeding default status_changes...');
    await conn.query(`
      INSERT INTO status_changes (name_en, name_ar, sort_order, status) VALUES
      ('Active', 'نشط', 1, 'Active'),
      ('On Leave', 'في إجازة', 2, 'Active'),
      ('Suspended', 'موقوف عن العمل', 3, 'Active'),
      ('Terminated', 'منتهي الخدمة', 4, 'Active'),
      ('Resigned', 'مستقيل', 5, 'Active')
    `);
  }

  // 3. Default Seeds for trainings if empty
  const [trRows] = await conn.query('SELECT COUNT(*) as cnt FROM trainings');
  if (trRows[0].cnt === 0) {
    console.log('Seeding default trainings...');
    await conn.query(`
      INSERT INTO trainings (name_en, name_ar, sort_order, status) VALUES
      ('Safety & Security Training', 'تدريب السلامة والأمن', 1, 'Active'),
      ('Leadership & Management', 'تدريب القيادة والإدارة', 2, 'Active'),
      ('Technical & IT Skills', 'المهارات التقنية وتكنولوجيا المعلومات', 3, 'Active'),
      ('Customer Service & Communication', 'خدمة العملاء والاتصال', 4, 'Active'),
      ('Credit & Financial Analysis', 'الائتمان والتحليل المالي', 5, 'Active')
    `);
  }

  // 4. Default Seeds for app_settings if empty
  const [asRows] = await conn.query('SELECT COUNT(*) as cnt FROM app_settings');
  if (asRows[0].cnt === 0) {
    console.log('Seeding default app_settings...');
    const defaultAppSettings = [
      ['currency', 'IQD'],
      ['housing_allowance_default', '150000'],
      ['child_allowance_default', '25000'],
      ['marriage_allowance_default', '50000'],
      ['transportation_allowance_default', '100000'],
      ['working_hours_per_day', '8'],
      ['working_days_per_month', '22'],
      ['overtime_rate_multiplier', '1.5'],
      ['annual_leave_days_default', '21'],
      ['sick_leave_days_default', '14'],
      ['probation_period_months', '3']
    ];
    for (const [k, v] of defaultAppSettings) {
      await conn.query('INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)', [k, v]);
    }
  }

  // 5. Extract unique Branches / Locations from employees table and sync to branches table
  const [empLocations] = await conn.query(`
    SELECT DISTINCT location_ar, location_en FROM employees 
    WHERE (location_ar IS NOT NULL AND location_ar != '') OR (location_en IS NOT NULL AND location_en != '')
  `);
  const [existingBranches] = await conn.query('SELECT * FROM branches');
  
  for (const loc of empLocations) {
    const nameAr = loc.location_ar || loc.location_en;
    const nameEn = loc.location_en || loc.location_ar;
    if (nameAr && !existingBranches.some(b => b.name_ar === nameAr || b.name === nameAr || b.name_en === nameEn)) {
      console.log(`Syncing missing branch from employees: ${nameAr}`);
      await conn.query(
        'INSERT INTO branches (id, name, name_ar, name_en, status, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [`BR${Date.now()}_${Math.floor(Math.random()*1000)}`, nameAr, nameAr, nameEn, 'Active', existingBranches.length + 1]
      );
    }
  }

  // 6. Extract unique Positions from employees table and sync to positions table
  const [empPositions] = await conn.query(`
    SELECT DISTINCT position, position_ar, position_en FROM employees 
    WHERE (position_ar IS NOT NULL AND position_ar != '') OR (position_en IS NOT NULL AND position_en != '') OR (position IS NOT NULL AND position != '')
  `);
  const [existingPositions] = await conn.query('SELECT * FROM positions');

  for (const pos of empPositions) {
    const nameAr = pos.position_ar || pos.position || pos.position_en;
    const nameEn = pos.position_en || pos.position || pos.position_ar;
    if (nameAr && !existingPositions.some(p => p.name_ar === nameAr || p.name === nameAr || p.name_en === nameEn)) {
      console.log(`Syncing missing position from employees: ${nameAr}`);
      await conn.query(
        'INSERT INTO positions (name_en, name_ar, name, status, sort_order) VALUES (?, ?, ?, ?, ?)',
        [nameEn, nameAr, nameAr, 'Active', existingPositions.length + 1]
      );
    }
  }

  // 7. Extract unique Departments from employees table and sync to departments table
  const [empDepts] = await conn.query(`
    SELECT DISTINCT department FROM employees 
    WHERE department IS NOT NULL AND department != ''
  `);
  const [existingDepts] = await conn.query('SELECT * FROM departments');

  for (const d of empDepts) {
    const nameAr = d.department;
    if (nameAr && !existingDepts.some(dep => dep.name_ar === nameAr || dep.name === nameAr)) {
      console.log(`Syncing missing department from employees: ${nameAr}`);
      await conn.query(
        'INSERT INTO departments (name_en, name_ar, name, status, sort_order) VALUES (?, ?, ?, ?, ?)',
        [nameAr, nameAr, nameAr, 'Active', existingDepts.length + 1]
      );
    }
  }

  // 8. Extract unique Contract Terms from employees table and sync to contract_types table
  const [empContracts] = await conn.query(`
    SELECT DISTINCT term_of_contract FROM employees 
    WHERE term_of_contract IS NOT NULL AND term_of_contract != ''
  `);
  const [existingCT] = await conn.query('SELECT * FROM contract_types');

  for (const ct of empContracts) {
    const nameAr = ct.term_of_contract;
    if (nameAr && !existingCT.some(c => c.name_ar === nameAr || c.name_en === nameAr)) {
      console.log(`Syncing missing contract type from employees: ${nameAr}`);
      await conn.query(
        'INSERT INTO contract_types (name_en, name_ar, status, sort_order) VALUES (?, ?, ?, ?)',
        [nameAr, nameAr, 'Active', existingCT.length + 1]
      );
    }
  }

  console.log('Seeding and Syncing Completed Successfully!');
  await conn.end();
}

seedAndSync().catch(console.error);
