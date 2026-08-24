export default {
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'mysql.railway.internal',
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || 'aQmlNfCnYqCrDaEZApotwUWmnapYQUGx',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'railway',
  port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT) || 3306,
  connectTimeout: 15000
};
