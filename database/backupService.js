import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root directory
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_PRIMARY_DIR = path.join(PROJECT_ROOT, 'backups');
const DEFAULT_SECONDARY_DIR = path.join(PROJECT_ROOT, 'backups', 'external_mirror');

// In-memory or persisted configuration
let backupConfig = {
  enabled: true,
  frequency: 'weekly', // 'daily' | 'weekly' | 'monthly'
  dayOfWeek: 0, // 0 = Sunday
  hour: 2, // 2:00 AM
  retentionDays: 30, // Auto-purge backups older than 30 days
  primaryDir: DEFAULT_PRIMARY_DIR,
  secondaryDir: DEFAULT_SECONDARY_DIR,
  enableSecondaryMirror: true,
  lastRunTime: null,
  lastRunStatus: null,
  lastRunDetails: null,
};

/**
 * Ensure directory exists
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Format bytes to readable string (KB, MB)
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Load backup settings from database if table exists, otherwise keep defaults
 */
export async function loadBackupSettings(db) {
  try {
    ensureDir(backupConfig.primaryDir);
    if (backupConfig.enableSecondaryMirror) {
      ensureDir(backupConfig.secondaryDir);
    }

    if (!db) return backupConfig;

    // Check if system_settings has backup configuration
    const [rows] = await db.promise().query(
      "SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE 'backup_%'"
    ).catch(() => [[]]);

    if (rows && rows.length > 0) {
      rows.forEach(r => {
        if (r.setting_key === 'backup_enabled') backupConfig.enabled = r.setting_value === '1';
        if (r.setting_key === 'backup_frequency') backupConfig.frequency = r.setting_value;
        if (r.setting_key === 'backup_retention_days') backupConfig.retentionDays = parseInt(r.setting_value, 10) || 30;
        if (r.setting_key === 'backup_secondary_dir' && r.setting_value) backupConfig.secondaryDir = r.setting_value;
        if (r.setting_key === 'backup_enable_secondary') backupConfig.enableSecondaryMirror = r.setting_value === '1';
        if (r.setting_key === 'backup_last_run_time') backupConfig.lastRunTime = r.setting_value;
        if (r.setting_key === 'backup_last_run_status') backupConfig.lastRunStatus = r.setting_value;
        if (r.setting_key === 'backup_last_run_details') backupConfig.lastRunDetails = r.setting_value;
      });
    }
  } catch (err) {
    console.warn('[BackupService] Could not load backup settings from DB:', err.message);
  }
  return backupConfig;
}

/**
 * Save backup settings
 */
export async function saveBackupSettings(db, newSettings) {
  backupConfig = { ...backupConfig, ...newSettings };
  ensureDir(backupConfig.primaryDir);
  if (backupConfig.enableSecondaryMirror && backupConfig.secondaryDir) {
    try {
      ensureDir(backupConfig.secondaryDir);
    } catch (e) {
      console.warn('[BackupService] Secondary dir could not be created:', e.message);
    }
  }

  if (db) {
    try {
      const updates = [
        ['backup_enabled', backupConfig.enabled ? '1' : '0'],
        ['backup_frequency', backupConfig.frequency],
        ['backup_retention_days', String(backupConfig.retentionDays)],
        ['backup_secondary_dir', backupConfig.secondaryDir || ''],
        ['backup_enable_secondary', backupConfig.enableSecondaryMirror ? '1' : '0'],
        ['backup_last_run_time', backupConfig.lastRunTime || ''],
        ['backup_last_run_status', backupConfig.lastRunStatus || ''],
        ['backup_last_run_details', backupConfig.lastRunDetails || '']
      ];

      for (const [key, val] of updates) {
        await db.promise().query(
          "INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
          [key, val]
        ).catch(() => {});
      }
    } catch (err) {
      console.warn('[BackupService] Could not persist backup settings in DB:', err.message);
    }
  }

  return backupConfig;
}

/**
 * Clean up old backups based on retention policy (default 30 days)
 */
