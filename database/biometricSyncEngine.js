import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

// Dynamically attempt to import mssql package if available
let sqlModule = null;
try {
  sqlModule = await import('mssql');
} catch (e) {
  // mssql may still be installing or will use native PowerShell SqlClient bridge
  console.log('[BIOMETRIC ENGINE] Note: mssql package dynamic loader notice:', e.message);
}

// In-memory scheduler reference
let activeSyncTimer = null;
let currentDbPool = null;

/**
 * Ensure all necessary tables exist in MySQL
 */
export async function ensureBiometricTables(pool) {
  const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      pool.query(sql, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  };

  try {
    // 1. Biometric Server Configuration Table
    await query(`
      CREATE TABLE IF NOT EXISTS biometric_server_config (
        id INT PRIMARY KEY AUTO_INCREMENT,
        host VARCHAR(255) NOT NULL DEFAULT '127.0.0.1',
        port INT NOT NULL DEFAULT 1433,
        db_name VARCHAR(150) NOT NULL DEFAULT 'att',
        username VARCHAR(150) DEFAULT 'sa',
        password VARCHAR(255) DEFAULT '',
        auth_mode ENUM('sql', 'windows') NOT NULL DEFAULT 'sql',
        table_name VARCHAR(100) NOT NULL DEFAULT 'iclock_transaction',
        sync_interval_mins INT NOT NULL DEFAULT 15,
        auto_sync_enabled TINYINT(1) NOT NULL DEFAULT 1,
        last_sync_at DATETIME DEFAULT NULL,
        last_sync_status VARCHAR(50) DEFAULT 'idle',
        last_sync_message TEXT DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seed default config if empty
    const existing = await query('SELECT id FROM biometric_server_config LIMIT 1');
    if (!existing || existing.length > 0) {
      // already exists
    } else {
      await query(`
        INSERT INTO biometric_server_config 
        (host, port, db_name, username, password, auth_mode, table_name, sync_interval_mins, auto_sync_enabled)
        VALUES 
        ('127.0.0.1', 1433, 'att', 'sa', '', 'sql', 'iclock_transaction', 15, 1)
      `);
      console.log('[BIOMETRIC ENGINE] Seeded default biometric_server_config table.');
    }

    // 2. Raw Attendance Logs Table (stores all raw punches from devices/SQL Server)
    await query(`
      CREATE TABLE IF NOT EXISTS raw_attendance_logs (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        device_id VARCHAR(100) DEFAULT 'DEV-01',
        employee_biometric_id VARCHAR(100) NOT NULL,
        employee_number VARCHAR(100) DEFAULT NULL,
        employee_name_ar VARCHAR(255) DEFAULT NULL,
        employee_name_en VARCHAR(255) DEFAULT NULL,
        punch_datetime DATETIME NOT NULL,
        punch_type VARCHAR(50) DEFAULT 'check_in',
        verify_mode VARCHAR(50) DEFAULT 'fingerprint',
        raw_punch_state INT DEFAULT 0,
        sync_batch_id VARCHAR(100) DEFAULT NULL,
        is_processed TINYINT(1) DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_bio_punch (employee_biometric_id, punch_datetime),
        KEY idx_punch_dt (punch_datetime),
        KEY idx_bio_id (employee_biometric_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Attendance Records Table (aggregated daily records per employee)
    await query(`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        employee_id INT UNSIGNED DEFAULT NULL,
        employee_number VARCHAR(100) NOT NULL,
        employee_name_ar VARCHAR(255) DEFAULT NULL,
        employee_name_en VARCHAR(255) DEFAULT NULL,
        department_name_ar VARCHAR(255) DEFAULT NULL,
        department_name_en VARCHAR(255) DEFAULT NULL,
        branch_name_ar VARCHAR(255) DEFAULT NULL,
        branch_name_en VARCHAR(255) DEFAULT NULL,
        date DATE NOT NULL,
        scheduled_start TIME DEFAULT '08:00:00',
        scheduled_end TIME DEFAULT '16:00:00',
        first_punch TIME DEFAULT NULL,
        last_punch TIME DEFAULT NULL,
        worked_minutes INT NOT NULL DEFAULT 0,
        regular_minutes INT NOT NULL DEFAULT 0,
        break_minutes INT NOT NULL DEFAULT 0,
        late_minutes INT NOT NULL DEFAULT 0,
        early_leave_minutes INT NOT NULL DEFAULT 0,
        overtime_minutes INT NOT NULL DEFAULT 0,
        status ENUM('present', 'absent', 'late', 'early_leave', 'on_leave', 'missing_punch', 'weekend', 'holiday') NOT NULL DEFAULT 'present',
        is_corrected TINYINT(1) NOT NULL DEFAULT 0,
        source VARCHAR(50) DEFAULT 'biometric_sync',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_emp_date (employee_number, date),
        KEY idx_att_date (date),
        KEY idx_emp_num (employee_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Biometric Sync History Log
    await query(`
      CREATE TABLE IF NOT EXISTS biometric_sync_history (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        sync_type ENUM('manual', 'auto', 'startup') NOT NULL DEFAULT 'auto',
        started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        finished_at DATETIME DEFAULT NULL,
        duration_ms INT DEFAULT 0,
        status ENUM('success', 'failed', 'running') NOT NULL DEFAULT 'running',
        total_fetched INT DEFAULT 0,
        records_imported INT DEFAULT 0,
        records_aggregated INT DEFAULT 0,
        error_message TEXT DEFAULT NULL,
        host VARCHAR(255) DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('[BIOMETRIC ENGINE] All biometric tables verified in MySQL.');
  } catch (err) {
    console.error('[BIOMETRIC ENGINE] Error ensuring biometric tables:', err.message);
  }
}

/**
 * Get current biometric server configuration
 */
export async function getBiometricConfig(pool) {
  const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      pool.query(sql, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  };

  try {
    const rows = await query('SELECT * FROM biometric_server_config ORDER BY id ASC LIMIT 1');
    if (rows && rows.length > 0) {
      return rows[0];
    }
  } catch (e) {
    console.error('[BIOMETRIC ENGINE] Error loading biometric config:', e.message);
  }

  return {
    host: '127.0.0.1',
    port: 1433,
    db_name: 'att',
    username: 'sa',
    password: '',
    auth_mode: 'sql',
    table_name: 'iclock_transaction',
    sync_interval_mins: 15,
    auto_sync_enabled: 1,
    last_sync_status: 'idle'
  };
}

/**
 * Save updated biometric server configuration
 */
export async function saveBiometricConfig(pool, newConfig) {
  const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      pool.query(sql, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  };

  const existing = await query('SELECT id FROM biometric_server_config LIMIT 1');
  if (existing && existing.length > 0) {
    await query(`
      UPDATE biometric_server_config 
      SET 
        host = ?,
        port = ?,
        db_name = ?,
        username = ?,
        password = ?,
        auth_mode = ?,
        table_name = ?,
        sync_interval_mins = ?,
        auto_sync_enabled = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [
      newConfig.host || '127.0.0.1',
      Number(newConfig.port) || 1433,
      newConfig.db_name || 'att',
      newConfig.username || 'sa',
      newConfig.password !== undefined ? newConfig.password : '',
      newConfig.auth_mode || 'sql',
      newConfig.table_name || 'iclock_transaction',
      Number(newConfig.sync_interval_mins) || 15,
      newConfig.auto_sync_enabled ? 1 : 0,
      existing[0].id
    ]);
  } else {
    await query(`
      INSERT INTO biometric_server_config 
      (host, port, db_name, username, password, auth_mode, table_name, sync_interval_mins, auto_sync_enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newConfig.host || '127.0.0.1',
      Number(newConfig.port) || 1433,
      newConfig.db_name || 'att',
      newConfig.username || 'sa',
      newConfig.password || '',
      newConfig.auth_mode || 'sql',
      newConfig.table_name || 'iclock_transaction',
      Number(newConfig.sync_interval_mins) || 15,
      newConfig.auto_sync_enabled ? 1 : 0
    ]);
  }

  // Restart scheduler with new parameters
  startBiometricScheduler(pool);

  return await getBiometricConfig(pool);
}

/**
 * Execute a SQL query on MS SQL Server via mssql package or PowerShell SqlClient fallback
 */
export async function executeSqlServerQuery(config, sqlQuery) {
  const startTime = Date.now();

  // Strategy 1: Try with mssql module if available
  if (!sqlModule) {
    try {
      sqlModule = await import('mssql');
    } catch (e) {}
  }

  if (sqlModule && sqlModule.default) {
    const mssql = sqlModule.default;
    const isWindowsAuth = config.auth_mode === 'windows';

    const connConfig = {
      server: config.host || 'localhost',
      port: Number(config.port) || 1433,
      database: config.db_name || 'att',
      options: {
        encrypt: false,
        trustServerCertificate: true,
        connectTimeout: 7000,
        requestTimeout: 15000,
        enableArithAbort: true
      }
    };

    if (!isWindowsAuth) {
      connConfig.user = config.username || 'sa';
      connConfig.password = config.password || '';
    } else {
      connConfig.options.trustedConnection = true;
    }

    try {
      const pool = await new mssql.ConnectionPool(connConfig).connect();
      const result = await pool.request().query(sqlQuery);
      await pool.close();
      const latency = Date.now() - startTime;
      return { success: true, rows: result.recordset || [], latency_ms: latency, driver: 'mssql-node' };
    } catch (nodeErr) {
      console.log('[BIOMETRIC ENGINE] mssql node driver attempt failed, falling back to PowerShell SqlClient:', nodeErr.message);
    }
  }

  // Strategy 2: Native Windows PowerShell System.Data.SqlClient Bridge
  // Highly resilient on Windows LAN environments and supports Windows Integrated Auth automatically
  try {
    const isWinAuth = config.auth_mode === 'windows' || !config.username;
    let connStr = '';
    
    if (isWinAuth) {
      connStr = `Server=${config.host},${config.port};Database=${config.db_name};Integrated Security=True;TrustServerCertificate=True;Connect Timeout=5;`;
    } else {
      connStr = `Server=${config.host},${config.port};Database=${config.db_name};User Id=${config.username};Password='${config.password}';TrustServerCertificate=True;Connect Timeout=5;`;
    }

    const cleanSql = sqlQuery.replace(/"/g, '`"').replace(/\n/g, ' ');
    const psScript = `
      [System.Reflection.Assembly]::LoadWithPartialName("System.Data") | Out-Null
      $conn = New-Object System.Data.SqlClient.SqlConnection("${connStr}")
      try {
        $conn.Open()
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = "${cleanSql}"
        $cmd.CommandTimeout = 10
        $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
        $dataset = New-Object System.Data.DataSet
        $adapter.Fill($dataset) | Out-Null
        $table = $dataset.Tables[0]
        $json = $table | ConvertTo-Json -Depth 3
        if ($json) { Write-Output $json } else { Write-Output "[]" }
      } finally {
        $conn.Close()
      }
    `;

    const { stdout, stderr } = await execPromise(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/\r?\n/g, ' ')}"`, { timeout: 12000 });
    
    if (stderr && stderr.trim().length > 0 && !stdout) {
      throw new Error(stderr.trim());
    }

    let parsed = [];
    const trimmed = stdout.trim();
    if (trimmed) {
      try {
        const data = JSON.parse(trimmed);
        parsed = Array.isArray(data) ? data : [data];
      } catch (pe) {
        parsed = [];
      }
    }

    const latency = Date.now() - startTime;
    return { success: true, rows: parsed, latency_ms: latency, driver: 'powershell-sqlclient' };
  } catch (psErr) {
    const latency = Date.now() - startTime;
    throw new Error(`Failed to query SQL Server (${config.host}:${config.port}/${config.db_name}): ${psErr.message}`);
  }
}

/**
 * Test connectivity to MS SQL Server
 */
export async function testBiometricConnection(config) {
  try {
    const tableName = config.table_name || 'iclock_transaction';
    
    // First test basic SELECT
    const testQuery = `
      SELECT 
        @@VERSION as server_version,
        (SELECT COUNT(*) FROM dbo.${tableName}) as total_punches,
        (SELECT TOP 1 punch_time FROM dbo.${tableName} ORDER BY punch_time DESC) as latest_punch
    `;

    const result = await executeSqlServerQuery(config, testQuery);
    const firstRow = result.rows[0] || {};
    const totalPunches = Number(firstRow.total_punches) || (result.rows.length > 0 ? result.rows.length : 0);
    const versionSnippet = firstRow.server_version ? String(firstRow.server_version).split('\n')[0] : 'Microsoft SQL Server';

    return {
      success: true,
      status: 'connected',
      latency_ms: result.latency_ms,
      total_punches: totalPunches,
      latest_punch: firstRow.latest_punch || null,
      server_version: versionSnippet,
      driver: result.driver,
      message_ar: `تم الاتصال بنجاح بسرفر Microsoft SQL Server (${config.host}:${config.port}/${config.db_name}). تم العثور على ${totalPunches} حركة تبصيم مسجلة. زمن الاستجابة: ${result.latency_ms}ms.`,
      message_en: `Successfully connected to Microsoft SQL Server (${config.host}:${config.port}/${config.db_name}). Found ${totalPunches} biometric records. Latency: ${result.latency_ms}ms.`
    };
  } catch (err) {
    return {
      success: false,
      status: 'error',
      latency_ms: 0,
      total_punches: 0,
      error_details: err.message,
      message_ar: `فشل الاتصال بسرفر البصمة (${config.host}:${config.port}/${config.db_name}). يرجى التأكد من تشغيل SQL Server والسماح باتصالات TCP/IP عبر الشبكة. الخطأ: ${err.message}`,
      message_en: `Connection failed to (${config.host}:${config.port}/${config.db_name}): ${err.message}`
    };
  }
}

/**
 * Synchronize attendance records from MS SQL Server into MySQL XAMPP
 */
export async function syncBiometricData(pool, options = {}) {
  const syncType = options.syncType || 'manual';
  const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      pool.query(sql, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  };

  const startTime = Date.now();
  let syncLogId = null;

  try {
    const config = await getBiometricConfig(pool);

    // Create sync history log entry
    const logRes = await query(`
      INSERT INTO biometric_sync_history 
      (sync_type, status, host) 
      VALUES (?, 'running', ?)
    `, [syncType, config.host]);
    syncLogId = logRes.insertId;

    // Determine since date (fetch last 30 days or since last sync)
    let sinceClause = "DATEADD(day, -30, GETDATE())";
    if (config.last_sync_at && !options.fullSync) {
      sinceClause = `'${new Date(config.last_sync_at).toISOString().replace('T', ' ').substring(0, 19)}'`;
    }

    const tableName = config.table_name || 'iclock_transaction';
    const pullQuery = `
      SELECT 
        id, 
        emp_code, 
        punch_time, 
        punch_state, 
        verify_type, 
        terminal_sn, 
        terminal_alias 
      FROM dbo.${tableName}
      WHERE punch_time >= ${sinceClause}
      ORDER BY punch_time ASC
    `;

    console.log(`[BIOMETRIC ENGINE] Pulling punches from SQL Server (${config.host}:${config.port}/${config.db_name})...`);
    const sqlRes = await executeSqlServerQuery(config, pullQuery);
    const rows = sqlRes.rows || [];

    console.log(`[BIOMETRIC ENGINE] Fetched ${rows.length} raw punch records from SQL Server.`);

    // Fetch existing employees to map badgeNo / employeeId
    const employees = await query(`
      SELECT 
        id, 
        badge_no, 
        first_name, 
        last_name, 
        full_name_ar, 
        full_name_en, 
        department_id, 
        branch_id 
      FROM employees
    `).catch(() => []);

    const empMap = new Map();
    for (const emp of employees) {
      const bNo = String(emp.badge_no || emp.id).trim().toLowerCase();
      empMap.set(bNo, emp);
      empMap.set(`vts-${bNo}`, emp);
      empMap.set(`emp-${bNo}`, emp);
      empMap.set(String(emp.id), emp);
    }

    // Get branch and department names lookup
    const depts = await query(`SELECT id, name, name_ar, name_en FROM departments`).catch(() => []);
    const branches = await query(`SELECT id, name, name_ar, name_en FROM branches`).catch(() => []);
    const deptMap = new Map(depts.map(d => [d.id, d]));
    const branchMap = new Map(branches.map(b => [b.id, b]));

    let importedPunchesCount = 0;
    const batchId = `SYNC-${new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14)}`;

    // Group punches by [employeeCode, YYYY-MM-DD] for aggregation
    const dailyGroups = new Map();

    for (const row of rows) {
      const empCode = String(row.emp_code || row.empcode || row.badgeNo || '').trim();
      if (!empCode) continue;

      const punchDateRaw = row.punch_time || row.punchtime || row.time;
      if (!punchDateRaw) continue;

      const punchDate = new Date(punchDateRaw);
      if (isNaN(punchDate.getTime())) continue;

      const dateStr = punchDate.toISOString().split('T')[0];
      const timeStr = punchDate.toTimeString().split(' ')[0];
      const dateTimeStr = `${dateStr} ${timeStr}`;

      const matchedEmp = empMap.get(empCode.toLowerCase()) || null;
      const empNumber = matchedEmp ? (matchedEmp.badge_no || `VTS-${matchedEmp.id}`) : `VTS-${empCode}`;
      const nameAr = matchedEmp ? (matchedEmp.full_name_ar || `${matchedEmp.first_name} ${matchedEmp.last_name}`) : `موظف (${empCode})`;
      const nameEn = matchedEmp ? (matchedEmp.full_name_en || `${matchedEmp.first_name} ${matchedEmp.last_name}`) : `Employee (${empCode})`;

      const deviceId = row.terminal_alias || row.terminal_sn || 'BIOMETRIC-TERMINAL-01';
      const punchState = Number(row.punch_state) || 0;
      const punchType = punchState === 0 ? 'check_in' : (punchState === 1 ? 'check_out' : 'check_in');
      const verifyMode = row.verify_type === 1 ? 'fingerprint' : (row.verify_type === 2 ? 'face' : 'card');

      // Insert into raw_attendance_logs (ignore duplicates via ON DUPLICATE KEY UPDATE)
      try {
        await query(`
          INSERT INTO raw_attendance_logs 
          (device_id, employee_biometric_id, employee_number, employee_name_ar, employee_name_en, punch_datetime, punch_type, verify_mode, raw_punch_state, sync_batch_id, is_processed)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
          ON DUPLICATE KEY UPDATE 
            employee_name_ar = VALUES(employee_name_ar),
            employee_name_en = VALUES(employee_name_en),
            sync_batch_id = VALUES(sync_batch_id)
        `, [
          deviceId,
          empCode,
          empNumber,
          nameAr,
          nameEn,
          dateTimeStr,
          punchType,
          verifyMode,
          punchState,
          batchId
        ]);
        importedPunchesCount++;
      } catch (err) {
        // duplicate or format error
      }

      // Collect for daily aggregation
      const groupKey = `${empNumber}___${dateStr}`;
      if (!dailyGroups.has(groupKey)) {
        dailyGroups.set(groupKey, {
          employee: matchedEmp,
          empNumber,
          nameAr,
          nameEn,
          dateStr,
          punches: []
        });
      }
      dailyGroups.get(groupKey).punches.push(punchDate);
    }

    // Process daily aggregates into attendance_records
    let aggregatedRecordsCount = 0;
    const workStartMinutes = 8 * 60; // 08:00
    const workEndMinutes = 16 * 60;   // 16:00

    for (const [_, group] of dailyGroups.entries()) {
      group.punches.sort((a, b) => a.getTime() - b.getTime());

      const firstPunch = group.punches[0];
      const lastPunch = group.punches.length > 1 ? group.punches[group.punches.length - 1] : group.punches[0];

      const firstPunchTimeStr = firstPunch.toTimeString().split(' ')[0];
      const lastPunchTimeStr = group.punches.length > 1 ? lastPunch.toTimeString().split(' ')[0] : null;

      const firstMins = firstPunch.getHours() * 60 + firstPunch.getMinutes();
      const lastMins = lastPunch ? (lastPunch.getHours() * 60 + lastPunch.getMinutes()) : firstMins;

      const workedMinutes = group.punches.length > 1 ? Math.max(0, lastMins - firstMins) : 0;
      const lateMinutes = Math.max(0, firstMins - workStartMinutes);
      const earlyLeaveMinutes = (lastPunchTimeStr && lastMins < workEndMinutes) ? Math.max(0, workEndMinutes - lastMins) : 0;
      const overtimeMinutes = (lastPunchTimeStr && lastMins > workEndMinutes) ? Math.max(0, lastMins - workEndMinutes) : 0;

      let status = 'present';
      if (group.punches.length === 1) {
        status = 'missing_punch';
      } else if (lateMinutes > 15) {
        status = 'late';
      } else if (earlyLeaveMinutes > 15) {
        status = 'early_leave';
      }

      const emp = group.employee;
      const deptObj = emp && emp.department_id ? deptMap.get(emp.department_id) : null;
      const branchObj = emp && emp.branch_id ? branchMap.get(emp.branch_id) : null;

      const deptAr = deptObj ? (deptObj.name_ar || deptObj.name) : 'الموارد البشرية والشؤون الإدارية';
      const deptEn = deptObj ? (deptObj.name_en || deptObj.name) : 'Human Resources & Admin';
      const branchAr = branchObj ? (branchObj.name_ar || branchObj.name) : 'الإدارة العامة - بغداد';
      const branchEn = branchObj ? (branchObj.name_en || branchObj.name) : 'Headquarters - Baghdad';

      await query(`
        INSERT INTO attendance_records 
        (employee_id, employee_number, employee_name_ar, employee_name_en, department_name_ar, department_name_en, branch_name_ar, branch_name_en, date, scheduled_start, scheduled_end, first_punch, last_punch, worked_minutes, regular_minutes, break_minutes, late_minutes, early_leave_minutes, overtime_minutes, status, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '08:00:00', '16:00:00', ?, ?, ?, ?, 45, ?, ?, ?, ?, 'biometric_sync')
        ON DUPLICATE KEY UPDATE 
          first_punch = VALUES(first_punch),
          last_punch = VALUES(last_punch),
          worked_minutes = VALUES(worked_minutes),
          regular_minutes = VALUES(regular_minutes),
          late_minutes = VALUES(late_minutes),
          early_leave_minutes = VALUES(early_leave_minutes),
          overtime_minutes = VALUES(overtime_minutes),
          status = VALUES(status),
          updated_at = NOW()
      `, [
        emp ? emp.id : null,
        group.empNumber,
        group.nameAr,
        group.nameEn,
        deptAr,
        deptEn,
        branchAr,
        branchEn,
        group.dateStr,
        firstPunchTimeStr,
        lastPunchTimeStr,
        workedMinutes,
        Math.min(workedMinutes, 480),
        lateMinutes,
        earlyLeaveMinutes,
        overtimeMinutes,
        status
      ]);

      aggregatedRecordsCount++;
    }

    const duration = Date.now() - startTime;

    // Update config with last sync status
    await query(`
      UPDATE biometric_server_config 
      SET 
        last_sync_at = NOW(),
        last_sync_status = 'success',
        last_sync_message = ?
      ORDER BY id ASC LIMIT 1
    `, [`تمت المزامنة بنجاح: استيراد ${importedPunchesCount} بصمة وتوليد ${aggregatedRecordsCount} سجل حضور.`]);

    // Update sync log
    if (syncLogId) {
      await query(`
        UPDATE biometric_sync_history 
        SET 
          finished_at = NOW(),
          duration_ms = ?,
          status = 'success',
          total_fetched = ?,
          records_imported = ?,
          records_aggregated = ?
        WHERE id = ?
      `, [duration, rows.length, importedPunchesCount, aggregatedRecordsCount, syncLogId]);
    }

    return {
      success: true,
      total_fetched: rows.length,
      imported_punches: importedPunchesCount,
      aggregated_records: aggregatedRecordsCount,
      duration_ms: duration,
      server_host: config.host,
      message_ar: `تمت المزامنة بنجاح من سرفر البصمة (${config.host}:${config.port}/${config.db_name}). تم استيراد ${importedPunchesCount} حركة بصمة وتحديث ${aggregatedRecordsCount} سجل حضور.`,
      message_en: `Biometric sync completed from (${config.host}:${config.port}/${config.db_name}). Imported ${importedPunchesCount} punches, updated ${aggregatedRecordsCount} daily records.`
    };
  } catch (syncErr) {
    const duration = Date.now() - startTime;
    console.error('[BIOMETRIC ENGINE] Biometric Sync Error:', syncErr.message);

    if (syncLogId) {
      await query(`
        UPDATE biometric_sync_history 
        SET 
          finished_at = NOW(),
          duration_ms = ?,
          status = 'failed',
          error_message = ?
        WHERE id = ?
      `, [duration, syncErr.message, syncLogId]).catch(() => {});
    }

    await query(`
      UPDATE biometric_server_config 
      SET 
        last_sync_status = 'failed',
        last_sync_message = ?
      ORDER BY id ASC LIMIT 1
    `, [syncErr.message]).catch(() => {});

    return {
      success: false,
      error_details: syncErr.message,
      message_ar: `فشلت مزامنة البصمات: ${syncErr.message}`,
      message_en: `Biometric sync failed: ${syncErr.message}`
    };
  }
}

/**
 * Start periodic auto-sync scheduler in background
 */
export function startBiometricScheduler(pool) {
  if (activeSyncTimer) {
    clearInterval(activeSyncTimer);
    activeSyncTimer = null;
  }

  currentDbPool = pool;

  // Run initial async check
  setTimeout(async () => {
    try {
      const config = await getBiometricConfig(pool);
      if (config && config.auto_sync_enabled) {
        const intervalMins = Math.max(1, Number(config.sync_interval_mins) || 15);
        console.log(`[BIOMETRIC ENGINE] Auto-Sync scheduler started. Interval: every ${intervalMins} minutes (Target: ${config.host}:${config.port}/${config.db_name}).`);

        activeSyncTimer = setInterval(async () => {
          try {
            const currentCfg = await getBiometricConfig(pool);
            if (currentCfg && currentCfg.auto_sync_enabled) {
              console.log(`[BIOMETRIC ENGINE] Running scheduled auto-sync from ${currentCfg.host}...`);
              await syncBiometricData(pool, { syncType: 'auto' });
            }
          } catch (e) {
            console.error('[BIOMETRIC ENGINE] Scheduled sync run error:', e.message);
          }
        }, intervalMins * 60 * 1000);
      } else {
        console.log('[BIOMETRIC ENGINE] Auto-sync is currently disabled in settings.');
      }
    } catch (e) {
      console.error('[BIOMETRIC ENGINE] Error initializing scheduler:', e.message);
    }
  }, 5000);
}
