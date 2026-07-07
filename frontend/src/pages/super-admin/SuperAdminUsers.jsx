import { useMemo, useState } from 'react'
import { useSuperAdminData } from '../../hooks/useSuperAdminData.js'
import { useAuth } from '../../contexts/AuthContext.jsx'

export default function SuperAdminUsers() {
  const { user, isHydrated } = useAuth()
  const {

    allUsers = [],
    regularUsers = [],
    createUser,
    updateUser,
    toggleUserActive,
    deleteUser,
    getStatusLabel,
    formatDateTime,
  } = useSuperAdminData({
    enabled: isHydrated && user?.role === 'super_admin',
  })

  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', email: '', password: '' })
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', email: '' })

  const filteredUsers = useMemo(() => {
    const keyword = search.toLowerCase()
    return regularUsers.filter((item) =>
      (item.name || '').toLowerCase().includes(keyword) || item.email.toLowerCase().includes(keyword),
    )
  }, [regularUsers, search])

  const onToggle = async (id) => {
    if (id == null) return
    await toggleUserActive(id)
  }

  const onDelete = async (id) => {
    if (id == null) return

    if (!window.confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) {
      return
    }

    await deleteUser(id)
    if (editId === id) {
      setEditId(null)
      setEditForm({ name: '', email: '' })
    }
  }

  const onShowEdit = (item) => {
    setEditId(item.id)
    setEditForm({ name: item.name || '', email: item.email })
  }

  const onSaveEdit = async () => {
    if (editId == null) return
    if (!editForm.name || !editForm.email) return
    await updateUser(editId, { name: editForm.name, email: editForm.email })
    setEditId(null)
    setEditForm({ name: '', email: '' })
  }

  const onCreate = async (e) => {
    e.preventDefault()
    if (!addForm.name || !addForm.email || !addForm.password) return
    const exists = allUsers.some((item) => item.email === addForm.email)
    if (exists) return
    await createUser({ name: addForm.name, email: addForm.email, password: addForm.password })
    setAddForm({ name: '', email: '', password: '' })
    setShowAddForm(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Manajemen Pengguna</h1>
        <p className="mt-2 text-sm text-slate-600">Kelola akun user, status aktif, dan histori login terakhir.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pengguna..."
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Tambah Pengguna
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={onCreate} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-4">
            <input value={addForm.name} onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Nama pengguna" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
            <input value={addForm.email} onChange={(e) => setAddForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="Email pengguna" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
            <input type="password" value={addForm.password} onChange={(e) => setAddForm((prev) => ({ ...prev, password: e.target.value }))} placeholder="Password" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setShowAddForm(false)} className="rounded-lg bg-slate-300 px-3 py-2 text-xs font-semibold text-slate-800">Batal</button>
              <button className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700">Simpan</button>
            </div>
          </form>
        )}

        {editId != null && (
          <div className="mt-4 grid gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 md:grid-cols-3">
            <input value={editForm.name} onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Nama pengguna" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input value={editForm.email} onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="Email pengguna" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditId(null)
                  setEditForm({ name: '', email: '' })
                }}
                className="rounded-lg bg-slate-300 px-3 py-2 text-xs font-semibold text-slate-800"
              >
                Batal
              </button>
              <button type="button" onClick={onSaveEdit} className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700">Update</button>
            </div>
          </div>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-left text-slate-700">
                <th className="px-3 py-2">Nama</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Last Login</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((item) => (
                <tr key={item.email} className="border-b border-slate-200">
                  <td className="px-3 py-2 font-semibold">{item.name || 'Pengguna'}</td>
                  <td className="px-3 py-2 text-slate-600">{item.email}</td>
                  <td className="px-3 py-2 text-slate-600">{formatDateTime(item.lastLogin)}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusLabel(item) === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                      {getStatusLabel(item)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => onShowEdit(item)} className="rounded-md bg-amber-500 px-2 py-1 text-xs font-semibold text-white">Edit</button>
                      <button type="button" onClick={() => onDelete(item.id)} className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white">Hapus</button>
                      <button
                        type="button"
                        onClick={() => onToggle(item.id)}
                        className={`rounded-md px-2 py-1 text-xs font-semibold text-white ${getStatusLabel(item) === 'Aktif' ? 'bg-slate-600' : 'bg-emerald-600'}`}
                      >
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
