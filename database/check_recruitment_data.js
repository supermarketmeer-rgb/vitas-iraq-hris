import mysql from 'mysql2/promise';

const config = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'vitasiraq_hris_db',
  port: 3306
};

async function checkRecruitmentData() {
  console.log('Checking recruitment tables and data...\n');
  
  try {
    const connection = await mysql.createConnection(config);
    
    // Check job vacancies
    console.log('=== JOB VACANCIES ===');
    const [jobVacancies] = await connection.execute('SELECT COUNT(*) as count FROM job_vacancies');
    console.log(`Total job vacancies: ${jobVacancies[0].count}`);
    
    if (jobVacancies[0].count > 0) {
      const [jobs] = await connection.execute(`
        SELECT id, title, department, location, type, experience_years, status, candidates_count 
        FROM job_vacancies 
        ORDER BY id
      `);
      console.log('\nJob Vacancies:');
      console.table(jobs);
    }
    
    // Check candidates
    console.log('\n=== CANDIDATES ===');
    const [candidates] = await connection.execute('SELECT COUNT(*) as count FROM candidates');
    console.log(`Total candidates: ${candidates[0].count}`);
    
    if (candidates[0].count > 0) {
      const [cands] = await connection.execute(`
        SELECT id, full_name, email, job_title, stage, rating, experience_years 
        FROM candidates 
        ORDER BY id
      `);
      console.log('\nCandidates:');
      console.table(cands);
    }
    
    // Check table structures
    console.log('\n=== TABLE STRUCTURES ===');
    console.log('\nJob Vacancies Table Structure:');
    const [jobColumns] = await connection.execute('DESCRIBE job_vacancies');
    console.table(jobColumns);
    
    console.log('\nCandidates Table Structure:');
    const [candColumns] = await connection.execute('DESCRIBE candidates');
    console.table(candColumns);
    
    await connection.end();
    console.log('\n✓ Verification completed successfully!');
    
  } catch (error) {
    console.error('✗ Verification failed:', error.message);
    process.exit(1);
  }
}

checkRecruitmentData();
