import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import cors from 'cors'
import express from 'express'
import multer from 'multer'
import { createPoolFromEnv, queryOne } from './db.js'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json({ limit: '15mb' }))
const upload = multer({ storage: multer.memoryStorage() })

const pool = createPoolFromEnv()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const uploadsDir = path.resolve(rootDir, 'uploads')

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
      if (err?.code !== 'ER_DUP_FIELDNAME') throw err
    }
  }
}

ensureSchoolOptionalColumns().catch((err) => {
  console.error('Gagal migrasi kolom schools:', err?.message || err)
})

function getAuthFromRequest(req) {
  const email = String(req.header('x-auth-email') || '').trim()
  const role = String(req.header('x-auth-role') || '').trim()
  const schoolIdValue = req.header('x-auth-school-id')
  const schoolName = String(req.header('x-auth-school-name') || '').trim()
  const schoolId = schoolIdValue != null && schoolIdValue !== '' ? Number(schoolIdValue) : undefined

  if (!email || !role) return null
  return { email, role, schoolId, schoolName }
}

function requireAuth(req, res, next) {
  const auth = getAuthFromRequest(req)
  if (!auth) return res.status(401).json({ message: 'Unauthorized' })
  req.auth = auth
  next()
}

function requireRole(roles) {
  return (req, res, next) => {
    const auth = getAuthFromRequest(req)
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
  try {
    const row = await queryOne(pool, 'SELECT 1 as ok')
    okJson(res, { ok: true, db: Boolean(row?.ok) })
  } catch {
    res.status(500).json({ ok: false })
  }
})

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body?.email || '').trim()
  const password = String(req.body?.password || '')
  if (!email || !password) return res.status(400).json({ message: 'Email dan password wajib diisi' })

  const user = await queryOne(pool, 'SELECT * FROM users WHERE email = ?', [email])
  if (!user || user.password !== password) return res.status(401).json({ message: 'Email atau password salah' })
  if (Number(user.active) === 0) return res.status(403).json({ message: 'Akun Anda sedang dinonaktifkan' })

  const nowIso = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await pool.query('UPDATE users SET lastLogin = ? WHERE id = ?', [nowIso, user.id])

  okJson(res, {
    name: user.name,
    email: user.email,
    role: user.role,
    schoolId: user.schoolId ?? undefined,
    schoolName: user.schoolName ?? undefined,
  })
})

app.post('/api/auth/signup', async (req, res) => {
  const name = String(req.body?.name || '').trim()
  const email = String(req.body?.email || '').trim()
  const password = String(req.body?.password || '')
  if (!name || !email || !password) return res.status(400).json({ message: 'Data belum lengkap' })

  const exists = await queryOne(pool, 'SELECT id FROM users WHERE email = ?', [email])
  if (exists) return res.status(409).json({ message: 'Email sudah terdaftar' })

  await pool.query(
    'INSERT INTO users (name, email, password, role, active) VALUES (?, ?, ?, ?, ?)',
    [name, email, password, 'user', 1],
  )

  okJson(res, { name, email, role: 'user' })
})

app.post('/api/auth/signup-school', async (req, res) => {
  const accountName = String(req.body?.accountName || '').trim()
  const email = String(req.body?.email || '').trim()
  const password = String(req.body?.password || '')
  const schoolName = String(req.body?.schoolName || '').trim()
  if (!email || !password) return res.status(400).json({ message: 'Data belum lengkap' })

  const exists = await queryOne(pool, 'SELECT id FROM users WHERE email = ?', [email])
  if (exists) return res.status(409).json({ message: 'Email sudah terdaftar' })

  const name = accountName || schoolName || 'Sekolah'
  await pool.query(
    'INSERT INTO users (name, email, password, role, active, schoolName) VALUES (?, ?, ?, ?, ?, ?)',
    [name, email, password, 'school', 1, schoolName || null],
  )

  okJson(res, { name, email, role: 'school' })
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
  const [rows] = await pool.query('SELECT * FROM schools ORDER BY id ASC')
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

app.post('/api/schools', async (req, res) => {
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

app.put('/api/schools/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ message: 'ID sekolah tidak valid' })

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

app.delete('/api/schools/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ message: 'ID sekolah tidak valid' })
  await pool.query('DELETE FROM schools WHERE id = ?', [id])
  okJson(res, { ok: true })
})

app.get('/api/users', requireRole(['super_admin']), async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM users ORDER BY id ASC')
  const mapped = rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    email: row.email,
    password: row.password,
    role: row.role,
    active: Number(row.active) === 1,
    schoolId: row.schoolId != null ? Number(row.schoolId) : undefined,
    schoolName: row.schoolName ?? undefined,
    lastLogin: row.lastLogin ?? undefined,
  }))
  okJson(res, mapped)
})

