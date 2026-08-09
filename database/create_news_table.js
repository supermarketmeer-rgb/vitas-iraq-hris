import mysql from 'mysql2';
import fs from 'fs';
import config from './config.mjs';

const db = mysql.createPool({
  ...config,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const query = (sql, params) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

async function createNewsTable() {
  try {
    console.log('Connected to MySQL database: vitasiraq_hris_db');
    
    // Read and execute SQL file
    const sql = fs.readFileSync('./database/company_news_table.sql', 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await query(statement);
        console.log('Executed statement successfully');
      }
    }
    
    console.log('✅ Company news table created successfully with sample data!');
    
    // Verify the table
    const countResult = await query('SELECT COUNT(*) as count FROM company_news');
    console.log(`📰 Total news items: ${countResult[0].count}`);
    
    // Show sample data
    const news = await query('SELECT * FROM company_news LIMIT 5');
    console.log('\n=== Sample News Data ===');
    news.forEach(item => {
      console.log(`ID: ${item.id}, Title (AR): ${item.title_ar}, Status: ${item.status}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    db.end();
  }
}

createNewsTable();