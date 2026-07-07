import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'

export default function SuperAdminLayout() {
  const { user, isHydrated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isHydrated) return
    if (!user) {
      navigate('/login', { replace: true })
      return
    }
    if (user.role !== 'super_admin') navigate('/', { replace: true })
  }, [isHydrated, user, navigate])

  if (!isHydrated) return null
  if (!user || user.role !== 'super_admin') return null

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <Outlet />
      </div>
    </main>
  )
}
