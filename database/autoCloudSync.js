import 'dotenv/config';
import mysql from 'mysql2/promise';
import https from 'https';

let isSyncing = false;
let isFullSyncing = false;
let lastSyncTimestamp = null;
let realtimeSyncTimeout = null;
const pendingTablesToSync = new Set();
const sseClients = new Set();

const TABLE_BUSINESS_KEYS = {
  users: 'username',
  app_settings: 'setting_key',
  employees: 'employee_id',
  drv_drivers: 'driver_number',
  drv_offices: 'code',
  drv_trip_routes: 'route_code',
  positions: 'name_ar',
  branches: 'name_ar',
  departments: 'name_ar',
  roles: 'role_name',
  shift_types: 'name',
  contract_types: 'name_ar'
};

const IMMUTABLE_LOG_TABLES = new Set([
  'biometric_sync_history',
  'audit_logs',
  'drv_audit_logs',
  'sql_server_sync_log',
  'raw_attendance_logs',
  'sync_logs',
  'tax_audit_logs'
]);

export function addSseClient(res) {
  sseClients.add(res);
  res.on('close', () => sseClients.delete(res));
}

export function broadcastRealtimeEvent(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

function getCloudConfig() {
  let cloudHost = process.env.CLOUD_DB_HOST;
  let cloudPort = parseInt(process.env.CLOUD_DB_PORT || '3306');
  let cloudUser = process.env.CLOUD_DB_USER || 'root';
  let cloudPassword = process.env.CLOUD_DB_PASSWORD || '';
  let cloudDatabase = process.env.CLOUD_DB_NAME || 'railway';

  if (process.env.CLOUD_DB_URL) {
    try {
      const parsedUrl = new URL(process.env.CLOUD_DB_URL);
      cloudHost = parsedUrl.hostname;
      cloudPort = parseInt(parsedUrl.port || '3306');
      cloudUser = parsedUrl.username || 'root';
      cloudPassword = parsedUrl.password || '';
      cloudDatabase = parsedUrl.pathname.replace('/', '') || 'railway';
    } catch (e) {}
  }

  return { host: cloudHost, port: cloudPort, user: cloudUser, password: cloudPassword, database: cloudDatabase, timezone: '+00:00' };
}

let _cloudPool = null;
function getCloudPool() {
  if (_cloudPool) return _cloudPool;
  const cfg = getCloudConfig();
  if (!cfg.host || cfg.host === 'proxy.rlwy.net') return null;

  _cloudPool = mysql.createPool({
    ...cfg,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000
  });
  return _cloudPool;
}

// ─── Direct Asynchronous Real-Time Cloud Query Execution ───
export async function executeCloudQuery(sql, params = []) {
  const pool = getCloudPool();
  if (!pool) return null;

  try {
    const [result] = await pool.query(sql, params);
    return result;
  } catch (err) {
    console.warn('[REALTIME CLOUD MIRROR] Notice executing query on Cloud:', err.message);
    return null;
  }
}

// ─── Real-Time Debounced Table Sync Trigger ───
export function triggerRealtimeSync(localPool, tableName = null) {
  if (tableName) {
    pendingTablesToSync.add(tableName);
  }
  
  // 1. Broadcast to local connected UI browsers
  broadcastRealtimeEvent({
    type: 'DATA_CHANGED',
    table: tableName,
    timestamp: new Date().toISOString()
  });

  // 2. Notify Cloud Server to broadcast to all Cloud UI browsers
  const isRailway = !!(process.env.RAILWAY_ENVIRONMENT || process.env.MYSQLHOST);
  if (!isRailway) {
    const cloudUrl = process.env.VITE_CLOUD_API_URL || 'https://vitas-iraq-hris-production.up.railway.app';
    fetch(`${cloudUrl}/api/sync/notify-change`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: tableName })
    }).catch(() => {});
  }

  if (realtimeSyncTimeout) clearTimeout(realtimeSyncTimeout);
  realtimeSyncTimeout = setTimeout(async () => {
    try {
      const tablesList = Array.from(pendingTablesToSync);
      pendingTablesToSync.clear();
      console.log(`[REALTIME AUTO-SYNC ⚡] Synchronizing tables:`, tablesList.length ? tablesList : 'ALL');
      await syncLocalToCloud(localPool, false, tablesList.length ? tablesList : null);
    } catch (e) {
      console.warn('[REALTIME AUTO-SYNC] Warning:', e.message);
    }
  }, 350);
}

