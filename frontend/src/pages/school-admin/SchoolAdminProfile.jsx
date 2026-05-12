import { useEffect, useState } from 'react'
import SchoolDetail from '../public/SchoolDetail.jsx'
import { useSchoolAdminData } from '../../hooks/useSchoolAdminData.js'
import { API_BASE_URL } from '../../utils/api.js'

export default function SchoolAdminProfile() {
  const {
    schoolToManage,
    formData,
    showPreview,
    setShowPreview,
    isDirty,
    handleChange,
    handleArrayChange,
    handlePhotoUpload,
    handleRemovePhoto,
    handleReorderPhoto,
    handleSubmit,
    handleCancel,
  } = useSchoolAdminData()

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isEditing || !isDirty) setShowPreview(false)
  }, [isEditing, isDirty, setShowPreview])

  if (!schoolToManage || !formData) {
    return <div className="rounded-xl bg-white p-4 text-sm text-slate-600">Loading school data...</div>
  }

  const handleToggleEdit = () => {
    if (isEditing) {
      handleCancel()
      setShowPreview(false)
    }
    setIsEditing(!isEditing)
  }

  const onSave = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await handleSubmit(e)
      setIsEditing(false)
      setShowPreview(false)
    } finally {
      setIsSaving(false)
    }
  }

  const getFullUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('data:') || url.startsWith('http')) return url
    return `${API_BASE_URL}${url}`
  }

  const handleImageError = (e) => {
    e.target.src = 'https://placehold.co/600x400?text=Gambar+Gagal+Dimuat'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Profil Sekolah</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola informasi publik sekolah Anda yang akan dilihat oleh calon siswa.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleToggleEdit}
            disabled={isSaving}
            className={`${isEditing ? 'btn-danger' : 'btn-primary'} font-bold disabled:opacity-50`}
          >
            {isEditing ? 'Batal Edit' : 'Edit Profil'}
          </button>
        </div>
      </div>

      {isEditing && showPreview ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3">
            <div className="text-sm text-amber-700">ℹ️ Preview perubahan belum tersimpan.</div>
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="btn-secondary px-3 py-1.5 text-xs"
            >
              Kembali ke Edit
            </button>
          </div>
          <div className="overflow-hidden">
            <SchoolDetail id={schoolToManage.id} previewData={formData} />
          </div>
        </div>
      ) : isEditing ? (
        <form onSubmit={onSave} className="space-y-6">
          <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm">
            <div className="h-48 w-full bg-slate-200 sm:h-64">
              {formData.gallery?.[0] ? (
                <img 
                  src={getFullUrl(formData.gallery[0].url)} 
                  alt="Cover" 
                  className="h-full w-full object-cover"
                  onError={handleImageError}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-400">
                  Belum ada foto sampul
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity hover:opacity-100">
                <label className="cursor-pointer rounded-full bg-white/90 px-6 py-2 text-sm font-bold text-slate-900 shadow-lg">
                  📷 Ubah Foto Sampul
                  <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                </label>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-bold text-slate-900">A. Informasi Utama</div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Nama Sekolah</label>
                <input name="name" value={formData.name} onChange={handleChange} className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" placeholder="SD Negeri 1 Purwokerto" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Kepala Sekolah</label>
                <input name="principalName" value={formData.principalName} onChange={handleChange} className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Nama kepala sekolah" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Alamat</label>
                <input name="address" value={formData.address} onChange={handleChange} className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Kecamatan</label>
                <select name="district" value={formData.district} onChange={handleChange} className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                  <option>Purwokerto Timur</option>
                  <option>Purwokerto Utara</option>
                  <option>Purwokerto Selatan</option>
                  <option>Purwokerto Barat</option>
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-bold text-slate-900">B. Data Akademik dan Kualitas</div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Akreditasi</label>
                <select
                  name="accreditation"
                  value={formData.accreditation || ''}
                  onChange={handleChange}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Pilih Akreditasi</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Nilai Akreditasi</label>
                <input type="number" name="accreditationScore" value={formData.accreditationScore ?? ''} onChange={handleChange} className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Contoh: 92" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Rating Orang Tua (0-5)</label>
                <input type="number" name="rating" min="0" max="5" step="0.1" value={formData.rating ?? ''} onChange={handleChange} className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Contoh: 4.7" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Tingkat Kelulusan (%)</label>
                <input type="number" name="graduationRate" min="0" max="100" value={formData.graduationRate ?? ''} onChange={handleChange} className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Contoh: 98" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Rata-rata Nilai Ujian</label>
                <input type="number" name="avgExam" value={formData.avgExam ?? ''} onChange={handleChange} className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Contoh: 88" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Total Prestasi Sekolah</label>
                <input type="number" name="achievements" value={formData.achievements ?? ''} onChange={handleChange} className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Contoh: 35" />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-bold text-slate-900">C. Data Operasional</div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Nomor Telepon</label>
                <input name="contact" value={formData.contact || ''} onChange={handleChange} className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Contoh: (0281) 123456" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Kapasitas Penerimaan per Tahun</label>
                <input type="number" name="capacity" value={formData.capacity ?? ''} onChange={handleChange} className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Contoh: 160" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Rasio Guru:Siswa</label>
                <input name="ratio" value={formData.ratio || ''} onChange={handleChange} className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Contoh: 1:18" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Koordinat GPS</label>
                <input name="gps" value={formData.gps || ''} onChange={handleChange} className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Contoh: -7.4195, 109.2598" />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-bold text-slate-900">D. Program dan Fasilitas</div>
            <div className="mt-4 grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Fasilitas (pisahkan dengan koma)</label>
                <input name="facilities" value={(formData.facilities || []).join(', ')} onChange={handleArrayChange} className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Perpustakaan, Laboratorium, UKS, Lapangan" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Program Unggulan (pisahkan dengan koma)</label>
                <input name="programs" value={(formData.programs || []).join(', ')} onChange={handleArrayChange} className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Tahfidz, Literasi Digital, Kelas Karakter" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Ekstrakurikuler (pisahkan dengan koma)</label>
                <input name="extracurriculars" value={(formData.extracurriculars || []).join(', ')} onChange={handleArrayChange} className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Pramuka, Silat, Tari Tradisional, Paduan Suara, Melukis, Futsal, Bulu Tangkis, Drumband, English Club, Robotik" />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-bold text-slate-900">E. Deskripsi / Review Singkat</div>
            <div className="mt-4 grid gap-2">
              <label className="text-sm font-semibold">Deskripsi Sekolah</label>
              <textarea name="review" value={formData.review} onChange={handleChange} className="h-24 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Profil singkat sekolah"></textarea>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-bold text-slate-900">F. Gallery Foto Sekolah</div>
            <p className="mt-1 text-xs text-slate-500">Foto pertama akan menjadi cover. Maksimal 10 foto, format JPG/PNG/WEBP.</p>
            
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
              {formData.gallery.map((photo, idx) => (
                <div key={idx} className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  <img 
                    src={getFullUrl(photo.url)} 
                    className="h-full w-full object-cover" 
                    alt={`Gallery ${idx}`} 
                    onError={handleImageError}
                  />
                  
                  {idx === 0 && (
                    <div className="absolute top-2 left-2 rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                      COVER
                    </div>
                  )}

                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    {idx > 0 && (
                      <button 
                        type="button" 
                        onClick={() => handleReorderPhoto(idx, idx - 1)}
                        className="rounded-full bg-white p-1.5 text-slate-900 hover:bg-blue-50"
                        title="Geser Kiri"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                    )}
                    {idx < formData.gallery.length - 1 && (
                      <button 
                        type="button" 
                        onClick={() => handleReorderPhoto(idx, idx + 1)}
                        className="rounded-full bg-white p-1.5 text-slate-900 hover:bg-blue-50"
                        title="Geser Kanan"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    )}
                    <button 
                      type="button" 
                      onClick={() => handleRemovePhoto(idx)}
                      className="rounded-full bg-red-600 p-1.5 text-white hover:bg-red-700"
                      title="Hapus"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              
              {formData.gallery.length < 10 && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 transition-colors hover:bg-slate-100">
                  <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="mt-2 text-xs font-medium text-slate-500">Tambah Foto</span>
                  <input type="file" className="hidden" accept="image/*" multiple onChange={handlePhotoUpload} />
                </label>
              )}
            </div>
          </section>

          <div className="flex justify-end gap-3">
            <button 
              type="button" 
              onClick={handleToggleEdit} 
              disabled={isSaving}
              className="btn-secondary px-6 py-2.5 font-bold text-slate-600 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => isDirty && setShowPreview(true)}
              disabled={!isDirty || isSaving}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              title={isDirty ? 'Lihat preview perubahan' : 'Ubah data terlebih dahulu untuk mengaktifkan preview'}
            >
              Preview Perubahan
            </button>
            <button 
              type="submit" 
              disabled={isSaving}
              className="btn-primary gap-2 px-8 py-2.5 font-bold disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Menyimpan...
                </>
              ) : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-start gap-6">
              <div className="h-24 w-24 flex-shrink-0 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                {formData.gallery?.[0] ? (
                  <img 
                    src={getFullUrl(formData.gallery[0].url)} 
                    className="h-full w-full object-cover rounded-2xl" 
                    onError={handleImageError}
                  />
                ) : 'Logo'}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-900">{formData.name}</h2>
                <p className="mt-1 text-slate-500">{formData.address}, {formData.district}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">Akreditasi {formData.accreditation}</span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Rating {formData.rating}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-8 md:grid-cols-3">
              <div className="md:col-span-2">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Deskripsi</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{formData.review || 'Belum ada deskripsi.'}</p>
                
                <h3 className="mt-6 text-sm font-bold text-slate-900 uppercase tracking-wider">Gallery Foto</h3>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {formData.gallery.map((photo, idx) => (
                    <div key={idx} className="aspect-square overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                      <img 
                        src={getFullUrl(photo.url)} 
                        className="h-full w-full object-cover" 
                        alt={`Gallery ${idx}`} 
                        onError={handleImageError}
                      />
                    </div>
                  ))}
                  {formData.gallery.length === 0 && (
                    <div className="col-span-full py-4 text-xs italic text-slate-400">Belum ada foto gallery.</div>
                  )}
                </div>
              </div>
              <div className="space-y-4 rounded-2xl bg-slate-50 p-6">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Informasi Kontak</h3>
                <div className="space-y-3">
                  <div className="text-xs">
                    <div className="font-bold text-slate-400 uppercase">Kepala Sekolah</div>
                    <div className="mt-1 text-slate-700">{formData.principalName || '-'}</div>
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-slate-400 uppercase">Telepon</div>
                    <div className="mt-1 text-slate-700">{formData.contact || '-'}</div>
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-slate-400 uppercase">Kapasitas</div>
                    <div className="mt-1 text-slate-700">{formData.capacity} siswa/tahun</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
