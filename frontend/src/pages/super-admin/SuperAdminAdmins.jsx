import { useMemo, useState } from 'react'
import { useSuperAdminData } from '../../hooks/useSuperAdminData.js'
import { useSchools } from '../../contexts/SchoolContext.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'

export default function SuperAdminAdmins() {
  const { schools } = useSchools()
  const { user, isHydrated } = useAuth()

  const {
    allUsers,
    adminUsers,
    createSchoolAdmin,
    updateSchoolAdmin,
    toggleSchoolAdminActive,
    deleteUser,
    getStatusLabel,
    formatDateTime,
  } = useSuperAdminData({
    enabled: isHydrated && user?.role === 'super_admin',
  })

  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', email: '', password: '', schoolId: '' })
  const [editEmail, setEditEmail] = useState('')
  const [editForm, setEditForm] = useState({ id: '', name: '', email: '', schoolId: '' })
  const [errorMessage, setErrorMessage] = useState('')


  const adminSchoolIds = useMemo(() => {
    return new Set(
      (adminUsers || [])
        .map((u) => u?.schoolId)
        .filter((id) => id != null)
        .map((id) => Number(id)),
    )
  }, [adminUsers])

  const schoolOptionsForAdd = useMemo(() => {
    return (schools || [])
      .filter((s) => s?.status === 'approved')
      .filter((s) => !adminSchoolIds.has(Number(s?.id)))
  }, [schools, adminSchoolIds])

  const filteredAdmins = useMemo(() => {
    const keyword = search.toLowerCase()
    return adminUsers.filter((item) =>
      (item.schoolName || '').toLowerCase().includes(keyword) ||
      (item.name || '').toLowerCase().includes(keyword) ||
      item.email.toLowerCase().includes(keyword),
    )
  }, [adminUsers, search])

const onToggle = async (userId) => {
  await toggleSchoolAdminActive(userId)
}

const onDelete = async (userId) => {
  const ok = confirm('Hapus akun admin sekolah ini?')
  if (!ok) return
  await deleteUser(userId)
  setErrorMessage('')
  setEditEmail('')
  setEditForm({ id: '', name: '', email: '', schoolId: '' })
}



const onShowEdit = (item) => {
    setEditEmail(item.email)
    setEditForm({
      id: item.id != null ? String(item.id) : '',
      name: item.name || '',
      email: item.email,
      schoolId: item.schoolId != null ? String(item.schoolId) : '',
    })
  }

  const onSaveEdit = async () => {
    setErrorMessage('')

    if (!editForm.id) {
      setErrorMessage('Data admin tidak valid.')
      return
    }

    if (!editForm.name) {
      setErrorMessage('Nama admin wajib diisi.')
      return
    }

    if (!editForm.email) {
      setErrorMessage('Email wajib diisi.')
      return
    }

    if (!Number.isFinite(Number(editForm.schoolId))) {
      setErrorMessage('Sekolah wajib dipilih.')
      return
    }

    const nextSchoolId = Number(editForm.schoolId)
    const nextSchool = schools.find((s) => Number(s.id) === nextSchoolId)
    const nextSchoolName = nextSchool?.name

    if (!nextSchoolName) {
      setErrorMessage('Sekolah wajib dipilih.')
      return
    }

    const payload = {
      name: editForm.name,
      email: editForm.email,
      schoolId: nextSchoolId,
      schoolName: nextSchoolName,
    }

    try {
      await updateSchoolAdmin(Number(editForm.id), payload)
      setEditEmail('')
      setEditForm({ id: '', name: '', email: '', schoolId: '' })
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message ||
        error?.message ||
        'Terjadi kesalahan.',
      )
    }
  }



