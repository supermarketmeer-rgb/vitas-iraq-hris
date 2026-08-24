import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initDatabase(pool, force = false) {
  const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      pool.query(sql, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  };

  const resultsLog = [];

  try {
    console.log('[DATABASE INIT] Checking database tables...');

    if (!force) {
      try {
        const existingTables = await query("SHOW TABLES LIKE 'employees'");
        if (existingTables && existingTables.length > 0) {
          const allTables = await query("SHOW TABLES");
          const tableNames = allTables.map(row => Object.values(row)[0]);
          console.log(`[DATABASE INIT] Core tables already exist (${tableNames.length} tables). Skipping full schema creation.`);
          return { success: true, message: 'Core tables already exist', tablesCount: tableNames.length, tables: tableNames };
        }
      } catch (e) {
        console.log('[DATABASE INIT] Error checking existing tables:', e.message);
      }
    }

    console.log('[DATABASE INIT] Creating full database schema and seeding data...');
    
    // Disable foreign key checks during initialization
    try { await query('SET FOREIGN_KEY_CHECKS = 0'); } catch (e) {}

    const sqlFiles = [
      'schema.sql',
      'add_attendance_tables.sql',
      'company_calendar_tables.sql',
      'company_news_table.sql'
    ];

    for (const fileName of sqlFiles) {
      const filePath = path.join(__dirname, fileName);
      if (!fs.existsSync(filePath)) continue;

      const sqlContent = fs.readFileSync(filePath, 'utf8');
      
      const statements = sqlContent
        .replace(/--.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.toLowerCase().startsWith('create database') && !stmt.toLowerCase().startsWith('use '));

      for (const statement of statements) {
        try {
          await query(statement);
        } catch (err) {
          if (err.code !== 'ER_TABLE_EXISTS_ERROR' && err.code !== 'ER_DUP_ENTRY' && err.code !== 'ER_DUP_KEYNAME') {
            console.warn(`[DATABASE INIT] Notice executing statement (${err.code}):`, err.message);
          }
        }
      }
      resultsLog.push(`Executed ${fileName}`);
      console.log(`[DATABASE INIT] Executed ${fileName} successfully.`);
    }

    try { await query('SET FOREIGN_KEY_CHECKS = 1'); } catch (e) {}

    const finalTables = await query("SHOW TABLES");
    const tableNames = finalTables.map(row => Object.values(row)[0]);

    console.log('[DATABASE INIT] Database initialization complete! Total tables:', tableNames.length);
    return { success: true, message: 'Database initialized successfully', tablesCount: tableNames.length, tables: tableNames, log: resultsLog };
  } catch (error) {
    console.error('[DATABASE INIT] Error during database initialization:', error);
    return { success: false, error: error.message };
  }
}
