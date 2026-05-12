import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useSchools } from '../../contexts/SchoolContext.jsx'
import { apiJson } from '../../utils/api.js'
const REFERENCE_DATE = new Date('2026-07-01T00:00:00')
const RAPOR_KONVERSI = { BB: 1, MB: 2, BSH: 3, BSB: 4 }
const RAPOR_PILIHAN = ['BB', 'MB', 'BSH', 'BSB']
const PRESTASI_LEVELS = [
  { key: 'kecamatan', label: 'Tingkat Kecamatan', skor: 3 },
  { key: 'kabupaten', label: 'Tingkat Kabupaten/Kota', skor: 4 },
  { key: 'provinsi', label: 'Tingkat Provinsi', skor: 5 },
]
const PRESTASI_JUARA = [
  { key: 'juara1', label: 'Juara 1' },
  { key: 'juara2', label: 'Juara 2' },
  { key: 'juara3', label: 'Juara 3' },
]
const SKOR_C7_MAP = {
  '0_500': 5,
  '500_1000': 4,
  '1000_2000': 3,
  '2000_3000': 2,
  '3000_plus': 1,
}
const RAPOR_ASPEK = [
  { key: 'agamaMoral', label: 'Nilai agama dan moral' },
  { key: 'sosialEmosional', label: 'Sosial emosional' },
  { key: 'fisikMotorik', label: 'Fisik motorik' },
  { key: 'kognitif', label: 'Kognitif' },
  { key: 'bahasa', label: 'Bahasa' },
  { key: 'seni', label: 'Seni' },
  { key: 'perilakuKemandirian', label: 'Perilaku & kemandirian' },
]

function hitungRataRataRapor(pilihan) {
  const nilai = Object.values(pilihan || {})
    .map((kategori) => RAPOR_KONVERSI[kategori])
    .filter((value) => Number.isFinite(value))
  if (nilai.length === 0) return null
  return nilai.reduce((a, b) => a + b, 0) / nilai.length
}

function hitungSkorC3(rataRata) {
  if (rataRata == null) return null
  if (rataRata >= 3.26) return 4
  if (rataRata >= 2.51) return 3
  if (rataRata >= 1.76) return 2
  return 1
}

function getStatusRapor(pilihan, rataRata) {
  const totalAspek = RAPOR_ASPEK.length
  const terisi = Object.keys(pilihan || {}).length
  if (terisi === 0) return 'Belum ada aspek yang dipilih'
  if (terisi < totalAspek) return `${terisi} dari ${totalAspek} aspek sudah dipilih`
  if (rataRata >= 3.26) return 'Otomatis: lengkap dan siap diverifikasi — BSB'
  if (rataRata >= 2.51) return 'Otomatis: lengkap dan siap diverifikasi — BSH'
  if (rataRata >= 1.76) return 'Otomatis: lengkap dan siap diverifikasi — MB'
  return 'Otomatis: lengkap dan siap diverifikasi — BB'
}

function createPrestasiState() {
  return PRESTASI_LEVELS.reduce((acc, level) => {
    acc[level.key] = { juara1: 0, juara2: 0, juara3: 0 }
    return acc
  }, {})
}

function hitungSkorPrestasi(data) {
  let skorTertinggi = 1
  for (const [tingkat, juaraData] of Object.entries(data || {})) {
    const skorTingkat = PRESTASI_LEVELS.find((level) => level.key === tingkat)?.skor || 0
    for (const jumlah of Object.values(juaraData || {})) {
      if (Number(jumlah) > 0) skorTertinggi = Math.max(skorTertinggi, skorTingkat)
    }
  }
  return skorTertinggi
}

function hitungSkorC6(dokumen, ageDecimal) {
  const wajib = ['kk', 'akta', 'raporTK', 'foto']
  const isKondisionalWajib = Number(ageDecimal) >= 5.5 && Number(ageDecimal) < 6
  const totalWajib = isKondisionalWajib ? 5 : 4
  const wajibChecked = wajib.filter((k) => dokumen?.[k]).length
  const kondisionalChecked = dokumen?.suratRekomendasi ? 1 : 0
  const totalChecked = wajibChecked + (isKondisionalWajib ? kondisionalChecked : 0)
  return (totalChecked / totalWajib) * 5
}

function hitungSkorC7(ekonomi) {
  return SKOR_C7_MAP[ekonomi] || 0
}

function hitungSkorC1(ageDecimal) {
  const usia = Number(ageDecimal) || 0
  if (usia >= 6 && usia <= 7) return 5
  if (usia >= 5.5 && usia < 6) return 4
  if (usia > 7 && usia <= 8) return 3
  return 0
}

function getLabelStatusKelayakan(skorV) {
  if (skorV >= 0.85) return 'Sangat Direkomendasikan'
  if (skorV >= 0.7) return 'Direkomendasikan'
  if (skorV >= 0.55) return 'Cukup Direkomendasikan'
  return 'Perlu Perhatian Lebih'
}

function getKeteranganSekolah(index) {
  return index === 0
    ? 'Unggul pada usia + domisili'
    : 'Masih layak sebagai alternatif kedua'
}

function getPrestasiTerbaikLabel(data) {
  for (let i = PRESTASI_LEVELS.length - 1; i >= 0; i -= 1) {
    const level = PRESTASI_LEVELS[i]
    const values = Object.values(data?.[level.key] || {})
    if (values.some((count) => Number(count) > 0)) return level.label
  }
  return 'Tidak ada'
}

function hitungSAW(formData) {
  const bobot = {
    C1: 0.30,
    C2: 0.25,
    C3: 0.15,
    C4: 0.10,
    C5: 0.10,
    C6: 0.07,
    C7: 0.03,
  }
  const x = {
    C1: Number(formData.skorC1) || 0,
    C2_Sokanegara: Number(formData.skorC2_Sokanegara) || 1,
    C2_Kranji: Number(formData.skorC2_Kranji) || 1,
    C3: Number(formData.raporRataRata) || 0,
    C4: Number(formData.skorC4) || 1,
    C5: Number(formData.skorC5) || 1,
    C6: Number(formData.skorC6) || 0,
    C7: Number(formData.skorC7) || 1,
  }
  const maxVal = { C1: 5, C2: 5, C3: 4, C4: 5, C5: 5, C6: 5, C7: 5 }
  const r = {
    C1: x.C1 / maxVal.C1,
    C3: x.C3 / maxVal.C3,
    C4: x.C4 / maxVal.C4,
    C5: x.C5 / maxVal.C5,
    C6: x.C6 / maxVal.C6,
    C7: x.C7 > 0 ? 1 / x.C7 : 0,
  }
  const vSokanegara = (
    bobot.C1 * r.C1 +
    bobot.C2 * (x.C2_Sokanegara / maxVal.C2) +
    bobot.C3 * r.C3 +
    bobot.C4 * r.C4 +
    bobot.C5 * r.C5 +
    bobot.C6 * r.C6 +
    bobot.C7 * r.C7
  )
  const vKranji = (
    bobot.C1 * r.C1 +
    bobot.C2 * (x.C2_Kranji / maxVal.C2) +
    bobot.C3 * r.C3 +
    bobot.C4 * r.C4 +
    bobot.C5 * r.C5 +
    bobot.C6 * r.C6 +
    bobot.C7 * r.C7
  )
  const rows = [
    {
      key: 'C1 Usia',
      display: `${x.C1}/5`,
      bobot: bobot.C1,
      kontribusi: bobot.C1 * r.C1,
      progress: (x.C1 / 5) * 100,
    },
    {
      key: 'C2 Domisili',
      display: `${Math.max(x.C2_Sokanegara, x.C2_Kranji)}/5`,
      bobot: bobot.C2,
      kontribusi: bobot.C2 * Math.max(x.C2_Sokanegara, x.C2_Kranji) / 5,
      progress: (Math.max(x.C2_Sokanegara, x.C2_Kranji) / 5) * 100,
    },
    {
      key: 'C3 Rapor TK',
      display: `${(Number(x.C3) || 0).toFixed(2).replace('.', ',')}/4`,
      bobot: bobot.C3,
      kontribusi: bobot.C3 * r.C3,
      progress: (x.C3 / 4) * 100,
    },
    {
      key: 'C4 Prestasi Akademik',
      display: `${x.C4}/5`,
      bobot: bobot.C4,
      kontribusi: bobot.C4 * r.C4,
      progress: (x.C4 / 5) * 100,
    },
    {
      key: 'C5 Prestasi Non-Akademik',
      display: `${x.C5}/5`,
      bobot: bobot.C5,
      kontribusi: bobot.C5 * r.C5,
      progress: (x.C5 / 5) * 100,
    },
    {
      key: 'C6 Kelengkapan Dokumen',
      display: `${x.C6.toFixed(2).replace('.', ',')}/5`,
      bobot: bobot.C6,
      kontribusi: bobot.C6 * r.C6,
      progress: (x.C6 / 5) * 100,
    },
    {
      key: 'C7 Kondisi Ekonomi',
      display: `${x.C7}/5`,
      bobot: bobot.C7,
      kontribusi: bobot.C7 * r.C7,
      progress: (x.C7 / 5) * 100,
    },
  ]

  return {
    vSokanegara: Number(vSokanegara.toFixed(4)),
    vKranji: Number(vKranji.toFixed(4)),
    skorTertinggi: Number(Math.max(vSokanegara, vKranji).toFixed(4)),
    rekomendasi: vSokanegara >= vKranji ? 'SDN 1 Sokanegara' : 'SDN 1 Kranji',
    breakdown: { x, r, bobot, rows },
  }
}

