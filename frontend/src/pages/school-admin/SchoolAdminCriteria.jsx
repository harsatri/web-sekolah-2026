import { useEffect, useState } from 'react'
import { useSchoolAdminData } from '../../hooks/useSchoolAdminData.js'
import { apiForm, apiJson } from '../../utils/api.js'

const activeCriteria = [
  { code: 'C1', name: 'Usia', weight: '40%', note: 'Prioritas usia >= 7 tahun per 1 Juli 2026' },
  { code: 'C2', name: 'Domisili / Jarak', weight: '35%', note: 'Satu kelurahan = skor tertinggi' },
  { code: 'C3', name: 'Nilai Rapor TK', weight: '10%', note: 'Rata-rata 7 aspek perkembangan' },
  { code: 'C4', name: 'Prestasi', weight: '7%', note: 'Tingkat kecamatan hingga provinsi' },
  { code: 'C5', name: 'Kelengkapan Dokumen', weight: '5%', note: 'Proporsi dokumen wajib tersedia' },
  { code: 'C6', name: 'Kondisi Ekonomi', weight: '3%', note: 'Cost - keluarga kurang mampu diprioritaskan' },
]

const statusConfig = {
  pending: { label: 'Menunggu', icon: '🟡', className: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Disetujui', icon: '🟢', className: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Ditolak', icon: '🔴', className: 'bg-red-100 text-red-700' },
}

