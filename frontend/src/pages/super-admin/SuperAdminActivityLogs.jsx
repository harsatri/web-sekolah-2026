import { useState, useMemo } from 'react'
import { useSuperAdminData } from '../../hooks/useSuperAdminData.js'

export default function SuperAdminActivityLogs() {
  const { activityLogs, formatDateTime } = useSuperAdminData()
  const [filterType, setFilterType] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredLogs = useMemo(() => {
    if (!Array.isArray(activityLogs)) return []
    return activityLogs.filter(log => {
      const matchesType = filterType === 'all' || log.type === filterType
      const actorName = log.actorName || ''
      const actorEmail = log.actorEmail || ''
      const description = log.description || ''
      const matchesSearch = 
        actorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        actorEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        description.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesType && matchesSearch
    })
  }, [activityLogs, filterType, searchTerm])

  const logTypes = useMemo(() => {
    if (!Array.isArray(activityLogs)) return []
    const types = new Set(activityLogs.map(l => l.type))
    return Array.from(types)
  }, [activityLogs])

  const getStatusBadge = (status) => {
    if (status === 'success') return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase">Success</span>
    return <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 uppercase">{status}</span>
  }

  const getTypeLabel = (type) => {
    switch (type) {
      case 'login': return 'Login'
      case 'logout': return 'Logout'
      case 'simulation': return 'Simulasi dijalankan'
      case 'criteria_request': return 'Pengajuan kriteria'
      case 'criteria_approved': return 'Kriteria disetujui'
      case 'criteria_rejected': return 'Kriteria ditolak'
      case 'account_created': return 'Akun dibuat'
      case 'account_updated': return 'Akun diubah'
      default: return type
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Log Aktivitas</h1>
        <p className="mt-1 text-sm text-slate-500">Histori seluruh kegiatan sistem secara komprehensif.</p>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input 
              type="text" 
              className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Cari aktor atau deskripsi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">Semua Tipe</option>
            {logTypes.map(type => (
              <option key={type} value={type}>{getTypeLabel(type)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4">Waktu</th>
                <th className="px-6 py-4">Aktor</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Tipe Aktivitas</th>
                <th className="px-6 py-4">Deskripsi Detail</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-slate-400">Tidak ada log ditemukan</td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-6 py-4 text-slate-600">{formatDateTime(log.createdAt)}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{log.actorName}</div>
                      <div className="text-xs text-slate-500">{log.actorEmail}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase">
                        {log.actorRole}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-700">{getTypeLabel(log.type)}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="max-w-md">{log.description}</div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(log.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
