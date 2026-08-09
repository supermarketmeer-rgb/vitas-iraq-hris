const mysql = require('mysql2');
const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'vitasiraq_hris_db' });

const queries = [
  `CREATE TABLE IF NOT EXISTS branches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NULL,
    name_en VARCHAR(255) NULL,
    name_ar VARCHAR(255) NULL,
    address TEXT NULL,
    city VARCHAR(100) NULL,
    country VARCHAR(100) DEFAULT 'Iraq',
    phone VARCHAR(50) NULL,
    email VARCHAR(255) NULL,
    status VARCHAR(50) DEFAULT 'Active',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  `CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NULL,
    name_en VARCHAR(255) NULL,
    name_ar VARCHAR(255) NULL,
    description TEXT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  `CREATE TABLE IF NOT EXISTS positions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NULL,
    name_en VARCHAR(255) NULL,
    name_ar VARCHAR(255) NULL,
    description TEXT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  `CREATE TABLE IF NOT EXISTS contract_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name_en VARCHAR(255) NULL,
    name_ar VARCHAR(255) NULL,
    status VARCHAR(50) DEFAULT 'Active',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  `CREATE TABLE IF NOT EXISTS status_changes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name_en VARCHAR(255) NULL,
    name_ar VARCHAR(255) NULL,
    status VARCHAR(50) DEFAULT 'Active',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  `CREATE TABLE IF NOT EXISTS trainings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name_en VARCHAR(255) NULL,
    name_ar VARCHAR(255) NULL,
    status VARCHAR(50) DEFAULT 'Active',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
];

async function run() {
  for (const q of queries) {
    await new Promise(res => pool.query(q, (err, r) => {
      if (err) console.error(err.message);
      else console.log('OK query');
      res();
    }));
  }
  process.exit();
}
run();