// Mapping kelurahan -> kecamatan untuk wilayah Purwokerto & sekitarnya
// Sumber: data administratif Kabupaten Banyumas
const KELURAHAN_TO_KECAMATAN = {
  // Purwokerto Timur
  'arcawinangun': 'Purwokerto Timur',
  'kranji': 'Purwokerto Timur',
  'mersi': 'Purwokerto Timur',
  'purwokerto lor': 'Purwokerto Timur',
  'purwokerto wetan': 'Purwokerto Timur',
  'sokanegara': 'Purwokerto Timur',

  // Purwokerto Selatan
  'berkoh': 'Purwokerto Selatan',
  'karangklesem': 'Purwokerto Selatan',
  'karangpucung': 'Purwokerto Selatan',
  'purwokerto kidul': 'Purwokerto Selatan',
  'purwokerto kulon': 'Purwokerto Selatan',
  'tanjung': 'Purwokerto Selatan',
  'teluk': 'Purwokerto Selatan',

  // Purwokerto Barat
  'bantarsoka': 'Purwokerto Barat',
  'karanglewas lor': 'Purwokerto Barat',
  'kedungwuluh': 'Purwokerto Barat',
  'kober': 'Purwokerto Barat',
  'pasir kidul': 'Purwokerto Barat',
  'pasirmuncang': 'Purwokerto Barat',
  'rejasari': 'Purwokerto Barat',

  // Purwokerto Utara
  'bancarkembar': 'Purwokerto Utara',
  'bobosan': 'Purwokerto Utara',
  'grendeng': 'Purwokerto Utara',
  'karangwangkal': 'Purwokerto Utara',
  'pabuaran': 'Purwokerto Utara',
  'purwanegara': 'Purwokerto Utara',
  'sumampir': 'Purwokerto Utara',

  // Sokaraja
  'karangrau': 'Sokaraja',
  'sokaraja lor': 'Sokaraja',
  'sokaraja kidul': 'Sokaraja',
  'sokaraja kulon': 'Sokaraja',
  'sokaraja tengah': 'Sokaraja',
  'sokaraja wetan': 'Sokaraja',
  'wiradadi': 'Sokaraja',
  'klahang': 'Sokaraja',
  'lemberang': 'Sokaraja',

  // Kembaran
  'kembaran': 'Kembaran',
  'dukuhwaluh': 'Kembaran',
  'karangsari': 'Kembaran',
  'ledug': 'Kembaran',
  'pliken': 'Kembaran',

  // Sumbang
  'sumbang': 'Sumbang',
  'kotayasa': 'Sumbang',
  'silado': 'Sumbang',
  'banjarsari kulon': 'Sumbang',
  'karangcegak': 'Sumbang',

  // Baturaden
  'baturaden': 'Baturaden',
  'rempoah': 'Baturaden',
  'kebumen': 'Baturaden',
  'pandak': 'Baturaden',
}

function parseWilayah(address) {
  // Ambil kelurahan dari field yang paling akurat
  const kelurahan =
    address?.village ||
    address?.suburb ||
    address?.neighbourhood ||
    address?.hamlet ||
    address?.quarter || ''

  const kelurahanNorm = kelurahan.trim().toLowerCase()

  // Cek lookup table dulu - paling akurat untuk Purwokerto
  const kecamatanFromLookup = KELURAHAN_TO_KECAMATAN[kelurahanNorm] || ''

  if (kecamatanFromLookup) {
    return {
      kelurahan: kelurahan.trim(),
      kecamatan: kecamatanFromLookup,
    }
  }

  // Fallback: district lebih akurat dari county untuk kecamatan
  // Pastikan tidak mengembalikan "Banyumas" (itu kabupaten)
  const rawKecamatan =
    address?.district ||
    address?.city_district ||
    address?.municipality || ''

  const kecamatan = rawKecamatan.toLowerCase() === 'banyumas'
    ? ''
    : rawKecamatan

  return {
    kelurahan: kelurahan.trim(),
    kecamatan: kecamatan.trim(),
  }
}

function parseWilayahFromDisplayName(displayName, addressObj) {
  // Prioritas 1: gunakan parseWilayah dari addressObj jika tersedia
  if (addressObj && Object.keys(addressObj).length > 0) {
    const result = parseWilayah(addressObj)
    if (result.kelurahan || result.kecamatan) return result
  }

  // Prioritas 2: parse dari display_name string
  const parts = String(displayName || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)

  if (!parts.length) return { kelurahan: '', kecamatan: '' }

  const ignoreWords = ['banyumas', 'kabupaten banyumas', 'jawa tengah', 'jawa', 'indonesia']

  const cleanParts = parts.filter((part) => {
    const lower = part.toLowerCase()
    return (
      !lower.includes('jl') &&
      !lower.includes('jalan') &&
      !/^\d/.test(lower) &&
      !ignoreWords.includes(lower)
    )
  })

  // Coba cocokkan setiap part dengan lookup table kelurahan
  let kelurahan = ''
  let kecamatan = ''

  for (const part of cleanParts) {
    const lower = part.toLowerCase()
    if (KELURAHAN_TO_KECAMATAN[lower]) {
      kelurahan = part
      kecamatan = KELURAHAN_TO_KECAMATAN[lower]
      break
    }
  }

  // Jika tidak ketemu di lookup, ambil part pertama sebagai kelurahan
  if (!kelurahan) {
    kelurahan = cleanParts[0] || ''
  }

  // Cari kecamatan dari daftar kecamatan yang dikenal jika masih kosong
  if (!kecamatan) {
    const knownKecamatan = [
      'Purwokerto Timur', 'Purwokerto Barat',
      'Purwokerto Selatan', 'Purwokerto Utara',
      'Sokaraja', 'Kembaran', 'Sumbang', 'Baturaden',
    ]
    const lowerDisplay = String(displayName || '').toLowerCase()
    kecamatan = knownKecamatan.find((k) =>
      lowerDisplay.includes(k.toLowerCase())
    ) || ''
  }

  return { kelurahan, kecamatan }
}

function normalizeWilayahName(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/^kelurahan\s+/i, '')
    .replace(/^kecamatan\s+/i, '')
    .trim()
}

function hitungSkorC2(kelurahan, kecamatan, sekolah) {
  const lokasiSekolah = {
    'SDN 1 Sokanegara': { kelurahan: 'Sokanegara', kecamatan: 'Purwokerto Timur' },
    'SDN 1 Kranji': { kelurahan: 'Kranji', kecamatan: 'Purwokerto Timur' },
  }
  const target = lokasiSekolah[sekolah]
  if (!target) return 1
  if (normalizeWilayahName(kelurahan) === normalizeWilayahName(target.kelurahan)) return 5
  if (normalizeWilayahName(kecamatan) === normalizeWilayahName(target.kecamatan)) return 3
  return 1
}

