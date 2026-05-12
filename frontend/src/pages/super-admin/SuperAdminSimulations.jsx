import { useSuperAdminData } from '../../hooks/useSuperAdminData.js'

export default function SuperAdminSimulations() {
  const { simulationDetails, formatDateTime } = useSuperAdminData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Detail Simulasi</h1>
        <p className="mt-2 text-sm text-slate-600">Riwayat simulasi prescreening yang dilakukan pengguna.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-left text-slate-700">
                <th className="px-3 py-2">Waktu Simulasi</th>
                <th className="px-3 py-2">Akun Pengguna</th>
                <th className="px-3 py-2">Nama Calon Siswa</th>
                <th className="px-3 py-2">Skor</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Rekomendasi</th>
              </tr>
            </thead>
            <tbody>
              {simulationDetails.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={6}>Belum ada data simulasi prescreening.</td>
                </tr>
              )}
              {simulationDetails.map((item) => (
                <tr key={item.id} className="border-b border-slate-200">
                  <td className="px-3 py-2 text-slate-600">{formatDateTime(item.submittedAt)}</td>
                  <td className="px-3 py-2 text-slate-600">
                    <div className="font-semibold text-slate-800">{item.accountName}</div>
                    <div>{item.accountEmail}</div>
                  </td>
                  <td className="px-3 py-2 font-semibold">{item.candidateName}</td>
                  <td className="px-3 py-2">{item.score}</td>
                  <td className="px-3 py-2">
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">{item.status}</span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{item.recommendations}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
