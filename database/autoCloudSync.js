import mysql from 'mysql2/promise';

let isSyncing = false;

export async function startAutoCloudSync(localPool) {
  // Sync every 30 seconds in background
  setInterval(async () => {
    if (isSyncing) return;
    await syncLocalToCloud(localPool).catch(err => {
      console.warn('[AUTO CLOUD SYNC] Notice:', err.message);
    });
  }, 30000);

  // Initial sync after 5 seconds
  setTimeout(() => {
    syncLocalToCloud(localPool).catch(() => {});
  }, 5000);
}

export async function syncLocalToCloud(localPool) {
  const cloudHost = process.env.CLOUD_DB_HOST || process.env.RAILWAY_PUBLIC_DOMAIN;
  if (!cloudHost) {
    // If no cloud sync credentials specified, skip silently
    return { success: false, reason: 'No CLOUD_DB_HOST configured' };
  }

  if (isSyncing) return { success: false, reason: 'Sync already in progress' };
  isSyncing = true;

  let cloudConn = null;
  try {
    console.log('[AUTO CLOUD SYNC] Starting background sync to cloud database...');
    
    cloudConn = await mysql.createConnection({
      host: cloudHost,
      port: parseInt(process.env.CLOUD_DB_PORT || '3306'),
      user: process.env.CLOUD_DB_USER || 'root',
      password: process.env.CLOUD_DB_PASSWORD || '',
      database: process.env.CLOUD_DB_NAME || 'railway',
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

    const tablesToSync = ['employees', 'branches', 'departments', 'positions', 'leave_requests', 'users', 'job_vacancies', 'candidates', 'document_categories'];

    let syncedTablesCount = 0;

    for (const table of tablesToSync) {
      try {
        const localRows = await queryLocal(`SELECT * FROM ${table}`).catch(() => []);
        if (!Array.isArray(localRows) || localRows.length === 0) continue;

        // Disable foreign keys temporarily on cloud connection
        await cloudConn.execute('SET FOREIGN_KEY_CHECKS = 0').catch(() => {});

        for (const row of localRows) {
          const keys = Object.keys(row);
          const cols = keys.join(', ');
          const placeholders = keys.map(() => '?').join(', ');
          const updateAssigns = keys.map(k => `${k} = VALUES(${k})`).join(', ');

          const vals = keys.map(k => {
            const v = row[k];
            if (v instanceof Date) return v.toISOString().slice(0, 19).replace('T', ' ');
            if (typeof v === 'object' && v !== null) return JSON.stringify(v);
            return v;
          });

          const sql = `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateAssigns}`;
          await cloudConn.execute(sql, vals).catch(() => {});
        }

        await cloudConn.execute('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
        syncedTablesCount++;
      } catch (err) {
        console.warn(`[AUTO CLOUD SYNC] Notice syncing table ${table}:`, err.message);
      }
    }

    console.log(`[AUTO CLOUD SYNC] Successfully synced ${syncedTablesCount} tables to cloud!`);
    isSyncing = false;
    return { success: true, syncedTablesCount };
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