export function purgeOldBackups(targetDir, retentionDays = 30) {
  if (!fs.existsSync(targetDir)) return { purgedCount: 0, purgedFiles: [] };

  const now = Date.now();
  const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;
  const purgedFiles = [];

  try {
    const files = fs.readdirSync(targetDir);
    for (const file of files) {
      if (!file.startsWith('vitas_hris_backup_')) continue;
      const fullPath = path.join(targetDir, file);
      const stat = fs.statSync(fullPath);
      const ageMs = now - stat.mtimeMs;

      if (ageMs > maxAgeMs) {
        fs.unlinkSync(fullPath);
        purgedFiles.push(file);
      }
    }
  } catch (err) {
    console.error(`[BackupService] Error purging old backups from ${targetDir}:`, err.message);
  }

  return { purgedCount: purgedFiles.length, purgedFiles };
}

/**
 * Export full MySQL database schema and data into SQL string
 */
async function generateDatabaseDump(db) {
  const promiseDb = db.promise();
  let dump = '';

  // SQL Header
  const timestamp = new Date().toISOString();
  dump += `-- =========================================================================\n`;
  dump += `-- VITAS IRAQ HRIS - Automated Database Backup Archive\n`;
  dump += `-- Generated: ${timestamp}\n`;
  dump += `-- Host: ${db.config?.connectionConfig?.host || 'localhost'}\n`;
  dump += `-- Database: ${db.config?.connectionConfig?.database || 'vitasiraq_hris_db'}\n`;
  dump += `-- =========================================================================\n\n`;
  dump += `/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;\n`;
  dump += `/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;\n`;
  dump += `/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;\n`;
  dump += `/*!40101 SET NAMES utf8mb4 */;\n`;
  dump += `/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;\n`;
  dump += `/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;\n`;
  dump += `/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;\n`;
  dump += `/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;\n\n`;

  // Get all tables
  const [tablesResult] = await promiseDb.query('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"');
  const tableNames = tablesResult.map(row => Object.values(row)[0]);

  for (const tableName of tableNames) {
    // Skip volatile sync temporary tables if any
    if (tableName.startsWith('_temp_')) continue;

    dump += `-- ---------------------------------------------------------\n`;
    dump += `-- Table structure for table \`${tableName}\`\n`;
    dump += `-- ---------------------------------------------------------\n`;
    dump += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;

    const [[createTableRow]] = await promiseDb.query(`SHOW CREATE TABLE \`${tableName}\``);
    const createTableSql = createTableRow['Create Table'];
    dump += `${createTableSql};\n\n`;

    // Fetch data
    dump += `-- Dumping data for table \`${tableName}\`\n`;
    const [rows] = await promiseDb.query(`SELECT * FROM \`${tableName}\``);

    if (rows && rows.length > 0) {
      dump += `LOCK TABLES \`${tableName}\` WRITE;\n`;
      dump += `/*!40000 ALTER TABLE \`${tableName}\` DISABLE KEYS */;\n`;

      // Batch insert statements (up to 100 rows per batch)
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const colNames = Object.keys(batch[0]).map(c => `\`${c}\``).join(', ');

        const valuesSql = batch.map(row => {
          const vals = Object.values(row).map(val => {
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'number') return val;
            if (typeof val === 'boolean') return val ? 1 : 0;
            if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
            if (Buffer.isBuffer(val)) return `X'${val.toString('hex')}'`;
            if (typeof val === 'object') {
              const str = JSON.stringify(val).replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
                switch (char) {
                  case "\0": return "\\0";
                  case "\x08": return "\\b";
                  case "\x09": return "\\t";
                  case "\x1a": return "\\z";
                  case "\n": return "\\n";
                  case "\r": return "\\r";
                  case "\"":
                  case "'":
                  case "\\":
                  case "%": return "\\" + char;
                  default: return char;
                }
              });
              return `'${str}'`;
            }
            // Escape string
            const str = String(val).replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
              switch (char) {
                case "\0": return "\\0";
                case "\x08": return "\\b";
                case "\x09": return "\\t";
                case "\x1a": return "\\z";
                case "\n": return "\\n";
                case "\r": return "\\r";
                case "\"":
                case "'":
                case "\\":
                case "%": return "\\" + char;
                default: return char;
              }
            });
            return `'${str}'`;
          });
          return `(${vals.join(', ')})`;
        }).join(',\n');

        dump += `INSERT INTO \`${tableName}\` (${colNames}) VALUES\n${valuesSql};\n`;
      }

      dump += `/*!40000 ALTER TABLE \`${tableName}\` ENABLE KEYS */;\n`;
      dump += `UNLOCK TABLES;\n\n`;
    }
  }

  // SQL Footer
  dump += `/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;\n`;
  dump += `/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;\n`;
  dump += `/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;\n`;
  dump += `/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;\n`;
  dump += `/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;\n`;
  dump += `/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;\n`;
  dump += `/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;\n`;
  dump += `-- Dump completed on ${new Date().toISOString()}\n`;

  return dump;
}

