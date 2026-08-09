const mysql = require('mysql2');
const config = require('../database/config.mjs').default || require('../database/config.mjs');

const db = mysql.createConnection(config);

db.query('UPDATE employees SET id = 13 WHERE id = 2147483647', (err, res) => {
  if (err) {
    console.error('Error updating id:', err);
  } else {
    console.log('Successfully updated employee id 2147483647 to 13:', res);
  }
  
  db.query('ALTER TABLE employees AUTO_INCREMENT = 14', (err2, res2) => {
    if (err2) {
      console.error('Error resetting auto_increment:', err2);
    } else {
      console.log('Successfully reset auto_increment to 14:', res2);
    }
    db.end();
  });
});
