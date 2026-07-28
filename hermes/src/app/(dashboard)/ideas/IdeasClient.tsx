'use client'

import { useState } from 'react'
import { Lightbulb, Plus, ArrowRight } from 'lucide-react'
import type { Item, Proyecto } from '@/lib/types'
import { PRIORIDAD_CONFIG, formatFechaRelativa, truncate } from '@/lib/utils'
import ItemModal from '@/components/items/ItemModal'
import { marcarHecho, archivarItem, actualizarItem } from '@/lib/actions/items'

export default function IdeasClient({ ideas, proyectos }: { ideas: Item[]; proyectos: Proyecto[] }) {
  const [modalAbierto, setModalAbierto] = useState(false)
  const [itemEditar, setItemEditar]     = useState<Item | undefined>()
  const activas = ideas.filter(i => i.estado !== 'archivado' && i.estado !== 'hecho')

  async function convertirATarea(idea: Item) {
    await actualizarItem(idea.id, { tipo: 'tarea', estado: 'activo' })
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <Lightbulb className="w-5 h-5" style={{ color: '#facc15' }} />
          Ideas
        </h1>
        <button onClick={() => { setItemEditar(undefined); setModalAbierto(true) }} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Nueva idea
        </button>
      </div>

      {activas.length === 0 ? (
        <div className="empty-state">
          <Lightbulb className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />
          <p className="font-medium">Sin ideas</p>
          <p className="text-sm">Captura tu próxima gran idea.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {activas.map(idea => {
            const priorConf = PRIORIDAD_CONFIG[idea.prioridad]
            return (
              <div key={idea.id} className="card p-4 group cursor-pointer" onClick={() => { setItemEditar(idea); setModalAbierto(true) }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-lg">💡</span>
                  <span className={`badge text-xs ${priorConf.color}`} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    {priorConf.label}
                  </span>
                </div>
                <h3 className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                  {idea.titulo}
                </h3>
                {idea.descripcion && (
                  <p className="text-xs mb-3 line-clamp-3" style={{ color: 'var(--text-muted)' }}>
                    {truncate(idea.descripcion, 100)}
                  </p>
                )}
                <div className="flex items-center justify-between mt-auto pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {formatFechaRelativa(idea.created_at)}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); convertirATarea(idea) }}
                    className="flex items-center gap-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--accent-hover)' }}
                  >
                    Convertir a tarea <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalAbierto && (
        <ItemModal item={itemEditar} proyectos={proyectos} tipoDefault="idea" onClose={() => setModalAbierto(false)} />
      )}
    </div>
  )
}
