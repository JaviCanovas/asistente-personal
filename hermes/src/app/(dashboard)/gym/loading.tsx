export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto animate-pulse">
      <div className="page-header pb-4 border-b mb-6" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-neutral-800/60" />
          <div className="space-y-2">
            <div className="h-6 w-12 rounded-lg bg-neutral-800/60" />
            <div className="h-3.5 w-48 rounded-md bg-neutral-900/80" />
          </div>
        </div>
        <div className="h-9 w-28 rounded-xl bg-neutral-800/50" />
      </div>
      {/* Gym day cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-5 space-y-3" style={{ opacity: 1 - i * 0.18 }}>
            <div className="h-4 w-2/3 rounded-md bg-neutral-800/60" />
            <div className="space-y-2">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-3 rounded-md bg-neutral-900/70" style={{ width: `${85 - j * 10}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
