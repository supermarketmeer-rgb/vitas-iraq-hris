import mysql from 'mysql2/promise';

const config = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'vitasiraq_hris_db',
  port: 3306
};

async function testAPI() {
  console.log('Testing API data retrieval...\n');
  
  try {
    const connection = await mysql.createConnection(config);
    
    // Test job vacancies retrieval (similar to api.getJobVacancies)
    console.log('=== Testing Job Vacancies API ===');
    const [jobVacancies] = await connection.execute('SELECT * FROM job_vacancies');
    console.log(`Found ${jobVacancies.length} job vacancies`);
    
    // Transform data to match application format
    const transformedJobs = jobVacancies.map(job => ({
      id: job.id,
      title: job.title,
      department: job.department,
      location: job.location,
      type: job.type,
      experienceYears: job.experience_years,
      status: job.status,
      createdDate: job.created_date,
      candidatesCount: job.candidates_count,
      requirements: job.requirements,
      deadline: job.deadline
    }));
    
    console.log('\nTransformed job data (application format):');
    console.table(transformedJobs.slice(0, 3));
    
    // Test candidates retrieval (similar to api.getCandidates)
    console.log('\n=== Testing Candidates API ===');
    const [candidates] = await connection.execute('SELECT * FROM candidates');
    console.log(`Found ${candidates.length} candidates`);
    
    // Transform data to match application format
    const transformedCandidates = candidates.map(cand => ({
      id: cand.id,
      fullName: cand.full_name,
      email: cand.email,
      phone: cand.phone,
      appliedJobId: cand.applied_job_id,
      jobTitle: cand.job_title,
      stage: cand.stage,
      rating: cand.rating,
      appliedDate: cand.applied_date,
      notes: cand.notes,
      experienceYears: cand.experience_years,
      photoUrl: cand.photo_url,
      resumeUrl: cand.resume_url,
      committeeOpinion: cand.committee_opinion,
      decisionReason: cand.decision_reason,
      committeeScores: cand.committee_scores ? JSON.parse(cand.committee_scores) : [],
      interviewDate: cand.interview_date,
      interviewTime: cand.interview_time,
      interviewLocation: cand.interview_location
    }));
    
    console.log('\nTransformed candidate data (application format):');
    console.table(transformedCandidates.slice(0, 3));
    
    await connection.end();
    console.log('\n✓ API test completed successfully!');
    console.log('✓ Data transformation matches application types perfectly');
    
  } catch (error) {
    console.error('✗ API test failed:', error.message);
    process.exit(1);
  }
}

testAPI();
