import { useState } from 'react'
import { useSchools } from '../../contexts/SchoolContext.jsx'
import { apiJson } from '../../utils/api.js'

export default function SuperAdminSchools() {
  const { schools, refreshSchools } = useSchools()
  const approvedSchools = schools.filter((school) => school.status === 'approved')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSchool, setEditingSchool] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    district: '',
    address: '',
    contact: '',
    accreditation: 'A',
    capacity: 120,
  })

  const handleOpenModal = (school = null) => {
    if (school) {
      setEditingSchool(school)
      setFormData({
        name: school.name,
        district: school.district,
        address: school.address,
        contact: school.contact,
        accreditation: school.accreditation,
        capacity: school.capacity,
      })
    } else {
      setEditingSchool(null)
      setFormData({
        name: '',
        district: '',
        address: '',
        contact: '',
        accreditation: 'A',
        capacity: 120,
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingSchool) {
        await apiJson(`/api/schools/${editingSchool.id}`, {
          method: 'PUT',
          body: formData
        })
      } else {
        await apiJson('/api/schools', {
          method: 'POST',
          body: formData
        })
      }
      alert('Data sekolah berhasil disimpan')
      setIsModalOpen(false)
      refreshSchools()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus sekolah ini?')) return
    try {
      await apiJson(`/api/schools/${id}`, { method: 'DELETE' })
      refreshSchools()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Master Sekolah</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola data sekolah yang terdaftar di sistem.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
        >
          + Tambah Sekolah
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4">Nama Sekolah</th>
                <th className="px-6 py-4">Wilayah</th>
                <th className="px-6 py-4">Kontak</th>
                <th className="px-6 py-4">Akreditasi</th>
                <th className="px-6 py-4">Kuota</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {approvedSchools.map((school) => (
                <tr key={school.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-bold text-slate-900">{school.name}</td>
                  <td className="px-6 py-4 text-slate-600">{school.district}</td>
                  <td className="px-6 py-4 text-slate-600">{school.contact}</td>
                  <td className="px-6 py-4">
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">{school.accreditation}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{school.capacity}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleOpenModal(school)}
                      className="mr-3 text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(school.id)}
                      className="text-red-600 hover:underline"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <form onSubmit={handleSubmit}>
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <h3 className="text-lg font-bold text-slate-900">{editingSchool ? 'Edit Sekolah' : 'Tambah Sekolah'}</h3>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4 p-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Nama Sekolah</label>
                  <input 
                    type="text" required
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Wilayah</label>
                  <input 
                    type="text" required
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.district}
                    onChange={(e) => setFormData({...formData, district: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Alamat</label>
                  <textarea 
                    required
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Kontak</label>
                    <input 
                      type="text" required
                      className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.contact}
                      onChange={(e) => setFormData({...formData, contact: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Akreditasi</label>
                    <select 
                      className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.accreditation}
                      onChange={(e) => setFormData({...formData, accreditation: e.target.value})}
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Kuota Siswa</label>
                  <input 
                    type="number" required
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.capacity}
                    onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white hover:bg-blue-700"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
