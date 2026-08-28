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

  if (!cloudHost || cloudHost === 'proxy.rlwy.net' || cloudHost === 'mysql.railway.internal') {
    return { success: false, reason: 'Invalid or placeholder CLOUD_DB_HOST. Please update .env with actual Railway Public TCP Proxy host and port.' };
  }

  if (isSyncing) return { success: false, reason: 'Sync already in progress' };
  isSyncing = true;

  let cloudConn = null;
  try {
    console.log(`[AUTO CLOUD SYNC] Connecting to cloud database at ${cloudHost}:${cloudPort}...`);
    
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

    const tablesToSync = [
      'employees', 
      'branches', 
      'departments', 
      'positions', 
      'leave_requests', 
      'users', 
      'job_vacancies', 
      'candidates', 
      'trainings', 
      'employee_trainings', 
      'contract_types', 
      'status_changes', 
      'app_settings', 
      'company_profile',
      'company_holidays',
      'company_events',
      'company_news',
      'document_categories'
    ];

    let syncedTablesCount = 0;

    for (const table of tablesToSync) {
      try {
        // ─── 1. Local -> Cloud Sync ──────────────────────────────
        const localRows = await queryLocal(`SELECT * FROM ${table}`).catch(() => []);
        if (Array.isArray(localRows) && localRows.length > 0) {
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
        }

        // ─── 2. Cloud -> Local Sync (Pull online submissions & updates) ─────
        const [cloudRows] = await cloudConn.query(`SELECT * FROM ${table}`).catch(() => [[]]);
        if (Array.isArray(cloudRows) && cloudRows.length > 0) {
          await queryLocal('SET FOREIGN_KEY_CHECKS = 0').catch(() => {});

          for (const row of cloudRows) {
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
            await queryLocal(sql, vals).catch(() => {});
          }

          await queryLocal('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
        }

        syncedTablesCount++;
      } catch (err) {
        console.warn(`[AUTO CLOUD SYNC] Notice syncing table ${table}:`, err.message);
      }
    }

    console.log(`[AUTO CLOUD SYNC] Successfully synced ${syncedTablesCount} tables bidirectionally (Local ⇄ Cloud)!`);
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
