import SchoolDetail from '../public/SchoolDetail.jsx'
import { useSchoolAdminData } from '../../hooks/useSchoolAdminData.js'

export default function SchoolAdminSupporting() {
  const {
    schoolToManage,
    formData,
    showPreview,
    setShowPreview,
    handleChange,
    handleArrayChange,
    handleSubmit,
    handleCancel,
  } = useSchoolAdminData()

  if (!schoolToManage || !formData) {
    return <div className="rounded-xl bg-white p-4 text-sm text-slate-600">Loading school data...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Data Pendukung Sekolah</h1>
        <p className="mt-2 text-sm text-slate-600">Atur data operasional, statistik, dan informasi pendukung sekolah.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Data Pendukung Sekolah</div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Alamat Lengkap</label>
              <input name="address" value={formData.address} onChange={handleChange} className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Jl. Dr. Angka No. 12, Purwokerto Selatan" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Kecamatan</label>
              <select name="district" value={formData.district} onChange={handleChange} className="rounded-xl border border-slate-300 px-3 py-2">
                <option>Purwokerto Timur</option>
                <option>Purwokerto Utara</option>
                <option>Purwokerto Selatan</option>
                <option>Purwokerto Barat</option>
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Kontak Sekolah</label>
              <input name="contact" value={formData.contact} onChange={handleChange} className="rounded-xl border border-slate-300 px-3 py-2" placeholder="(0281) 123-4567" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Koordinat GPS</label>
              <input name="gps" value={formData.gps} onChange={handleChange} className="rounded-xl border border-slate-300 px-3 py-2" placeholder="-7.4308, 109.2437" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Akreditasi</label>
              <input name="accreditation" value={formData.accreditation} onChange={handleChange} className="rounded-xl border border-slate-300 px-3 py-2" placeholder="A" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Nilai Akreditasi</label>
              <input name="accreditationScore" value={formData.accreditationScore} onChange={handleChange} type="number" className="rounded-xl border border-slate-300 px-3 py-2" placeholder="95" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Kapasitas Penerimaan</label>
              <input name="capacity" value={formData.capacity} onChange={handleChange} type="number" className="rounded-xl border border-slate-300 px-3 py-2" placeholder="200" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Rasio Guru:Siswa</label>
              <input name="ratio" value={formData.ratio} onChange={handleChange} className="rounded-xl border border-slate-300 px-3 py-2" placeholder="1:18" />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <label className="text-sm font-semibold">Statistik Kelulusan (5 tahun)</label>
              <textarea className="h-20 rounded-xl border border-slate-300 px-3 py-2" placeholder="2020: 98%, 2021: 97%, 2022: 96%, 2023: 98%, 2024: 99%"></textarea>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Program Unggulan</label>
              <input name="programs" value={formData.programs.join(', ')} onChange={handleArrayChange} className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Bilingual, STEM, Literasi" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Ekstrakurikuler</label>
              <input name="extracurriculars" value={formData.extracurriculars.join(', ')} onChange={handleArrayChange} className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Pramuka, Robotik, Musik" />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <label className="text-sm font-semibold">Link Gallery Foto/Video</label>
              <input className="rounded-xl border border-slate-300 px-3 py-2" placeholder="https://drive.google.com/..." />
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Persentase Kelulusan</label>
              <input name="graduationRate" value={formData.graduationRate} onChange={handleChange} className="rounded-xl border border-slate-300 px-3 py-2" placeholder="98%" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Rata-rata Nilai Ujian</label>
              <input name="avgExam" value={formData.avgExam} onChange={handleChange} className="rounded-xl border border-slate-300 px-3 py-2" placeholder="87" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Jumlah Prestasi</label>
              <input name="achievements" value={formData.achievements} onChange={handleChange} type="number" className="rounded-xl border border-slate-300 px-3 py-2" placeholder="32" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Guru Bersertifikat</label>
              <input name="certifiedTeachers" value={formData.certifiedTeachers} onChange={handleChange} type="number" className="rounded-xl border border-slate-300 px-3 py-2" placeholder="24" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Rating Orang Tua</label>
              <input name="rating" value={formData.rating} onChange={handleChange} className="rounded-xl border border-slate-300 px-3 py-2" placeholder="4.8" />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <label className="text-sm font-semibold">Review & Testimoni</label>
              <textarea name="review" value={formData.review} onChange={handleChange} className="h-20 rounded-xl border border-slate-300 px-3 py-2" placeholder="Tuliskan ringkasan testimoni orang tua"></textarea>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-4">
            <button type="button" onClick={handleCancel} className="rounded-full bg-slate-100 px-6 py-2 text-sm font-semibold text-slate-600">Batal</button>
            <button type="button" onClick={() => setShowPreview(true)} className="rounded-full bg-green-600 px-6 py-2 text-sm font-semibold text-white">Preview Dashboard User</button>
            <button type="submit" className="rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white">Simpan Perubahan</button>
          </div>
        </section>
      </form>

      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative h-[90vh] w-[90vw] max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Preview Dashboard User</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200"
              >
                Tutup Preview
              </button>
            </div>
            <div className="h-full overflow-y-auto pt-16">
              <SchoolDetail previewData={formData} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
