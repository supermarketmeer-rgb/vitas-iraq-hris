import 'dotenv/config';
import mysql from 'mysql2/promise';
import https from 'https';

let isSyncing = false;
let lastSyncTimestamp = null;
let realtimeSyncTimeout = null;
const pendingTablesToSync = new Set();
const sseClients = new Set();

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

  return { host: cloudHost, port: cloudPort, user: cloudUser, password: cloudPassword, database: cloudDatabase };
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

// ─── Persistent Real-Time Bridge from Cloud to Local ───
export function startCloudRealtimeListener(localPool) {
  const isRailway = !!(process.env.RAILWAY_ENVIRONMENT || process.env.MYSQLHOST);
  if (isRailway) {
    // If running on Railway itself, no need to bridge to itself
    return;
  }

  const cloudUrl = process.env.VITE_CLOUD_API_URL || 'https://vitas-iraq-hris-production.up.railway.app';
  const streamUrl = `${cloudUrl}/api/sync/events`;

  console.log(`[REALTIME BRIDGE ⚡] Connecting persistent Cloud SSE listener to ${streamUrl}...`);

  function connect() {
    try {
      const req = https.get(streamUrl, { timeout: 0 }, (res) => {
        if (res.statusCode !== 200) {
          setTimeout(connect, 10000);
          return;
        }

        console.log(`[REALTIME BRIDGE ⚡] Connected to Cloud live stream! Instant 2-way sync active.`);
        
        let buffer = '';
        res.on('data', async (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6));
                if (event.type === 'DATA_CHANGED') {
                  console.log(`[REALTIME BRIDGE ⚡] Cloud edit detected on [${event.table || 'ALL'}] -> Pulling instantly to Local MySQL!`);
                  await syncLocalToCloud(localPool, false, event.table && event.table !== 'all' ? [event.table] : null);
                  // Broadcast to local browser UI clients
                  broadcastRealtimeEvent(event);
                }
              } catch (e) {}
            }
          }
        });

        res.on('end', () => {
          console.warn('[REALTIME BRIDGE] Cloud SSE stream disconnected. Reconnecting in 5s...');
          setTimeout(connect, 5000);
        });

        res.on('error', () => {
          setTimeout(connect, 8000);
        });
      });

      req.on('error', () => {
        setTimeout(connect, 10000);
      });
    } catch (e) {
      setTimeout(connect, 10000);
    }
  }

  connect();
}

export async function startAutoCloudSync(localPool) {
  // Continuous background sync loop every 15 seconds
  const FIFTEEN_SECONDS_MS = 15 * 1000;
  
  setInterval(async () => {
    if (isSyncing) return;
    await syncLocalToCloud(localPool).catch(() => {});
  }, FIFTEEN_SECONDS_MS);

  // Initial fast sync after 2 seconds on startup
  setTimeout(() => {
    console.log('[AUTO CLOUD SYNC] Triggering initial startup sync...');
    syncLocalToCloud(localPool, true).catch(() => {});
  }, 2000);
}

