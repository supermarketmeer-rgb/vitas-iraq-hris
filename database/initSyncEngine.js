import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initSyncEngineTables(pool) {
  try {
    const sqlPath = path.join(__dirname, 'add_sync_tables.sql');
    if (!fs.existsSync(sqlPath)) {
      console.warn('[SYNC ENGINE] add_sync_tables.sql file not found.');
      return;
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const query = (sql) => new Promise((resolve, reject) => {
      pool.query(sql, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });

    for (const statement of statements) {
      await query(statement).catch(err => {
        console.warn('[SYNC ENGINE] Table init statement warning:', err.message);
      });
    }

    console.log('[SYNC ENGINE] All sync engine tables initialized successfully.');
  } catch (err) {
    console.error('[SYNC ENGINE] Error initializing sync engine tables:', err.message);
  }
}
