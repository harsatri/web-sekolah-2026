import mysql from 'mysql2/promise'

const IS_DEVELOPMENT = process.env.NODE_ENV === 'development' || !process.env.MYSQL_HOST?.includes('.')

export function createPoolFromEnv() {
  const host = process.env.MYSQL_HOST || 'localhost'
  const port = Number(process.env.MYSQL_PORT || 3306)
  const user = process.env.MYSQL_USER || 'root'
  const password = process.env.MYSQL_PASSWORD || ''
  const database = process.env.MYSQL_DATABASE || 'websekolah_2026'
  const connectTimeout = Number(process.env.MYSQL_CONNECT_TIMEOUT || 3000) // 3 second timeout for dev

  // If database is unreachable in development, return a mock pool
  if (IS_DEVELOPMENT && process.env.MYSQL_HOST?.includes('192.168')) {
    console.warn('⚠️ Development mode: Using mock database (remote DB unreachable)')
    return createMockPool()
  }

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
  connectTimeout: connectTimeout, // Add connection timeout
  // hapus authPlugins dan ssl yang lama, ganti ini:
  authPlugins: {
    auth_gssapi_client: () => () => Buffer.alloc(0),
  },
  ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: false } : false,
})
}

// Mock pool for development when database is unreachable
function createMockPool() {
  return {
    query: async (sql, params = []) => {
      // Return empty arrays for SELECT queries
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        return [[], []]
      }
      // Return success for INSERT/UPDATE/DELETE
      return [{ affectedRows: 0 }, []]
    },
    getConnection: async () => {
      return {
        query: async (sql, params = []) => {
          if (sql.trim().toUpperCase().startsWith('SELECT')) {
            return [[], []]
          }
          return [{ affectedRows: 0 }, []]
        },
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {},
        release: () => {},
      }
    },
  }
}

export async function queryOne(pool, sql, params = []) {
  try {
    const [rows] = await pool.query(sql, params)
    return Array.isArray(rows) && rows.length ? rows[0] : null
  } catch (err) {
    console.warn(`Query failed (will return null): ${err?.message}`)
    return null
  }
}

