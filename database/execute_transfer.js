import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const sourceConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'vitas_hris',
  port: 3306
};

const targetConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'vitasiraq_hris_db',
  port: 3306
};

async function executeTransfer() {
  console.log('Starting recruitment and training tables transfer...');
  
  try {
    // Read the SQL script
    const sqlScript = fs.readFileSync(
      path.join(__dirname, 'transfer_recruitment_tables.sql'),
      'utf8'
    );

    // Connect to MySQL
    console.log('Connecting to MySQL...');
    const connection = await mysql.createConnection(sourceConfig);
    
    console.log('Executing transfer script...');
    
    // Split the script into individual statements
    const statements = sqlScript
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        await connection.execute(statement);
        console.log('✓ Executed statement successfully');
      } catch (error) {
        if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.code === 'ER_DUP_ENTRY') {
          console.log('⚠ Statement skipped (table exists or duplicate entry):', error.message);
        } else {
          console.error('✗ Error executing statement:', error.message);
          throw error;
        }
      }
    }

    await connection.end();
    console.log('✓ Transfer completed successfully!');
    
  } catch (error) {
    console.error('✗ Transfer failed:', error.message);
    process.exit(1);
  }
}

executeTransfer();
