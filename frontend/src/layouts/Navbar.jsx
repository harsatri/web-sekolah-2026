import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuth()
  const loginOptions = [
    { role: 'admin', label: 'Admin' },
    { role: 'user', label: 'Orang Tua Siswa' },
  ]

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur">
      <div className="flex w-screen items-center justify-between gap-4 px-8 py-4">
        <div className="flex items-center gap-4">
          <button className="md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">☰</button>
          <Link to="/" className="text-xl font-bold">DILAYAKIN</Link>
        </div>
        <nav className="hidden gap-6 md:flex">
          <a className="text-slate-700 hover:text-blue-700" href="/#beranda">Beranda</a>
          <a className="text-slate-700 hover:text-blue-700" href="/#fitur">Fitur</a>
          <a className="text-slate-700 hover:text-blue-700" href="/#sekolah">Sekolah</a>
          <a className="text-slate-700 hover:text-blue-700" href="/#panduan">Panduan</a>
          <a className="text-slate-700 hover:text-blue-700" href="/#faq">FAQ</a>
          {user?.role === 'super_admin' && (
            <Link className="text-slate-700 hover:text-blue-700" to="/super-admin">Super Admin</Link>
          )}
          {user?.role === 'school_admin' && (
            <Link className="text-slate-700 hover:text-blue-700" to="/school-admin">Admin Sekolah</Link>
          )}
          {user?.role === 'school' && (
            <Link className="text-slate-700 hover:text-blue-700" to="/school">Dashboard Sekolah</Link>
          )}
        </nav>
        <div className="flex items-center gap-3">
          {!user ? (
            <>
              <div className="group relative">
                <button type="button" className="rounded-full border border-slate-300 px-4 py-2 text-sm">
                  Login
                </button>
                <div className="invisible absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  {loginOptions.map((option) => (
                    <Link
                      key={option.role}
                      className="block border-b border-slate-100 px-4 py-3 text-sm text-slate-700 last:border-b-0 hover:bg-slate-50 hover:text-blue-700"
                      to={`/login?role=${option.role}`}
                    >
                      {option.label}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="group relative">
                <button type="button" className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                  Sign up
                </button>
                <div className="invisible absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <Link
                    className="block border-b border-slate-100 px-4 py-3 text-sm text-slate-700 last:border-b-0 hover:bg-slate-50 hover:text-blue-700"
                    to="/signup"
                  >
                    User
                  </Link>
                  <Link
                    className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-700"
                    to="/signup?type=school"
                  >
                    Sekolah
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="hidden text-sm md:block">
                {user.name} • {user.role}
              </div>
              <button className="rounded-full border border-slate-300 px-4 py-2 text-sm" onClick={logout}>
                Logout
              </button>
            </>
          )}
        </div>
      </div>
      {open && (
        <div className="border-t border-slate-200 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-2">
            <a className="text-slate-700" href="/#beranda" onClick={() => setOpen(false)}>Beranda</a>
            <a className="text-slate-700" href="/#fitur" onClick={() => setOpen(false)}>Fitur</a>
            <a className="text-slate-700" href="/#sekolah" onClick={() => setOpen(false)}>Sekolah</a>
            <a className="text-slate-700" href="/#panduan" onClick={() => setOpen(false)}>Panduan</a>
            <a className="text-slate-700" href="/#faq" onClick={() => setOpen(false)}>FAQ</a>
            {user?.role === 'super_admin' && (
              <Link className="text-slate-700" to="/super-admin" onClick={() => setOpen(false)}>Super Admin</Link>
            )}
            {user?.role === 'school_admin' && (
              <Link className="text-slate-700" to="/school-admin" onClick={() => setOpen(false)}>Admin Sekolah</Link>
            )}
            {user?.role === 'school' && (
              <Link className="text-slate-700" to="/school" onClick={() => setOpen(false)}>Dashboard Sekolah</Link>
            )}
            {!user ? (
              <>
                <div className="text-sm font-semibold text-slate-500">Login sebagai</div>
                {loginOptions.map((option) => (
                  <Link
                    key={option.role}
                    className="text-slate-700"
                    to={`/login?role=${option.role}`}
                    onClick={() => setOpen(false)}
                  >
                    {option.label}
                  </Link>
                ))}
                <div className="text-sm font-semibold text-slate-500">Sign up sebagai</div>
                <Link className="text-slate-700" to="/signup" onClick={() => setOpen(false)}>User</Link>
                <Link className="text-slate-700" to="/signup?type=school" onClick={() => setOpen(false)}>Sekolah</Link>
              </>
            ) : (
              <button className="text-left text-slate-700" onClick={() => { logout(); setOpen(false) }}>Logout</button>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
