const mysql = require('mysql2/promise');

async function createCalendarTables() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'vitasiraq_hris_db',
    port: 3306
  });

  try {
    console.log('Creating calendar tables...');

    // 1. company_holidays
    await conn.query(`
      CREATE TABLE IF NOT EXISTS company_holidays (
        id VARCHAR(50) PRIMARY KEY,
        holiday_id VARCHAR(50),
        name_ar VARCHAR(255) NOT NULL,
        name_en VARCHAR(255) NOT NULL,
        description_ar TEXT,
        description_en TEXT,
        holiday_date DATE NOT NULL,
        is_recurring TINYINT(1) DEFAULT 1,
        holiday_type VARCHAR(50) DEFAULT 'national',
        is_paid TINYINT(1) DEFAULT 1,
        created_by VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✓ Created company_holidays table');

    // 2. company_events
    await conn.query(`
      CREATE TABLE IF NOT EXISTS company_events (
        id VARCHAR(50) PRIMARY KEY,
        event_id VARCHAR(50),
        title_ar VARCHAR(255) NOT NULL,
        title_en VARCHAR(255) NOT NULL,
        description_ar TEXT,
        description_en TEXT,
        event_type VARCHAR(50),
        event_date DATE NOT NULL,
        start_time TIME,
        end_time TIME,
        location VARCHAR(255),
        location_ar VARCHAR(255),
        all_day TINYINT(1) DEFAULT 0,
        is_recurring TINYINT(1) DEFAULT 0,
        recurrence_pattern VARCHAR(50),
        recurrence_end_date DATE,
        department VARCHAR(100),
        target_audience VARCHAR(100),
        priority VARCHAR(50) DEFAULT 'medium',
        status VARCHAR(50) DEFAULT 'scheduled',
        created_by VARCHAR(50),
        updated_by VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✓ Created company_events table');

    // 3. event_attendees
    await conn.query(`
      CREATE TABLE IF NOT EXISTS event_attendees (
        id VARCHAR(50) PRIMARY KEY,
        event_id VARCHAR(50) NOT NULL,
        employee_id VARCHAR(50) NOT NULL,
        attendance_status VARCHAR(50) DEFAULT 'invited',
        response_date TIMESTAMP NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✓ Created event_attendees table');

    // 4. company_holiday_branches
    await conn.query(`
      CREATE TABLE IF NOT EXISTS company_holiday_branches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        holiday_id VARCHAR(50) NOT NULL,
        branch_id VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✓ Created company_holiday_branches table');

    console.log('All calendar tables successfully created!');
  } catch (err) {
    console.error('Error creating tables:', err.message);
  } finally {
    await conn.end();
  }
}

createCalendarTables();
