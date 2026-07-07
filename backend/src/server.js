import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import cors from 'cors'
import express from 'express'
import multer from 'multer'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { createPoolFromEnv, queryOne } from './db.js'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json({ limit: '15mb' }))
const upload = multer({
  storage: multer.memoryStorage(),
  // ponytail: per-file cap only. Aggregate uploads growth is permanent user
  // content referenced in DB by URL — not safely deletable without a retention
  // policy. Add orphan-sweep/object-storage when product decides what's transient.
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB; bounds per-upload disk + memory
})

const pool = createPoolFromEnv()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const uploadsDir = path.resolve(rootDir, 'uploads')
const jwtSecret = process.env.JWT_SECRET || 'dev-only-jwt-secret-change-me'
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '12h'

app.use('/uploads', express.static(uploadsDir))

function normalizeFileName(rawName) {
  const cleaned = String(rawName || 'upload.jpg').toLowerCase().replace(/[^a-z0-9._-]/g, '-')
  if (cleaned.endsWith('.png') || cleaned.endsWith('.jpg') || cleaned.endsWith('.jpeg') || cleaned.endsWith('.webp')) {
    return cleaned
  }
  return `${cleaned}.jpg`
}

function getExtFromMime(mime) {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'jpg'
}

function parseDataUrlImage(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/)
  if (!match) return null
  const mime = match[1] === 'image/jpg' ? 'image/jpeg' : match[1]
  return {
    mime,
    buffer: Buffer.from(match[2], 'base64'),
  }
}

async function ensureSchoolOptionalColumns() {
  const statements = [
    'ALTER TABLE schools ADD COLUMN principalName VARCHAR(191) NULL',
    'ALTER TABLE schools ADD COLUMN monthlyTarget INT NULL',
    'ALTER TABLE schools ADD COLUMN graduationStats TEXT NULL',
    'ALTER TABLE schools ADD COLUMN galleryLink VARCHAR(255) NULL',
    'ALTER TABLE schools ADD COLUMN achievementDesc TEXT NULL',
    'ALTER TABLE schools ADD COLUMN programDetail TEXT NULL',
  ]
  for (const sql of statements) {
    try {
      await pool.query(sql)
    } catch (err) {
      if (err?.code !== 'ER_DUP_FIELDNAME') {
        // Silently ignore - might be mock database or unreachable
        return
      }
    }
  }
}

// Run migration without blocking startup
Promise.resolve()
  .then(() => ensureSchoolOptionalColumns())
  .catch(() => {
    // Silently ignore migration errors in development
  })

function buildAuthPayload(user) {
  return {
    id: Number(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    schoolId: user.schoolId != null ? Number(user.schoolId) : undefined,
    schoolName: user.schoolName ?? undefined,
  }
}

function signAuthToken(user) {
  return jwt.sign(buildAuthPayload(user), jwtSecret, { expiresIn: jwtExpiresIn })
}

function buildAuthResponse(user) {
  return {
    ...buildAuthPayload(user),
    token: signAuthToken(user),
  }
}

function getAuthTokenFromRequest(req) {
  const authorization = String(req.header('authorization') || '').trim()
  if (!authorization.toLowerCase().startsWith('bearer ')) return null
  const token = authorization.slice(7).trim()
  return token || null
}

// Wrapper to catch async errors in route handlers
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

async function getAuthFromRequest(req) {
  const token = getAuthTokenFromRequest(req)
  if (!token) return null

  try {
    const decoded = jwt.verify(token, jwtSecret)
    const id = decoded?.id != null && decoded.id !== '' ? Number(decoded.id) : undefined
    const email = String(decoded?.email || '').trim()
    if (!Number.isFinite(id) || !email) return null

    const user = await queryOne(
      pool,
      'SELECT id, name, email, role, active, schoolId, schoolName FROM users WHERE id = ?',
      [id],
    )
    if (!user) return null
    if (String(user.email || '').trim() !== email) return null
    if (Number(user.active) !== 1) return null

    // Harden tenant isolation: school_admin/school must have a valid schoolId
    if ((user.role === 'school_admin' || user.role === 'school') && (user.schoolId == null || !Number.isFinite(Number(user.schoolId)))) {
      return null
    }

    return buildAuthPayload(user)

  } catch {
    return null
  }
}

function sanitizeUser(row) {
  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    role: row.role,
    active: Number(row.active) === 1,
    schoolId: row.schoolId != null ? Number(row.schoolId) : undefined,
    schoolName: row.schoolName ?? undefined,
    lastLogin: row.lastLogin ?? undefined,
    createdAt: row.createdAt ?? undefined,
    updatedAt: row.updatedAt ?? undefined,
  }
}

async function requireAuth(req, res, next) {
  const auth = await getAuthFromRequest(req)
  if (!auth) return res.status(401).json({ message: 'Unauthorized' })
  req.auth = auth
  next()
}

function requireRole(roles) {
  return async (req, res, next) => {
    const auth = await getAuthFromRequest(req)
    if (!auth) return res.status(401).json({ message: 'Unauthorized' })
    if (!roles.includes(auth.role)) return res.status(403).json({ message: 'Forbidden' })
    req.auth = auth
    next()
  }
}

function okJson(res, payload) {
  res.json(payload)
}

app.get('/api/health', async (req, res) => {
  // Query pool directly (not queryOne) so DB errors surface as 503 instead of
  // being swallowed and reported as a healthy 200 — a masked DB outage is worse
  // than a visible one. DB-down here makes the compose healthcheck fail, which
  // gates nginx depends_on and any external monitor.
  try {
    const [rows] = await pool.query('SELECT 1 as ok')
    if (Array.isArray(rows) && rows[0]?.ok) return okJson(res, { ok: true, db: true })
    res.status(503).json({ ok: false, db: false })
  } catch {
    res.status(503).json({ ok: false, db: false })
  }
})

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body?.email || '').trim()
  const password = String(req.body?.password || '')
  if (!email || !password) return res.status(400).json({ message: 'Email dan password wajib diisi' })

  const user = await queryOne(
    pool,
    'SELECT id, name, email, password, role, active, schoolId, schoolName FROM users WHERE email = ?',
    [email],
  )
  if (!user) return res.status(401).json({ message: 'Email atau password salah' })

  const passwordMatch = await bcrypt.compare(password, user.password)
  if (!passwordMatch) return res.status(401).json({ message: 'Email atau password salah' })

  // school_admin pending/rejected: users.active diset 0.
  if (Number(user.active) === 0) {
    if (user.role === 'school_admin' && user.schoolId) {
      const school = await queryOne(pool, 'SELECT status FROM schools WHERE id = ?', [user.schoolId])
      if (school?.status === 'rejected') {
        return res.status(403).json({
          success: false,
          message: 'Registrasi sekolah ditolak oleh Super Admin.',
        })
      }
      return res.status(403).json({
        success: false,
        message: 'Akun sekolah sedang menunggu verifikasi Super Admin.',
      })
    }

    return res.status(403).json({ message: 'Akun Anda sedang dinonaktifkan' })
  }

  const nowIso = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await pool.query('UPDATE users SET lastLogin = ? WHERE id = ?', [nowIso, user.id])

  try {
    await pool.query(
      'INSERT INTO activity_logs (actorId, actorName, actorEmail, actorRole, type, description, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [Number(user.id), user.name, user.email, user.role, 'login', 'Login berhasil', 'success'],
    )
  } catch {
    // Abaikan kegagalan logging agar login utama tetap berjalan.
  }

  okJson(res, buildAuthResponse(user))
})


