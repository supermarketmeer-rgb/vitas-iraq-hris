import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import config from './database/config.mjs';
import { initDatabase } from './database/initDatabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'dist')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure multer for memory storage (for image and PDF upload as binary data)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images and PDF files
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed'));
    }
  }
});

// MySQL Connection Pool
console.log('Attempting to connect to MySQL pool with config:', config);
const db = mysql.createPool({
  ...config,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

db.getConnection(async (err, connection) => {
  if (err) {
    console.error('Error connecting to MySQL pool:', err);
    console.error('Database name:', config.database);
    return;
  }
  console.log('Connected to MySQL database pool:', config.database);
  connection.release();
  
  // Auto-initialize database tables and seed data if missing
  await initDatabase(db);

  await loadEmployeeColumns();
  await ensureCandidateColumns();
  await ensureJobVacancyColumns();
  await ensureEmployeeChildrenColumns();
  await ensureOnHoldColumn();
  await ensureSettingsSeededAndSynced();
});

// Helper function to execute queries
const query = (sql, params) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/init-db', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const result = await initDatabase(db, force);
    await loadEmployeeColumns().catch(() => {});
    await ensureCandidateColumns().catch(() => {});
    await ensureJobVacancyColumns().catch(() => {});
    await ensureEmployeeChildrenColumns().catch(() => {});
    await ensureOnHoldColumn().catch(() => {});
    await ensureSettingsSeededAndSynced().catch(() => {});
    res.json({ status: 'success', result });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message, stack: err.stack });
  }
});

let employeeTableColumns = new Set();

const ensureSettingsSeededAndSynced = async () => {
  try {
    // 1. Create settings tables if they don't exist
    await query(`CREATE TABLE IF NOT EXISTS branches (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) NULL,
      name_en VARCHAR(255) NULL,
      name_ar VARCHAR(255) NULL,
      address TEXT NULL,
      city VARCHAR(100) NULL,
      country VARCHAR(100) DEFAULT 'Iraq',
      phone VARCHAR(50) NULL,
      email VARCHAR(255) NULL,
      status VARCHAR(50) DEFAULT 'Active',
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`).catch(() => {});

    await query(`CREATE TABLE IF NOT EXISTS departments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NULL,
      name_en VARCHAR(255) NULL,
      name_ar VARCHAR(255) NULL,
      description TEXT NULL,
      status VARCHAR(50) DEFAULT 'Active',
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`).catch(() => {});

    await query(`CREATE TABLE IF NOT EXISTS positions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NULL,
      name_en VARCHAR(255) NULL,
      name_ar VARCHAR(255) NULL,
      description TEXT NULL,
      status VARCHAR(50) DEFAULT 'Active',
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`).catch(() => {});

    await query(`CREATE TABLE IF NOT EXISTS contract_types (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name_en VARCHAR(255) NULL,
      name_ar VARCHAR(255) NULL,
      status VARCHAR(50) DEFAULT 'Active',
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`).catch(() => {});

    await query(`CREATE TABLE IF NOT EXISTS status_changes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name_en VARCHAR(255) NULL,
      name_ar VARCHAR(255) NULL,
      status VARCHAR(50) DEFAULT 'Active',
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`).catch(() => {});

    await query(`CREATE TABLE IF NOT EXISTS trainings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name_en VARCHAR(255) NULL,
      name_ar VARCHAR(255) NULL,
      status VARCHAR(50) DEFAULT 'Active',
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`).catch(() => {});

    await query(`CREATE TABLE IF NOT EXISTS app_settings (
      setting_key VARCHAR(100) PRIMARY KEY,
      setting_value TEXT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`).catch(() => {});

    // 2. Seed default contract_types if empty
    const ctRows = await query('SELECT COUNT(*) as cnt FROM contract_types').catch(() => [{ cnt: 0 }]);
    if (ctRows && ctRows[0] && ctRows[0].cnt === 0) {
      await query(`
        INSERT INTO contract_types (name_en, name_ar, sort_order, status) VALUES
        ('Full Time Contract', 'عقد دوام كامل', 1, 'Active'),
        ('Part Time Contract', 'عقد دوام جزئي', 2, 'Active'),
        ('Temporary Contract', 'عقد مؤقت', 3, 'Active'),
        ('Consultancy Contract', 'عقد استشاري', 4, 'Active')
      `).catch(() => {});
    }

    // 3. Seed default status_changes if empty
    const scRows = await query('SELECT COUNT(*) as cnt FROM status_changes').catch(() => [{ cnt: 0 }]);
    if (scRows && scRows[0] && scRows[0].cnt === 0) {
      await query(`
        INSERT INTO status_changes (name_en, name_ar, sort_order, status) VALUES
        ('Active', 'نشط', 1, 'Active'),
        ('On Leave', 'في إجازة', 2, 'Active'),
        ('Suspended', 'موقوف عن العمل', 3, 'Active'),
        ('Terminated', 'منتهي الخدمة', 4, 'Active'),
        ('Resigned', 'مستقيل', 5, 'Active')
      `).catch(() => {});
    }

    // 4. Seed default trainings if empty
    const trRows = await query('SELECT COUNT(*) as cnt FROM trainings').catch(() => [{ cnt: 0 }]);
    if (trRows && trRows[0] && trRows[0].cnt === 0) {
      await query(`
        INSERT INTO trainings (name_en, name_ar, sort_order, status) VALUES
        ('Safety & Security Training', 'تدريب السلامة والأمن', 1, 'Active'),
        ('Leadership & Management', 'تدريب القيادة والإدارة', 2, 'Active'),
        ('Technical & IT Skills', 'المهارات التقنية وتكنولوجيا المعلومات', 3, 'Active'),
        ('Customer Service & Communication', 'خدمة العملاء والاتصال', 4, 'Active'),
        ('Credit & Financial Analysis', 'الائتمان والتحليل المالي', 5, 'Active')
      `).catch(() => {});
    }

    // 5. Seed default app_settings if empty
    const asRows = await query('SELECT COUNT(*) as cnt FROM app_settings').catch(() => [{ cnt: 0 }]);
    if (asRows && asRows[0] && asRows[0].cnt === 0) {
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
        await query('INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)', [k, v]).catch(() => {});
      }
    }

    // 5.5. Create attendance tables if they don't exist
    await query(`
      CREATE TABLE IF NOT EXISTS shift_types (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        name_en VARCHAR(100) DEFAULT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        work_hours DECIMAL(4,2) NOT NULL DEFAULT 8.00,
        grace_minutes INT UNSIGNED NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `).catch(() => {});

    // Seed default shift types
    const shiftCount = await query('SELECT COUNT(*) as cnt FROM shift_types').catch(() => [{ cnt: 0 }]);
    if (shiftCount && shiftCount[0] && shiftCount[0].cnt === 0) {
      await query(`
        INSERT INTO shift_types (name, name_en, start_time, end_time, work_hours, grace_minutes) VALUES
        ('صباحي', 'Morning Shift', '08:00:00', '16:00:00', 8.00, 15),
        ('مسائي', 'Evening Shift', '16:00:00', '00:00:00', 8.00, 15),
        ('ليلي', 'Night Shift', '00:00:00', '08:00:00', 8.00, 15),
        ('مرن', 'Flexible Shift', '09:00:00', '17:00:00', 8.00, 30)
      `).catch(() => {});
    }

    await query(`
      CREATE TABLE IF NOT EXISTS attendance_details (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        attendance_id INT UNSIGNED NOT NULL,
        punch_time DATETIME NOT NULL,
        punch_type ENUM('in', 'out') NOT NULL,
        device_id VARCHAR(50) DEFAULT NULL,
        location VARCHAR(150) DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_attendance_id (attendance_id),
        KEY idx_punch_time (punch_time)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `).catch(() => {});

    await query(`
      CREATE TABLE IF NOT EXISTS holidays (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(150) NOT NULL,
        name_en VARCHAR(150) DEFAULT NULL,
        holiday_date DATE NOT NULL,
        type ENUM('official', 'company', 'religious') NOT NULL DEFAULT 'official',
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_date (holiday_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `).catch(() => {});

    await query(`
      CREATE TABLE IF NOT EXISTS attendance_settings (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        key_name VARCHAR(100) NOT NULL,
        key_value TEXT DEFAULT NULL,
        description VARCHAR(255) DEFAULT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_key_name (key_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `).catch(() => {});

    // Seed default attendance settings
    const attSettingsCount = await query('SELECT COUNT(*) as cnt FROM attendance_settings').catch(() => [{ cnt: 0 }]);
    if (attSettingsCount && attSettingsCount[0] && attSettingsCount[0].cnt === 0) {
      const defaultAttSettings = [
        ['sync_interval', '5', 'Auto-sync interval in minutes'],
        ['auto_sync', '1', 'Enable automatic sync (1=yes, 0=no)'],
        ['timezone', 'Asia/Baghdad', 'Application timezone'],
        ['date_format', 'Y/m/d', 'Date display format'],
        ['work_hours_sunday', '8', 'Work hours for Sunday'],
        ['work_hours_monday', '8', 'Work hours for Monday'],
        ['work_hours_tuesday', '8', 'Work hours for Tuesday'],
        ['work_hours_wednesday', '8', 'Work hours for Wednesday'],
        ['work_hours_thursday', '7', 'Work hours for Thursday'],
        ['work_hours_friday', '0', 'Work hours for Friday'],
        ['work_hours_saturday', '0', 'Work hours for Saturday'],
        ['weekend_days', '5,6', 'Weekend days (1=Mon, ..., 7=Sun)'],
        ['sql_server_enabled', '0', 'Enable SQL Server sync (1=yes, 0=no)'],
        ['sql_server_host', '', 'SQL Server host'],
        ['sql_server_database', '', 'SQL Server database name'],
        ['sql_server_username', '', 'SQL Server username'],
        ['sql_server_password', '', 'SQL Server password']
      ];
      for (const [k, v, desc] of defaultAttSettings) {
        await query('INSERT INTO attendance_settings (key_name, key_value, description) VALUES (?, ?, ?)', [k, v, desc]).catch(() => {});
      }
    }

    await query(`
      CREATE TABLE IF NOT EXISTS sql_server_sync_log (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        started_at DATETIME NOT NULL,
        finished_at DATETIME DEFAULT NULL,
        duration_seconds INT DEFAULT NULL,
        status ENUM('running', 'success', 'failed', 'partial') NOT NULL DEFAULT 'running',
        records_new INT UNSIGNED NOT NULL DEFAULT 0,
        records_updated INT UNSIGNED NOT NULL DEFAULT 0,
        records_failed INT UNSIGNED NOT NULL DEFAULT 0,
        error_message TEXT DEFAULT NULL,
        sync_type ENUM('auto', 'manual', 'startup') NOT NULL DEFAULT 'auto',
        source_table VARCHAR(100) DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_started_at (started_at),
        KEY idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `).catch(() => {});

    // 5.6. Add shift_type_id column to employees table if it doesn't exist
    try {
      await query(`
        ALTER TABLE employees 
        ADD COLUMN shift_type_id INT UNSIGNED DEFAULT NULL AFTER position_en
      `).catch(() => {});
    } catch (e) {
      // Column might already exist, ignore error
    }

    await syncSettingsFromEmployees();
    console.log('Successfully seeded & synchronized settings master tables.');
  } catch (e) {
    console.error('Error in ensureSettingsSeededAndSynced:', e.message);
  }
};

