import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useSchoolAdminData } from '../../hooks/useSchoolAdminData.js'

const PAGE_SIZE = 20

const scoreFilterOptions = [
  { value: 'all', label: 'Semua skor' },
  { value: 'high', label: 'Skor Tinggi (>= 0,80)' },
  { value: 'medium', label: 'Skor Sedang (0,55 - 0,79)' },
  { value: 'low', label: 'Skor Rendah (< 0,55)' },
]

const dateFilterOptions = [
  { value: 'all', label: 'Semua tanggal' },
  { value: 'today', label: 'Hari ini' },
  { value: 'last7', label: '7 hari terakhir' },
  { value: 'last30', label: '30 hari terakhir' },
  { value: 'custom', label: 'Rentang kustom' },
]

const PARENT_LABELS = {
  ayah: 'Ayah',
  ibu: 'Ibu',
  kedua_orangtua: 'Kedua orang tua',
  wali: 'Wali',
}

const ECONOMIC_LABELS = {
  '0_500': 'Rp0 s.d Rp500.000',
  '500_1000': 'Rp500.001 s.d Rp1.000.000',
  '1000_2000': 'Rp1.000.001 s.d Rp2.000.000',
  '2000_3000': 'Rp2.000.001 s.d Rp3.000.000',
  '3000_plus': 'Lebih dari Rp3.000.000',
}

const DOCUMENT_LABELS = {
  kk: 'KK',
  akta: 'Akta Kelahiran',
  raporTK: 'Rapor TK',
  foto: 'Foto Anak',
  suratRekomendasi: 'Surat Rekomendasi',
  sertifikat: 'Sertifikat Pendukung',
}

const PRESTASI_LEVELS = [
  { key: 'kecamatan', label: 'Tingkat Kecamatan' },
  { key: 'kabupaten', label: 'Tingkat Kabupaten/Kota' },
  { key: 'provinsi', label: 'Tingkat Provinsi' },
]

const PRESTASI_RANKS = [
  { key: 'juara1', label: 'Juara 1' },
  { key: 'juara2', label: 'Juara 2' },
  { key: 'juara3', label: 'Juara 3' },
]

function normalizeScore(rawScore) {
  const parsed = Number(rawScore ?? 0)
  if (!Number.isFinite(parsed)) return 0
  if (parsed > 1) return parsed / 100
  return parsed
}

function getScoreStatus(score) {
  if (score >= 0.8) return { label: 'Skor Tinggi', className: 'bg-emerald-100 text-emerald-700' }
  if (score >= 0.55) return { label: 'Skor Sedang', className: 'bg-amber-100 text-amber-700' }
  return { label: 'Skor Rendah', className: 'bg-red-100 text-red-700' }
}

function getRaporCategory(value) {
  if (!Number.isFinite(value)) return '-'
  if (value >= 3.26) return 'BSB - Berkembang Sangat Baik'
  if (value >= 2.51) return 'BSH - Berkembang Sesuai Harapan'
  if (value >= 1.76) return 'MB - Mulai Berkembang'
  return 'BB - Belum Berkembang'
}

function getBestAchievementLabel(source) {
  for (let i = PRESTASI_LEVELS.length - 1; i >= 0; i -= 1) {
    const level = PRESTASI_LEVELS[i]
    const levelData = source?.[level.key] || {}
    const firstFoundRank = PRESTASI_RANKS.find((rank) => Number(levelData[rank.key] || 0) > 0)
    if (firstFoundRank) return `${firstFoundRank.label} ${level.label}`
  }
  return 'Tidak ada'
}