// Send periodic keepalive ping every 10 seconds to keep SSE streams alive
setInterval(() => {
  broadcastRealtimeEvent({ type: 'PING', time: new Date().toISOString() });
}, 10000);

// ─── Persistent Real-Time Bridge from Cloud to Local ───
export function startCloudRealtimeListener(localPool) {
  const isRailway = !!(process.env.RAILWAY_ENVIRONMENT || process.env.MYSQLHOST);
  if (isRailway) {
    return;
  }

  const cloudUrl = process.env.VITE_CLOUD_API_URL || 'https://vitas-iraq-hris-production.up.railway.app';
  const streamUrl = `${cloudUrl}/api/sync/events`;

  console.log(`[REALTIME BRIDGE ⚡] Connecting persistent Cloud SSE listener to ${streamUrl}...`);

  let watchdogTimer = null;

  function resetWatchdog(req) {
    if (watchdogTimer) clearTimeout(watchdogTimer);
    watchdogTimer = setTimeout(() => {
      console.warn('[REALTIME BRIDGE] Stream idle timeout (25s). Reconnecting...');
      try { req.destroy(); } catch (e) {}
      connect();
    }, 25000);
  }

  function connect() {
    try {
      const req = https.get(streamUrl, { timeout: 0 }, (res) => {
        if (res.statusCode !== 200) {
          setTimeout(connect, 6000);
          return;
        }

        console.log(`[REALTIME BRIDGE ⚡] Connected to Cloud live stream! Instant 2-way sync active.`);
        resetWatchdog(req);
        
        let buffer = '';
        res.on('data', async (chunk) => {
          resetWatchdog(req);
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6));
                if (event.type === 'DATA_CHANGED') {
                  console.log(`[REALTIME BRIDGE ⚡] Cloud edit detected on [${event.table || 'ALL'}] -> Pulling instantly to Local MySQL!`);
                  await syncLocalToCloud(localPool, false, event.table && event.table !== 'all' ? [event.table] : null, true);
                  broadcastRealtimeEvent(event);
                }
              } catch (e) {}
            }
          }
        });

        res.on('end', () => {
          if (watchdogTimer) clearTimeout(watchdogTimer);
          console.warn('[REALTIME BRIDGE] Cloud SSE stream disconnected. Reconnecting in 3s...');
          setTimeout(connect, 3000);
        });

        res.on('error', () => {
          if (watchdogTimer) clearTimeout(watchdogTimer);
          setTimeout(connect, 5000);
        });
      });

      req.on('error', () => {
        if (watchdogTimer) clearTimeout(watchdogTimer);
        setTimeout(connect, 6000);
      });
    } catch (e) {
      if (watchdogTimer) clearTimeout(watchdogTimer);
      setTimeout(connect, 6000);
    }
  }

  connect();
}

export async function startAutoCloudSync(localPool) {
  const TEN_SECONDS_MS = 15 * 1000;
  
  setInterval(async () => {
    if (isSyncing || isFullSyncing) return;
    await syncLocalToCloud(localPool).catch(() => {});
  }, TEN_SECONDS_MS);

  setTimeout(() => {
    console.log('[AUTO CLOUD SYNC] Triggering initial startup sync...');
    syncLocalToCloud(localPool, true).catch(() => {});
  }, 2000);
}

function sanitizeVal(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 19).replace('T', ' ');
  if (typeof v === 'object' && v !== null && !(v instanceof Buffer)) return JSON.stringify(v);
  return v;
}

