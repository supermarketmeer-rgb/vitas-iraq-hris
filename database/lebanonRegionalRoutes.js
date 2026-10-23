/**
 * Lebanon Regional Office Backend Routes & Services
 * Self-contained module for Beirut Regional Office (Mini-HRMS)
 * Does not modify or disrupt existing Iraq HRIS logic.
 */

export function registerLebanonRegionalRoutes(app, query, executeCloudQuery) {
  // Ensure table for lebanon office info
  const ensureOfficeTable = async () => {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS lebanon_office_info (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          name_en VARCHAR(255) NULL,
          city VARCHAR(100) NULL,
          country VARCHAR(100) NULL,
          address TEXT NULL,
          phone VARCHAR(100) NULL,
          email VARCHAR(150) NULL,
          currency VARCHAR(20) DEFAULT 'USD ($)',
          status VARCHAR(50) DEFAULT 'Active',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      
      const existing = await query("SELECT id FROM lebanon_office_info WHERE id = 'BR_LEBANON_BEIRUT'").catch(() => []);
      if (!existing || existing.length === 0) {
        await query(`
          INSERT INTO lebanon_office_info (id, name, name_en, city, country, address, phone, email, currency, status)
          VALUES ('BR_LEBANON_BEIRUT', 'مكتب بيروت - لبنان', 'Beirut Regional Office - Lebanon', 'Beirut (Downtown)', 'Lebanon', 'Downtown Beirut, Banking District, Building 4', '+961 1 987654', 'beirut.office@vitaslebanon.com', 'USD ($)', 'Active')
        `).catch(() => {});
      }
    } catch (e) {
      console.warn('Could not ensure lebanon_office_info table', e.message);
    }
  };
  ensureOfficeTable();

  // 1. Office Overview & Metrics
  app.get('/api/regional/lebanon/overview', async (req, res) => {
    try {
      const employees = await query('SELECT * FROM lebanon_employees').catch(() => []);
      const contracts = await query('SELECT * FROM lebanon_contracts').catch(() => []);
      const payroll = await query('SELECT * FROM lebanon_payroll').catch(() => []);
      const leaves = await query('SELECT * FROM lebanon_leaves').catch(() => []);
      const approvals = await query('SELECT * FROM lebanon_approvals').catch(() => []);
      const officeRows = await query("SELECT * FROM lebanon_office_info WHERE id = 'BR_LEBANON_BEIRUT'").catch(() => []);

      const activeEmployees = employees.filter(e => e.status === 'Active').length;
      const totalSalariesUsd = payroll.reduce((acc, p) => acc + (Number(p.net_salary_usd) || 0), 0);
      const pendingApprovals = approvals.filter(a => a.status === 'Pending').length;

      const defaultOffice = {
        id: 'BR_LEBANON_BEIRUT',
        name: 'مكتب بيروت - لبنان',
        name_en: 'Beirut Regional Office - Lebanon',
        city: 'Beirut (Downtown)',
        country: 'Lebanon',
        address: 'Downtown Beirut, Banking District, Building 4',
        phone: '+961 1 987654',
        email: 'beirut.office@vitaslebanon.com',
        status: 'Active',
        currency: 'USD ($)'
      };

      res.json({
        office: officeRows && officeRows.length > 0 ? officeRows[0] : defaultOffice,
        stats: {
          totalEmployees: employees.length,
          activeEmployees,
          activeContracts: contracts.filter(c => c.status === 'Active').length,
          totalSalariesUsd,
          pendingApprovals,
          supervisorsCount: employees.filter(e => e.is_supervisor || e.can_supervise_iraq).length
        }
      });
    } catch (err) {
      console.error('Error fetching Lebanon overview:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Update Lebanon Office Info
  app.put('/api/regional/lebanon/office', async (req, res) => {
    try {
      const data = req.body || {};
      await query(`
        INSERT INTO lebanon_office_info (id, name, name_en, city, country, address, phone, email, currency, status)
        VALUES ('BR_LEBANON_BEIRUT', ?, ?, ?, ?, ?, ?, ?, ?, 'Active')
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          name_en = VALUES(name_en),
          city = VALUES(city),
          country = VALUES(country),
          address = VALUES(address),
          phone = VALUES(phone),
          email = VALUES(email),
          currency = VALUES(currency)
      `, [
        data.name ?? 'مكتب بيروت - لبنان',
        data.name_en ?? 'Beirut Regional Office - Lebanon',
        data.city ?? 'Beirut (Downtown)',
        data.country ?? 'Lebanon',
        data.address ?? 'Downtown Beirut, Banking District, Building 4',
        data.phone ?? '+961 1 987654',
        data.email ?? '',
        data.currency ?? 'USD ($)'
      ]);
      const updated = await query("SELECT * FROM lebanon_office_info WHERE id = 'BR_LEBANON_BEIRUT'");
      res.json({ success: true, office: updated && updated[0] ? updated[0] : data });
    } catch (err) {
      console.error('Error updating Lebanon office info:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Lebanon Employees CRUD
  app.get('/api/regional/lebanon/employees', async (req, res) => {
    try {
      const rows = await query('SELECT * FROM lebanon_employees ORDER BY created_at DESC');
      res.json(rows || []);
    } catch (err) {
      console.error('Error in GET /api/regional/lebanon/employees:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/regional/lebanon/employees', async (req, res) => {
    try {
      const data = req.body;
      const finalId = data.id || `LBN_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const empId = data.employee_id || `LBN-${Math.floor(1000 + Math.random() * 9000)}`;

      const sql = `
        INSERT INTO lebanon_employees (
          id, employee_id, badge_no, waid, name, name_en, email, phone,
          country, city, branch, department, job_title, job_title_en,
          direct_manager_id, is_supervisor, can_supervise_iraq, hire_date,
          contract_type, status, basic_salary, currency, social_security_nssf,
          tax_id, address, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Lebanon', 'Beirut', 'مكتب بيروت - لبنان', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'USD', ?, ?, ?, ?)
      `;
      const params = [
        finalId,
        empId,
        data.badge_no || null,
        data.waid || null,
        data.name,
        data.name_en || data.name,
        data.email || null,
        data.phone || null,
        data.department || 'الإدارة الإقليمية',
        data.job_title || 'موظف إقليمي',
        data.job_title_en || 'Regional Staff',
        data.direct_manager_id || null,
        data.is_supervisor ? 1 : 0,
        data.can_supervise_iraq !== undefined ? (data.can_supervise_iraq ? 1 : 0) : 1,
        data.hire_date || null,
        data.contract_type || 'عقد دوام كامل',
        data.status || 'Active',
        Number(data.basic_salary) || 0.00,
        data.social_security_nssf || null,
        data.tax_id || null,
        data.address || null,
        data.notes || null
      ];

      await query(sql, params);
      executeCloudQuery(sql, params).catch(() => {});

      const rows = await query('SELECT * FROM lebanon_employees WHERE id = ?', [finalId]);
      res.status(201).json(rows && rows[0] ? rows[0] : { id: finalId, ...data });
    } catch (err) {
      console.error('Error in POST /api/regional/lebanon/employees:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/regional/lebanon/employees/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;

      const sql = `
        UPDATE lebanon_employees SET
          name = ?,
          name_en = ?,
          email = ?,
          phone = ?,
          badge_no = ?,
          waid = ?,
          department = ?,
          job_title = ?,
          job_title_en = ?,
          direct_manager_id = ?,
          is_supervisor = ?,
          can_supervise_iraq = ?,
          hire_date = ?,
          contract_type = ?,
          status = ?,
          basic_salary = ?,
          social_security_nssf = ?,
          tax_id = ?,
          address = ?,
          notes = ?
        WHERE id = ? OR employee_id = ?
      `;
      const params = [
        data.name,
        data.name_en || data.name,
        data.email || null,
        data.phone || null,
        data.badge_no || null,
        data.waid || null,
        data.department || 'الإدارة الإقليمية',
        data.job_title || 'موظف إقليمي',
        data.job_title_en || 'Regional Staff',
        data.direct_manager_id || null,
        data.is_supervisor ? 1 : 0,
        data.can_supervise_iraq ? 1 : 0,
        data.hire_date || null,
        data.contract_type || 'عقد دوام كامل',
        data.status || 'Active',
        Number(data.basic_salary) || 0.00,
        data.social_security_nssf || null,
        data.tax_id || null,
        data.address || null,
        data.notes || null,
        id,
        id
      ];

      await query(sql, params);
      executeCloudQuery(sql, params).catch(() => {});

      const rows = await query('SELECT * FROM lebanon_employees WHERE id = ? OR employee_id = ?', [id, id]);
      res.json(rows && rows[0] ? rows[0] : { id, ...data });
    } catch (err) {
      console.error('Error in PUT /api/regional/lebanon/employees:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/regional/lebanon/employees/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await query('DELETE FROM lebanon_employees WHERE id = ? OR employee_id = ?', [id, id]);
      res.json({ success: true, id });
    } catch (err) {
      console.error('Error in DELETE /api/regional/lebanon/employees:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Lebanon Supervisors (Can supervise Iraq Employees)
  app.get('/api/regional/lebanon/supervisors', async (req, res) => {
    try {
      const rows = await query(`
        SELECT id, employee_id, name, name_en, job_title, job_title_en, department, email, phone, country
        FROM lebanon_employees
        WHERE (is_supervisor = 1 OR can_supervise_iraq = 1) AND status = 'Active'
      `);
      res.json(rows || []);
    } catch (err) {
      console.error('Error fetching Lebanon supervisors:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Lebanon Contracts
  app.get('/api/regional/lebanon/contracts', async (req, res) => {
    try {
      const sql = `
        SELECT c.*, e.name as employee_name, e.job_title as employee_job_title
        FROM lebanon_contracts c
        LEFT JOIN lebanon_employees e ON c.employee_id = e.employee_id OR c.employee_id = e.id
        ORDER BY c.created_at DESC
      `;
      const rows = await query(sql);
      res.json(rows || []);
    } catch (err) {
      console.error('Error fetching Lebanon contracts:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/regional/lebanon/contracts', async (req, res) => {
    try {
      const data = req.body;
      const id = data.id || `CTR_LBN_${Date.now()}`;
      const sql = `
        INSERT INTO lebanon_contracts (
          id, employee_id, contract_ref, contract_type, start_date, end_date,
          basic_salary_usd, transportation_allowance_usd, living_allowance_usd,
          probation_months, job_title, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          contract_type = VALUES(contract_type),
          start_date = VALUES(start_date),
          end_date = VALUES(end_date),
          basic_salary_usd = VALUES(basic_salary_usd),
          transportation_allowance_usd = VALUES(transportation_allowance_usd),
          living_allowance_usd = VALUES(living_allowance_usd),
          status = VALUES(status),
          notes = VALUES(notes)
      `;
      const params = [
        id,
        data.employee_id,
        data.contract_ref || `CTR-${Date.now().toString().slice(-4)}`,
        data.contract_type || 'عقد محدد المدة',
        data.start_date,
        data.end_date || null,
        Number(data.basic_salary_usd) || 0.00,
        Number(data.transportation_allowance_usd) || 0.00,
        Number(data.living_allowance_usd) || 0.00,
        Number(data.probation_months) || 3,
        data.job_title || null,
        data.status || 'Active',
        data.notes || null
      ];

      await query(sql, params);
      res.json({ success: true, id, ...data });
    } catch (err) {
      console.error('Error saving Lebanon contract:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Lebanon Payroll (Columns tailored for Lebanon USD & NSSF)
  app.get('/api/regional/lebanon/payroll', async (req, res) => {
    try {
      const sql = `
        SELECT p.*, e.name as employee_name, e.job_title as employee_job_title
        FROM lebanon_payroll p
        LEFT JOIN lebanon_employees e ON p.employee_id = e.employee_id OR p.employee_id = e.id
        ORDER BY p.month_year DESC, p.created_at DESC
      `;
      const rows = await query(sql);
      res.json(rows || []);
    } catch (err) {
      console.error('Error fetching Lebanon payroll:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/regional/lebanon/payroll', async (req, res) => {
    try {
      const data = req.body;
      const id = data.id || `PAY_LBN_${Date.now()}`;
      const basic = Number(data.basic_salary_usd) || 0;
      const transport = Number(data.transportation_allowance_usd) || 0;
      const living = Number(data.living_allowance_usd) || 0;
      const bonus = Number(data.bonus_usd) || 0;
      const gross = basic + transport + living + bonus;
      const nssf = Number(data.nssf_deduction_usd) || 0;
      const tax = Number(data.tax_deduction_usd) || 0;
      const other = Number(data.other_deductions_usd) || 0;
      const net = gross - (nssf + tax + other);

      const sql = `
        INSERT INTO lebanon_payroll (
          id, employee_id, month_year, basic_salary_usd, transportation_allowance_usd,
          living_allowance_usd, bonus_usd, gross_salary_usd, nssf_deduction_usd,
          tax_deduction_usd, other_deductions_usd, net_salary_usd, currency,
          status, payment_date, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'USD', ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          basic_salary_usd = VALUES(basic_salary_usd),
          transportation_allowance_usd = VALUES(transportation_allowance_usd),
          living_allowance_usd = VALUES(living_allowance_usd),
          bonus_usd = VALUES(bonus_usd),
          gross_salary_usd = VALUES(gross_salary_usd),
          nssf_deduction_usd = VALUES(nssf_deduction_usd),
          tax_deduction_usd = VALUES(tax_deduction_usd),
          other_deductions_usd = VALUES(other_deductions_usd),
          net_salary_usd = VALUES(net_salary_usd),
          status = VALUES(status),
          payment_date = VALUES(payment_date),
          notes = VALUES(notes)
      `;
      const params = [
        id,
        data.employee_id,
        data.month_year,
        basic,
        transport,
        living,
        bonus,
        gross,
        nssf,
        tax,
        other,
        net,
        data.status || 'Draft',
        data.payment_date || null,
        data.notes || null
      ];

      await query(sql, params);
      res.json({ success: true, id, gross_salary_usd: gross, net_salary_usd: net });
    } catch (err) {
      console.error('Error saving Lebanon payroll:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Lebanon Leaves & Attendance
  app.get('/api/regional/lebanon/leaves', async (req, res) => {
    try {
      const sql = `
        SELECT l.*, e.name as employee_name, e.job_title as employee_job_title
        FROM lebanon_leaves l
        LEFT JOIN lebanon_employees e ON l.employee_id = e.employee_id OR l.employee_id = e.id
        ORDER BY l.created_at DESC
      `;
      const rows = await query(sql);
      res.json(rows || []);
    } catch (err) {
      console.error('Error fetching Lebanon leaves:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/regional/lebanon/leaves', async (req, res) => {
    try {
      const data = req.body;
      const id = data.id || `LV_LBN_${Date.now()}`;
      const sql = `
        INSERT INTO lebanon_leaves (
          id, employee_id, leave_type, start_date, end_date, days_count, reason, status, approved_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          leave_type = VALUES(leave_type),
          start_date = VALUES(start_date),
          end_date = VALUES(end_date),
          days_count = VALUES(days_count),
          reason = VALUES(reason),
          status = VALUES(status),
          approved_by = VALUES(approved_by)
      `;
      const params = [
        id,
        data.employee_id,
        data.leave_type,
        data.start_date,
        data.end_date,
        Number(data.days_count) || 1,
        data.reason || null,
        data.status || 'Pending',
        data.approved_by || null
      ];

      await query(sql, params);
      res.json({ success: true, id });
    } catch (err) {
      console.error('Error saving Lebanon leave:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Lebanon Approvals Workflow
  app.get('/api/regional/lebanon/approvals', async (req, res) => {
    try {
      const rows = await query('SELECT * FROM lebanon_approvals ORDER BY created_at DESC');
      res.json(rows || []);
    } catch (err) {
      console.error('Error fetching Lebanon approvals:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/regional/lebanon/approvals', async (req, res) => {
    try {
      const data = req.body;
      const id = data.id || `APP_LBN_${Date.now()}`;
      const sql = `
        INSERT INTO lebanon_approvals (
          id, title, request_type, target_id, requested_by, status, details, comments, approved_by, approved_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          status = VALUES(status),
          comments = VALUES(comments),
          approved_by = VALUES(approved_by),
          approved_at = VALUES(approved_at)
      `;
      const params = [
        id,
        data.title,
        data.request_type || 'Other',
        data.target_id || null,
        data.requested_by || 'HR Lebanon',
        data.status || 'Pending',
        data.details ? JSON.stringify(data.details) : null,
        data.comments || null,
        data.approved_by || null,
        data.status === 'Approved' ? new Date() : null
      ];

      await query(sql, params);
      res.json({ success: true, id });
    } catch (err) {
      console.error('Error saving Lebanon approval:', err);
      res.status(500).json({ error: err.message });
    }
  });
}
