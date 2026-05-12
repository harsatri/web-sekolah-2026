export default function Guide() {
  return (
    <section id="panduan" className="w-screen px-8 pt-20 pb-12">
      <span className="rounded-full border border-slate-200 px-3 py-1 text-xs">PANDUAN</span>
      <h2 className="mt-2 text-4xl font-extrabold tracking-tight">Panduan Penggunaan Sistem</h2>
      <p className="mt-2 max-w-2xl text-slate-700">
        Empat langkah sederhana untuk mengetahui kelayakan calon siswa.
      </p>
      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-white">1</div>
          <div className="mt-4 text-lg font-semibold">Daftar Akun</div>
          <p className="mt-1 text-sm text-slate-600">
            Buat akun dengan email dan data valid untuk mengakses prescreening.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-white">2</div>
          <div className="mt-4 text-lg font-semibold">Isi Data Lengkap</div>
          <p className="mt-1 text-sm text-slate-600">
            Masukkan informasi calon siswa: data pribadi, akademik, prestasi, dan dokumen pendukung.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-white">3</div>
          <div className="mt-4 text-lg font-semibold">Sistem Menilai</div>
          <p className="mt-1 text-sm text-slate-600">
            Metode penilaian memproses data dan menghasilkan nilai kelayakan berdasarkan kriteria.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-white">4</div>
          <div className="mt-4 text-lg font-semibold">Lihat Hasil</div>
          <p className="mt-1 text-sm text-slate-600">
            Dapatkan hasil penilaian beserta rekomendasi dan tingkat kelayakan.
          </p>
        </div>
      </div>
    </section>
  )
}