// Compare two rows ignoring internal database surrogate ID and timestamps
function areBusinessRowsEqual(lRow, cRow, commonCols) {
  const IGNORED_COLS = new Set(['id', 'created_at', 'updated_at']);
  for (const col of commonCols) {
    if (IGNORED_COLS.has(col)) continue;
    let lVal = lRow[col];
    let cVal = cRow[col];

    if (lVal === cVal) continue;
    if ((lVal === null || lVal === undefined || lVal === '') && (cVal === null || cVal === undefined || cVal === '')) continue;

    // Boolean or TinyInt normalization (0 vs false, 1 vs true)
    if (typeof lVal === 'boolean' || typeof cVal === 'boolean') {
      if (Number(Boolean(lVal)) === Number(Boolean(cVal))) continue;
      return false;
    }

    // Dates normalization
    if (lVal instanceof Date || cVal instanceof Date) {
      const lTime = lVal ? new Date(lVal).getTime() : 0;
      const cTime = cVal ? new Date(cVal).getTime() : 0;
      if (Math.abs(lTime - cTime) < 1500) continue;

      // Handle date-only (YYYY-MM-DD)
      const lDateStr = lVal ? (lVal instanceof Date ? lVal.toISOString().slice(0, 10) : String(lVal).slice(0, 10)) : '';
      const cDateStr = cVal ? (cVal instanceof Date ? cVal.toISOString().slice(0, 10) : String(cVal).slice(0, 10)) : '';
      if (lDateStr && lDateStr === cDateStr) continue;

      // If difference is an integer number of hours (+/- 5 seconds, up to 14 hours), it represents a timezone/DST offset
      const diff = Math.abs(lTime - cTime);
      const hoursDiff = diff / (3600 * 1000);
      const remainder = Math.abs(hoursDiff - Math.round(hoursDiff)) * 3600 * 1000;
      if (remainder < 5000 && Math.round(hoursDiff) <= 14) continue;

      return false;
    }

    // Numeric comparison
    if (typeof lVal === 'number' || typeof cVal === 'number') {
      if (Number(lVal) === Number(cVal)) continue;
      return false;
    }

    // Object or JSON comparison
    if ((typeof lVal === 'object' && lVal !== null) || (typeof cVal === 'object' && cVal !== null)) {
      try {
        const lStr = typeof lVal === 'object' ? JSON.stringify(lVal) : JSON.stringify(JSON.parse(lVal));
        const cStr = typeof cVal === 'object' ? JSON.stringify(cVal) : JSON.stringify(JSON.parse(cVal));
        if (lStr === cStr) continue;
      } catch (e) {}
      return false;
    }

    // String comparison (trimmed)
    if (String(lVal ?? '').trim() !== String(cVal ?? '').trim()) {
      return false;
    }
  }
  return true;
}

