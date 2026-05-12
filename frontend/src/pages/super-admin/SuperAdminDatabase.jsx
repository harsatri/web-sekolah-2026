import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { resetDatabase } from '../../utils/resetDatabase'

export default function SuperAdminDatabase() {
  const [isBusy, setIsBusy] = useState(false)
  const navigate = useNavigate()

  const summaryItems = useMemo(() => ([
    { key: 'users', label: 'Users', desc: 'Akun super admin, admin sekolah, dan user' },
    { key: 'schools', label: 'Schools', desc: 'Data sekolah + kriteria yang sudah disesuaikan' },
    { key: 'eligibilitySubmissions', label: 'Simulasi', desc: 'Riwayat hitung kelayakan dari pengguna' },
    { key: 'adminActivityLogs', label: 'Monitoring', desc: 'Log aktivitas perubahan kriteria' },
    { key: 'auth', label: 'Session', desc: 'Status login saat ini' },
  ]), [])

  const onReset = async () => {
    const ok = window.confirm('Reset database lokal? Semua data di browser (users, schools, simulasi, log) akan dihapus dan login akan keluar.')
    if (!ok) return
    try {
      setIsBusy(true)
      resetDatabase({ mode: 'reset' })
      navigate('/login?role=admin', { replace: true })
    } finally {
      setIsBusy(false)
    }
  }

  const onClearAll = async () => {
    const ok = window.confirm('Hapus seluruh localStorage? Ini akan menghapus semua data di browser untuk aplikasi ini.')
    if (!ok) return
    try {
      setIsBusy(true)
      resetDatabase({ mode: 'clearAll' })
      navigate('/login?role=admin', { replace: true })
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Database</h1>
        <p className="mt-2 text-sm text-slate-600">Reset data penyimpanan lokal (localStorage) untuk kebutuhan testing/dev.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          {summaryItems.map((item) => (
            <div key={item.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">{item.label}</div>
              <div className="mt-1 text-sm text-slate-600">{item.desc}</div>
              <div className="mt-2 text-xs text-slate-500">Key: {item.key}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isBusy}
            onClick={onReset}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reset Database Lokal
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={onClearAll}
            className="rounded-lg border border-red-600 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Clear Semua Storage
          </button>
        </div>
      </div>
    </div>
  )
}

