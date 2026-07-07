import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'

export default function Login() {
  const { login, logout } = useAuth()
  const nav = useNavigate()
  const location = useLocation()
  const { search } = location
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [remember, setRemember] = useState(false)
  const [hasRemembered, setHasRemembered] = useState(false)
  const passwordRef = useRef(null)
  const params = new URLSearchParams(search)
  const selectedRole = params.get('role')

  useEffect(() => {
    localStorage.removeItem('loginEmailHistory')
    const saved = localStorage.getItem('rememberEmail')
    if (saved) {
      setEmail(saved)
      setRemember(true)
      setHasRemembered(true)
    }
  }, [])
  useEffect(() => {
    if (hasRemembered) {
      setTimeout(() => passwordRef.current?.focus(), 0)
    }
  }, [hasRemembered])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      if (remember) {
        localStorage.setItem('rememberEmail', email)
      } else {
        localStorage.removeItem('rememberEmail')
      }
      const saved = JSON.parse(localStorage.getItem('auth') || '{}')
      const role = saved?.role
      const allowedRolesBySelected = {
        admin: ['super_admin', 'school_admin'],
        user: ['user'],
      }
      const allowedRoles = selectedRole ? allowedRolesBySelected[selectedRole] || [] : []
      if (selectedRole && !allowedRoles.includes(role)) {
        logout()
        setError('Akun ini tidak sesuai dengan role login yang dipilih')
        return
      }
      const redirectPath =
        role === 'super_admin'
          ? '/super-admin'
          : role === 'school_admin'
            ? '/school-admin'
            : role === 'school'
              ? '/school'
              : '/'
      nav(redirectPath)
    } catch (err) {
      setError(err.message || 'Gagal login')
    }
  }

  const onRememberChange = (checked) => {
    setRemember(checked)
    if (!checked) {
      localStorage.removeItem('rememberEmail')
      setHasRemembered(false)
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="mb-6">
        <Link className="btn-nav-icon shadow-sm" to="/" aria-label="Kembali">
          &lt;
        </Link>
      </div>
      <h1 className="text-3xl font-bold">Login</h1>
      {(() => {
        const pendingMsg = location?.state?.pendingSchoolMessage
        const pendingFlag = location?.state?.pendingSchool
        const message =
          pendingMsg ||
          (pendingFlag
            ? 'Akun sekolah Anda masih menunggu verifikasi Super Admin. Silakan menunggu proses persetujuan sebelum mengakses dashboard.'
            : null)

        return message ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 whitespace-pre-line">
            {message}
          </div>
        ) : null
      })()}
      {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <form onSubmit={onSubmit} autoComplete="off" className="mt-6 space-y-4">
        <div>
          <label className="block text-sm">Email</label>
          <input
            type="email"
            name="username"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 p-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm">Password</label>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            ref={passwordRef}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 p-2"
            required
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => onRememberChange(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Remember me
        </label>
        <button className="btn-primary w-full">
          Login
        </button>
        <div className="text-center text-sm text-slate-600">
          Belum punya akun?
          <Link className="ml-2 font-semibold text-blue-600 hover:text-blue-700" to="/signup">
            Sign up
          </Link>
        </div>
      </form>
    </main>
  )
}
