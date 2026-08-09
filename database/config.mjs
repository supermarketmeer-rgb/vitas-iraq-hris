export default {
  host: process.env.DB_HOST || 'mysql.railway.internal',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'aQmlNfCnYqCrDaEZApotwUWmnapYQUGx',
  database: process.env.DB_NAME || 'railway',
  port: parseInt(process.env.DB_PORT) || 3306,
  connectTimeout: 10000
};