function toDateInputValue(date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function startOfDay(value) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

function endOfDay(value) {
  const date = new Date(value)
  date.setHours(23, 59, 59, 999)
  return date
}

function formatScore(score) {
  return normalizeScore(score).toFixed(2).replace('.', ',')
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateLong(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function buildFilterText({ scoreFilter, dateFilter, customStartDate, customEndDate }) {
  const labelSkor = {
    all: 'Semua skor',
    high: 'Skor Tinggi (>= 0,80)',
    medium: 'Skor Sedang (0,55-0,79)',
    low: 'Skor Rendah (< 0,55)',
  }

  const labelTanggal = {
    all: 'Semua tanggal',
    today: 'Hari ini',
    last7: '7 hari terakhir',
    last30: '30 hari terakhir',
  }

  const skorLabel = labelSkor[scoreFilter] || labelSkor.all
  if (dateFilter === 'custom' && customStartDate && customEndDate) {
    return `${skorLabel} | ${formatDate(customStartDate)} s.d ${formatDate(customEndDate)}`
  }
  return `${skorLabel} | ${labelTanggal[dateFilter] || labelTanggal.all}`
}

function formatBreakdownLabel(rawLabel) {
  const normalized = String(rawLabel || '').replace(/^C\d+\s*/i, '').trim()
  if (normalized.toLowerCase() === 'prestasi non-akademik') return 'Prestasi Non-Akad'
  return normalized || '-'
}

function openBulkPdfPrint({
  rows,
  schoolName,
  printedBy,
  filterText,
}) {
  const highCount = rows.filter((item) => item.score >= 0.8).length
  const mediumCount = rows.filter((item) => item.score >= 0.55 && item.score < 0.8).length
  const lowCount = rows.filter((item) => item.score < 0.55).length
  const avgScore = rows.length > 0
    ? rows.reduce((sum, item) => sum + item.score, 0) / rows.length
    : 0

  const tableRows = rows.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${item.name || '-'}</td>
      <td>${formatDate(item.submittedAt)}</td>
      <td>${formatScore(item.score)}</td>
      <td>${getScoreStatus(item.score).label}</td>
    </tr>
  `).join('')

  const detailPages = rows.map((item, index) => {
    const input = item.input || {}
    const result = item.result || {}
    const recommendations = Array.isArray(item.recommendations) ? item.recommendations : []
    const breakdownRows = Array.isArray(result.rows) ? result.rows : []
    const status = getScoreStatus(item.score)
    const docs = Object.entries(input?.dokumen || {})
      .filter(([, checked]) => Boolean(checked))
      .map(([key]) => DOCUMENT_LABELS[key] || key)
    const bestAchievement = getBestAchievementLabel(input.prestasi)

    const breakdownHtml = breakdownRows.map((row) => `
      <div class="meta-row">
        <span class="label">${formatBreakdownLabel(row.key).padEnd(20, ' ')}</span>
        <span>: ${row.display || '-'}    bobot ${Math.round((Number(row.bobot) || 0) * 100)}%  -> ${Number(row.kontribusi || 0).toFixed(2).replace('.', ',')}</span>
      </div>
    `).join('')

    return `
      <section class="detail-page">
        <div class="section-header">
          <strong>[No. ${index + 1} dari ${rows.length}]</strong> ${input.candidateName || '-'} <strong>Skor: ${formatScore(item.score)}</strong> ${status.label}
        </div>
        <div class="meta-row">Tanggal simulasi: ${formatDate(item.submittedAt)}</div>
        <div class="rule"></div>

        <h3>DATA ANAK & ORANG TUA</h3>
        <div class="rule light"></div>
        <div class="meta-row">Nama siswa         : ${input.candidateName || '-'}</div>
        <div class="meta-row">Jenis kelamin      : ${input.gender || '-'}</div>
        <div class="meta-row">Tanggal lahir      : ${formatDateLong(input.birthDate)}</div>
        <div class="meta-row">Usia per 1 Jul 2026: ${input.ageOnReference || '-'}</div>
        <div class="meta-row">Keterlibatan ortu  : ${PARENT_LABELS[input.parentInvolvement] || '-'}</div>
        <div class="meta-row">Nomor HP           : ${input.phoneNumber || '-'}</div>

        <h3>DOMISILI</h3>
        <div class="rule light"></div>
        <div class="meta-row">Alamat     : ${input.homeAddress || '-'}</div>
        <div class="meta-row">Kelurahan  : ${input.kelurahan || '-'}</div>
        <div class="meta-row">Kecamatan  : ${input.kecamatan || '-'}</div>
        <div class="meta-row">Koordinat  : ${Number(input.latitude || 0).toFixed(4)}, ${Number(input.longitude || 0).toFixed(4)}</div>

        <h3>RAPOR TK</h3>
        <div class="rule light"></div>
        <div class="meta-row">Rata-rata  : ${Number(input.raporRataRata || 0).toFixed(2).replace('.', ',')} / 4</div>
        <div class="meta-row">Kategori   : ${getRaporCategory(Number(input.raporRataRata || 0))}</div>

        <h3>PRESTASI</h3>
        <div class="rule light"></div>
        <div class="meta-row">Prestasi       : ${bestAchievement}</div>

        <h3>DOKUMEN</h3>
        <div class="rule light"></div>
        <div class="meta-row">Tersedia       : ${docs.length ? docs.join(', ') : '-'}</div>
        <div class="meta-row">Sertifikat     : ${input?.dokumen?.sertifikat ? 'Ada' : 'Tidak ada'}</div>

        <h3>KONDISI EKONOMI</h3>
        <div class="rule light"></div>
        <div class="meta-row">${ECONOMIC_LABELS[input.kondisiEkonomi] || '-'}</div>

        <h3>HASIL KELAYAKAN</h3>
        <div class="rule light"></div>
        <div class="meta-row">Skor V   : ${formatScore(item.score)}</div>
        <div class="meta-row">Status   : ${result.status || '-'}</div>

        <div class="meta-row" style="margin-top: 10px;">Rekomendasi:</div>
        ${recommendations.map((rec, recIndex) => `
          <div class="meta-row">${recIndex + 1}. ${rec.schoolName || '-'}  -  ${formatScore(rec.scoreV ?? rec.schoolScore)}  (${recIndex === 0 ? 'Rekomendasi Utama' : 'Alternatif Kedua'})</div>
        `).join('')}

        <h3>BREAKDOWN KRITERIA</h3>
        <div class="rule light"></div>
        ${breakdownHtml}
        <div class="meta-row">------------------------------------------------</div>
        <div class="meta-row">Total Skor V        : ${formatScore(item.score)}</div>
        <div class="meta-row">------------------------------------------------</div>
        <div class="meta-row">Catatan: Data ini adalah hasil simulasi mandiri</div>
        <div class="meta-row">orang tua melalui platform DILAYAKIN dan bukan</div>
        <div class="meta-row">merupakan keputusan penerimaan resmi sekolah.</div>
      </section>
    `
  }).join('')

  const html = `
    <html>
      <head>
        <title>DILAYAKIN - Laporan Hasil Simulasi</title>
        <style>
          body { font-family: Arial, sans-serif; color: #0f172a; margin: 24px; }
          h1 { font-size: 22px; margin: 0; }
          h2 { margin: 0; font-size: 18px; }
          h3 { margin: 16px 0 6px; font-size: 14px; }
          .line { margin: 8px 0 14px; border-bottom: 2px solid #0f172a; }
          .rule { margin: 6px 0 8px; border-bottom: 1px solid #0f172a; }
          .rule.light { border-bottom-color: #64748b; }
          .meta { margin: 4px 0; font-size: 14px; }
          .meta-row { margin: 2px 0; font-size: 12px; white-space: pre-wrap; }
          .section-header { font-size: 13px; margin-bottom: 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #94a3b8; padding: 8px; font-size: 12px; text-align: left; }
          th { background: #f1f5f9; }
          .page-break { page-break-before: always; }
          .detail-page { page-break-after: always; }
        </style>
      </head>
      <body>
        <h1>DILAYAKIN - Laporan Hasil Simulasi</h1>
        <div class="line"></div>
        <div class="meta">Sekolah      : ${schoolName}</div>
        <div class="meta">Dicetak oleh : ${printedBy}</div>
        <div class="meta">Tanggal cetak: ${formatDateLong(new Date())}</div>
        <div class="meta">Filter aktif : ${filterText}</div>
        <div class="meta">Total data   : ${rows.length} siswa</div>

        <h2 style="margin-top: 20px;">RINGKASAN STATISTIK</h2>
        <div class="rule"></div>
        <div class="meta">Skor Tinggi (>= 0,80)    : ${highCount} siswa</div>
        <div class="meta">Skor Sedang (0,55-0,79)  : ${mediumCount} siswa</div>
        <div class="meta">Skor Rendah (< 0,55)     : ${lowCount} siswa</div>
        <div class="meta">Rata-rata skor           : ${formatScore(avgScore)}</div>

        <div class="page-break"></div>
        <h2>Tabel Ringkasan Semua User Terfilter</h2>
        <div class="line"></div>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Siswa</th>
              <th>Tanggal</th>
              <th>Skor V</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="5">Tidak ada data.</td></tr>'}
          </tbody>
        </table>

        <div class="page-break"></div>
        ${detailPages || '<div class="meta">Tidak ada data detail.</div>'}
      </body>
    </html>
  `

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
}

export default function SchoolAdminRecommendedUsers() {
  const { schoolToManage, recommendationRecords } = useSchoolAdminData()
  const [scoreFilter, setScoreFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: 'score', direction: 'desc' })
  const [currentPage, setCurrentPage] = useState(1)

  if (!schoolToManage) {
    return <div className="rounded-xl bg-white p-4 text-sm text-slate-600">Loading school data...</div>
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [scoreFilter, dateFilter, customStartDate, customEndDate, sortConfig])

  const normalizedRecords = useMemo(() => {
    return recommendationRecords.map((record) => {
      // DEBUG: console.log('data submission:', record)
      return {
        ...record,
        // Gunakan scoreV dari backend (skor spesifik sekolah)
        // Jangan fallback ke result.score (skor global tertinggi)
        score: normalizeScore(record?.scoreV),
        submittedDate: record?.submittedAt ? new Date(record.submittedAt) : null,
        name: String(record?.input?.candidateName || ''),
      }
    })
  }, [recommendationRecords])

  const filteredRecords = useMemo(() => {
    const now = new Date()
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)
    const day7Start = startOfDay(new Date(now.getTime() - (6 * 24 * 60 * 60 * 1000)))
    const day30Start = startOfDay(new Date(now.getTime() - (29 * 24 * 60 * 60 * 1000)))
    const customStart = customStartDate ? startOfDay(new Date(`${customStartDate}T00:00:00`)) : null
    const customEnd = customEndDate ? endOfDay(new Date(`${customEndDate}T00:00:00`)) : null

    return normalizedRecords.filter((item) => {
      if (scoreFilter === 'high' && item.score < 0.8) return false
      if (scoreFilter === 'medium' && (item.score < 0.55 || item.score >= 0.8)) return false
      if (scoreFilter === 'low' && item.score >= 0.55) return false

      if (!item.submittedDate || Number.isNaN(item.submittedDate.getTime())) return dateFilter === 'all'
      if (dateFilter === 'today' && (item.submittedDate < todayStart || item.submittedDate > todayEnd)) return false
      if (dateFilter === 'last7' && item.submittedDate < day7Start) return false
      if (dateFilter === 'last30' && item.submittedDate < day30Start) return false
      if (dateFilter === 'custom') {
        if (customStart && item.submittedDate < customStart) return false
        if (customEnd && item.submittedDate > customEnd) return false
      }

      return true
    })
  }, [normalizedRecords, scoreFilter, dateFilter, customStartDate, customEndDate])

  const sortedRecords = useMemo(() => {
    const copied = [...filteredRecords]
    copied.sort((a, b) => {
      if (sortConfig.key === 'date') {
        const valueA = a.submittedDate ? a.submittedDate.getTime() : 0
        const valueB = b.submittedDate ? b.submittedDate.getTime() : 0
        return sortConfig.direction === 'asc' ? valueA - valueB : valueB - valueA
      }
      return sortConfig.direction === 'asc' ? a.score - b.score : b.score - a.score
    })
    return copied
  }, [filteredRecords, sortConfig])

  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / PAGE_SIZE))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const paginatedRecords = sortedRecords.slice(startIndex, startIndex + PAGE_SIZE)

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const handleSortChange = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'desc' }
    })
  }

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return '↕'
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }

  const handleDownloadPDF = () => {
    openBulkPdfPrint({
      rows: sortedRecords,
      schoolName: schoolToManage.name,
      printedBy: 'Admin (school_admin)',
      filterText: buildFilterText({ scoreFilter, dateFilter, customStartDate, customEndDate }),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Data Pengguna Direkomendasikan</h1>
          <p className="mt-1 text-sm text-slate-500">
            Daftar calon siswa yang hasil simulasinya merekomendasikan sekolah Anda.
          </p>
        </div>
        <button
          onClick={() => openBulkPdfPrint({
            rows: sortedRecords,
            schoolName: schoolToManage.name,
            printedBy: 'Admin Sekolah',
            filterText: buildFilterText({ scoreFilter, dateFilter, customStartDate, customEndDate })
          })}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
        >
          Export PDF Laporan
        </button>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={scoreFilter}
            onChange={(e) => setScoreFilter(e.target.value)}
            className="h-10 min-w-[220px] rounded-lg border border-slate-300 px-3 text-sm"
          >
            {scoreFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-10 min-w-[200px] rounded-lg border border-slate-300 px-3 text-sm"
          >
            {dateFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleDownloadPDF}
            className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ⬇ Download PDF (sesuai filter aktif)
          </button>
        </div>

        {dateFilter === 'custom' && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1 text-sm text-slate-600">
              Dari:
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                max={customEndDate || toDateInputValue(new Date())}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Sampai:
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                min={customStartDate || undefined}
                max={toDateInputValue(new Date())}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
        )}

        {sortedRecords.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
            Belum ada data hasil simulasi yang sesuai filter.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-700">
                  <th className="px-4 py-3 font-semibold">Nama siswa</th>
                  <th className="px-4 py-3 font-semibold">
                    <button type="button" onClick={() => handleSortChange('date')} className="inline-flex items-center gap-1">
                      Tanggal simulasi {getSortIndicator('date')}
                    </button>
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    <button type="button" onClick={() => handleSortChange('score')} className="inline-flex items-center gap-1">
                      Skor V {getSortIndicator('score')}
                    </button>
                  </th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map((record) => {
                  const status = getScoreStatus(record.score)
                  return (
                    <tr key={record.id} className="border-t border-slate-200">
                      <td className="px-4 py-3 font-semibold text-slate-900">{record.name || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(record.submittedAt)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{formatScore(record.score)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/school-admin/pengguna-direkomendasikan/${record.id}`}
                          className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          Detail
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {sortedRecords.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="text-slate-600">
              Menampilkan {startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, sortedRecords.length)} dari {sortedRecords.length} data
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <span className="font-semibold text-slate-700">
                Halaman {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
