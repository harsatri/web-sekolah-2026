import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'

export default function SchoolAdminLayout() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true })
      return
    }
    if (user.role !== 'school_admin') navigate('/', { replace: true })
  }, [user, navigate])

  if (!user || user.role !== 'school_admin') return null

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <Outlet />
      </div>
    </main>
  )
}
