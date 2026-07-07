import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { apiJson, clearStoredAuth, getStoredAuth, setStoredAuth } from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    const syncAuth = () => {
      const saved = getStoredAuth()
      setUser(saved)
      setIsHydrated(true)
    }

    syncAuth()
    window.addEventListener('storage', syncAuth)
    window.addEventListener('auth:changed', syncAuth)

    return () => {
      window.removeEventListener('storage', syncAuth)
      window.removeEventListener('auth:changed', syncAuth)
    }
  }, [])

  const login = async (email, password) => {
    const auth = await apiJson('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    setStoredAuth(auth)
    setUser(auth)
  }

  const signup = async (name, email, password) => {
    const auth = await apiJson('/api/auth/signup', {
      method: 'POST',
      body: { name, email, password },
    })
    setStoredAuth(auth)
    setUser(auth)
  }

  const signupSchool = async ({
    accountName,
    email,
    password,
    schoolName,
    district,
    address,
    contact,
    capacity,
    accreditationScore,
    certifiedTeachers,
  }) => {
    const auth = await apiJson('/api/auth/signup-school', {
      method: 'POST',
      body: {
        accountName,
        email,
        password,
        schoolName,
        district,
        address,
        contact,
        capacity,
        accreditationScore,
        certifiedTeachers,
      },
    })

    // Untuk registrasi sekolah: jangan login otomatis.
    // Akun sekolah masih pending (active=0) sehingga tidak boleh memiliki auth session.
    // Requirement: jangan simpan auth/user/token ke localStorage.
    setUser(null)
    clearStoredAuth()
  }

  const logout = () => {
    clearStoredAuth()
    setUser(null)
  }

  const value = useMemo(() => ({ user, isHydrated, login, signup, signupSchool, logout }), [user, isHydrated])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
