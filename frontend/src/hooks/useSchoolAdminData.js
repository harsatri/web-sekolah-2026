import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useSchools } from '../contexts/SchoolContext.jsx'
import { apiJson } from '../utils/api.js'

function normalizeArray(value) {
  return Array.isArray(value) ? value : []
}

function normalizeGallery(value) {
  return normalizeArray(value).map((item) => {
    if (item && typeof item === 'object') {
      return {
        url: String(item.url || ''),
        name: String(item.name || ''),
        size: item.size || 0,
        uploadedAt: item.uploadedAt || new Date().toISOString()
      }
    }
    return {
      url: String(item || ''),
      name: '',
      size: 0,
      uploadedAt: new Date().toISOString()
    }
  }).filter((item) => {
    const url = String(item.url || '').trim()
    if (!url) return false

    // Buang placeholder lama agar admin tidak melihat foto default kosong.
    const placeholderValues = ['foto sekolah', 'placeholder', 'blank', 'default']
    if (placeholderValues.includes(url.toLowerCase())) return false

    const isValidUrl =
      url.startsWith('/uploads/') ||
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('data:image/')

    // Simpan kompatibilitas untuk nama file lama seperti "abc.jpg".
    const looksLikeFileName = /.+\.(jpg|jpeg|png|webp|gif)$/i.test(url)
    return isValidUrl || looksLikeFileName
  })
}

function extractSchoolLabel(user) {
  const explicit = String(user?.schoolName || '').trim()
  if (explicit) return explicit

  const rawName = String(user?.name || '').trim()
  if (!rawName) return ''

  return rawName
    .replace(/^admin\s+/i, '')
    .replace(/^akun\s+/i, '')
    .trim()
}

function createEmptySchoolFromUser(user) {
  const schoolLabel = extractSchoolLabel(user) || 'Sekolah Baru'
  return {
    id: user?.schoolId != null ? Number(user.schoolId) : null,
    name: schoolLabel,
    principalName: '',
    review: '',
    monthlyTarget: '',
    facilities: [],
    programs: [],
    gallery: [],
    achievements: '',
    address: '',
    district: 'Purwokerto Timur',
    contact: '',
    gps: '',
    accreditation: '',
    accreditationScore: '',
    capacity: '',
    ratio: '',
    graduationStats: '',
    extracurriculars: [],
    galleryLink: '',
    graduationRate: '',
    avgExam: '',
    certifiedTeachers: '',
    rating: '',
    achievementDesc: '',
    programDetail: '',
  }
}

function createInitialFormData(school) {
  if (!school) return null
  return {
    id: school.id,
    name: school.name || '',
    principalName: school.principalName || '',
    review: school.review || '',
    monthlyTarget: school.monthlyTarget ?? '',
    facilities: normalizeArray(school.facilities),
    programs: normalizeArray(school.programs),
    gallery: normalizeGallery(school.gallery),
    achievements: school.achievements ?? '',
    address: school.address || '',
    district: school.district || 'Purwokerto Timur',
    contact: school.contact || '',
    gps: school.gps || '',
    accreditation: school.accreditation || '',
    accreditationScore: school.accreditationScore ?? '',
    capacity: school.capacity ?? '',
    ratio: school.ratio || '',
    graduationStats: school.graduationStats || '',
    extracurriculars: normalizeArray(school.extracurriculars),
    galleryLink: school.galleryLink || '',
    graduationRate: school.graduationRate ?? '',
    avgExam: school.avgExam ?? '',
    certifiedTeachers: school.certifiedTeachers ?? '',
    rating: school.rating ?? '',
    achievementDesc: school.achievementDesc || '',
    programDetail: school.programDetail || '',
  }
}

function serializeComparableFormData(value) {
  if (!value) return ''
  const normalized = {
    ...value,
    facilities: normalizeArray(value.facilities),
    programs: normalizeArray(value.programs),
    extracurriculars: normalizeArray(value.extracurriculars),
    gallery: normalizeArray(value.gallery).map((item) => ({
      url: String(item?.url || ''),
      name: String(item?.name || ''),
      dataUrl: String(item?.dataUrl || ''),
    })),
  }
  return JSON.stringify(normalized)
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error(`Gagal membaca file ${file.name}`))
    reader.readAsDataURL(file)
  })
}

