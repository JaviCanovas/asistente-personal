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
    <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row gap-6 h-[calc(100vh-12rem)] md:h-[calc(100vh-6rem)] pb-6">
      {/* Lista de notas */}
      <div className={`w-full md:w-80 flex-shrink-0 flex flex-col gap-4 ${seleccionada ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-[14px] top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
            <input
              data-testid="input-with-icon"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="input w-full h-11 pl-11 pr-4 text-sm bg-neutral-900/80 border border-white/8 rounded-xl placeholder:text-neutral-500 outline-none"
              placeholder="Buscar…"
            />
          </div>
          <button
            onClick={() => { setSeleccionada(null); setModalAbierto(true) }}
            className="btn btn-primary h-11 w-11 p-0 rounded-xl shrink-0 flex items-center justify-center shadow-md cursor-pointer"
            title="Nueva nota"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* 12px entre tarjetas (gap-3) */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
          {notasActivas.map(nota => {
            const isSel = seleccionada?.id === nota.id
            return (
              <div
                key={nota.id}
                data-testid="card"
                onClick={() => setSeleccionada(nota)}
                className={`card py-4 px-5 rounded-xl cursor-pointer transition-all border space-y-2 ${
                  isSel
                    ? 'border-purple-500/50 bg-neutral-800/80 shadow-md'
                    : 'border-white/8 bg-neutral-900/50 hover:bg-neutral-800/50 hover:border-white/12'
                }`}
              >
                {/* Título: 16px semibold */}
                <p className="text-base font-semibold text-neutral-100 truncate">{nota.titulo}</p>
                {/* Extracto: 14px */}
                <p className="text-sm text-neutral-400 line-clamp-2 leading-relaxed">
                  {nota.descripcion ? truncate(nota.descripcion, 80) : 'Sin contenido'}
                </p>
                {/* Fecha: 12px */}
                <p className="text-xs text-neutral-500">
                  {formatFecha(nota.updated_at, 'd MMM')}
                </p>
              </div>
            )
          })}
          {notasActivas.length === 0 && (
            <div data-testid="card" className="card empty-state text-center py-12 p-6 rounded-2xl">
              <FileText className="w-8 h-8 mx-auto mb-2 text-neutral-600" />
              <p className="text-sm font-semibold text-neutral-200">Sin notas</p>
              <p className="text-xs text-neutral-500 mt-1">Crea tu primera nota con el botón +</p>
            </div>
          )}
        </div>
      </div>

      {/* Vista de nota */}
      <div data-testid="card" className={`flex-1 card p-6 overflow-y-auto ${!seleccionada ? 'hidden md:block' : 'block'}`}>
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
