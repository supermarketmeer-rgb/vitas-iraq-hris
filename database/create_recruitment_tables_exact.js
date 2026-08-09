import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'vitasiraq_hris_db',
  port: 3306
};

async function createRecruitmentTables() {
  console.log('Creating recruitment tables that exactly match the application types...\n');
  
  try {
    const connection = await mysql.createConnection(config);
    
    // Read the SQL script
    const sqlScript = fs.readFileSync(
      path.join(__dirname, 'create_recruitment_tables_exact.sql'),
      'utf8'
    );

    console.log('Executing SQL script...');
    
    // Split the script into individual statements
    const statements = sqlScript
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        const [result] = await connection.execute(statement);
        
        // Check if this is a SELECT statement that returns data
        if (Array.isArray(result) && result.length > 0) {
          console.log('\nQuery Result:');
          console.table(result);
        } else if (result && result.affectedRows !== undefined) {
          console.log(`✓ Executed: ${result.affectedRows} rows affected`);
        } else {
          console.log('✓ Executed successfully');
        }
      } catch (error) {
        if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.code === 'ER_DUP_ENTRY') {
          console.log('⚠ Statement skipped (table exists or duplicate entry)');
        } else {
          console.error('✗ Error executing statement:', error.message);
          throw error;
        }
      }
    }

    await connection.end();
    console.log('\n✓ Recruitment tables created and populated successfully!');
    
  } catch (error) {
    console.error('✗ Creation failed:', error.message);
    process.exit(1);
  }
}

createRecruitmentTables();