app.post('/api/auth/signup', async (req, res) => {
  const name = String(req.body?.name || '').trim()
  const email = String(req.body?.email || '').trim()
  const password = String(req.body?.password || '')
  if (!name || !email || !password) return res.status(400).json({ message: 'Data belum lengkap' })

  const exists = await queryOne(pool, 'SELECT id FROM users WHERE email = ?', [email])
  if (exists) return res.status(409).json({ message: 'Email sudah terdaftar' })

  const hashedPassword = await bcrypt.hash(password, 10)
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password, role, active) VALUES (?, ?, ?, ?, ?)',
    [name, email, hashedPassword, 'user', 1],
  )

  okJson(res, buildAuthResponse({ id: result.insertId, name, email, role: 'user', schoolId: null, schoolName: null }))
})

app.post('/api/auth/signup-school', async (req, res) => {
  const accountName = String(req.body?.accountName || '').trim()
  const email = String(req.body?.email || '').trim()
  const password = String(req.body?.password || '')
  const schoolName = String(req.body?.schoolName || '').trim()
  const district = String(req.body?.district || '').trim()
  const address = String(req.body?.address || '').trim()
  const contact = String(req.body?.contact || '').trim()
  const capacity = Number(req.body?.capacity) || 0
  const accreditationScore = Number(req.body?.accreditationScore) || 0
  const certifiedTeachers = Number(req.body?.certifiedTeachers) || 0

  if (!email || !password || !schoolName || !district || !address || !contact) {
    return res.status(400).json({ message: 'Data sekolah belum lengkap' })
  }

  const exists = await queryOne(pool, 'SELECT id FROM users WHERE email = ?', [email])
  if (exists) return res.status(409).json({ message: 'Email sudah terdaftar' })

  // Validasi duplikasi sekolah: nama sekolah + kecamatan (kecamatan/district)
  // - Case-insensitive
  // - Mengabaikan spasi awal/akhir
  const schoolExists = await queryOne(
    pool,
    'SELECT id\n     FROM schools\n     WHERE UPPER(TRIM(name)) = UPPER(TRIM(?))\n       AND UPPER(TRIM(district)) = UPPER(TRIM(?))\n     LIMIT 1',
    [schoolName, district]
  )
  if (schoolExists) {
    return res.status(409).json({
      success: false,
      message: 'Sekolah dengan nama dan kecamatan yang sama sudah terdaftar.',
    })
  }

  const name = accountName || schoolName || 'Sekolah'
  const hashedPassword = await bcrypt.hash(password, 10)

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const [schoolResult] = await conn.query(
      `INSERT INTO schools (
        name, district, address, contact, gps, accreditation, accreditationScore, capacity, graduationRate, avgExam,
        achievements, certifiedTeachers, rating, review, facilities, programs, extracurriculars, ratio, gallery,
        principalName, monthlyTarget, graduationStats, galleryLink, achievementDesc, programDetail,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        schoolName,
        district,
        address,
        contact,
        '-',
        '',
        accreditationScore,
        capacity,
        0,
        0,
        0,
        certifiedTeachers,
        0,
        '',
        JSON.stringify([]),
        JSON.stringify([]),
        JSON.stringify([]),
        '',
        JSON.stringify([]),
        '',
        null,
        '',
        '',
        '',
        '',
        'pending',
      ]
    )

    const schoolId = schoolResult.insertId

    const [userResult] = await conn.query(
      'INSERT INTO users (name, email, password, role, active, schoolId, schoolName) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, 'school_admin', 0, schoolId, schoolName]
    )

    await conn.commit()
    okJson(res, buildAuthResponse({
      id: userResult.insertId,
      name,
      email,
      role: 'school_admin',
      schoolId,
      schoolName,
    }))
  } catch (err) {
    await conn.rollback()
    res.status(500).json({ message: 'Gagal mendaftarkan sekolah', error: err.message })
  } finally {
    conn.release()
  }
})


app.post('/api/upload', requireAuth, async (req, res) => {
  const image = parseDataUrlImage(req.body?.dataUrl)
  if (!image) return res.status(400).json({ message: 'Format gambar tidak valid' })
  if (image.buffer.length > 2 * 1024 * 1024) {
    return res.status(400).json({ message: 'Ukuran gambar maksimal 2MB' })
  }

  await fs.mkdir(uploadsDir, { recursive: true })
  const baseName = normalizeFileName(req.body?.name)
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${baseName.replace(/\.[^.]+$/, '')}.${getExtFromMime(image.mime)}`
  const diskPath = path.join(uploadsDir, fileName)
  await fs.writeFile(diskPath, image.buffer)

  okJson(res, {
    url: `/uploads/${fileName}`,
    name: req.body?.name || fileName,
    size: image.buffer.length,
    uploadedAt: new Date().toISOString()
  })
})

app.get('/api/schools', async (req, res) => {
  const auth = await getAuthFromRequest(req)

  // Default publik: hanya approved
  // super_admin: lihat semua termasuk pending/rejected
  // school_admin/school: lihat sekolah sendiri
  const isSuperAdmin = auth?.role === 'super_admin'
  const isSchoolScopedRole = auth?.role === 'school_admin' || auth?.role === 'school'

  let query = ''
  let params = []

  if (isSchoolScopedRole) {
    const scopedSchoolId = Number(auth?.schoolId)
    if (!Number.isFinite(scopedSchoolId)) return okJson(res, [])
    query = 'SELECT * FROM schools WHERE id = ? ORDER BY name ASC'
    params = [scopedSchoolId]
  } else if (isSuperAdmin) {
    query = 'SELECT * FROM schools ORDER BY name ASC'
  } else {
    query = "SELECT * FROM schools WHERE status='approved' ORDER BY name ASC"
  }

  const [rows] = await pool.query(query, params)
  const mapped = rows.map((row) => ({
    ...row,
    id: Number(row.id),
    accreditationScore: Number(row.accreditationScore),
    capacity: Number(row.capacity),
    graduationRate: Number(row.graduationRate),
    avgExam: Number(row.avgExam),
    achievements: Number(row.achievements),
    certifiedTeachers: Number(row.certifiedTeachers),
    rating: Number(row.rating),
    facilities: JSON.parse(row.facilities || '[]'),
    programs: JSON.parse(row.programs || '[]'),
    extracurriculars: JSON.parse(row.extracurriculars || '[]'),
    gallery: JSON.parse(row.gallery || '[]'),
    principalName: row.principalName ?? '',
    monthlyTarget: row.monthlyTarget != null ? Number(row.monthlyTarget) : '',
    graduationStats: row.graduationStats ?? '',
    galleryLink: row.galleryLink ?? '',
    achievementDesc: row.achievementDesc ?? '',
    programDetail: row.programDetail ?? '',
  }))
  okJson(res, mapped)
})

// ============================================================================
// ROUTES: SCHOOLS VERIFICATION (NEW)
// ============================================================================

app.get('/api/schools/pending', requireRole(['super_admin']), async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM schools WHERE status='pending' ORDER BY name ASC"
    )

    const mapped = rows.map((row) => ({
      ...row,
      id: Number(row.id),
      accreditationScore: Number(row.accreditationScore),
      capacity: Number(row.capacity),
      graduationRate: Number(row.graduationRate),
      avgExam: Number(row.avgExam),
      achievements: Number(row.achievements),
      certifiedTeachers: Number(row.certifiedTeachers),
      rating: Number(row.rating),
      facilities: JSON.parse(row.facilities || '[]'),
      programs: JSON.parse(row.programs || '[]'),
      extracurriculars: JSON.parse(row.extracurriculars || '[]'),
      gallery: JSON.parse(row.gallery || '[]'),
      principalName: row.principalName ?? '',
      monthlyTarget: row.monthlyTarget != null ? Number(row.monthlyTarget) : '',
      graduationStats: row.graduationStats ?? '',
      galleryLink: row.galleryLink ?? '',
      achievementDesc: row.achievementDesc ?? '',
      programDetail: row.programDetail ?? '',
    }))

    okJson(res, mapped)
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil daftar sekolah pending', error: err?.message || String(err) })
  }
})

