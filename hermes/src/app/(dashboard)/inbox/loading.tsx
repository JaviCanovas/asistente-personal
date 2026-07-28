// Skeleton de carga que aparece inmediatamente mientras la página obtiene sus datos
export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto animate-pulse">
      {/* Header skeleton */}
      <div className="page-header pb-4 border-b mb-6" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-neutral-800/60" />
          <div className="space-y-2">
            <div className="h-6 w-36 rounded-lg bg-neutral-800/60" />
            <div className="h-3.5 w-52 rounded-md bg-neutral-900/80" />
          </div>
        </div>
        <div className="h-9 w-28 rounded-xl bg-neutral-800/50" />
      </div>

      {/* Content skeleton */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="card p-5 flex items-start gap-4"
            style={{ opacity: 1 - i * 0.15 }}
          >
            <div className="w-5 h-5 rounded-full bg-neutral-800/70 mt-0.5 shrink-0" />
            <div className="flex-1 space-y-2.5">
              <div className="h-4 rounded-md bg-neutral-800/60" style={{ width: `${75 - i * 8}%` }} />
              <div className="h-3 rounded-md bg-neutral-900/80 w-2/3" />
              <div className="flex gap-2 mt-1">
                <div className="h-5 w-14 rounded-full bg-neutral-900/80" />
                <div className="h-5 w-20 rounded-full bg-neutral-900/80" />
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-neutral-900/60" />
              <div className="w-7 h-7 rounded-lg bg-neutral-900/60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