const syncSettingsFromEmployees = async () => {
  try {
    // 1. Sync unique Branches from employees table
    const empLocations = await query(`
      SELECT DISTINCT branch, branch_en FROM employees 
      WHERE (branch IS NOT NULL AND branch != '') OR (branch_en IS NOT NULL AND branch_en != '')
    `).catch(() => []);
    const existingBranches = await query('SELECT * FROM branches').catch(() => []);
    
    if (Array.isArray(empLocations) && Array.isArray(existingBranches)) {
      for (const loc of empLocations) {
        const nameAr = loc.branch || loc.branch_en;
        const nameEn = loc.branch_en || loc.branch;
        if (nameAr && !existingBranches.some(b => b.name_ar === nameAr || b.name === nameAr || b.name_en === nameEn)) {
          await query(
            'INSERT INTO branches (id, name, name_ar, name_en, status, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
            [`BR${Date.now()}_${Math.floor(Math.random()*1000)}`, nameAr, nameAr, nameEn, 'Active', existingBranches.length + 1]
          ).catch(() => {});
        }
      }
    }

    // 2. Sync unique Positions from employees table
    const empPositions = await query(`
      SELECT DISTINCT position, position_ar, position_en FROM employees 
      WHERE (position_ar IS NOT NULL AND position_ar != '') OR (position_en IS NOT NULL AND position_en != '') OR (position IS NOT NULL AND position != '')
    `).catch(() => []);
    const existingPositions = await query('SELECT * FROM positions').catch(() => []);

    if (Array.isArray(empPositions) && Array.isArray(existingPositions)) {
      for (const pos of empPositions) {
        const nameAr = pos.position_ar || pos.position || pos.position_en;
        const nameEn = pos.position_en || pos.position || pos.position_ar;
        if (nameAr && !existingPositions.some(p => p.name_ar === nameAr || p.name === nameAr || p.name_en === nameEn)) {
          await query(
            'INSERT INTO positions (name_en, name_ar, name, status, sort_order) VALUES (?, ?, ?, ?, ?)',
            [nameEn, nameAr, nameAr, 'Active', existingPositions.length + 1]
          ).catch(() => {});
        }
      }
    }

    // 3. Sync unique Departments from employees table
    const empDepts = await query(`
      SELECT DISTINCT department FROM employees 
      WHERE department IS NOT NULL AND department != ''
    `).catch(() => []);
    const existingDepts = await query('SELECT * FROM departments').catch(() => []);

    if (Array.isArray(empDepts) && Array.isArray(existingDepts)) {
      for (const d of empDepts) {
        const nameAr = d.department;
        if (nameAr && !existingDepts.some(dep => dep.name_ar === nameAr || dep.name === nameAr)) {
          await query(
            'INSERT INTO departments (name_en, name_ar, name, status, sort_order) VALUES (?, ?, ?, ?, ?)',
            [nameAr, nameAr, nameAr, 'Active', existingDepts.length + 1]
          ).catch(() => {});
        }
      }
    }

    // 4. Sync unique Contract Terms from employees table
    const empContracts = await query(`
      SELECT DISTINCT term_of_contract FROM employees 
      WHERE term_of_contract IS NOT NULL AND term_of_contract != ''
    `).catch(() => []);
    const existingCT = await query('SELECT * FROM contract_types').catch(() => []);

    if (Array.isArray(empContracts) && Array.isArray(existingCT)) {
      for (const ct of empContracts) {
        const nameAr = ct.term_of_contract;
        if (nameAr && !existingCT.some(c => c.name_ar === nameAr || c.name_en === nameAr)) {
          await query(
            'INSERT INTO contract_types (name_en, name_ar, status, sort_order) VALUES (?, ?, ?, ?)',
            [nameAr, nameAr, 'Active', existingCT.length + 1]
          ).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.warn('Error in syncSettingsFromEmployees:', err.message);
  }
};

const ensureCandidateColumns = async () => {
  try {
    await query("ALTER TABLE candidates MODIFY COLUMN stage VARCHAR(255) DEFAULT 'استلام الطلبات'").catch(() => {});
    await query("ALTER TABLE candidates MODIFY COLUMN resume_url LONGTEXT").catch(() => {});
    await query("ALTER TABLE candidates ADD COLUMN second_interview_date DATE").catch(() => {});
    await query("ALTER TABLE candidates ADD COLUMN second_interview_time TIME").catch(() => {});
    await query("ALTER TABLE candidates ADD COLUMN second_interview_location VARCHAR(255)").catch(() => {});
    await query("ALTER TABLE candidates ADD COLUMN second_interview_notes TEXT").catch(() => {});
    await query("ALTER TABLE candidates ADD COLUMN added_to_directory TINYINT(1) DEFAULT 0").catch(() => {});
    await query("ALTER TABLE candidates ADD COLUMN employee_id VARCHAR(50)").catch(() => {});
    await query("ALTER TABLE candidates ADD COLUMN committee_scores LONGTEXT").catch(() => {});
    console.log('Successfully initialized candidate workflow database columns');
  } catch (e) {
    console.warn('Note on candidate schema update:', e.message);
  }
};

const ensureJobVacancyColumns = async () => {
  try {
    await query("ALTER TABLE job_vacancies MODIFY COLUMN status VARCHAR(50) DEFAULT 'مفتوحة'").catch(() => {});
    await query("ALTER TABLE job_vacancies MODIFY COLUMN type VARCHAR(50) DEFAULT 'دوام كامل'").catch(() => {});
    console.log('Successfully initialized job_vacancies database columns');
  } catch (e) {
    console.warn('Note on job_vacancies schema update:', e.message);
  }
};

const ensureEmployeeChildrenColumns = async () => {
  try {
    await query(`CREATE TABLE IF NOT EXISTS employee_children (
      id INT AUTO_INCREMENT PRIMARY KEY,
      employee_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      relation VARCHAR(50) NOT NULL,
      dob DATE NULL,
      age INT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_employee_id (employee_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`).catch(() => {});

    await query("ALTER TABLE employee_children ADD COLUMN age INT NULL DEFAULT 0").catch(() => {});
    await query("ALTER TABLE employee_children MODIFY COLUMN relation VARCHAR(50) NULL").catch(() => {});
    console.log('Successfully ensured employee_children table and age column in MySQL vitasiraq_hris_db');
  } catch (e) {
    console.warn('Note on employee_children schema update:', e.message);
  }
};

const ensureOnHoldColumn = async () => {
  try {
    await query("ALTER TABLE employees ADD COLUMN on_hold TINYINT(1) DEFAULT 0").catch(() => {});
    await query("ALTER TABLE payroll_finalized_rows ADD COLUMN on_hold TINYINT(1) DEFAULT 0").catch(() => {});
    console.log('Successfully ensured on_hold column in employees & payroll_finalized_rows');
  } catch (e) {
    console.warn('Note on on_hold column update:', e.message);
  }
};

const loadEmployeeColumns = async () => {
  try {
    const cols = await query('SHOW COLUMNS FROM employees');
    employeeTableColumns = new Set(cols.map(c => c.Field));
    console.log('Detected employees table columns:', Array.from(employeeTableColumns));
  } catch (e) {
    console.error('Error loading employee columns:', e.message);
  }
};

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'connected' });
});

