import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useSchools } from '../../contexts/SchoolContext.jsx'
import { API_BASE_URL } from '../../utils/api.js'

function toTextList(value) {
  if (!Array.isArray(value)) return '-'
  const normalized = value
    .map((item) => {
      if (item && typeof item === 'object') return String(item.name || item.url || '').trim()
      return String(item || '').trim()
    })
    .filter(Boolean)
  return normalized.join(', ') || '-'
}

function toSinglePercent(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return '-'
  return `${raw.replace(/%+/g, '')}%`
}

export default function SchoolDetail({ previewData }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { id } = useParams()
  const { schools } = useSchools()
  const [lightboxIndex, setLightboxIndex] = useState(-1)

  useEffect(() => {
    if (!previewData && !user) {
      navigate(`/login?next=${encodeURIComponent(pathname)}`, { replace: true })
    }
  }, [user, previewData, navigate, pathname])

  const school = useMemo(() => {
    if (previewData) {
      return previewData
    }
    return schools.find((s) => String(s.id) === id)
  }, [id, schools, previewData])

  const gallery = useMemo(() => {
    const raw = Array.isArray(school?.gallery) ? school.gallery : []
    return raw.map(item => {
      if (typeof item === 'string') return { url: item, name: '' }
      return item
    }).filter(item => item?.url)
  }, [school])

  const getFullUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('data:') || url.startsWith('http')) return url
    return `${API_BASE_URL}${url}`
  }

  if (!previewData && !user) return null

  if (!school) {
    return (
      <main className="w-screen px-8 py-16">
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 text-center">
          <div className="text-lg font-semibold">Sekolah tidak ditemukan</div>
          <Link className="btn-nav-icon mt-4" to="/#sekolah" aria-label="Kembali ke daftar sekolah">
            &lt;
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className={previewData ? 'w-full' : 'w-full px-4 py-8 sm:px-6 lg:px-8'}>
      <div className="w-full space-y-6">
        {!previewData && (
          <div>
            <Link className="btn-nav-icon shadow-sm" to="/#sekolah" aria-label="Kembali">
              &lt;
            </Link>
          </div>
        )}

        {/* Hero & Gallery Grid */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {/* Main Cover */}
          <div className="relative h-64 w-full bg-slate-100 sm:h-96">
            {gallery[0] ? (
              <img 
                src={getFullUrl(gallery[0].url)} 
                className="h-full w-full cursor-pointer object-cover" 
                alt={school.name}
                onClick={() => setLightboxIndex(0)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-400">
                Belum ada foto sekolah
              </div>
            )}
            {gallery.length > 1 && (
              <div className="absolute bottom-4 right-4 rounded-full bg-black/60 px-4 py-1.5 text-xs font-bold text-white backdrop-blur-md">
                📷 {gallery.length} Foto
              </div>
            )}
          </div>

          <div className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white">
                  {school.name?.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{school.name}</h1>
                  <div className="mt-1 text-sm text-slate-600">{school.district} • {school.address}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-700">Akreditasi {school.accreditation}</span>
                <span className="rounded-full bg-blue-100 px-3 py-1 font-bold text-blue-700">Rating {school.rating}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-700">Nilai Akreditasi {school.accreditationScore}</span>
              </div>
            </div>

            <div className="mt-8 space-y-2 border-t border-slate-100 pt-8">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Deskripsi</h3>
              <p className="text-sm leading-relaxed text-slate-600">{school.review || 'Belum ada deskripsi.'}</p>
            </div>

            <div className="mt-8 border-t border-slate-100 pt-8">
              <h3 className="text-lg font-bold text-slate-900">Gallery Foto</h3>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
                {gallery.slice(0, 6).map((photo, idx) => (
                  <div 
                    key={idx} 
                    className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl border border-slate-100 bg-slate-50 transition-transform hover:scale-[1.02]"
                    onClick={() => setLightboxIndex(idx)}
                  >
                    <img src={getFullUrl(photo.url)} className="h-full w-full object-cover" alt={`Gallery ${idx}`} />
                    {idx === 5 && gallery.length > 6 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 font-bold text-white">
                        +{gallery.length - 6} foto lainnya
                      </div>
                    )}
                  </div>
                ))}
                {gallery.length === 0 && (
                  <div className="col-span-full py-10 text-center text-sm italic text-slate-400">
                    Belum ada foto gallery.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 grid gap-6 border-t border-slate-100 pt-8 md:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-sm font-bold uppercase tracking-wider text-slate-400">Fasilitas</div>
                <div className="mt-3 text-sm leading-relaxed text-slate-600">{toTextList(school.facilities)}</div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-sm font-bold uppercase tracking-wider text-slate-400">Program Unggulan</div>
                <div className="mt-3 text-sm leading-relaxed text-slate-600">{toTextList(school.programs)}</div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-sm font-bold uppercase tracking-wider text-slate-400">Ekstrakurikuler</div>
                <div className="mt-3 text-sm leading-relaxed text-slate-600">{toTextList(school.extracurriculars)}</div>
              </div>
            </div>

            <div className="mt-8 border-t border-slate-100 pt-8">
              <div className="rounded-2xl bg-slate-50 p-6">
                <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2">
                    <span className="text-base">☎️</span>
                    <span className="font-semibold">Telepon: {school.contact || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2">
                    <span className="text-base">👥</span>
                    <span className="font-semibold">Kapasitas: {school.capacity} siswa/tahun</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2">
                    <span className="text-base">👩‍🏫</span>
                    <span className="font-semibold">Rasio: {school.ratio || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2">
                    <span className="text-base">🎓</span>
                    <span className="font-semibold">Kelulusan: {toSinglePercent(school.graduationRate)}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2">
                    <span className="text-base">📊</span>
                    <span className="font-semibold">Rata-rata: {school.avgExam ?? '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2">
                    <span className="text-base">🏅</span>
                    <span className="font-semibold">Prestasi: {school.achievements ?? '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex >= 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
          <button
            onClick={() => setLightboxIndex(-1)}
            className="absolute right-6 top-6 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 hover:text-slate-200"
          >
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <button 
            onClick={() => setLightboxIndex((prev) => (prev > 0 ? prev - 1 : gallery.length - 1))}
            className="absolute left-6 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-4 text-white hover:bg-white/20"
          >
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="max-h-[80vh] max-w-full">
            <img 
              src={getFullUrl(gallery[lightboxIndex]?.url)} 
              className="max-h-[80vh] max-w-full object-contain shadow-2xl" 
              alt="Gallery Large" 
            />
            <div className="mt-4 text-center text-sm font-medium text-white">
              {lightboxIndex + 1} / {gallery.length} • {gallery[lightboxIndex]?.name}
            </div>
          </div>

          <button 
            onClick={() => setLightboxIndex((prev) => (prev < gallery.length - 1 ? prev + 1 : 0))}
            className="absolute right-6 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-4 text-white hover:bg-white/20"
          >
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </main>
  )
}
