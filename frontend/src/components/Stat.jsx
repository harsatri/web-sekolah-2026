export default function Stat({ value, label }) {
  return (
    <div className="flex-1 rounded-full bg-blue-600/10 px-5 py-4 text-center">
      <div className="text-2xl font-bold text-blue-700">{value}</div>
      <div className="text-sm text-slate-700">{label}</div>
    </div>
  )
}