app.get('/api/schools/:id', async (req, res) => {
  const id = Number(req.params.id)

  if (!Number.isFinite(id)) return res.status(400).json({ message: 'ID sekolah tidak valid' })
  const auth = await getAuthFromRequest(req)


  const isSuperAdmin = auth?.role === 'super_admin'
  const isSchoolScopedRole = auth?.role === 'school_admin' || auth?.role === 'school'

  if ((isSchoolScopedRole || !isSuperAdmin) && Number(auth?.schoolId) !== id) {
    // For non-super_admin, block access except for own schoolId
    // (If auth is null => Number(undefined) !== id, blocks public access)
    if (auth == null) {
      // Public: only allow approved
      const approvedRow = await queryOne(pool, "SELECT * FROM schools WHERE id = ? AND status='approved'", [id])
      if (!approvedRow) return res.status(404).json({ message: 'Sekolah tidak ditemukan' })

      const mapped = {
        ...approvedRow,
        id: Number(approvedRow.id),
        accreditationScore: Number(approvedRow.accreditationScore),
        capacity: Number(approvedRow.capacity),
        graduationRate: Number(approvedRow.graduationRate),
        avgExam: Number(approvedRow.avgExam),
        achievements: Number(approvedRow.achievements),
        certifiedTeachers: Number(approvedRow.certifiedTeachers),
        rating: Number(approvedRow.rating),
        facilities: JSON.parse(approvedRow.facilities || '[]'),
        programs: JSON.parse(approvedRow.programs || '[]'),
        extracurriculars: JSON.parse(approvedRow.extracurriculars || '[]'),
        gallery: JSON.parse(approvedRow.gallery || '[]'),
        principalName: approvedRow.principalName ?? '',
        monthlyTarget: approvedRow.monthlyTarget != null ? Number(approvedRow.monthlyTarget) : '',
        graduationStats: approvedRow.graduationStats ?? '',
        galleryLink: approvedRow.galleryLink ?? '',
        achievementDesc: approvedRow.achievementDesc ?? '',
        programDetail: approvedRow.programDetail ?? '',
      }
      return okJson(res, mapped)
    }

    return res.status(403).json({ message: 'Anda tidak memiliki akses ke sekolah ini' })
  }

  const row = isSuperAdmin
    ? await queryOne(pool, 'SELECT * FROM schools WHERE id = ?', [id])
    : await queryOne(pool, "SELECT * FROM schools WHERE id = ?", [id])

  if (!row) return res.status(404).json({ message: 'Sekolah tidak ditemukan' })

  const mapped = {
    ...row,
    id: Number(row.id),
    accreditationScore: Number(row.accreditationScore),
    capacity: Number(row.capacity),
    graduationRate: Number(row.graduationRate),
    avgExam: Number(row.avgExam),
    achievements: Number(row.achievements),
    certifiedTeachers: Number(row.certifiedTeachers),
    rating: Number(row.rating),
    facilities: JSON.parse(row.facilities || '[]'),
    programs: JSON.parse(row.programs || '[]'),
    extracurriculars: JSON.parse(row.extracurriculars || '[]'),
    gallery: JSON.parse(row.gallery || '[]'),
    principalName: row.principalName ?? '',
    monthlyTarget: row.monthlyTarget != null ? Number(row.monthlyTarget) : '',
    graduationStats: row.graduationStats ?? '',
    galleryLink: row.galleryLink ?? '',
    achievementDesc: row.achievementDesc ?? '',
    programDetail: row.programDetail ?? '',
  }
  okJson(res, mapped)
})


