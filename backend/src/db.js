import mysql from 'mysql2/promise'

export function createPoolFromEnv() {
  const host = process.env.MYSQL_HOST || 'localhost'
  const port = Number(process.env.MYSQL_PORT || 3306)
  const user = process.env.MYSQL_USER || 'root'
  const password = process.env.MYSQL_PASSWORD || ''
  const database = process.env.MYSQL_DATABASE || 'websekolah_2026'

  return mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true,
    dateStrings: true,
  })
}

export async function queryOne(pool, sql, params = []) {
  const [rows] = await pool.query(sql, params)
  return Array.isArray(rows) && rows.length ? rows[0] : null
}

