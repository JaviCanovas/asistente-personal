'use client'

import { useState } from 'react'
import { Archive, Trash2, Tag, Calendar, ChevronRight, Circle, CheckCircle2, MinusCircle } from 'lucide-react'
import type { Item } from '@/lib/types'
import { TIPO_CONFIG, PRIORIDAD_CONFIG, cn, formatFechaRelativa, truncate } from '@/lib/utils'
import { marcarHecho, archivarItem, eliminarItem } from '@/lib/actions/items'

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
}: ItemCardProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const tipoConf = TIPO_CONFIG[item.tipo]
  const priorConf = PRIORIDAD_CONFIG[item.prioridad]
  const hecho = item.estado === 'hecho'
  const isGoogleCalendar = item.origen === 'google-calendar'

  async function handleAccion(accion: 'hecho' | 'archivar' | 'eliminar') {
    setLoading(accion)
    try {
      if (accion === 'hecho') {
        await marcarHecho(item.id)
        onDone?.(item.id, !hecho)
      }
      if (accion === 'archivar') {
        await archivarItem(item.id)
        onArchived?.(item.id)
      }
      if (accion === 'eliminar') {
        await eliminarItem(item.id)
        onDeleted?.(item.id)
      }
    } finally {
      setLoading(null)
    }
  }

  // Barra de prioridad — color
  const barColor =
    item.prioridad === 'urgente' ? '#ef4444' :
    item.prioridad === 'alta'    ? '#f97316' :
    item.prioridad === 'media'   ? '#6366f1' : '#334155'

  return (
    <div
      className={cn('card group relative', hecho && 'opacity-60')}
      style={{ padding: compact ? '14px 16px 14px 20px' : '18px 20px 18px 24px' }}
    >
      {/* Barra de prioridad lateral */}
      <div
        className="absolute left-0 rounded-full"
        style={{
          top: 12, bottom: 12, width: 3,
          background: barColor,
          borderRadius: '0 3px 3px 0',
        }}
      />

      <div className="flex items-start gap-3">
        {/* Toggle hecho */}
        {!isGoogleCalendar ? (
          <button
            onClick={() => handleAccion('hecho')}
            disabled={!!loading}
            className="mt-0.5 flex-shrink-0 transition-colors"
            style={{ color: hecho ? '#10b981' : 'var(--text-muted)' }}
            title={hecho ? 'Marcar como activo' : 'Marcar como hecho'}
          >
            {hecho
              ? <CheckCircle2 style={{ width: 20, height: 20 }} />
              : <Circle style={{ width: 20, height: 20 }} />
            }
          </button>
        ) : (
          <div className="mt-0.5 flex-shrink-0 text-indigo-400" title="Evento de Google Calendar">
            <Calendar style={{ width: 20, height: 20 }} />
          </div>
        )}

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          {/* Título + tipo */}
          <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 4 }}>
            <span
              className={cn('font-medium leading-snug', hecho && 'line-through')}
              style={{
                fontSize: compact ? '0.9375rem' : '1rem',
                color: hecho ? 'var(--text-muted)' : 'var(--text-primary)',
              }}
            >
              {item.titulo}
            </span>
            <span
              className="badge flex-shrink-0"
              style={{
                fontSize: '0.75rem',
                background: tipoConf.bg.replace('/10', '/20'),
                color: tipoConf.color.replace('text-', '').includes('-')
                  ? undefined
                  : 'var(--text-secondary)',
              }}
            >
              <span>{tipoConf.emoji}</span>
              <span style={{ color: 'inherit' }}>{tipoConf.label}</span>
            </span>
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
              className="italic"
              style={{
                fontSize: '0.875rem',
                color: 'var(--text-accent)',
                marginBottom: 8,
                marginTop: 4,
              }}
            >
              💡 {razon}
            </p>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-4 flex-wrap" style={{ marginTop: 6 }}>
            {/* Prioridad */}
            <span
              className="flex items-center gap-1.5"
              style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}
            >
              <span
                className="rounded-full flex-shrink-0"
                style={{ width: 7, height: 7, background: barColor }}
              />
              {priorConf.label}
            </span>

            {/* Fecha límite */}
            {item.fecha_limite && (
              <span
                className="flex items-center gap-1"
                style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}
              >
                <Calendar style={{ width: 13, height: 13 }} />
                {formatFechaRelativa(item.fecha_limite)}
              </span>
            )}

            {/* Proyecto */}
            {mostrarProyecto && item.proyecto && (
              <span
                className="badge"
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
                className="flex items-center gap-1"
                style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}
              >
                <Tag style={{ width: 11, height: 11 }} />
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Acciones — visibles con opacidad en móvil, en hover en desktop */}
        {!isGoogleCalendar && (
          <div
            className="flex items-center gap-1 flex-shrink-0 opacity-70 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            style={{ marginTop: 2 }}
          >
            {onRemoveFromMyDay && (
              <button
                onClick={() => onRemoveFromMyDay(item.id)}
                className="rounded-lg transition-colors"
                style={{ padding: '6px 8px', color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                title="Quitar de Mi Día"
              >
                <MinusCircle style={{ width: 16, height: 16 }} />
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(item)}
                className="rounded-lg transition-colors"
                style={{ padding: '6px 8px', color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                title="Editar"
              >
                <ChevronRight style={{ width: 16, height: 16 }} />
              </button>
            )}
            <button
              onClick={() => handleAccion('archivar')}
              disabled={!!loading}
              className="rounded-lg transition-colors"
              style={{ padding: '6px 8px', color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              title="Archivar"
            >
              <Archive style={{ width: 16, height: 16 }} />
            </button>
            <button
              onClick={() => handleAccion('eliminar')}
              disabled={!!loading}
              className="rounded-lg transition-colors"
              style={{ padding: '6px 8px', color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              title="Eliminar"
            >
              <Trash2 style={{ width: 16, height: 16 }} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
