import { useSuperAdminData } from '../../hooks/useSuperAdminData.js'
import { useAuth } from '../../contexts/AuthContext.jsx'

export default function SuperAdminMonitoring() {
  const { user, isHydrated } = useAuth()
  const { criteriaNotifications, formatDateTime } = useSuperAdminData({
    enabled: isHydrated && user?.role === 'super_admin',
  })


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Monitoring Kegiatan</h1>
        <p className="mt-2 text-sm text-slate-600">Notifikasi perubahan kriteria oleh admin sekolah.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-left text-slate-700">
                <th className="px-3 py-2">Waktu</th>
                <th className="px-3 py-2">Admin</th>
                <th className="px-3 py-2">Sekolah</th>
                <th className="px-3 py-2">Notifikasi</th>
              </tr>
            </thead>
            <tbody>
              {criteriaNotifications.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={4}>Belum ada notifikasi perubahan kriteria.</td>
                </tr>
              )}
              {criteriaNotifications.map((item) => (
                <tr key={item.id} className="border-b border-slate-200">
                  <td className="px-3 py-2 text-slate-600">{formatDateTime(item.createdAt)}</td>
                  <td className="px-3 py-2 text-slate-600">
                    <div className="font-semibold text-slate-800">{item.actorName || '-'}</div>
                    <div>{item.actorEmail || '-'}</div>
                  </td>
                  <td className="px-3 py-2">{item.schoolName || '-'}</td>
                  <td className="px-3 py-2 text-slate-600">{item.message || 'Mengganti kriteria prescreening sekolah'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