export default function SchoolAdminCriteria() {
  const { schoolToManage } = useSchoolAdminData()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState(false)
  const [errors, setErrors] = useState({})
  const [historyRequests, setHistoryRequests] = useState([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [formValues, setFormValues] = useState({
    changeType: '',
    affectedCriteria: [],
    proposedChange: '',
    reason: '',
    supportingDocument: null,
  })

  const formatDate = (value) => {
    if (!value) return '-'
    return new Date(value).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const parseRequestShape = (req) => {
    const newCriteria = req?.newCriteria && typeof req.newCriteria === 'object' ? req.newCriteria : {}
    return {
      ...req,
      changeType: req?.changeType || newCriteria.changeType || '-',
      affectedCriteria: Array.isArray(req?.affectedCriteria)
        ? req.affectedCriteria
        : Array.isArray(newCriteria.affectedCriteria)
          ? newCriteria.affectedCriteria
          : [],
      proposedChange: req?.proposedChange || newCriteria.proposedChange || '',
      supportingDocument: req?.supportingDocument || newCriteria.supportingDocument || null,
    }
  }

  const fetchHistoryRequests = async () => {
    setIsHistoryLoading(true)
    try {
      const payload = await apiJson('/api/criteria-requests/mine')
      const normalized = Array.isArray(payload) ? payload.map(parseRequestShape) : []
      setHistoryRequests(normalized)
    } catch {
      setHistoryRequests([])
    } finally {
      setIsHistoryLoading(false)
    }
  }

  useEffect(() => {
    fetchHistoryRequests()
  }, [])

  const handleCheckboxChange = (code) => {
    setFormValues(prev => {
      const current = prev.affectedCriteria
      if (current.includes(code)) {
        return { ...prev, affectedCriteria: current.filter(c => c !== code) }
      } else {
        return { ...prev, affectedCriteria: [...current, code] }
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation
    const newErrors = {}
    if (!formValues.changeType) newErrors.changeType = 'Jenis perubahan wajib dipilih'
    if (formValues.affectedCriteria.length === 0) newErrors.affectedCriteria = 'Minimal pilih 1 kriteria yang terdampak'
    if (!formValues.proposedChange) newErrors.proposedChange = 'Usulan perubahan wajib diisi'
    if (!formValues.reason) newErrors.reason = 'Alasan perubahan wajib diisi'
    
    if (formValues.supportingDocument && formValues.supportingDocument.size > 5 * 1024 * 1024) {
      newErrors.supportingDocument = 'Ukuran file maksimal 5MB'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const formData = new FormData()
      formData.append('schoolId', schoolToManage?.id)
      formData.append('schoolName', schoolToManage?.name)
      formData.append('changeType', formValues.changeType)
      formData.append('affectedCriteria', JSON.stringify(formValues.affectedCriteria))
      formData.append('proposedChange', formValues.proposedChange)
      formData.append('reason', formValues.reason)
      if (formValues.supportingDocument) {
        formData.append('supportingDocument', formValues.supportingDocument)
      }

      await apiForm('/api/criteria-requests', {
        method: 'POST',
        body: formData,
      })

      setSuccessMessage(true)
      setIsFormOpen(false)
      setFormValues({
        changeType: '',
        affectedCriteria: [],
        proposedChange: '',
        reason: '',
        supportingDocument: null,
      })
      fetchHistoryRequests()

      // Auto hide success message after 6 seconds
      setTimeout(() => {
        setSuccessMessage(false)
      }, 6000)

    } catch (err) {
      setErrors({ form: err.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Pengajuan Kriteria</h1>
          <p className="mt-1 text-sm text-slate-500">Ajukan perubahan bobot atau kriteria penilaian ke super admin.</p>
        </div>
        <button 
          onClick={() => {
            setIsFormOpen(true)
            setErrors({})
          }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
        >
          + Ajukan Perubahan
        </button>
      </div>

      {successMessage && (
        <div className="relative flex items-start gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-800 shadow-sm transition-all animate-in fade-in slide-in-from-top-4">
          <div className="text-2xl">✅</div>
          <div>
            <div className="font-bold">Pengajuan berhasil dikirim.</div>
            <div className="text-sm opacity-90">Super admin akan meninjau dalam 3–5 hari kerja.</div>
            <div className="text-sm opacity-90">Anda akan mendapat notifikasi melalui email.</div>
          </div>
          <button 
            onClick={() => setSuccessMessage(false)}
            className="absolute top-4 right-4 text-emerald-400 hover:text-emerald-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Kriteria Aktif Saat Ini</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Kode</th>
                <th className="px-4 py-3 font-semibold">Kriteria</th>
                <th className="px-4 py-3 font-semibold">Bobot</th>
                <th className="px-4 py-3 font-semibold text-right">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeCriteria.map((item) => (
                <tr key={item.code}>
                  <td className="px-4 py-3 font-bold text-slate-900">{item.code}</td>
                  <td className="px-4 py-3 text-slate-700">{item.name}</td>
                  <td className="px-4 py-3 font-bold text-blue-600">{item.weight}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{item.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Riwayat Pengajuan Anda</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Tanggal</th>
                <th className="px-4 py-3 font-semibold">Jenis Perubahan</th>
                <th className="px-4 py-3 font-semibold">Kriteria Terdampak</th>
                <th className="px-4 py-3 font-semibold">Alasan</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Catatan Super Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isHistoryLoading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-10 text-center text-slate-400">Memuat riwayat pengajuan...</td>
                </tr>
              ) : historyRequests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-10 text-center text-slate-400">Belum ada riwayat pengajuan</td>
                </tr>
              ) : (
                historyRequests.map((req) => {
                  const status = statusConfig[req.status] || statusConfig.pending
                  return (
                    <tr key={req.id}>
                      <td className="px-4 py-3 text-slate-600">{formatDate(req.createdAt)}</td>
                      <td className="px-4 py-3 text-slate-900 font-medium">{req.changeType || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(req.affectedCriteria) && req.affectedCriteria.length > 0 ? (
                            req.affectedCriteria.map((code) => (
                              <span key={`${req.id}-${code}`} className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                                {code}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-900 font-medium">{req.reason}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-bold ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 italic">{req.adminNote || '-'}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <form onSubmit={handleSubmit}>
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <h3 className="text-lg font-bold text-slate-900">Ajukan Perubahan Kriteria</h3>
                <button type="button" onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="max-h-[70vh] overflow-y-auto p-6 space-y-6">
                {errors.form && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600 border border-red-100">
                    ⚠️ {errors.form}
                  </div>
                )}

                {/* Field 1: Jenis Perubahan */}
                <div>
                  <label className="block text-sm font-bold text-slate-900">Jenis Perubahan <span className="text-red-500">*</span></label>
                  <select 
                    className={`mt-2 w-full rounded-xl border ${errors.changeType ? 'border-red-500' : 'border-slate-200'} p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none`}
                    value={formValues.changeType}
                    onChange={(e) => setFormValues({ ...formValues, changeType: e.target.value })}
                  >
                    <option value="">Pilih jenis perubahan</option>
                    <option value="Perubahan bobot kriteria">Perubahan bobot kriteria</option>
                    <option value="Penambahan kriteria baru">Penambahan kriteria baru</option>
                    <option value="Penghapusan kriteria">Penghapusan kriteria</option>
                    <option value="Perubahan sub-kriteria">Perubahan sub-kriteria</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                  {errors.changeType && <p className="mt-1 text-xs text-red-500">{errors.changeType}</p>}
                </div>

                {/* Field 2: Kriteria yang Terdampak */}
                <div>
                  <label className="block text-sm font-bold text-slate-900">Kriteria yang Terdampak <span className="text-red-500">*</span></label>
                  <p className="text-xs text-slate-500 mb-3">Pilih satu atau lebih kriteria yang berkaitan dengan pengajuan ini.</p>
                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-xl border ${errors.affectedCriteria ? 'border-red-500' : 'border-slate-100'} bg-slate-50 p-4`}>
                    {activeCriteria.map((c) => (
                      <label key={c.code} className="flex items-center gap-3 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={formValues.affectedCriteria.includes(c.code)}
                          onChange={() => handleCheckboxChange(c.code)}
                        />
                        <span className="text-sm text-slate-700 group-hover:text-slate-900 font-medium">
                          <span className="text-blue-600 font-bold mr-1">{c.code}</span> {c.name}
                        </span>
                      </label>
                    ))}
                  </div>
                  {errors.affectedCriteria && <p className="mt-1 text-xs text-red-500">{errors.affectedCriteria}</p>}
                </div>

                {/* Field 3: Usulan Perubahan */}
                <div>
                  <label className="block text-sm font-bold text-slate-900">Usulan Perubahan <span className="text-red-500">*</span></label>
                  <textarea 
                    className={`mt-2 w-full rounded-xl border ${errors.proposedChange ? 'border-red-500' : 'border-slate-200'} p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none`}
                    placeholder="Jelaskan perubahan yang diinginkan secara spesifik..."
                    rows={3}
                    value={formValues.proposedChange}
                    onChange={(e) => setFormValues({ ...formValues, proposedChange: e.target.value })}
                  />
                  {errors.proposedChange && <p className="mt-1 text-xs text-red-500">{errors.proposedChange}</p>}
                </div>

                {/* Field 4: Alasan / Justifikasi */}
                <div>
                  <label className="block text-sm font-bold text-slate-900">Alasan / Justifikasi <span className="text-red-500">*</span></label>
                  <textarea 
                    className={`mt-2 w-full rounded-xl border ${errors.reason ? 'border-red-500' : 'border-slate-200'} p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none`}
                    placeholder="Mengapa perubahan ini diperlukan untuk sekolah Anda?"
                    rows={3}
                    value={formValues.reason}
                    onChange={(e) => setFormValues({ ...formValues, reason: e.target.value })}
                  />
                  {errors.reason && <p className="mt-1 text-xs text-red-500">{errors.reason}</p>}
                </div>

                {/* Field 5: Dokumen Pendukung */}
                <div>
                  <label className="block text-sm font-bold text-slate-900">Dokumen Pendukung (Opsional)</label>
                  <div className={`mt-2 flex flex-col items-center justify-center rounded-xl border-2 border-dashed ${errors.supportingDocument ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'} p-6 transition-colors hover:bg-slate-100`}>
                    <input 
                      type="file" 
                      id="file-upload"
                      className="hidden" 
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files[0]
                        setFormValues({ ...formValues, supportingDocument: file })
                      }}
                    />
                    <label htmlFor="file-upload" className="flex flex-col items-center cursor-pointer">
                      <svg className={`h-10 w-10 ${formValues.supportingDocument ? 'text-blue-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="mt-2 text-sm font-bold text-slate-700">
                        {formValues.supportingDocument ? formValues.supportingDocument.name : 'Klik untuk upload dokumen'}
                      </span>
                      <span className="text-xs text-slate-500">PDF, JPG, PNG (Maks. 5MB)</span>
                    </label>
                  </div>
                  {errors.supportingDocument && <p className="mt-1 text-xs text-red-500">{errors.supportingDocument}</p>}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
                <button 
                  type="button" 
                  onClick={() => setIsFormOpen(false)} 
                  className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="rounded-lg bg-blue-600 px-8 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Mengirim...
                    </>
                  ) : 'Kirim Pengajuan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
