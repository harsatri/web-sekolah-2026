import { createContext, useContext, useEffect, useState } from 'react'
import { schools as initialSchools } from './schools.js'
import { apiJson } from '../utils/api.js'

export const SchoolContext = createContext()

export function SchoolProvider({ children }) {
  const [schools, setSchools] = useState([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await apiJson('/api/schools')
        if (!cancelled) setSchools(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) setSchools(initialSchools)
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

  return (
    <SchoolContext.Provider value={{ schools, updateSchool, registerSchool, deleteSchool }}>
      {children}
    </SchoolContext.Provider>
  )
}

export const useSchools = () => useContext(SchoolContext)
