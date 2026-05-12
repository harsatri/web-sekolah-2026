import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { createPoolFromEnv } from '../db.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..')

async function runSqlFile(pool, relativePath) {
  const sqlPath = path.resolve(rootDir, relativePath)
  const sql = await fs.readFile(sqlPath, 'utf8')
  await pool.query(sql)
}

async function main() {
  const pool = createPoolFromEnv()
  try {
    await runSqlFile(pool, 'db/schema.sql')
    await runSqlFile(pool, 'db/seed.sql')
    console.log('DB setup selesai.')
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

