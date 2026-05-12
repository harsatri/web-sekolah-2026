import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSchools } from '../../contexts/SchoolContext.jsx'
import { API_BASE_URL } from '../../utils/api.js'

export default function TopSchools() {
  const { schools } = useSchools()
  const [district, setDistrict] = useState('Purwokerto Timur')
  const [search, setSearch] = useState('')

  const districts = useMemo(() => ['Semua', 'Purwokerto Timur', 'Purwokerto Barat', 'Purwokerto Selatan', 'Purwokerto Utara'], [])
  const filtered = useMemo(() => {
    return schools.filter((s) => {
      const matchDistrict = district === 'Semua' || s.district === district
      const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase())
      return matchDistrict && matchSearch
    })
  }, [schools, district, search])

  const getFullUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('data:') || url.startsWith('http')) return url
    return `${API_BASE_URL}${url}`
  }

  return (
    <section id="sekolah" className="w-screen px-8 pt-20 pb-12">
      <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-slate-500">SEKOLAH</span>
      <h2 className="mt-2 text-4xl font-extrabold tracking-tight text-slate-900">List Sekolah</h2>
      <p className="mt-2 max-w-2xl text-slate-600">
        Informasi lengkap sekolah untuk membantu simulasi prescreening mandiri.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-slate-700">Filter</div>
        <select
          className="rounded-full border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
        >
          {districts.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Cari nama sekolah..."
            className="w-full rounded-full border border-slate-300 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {filtered.map((s) => {
          const gallery = Array.isArray(s.gallery) ? s.gallery : []
          const coverPhoto = gallery[0]?.url || gallery[0] || null
          
          return (
            <div key={s.id} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
              <div className="relative h-48 w-full overflow-hidden rounded-2xl bg-slate-100">
                {coverPhoto ? (
                  <img 
                    src={getFullUrl(coverPhoto)} 
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" 
                    alt={s.name} 
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <span className="absolute top-3 right-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold text-slate-900 shadow-sm backdrop-blur-sm">
                  Akreditasi {s.accreditation}
                </span>
              </div>

              <div className="mt-4 flex items-start justify-between gap-4">
                <div>
                  <div className="text-xl font-bold text-slate-900">{s.name}</div>
                  <div className="mt-1 text-sm text-slate-500">📍 {s.district}</div>
                </div>
                <div className="flex items-center gap-1 text-amber-500">
                  <span className="text-sm font-bold">{s.rating}</span>
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="text-sm">👥</span>
                  {s.capacity} siswa/tahun
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">👩‍🏫</span>
                  Rasio {s.ratio}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-lg bg-slate-50 px-3 py-1 text-[10px] font-bold text-slate-600">
                  Kelulusan {s.graduationRate}%
                </span>
                <span className="rounded-lg bg-slate-50 px-3 py-1 text-[10px] font-bold text-slate-600">
                  Rata-rata {s.avgExam}
                </span>
                <span className="rounded-lg bg-slate-50 px-3 py-1 text-[10px] font-bold text-slate-600">
                  {s.achievements} Prestasi
                </span>
              </div>

              <Link 
                className="mt-6 block w-full rounded-xl bg-blue-600 py-2.5 text-center text-sm font-bold text-white transition-colors hover:bg-blue-700" 
                to={`/sekolah/${s.id}`}
              >
                Lihat Detail
              </Link>
            </div>
          )
        })}
      </div>
    </section>
  )
}