/**
 * Execute full backup now
 */
export async function executeBackup(db, { triggerType = 'manual', user = 'System' } = {}) {
  const startTime = Date.now();
  ensureDir(backupConfig.primaryDir);

  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const baseFilename = `vitas_hris_backup_${dateStr}.sql`;
  const gzFilename = `${baseFilename}.gz`;

  const primarySqlPath = path.join(backupConfig.primaryDir, baseFilename);
  const primaryGzPath = path.join(backupConfig.primaryDir, gzFilename);

  let secondaryGzPath = null;
  let copiedToSecondary = false;
  let rawSizeBytes = 0;
  let compressedSizeBytes = 0;

  try {
    console.log(`[BackupService] Starting database dump (${triggerType})...`);
    const dumpContent = await generateDatabaseDump(db);
    rawSizeBytes = Buffer.byteLength(dumpContent, 'utf8');

    // Compress using GZIP directly to file
    const compressedBuffer = zlib.gzipSync(Buffer.from(dumpContent, 'utf8'), { level: 9 });
    compressedSizeBytes = compressedBuffer.length;
    fs.writeFileSync(primaryGzPath, compressedBuffer);

    console.log(`[BackupService] Primary backup saved: ${primaryGzPath} (${formatBytes(compressedSizeBytes)})`);

    // Mirror to secondary external storage if enabled
    if (backupConfig.enableSecondaryMirror && backupConfig.secondaryDir) {
      try {
        ensureDir(backupConfig.secondaryDir);
        secondaryGzPath = path.join(backupConfig.secondaryDir, gzFilename);
        fs.copyFileSync(primaryGzPath, secondaryGzPath);
        copiedToSecondary = true;
        console.log(`[BackupService] Secondary mirror copied: ${secondaryGzPath}`);

        // Purge secondary older than retention
        purgeOldBackups(backupConfig.secondaryDir, backupConfig.retentionDays);
      } catch (secErr) {
        console.warn(`[BackupService] Could not copy to secondary storage (${backupConfig.secondaryDir}):`, secErr.message);
      }
    }

    // Purge primary older than retention
    const purgeResult = purgeOldBackups(backupConfig.primaryDir, backupConfig.retentionDays);

    const durationMs = Date.now() - startTime;
    const details = `تم حفظ النسخة بنجاح بحجم ${formatBytes(compressedSizeBytes)} (تم تقليصها من ${formatBytes(rawSizeBytes)}) خلال ${(durationMs / 1000).toFixed(1)} ثانية. ${copiedToSecondary ? 'ومطابقتها مع مسار التخزين الثانوي.' : ''} (تم حذف ${purgeResult.purgedCount} نسخة أقدم من ${backupConfig.retentionDays} يوماً)`;

    backupConfig.lastRunTime = new Date().toISOString();
    backupConfig.lastRunStatus = 'success';
    backupConfig.lastRunDetails = details;

    await saveBackupSettings(db, backupConfig);

    // Record in audit log if possible
    try {
      await db.promise().query(
        "INSERT INTO audit_logs (action_type, severity, module, ip_address, user_device, status, details, user_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          'SYSTEM_BACKUP_EXECUTE',
          'info',
          'النسخ الاحتياطي وإدارة التعافي (Backup & Recovery)',
          '127.0.0.1',
          'Automated Engine',
          'ناجح',
          `نسخ احتياطي (${triggerType === 'manual' ? 'يدوي' : 'تلقائي مبرمج'}): ${details}`,
          user || 'النظام التلقائي'
        ]
      ).catch(() => {});
    } catch (e) {}

    return {
      success: true,
      filename: gzFilename,
      primaryPath: primaryGzPath,
      secondaryPath: secondaryGzPath,
      copiedToSecondary,
      rawSizeBytes,
      compressedSizeBytes,
      formattedSize: formatBytes(compressedSizeBytes),
      durationMs,
      purgedFilesCount: purgeResult.purgedCount,
      timestamp: backupConfig.lastRunTime,
      details
    };
  } catch (err) {
    console.error('[BackupService] Backup failed:', err);
    backupConfig.lastRunTime = new Date().toISOString();
    backupConfig.lastRunStatus = 'failed';
    backupConfig.lastRunDetails = err.message;
    await saveBackupSettings(db, backupConfig);

    throw err;
  }
}