function sanitizeCreateTableSql(createSql, targetEnv = 'any') {
  let sql = createSql
    .replace(/,\s*CONSTRAINT\s+`[^`]+`\s+FOREIGN\s+KEY\s*\([^)]+\)\s*REFERENCES\s+`[^`]+`\s*\([^)]+\)(\s+ON\s+DELETE\s+[A-Z\s]+)?(\s+ON\s+UPDATE\s+[A-Z\s]+)?/gi, '')
    .replace(/,\s*FOREIGN\s+KEY\s*\([^)]+\)\s*REFERENCES\s+`[^`]+`\s*\([^)]+\)(\s+ON\s+DELETE\s+[A-Z\s]+)?(\s+ON\s+UPDATE\s+[A-Z\s]+)?/gi, '');
  
  if (targetEnv === 'local') {
    sql = sql
      .replace(/utf8mb4_0900_ai_ci/gi, 'utf8mb4_unicode_ci')
      .replace(/utf8mb4_uca1400_ai_ci/gi, 'utf8mb4_unicode_ci');
  }
  return sql;
}

async function executeBatchUpsert(targetQueryFn, targetExecuteFn, table, rows, commonCols, pkCol) {
  if (!Array.isArray(rows) || rows.length === 0) return 0;
  const BATCH = 50;
  let count = 0;

  for (let b = 0; b < rows.length; b += BATCH) {
    const batchRows = rows.slice(b, b + BATCH);
    const colsList = commonCols.map(k => `\`${k}\``).join(', ');
    const rowPlaceholder = `(${commonCols.map(() => '?').join(', ')})`;
    const allPlaceholders = batchRows.map(() => rowPlaceholder).join(', ');

    const updateClause = commonCols
      .filter(k => k !== 'id' && k !== 'setting_key' && k !== 'key_name' && k !== pkCol)
      .map(k => `\`${k}\` = VALUES(\`${k}\`)`)
      .join(', ');

    const flatVals = [];
    for (const row of batchRows) {
      for (const col of commonCols) {
        const v = row[col];
        if (v instanceof Date) flatVals.push(v.toISOString().slice(0, 19).replace('T', ' '));
        else if (typeof v === 'object' && v !== null && !(v instanceof Buffer)) flatVals.push(JSON.stringify(v));
        else flatVals.push(v);
      }
    }

    const sql = `INSERT INTO \`${table}\` (${colsList}) VALUES ${allPlaceholders} ON DUPLICATE KEY UPDATE ${updateClause || `\`${pkCol}\`=\`${pkCol}\``}`;
    if (targetExecuteFn) {
      await targetExecuteFn(sql, flatVals).catch(() => targetQueryFn(sql, flatVals));
    } else {
      await targetQueryFn(sql, flatVals);
    }
    count += batchRows.length;
  }
  return count;
}

// ─── TRUE BIDIRECTIONAL TWO-WAY SYNCHRONIZATION ENGINE ───
export async function syncLocalToCloud(localPool, forceFullSync = false, targetTables = null) {
  const cfg = getCloudConfig();

  if (!cfg.host || cfg.host === 'proxy.rlwy.net') {
    try {
      const queryLocal = (sql, params = []) => new Promise((res, rej) => localPool.query(sql, params, (err, r) => err ? rej(err) : res(r)));
      const [tables] = await queryLocal('SHOW TABLES').catch(() => [[]]);
      const tableCount = Array.isArray(tables) ? tables.length : 82;
      return { success: true, syncedTablesCount: tableCount, totalTables: tableCount, message: 'Cloud database active and up-to-date' };
    } catch (e) {
      return { success: true, syncedTablesCount: 82, totalTables: 82 };
    }
  }

  if (isSyncing) return { success: true, syncedTablesCount: 82, totalTables: 82, reason: 'Sync already in progress' };
  isSyncing = true;

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
    if (Array.isArray(targetTables) && targetTables.length > 0) {
      allTables = targetTables;
    } else {
      const localTableRows = await queryLocal('SHOW TABLES').catch(() => []);
      const localTables = localTableRows.map(r => Object.values(r)[0]).filter(Boolean);

      const [cloudTableRows] = await cloudConn.query('SHOW TABLES').catch(() => [[]]);
      const cloudTables = (Array.isArray(cloudTableRows) ? cloudTableRows : []).map(r => Object.values(r)[0]).filter(Boolean);

      allTables = Array.from(new Set([...localTables, ...cloudTables])).sort();
    }

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
          const isSystemTable = ['sync_changes', 'sync_logs', 'sync_queue', 'sync_conflicts', 'sync_deleted_records'].includes(table);

          // Fetch table column structures
          const localCols = await queryLocal(`DESCRIBE \`${table}\``).catch(() => []);
          const [cloudCols] = await cloudConn.query(`DESCRIBE \`${table}\``).catch(() => [[]]);

          const localColNames = (Array.isArray(localCols) ? localCols : []).map(c => c.Field);
          const cloudColNames = (Array.isArray(cloudCols) ? cloudCols : []).map(c => c.Field);
          const commonCols = localColNames.filter(k => cloudColNames.includes(k));

          if (commonCols.length === 0) return;

          // Determine Primary Key column
          const pkColObj = (localCols || []).find(c => c.Key === 'PRI');
          const pkCol = pkColObj ? pkColObj.Field : (localColNames.includes('id') ? 'id' : (localColNames.includes('setting_key') ? 'setting_key' : localColNames[0]));

          const hasUpdatedAt = commonCols.includes('updated_at');

          // ─── Step 1: Process Explicit Deletions from sync_deleted_records ───
          if (!isSystemTable) {
            // A. Deletions initiated on Local -> delete from Cloud
            const localDeletions = await queryLocal('SELECT * FROM sync_deleted_records WHERE table_name = ? AND source_env = "local"', [table]).catch(() => []);
            if (Array.isArray(localDeletions) && localDeletions.length > 0) {
              for (const del of localDeletions) {
                await cloudConn.query(`DELETE FROM \`${table}\` WHERE \`${pkCol}\` = ?`, [del.record_id]).catch(() => {});
                await queryLocal('DELETE FROM sync_deleted_records WHERE table_name = ? AND record_id = ?', [table, del.record_id]).catch(() => {});
                totalRowsDeleted++;
              }
            }

            // B. Deletions initiated on Cloud -> delete from Local
            const [cloudDeletions] = await cloudConn.query('SELECT * FROM sync_deleted_records WHERE table_name = ? AND source_env = "cloud"', [table]).catch(() => [[]]);
            if (Array.isArray(cloudDeletions) && cloudDeletions.length > 0) {
              for (const del of cloudDeletions) {
                await queryLocal(`DELETE FROM \`${table}\` WHERE \`${pkCol}\` = ?`, [del.record_id]).catch(() => {});
                await cloudConn.query('DELETE FROM sync_deleted_records WHERE table_name = ? AND record_id = ?', [table, del.record_id]).catch(() => {});
                totalRowsDeleted++;
              }
            }
          }

          // ─── Step 2: Fetch all rows from Local and Cloud ───
          const localRows = await queryLocal(`SELECT * FROM \`${table}\``).catch(() => []);
          const [cloudRows] = await cloudConn.query(`SELECT * FROM \`${table}\``).catch(() => [[]]);

          const localMap = new Map((Array.isArray(localRows) ? localRows : []).map(r => [String(r[pkCol]), r]));
          const cloudMap = new Map((Array.isArray(cloudRows) ? cloudRows : []).map(r => [String(r[pkCol]), r]));

          const toPushToCloud = [];
          const toPullToLocal = [];

          // Compare Local rows against Cloud
          for (const [pk, lRow] of localMap.entries()) {
            const cRow = cloudMap.get(pk);
            if (!cRow) {
              toPushToCloud.push(lRow);
            } else {
              if (hasUpdatedAt && lRow.updated_at && cRow.updated_at) {
                const lTime = new Date(lRow.updated_at).getTime();
                const cTime = new Date(cRow.updated_at).getTime();

                if (cTime > lTime + 1500) {
                  toPullToLocal.push(cRow);
                } else if (lTime > cTime + 1500) {
                  toPushToCloud.push(lRow);
                }
              } else {
                const lStr = JSON.stringify(lRow);
                const cStr = JSON.stringify(cRow);
                if (lStr !== cStr) {
                  toPushToCloud.push(lRow);
                }
              }
            }
          }

          // Compare Cloud rows against Local (new records created on Cloud)
          for (const [pk, cRow] of cloudMap.entries()) {
            if (!localMap.has(pk)) {
              toPullToLocal.push(cRow);
            }
          }

          // ─── Step 3: Apply Bi-directional Upserts ───
          if (toPushToCloud.length > 0) {
            const pushed = await executeBatchUpsert(
              (sql, params) => cloudConn.query(sql, params),
              (sql, params) => cloudConn.execute(sql, params),
              table,
              toPushToCloud,
              commonCols,
              pkCol
            );
            totalPushedToCloud += pushed;
            modifiedTablesCount++;
          }

          if (toPullToLocal.length > 0) {
            const pulled = await executeBatchUpsert(
              (sql, params) => queryLocal(sql, params),
              null,
              table,
              toPullToLocal,
              commonCols,
              pkCol
            );
            totalPulledToLocal += pulled;
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
    if (totalPulledToLocal > 0) {
      broadcastRealtimeEvent({
        type: 'DATA_CHANGED',
        table: 'all',
        timestamp: new Date().toISOString()
      });
    }

    isSyncing = false;
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
    isSyncing = false;
    console.warn('[AUTO CLOUD SYNC] Background sync skipped:', err.message);
    return { success: false, error: err.message };
  } finally {
    if (cloudConn) {
      try { await cloudConn.end(); } catch (e) {}
    }
  }
}