app.post('/api/schools', requireRole(['super_admin']), async (req, res) => {
  const payload = req.body || {}
  const name = String(payload.name || '').trim()
  const district = String(payload.district || '').trim()
  const address = String(payload.address || '').trim()
  const contact = String(payload.contact || '').trim()
  if (!name || !district || !address || !contact) return res.status(400).json({ message: 'Data sekolah belum lengkap' })

  const gps = String(payload.gps || '-')
  const accreditation = String(payload.accreditation || 'B')
  const accreditationScore = Number(payload.accreditationScore) || 80
  const capacity = Number(payload.capacity) || 120
  const graduationRate = Number(payload.graduationRate) || 90
  const avgExam = Number(payload.avgExam) || 80
  const achievements = Number(payload.achievements) || 10
  const certifiedTeachers = Number(payload.certifiedTeachers) || 12
  const rating = Number(payload.rating) || 4.5
  const review = payload.review != null ? String(payload.review) : null
  const principalName = payload.principalName != null ? String(payload.principalName) : null
  const monthlyTarget = payload.monthlyTarget != null && payload.monthlyTarget !== '' ? Number(payload.monthlyTarget) : null
  const graduationStats = payload.graduationStats != null ? String(payload.graduationStats) : null
  const galleryLink = payload.galleryLink != null ? String(payload.galleryLink) : null
  const achievementDesc = payload.achievementDesc != null ? String(payload.achievementDesc) : null
  const programDetail = payload.programDetail != null ? String(payload.programDetail) : null
  const facilities = JSON.stringify(Array.isArray(payload.facilities) ? payload.facilities : ['Ruang Kelas'])
  const programs = JSON.stringify(Array.isArray(payload.programs) ? payload.programs : ['Program Dasar'])
  const extracurriculars = JSON.stringify(Array.isArray(payload.extracurriculars) ? payload.extracurriculars : ['Pramuka'])
  const ratio = String(payload.ratio || '1:10')
  const gallery = JSON.stringify(Array.isArray(payload.gallery) ? payload.gallery : [])

  const [result] = await pool.query(
    `INSERT INTO schools (
      name, district, address, contact, gps, accreditation, accreditationScore, capacity, graduationRate, avgExam,
      achievements, certifiedTeachers, rating, review, facilities, programs, extracurriculars, ratio, gallery,
      principalName, monthlyTarget, graduationStats, galleryLink, achievementDesc, programDetail
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      district,
      address,
      contact,
      gps,
      accreditation,
      accreditationScore,
      capacity,
      graduationRate,
      avgExam,
      achievements,
      certifiedTeachers,
      rating,
      review,
      facilities,
      programs,
      extracurriculars,
      ratio,
      gallery,
      principalName,
      monthlyTarget,
      graduationStats,
      galleryLink,
      achievementDesc,
      programDetail,
    ],
  )

  okJson(res, {
    id: Number(result.insertId),
    name,
    district,
    address,
    contact,
    gps,
    accreditation,
    accreditationScore,
    capacity,
    graduationRate,
    avgExam,
    achievements,
    certifiedTeachers,
    rating,
    review,
    facilities: JSON.parse(facilities),
    programs: JSON.parse(programs),
    extracurriculars: JSON.parse(extracurriculars),
    ratio,
    gallery: JSON.parse(gallery),
    principalName,
    monthlyTarget,
    graduationStats,
    galleryLink,
    achievementDesc,
    programDetail,
  })
})

app.put('/api/schools/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ message: 'ID sekolah tidak valid' })
  if (req.auth.role === 'school_admin' && Number(req.auth.schoolId) !== id) {
    return res.status(403).json({ message: 'Anda tidak memiliki akses ke sekolah ini' })
  }
  if (!['school_admin', 'super_admin'].includes(req.auth.role)) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  const payload = req.body || {}
  const name = String(payload.name || '').trim()
  const district = String(payload.district || '').trim()
  const address = String(payload.address || '').trim()
  const contact = String(payload.contact || '').trim()
  if (!name || !district || !address || !contact) return res.status(400).json({ message: 'Data sekolah belum lengkap' })

  const gps = String(payload.gps || '-')
  const accreditation = String(payload.accreditation || 'B')
  const accreditationScore = Number(payload.accreditationScore) || 80
  const capacity = Number(payload.capacity) || 120
  const graduationRate = Number(payload.graduationRate) || 90
  const avgExam = Number(payload.avgExam) || 80
  const achievements = Number(payload.achievements) || 10
  const certifiedTeachers = Number(payload.certifiedTeachers) || 12
  const rating = Number(payload.rating) || 4.5
  const review = payload.review != null ? String(payload.review) : null
  const principalName = payload.principalName != null ? String(payload.principalName) : null
  const monthlyTarget = payload.monthlyTarget != null && payload.monthlyTarget !== '' ? Number(payload.monthlyTarget) : null
  const graduationStats = payload.graduationStats != null ? String(payload.graduationStats) : null
  const galleryLink = payload.galleryLink != null ? String(payload.galleryLink) : null
  const achievementDesc = payload.achievementDesc != null ? String(payload.achievementDesc) : null
  const programDetail = payload.programDetail != null ? String(payload.programDetail) : null
  const facilities = JSON.stringify(Array.isArray(payload.facilities) ? payload.facilities : [])
  const programs = JSON.stringify(Array.isArray(payload.programs) ? payload.programs : [])
  const extracurriculars = JSON.stringify(Array.isArray(payload.extracurriculars) ? payload.extracurriculars : [])
  const ratio = String(payload.ratio || '1:10')
  const gallery = JSON.stringify(Array.isArray(payload.gallery) ? payload.gallery : [])

  await pool.query(
    `UPDATE schools SET
      name=?, district=?, address=?, contact=?, gps=?, accreditation=?, accreditationScore=?, capacity=?,
      graduationRate=?, avgExam=?, achievements=?, certifiedTeachers=?, rating=?, review=?, facilities=?,
      programs=?, extracurriculars=?, ratio=?, gallery=?, principalName=?, monthlyTarget=?, graduationStats=?,
      galleryLink=?, achievementDesc=?, programDetail=?
    WHERE id=?`,
    [
      name,
      district,
      address,
      contact,
      gps,
      accreditation,
      accreditationScore,
      capacity,
      graduationRate,
      avgExam,
      achievements,
      certifiedTeachers,
      rating,
      review,
      facilities,
      programs,
      extracurriculars,
      ratio,
      gallery,
      principalName,
      monthlyTarget,
      graduationStats,
      galleryLink,
      achievementDesc,
      programDetail,
      id,
    ],
  )

  okJson(res, {
    id,
    name,
    district,
    address,
    contact,
    gps,
    accreditation,
    accreditationScore,
    capacity,
    graduationRate,
    avgExam,
    achievements,
    certifiedTeachers,
    rating,
    review,
    facilities: JSON.parse(facilities),
    programs: JSON.parse(programs),
    extracurriculars: JSON.parse(extracurriculars),
    ratio,
    gallery: JSON.parse(gallery),
    principalName,
    monthlyTarget,
    graduationStats,
    galleryLink,
    achievementDesc,
    programDetail,
  })
})

app.delete('/api/schools/:id', requireRole(['super_admin']), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ message: 'ID sekolah tidak valid' })
  await pool.query('DELETE FROM schools WHERE id = ?', [id])
  okJson(res, { ok: true })
})



app.patch('/api/schools/:id/verify', requireRole(['super_admin']), async (req, res) => {
  const id = Number(req.params.id)
  const action = String(req.body?.action || '').trim()
  const adminNote = req.body?.adminNote != null ? String(req.body.adminNote) : null

  if (!Number.isFinite(id)) return res.status(400).json({ message: 'ID sekolah tidak valid' })
  if (!['approve', 'reject'].includes(action)) return res.status(400).json({ message: 'action harus approve atau reject' })

  const newStatus = action === 'approve' ? 'approved' : 'rejected'
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    // Ensure school exists
    const school = await queryOne(conn, 'SELECT id FROM schools WHERE id = ?', [id])
    if (!school) {
      await conn.rollback()
      return res.status(404).json({ message: 'Sekolah tidak ditemukan' })
    }

    await conn.query(
      'UPDATE schools SET status=?, verified_at=NOW(), verified_by=? WHERE id=?',
      [newStatus, req.auth?.id ?? null, id]
    )

    // Activate/deactivate school_admin user(s)
    await conn.query(
      'UPDATE users SET active=? WHERE schoolId=? AND role=?',
      [action === 'approve' ? 1 : 0, id, 'school_admin']
    )

    await conn.query(
      `INSERT INTO activity_logs (actorId, actorName, actorEmail, actorRole, type, description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(req.auth?.id || null),
        req.auth?.name || 'System',
        req.auth?.email || 'system@system.local',
        req.auth?.role || 'super_admin',
        'school_verification',
        `Verifikasi sekolah ID ${id}: ${newStatus}${adminNote ? ` (${adminNote})` : ''}`,
        'success'
      ]
    )

    await conn.commit()
    okJson(res, { ok: true, status: newStatus })
  } catch (err) {
    await conn.rollback()
    res.status(500).json({ message: 'Gagal memverifikasi sekolah', error: err.message })
  } finally {
    conn.release()
  }
})