function StepDomisili({ formData, setFormData, onNext, onBack }) {
  const [inlineError, setInlineError] = useState('')
  const kecamatanOptions = [
    'Purwokerto Utara',
    'Purwokerto Barat',
    'Purwokerto Timur',
    'Purwokerto Selatan',
  ]
  const kelurahanByKecamatan = {
    'Purwokerto Utara': ['Bancarkembar', 'Purwanegara', 'Sumampir', 'Grendeng', 'Karangwangkal', 'Pabuaran', 'Bobosan'],
    'Purwokerto Barat': ['Bantarsoka', 'Karanglewas Lor', 'Kedungwuluh', 'Kober', 'Pasir Kidul', 'Pasirmuncang', 'Rejasari'],
    'Purwokerto Timur': ['Arcawinangun', 'Kranji', 'Mersi', 'Purwokerto Lor', 'Purwokerto Wetan', 'Sokanegara'],
    'Purwokerto Selatan': ['Berkoh', 'Karangklesem', 'Karangpucung', 'Purwokerto Kidul', 'Purwokerto Kulon', 'Tanjung', 'Teluk'],
  }

  useEffect(() => {
    if (String(formData.kabupaten || '').trim() !== 'Banyumas') {
      setFormData((prev) => ({ ...prev, kabupaten: 'Banyumas' }))
    }
  }, [formData.kabupaten, setFormData])

  const updateScoring = (kelurahan, kecamatan) => ({
    skorC2_Sokanegara: hitungSkorC2(kelurahan, kecamatan, 'SDN 1 Sokanegara'),
    skorC2_Kranji: hitungSkorC2(kelurahan, kecamatan, 'SDN 1 Kranji'),
  })

  const handleKecamatanChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      kabupaten: 'Banyumas',
      kecamatan: value,
      kelurahan: '',
      ...updateScoring('', value),
    }))
    if (inlineError) setInlineError('')
  }

  const handleKelurahanChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      kabupaten: 'Banyumas',
      kelurahan: value,
      ...updateScoring(value, prev.kecamatan || ''),
    }))
    if (inlineError) setInlineError('')
  }

  const handleNext = () => {
    if (!String(formData.kabupaten || '').trim() || !String(formData.kecamatan || '').trim() || !String(formData.kelurahan || '').trim()) {
      setInlineError('Kabupaten, kecamatan, dan kelurahan wajib dipilih sebelum lanjut.')
      return
    }
    setInlineError('')
    onNext()
  }

  const kelurahanOptions = kelurahanByKecamatan[formData.kecamatan] || []

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xl font-bold text-slate-900">Langkah 2 - Domisili</div>
        <div className="text-sm text-slate-600">Pilih wilayah domisili melalui dropdown bertingkat.</div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-2">
          <label className="text-sm font-semibold">Kabupaten</label>
          <select
            value="Banyumas"
            disabled
            className="h-12 rounded-xl border border-slate-300 bg-slate-100 px-4 text-slate-700"
          >
            <option>Banyumas</option>
          </select>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-semibold">Kecamatan</label>
          <select
            value={formData.kecamatan || ''}
            onChange={(e) => handleKecamatanChange(e.target.value)}
            className="h-12 rounded-xl border border-slate-300 bg-white px-4"
          >
            <option value="">Pilih kecamatan</option>
            {kecamatanOptions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-semibold">Kelurahan</label>
          <select
            value={formData.kelurahan || ''}
            onChange={(e) => handleKelurahanChange(e.target.value)}
            disabled={!formData.kecamatan}
            className="h-12 rounded-xl border border-slate-300 bg-white px-4 disabled:bg-slate-100 disabled:text-slate-500"
          >
            <option value="">Pilih kelurahan</option>
            {kelurahanOptions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-8 border-t border-slate-200 pt-4">
        {inlineError && (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {inlineError}
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={onBack} aria-label="Kembali" className="btn-nav-icon">
            &lt;
          </button>
          <button type="button" onClick={handleNext} aria-label="Lanjut" className="btn-nav-icon">
            &gt;
          </button>
        </div>
      </div>
    </div>
  )
}

function StepRaporTK({ formData, setFormData, onNext, onBack }) {
  const [inlineError, setInlineError] = useState('')
  const raporAspek = formData?.raporAspek || {}
  const aspekTerisi = Object.keys(raporAspek).length
  const semuaAspekTerisi = aspekTerisi === RAPOR_ASPEK.length
  const rataRata = Number.isFinite(formData?.raporRataRata) ? Number(formData.raporRataRata) : null
  const statusRapor = getStatusRapor(raporAspek, rataRata)
  const rataRataText = semuaAspekTerisi && rataRata != null
    ? `${rataRata.toFixed(2).replace('.', ',')} dari skala 4`
    : 'Menunggu semua aspek diisi...'

  const handleSelectKategori = (aspekKey, kategori) => {
    const nextRaporAspek = {
      ...raporAspek,
      [aspekKey]: kategori,
    }
    const rawRataRata = hitungRataRataRapor(nextRaporAspek)
    const raporRataRata = rawRataRata == null ? null : Number(rawRataRata.toFixed(2))
    const skorC3 = hitungSkorC3(raporRataRata)

    setFormData((prev) => ({
      ...prev,
      raporAspek: nextRaporAspek,
      raporRataRata,
      skorC3,
    }))
    if (inlineError) setInlineError('')
  }

  const handleNextStep = () => {
    if (!semuaAspekTerisi) {
      setInlineError('Masih ada aspek rapor yang belum dipilih. Lengkapi semua baris terlebih dahulu.')
      return
    }
    setInlineError('')
    onNext()
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xl font-bold text-slate-900">Langkah 3 - Nilai rapor TK</div>
        <div className="text-sm text-slate-600">Pilih kategori sesuai rapor TK anak.</div>
        <div className="mt-3 rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-900">
          <span className="font-bold text-blue-800">PENTING:</span> BB = Belum Berkembang, MB = Mulai Berkembang, BSH = Berkembang Sesuai Harapan, BSB = Berkembang Sangat Baik
        </div>
      </div>

      <div className="relative">
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-800">
                <th className="px-3 py-3 text-left font-semibold">Aspek perkembangan rapor TK</th>
                {RAPOR_PILIHAN.map((kategori) => (
                  <th key={kategori} className="px-3 py-3 text-center font-semibold">{kategori}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RAPOR_ASPEK.map((aspek) => (
                <tr key={aspek.key} className="border-t border-slate-200">
                  <td className="px-3 py-3 font-medium text-slate-700">{aspek.label}</td>
                  {RAPOR_PILIHAN.map((kategori) => {
                    const active = raporAspek[aspek.key] === kategori
                    return (
                      <td key={`${aspek.key}-${kategori}`} className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleSelectKategori(aspek.key, kategori)}
                          className={`w-full rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                            active
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {kategori}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-slate-800/80 px-3 py-1 text-[10px] font-semibold text-white shadow-lg md:hidden">
          <span>⇆ Geser</span>
        </div>
        <div className="mt-6"></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-slate-900">Rata-rata konversi rapor</label>
          <p className="text-xs text-slate-500">Otomatis dari pilihan BB, MB, BSH, dan BSB pada seluruh aspek rapor.</p>
          <input
            readOnly
            value={rataRataText}
            className="h-12 rounded-xl border border-slate-200 bg-slate-100 px-4 text-slate-700"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-slate-900">Status input rapor</label>
          <p className="text-xs text-slate-500">Otomatis. Muncul lengkap jika semua aspek rapor sudah dipilih.</p>
          <input
            readOnly
            value={statusRapor}
            className="h-12 rounded-xl border border-slate-200 bg-slate-100 px-4 text-slate-700"
          />
        </div>
      </div>

      {inlineError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {inlineError}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <button type="button" onClick={onBack} aria-label="Kembali" className="btn-nav-icon">
          &lt;
        </button>
        <button type="button" onClick={handleNextStep} aria-label="Lanjut" className="btn-nav-icon">
          &gt;
        </button>
      </div>
    </div>
  )
}

function StepPrestasiAnak({ formData, setFormData, onNext, onBack }) {
  const [tipeAktif, setTipeAktif] = useState('akademik')
  const prestasiAkademik = formData?.prestasiAkademik || createPrestasiState()
  const prestasiNonAkademik = formData?.prestasiNonAkademik || createPrestasiState()
  const dataAktif = tipeAktif === 'akademik' ? prestasiAkademik : prestasiNonAkademik

  const handleChangeNilai = (tingkatKey, juaraKey, value) => {
    const sanitizedValue = Math.max(0, Number(value) || 0)
    const nextDataAktif = {
      ...dataAktif,
      [tingkatKey]: {
        ...dataAktif[tingkatKey],
        [juaraKey]: sanitizedValue,
      },
    }
    const nextAkademik = tipeAktif === 'akademik' ? nextDataAktif : prestasiAkademik
    const nextNonAkademik = tipeAktif === 'akademik' ? prestasiNonAkademik : nextDataAktif

    setFormData((prev) => ({
      ...prev,
      prestasiAkademik: nextAkademik,
      prestasiNonAkademik: nextNonAkademik,
      skorC4: hitungSkorPrestasi(nextAkademik),
      skorC5: hitungSkorPrestasi(nextNonAkademik),
    }))
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xl font-bold text-slate-900">Langkah 4 - Prestasi anak</div>
        <div className="text-sm text-slate-600">Isi jika ada prestasi. Bukti tidak perlu diunggah, cukup ditandai di langkah berikutnya.</div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${tipeAktif === 'akademik' ? 'border-teal-600 bg-teal-50' : 'border-slate-300 bg-white hover:bg-slate-50'}`}>
          <input
            type="radio"
            name="tipePrestasi"
            checked={tipeAktif === 'akademik'}
            onChange={() => setTipeAktif('akademik')}
            className="mt-1 h-4 w-4 accent-teal-600"
          />
          <div className="space-y-1">
            <div className="font-semibold text-slate-900">Prestasi akademik</div>
            <div className="text-sm text-slate-600">Contoh: olimpiade, lomba sains, lomba mata pelajaran.</div>
          </div>
        </label>
        <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${tipeAktif === 'nonAkademik' ? 'border-teal-600 bg-teal-50' : 'border-slate-300 bg-white hover:bg-slate-50'}`}>
          <input
            type="radio"
            name="tipePrestasi"
            checked={tipeAktif === 'nonAkademik'}
            onChange={() => setTipeAktif('nonAkademik')}
            className="mt-1 h-4 w-4 accent-teal-600"
          />
          <div className="space-y-1">
            <div className="font-semibold text-slate-900">Prestasi non-akademik</div>
            <div className="text-sm text-slate-600">Contoh: seni, olahraga, bahasa, pramuka.</div>
          </div>
        </label>
      </div>

      <div className="relative">
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-800">
                <th className="px-3 py-3 font-semibold">Tingkat lomba</th>
                <th className="px-3 py-3 font-semibold">Juara 1</th>
                <th className="px-3 py-3 font-semibold">Juara 2</th>
                <th className="px-3 py-3 font-semibold">Juara 3</th>
              </tr>
            </thead>
            <tbody>
              {PRESTASI_LEVELS.map((level) => (
                <tr key={`${tipeAktif}-${level.key}`} className="border-t border-slate-200">
                  <td className="px-3 py-3 font-medium text-slate-700">{level.label}</td>
                  {PRESTASI_JUARA.map((juara) => (
                    <td key={`${tipeAktif}-${level.key}-${juara.key}`} className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        value={dataAktif[level.key]?.[juara.key] ?? 0}
                        onChange={(e) => handleChangeNilai(level.key, juara.key, e.target.value)}
                        className="h-12 w-24 min-w-[4.5rem] rounded-lg border border-slate-300 px-3 text-lg"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-slate-800/80 px-3 py-1 text-[10px] font-semibold text-white shadow-lg md:hidden">
          <span>⇆ Geser</span>
        </div>
        <div className="mt-6"></div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <button type="button" onClick={onBack} aria-label="Kembali" className="btn-nav-icon">
          &lt;
        </button>
        <button type="button" onClick={onNext} aria-label="Lanjut" className="btn-nav-icon">
          &gt;
        </button>
      </div>
    </div>
  )
}

function StepDokumenEkonomi({ formData, setFormData, onNext, onBack }) {
  const [inlineError, setInlineError] = useState('')
  const ageDecimal = Number(formData?.ageDecimal) || 0
  const isKondisionalWajib = ageDecimal >= 5.5 && ageDecimal < 6
  const dokumen = formData?.dokumen || {
    kk: false,
    akta: false,
    raporTK: false,
    foto: false,
    suratRekomendasi: false,
    sertifikat: false,
  }
  const kondisiEkonomi = formData?.kondisiEkonomi || ''

  const documentItems = [
    {
      key: 'kk',
      title: 'KK atau surat keterangan domisili',
      description: 'Wajib. Dipakai untuk verifikasi domisili dan zonasi sekolah.',
    },
    {
      key: 'akta',
      title: 'Akta kelahiran',
      description: 'Wajib. Dipakai untuk validasi nama lengkap dan tanggal lahir.',
    },
    {
      key: 'raporTK',
      title: 'Rapor TK',
      description: 'Wajib. Dipakai untuk penilaian rapor dan kecocokan perkembangan anak.',
    },
    {
      key: 'foto',
      title: 'Foto anak',
      description: 'Wajib. Dipakai untuk identitas pendaftaran.',
    },
    {
      key: 'suratRekomendasi',
      title: 'Surat rekomendasi psikolog / dewan guru',
      description: 'Hanya wajib jika usia anak masuk jalur pengecualian.',
      kondisional: true,
    },
    {
      key: 'sertifikat',
      title: 'Sertifikat pendukung',
      description: 'Opsional, tetapi sangat membantu jika ada prestasi anak.',
      optional: true,
    },
  ]
  const ekonomiOptions = [
    { value: '0_500', label: 'Rp0 s.d Rp500.000', description: 'Dipakai bila pendapatan keluarga berada di rentang ini.' },
    { value: '500_1000', label: 'Rp500.001 s.d Rp1.000.000', description: 'Dipakai bila pendapatan keluarga berada di rentang ini.' },
    { value: '1000_2000', label: 'Rp1.000.001 s.d Rp2.000.000', description: 'Sesuai kebutuhan data ekonomi pada perhitungan SAW.' },
    { value: '2000_3000', label: 'Rp2.000.001 s.d Rp3.000.000', description: 'Memengaruhi skor ekonomi sebagai kriteria pendukung.' },
    { value: '3000_plus', label: 'Lebih dari Rp3.000.000', description: 'Memengaruhi skor ekonomi sebagai kriteria pendukung.' },
  ]

  const updateDokumen = (key, checked) => {
    const nextDokumen = { ...dokumen, [key]: checked }
    setFormData((prev) => ({
      ...prev,
      dokumen: nextDokumen,
      skorC6: Number(hitungSkorC6(nextDokumen, ageDecimal).toFixed(2)),
      skorC7: hitungSkorC7(kondisiEkonomi),
    }))
    if (inlineError) setInlineError('')
  }

  const updateEkonomi = (value) => {
    setFormData((prev) => ({
      ...prev,
      kondisiEkonomi: value,
      skorC6: Number(hitungSkorC6(dokumen, ageDecimal).toFixed(2)),
      skorC7: hitungSkorC7(value),
    }))
    if (inlineError) setInlineError('')
  }

  const handleNext = () => {
    const hasMinimalWajib = dokumen.kk || dokumen.akta || dokumen.raporTK || dokumen.foto || (isKondisionalWajib && dokumen.suratRekomendasi)
    if (!hasMinimalWajib) {
      setInlineError('Centang minimal satu dokumen yang sudah tersedia.')
      return
    }
    if (!kondisiEkonomi) {
      setInlineError('Pilih rentang penghasilan keluarga terlebih dahulu.')
      return
    }
    setInlineError('')
    onNext()
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xl font-bold text-slate-900">Langkah 5 - Dokumen & kondisi ekonomi</div>
        <div className="text-sm text-slate-600">Centang dokumen yang sudah dimiliki. Tidak perlu mengunggah dokumen asli pada tahap ini.</div>
      </div>

      <div className="space-y-3">
        <div className="text-lg font-semibold text-slate-900">Checklist dokumen</div>
        <div className="grid gap-3 lg:grid-cols-2">
          {documentItems.map((item) => {
            const checked = Boolean(dokumen[item.key])
            const isKondisionalCard = item.kondisional
            const badgeText = isKondisionalCard ? (isKondisionalWajib ? 'Wajib untuk usia ini' : 'Opsional') : (item.optional ? 'Opsional' : 'Wajib')
            return (
              <label
                key={item.key}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${
                  checked ? 'border-teal-600 bg-teal-50' : 'border-slate-300 bg-white hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => updateDokumen(item.key, e.target.checked)}
                  className="mt-1 h-4 w-4 accent-teal-600"
                />
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{item.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${isKondisionalWajib && isKondisionalCard ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                      {badgeText}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600">{item.description}</div>
                </div>
              </label>
            )
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-lg font-semibold text-slate-900">Kondisi ekonomi keluarga</div>
        <div className="text-sm text-slate-600">Pilih satu rentang penghasilan bulanan.</div>
        <div className="space-y-3">
          {ekonomiOptions.map((item) => (
            <label
              key={item.value}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${
                kondisiEkonomi === item.value ? 'border-teal-600 bg-teal-50' : 'border-slate-300 bg-white hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="kondisiEkonomi"
                checked={kondisiEkonomi === item.value}
                onChange={() => updateEkonomi(item.value)}
                className="mt-1 h-4 w-4 accent-teal-600"
              />
              <div className="space-y-1">
                <div className="font-semibold text-slate-900">{item.label}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {inlineError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {inlineError}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <button type="button" onClick={onBack} aria-label="Kembali" className="btn-nav-icon">
          &lt;
        </button>
        <button type="button" onClick={handleNext} aria-label="Lanjut" className="btn-nav-icon">
          &gt;
        </button>
      </div>
    </div>
  )
}

export default function Kelayakan() {
  const { user } = useAuth()
  const { schools } = useSchools()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [age, setAge] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [kabupaten, setKabupaten] = useState('Banyumas')
  const [kelurahan, setKelurahan] = useState('')
  const [kecamatan, setKecamatan] = useState('')
  const [skorC2Sokanegara, setSkorC2Sokanegara] = useState(1)
  const [skorC2Kranji, setSkorC2Kranji] = useState(1)
  const [prestasiAkademik, setPrestasiAkademik] = useState(createPrestasiState)
  const [prestasiNonAkademik, setPrestasiNonAkademik] = useState(createPrestasiState)
  const [skorC4, setSkorC4] = useState(1)
  const [skorC5, setSkorC5] = useState(1)
  const [raporAspek, setRaporAspek] = useState({})
  const [raporRataRata, setRaporRataRata] = useState(null)
  const [skorC3, setSkorC3] = useState(null)
  const [dokumen, setDokumen] = useState({
    kk: false,
    akta: false,
    raporTK: false,
    foto: false,
    suratRekomendasi: false,
    sertifikat: false,
  })
  const [kondisiEkonomi, setKondisiEkonomi] = useState('')
  const [skorC6, setSkorC6] = useState(0)
  const [skorC7, setSkorC7] = useState(0)
  const [parentInvolvement, setParentInvolvement] = useState('')
  const [result, setResult] = useState(null)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const domisiliFormData = useMemo(() => ({
    kabupaten,
    kelurahan,
    kecamatan,
    skorC2_Sokanegara: skorC2Sokanegara,
    skorC2_Kranji: skorC2Kranji,
  }), [
    kabupaten,
    kelurahan,
    kecamatan,
    skorC2Sokanegara,
    skorC2Kranji,
  ])
  const setDomisiliFormData = (updater) => {
    const prev = {
      kabupaten,
      kelurahan,
      kecamatan,
      skorC2_Sokanegara: skorC2Sokanegara,
      skorC2_Kranji: skorC2Kranji,
    }
    const next = typeof updater === 'function' ? updater(prev) : updater
    setKabupaten(next.kabupaten || 'Banyumas')
    setKelurahan(next.kelurahan ?? '')
    setKecamatan(next.kecamatan ?? '')
    setSkorC2Sokanegara(Number(next.skorC2_Sokanegara) || 1)
    setSkorC2Kranji(Number(next.skorC2_Kranji) || 1)
  }
  const raporFormData = useMemo(() => ({
    raporAspek,
    raporRataRata,
    skorC3,
  }), [raporAspek, raporRataRata, skorC3])
  const setRaporFormData = (updater) => {
    const prev = {
      raporAspek,
      raporRataRata,
      skorC3,
    }
    const next = typeof updater === 'function' ? updater(prev) : updater
    setRaporAspek(next?.raporAspek || {})
    setRaporRataRata(Number.isFinite(next?.raporRataRata) ? Number(next.raporRataRata) : null)
    setSkorC3(Number.isFinite(next?.skorC3) ? Number(next.skorC3) : null)
  }
  const reportScore = raporRataRata == null ? '' : String(Number(((raporRataRata / 4) * 100).toFixed(2)))
  const ageOnReference = useMemo(() => {
    if (!birthDate) return { years: 0, months: 0, text: '', decimal: 0 }
    const born = new Date(`${birthDate}T00:00:00`)
    if (Number.isNaN(born.getTime()) || born > REFERENCE_DATE) {
      return { years: 0, months: 0, text: '', decimal: 0 }
    }
    let years = REFERENCE_DATE.getFullYear() - born.getFullYear()
    let months = REFERENCE_DATE.getMonth() - born.getMonth()
    const days = REFERENCE_DATE.getDate() - born.getDate()
    if (days < 0) months -= 1
    if (months < 0) {
      years -= 1
      months += 12
    }
    const normalizedYears = Math.max(0, years)
    const normalizedMonths = Math.max(0, months)
    return {
      years: normalizedYears,
      months: normalizedMonths,
      text: `${normalizedYears} tahun ${normalizedMonths} bulan`,
      decimal: Number((normalizedYears + normalizedMonths / 12).toFixed(2)),
    }
  }, [birthDate])

  useEffect(() => {
    if (!user) navigate('/login?next=/kelayakan', { replace: true })
  }, [user, navigate])
  useEffect(() => {
    if (!ageOnReference.text) {
      setAge('')
      return
    }
    setAge(String(ageOnReference.decimal))
  }, [ageOnReference])

  const prestasiFormData = useMemo(() => ({
    prestasiAkademik,
    prestasiNonAkademik,
    skorC4,
    skorC5,
  }), [prestasiAkademik, prestasiNonAkademik, skorC4, skorC5])
  const setPrestasiFormData = (updater) => {
    const prev = {
      prestasiAkademik,
      prestasiNonAkademik,
      skorC4,
      skorC5,
    }
    const next = typeof updater === 'function' ? updater(prev) : updater
    const nextPrestasiAkademik = next?.prestasiAkademik || createPrestasiState()
    const nextPrestasiNonAkademik = next?.prestasiNonAkademik || createPrestasiState()
    setPrestasiAkademik(nextPrestasiAkademik)
    setPrestasiNonAkademik(nextPrestasiNonAkademik)
    setSkorC4(Number(next?.skorC4) || hitungSkorPrestasi(nextPrestasiAkademik))
    setSkorC5(Number(next?.skorC5) || hitungSkorPrestasi(nextPrestasiNonAkademik))
  }
  const dokumenFormData = useMemo(() => ({
    ageDecimal: ageOnReference.decimal,
    dokumen,
    kondisiEkonomi,
    skorC6,
    skorC7,
  }), [ageOnReference.decimal, dokumen, kondisiEkonomi, skorC6, skorC7])
  const setDokumenFormData = (updater) => {
    const prev = {
      ageDecimal: ageOnReference.decimal,
      dokumen,
      kondisiEkonomi,
      skorC6,
      skorC7,
    }
    const next = typeof updater === 'function' ? updater(prev) : updater
    const nextDokumen = next?.dokumen || {
      kk: false,
      akta: false,
      raporTK: false,
      foto: false,
      suratRekomendasi: false,
      sertifikat: false,
    }
    const nextKondisiEkonomi = next?.kondisiEkonomi || ''
    const nextSkorC6 = Number.isFinite(next?.skorC6)
      ? Number(next.skorC6)
      : Number(hitungSkorC6(nextDokumen, ageOnReference.decimal).toFixed(2))
    const nextSkorC7 = Number.isFinite(next?.skorC7)
      ? Number(next.skorC7)
      : hitungSkorC7(nextKondisiEkonomi)
    setDokumen(nextDokumen)
    setKondisiEkonomi(nextKondisiEkonomi)
    setSkorC6(nextSkorC6)
    setSkorC7(nextSkorC7)
  }

  useEffect(() => {
    setResult(null)
  }, [
    name,
    age,
    kabupaten,
    kelurahan,
    kecamatan,
    reportScore,
    prestasiAkademik,
    prestasiNonAkademik,
    skorC4,
    skorC5,
    dokumen,
    kondisiEkonomi,
    skorC6,
    skorC7,
    parentInvolvement,
  ])

  const skorC1 = useMemo(() => hitungSkorC1(ageOnReference.decimal), [ageOnReference.decimal])

  const saveEligibilitySubmission = async ({ score, status, rows, recommendationData }) => {
    const alamatDomisili = [kelurahan, kecamatan, kabupaten].filter(Boolean).join(', ')
    const payload = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      submittedAt: new Date().toISOString(),
      userEmail: user?.email || '',
      userName: user?.name || '',
      input: {
        candidateName: name,
        gender,
        birthDate,
        ageOnReference: ageOnReference.text,
        phoneNumber,
        age: Number(age) || 0,
        kabupaten,
        kelurahan,
        kecamatan,
        alamat: alamatDomisili || '-',
        skorC2_Sokanegara: skorC2Sokanegara,
        skorC2_Kranji: skorC2Kranji,
        skorC3: skorC3 ?? 0,
        skorC4: skorC4 ?? 1,
        skorC5: skorC5 ?? 1,
        skorC6: Number(skorC6) || 0,
        skorC7: Number(skorC7) || 0,
        prestasiAkademik,
        prestasiNonAkademik,
        raporAspek,
        raporRataRata: raporRataRata ?? 0,
        reportScore: Number(reportScore) || 0,
        kondisiEkonomi,
        parentInvolvement,
        dokumen,
      },
      result: {
        score,
        status,
        rows,
      },
      recommendations: recommendationData.map((item) => ({
        schoolId: item.id,
        schoolName: item.name,
        scoreV: item.score,
        schoolScore: item.score,
      })),
    }
    try {
      await apiJson('/api/eligibility-submissions', {
        method: 'POST',
        body: payload,
      })
      return true
    } catch {
      return false
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!isStep1Complete()) {
      alert(getStepErrorMessage(1))
      setCurrentStep(1)
      return
    }
    if (!isStep2Complete()) {
      alert(getStepErrorMessage(2))
      setCurrentStep(2)
      return
    }
    if (!isStep3Complete()) {
      alert(getStepErrorMessage(3))
      setCurrentStep(3)
      return
    }
    if (!isStep4Complete()) {
      alert(getStepErrorMessage(4))
      setCurrentStep(4)
      return
    }
    if (!isStep5Complete()) {
      alert(getStepErrorMessage(5))
      setCurrentStep(5)
      return
    }
    const saw = hitungSAW({
      skorC1,
      skorC2_Sokanegara: skorC2Sokanegara,
      skorC2_Kranji: skorC2Kranji,
      raporRataRata,
      skorC4,
      skorC5,
      skorC6,
      skorC7,
    })
    const schoolSokanegara = schools.find((item) => String(item?.name || '').toLowerCase().includes('sokanegara'))
    const schoolKranji = schools.find((item) => String(item?.name || '').toLowerCase().includes('kranji'))
    const schoolsRanked = [
      {
        id: Number(schoolSokanegara?.id) || 2,
        name: schoolSokanegara?.name || 'SDN 1 Sokanegara',
        score: saw.vSokanegara,
      },
      {
        id: Number(schoolKranji?.id) || 1,
        name: schoolKranji?.name || 'SDN 1 Kranji',
        score: saw.vKranji,
      },
    ].sort((a, b) => b.score - a.score)
      .map((item, index) => ({
        ...item,
        note: getKeteranganSekolah(index),
      }))
    const resultPayload = {
      score: saw.skorTertinggi,
      status: getLabelStatusKelayakan(saw.skorTertinggi),
      rows: saw.breakdown.rows,
      recommendations: schoolsRanked,
      vSokanegara: saw.vSokanegara,
      vKranji: saw.vKranji,
    }
    setResult(resultPayload)
    setShowBreakdown(false)
    const isSaved = await saveEligibilitySubmission({
      score: resultPayload.score,
      status: resultPayload.status,
      rows: resultPayload.rows,
      recommendationData: resultPayload.recommendations,
    })
    if (!isSaved) {
      alert('Hasil simulasi tampil, tapi gagal tersimpan ke database. Cek koneksi server/backend lalu coba lagi.')
    }
  }

  const onDownload = () => {
    if (!result) return
    const printedAt = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
    const formatV = (value) => Number(value || 0).toFixed(2).replace('.', ',')
    const summaryRows = result.rows.map((row) => `
      <tr>
        <td>${row.key}</td>
        <td>${row.display}</td>
        <td>${Math.round(row.bobot * 100)}%</td>
        <td>${row.kontribusi.toFixed(2).replace('.', ',')}</td>
      </tr>
    `).join('')
    const html = `
      <html>
        <head>
          <title>Hasil Kelayakan Calon Siswa Baru</title>
          <style>
            body { font-family: "Times New Roman", serif; padding: 24px; color: #111; line-height: 1.45; }
            h1, h2 { margin: 0 0 8px; }
            h2 { margin-top: 22px; font-size: 18px; }
            .line { border-bottom: 1px solid #111; margin: 8px 0 14px; }
            .meta { margin: 3px 0; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #111; padding: 8px; font-size: 13px; text-align: left; }
            th { background: transparent; }
            .note { margin-top: 16px; font-size: 13px; }
          </style>
        </head>
        <body>
          <h1>HASIL KELAYAKAN CALON SISWA BARU</h1>
          <div class="line"></div>
          <div class="meta">Nama anak : ${name || '-'}</div>
          <div class="meta">Tanggal lahir : ${birthDate || '-'}</div>
          <div class="meta">Usia : ${ageOnReference.text || '-'}</div>
          <div class="meta">Dicetak : ${printedAt}</div>

          <h2>SKOR KELAYAKAN</h2>
          <div class="line"></div>
          <div class="meta">Skor V : ${formatV(result.score)}</div>
          <div class="meta">Status : ${result.status}</div>

          <h2>REKOMENDASI SEKOLAH</h2>
          <div class="line"></div>
          <div class="meta">1. ${result.recommendations[0]?.name || '-'} — Skor: ${formatV(result.recommendations[0]?.score)} (Rekomendasi utama)</div>
          <div class="meta">2. ${result.recommendations[1]?.name || '-'} — Skor: ${formatV(result.recommendations[1]?.score)} (Alternatif kedua)</div>

          <h2>DETAIL KRITERIA</h2>
          <div class="line"></div>
          <table>
            <thead>
              <tr>
                <th>Kriteria</th>
                <th>Nilai</th>
                <th>Bobot</th>
                <th>Kontribusi</th>
              </tr>
            </thead>
            <tbody>
              ${summaryRows}
            </tbody>
          </table>
          <div class="meta" style="margin-top: 12px;">Total Skor V : ${formatV(result.score)}</div>
          <p class="note">Catatan: Hasil ini adalah simulasi kelayakan berdasarkan data yang dimasukkan. Keputusan akhir ada pada pihak sekolah.</p>
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

  const handleResetForm = () => {
    setCurrentStep(1)
    setResult(null)
    setShowBreakdown(false)
    setName('')
    setGender('')
    setBirthDate('')
    setAge('')
    setPhoneNumber('')
    setKabupaten('Banyumas')
    setKelurahan('')
    setKecamatan('')
    setSkorC2Sokanegara(1)
    setSkorC2Kranji(1)
    setPrestasiAkademik(createPrestasiState())
    setPrestasiNonAkademik(createPrestasiState())
    setSkorC4(1)
    setSkorC5(1)
    setRaporAspek({})
    setRaporRataRata(null)
    setSkorC3(null)
    setDokumen({
      kk: false,
      akta: false,
      raporTK: false,
      foto: false,
      suratRekomendasi: false,
      sertifikat: false,
    })
    setKondisiEkonomi('')
    setSkorC6(0)
    setSkorC7(0)
    setParentInvolvement('')
  }

  if (!user) return null

  const checkedDocs = [
    { key: 'kk', label: 'KK atau Surat Domisili' },
    { key: 'akta', label: 'Akta Kelahiran' },
    { key: 'raporTK', label: 'Rapor TK' },
    { key: 'foto', label: 'Foto Anak' },
    { key: 'suratRekomendasi', label: 'Surat Rekomendasi' },
    { key: 'sertifikat', label: 'Sertifikat Pendukung' },
  ].filter((item) => dokumen[item.key]).map((item) => item.label)
  const economyLabelMap = {
    '0_500': 'Rp0 s.d Rp500.000',
    '500_1000': 'Rp500.001 s.d Rp1.000.000',
    '1000_2000': 'Rp1.000.001 s.d Rp2.000.000',
    '2000_3000': 'Rp2.000.001 s.d Rp3.000.000',
    '3000_plus': 'Lebih dari Rp3.000.000',
  }
  const parentLabelMap = {
    ayah: 'Ayah',
    ibu: 'Ibu',
    kedua_orangtua: 'Kedua orang tua',
    wali: 'Wali',
  }
  const prestasiAkademikTerbaik = getPrestasiTerbaikLabel(prestasiAkademik)
  const prestasiNonAkademikTerbaik = getPrestasiTerbaikLabel(prestasiNonAkademik)
  const formatV = (value) => Number(value || 0).toFixed(2).replace('.', ',')

  const stepItems = [
    { id: 1, label: 'Data anak & orang tua' },
    { id: 2, label: 'Domisili' },
    { id: 3, label: 'Nilai rapor TK' },
    { id: 4, label: 'Prestasi anak' },
    { id: 5, label: 'Dokumen & ekonomi' },
    { id: 6, label: 'Ringkasan' },
  ]

  const goNext = () => setCurrentStep((prev) => Math.min(prev + 1, 6))
  const goPrev = () => setCurrentStep((prev) => Math.max(prev - 1, 1))

  const isStep1Complete = () => {
    if (!name.trim()) return false
    if (!gender) return false
    if (!birthDate) return false
    if (age === '' || Number(age) < 4 || Number(age) > 9) return false
    if (!parentInvolvement) return false
    if (!phoneNumber.trim()) return false
    return true
  }

  const isStep2Complete = () => {
    if (!String(domisiliFormData.kabupaten || '').trim()) return false
    if (!String(domisiliFormData.kelurahan || '').trim() || !String(domisiliFormData.kecamatan || '').trim()) return false
    return true
  }

  const isStep3Complete = () => {
    return Object.keys(raporAspek || {}).length === RAPOR_ASPEK.length
  }

  const isStep4Complete = () => {
    return true
  }
  const isStep5Complete = () => {
    const ageDecimal = Number(ageOnReference.decimal) || 0
    const isKondisionalWajib = ageDecimal >= 5.5 && ageDecimal < 6
    const hasMinimalWajib = dokumen.kk || dokumen.akta || dokumen.raporTK || dokumen.foto || (isKondisionalWajib && dokumen.suratRekomendasi)
    if (!hasMinimalWajib) return false
    if (!kondisiEkonomi) return false
    return true
  }

  const isStepComplete = (step) => {
    if (step === 1) return isStep1Complete()
    if (step === 2) return isStep2Complete()
    if (step === 3) return isStep3Complete()
    if (step === 4) return isStep4Complete()
    if (step === 5) return isStep5Complete()
    return true
  }

  const getStepErrorMessage = (step) => {
    if (step === 1) return 'Lengkapi data anak & orang tua (identitas anak, usia otomatis, data pendamping, dan nomor HP aktif).'
    if (step === 2) return 'Lengkapi data domisili (kabupaten, kecamatan, dan kelurahan).'
    if (step === 3) return 'Masih ada aspek rapor yang belum dipilih. Lengkapi semua baris terlebih dahulu.'
    if (step === 4) return ''
    if (step === 5) return 'Lengkapi dokumen minimal satu item wajib dan pilih rentang penghasilan keluarga.'
    return ''
  }

  const handleGoNext = () => {
    if (!isStepComplete(currentStep)) {
      alert(getStepErrorMessage(currentStep))
      return
    }
    goNext()
  }

  const handleStepClick = (targetStep) => {
    if (targetStep <= currentStep) {
      setCurrentStep(targetStep)
      return
    }
    for (let step = 1; step < targetStep; step += 1) {
      if (!isStepComplete(step)) {
        alert(getStepErrorMessage(step))
        return
      }
    }
    setCurrentStep(targetStep)
  }

  return (
    <main className="min-h-screen w-full bg-slate-50 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mb-6 w-full">
        <Link className="btn-nav-icon shadow-sm" to="/" aria-label="Kembali">
          &lt;
        </Link>
      </div>
      <div className="flex w-full flex-col ">
        <h1 className="text-center text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Form Kelayakan Calon Siswa Baru</h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base text-center">
          Lengkapi form secara bertahap. Semua data dipakai untuk simulasi rekomendasi sekolah yang lebih akurat.
        </p>

        <div className="mt-6 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {stepItems.map((step, index) => {
              const done = currentStep > step.id
              const active = currentStep === step.id
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => handleStepClick(step.id)}
                  className={`rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
                    active
                      ? 'border-sky-300 bg-sky-50 text-sky-800'
                      : done
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="text-xs font-semibold">Langkah {index + 1}</div>
                  <div className="font-semibold">{step.label}</div>
                </button>
              )
            })}
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <div className="text-xl font-bold text-slate-900">Langkah 1 - Data Anak & Orang Tua</div>
                <div className="text-sm text-slate-600">Isi identitas dasar calon siswa dan data penanggung jawab komunikasi.</div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold">Nama lengkap anak</label>
                <p className="text-xs text-slate-500">Tulis sesuai akta kelahiran atau kartu keluarga agar mudah diverifikasi.</p>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 rounded-xl border border-slate-300 px-4"
                  placeholder="Contoh: Budi Santoso"
                  required
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm font-semibold">Jenis kelamin</label>
                  <p className="text-xs text-slate-500">Data identitas anak.</p>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="h-12 rounded-xl border border-slate-300 bg-white px-4"
                    required
                  >
                    <option value="">Pilih jenis kelamin</option>
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-semibold">Tanggal lahir anak</label>
                  <p className="text-xs text-slate-500">Usia akan dihitung otomatis dari tanggal ini.</p>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="h-12 rounded-xl border border-slate-300 px-4"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm font-semibold">Usia pada 1 Juli 2026</label>
                  <p className="text-xs text-slate-500">Tampil otomatis setelah tanggal lahir diisi.</p>
                  <input
                    value={ageOnReference.text}
                    readOnly
                    className="h-12 rounded-xl border border-slate-200 bg-slate-100 px-4 text-slate-700"
                    placeholder="Contoh: 6 tahun 3 bulan"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-semibold">Keterlibatan orang tua / wali</label>
                  <p className="text-xs text-slate-500">Dipakai sebagai data pendamping dan penanggung jawab komunikasi sekolah.</p>
                  <select
                    value={parentInvolvement}
                    onChange={(e) => setParentInvolvement(e.target.value)}
                    className="h-12 rounded-xl border border-slate-300 bg-white px-4"
                    required
                  >
                    <option value="">Pilih keterlibatan</option>
                    <option value="kedua_orangtua">Kedua orang tua</option>
                    <option value="ayah">Ayah saja</option>
                    <option value="ibu">Ibu saja</option>
                    <option value="wali">Wali</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold">Nomor HP yang dapat dihubungi</label>
                <p className="text-xs text-slate-500">Nomor aktif untuk konfirmasi data dan hasil rekomendasi.</p>
                <input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="h-12 rounded-xl border border-slate-300 px-4"
                  placeholder="Contoh: 0812xxxxxxx"
                  required
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <StepDomisili
              formData={domisiliFormData}
              setFormData={setDomisiliFormData}
              onBack={goPrev}
              onNext={goNext}
            />
          )}

          {currentStep === 3 && (
            <StepRaporTK
              formData={raporFormData}
              setFormData={setRaporFormData}
              onBack={goPrev}
              onNext={goNext}
            />
          )}

          {currentStep === 4 && (
            <StepPrestasiAnak
              formData={prestasiFormData}
              setFormData={setPrestasiFormData}
              onBack={goPrev}
              onNext={goNext}
            />
          )}

          {currentStep === 5 && (
            <StepDokumenEkonomi
              formData={dokumenFormData}
              setFormData={setDokumenFormData}
              onBack={goPrev}
              onNext={goNext}
            />
          )}

          {currentStep === 6 && (
            <div className="space-y-5">
              {!result ? (
                <div className="animate-[fadeIn_.2s_ease-out] space-y-5">
                  <div>
                    <div className="text-xl font-bold">Langkah 6 - Tinjau Sebelum Menghitung</div>
                    <div className="text-sm text-slate-600">Periksa kembali data berikut sebelum menjalankan simulasi kelayakan.</div>
                  </div>

                  <div className="rounded-xl border border-slate-200">
                    <div className="grid grid-cols-1 gap-2 p-4 text-sm sm:grid-cols-[1fr_auto]">
                      <div className="font-semibold text-slate-600">Nama</div><div className="font-semibold">{name || '-'}</div>
                      <div className="font-semibold text-slate-600">Jenis kelamin</div><div className="font-semibold">{gender || '-'}</div>
                      <div className="font-semibold text-slate-600">Tanggal lahir</div><div className="font-semibold">{birthDate || '-'}</div>
                      <div className="font-semibold text-slate-600">Usia per 1 Juli 2026</div><div className="font-semibold">{ageOnReference.text || '-'}</div>
                      <div className="font-semibold text-slate-600">Keterlibatan orang tua / wali</div><div className="font-semibold">{parentLabelMap[parentInvolvement] || '-'}</div>
                      <div className="font-semibold text-slate-600">Nomor HP</div><div className="font-semibold">{phoneNumber || '-'}</div>
                      <div className="font-semibold text-slate-600">Kabupaten</div><div className="font-semibold">{kabupaten || '-'}</div>
                      <div className="font-semibold text-slate-600">Kelurahan</div><div className="font-semibold">{kelurahan || '-'}</div>
                      <div className="font-semibold text-slate-600">Kecamatan</div><div className="font-semibold">{kecamatan || '-'}</div>
                      <div className="font-semibold text-slate-600">Rata-rata rapor TK</div><div className="font-semibold">{raporRataRata == null ? '-' : `${raporRataRata.toFixed(2).replace('.', ',')} / 4`}</div>
                      <div className="font-semibold text-slate-600">Prestasi akademik terbaik</div><div className="font-semibold">{prestasiAkademikTerbaik}</div>
                      <div className="font-semibold text-slate-600">Prestasi non-akademik terbaik</div><div className="font-semibold">{prestasiNonAkademikTerbaik}</div>
                      <div className="font-semibold text-slate-600">Dokumen tersedia</div><div className="font-semibold">{checkedDocs.length ? checkedDocs.join(', ') : '-'}</div>
                      <div className="font-semibold text-slate-600">Kondisi ekonomi</div><div className="font-semibold">{economyLabelMap[kondisiEkonomi] || '-'}</div>
                    </div>
                  </div>

                  <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
                    <button
                      type="button"
                      onClick={goPrev}
                      aria-label="Kembali"
                      className="btn-nav-icon"
                    >
                      &lt;
                    </button>
                    <div className="text-sm font-semibold text-slate-500">Langkah {currentStep} dari 6</div>
                    <button
                      type="submit"
                      className="btn-primary rounded-xl px-4 py-2"
                    >
                      Hitung Kelayakan →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="animate-[fadeIn_.2s_ease-out] space-y-5">
                  <div className="text-xl font-bold text-slate-900">Hasil Kelayakan: {name || '-'}</div>

                  <div className="rounded-2xl border border-slate-200 p-5">
                    <div className="text-sm text-slate-500">Skor Kelayakan</div>
                    <div className="mt-2 flex items-end justify-between gap-3">
                      <div className="text-4xl font-extrabold text-slate-900">{formatV(result.score)}</div>
                      <div className="text-sm font-semibold text-teal-700">{result.status}</div>
                    </div>
                    <div className="mt-3 h-3 w-full rounded-full bg-slate-200">
                      <div
                        className="h-3 rounded-full bg-teal-600 transition-all"
                        style={{ width: `${Math.max(0, Math.min(100, result.score * 100))}%` }}
                      ></div>
                    </div>
                    <div className="mt-3 text-sm text-slate-600">Berdasarkan data yang diisi, anak ini memiliki peluang kelayakan yang baik.</div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-5">
                    <div className="text-sm font-semibold text-slate-900">Rekomendasi Sekolah</div>
                    <div className="mt-3 space-y-3">
                      {result.recommendations.map((item, index) => (
                        <div
                          key={item.id}
                          className={`rounded-xl border px-4 py-3 ${index === 0 ? 'border-teal-600 bg-teal-50' : 'border-slate-200 bg-white'}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-semibold text-slate-900">{item.name}</div>
                            <div className="text-sm font-bold text-slate-800">Skor: {formatV(item.score)}</div>
                          </div>
                          <div className="text-sm text-slate-600">{item.note}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <button
                      type="button"
                      className="btn-secondary w-full justify-start text-left text-slate-800"
                      onClick={() => setShowBreakdown((prev) => !prev)}
                    >
                      {showBreakdown ? 'Sembunyikan detail perhitungan ▲' : 'Lihat detail perhitungan ▼'}
                    </button>
                    {showBreakdown && (
                      <div className="mt-4 space-y-3 text-sm">
                        {result.rows.map((row) => (
                          <div key={row.key} className="rounded-xl border border-slate-200 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-medium text-slate-800">{row.key}</div>
                              <div className="text-slate-600">{row.display} • {Math.round(row.bobot * 100)}% • {row.kontribusi.toFixed(2).replace('.', ',')}</div>
                            </div>
                            <div className="mt-2 h-2 rounded-full bg-slate-200">
                              <div className="h-2 rounded-full bg-teal-600" style={{ width: `${Math.max(0, Math.min(100, row.progress))}%` }}></div>
                            </div>
                          </div>
                        ))}
                        <div className="pt-2 text-right text-base font-bold text-slate-900">Total Skor V: {formatV(result.score)}</div>
                      </div>
                    )}
                  </div>

                  <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
                    <button
                      type="button"
                      onClick={handleResetForm}
                      className="btn-secondary rounded-xl px-4 py-2"
                    >
                      ← Isi Ulang Form
                    </button>
                    <button
                      type="button"
                      onClick={onDownload}
                      className="btn-primary rounded-xl px-4 py-2"
                    >
                      ⬇ Download PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep !== 2 && currentStep !== 3 && currentStep !== 4 && currentStep !== 5 && currentStep !== 6 && (
            <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Kembali"
              className={`btn-nav-icon ${currentStep === 1 ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400' : ''}`}
              disabled={currentStep === 1}
            >
              &lt;
            </button>
            <div className="text-sm font-semibold text-slate-500">Langkah {currentStep} dari 6</div>
            {currentStep < 6 ? (
              <button type="button" onClick={handleGoNext} aria-label="Lanjut" className="btn-nav-icon">
                &gt;
              </button>
            ) : (
              <button
                  type="submit"
                  className="btn-primary rounded-xl px-5 py-2">
                  Hitung Kelayakan
              </button>
            )}
            </div>
          )}
        </form>
      </div>
    </main>
  )
}
