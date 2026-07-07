import { useEffect, useState } from 'react'
import { apiJson } from '../../utils/api.js'

function StatusBadge({ status }) {
  if (!status) return null
  if (status === 'pending') {
    return <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">Pending</span>
  }
  if (status === 'approved') {
    return <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">Approved</span>
  }
  if (status === 'rejected') {
    return <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">Rejected</span>
  }
  return null
}

function formatDate(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function SchoolVerification() {
  const [pendingSchools, setPendingSchools] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await apiJson('/api/schools/pending')
      setPendingSchools(Array.isArray(data) ? data : [])
    } catch (e) {
      setError('Gagal memuat data verifikasi sekolah.')
      setPendingSchools([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleVerify = async (schoolId, action) => {
    if (!schoolId) return

    const msg = action === 'approve'
      ? 'Apakah Anda yakin ingin menyetujui sekolah ini?'
      : 'Apakah Anda yakin ingin menolak sekolah ini?'

    if (!window.confirm(msg)) return

    setIsProcessing(true)
    try {
      let body = { action }
      if (action === 'reject') {
        const adminNote = prompt('Alasan penolakan (opsional):')
        if (adminNote && adminNote.trim()) body = { action, adminNote: adminNote.trim() }
      }

      await apiJson(`/api/schools/${schoolId}/verify`, {
        method: 'PATCH',
        body,
      })

      // refresh
      await load()
      alert(action === 'approve' ? 'Sekolah berhasil disetujui.' : 'Sekolah berhasil ditolak.')
    } catch (e) {
      alert(e?.message || 'Gagal melakukan verifikasi sekolah.')
    } finally {
      setIsProcessing(false)
    }
  }

  const approvedList = []
  const rejectedList = []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Verifikasi Sekolah</h1>
        <p className="mt-1 text-sm text-slate-500">Persetujuan sekolah baru sebelum muncul di daftar publik dan simulasi SAW.</p>
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
            <div className="text-sm font-medium text-slate-600">Memuat data...</div>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {!loading && !error && pendingSchools.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
          Belum ada sekolah yang menunggu verifikasi.
        </div>
      )}

      {!loading && !error && pendingSchools.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Nama Sekolah</th>
                  <th className="px-6 py-4">NPSN</th>
                  <th className="px-6 py-4">Alamat</th>
                  <th className="px-6 py-4">Tanggal Registrasi</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingSchools.map((school) => (
                  <tr key={school.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold text-slate-900">{school.name}</td>
                    <td className="px-6 py-4 text-slate-600">{school.npsn || '-'}</td>
                    <td className="px-6 py-4 text-slate-600">{school.address}</td>
                    <td className="px-6 py-4 text-slate-600">{formatDate(school.createdAt)}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={school.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleVerify(school.id, 'approve')}
                          className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Setujui
                        </button>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleVerify(school.id, 'reject')}
                          className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          Tolak
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approved/Rejected placeholders per requirement table columns.
          Backend endpoints for approved/rejected lists are not specified in task;
          so we keep page focused on pending queue. */}
      <div className="text-xs text-slate-500">
        Catatan: halaman ini fokus pada antrean sekolah pending untuk diverifikasi.
      </div>
    </div>
  )
}

