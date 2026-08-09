import mysql from 'mysql2/promise';

const config = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'vitasiraq_hris_db',
  port: 3306
};

async function createTablesDirect() {
  console.log('Creating recruitment tables directly...\n');
  
  try {
    const connection = await mysql.createConnection(config);
    
    // Disable foreign key checks
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    console.log('✓ Foreign key checks disabled');
    
    // Drop existing tables
    await connection.execute('DROP TABLE IF EXISTS candidates');
    console.log('✓ Dropped candidates table if exists');
    
    await connection.execute('DROP TABLE IF EXISTS job_vacancies');
    console.log('✓ Dropped job_vacancies table if exists');
    
    // Create job_vacancies table
    console.log('\nCreating job_vacancies table...');
    await connection.execute(`
      CREATE TABLE job_vacancies (
          id VARCHAR(50) PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          department VARCHAR(255) NOT NULL,
          location VARCHAR(255) NOT NULL,
          type ENUM('دوام كامل', 'دوام جزئي', 'عقد') NOT NULL DEFAULT 'دوام كامل',
          experience_years INT NOT NULL DEFAULT 2,
          status ENUM('مفتوحة', 'مغلقة', 'مسودة') NOT NULL DEFAULT 'مغلقة',
          created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          candidates_count INT NOT NULL DEFAULT 0,
          requirements TEXT,
          deadline DATE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_status (status),
          INDEX idx_department (department),
          INDEX idx_location (location)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ job_vacancies table created');
    
    // Create candidates table
    console.log('\nCreating candidates table...');
    await connection.execute(`
      CREATE TABLE candidates (
          id VARCHAR(50) PRIMARY KEY,
          full_name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          phone VARCHAR(50) NOT NULL,
          applied_job_id VARCHAR(50),
          job_title VARCHAR(255) NOT NULL,
          stage ENUM('تم التقديم', 'الفحص المبدئي', 'المقابلة', 'العرض الوظيفي', 'تم التعيين', 'مرفوض') NOT NULL DEFAULT 'تم التقديم',
          rating INT NOT NULL DEFAULT 5,
          applied_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          notes TEXT,
          experience_years INT,
          photo_url TEXT,
          resume_url TEXT,
          committee_opinion TEXT,
          decision_reason TEXT,
          committee_scores JSON,
          interview_date DATE,
          interview_time TIME,
          interview_location VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (applied_job_id) REFERENCES job_vacancies(id) ON DELETE SET NULL,
          INDEX idx_stage (stage),
          INDEX idx_applied_job_id (applied_job_id),
          INDEX idx_email (email),
          INDEX idx_rating (rating)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ candidates table created');
    
    // Re-enable foreign key checks
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✓ Foreign key checks re-enabled');
    
    // Insert sample data
    console.log('\nInserting sample job vacancies...');
    await connection.execute(`
      INSERT INTO job_vacancies (id, title, department, location, type, experience_years, status, created_date, candidates_count, requirements, deadline) VALUES
      ('job-001', 'مسؤول ائتمان أول', 'إدارة التمويل الأصغر والعمليات', 'فرع بغداد - الكرادة', 'دوام كامل', 3, 'مغلقة', NOW(), 0, 'خبرة 3 سنوات في مجال التمويل الأصغر، مهارات تواصل ممتازة، إجادة اللغة العربية والإنجليزية', '2025-12-31'),
      ('job-002', 'مسؤول ائتمان', 'القروض والائتمان', 'فرع البصرة', 'دوام كامل', 2, 'مغلقة', NOW(), 0, 'خبرة سنتين في الإقراض، مهارات تحليل مالي، إجادة استخدام الكمبيوتر', '2025-12-31'),
      ('job-003', 'محاسب', 'المالية والمحاسبة', 'فرع بغداد - المنصور', 'دوام كامل', 2, 'مغلقة', NOW(), 0, 'شهادة محاسبة، خبرة سنتين، إجادة برامج المحاسبة', '2025-12-31'),
      ('job-004', 'موظف موارد بشرية', 'الموارد البشرية', 'المقر الرئيسي - بغداد', 'دوام كامل', 1, 'مغلقة', NOW(), 0, 'شهادة في إدارة الأعمال أو الموارد البشرية، مهارات تواصل قوية', '2025-12-31'),
      ('job-005', 'مسؤول IT', 'التقنية والأنظمة', 'المقر الرئيسي - بغداد', 'دوام كامل', 3, 'مغلقة', NOW(), 0, 'خبرة 3 سنوات في دعم الأنظمة، شهادات تقنية، إجادة اللغة الإنجليزية', '2025-12-31'),
      ('job-006', 'مسؤول استحصال', 'الاستحصال والتحصيل', 'فرع ذي قار', 'دوام كامل', 2, 'مغلقة', NOW(), 0, 'خبرة في التحصيل، مهارات تفاوض، قدرة على العمل تحت الضغط', '2025-12-31'),
      ('job-007', 'مسؤول تسويق', 'التسويق والمبيعات', 'فرع بغداد - الكرادة', 'دوام كامل', 2, 'مغلقة', NOW(), 0, 'خبرة في التسويق، مهارات عرض تقديمي، إجادة اللغات', '2025-12-31'),
      ('job-008', 'موظف عمليات', 'العمليات', 'فرع ميسان', 'دوام جزئي', 1, 'مغلقة', NOW(), 0, 'شهادة ثانوية فما فوق، مهارات تنظيمية', '2025-12-31')
    `);
    console.log('✓ 8 job vacancies inserted');
    
    console.log('\nInserting sample candidates...');
    await connection.execute(`
      INSERT INTO candidates (id, full_name, email, phone, applied_job_id, job_title, stage, rating, applied_date, notes, experience_years, photo_url, committee_scores) VALUES
      ('cand-001', 'أحمد محمد علي', 'ahmed.mohammed@email.com', '07701234567', 'job-001', 'مسؤول ائتمان أول', 'تم التقديم', 5, NOW(), 'مرشح واعد، لديه خبرة في البنوك', 3, NULL, '[{"name": "المقابلة الفنية", "score": 85}, {"name": "المقابلة الشخصية", "score": 90}]'),
      ('cand-002', 'فاطمة حسين خليل', 'fatima.hussein@email.com', '07801234567', 'job-003', 'محاسب', 'الفحص المبدئي', 4, NOW(), 'متخرجة حديثاً، مؤهلات جيدة', 1, NULL, '[{"name": "المقابلة الفنية", "score": 75}, {"name": "المقابلة الشخصية", "score": 80}]'),
      ('cand-003', 'علي كريم جاسم', 'ali.karim@email.com', '07901234567', 'job-002', 'مسؤول ائتمان', 'المقابلة', 4, NOW(), 'خبرة سنتين في شركة تمويل', 2, NULL, '[{"name": "المقابلة الفنية", "score": 80}, {"name": "المقابلة الشخصية", "score": 85}]'),
      ('cand-004', 'سارة أحمد حسن', 'sara.ahmed@email.com', '07701234568', 'job-004', 'موظف موارد بشرية', 'تم التقديم', 5, NOW(), 'مهارات تواصل ممتازة', 1, NULL, NULL),
      ('cand-005', 'محمد صادق علي', 'mohammed.sadiq@email.com', '07801234568', 'job-005', 'مسؤول IT', 'الفحص المبدئي', 4, NOW(), 'شهادات A+ و Network+', 3, NULL, '[{"name": "المقابلة الفنية", "score": 88}, {"name": "المقابلة الشخصية", "score": 82}]')
    `);
    console.log('✓ 5 candidates inserted');
    
    await connection.end();
    console.log('\n✓ All recruitment tables created and populated successfully!');
    
  } catch (error) {
    console.error('✗ Creation failed:', error.message);
    process.exit(1);
  }
}

createTablesDirect();