/**
 * Get all existing backups in primary & secondary storage
 */
export function listBackups() {
  ensureDir(backupConfig.primaryDir);
  const list = [];
  const now = Date.now();

  try {
    const files = fs.readdirSync(backupConfig.primaryDir);
    for (const file of files) {
      if (!file.startsWith('vitas_hris_backup_')) continue;
      const fullPath = path.join(backupConfig.primaryDir, file);
      const stat = fs.statSync(fullPath);

      // Check if also exists in secondary
      let existsInSecondary = false;
      if (backupConfig.secondaryDir && fs.existsSync(backupConfig.secondaryDir)) {
        existsInSecondary = fs.existsSync(path.join(backupConfig.secondaryDir, file));
      }

      const ageDays = Math.floor((now - stat.mtimeMs) / (1000 * 60 * 60 * 24));

      list.push({
        filename: file,
        sizeBytes: stat.size,
        sizeFormatted: formatBytes(stat.size),
        createdAt: stat.mtime.toISOString(),
        ageDays,
        existsInPrimary: true,
        existsInSecondary,
        isCompressed: file.endsWith('.gz')
      });
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error('[BackupService] Could not list backups:', err.message);
  }

  return list;
}

/**
 * Initialize background scheduler (Weekly / Periodic)
 */
export function initBackupScheduler(db) {
  loadBackupSettings(db).then(() => {
    console.log(`[BackupService] Automated backup engine active. Frequency: ${backupConfig.frequency}, Retention: ${backupConfig.retentionDays} days, Mirror: ${backupConfig.enableSecondaryMirror ? 'Enabled' : 'Disabled'}`);
  });

  // Check every hour if a backup needs to be executed
  setInterval(async () => {
    try {
      if (!backupConfig.enabled) return;

      const now = new Date();
      const currentDay = now.getDay(); // 0 is Sunday
      const currentHour = now.getHours();

      // Check if last run was today
      const lastRun = backupConfig.lastRunTime ? new Date(backupConfig.lastRunTime) : null;
      const hoursSinceLastRun = lastRun ? (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60) : 9999;

      let shouldRun = false;

      if (backupConfig.frequency === 'daily') {
        // Run once every 24 hours at the designated hour
        if (currentHour === backupConfig.hour && hoursSinceLastRun > 20) {
          shouldRun = true;
        }
      } else if (backupConfig.frequency === 'weekly') {
        // Run once weekly on designated day & hour (e.g. Sunday at 2 AM)
        if (currentDay === backupConfig.dayOfWeek && currentHour === backupConfig.hour && hoursSinceLastRun > 140) {
          shouldRun = true;
        }
      } else if (backupConfig.frequency === 'monthly') {
        // Run once monthly on the 1st
        if (now.getDate() === 1 && currentHour === backupConfig.hour && hoursSinceLastRun > 600) {
          shouldRun = true;
        }
      }

      if (shouldRun) {
        console.log(`[BackupService] Triggering scheduled automated ${backupConfig.frequency} backup...`);
        await executeBackup(db, { triggerType: 'scheduled', user: 'Automated Scheduler' });
      }
    } catch (err) {
      console.error('[BackupService] Scheduled backup error:', err.message);
    }
  }, 1000 * 60 * 60); // Check once per hour
}
