import config from '../database/config.mjs';
import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(config);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS contract_clauses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      contract_type_id INT NOT NULL,
      clause_number INT DEFAULT 1,
      title_ar VARCHAR(255) DEFAULT '',
      text_ar TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_contract_type (contract_type_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('SUCCESS: Table contract_clauses exists or created.');
  await conn.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
