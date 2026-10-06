'use client'

import { useState } from 'react'
import { Archive, Trash2, Tag, Calendar, ChevronRight, Circle, CheckCircle2, MinusCircle, Loader2, CheckSquare, Sun, GripVertical, ChevronUp, ChevronDown, ArrowRight, ArrowLeft } from 'lucide-react'
import type { Item } from '@/lib/types'
import { TIPO_CONFIG, PRIORIDAD_CONFIG, cn, formatFechaRelativa, truncate } from '@/lib/utils'
import { marcarHecho, archivarItem, eliminarItem } from '@/lib/actions/items'
import { useToast } from '@/components/ui/Toast'

interface ItemCardProps {
  item: Item
  onEdit?: (item: Item) => void
  mostrarProyecto?: boolean
  compact?: boolean
  razon?: string
  onDeleted?: (id: string) => void
  onArchived?: (id: string) => void
  onDone?: (id: string, hecho: boolean) => void
  onRemoveFromMyDay?: (id: string) => void
  onMoveToTomorrow?: (id: string) => void
  onMoveToToday?: (id: string) => void
  orderIndex?: number
  onMoveUp?: () => void
  onMoveDown?: () => void
  canMoveUp?: boolean
  canMoveDown?: boolean
}

export default function ItemCard({
  item,
  onEdit,
  mostrarProyecto = true,
  compact = false,
  razon,
  onDeleted,
  onArchived,
  onDone,
  onRemoveFromMyDay,
  onMoveToTomorrow,
  onMoveToToday,
  orderIndex,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: ItemCardProps) {
  const { showToast } = useToast()
  const [optimisticDone, setOptimisticDone] = useState<boolean | null>(null)
  const [isExiting, setIsExiting] = useState(false)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const isHecho = optimisticDone !== null ? optimisticDone : item.estado === 'hecho'
  const isGoogleCalendar = item.origen === 'google-calendar'
  const tipoConf = TIPO_CONFIG[item.tipo]
  const priorConf = PRIORIDAD_CONFIG[item.prioridad]

  // Barra de prioridad — color
  const barColor =
    item.prioridad === 'urgente' ? '#ef4444' :
    item.prioridad === 'alta'    ? '#f97316' :
    item.prioridad === 'media'   ? '#6366f1' : '#334155'

  // Manejo optimista de marcar tarea como hecha / activa
  async function handleToggleHecho() {
    if (isGoogleCalendar) return

    const nuevoEstadoHecho = !isHecho
    setOptimisticDone(nuevoEstadoHecho)

    if (nuevoEstadoHecho) {
      // 1. Respuesta visual instantánea (< 50ms): tachado y check verde
      // 2. Animación de salida tras ~350ms
      setTimeout(() => {
        setIsExiting(true)
        setTimeout(() => {
          onDone?.(item.id, true)
        }, 200)
      }, 350)

      // 3. Mostrar Toast con opción de "Deshacer" durante 5 segundos
      showToast({
        message: `Completada: "${truncate(item.titulo, 26)}"`,
        type: 'success',
        duration: 5000,
        action: {
          label: 'Deshacer',
          onClick: async () => {
            setOptimisticDone(false)
            setIsExiting(false)
            onDone?.(item.id, false)
            try {
              await marcarHecho(item.id, false)
            } catch (err) {
              console.error('Error al deshacer completado:', err)
              showToast({ message: 'No se pudo revertir la tarea', type: 'error' })
            }
          },
        },
      })

      // 4. Guardar en background sin bloquear la lista ni esperar
      marcarHecho(item.id, true).catch(err => {
        console.error('Error guardando en background:', err)
        setOptimisticDone(false)
        setIsExiting(false)
        onDone?.(item.id, false)
        showToast({
          message: 'Error al guardar. Reintentar.',
          type: 'error',
          action: {
            label: 'Reintentar',
            onClick: () => handleToggleHecho(),
          },
        })
      })
    } else {
      // Desmarcar / Reactivar
      onDone?.(item.id, false)
      marcarHecho(item.id, false).catch(err => {
        console.error('Error desmarcando:', err)
        setOptimisticDone(true)
      })
    }
  }

  // Manejo optimista de archivar
  function handleArchivar() {
    setIsExiting(true)
    setTimeout(() => {
      onArchived?.(item.id)
    }, 200)

    showToast({
      message: `Archivada: "${truncate(item.titulo, 26)}"`,
      type: 'info',
      duration: 5000,
      action: {
        label: 'Deshacer',
        onClick: async () => {
          setIsExiting(false)
          try {
            await marcarHecho(item.id, false)
          } catch (e) {
            console.error(e)
          }
        },
      },
    })

    archivarItem(item.id).catch(err => {
      console.error(err)
      setIsExiting(false)
      showToast({ message: 'Error al archivar la tarea', type: 'error' })
    })
  }

  // Manejo optimista de eliminar
  function handleEliminar() {
    setIsExiting(true)
    setTimeout(() => {
      onDeleted?.(item.id)
    }, 200)

    showToast({
      message: `Eliminada: "${truncate(item.titulo, 26)}"`,
      type: 'info',
      duration: 4000,
    })

    eliminarItem(item.id).catch(err => {
      console.error(err)
      setIsExiting(false)
      showToast({ message: 'Error al eliminar la tarea', type: 'error' })
    })
  }

  return (
    <div
      data-testid="card"
      className={cn(
        'card group relative transition-all duration-300 ease-out',
        isHecho && 'opacity-65',
        isExiting && 'opacity-0 -translate-y-2 scale-98 pointer-events-none'
      )}
      style={{
        padding: compact ? '14px 16px 14px 20px' : '18px 20px 18px 24px',
        maxHeight: isExiting ? 0 : 300,
        marginBottom: isExiting ? 0 : undefined,
        overflow: isExiting ? 'hidden' : 'visible',
      }}
    >
      {/* Barra de prioridad lateral */}
      <div
        className="absolute left-0 rounded-full transition-all"
        style={{
          top: 12,
          bottom: 12,
          width: 3.5,
          background: barColor,
          borderRadius: '0 3px 3px 0',
        }}
      />

      <div className="flex items-start gap-3">
        {/* Control de Orden / Prioridad diaria (Mi Día) */}
        {typeof orderIndex === 'number' && (
          <div className="flex items-center gap-1 shrink-0 mt-0.5 select-none -ml-1">
            <div
              className="cursor-grab active:cursor-grabbing p-1 text-slate-500 hover:text-purple-400 transition-colors"
              title="Arrastra para reordenar la prioridad"
            >
              <GripVertical className="w-4 h-4" />
            </div>
            <span
              className="text-[11px] font-bold font-mono px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/25 min-w-[24px] text-center"
              title={`Prioridad #${orderIndex + 1}`}
            >
              #{orderIndex + 1}
            </span>
            {(onMoveUp || onMoveDown) && (
              <div className="flex flex-col -space-y-1">
                <button
                  type="button"
                  disabled={!canMoveUp}
                  onClick={(e) => {
                    e.stopPropagation()
                    onMoveUp?.()
                  }}
                  className="p-0.5 text-slate-500 hover:text-white disabled:opacity-20 disabled:hover:text-slate-500 transition-colors cursor-pointer"
                  title="Subir prioridad"
                  aria-label="Subir prioridad"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={!canMoveDown}
                  onClick={(e) => {
                    e.stopPropagation()
                    onMoveDown?.()
                  }}
                  className="p-0.5 text-slate-500 hover:text-white disabled:opacity-20 disabled:hover:text-slate-500 transition-colors cursor-pointer"
                  title="Bajar prioridad"
                  aria-label="Bajar prioridad"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Toggle hecho optimista */}
        {!isGoogleCalendar ? (
          <button
            type="button"
            onClick={handleToggleHecho}
            className="mt-0.5 flex-shrink-0 transition-transform active:scale-80 cursor-pointer p-0.5 rounded-full hover:bg-white/5"
            style={{ color: isHecho ? '#10b981' : 'var(--text-muted)' }}
            title={isHecho ? 'Marcar como pendiente' : 'Marcar como hecha'}
            aria-label={isHecho ? 'Marcar como pendiente' : 'Marcar como hecha'}
          >
            {isHecho ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-500/20 transition-all duration-200 scale-105" />
            ) : (
              <Circle className="w-5 h-5 text-slate-400 hover:text-white transition-colors" />
            )}
          </button>
        ) : (
          <div className="mt-0.5 flex-shrink-0 text-indigo-400" title="Evento de Google Calendar">
            <Calendar style={{ width: 20, height: 20 }} />
          </div>
        )}

        {/* Contenido (Clickable para abrir detalle) */}
        <div
          onClick={() => onEdit?.(item)}
          className={cn('flex-1 min-w-0', onEdit && 'cursor-pointer')}
        >
          {/* Título + badge de tipo */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className={cn(
                'font-medium leading-snug transition-all duration-200 select-none group-hover:text-purple-300',
                isHecho && 'line-through text-slate-500'
              )}
              style={{
                fontSize: compact ? '0.9375rem' : '1rem',
                color: isHecho ? 'var(--text-muted)' : 'var(--text-primary)',
              }}
            >
              {item.titulo}
            </span>
            <span
              className="badge flex-shrink-0 select-none text-xs"
              style={{
                fontSize: '0.75rem',
                background: tipoConf.bg.replace('/10', '/20'),
                color: tipoConf.color.replace('text-', '').includes('-')
                  ? undefined
                  : 'var(--text-secondary)',
              }}
            >
              <span>{tipoConf.emoji}</span>
              <span>{tipoConf.label}</span>
            </span>

            {/* Badge de "Mi Día" */}
            {(item.metadata as any)?.mi_dia_fecha && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                <Sun className="w-3 h-3 text-amber-400" />
                <span>
                  Mi Día
                  {(() => {
                    const ordenVal = (item.metadata as any)?.mi_dia_orden
                    const num = ordenVal !== undefined && ordenVal !== null && ordenVal !== '' ? Number(ordenVal) : NaN
                    return !isNaN(num) ? ` · #${num + 1}` : ''
                  })()}
                </span>
              </span>
            )}
          </div>

          {/* Descripción */}
          {!compact && item.descripcion && (
            <p
              className="line-clamp-2"
              style={{
                fontSize: '0.875rem',
                color: 'var(--text-muted)',
                marginBottom: 8,
                lineHeight: 1.6,
              }}
            >
              {truncate(item.descripcion, 140)}
            </p>
          )}

          {/* Razón (vista Hoy) */}
          {razon && (
            <p
              className="italic text-xs text-indigo-300 mb-2 mt-1"
            >
              💡 {razon}
            </p>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-3.5 flex-wrap mt-1.5">
            {/* Prioridad */}
            <span
              className="flex items-center gap-1.5 text-xs text-slate-400"
            >
              <span
                className="rounded-full flex-shrink-0"
                style={{ width: 7, height: 7, background: barColor }}
              />
              {priorConf.label}
            </span>

            {/* Pasos / Subtareas */}
            {Array.isArray((item.metadata as any)?.pasos) && (item.metadata as any).pasos.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                <CheckSquare className="w-3 h-3 text-purple-400" />
                <span>
                  {(item.metadata as any).pasos.filter((p: any) => p.completado).length}/{(item.metadata as any).pasos.length} pasos
                </span>
              </span>
            )}

            {/* Fecha límite */}
            {item.fecha_limite && (
              <span
                className="flex items-center gap-1 text-xs text-slate-400"
              >
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                {formatFechaRelativa(item.fecha_limite)}
              </span>
            )}

            {/* Proyecto */}
            {mostrarProyecto && item.proyecto && (
              <span
                className="badge text-xs"
                style={{
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  background: (item.proyecto.color ?? '#6366f1') + '25',
                  color: item.proyecto.color ?? '#6366f1',
                  border: `1px solid ${(item.proyecto.color ?? '#6366f1')}40`,
                }}
              >
                {item.proyecto.nombre}
              </span>
            )}

            {/* Etiquetas */}
            {item.etiquetas?.slice(0, 2).map(tag => (
              <span
                key={tag}
                className="flex items-center gap-1 text-xs text-slate-400"
              >
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Acciones */}
        <div
          className="flex items-center gap-1.5 flex-shrink-0"
          style={{ marginTop: 2 }}
        >
          {/* Botón Mandar a Mañana (visible para tareas no completadas) */}
          {!isHecho && onMoveToTomorrow && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onMoveToTomorrow(item.id)
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 hover:text-white border border-purple-500/25 hover:border-purple-500/40 transition-all duration-200 shadow-sm active:scale-95 group/btn"
              title="Mandar tarea a Mañana"
            >
              <span>Mañana</span>
              <ArrowRight className="w-3.5 h-3.5 text-purple-400 group-hover/btn:translate-x-0.5 transition-transform" />
            </button>
          )}

          {/* Botón Mandar a Hoy (visible para tareas no completadas en pestaña Mañana) */}
          {!isHecho && onMoveToToday && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onMoveToToday(item.id)
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-white border border-amber-500/25 hover:border-amber-500/40 transition-all duration-200 shadow-sm active:scale-95 group/btn"
              title="Mandar tarea a Hoy"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-amber-400 group-hover/btn:-translate-x-0.5 transition-transform" />
              <span>Hoy</span>
            </button>
          )}

          {/* Acciones secundarias (visibles al hover en desktop, tenues en móvil) */}
          <div className="flex items-center gap-1 opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            {!isGoogleCalendar && onRemoveFromMyDay && (
              <button
                type="button"
                onClick={() => onRemoveFromMyDay(item.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
                title="Quitar de Mi Día"
              >
                <MinusCircle className="w-4 h-4" />
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                title="Editar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {!isGoogleCalendar && (
              <button
                type="button"
                onClick={handleArchivar}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors cursor-pointer"
                title="Archivar"
              >
                <Archive className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleEliminar}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
              title="Eliminar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