app.get('/api/users', requireRole(['super_admin']), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT
      u.id,
      u.name,
      u.email,
      u.role,
      u.active,
      u.schoolId,
      u.schoolName,
      u.lastLogin,
      u.createdAt,
      u.updatedAt,
      s.status AS schoolStatus
     FROM users u
     LEFT JOIN schools s ON s.id = u.schoolId
     ORDER BY u.id ASC`
  )

  const mapped = rows.map((row) => {
    const base = sanitizeUser(row)
    return {
      ...base,
      schoolStatus: row.schoolStatus ?? undefined,
    }
  })

  okJson(res, mapped)
})

app.post('/api/users', requireRole(['super_admin']), async (req, res) => {
  const name = String(req.body?.name || '').trim()
  const email = String(req.body?.email || '').trim()
  const password = String(req.body?.password || '')
const role = String(req.body?.role || 'user')
  const schoolId = req.body?.schoolId != null && req.body.schoolId !== '' ? Number(req.body.schoolId) : null
  const schoolName = req.body?.schoolName != null ? String(req.body.schoolName) : null

  if (!name || !email || !password) return res.status(400).json({ message: 'Data belum lengkap' })

  // tenant isolation hardening
  if (role === 'school_admin') {
    if (schoolId == null || !Number.isFinite(Number(schoolId))) {
      return res.status(400).json({ message: 'school_admin wajib memiliki schoolId valid' })
    }

    // Enforce 1 school_admin per school BEFORE INSERT.
    const existingAdmin = await queryOne(
      pool,
      'SELECT id FROM users WHERE role = ? AND schoolId = ? LIMIT 1',
      ['school_admin', schoolId],
    )
    if (existingAdmin) {
      return res.status(409).json({ message: 'Sekolah ini sudah memiliki Admin Sekolah.' })
    }
  }

  const exists = await queryOne(pool, 'SELECT id FROM users WHERE email = ?', [email])
  if (exists) return res.status(409).json({ message: 'Email sudah terdaftar' })

  const hashedPassword = await bcrypt.hash(password, 10)
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password, role, active, schoolId, schoolName) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, email, hashedPassword, role, 1, schoolId, schoolName],
  )

  okJson(res, { id: Number(result.insertId), name, email, role, schoolId, schoolName })
})

app.put('/api/users/:id', requireRole(['super_admin']), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ message: 'ID user tidak valid' })

  const payload = req.body || {}

  // find current record first (so missing fields won't overwrite)
  const existing = await queryOne(pool, 'SELECT id, name, email, role, active, schoolId, schoolName FROM users WHERE id = ?', [id])
  if (!existing) return res.status(404).json({ message: 'User tidak ditemukan' })

  const nextName = payload?.name != null ? String(payload.name).trim() : existing.name
  const nextEmail = payload?.email != null ? String(payload.email).trim() : existing.email
  const nextPassword = payload?.password != null ? String(payload.password) : ''

  const nextRole = payload?.role != null ? String(payload.role) : existing.role
  const nextActive = payload?.active != null
    ? (payload.active === false ? 0 : 1)
    : Number(existing.active) === 1 ? 1 : 0

  const hasSchoolIdInPayload = payload?.schoolId != null && payload.schoolId !== ''
  const nextSchoolId = hasSchoolIdInPayload ? Number(payload.schoolId) : existing.schoolId

  const nextSchoolName = payload?.schoolName != null ? String(payload.schoolName) : existing.schoolName

  if (!nextName || !nextEmail) return res.status(400).json({ message: 'Data belum lengkap' })

  // tenant isolation hardening + FK validation for school_admin
  if (nextRole === 'school_admin') {
    const schoolIdNum = Number(nextSchoolId)
    if (!Number.isFinite(schoolIdNum) || schoolIdNum <= 0) {
      return res.status(400).json({ message: 'schoolId tidak valid' })
    }

    const school = await queryOne(pool, 'SELECT id FROM schools WHERE id = ?', [schoolIdNum])
    if (!school) {
      return res.status(400).json({ message: 'schoolId tidak valid' })
    }
  // keep tenant fields consistent
    payload.schoolId = schoolIdNum
    payload.schoolName = payload.schoolName != null ? String(payload.schoolName) : nextSchoolName
  }

  // email uniqueness check (only if changed)
  if (nextEmail !== existing.email) {
    const emailExists = await queryOne(pool, 'SELECT id FROM users WHERE email = ? AND id != ?', [nextEmail, id])
    if (emailExists) return res.status(409).json({ message: 'Email sudah digunakan oleh user lain' })
  }

  let query = 'UPDATE users SET name=?, email=?'
  let params = [nextName, nextEmail]

  // only update role/active/school fields if explicitly provided OR if role is school_admin (to keep FK consistent)
  const shouldUpdateRoleFields = (payload?.role != null) || (payload?.active != null) || (payload?.schoolId != null) || (payload?.schoolName != null)

  if (shouldUpdateRoleFields) {
    query += ', role=?, active=?, schoolId=?, schoolName=?'
    params.push(nextRole, nextActive, nextSchoolId, nextSchoolName)
  }

  if (payload?.role == null && nextRole !== existing.role) {
    // safeguard: if backend decided role differs, force update
    query += ', role=?, active=?, schoolId=?, schoolName=?'
    params = [nextName, nextEmail, nextRole, nextActive, nextSchoolId, nextSchoolName]
  }

  if (nextPassword) {
    const hashedPassword = await bcrypt.hash(nextPassword, 10)
    query += ', password=?'
    params.push(hashedPassword)
  }

  query += ' WHERE id=?'
  params.push(id)

  await pool.query(query, params)
  okJson(res, { ok: true })
})

app.patch('/api/users/:id/toggle', requireRole(['super_admin']), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ message: 'ID user tidak valid' })

  const user = await queryOne(pool, 'SELECT id, active FROM users WHERE id = ?', [id])
  if (!user) return res.status(404).json({ message: 'User tidak ditemukan' })

  const newActive = Number(user.active) === 1 ? 0 : 1
  await pool.query('UPDATE users SET active = ? WHERE id = ?', [newActive, id])
  okJson(res, { ok: true, active: newActive === 1 })
})

app.delete('/api/users/:id', requireRole(['super_admin']), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ message: 'ID user tidak valid' })

  await pool.query('DELETE FROM users WHERE id = ?', [id])
  okJson(res, { ok: true })
})

app.put('/api/users/bulk', requireRole(['super_admin']), async (req, res) => {
  const nextUsers = Array.isArray(req.body) ? req.body : null
  if (!nextUsers) return res.status(400).json({ message: 'Payload tidak valid' })

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [existingRows] = await conn.query('SELECT id, email, password FROM users')
    const existingByEmail = new Map(existingRows.map((row) => [row.email, { id: Number(row.id), password: row.password }]))
    const incomingEmails = new Set()

    for (const item of nextUsers) {
      const email = String(item?.email || '').trim()
      const name = String(item?.name || '').trim() || 'User'
      const password = String(item?.password || '')
      const role = String(item?.role || 'user')
      const active = item?.active === false ? 0 : 1
      const schoolId = item?.schoolId != null && item.schoolId !== '' ? Number(item.schoolId) : null
      const schoolName = item?.schoolName != null ? String(item.schoolName) : null
      const lastLogin = item?.lastLogin ? String(item.lastLogin).slice(0, 19).replace('T', ' ') : null

      // FK / Tenant hardening: school_admin wajib punya schoolId valid.
      if (role === 'school_admin') {
        const schoolIdNum = Number(schoolId)
        if (!Number.isFinite(schoolIdNum)) {
          await conn.rollback()
          return res.status(400).json({ message: 'school_admin wajib memiliki schoolId valid' })
        }
      }


      if (!email) continue
      incomingEmails.add(email)

      const existing = existingByEmail.get(email)
      let passwordToSave = password

      if (existing) {
        if (!password || password.startsWith('$2b$') || password.startsWith('$2a$') || password.startsWith('$2y$')) {
          passwordToSave = existing.password
        } else {
          passwordToSave = await bcrypt.hash(password, 10)
        }
        await conn.query(
          'UPDATE users SET name=?, password=?, role=?, active=?, schoolId=?, schoolName=?, lastLogin=? WHERE id=?',
          [name, passwordToSave, role, active, schoolId, schoolName, lastLogin, existing.id],
        )
      } else {
        passwordToSave = password ? await bcrypt.hash(password, 10) : await bcrypt.hash('password123', 10)
        await conn.query(
          'INSERT INTO users (name, email, password, role, active, schoolId, schoolName, lastLogin) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [name, email, passwordToSave, role, active, schoolId, schoolName, lastLogin],
        )
      }
    }

    const [allRows] = await conn.query('SELECT email FROM users')
    const toDelete = allRows
      .map((row) => row.email)
      .filter((email) => !incomingEmails.has(email))
    if (toDelete.length) {
      await conn.query(`DELETE FROM users WHERE email IN (${toDelete.map(() => '?').join(',')})`, toDelete)
    }

    await conn.commit()
    okJson(res, { ok: true })
  } catch (err) {
    await conn.rollback()
    res.status(500).json({ message: 'Gagal menyimpan data user' })
  } finally {
    conn.release()
  }
})

app.get('/api/eligibility-submissions', requireAuth, async (req, res) => {
  if (!['super_admin', 'school_admin', 'school'].includes(req.auth.role)) {
    return res.status(403).json({ message: 'Forbidden' })
  }
  const querySchoolId = req.query.schoolId != null ? Number(req.query.schoolId) : null
  const querySchoolName = String(req.query.schoolName || '').trim()
  const isSchoolScopedRole = req.auth?.role === 'school_admin' || req.auth?.role === 'school'
  const targetSchoolId = isSchoolScopedRole
    ? (Number.isFinite(req.auth?.schoolId) ? Number(req.auth.schoolId) : null)
    : (Number.isFinite(querySchoolId) ? querySchoolId : null)
  const targetSchoolName = isSchoolScopedRole
    ? String(req.auth?.schoolName || '').trim()
    : querySchoolName

  const [rows] = await pool.query('SELECT * FROM eligibility_submissions ORDER BY submittedAt DESC')
  const mapped = rows
    .map((row) => mapSubmissionRow(row, { targetSchoolId, targetSchoolName }))
    .filter(Boolean)
  okJson(res, mapped)
})

function normalizeRecommendationScore(rec) {
  const raw = rec?.scoreV ?? rec?.schoolScore ?? rec?.score ?? 0
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return 0
  return parsed > 1 ? parsed / 100 : parsed
}

function findMatchingRecommendation(recommendations, { targetSchoolId, targetSchoolName }) {
  const hasSchoolId = Number.isFinite(targetSchoolId)
  const normalizedSchoolName = String(targetSchoolName || '').trim().toLowerCase()
  return recommendations.find((rec) => {
    const recSchoolId = Number(rec?.schoolId)
    const recSchoolName = String(rec?.schoolName || '').trim().toLowerCase()
    if (hasSchoolId && Number.isFinite(recSchoolId) && recSchoolId === Number(targetSchoolId)) return true
    if (normalizedSchoolName && recSchoolName === normalizedSchoolName) return true
    return false
  }) || null
}

function mapSubmissionRow(row, options = {}) {
  const input = JSON.parse(row.input || '{}')
  const result = JSON.parse(row.result || '{}')
  const recommendationsRaw = JSON.parse(row.recommendations || '[]')
  const recommendations = Array.isArray(recommendationsRaw)
    ? recommendationsRaw.map((rec) => ({
      ...rec,
      scoreV: normalizeRecommendationScore(rec),
    }))
    : []
  const matchedRecommendation = findMatchingRecommendation(recommendations, options)
  const scopedScore = matchedRecommendation ? matchedRecommendation.scoreV : null
  const hasScope = Number.isFinite(options?.targetSchoolId) || String(options?.targetSchoolName || '').trim() !== ''
  if (hasScope && !matchedRecommendation) return null

  const fallbackResultScore = Number(result?.score ?? 0)
  const normalizedResultScore = Number.isFinite(fallbackResultScore)
    ? (fallbackResultScore > 1 ? fallbackResultScore / 100 : fallbackResultScore)
    : 0

  // Jika sedang dalam scope sekolah (admin sekolah), gunakan skor sekolah tersebut.
  // Jika tidak (super admin), gunakan scopedScore jika ada, fallback ke skor global.
  const finalScoreV = hasScope
    ? (scopedScore ?? 0)
    : (scopedScore ?? normalizedResultScore)

  return {
    id: row.id,
    submittedAt: row.submittedAt,
    userEmail: row.userEmail,
    userName: row.userName,
    input,
    result,
    recommendations,
    scoreV: finalScoreV,
  }
}

app.post('/api/eligibility-submissions', requireAuth, async (req, res) => {
  const payload = req.body || {}
  const id = String(payload.id || '').trim() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const submittedAtIso = payload.submittedAt ? String(payload.submittedAt) : new Date().toISOString()
  const submittedAt = submittedAtIso.slice(0, 19).replace('T', ' ')
  const userEmail = String(payload.userEmail || req.auth.email || '')
  const userName = String(payload.userName || '')
  const input = JSON.stringify(payload.input || {})
  const result = JSON.stringify(payload.result || {})
  const normalizedRecommendations = Array.isArray(payload.recommendations)
    ? payload.recommendations.map((rec) => {
      const normalizedScore = normalizeRecommendationScore(rec)
      return {
        ...rec,
        scoreV: normalizedScore,
        schoolScore: rec?.schoolScore != null ? rec.schoolScore : normalizedScore,
      }
    })
    : []
  const recommendations = JSON.stringify(normalizedRecommendations)

  await pool.query(
    'INSERT INTO eligibility_submissions (id, submittedAt, userEmail, userName, input, result, recommendations) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, submittedAt, userEmail, userName, input, result, recommendations],
  )

  okJson(res, {
    id,
    submittedAt: submittedAtIso,
    userEmail,
    userName,
    input: JSON.parse(input),
    result: JSON.parse(result),
    recommendations: JSON.parse(recommendations),
  })
})

app.get('/api/admin-activity-logs', requireRole(['super_admin']), async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM activity_logs ORDER BY createdAt DESC')
  okJson(res, rows)
})

app.get('/api/activity-logs', requireRole(['super_admin']), async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM activity_logs ORDER BY createdAt DESC')
  okJson(res, rows)
})

app.post('/api/activity-logs', requireAuth, async (req, res) => {
  const { type, description, status = 'success' } = req.body
  const actor = req.auth
  await pool.query(
    'INSERT INTO activity_logs (actorId, actorName, actorEmail, actorRole, type, description, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [actor.id || null, actor.name || 'Unknown', actor.email, actor.role, type, description, status],
  )
  okJson(res, { ok: true })
})

// Criteria Requests Endpoints
function mapCriteriaRequestRows(rows) {
  return rows.map((row) => ({
    ...row,
    oldCriteria: JSON.parse(row.oldCriteria || '{}'),
    newCriteria: JSON.parse(row.newCriteria || '{}'),
  }))
}

app.get('/api/criteria-requests', requireAuth, async (req, res) => {
  const isSchoolScopedRole = req.auth.role === 'school_admin' || req.auth.role === 'school'
  if (!isSchoolScopedRole && req.auth.role !== 'super_admin') {
    return res.status(403).json({ message: 'Forbidden' })
  }
  let query = 'SELECT * FROM criteria_requests ORDER BY createdAt DESC'
  let params = []

  if (isSchoolScopedRole) {
    if (!req.auth.schoolId) return okJson(res, [])
    query = 'SELECT * FROM criteria_requests WHERE schoolId = ? ORDER BY createdAt DESC'
    params = [req.auth.schoolId]
  }

  const [rows] = await pool.query(query, params)
  okJson(res, mapCriteriaRequestRows(rows))
})

app.get('/api/criteria-requests/mine', requireAuth, async (req, res) => {
  const isSchoolScopedRole = req.auth.role === 'school_admin' || req.auth.role === 'school'
  if (!isSchoolScopedRole) return res.status(403).json({ message: 'Forbidden' })
  if (!req.auth.schoolId) return okJson(res, [])

  const [rows] = await pool.query(
    'SELECT * FROM criteria_requests WHERE schoolId = ? ORDER BY createdAt DESC',
    [req.auth.schoolId],
  )
  okJson(res, mapCriteriaRequestRows(rows))
})

app.post('/api/criteria-requests', requireRole(['school_admin']), upload.single('supportingDocument'), async (req, res) => {
  const adminUser = await queryOne(pool, 'SELECT id, name FROM users WHERE email = ?', [req.auth.email])
  if (!adminUser) return res.status(403).json({ message: 'Akun admin tidak ditemukan' })

  const parsedSchoolId = Number(req.auth.schoolId)
  if (!Number.isFinite(parsedSchoolId)) return res.status(400).json({ message: 'schoolId tidak valid' })
  const schoolName = String(req.auth.schoolName || req.body?.schoolName || '').trim()
  const reason = String(req.body?.reason || '').trim()
  if (!reason) return res.status(400).json({ message: 'Alasan / justifikasi wajib diisi' })

  let affectedCriteria = []
  try {
    affectedCriteria = JSON.parse(String(req.body?.affectedCriteria || '[]'))
  } catch {
    affectedCriteria = []
  }
  if (!Array.isArray(affectedCriteria)) affectedCriteria = []

  let supportingDocument = null
  if (req.file) {
    await fs.mkdir(uploadsDir, { recursive: true })
    const safeBaseName = normalizeFileName(req.file.originalname || 'dokumen.jpg')
    const documentName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeBaseName}`
    const documentPath = path.join(uploadsDir, documentName)
    await fs.writeFile(documentPath, req.file.buffer)
    supportingDocument = {
      url: `/uploads/${documentName}`,
      name: req.file.originalname || documentName,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
    }
  }

  const oldCriteria = req.body?.oldCriteria ?? {}
  const newCriteria = req.body?.newCriteria ?? {
    changeType: String(req.body?.changeType || '').trim(),
    affectedCriteria,
    proposedChange: String(req.body?.proposedChange || '').trim(),
    supportingDocument,
  }

  const [result] = await pool.query(
    'INSERT INTO criteria_requests (schoolId, adminId, adminName, schoolName, oldCriteria, newCriteria, reason, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      parsedSchoolId,
      Number(adminUser.id),
      adminUser.name,
      schoolName,
      JSON.stringify(oldCriteria),
      JSON.stringify(newCriteria),
      reason,
      'pending',
    ]
  )

  await pool.query(
    'INSERT INTO activity_logs (actorId, actorName, actorEmail, actorRole, type, description) VALUES (?, ?, ?, ?, ?, ?)',
    [Number(adminUser.id), adminUser.name, req.auth.email, req.auth.role, 'criteria_request', `Mengajukan perubahan kriteria untuk ${schoolName}`]
  )

  okJson(res, { id: result.insertId, status: 'pending' })
})

