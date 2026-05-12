import { useEffect } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useSuperAdminData } from '../hooks/useSuperAdminData.js'

export default function SystemLayout() {
  const { user, logout } = useAuth()
  const { pendingRequests } = useSuperAdminData()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) navigate('/login', { replace: true })
  }, [user, navigate])

  const onLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  if (!user) return null

  const navClassName = ({ isActive }) =>
    `block rounded-lg px-3 py-2 transition-colors ${
      isActive ? 'bg-blue-600 font-semibold text-white' : 'text-slate-700 hover:bg-slate-100'
    }`

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 border-r border-slate-200 bg-white p-6 md:block">
          <Link to="/" className="text-lg font-bold hover:text-blue-700">DILAYAKIN</Link>
          <div className="mt-8 space-y-2 text-sm">
            <NavLink className={navClassName} to="/" end>Beranda Website</NavLink>
            {user.role === 'super_admin' && (
              <>
                <div className="px-3 pt-4 pb-1 text-xs font-bold uppercase tracking-wider text-slate-400">Ringkasan</div>
                <NavLink className={navClassName} to="/super-admin" end>Dashboard utama <span className="ml-1 rounded bg-emerald-100 px-1 text-[10px] text-emerald-700">live</span></NavLink>
                <NavLink className={navClassName} to="/super-admin/simulasi">Detail simulasi</NavLink>
                
                <div className="px-3 pt-4 pb-1 text-xs font-bold uppercase tracking-wider text-slate-400">Pengaturan inti</div>
                <NavLink className={navClassName} to="/super-admin/master-sekolah">Master sekolah</NavLink>
                <NavLink className={navClassName} to="/super-admin/pengajuan-kriteria">
                   Pengajuan kriteria 
                   {pendingRequests.length > 0 && (
                     <span className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                       {pendingRequests.length}
                     </span>
                   )}
                 </NavLink>

                <div className="px-3 pt-4 pb-1 text-xs font-bold uppercase tracking-wider text-slate-400">Akun & audit</div>
                <NavLink className={navClassName} to="/super-admin/admin-sekolah">Admin sekolah</NavLink>
                <NavLink className={navClassName} to="/super-admin/pengguna">Pengguna</NavLink>
                <NavLink className={navClassName} to="/super-admin/log-aktivitas">Log aktivitas baru</NavLink>
                <NavLink className={navClassName} to="/super-admin/database">Database</NavLink>
              </>
            )}
            {user.role === 'school_admin' && (
              <>
                <NavLink className={navClassName} to="/school-admin" end>Dashboard Admin Sekolah</NavLink>
                <NavLink className={navClassName} to="/school-admin/pengguna-direkomendasikan">Data Pengguna Direkomendasikan</NavLink>
                <NavLink className={navClassName} to="/school-admin/profil">Profil Sekolah</NavLink>
                <NavLink className={navClassName} to="/school-admin/pengajuan-kriteria">Pengajuan Kriteria</NavLink>
              </>
            )}
            {user.role === 'school' && (
              <NavLink className={navClassName} to="/school">Dashboard Sekolah</NavLink>
            )}
          </div>
        </aside>
        <div className="flex flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
            <div className="text-sm text-slate-600">System Layer</div>
            <div className="flex items-center gap-3 text-sm">
              <div className="hidden sm:block">{user.name} • {user.role}</div>
              <button className="btn-secondary rounded-full" onClick={onLogout}>
                Logout
              </button>
            </div>
          </header>
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
