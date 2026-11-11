const mysql = require('mysql2/promise');

// A connection pool reuses a small number of MySQL connections instead of
// opening a new connection for every request. This is the standard way to
// connect Express to MySQL.
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hospital_management',

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  // Return DATE/DATETIME/TIMESTAMP columns as strings such as
  // "2026-02-20" and "2026-02-20 10:30:00". This avoids timezone surprises
  // when the API sends them to the browser.
  dateStrings: true,

  // Return DECIMAL columns (for example consultation_fee) as JavaScript
  // numbers instead of strings.
  decimalNumbers: true
});

// Used at startup so an incorrect .env file produces a clear message.
async function testConnection() {
  const connection = await pool.getConnection();
  try {
    await connection.query('SELECT 1');
  } finally {
    connection.release();
  }
}

// Small helper used after INSERT/UPDATE to return one row.
// The table and column names are always supplied by our own code (never by
// the browser), so interpolating them here is safe. Values still use `?`.
async function findById(table, idColumn, id) {
  const [rows] = await pool.query(
    `SELECT * FROM \`${table}\` WHERE \`${idColumn}\` = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

module.exports = { pool, testConnection, findById };
