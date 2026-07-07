import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'

export default function SchoolAdminLayout() {
  const { user, isHydrated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isHydrated) return
    if (!user) {
      navigate('/login', { replace: true })
      return
    }
    if (user.role !== 'school_admin') navigate('/', { replace: true })
    if (user.schoolId == null) navigate('/', { replace: true })

    // Guard: akun sekolah yang belum active (pending) tidak boleh mengakses admin dashboard.
    // Karena backend membatasi endpoint berdasarkan active/token.
    if (Number(user.active) === 0 || user.active === false) {
      navigate('/login', { replace: true, state: { pendingSchool: true } })
    }

  }, [isHydrated, user, navigate])

  if (!isHydrated) return null
  if (!user || user.role !== 'school_admin') return null
  if (Number(user.active) === 0 || user.active === false) return null

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <Outlet />
      </div>
    </main>
  )
}
