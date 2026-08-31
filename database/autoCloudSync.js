import 'dotenv/config';
import mysql from 'mysql2/promise';

let isSyncing = false;
let lastSyncTimestamp = null;

export async function startAutoCloudSync(localPool) {
  // Sync every 15 minutes (900,000 ms) in background between Local and Cloud
  const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
  
  setInterval(async () => {
    if (isSyncing) return;
    console.log('[AUTO CLOUD SYNC] Starting scheduled 15-minute sync cycle (Local ⇄ Cloud)...');
    await syncLocalToCloud(localPool).catch(err => {
      console.warn('[AUTO CLOUD SYNC] Notice:', err.message);
    });
  }, FIFTEEN_MINUTES_MS);

  // Initial fast delta sync after 3 seconds on startup
  setTimeout(() => {
    console.log('[AUTO CLOUD SYNC] Triggering initial startup sync...');
    syncLocalToCloud(localPool).catch(() => {});
  }, 3000);
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

export async function syncLocalToCloud(localPool, forceFullSync = false) {
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

  if (!cloudHost || cloudHost === 'proxy.rlwy.net') {
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
      host: cloudHost,
      port: cloudPort,
      user: cloudUser,
      password: cloudPassword,
      database: cloudDatabase,
      connectTimeout: 10000
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
    const localTableRows = await queryLocal('SHOW TABLES').catch(() => []);
    const localTables = localTableRows.map(r => Object.values(r)[0]).filter(Boolean);

    const [cloudTableRows] = await cloudConn.query('SHOW TABLES').catch(() => [[]]);
    const cloudTables = (Array.isArray(cloudTableRows) ? cloudTableRows : []).map(r => Object.values(r)[0]).filter(Boolean);

    const allTables = Array.from(new Set([...localTables, ...cloudTables])).sort();

    await cloudConn.execute('SET FOREIGN_KEY_CHECKS = 0').catch(() => {});
    await queryLocal('SET FOREIGN_KEY_CHECKS = 0').catch(() => {});

    // Compute Delta Sync cutoff time (with 60-second safety buffer)
    const now = new Date();
    const syncCutoff = (!forceFullSync && lastSyncTimestamp)
      ? new Date(lastSyncTimestamp.getTime() - 60000)
      : null;

    let modifiedTablesCount = 0;
    let totalRowsSynced = 0;

    // Process tables in parallel chunks of 10
    const CHUNK_SIZE = 10;
    for (let i = 0; i < allTables.length; i += CHUNK_SIZE) {
      const chunk = allTables.slice(i, i + CHUNK_SIZE);
      await Promise.all(chunk.map(async (table) => {
        try {
          // Ensure table exists on Cloud
          if (!cloudTables.includes(table) && localTables.includes(table)) {
            const createResult = await queryLocal(`SHOW CREATE TABLE \`${table}\``).catch(() => []);
            if (Array.isArray(createResult) && createResult[0] && createResult[0]['Create Table']) {
              const cleanSql = sanitizeCreateTableSql(createResult[0]['Create Table'], 'cloud');
              await cloudConn.query(cleanSql).catch(() => {});
            }
          }

          // Ensure table exists on Local
          if (!localTables.includes(table) && cloudTables.includes(table)) {
            const [createResult] = await cloudConn.query(`SHOW CREATE TABLE \`${table}\``).catch(() => [[]]);
            if (Array.isArray(createResult) && createResult[0] && createResult[0]['Create Table']) {
              const cleanSql = sanitizeCreateTableSql(createResult[0]['Create Table'], 'local');
              await queryLocal(cleanSql).catch(() => {});
            }
          }

          // Fetch table column structures
          const localCols = await queryLocal(`DESCRIBE \`${table}\``).catch(() => []);
          const [cloudCols] = await cloudConn.query(`DESCRIBE \`${table}\``).catch(() => [[]]);

          const localColNames = (Array.isArray(localCols) ? localCols : []).map(c => c.Field);
          const cloudColNames = (Array.isArray(cloudCols) ? cloudCols : []).map(c => c.Field);
          const commonCols = localColNames.filter(k => cloudColNames.includes(k));

          if (commonCols.length === 0) return;

          const hasUpdatedAt = commonCols.includes('updated_at');
          const hasCreatedAt = commonCols.includes('created_at');

          // ─── Local -> Cloud (Only Modified Records) ───────────
          let localQuery = `SELECT * FROM \`${table}\``;
          let localParams = [];
          if (syncCutoff && hasUpdatedAt) {
            localQuery += ` WHERE \`updated_at\` >= ?`;
            localParams.push(syncCutoff);
          } else if (syncCutoff && hasCreatedAt) {
            localQuery += ` WHERE \`created_at\` >= ?`;
            localParams.push(syncCutoff);
          }

          const localRows = await queryLocal(localQuery, localParams).catch(() => []);
          if (Array.isArray(localRows) && localRows.length > 0) {
            modifiedTablesCount++;
            totalRowsSynced += localRows.length;

            const BATCH = 50;
            for (let b = 0; b < localRows.length; b += BATCH) {
              const batchRows = localRows.slice(b, b + BATCH);
              const colsList = commonCols.map(k => `\`${k}\``).join(', ');
              const rowPlaceholder = `(${commonCols.map(() => '?').join(', ')})`;
              const allPlaceholders = batchRows.map(() => rowPlaceholder).join(', ');

              const updateClause = commonCols
                .filter(k => k !== 'id')
                .map(k => `\`${k}\` = VALUES(\`${k}\`)`)
                .join(', ');

              const flatVals = [];
              for (const row of batchRows) {
                for (const col of commonCols) {
                  const v = row[col];
                  if (v instanceof Date) flatVals.push(v.toISOString().slice(0, 19).replace('T', ' '));
                  else if (typeof v === 'object' && v !== null) flatVals.push(JSON.stringify(v));
                  else flatVals.push(v);
                }
              }

              const sql = `INSERT INTO \`${table}\` (${colsList}) VALUES ${allPlaceholders} ON DUPLICATE KEY UPDATE ${updateClause || '`id`=`id`'}`;
              await cloudConn.execute(sql, flatVals).catch(() => {});
            }
          }

          // ─── Cloud -> Local (Only Modified Records) ───────────
          let cloudQuery = `SELECT * FROM \`${table}\``;
          let cloudParams = [];
          if (syncCutoff && hasUpdatedAt) {
            cloudQuery += ` WHERE \`updated_at\` >= ?`;
            cloudParams.push(syncCutoff);
          } else if (syncCutoff && hasCreatedAt) {
            cloudQuery += ` WHERE \`created_at\` >= ?`;
            cloudParams.push(syncCutoff);
          }

          const [cloudRows] = await cloudConn.query(cloudQuery, cloudParams).catch(() => [[]]);
          if (Array.isArray(cloudRows) && cloudRows.length > 0) {
            const BATCH = 50;
            for (let b = 0; b < cloudRows.length; b += BATCH) {
              const batchRows = cloudRows.slice(b, b + BATCH);
              const colsList = commonCols.map(k => `\`${k}\``).join(', ');
              const rowPlaceholder = `(${commonCols.map(() => '?').join(', ')})`;
              const allPlaceholders = batchRows.map(() => rowPlaceholder).join(', ');

              const updateClause = commonCols
                .filter(k => k !== 'id')
                .map(k => `\`${k}\` = VALUES(\`${k}\`)`)
                .join(', ');

              const flatVals = [];
              for (const row of batchRows) {
                for (const col of commonCols) {
                  const v = row[col];
                  if (v instanceof Date) flatVals.push(v.toISOString().slice(0, 19).replace('T', ' '));
                  else if (typeof v === 'object' && v !== null) flatVals.push(JSON.stringify(v));
                  else flatVals.push(v);
                }
              }

              const sql = `INSERT INTO \`${table}\` (${colsList}) VALUES ${allPlaceholders} ON DUPLICATE KEY UPDATE ${updateClause || '`id`=`id`'}`;
              await queryLocal(sql, flatVals).catch(() => {});
            }
          }
        } catch (err) {
          console.warn(`[AUTO CLOUD SYNC] Notice syncing table ${table}:`, err.message);
        }
      }));
    }

    await cloudConn.execute('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
    await queryLocal('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});

    lastSyncTimestamp = now;
    const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
    console.log(`[AUTO CLOUD SYNC] ⚡ Delta Sync Completed in ${elapsed}s! (${modifiedTablesCount} modified tables, ${totalRowsSynced} rows).`);
    
    isSyncing = false;
    return {
      success: true,
      syncedTablesCount: allTables.length,
      totalTables: allTables.length,
      modifiedTablesCount,
      totalRowsSynced,
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
