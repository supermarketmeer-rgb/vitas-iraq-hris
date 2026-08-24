const isRailway = !!(process.env.RAILWAY_ENVIRONMENT || process.env.MYSQLHOST);

export default {
  host: isRailway ? (process.env.MYSQLHOST || process.env.DB_HOST || 'mysql.railway.internal') : (process.env.DB_HOST || 'localhost'),
  user: isRailway ? (process.env.MYSQLUSER || process.env.DB_USER || 'root') : (process.env.DB_USER || 'root'),
  password: isRailway ? (process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '') : (process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : ''),
  database: isRailway ? (process.env.MYSQLDATABASE || process.env.DB_NAME || 'railway') : (process.env.DB_NAME || 'vitasiraq_hris_db'),
  port: parseInt(isRailway ? (process.env.MYSQLPORT || process.env.DB_PORT || 3306) : (process.env.DB_PORT || 3306)),
  connectTimeout: 15000
};