export function useSchoolAdminData() {
  const { user } = useAuth()
  const { schools, updateSchool } = useSchools()
  const schoolToManage = useMemo(() => {
    if (user?.role !== 'school_admin') return schools[0] || null

    if (user?.schoolId == null) {
      return createEmptySchoolFromUser(user)
    }

    if (!schools.length) {
      return createEmptySchoolFromUser(user)
    }

    const byId = schools.find((school) => Number(school.id) === Number(user.schoolId))
    return byId || createEmptySchoolFromUser(user)
  }, [schools, user])
  const [formData, setFormData] = useState(createInitialFormData(schoolToManage))
  const [initialFormData, setInitialFormData] = useState(createInitialFormData(schoolToManage))
  const [showPreview, setShowPreview] = useState(false)
  const [recommendationRecords, setRecommendationRecords] = useState([])
  const [criteriaRequests, setCriteriaRequests] = useState([])

  useEffect(() => {
    const initial = createInitialFormData(schoolToManage)
    setFormData(initial)
    setInitialFormData(initial)
    setShowPreview(false)
  }, [schoolToManage])

  const isDirty = useMemo(() => (
    serializeComparableFormData(formData) !== serializeComparableFormData(initialFormData)
  ), [formData, initialFormData])

  useEffect(() => {
    let cancelled = false
    const loadData = async () => {
      if (!schoolToManage?.id) {
        setRecommendationRecords([])
        setCriteriaRequests([])
        return
      }
      try {
        const [recs, requests] = await Promise.all([
          apiJson('/api/recommendations'),
          apiJson('/api/criteria-requests'),
        ])
        if (cancelled) return
        setRecommendationRecords(Array.isArray(recs) ? recs : [])
        setCriteriaRequests(Array.isArray(requests) ? requests : [])
      } catch (err) {
        console.error('Gagal memuat data sekolah:', err)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [schoolToManage])

  const submitCriteriaRequest = async (newCriteria, reason) => {
    if (!schoolToManage) return
    const payload = {
      schoolId: schoolToManage.id,
      schoolName: schoolToManage.name,
      oldCriteria: schoolToManage.criteria || {}, // Assuming criteria is part of school object
      newCriteria,
      reason,
    }
    await apiJson('/api/criteria-requests', {
      method: 'POST',
      body: payload
    })
    // Refresh requests
    const requests = await apiJson('/api/criteria-requests')
    setCriteriaRequests(requests)
  }

  const recommendationSummary = useMemo(() => {
    const total = recommendationRecords.length
    const todayKey = new Date().toISOString().slice(0, 10)
    const today = recommendationRecords.filter((item) => String(item.submittedAt || '').slice(0, 10) === todayKey).length
    return { total, today }
  }, [recommendationRecords])

  const handleChange = (e) => {
    const { name, value, type } = e.target
    if (name.includes(',')) {
      const keys = name.split(',')
      setFormData((prev) => ({
        ...prev,
        [keys[0]]: {
          ...(prev?.[keys[0]] || {}),
          [keys[1]]: value,
        },
      }))
      return
    }
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }))
  }

  const handleArrayChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value.split(',').map((item) => item.trim()).filter(Boolean),
    }))
  }

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const maxFiles = 10
    const maxSize = 5 * 1024 * 1024 // 5MB
    const current = Array.isArray(formData?.gallery) ? formData.gallery : []
    const remaining = maxFiles - current.length
    
    if (remaining <= 0) {
      alert('Maksimal 10 foto per sekolah.')
      e.target.value = ''
      return
    }

    const accepted = files
      .filter((file) => {
        if (file.size > maxSize) {
          alert(`File ${file.name} terlalu besar. Maksimal 5MB.`)
          return false
        }
        const ext = file.name.split('.').pop().toLowerCase()
        if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
          alert(`Format file ${file.name} tidak didukung. Gunakan JPG, PNG, atau WEBP.`)
          return false
        }
        return true
      })
      .slice(0, remaining)

    const prepared = await Promise.all(accepted.map(async (file) => {
      const dataUrl = await fileToDataUrl(file)
      return {
        url: dataUrl,
        name: file.name,
        size: file.size,
        dataUrl,
        uploadedAt: new Date().toISOString()
      }
    }))

    setFormData((prev) => ({
      ...prev,
      gallery: [...(Array.isArray(prev?.gallery) ? prev.gallery : []), ...prepared],
    }))
    e.target.value = ''
  }

  const handleReorderPhoto = (fromIdx, toIdx) => {
    setFormData((prev) => {
      const gallery = [...(prev?.gallery || [])]
      const [moved] = gallery.splice(fromIdx, 1)
      gallery.splice(toIdx, 0, moved)
      return { ...prev, gallery }
    })
  }

  const handleRemovePhoto = (idx) => {
    if (!confirm('Hapus foto ini dari gallery?')) return
    setFormData((prev) => ({
      ...prev,
      gallery: (prev?.gallery || []).filter((_, i) => i !== idx),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData) return
    if (!formData.id) {
      throw new Error('Akun admin sekolah belum terhubung ke data sekolah yang valid.')
    }
    try {
      const uploadedPhotos = await Promise.all(
        (formData.gallery || []).map(async (photo) => {
          if (photo?.dataUrl) {
            const uploaded = await apiJson('/api/upload', {
              method: 'POST',
              body: {
                name: photo.name || 'gallery.jpg',
                dataUrl: photo.dataUrl,
              },
            })
            return {
              url: uploaded.url,
              name: photo.name || '',
            }
          }
          return {
            url: String(photo?.url || ''),
            name: String(photo?.name || ''),
          }
        }),
      )

      const payload = {
        ...formData,
        gallery: uploadedPhotos,
        graduationRate: Number(String(formData.graduationRate || '').replace('%', '').trim() || 0),
      }
      await updateSchool(payload)
      const nextInitial = createInitialFormData({ ...schoolToManage, ...payload })
      setFormData(nextInitial)
      setInitialFormData(nextInitial)
      setShowPreview(false)
    } catch (err) {
      alert(err?.message || 'Gagal menyimpan profil sekolah.')
      return
    }

    try {
      await apiJson('/api/activity-logs', {
        method: 'POST',
        body: {
          type: 'account_updated',
          description: `Memperbarui profil sekolah ${formData?.name || schoolToManage?.name || ''}`,
        },
      })
    } catch (err) {
      console.error('Gagal mencatat log aktivitas:', err)
    }

    alert('Data sekolah berhasil diperbarui!')
  }

  const handleCancel = () => {
    const initial = createInitialFormData(schoolToManage)
    setFormData(initial)
    setInitialFormData(initial)
    setShowPreview(false)
    alert('Perubahan dibatalkan.')
  }

  return {
    schoolToManage,
    formData,
    showPreview,
    recommendationRecords,
    recommendationSummary,
    isDirty,
    setShowPreview,
    handleChange,
    handleArrayChange,
    handlePhotoUpload,
    handleRemovePhoto,
    handleReorderPhoto,
    handleSubmit,
    handleCancel,
    criteriaRequests,
    submitCriteriaRequest,
  }
}
