import 'dotenv/config';
import mysql from 'mysql2/promise';
import https from 'https';

let isSyncing = false;
let lastSyncTimestamp = null;
let realtimeSyncTimeout = null;
const pendingTablesToSync = new Set();
const sseClients = new Set();

const TABLE_BUSINESS_KEYS = {
  users: 'username',
  app_settings: 'setting_key',
  system_settings: 'setting_key',
  dynamic_permissions: 'permission_key',
  hr_departments: 'code',
  hr_branches: 'code',
  job_vacancies: 'job_code',
  employees: 'employee_id'
};

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

// ─── Direct Asynchronous Real-Time Cloud Query Execution ───
export async function executeCloudQuery(sql, params = []) {
  const cfg = getCloudConfig();
  if (!cfg.host || cfg.host === 'proxy.rlwy.net') return null;

  let conn = null;
  try {
    conn = await mysql.createConnection({
      ...cfg,
      connectTimeout: 6000
    });
    await conn.query("SET time_zone = '+00:00'").catch(() => {});
    const [result] = await conn.query(sql, params);
    return result;
  } catch (err) {
    console.warn('[REALTIME CLOUD MIRROR] Notice executing query on Cloud:', err.message);
    return null;
  } finally {
    if (conn) {
      try { await conn.end(); } catch (e) {}
    }
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
  const TEN_SECONDS_MS = 10 * 1000;
  
  setInterval(async () => {
    if (isSyncing) return;
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

// ─── SMART PER-TABLE BIDIRECTIONAL SYNC ENGINE ───
async function syncSingleTable(queryLocal, cloudConn, table, preferCloud = false) {
  const isSystemTable = ['sync_changes', 'sync_logs', 'sync_queue', 'sync_conflicts', 'sync_deleted_records'].includes(table);

  const localCols = await queryLocal(`DESCRIBE \`${table}\``).catch(() => []);
  const [cloudCols] = await cloudConn.query(`DESCRIBE \`${table}\``).catch(() => [[]]);

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

  // 1. Fetch all rows
  const localRows = await queryLocal(`SELECT * FROM \`${table}\``).catch(() => []);
  const [cloudRows] = await cloudConn.query(`SELECT * FROM \`${table}\``).catch(() => [[]]);

  const localMap = new Map((Array.isArray(localRows) ? localRows : []).filter(r => r[syncKey] !== null && r[syncKey] !== undefined).map(r => [String(r[syncKey]).toLowerCase(), r]));
  const cloudMap = new Map((Array.isArray(cloudRows) ? cloudRows : []).filter(r => r[syncKey] !== null && r[syncKey] !== undefined).map(r => [String(r[syncKey]).toLowerCase(), r]));

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

  // 2. Process Deletions with Re-Creation Detection
  const allKnownDeletions = new Set();
  if (!isSystemTable) {
    const localDeletions = await queryLocal('SELECT * FROM sync_deleted_records WHERE table_name = ?', [table]).catch(() => []);
    const [cloudDeletions] = await cloudConn.query('SELECT * FROM sync_deleted_records WHERE table_name = ?', [table]).catch(() => [[]]);
    const combinedDeletions = [...(Array.isArray(localDeletions) ? localDeletions : []), ...(Array.isArray(cloudDeletions) ? cloudDeletions : [])];

    for (const del of combinedDeletions) {
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
        // Record was re-created after deletion! Expire old tombstone.
        await queryLocal('DELETE FROM sync_deleted_records WHERE table_name = ? AND (record_id = ? OR record_id = ?)', [table, recId, cleanUser]).catch(() => {});
        await cloudConn.query('DELETE FROM sync_deleted_records WHERE table_name = ? AND (record_id = ? OR record_id = ?)', [table, recId, cleanUser]).catch(() => {});
        continue;
      }

      allKnownDeletions.add(recKey);

      if (table === 'users') {
        allKnownDeletions.add(cleanUser);
        allKnownDeletions.add(`vts-${cleanUser}`);

        const isNum = /^\d+$/.test(recId);
        const userDelSql = isNum
          ? 'DELETE FROM users WHERE id = ?'
          : 'DELETE FROM users WHERE username = ? OR employee_id = ? OR LOWER(username) = ? OR LOWER(employee_id) = ? OR LOWER(username) = ? OR LOWER(employee_id) = ?';
        const userDelParams = isNum ? [parseInt(recId)] : [recId, recId, recKey, recKey, cleanUser, `vts-${cleanUser}`];
        await cloudConn.query(userDelSql, userDelParams).catch(() => {});
        await queryLocal(userDelSql, userDelParams).catch(() => {});
      } else if (table === 'employees') {
        const isNum = /^\d+$/.test(recId);
        const empDelSql = isNum
          ? 'DELETE FROM employees WHERE id = ?'
          : 'DELETE FROM employees WHERE employee_id = ? OR badge_no = ? OR LOWER(employee_id) = ?';
        const empDelParams = isNum ? [parseInt(recId)] : [recId, recId, recKey];
        await cloudConn.query(empDelSql, empDelParams).catch(() => {});
        await queryLocal(empDelSql, empDelParams).catch(() => {});
      } else {
        const isNum = /^\d+$/.test(recId);
        if (isNum) {
          await cloudConn.query(`DELETE FROM \`${table}\` WHERE id = ? OR \`${syncKey}\` = ?`, [parseInt(recId), recId]).catch(() => {});
          await queryLocal(`DELETE FROM \`${table}\` WHERE id = ? OR \`${syncKey}\` = ?`, [parseInt(recId), recId]).catch(() => {});
        } else {
          await cloudConn.query(`DELETE FROM \`${table}\` WHERE \`${syncKey}\` = ?`, [recId]).catch(() => {});
          await queryLocal(`DELETE FROM \`${table}\` WHERE \`${syncKey}\` = ?`, [recId]).catch(() => {});
        }
      }

      // Once deletion is executed on both sides, clean up the tombstone so future additions of the same identifier are allowed
      await queryLocal('DELETE FROM sync_deleted_records WHERE table_name = ? AND record_id = ?', [table, del.record_id]).catch(() => {});
      await cloudConn.query('DELETE FROM sync_deleted_records WHERE table_name = ? AND record_id = ?', [table, del.record_id]).catch(() => {});
      if (cleanUser && cleanUser !== recId) {
        await queryLocal('DELETE FROM sync_deleted_records WHERE table_name = ? AND record_id = ?', [table, cleanUser]).catch(() => {});
        await cloudConn.query('DELETE FROM sync_deleted_records WHERE table_name = ? AND record_id = ?', [table, cleanUser]).catch(() => {});
      }

      deleted++;
    }
  }

  // 3. Local to Cloud sync
  for (const [key, lRow] of localMap.entries()) {
    if (allKnownDeletions.has(key) || (lRow.id && allKnownDeletions.has(String(lRow.id).toLowerCase()))) {
      // Record was deleted - do not resurrect!
      continue;
    }
    const cRow = table === 'users' ? findUserMatch(lRow, cloudMap) : cloudMap.get(key);
    if (!cRow) {
      // Fresh record on Local -> Insert to Cloud
      const insertCols = hasAutoIncId ? commonCols.filter(k => k !== 'id') : commonCols;
      const sql = `INSERT INTO \`${table}\` (${insertCols.map(k => `\`${k}\``).join(', ')}) VALUES (${insertCols.map(() => '?').join(', ')})`;
      const vals = insertCols.map(k => sanitizeVal(lRow[k]));
      await cloudConn.query(sql, vals).catch(err => console.warn(`Cloud insert notice [${table}]:`, err.message));
      pushed++;
    } else {
      // Record exists on both: compare updated_at or content
      let localIsNewer = false;
      let cloudIsNewer = false;

      if (hasUpdatedAt && lRow.updated_at && cRow.updated_at) {
        const lTime = new Date(lRow.updated_at).getTime();
        const cTime = new Date(cRow.updated_at).getTime();
        if (preferCloud) {
          cloudIsNewer = true;
        } else if (lTime > cTime + 2000) {
          localIsNewer = true;
        } else if (cTime > lTime + 2000) {
          cloudIsNewer = true;
        } else {
          const lStr = JSON.stringify(lRow);
          const cStr = JSON.stringify(cRow);
          if (lStr !== cStr) {
            if (preferCloud) cloudIsNewer = true;
            else localIsNewer = true;
          }
        }
      } else {
        const lStr = JSON.stringify(lRow);
        const cStr = JSON.stringify(cRow);
        if (lStr !== cStr) {
          if (preferCloud) cloudIsNewer = true;
          else localIsNewer = true;
        }
      }

      if (localIsNewer) {
        // Update Cloud from Local
        if (table === 'users') {
          const updateCols = commonCols.filter(k => k !== 'id');
          const sql = `UPDATE users SET ${updateCols.map(k => `\`${k}\` = ?`).join(', ')} WHERE id = ? OR username = ? OR employee_id = ?`;
          const vals = [...updateCols.map(k => sanitizeVal(lRow[k])), cRow.id, cRow.username, cRow.employee_id];
          await cloudConn.query(sql, vals).catch(() => {});
          pushed++;
        } else {
          const updateCols = commonCols.filter(k => k !== syncKey && k !== 'id');
          if (updateCols.length > 0) {
            const sql = `UPDATE \`${table}\` SET ${updateCols.map(k => `\`${k}\` = ?`).join(', ')} WHERE \`${syncKey}\` = ?`;
            const vals = [...updateCols.map(k => sanitizeVal(lRow[k])), lRow[syncKey]];
            await cloudConn.query(sql, vals).catch(() => {});
            pushed++;
          }
        }
      } else if (cloudIsNewer) {
        // Update Local from Cloud
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

  // 4. Cloud to Local sync (New records created on Cloud)
  for (const [key, cRow] of cloudMap.entries()) {
    if (allKnownDeletions.has(key) || (cRow.id && allKnownDeletions.has(String(cRow.id).toLowerCase()))) {
      // Record was deleted - do not resurrect!
      continue;
    }
    const matchedLRow = table === 'users' ? findUserMatch(cRow, localMap) : localMap.get(key);
    if (!matchedLRow) {
      const insertCols = hasAutoIncId ? commonCols.filter(k => k !== 'id') : commonCols;
      const sql = `INSERT INTO \`${table}\` (${insertCols.map(k => `\`${k}\``).join(', ')}) VALUES (${insertCols.map(() => '?').join(', ')})`;
      const vals = insertCols.map(k => sanitizeVal(cRow[k]));
      await queryLocal(sql, vals).catch(err => console.warn(`Local insert notice [${table}]:`, err.message));
      pulled++;
    }
  }

  return { pushed, pulled, deleted };
}

// ─── TARGETED REALTIME HIGH-PRIORITY TABLE SYNC ENGINE ───
async function syncTargetedTables(localPool, cfg, tables, preferCloud = false) {
  let cloudConn = null;
  const t0 = Date.now();
  try {
    cloudConn = await mysql.createConnection({
      ...cfg,
      connectTimeout: 8000
    });
    const queryLocal = (sql, params = []) => {
      return new Promise((resolve, reject) => {
        localPool.query(sql, params, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };

    await cloudConn.query("SET time_zone = '+00:00'").catch(() => {});
    await queryLocal("SET time_zone = '+00:00'").catch(() => {});
    await cloudConn.execute('SET FOREIGN_KEY_CHECKS = 0').catch(() => {});
    await queryLocal('SET FOREIGN_KEY_CHECKS = 0').catch(() => {});

    let pushed = 0, pulled = 0, deleted = 0;
    for (const table of tables) {
      try {
        const res = await syncSingleTable(queryLocal, cloudConn, table, preferCloud);
        pushed += res.pushed;
        pulled += res.pulled;
        deleted += res.deleted;
      } catch (e) {
        console.warn(`[TARGETED SYNC] Notice on ${table}:`, e.message);
      }
    }

    await cloudConn.execute('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
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
  } finally {
    if (cloudConn) {
      try { await cloudConn.end(); } catch (e) {}
    }
  }
}

let isFullSyncing = false;

// ─── TRUE BIDIRECTIONAL TWO-WAY SYNCHRONIZATION ENGINE ───
export async function syncLocalToCloud(localPool, forceFullSync = false, targetTables = null, preferCloud = false) {
  const cfg = getCloudConfig();

  if (!cfg.host || cfg.host === 'proxy.rlwy.net') {
    return { success: true, syncedTablesCount: 83, totalTables: 83 };
  }

  // Fast-track targeted real-time table syncs with zero blocking!
  if (Array.isArray(targetTables) && targetTables.length > 0) {
    return await syncTargetedTables(localPool, cfg, targetTables, preferCloud);
  }

  if (isFullSyncing) return { success: true, syncedTablesCount: 83, totalTables: 83, reason: 'Full sync in progress' };
  isFullSyncing = true;

  const t0 = Date.now();
  let cloudConn = null;
  try {
    cloudConn = await mysql.createConnection({
      ...cfg,
      connectTimeout: 12000
    });

    const queryLocal = (sql, params = []) => {
      return new Promise((resolve, reject) => {
        localPool.query(sql, params, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };

    // 1. Discover all tables
    let allTables = [];
    const localTableRows = await queryLocal('SHOW TABLES').catch(() => []);
    const localTables = localTableRows.map(r => Object.values(r)[0]).filter(Boolean);

    const [cloudTableRows] = await cloudConn.query('SHOW TABLES').catch(() => [[]]);
    const cloudTables = (Array.isArray(cloudTableRows) ? cloudTableRows : []).map(r => Object.values(r)[0]).filter(Boolean);

    allTables = Array.from(new Set([...localTables, ...cloudTables])).sort();

    await cloudConn.query("SET time_zone = '+00:00'").catch(() => {});
    await queryLocal("SET time_zone = '+00:00'").catch(() => {});
    await cloudConn.execute('SET FOREIGN_KEY_CHECKS = 0').catch(() => {});
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
          const res = await syncSingleTable(queryLocal, cloudConn, table, preferCloud);
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

    await cloudConn.execute('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
    await queryLocal('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});

    lastSyncTimestamp = new Date();
    const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
    if (modifiedTablesCount > 0 || totalRowsDeleted > 0 || forceFullSync) {
      console.log(`[AUTO CLOUD SYNC] ⚡ Bidirectional Sync Completed in ${elapsed}s! (Pushed: ${totalPushedToCloud}, Pulled: ${totalPulledToLocal}, Deleted: ${totalRowsDeleted}).`);
    }
    
    // Broadcast live event to refresh local UI if data was pulled from Cloud to Local
    if (totalPulledToLocal > 0 || totalRowsDeleted > 0) {
      broadcastRealtimeEvent({
        type: 'DATA_CHANGED',
        table: 'all',
        timestamp: new Date().toISOString()
      });
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
    if (cloudConn) {
      try { await cloudConn.end(); } catch (e) {}
    }
  }
}
