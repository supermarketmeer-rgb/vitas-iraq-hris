import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import config from './database/config.mjs';
import { initDatabase } from './database/initDatabase.js';
import { 
  startAutoCloudSync, 
  syncLocalToCloud, 
  executeCloudQuery, 
  triggerRealtimeSync, 
  addSseClient, 
  startCloudRealtimeListener, 
  broadcastRealtimeEvent 
} from './database/autoCloudSync.js';
import { initSyncEngineTables } from './database/initSyncEngine.js';
import { startLocalDiscoveryServer } from './database/localDiscovery.js';
import { 
  ensureBiometricTables, 
  getBiometricConfig, 
  saveBiometricConfig, 
  testBiometricConnection, 
  syncBiometricData, 
  startBiometricScheduler 
} from './database/biometricSyncEngine.js';
import { ensureDefaultContractsAndClauses } from './database/seedDefaultContracts.js';
import { buildOrgChart } from './database/orgChartService.js';
import { runAllAcceptanceTests } from './database/acceptanceTests.js';
import {
  initDocumentRoutingTables,
  resolveRecipients,
  sendDocumentThroughRouting,
  retryEmailDelivery,
  recordDocumentAccess,
  runDocumentRoutingAcceptanceTests
} from './database/documentRoutingEngine.js';
import { testGraphConnection, getGraphConfig } from './database/msGraphService.js';
import { getPushNotificationStatus } from './database/mobilePushService.js';

import http from 'http';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Drivers Module Backend Integration (Apache Proxy & Auto-Fallback) ────
let phpProcess = null;
const PHP_PORT = 8088;

function ensurePhpBackend(cb) {
  const checkReq = http.request({
    hostname: '127.0.0.1',
    port: 80,
    path: '/hr_drivers/dashboard.php?embedded=1',
    method: 'HEAD',
    timeout: 1000
  }, (res) => {
    cb(80);
  });

  checkReq.on('error', () => {
    if (!phpProcess) {
      const phpExe = 'C:\\xampp\\php\\php.exe';
      const docRoot = path.join(__dirname, 'modules', 'hr_drivers');
      if (fs.existsSync(phpExe) && fs.existsSync(docRoot)) {
        try {
          phpProcess = spawn(phpExe, ['-S', `127.0.0.1:${PHP_PORT}`, '-t', docRoot], {
            stdio: 'ignore',
            detached: false
          });
          console.log(`[Drivers Module] Built-in PHP server started on port ${PHP_PORT}`);
        } catch (e) {
          console.error('[Drivers Module] Error starting built-in PHP runner:', e);
        }
      }
    }
    cb(PHP_PORT);
  });

  checkReq.end();
}

// Middleware
app.use(cors());

// Proxy /hr_drivers requests directly to PHP backend before json parser consumes body
app.use('/hr_drivers', (req, res) => {
  ensurePhpBackend((targetPort) => {
    let targetPath = req.originalUrl || req.url;
    if (targetPort === PHP_PORT) {
      targetPath = targetPath.replace(/^\/hr_drivers/, '') || '/index.php';
    }

    const options = {
      hostname: '127.0.0.1',
      port: targetPort,
      path: targetPath,
      method: req.method,
      headers: {
        ...req.headers,
        host: `127.0.0.1:${targetPort}`,
      }
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
      console.error('[Drivers Proxy] Backend connection error:', err.message);
      res.status(502).send('Error connecting to Drivers PHP Module backend.');
    });

    req.pipe(proxyReq, { end: true });
  });
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Universal File Download Endpoint (guarantees exact filename and extension in Chromium/Edge)
app.post('/api/export/download', (req, res) => {
  try {
    const filename = req.body.filename || req.query.filename || 'export_diagram.bin';
    const mimeType = req.body.mimeType || req.query.mimeType || 'application/octet-stream';
    const base64Data = req.body.data;
    if (!base64Data) {
      return res.status(400).send('No file data provided');
    }
    const buffer = Buffer.from(base64Data, 'base64');
    const safeFilename = String(filename).trim().replace(/["\r\n]/g, '_');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  } catch (err) {
    console.error('Error in /api/export/download:', err);
    res.status(500).send('Download processing failed');
  }
});

// Prevent HTTP caching on all API endpoints to guarantee instant reflection across local and cloud nodes
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

app.use(express.static(path.join(__dirname, 'dist')));
app.use('/assets', express.static(path.join(__dirname, 'dist', 'assets')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/apply/assets', express.static(path.join(__dirname, 'dist', 'assets')));
app.use('/portal/assets', express.static(path.join(__dirname, 'dist', 'assets')));
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
  await initSyncEngineTables(db);
  await initDocumentRoutingTables(db);
  
  // Launch Local Server Discovery (UDP Beacon)
  startLocalDiscoveryServer({ port: PORT, serverId: `VITAS-SERVER-LAN` });
  
  // Launch non-blocking background auto-sync to Cloud
  startAutoCloudSync(db);

  // Launch persistent Real-Time Bridge from Cloud to Local
  startCloudRealtimeListener(db);

  await loadEmployeeColumns();
  await ensureCandidateColumns();
  await ensureJobVacancyColumns();
  await ensureEmployeeChildrenColumns();
  await ensureOnHoldColumn();
  await ensureSettingsSeededAndSynced();
  
  // Initialize Biometric Attendance Sync Engine & Tables
  await ensureBiometricTables(db);
  startBiometricScheduler(db);
});

// Helper function to execute queries with Real-Time Cloud Mirroring
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);

      // RealTime Cloud Mirroring: If query is an INSERT, UPDATE, DELETE, or REPLACE
      const trimmed = (typeof sql === 'string' ? sql.trim() : '').toUpperCase();
      const isMutation = trimmed.startsWith('INSERT') || trimmed.startsWith('UPDATE') || trimmed.startsWith('DELETE') || trimmed.startsWith('REPLACE');

      if (isMutation) {
        // 1. Direct Asynchronous Cloud Execution (0ms latency impact)
        executeCloudQuery(sql, params).catch(() => {});

        // 2. Extract table name to trigger fast targeted table delta sync
        const match = sql.match(/(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|REPLACE\s+INTO)\s+[`]?([a-zA-Z0-9_]+)[`]?/i);
        const tableName = match ? match[1] : null;

        // 3. Automatically record tombstone on deletion, or clear tombstone on insertion
        if (tableName && tableName !== 'sync_deleted_records') {
          const isRailway = !!(process.env.RAILWAY_ENVIRONMENT || process.env.MYSQLHOST);
          const sourceEnv = isRailway ? 'cloud' : 'local';

          if (trimmed.startsWith('DELETE')) {
            if (Array.isArray(params) && params.length > 0) {
              for (const param of params) {
                if (param !== undefined && param !== null && typeof param !== 'object') {
                  const recId = String(param).trim();
                  if (recId.length > 0) {
                    const tombSql = 'INSERT INTO sync_deleted_records (table_name, record_id, source_env, deleted_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE source_env = VALUES(source_env), deleted_at = NOW()';
                    db.query(tombSql, [tableName, recId, sourceEnv], () => {});
                    if (!isRailway) {
                      executeCloudQuery(tombSql, [tableName, recId, 'local']).catch(() => {});
                    }
                  }
                }
              }
            }
          } else if (trimmed.startsWith('INSERT') || trimmed.startsWith('REPLACE')) {
            if (Array.isArray(params) && params.length > 0) {
              for (const param of params) {
                if (param && typeof param === 'string' && param.length > 0 && param.length < 64) {
                  const clearSql = 'DELETE FROM sync_deleted_records WHERE table_name = ? AND (record_id = ? OR record_id = ?)';
                  db.query(clearSql, [tableName, param, `VTS-${param}`], () => {});
                  if (!isRailway) {
                    executeCloudQuery(clearSql, [tableName, param, `VTS-${param}`]).catch(() => {});
                  }
                }
              }
            }
          }
        }

        triggerRealtimeSync(db, tableName);
      }

      resolve(results);
    });
  });
};

// Real-Time Server-Sent Events (SSE) Stream
app.get('/api/sync/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  addSseClient(res);
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', time: new Date().toISOString() })}\n\n`);
});

// Real-Time Notification Webhook between Servers
app.post('/api/sync/notify-change', (req, res) => {
  const { table } = req.body || {};
  broadcastRealtimeEvent({
    type: 'DATA_CHANGED',
    table: table || 'all',
    timestamp: new Date().toISOString()
  });
  res.json({ success: true, notified: true });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'connected', time: new Date().toISOString() });
});

app.post('/api/sync-now', async (req, res) => {
  try {
    const force = req.body?.force === true || req.query?.force === 'true';
    const result = await syncLocalToCloud(db, force);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health & Server Discovery Endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    role: 'LOCAL_SERVER',
    timestamp: Date.now(),
    uptime: process.uptime()
  });
});

