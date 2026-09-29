export default function HomeLoading() {
  return (
    <div className="max-w-6xl mx-auto animate-pulse space-y-8">
      {/* Header skeleton */}
      <div>
        <div className="h-3 w-32 bg-slate-800/60 rounded mb-2" />
        <div className="h-8 w-64 bg-slate-800/80 rounded-lg" />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 h-64 bg-slate-900/40 border border-white/5 rounded-2xl" />
        <div className="card p-6 h-64 bg-slate-900/40 border border-white/5 rounded-2xl" />
        <div className="card p-6 h-64 bg-slate-900/40 border border-white/5 rounded-2xl" />
      </div>
    </div>
  )
}
