import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function executeTransfer() {
  console.log('Starting recruitment and training tables transfer...');
  
  try {
    const sqlScriptPath = path.join(__dirname, 'transfer_recruitment_tables.sql');
    
    console.log('Executing SQL script using MySQL command line...');
    
    // Execute the SQL script using mysql command line
    const { stdout, stderr } = await execPromise(
      `mysql -u root -e "source ${sqlScriptPath.replace(/\\/g, '/')}"`
    );
    
    if (stdout) console.log('Output:', stdout);
    if (stderr) console.log('Errors/Warnings:', stderr);
    
    console.log('✓ Transfer completed successfully!');
    
  } catch (error) {
    console.error('✗ Transfer failed:', error.message);
    console.log('\nAlternative: You can manually run the SQL script in phpMyAdmin:');
    console.log('1. Open phpMyAdmin');
    console.log('2. Select vitasiraq_hris_db database');
    console.log('3. Click on "SQL" tab');
    console.log('4. Copy and paste the content of: database/transfer_recruitment_tables.sql');
    console.log('5. Click "Go" to execute');
    process.exit(1);
  }
}

executeTransfer();