const onCreate = async (e) => {
    console.log('CREATE CLICKED')
    console.log('addForm=', addForm)

    e.preventDefault()
    setErrorMessage('')

    try {
      if (!addForm.name) {
        setErrorMessage('Nama admin wajib diisi.')
        return
      }

      if (!addForm.email) {
        setErrorMessage('Email wajib diisi.')
        return
      }

      if (!addForm.password) {
        setErrorMessage('Password wajib diisi.')
        return
      }

      if (!Number.isFinite(Number(addForm.schoolId))) {
        setErrorMessage('Sekolah wajib dipilih.')
        return
      }

      if (allUsers.some((item) => item.email === addForm.email)) {
        setErrorMessage('Email sudah terdaftar.')
        return
      }


      const schoolIdNum = Number(addForm.schoolId)
      const schoolName = schools.find((s) => Number(s.id) === schoolIdNum)?.name || ''

      const payload = {
        name: addForm.name,
        email: addForm.email,
        password: addForm.password,
        schoolId: schoolIdNum,
        schoolName,
      }

      console.log('CALL createSchoolAdmin', payload)

      await createSchoolAdmin(payload)

      setErrorMessage('')
      setAddForm({ name: '', email: '', password: '', schoolId: '' })
      setShowAddForm(false)
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message ||
        error?.message ||
        'Terjadi kesalahan.',
      )
    }
  }



  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Manajemen Admin Sekolah</h1>
        <p className="mt-2 text-sm text-slate-600">Kelola akun admin sekolah, status aktif, dan data login.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari admin..."
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              setErrorMessage('')
              setShowAddForm((prev) => !prev)
            }}
            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Tambah Admin
          </button>

        </div>

        {showAddForm && (
          <div className="mt-4">
            {errorMessage && (
              <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-700">
                {errorMessage}
              </div>
            )}

            <form onSubmit={onCreate} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-4">
              <input
                value={addForm.name}
                onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Nama admin"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />

              <input
                value={addForm.email}
                onChange={(e) => setAddForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="Email admin"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />

              <input
                type="password"
                value={addForm.password}
                onChange={(e) => setAddForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Password"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />

              <select
                value={addForm.schoolId}
                onChange={(e) => setAddForm((prev) => ({ ...prev, schoolId: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              >
                <option value="">Pilih sekolah...</option>
                {schoolOptionsForAdd.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-lg bg-slate-300 px-3 py-2 text-xs font-semibold text-slate-800"
                >
                  Batal
                </button>
                <button className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700" type="submit">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        )}



        {editEmail && (
          <div className="mt-4 grid gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 md:grid-cols-4">
            <input value={editForm.name} onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Nama admin" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input value={editForm.email} onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="Email admin" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <select value={editForm.schoolId} onChange={(e) => setEditForm((prev) => ({ ...prev, schoolId: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required>
              <option value="">Pilih sekolah...</option>
              {schoolOptionsForAdd.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => { setEditEmail(''); setEditForm({ name: '', email: '', schoolId: '' }) }} className="rounded-lg bg-slate-300 px-3 py-2 text-xs font-semibold text-slate-800">Batal</button>
              <button type="button" onClick={onSaveEdit} className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700">Update</button>
            </div>
          </div>
        )}


        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-left text-slate-700">
                <th className="px-3 py-2">Nama Sekolah</th>
                <th className="px-3 py-2">Nama Admin</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Status Admin</th>
                <th className="px-3 py-2">Status Sekolah</th>
                <th className="px-3 py-2">Last Login</th>
                <th className="px-3 py-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdmins.map((item) => (
                <tr key={item.email} className="border-b border-slate-200">
                  <td className="px-3 py-2 font-semibold">{item.schoolName || '-'}</td>
                  <td className="px-3 py-2 font-semibold">{item.name || 'Admin Sekolah'}</td>
                  <td className="px-3 py-2 text-slate-600">{item.email}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusLabel(item) === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}
                    >
                      {getStatusLabel(item)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{item.schoolStatus || '-'}</td>
                  <td className="px-3 py-2 text-slate-600">{formatDateTime(item.lastLogin)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => onShowEdit(item)} className="rounded-md bg-amber-500 px-2 py-1 text-xs font-semibold text-white">Edit</button>
                      <button type="button" onClick={() => onDelete(item.id)} className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white">Hapus</button>
                      <button type="button" onClick={() => onToggle(item.id)} className={`rounded-md px-2 py-1 text-xs font-semibold text-white ${getStatusLabel(item) === 'Aktif' ? 'bg-slate-600' : 'bg-emerald-600'}`}>
                        {getStatusLabel(item) === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
