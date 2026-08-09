import mysql from 'mysql2/promise';

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

async function transferData() {
  console.log('Transferring recruitment data from vitas_hris to vitasiraq_hris_db...\n');
  
  try {
    const sourceConnection = await mysql.createConnection(sourceConfig);
    const targetConnection = await mysql.createConnection(targetConfig);
    
    // Transfer job vacancies
    console.log('Transferring job vacancies...');
    const [jobVacancies] = await sourceConnection.execute('SELECT * FROM job_vacancies');
    console.log(`Found ${jobVacancies.length} job vacancies in source`);
    
    if (jobVacancies.length > 0) {
      for (const job of jobVacancies) {
        await targetConnection.execute(
          `INSERT INTO job_vacancies (id, title, department, location, type, experience_years, status, requirements, deadline, created_date, candidates_count, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE title = VALUES(title), department = VALUES(department), status = VALUES(status)`,
          [
            job.id,
            job.title,
            job.department,
            job.location,
            job.type || 'Full-time',
            job.experience_years || 2,
            job.status || 'Open',
            job.requirements,
            job.deadline,
            job.created_date,
            job.candidates_count || 0,
            job.created_at,
            job.updated_at
          ]
        );
      }
      console.log(`✓ Transferred ${jobVacancies.length} job vacancies`);
    } else {
      console.log('No job vacancies found in source database');
    }
    
    // Transfer candidates
    console.log('\nTransferring candidates...');
    const [candidates] = await sourceConnection.execute('SELECT * FROM candidates');
    console.log(`Found ${candidates.length} candidates in source`);
    
    if (candidates.length > 0) {
      for (const candidate of candidates) {
        // Handle full_name if it doesn't exist in source
        const fullName = candidate.full_name || 
                        `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim();
        
        await targetConnection.execute(
          `INSERT INTO candidates (id, full_name, email, phone, applied_job_id, job_title, stage, rating, experience_years, notes, photo_url, resume_url, committee_opinion, decision_reason, committee_scores, interview_date, interview_time, interview_location, applied_date, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), email = VALUES(email), stage = VALUES(stage)`,
          [
            candidate.id,
            fullName,
            candidate.email,
            candidate.phone,
            candidate.applied_job_id,
            candidate.job_title,
            candidate.stage || 'Applied',
            candidate.rating || 5,
            candidate.experience_years || 0,
            candidate.notes,
            candidate.photo_url,
            candidate.resume_url,
            candidate.committee_opinion,
            candidate.decision_reason,
            candidate.committee_scores ? JSON.stringify(candidate.committee_scores) : null,
            candidate.interview_date,
            candidate.interview_time,
            candidate.interview_location,
            candidate.applied_date,
            candidate.created_at,
            candidate.updated_at
          ]
        );
      }
      console.log(`✓ Transferred ${candidates.length} candidates`);
    } else {
      console.log('No candidates found in source database');
    }
    
    await sourceConnection.end();
    await targetConnection.end();
    
    console.log('\n✓ Data transfer completed successfully!');
    
  } catch (error) {
    console.error('✗ Transfer failed:', error.message);
    process.exit(1);
  }
}

transferData();