app.patch('/api/criteria-requests/:id/approve', requireRole(['super_admin']), async (req, res) => {
  const { id } = req.params
  const { adminNote } = req.body
  const actor = await queryOne(pool, 'SELECT id, name FROM users WHERE email = ?', [req.auth.email])
  if (!actor) return res.status(403).json({ message: 'Akun super admin tidak ditemukan' })

  await pool.query(
    'UPDATE criteria_requests SET status = ?, adminNote = ? WHERE id = ?',
    ['approved', adminNote, id]
  )

  // Get request details for logging
  const request = await queryOne(pool, 'SELECT * FROM criteria_requests WHERE id = ?', [id])

  // Log activity
  await pool.query(
    'INSERT INTO activity_logs (actorId, actorName, actorEmail, actorRole, type, description) VALUES (?, ?, ?, ?, ?, ?)',
    [Number(actor.id), actor.name, req.auth.email, req.auth.role, 'criteria_approved', `Menyetujui perubahan kriteria untuk ${request?.schoolName || ''}`]
  )

  okJson(res, { ok: true })
})

app.patch('/api/criteria-requests/:id/reject', requireRole(['super_admin']), async (req, res) => {
  const { id } = req.params
  const { adminNote } = req.body
  const actor = await queryOne(pool, 'SELECT id, name FROM users WHERE email = ?', [req.auth.email])
  if (!actor) return res.status(403).json({ message: 'Akun super admin tidak ditemukan' })

  await pool.query(
    'UPDATE criteria_requests SET status = ?, adminNote = ? WHERE id = ?',
    ['rejected', adminNote, id]
  )
    
  // Get request details for logging
  const request = await queryOne(pool, 'SELECT * FROM criteria_requests WHERE id = ?', [id])

  // Log activity
  await pool.query(
    'INSERT INTO activity_logs (actorId, actorName, actorEmail, actorRole, type, description) VALUES (?, ?, ?, ?, ?, ?)',
    [Number(actor.id), actor.name, req.auth.email, req.auth.role, 'criteria_rejected', `Menolak perubahan kriteria untuk ${request?.schoolName || ''}`]
  )

  okJson(res, { ok: true })
})

