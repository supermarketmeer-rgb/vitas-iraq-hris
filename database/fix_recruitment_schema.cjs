const mysql = require('mysql2/promise');
const config = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'vitasiraq_hris_db'
};

async function fixSchema() {
  try {
    const connection = await mysql.createConnection(config);
    console.log('Connected to MySQL database vitasiraq_hris_db');

    // 1. Modify candidates table stage column from strict ENUM to VARCHAR(255)
    await connection.execute("ALTER TABLE candidates MODIFY COLUMN stage VARCHAR(255) DEFAULT 'استلام الطلبات'");
    console.log('✓ Updated candidates.stage to VARCHAR(255)');

    // 2. Modify candidates table resume_url to LONGTEXT
    await connection.execute("ALTER TABLE candidates MODIFY COLUMN resume_url LONGTEXT");
    console.log('✓ Updated candidates.resume_url to LONGTEXT');

    // 3. Add missing columns to candidates table if not exist
    const addCols = [
      "second_interview_date DATE",
      "second_interview_time TIME",
      "second_interview_location VARCHAR(255)",
      "second_interview_notes TEXT",
      "added_to_directory TINYINT(1) DEFAULT 0",
      "employee_id VARCHAR(50)"
    ];

    for (const colDef of addCols) {
      try {
        await connection.execute(`ALTER TABLE candidates ADD COLUMN ${colDef}`);
        console.log(`✓ Added column: ${colDef.split(' ')[0]}`);
      } catch (err) {
        if (!err.message.includes('Duplicate column')) {
          console.warn(`Column warning for ${colDef}:`, err.message);
        }
      }
    }

    // 4. Modify job_vacancies table status & type columns to VARCHAR(50)
    await connection.execute("ALTER TABLE job_vacancies MODIFY COLUMN status VARCHAR(50) DEFAULT 'مفتوحة'");
    console.log('✓ Updated job_vacancies.status to VARCHAR(50) DEFAULT مفتوحة');

    await connection.execute("ALTER TABLE job_vacancies MODIFY COLUMN type VARCHAR(50) DEFAULT 'دوام كامل'");
    console.log('✓ Updated job_vacancies.type to VARCHAR(50)');

    await connection.end();
    console.log('Schema migration completed successfully!');
  } catch (err) {
    console.error('Migration error:', err);
  }
}

fixSchema();