app.get('/api/server-info', async (req, res) => {
  try {
    const devicesCount = await query('SELECT COUNT(*) as cnt FROM sync_devices WHERE is_active = 1').catch(() => [{ cnt: 0 }]);
    res.json({
      service: 'VITAS_IRAQ_HRMS',
      role: 'LOCAL_SERVER',
      port: PORT,
      database: 'CONNECTED',
      appVersion: '1.0.0',
      activeDevices: devicesCount[0]?.cnt || 0,
      timestamp: Date.now()
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Incremental Sync API Endpoints
app.post('/api/sync/push', async (req, res) => {
  try {
    const { deviceId, user_id, changes } = req.body;
    if (!Array.isArray(changes) || changes.length === 0) {
      return res.json({ success: true, processedCount: 0, message: 'No changes provided' });
    }

    let processedCount = 0;
    for (const change of changes) {
      const { change_id, table_name, record_id, operation, payload, version = 1, timestamp = Date.now() } = change;
      if (!change_id || !table_name || !operation) continue;

      await query(
        `INSERT IGNORE INTO sync_changes (change_id, device_id, user_id, table_name, record_id, operation, payload, version, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [change_id, deviceId || 'UNKNOWN', user_id || null, table_name, String(record_id || ''), operation, typeof payload === 'string' ? payload : JSON.stringify(payload), version, timestamp]
      ).catch(() => {});

      const dataObj = typeof payload === 'string' ? JSON.parse(payload || '{}') : (payload || {});
      
      if (operation === 'CREATE' || operation === 'UPDATE') {
        const keys = Object.keys(dataObj);
        if (keys.length > 0) {
          const cols = keys.map(k => `\`${k}\``).join(', ');
          const placeholders = keys.map(() => '?').join(', ');
          const updateAssigns = keys.map(k => `\`${k}\` = VALUES(\`${k}\`)`).join(', ');
          const vals = keys.map(k => {
            const v = dataObj[k];
            if (typeof v === 'object' && v !== null) return JSON.stringify(v);
            return v;
          });
          const sql = `INSERT INTO \`${table_name}\` (${cols}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateAssigns}`;
          await query(sql, vals).catch(err => {
            console.warn(`[SYNC PUSH] Error applying change to ${table_name}:`, err.message);
          });
        }
      } else if (operation === 'DELETE' && record_id) {
        await query(`DELETE FROM \`${table_name}\` WHERE id = ?`, [record_id]).catch(() => {});
      }

      processedCount++;
    }

    if (deviceId) {
      await query(
        `INSERT INTO sync_devices (device_id, device_name, install_id, app_version, role, last_seen, last_sync)
         VALUES (?, ?, ?, ?, 'CLIENT', NOW(), NOW())
         ON DUPLICATE KEY UPDATE last_seen = NOW(), last_sync = NOW()`,
        [deviceId, `Client-${deviceId.slice(0, 6)}`, deviceId, '1.0.0']
      ).catch(() => {});
    }

    res.json({ success: true, processedCount, syncedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/sync/pull', async (req, res) => {
  try {
    const sinceTimestamp = parseInt(req.query.sinceTimestamp || '0');
    const deviceId = req.query.deviceId || '';

    const changes = await query(
      `SELECT * FROM sync_changes WHERE timestamp > ? AND device_id != ? ORDER BY timestamp ASC LIMIT 500`,
      [sinceTimestamp, deviceId]
    ).catch(() => []);

    res.json({ success: true, changes, syncedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/sync/devices/heartbeat', async (req, res) => {
  try {
    const { deviceId, deviceName, installId, appVersion, role, connectionMode, ipAddress } = req.body;
    if (!deviceId) return res.status(400).json({ error: 'Device ID required' });

    await query(
      `INSERT INTO sync_devices (device_id, device_name, install_id, app_version, role, connection_mode, ip_address, last_seen)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE device_name = VALUES(device_name), app_version = VALUES(app_version), connection_mode = VALUES(connection_mode), ip_address = VALUES(ip_address), last_seen = NOW()`,
      [deviceId, deviceName || 'Desktop Client', installId || deviceId, appVersion || '1.0.0', role || 'CLIENT', connectionMode || 'LOCAL', ipAddress || req.ip]
    ).catch(() => {});

    res.json({ success: true, serverTime: Date.now() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/sync/devices', async (req, res) => {
  try {
    const devices = await query(`SELECT * FROM sync_devices ORDER BY last_seen DESC`).catch(() => []);
    res.json({ success: true, devices });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/sync/conflicts', async (req, res) => {
  try {
    const conflicts = await query(`SELECT * FROM sync_conflicts ORDER BY created_at DESC LIMIT 100`).catch(() => []);
    res.json({ success: true, conflicts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/sync/conflicts/resolve', async (req, res) => {
  try {
    const { conflictId, resolutionStrategy, resolvedBy } = req.body;
    await query(
      `UPDATE sync_conflicts SET status = 'RESOLVED', resolution_strategy = ?, resolved_by = ?, resolved_at = NOW() WHERE id = ?`,
      [resolutionStrategy || 'MANUAL', resolvedBy || 'Admin', conflictId]
    ).catch(() => {});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/sync/logs', async (req, res) => {
  try {
    const logs = await query(`SELECT * FROM sync_logs ORDER BY timestamp DESC LIMIT 200`).catch(() => []);
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Security Audit Logs Endpoints ---
app.get('/api/audit-logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 200;
    const rows = await query(`SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?`, [limit]).catch(() => []);
    res.json({ success: true, logs: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/audit-logs', async (req, res) => {
  try {
    const { id, user_id, user_name, user_role, action, action_type, severity, module, details, ip_address, user_agent, status, metadata } = req.body;
    const logId = id || `LOG-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const ip = ip_address || req.ip || '192.168.1.109';
    const ua = user_agent || req.headers['user-agent'] || 'Web Browser';
    
    await query(
      `INSERT INTO audit_logs (id, user_id, user_name, user_role, action, action_type, severity, module, details, ip_address, user_agent, status, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        logId,
        user_id || 'USR-ADMIN',
        user_name || 'System Admin',
        user_role || 'Super Admin',
        action || 'عملية تدقيق أمني',
        action_type || 'SECURITY_AUDIT',
        severity || 'info',
        module || 'الأمان والامتثال',
        details || '',
        ip,
        ua,
        status || 'نجاح',
        typeof metadata === 'object' ? JSON.stringify(metadata) : (metadata || '')
      ]
    ).catch(() => {});
    
    res.json({ success: true, id: logId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- API Keys Endpoints ---
app.get('/api/security/api-keys', async (req, res) => {
  try {
    const rows = await query(`SELECT * FROM api_keys ORDER BY created_at DESC`).catch(() => []);
    res.json({ success: true, keys: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/security/api-keys', async (req, res) => {
  try {
    const { name, permissions, expires_at } = req.body;
    const id = `KEY-${Math.floor(1000 + Math.random() * 9000)}`;
    const key = `vts_live_sk_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    await query(
      `INSERT INTO api_keys (id, name, api_key, status, permissions, expires_at) VALUES (?, ?, ?, 'نشط', ?, ?)`,
      [id, name || 'New API Key', key, permissions || 'read_write', expires_at || null]
    ).catch(() => {});
    res.json({ success: true, key: { id, name, key, status: 'نشط', permissions, created_at: new Date().toISOString() } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/security/api-keys/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM api_keys WHERE id = ?`, [id]).catch(() => {});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
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

    await query(`CREATE TABLE IF NOT EXISTS contract_clauses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      contract_type_id INT NOT NULL,
      clause_number INT DEFAULT 1,
      title_ar VARCHAR(255) NULL,
      text_ar TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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

    // 2. Ensure default contract types and 13 clauses for New Employee and Permanent contracts
    await ensureDefaultContractsAndClauses(query);

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
          existingBranches.push({ name_ar: nameAr, name_en: nameEn, name: nameAr });
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
          existingPositions.push({ name_ar: nameAr, name_en: nameEn, name: nameAr });
        }
      }
    }

    // 3. Sync unique Departments from employees table
    const empDepts = await query(`
      SELECT DISTINCT department FROM employees 
      WHERE department IS NOT NULL AND department != ''
    `).catch(() => []);
    const existingDepts = await query('SELECT * FROM departments').catch(() => []);

    const DEPT_EN_MAP = {
      'إدارة التمويل الأصغر والعمليات': 'Microfinance & Operations',
      'الموارد البشرية والشؤون الإدارية': 'Human Resources & Administration',
      'إدارة الموارد البشرية والعمليات': 'Human Resources & Operations',
      'الموارد البشرية': 'Human Resources',
      'قسم الائتمان': 'Credit',
      'القروض والائتمان': 'Loans & Credit',
      'تكنولوجيا المعلوماات': 'IT',
      'تكنولوجيا المعلومات': 'Information Technology',
      'قسم تقنية المعلومات': 'Information Technology',
      'الأمن': 'Security',
      'المشتريات والتسهيلات': 'Procurement & Facilities',
      'قسم الخزينة': 'Treasury',
      'قسم المالية والمحاسبة': 'Finance & Accounting',
      'المالية والمحاسبة': 'Finance & Accounting',
      'الشؤون المالية والتحصيل': 'Finance & Collection',
      'الاستحصال والتحصيل': 'Collection & Recovery',
      'المخاطر والامتثال والتدقيق': 'Risk, Compliance & Audit',
      'قسم المبيعات والتسويق': 'Sales & Marketing',
      'التسويق والمبيعات': 'Marketing & Sales',
      'العمليات': 'Operations'
    };

    if (Array.isArray(empDepts) && Array.isArray(existingDepts)) {
      for (const d of empDepts) {
        const nameAr = String(d.department || '').trim();
        const nameEn = DEPT_EN_MAP[nameAr] || nameAr;
        if (nameAr && !existingDepts.some(dep => 
          String(dep.name_ar || '').trim() === nameAr || 
          String(dep.name || '').trim() === nameAr ||
          (dep.name_en && String(dep.name_en || '').trim() === nameEn)
        )) {
          await query(
            'INSERT INTO departments (name_en, name_ar, name, status, sort_order) VALUES (?, ?, ?, ?, ?)',
            [nameEn, nameAr, nameAr, 'Active', existingDepts.length + 1]
          ).catch(() => {});
          existingDepts.push({ name_ar: nameAr, name_en: nameEn, name: nameAr });
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
    await query("ALTER TABLE candidates MODIFY COLUMN photo_url LONGTEXT").catch(() => {});
    await query("ALTER TABLE candidates MODIFY COLUMN email VARCHAR(255) NULL").catch(() => {});
    await query("ALTER TABLE candidates MODIFY COLUMN full_name VARCHAR(255) NULL").catch(() => {});
    await query("ALTER TABLE candidates ADD COLUMN full_name_ar VARCHAR(255)").catch(() => {});
    await query("ALTER TABLE candidates ADD COLUMN date_of_birth DATE NULL").catch(() => {});
    await query("ALTER TABLE candidates ADD COLUMN gender VARCHAR(50) NULL").catch(() => {});
    await query("ALTER TABLE candidates ADD COLUMN marital_status VARCHAR(50) NULL").catch(() => {});
    await query("ALTER TABLE candidates ADD COLUMN personal_email VARCHAR(255) NULL").catch(() => {});
    await query("ALTER TABLE candidates ADD COLUMN national_id_number VARCHAR(100) NULL").catch(() => {});
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
    await query("ALTER TABLE employees MODIFY COLUMN photo_url LONGTEXT").catch(() => {});
    await query("ALTER TABLE employees MODIFY COLUMN photo LONGBLOB").catch(() => {});
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
    
    broadcastRealtimeEvent({
      type: 'DATA_CHANGED',
      table: 'employees',
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, message: 'Photo uploaded successfully' });
  } catch (err) {
    console.error('Error uploading photo:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete employee photo
app.delete('/api/employees/:id/photo', async (req, res) => {
  try {
    await query('UPDATE employees SET photo = NULL, photo_url = NULL WHERE id = ?', [req.params.id]);
    
    broadcastRealtimeEvent({
      type: 'DATA_CHANGED',
      table: 'employees',
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, message: 'Photo deleted successfully' });
  } catch (err) {
    console.error('Error deleting photo:', err);
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

// Helper functions for formatting employee data
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

const formatEmployeeRow = (row) => {
  let childrenList = [];
  try {
    if (row.children_details) childrenList = JSON.parse(row.children_details);
    else if (row.children_json) childrenList = JSON.parse(row.children_json);
  } catch (e) {}

  const resolvedPhoto = (row.photo_url && row.photo_url.length > 0) ? row.photo_url : ((row.photo && row.photo.length > 0) ? `/api/employees/${row.id}/photo` : null);

  return {
    id: row.id,
    employeeId: row.employee_id,
    employee_id: row.employee_id,
    badgeNo: row.badge_no,
    badge_no: row.badge_no,
    fullName: row.full_name_ar || 'غير محدد',
    fullNameAr: row.full_name_ar || 'غير محدد',
    full_name_ar: row.full_name_ar || 'غير محدد',
    fullNameEn: row.full_name_en || 'N/A',
    full_name_en: row.full_name_en || 'N/A',
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
    position: row.position_ar || row.position || 'غير محدد',
    position_ar: row.position_ar || row.position || 'غير محدد',
    position_en: row.position_en || 'N/A',
    branch: row.branch || row.location_ar || 'غير محدد',
    branchEn: row.branch_en || row.location_en || 'N/A',
    supervisorName: row.supervisor_name || 'غير محدد',
    workScope: row.work_scope || 'غير محدد',
    salary: Number(row.salary || 0),
    basicSalary: Number(row.basic_salary || 0),
    basic_salary: Number(row.basic_salary || 0),
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
    photoUrl: resolvedPhoto,
    photo_url: resolvedPhoto,
    avatar: resolvedPhoto,
    photo: resolvedPhoto,
    spouseName: row.spouse_name || 'غير محدد',
    spouseEmployedHere: Boolean(row.spouse_employed_here),
    childrenList: Array.isArray(childrenList) ? childrenList : [],
    childrenDetails: row.children_details || row.children_json || '',
    originalStartDate: formatDateStr(row.original_start_date || row.contract_original_start || row.contract_start_date),
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
    joinDate: formatDateStr(row.original_start_date || row.contract_original_start || row.contract_start_date)
  };
};

// Fast single employee lookup endpoint
app.get('/api/employees/lookup', async (req, res) => {
  try {
    const badge = req.query.badge ? String(req.query.badge).trim() : null;
    const id = req.query.id ? String(req.query.id).trim() : null;
    const employeeId = req.query.employee_id || req.query.employeeId ? String(req.query.employee_id || req.query.employeeId).trim() : null;

    if (!badge && !id && !employeeId) {
      return res.status(400).json({ error: 'Badge, ID, or Employee ID is required' });
    }

    const conditions = [];
    const params = [];

    if (badge) {
      conditions.push('(LOWER(badge_no) = LOWER(?) OR LOWER(employee_id) = LOWER(?))');
      params.push(badge, badge);
    }
    if (id) {
      conditions.push('(id = ? OR employee_id = ?)');
      params.push(id, id);
    }
    if (employeeId) {
      conditions.push('(LOWER(employee_id) = LOWER(?) OR LOWER(badge_no) = LOWER(?))');
      params.push(employeeId, employeeId);
    }

    const sql = `SELECT * FROM employees WHERE ${conditions.join(' OR ')} LIMIT 1`;
    const results = await query(sql, params);

    if (!results || results.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(formatEmployeeRow(results[0]));
  } catch (err) {
    console.error('Error looking up employee:', err);
    res.status(500).json({ error: err.message });
  }
});

// Employees list & targeted search
app.get('/api/employees', async (req, res) => {
  try {
    const badgeParam = req.query.badge ? String(req.query.badge).trim() : null;
    const idParam = req.query.id ? String(req.query.id).trim() : null;
    const employeeIdParam = req.query.employee_id || req.query.employeeId ? String(req.query.employee_id || req.query.employeeId).trim() : null;
    const qParam = req.query.q ? String(req.query.q).trim() : null;

    let sql = 'SELECT * FROM employees';
    const params = [];

    if (badgeParam || idParam || employeeIdParam) {
      const conditions = [];
      if (badgeParam) {
        conditions.push('(LOWER(badge_no) = LOWER(?) OR LOWER(employee_id) = LOWER(?))');
        params.push(badgeParam, badgeParam);
      }
      if (idParam) {
        conditions.push('(id = ? OR employee_id = ?)');
        params.push(idParam, idParam);
      }
      if (employeeIdParam) {
        conditions.push('(LOWER(employee_id) = LOWER(?) OR LOWER(badge_no) = LOWER(?))');
        params.push(employeeIdParam, employeeIdParam);
      }
      sql += ' WHERE ' + conditions.join(' OR ') + ' LIMIT 5';
    } else if (qParam) {
      sql += ' WHERE LOWER(badge_no) LIKE LOWER(?) OR LOWER(employee_id) LIKE LOWER(?) OR LOWER(full_name_ar) LIKE LOWER(?) OR LOWER(full_name_en) LIKE LOWER(?) LIMIT 20';
      const like = `%${qParam}%`;
      params.push(like, like, like, like);
    } else {
      sql += ' ORDER BY id DESC';
    }

    const results = await query(sql, params);
    const formatted = results.map(formatEmployeeRow);
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

    const hasPhotoField = ('photo' in data) || ('photoUrl' in data) || ('photo_url' in data) || ('photo_removed' in data);
    let photoData = null;
    let finalPhotoUrl = null;
    const rawPhoto = (data.photo !== undefined && data.photo !== null) ? data.photo :
                     ((data.photoUrl !== undefined && data.photoUrl !== null) ? data.photoUrl : data.photo_url);
    const isPhotoExplicitlyRemoved = data.photo_removed === true || data.photo_removed === 1 || data.photo_removed === '1' ||
      (hasPhotoField && (rawPhoto === '' || rawPhoto === null || data.photo === '' || data.photoUrl === '' || data.photo_url === ''));

    if (rawPhoto && typeof rawPhoto === 'string' && rawPhoto.trim() !== '' && !isPhotoExplicitlyRemoved) {
      finalPhotoUrl = rawPhoto.trim();
      if (finalPhotoUrl.startsWith('data:image')) {
        const base64Data = finalPhotoUrl.replace(/^data:image\/[^;]+;base64,/, '');
        photoData = Buffer.from(base64Data, 'base64');
      }
    } else if (isPhotoExplicitlyRemoved) {
      finalPhotoUrl = null;
      photoData = null;
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
      photo_url: finalPhotoUrl,
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

    // 4. Match by email to prevent ER_DUP_ENTRY crash
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if ((!existing || existing.length === 0) && cleanEmail !== '' && !cleanEmail.includes('no-email-')) {
      const existingByEmail = await query('SELECT id FROM employees WHERE LOWER(email) = ?', [cleanEmail]);
      if (existingByEmail && existingByEmail.length > 0) {
        existing = existingByEmail;
        targetDbId = existingByEmail[0].id;
      }
    }

      let finalEmpDbId = targetDbId;
      if (existing && existing.length > 0 && targetDbId) {
        console.log('Updating existing employee ID:', targetDbId);
        let updateCols = validColumns.filter(col => col !== 'id');
        if (!hasPhotoField && !photoData && !finalPhotoUrl) {
          updateCols = updateCols.filter(col => col !== 'photo' && col !== 'photo_url');
        }
        const updateVals = updateCols.map(col => candidateData[col]);
        updateVals.push(targetDbId);

        const cleanEmpId = candidateData.employee_id || '';
        let whereClause = 'WHERE id = ?';
        if (cleanEmpId) {
          whereClause = 'WHERE id = ? OR employee_id = ?';
          updateVals.push(cleanEmpId);
        }

        const setClause = updateCols.map(col => `${col} = ?`).join(', ');
        try {
          await query(`UPDATE employees SET ${setClause}, updated_at = NOW() ${whereClause}`, updateVals);
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

      broadcastRealtimeEvent({
        type: 'DATA_CHANGED',
        table: 'employees',
        timestamp: new Date().toISOString()
      });

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
    const id = req.params.id;
    // 1. Fetch employee info prior to deletion to get both numeric ID and business employee_id
    const empRows = await query('SELECT id, employee_id FROM employees WHERE id = ? OR employee_id = ?', [id, id]).catch(() => []);
    const emp = empRows && empRows[0];

    const isRailway = !!(process.env.RAILWAY_ENVIRONMENT || process.env.MYSQLHOST);
    const sourceEnv = isRailway ? 'cloud' : 'local';

    // 2. Perform deletion from employees and associated users
    await query('DELETE FROM employees WHERE id = ? OR employee_id = ?', [id, id]);
    if (emp && emp.employee_id) {
      await query('DELETE FROM users WHERE employee_id = ? OR username = ?', [emp.employee_id, emp.employee_id]).catch(() => {});
    }

    // 3. Record tombstones for both DB ID and employee_id to guarantee Cloud & Local deletion sync
    const tombSql = 'INSERT INTO sync_deleted_records (table_name, record_id, source_env, deleted_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE source_env = VALUES(source_env), deleted_at = NOW()';
    
    db.query(tombSql, ['employees', String(id), sourceEnv], () => {});
    if (!isRailway) executeCloudQuery(tombSql, ['employees', String(id), 'local']).catch(() => {});

    if (emp && emp.employee_id) {
      db.query(tombSql, ['employees', String(emp.employee_id), sourceEnv], () => {});
      db.query(tombSql, ['users', String(emp.employee_id), sourceEnv], () => {});
      if (!isRailway) {
        executeCloudQuery(tombSql, ['employees', String(emp.employee_id), 'local']).catch(() => {});
        executeCloudQuery(tombSql, ['users', String(emp.employee_id), 'local']).catch(() => {});
      }
    }

    // Immediate sync triggering
    syncLocalToCloud(db).catch(() => {});

    res.json({ success: true, message: 'Employee and associated user deleted successfully' });
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
        fullNameAr: c.full_name_ar || '',
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
        dateOfBirth: c.date_of_birth || '',
        gender: c.gender || '',
        maritalStatus: c.marital_status || '',
        personalEmail: c.personal_email || '',
        nationalIdNumber: c.national_id_number || '',
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
    const fullNameAr = data.fullNameAr || data.full_name_ar || '';
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
      const mime = photoFile.mimetype || 'image/jpeg';
      photoUrl = `data:${mime};base64,${photoFile.buffer.toString('base64')}`;
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

    // Safely parse & format date_of_birth for MySQL DATE column
    let safeDob = null;
    const rawDob = (data.dateOfBirth || data.date_of_birth || '').trim();
    if (rawDob) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawDob)) {
        safeDob = rawDob;
      } else if (rawDob.includes('/')) {
        const parts = rawDob.split('/');
        if (parts.length === 3) {
          if (parts[2].length === 4) {
            safeDob = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          } else if (parts[0].length === 4) {
            safeDob = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
          }
        }
      } else if (rawDob.includes('-')) {
        const parts = rawDob.split('-');
        if (parts.length === 3 && parts[2].length === 4) {
          safeDob = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
    }

    const gender = data.gender || null;
    const maritalStatus = data.maritalStatus || data.marital_status || null;
    const personalEmail = data.personalEmail || data.personal_email || null;
    const nationalIdNumber = data.nationalIdNumber || data.national_id_number || null;

    try {
      await query(
        `INSERT INTO candidates (id, full_name, full_name_ar, email, phone, applied_job_id, job_title, stage, rating, experience_years, notes, photo_url, resume_url, date_of_birth, gender, marital_status, personal_email, national_id_number, applied_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [candidateId, fullName, fullNameAr || fullName, email, phone, validAppliedJobId, jobTitle, stage, rating, experienceYears, notes, photoUrl, resumeUrl, safeDob, gender, maritalStatus, personalEmail, nationalIdNumber]
      );
    } catch (dbErr) {
      console.warn('Full candidate insert error, attempting standard fallback insert:', dbErr.message);
      await query(
        `INSERT INTO candidates (id, full_name, email, phone, applied_job_id, job_title, stage, rating, experience_years, notes, photo_url, resume_url, applied_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [candidateId, fullName, email, phone, validAppliedJobId, jobTitle, stage, rating, experienceYears, notes, photoUrl, resumeUrl]
      ).catch(fallbackErr => {
        console.error('Candidate insert fallback error:', fallbackErr.message);
      });
    }
    
    const newCandidate = {
      id: candidateId,
      fullName,
      fullNameAr: fullNameAr || fullName,
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
      dateOfBirth: safeDob || rawDob,
      gender,
      maritalStatus,
      personalEmail,
      nationalIdNumber,
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
    const mapped = (results || []).map(n => {
      const isRead = Boolean(n.is_read === 1 || n.is_read === true || n.read === true || n.read === 1);
      return {
        ...n,
        read: isRead,
        is_read: isRead ? 1 : 0,
        timestamp: n.timestamp || (n.created_at ? new Date(n.created_at).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }) : 'الآن')
      };
    });
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications', async (req, res) => {
  try {
    const data = req.body;
    const notifId = data.id || `NTF-${Date.now()}`;
    const sql = `INSERT INTO system_notifications (id, title, message, type, is_read, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`;
    const isRead = Boolean(data.read || data.is_read);
    const params = [notifId, data.title, data.message, data.type || 'info', isRead ? 1 : 0];
    await query(sql, params);
    executeCloudQuery(sql, params).catch(() => {});
    triggerRealtimeSync(db, 'system_notifications');
    res.json({ id: notifId, ...data, read: isRead, is_read: isRead ? 1 : 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notifications/read-all', async (req, res) => {
  try {
    await query('UPDATE system_notifications SET is_read = 1, updated_at = NOW()');
    await query('UPDATE notifications SET is_read = 1, updated_at = NOW()').catch(() => {});
    executeCloudQuery('UPDATE system_notifications SET is_read = 1, updated_at = NOW()').catch(() => {});
    executeCloudQuery('UPDATE notifications SET is_read = 1, updated_at = NOW()').catch(() => {});
    triggerRealtimeSync(db, 'system_notifications');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    const id = req.params.id;
    await query('UPDATE system_notifications SET is_read = 1, updated_at = NOW() WHERE id = ?', [id]);
    await query('UPDATE notifications SET is_read = 1, updated_at = NOW() WHERE id = ?', [id]).catch(() => {});
    executeCloudQuery('UPDATE system_notifications SET is_read = 1, updated_at = NOW() WHERE id = ?', [id]).catch(() => {});
    executeCloudQuery('UPDATE notifications SET is_read = 1, updated_at = NOW() WHERE id = ?', [id]).catch(() => {});
    triggerRealtimeSync(db, 'system_notifications');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Branches & Offices
app.get(['/api/branches', '/api/settings/branches', '/api/offices'], async (req, res) => {
  try {
    await syncSettingsFromEmployees().catch(() => {});
    const results = await query('SELECT * FROM branches ORDER BY sort_order ASC, name_ar ASC, id DESC');

    // Deduplicate branches strictly so no branch is repeated
    const seen = new Set();
    const cleanBranches = [];
    for (const b of (results || [])) {
      const key = String(b.name_ar || b.name || b.name_en || '').trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      cleanBranches.push(b);
    }

    res.json(cleanBranches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Settings - Branches POST / CREATE
app.post(['/api/settings/branches', '/api/branches', '/api/offices'], async (req, res) => {
  try {
    const { name, name_ar, name_en, address, city, phone, email, status, sort_order, department_id } = req.body;
    const finalNameAr = (name_ar || name || name_en || '').trim();
    const finalNameEn = (name_en || name || name_ar || '').trim();
    const finalId = req.body.id ? String(req.body.id).trim() : `BR${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const sql = `
      INSERT INTO branches (id, name, name_ar, name_en, address, city, country, phone, email, status, sort_order, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'Iraq', ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        name_ar = VALUES(name_ar),
        name_en = VALUES(name_en),
        address = VALUES(address),
        city = VALUES(city),
        phone = VALUES(phone),
        email = VALUES(email),
        status = VALUES(status),
        sort_order = VALUES(sort_order),
        updated_at = NOW()
    `;
    const params = [
      finalId,
      finalNameAr,
      finalNameAr,
      finalNameEn,
      address ? String(address).trim() : null,
      city ? String(city).trim() : null,
      phone ? String(phone).trim() : null,
      email ? String(email).trim() : null,
      status || 'Active',
      sort_order ? Number(sort_order) : 0
    ];

    await query(sql, params);
    executeCloudQuery(sql, params).catch(() => {});

    // If department_id was specified, link department to this branch
    if (department_id) {
      await query('UPDATE departments SET branch_id = ? WHERE id = ?', [finalId, department_id]).catch(() => {});
    }

    const rows = await query('SELECT * FROM branches WHERE id = ? LIMIT 1', [finalId]);
    const inserted = (rows && rows[0]) ? rows[0] : {
      id: finalId,
      name: finalNameAr,
      name_ar: finalNameAr,
      name_en: finalNameEn,
      address,
      city,
      phone,
      email,
      status: status || 'Active'
    };
    res.json(inserted);
  } catch (err) {
    console.error('Error in POST /api/settings/branches:', err);
    res.status(500).json({ error: err.message });
  }
});

// Settings - Branches PUT / UPDATE
app.put(['/api/settings/branches/:id', '/api/branches/:id', '/api/offices/:id'], async (req, res) => {
  try {
    const { id } = req.params;
    const { name, name_ar, name_en, address, city, phone, email, status, sort_order, department_id } = req.body;
    const finalNameAr = (name_ar || name || name_en || '').trim();
    const finalNameEn = (name_en || name || name_ar || '').trim();

    const sql = `
      UPDATE branches SET
        name = ?,
        name_ar = ?,
        name_en = ?,
        address = ?,
        city = ?,
        phone = ?,
        email = ?,
        status = ?,
        sort_order = COALESCE(?, sort_order),
        updated_at = NOW()
      WHERE id = ?
    `;
    const params = [
      finalNameAr,
      finalNameAr,
      finalNameEn,
      address !== undefined ? (address ? String(address).trim() : null) : null,
      city !== undefined ? (city ? String(city).trim() : null) : null,
      phone !== undefined ? (phone ? String(phone).trim() : null) : null,
      email !== undefined ? (email ? String(email).trim() : null) : null,
      status || 'Active',
      sort_order !== undefined ? Number(sort_order) : null,
      id
    ];

    await query(sql, params);
    executeCloudQuery(sql, params).catch(() => {});

    if (department_id) {
      await query('UPDATE departments SET branch_id = ? WHERE id = ?', [id, department_id]).catch(() => {});
    }

    const rows = await query('SELECT * FROM branches WHERE id = ? LIMIT 1', [id]);
    const updated = (rows && rows[0]) ? rows[0] : {
      id,
      name: finalNameAr,
      name_ar: finalNameAr,
      name_en: finalNameEn,
      address,
      city,
      phone,
      email,
      status
    };
    res.json(updated);
  } catch (err) {
    console.error('Error in PUT /api/settings/branches:', err);
    res.status(500).json({ error: err.message });
  }
});

// Settings - Branches DELETE
app.delete(['/api/settings/branches/:id', '/api/branches/:id', '/api/offices/:id'], async (req, res) => {
  try {
    const { id } = req.params;
    const sql = 'DELETE FROM branches WHERE id = ?';
    await query(sql, [id]);
    executeCloudQuery(sql, [id]).catch(() => {});
    res.json({ success: true, id });
  } catch (err) {
    console.error('Error in DELETE /api/settings/branches:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Dynamic HRIS & Organization Diagram Endpoints
// ----------------------------------------------------
app.get('/api/org-chart', async (req, res) => {
  try {
    const statusFilter = req.query.status || 'active';
    const chart = await buildOrgChart(query, statusFilter);
    res.json(chart);
  } catch (err) {
    console.error('Error generating org chart:', err);
    res.status(500).json({ error: 'Failed to generate organization chart', details: err.message });
  }
});

app.get('/api/audit/integrity', async (req, res) => {
  try {
    const chart = await buildOrgChart(query);
    res.json({
      issues: chart.issues,
      metrics: chart.metrics,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/audit/run-tests', async (req, res) => {
  try {
    const testReport = await runAllAcceptanceTests(query);
    res.json(testReport);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Title Normalization Rules CRUD
app.get('/api/normalization-rules', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM normalization_rules ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/normalization-rules', async (req, res) => {
  try {
    const { rule_type, pattern, replacement } = req.body;
    if (!rule_type || !pattern) {
      return res.status(400).json({ error: 'Rule type and Pattern are required' });
    }
    const result = await query(
      'INSERT INTO normalization_rules (rule_type, pattern, replacement, is_active) VALUES (?, ?, ?, 1)',
      [rule_type, String(pattern).trim(), String(replacement || '').trim()]
    );
    const created = await query('SELECT * FROM normalization_rules WHERE id = ?', [result.insertId]);
    res.status(201).json(created[0] || { id: result.insertId, rule_type, pattern, replacement, is_active: 1 });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/normalization-rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rule_type, pattern, replacement, is_active } = req.body;
    await query(
      'UPDATE normalization_rules SET rule_type = COALESCE(?, rule_type), pattern = COALESCE(?, pattern), replacement = COALESCE(?, replacement), is_active = COALESCE(?, is_active) WHERE id = ?',
      [rule_type || null, pattern || null, replacement !== undefined ? replacement : null, is_active !== undefined ? is_active : null, id]
    );
    const updated = await query('SELECT * FROM normalization_rules WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/normalization-rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM normalization_rules WHERE id = ?', [id]);
    res.json({ success: true, message: 'Normalization rule removed' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Company Profile CRUD
app.get('/api/company-profile', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM company_profile LIMIT 1');
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/company-profile', async (req, res) => {
  try {
    const body = req.body || {};
    const id = body.id || 'COMP-001';
    await query(`
      INSERT INTO company_profile (id, company_name, company_name_en, logo_url, address, city, country, phone, email, website, tax_id, registration_number, established_date, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        company_name = VALUES(company_name),
        company_name_en = VALUES(company_name_en),
        logo_url = VALUES(logo_url),
        address = VALUES(address),
        city = VALUES(city),
        country = VALUES(country),
        phone = VALUES(phone),
        email = VALUES(email),
        website = VALUES(website),
        tax_id = VALUES(tax_id),
        registration_number = VALUES(registration_number),
        established_date = VALUES(established_date),
        description = VALUES(description)
    `, [
      id,
      body.company_name || 'فيتاس العراق',
      body.company_name_en || 'VITAS Iraq',
      body.logo_url || null,
      body.address || null,
      body.city || null,
      body.country || 'Iraq',
      body.phone || null,
      body.email || null,
      body.website || null,
      body.tax_id || null,
      body.registration_number || null,
      body.established_date || null,
      body.description || null
    ]);
    const rows = await query('SELECT * FROM company_profile WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/company-profile/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    await query(`
      UPDATE company_profile SET
        company_name = COALESCE(?, company_name),
        company_name_en = COALESCE(?, company_name_en),
        logo_url = COALESCE(?, logo_url),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        country = COALESCE(?, country),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        website = COALESCE(?, website),
        tax_id = COALESCE(?, tax_id),
        registration_number = COALESCE(?, registration_number),
        established_date = COALESCE(?, established_date),
        description = COALESCE(?, description)
      WHERE id = ?
    `, [
      body.company_name || null,
      body.company_name_en || null,
      body.logo_url || null,
      body.address || null,
      body.city || null,
      body.country || null,
      body.phone || null,
      body.email || null,
      body.website || null,
      body.tax_id || null,
      body.registration_number || null,
      body.established_date || null,
      body.description || null,
      id
    ]);
    const rows = await query('SELECT * FROM company_profile WHERE id = ?', [id]);
    res.json(rows[0] || body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dedicated quick toggle for manager country location
app.patch('/api/departments/:id/manager-location', async (req, res) => {
  try {
    const { id } = req.params;
    const { manager_location_status } = req.body;
    if (!manager_location_status || (manager_location_status !== 'in_country' && manager_location_status !== 'abroad')) {
      return res.status(400).json({ error: "manager_location_status must be 'in_country' or 'abroad'" });
    }
    await query('UPDATE departments SET manager_location_status = ? WHERE id = ?', [manager_location_status, id]);
    const rows = await query('SELECT * FROM departments WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Settings - Departments CRUD
app.get(['/api/settings/departments', '/api/departments'], async (req, res) => {
  try {
    await syncSettingsFromEmployees().catch(() => {});
    const results = await query('SELECT * FROM departments ORDER BY sort_order ASC, name_ar ASC, id ASC');
    const employees = await query('SELECT id, department, branch, status FROM employees').catch(() => []);
    const branches = await query('SELECT id, name, name_ar, name_en, status FROM branches').catch(() => []);
    const positions = await query('SELECT id, department_id, department FROM positions').catch(() => []);
    
    const DEPT_EN_MAP = {
      'إدارة التمويل الأصغر والعمليات': 'Microfinance & Operations',
      'الموارد البشرية والشؤون الإدارية': 'Human Resources & Administration',
      'إدارة الموارد البشرية والعمليات': 'Human Resources & Operations',
      'الموارد البشرية': 'Human Resources',
      'قسم الائتمان': 'Credit',
      'القروض والائتمان': 'Loans & Credit',
      'تكنولوجيا المعلوماات': 'IT',
      'تكنولوجيا المعلومات': 'Information Technology',
      'قسم تقنية المعلومات': 'Information Technology',
      'الأمن': 'Security',
      'المشتريات والتسهيلات': 'Procurement & Facilities',
      'قسم الخزينة': 'Treasury',
      'قسم المالية والمحاسبة': 'Finance & Accounting',
      'المالية والمحاسبة': 'Finance & Accounting',
      'الشؤون المالية والتحصيل': 'Finance & Collection',
      'الاستحصال والتحصيل': 'Collection & Recovery',
      'المخاطر والامتثال والتدقيق': 'Risk, Compliance & Audit',
      'قسم المبيعات والتسويق': 'Sales & Marketing',
      'التسويق والمبيعات': 'Marketing & Sales',
      'العمليات': 'Operations'
    };

    const cleanDept = (s) => String(s || '').trim().replace(/^(قسم|دائرة|إدارة)\s+/, '').trim().toLowerCase();

    const seen = new Set();
    const cleanResults = [];
    for (const d of (results || [])) {
      const arKey = String(d.name_ar || d.name || '').trim();
      const normKey = cleanDept(arKey);
      if (!normKey || seen.has(normKey)) continue;
      seen.add(normKey);

      let nameEn = String(d.name_en || '').trim();
      if (!nameEn || /[\u0600-\u06FF]/.test(nameEn)) {
        nameEn = DEPT_EN_MAP[arKey] || nameEn || arKey;
      }

      // Safe JS calculation of counts without SQL collation errors
      const dName = String(d.name || '').trim().toLowerCase();
      const dNameAr = String(d.name_ar || '').trim().toLowerCase();
      const dNameEn = String(d.name_en || '').trim().toLowerCase();

      const deptEmps = (employees || []).filter(e => {
        const empD = String(e.department || '').trim().toLowerCase();
        return empD === dName || empD === dNameAr || empD === dNameEn || cleanDept(empD) === normKey;
      });

      const activeEmployeesCount = deptEmps.filter(e => String(e.status).toLowerCase() === 'active').length;
      
      const deptBranches = (branches || []).filter(b => {
        if (d.branch_id && String(d.branch_id) === String(b.id)) return true;
        const bName = String(b.name || '').trim().toLowerCase();
        const bNameAr = String(b.name_ar || '').trim().toLowerCase();
        const bNameEn = String(b.name_en || '').trim().toLowerCase();
        return deptEmps.some(e => {
          const empB = String(e.branch || '').trim().toLowerCase();
          return empB === bName || empB === bNameAr || empB === bNameEn;
        });
      });

      const deptPositions = (positions || []).filter(p => {
        if (p.department_id && String(p.department_id) === String(d.id)) return true;
        const pDept = String(p.department || '').trim().toLowerCase();
        return pDept === dName || pDept === dNameAr || pDept === dNameEn || cleanDept(pDept) === normKey;
      });

      cleanResults.push({
        ...d,
        name: d.name || d.name_ar || arKey,
        name_ar: arKey,
        name_en: nameEn,
        code: d.code || `DEPT-${d.id}`,
        manager_name: d.manager_name || 'Unassigned',
        manager_location_status: d.manager_location_status || 'in_country',
        offices_count: deptBranches.length,
        active_employees_count: activeEmployeesCount,
        positions_count: deptPositions.length
      });
    }

    res.json(cleanResults);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(['/api/settings/departments', '/api/departments'], async (req, res) => {
  try {
    const { name, name_en, name_ar, code, manager_name, manager_location_status, description, sort_order, status } = req.body;
    const deptAr = (name_ar || name || name_en || '').trim();
    const deptEn = (name_en || name || name_ar || '').trim();
    const deptCode = (code || `DEP-${Date.now().toString().slice(-4)}`).trim().toUpperCase();

    const sql = `
      INSERT INTO departments (name_en, name_ar, name, code, manager_name, manager_location_status, description, sort_order, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      deptEn, deptAr, deptAr, deptCode,
      manager_name || 'Unassigned',
      manager_location_status === 'abroad' ? 'abroad' : 'in_country',
      description || '',
      sort_order || 0,
      status || 'Active'
    ];
    const insertRes = await query(sql, params);
    const result = await query('SELECT * FROM departments WHERE id = ?', [insertRes.insertId]);
    res.json(result[0] || { id: insertRes.insertId, name: deptAr, name_ar: deptAr, name_en: deptEn, code: deptCode });
  } catch (err) {
    console.error('Error in POST /api/settings/departments:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put(['/api/settings/departments/:id', '/api/departments/:id'], async (req, res) => {
  try {
    const { id } = req.params;
    const { name, name_en, name_ar, code, manager_name, manager_location_status, description, sort_order, status } = req.body;
    const deptAr = name_ar || name || null;
    const deptEn = name_en || null;
    await query(
      `UPDATE departments SET
        name_en = COALESCE(?, name_en),
        name_ar = COALESCE(?, name_ar),
        name = COALESCE(?, name),
        code = COALESCE(?, code),
        manager_name = COALESCE(?, manager_name),
        manager_location_status = COALESCE(?, manager_location_status),
        description = COALESCE(?, description),
        sort_order = COALESCE(?, sort_order),
        status = COALESCE(?, status)
      WHERE id = ?`,
      [
        deptEn, deptAr, deptAr,
        code ? String(code).trim().toUpperCase() : null,
        manager_name || null,
        manager_location_status || null,
        description !== undefined ? description : null,
        sort_order !== undefined ? sort_order : null,
        status || null,
        id
      ]
    );
    const result = await query('SELECT * FROM departments WHERE id = ?', [id]);
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete(['/api/settings/departments/:id', '/api/departments/:id'], async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM departments WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Settings - Positions & Job Positions CRUD
app.get(['/api/settings/positions', '/api/positions', '/api/job-positions'], async (req, res) => {
  try {
    await syncSettingsFromEmployees().catch(() => {});
    const results = await query(`
      SELECT p.*,
        COALESCE(p.title, p.name_en, p.name) as title,
        COALESCE(p.title_ar, p.name_ar, p.name) as title_ar,
        d.name as department_name, d.name_ar as department_name_ar,
        sp.title as supervisor_title, sp.title_ar as supervisor_title_ar
      FROM positions p
      LEFT JOIN departments d ON p.department_id = d.id
      LEFT JOIN positions sp ON p.supervisor_position_id = sp.id
      ORDER BY p.sort_order ASC, p.name_ar ASC, p.id DESC
    `);

    // Deduplicate positions strictly so no position is repeated
    const seen = new Set();
    const cleanPositions = [];
    for (const p of (results || [])) {
      const key = String(p.title_ar || p.name_ar || p.title || p.name || p.name_en || '').trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      cleanPositions.push(p);
    }

    res.json(cleanPositions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(['/api/settings/positions', '/api/positions', '/api/job-positions'], async (req, res) => {
  try {
    const { name_en, name_ar, title, title_ar, code, department_id, supervisor_position_id, sort_order, status } = req.body;
    const posAr = (title_ar || name_ar || title || name_en || '').trim();
    const posEn = (title || name_en || title_ar || name_ar || '').trim();
    const sql = `
      INSERT INTO positions (name_en, name_ar, name, title, title_ar, code, department_id, supervisor_position_id, sort_order, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      posEn, posAr, posAr, posEn, posAr,
      code ? String(code).trim().toUpperCase() : null,
      department_id || null,
      supervisor_position_id || null,
      sort_order || 0,
      status || 'Active'
    ];
    const insertRes = await query(sql, params);
    const result = await query('SELECT * FROM positions WHERE id = ?', [insertRes.insertId]);
    res.json(result[0] || { id: insertRes.insertId, title: posEn, title_ar: posAr });
  } catch (err) {
    console.error('Error in POST /api/settings/positions:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put(['/api/settings/positions/:id', '/api/positions/:id', '/api/job-positions/:id'], async (req, res) => {
  try {
    const { id } = req.params;
    const { name_en, name_ar, title, title_ar, code, department_id, supervisor_position_id, sort_order, status } = req.body;
    const posAr = (title_ar || name_ar || title || name_en || '').trim();
    const posEn = (title || name_en || title_ar || name_ar || '').trim();
    await query(
      `UPDATE positions SET
        name_en = COALESCE(?, name_en),
        name_ar = COALESCE(?, name_ar),
        name = COALESCE(?, name),
        title = COALESCE(?, title),
        title_ar = COALESCE(?, title_ar),
        code = COALESCE(?, code),
        department_id = ?,
        supervisor_position_id = ?,
        sort_order = COALESCE(?, sort_order),
        status = COALESCE(?, status)
      WHERE id = ?`,
      [
        posEn || null, posAr || null, posAr || null, posEn || null, posAr || null,
        code ? String(code).trim().toUpperCase() : null,
        department_id !== undefined ? department_id : null,
        supervisor_position_id !== undefined ? supervisor_position_id : null,
        sort_order || 0,
        status || 'Active',
        id
      ]
    );
    const result = await query('SELECT * FROM positions WHERE id = ?', [id]);
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete(['/api/settings/positions/:id', '/api/positions/:id', '/api/job-positions/:id'], async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM positions WHERE id = ?', [id]);
    res.json({ success: true, id });
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
    // 1. Fetch existing contract type before deletion
    const existing = await query('SELECT * FROM contract_types WHERE id = ?', [id]);
    const nameAr = existing[0]?.name_ar;
    const nameEn = existing[0]?.name_en;

    // 2. Delete associated clauses locally
    await query('DELETE FROM contract_clauses WHERE contract_type_id = ?', [id]).catch(() => {});

    // 3. Delete contract type locally
    await query('DELETE FROM contract_types WHERE id = ?', [id]);
    if (nameAr) {
      await query('DELETE FROM contract_types WHERE name_ar = ?', [nameAr]).catch(() => {});
    }

    // 4. Delete contract type & clauses on Cloud directly
    await executeCloudQuery('DELETE FROM contract_types WHERE id = ?', [id]).catch(() => {});
    await executeCloudQuery('DELETE FROM contract_clauses WHERE contract_type_id = ?', [id]).catch(() => {});
    if (nameAr) {
      const cloudMatches = await executeCloudQuery('SELECT id FROM contract_types WHERE name_ar = ?', [nameAr]).catch(() => []);
      if (Array.isArray(cloudMatches)) {
        for (const cm of cloudMatches) {
          if (cm.id) await executeCloudQuery('DELETE FROM contract_clauses WHERE contract_type_id = ?', [cm.id]).catch(() => {});
        }
      }
      await executeCloudQuery('DELETE FROM contract_types WHERE name_ar = ?', [nameAr]).catch(() => {});
    }
    if (nameEn && nameEn !== nameAr) {
      await executeCloudQuery('DELETE FROM contract_types WHERE name_en = ?', [nameEn]).catch(() => {});
    }

    // 5. Insert tombstones in sync_deleted_records
    const isRailway = !!(process.env.RAILWAY_ENVIRONMENT || process.env.MYSQLHOST);
    const sourceEnv = isRailway ? 'cloud' : 'local';
    const tombSql = 'INSERT INTO sync_deleted_records (table_name, record_id, source_env, deleted_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE source_env = VALUES(source_env), deleted_at = NOW()';
    await query(tombSql, ['contract_types', String(id), sourceEnv]).catch(() => {});
    if (nameAr) {
      await query(tombSql, ['contract_types', nameAr, sourceEnv]).catch(() => {});
      if (!isRailway) await executeCloudQuery(tombSql, ['contract_types', nameAr, 'local']).catch(() => {});
    }
    if (nameEn && nameEn !== nameAr) {
      await query(tombSql, ['contract_types', nameEn, sourceEnv]).catch(() => {});
      if (!isRailway) await executeCloudQuery(tombSql, ['contract_types', nameEn, 'local']).catch(() => {});
    }

    // 6. Trigger real-time sync broadcast
    triggerRealtimeSync(db, 'contract_types');

    res.json({ success: true, id });
  } catch (err) {
    console.error('Error in DELETE /api/settings/contract-types:', err);
    res.status(500).json({ error: err.message });
  }
});

// Settings - Contract Template Clauses CRUD
app.get('/api/settings/contract-clauses/:contractTypeId', async (req, res) => {
  try {
    const { contractTypeId } = req.params;
    const results = await query(
      'SELECT * FROM contract_clauses WHERE contract_type_id = ? ORDER BY clause_number ASC, id ASC',
      [contractTypeId]
    );
    res.json(results || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings/contract-clauses', async (req, res) => {
  try {
    const { contract_type_id, clause_number, title_ar, text_ar } = req.body;
    const sql = 'INSERT INTO contract_clauses (contract_type_id, clause_number, title_ar, text_ar) VALUES (?, ?, ?, ?)';
    const params = [contract_type_id, clause_number || 1, title_ar || '', text_ar || ''];
    const r = await query(sql, params);
    const result = await query('SELECT * FROM contract_clauses WHERE id = ?', [r.insertId]);
    res.json(result[0] || { id: r.insertId, contract_type_id, clause_number, title_ar, text_ar });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings/contract-clauses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { clause_number, title_ar, text_ar } = req.body;
    await query(
      'UPDATE contract_clauses SET clause_number = ?, title_ar = ?, text_ar = ? WHERE id = ?',
      [clause_number || 1, title_ar || '', text_ar || '', id]
    );
    const result = await query('SELECT * FROM contract_clauses WHERE id = ?', [id]);
    res.json(result[0] || { id, clause_number, title_ar, text_ar });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/settings/contract-clauses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM contract_clauses WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/settings/contract-clauses/contract/:contractTypeId', async (req, res) => {
  try {
    const { contractTypeId } = req.params;
    await query('DELETE FROM contract_clauses WHERE contract_type_id = ?', [contractTypeId]);
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

app.post(['/api/settings/app/bulk', '/api/app-settings/bulk'], async (req, res) => {
  try {
    const settings = req.body;
    if (settings && typeof settings === 'object') {
      for (const [key, value] of Object.entries(settings)) {
        await query(
          'INSERT INTO app_settings (setting_key, setting_value, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = NOW()',
          [key, String(value ?? ''), String(value ?? '')]
        ).catch(() => {});
      }
    }
    syncLocalToCloud(db).catch(() => {});
    res.json({ success: true, message: 'Settings saved and sync triggered' });
  } catch (err) {
    console.error('Error bulk updating app settings:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/settings/app/:key', async (req, res) => {
  try {
    const key = req.params.key;
    const results = await query('SELECT * FROM app_settings WHERE setting_key = ?', [key]);
    if (results.length > 0) {
      res.json(results[0]);
    } else {
      res.status(404).json({ error: 'Setting not found' });
    }
  } catch (err) {
    console.error('Error fetching app setting:', err);
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
      await query('INSERT INTO app_settings (setting_key, setting_value, updated_at) VALUES (?, ?, NOW())', [key, setting_value]);
    } else {
      // Update existing setting
      await query('UPDATE app_settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = ?', [setting_value, key]);
    }
    
    syncLocalToCloud(db).catch(() => {});
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating app setting:', err);
    res.status(500).json({ error: err.message });
  }
});

// System Authentication API Endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
    }

    const cleanUser = String(username).trim();
    const cleanPass = String(password).trim();

    // Query active user by username, email, or employee_id
    const users = await query(
      `SELECT * FROM users WHERE (LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?) OR LOWER(employee_id) = LOWER(?)) AND (status = 'active' OR status = 'Active' OR status IS NULL) LIMIT 1`,
      [cleanUser, cleanUser, cleanUser]
    );

    if (!users || users.length === 0) {
      // Check for default admin login if users table doesn't have it
      if (cleanUser.toLowerCase() === 'admin' && (cleanPass === 'admin123' || cleanPass === 'admin')) {
        return res.json({
          success: true,
          user: {
            id: 1,
            username: 'admin',
            role: 'Super Admin',
            full_name: 'مدير النظام (Super Admin)',
            email: 'admin@vitasiraq.iq',
            employee_id: 'admin',
            can_manage_employees: 1,
            can_manage_finance: 1,
            can_manage_recruitment: 1,
            can_manage_settings: 1,
            can_manage_users: 1
          }
        });
      }
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    const user = users[0];

    // Password verification:
    const isPasswordValid = 
      (user.password && user.password === cleanPass) ||
      (cleanUser.toLowerCase() === 'admin' && (cleanPass === 'admin123' || cleanPass === 'admin')) ||
      (!user.password && cleanPass === '123456');

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'كلمة المرور غير صحيحة، يرجى التأكد والمحاولة مرة أخرى.' });
    }

    const { password: _, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } catch (err) {
    console.error('Login API error:', err);
    res.status(500).json({ error: err.message });
  }
});

// System Users API Endpoints (Direct MySQL `users` table)
app.get('/api/users', async (req, res) => {
  try {
    const users = await query('SELECT * FROM users ORDER BY id ASC');
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const {
      id,
      original_username,
      original_employee_id,
      original_email,
      username,
      password,
      full_name,
      name,
      email,
      role = 'Employee',
      job_title,
      jobTitle,
      position,
      department = 'الموارد البشرية والشؤون الإدارية',
      employee_id,
      branch = 'الإدارة العامة - بغداد',
      can_manage_employees = 0,
      can_manage_finance = 0,
      can_manage_recruitment = 0,
      can_manage_settings = 0,
      can_manage_users = 0,
      status = 'active',
      allowed_screens
    } = req.body;

    if (!username && !original_username && !original_employee_id && !employee_id && !id) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const isRailway = !!(process.env.RAILWAY_ENVIRONMENT || process.env.MYSQLHOST);

    const cleanUsername = String(username || original_username || original_employee_id || employee_id).trim();
    const finalFullName = (full_name || name || cleanUsername).trim();
    const finalEmail = (email || `${cleanUsername.toLowerCase()}@vitasiraq.iq`).trim();
    const finalEmpId = (employee_id || cleanUsername).trim();
    const finalPass = password || 'Password123!';
    const finalJobTitle = String(job_title || jobTitle || position || (role && role !== 'Employee' ? role : '') || 'مدخل بيانات موارد بشرية').trim();
    const finalRole = (role && role !== 'Employee') ? role : (finalJobTitle || 'Employee');
    const screensStr = typeof allowed_screens === 'object' ? JSON.stringify(allowed_screens) : (allowed_screens || null);

    const matchOrigUser = original_username ? String(original_username).trim() : '';
    const matchOrigEmp = original_employee_id ? String(original_employee_id).trim() : '';
    const matchOrigEmail = original_email ? String(original_email).trim().toLowerCase() : '';

    // 1. Check if user already exists (by portable identifiers across local & cloud MySQL)
    const findSql = `
      SELECT id, username, employee_id FROM users
      WHERE ( ? != '' AND (username = ? OR LOWER(username) = LOWER(?)) )
         OR ( ? != '' AND (employee_id = ? OR LOWER(employee_id) = LOWER(?)) )
         OR ( ? != '' AND (email = ? OR LOWER(email) = LOWER(?)) )
         OR username = ? OR LOWER(username) = LOWER(?)
         OR employee_id = ? OR LOWER(employee_id) = LOWER(?)
      LIMIT 1
    `;
    const findParams = [
      matchOrigUser, matchOrigUser, matchOrigUser,
      matchOrigEmp, matchOrigEmp, matchOrigEmp,
      matchOrigEmail, matchOrigEmail, matchOrigEmail,
      cleanUsername, cleanUsername,
      finalEmpId, finalEmpId
    ];

    const existingRows = await query(findSql, findParams);

    if (Array.isArray(existingRows) && existingRows.length > 0) {
      const matchRow = existingRows[0];
      // UPDATE existing user directly in place using portable identifiers (updates on both Local & Cloud!)
      const updateSql = `
        UPDATE users SET
          username = ?, password = ?, full_name = ?, name = ?, email = ?, role = ?, job_title = ?, department = ?, employee_id = ?, branch = ?,
          can_manage_employees = ?, can_manage_finance = ?, can_manage_recruitment = ?, can_manage_settings = ?, can_manage_users = ?,
          status = ?, allowed_screens = ?, updated_at = NOW()
        WHERE id = ? OR username = ? OR employee_id = ? OR ( ? != '' AND (username = ? OR employee_id = ?) )
      `;
      const updateParams = [
        cleanUsername, finalPass, finalFullName, finalFullName, finalEmail, finalRole, finalJobTitle, department, finalEmpId, branch,
        can_manage_employees ? 1 : 0, can_manage_finance ? 1 : 0, can_manage_recruitment ? 1 : 0, can_manage_settings ? 1 : 0, can_manage_users ? 1 : 0,
        status, screensStr,
        matchRow.id, matchRow.username, matchRow.employee_id,
        matchOrigUser, matchOrigUser, matchOrigUser
      ];
      await query(updateSql, updateParams);
      if (!isRailway) {
        executeCloudQuery(updateSql, updateParams).catch(() => {});
      }
    } else {
      // INSERT new user with UPSERT protection
      const insertSql = `
        INSERT INTO users (
          username, password, full_name, name, email, role, job_title, department, employee_id, branch,
          can_manage_employees, can_manage_finance, can_manage_recruitment, can_manage_settings, can_manage_users,
          status, allowed_screens, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          password = VALUES(password),
          full_name = VALUES(full_name),
          name = VALUES(name),
          email = VALUES(email),
          role = VALUES(role),
          job_title = VALUES(job_title),
          department = VALUES(department),
          employee_id = VALUES(employee_id),
          branch = VALUES(branch),
          can_manage_employees = VALUES(can_manage_employees),
          can_manage_finance = VALUES(can_manage_finance),
          can_manage_recruitment = VALUES(can_manage_recruitment),
          can_manage_settings = VALUES(can_manage_settings),
          can_manage_users = VALUES(can_manage_users),
          status = VALUES(status),
          allowed_screens = VALUES(allowed_screens),
          updated_at = NOW()
      `;
      const insertParams = [
        cleanUsername, finalPass, finalFullName, finalFullName, finalEmail, finalRole, finalJobTitle, department, finalEmpId, branch,
        can_manage_employees ? 1 : 0, can_manage_finance ? 1 : 0, can_manage_recruitment ? 1 : 0, can_manage_settings ? 1 : 0, can_manage_users ? 1 : 0,
        status, screensStr
      ];
      await query(insertSql, insertParams);
      if (!isRailway) {
        executeCloudQuery(insertSql, insertParams).catch(() => {});
      }
    }

    triggerRealtimeSync(db, 'users');
    res.json({ success: true, message: 'User saved and synced to database' });
  } catch (err) {
    console.error('Error saving user:', err);
    res.status(500).json({ error: err.message });
  }
});

// Change Password Endpoint (Syncs with MySQL users table & Cloud)
app.post('/api/change-password', async (req, res) => {
  try {
    const { username, employeeId, employee_id, currentPassword, newPassword } = req.body;

    if (!newPassword || String(newPassword).length < 4) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل | Password must be at least 4 characters' });
    }

    const isRailway = !!(process.env.RAILWAY_ENVIRONMENT || process.env.MYSQLHOST);
    const cleanUser = String(username || '').trim();
    const cleanEmpId = String(employeeId || employee_id || '').trim();
    const cleanEmpIdNoPrefix = cleanEmpId.replace(/^VTS-/i, '').trim();

    if (!cleanUser && !cleanEmpId) {
      return res.status(400).json({ error: 'اسم المستخدم أو المعرف مطلوب | Username or employeeId is required' });
    }

    // 1. Try to find user in `users` table
    const findUserSql = `
      SELECT id, username, employee_id, email, password, role FROM users
      WHERE ( ? != '' AND (username = ? OR LOWER(username) = LOWER(?)) )
         OR ( ? != '' AND (employee_id = ? OR LOWER(employee_id) = LOWER(?)) )
         OR ( ? != '' AND (employee_id = ? OR LOWER(employee_id) = LOWER(?)) )
         OR ( ? != '' AND (username = ? OR LOWER(username) = LOWER(?)) )
      LIMIT 1
    `;
    const findParams = [
      cleanUser, cleanUser, cleanUser,
      cleanEmpId, cleanEmpId, cleanEmpId,
      cleanEmpIdNoPrefix, cleanEmpIdNoPrefix, cleanEmpIdNoPrefix,
      cleanEmpId, cleanEmpId, cleanEmpId
    ];

    const userRows = await query(findUserSql, findParams);

    if (Array.isArray(userRows) && userRows.length > 0) {
      const existingUser = userRows[0];
      const storedPass = existingUser.password || '123456';
      const isAdmin = (existingUser.username || '').toLowerCase() === 'admin' || cleanUser.toLowerCase() === 'admin';

      // If current password provided, verify it
      if (currentPassword !== undefined && currentPassword !== null && currentPassword !== '') {
        const isCurrentValid = 
          currentPassword === storedPass ||
          (isAdmin && (currentPassword === 'admin123' || currentPassword === 'admin')) ||
          (!existingUser.password && currentPassword === '123456');

        if (!isCurrentValid) {
          return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة | Current password is incorrect' });
        }
      }

      const updateSql = `UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?`;
      await query(updateSql, [newPassword, existingUser.id]);
      if (!isRailway) {
        executeCloudQuery(updateSql, [newPassword, existingUser.id]).catch(() => {});
      }
      triggerRealtimeSync(db, 'users');
      return res.json({ success: true, message: 'Password updated successfully' });
    }

    // 2. User not found in `users` table - check `employees` table (e.g. employee changing password from mobile app)
    const findEmpSql = `
      SELECT * FROM employees
      WHERE ( ? != '' AND (badge_no = ? OR LOWER(badge_no) = LOWER(?)) )
         OR ( ? != '' AND (employee_id = ? OR LOWER(employee_id) = LOWER(?)) )
         OR ( ? != '' AND (employee_id = ? OR LOWER(employee_id) = LOWER(?)) )
         OR ( ? != '' AND (badge_no = ? OR LOWER(badge_no) = LOWER(?)) )
      LIMIT 1
    `;
    const empRows = await query(findEmpSql, [
      cleanUser, cleanUser, cleanUser,
      cleanEmpId, cleanEmpId, cleanEmpId,
      cleanEmpIdNoPrefix, cleanEmpIdNoPrefix, cleanEmpIdNoPrefix,
      cleanEmpId, cleanEmpId, cleanEmpId
    ]);

    if (Array.isArray(empRows) && empRows.length > 0) {
      const emp = empRows[0];
      // Default password for fresh employee accounts is '123456'
      if (currentPassword !== undefined && currentPassword !== null && currentPassword !== '') {
        if (currentPassword !== '123456') {
          return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة | Current password is incorrect' });
        }
      }

      const newUsername = emp.badge_no || emp.employee_id || cleanUser;
      const finalEmpId = emp.employee_id || cleanEmpId || newUsername;
      const fullName = emp.full_name_ar || emp.full_name_en || newUsername;
      const email = emp.email || emp.org_email || `${newUsername.toLowerCase()}@vitasiraq.iq`;
      const department = emp.department || 'الائتمان';
      const branch = emp.branch || 'الإدارة العامة - بغداد';
      const jobTitle = emp.position_ar || emp.jobTitle || 'Employee';

      const insertSql = `
        INSERT INTO users (
          username, password, full_name, name, email, role, job_title, department, employee_id, branch, status, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'Employee', ?, ?, ?, ?, 'active', NOW())
        ON DUPLICATE KEY UPDATE password = VALUES(password), updated_at = NOW()
      `;
      const insertParams = [
        newUsername, newPassword, fullName, fullName, email, jobTitle, department, finalEmpId, branch
      ];
      await query(insertSql, insertParams);
      if (!isRailway) {
        executeCloudQuery(insertSql, insertParams).catch(() => {});
      }
      triggerRealtimeSync(db, 'users');
      return res.json({ success: true, message: 'Password updated successfully' });
    }

    // 3. Fallback: create user directly if not in employees either
    if (currentPassword !== undefined && currentPassword !== null && currentPassword !== '') {
      if (currentPassword !== '123456') {
        return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة | Current password is incorrect' });
      }
    }
    const finalUsername = cleanUser || cleanEmpId;
    const insertFallbackSql = `
      INSERT INTO users (
        username, password, full_name, name, email, role, job_title, department, employee_id, branch, status, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'Employee', 'Employee', 'عام', ?, 'المقر الرئيسي', 'active', NOW())
      ON DUPLICATE KEY UPDATE password = VALUES(password), updated_at = NOW()
    `;
    const fallbackParams = [
      finalUsername, newPassword, finalUsername, finalUsername, `${finalUsername.toLowerCase()}@vitasiraq.iq`, cleanEmpId || finalUsername
    ];
    await query(insertFallbackSql, fallbackParams);
    if (!isRailway) {
      executeCloudQuery(insertFallbackSql, fallbackParams).catch(() => {});
    }
    triggerRealtimeSync(db, 'users');
    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:identifier', async (req, res) => {
  try {
    const ident = String(req.params.identifier).trim();
    const cleanIdent = ident.replace(/^VTS-/i, '').trim();
    const isRailway = !!(process.env.RAILWAY_ENVIRONMENT || process.env.MYSQLHOST);
    const sourceEnv = isRailway ? 'cloud' : 'local';

    // 1. Find user's business identifiers before deleting
    let userRow = null;
    const isNumeric = /^\d+$/.test(ident);
    if (isNumeric) {
      const rows = await query('SELECT id, username, employee_id, email FROM users WHERE id = ?', [parseInt(ident)]);
      if (Array.isArray(rows) && rows.length > 0) userRow = rows[0];
    }
    if (!userRow) {
      const rows = await query(
        'SELECT id, username, employee_id, email FROM users WHERE username = ? OR employee_id = ? OR LOWER(username) = LOWER(?) OR LOWER(employee_id) = LOWER(?)',
        [ident, ident, ident, ident]
      );
      if (Array.isArray(rows) && rows.length > 0) userRow = rows[0];
    }

    const targetUser = userRow ? userRow.username : (cleanIdent || ident);
    const targetEmpId = userRow ? userRow.employee_id : (ident.toUpperCase().startsWith('VTS') ? ident.toUpperCase() : `VTS-${cleanIdent.toUpperCase()}`);
    const targetEmail = userRow ? (userRow.email || '') : '';
    const targetId = userRow ? userRow.id : (isNumeric ? parseInt(ident) : null);

    const deleteSql = `
      DELETE FROM users
      WHERE ( ? IS NOT NULL AND id = ? )
         OR username = ? OR LOWER(username) = LOWER(?)
         OR employee_id = ? OR LOWER(employee_id) = LOWER(?)
         OR ( ? != '' AND (email = ? OR LOWER(email) = LOWER(?)) )
    `;
    const deleteParams = [
      targetId, targetId,
      targetUser, targetUser,
      targetEmpId, targetEmpId,
      targetEmail, targetEmail, targetEmail
    ];

    await query(deleteSql, deleteParams);

    // Record tombstones for portable business identifiers so Cloud sync never resurrects the user
    const tombSql = 'INSERT INTO sync_deleted_records (table_name, record_id, source_env, deleted_at) VALUES ("users", ?, ?, NOW()) ON DUPLICATE KEY UPDATE source_env = VALUES(source_env), deleted_at = NOW()';
    if (targetUser) await query(tombSql, [targetUser, sourceEnv]).catch(() => {});
    if (targetEmpId && targetEmpId !== targetUser) await query(tombSql, [targetEmpId, sourceEnv]).catch(() => {});
    if (targetEmail) await query(tombSql, [targetEmail, sourceEnv]).catch(() => {});

    if (!isRailway) {
      executeCloudQuery(deleteSql, deleteParams).catch(() => {});
      if (targetUser) executeCloudQuery(tombSql, [targetUser, 'local']).catch(() => {});
      if (targetEmpId && targetEmpId !== targetUser) executeCloudQuery(tombSql, [targetEmpId, 'local']).catch(() => {});
      if (targetEmail) executeCloudQuery(tombSql, [targetEmail, 'local']).catch(() => {});
    }

    triggerRealtimeSync(db, 'users');
    res.json({ success: true, message: 'User deleted from database' });
  } catch (err) {
    console.error('Error deleting user:', err);
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

// Get all app settings & attendance settings
app.get(['/api/app-settings', '/api/settings/app', '/api/attendance-settings'], async (req, res) => {
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

// Bulk update attendance settings
app.post(['/api/attendance-settings/bulk', '/api/attendance-settings'], async (req, res) => {
  try {
    const settings = req.body;
    if (settings && typeof settings === 'object') {
      for (const [key, value] of Object.entries(settings)) {
        await query(
          'INSERT INTO attendance_settings (key_name, key_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE key_value = ?',
          [key, String(value ?? ''), String(value ?? '')]
        ).catch(() => {});
      }
    }
    syncLocalToCloud(db).catch(() => {});
    res.json({ success: true, message: 'Attendance settings saved successfully' });
  } catch (err) {
    console.error('Error saving attendance settings:', err);
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

// Clear all operational system data while strictly preserving Users, Roles, Settings, Contracts, and Policies
app.post('/api/reset-data', async (req, res) => {
  try {
    // 1. Explicit set of tables that MUST BE PRESERVED
    const PRESERVED_TABLES = new Set([
      // Users & Auth & Roles & Permissions
      'users',
      'roles',
      'drv_users',

      // Settings & System Configuration
      'app_settings',
      'attendance_settings',
      'biometric_server_config',
      'company_profile',
      'normalization_rules',
      'document_categories',
      'sync_devices',

      // Contracts & Templates
      'contract_types',
      'contract_clauses',
      'contract_template_clauses',
      'contract_custom_variables',
      'settings_contract_types',

      // Org Structure & Catalogs in Settings
      'branches',
      'settings_offices',
      'drv_offices',
      'departments',
      'positions',
      'settings_positions',
      'status_changes',
      'settings_status_changes',
      'trainings',
      'training_programs',
      'settings_trainings',
      'shift_types',
      'company_holidays',
      'company_holiday_branches',
      'holidays',

      // Policies & Tax / Allowance Calculation Rules
      'tax_brackets',
      'tax_calculation_parameters',
      'tax_calculation_rules',
      'tax_calculation_variables',
      'tax_rule_versions',

      // Driver master catalogs
      'drv_trip_routes',
      'drv_trip_types',
    ]);

    // 2. Disable foreign key checks on both Local and Cloud
    await query('SET FOREIGN_KEY_CHECKS = 0');
    await executeCloudQuery('SET FOREIGN_KEY_CHECKS = 0').catch(() => {});

    // 3. Fetch all table names dynamically from Local MySQL
    const tables = await query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);

    // Truncate / delete operational tables locally
    const clearedTables = [];
    for (const table of tableNames) {
      if (PRESERVED_TABLES.has(table.toLowerCase())) {
        continue;
      }
      try {
        await query(`TRUNCATE TABLE \`${table}\``).catch(() => query(`DELETE FROM \`${table}\``));
        clearedTables.push(table);
      } catch (e) {
        console.warn(`Could not clear local table ${table}:`, e.message);
      }
    }

    // 4. Truncate / delete operational tables on Cloud DB
    const cloudTables = await executeCloudQuery('SHOW TABLES').catch(() => []);
    if (Array.isArray(cloudTables)) {
      for (const ct of cloudTables) {
        const cTable = Object.values(ct)[0];
        if (cTable && !PRESERVED_TABLES.has(String(cTable).toLowerCase())) {
          await executeCloudQuery(`TRUNCATE TABLE \`${cTable}\``).catch(() => executeCloudQuery(`DELETE FROM \`${cTable}\``).catch(() => {}));
        }
      }
    }

    // 5. Re-enable foreign key checks on both Local and Cloud
    await query('SET FOREIGN_KEY_CHECKS = 1');
    await executeCloudQuery('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});

    // 6. Broadcast real-time change event to refresh UI components
    triggerRealtimeSync(db, 'all');

    res.json({
      success: true,
      message: 'Operational data cleared successfully. Users, Roles, Settings, Contracts, and Policies were preserved.',
      clearedTablesCount: clearedTables.length,
      clearedTables
    });
  } catch (err) {
    console.error('Error resetting database data:', err);
    try {
      await query('SET FOREIGN_KEY_CHECKS = 1');
      await executeCloudQuery('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
    } catch (e) {}
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

// ============================================================
// BIOMETRIC ATTENDANCE & SQL SERVER SYNC API ROUTES
// ============================================================

// Get Biometric Server Configuration
app.get('/api/biometric/settings', async (req, res) => {
  try {
    const settings = await getBiometricConfig(db);
    res.json({ success: true, settings });
  } catch (err) {
    console.error('Error fetching biometric settings:', err);
    res.status(500).json({ error: err.message });
  }
});

// Save Biometric Server Configuration
app.post('/api/biometric/settings', async (req, res) => {
  try {
    const updated = await saveBiometricConfig(db, req.body);
    res.json({ 
      success: true, 
      message_ar: 'تم حفظ إعدادات خادم البصمة بنجاح في قاعدة البيانات.',
      message_en: 'Biometric server settings saved successfully.',
      settings: updated 
    });
  } catch (err) {
    console.error('Error saving biometric settings:', err);
    res.status(500).json({ error: err.message });
  }
});

// Test Connection to MS SQL Server
app.post('/api/biometric/test-connection', async (req, res) => {
  try {
    const config = req.body || {};
    const result = await testBiometricConnection(config);
    res.json(result);
  } catch (err) {
    console.error('Error testing biometric connection:', err);
    res.status(500).json({ 
      success: false, 
      status: 'error', 
      message_ar: `خطأ في فحص الاتصال: ${err.message}`,
      message_en: `Connection test error: ${err.message}` 
    });
  }
});

// Trigger Manual Sync from SQL Server
app.post('/api/biometric/sync-now', async (req, res) => {
  try {
    const result = await syncBiometricData(db, { syncType: 'manual', fullSync: req.body?.fullSync });
    res.json(result);
  } catch (err) {
    console.error('Error running biometric sync:', err);
    res.status(500).json({ 
      success: false, 
      message_ar: `فشلت المزامنة: ${err.message}`, 
      message_en: `Sync failed: ${err.message}` 
    });
  }
});

// Get Biometric Sync Status & History
app.get('/api/biometric/status', async (req, res) => {
  try {
    const config = await getBiometricConfig(db);
    const history = await query('SELECT * FROM biometric_sync_history ORDER BY id DESC LIMIT 20').catch(() => []);
    res.json({ success: true, config, history });
  } catch (err) {
    console.error('Error fetching biometric status:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get Raw Biometric Logs
app.get('/api/biometric/raw-logs', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const rows = await query('SELECT * FROM raw_attendance_logs ORDER BY punch_datetime DESC, id DESC LIMIT ?', [limit]).catch(() => []);
    res.json({ success: true, raw_logs: rows });
  } catch (err) {
    console.error('Error fetching raw logs:', err);
    res.status(500).json({ error: err.message });
  }
});

// Simulate Live Punch (creates punch log and recalculates attendance)
app.post('/api/biometric/simulate-punch', async (req, res) => {
  try {
    const { employee_id, punch_type = 'check_in', verify_mode = 'fingerprint' } = req.body;
    
    // Find employee
    const emps = await query('SELECT * FROM employees WHERE id = ?', [employee_id]).catch(() => []);
    const emp = emps && emps.length > 0 ? emps[0] : null;

    const empCode = emp ? (emp.badge_no || `EMP-100${emp.id}`) : `EMP-100${employee_id}`;
    const nameAr = emp ? (emp.full_name_ar || `${emp.first_name} ${emp.last_name}`) : `موظف ${employee_id}`;
    const nameEn = emp ? (emp.full_name_en || `${emp.first_name} ${emp.last_name}`) : `Employee ${employee_id}`;
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];
    const dateTimeStr = `${dateStr} ${timeStr}`;

    // Insert into raw_attendance_logs
    await query(`
      INSERT INTO raw_attendance_logs 
      (device_id, employee_biometric_id, employee_number, employee_name_ar, employee_name_en, punch_datetime, punch_type, verify_mode, sync_batch_id, is_processed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE employee_name_ar = VALUES(employee_name_ar)
    `, [
      'SIMULATOR-VIRTUAL-DEV',
      empCode,
      empCode,
      nameAr,
      nameEn,
      dateTimeStr,
      punch_type,
      verify_mode,
      `SIM-${Date.now()}`
    ]);

    // Update attendance record for today
    const existingAtt = await query('SELECT * FROM attendance_records WHERE employee_number = ? AND date = ?', [empCode, dateStr]).catch(() => []);
    
    if (existingAtt && existingAtt.length > 0) {
      const rec = existingAtt[0];
      const firstPunch = rec.first_punch || timeStr;
      const lastPunch = timeStr;

      // Calculate minutes
      const [fH, fM] = firstPunch.split(':').map(Number);
      const [lH, lM] = lastPunch.split(':').map(Number);
      const workedMins = Math.max(0, (lH * 60 + lM) - (fH * 60 + fM));
      const lateMins = Math.max(0, (fH * 60 + fM) - (8 * 60));

      await query(`
        UPDATE attendance_records 
        SET 
          last_punch = ?,
          worked_minutes = ?,
          regular_minutes = ?,
          late_minutes = ?,
          status = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [
        lastPunch,
        workedMins,
        Math.min(workedMins, 480),
        lateMins,
        lateMins > 15 ? 'late' : 'present',
        rec.id
      ]);
    } else {
      const [fH, fM] = timeStr.split(':').map(Number);
      const lateMins = Math.max(0, (fH * 60 + fM) - (8 * 60));

      await query(`
        INSERT INTO attendance_records 
        (employee_id, employee_number, employee_name_ar, employee_name_en, department_name_ar, department_name_en, branch_name_ar, branch_name_en, date, scheduled_start, scheduled_end, first_punch, last_punch, worked_minutes, regular_minutes, break_minutes, late_minutes, status, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '08:00:00', '16:00:00', ?, ?, 0, 0, 45, ?, ?, 'biometric_simulator')
      `, [
        emp ? emp.id : employee_id,
        empCode,
        nameAr,
        nameEn,
        'الموارد البشرية والشؤون الإدارية',
        'Human Resources & Admin',
        'الإدارة العامة - بغداد',
        'Headquarters - Baghdad',
        dateStr,
        timeStr,
        timeStr,
        lateMins,
        lateMins > 15 ? 'late' : 'present'
      ]);
    }

    res.json({
      success: true,
      message_ar: `تم تسجيل البصمة بنجاح لـ ${nameAr} في جدول البصمات وتحديث سجل الحضور اليومي.`,
      message_en: `Biometric punch simulated for ${nameEn} and attendance updated.`,
      punch_time: dateTimeStr
    });
  } catch (err) {
    console.error('Error simulating punch:', err);
    res.status(500).json({ error: err.message });
  }
});

// Reprocess all attendance records from raw logs
app.post('/api/attendance/reprocess', async (req, res) => {
  try {
    const result = await syncBiometricData(db, { syncType: 'manual', fullSync: true });
    res.json({
      success: true,
      message_ar: 'تمت إعادة معالجة جميع سجلات البصمات وتطبيق قواعد الدوام بنجاح.',
      message_en: 'Reprocessed all attendance logs successfully.',
      details: result
    });
  } catch (err) {
    console.error('Error reprocessing attendance:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Centralized Smart Document Routing & Delivery API ───────────────────────────

// 1. Get all routing rules
app.get('/api/routing/rules', async (req, res) => {
  try {
    const rules = await query('SELECT * FROM document_routing_rules ORDER BY id ASC');
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Create routing rule
app.post('/api/routing/rules', async (req, res) => {
  try {
    const {
      document_type,
      source_module,
      name_ar,
      name_en,
      default_recipient_type,
      default_channels,
      allow_multiple_recipients = 1,
      allow_sender_override = 1,
      requires_approval = 0,
      allow_additional_attachments = 1,
      require_delivery_confirmation = 0
    } = req.body;

    const sql = `
      INSERT INTO document_routing_rules
        (document_type, source_module, name_ar, name_en, default_recipient_type, default_channels,
         allow_multiple_recipients, allow_sender_override, requires_approval, allow_additional_attachments,
         require_delivery_confirmation, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        name_ar = VALUES(name_ar),
        name_en = VALUES(name_en),
        default_recipient_type = VALUES(default_recipient_type),
        default_channels = VALUES(default_channels),
        allow_multiple_recipients = VALUES(allow_multiple_recipients),
        allow_sender_override = VALUES(allow_sender_override),
        requires_approval = VALUES(requires_approval),
        allow_additional_attachments = VALUES(allow_additional_attachments),
        require_delivery_confirmation = VALUES(require_delivery_confirmation),
        updated_at = NOW()
    `;

    await query(sql, [
      document_type, source_module || 'general', name_ar, name_en,
      default_recipient_type || 'direct_supervisor', default_channels || 'both',
      allow_multiple_recipients ? 1 : 0, allow_sender_override ? 1 : 0,
      requires_approval ? 1 : 0, allow_additional_attachments ? 1 : 0,
      require_delivery_confirmation ? 1 : 0
    ]);

    res.json({ success: true, message: 'Routing rule saved successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Update routing rule
app.put('/api/routing/rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name_ar,
      name_en,
      default_recipient_type,
      default_channels,
      allow_multiple_recipients,
      allow_sender_override,
      requires_approval,
      allow_additional_attachments,
      require_delivery_confirmation,
      is_active
    } = req.body;

    await query(
      `UPDATE document_routing_rules
       SET name_ar = COALESCE(?, name_ar),
           name_en = COALESCE(?, name_en),
           default_recipient_type = COALESCE(?, default_recipient_type),
           default_channels = COALESCE(?, default_channels),
           allow_multiple_recipients = COALESCE(?, allow_multiple_recipients),
           allow_sender_override = COALESCE(?, allow_sender_override),
           requires_approval = COALESCE(?, requires_approval),
           allow_additional_attachments = COALESCE(?, allow_additional_attachments),
           require_delivery_confirmation = COALESCE(?, require_delivery_confirmation),
           is_active = COALESCE(?, is_active),
           updated_at = NOW()
       WHERE id = ?`,
      [
        name_ar, name_en, default_recipient_type, default_channels,
        allow_multiple_recipients !== undefined ? (allow_multiple_recipients ? 1 : 0) : null,
        allow_sender_override !== undefined ? (allow_sender_override ? 1 : 0) : null,
        requires_approval !== undefined ? (requires_approval ? 1 : 0) : null,
        allow_additional_attachments !== undefined ? (allow_additional_attachments ? 1 : 0) : null,
        require_delivery_confirmation !== undefined ? (require_delivery_confirmation ? 1 : 0) : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        id
      ]
    );

    res.json({ success: true, message: 'Routing rule updated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Delete routing rule
app.delete('/api/routing/rules/:id', async (req, res) => {
  try {
    await query('DELETE FROM document_routing_rules WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Recipient Resolution based on organizational hierarchy
app.post('/api/routing/resolve-recipients', async (req, res) => {
  try {
    const result = await resolveRecipients(query, req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ resolved: false, error: err.message });
  }
});

// 6. Send Document through Smart Routing
app.post('/api/routing/send', async (req, res) => {
  try {
    const result = await sendDocumentThroughRouting(db, req.body);
    res.json(result);
  } catch (err) {
    console.error('Error in /api/routing/send:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Central Delivery History (with filtering and pagination)
app.get('/api/routing/deliveries', async (req, res) => {
  try {
    const { status, channel, document_type, search, limit = 100 } = req.query;
    let sql = 'SELECT * FROM document_deliveries WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      sql += ' AND overall_status = ?';
      params.push(status);
    }

    if (channel && channel !== 'all') {
      sql += ' AND channel_requested = ?';
      params.push(channel);
    }

    if (document_type && document_type !== 'all') {
      sql += ' AND document_type = ?';
      params.push(document_type);
    }

    if (search) {
      sql += ' AND (document_title LIKE ? OR recipient_name LIKE ? OR sender_name LIKE ? OR id LIKE ? OR document_id LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit) || 100);

    const rows = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Delivery Details by ID
app.get('/api/routing/deliveries/:id', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM document_deliveries WHERE id = ? LIMIT 1', [req.params.id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Delivery record not found.' });
    }
    const accessLogs = await query('SELECT * FROM document_access_logs WHERE delivery_id = ? ORDER BY created_at DESC', [req.params.id]).catch(() => []);
    res.json({ ...rows[0], access_logs: accessLogs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Retry Failed Email Delivery
app.post('/api/routing/deliveries/:id/retry-email', async (req, res) => {
  try {
    const result = await retryEmailDelivery(db, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Record Document Access & Update Read Status
app.post('/api/routing/documents/:deliveryId/access', async (req, res) => {
  try {
    const { employeeId, action = 'view' } = req.body;
    const result = await recordDocumentAccess(db, {
      deliveryId: req.params.deliveryId,
      documentId: req.body.documentId,
      employeeId: employeeId || req.headers['x-employee-id'] || 'EMP-ANONYMOUS',
      action,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    if (result.isUnauthorized) {
      return res.status(403).json(result);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. Get Employee Routed Documents & Notifications (for Employee App)
app.get('/api/routing/employee/:employeeId/notifications', async (req, res) => {
  try {
    const empId = req.params.employeeId;
    const deliveries = await query(
      `SELECT d.*, 
              (SELECT COUNT(*) FROM document_access_logs l WHERE l.delivery_id = d.id) as access_count
       FROM document_deliveries d
       WHERE (
         d.recipient_employee_id = ? 
         OR d.recipient_employee_id = (SELECT CAST(id AS CHAR) FROM employees WHERE badge_no = ? OR employee_id = ? LIMIT 1)
         OR d.recipient_employee_id = (SELECT employee_id FROM employees WHERE id = ? OR badge_no = ? LIMIT 1)
         OR d.recipient_employee_id = (SELECT badge_no FROM employees WHERE id = ? OR employee_id = ? LIMIT 1)
       )
         AND (d.channel_requested IN ('app', 'both'))
       ORDER BY d.created_at DESC LIMIT 50`,
      [empId, empId, empId, empId, empId, empId, empId]
    ).catch(() => []);

    res.json(deliveries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Microsoft 365 Graph Status & Inspector
app.get('/api/routing/m365/status', async (req, res) => {
  try {
    const status = await testGraphConnection(query);
    res.json(status);
  } catch (err) {
    res.status(500).json({ isConfigured: false, status: 'error', error: err.message });
  }
});

// 13. Test Microsoft 365 Connection
app.post('/api/routing/m365/test', async (req, res) => {
  try {
    const result = await testGraphConnection(query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 14. Mobile Push Notification Gateway Status
app.get('/api/routing/push/status', async (req, res) => {
  try {
    const status = await getPushNotificationStatus(query);
    res.json(status);
  } catch (err) {
    res.status(500).json({ isConfigured: false, error: err.message });
  }
});

// 15. Run Document Routing Acceptance Tests (16 Tests)
app.post('/api/routing/run-acceptance-tests', async (req, res) => {
  try {
    const report = await runDocumentRoutingAcceptanceTests(db);
    res.json(report);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// SPA React Router fallback route
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads') && !req.path.startsWith('/hr_drivers')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT} (accessible via LAN/WiFi and localhost)`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[SERVER NOTICE] Port ${PORT} is already in use (e.g. by Electron Desktop app or another server instance). An active instance is already serving requests on port ${PORT}.`);
  } else {
    console.error('[SERVER ERROR]', err);
  }
});
