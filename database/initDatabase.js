import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initDatabase(pool) {
  const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      pool.query(sql, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  };

  try {
    console.log('[DATABASE INIT] Checking database tables...');

    // Check if core tables already exist
    const tables = await query("SHOW TABLES LIKE 'employees'");
    if (tables && tables.length > 0) {
      console.log('[DATABASE INIT] Core tables already exist. Skipping full schema creation.');
      return;
    }

    console.log('[DATABASE INIT] Base tables missing. Creating full database schema and seeding data...');

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
      
      // Remove comments and split statements
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
          // Ignore duplicate entry or table already exists errors during initialization
          if (err.code !== 'ER_TABLE_EXISTS_ERROR' && err.code !== 'ER_DUP_ENTRY' && err.code !== 'ER_DUP_KEYNAME') {
            console.warn(`[DATABASE INIT] Notice executing statement (${err.code}):`, err.message);
          }
        }
      }
      console.log(`[DATABASE INIT] Executed ${fileName} successfully.`);
    }

    console.log('[DATABASE INIT] Database initialization and seed data complete!');
  } catch (error) {
    console.error('[DATABASE INIT] Error during database initialization:', error);
  }
}
