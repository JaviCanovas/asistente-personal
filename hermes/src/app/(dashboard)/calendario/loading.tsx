export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto animate-pulse">
      {/* Header */}
      <div className="page-header pb-4 border-b mb-6" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-neutral-800/60" />
          <div className="space-y-2">
            <div className="h-6 w-36 rounded-lg bg-neutral-800/60" />
            <div className="h-3.5 w-48 rounded-md bg-neutral-900/80" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-24 rounded-xl bg-neutral-800/50" />
          <div className="h-8 w-20 rounded-xl bg-neutral-800/50" />
          <div className="h-8 w-28 rounded-xl bg-indigo-900/30" />
        </div>
      </div>

      {/* Month title */}
      <div className="h-6 w-40 rounded-lg bg-neutral-800/50 mb-5" />

      <div className="flex gap-6">
        {/* Calendar grid */}
        <div className="flex-1 card p-5">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-3">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-4 rounded-md bg-neutral-800/40" />
            ))}
          </div>
          {/* Day cells */}
          <div className="grid grid-cols-7 gap-2">
            {[...Array(35)].map((_, i) => (
              <div
                key={i}
                className="min-h-[110px] rounded-2xl border border-neutral-800/40 bg-neutral-900/30 p-2"
                style={{ opacity: i % 7 === 5 || i % 7 === 6 ? 0.4 : 0.7 }}
              >
                <div className="w-5 h-5 rounded-full bg-neutral-800/50 mb-2" />
                {i % 3 === 0 && <div className="h-4 rounded-lg bg-neutral-800/40 mb-1" />}
                {i % 5 === 0 && <div className="h-4 rounded-lg bg-neutral-800/30" />}
              </div>
            ))}
          </div>
        </div>

        {/* Side panel */}
        <div className="w-80 shrink-0 card p-5 space-y-4">
          <div className="h-3.5 w-24 rounded-md bg-neutral-800/50" />
          <div className="h-3 w-full rounded-md bg-neutral-900/60" />
          <div className="h-3 w-4/5 rounded-md bg-neutral-900/60" />
          <div className="space-y-2 pt-3 border-t border-neutral-800">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-neutral-900/50" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
