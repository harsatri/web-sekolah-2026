import { useState } from 'react'

const items = [
  {
    q: 'Apa itu DILAYAKIN?',
    a: 'DILAYAKIN adalah platform pre-screening untuk menilai kelayakan calon siswa berdasarkan kriteria akademik dan non-akademik secara objektif.',
  },
  {
    q: 'Bagaimana cara mendaftar?',
    a: 'Klik Sign up, isi data dasar, lalu akun user biasa akan dibuat otomatis.',
  },
  {
    q: 'Apakah data saya aman?',
    a: 'Data dikelola dengan praktik privasi dasar. Untuk produksi, kami menyarankan enkripsi dan kontrol akses di backend.',
  },
  {
    q: 'Bisakah diakses dari ponsel?',
    a: 'Ya, antarmuka responsif dan dapat diakses dari ponsel, tablet, maupun desktop.',
  },
  {
    q: 'Bagaimana jika lupa password?',
    a: 'Gunakan fitur lupa password (dapat ditambahkan di backend). Saat ini untuk demo, akun dapat dibuat ulang.',
  },
]

export default function FAQ() {
  const [open, setOpen] = useState(0)

  return (
    <section id="faq" className="w-screen px-8 pt-20 pb-12">
      <span className="rounded-full border border-slate-200 px-3 py-1 text-xs">FAQ</span>
      <h2 className="mt-2 text-4xl font-extrabold tracking-tight">Frequently Asked Questions</h2>
      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div className="rounded-2xl bg-blue-600/10 p-6">
          <div className="text-6xl">🐍</div>
          <p className="mt-3 max-w-md text-sm text-slate-700">
            Kami rangkum pertanyaan umum untuk membantu Anda memahami sistem dengan cepat.
          </p>
        </div>
        <div className="space-y-3">
          {items.map((it, i) => {
            const expanded = open === i
            return (
              <div
                key={it.q}
                className={`rounded-2xl border p-4 ${expanded ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}
              >
                <button
                  className="flex w-full items-center justify-between text-left"
                  onClick={() => setOpen(expanded ? -1 : i)}
                  aria-expanded={expanded}
                >
                  <span className="font-semibold">{it.q}</span>
                  <span className="text-xl">{expanded ? '▴' : '▾'}</span>
                </button>
                {expanded && <p className="mt-3 text-sm text-slate-700">{it.a}</p>}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
