export default function ServiceCard({ title, desc, emoji }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-3 text-3xl">{emoji}</div>
      <div className="mb-1 text-lg font-semibold">{title}</div>
      <p className="text-sm text-slate-600">{desc}</p>
    </div>
  )
}
