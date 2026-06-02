import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { apiJson } from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem('auth')
    if (saved) setUser(JSON.parse(saved))
  }, [])

  const login = async (email, password) => {
    const auth = await apiJson('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    localStorage.setItem('auth', JSON.stringify(auth))
    setUser(auth)
  }

  const signup = async (name, email, password) => {
    const auth = await apiJson('/api/auth/signup', {
      method: 'POST',
      body: { name, email, password },
    })
    localStorage.setItem('auth', JSON.stringify(auth))
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
    localStorage.setItem('auth', JSON.stringify(auth))
    setUser(auth)
  }

  const logout = () => {
    localStorage.removeItem('auth')
    setUser(null)
  }

  const value = useMemo(() => ({ user, login, signup, signupSchool, logout }), [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
