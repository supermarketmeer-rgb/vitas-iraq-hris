import mysql from 'mysql2/promise';

const config = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'vitasiraq_hris_db',
  port: 3306
};

async function checkTransfer() {
  console.log('Checking transferred data in vitasiraq_hris_db...\n');
  
  try {
    const connection = await mysql.createConnection(config);
    
    // Check job vacancies
    const [jobVacancies] = await connection.execute('SELECT COUNT(*) as count FROM job_vacancies');
    console.log(`✓ Job Vacancies: ${jobVacancies[0].count} records`);
    
    if (jobVacancies[0].count > 0) {
      const [jobs] = await connection.execute('SELECT id, title, department, status FROM job_vacancies LIMIT 5');
      console.log('  Sample records:');
      jobs.forEach(job => {
        console.log(`    - ${job.id}: ${job.title} (${job.department}) - ${job.status}`);
      });
    }
    
    // Check candidates
    const [candidates] = await connection.execute('SELECT COUNT(*) as count FROM candidates');
    console.log(`\n✓ Candidates: ${candidates[0].count} records`);
    
    if (candidates[0].count > 0) {
      const [cands] = await connection.execute('SELECT id, full_name, email, stage FROM candidates LIMIT 5');
      console.log('  Sample records:');
      cands.forEach(cand => {
        console.log(`    - ${cand.id}: ${cand.full_name} (${cand.email}) - ${cand.stage}`);
      });
    }
    
    await connection.end();
    console.log('\n✓ Transfer verification completed successfully!');
    
  } catch (error) {
    console.error('✗ Verification failed:', error.message);
    process.exit(1);
  }
}

checkTransfer();
