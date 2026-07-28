'use client'

import { Sun, AlertTriangle, Zap } from 'lucide-react'
import type { ItemPriorizado } from '@/lib/types'
import type { AnalisisSemana } from '@/lib/ai/prioritize'
import ItemCard from '@/components/items/ItemCard'
import { formatFecha } from '@/lib/utils'

interface HoyClientProps {
  priorizados: ItemPriorizado[]
  analisisCarga: AnalisisSemana
}

export default function HoyClient({ priorizados, analisisCarga }: HoyClientProps) {
  const hoy = new Date()

  return (
    <div className="max-w-2xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Sun className="w-5 h-5" style={{ color: '#f59e0b' }} />
            Hoy
          </h1>
          <p className="text-sm mt-0.5 capitalize" style={{ color: 'var(--text-muted)' }}>
            {formatFecha(hoy, "EEEE, d 'de' MMMM")}
          </p>
        </div>
        <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
          {priorizados.length} para hoy
        </span>
      </div>

      {/* Alerta de sobrecarga */}
      {analisisCarga.carga_alta && analisisCarga.mensaje && (
        <div className="card card-accent p-4 mb-5 flex gap-3" style={{ borderColor: 'rgba(249,115,22,0.4)', boxShadow: '0 0 12px rgba(249,115,22,0.2)' }}>
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#f97316' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{analisisCarga.mensaje}</p>
        </div>
      )}

      {priorizados.length === 0 ? (
        <div className="empty-state">
          <Zap className="w-12 h-12" style={{ color: 'var(--text-muted)' }} />
          <p className="font-medium">¡Bandeja libre!</p>
          <p className="text-sm">No tienes items activos para hoy. Captura algo en el Inbox.</p>
        </div>
      ) : (
        <div className="space-y-2 item-list">
          {priorizados.map(({ item, razon }, i) => (
            <div key={item.id}>
              {/* Separador de prioridad */}
              {i === 0 && <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>PRIORITARIO</p>}
              {i === 3 && priorizados.length > 3 && (
                <p className="text-xs font-medium mt-4 mb-2" style={{ color: 'var(--text-muted)' }}>RESTO DEL DÍA</p>
              )}
              <ItemCard item={item} razon={razon} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
