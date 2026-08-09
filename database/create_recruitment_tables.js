import mysql from 'mysql2/promise';

const config = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'vitasiraq_hris_db',
  port: 3306
};

async function createTables() {
  console.log('Creating recruitment tables in vitasiraq_hris_db...\n');
  
  try {
    const connection = await mysql.createConnection(config);
    
    // Create job_vacancies table
    console.log('Creating job_vacancies table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS job_vacancies (
          id VARCHAR(50) PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          department VARCHAR(255),
          location VARCHAR(255),
          type ENUM('Full-time', 'Part-time', 'Contract', 'دوام كامل', 'دوام جزئي', 'عقد') NOT NULL,
          experience_years INT DEFAULT 2,
          status ENUM('Open', 'Closed', 'Draft', 'مفتوحة', 'مغلقة', 'مسودة') DEFAULT 'Open',
          requirements TEXT,
          deadline DATE,
          created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          candidates_count INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ job_vacancies table created');
    
    // Create candidates table
    console.log('Creating candidates table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS candidates (
          id VARCHAR(50) PRIMARY KEY,
          full_name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          phone VARCHAR(50),
          applied_job_id VARCHAR(50),
          job_title VARCHAR(255),
          stage ENUM('Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected', 'تم التقديم', 'الفحص المبدئي', 'المقابلة', 'العرض الوظيفي', 'تم التعيين', 'مرفوض') DEFAULT 'Applied',
          rating INT DEFAULT 5,
          experience_years INT DEFAULT 0,
          notes TEXT,
          photo_url TEXT,
          resume_url TEXT,
          committee_opinion TEXT,
          decision_reason TEXT,
          committee_scores JSON,
          interview_date DATE,
          interview_time TIME,
          interview_location VARCHAR(255),
          applied_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (applied_job_id) REFERENCES job_vacancies(id) ON DELETE SET NULL
      )
    `);
    console.log('✓ candidates table created');
    
    await connection.end();
    console.log('\n✓ All recruitment tables created successfully!');
    
  } catch (error) {
    console.error('✗ Table creation failed:', error.message);
    process.exit(1);
  }
}

createTables();
