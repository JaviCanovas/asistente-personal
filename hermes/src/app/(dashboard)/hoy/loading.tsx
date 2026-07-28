export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto animate-pulse">
      {/* Header */}
      <div className="page-header pb-4 border-b mb-6" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-neutral-800/60" />
          <div className="space-y-2">
            <div className="h-6 w-28 rounded-lg bg-neutral-800/60" />
            <div className="h-3.5 w-40 rounded-md bg-neutral-900/80" />
          </div>
        </div>
      </div>

      {/* Alert banner skeleton */}
      <div className="h-12 rounded-xl bg-indigo-900/15 border border-indigo-500/10 mb-5" />

      {/* Priority items */}
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-5 flex items-start gap-4" style={{ opacity: 1 - i * 0.18 }}>
            <div className="w-5 h-5 rounded-full bg-neutral-800/60 mt-0.5 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 rounded-md bg-neutral-800/60" style={{ width: `${80 - i * 7}%` }} />
              <div className="h-3 rounded-md bg-purple-900/20 w-1/2" />
              <div className="flex gap-2">
                <div className="h-5 w-14 rounded-full bg-neutral-900/70" />
                <div className="h-5 w-16 rounded-full bg-neutral-900/70" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
