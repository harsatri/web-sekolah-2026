import { useSchoolAdminData } from '../../hooks/useSchoolAdminData.js'
import { Link } from 'react-router-dom'

export default function SchoolAdminOverview() {
  const { schoolToManage, recommendationRecords } = useSchoolAdminData()

  if (!schoolToManage) {
    return <div className="rounded-xl bg-white p-4 text-sm text-slate-600">Loading school data...</div>
  }

  const allSimulations = recommendationRecords
  const now = new Date()
  const dayMs = 24 * 60 * 60 * 1000

  const normalizeScore = (value) => {
    const parsed = Number(value ?? 0)
    if (!Number.isFinite(parsed)) return 0
    return parsed > 1 ? parsed / 100 : parsed
  }

  const formatScore = (value) => normalizeScore(value).toFixed(2).replace('.', ',')

  const weekLabels = Array.from({ length: 8 }, (_, index) => `Mg ${index + 1}`)
  const weeklySeries = weekLabels.map((label, index) => {
    const weekStart = new Date(now.getTime() - (7 * (7 - index)) * dayMs)
    const weekEnd = new Date(weekStart.getTime() + (7 * dayMs))

    const simulationsCount = allSimulations.filter((item) => {
      if (!item?.submittedAt) return false
      const date = new Date(item.submittedAt)
      return date >= weekStart && date < weekEnd
    }).length

    const recommendedCount = allSimulations.filter((item) => {
      if (!item?.submittedAt) return false
      const date = new Date(item.submittedAt)
      return date >= weekStart && date < weekEnd
    }).length

    return { label, simulationsCount, recommendedCount }
  })

  const maxWeekly = Math.max(
    ...weeklySeries.map((item) => Math.max(item.simulationsCount, item.recommendedCount)),
    1,
  )

  const allScores = allSimulations
    .map((item) => normalizeScore(item?.scoreV ?? item?.result?.score ?? 0))
    .filter((score) => Number.isFinite(score))

  const avgScore = allScores.length > 0
    ? allScores.reduce((sum, item) => sum + item, 0) / allScores.length
    : 0
  const maxScore = allScores.length > 0 ? Math.max(...allScores) : 0

  const currentMonthScores = allSimulations
    .filter((item) => {
      if (!item?.submittedAt) return false
      const date = new Date(item.submittedAt)
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    })
    .map((item) => normalizeScore(item?.scoreV ?? item?.result?.score ?? 0))

  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthScores = allSimulations
    .filter((item) => {
      if (!item?.submittedAt) return false
      const date = new Date(item.submittedAt)
      return date.getMonth() === prevMonthDate.getMonth() && date.getFullYear() === prevMonthDate.getFullYear()
    })
    .map((item) => normalizeScore(item?.scoreV ?? item?.result?.score ?? 0))

  const currentAvgMonth = currentMonthScores.length > 0
    ? currentMonthScores.reduce((sum, item) => sum + item, 0) / currentMonthScores.length
    : 0
  const prevAvgMonth = prevMonthScores.length > 0
    ? prevMonthScores.reduce((sum, item) => sum + item, 0) / prevMonthScores.length
    : 0
  const avgDeltaPercent = prevAvgMonth > 0
    ? Math.round(((currentAvgMonth - prevAvgMonth) / prevAvgMonth) * 100)
    : 0

  const week7 = weeklySeries[6]?.recommendedCount ?? 0
  const week8 = weeklySeries[7]?.recommendedCount ?? 0
  const recommendedGrowth = week7 > 0 ? Math.round(((week8 - week7) / week7) * 100) : 0

  const highCount = allScores.filter((score) => score >= 0.8).length
  const midCount = allScores.filter((score) => score >= 0.55 && score < 0.8).length
  const lowCount = allScores.filter((score) => score < 0.55).length
  const totalDist = highCount + midCount + lowCount || 1
  const highPct = Math.round((highCount / totalDist) * 100)
  const midPct = Math.round((midCount / totalDist) * 100)

  const donutStyle = {
    background: `conic-gradient(#10b981 0 ${highPct}%, #f59e0b ${highPct}% ${highPct + midPct}%, #ef4444 ${highPct + midPct}% 100%)`,
  }

  const formatDate = (value) => {
    if (!value) return '-'
    return new Date(value).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const getStatusDisplay = (score) => {
    if (score >= 0.8) return { label: 'Skor Tinggi', className: 'bg-emerald-100 text-emerald-700' }
    if (score >= 0.55) return { label: 'Skor Sedang', className: 'bg-amber-100 text-amber-700' }
    return { label: 'Skor Rendah', className: 'bg-red-100 text-red-700' }
  }

  const latestRecommendationRecords = [...recommendationRecords]
    .sort((a, b) => new Date(b?.submittedAt || 0).getTime() - new Date(a?.submittedAt || 0).getTime())
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Dashboard Admin Sekolah</h1>
        <p className="mt-2 max-w-4xl text-sm text-slate-600">
          Pantau hasil simulasi kelayakan dari calon siswa yang tertarik mendaftar ke sekolah Anda. Data ini bersumber dari
          simulasi mandiri orang tua, bukan dari sistem pendaftaran resmi.
        </p>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        ℹ️ Data di dashboard ini berasal dari simulasi mandiri orang tua menggunakan platform DILAYAKIN. Data ini bukan data
        pendaftaran resmi dan tidak terhubung langsung ke sistem PPDB sekolah.
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-700">Simulasi Masuk ke Sekolah Ini</div>
            <div className="mt-2 text-3xl font-bold leading-none text-slate-900">{recommendationRecords.length}</div>
            <div className={`mt-2 text-sm font-semibold ${recommendedGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {recommendedGrowth >= 0 ? `+${recommendedGrowth}%` : `${recommendedGrowth}%`} vs minggu lalu
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-700">Skor Simulasi Tertinggi</div>
            <div className="mt-2 text-3xl font-bold leading-none text-slate-900">{formatScore(maxScore)}</div>
            <div className="mt-2 text-sm font-semibold text-emerald-600">Skor tertinggi dari seluruh simulasi</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-700">Rata-rata Skor Simulasi</div>
            <div className="mt-2 text-3xl font-bold leading-none text-slate-900">{formatScore(avgScore)}</div>
            <div className={`mt-2 text-sm font-semibold ${avgDeltaPercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {avgDeltaPercent >= 0 ? `+${avgDeltaPercent}%` : `${avgDeltaPercent}%`} vs bulan lalu
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_0.9fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xl font-bold text-slate-900">Simulasi per minggu</div>
            <div className="text-sm text-slate-600">Jumlah simulasi prescreening 8 minggu terakhir</div>
            <div className="mt-4 flex items-center gap-4 text-sm font-semibold text-slate-700">
              <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded bg-blue-500" />Simulasi</span>
              <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded bg-emerald-500" />Direkomendasikan</span>
            </div>
            <div className="mt-5 flex h-72 items-end justify-between gap-3">
              {weeklySeries.map((item) => (
                <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-60 w-full items-end justify-center gap-1 rounded-md border border-slate-200 bg-white p-1">
                    <div
                      className="w-1/2 rounded-t bg-blue-500"
                      style={{ height: `${Math.max((item.simulationsCount / maxWeekly) * 100, item.simulationsCount ? 8 : 0)}%` }}
                    />
                    <div
                      className="w-1/2 rounded-t bg-emerald-500"
                      style={{ height: `${Math.max((item.recommendedCount / maxWeekly) * 100, item.recommendedCount ? 8 : 0)}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-500">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xl font-bold text-slate-900">Distribusi kelayakan</div>
            <div className="text-sm text-slate-600">Segmentasi skor seluruh simulasi</div>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-emerald-500" />Tinggi (&gt;=0,80)</div>
              <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-amber-500" />Sedang (0,55-0,79)</div>
              <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-red-500" />Rendah (&lt;0,55)</div>
            </div>
            <div className="mt-6 flex items-center justify-center">
              <div className="relative h-56 w-56 rounded-full" style={donutStyle}>
                <div className="absolute inset-[22%] rounded-full bg-slate-50" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-xl font-bold text-slate-900">Hasil Simulasi - Calon Siswa ke Sekolah Ini</div>
        <div className="mt-1 text-sm text-slate-600">
          Daftar orang tua yang menjalankan simulasi kelayakan dan mendapatkan rekomendasi ke sekolah ini.
        </div>
        {latestRecommendationRecords.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
            Belum ada data rekomendasi pengguna untuk sekolah ini.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-700">
                  <th className="px-4 py-3 font-semibold">Nama</th>
                  <th className="px-4 py-3 font-semibold">Tanggal</th>
                  <th className="px-4 py-3 font-semibold">Skor</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {latestRecommendationRecords.map((record) => {
                  const score = normalizeScore(record?.scoreV ?? record?.result?.score ?? 0)
                  const status = getStatusDisplay(score)
                  return (
                    <tr key={record.id} className="border-t border-slate-200">
                      <td className="px-4 py-3 font-semibold text-slate-900">{record.input?.candidateName || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(record.submittedAt)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{formatScore(score)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/school-admin/pengguna-direkomendasikan/${record.id}`}
                          className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          Detail
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