app.put('/api/users/bulk', requireRole(['super_admin']), async (req, res) => {
  const nextUsers = Array.isArray(req.body) ? req.body : null
  if (!nextUsers) return res.status(400).json({ message: 'Payload tidak valid' })

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [existingRows] = await conn.query('SELECT id, email FROM users')
    const existingByEmail = new Map(existingRows.map((row) => [row.email, Number(row.id)]))
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

      if (!email) continue
      incomingEmails.add(email)

      const existingId = existingByEmail.get(email)
      if (existingId) {
        await conn.query(
          'UPDATE users SET name=?, password=?, role=?, active=?, schoolId=?, schoolName=?, lastLogin=? WHERE id=?',
          [name, password, role, active, schoolId, schoolName, lastLogin, existingId],
        )
      } else {
        await conn.query(
          'INSERT INTO users (name, email, password, role, active, schoolId, schoolName, lastLogin) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [name, email, password, role, active, schoolId, schoolName, lastLogin],
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
  const querySchoolId = req.query.schoolId != null ? Number(req.query.schoolId) : null
  const querySchoolName = String(req.query.schoolName || '').trim()
  const isSchoolScopedRole = req.auth?.role === 'school_admin' || req.auth?.role === 'school'
  const targetSchoolId = Number.isFinite(querySchoolId)
    ? querySchoolId
    : (isSchoolScopedRole && Number.isFinite(req.auth?.schoolId) ? Number(req.auth.schoolId) : null)
  const targetSchoolName = querySchoolName || (isSchoolScopedRole ? String(req.auth?.schoolName || '').trim() : '')

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

app.get('/api/admin-activity-logs', requireAuth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM activity_logs ORDER BY createdAt DESC')
  okJson(res, rows)
})

app.get('/api/activity-logs', requireAuth, async (req, res) => {
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
app.get('/api/criteria-requests', requireAuth, async (req, res) => {
  let query = 'SELECT * FROM criteria_requests ORDER BY createdAt DESC'
  let params = []

  if (req.auth.role === 'school_admin' && req.auth.schoolId) {
    query = 'SELECT * FROM criteria_requests WHERE schoolId = ? ORDER BY createdAt DESC'
    params = [req.auth.schoolId]
  }

  const [rows] = await pool.query(query, params)
  const mapped = rows.map(row => ({
    ...row,
    oldCriteria: JSON.parse(row.oldCriteria || '{}'),
    newCriteria: JSON.parse(row.newCriteria || '{}'),
  }))
  okJson(res, mapped)
})

app.post('/api/criteria-requests', requireRole(['school_admin']), upload.single('supportingDocument'), async (req, res) => {
  const adminUser = await queryOne(pool, 'SELECT id, name FROM users WHERE email = ?', [req.auth.email])
  if (!adminUser) return res.status(403).json({ message: 'Akun admin tidak ditemukan' })

  const parsedSchoolId = Number(req.body?.schoolId ?? req.auth.schoolId)
  if (!Number.isFinite(parsedSchoolId)) return res.status(400).json({ message: 'schoolId tidak valid' })
  const schoolName = String(req.body?.schoolName || req.auth.schoolName || '').trim()
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
  const schoolId = req.query.schoolId
  const [rows] = await pool.query('SELECT * FROM eligibility_submissions ORDER BY submittedAt DESC')
  const mapped = rows
    .map((row) => mapSubmissionRow(row, { targetSchoolId: schoolId }))
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

const port = Number(process.env.PORT || 4000)
app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`)
})
