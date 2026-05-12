import { useState, useMemo, useEffect } from 'react'
import { useSuperAdminData } from '../../hooks/useSuperAdminData.js'
import { apiJson } from '../../utils/api.js'

const criteriaCodeToName = {
  C1: 'Usia',
  C2: 'Domisili / Jarak',
  C3: 'Nilai Rapor TK',
  C4: 'Prestasi Akademik',
  C5: 'Prestasi Non-Akademik',
  C6: 'Kelengkapan Dokumen',
  C7: 'Kondisi Ekonomi',
}

export default function SuperAdminCriteriaRequests() {
  const { criteriaRequests, formatDateTime } = useSuperAdminData()
  const [requestRows, setRequestRows] = useState([])
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [adminNote, setAdminNote] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    setRequestRows(Array.isArray(criteriaRequests) ? criteriaRequests : [])
  }, [criteriaRequests])

  const filteredRequests = useMemo(() => {
    if (!Array.isArray(requestRows)) return []
    if (filterStatus === 'all') return requestRows
    return requestRows.filter(r => r.status === filterStatus)
  }, [requestRows, filterStatus])

  const handleApprove = async (id) => {
    if (!confirm('Setujui pengajuan perubahan kriteria ini?')) return
    setIsProcessing(true)
    try {
      await apiJson(`/api/criteria-requests/${id}/approve`, {
        method: 'PATCH',
        body: { adminNote }
      })
      alert('Pengajuan disetujui')
      setRequestRows((prev) => prev.map((item) => (
        item.id === id ? { ...item, status: 'approved', adminNote } : item
      )))
      setSelectedRequest(null)
      setAdminNote('')
    } catch (err) {
      alert(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async (id) => {
    if (!adminNote) return alert('Harap isi catatan alasan penolakan')
    if (!confirm('Tolak pengajuan perubahan kriteria ini?')) return
    setIsProcessing(true)
    try {
      await apiJson(`/api/criteria-requests/${id}/reject`, {
        method: 'PATCH',
        body: { adminNote }
      })
      alert('Pengajuan ditolak')
      setRequestRows((prev) => prev.map((item) => (
        item.id === id ? { ...item, status: 'rejected', adminNote } : item
      )))
      setSelectedRequest(null)
      setAdminNote('')
    } catch (err) {
      alert(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">Menunggu</span>
      case 'approved': return <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">Disetujui</span>
      case 'rejected': return <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">Ditolak</span>
      default: return null
    }
  }

  const mapRequestData = (request) => {
    const newCriteria = request?.newCriteria && typeof request.newCriteria === 'object' ? request.newCriteria : {}
    const oldCriteria = request?.oldCriteria && typeof request.oldCriteria === 'object' ? request.oldCriteria : {}
    return {
      ...request,
      oldCriteria,
      newCriteria,
      changeType: request?.changeType || newCriteria.changeType || '-',
      affectedCriteria: Array.isArray(request?.affectedCriteria)
        ? request.affectedCriteria
        : Array.isArray(newCriteria.affectedCriteria)
          ? newCriteria.affectedCriteria
          : [],
      proposedChange: request?.proposedChange || newCriteria.proposedChange || '',
      supportingDocument: request?.supportingDocument || newCriteria.supportingDocument || null,
    }
  }

  const normalizeCriteriaRows = (value) => {
    if (!value || typeof value !== 'object') return []
    if (Array.isArray(value)) return value
    if (Array.isArray(value.criteria)) return value.criteria
    return Object.entries(value)
      .filter(([, v]) => typeof v === 'number' || typeof v === 'string')
      .map(([code, weight]) => ({ code, weight }))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Pengajuan Kriteria</h1>
          <p className="mt-1 text-sm text-slate-500">Review dan approve perubahan kriteria dari admin sekolah.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Filter Status:</span>
          <select 
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Semua</option>
            <option value="pending">Menunggu</option>
            <option value="approved">Disetujui</option>
            <option value="rejected">Ditolak</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4">Waktu Pengajuan</th>
                <th className="px-6 py-4">Sekolah</th>
                <th className="px-6 py-4">Admin</th>
                <th className="px-6 py-4">Ringkasan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-slate-400">Tidak ada pengajuan ditemukan</td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-6 py-4 text-slate-600">{formatDateTime(req.createdAt)}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{req.schoolName}</td>
                    <td className="px-6 py-4 text-slate-600">{req.adminName}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="max-w-xs truncate">{req.reason}</div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(req.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedRequest(req)}
                        className="text-sm font-bold text-blue-600 hover:underline"
                      >
                        Lihat detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">Detail Perubahan Kriteria</h3>
              <button onClick={() => setSelectedRequest(null)} className="text-slate-400 hover:text-slate-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="max-h-[70vh] overflow-y-auto p-6">
              {(() => {
                const req = mapRequestData(selectedRequest)
                const oldRows = normalizeCriteriaRows(req.oldCriteria)
                const newRows = normalizeCriteriaRows(req.newCriteria)
                const oldByCode = new Map(oldRows.map((row) => [String(row.code), row.weight]))
                const doc = req.supportingDocument
                const docUrl = doc?.url ? (String(doc.url).startsWith('http') ? doc.url : doc.url.startsWith('/') ? doc.url : `/${doc.url}`) : ''
                return (
                  <>
                    <div className="grid gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:grid-cols-2">
                      <div>
                        <div className="text-xs font-bold uppercase text-slate-400">Jenis Perubahan</div>
                        <div className="mt-1 text-sm font-semibold text-slate-800">{req.changeType}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase text-slate-400">Tanggal Pengajuan</div>
                        <div className="mt-1 text-sm font-semibold text-slate-800">{formatDateTime(req.createdAt)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase text-slate-400">Admin Sekolah</div>
                        <div className="mt-1 text-sm font-semibold text-slate-800">{req.adminName}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase text-slate-400">Nama Sekolah</div>
                        <div className="mt-1 text-sm font-semibold text-slate-800">{req.schoolName}</div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <h4 className="mb-2 text-sm font-bold text-slate-900">Kriteria yang Terdampak:</h4>
                      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-100 bg-slate-50 p-4">
                        {req.affectedCriteria.length > 0 ? req.affectedCriteria.map((code) => (
                          <span key={`${req.id}-${code}`} className="inline-flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                            <span>{code}</span>
                            <span className="text-blue-600/80">{criteriaCodeToName[code] || 'Kriteria'}</span>
                          </span>
                        )) : <span className="text-sm text-slate-400">-</span>}
                      </div>
                    </div>

                    {req.changeType === 'Perubahan bobot kriteria' ? (
                      <div className="mt-6 grid gap-6 md:grid-cols-2">
                        <div>
                          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Kriteria Lama</h4>
                          <div className="overflow-hidden rounded-xl border border-slate-200">
                            <table className="min-w-full text-sm">
                              <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                  <th className="px-3 py-2 text-left font-semibold">Kode</th>
                                  <th className="px-3 py-2 text-left font-semibold">Bobot</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {oldRows.length > 0 ? oldRows.map((row, idx) => (
                                  <tr key={`${row.code}-${idx}`}>
                                    <td className="px-3 py-2 font-semibold text-slate-700">{row.code}</td>
                                    <td className="px-3 py-2 text-slate-600">{String(row.weight)}</td>
                                  </tr>
                                )) : (
                                  <tr><td colSpan="2" className="px-3 py-4 text-center text-slate-400">Tidak ada data</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        <div>
                          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-blue-400">Kriteria Baru</h4>
                          <div className="overflow-hidden rounded-xl border border-blue-200">
                            <table className="min-w-full text-sm">
                              <thead className="bg-blue-50 text-blue-700">
                                <tr>
                                  <th className="px-3 py-2 text-left font-semibold">Kode</th>
                                  <th className="px-3 py-2 text-left font-semibold">Bobot</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-blue-100">
                                {newRows.length > 0 ? newRows.map((row, idx) => {
                                  const changed = oldByCode.get(String(row.code)) !== row.weight
                                  return (
                                    <tr key={`${row.code}-${idx}`} className={changed ? 'bg-amber-50' : ''}>
                                      <td className="px-3 py-2 font-semibold text-slate-700">{row.code}</td>
                                      <td className="px-3 py-2 text-slate-600">{String(row.weight)}</td>
                                    </tr>
                                  )
                                }) : (
                                  <tr><td colSpan="2" className="px-3 py-4 text-center text-slate-400">Tidak ada data</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-6">
                        <h4 className="mb-2 text-sm font-bold text-slate-900">Usulan Perubahan:</h4>
                        <p className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
                          {req.proposedChange || '-'}
                        </p>
                      </div>
                    )}

                    {doc?.url && (
                      <div className="mt-6">
                        <h4 className="mb-2 text-sm font-bold text-slate-900">Dokumen Pendukung:</h4>
                        <a
                          href={docUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                        >
                          <span>📎</span>
                          <span>{doc?.name || 'Buka dokumen'}</span>
                        </a>
                      </div>
                    )}

                    <div className="mt-6">
                      <h4 className="mb-2 text-sm font-bold text-slate-900">Alasan Perubahan:</h4>
                      <p className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
                        {req.reason}
                      </p>
                    </div>
                  </>
                )
              })()}

              {selectedRequest.status === 'pending' && (
                <div className="mt-6">
                  <h4 className="mb-2 text-sm font-bold text-slate-900">Catatan untuk admin sekolah:</h4>
                  <textarea 
                    className="w-full rounded-xl border border-slate-200 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tulis alasan jika menolak atau catatan tambahan..."
                    rows={3}
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                  />
                </div>
              )}

              {selectedRequest.status !== 'pending' && selectedRequest.adminNote && (
                <div className="mt-6">
                  <h4 className="mb-2 text-sm font-bold text-slate-900">Catatan Admin:</h4>
                  <p className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600 italic">
                    {selectedRequest.adminNote}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button 
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
              >
                Tutup
              </button>
              {selectedRequest.status === 'pending' && (
                <>
                  <button 
                    type="button"
                    onClick={() => handleReject(selectedRequest.id)}
                    disabled={isProcessing}
                    className="rounded-lg bg-red-600 px-6 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    Tolak
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleApprove(selectedRequest.id)}
                    disabled={isProcessing}
                    className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Setujui
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
