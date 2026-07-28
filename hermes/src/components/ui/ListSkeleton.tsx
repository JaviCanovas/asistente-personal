// Reutilizable: esqueleto de lista de items para Tareas, Ideas, Notas, Proyectos, Revisión, Gym, Nutrición
export function ListSkeleton({ rows = 5, headerWidth = 'w-32' }: { rows?: number; headerWidth?: string }) {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="page-header pb-4 border-b mb-6" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-neutral-800/60" />
          <div className="space-y-2">
            <div className={`h-6 ${headerWidth} rounded-lg bg-neutral-800/60`} />
            <div className="h-3.5 w-48 rounded-md bg-neutral-900/80" />
          </div>
        </div>
        <div className="h-9 w-28 rounded-xl bg-neutral-800/50" />
      </div>

      {/* Rows */}
      <div className="space-y-3">
        {[...Array(rows)].map((_, i) => (
          <div
            key={i}
            className="card p-5 flex items-start gap-4"
            style={{ opacity: Math.max(0.2, 1 - i * 0.15) }}
          >
            <div className="w-5 h-5 rounded-full bg-neutral-800/70 mt-0.5 shrink-0" />
            <div className="flex-1 space-y-2.5">
              <div className="h-4 rounded-md bg-neutral-800/60" style={{ width: `${78 - i * 6}%` }} />
              <div className="h-3 rounded-md bg-neutral-900/80 w-1/2" />
              <div className="flex gap-2">
                <div className="h-5 w-14 rounded-full bg-neutral-900/70" />
                <div className="h-5 w-20 rounded-full bg-neutral-900/70" />
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-neutral-900/50" />
              <div className="w-7 h-7 rounded-lg bg-neutral-900/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ListSkeleton
