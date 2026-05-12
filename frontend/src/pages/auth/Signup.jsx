import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useSchools } from '../../contexts/SchoolContext.jsx'

export default function Signup() {
  const { signup, signupSchool } = useAuth()
  const { schools, registerSchool } = useSchools()
  const nav = useNavigate()
  const { search } = useLocation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [district, setDistrict] = useState('Purwokerto Timur')
  const [address, setAddress] = useState('')
  const [contact, setContact] = useState('')
  const [capacity, setCapacity] = useState('120')
  const [accreditationScore, setAccreditationScore] = useState('80')
  const [certifiedTeachers, setCertifiedTeachers] = useState('12')
  const [error, setError] = useState('')
  const isSchoolRegistration = new URLSearchParams(search).get('type') === 'school'
  const districts = ['Purwokerto Timur', 'Purwokerto Barat', 'Purwokerto Selatan', 'Purwokerto Utara']

  const onSubmit = (e) => {
    e.preventDefault()
    try {
      if (isSchoolRegistration) {
        const exists = schools.some(
          (school) => school.name.toLowerCase() === schoolName.toLowerCase() && school.district === district,
        )
        if (exists) throw new Error('Sekolah sudah terdaftar di wilayah tersebut')
        registerSchool({
          name: schoolName,
          district,
          address,
          contact,
          capacity,
          accreditationScore,
          certifiedTeachers,
        })
        signupSchool({ accountName: name, email, password, schoolName })
      } else {
        signup(name, email, password)
      }
      nav('/')
    } catch (err) {
      setError(err.message || 'Gagal daftar')
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="mb-6">
        <Link className="btn-nav-icon shadow-sm" to="/" aria-label="Kembali">
          &lt;
        </Link>
      </div>
      <h1 className="text-3xl font-bold">{isSchoolRegistration ? 'Registrasi Sekolah' : 'Sign up'}</h1>
      {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="mt-4 flex items-center gap-2 text-sm">
        <Link
          className={`rounded-full border px-4 py-2 ${!isSchoolRegistration ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-700'}`}
          to="/signup"
        >
          User
        </Link>
        <Link
          className={`rounded-full border px-4 py-2 ${isSchoolRegistration ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-700'}`}
          to="/signup?type=school"
        >
          Sekolah
        </Link>
      </div>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm">{isSchoolRegistration ? 'Nama Penanggung Jawab' : 'Nama'}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 p-2"
            required
          />
        </div>
        {isSchoolRegistration && (
          <>
            <div>
              <label className="block text-sm">Nama Sekolah</label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm">Kecamatan</label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2"
              >
                {districts.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm">Alamat Sekolah</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm">Kontak Sekolah</label>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm">Kapasitas</label>
                <input
                  type="number"
                  min="1"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm">Nilai Akreditasi</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={accreditationScore}
                  onChange={(e) => setAccreditationScore(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm">Guru Bersertifikat</label>
                <input
                  type="number"
                  min="1"
                  value={certifiedTeachers}
                  onChange={(e) => setCertifiedTeachers(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                  required
                />
              </div>
            </div>
          </>
        )}
        <div>
          <label className="block text-sm">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 p-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 p-2"
            required
          />
        </div>
        <button className="btn-primary w-full">
          {isSchoolRegistration ? 'Daftarkan Sekolah' : 'Buat akun'}
        </button>
        <div className="text-center text-sm text-slate-600">
          Sudah punya akun?
          <Link className="ml-2 font-semibold text-blue-600 hover:text-blue-700" to="/login">
            Login
          </Link>
        </div>
      </form>
    </main>
  )
}
