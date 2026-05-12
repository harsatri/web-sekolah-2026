export default function Features() {
  return (
    <section id="fitur" className="w-screen px-8 pt-20 pb-12">
      <span className="rounded-full border border-slate-200 px-3 py-1 text-xs">FITUR</span>
      <h2 className="mt-2 text-4xl font-extrabold tracking-tight">Keunggulan Sistem Kami</h2>
      <p className="mt-2 max-w-2xl text-slate-700">
        Platform yang mengintegrasikan kriteria penilaian akademik dan non-akademik secara objektif.
      </p>
      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white">🎯</div>
          <div className="mt-4 text-lg font-semibold">Penilaian Objektif</div>
          <p className="mt-1 text-sm text-slate-600">Metode terstruktur menghasilkan nilai kelayakan konsisten, mengurangi subjektivitas manual.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white">📊</div>
          <div className="mt-4 text-lg font-semibold">Transparan & Akurat</div>
          <p className="mt-1 text-sm text-slate-600">Setiap kriteria memiliki bobot jelas dan terukur; detail perhitungan tersedia.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white">⚡</div>
          <div className="mt-4 text-lg font-semibold">Cepat & Mudah</div>
          <p className="mt-1 text-sm text-slate-600">Proses penilaian singkat dengan antarmuka yang ramah pengguna.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white">🧩</div>
          <div className="mt-4 text-lg font-semibold">Multi Kriteria</div>
          <p className="mt-1 text-sm text-slate-600">Menilai berbagai aspek: data pribadi, akademik, prestasi, dan dokumen pendukung.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white">🔒</div>
          <div className="mt-4 text-lg font-semibold">Data Aman</div>
          <p className="mt-1 text-sm text-slate-600">Informasi tersimpan aman dengan praktik privasi dan keamanan dasar.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white">🕒</div>
          <div className="mt-4 text-lg font-semibold">Akses 24/7</div>
          <p className="mt-1 text-sm text-slate-600">Akses kapan saja dari berbagai perangkat untuk kenyamanan pengguna.</p>
        </div>
      </div>
    </section>
  )
}
