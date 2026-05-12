import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar.jsx'

function ScrollToHash() {
  const { hash, pathname } = useLocation()

  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '')
      const tryScroll = () => {
        const el = document.getElementById(id)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          return true
        }
        return false
      }
      if (tryScroll()) return
      const timer = setTimeout(() => {
        tryScroll()
      }, 100)
      return () => clearTimeout(timer)
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }, [hash, pathname])

  return null
}

export default function PublicLayout() {
  return (
    <div className="min-h-screen">
      <ScrollToHash />
      <Navbar />
      <Outlet />
      <footer className="border-t border-slate-200">
        <div className="w-screen px-8 py-12">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">Tentang Kami</div>
              <p className="mt-3 text-sm text-slate-600">
                DILAYAKIN adalah platform pre-screening mandiri untuk menilai kelayakan calon siswa secara objektif.
              </p>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Menu</div>
              <div className="mt-3 space-y-2 text-sm">
                <a href="/#beranda" className="text-slate-600 hover:text-slate-900">Beranda</a>
                <a href="/#fitur" className="block text-slate-600 hover:text-slate-900">Fitur</a>
                <a href="/#panduan" className="block text-slate-600 hover:text-slate-900">Panduan</a>
                <a href="/#sekolah" className="block text-slate-600 hover:text-slate-900">Sekolah</a>
                <a href="/#faq" className="block text-slate-600 hover:text-slate-900">FAQ</a>
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Kontak</div>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <div>📧 info@dilayakin.sch.id</div>
                <div>☎️ (0281) 123-4567</div>
                <div>📍 Purwokerto, Jawa Tengah</div>
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Ikuti Kami</div>
              <div className="mt-3 space-y-2 text-sm">
                <a className="block text-slate-600 hover:text-slate-900" href="#">Facebook</a>
                <a className="block text-slate-600 hover:text-slate-900" href="#">Instagram</a>
                <a className="block text-slate-600 hover:text-slate-900" href="#">Twitter</a>
                <a className="block text-slate-600 hover:text-slate-900" href="#">YouTube</a>
              </div>
            </div>
          </div>
          <div className="mt-10 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} DILAYAKIN. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