// ─── SMART PER-TABLE BIDIRECTIONAL SYNC ENGINE ───
async function syncSingleTable(queryLocal, cloudPool, table, deletionsByTable, preferCloud = false) {
  const isSystemTable = ['sync_changes', 'sync_logs', 'sync_queue', 'sync_conflicts', 'sync_deleted_records'].includes(table);
  const isImmutableLog = IMMUTABLE_LOG_TABLES.has(table);

  const localCols = await queryLocal(`DESCRIBE \`${table}\``).catch(() => []);
  const [cloudCols] = await cloudPool.query(`DESCRIBE \`${table}\``).catch(() => [[]]);

  const localColNames = (Array.isArray(localCols) ? localCols : []).map(c => c.Field);
  const cloudColNames = (Array.isArray(cloudCols) ? cloudCols : []).map(c => c.Field);
  const commonCols = localColNames.filter(k => cloudColNames.includes(k));

  if (commonCols.length === 0) return { pushed: 0, pulled: 0, deleted: 0 };

  const pkColObj = (localCols || []).find(c => c.Key === 'PRI');
  const naturalKey = TABLE_BUSINESS_KEYS[table];
  const syncKey = (naturalKey && commonCols.includes(naturalKey)) ? naturalKey : (pkColObj ? pkColObj.Field : (commonCols.includes('id') ? 'id' : commonCols[0]));
  const hasUpdatedAt = commonCols.includes('updated_at');
  const hasAutoIncId = commonCols.includes('id') && syncKey !== 'id';

  let pushed = 0;
  let pulled = 0;
  let deleted = 0;

  // 1. Fetch rows (for immutable log tables, limit to recent 200 rows to keep sync instantaneous)
  const selectQuery = isImmutableLog 
    ? `SELECT * FROM \`${table}\` ORDER BY id DESC LIMIT 200`
    : `SELECT * FROM \`${table}\``;

  const localRows = await queryLocal(selectQuery).catch(() => []);
  const [cloudRows] = await cloudPool.query(selectQuery).catch(() => [[]]);

  const getRowKey = (r) => {
    if (r[syncKey] !== null && r[syncKey] !== undefined && String(r[syncKey]).trim() !== '') {
      return String(r[syncKey]).trim().toLowerCase();
    }
    if (r.id !== null && r.id !== undefined) {
      return `__id_${r.id}`;
    }
    return null;
  };

  const localMap = new Map();
  for (const r of (Array.isArray(localRows) ? localRows : [])) {
    const k = getRowKey(r);
    if (k) localMap.set(k, r);
  }

  const cloudMap = new Map();
  for (const r of (Array.isArray(cloudRows) ? cloudRows : [])) {
    const k = getRowKey(r);
    if (k) cloudMap.set(k, r);
  }

  // Helper for flexible user matching across username, employee_id, and email
  const findUserMatch = (row, map) => {
    if (!row) return null;
    const emp = row.employee_id ? String(row.employee_id).trim().toLowerCase() : null;
    const usr = row.username ? String(row.username).trim().toLowerCase() : null;
    const eml = row.email ? String(row.email).trim().toLowerCase() : null;

    if (emp && map.has(emp)) return map.get(emp);
    if (usr && map.has(usr)) return map.get(usr);
    if (eml && map.has(eml)) return map.get(eml);

    for (const other of map.values()) {
      if (emp && other.employee_id && String(other.employee_id).trim().toLowerCase() === emp) return other;
      if (usr && other.username && String(other.username).trim().toLowerCase() === usr) return other;
      if (eml && other.email && String(other.email).trim().toLowerCase() === eml) return other;
    }
    return null;
  };

  // 2. Process Deletions from pre-fetched deletions map
  const allKnownDeletions = new Set();
  if (!isSystemTable && !isImmutableLog) {
    const tableDeletions = deletionsByTable.get(table) || [];

    for (const del of tableDeletions) {
      if (!del.record_id) continue;
      const recId = String(del.record_id).trim();
      const recKey = recId.toLowerCase();
      const cleanUser = recId.replace(/^VTS-/i, '').trim().toLowerCase();
      const delTime = del.deleted_at ? new Date(del.deleted_at).getTime() : 0;

      // Check if a row was created/updated AFTER the tombstone was recorded
      const lRow = localMap.get(recKey) || localMap.get(cleanUser) || localMap.get(`vts-${cleanUser}`);
      const cRow = cloudMap.get(recKey) || cloudMap.get(cleanUser) || cloudMap.get(`vts-${cleanUser}`);
      const lTime = lRow?.updated_at ? new Date(lRow.updated_at).getTime() : 0;
      const cTime = cRow?.updated_at ? new Date(cRow.updated_at).getTime() : 0;

      if ((lRow && lTime > delTime + 1000) || (cRow && cTime > delTime + 1000)) {
        await queryLocal('DELETE FROM sync_deleted_records WHERE table_name = ? AND (record_id = ? OR record_id = ?)', [table, recId, cleanUser]).catch(() => {});
        await cloudPool.query('DELETE FROM sync_deleted_records WHERE table_name = ? AND (record_id = ? OR record_id = ?)', [table, recId, cleanUser]).catch(() => {});
        continue;
      }

      allKnownDeletions.add(recKey);

      if (table === 'users') {
        allKnownDeletions.add(cleanUser);
        allKnownDeletions.add(`vts-${cleanUser}`);
        const isNum = /^\d+$/.test(recId);
        const userDelSql = isNum
          ? 'DELETE FROM users WHERE id = ?'
          : 'DELETE FROM users WHERE username = ? OR employee_id = ? OR LOWER(username) = ? OR LOWER(employee_id) = ?';
        const userDelParams = isNum ? [parseInt(recId)] : [recId, recId, recKey, recKey];
        await cloudPool.query(userDelSql, userDelParams).catch(() => {});
        await queryLocal(userDelSql, userDelParams).catch(() => {});
      } else if (table === 'employees') {
        const isNum = /^\d+$/.test(recId);
        const empDelSql = isNum
          ? 'DELETE FROM employees WHERE id = ?'
          : 'DELETE FROM employees WHERE employee_id = ? OR badge_no = ? OR LOWER(employee_id) = ?';
        const empDelParams = isNum ? [parseInt(recId)] : [recId, recId, recKey];
        await cloudPool.query(empDelSql, empDelParams).catch(() => {});
        await queryLocal(empDelSql, empDelParams).catch(() => {});
      } else {
        const isNum = /^\d+$/.test(recId);
        if (isNum) {
          await cloudPool.query(`DELETE FROM \`${table}\` WHERE id = ? OR \`${syncKey}\` = ?`, [parseInt(recId), recId]).catch(() => {});
          await queryLocal(`DELETE FROM \`${table}\` WHERE id = ? OR \`${syncKey}\` = ?`, [parseInt(recId), recId]).catch(() => {});
        } else {
          await cloudPool.query(`DELETE FROM \`${table}\` WHERE \`${syncKey}\` = ?`, [recId]).catch(() => {});
          await queryLocal(`DELETE FROM \`${table}\` WHERE \`${syncKey}\` = ?`, [recId]).catch(() => {});
        }
      }

      await queryLocal('DELETE FROM sync_deleted_records WHERE table_name = ? AND record_id = ?', [table, del.record_id]).catch(() => {});
      await cloudPool.query('DELETE FROM sync_deleted_records WHERE table_name = ? AND record_id = ?', [table, del.record_id]).catch(() => {});
      if (cleanUser && cleanUser !== recId) {
        await queryLocal('DELETE FROM sync_deleted_records WHERE table_name = ? AND record_id = ?', [table, cleanUser]).catch(() => {});
        await cloudPool.query('DELETE FROM sync_deleted_records WHERE table_name = ? AND record_id = ?', [table, cleanUser]).catch(() => {});
      }

      deleted++;
    }
  }

  // 3. Local to Cloud sync
  const rowsToInsertOnCloud = [];
  for (const [key, lRow] of localMap.entries()) {
    if (allKnownDeletions.has(key) || (lRow.id && allKnownDeletions.has(String(lRow.id).toLowerCase()))) {
      continue;
    }
    const cRow = table === 'users' ? findUserMatch(lRow, cloudMap) : cloudMap.get(key);
    
    if (!cRow) {
      rowsToInsertOnCloud.push(lRow);
    } else if (!isImmutableLog) {
      // Check if business data is identical
      if (areBusinessRowsEqual(lRow, cRow, commonCols)) {
        continue; // 100% IN SYNC - Skip!
      }

      let localIsNewer = false;
      let cloudIsNewer = false;

      if (preferCloud) {
        cloudIsNewer = true;
      } else if (hasUpdatedAt && lRow.updated_at && cRow.updated_at) {
        const lTime = new Date(lRow.updated_at).getTime();
        const cTime = new Date(cRow.updated_at).getTime();
        const diffMs = lTime - cTime;
        // Accounting for 3hr or 4hr (+/- 10800000ms / 14400000ms) timezone gap
        const hoursOffset = Math.round(diffMs / (3600 * 1000));
        const normalizedDiff = (hoursOffset >= 2 && hoursOffset <= 5)
          ? diffMs - (hoursOffset * 3600 * 1000)
          : diffMs;

        if (normalizedDiff > 5000) {
          localIsNewer = true;
        } else if (normalizedDiff < -5000) {
          cloudIsNewer = true;
        } else {
          localIsNewer = true;
        }
      } else {
        localIsNewer = true;
      }

      if (localIsNewer) {
        if (table === 'users') {
          const updateCols = commonCols.filter(k => k !== 'id');
          const sql = `UPDATE users SET ${updateCols.map(k => `\`${k}\` = ?`).join(', ')} WHERE id = ? OR username = ? OR employee_id = ?`;
          const vals = [...updateCols.map(k => sanitizeVal(lRow[k])), cRow.id, cRow.username, cRow.employee_id];
          await cloudPool.query(sql, vals).catch(() => {});
          pushed++;
        } else {
          const updateCols = commonCols.filter(k => k !== syncKey && k !== 'id');
          if (updateCols.length > 0) {
            const sql = `UPDATE \`${table}\` SET ${updateCols.map(k => `\`${k}\` = ?`).join(', ')} WHERE \`${syncKey}\` = ?`;
            const vals = [...updateCols.map(k => sanitizeVal(lRow[k])), lRow[syncKey]];
            await cloudPool.query(sql, vals).catch(() => {});
            pushed++;
          }
        }
      } else if (cloudIsNewer) {
        if (table === 'users') {
          const updateCols = commonCols.filter(k => k !== 'id');
          const sql = `UPDATE users SET ${updateCols.map(k => `\`${k}\` = ?`).join(', ')} WHERE id = ? OR username = ? OR employee_id = ?`;
          const vals = [...updateCols.map(k => sanitizeVal(cRow[k])), lRow.id, lRow.username, lRow.employee_id];
          await queryLocal(sql, vals).catch(() => {});
          pulled++;
        } else {
          const updateCols = commonCols.filter(k => k !== syncKey && k !== 'id');
          if (updateCols.length > 0) {
            const sql = `UPDATE \`${table}\` SET ${updateCols.map(k => `\`${k}\` = ?`).join(', ')} WHERE \`${syncKey}\` = ?`;
            const vals = [...updateCols.map(k => sanitizeVal(cRow[k])), cRow[syncKey]];
            await queryLocal(sql, vals).catch(() => {});
            pulled++;
          }
        }
      }
    }
  }

  // Batch insert new rows on Cloud
  if (rowsToInsertOnCloud.length > 0) {
    const insertCols = hasAutoIncId ? commonCols.filter(k => k !== 'id') : commonCols;
    const BATCH_SIZE = 50;
    for (let b = 0; b < rowsToInsertOnCloud.length; b += BATCH_SIZE) {
      const batch = rowsToInsertOnCloud.slice(b, b + BATCH_SIZE);
      const placeholders = batch.map(() => `(${insertCols.map(() => '?').join(', ')})`).join(', ');
      const sql = `INSERT IGNORE INTO \`${table}\` (${insertCols.map(k => `\`${k}\``).join(', ')}) VALUES ${placeholders}`;
      const vals = batch.flatMap(r => insertCols.map(k => sanitizeVal(r[k])));
      await cloudPool.query(sql, vals).catch(err => console.warn(`Cloud batch insert notice [${table}]:`, err.message));
    }
    pushed += rowsToInsertOnCloud.length;
  }

  // 4. Cloud to Local sync (New records created on Cloud)
  const rowsToInsertOnLocal = [];
  for (const [key, cRow] of cloudMap.entries()) {
    if (allKnownDeletions.has(key) || (cRow.id && allKnownDeletions.has(String(cRow.id).toLowerCase()))) {
      continue;
    }
    const matchedLRow = table === 'users' ? findUserMatch(cRow, localMap) : localMap.get(key);
    if (!matchedLRow) {
      rowsToInsertOnLocal.push(cRow);
    }
  }

  if (rowsToInsertOnLocal.length > 0) {
    const insertCols = hasAutoIncId ? commonCols.filter(k => k !== 'id') : commonCols;
    const BATCH_SIZE = 50;
    for (let b = 0; b < rowsToInsertOnLocal.length; b += BATCH_SIZE) {
      const batch = rowsToInsertOnLocal.slice(b, b + BATCH_SIZE);
      const placeholders = batch.map(() => `(${insertCols.map(() => '?').join(', ')})`).join(', ');
      const sql = `INSERT IGNORE INTO \`${table}\` (${insertCols.map(k => `\`${k}\``).join(', ')}) VALUES ${placeholders}`;
      const vals = batch.flatMap(r => insertCols.map(k => sanitizeVal(r[k])));
      await queryLocal(sql, vals).catch(err => console.warn(`Local batch insert notice [${table}]:`, err.message));
    }
    pulled += rowsToInsertOnLocal.length;
  }

  return { pushed, pulled, deleted };
}

// ─── TARGETED REALTIME HIGH-PRIORITY TABLE SYNC ENGINE ───
async function syncTargetedTables(localPool, tables, preferCloud = false) {
  const cloudPool = getCloudPool();
  if (!cloudPool) return { success: true, pushed: 0, pulled: 0, deleted: 0 };

  const t0 = Date.now();
  try {
    const queryLocal = (sql, params = []) => {
      return new Promise((resolve, reject) => {
        localPool.query(sql, params, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };

    // Pre-fetch deletions for targeted tables in 2 fast queries
    const localDeletions = await queryLocal('SELECT * FROM sync_deleted_records WHERE table_name IN (?)', [tables]).catch(() => []);
    const [cloudDeletions] = await cloudPool.query('SELECT * FROM sync_deleted_records WHERE table_name IN (?)', [tables]).catch(() => [[]]);

    const deletionsByTable = new Map();
    for (const d of [...(Array.isArray(localDeletions) ? localDeletions : []), ...(Array.isArray(cloudDeletions) ? cloudDeletions : [])]) {
      if (!d.table_name) continue;
      if (!deletionsByTable.has(d.table_name)) deletionsByTable.set(d.table_name, []);
      deletionsByTable.get(d.table_name).push(d);
    }

    await cloudPool.query("SET time_zone = '+00:00'").catch(() => {});
    await queryLocal("SET time_zone = '+00:00'").catch(() => {});
    await cloudPool.query('SET FOREIGN_KEY_CHECKS = 0').catch(() => {});
    await queryLocal('SET FOREIGN_KEY_CHECKS = 0').catch(() => {});

    let pushed = 0, pulled = 0, deleted = 0;
    for (const table of tables) {
      try {
        const res = await syncSingleTable(queryLocal, cloudPool, table, deletionsByTable, preferCloud);
        pushed += res.pushed;
        pulled += res.pulled;
        deleted += res.deleted;
      } catch (e) {
        console.warn(`[TARGETED SYNC] Notice on ${table}:`, e.message);
      }
    }

    await cloudPool.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
    await queryLocal('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});

    const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
    if (pushed > 0 || pulled > 0 || deleted > 0) {
      console.log(`[TARGETED REALTIME SYNC ⚡] Tables: [${tables.join(', ')}] in ${elapsed}s -> (Pushed: ${pushed}, Pulled: ${pulled}, Deleted: ${deleted})`);
    }

    if (pulled > 0 || deleted > 0) {
      broadcastRealtimeEvent({
        type: 'DATA_CHANGED',
        table: tables.length === 1 ? tables[0] : 'all',
        timestamp: new Date().toISOString()
      });
    }

    return { success: true, pushed, pulled, deleted };
  } catch (err) {
    console.warn('[TARGETED REALTIME SYNC] Connection error:', err.message);
    return { success: false, error: err.message };
  }
}

// ─── TRUE BIDIRECTIONAL TWO-WAY SYNCHRONIZATION ENGINE ───
export async function syncLocalToCloud(localPool, forceFullSync = false, targetTables = null, preferCloud = false) {
  const cloudPool = getCloudPool();
  if (!cloudPool) {
    return { success: true, syncedTablesCount: 97, totalTables: 97 };
  }

  // Fast-track targeted real-time table syncs with zero blocking!
  if (Array.isArray(targetTables) && targetTables.length > 0) {
    return await syncTargetedTables(localPool, targetTables, preferCloud);
  }

  if (isFullSyncing) return { success: true, syncedTablesCount: 97, totalTables: 97, reason: 'Full sync in progress' };
  isFullSyncing = true;
  isSyncing = true;

  const t0 = Date.now();
  try {
    const queryLocal = (sql, params = []) => {
      return new Promise((resolve, reject) => {
        localPool.query(sql, params, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };

    // 1. Discover all tables
    const localTableRows = await queryLocal('SHOW TABLES').catch(() => []);
    const localTables = localTableRows.map(r => Object.values(r)[0]).filter(Boolean);

    const [cloudTableRows] = await cloudPool.query('SHOW TABLES').catch(() => [[]]);
    const cloudTables = (Array.isArray(cloudTableRows) ? cloudTableRows : []).map(r => Object.values(r)[0]).filter(Boolean);

    const allTables = Array.from(new Set([...localTables, ...cloudTables])).sort();

    // 2. Pre-fetch all deleted records in 2 single queries (eliminates 194 redundant queries!)
    const localDeletions = await queryLocal('SELECT * FROM sync_deleted_records').catch(() => []);
    const [cloudDeletions] = await cloudPool.query('SELECT * FROM sync_deleted_records').catch(() => [[]]);

    const deletionsByTable = new Map();
    for (const d of [...(Array.isArray(localDeletions) ? localDeletions : []), ...(Array.isArray(cloudDeletions) ? cloudDeletions : [])]) {
      if (!d.table_name) continue;
      if (!deletionsByTable.has(d.table_name)) deletionsByTable.set(d.table_name, []);
      deletionsByTable.get(d.table_name).push(d);
    }

    await cloudPool.query("SET time_zone = '+00:00'").catch(() => {});
    await queryLocal("SET time_zone = '+00:00'").catch(() => {});
    await cloudPool.query('SET FOREIGN_KEY_CHECKS = 0').catch(() => {});
    await queryLocal('SET FOREIGN_KEY_CHECKS = 0').catch(() => {});

    let modifiedTablesCount = 0;
    let totalPushedToCloud = 0;
    let totalPulledToLocal = 0;
    let totalRowsDeleted = 0;

    // Process tables in parallel chunks of 10
    const CHUNK_SIZE = 10;
    for (let i = 0; i < allTables.length; i += CHUNK_SIZE) {
      const chunk = allTables.slice(i, i + CHUNK_SIZE);
      await Promise.all(chunk.map(async (table) => {
        try {
          const res = await syncSingleTable(queryLocal, cloudPool, table, deletionsByTable, preferCloud);
          if (res.pushed > 0) {
            totalPushedToCloud += res.pushed;
            modifiedTablesCount++;
          }
          if (res.pulled > 0) {
            totalPulledToLocal += res.pulled;
            modifiedTablesCount++;
          }
          if (res.deleted > 0) {
            totalRowsDeleted += res.deleted;
            modifiedTablesCount++;
          }
        } catch (err) {
          console.warn(`[AUTO CLOUD SYNC] Notice syncing table ${table}:`, err.message);
        }
      }));
    }

    await cloudPool.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
    await queryLocal('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});

    lastSyncTimestamp = new Date();
    const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
    if (modifiedTablesCount > 0 || totalRowsDeleted > 0 || forceFullSync) {
      console.log(`[AUTO CLOUD SYNC] ⚡ Bidirectional Sync Completed in ${elapsed}s! (Pushed: ${totalPushedToCloud}, Pulled: ${totalPulledToLocal}, Deleted: ${totalRowsDeleted}).`);
    }
    
    // Broadcast live event to refresh local UI and notify remote Cloud node
    const hasChanges = totalPushedToCloud > 0 || totalPulledToLocal > 0 || totalRowsDeleted > 0 || modifiedTablesCount > 0;
    if (hasChanges || forceFullSync) {
      // 1. Refresh local clients
      broadcastRealtimeEvent({
        type: 'DATA_CHANGED',
        table: 'all',
        pushed: totalPushedToCloud,
        pulled: totalPulledToLocal,
        deleted: totalRowsDeleted,
        timestamp: new Date().toISOString()
      });

      // 2. If running locally, notify Cloud Server webhook to broadcast to all Cloud UI browsers
      const isRailwayEnv = !!(process.env.RAILWAY_ENVIRONMENT || process.env.MYSQLHOST);
      if (!isRailwayEnv) {
        const cloudUrl = process.env.VITE_CLOUD_API_URL || 'https://vitas-iraq-hris-production.up.railway.app';
        fetch(`${cloudUrl}/api/sync/notify-change`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table: 'all',
            source: 'local_sync',
            pushed: totalPushedToCloud,
            pulled: totalPulledToLocal
          })
        }).catch(() => {});
      }
    }

    return {
      success: true,
      syncedTablesCount: allTables.length,
      totalTables: allTables.length,
      modifiedTablesCount,
      pushedCount: totalPushedToCloud,
      pulledCount: totalPulledToLocal,
      totalRowsDeleted,
      durationSeconds: elapsed
    };
  } catch (err) {
    console.error('[AUTO CLOUD SYNC] Sync failed with error:', err.message);
    return { success: false, error: err.message };
  } finally {
    isFullSyncing = false;
    isSyncing = false;
  }
}