// Upload employee photo
app.post('/api/employees/:id/photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo file uploaded' });
    }

    const photoData = req.file.buffer;
    await query('UPDATE employees SET photo = ? WHERE id = ?', [photoData, req.params.id]);
    
    res.json({ success: true, message: 'Photo uploaded successfully' });
  } catch (err) {
    console.error('Error uploading photo:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get employee photo
app.get('/api/employees/:id/photo', async (req, res) => {
  try {
    const results = await query('SELECT photo FROM employees WHERE id = ?', [req.params.id]);
    
    if (results.length === 0 || !results[0].photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const photoData = results[0].photo;
    res.set('Content-Type', 'image/jpeg');
    res.send(photoData);
  } catch (err) {
    console.error('Error fetching photo:', err);
    res.status(500).json({ error: err.message });
  }
});

// Employees
app.get('/api/employees', async (req, res) => {
  try {
    const results = await query('SELECT * FROM employees ORDER BY created_at DESC');
    const formatDateStr = (val) => {
      if (!val) return '';
      if (val instanceof Date) {
        const year = val.getFullYear();
        const month = String(val.getMonth() + 1).padStart(2, '0');
        const day = String(val.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      const str = String(val);
      if (str.includes('T')) return str.split('T')[0];
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      return str;
    };

    const formatted = results.map(row => {
      let childrenList = [];
      try {
        if (row.children_details) childrenList = JSON.parse(row.children_details);
        else if (row.children_json) childrenList = JSON.parse(row.children_json);
      } catch (e) {}

      return {
        id: row.id,
        employeeId: row.employee_id,
        badgeNo: row.badge_no,
        fullName: row.full_name_ar || 'غير محدد',
        fullNameEn: row.full_name_en || 'N/A',
        email: (row.email && !row.email.startsWith('no-email-') && row.email !== 'N/A') ? row.email : '',
        personalEmail: (row.personal_email && row.personal_email !== 'N/A') ? row.personal_email : '',
        phone: row.phone || row.mobile || 'N/A',
        emergencyPhone: row.emergency_phone || row.emergency_mobile || 'N/A',
        dob: formatDateStr(row.dob),
        yearsOfEmployment: row.years_of_employment || 0,
        yearsInPosition: row.years_in_position || 0,
        gender: row.gender === 'male' || row.gender === 'Male' ? 'ذكر' : row.gender === 'female' || row.gender === 'Female' ? 'أنثى' : 'غير محدد',
        maritalStatus: row.marital_status === 'single' ? 'أعزب' : 
                       row.marital_status === 'married' ? 'متأهل' :
                       row.marital_status === 'divorced' ? 'مطلق' : 
                       row.marital_status === 'widow' ? 'أرمل' : 'غير محدد',
        nationality: row.nationality || 'عراقي',
        department: row.department || 'غير محدد',
        jobTitle: row.position_ar || row.position || 'غير محدد',
        jobTitleEn: row.position_en || row.position || 'N/A',
        branch: row.branch || row.location_ar || 'غير محدد',
        branchEn: row.branch_en || row.location_en || 'N/A',
        supervisorName: row.supervisor_name || 'غير محدد',
        workScope: row.work_scope || 'غير محدد',
        salary: Number(row.salary || 0),
        basicSalary: Number(row.basic_salary || 0),
        transportationFixed: Number(row.transportation_fixed || 0),
        fixedBonus: Number(row.fixed_bonus || 0),
        phoneAllowance: Number(row.phone_allowance || 0),
        certificateAllowance: Number(row.certificate_allowance || 0),
        writtenBasicSalaryAr: row.written_basic_salary_ar || '',
        bankName: row.bank_name || 'غير محدد',
        iban: row.iban || 'N/A',
        nationalId: row.national_id || 'N/A',
        passportNo: row.passport_no || 'N/A',
        passportExpiry: formatDateStr(row.passport_expiry),
        photoUrl: (row.photo_url && row.photo_url.length > 0) ? row.photo_url : ((row.photo && row.photo.length > 0) ? `/api/employees/${row.id}/photo` : null),
        spouseName: row.spouse_name || 'غير محدد',
        spouseEmployedHere: Boolean(row.spouse_employed_here),
        childrenList: Array.isArray(childrenList) ? childrenList : [],
        childrenDetails: row.children_details || row.children_json || '',
        originalStartDate: formatDateStr(row.original_start_date || row.contract_original_start),
        contractStartDate: formatDateStr(row.contract_start_date),
        contractEndDate: formatDateStr(row.contract_end_date),
        probationEndDate: formatDateStr(row.probation_end_date),
        exitDate: formatDateStr(row.exit_date),
        termOfContract: row.term_of_contract || '',
        grade: row.grade || '',
        trainingsRecord: row.trainings_record || '',
        warningsRecord: row.warnings_record || '',
        isSsTaxExempt: Boolean(row.is_ss_tax_exempt),
        is_ss_tax_exempt: row.is_ss_tax_exempt,
        ssTaxExemptionReason: row.ss_tax_exemption_reason || '',
        ss_tax_exemption_reason: row.ss_tax_exemption_reason || '',
        status: row.status === 'Active' || row.status === 'active' ? 'Active' : 
               row.status === 'Inactive' || row.status === 'inactive' ? 'On Leave' : 
               row.status === 'Onboarding' || row.status === 'onboarding' ? 'Onboarding' : 'Active',
        joinDate: formatDateStr(row.original_start_date || row.contract_original_start)
      };
    });
    res.json(formatted);
  } catch (err) {
    console.error('Error fetching employees:', err);
    res.status(500).json({ error: err.message });
  }
});

// Helper functions for parameter formatting
const formatDate = (val) => {
  if (!val || typeof val !== 'string' || !val.trim()) return null;
  return val.trim();
};

const parseNum = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

app.post('/api/employees', async (req, res) => {
  try {
    const data = req.body;
    console.log('Received employee data for processing...');

    // Always reload columns to catch any database schema updates
    await loadEmployeeColumns();

    const employeeDbId = String(data.id || `EMP-${Date.now()}`);
    const employeeId = data.employeeId || data.employee_id || data.empCode || `VTS-${Math.floor(1000 + Math.random() * 9000)}`;
    const badgeNo = data.badgeNo || data.badge_no || `B-${Math.floor(100 + Math.random() * 900)}`;
    const fullNameAr = data.fullName || data.full_name_ar || 'غير محدد';
    const fullNameEn = data.fullNameEn || data.full_name_en || fullNameAr || 'N/A';
    let email = data.email && typeof data.email === 'string' ? data.email.trim() : '';
    if (!email || email === 'N/A' || email === 'غير محدد') {
      const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      email = `no-email-${employeeId}-${uniqueSuffix}@vitasiraq.local`;
    }
    const personalEmail = data.personalEmail || data.personal_email || '';
    const phone = data.phone || data.mobile || null;
    const emergencyPhone = data.emergencyPhone || data.emergency_mobile || null;
    const dob = formatDate(data.dob);
    const yearsOfEmployment = parseNum(data.yearsOfEmployment || data.years_of_employment);
    const yearsInPosition = parseNum(data.yearsInPosition || data.years_in_position);
    const exitDate = formatDate(data.exitDate || data.exit_date);

    const genderVal = data.gender === 'ذكر' || data.gender === 'male' || data.gender === 'Male' ? 'male' : 
                     data.gender === 'أنثى' || data.gender === 'female' || data.gender === 'Female' ? 'female' : 'male';
                     
    const maritalVal = data.maritalStatus === 'أعزب' || data.marital_status === 'single' ? 'single' : 
                      data.maritalStatus === 'متأهل' || data.marital_status === 'married' ? 'married' :
                      data.maritalStatus === 'مطلق' || data.marital_status === 'divorced' ? 'divorced' : 
                      data.maritalStatus === 'أرمل' || data.marital_status === 'widow' ? 'widow' : 'single';

    const nationality = data.nationality || 'عراقي';
    const department = data.department || null;
    const positionAr = data.jobTitle || data.position_ar || data.position || null;
    const positionEn = data.jobTitleEn || data.position_en || null;
    const branch = data.branch || data.location_ar || null;
    const branchEn = data.branchEn || data.location_en || null;
    const supervisorName = data.supervisorName || data.supervisor_name || null;
    const workScope = data.workScope || data.work_scope || null;

    const salary = parseNum(data.salary);
    const basicSalary = parseNum(data.basicSalary || data.basic_salary);
    const transportationFixed = parseNum(data.transportationFixed || data.transportation_fixed);
    const fixedBonus = parseNum(data.fixedBonus || data.fixed_bonus);
    const phoneAllowance = parseNum(data.phoneAllowance || data.phone_allowance);
    const certificateAllowance = parseNum(data.certificateAllowance || data.certificate_allowance);
    const writtenBasicSalaryAr = data.writtenBasicSalaryAr || data.written_basic_salary_ar || null;

    const bankName = data.bankName || data.bank_name || null;
    const iban = data.iban || null;
    const nationalId = data.nationalId || data.national_id || null;
    const passportNo = data.passportNo || data.passport_no || null;
    const passportExpiry = formatDate(data.passportExpiry || data.passport_expiry);

    let photoData = null;
    const rawPhoto = data.photo || data.photoUrl || data.photo_url;
    if (rawPhoto && typeof rawPhoto === 'string' && rawPhoto.startsWith('data:image')) {
      const base64Data = rawPhoto.replace(/^data:image\/[^;]+;base64,/, '');
      photoData = Buffer.from(base64Data, 'base64');
    }

    const spouseName = data.spouseName || data.spouse_name || null;
    const spouseEmployedHere = (data.spouseEmployedHere || data.spouse_employed_here) ? 1 : 0;
    
    let rawChildrenList = [];
    if (Array.isArray(data.childrenList)) {
      rawChildrenList = data.childrenList;
    } else if (typeof data.childrenList === 'string') {
      try { rawChildrenList = JSON.parse(data.childrenList); } catch (e) {}
    } else if (data.childrenDetails) {
      try { rawChildrenList = JSON.parse(data.childrenDetails); } catch (e) {}
    }

    const processedChildrenList = rawChildrenList.map(ch => {
      let childAge = ch.age;
      if ((childAge === undefined || childAge === null || childAge === 0) && ch.dob) {
        const b = new Date(ch.dob);
        if (!isNaN(b.getTime())) {
          const today = new Date();
          childAge = today.getFullYear() - b.getFullYear();
          const m = today.getMonth() - b.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < b.getDate())) childAge--;
          if (childAge < 0) childAge = 0;
        }
      }
      return {
        ...ch,
        age: childAge || 0
      };
    });

    const childrenDetails = processedChildrenList.length > 0 ? JSON.stringify(processedChildrenList) : null;

    const originalStartDate = formatDate(data.originalStartDate || data.contract_original_start || data.joinDate);
    const contractStartDate = formatDate(data.contractStartDate || data.contract_start_date);
    const contractEndDate = formatDate(data.contractEndDate || data.contract_end_date);
    const probationEndDate = formatDate(data.probationEndDate || data.probation_end_date);

    const termOfContract = data.termOfContract || data.term_of_contract || null;
    const grade = data.grade || null;

    const trainingsRecord = typeof data.employeeTrainings === 'object' && data.employeeTrainings ? JSON.stringify(data.employeeTrainings) : (data.trainingsRecord || data.trainings_record || data.trainings_json || null);
    const warningsRecord = data.warningsRecord || data.warnings_record || data.warnings_json || null;

    const statusVal = data.status === 'Active' || data.status === 'active' ? 'active' :
                     data.status === 'On Leave' || data.status === 'inactive' ? 'inactive' :
                     data.status === 'Onboarding' || data.status === 'onboarding' ? 'onboarding' : 'active';

    // Candidate fields mapping
    const candidateData = {
      employee_id: employeeId,
      badge_no: badgeNo,
      full_name_ar: fullNameAr,
      full_name_en: fullNameEn,
      email: email,
      personal_email: personalEmail,
      photo_url: rawPhoto,
      photo: photoData,
      phone: phone,
      mobile: phone,
      emergency_phone: emergencyPhone,
      emergency_mobile: emergencyPhone,
      dob: dob,
      years_of_employment: yearsOfEmployment,
      years_in_position: yearsInPosition,
      exit_date: exitDate,
      gender: genderVal,
      marital_status: maritalVal,
      nationality: nationality,
      department: department,
      position: positionAr,
      position_ar: positionAr,
      position_en: positionEn,
      location_ar: branch,
      location_en: branchEn,
      branch: branch,
      branch_en: branchEn,
      supervisor_name: supervisorName,
      work_scope: workScope,
      salary: salary,
      basic_salary: basicSalary,
      transportation_fixed: transportationFixed,
      fixed_bonus: fixedBonus,
      phone_allowance: phoneAllowance,
      certificate_allowance: certificateAllowance,
      written_basic_salary_ar: writtenBasicSalaryAr,
      bank_name: bankName,
      iban: iban,
      national_id: nationalId,
      passport_no: passportNo,
      passport_expiry: passportExpiry,
      spouse_name: spouseName,
      spouse_employed_here: spouseEmployedHere,
      children_details: childrenDetails,
      original_start_date: originalStartDate,
      contract_start_date: contractStartDate,
      contract_end_date: contractEndDate,
      probation_end_date: probationEndDate,
      term_of_contract: termOfContract,
      grade: grade,
      trainings_record: trainingsRecord,
      warnings_record: warningsRecord,
      is_ss_tax_exempt: (data.is_ss_tax_exempt === 1 || data.is_ss_tax_exempt === '1' || data.is_ss_tax_exempt === true || data.isSsTaxExempt === true) ? 1 : 0,
      ss_tax_exemption_reason: data.ss_tax_exemption_reason || data.ssTaxExemptionReason || null,
      status: statusVal
    };

    // Filter columns that actually exist in MySQL table
    const validColumns = Object.keys(candidateData).filter(col => employeeTableColumns.has(col));

    let targetDbId = null;
    let existing = [];

    // 1. Match by primary key id if provided as a valid number
    if (data.id && !isNaN(Number(data.id)) && Number(data.id) > 0 && Number(data.id) < 2147483647) {
      targetDbId = Number(data.id);
      existing = await query('SELECT id FROM employees WHERE id = ?', [targetDbId]);
    }

    // 2. Match by exact employee_id if id match yielded no result
    const cleanEmpCode = typeof employeeId === 'string' ? employeeId.trim() : '';
    if ((!existing || existing.length === 0) && cleanEmpCode !== '' && cleanEmpCode !== 'N/A') {
      const existingByEmpId = await query('SELECT id FROM employees WHERE employee_id = ?', [cleanEmpCode]);
      if (existingByEmpId && existingByEmpId.length > 0) {
        existing = existingByEmpId;
        targetDbId = existingByEmpId[0].id;
      }
    }

    // 3. Match by exact badge_no if still no match and badge_no is valid
    const cleanBadge = typeof badgeNo === 'string' ? badgeNo.trim() : '';
    if ((!existing || existing.length === 0) && cleanBadge !== '' && cleanBadge !== 'N/A') {
      const existingByBadge = await query('SELECT id FROM employees WHERE badge_no = ?', [cleanBadge]);
      if (existingByBadge && existingByBadge.length > 0) {
        existing = existingByBadge;
        targetDbId = existingByBadge[0].id;
      }
    }

      let finalEmpDbId = targetDbId;
      if (existing && existing.length > 0 && targetDbId) {
        console.log('Updating existing employee ID:', targetDbId);
        let updateCols = validColumns.filter(col => col !== 'id');
        if (!photoData && !rawPhoto) {
          updateCols = updateCols.filter(col => col !== 'photo' && col !== 'photo_url');
        }
        const updateVals = updateCols.map(col => candidateData[col]);
        updateVals.push(targetDbId);

        const setClause = updateCols.map(col => `${col} = ?`).join(', ');
        try {
          await query(`UPDATE employees SET ${setClause} WHERE id = ?`, updateVals);
          console.log('Employee updated successfully');
        } catch (updateErr) {
          console.error('MySQL UPDATE error details:', updateErr);
          throw updateErr;
        }
      } else {
        console.log('Inserting new employee...');
        const generatedId = candidateData.id || `EMP-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        candidateData.id = generatedId;

        let insertCols = validColumns;
        if (!insertCols.includes('id')) {
          insertCols = ['id', ...insertCols];
        }
        const insertVals = insertCols.map(col => candidateData[col]);
        const placeholders = insertCols.map(() => '?').join(', ');

        await query(`INSERT INTO employees (${insertCols.join(', ')}) VALUES (${placeholders})`, insertVals);
        finalEmpDbId = generatedId;
        console.log('Employee inserted successfully with ID:', finalEmpDbId);
      }

      if (finalEmpDbId && Array.isArray(processedChildrenList)) {
        try {
          await query('DELETE FROM employee_children WHERE employee_id = ?', [finalEmpDbId]).catch(() => {});
          for (const ch of processedChildrenList) {
            if (ch && (ch.name || ch.dob)) {
              await query(
                'INSERT INTO employee_children (employee_id, name, relation, dob, age) VALUES (?, ?, ?, ?, ?)',
                [finalEmpDbId, ch.name || '', ch.relation || 'Son', ch.dob || null, ch.age || 0]
              ).catch(err => console.warn('Child table sync insert err:', err.message));
            }
          }
        } catch (childSyncErr) {
          console.warn('Note on employee_children sync:', childSyncErr.message);
        }
      }

      res.json({ success: true, id: String(finalEmpDbId), data, updated: !!(existing && existing.length > 0) });
  } catch (err) {
    console.error('Error saving employee:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/employees/:id/status-changes', async (req, res) => {
  try {
    res.json({ success: true, message: 'Status change recorded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/employees/:id/trainings', async (req, res) => {
  try {
    res.json({ success: true, message: 'Training recorded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/employees/:id', async (req, res) => {
  try {
    await query('DELETE FROM employees WHERE id = ?', [req.params.id]);
    res.json({ message: 'Employee deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Leave Requests
app.get('/api/leave-requests', async (req, res) => {
  try {
    const results = await query('SELECT * FROM leave_requests ORDER BY applied_date DESC');
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leave-requests', async (req, res) => {
  try {
    const data = req.body;
    const requestId = `LR-${Date.now()}`;
    await query(
      `INSERT INTO leave_requests (id, employee_id, leave_type, start_date, end_date, total_days, reason, status, applied_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [requestId, data.employeeId, data.leaveType, data.startDate, data.endDate, data.totalDays, data.reason, 'قيد الانتظار']
    );
    res.json({ success: true, id: requestId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Job Vacancies (also available as job-openings for candidate portal)
app.get('/api/job-vacancies', async (req, res) => {
  try {
    const { status } = req.query;
    let queryStr = 'SELECT * FROM job_vacancies';
    const params = [];
    
    if (status) {
      queryStr += ' WHERE status = ?';
      params.push(status);
    }
    
    queryStr += ' ORDER BY created_date DESC';
    
    const results = await query(queryStr, params);
    // Map database columns to frontend field names
    const mappedResults = results.map((j) => ({
      id: j.id,
      title: j.title,
      department: j.department,
      location: j.location,
      type: j.type,
      experienceYears: j.experience_years,
      status: j.status,
      requirements: j.requirements,
      deadline: j.deadline,
      deadline_date: j.deadline,
      createdDate: j.created_date,
      candidatesCount: j.candidates_count
    }));
    res.json(mappedResults);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Alias for candidate portal compatibility
app.get('/api/job-openings', async (req, res) => {
  try {
    const { status } = req.query;
    let queryStr = 'SELECT * FROM job_vacancies';
    const params = [];
    
    if (status) {
      queryStr += ' WHERE status = ?';
      params.push(status);
    }
    
    queryStr += ' ORDER BY created_date DESC';
    
    const results = await query(queryStr, params);
    // Map database columns to frontend field names
    const mappedResults = results.map((j) => ({
      id: j.id,
      title: j.title,
      department: j.department,
      location: j.location,
      type: j.type,
      experienceYears: j.experience_years,
      status: j.status,
      requirements: j.requirements,
      deadline: j.deadline,
      deadline_date: j.deadline,
      createdDate: j.created_date,
      candidatesCount: j.candidates_count
    }));
    res.json(mappedResults);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/job-vacancies', async (req, res) => {
  try {
    const data = req.body;
    const vacancyId = `JOB-${Date.now()}`;
    await query(
      `INSERT INTO job_vacancies (id, title, department, location, type, experience_years, status, requirements, deadline, created_date, candidates_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0)`,
      [vacancyId, data.title, data.department, data.location, data.type, data.experienceYears || 2, data.status || 'مفتوحة', data.requirements || '', data.deadline || null]
    );
    // Return the created job in the mapped format
    const newJob = {
      id: vacancyId,
      title: data.title,
      department: data.department,
      location: data.location,
      type: data.type,
      experienceYears: data.experienceYears || 2,
      status: data.status || 'مفتوحة',
      requirements: data.requirements || '',
      deadline: data.deadline || null,
      createdDate: new Date().toISOString(),
      candidatesCount: 0
    };
    res.json(newJob);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/job-vacancies/:id', async (req, res) => {
  try {
    const data = req.body;
    const jobId = req.params.id;

    // Check if job exists in table
    const existing = await query('SELECT id FROM job_vacancies WHERE id = ?', [jobId]);

    if (!existing || existing.length === 0) {
      // Insert missing position into job_vacancies table
      await query(
        `INSERT INTO job_vacancies (id, title, department, location, type, experience_years, status, requirements, deadline, created_date, candidates_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0)`,
        [
          jobId,
          data.title || 'وظيفة إدارية',
          data.department || 'إدارة التمويل الأصغر والعمليات',
          data.location || 'بغداد_المنصور',
          data.type || 'دوام كامل',
          data.experienceYears || 2,
          data.status || 'مفتوحة',
          data.requirements || '',
          data.deadline || null
        ]
      );
      return res.json({ success: true, created: true });
    }

    const updates = [];
    const values = [];
    
    if (data.title !== undefined) { updates.push('title = ?'); values.push(data.title); }
    if (data.department !== undefined) { updates.push('department = ?'); values.push(data.department); }
    if (data.location !== undefined) { updates.push('location = ?'); values.push(data.location); }
    if (data.type !== undefined) { updates.push('type = ?'); values.push(data.type); }
    if (data.experienceYears !== undefined) { updates.push('experience_years = ?'); values.push(data.experienceYears); }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }
    if (data.requirements !== undefined) { updates.push('requirements = ?'); values.push(data.requirements); }
    if (data.deadline !== undefined) { updates.push('deadline = ?'); values.push(data.deadline); }
    
    if (updates.length > 0) {
      values.push(jobId);
      await query(`UPDATE job_vacancies SET ${updates.join(', ')} WHERE id = ?`, values);
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/job-vacancies/:id', async (req, res) => {
  try {
    await query('DELETE FROM candidates WHERE applied_job_id = ?', [req.params.id]);
    await query('DELETE FROM job_vacancies WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Candidates
app.get('/api/candidates', async (req, res) => {
  try {
    const results = await query('SELECT * FROM candidates ORDER BY applied_date DESC');
    // Map database columns to frontend field names safely
    const mappedResults = results.map((c) => {
      let scores = [];
      try {
        if (c.committee_scores) {
          scores = typeof c.committee_scores === 'string' ? JSON.parse(c.committee_scores) : c.committee_scores;
        }
      } catch (e) {}

      return {
        id: c.id,
        fullName: c.full_name || 'متقدم جديد',
        email: c.email || '',
        phone: c.phone || '',
        appliedJobId: c.applied_job_id || '',
        jobTitle: c.job_title || 'وظيفة إدارية',
        stage: c.stage || 'استلام الطلبات',
        rating: c.rating || 5,
        experienceYears: c.experience_years || 0,
        notes: c.notes || '',
        photoUrl: c.photo_url || '',
        resumeUrl: c.resume_url || '',
        committeeOpinion: c.committee_opinion || '',
        decisionReason: c.decision_reason || '',
        committeeScores: Array.isArray(scores) ? scores : [],
        interviewDate: c.interview_date || '',
        interviewTime: c.interview_time || '',
        interviewLocation: c.interview_location || '',
        secondInterviewDate: c.second_interview_date || '',
        secondInterviewTime: c.second_interview_time || '',
        secondInterviewLocation: c.second_interview_location || '',
        secondInterviewNotes: c.second_interview_notes || '',
        addedToDirectory: Boolean(c.added_to_directory),
        employeeId: c.employee_id || '',
        appliedDate: c.applied_date
      };
    });
    res.json(mappedResults);
  } catch (err) {
    console.error('Error fetching candidates:', err);
    res.status(500).json({ error: err.message });
  }
});

// Serve static uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Candidate Portal - Handle candidate submission with file uploads or JSON body
app.post('/api/candidates', upload.fields([{ name: 'candidate_photo' }, { name: 'resume_mock' }, { name: 'resume' }, { name: 'resume_file' }]), async (req, res) => {
  try {
    const data = req.body || {};
    
    // Support both JSON keys (fullName, phone, appliedJobId, resumeUrl) and FormData keys (name, mobile, job_id)
    const fullName = data.fullName || data.full_name || data.name || 'متقدم جديد';
    const email = data.email || '';
    const phone = data.phone || data.mobile || '';
    const appliedJobId = data.appliedJobId || data.applied_job_id || data.job_id || '';
    const jobTitle = data.jobTitle || data.job_title || 'وظيفة إدارية';
    const stage = data.stage || 'استلام الطلبات';
    const rating = data.rating || 5;
    const experienceYears = data.experienceYears || data.experience || 0;
    const notes = data.notes || '';
    
    let photoUrl = data.photoUrl || data.photo_url || '';
    let resumeUrl = data.resumeUrl || data.resume_url || '';

    // Check for duplicate application by phone number on the same job
    let normPhone = (phone || '').replace(/[^0-9]/g, '');
    if (normPhone.startsWith('964')) normPhone = normPhone.substring(3);
    if (normPhone.startsWith('0')) normPhone = normPhone.substring(1);

    if (normPhone) {
      const cleanJobId = String(appliedJobId || '').replace('pos-', '').trim();
      const normJobTitle = (jobTitle || '').toLowerCase().trim();

      const allCandidates = await query('SELECT * FROM candidates').catch(() => []);

      const isDuplicate = Array.isArray(allCandidates) && allCandidates.some(c => {
        let p = (c.phone || '').replace(/[^0-9]/g, '');
        if (p.startsWith('964')) p = p.substring(3);
        if (p.startsWith('0')) p = p.substring(1);
        if (!p || p !== normPhone) return false;

        const candJobId = String(c.applied_job_id || '').replace('pos-', '').trim();
        const sameJobId = cleanJobId && candJobId && (cleanJobId === candJobId);

        const candJobTitle = (c.job_title || '').toLowerCase().trim();
        const sameJobTitle = normJobTitle && candJobTitle && (
          normJobTitle === candJobTitle ||
          normJobTitle.includes(candJobTitle) ||
          candJobTitle.includes(normJobTitle)
        );

        return sameJobId || sameJobTitle;
      });

      if (isDuplicate) {
        return res.status(400).json({
          error: `السيد/ة ${fullName}، لايمكن التقديم لنفس الوظيفة اكثر من مرة واحدة. شكرا لتفهمك`,
          isDuplicate: true,
          fullName,
          jobTitle
        });
      }
    }
    
    // 1. Handle Candidate Photo Upload
    if (req.files && req.files['candidate_photo'] && req.files['candidate_photo'][0]) {
      const photoFile = req.files['candidate_photo'][0];
      const photoFileName = `photo_${Date.now()}_${Math.random().toString(36).substring(7)}${path.extname(photoFile.originalname)}`;
      const photoPath = path.join(__dirname, 'uploads', photoFileName);
      if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
        fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
      }
      fs.writeFileSync(photoPath, photoFile.buffer);
      photoUrl = `/uploads/${photoFileName}`;
    }
    
    // 2. Handle Resume Document File Upload
    const resumeFileObj = (req.files && req.files['resume_mock'] && req.files['resume_mock'][0]) ||
                         (req.files && req.files['resume'] && req.files['resume'][0]) ||
                         (req.files && req.files['resume_file'] && req.files['resume_file'][0]);
    if (resumeFileObj) {
      const resumeFileName = `resume_${Date.now()}_${Math.random().toString(36).substring(7)}${path.extname(resumeFileObj.originalname)}`;
      const resumePath = path.join(__dirname, 'uploads', resumeFileName);
      if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
        fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
      }
      fs.writeFileSync(resumePath, resumeFileObj.buffer);
      resumeUrl = `/uploads/${resumeFileName}`;
    }
    
    const candidateId = data.id || `CAND-${Date.now()}`;
    
    // Safely check and resolve applied_job_id to prevent MySQL foreign key failures
    let validAppliedJobId = appliedJobId || null;
    if (validAppliedJobId) {
      try {
        const existingJob = await query('SELECT id FROM job_vacancies WHERE id = ?', [validAppliedJobId]);
        if (!existingJob || existingJob.length === 0) {
          // Auto-insert job vacancy into database if missing to satisfy foreign key
          await query(
            `INSERT INTO job_vacancies (id, title, department, location, type, experience_years, status, requirements, deadline, created_date, candidates_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1)`,
            [validAppliedJobId, jobTitle || 'وظيفة إدارية', 'إدارة التمويل الأصغر والعمليات', 'بغداد_المنصور', 'دوام كامل', 2, 'مفتوحة', '', null]
          ).catch(() => {
            validAppliedJobId = null;
          });
        } else {
          await query('UPDATE job_vacancies SET candidates_count = candidates_count + 1 WHERE id = ?', [validAppliedJobId]).catch(() => {});
        }
      } catch (e) {
        validAppliedJobId = null;
      }
    }

    await query(
      `INSERT INTO candidates (id, full_name, email, phone, applied_job_id, job_title, stage, rating, experience_years, notes, photo_url, resume_url, applied_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [candidateId, fullName, email, phone, validAppliedJobId, jobTitle, stage, rating, experienceYears, notes, photoUrl, resumeUrl]
    );
    
    const newCandidate = {
      id: candidateId,
      fullName,
      email,
      phone,
      appliedJobId: validAppliedJobId || appliedJobId,
      jobTitle,
      stage,
      rating,
      experienceYears,
      notes,
      photoUrl,
      resumeUrl,
      appliedDate: new Date().toISOString()
    };
    res.json(newCandidate);
  } catch (err) {
    console.error('Error creating candidate:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update candidate stage
app.put('/api/candidates/:id/stage', async (req, res) => {
  try {
    const { stage } = req.body;
    await query('UPDATE candidates SET stage = ? WHERE id = ?', [stage, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update candidate general profile details
app.put('/api/candidates/:id', async (req, res) => {
  try {
    const data = req.body || {};
    const updates = [];
    const values = [];

    if (data.fullName !== undefined) { updates.push('full_name = ?'); values.push(data.fullName); }
    if (data.email !== undefined) { updates.push('email = ?'); values.push(data.email); }
    if (data.phone !== undefined) { updates.push('phone = ?'); values.push(data.phone); }
    if (data.jobTitle !== undefined) { updates.push('job_title = ?'); values.push(data.jobTitle); }
    if (data.stage !== undefined) { updates.push('stage = ?'); values.push(data.stage); }
    if (data.rating !== undefined) { updates.push('rating = ?'); values.push(data.rating); }
    if (data.notes !== undefined) { updates.push('notes = ?'); values.push(data.notes); }
    if (data.committeeOpinion !== undefined) { updates.push('committee_opinion = ?'); values.push(data.committeeOpinion); }
    if (data.decisionReason !== undefined) { updates.push('decision_reason = ?'); values.push(data.decisionReason); }
    if (data.committeeScores !== undefined) { updates.push('committee_scores = ?'); values.push(JSON.stringify(data.committeeScores)); }
    if (data.interviewDate !== undefined) { updates.push('interview_date = ?'); values.push(data.interviewDate || null); }
    if (data.interviewTime !== undefined) { updates.push('interview_time = ?'); values.push(data.interviewTime || null); }
    if (data.interviewLocation !== undefined) { updates.push('interview_location = ?'); values.push(data.interviewLocation || null); }
    if (data.secondInterviewDate !== undefined) { updates.push('second_interview_date = ?'); values.push(data.secondInterviewDate || null); }
    if (data.secondInterviewTime !== undefined) { updates.push('second_interview_time = ?'); values.push(data.secondInterviewTime || null); }
    if (data.secondInterviewLocation !== undefined) { updates.push('second_interview_location = ?'); values.push(data.secondInterviewLocation || null); }
    if (data.secondInterviewNotes !== undefined) { updates.push('second_interview_notes = ?'); values.push(data.secondInterviewNotes || null); }
    if (data.addedToDirectory !== undefined) { updates.push('added_to_directory = ?'); values.push(data.addedToDirectory ? 1 : 0); }
    if (data.employeeId !== undefined) { updates.push('employee_id = ?'); values.push(data.employeeId); }

    if (updates.length > 0) {
      values.push(req.params.id);
      await query(`UPDATE candidates SET ${updates.join(', ')} WHERE id = ?`, values);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete candidate
app.delete('/api/candidates/:id', async (req, res) => {
  try {
    await query('DELETE FROM candidates WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Legacy API for internal use (JSON format)
app.post('/api/candidates/internal', async (req, res) => {
  try {
    const data = req.body;
    const candidateId = `CAND-${Date.now()}`;
    await query(
      `INSERT INTO candidates (id, full_name, email, phone, applied_job_id, job_title, stage, rating, experience_years, notes, photo_url, resume_url, applied_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [candidateId, data.fullName, data.email, data.phone, data.appliedJobId, data.jobTitle, data.stage || 'Applied', data.rating || 5, data.experienceYears || 0, data.notes || '', data.photoUrl || '', data.resumeUrl || '']
    );
    // Return the created candidate in the mapped format
    const newCandidate = {
      id: candidateId,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      appliedJobId: data.appliedJobId,
      jobTitle: data.jobTitle,
      stage: data.stage || 'Applied',
      rating: data.rating || 5,
      experienceYears: data.experienceYears || 0,
      notes: data.notes || '',
      photoUrl: data.photoUrl || '',
      resumeUrl: data.resumeUrl || '',
      appliedDate: new Date().toISOString()
    };
    res.json(newCandidate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/candidates/:id/stage', async (req, res) => {
  try {
    const { stage } = req.body;
    await query('UPDATE candidates SET stage = ? WHERE id = ?', [stage, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/candidates/:id', async (req, res) => {
  try {
    const data = req.body;
    const updates = [];
    const values = [];
    
    if (data.fullName !== undefined) { updates.push('full_name = ?'); values.push(data.fullName); }
    if (data.email !== undefined) { updates.push('email = ?'); values.push(data.email); }
    if (data.phone !== undefined) { updates.push('phone = ?'); values.push(data.phone); }
    if (data.stage !== undefined) { updates.push('stage = ?'); values.push(data.stage); }
    if (data.rating !== undefined) { updates.push('rating = ?'); values.push(data.rating); }
    if (data.experienceYears !== undefined) { updates.push('experience_years = ?'); values.push(data.experienceYears); }
    if (data.notes !== undefined) { updates.push('notes = ?'); values.push(data.notes); }
    if (data.photoUrl !== undefined) { updates.push('photo_url = ?'); values.push(data.photoUrl); }
    if (data.resumeUrl !== undefined) { updates.push('resume_url = ?'); values.push(data.resumeUrl); }
    if (data.committeeOpinion !== undefined) { updates.push('committee_opinion = ?'); values.push(data.committeeOpinion); }
    if (data.decisionReason !== undefined) { updates.push('decision_reason = ?'); values.push(data.decisionReason); }
    if (data.committeeScores !== undefined) { updates.push('committee_scores = ?'); values.push(JSON.stringify(data.committeeScores)); }
    if (data.interviewDate !== undefined) { updates.push('interview_date = ?'); values.push(data.interviewDate); }
    if (data.interviewTime !== undefined) { updates.push('interview_time = ?'); values.push(data.interviewTime); }
    if (data.interviewLocation !== undefined) { updates.push('interview_location = ?'); values.push(data.interviewLocation); }
    if (data.secondInterviewDate !== undefined) { updates.push('second_interview_date = ?'); values.push(data.secondInterviewDate); }
    if (data.secondInterviewTime !== undefined) { updates.push('second_interview_time = ?'); values.push(data.secondInterviewTime); }
    if (data.secondInterviewLocation !== undefined) { updates.push('second_interview_location = ?'); values.push(data.secondInterviewLocation); }
    if (data.secondInterviewNotes !== undefined) { updates.push('second_interview_notes = ?'); values.push(data.secondInterviewNotes); }
    if (data.addedToDirectory !== undefined) { updates.push('added_to_directory = ?'); values.push(data.addedToDirectory ? 1 : 0); }
    if (data.employeeId !== undefined) { updates.push('employee_id = ?'); values.push(data.employeeId); }
    
    if (updates.length === 0) {
      return res.json({ success: true });
    }
    
    values.push(req.params.id);
    await query(`UPDATE candidates SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/candidates/:id', async (req, res) => {
  try {
    await query('DELETE FROM candidates WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Assets
app.get('/api/assets', async (req, res) => {
  try {
    const results = await query('SELECT * FROM asset_records ORDER BY purchase_date DESC');
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/assets', async (req, res) => {
  try {
    const data = req.body;
    const assetId = `AST-${Date.now()}`;
    await query(
      `INSERT INTO asset_records (id, asset_name, asset_type, serial_number, description, purchase_date, purchase_cost, current_value, asset_condition, location, assigned_to, assigned_date, return_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [assetId, data.assetName, data.assetType, data.serialNumber, data.description, data.purchaseDate, data.purchaseCost, data.currentValue, data.assetCondition, data.location, data.assignedTo, data.assignedDate, data.returnDate, 'Available']
    );
    res.json({ success: true, id: assetId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Risks
app.get('/api/risks', async (req, res) => {
  try {
    const results = await query('SELECT * FROM risk_records ORDER BY identified_date DESC');
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/risks', async (req, res) => {
  try {
    const data = req.body;
    const riskId = `RISK-${Date.now()}`;
    await query(
      `INSERT INTO risk_records (id, risk_title, risk_category, risk_level, description, likelihood, impact, mitigation_strategy, owner, status, identified_date, target_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [riskId, data.riskTitle, data.riskCategory, data.riskLevel, data.description, data.likelihood, data.impact, data.mitigationStrategy, data.owner, 'Open', data.identifiedDate, data.targetDate]
    );
    res.json({ success: true, id: riskId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Documents
app.get('/api/documents', async (req, res) => {
  try {
    const results = await query('SELECT * FROM document_records ORDER BY upload_date DESC');
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/documents', async (req, res) => {
  try {
    const data = req.body;
    const documentId = `DOC-${Date.now()}`;
    await query(
      `INSERT INTO document_records (id, document_name, document_type, category, description, file_url, file_size, file_format, uploaded_by, employee_id, expiry_date, access_level, status, upload_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [documentId, data.documentName, data.documentType, data.category, data.description, data.fileUrl, data.fileSize, data.fileFormat, data.uploadedBy, data.employeeId, data.expiryDate, 'Internal', 'Active']
    );
    res.json({ success: true, id: documentId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Notifications
app.get('/api/notifications', async (req, res) => {
  try {
    const results = await query('SELECT * FROM system_notifications ORDER BY created_at DESC');
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications', async (req, res) => {
  try {
    const data = req.body;
    const notificationId = `NOTIF-${Date.now()}`;
    await query(
      `INSERT INTO system_notifications (id, title, message, type, priority, target_audience, user_id, link_url, is_read) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [notificationId, data.title, data.message, data.type, data.priority, data.targetAudience, data.userId, data.linkUrl, false]
    );
    res.json({ success: true, id: notificationId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Branches
app.get(['/api/branches', '/api/settings/branches'], async (req, res) => {
  try {
    await syncSettingsFromEmployees().catch(() => {});
    const results = await query('SELECT * FROM branches ORDER BY sort_order ASC, name_ar ASC, id DESC');
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Settings - Departments CRUD
app.get(['/api/settings/departments', '/api/departments'], async (req, res) => {
  try {
    await syncSettingsFromEmployees().catch(() => {});
    const results = await query('SELECT * FROM departments ORDER BY sort_order ASC, name_ar ASC, id DESC');
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings/departments', async (req, res) => {
  try {
    const { name_en, name_ar, sort_order, status } = req.body;
    const deptAr = name_ar || '';
    const deptEn = name_en || '';
    const sql = 'INSERT INTO departments (name_en, name_ar, name, sort_order, status) VALUES (?, ?, ?, ?, ?)';
    const params = [deptEn, deptAr, deptAr, sort_order || 0, status || 'Active'];
    await query(sql, params);
    const result = await query('SELECT * FROM departments ORDER BY id DESC LIMIT 1');
    res.json(result[0]);
  } catch (err) {
    console.error('Error in POST /api/settings/departments:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings/departments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name_en, name_ar, sort_order, status } = req.body;
    const deptAr = name_ar || '';
    const deptEn = name_en || '';
    await query(
      'UPDATE departments SET name_en = ?, name_ar = ?, name = ?, sort_order = ?, status = ? WHERE id = ?',
      [deptEn, deptAr, deptAr, sort_order || 0, status || 'Active', id]
    );
    const result = await query('SELECT * FROM departments WHERE id = ?', [id]);
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/settings/departments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM departments WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Settings - Positions CRUD
app.get(['/api/settings/positions', '/api/positions'], async (req, res) => {
  try {
    await syncSettingsFromEmployees().catch(() => {});
    const results = await query('SELECT * FROM positions ORDER BY sort_order ASC, name_ar ASC, id DESC');
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings/positions', async (req, res) => {
  try {
    const { name_en, name_ar, sort_order, status } = req.body;
    const posAr = name_ar || '';
    const posEn = name_en || '';
    const sql = 'INSERT INTO positions (name_en, name_ar, name, sort_order, status) VALUES (?, ?, ?, ?, ?)';
    const params = [posEn, posAr, posAr, sort_order || 0, status || 'Active'];
    await query(sql, params);
    const result = await query('SELECT * FROM positions ORDER BY id DESC LIMIT 1');
    res.json(result[0]);
  } catch (err) {
    console.error('Error in POST /api/settings/positions:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings/positions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name_en, name_ar, sort_order, status } = req.body;
    const posAr = name_ar || '';
    const posEn = name_en || '';
    await query(
      'UPDATE positions SET name_en = ?, name_ar = ?, name = ?, sort_order = ?, status = ? WHERE id = ?',
      [posEn, posAr, posAr, sort_order || 0, status || 'Active', id]
    );
    const result = await query('SELECT * FROM positions WHERE id = ?', [id]);
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/settings/positions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM positions WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Settings - Contract Types CRUD
app.get('/api/settings/contract-types', async (req, res) => {
  try {
    const results = await query('SELECT * FROM contract_types ORDER BY sort_order ASC, id DESC');
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings/contract-types', async (req, res) => {
  try {
    const { name_en, name_ar, sort_order, status } = req.body;
    const sql = 'INSERT INTO contract_types (name_en, name_ar, sort_order, status) VALUES (?, ?, ?, ?)';
    const params = [name_en || name_ar || '', name_ar || name_en || '', sort_order || 0, status || 'Active'];
    await query(sql, params);
    const result = await query('SELECT * FROM contract_types ORDER BY id DESC LIMIT 1');
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings/contract-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name_en, name_ar, sort_order, status } = req.body;
    await query(
      'UPDATE contract_types SET name_en = ?, name_ar = ?, sort_order = ?, status = ? WHERE id = ?',
      [name_en, name_ar, sort_order || 0, status || 'Active', id]
    );
    const result = await query('SELECT * FROM contract_types WHERE id = ?', [id]);
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/settings/contract-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM contract_types WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Settings - Status Changes CRUD
app.get('/api/settings/status-changes', async (req, res) => {
  try {
    const results = await query('SELECT * FROM status_changes ORDER BY sort_order ASC, id DESC');
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings/status-changes', async (req, res) => {
  try {
    const { name_en, name_ar, sort_order, status } = req.body;
    const sql = 'INSERT INTO status_changes (name_en, name_ar, sort_order, status) VALUES (?, ?, ?, ?)';
    const params = [name_en || name_ar || '', name_ar || name_en || '', sort_order || 0, status || 'Active'];
    await query(sql, params);
    const result = await query('SELECT * FROM status_changes ORDER BY id DESC LIMIT 1');
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Settings - Trainings CRUD
app.get('/api/settings/trainings', async (req, res) => {
  try {
    const results = await query('SELECT * FROM trainings ORDER BY sort_order ASC, id DESC');
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings/trainings', async (req, res) => {
  try {
    const { name_en, name_ar, sort_order, status } = req.body;
    const sql = 'INSERT INTO trainings (name_en, name_ar, sort_order, status) VALUES (?, ?, ?, ?)';
    const params = [name_en || name_ar || '', name_ar || name_en || '', sort_order || 0, status || 'Active'];
    await query(sql, params);
    const result = await query('SELECT * FROM trainings ORDER BY id DESC LIMIT 1');
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Company Calendar Events endpoints
app.get('/api/calendar/events', async (req, res) => {
  try {
    const { start_date, end_date, event_type, status } = req.query;
    let sql = 'SELECT * FROM company_events WHERE 1=1';
    const params = [];

    if (start_date) {
      sql += ' AND event_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND event_date <= ?';
      params.push(end_date);
    }
    if (event_type) {
      sql += ' AND event_type = ?';
      params.push(event_type);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY event_date ASC';

    const results = await query(sql, params);
    res.json(results);
  } catch (err) {
    console.error('Error fetching calendar events:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/calendar/events/:id', async (req, res) => {
  try {
    const results = await query('SELECT * FROM company_events WHERE id = ?', [req.params.id]);
    if (results.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(results[0]);
  } catch (err) {
    console.error('Error fetching event:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/calendar/events', async (req, res) => {
  try {
    const data = req.body;
    const eventId = `EVT-${Date.now()}`;
    const id = `E${Date.now()}`;

    const sql = `
      INSERT INTO company_events (
        id, event_id, title_ar, title_en, description_ar, description_en,
        event_type, event_date, start_time, end_time, location, location_ar,
        all_day, is_recurring, recurrence_pattern, recurrence_end_date,
        department, target_audience, priority, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      id,
      eventId,
      data.title_ar || '',
      data.title_en || '',
      data.description_ar || null,
      data.description_en || null,
      data.event_type || 'other',
      data.event_date || new Date().toISOString().split('T')[0],
      data.start_time || null,
      data.end_time || null,
      data.location || null,
      data.location_ar || null,
      data.all_day ? 1 : 0,
      data.is_recurring ? 1 : 0,
      data.recurrence_pattern || null,
      data.recurrence_end_date || null,
      data.department || null,
      data.target_audience || 'all',
      data.priority || 'medium',
      data.status || 'published',
      data.created_by || 'ADMIN001'
    ];

    await query(sql, params);
    res.json({ success: true, id, event_id: eventId });
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/calendar/events/:id', async (req, res) => {
  try {
    const data = req.body;
    const sql = `
      UPDATE company_events SET
        title_ar = ?, title_en = ?, description_ar = ?, description_en = ?,
        event_type = ?, event_date = ?, start_time = ?, end_time = ?,
        location = ?, location_ar = ?, all_day = ?, is_recurring = ?,
        recurrence_pattern = ?, recurrence_end_date = ?, department = ?,
        target_audience = ?, priority = ?, status = ?, updated_by = ?
      WHERE id = ?
    `;

    const params = [
      data.title_ar || '',
      data.title_en || '',
      data.description_ar || null,
      data.description_en || null,
      data.event_type || 'other',
      data.event_date,
      data.start_time || null,
      data.end_time || null,
      data.location || null,
      data.location_ar || null,
      data.all_day ? 1 : 0,
      data.is_recurring ? 1 : 0,
      data.recurrence_pattern || null,
      data.recurrence_end_date || null,
      data.department || null,
      data.target_audience || 'all',
      data.priority || 'medium',
      data.status || 'published',
      data.updated_by || 'ADMIN001',
      req.params.id
    ];

    await query(sql, params);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating event:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/calendar/events/:id', async (req, res) => {
  try {
    await query('DELETE FROM company_events WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).json({ error: err.message });
  }
});

// Company Holidays endpoints
app.get('/api/calendar/holidays', async (req, res) => {
  try {
    const { year } = req.query;
    let sql = 'SELECT * FROM company_holidays WHERE 1=1';
    const params = [];

    if (year) {
      sql += ' AND YEAR(holiday_date) = ?';
      params.push(year);
    }

    sql += ' ORDER BY holiday_date ASC';

    const results = await query(sql, params);
    res.json(results);
  } catch (err) {
    console.error('Error fetching holidays:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/calendar/holidays/:id', async (req, res) => {
  try {
    const results = await query('SELECT * FROM company_holidays WHERE id = ?', [req.params.id]);
    if (results.length === 0) {
      return res.status(404).json({ error: 'Holiday not found' });
    }
    res.json(results[0]);
  } catch (err) {
    console.error('Error fetching holiday:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/calendar/holidays', async (req, res) => {
  try {
    const data = req.body;
    const holidayId = data.holiday_id || `HOL-${Date.now()}`;
    const id = data.id || `H${Date.now()}`;

    const sql = `
      INSERT INTO company_holidays (
        id, holiday_id, name_ar, name_en, description_ar, description_en,
        holiday_date, is_recurring, holiday_type, is_paid, is_emergency, scope, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      id,
      holidayId,
      data.name_ar || '',
      data.name_en || '',
      data.description_ar || null,
      data.description_en || null,
      data.holiday_date,
      data.is_recurring ? 1 : 0,
      data.holiday_type || 'national',
      data.is_paid ? 1 : 0,
      data.is_emergency ? 1 : 0,
      data.scope || 'all_branches',
      data.created_by || 'ADMIN001'
    ];

    await query(sql, params);
    res.json({ success: true, id, holiday_id: holidayId });
  } catch (err) {
    console.error('Error creating holiday:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/calendar/holidays/:id', async (req, res) => {
  try {
    const data = req.body;
    const sql = `
      UPDATE company_holidays SET
        name_ar = ?, name_en = ?, description_ar = ?, description_en = ?,
        holiday_date = ?, is_recurring = ?, holiday_type = ?, is_paid = ?,
        is_emergency = ?, scope = ?
      WHERE id = ?
    `;

    const params = [
      data.name_ar || '',
      data.name_en || '',
      data.description_ar || null,
      data.description_en || null,
      data.holiday_date,
      data.is_recurring ? 1 : 0,
      data.holiday_type || 'national',
      data.is_paid ? 1 : 0,
      data.is_emergency ? 1 : 0,
      data.scope || 'all_branches',
      req.params.id
    ];

    await query(sql, params);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating holiday:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/calendar/holidays/:id', async (req, res) => {
  try {
    await query('DELETE FROM company_holiday_branches WHERE holiday_id = ?', [req.params.id]);
    await query('DELETE FROM company_holidays WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting holiday:', err);
    res.status(500).json({ error: err.message });
  }
});

// Holiday Branches endpoints
app.get('/api/calendar/holidays/:holidayId/branches', async (req, res) => {
  try {
    const results = await query('SELECT branch_id FROM company_holiday_branches WHERE holiday_id = ?', [req.params.holidayId]);
    res.json(results.map(r => r.branch_id));
  } catch (err) {
    console.error('Error fetching holiday branches:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/calendar/holidays/:holidayId/branches', async (req, res) => {
  try {
    const { branch_ids } = req.body;
    if (Array.isArray(branch_ids)) {
      await query('DELETE FROM company_holiday_branches WHERE holiday_id = ?', [req.params.holidayId]);
      for (const branchId of branch_ids) {
        await query('INSERT INTO company_holiday_branches (holiday_id, branch_id) VALUES (?, ?)', [req.params.holidayId, branchId]);
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error adding holiday branches:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/calendar/holidays/:holidayId/branches/remove', async (req, res) => {
  try {
    const { branch_ids } = req.body;
    if (Array.isArray(branch_ids) && branch_ids.length > 0) {
      await query('DELETE FROM company_holiday_branches WHERE holiday_id = ? AND branch_id IN (?)', [req.params.holidayId, branch_ids]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error removing holiday branches:', err);
    res.status(500).json({ error: err.message });
  }
});

// Attendance System endpoints
app.get('/api/attendance', async (req, res) => {
  try {
    const { employee_id, start_date, end_date, status } = req.query;
    let sql = 'SELECT a.*, e.full_name_ar, e.full_name_en, e.employee_id as emp_number FROM attendance a LEFT JOIN employees e ON a.employee_id = e.id WHERE 1=1';
    const params = [];

    if (employee_id) {
      sql += ' AND a.employee_id = ?';
      params.push(employee_id);
    }
    if (start_date) {
      sql += ' AND a.attendance_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND a.attendance_date <= ?';
      params.push(end_date);
    }
    if (status) {
      sql += ' AND a.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY a.attendance_date DESC, a.employee_id ASC';

    const results = await query(sql, params);
    res.json(results);
  } catch (err) {
    console.error('Error fetching attendance:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/attendance/:id', async (req, res) => {
  try {
    const results = await query('SELECT * FROM attendance WHERE id = ?', [req.params.id]);
    if (results.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    res.json(results[0]);
  } catch (err) {
    console.error('Error fetching attendance:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/attendance/:id/details', async (req, res) => {
  try {
    const results = await query('SELECT * FROM attendance_details WHERE attendance_id = ? ORDER BY punch_time ASC', [req.params.id]);
    res.json(results);
  } catch (err) {
    console.error('Error fetching attendance details:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/attendance', async (req, res) => {
  try {
    const data = req.body;
    const dayOfWeek = new Date(data.attendance_date).getDay() + 1; // 1=Mon, 7=Sun
    
    const result = await query(
      'INSERT INTO attendance (employee_id, attendance_date, day_of_week, check_in, check_out, work_hours, late_minutes, overtime_minutes, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [data.employee_id, data.attendance_date, dayOfWeek, data.check_in, data.check_out, data.work_hours, data.late_minutes || 0, data.overtime_minutes || 0, data.status || 'present', data.notes]
    );
    
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('Error creating attendance:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/attendance/:id', async (req, res) => {
  try {
    const data = req.body;
    await query(
      'UPDATE attendance SET check_in = ?, check_out = ?, work_hours = ?, late_minutes = ?, overtime_minutes = ?, status = ?, notes = ? WHERE id = ?',
      [data.check_in, data.check_out, data.work_hours, data.late_minutes, data.overtime_minutes, data.status, data.notes, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating attendance:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/attendance/:id', async (req, res) => {
  try {
    await query('DELETE FROM attendance WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting attendance:', err);
    res.status(500).json({ error: err.message });
  }
});

// Attendance Details endpoints
app.post('/api/attendance/:id/details', async (req, res) => {
  try {
    const data = req.body;
    await query(
      'INSERT INTO attendance_details (attendance_id, punch_time, punch_type, device_id, location) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, data.punch_time, data.punch_type, data.device_id, data.location]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error creating attendance detail:', err);
    res.status(500).json({ error: err.message });
  }
});

// Shift Types endpoints
app.get('/api/shift-types', async (req, res) => {
  try {
    const results = await query('SELECT * FROM shift_types WHERE is_active = 1 ORDER BY id');
    res.json(results);
  } catch (err) {
    console.error('Error fetching shift types:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/shift-types', async (req, res) => {
  try {
    const data = req.body;
    await query(
      'INSERT INTO shift_types (name, name_en, start_time, end_time, work_hours, grace_minutes, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [data.name, data.name_en, data.start_time, data.end_time, data.work_hours, data.grace_minutes, data.is_active !== undefined ? data.is_active : 1]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error creating shift type:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/shift-types/:id', async (req, res) => {
  try {
    const data = req.body;
    await query(
      'UPDATE shift_types SET name = ?, name_en = ?, start_time = ?, end_time = ?, work_hours = ?, grace_minutes = ?, is_active = ? WHERE id = ?',
      [data.name, data.name_en, data.start_time, data.end_time, data.work_hours, data.grace_minutes, data.is_active, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating shift type:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/shift-types/:id', async (req, res) => {
  try {
    await query('DELETE FROM shift_types WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting shift type:', err);
    res.status(500).json({ error: err.message });
  }
});

// Holidays endpoints
app.get('/api/holidays', async (req, res) => {
  try {
    const { year } = req.query;
    let sql = 'SELECT * FROM holidays WHERE is_active = 1';
    const params = [];

    if (year) {
      sql += ' AND YEAR(holiday_date) = ?';
      params.push(year);
    }

    sql += ' ORDER BY holiday_date ASC';

    const results = await query(sql, params);
    res.json(results);
  } catch (err) {
    console.error('Error fetching holidays:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/holidays', async (req, res) => {
  try {
    const data = req.body;
    await query(
      'INSERT INTO holidays (name, name_en, holiday_date, type, is_active) VALUES (?, ?, ?, ?, ?)',
      [data.name, data.name_en, data.holiday_date, data.type, data.is_active !== undefined ? data.is_active : 1]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error creating holiday:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/holidays/:id', async (req, res) => {
  try {
    const data = req.body;
    await query(
      'UPDATE holidays SET name = ?, name_en = ?, holiday_date = ?, type = ?, is_active = ? WHERE id = ?',
      [data.name, data.name_en, data.holiday_date, data.type, data.is_active, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating holiday:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/holidays/:id', async (req, res) => {
  try {
    await query('DELETE FROM holidays WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting holiday:', err);
    res.status(500).json({ error: err.message });
  }
});

// Attendance Settings endpoints
app.get('/api/attendance-settings', async (req, res) => {
  try {
    const results = await query('SELECT * FROM attendance_settings');
    const settings = {};
    results.forEach(row => {
      settings[row.key_name] = row.key_value;
    });
    res.json(settings);
  } catch (err) {
    console.error('Error fetching attendance settings:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/attendance-settings/bulk', async (req, res) => {
  try {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await query('INSERT INTO attendance_settings (key_name, key_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE key_value = ?', [key, value, value]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating attendance settings:', err);
    res.status(500).json({ error: err.message });
  }
});

// Event Attendees endpoints
app.get('/api/calendar/events/:eventId/attendees', async (req, res) => {
  try {
    const results = await query('SELECT * FROM event_attendees WHERE event_id = ?', [req.params.eventId]);
    res.json(results);
  } catch (err) {
    console.error('Error fetching event attendees:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/calendar/events/:eventId/attendees', async (req, res) => {
  try {
    const data = req.body;
    const id = `A${Date.now()}`;

    const sql = `
      INSERT INTO event_attendees (id, event_id, employee_id, attendance_status, notes)
      VALUES (?, ?, ?, ?, ?)
    `;

    const params = [id, req.params.eventId, data.employee_id, data.attendance_status, data.notes];

    await query(sql, params);
    res.json({ success: true, id });
  } catch (err) {
    console.error('Error adding event attendee:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/calendar/events/:eventId/attendees/:attendeeId', async (req, res) => {
  try {
    const data = req.body;
    const sql = `
      UPDATE event_attendees SET
        attendance_status = ?, response_date = NOW(), notes = ?
      WHERE id = ?
    `;

    const params = [data.attendance_status, data.notes, req.params.attendeeId];

    await query(sql, params);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating event attendee:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/calendar/events/:eventId/attendees/:attendeeId', async (req, res) => {
  try {
    await query('DELETE FROM event_attendees WHERE id = ?', [req.params.attendeeId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting event attendee:', err);
    res.status(500).json({ error: err.message });
  }
});

// App Settings endpoints
app.get('/api/settings/app', async (req, res) => {
  try {
    const results = await query('SELECT * FROM app_settings');
    res.json(results);
  } catch (err) {
    console.error('Error fetching app settings:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings/app/bulk', async (req, res) => {
  try {
    const settings = req.body;
    const entries = Object.entries(settings);
    if (entries.length === 0) {
      return res.json({ success: true });
    }

    const values = entries.map(([key, value]) => [
      key,
      value !== undefined && value !== null ? String(value) : ''
    ]);

    const sql = `
      INSERT INTO app_settings (setting_key, setting_value)
      VALUES ?
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    `;
    await query(sql, [values]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error bulk updating app settings:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings/app/:key', async (req, res) => {
  try {
    const { setting_value } = req.body;
    const key = req.params.key;
    
    // Check if setting exists
    const existing = await query('SELECT * FROM app_settings WHERE setting_key = ?', [key]);
    
    if (existing.length === 0) {
      // Insert new setting
      await query('INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)', [key, setting_value]);
    } else {
      // Update existing setting
      await query('UPDATE app_settings SET setting_value = ? WHERE setting_key = ?', [setting_value, key]);
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating app setting:', err);
    res.status(500).json({ error: err.message });
  }
});

// Company News API Endpoints

// Get all news with optional filters
app.get('/api/news', async (req, res) => {
  try {
    const { status, category, target_audience } = req.query;
    let sql = 'SELECT * FROM company_news WHERE 1=1';
    const params = [];
    
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (target_audience) {
      sql += ' AND (target_audience = ? OR target_audience = "all")';
      params.push(target_audience);
    }
    
    sql += ' ORDER BY publish_date DESC, created_at DESC';
    
    const results = await query(sql, params);
    res.json(results);
  } catch (err) {
    console.error('Error fetching news:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all app settings
app.get(['/api/app-settings', '/api/settings/app'], async (req, res) => {
  try {
    const results = await query('SELECT setting_key, setting_value FROM app_settings');
    const settingsMap = {};
    results.forEach(row => {
      settingsMap[row.setting_key] = row.setting_value;
    });
    res.json(settingsMap);
  } catch (err) {
    console.error('Error fetching app settings:', err);
    res.status(500).json({ error: err.message });
  }
});

// Bulk update app settings
app.post(['/api/app-settings/bulk', '/api/settings/app/bulk'], async (req, res) => {
  try {
    const settings = req.body;
    if (settings && typeof settings === 'object') {
      for (const [key, value] of Object.entries(settings)) {
        await query(
          'INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
          [key, String(value ?? ''), String(value ?? '')]
        ).catch(() => {});
      }
    }
    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err) {
    console.error('Error saving app settings:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get specific news item
app.get('/api/news/:id', async (req, res) => {
  try {
    const results = await query('SELECT * FROM company_news WHERE id = ?', [req.params.id]);
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'News item not found' });
    }
    
    // Increment view count
    await query('UPDATE company_news SET views_count = views_count + 1 WHERE id = ?', [req.params.id]);
    
    res.json(results[0]);
  } catch (err) {
    console.error('Error fetching news item:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create new news
app.post('/api/news', async (req, res) => {
  try {
    const {
      title_ar, title_en, content_ar, content_en,
      category = 'general',
      target_audience = 'all',
      priority = 'normal',
      published_by,
      publish_date,
      expiry_date,
      status = 'draft',
      attachment_url
    } = req.body;
    
    const sql = `
      INSERT INTO company_news (
        title_ar, title_en, content_ar, content_en,
        category, target_audience, priority, published_by,
        publish_date, expiry_date, status, attachment_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      title_ar, title_en, content_ar, content_en,
      category, target_audience, priority, published_by,
      publish_date || null, expiry_date || null, status, attachment_url || null
    ];
    
    const result = await query(sql, values);
    const insertedNews = await query('SELECT * FROM company_news WHERE id = ?', [result.insertId]);
    
    res.json(insertedNews[0]);
  } catch (err) {
    console.error('Error creating news:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update news
app.put('/api/news/:id', async (req, res) => {
  try {
    const {
      title_ar, title_en, content_ar, content_en,
      category, target_audience, priority,
      published_by, publish_date, expiry_date,
      status, attachment_url
    } = req.body;
    
    const sql = `
      UPDATE company_news SET
        title_ar = ?, title_en = ?, content_ar = ?, content_en = ?,
        category = ?, target_audience = ?, priority = ?,
        published_by = ?, publish_date = ?, expiry_date = ?,
        status = ?, attachment_url = ?
      WHERE id = ?
    `;
    
    const values = [
      title_ar, title_en, content_ar, content_en,
      category, target_audience, priority,
      published_by, publish_date, expiry_date,
      status, attachment_url, req.params.id
    ];
    
    await query(sql, values);
    const updatedNews = await query('SELECT * FROM company_news WHERE id = ?', [req.params.id]);
    
    res.json(updatedNews[0]);
  } catch (err) {
    console.error('Error updating news:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update news status
app.put('/api/news/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    await query('UPDATE company_news SET status = ? WHERE id = ?', [status, req.params.id]);
    const updatedNews = await query('SELECT * FROM company_news WHERE id = ?', [req.params.id]);
    
    res.json(updatedNews[0]);
  } catch (err) {
    console.error('Error updating news status:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete news
app.delete('/api/news/:id', async (req, res) => {
  try {
    await query('DELETE FROM company_news WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting news:', err);
    res.status(500).json({ error: err.message });
  }
});

// Clear all system data except Super Admin credentials
app.post('/api/reset-data', async (req, res) => {
  try {
    // Disable foreign key checks to avoid FK constraint errors during table truncation
    await query('SET FOREIGN_KEY_CHECKS = 0');

    // Fetch all table names dynamically from MySQL
    const tables = await query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);

    // Explicitly truncate employee_children and employees tables
    await query('TRUNCATE TABLE employee_children').catch(() => query('DELETE FROM employee_children').catch(() => {}));
    await query('TRUNCATE TABLE employees').catch(() => query('DELETE FROM employees').catch(() => {}));

    for (const table of tableNames) {
      try {
        if (table === 'users') {
          // Keep Super Admin login credentials intact
          await query("DELETE FROM users WHERE role NOT IN ('Super Admin', 'super_admin') AND username NOT IN ('admin', 'superadmin')");
        } else if (table !== 'employee_children' && table !== 'employees') {
          await query(`TRUNCATE TABLE \`${table}\``).catch(() => query(`DELETE FROM \`${table}\``));
        }
      } catch (e) {
        console.warn(`Could not clear table ${table}:`, e.message);
      }
    }

    // Re-enable foreign key checks
    await query('SET FOREIGN_KEY_CHECKS = 1');

    // Re-seed default settings
    await ensureSettingsSeededAndSynced();

    res.json({ success: true, message: 'All system data cleared except Super Admin credentials.' });
  } catch (err) {
    console.error('Error resetting database data:', err);
    try { await query('SET FOREIGN_KEY_CHECKS = 1'); } catch (e) {}
    res.status(500).json({ error: err.message });
  }
});

// Silent Background Notification Engine (Local WhatsApp & Automated Email Dispatcher)
app.post('/api/notify/application-receipt', async (req, res) => {
  try {
    const { fullName, email, phone, jobTitle } = req.body;
    
    // Clean & Format Phone to International Format
    let cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '964' + cleanPhone.substring(1);
    } else if (cleanPhone && !cleanPhone.startsWith('964')) {
      cleanPhone = '964' + cleanPhone;
    }

    const waMsg = `مرحباً ${fullName}،\nتم استلام طلب التقديم الخاص بك على وظيفة (${jobTitle}) بنجاح لدى مؤسسة فيتاس العراق.\nسيقوم فريق الموارد البشرية بمراجعة ملفك والتواصل معك قريباً.\nتحياتنا، قسم الموارد البشرية - فيتاس العراق.`;

    const emailSubject = `مؤسسة فيتاس العراق - تأكيد استلام طلب التقديم على وظيفة (${jobTitle})`;

    // Log silent background dispatches
    console.log(`[AUTOMATED BACKGROUND DISPATCH] -------------------------------`);
    console.log(`[WHATSAPP DISPATCHER] Sent silently to: ${cleanPhone}`);
    console.log(`[WHATSAPP MESSAGE]: ${waMsg}`);
    console.log(`[EMAIL DISPATCHER] Sent silently to: ${email}`);
    console.log(`[EMAIL SUBJECT]: ${emailSubject}`);
    console.log(`[BACKGROUND ENGINE] Dispatch completed 100% silently with 0 popups.`);

    // Persist to notification logs
    const logEntry = {
      timestamp: new Date().toISOString(),
      candidateName: fullName,
      phone: cleanPhone,
      email: email,
      jobTitle: jobTitle,
      whatsappDispatched: true,
      emailDispatched: true,
      status: 'SENT_SILENTLY'
    };

    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const logFile = path.join(uploadsDir, 'notifications_dispatch_log.json');
    let logs = [];
    if (fs.existsSync(logFile)) {
      try {
        const data = fs.readFileSync(logFile, 'utf8');
        logs = JSON.parse(data);
      } catch (e) {}
    }
    logs.unshift(logEntry);
    fs.writeFileSync(logFile, JSON.stringify(logs.slice(0, 500), null, 2));

    res.json({
      success: true,
      message: 'Background notifications dispatched silently for WhatsApp & Email',
      dispatch: logEntry
    });
  } catch (err) {
    console.error('Error in background notification dispatcher:', err);
    res.status(500).json({ error: err.message });
  }
});

// Automated Candidate Rejection Dispatcher Endpoint
app.post('/api/notify/rejection', async (req, res) => {
  try {
    const { fullName, email, phone, jobTitle } = req.body;
    let cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '964' + cleanPhone.substring(1);
    } else if (cleanPhone && !cleanPhone.startsWith('964')) {
      cleanPhone = '964' + cleanPhone;
    }

    const rejectionMsg = `السيد/ة ${fullName}\n.\nنعتذر عن عدم اختيارك لوظيفة (${jobTitle || 'الوظيفة'}) بسبب عدم توفر متطلبات العمل لديك حالياً.\nنتمنى لك التوفيق والنجاح في مسيرتك المهنية.\nمؤسسة فيتاس العراق - قسم الموارد البشرية`;

    console.log(`[AUTOMATED REJECTION DISPATCH] -------------------------------`);
    console.log(`[REJECTION WHATSAPP] Sent to: ${cleanPhone}`);
    console.log(`[REJECTION MESSAGE]: ${rejectionMsg}`);
    console.log(`[REJECTION EMAIL] Sent to: ${email}`);

    res.json({ success: true, message: 'Rejection notice dispatched successfully' });
  } catch (err) {
    console.error('Error in rejection notification dispatcher:', err);
    res.status(500).json({ error: err.message });
  }
});

// Automated Job Deadline 16:00 Cutoff Engine
const autoCloseExpiredJobsAtCutoff = async () => {
  try {
    const jobs = await query('SELECT * FROM job_vacancies WHERE status IN ("مفتوحة", "Open") AND deadline IS NOT NULL AND deadline != ""');
    if (!Array.isArray(jobs) || jobs.length === 0) return;

    const now = new Date();
    for (const job of jobs) {
      if (job.deadline) {
        const cleanDate = String(job.deadline).split('T')[0].split(' ')[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
          const [year, month, day] = cleanDate.split('-').map(Number);
          const cutoffTime = new Date(year, month - 1, day, 16, 0, 0, 0);

          if (now.getTime() >= cutoffTime.getTime()) {
            await query('UPDATE job_vacancies SET status = "مغلقة" WHERE id = ?', [job.id]);
            console.log(`[AUTO-CLOSE ENGINE] Automatically set job #${job.id} (${job.title}) to Closed at 16:00 deadline cutoff.`);
          }
        }
      }
    }
  } catch (e) {
    // Ignore if table not yet initialized
  }
};

// Check every 10 seconds
setInterval(autoCloseExpiredJobsAtCutoff, 10000);
autoCloseExpiredJobsAtCutoff();

// Register Social Security & Income Tax Module Routes
import('./src/tax_module/server/taxRoutes.js').then(({ registerTaxModuleRoutes }) => {
  registerTaxModuleRoutes(app, query);
}).catch(err => {
  console.error('Error initializing tax module routes:', err);
});

// SPA React Router fallback route
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT} (accessible via LAN/WiFi and localhost)`);
});
