'use client'

import { useState } from 'react'
import { CheckSquare, Plus } from 'lucide-react'
import type { Item, Proyecto, ItemEstado } from '@/lib/types'
import ItemCard from '@/components/items/ItemCard'
import ItemModal from '@/components/items/ItemModal'

const FILTROS_ESTADO: { label: string; value: ItemEstado | 'todos' }[] = [
  { label: 'Todas', value: 'todos' },
  { label: 'Activas', value: 'activo' },
  { label: 'Hechas', value: 'hecho' },
  { label: 'Archivadas', value: 'archivado' },
]

export default function TareasClient({ tareas, proyectos }: { tareas: Item[]; proyectos: Proyecto[] }) {
  const [estadoFiltro, setEstadoFiltro] = useState<ItemEstado | 'todos'>('activo')
  const [proyectoFiltro, setProyectoFiltro] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [itemEditar, setItemEditar] = useState<Item | undefined>()
  const [busqueda, setBusqueda] = useState('')

  const tareasFiltradas = tareas.filter(t => {
    if (estadoFiltro !== 'todos' && t.estado !== estadoFiltro) return false
    if (proyectoFiltro && t.proyecto_id !== proyectoFiltro) return false
    if (busqueda && !t.titulo.toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  })

  return (
    <div className="max-w-2xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">
          <CheckSquare className="w-5 h-5" style={{ color: '#60a5fa' }} />
          Tareas
        </h1>
        <button onClick={() => { setItemEditar(undefined); setModalAbierto(true) }} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Nueva tarea
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-6">
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="input flex-1 min-w-[140px]"
          placeholder="Buscar…"
        />
        <div className="flex gap-1 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none shrink-0">
          {FILTROS_ESTADO.map(f => (
            <button
              key={f.value}
              onClick={() => setEstadoFiltro(f.value)}
              className="btn text-xs py-2 px-3.5 shrink-0"
              style={estadoFiltro === f.value
                ? { background: 'var(--accent)', color: 'white' }
                : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
              }
            >
              {f.label}
            </button>
          ))}
        </div>
        <select value={proyectoFiltro} onChange={e => setProyectoFiltro(e.target.value)} className="input sm:w-44 shrink-0">
          <option value="" style={{ background: '#1a1d26' }}>Todos los proyectos</option>
          {proyectos.map(p => <option key={p.id} value={p.id} style={{ background: '#1a1d26' }}>{p.nombre}</option>)}
        </select>
      </div>

      {tareasFiltradas.length === 0 ? (
        <div className="empty-state">
          <CheckSquare className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />
          <p className="font-medium">Sin tareas</p>
          <p className="text-sm">Crea una nueva tarea o ajusta los filtros.</p>
        </div>
      ) : (
        <div className="space-y-2 item-list">
          {tareasFiltradas.map(tarea => (
            <ItemCard key={tarea.id} item={tarea} onEdit={item => { setItemEditar(item); setModalAbierto(true) }} />
          ))}
        </div>
      )}

      {modalAbierto && (
        <ItemModal
          item={itemEditar}
          proyectos={proyectos}
          tipoDefault="tarea"
          onClose={() => setModalAbierto(false)}
        />
      )}
    </div>
  )
}
