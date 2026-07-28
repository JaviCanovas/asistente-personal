'use client'

import { useState } from 'react'
import { FileText, Plus, Search, X, ArrowLeft } from 'lucide-react'
import type { Item, Proyecto } from '@/lib/types'
import { formatFecha, truncate } from '@/lib/utils'
import ItemModal from '@/components/items/ItemModal'
import { archivarItem } from '@/lib/actions/items'

export default function NotasClient({ notas, proyectos }: { notas: Item[]; proyectos: Proyecto[] }) {
  const [seleccionada, setSeleccionada] = useState<Item | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  const notasActivas = notas.filter(n =>
    n.estado !== 'archivado' &&
    (busqueda === '' || n.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      n.descripcion?.toLowerCase().includes(busqueda.toLowerCase()))
  )

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-12rem)] md:h-[calc(100vh-6rem)]">
      {/* Lista de notas */}
      <div className={`w-full md:w-64 flex-shrink-0 flex flex-col gap-3 ${seleccionada ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="input pl-8 text-sm"
              placeholder="Buscar…"
            />
          </div>
          <button onClick={() => { setSeleccionada(null); setModalAbierto(true) }} className="btn btn-primary" style={{ padding: '9px' }}>
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1">
          {notasActivas.map(nota => (
            <div
              key={nota.id}
              onClick={() => setSeleccionada(nota)}
              className="rounded-lg p-3 cursor-pointer transition-all"
              style={{
                background: seleccionada?.id === nota.id ? 'var(--accent-muted)' : 'var(--bg-surface)',
                border: `1px solid ${seleccionada?.id === nota.id ? 'var(--border-accent)' : 'var(--border)'}`,
              }}
            >
              <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{nota.titulo}</p>
              <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                {nota.descripcion ? truncate(nota.descripcion, 60) : 'Sin contenido'}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {formatFecha(nota.updated_at, 'd MMM')}
              </p>
            </div>
          ))}
          {notasActivas.length === 0 && (
            <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              <FileText className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Sin notas</p>
            </div>
          )}
        </div>
      </div>

      {/* Vista de nota */}
      <div className={`flex-1 card p-6 overflow-y-auto ${!seleccionada ? 'hidden md:block' : 'block'}`}>
        {seleccionada ? (
          <div>
            <div className="flex items-start justify-between mb-4 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => setSeleccionada(null)}
                  className="md:hidden p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white mr-1 shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="text-lg font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{seleccionada.titulo}</h2>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => { setModalAbierto(true) }} className="btn btn-ghost text-xs">Editar</button>
                <button onClick={() => { archivarItem(seleccionada.id); setSeleccionada(null); }} className="btn btn-ghost text-xs" style={{ color: '#f87171' }}>Archivar</button>
              </div>
            </div>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              Actualizada {formatFecha(seleccionada.updated_at, "d 'de' MMMM · HH:mm")}
            </p>
            <div className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {seleccionada.descripcion || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Nota vacía</span>}
            </div>
          </div>
        ) : (
          <div className="empty-state h-full">
            <FileText className="w-12 h-12" style={{ color: 'var(--text-muted)' }} />
            <p className="font-medium">Selecciona una nota</p>
            <p className="text-sm">O crea una nueva con el botón +</p>
          </div>
        )}
      </div>

      {modalAbierto && (
        <ItemModal
          item={seleccionada ?? undefined}
          proyectos={proyectos}
          tipoDefault="nota"
          onClose={() => setModalAbierto(false)}
        />
      )}
    </div>
  )
}
