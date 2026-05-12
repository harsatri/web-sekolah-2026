import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSchoolAdminData } from '../../hooks/useSchoolAdminData.js'

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
  { key: 'kecamatan', label: 'Tingkat Kecamatan', skor: 3 },
  { key: 'kabupaten', label: 'Tingkat Kabupaten/Kota', skor: 4 },
  { key: 'provinsi', label: 'Tingkat Provinsi', skor: 5 },
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

function formatDateShort(value) {
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

function formatScore(score) {
  return normalizeScore(score).toFixed(2).replace('.', ',')
}

function getScoreBadge(score) {
  const parsed = normalizeScore(score)
  if (parsed >= 0.8) return { label: 'Skor Tinggi', icon: '🟢', className: 'bg-emerald-100 text-emerald-700' }
  if (parsed >= 0.55) return { label: 'Skor Sedang', icon: '🟡', className: 'bg-amber-100 text-amber-700' }
  return { label: 'Skor Rendah', icon: '🔴', className: 'bg-red-100 text-red-700' }
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

function buildDetailPdf({
  selectedRecord,
  schoolToManage,
  statusBadge,
  checkedDocuments,
  bestAcademic,
  bestNonAcademic,
}) {
  const input = selectedRecord.input || {}
  const score = normalizeScore(selectedRecord?.scoreV ?? selectedRecord?.result?.score ?? 0)
  const recommendations = Array.isArray(selectedRecord.recommendations) ? selectedRecord.recommendations : []
  const rows = Array.isArray(selectedRecord?.result?.rows) ? selectedRecord.result.rows : []

  const breakdownRows = rows.map((row) => `
    <div class="meta">
      ${String(row.key || '-').padEnd(20, ' ')}: ${row.display || '-'}   bobot ${Math.round((Number(row.bobot) || 0) * 100)}%  -> ${Number(row.kontribusi || 0).toFixed(2).replace('.', ',')}
    </div>
  `).join('')

  const html = `
    <html>
      <head>
        <title>DILAYAKIN - Detail Simulasi Kelayakan</title>
        <style>
          body { font-family: "Courier New", monospace; color: #0f172a; margin: 24px; line-height: 1.5; }
          h1 { margin: 0 0 6px; font-size: 22px; }
          .line { border-bottom: 2px solid #0f172a; margin-bottom: 14px; }
          .section-title { margin-top: 16px; font-weight: 700; }
          .section-line { border-bottom: 1px solid #0f172a; margin: 4px 0 8px; }
          .meta { font-size: 14px; }
          .note { margin-top: 14px; font-size: 13px; }
        </style>
      </head>
      <body>
        <h1>DILAYAKIN - Detail Simulasi Kelayakan</h1>
        <div class="line"></div>
        <div class="meta">Dicetak oleh : Admin ${schoolToManage.name}</div>
        <div class="meta">Tanggal cetak: ${formatDateLong(new Date())}</div>

        <div class="section-title">DATA SISWA</div>
        <div class="section-line"></div>
        <div class="meta">Nama          : ${input.candidateName || '-'}</div>
        <div class="meta">Tanggal lahir : ${formatDateLong(input.birthDate)}</div>
        <div class="meta">Usia          : ${input.ageOnReference || '-'}</div>
        <div class="meta">Jenis kelamin : ${input.gender || '-'}</div>
        <div class="meta">Nomor HP      : ${input.phoneNumber || '-'}</div>

        <div class="section-title">DOMISILI</div>
        <div class="section-line"></div>
        <div class="meta">Kabupaten     : ${input.kabupaten || '-'}</div>
        <div class="meta">Kecamatan     : ${input.kecamatan || '-'}</div>
        <div class="meta">Kelurahan     : ${input.kelurahan || '-'}</div>
        <div class="meta">Alamat        : ${input.alamat || input.homeAddress || '-'}</div>

        <div class="section-title">AKADEMIK</div>
        <div class="section-line"></div>
        <div class="meta">Rata-rata rapor TK    : ${Number(input.raporRataRata || 0).toFixed(2).replace('.', ',')} / 4 (${getRaporCategory(Number(input.raporRataRata || 0)).split(' - ')[0]})</div>
        <div class="meta">Prestasi akademik     : ${bestAcademic}</div>
        <div class="meta">Prestasi non-akademik : ${bestNonAcademic}</div>

        <div class="section-title">DOKUMEN</div>
        <div class="section-line"></div>
        <div class="meta">Tersedia : ${checkedDocuments.length ? checkedDocuments.join(', ') : '-'}</div>
        <div class="meta">Sertifikat pendukung: ${input?.dokumen?.sertifikat ? 'Ada' : 'Tidak ada'}</div>

        <div class="section-title">KONDISI EKONOMI</div>
        <div class="section-line"></div>
        <div class="meta">${ECONOMIC_LABELS[input.kondisiEkonomi] || '-'}</div>

        <div class="section-title">HASIL KELAYAKAN</div>
        <div class="section-line"></div>
        <div class="meta">Skor V          : ${formatScore(score)}</div>
        <div class="meta">Status          : ${selectedRecord?.result?.status || statusBadge.label}</div>

        <div class="section-title">Rekomendasi:</div>
        ${recommendations.map((item, idx) => `
          <div class="meta">${idx + 1}. ${item.schoolName || '-'}  -  ${formatScore(item.scoreV ?? item.schoolScore)}  (${idx === 0 ? 'Rekomendasi Utama' : 'Alternatif Kedua'})</div>
        `).join('')}

        <div class="section-title">BREAKDOWN KRITERIA</div>
        <div class="section-line"></div>
        ${breakdownRows}
        <div class="meta">---------------------------------------------</div>
        <div class="meta">Total Skor V        : ${formatScore(score)}</div>

        <div class="note">
          ---------------------------------------------<br/>
          Catatan: Data ini adalah hasil simulasi mandiri orang tua melalui platform DILAYAKIN dan bukan merupakan keputusan penerimaan resmi sekolah.
        </div>
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

function SummaryTable({ title, rows }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">{title}</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <tbody>
            {rows.map((item) => (
              <tr key={item.label} className="border-t border-slate-200 first:border-t-0">
                <td className="w-[42%] px-3 py-2 font-semibold text-slate-600">{item.label}</td>
                <td className="px-3 py-2 text-slate-900">{item.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function SchoolAdminRecommendedUserDetail() {
  const { schoolToManage, recommendationRecords } = useSchoolAdminData()
  const { submissionId } = useParams()
  const navigate = useNavigate()
  const [showBreakdown, setShowBreakdown] = useState(false)

  if (!schoolToManage) {
    return <div className="rounded-xl bg-white p-4 text-sm text-slate-600">Loading school data...</div>
  }

  const selectedRecord = recommendationRecords.find((item) => item.id === submissionId)

  if (!selectedRecord) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-lg font-bold text-slate-900">Data simulasi tidak ditemukan</div>
        <Link to="/school-admin/pengguna-direkomendasikan" className="btn-nav-icon mt-4" aria-label="Kembali ke Daftar">
          &lt;
        </Link>
      </section>
    )
  }

  const input = selectedRecord.input || {}
  const score = normalizeScore(selectedRecord?.scoreV ?? selectedRecord?.result?.score ?? 0)
  const scoreBadge = getScoreBadge(score)
  const checkedDocuments = Object.entries(input?.dokumen || {})
    .filter(([, checked]) => Boolean(checked))
    .map(([key]) => DOCUMENT_LABELS[key] || key)
  const bestAcademic = getBestAchievementLabel(input.prestasiAkademik)
  const bestNonAcademic = getBestAchievementLabel(input.prestasiNonAkademik)
  const recommendations = Array.isArray(selectedRecord.recommendations) ? selectedRecord.recommendations : []
  const breakdownRows = Array.isArray(selectedRecord?.result?.rows) ? selectedRecord.result.rows : []
  const raporValue = Number(input.raporRataRata || 0)

  const dataAnakRows = [
    { label: 'Nama siswa', value: input.candidateName || '-' },
    { label: 'Jenis kelamin', value: input.gender || '-' },
    { label: 'Tanggal lahir', value: formatDateLong(input.birthDate) },
    { label: 'Usia per 1 Juli 2026', value: input.ageOnReference || '-' },
    { label: 'Keterlibatan orang tua', value: PARENT_LABELS[input.parentInvolvement] || '-' },
    { label: 'Nomor HP', value: input.phoneNumber || '-' },
  ]
  const domisiliRows = [
    { label: 'Kabupaten', value: input.kabupaten || '-' },
    { label: 'Kecamatan', value: input.kecamatan || '-' },
    { label: 'Kelurahan', value: input.kelurahan || '-' },
    { label: 'Alamat', value: input.alamat || input.homeAddress || '-' },
  ]
  const raporRows = [
    { label: 'Rata-rata rapor', value: `${raporValue.toFixed(2).replace('.', ',')} / 4` },
    { label: 'Kategori', value: getRaporCategory(raporValue) },
  ]
  const prestasiRows = [
    { label: 'Prestasi akademik terbaik', value: bestAcademic },
    { label: 'Prestasi non-akademik terbaik', value: bestNonAcademic },
  ]
  const dokumenRows = [
    { label: 'Dokumen tersedia', value: checkedDocuments.length ? checkedDocuments.join(', ') : '-' },
    { label: 'Sertifikat pendukung', value: input?.dokumen?.sertifikat ? 'Ada' : 'Tidak ada' },
  ]
  const ekonomiRows = [
    { label: 'Rentang penghasilan', value: ECONOMIC_LABELS[input.kondisiEkonomi] || '-' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <button
          type="button"
          onClick={() => navigate('/school-admin/pengguna-direkomendasikan')}
          aria-label="Kembali"
          className="btn-nav-icon"
        >
          &lt;
        </button>
        <div className="text-center text-lg font-extrabold text-slate-900">Detail Simulasi User</div>
        <button
          type="button"
          onClick={() => buildDetailPdf({
            selectedRecord,
            schoolToManage,
            statusBadge: scoreBadge,
            checkedDocuments,
            bestAcademic,
            bestNonAcademic,
          })}
          className="btn-primary"
        >
          ⬇ Download PDF
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
        <span className="font-semibold">Nama: {input.candidateName || '-'}</span>
        <span className="mx-2">•</span>
        <span>Simulasi: {formatDateShort(selectedRecord.submittedAt)}</span>
        <span className="mx-2">•</span>
        <span>Skor: {formatScore(score)}</span>
        <span className="mx-2">•</span>
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${scoreBadge.className}`}>
          {scoreBadge.icon} {scoreBadge.label}
        </span>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Bagian 1 - Ringkasan Data</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <SummaryTable title="Data Anak & Orang Tua" rows={dataAnakRows} />
          <SummaryTable title="Domisili" rows={domisiliRows} />
          <SummaryTable title="Rapor TK" rows={raporRows} />
          <SummaryTable title="Prestasi" rows={prestasiRows} />
          <SummaryTable title="Dokumen" rows={dokumenRows} />
          <SummaryTable title="Kondisi Ekonomi" rows={ekonomiRows} />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Bagian 2 - Hasil Kelayakan</h2>

        <div className="rounded-2xl border border-slate-200 p-5">
          <div className="text-sm text-slate-500">Skor Kelayakan</div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div className="text-4xl font-extrabold text-slate-900">{formatScore(score)}</div>
            <div className="text-sm font-semibold text-teal-700">{selectedRecord?.result?.status || scoreBadge.label}</div>
          </div>
          <div className="mt-3 h-3 w-full rounded-full bg-slate-200">
            <div
              className="h-3 rounded-full bg-teal-600 transition-all"
              style={{ width: `${Math.max(0, Math.min(100, score * 100))}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-5">
          <div className="text-sm font-semibold text-slate-900">Rekomendasi Sekolah</div>
          <div className="mt-3 space-y-3">
            {recommendations.map((item, index) => {
              const isAdminSchool =
                Number(item?.schoolId) === Number(schoolToManage?.id) ||
                String(item?.schoolName || '').toLowerCase() === String(schoolToManage?.name || '').toLowerCase()
              return (
                <div
                  key={`${item.schoolId}-${index}`}
                  className={`rounded-xl border px-4 py-3 ${isAdminSchool ? 'border-teal-600 bg-teal-50' : 'border-slate-200 bg-white'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-slate-900">{item.schoolName}</div>
                    <div className="text-sm font-bold text-slate-800">Skor: {formatScore(item.scoreV ?? item.schoolScore)}</div>
                  </div>
                  <div className="text-sm text-slate-600">
                    {index === 0 ? 'Rekomendasi utama' : 'Alternatif kedua'}
                    {isAdminSchool ? ' · ← Sekolah Anda' : ''}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <button
            type="button"
            className="btn-secondary w-full justify-start text-left text-slate-800"
            onClick={() => setShowBreakdown((prev) => !prev)}
          >
            {showBreakdown ? 'Sembunyikan Detail Perhitungan ▲' : 'Lihat Detail Perhitungan ▼'}
          </button>
          {showBreakdown && (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-slate-700">
                    <th className="px-3 py-2 font-semibold">Kriteria</th>
                    <th className="px-3 py-2 font-semibold">Skor</th>
                    <th className="px-3 py-2 font-semibold">Bobot</th>
                    <th className="px-3 py-2 font-semibold">Kontribusi</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdownRows.map((row) => (
                    <tr key={row.key} className="border-t border-slate-200">
                      <td className="px-3 py-2">{row.key}</td>
                      <td className="px-3 py-2">{row.display}</td>
                      <td className="px-3 py-2">{Math.round((Number(row.bobot) || 0) * 100)}%</td>
                      <td className="px-3 py-2">{Number(row.kontribusi || 0).toFixed(2).replace('.', ',')}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                    <td className="px-3 py-2" colSpan={3}>Total Skor V</td>
                    <td className="px-3 py-2">{formatScore(score)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
