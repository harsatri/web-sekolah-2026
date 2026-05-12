import { useMemo } from 'react'
import { useSuperAdminData } from '../../hooks/useSuperAdminData.js'
import { Link } from 'react-router-dom'
import { apiJson } from '../../utils/api.js'

export default function SuperAdminDashboard() {
  const { stats, monthlyUsage, pendingRequests, formatDateTime } = useSuperAdminData()

  const handleQuickApprove = async (id) => {
    if (!confirm('Setujui pengajuan ini?')) return
    try {
      await apiJson(`/api/criteria-requests/${id}/approve`, {
        method: 'PATCH',
        body: { adminNote: 'Approved via quick dashboard action' }
      })
      alert('Pengajuan disetujui')
      window.location.reload()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleQuickReject = async (id) => {
    const note = prompt('Alasan penolakan:')
    if (note === null) return
    if (!note) return alert('Alasan wajib diisi')
    try {
      await apiJson(`/api/criteria-requests/${id}/reject`, {
        method: 'PATCH',
        body: { adminNote: note }
      })
      alert('Pengajuan ditolak')
      window.location.reload()
    } catch (err) {
      alert(err.message)
    }
  }

  const usageChart = useMemo(() => {
    const maxValue = Math.max(...monthlyUsage.map((item) => item.value), 1)
    return monthlyUsage.map((item, index) => ({
      ...item,
      height: `${Math.max((item.value / maxValue) * 100, item.value > 0 ? 12 : 0)}%`,
      isHighest: item.value === Math.max(...monthlyUsage.map(m => m.value)),
    }))
  }, [monthlyUsage])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Pusat kontrol penerimaan siswa</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tahun pelajaran 2026/2027 • Purwokerto Timur • update {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Filter gelombang</button>
          <button className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Filter sekolah</button>
          <button className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Cari calon siswa</button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Total Simulasi</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{stats.totalSimulations}</span>
          </div>
          <div className="mt-1 text-xs font-medium text-emerald-600">+{stats.simulationsDelta} dari minggu lalu</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Total Pengguna</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{stats.totalUsers}</span>
          </div>
          <div className="mt-1 text-xs font-medium text-blue-600">+{stats.usersDelta} pengguna baru</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Total Admin Sekolah</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{stats.totalAdmins}</span>
          </div>
          <div className="mt-1 text-xs font-medium text-amber-600">+{stats.adminsDelta} akun baru</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Aturan & Bobot Aktif</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{stats.activeRules}</span>
          </div>
          <div className="mt-1 text-xs font-medium text-emerald-600">sinkron semua sekolah</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Chart & Queue */}
        <div className="space-y-6 lg:col-span-2">
          {/* Monthly Chart */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Grafik simulasi bulanan</h2>
                <p className="text-sm text-slate-500">Jumlah simulasi dijalankan 6 bulan terakhir</p>
              </div>
              <div className="text-xs font-medium text-slate-400">Trend: Stabil</div>
            </div>
            <div className="mt-8 flex h-64 items-end justify-between gap-4">
              {usageChart.map((item) => (
                <div key={item.label} className="flex h-full flex-1 flex-col items-center justify-end gap-3">
                  <div className="group relative flex h-52 w-full items-end justify-center px-1">
                    <div
                      className={`w-full max-w-[40px] rounded-t-md transition-all duration-300 ${item.isHighest ? 'bg-teal-500' : 'bg-blue-500'} hover:opacity-80`}
                      style={{ height: item.height }}
                    >
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-700 opacity-0 group-hover:opacity-100">
                        {item.value}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-medium text-slate-500">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Follow-up Queue */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Antrian tindak lanjut pusat</h2>
              <Link to="/super-admin/pengajuan-kriteria" className="text-sm font-medium text-blue-600 hover:underline">
                Lihat semua
              </Link>
            </div>
            <p className="mt-1 text-sm text-slate-500">Daftar pengajuan perubahan kriteria yang menunggu approval</p>
            
            <div className="mt-6 space-y-4">
              {pendingRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <div className="text-4xl">✅</div>
                  <p className="mt-2 text-sm">Semua pengajuan telah diproses</p>
                </div>
              ) : (
                pendingRequests.slice(0, 3).map((req) => (
                  <div key={req.id} className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-900">{req.schoolName}</div>
                      <div className="text-xs text-slate-500">{req.adminName} • {formatDateTime(req.createdAt)}</div>
                      <div className="mt-1 text-sm text-slate-600 line-clamp-1">{req.reason}</div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleQuickApprove(req.id)}
                        className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                      >
                        Setujui
                      </button>
                      <button 
                        onClick={() => handleQuickReject(req.id)}
                        className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700"
                      >
                        Tolak
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Notifications */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Pusat notifikasi</h2>
            <p className="mt-1 text-sm text-slate-500">Tindakan mendesak yang perlu dilakukan</p>

            <div className="mt-6 space-y-6">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Hari ini</div>
                <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
                  Ekspor ranking sementara untuk rapat panitia.
                </div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Besok</div>
                <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
                  Audit sampel 20 berkas dokumen dari tiap sekolah.
                </div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Minggu ini</div>
                <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
                  Finalisasi kuota dan kebijakan verifikasi tahap 2.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
