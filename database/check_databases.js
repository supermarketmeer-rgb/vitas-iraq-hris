import mysql from 'mysql2/promise';

const config = {
  host: 'localhost',
  user: 'root',
  password: '',
  port: 3306
};

async function checkDatabases() {
  console.log('Checking available MySQL databases...\n');
  
  try {
    const connection = await mysql.createConnection(config);
    
    const [databases] = await connection.execute('SHOW DATABASES');
    console.log(`Found ${databases.length} databases:`);
    databases.forEach((db, index) => {
      console.log(`  ${index + 1}. ${Object.values(db)[0]}`);
    });
    
    await connection.end();
    
  } catch (error) {
    console.error('✗ Check failed:', error.message);
    process.exit(1);
  }
}

checkDatabases();
