'use client'

import { RotateCcw, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import type { ResumenSemanal } from '@/lib/types'
import { formatFecha } from '@/lib/utils'
import ItemCard from '@/components/items/ItemCard'

export default function RevisionClient({ resumen }: { resumen: ResumenSemanal }) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">
          <RotateCcw className="w-5 h-5" style={{ color: '#a78bfa' }} />
          Revisión semanal
        </h1>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {formatFecha(resumen.semana_inicio, "d MMM")} – {formatFecha(resumen.semana_fin, "d MMM yyyy")}
        </span>
      </div>

      {/* Propuesta de reorganización */}
      <div className="card p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          {resumen.sobrecarga_detectada
            ? <AlertTriangle className="w-4 h-4" style={{ color: '#f97316' }} />
            : <CheckCircle2 className="w-4 h-4" style={{ color: '#10b981' }} />
          }
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            Análisis de Hermes
          </h2>
        </div>
        <div className="space-y-2">
          {resumen.propuesta_reorganizacion.map((linea, i) => (
            <p key={i} className="text-sm" style={{ color: 'var(--text-secondary)' }}>{linea}</p>
          ))}
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold mb-1" style={{ color: '#10b981' }}>{resumen.completados.length}</div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Completados esta semana</p>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold mb-1" style={{ color: resumen.sobrecarga_detectada ? '#f97316' : 'var(--accent)' }}>
            {resumen.pendientes.length}
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Pendientes</p>
        </div>
      </div>

      {/* Completados */}
      {resumen.completados.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4" style={{ color: '#10b981' }} />
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Completados</h2>
          </div>
          <div className="space-y-2 item-list">
            {resumen.completados.slice(0, 10).map(item => (
              <ItemCard key={item.id} item={item} compact />
            ))}
          </div>
        </div>
      )}

      {/* Pendientes */}
      {resumen.pendientes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Pendientes</h2>
          </div>
          <div className="space-y-2 item-list">
            {resumen.pendientes.slice(0, 15).map(item => (
              <ItemCard key={item.id} item={item} compact />
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-center mt-6" style={{ color: 'var(--text-muted)' }}>
        Generado el {formatFecha(resumen.generado_en, "d 'de' MMMM · HH:mm")}
      </p>
    </div>
  )
}