// Recommendations and PDF export (mock for now, or use basic logic)
app.get('/api/recommendations', requireAuth, async (req, res) => {
  if (!['super_admin', 'school_admin', 'school'].includes(req.auth.role)) {
    return res.status(403).json({ message: 'Forbidden' })
  }
  const isSchoolScopedRole = req.auth?.role === 'school_admin' || req.auth?.role === 'school'
  const schoolId = isSchoolScopedRole ? req.auth.schoolId : req.query.schoolId
  const schoolName = isSchoolScopedRole ? req.auth.schoolName : req.query.schoolName
  let query = 'SELECT * FROM eligibility_submissions ORDER BY submittedAt DESC'
  let params = []

  if (isSchoolScopedRole) {
    const parsedSchoolId = Number(schoolId)
    const normalizedSchoolName = String(schoolName || '').trim()
    if (!Number.isFinite(parsedSchoolId) && !normalizedSchoolName) return okJson(res, [])

    const whereClauses = []
    // Tenant isolation: ONLY filter by schoolId.
    if (Number.isFinite(parsedSchoolId)) {
      whereClauses.push("JSON_CONTAINS(recommendations, ?, '$')")
      params.push(JSON.stringify({ schoolId: parsedSchoolId }))
    }

    query = `SELECT * FROM eligibility_submissions WHERE ${whereClauses.join(' AND ')} ORDER BY submittedAt DESC`

  }

  const [rows] = await pool.query(query, params)
  const mapped = rows
    .map((row) => mapSubmissionRow(row, { targetSchoolId: schoolId, targetSchoolName: schoolName }))
    .filter(Boolean)
  okJson(res, mapped)
})

