 
import { Link } from 'react-router-dom'
import Features from './Features.jsx'
import TopSchools from './TopSchools.jsx'
import Guide from './Guide.jsx'
import FAQ from './FAQ.jsx'

export default function Home() {
  return (
    <main className="bg-[#f5f5f7] text-slate-900">
      <section
        id="beranda"
        className="relative w-full px-8 pt-16 pb-12"
      >
        <div className="mx-auto max-w-7xl">
          {/* MOBILE ONLY: STATS FIRST */}
          <div className="mb-12 space-y-6 md:hidden">
            <div className="w-full rounded-3xl bg-white p-6 shadow-xl">
              <p className="text-sm font-semibold text-slate-500">
                Peluang Kelayakan
              </p>
              <div className="mt-4 text-4xl font-bold">87%</div>
              <div className="mt-4 h-2 w-full rounded-full bg-slate-200">
                <div className="h-2 w-[87%] rounded-full bg-black"></div>
              </div>
              <p className="mt-4 text-xs text-slate-500">
                Berdasarkan simulasi data usia, jarak, dan nilai rapor.
              </p>
            </div>
            <div className="w-full rounded-3xl bg-white p-6 shadow-lg">
              <p className="text-sm font-semibold text-slate-500">
                Distribusi Zonasi
              </p>
              <div className="mt-6 flex h-20 items-end gap-2 justify-center">
                <div className="h-[40%] w-5 rounded bg-black/30"></div>
                <div className="h-[70%] w-5 rounded bg-black/50"></div>
                <div className="h-[100%] w-5 rounded bg-black"></div>
                <div className="h-[60%] w-5 rounded bg-black/50"></div>
                <div className="h-[35%] w-5 rounded bg-black/30"></div>
              </div>
              <p className="mt-4 text-xs text-slate-500">
                Konsentrasi simulasi tertinggi di pusat kota.
              </p>
            </div>
            <div className="w-full rounded-3xl bg-white p-6 shadow-md">
              <p className="text-sm font-semibold text-slate-500">
                Akurasi Sistem
              </p>
              <div className="mt-4 text-3xl font-bold">96%</div>
              <p className="mt-2 text-xs text-slate-500">
                Berdasarkan uji validasi data tahun sebelumnya.
              </p>
            </div>
          </div>

          <div className="grid items-center gap-16 md:grid-cols-2">

            {/* LEFT SIDE */}
            <div>
              <p className="mb-4 text-sm font-medium tracking-wide text-slate-500">
                Platform Pre-Screening Mandiri
              </p>

              <h1 className="text-5xl font-extrabold leading-tight md:text-6xl">
                Cek Kelayakan
                <br />
                <span className="text-slate-700">
                  Calon Siswa SD Negeri
                </span>
              </h1>

              <p className="mt-6 max-w-lg text-lg text-slate-600">
              Evaluasi objektif dan transparan untuk membantu orang tua
              menilai tingkat kelayakan siswa secara mandiri berdasarkan
              kriteria sekolah.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link
                  to="/kelayakan"
                  className="rounded-full bg-indigo-900 px-8 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-800"
                >
                  Cek Kelayakan
                </Link>
                <a
                  href="#panduan"
                  className="rounded-full border-2 border-indigo-900 px-8 py-3 text-sm font-semibold text-indigo-900 transition hover:bg-indigo-50"
                >
                  Panduan Penggunaan
                </a>
              </div>
            </div>

            {/* RIGHT SIDE - FLOATING CARDS (DESKTOP ONLY) */}
            <div className="relative hidden h-[500px] md:block">

              {/* Card 1 */}
              <div className="absolute right-0 top-0 w-72 rounded-3xl bg-white p-6 shadow-xl">
                <p className="text-sm font-semibold text-slate-500">
                  Peluang Kelayakan
                </p>
                <div className="mt-4 text-4xl font-bold">87%</div>
                <div className="mt-4 h-2 w-full rounded-full bg-slate-200">
                  <div className="h-2 w-[87%] rounded-full bg-black"></div>
                </div>
                <p className="mt-4 text-xs text-slate-500">
                  Berdasarkan simulasi data usia, jarak, dan nilai rapor.
                </p>
              </div>

              {/* Card 2 */}
              <div className="absolute left-0 top-24 w-64 rounded-3xl bg-white p-6 shadow-lg">
                <p className="text-sm font-semibold text-slate-500">
                  Distribusi Zonasi
                </p>
                <div className="mt-6 flex h-20 items-end gap-2">
                  <div className="h-[40%] w-5 rounded bg-black/30"></div>
                  <div className="h-[70%] w-5 rounded bg-black/50"></div>
                  <div className="h-[100%] w-5 rounded bg-black"></div>
                  <div className="h-[60%] w-5 rounded bg-black/50"></div>
                  <div className="h-[35%] w-5 rounded bg-black/30"></div>
                </div>
                <p className="mt-4 text-xs text-slate-500">
                  Konsentrasi simulasi tertinggi di pusat kota.
                </p>
              </div>

              {/* Card 3 */}
              <div className="absolute bottom-0 right-10 w-80 rounded-3xl bg-white p-6 shadow-md">
                <p className="text-sm font-semibold text-slate-500">
                  Akurasi Sistem
                </p>
                <div className="mt-4 text-3xl font-bold">96%</div>
                <p className="mt-2 text-xs text-slate-500">
                  Berdasarkan uji validasi data tahun sebelumnya.
                </p>
              </div>

            </div>
          </div>
        </div>
      </section>

      

      

      <Features />
      <TopSchools />
      <Guide />
      <FAQ />
      
      <section id="cta" className="w-screen px-8 py-16">
        <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-blue-600 px-6 py-16 text-center text-white">
          <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">Siap Memulai Penilaian?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm md:text-base">
            Bergabunglah dengan orang tua yang menggunakan sistem kami untuk menilai kelayakan calon siswa.
          </p>
          <Link
            to="/kelayakan"
            className="mt-8 inline-block rounded-full bg-white px-6 py-3 font-semibold text-slate-900 hover:bg-slate-100"
          >
            Cek Kelayakan Sekarang
          </Link>
        </div>
      </section>
    </main>
  )
}
