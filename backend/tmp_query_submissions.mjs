import dotenv from 'dotenv'
import mysql from 'mysql2/promise'

dotenv.config({ path: 'C:/Users/upgra/Documents/trae_projects/WebSekolah-2026/backend/.env' })
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'websekolah_2026',
  multipleStatements: true,
  dateStrings: true,
})

try {
  const [countRows] = await pool.query('SELECT COUNT(*) AS total FROM eligibility_submissions')
  console.log('TOTAL_SUBMISSIONS', countRows[0].total)
  const [rows] = await pool.query('SELECT id, submittedAt, userEmail, userName, input, result, recommendations FROM eligibility_submissions ORDER BY submittedAt DESC LIMIT 10')
  for (const row of rows) {
    console.log('ROW', JSON.stringify(row))
  }
} catch (err) {
  console.error('DB_ERROR', err.message)
  process.exitCode = 1
} finally {
  await pool.end()
}