app.get('/api/recommendations/export-pdf', requireAuth, async (req, res) => {
  // In a real app, this would generate a PDF. For now, we return a success message or mock data.
  okJson(res, { message: 'PDF Export logic would go here' })
})

app.post('/api/admin-activity-logs', requireAuth, async (req, res) => {
  const payload = req.body || {}
  const id = String(payload.id || '').trim() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const type = String(payload.type || 'criteria_updated')
  const actorName = String(payload.actorName || req.auth.email)
  const actorEmail = String(payload.actorEmail || req.auth.email)
  const schoolName = String(payload.schoolName || '')
  const message = String(payload.message || 'Mengganti kriteria prescreening sekolah')
  const createdAtIso = payload.createdAt ? String(payload.createdAt) : new Date().toISOString()
  const createdAt = createdAtIso.slice(0, 19).replace('T', ' ')

  await pool.query(
    'INSERT INTO admin_activity_logs (id, type, actorName, actorEmail, schoolName, message, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, type, actorName, actorEmail, schoolName, message, createdAt],
  )

  okJson(res, { id, type, actorName, actorEmail, schoolName, message, createdAt: createdAtIso })
})

app.post('/api/admin/reset', requireRole(['super_admin']), async (req, res) => {
  const schemaPath = path.resolve(rootDir, 'db', 'schema.sql')
  const seedPath = path.resolve(rootDir, 'db', 'seed.sql')
  const schemaSql = await fs.readFile(schemaPath, 'utf8')
  const seedSql = await fs.readFile(seedPath, 'utf8')

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query('SET FOREIGN_KEY_CHECKS=0')
    await conn.query('TRUNCATE TABLE admin_activity_logs')
    await conn.query('TRUNCATE TABLE eligibility_submissions')
    await conn.query('TRUNCATE TABLE schools')
    await conn.query('TRUNCATE TABLE users')
    await conn.query('SET FOREIGN_KEY_CHECKS=1')
    await conn.query(schemaSql)
    await conn.query(seedSql)
    await conn.commit()
    okJson(res, { ok: true })
  } catch {
    await conn.rollback()
    res.status(500).json({ message: 'Gagal reset database' })
  } finally {
    conn.release()
  }
})

// Global error handler - catch all unhandled errors
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err?.message || err)
  res.status(500).json({
    error: 'Internal server error',
    message: err?.message || 'Unknown error',
  })
})

const port = Number(process.env.PORT || 4000)
app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`)
})
