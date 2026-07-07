import { createContext, useContext, useEffect, useState } from 'react'
import { apiJson } from '../utils/api.js'


export const SchoolContext = createContext()

function getStoredAuth() {
  try {
    const raw = localStorage.getItem('auth')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function SchoolProvider({ children }) {
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)


useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await apiJson('/api/schools')
        if (!cancelled) {
          const approved = (Array.isArray(data) ? data : []).filter((school) => school?.status === 'approved')
          setSchools(approved)
          setError(null)
          setLoading(false)
        }
      } catch (e) {
        console.error('LOAD SCHOOLS ERROR', e)
        if (!cancelled) {
          setSchools([])
          setError('Data sekolah tidak dapat dimuat. Silakan coba kembali.')
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])


  const updateSchool = async (updatedSchool) => {
    const saved = await apiJson(`/api/schools/${updatedSchool.id}`, {
      method: 'PUT',
      body: updatedSchool,
    })
    setSchools((prevSchools) =>
      prevSchools.map((school) => (school.id === saved.id ? saved : school))
    )
  }

  const registerSchool = async (schoolData) => {
    const capacity = Number(schoolData.capacity) || 120
    const accreditationScore = Number(schoolData.accreditationScore) || 80
    const certifiedTeachers = Number(schoolData.certifiedTeachers) || 12
    const ratioValue = Math.max(10, Math.round(capacity / Math.max(1, certifiedTeachers)))
    const payload = {
      name: schoolData.name,
      district: schoolData.district,
      address: schoolData.address,
      contact: schoolData.contact,
      gps: schoolData.gps || '-',
      accreditation: schoolData.accreditation || 'B',
      accreditationScore,
      capacity,
      graduationRate: Number(schoolData.graduationRate) || 90,
      avgExam: Number(schoolData.avgExam) || 80,
      achievements: Number(schoolData.achievements) || 10,
      certifiedTeachers,
      rating: Number(schoolData.rating) || 4.5,
      review: schoolData.review || 'Sekolah baru terdaftar di sistem.',
      facilities: schoolData.facilities?.length ? schoolData.facilities : ['Ruang Kelas'],
      programs: schoolData.programs?.length ? schoolData.programs : ['Program Dasar'],
      extracurriculars: schoolData.extracurriculars?.length ? schoolData.extracurriculars : ['Pramuka'],
      ratio: `1:${ratioValue}`,
      gallery: ['Foto Sekolah'],
    }
    const created = await apiJson('/api/schools', { method: 'POST', body: payload })
    setSchools((prevSchools) => [...prevSchools, created])
  }

  const deleteSchool = async (schoolId) => {
    await apiJson(`/api/schools/${schoolId}`, { method: 'DELETE' })
    setSchools((prevSchools) => prevSchools.filter((school) => Number(school.id) !== Number(schoolId)))
  }

  const refreshSchools = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiJson('/api/schools')
      const approved = (Array.isArray(data) ? data : []).filter((school) => school?.status === 'approved')
      setSchools(approved)
      setLoading(false)
    } catch (e) {
      console.error('REFRESH SCHOOLS ERROR', e)
      setSchools([])
      setError('Data sekolah tidak dapat dimuat. Silakan coba kembali.')
      setLoading(false)
    }
  }

  return (
    <SchoolContext.Provider value={{ schools, loading, error, updateSchool, registerSchool, deleteSchool, refreshSchools }}>

      {children}
    </SchoolContext.Provider>
  )
}

export const useSchools = () => useContext(SchoolContext)
