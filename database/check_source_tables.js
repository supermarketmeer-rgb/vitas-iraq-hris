import mysql from 'mysql2/promise';

const config = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'vitas_hris',
  port: 3306
};

async function checkSourceTables() {
  console.log('Checking tables in vitas_hris database...\n');
  
  try {
    const connection = await mysql.createConnection(config);
    
    const [tables] = await connection.execute('SHOW TABLES');
    console.log(`Found ${tables.length} tables in vitas_hris:`);
    tables.forEach((table, index) => {
      console.log(`  ${index + 1}. ${Object.values(table)[0]}`);
    });
    
    await connection.end();
    
  } catch (error) {
    console.error('✗ Check failed:', error.message);
    process.exit(1);
  }
}

checkSourceTables();
