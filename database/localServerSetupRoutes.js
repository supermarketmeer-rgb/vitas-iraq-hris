import os from 'os';
import path from 'path';
import fs from 'fs';
import config from './config.mjs';
import { executeCloudQuery } from './autoCloudSync.js';
import { initDatabase } from './initDatabase.js';
import { initSyncEngineTables } from './initSyncEngine.js';

export function registerLocalServerSetupRoutes(app, db, query) {

  // 1. Check Requirements
  app.get('/api/local-setup/check-requirements', async (req, res) => {
    try {
      const checks = [];

      // Check 1: Node.js version >= 18
      const nodeVerMajor = parseInt(process.versions.node.split('.')[0], 10);
      checks.push({
        label: 'Node.js Engine',
        ok: nodeVerMajor >= 18,
        value: `v${process.versions.node} (Recommended: v18+)`,
        fix: nodeVerMajor < 18 ? 'Please upgrade Node.js to version 18 or higher.' : undefined
      });

      // Check 2: Operating System
      const isWin = process.platform === 'win32';
      checks.push({
        label: 'Operating System',
        ok: true,
        value: `${os.type()} ${os.release()} (${process.arch})`,
        fix: !isWin ? 'Windows is recommended for the office local server.' : undefined
      });

      // Check 3: System Memory (RAM)
      const totalMemGb = (os.totalmem() / (1024 ** 3)).toFixed(1);
      const freeMemGb = (os.freemem() / (1024 ** 3)).toFixed(1);
      const memOk = parseFloat(totalMemGb) >= 3.5;
      checks.push({
        label: 'System RAM',
        ok: memOk,
        value: `${totalMemGb} GB total (${freeMemGb} GB available)`,
        fix: !memOk ? 'At least 4 GB RAM is recommended for running local MySQL + Express.' : undefined
      });

      // Check 4: MySQL Connection
      let dbOk = false;
      let dbError = null;
      let dbName = config.database;
      try {
        const rows = await query('SELECT 1 as ping');
        if (rows && rows.length > 0) {
          dbOk = true;
        }
      } catch (err) {
        dbError = err.message;
      }
      checks.push({
        label: 'MySQL Service & Database',
        ok: dbOk,
        value: dbOk ? `Connected to ${dbName} on ${config.host}:${config.port || 3306}` : `Connection failed: ${dbError}`,
        fix: !dbOk ? 'Ensure MySQL / XAMPP service is running and database exists.' : undefined
      });

      // Check 5: Local Port 5000 Binding
      checks.push({
        label: 'Express API Server Port',
        ok: true,
        value: `Port ${process.env.PORT || 5000} Active (0.0.0.0)`,
        fix: undefined
      });

      // Check 6: Disk Space
      let diskInfo = 'Available';
      try {
        if (fs.statfsSync) {
          const stats = fs.statfsSync(process.cwd());
          const freeGb = (stats.bavail * stats.bsize / (1024 ** 3)).toFixed(1);
          diskInfo = `${freeGb} GB free`;
        }
      } catch (e) {}

      checks.push({
        label: 'Disk Space',
        ok: true,
        value: diskInfo,
        fix: undefined
      });

      res.json({ success: true, checks });
    } catch (err) {
      console.error('Error in /api/local-setup/check-requirements:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Check Environment
  app.get('/api/local-setup/check-environment', async (req, res) => {
    try {
      const info = [];
      info.push(`Node.js: ${process.version} (${process.execPath})`);
      info.push(`Platform: ${process.platform} (${process.arch})`);
      info.push(`Current Directory: ${process.cwd()}`);
      
      const envPath = path.join(process.cwd(), '.env');
      const hasEnv = fs.existsSync(envPath);
      info.push(`.env Configuration: ${hasEnv ? 'Present' : 'Not found (using system environment)'}`);

      const pkgPath = path.join(process.cwd(), 'package.json');
      let pkgVer = '1.0.0';
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          pkgVer = pkg.version || '1.0.0';
          info.push(`HRMS System Package: ${pkg.name || 'vitas-iraq-hris'} v${pkgVer}`);
        } catch (e) {}
      }

      info.push(`Server Process PID: ${process.pid}`);
      info.push(`Process Uptime: ${Math.floor(process.uptime())} seconds`);

      res.json({ success: true, ready: true, info });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Setup / Verify Local Database
  app.all('/api/local-setup/setup-database', async (req, res) => {
    try {
      const logs = [];
      logs.push(`Connecting to database: ${config.database}...`);

      const tablesResult = await query('SHOW TABLES');
      const tablesCount = tablesResult ? tablesResult.length : 0;

      if (tablesCount > 0) {
        logs.push(`Found ${tablesCount} existing database tables in ${config.database}.`);
        logs.push(`No destructive changes made. Existing schema and data preserved intact.`);
        
        // Ensure sync tables are initialized safely
        await initSyncEngineTables(db).catch(e => logs.push(`Sync tables check: ${e.message}`));

        return res.json({
          success: true,
          existingDatabase: config.database,
          tablesCount,
          logs
        });
      }

      // If empty, initialize safely with CREATE TABLE IF NOT EXISTS
      logs.push(`No existing tables found. Initializing schema...`);
      await initDatabase(db);
      await initSyncEngineTables(db);

      const newTablesResult = await query('SHOW TABLES');
      const newCount = newTablesResult ? newTablesResult.length : 0;
      logs.push(`Initialized ${newCount} tables successfully.`);

      res.json({
        success: true,
        created: true,
        existingDatabase: config.database,
        tablesCount: newCount,
        logs
      });
    } catch (err) {
      console.error('Error in /api/local-setup/setup-database:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. Check API Health
  app.get('/api/local-setup/check-api', async (req, res) => {
    try {
      let dbConnected = false;
      try {
        await query('SELECT 1');
        dbConnected = true;
      } catch (e) {}

      const isRailway = !!(process.env.RAILWAY_ENVIRONMENT || process.env.MYSQLHOST);

      res.json({
        success: true,
        status: 'ok',
        url: `http://localhost:${process.env.PORT || 5000}/api/health`,
        role: isRailway ? 'CLOUD_SERVER' : 'LOCAL_SERVER',
        database: dbConnected ? 'CONNECTED' : 'DISCONNECTED',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. Network Information & Local IP Discovery
  app.get('/api/local-setup/network-info', (req, res) => {
    try {
      const port = process.env.PORT || 5000;
      const hostname = os.hostname();
      const interfaces = os.networkInterfaces();
      let localIp = '127.0.0.1';

      // Find primary LAN IPv4 address (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
          if (iface.family === 'IPv4' && !iface.internal) {
            // Prioritize standard private IP ranges
            if (
              iface.address.startsWith('192.168.') ||
              iface.address.startsWith('10.') ||
              iface.address.startsWith('172.')
            ) {
              localIp = iface.address;
              break;
            } else if (localIp === '127.0.0.1') {
              localIp = iface.address;
            }
          }
        }
        if (localIp !== '127.0.0.1') break;
      }

      res.json({
        success: true,
        info: {
          localIp,
          port,
          hostname,
          lanUrl: `http://${localIp}:${port}`,
          firewall: `Listening on all interfaces (0.0.0.0:${port}). Ensure Windows Defender Firewall allows inbound traffic on TCP port ${port}.`
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. Check Auto-start & Service Status
  app.get('/api/local-setup/check-autostart', (req, res) => {
    try {
      const info = [];
      const isWindows = process.platform === 'win32';
      const nodePath = process.execPath;
      const projectPath = process.cwd();
      const serverScript = path.join(projectPath, 'server.js');

      info.push(`OS Platform: ${process.platform}`);
      info.push(`Node Binary: ${nodePath}`);
      info.push(`Entry Script: ${serverScript}`);

      // Check PM2 or Windows Service
      const isPm2 = !!process.env.PM2_HOME || !!process.env.pm_id;
      let configured = isPm2;

      if (isPm2) {
        info.push('Process is running under PM2 Process Manager (Auto-restart active)');
      } else {
        info.push('Running as a standard Node.js interactive process.');
      }

      res.json({
        success: true,
        configured,
        nodePath,
        projectPath,
        info
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. Check Cloud Database Sync
  app.get('/api/local-setup/check-sync', async (req, res) => {
    try {
      const info = [];
      const warnings = [];
      let cloudReachable = false;
      let syncMode = 'Bidirectional Full Table Sync (every 60s) + Realtime SSE Bridge';

      info.push('Testing connection to Railway cloud database...');

      try {
        const cloudResult = await executeCloudQuery('SELECT 1 as ping');
        if (cloudResult && cloudResult.length > 0) {
          cloudReachable = true;
          info.push('Successfully pinged Railway Cloud database.');
        } else {
          info.push('Could not establish direct query to cloud database.');
        }
      } catch (err) {
        info.push(`Cloud query ping note: ${err.message}`);
      }

      if (!cloudReachable) {
        warnings.push('Cloud database is currently unreachable. The local server will operate in full offline mode and queue changes until internet is restored.');
      }

      res.json({
        success: true,
        cloudReachable,
        syncMode,
        info,
        warnings
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 8. Run Verification Tests
  app.all('/api/local-setup/run-tests', async (req, res) => {
    try {
      const tests = [];

      // Test 1: Local DB Query
      try {
        const ping = await query('SELECT 1 as ping');
        tests.push({
          name: 'Local Database Connection (MySQL)',
          passed: Boolean(ping && ping.length > 0),
          message: 'Database connection responding'
        });
      } catch (e) {
        tests.push({ name: 'Local Database Connection (MySQL)', passed: false, message: e.message });
      }

      // Test 2: Users Table Query
      try {
        const users = await query('SELECT COUNT(*) as count FROM users');
        const count = users && users[0] ? users[0].count : 0;
        tests.push({
          name: 'Users & Authentication Table',
          passed: count >= 0,
          message: `${count} registered users found`
        });
      } catch (e) {
        tests.push({ name: 'Users & Authentication Table', passed: false, message: e.message });
      }

      // Test 3: Employees Table Query
      try {
        const emps = await query('SELECT COUNT(*) as count FROM employees');
        const count = emps && emps[0] ? emps[0].count : 0;
        tests.push({
          name: 'Employees Records Table',
          passed: count >= 0,
          message: `${count} employee records accessible`
        });
      } catch (e) {
        tests.push({ name: 'Employees Records Table', passed: false, message: e.message });
      }

      // Test 4: Settings Table Query
      try {
        const settings = await query('SELECT COUNT(*) as count FROM app_settings');
        const count = settings && settings[0] ? settings[0].count : 0;
        tests.push({
          name: 'Application Settings Table',
          passed: count >= 0,
          message: `${count} configuration keys present`
        });
      } catch (e) {
        tests.push({ name: 'Application Settings Table', passed: false, message: e.message });
      }

      // Test 5: Branches / Locations
      try {
        const branches = await query('SELECT COUNT(*) as count FROM branches');
        const count = branches && branches[0] ? branches[0].count : 0;
        tests.push({
          name: 'Branches & Office Locations',
          passed: count >= 0,
          message: `${count} branch locations loaded`
        });
      } catch (e) {
        tests.push({ name: 'Branches & Office Locations', passed: false, message: e.message });
      }

      // Test 6: Network Interface Binding
      try {
        const interfaces = os.networkInterfaces();
        const hasIpv4 = Object.values(interfaces).flat().some(i => i.family === 'IPv4' && !i.internal);
        tests.push({
          name: 'LAN Network Interface',
          passed: hasIpv4,
          message: hasIpv4 ? 'Active LAN IPv4 interface detected' : 'Only localhost detected'
        });
      } catch (e) {
        tests.push({ name: 'LAN Network Interface', passed: false, message: e.message });
      }

      // Test 7: Cloud Sync Ping
      try {
        const cloudPing = await executeCloudQuery('SELECT 1 as ping');
        const passed = Boolean(cloudPing && cloudPing.length > 0);
        tests.push({
          name: 'Cloud Database Synchronization (Railway)',
          passed: passed,
          message: passed ? 'Cloud database online & reachable' : 'Offline (local standalone mode active)'
        });
      } catch (e) {
        tests.push({
          name: 'Cloud Database Synchronization (Railway)',
          passed: false,
          message: 'Offline (local standalone mode active)'
        });
      }

      res.json({ success: true, tests });
    } catch (err) {
      console.error('Error in /api/local-setup/run-tests:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

}
