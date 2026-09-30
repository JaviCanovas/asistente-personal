'use client'

import { useState, useEffect } from 'react'
import { FolderOpen, Plus, X, Loader2 } from 'lucide-react'
import type { Item, Proyecto } from '@/lib/types'
import { COLORES_PROYECTO } from '@/lib/utils'
import ItemCard from '@/components/items/ItemCard'
import { crearProyecto, archivarProyecto } from '@/lib/actions/proyectos'

interface ProyectosClientProps {
  proyectos: Proyecto[]
  todosLosItems: Item[]
}

export default function ProyectosClient({ proyectos, todosLosItems }: ProyectosClientProps) {
  const [listaProyectos, setListaProyectos] = useState<Proyecto[]>(proyectos)
  const [proyectoActivo, setProyectoActivo] = useState<Proyecto | null>(null)
  const [modalCrear, setModalCrear] = useState(false)
  const [nombreNuevo, setNombreNuevo] = useState('')
  const [descripcionNueva, setDescripcionNueva] = useState('')
  const [colorNuevo, setColorNuevo] = useState(COLORES_PROYECTO[0])
  const [guardando, setGuardando] = useState(false)

  // Sincronizar si cambian los props
  useEffect(() => {
    setListaProyectos(proyectos)
  }, [proyectos])

  const itemsDelProyecto = proyectoActivo
    ? todosLosItems.filter(i => i.proyecto_id === proyectoActivo.id && i.estado !== 'archivado')
    : []

  async function handleCrear() {
    if (!nombreNuevo.trim()) return
    const nombre = nombreNuevo.trim()
    const desc = descripcionNueva.trim() || undefined
    const color = colorNuevo
    const tempId = 'temp-' + Date.now()
    const tempProyecto: Proyecto = {
      id: tempId,
      nombre,
      descripcion: desc,
      color,
      estado: 'activo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    setListaProyectos(prev => [...prev, tempProyecto])
    setModalCrear(false)
    setNombreNuevo('')
    setDescripcionNueva('')

    try {
      const creado = await crearProyecto({ nombre, descripcion: desc, color })
      if (creado?.id) {
        setListaProyectos(prev => prev.map(p => p.id === tempId ? (creado as Proyecto) : p))
      }
    } catch (e) {
      console.error(e)
      setListaProyectos(prev => prev.filter(p => p.id !== tempId))
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <FolderOpen className="w-5 h-5" style={{ color: '#f59e0b' }} />
          Proyectos
        </h1>
        <button onClick={() => setModalCrear(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Nuevo proyecto
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Lista de proyectos */}
        <div className="w-full md:w-56 shrink-0 flex md:flex-col gap-2 overflow-x-auto pb-3 md:pb-0 scrollbar-none">
          {listaProyectos.map(p => {
            const count = todosLosItems.filter(i => i.proyecto_id === p.id && i.estado === 'activo').length
            return (
              <div
                key={p.id}
                onClick={() => setProyectoActivo(proyectoActivo?.id === p.id ? null : p)}
                className="card p-3 cursor-pointer w-44 shrink-0 md:w-auto"
                style={proyectoActivo?.id === p.id
                  ? { borderColor: p.color + '80', boxShadow: `0 0 12px ${p.color}40` }
                  : {}
                }
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: p.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.nombre}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{count} activa{count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
            )
          })}
          {listaProyectos.length === 0 && (
            <p className="text-sm px-2" style={{ color: 'var(--text-muted)' }}>Sin proyectos</p>
          )}
        </div>

        {/* Items del proyecto */}
        <div className="flex-1">
          {proyectoActivo ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ background: proyectoActivo.color }} />
                  <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{proyectoActivo.nombre}</h2>
                </div>
                {proyectoActivo.descripcion && (
                  <span className="text-sm text-neutral-400 sm:before:content-['—_']">{proyectoActivo.descripcion}</span>
                )}
              </div>
              {itemsDelProyecto.length === 0 ? (
                <div className="empty-state">
                  <FolderOpen className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-sm">Este proyecto no tiene items activos</p>
                </div>
              ) : (
                <div className="space-y-2 item-list">
                  {itemsDelProyecto.map(item => (
                    <ItemCard key={item.id} item={item} mostrarProyecto={false} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <FolderOpen className="w-12 h-12" style={{ color: 'var(--text-muted)' }} />
              <p className="font-medium">Selecciona un proyecto</p>
              <p className="text-sm">Para ver sus items</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal crear proyecto */}
      {modalCrear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="card w-full max-w-sm animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="font-semibold text-sm">Nuevo proyecto</h2>
              <button onClick={() => setModalCrear(false)} style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nombre *</label>
                <input value={nombreNuevo} onChange={e => setNombreNuevo(e.target.value)} className="input" placeholder="Nombre del proyecto" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Descripción</label>
                <input value={descripcionNueva} onChange={e => setDescripcionNueva(e.target.value)} className="input" placeholder="Opcional" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORES_PROYECTO.map(c => (
                    <button key={c} onClick={() => setColorNuevo(c)}
                      className="w-7 h-7 rounded-full transition-transform"
                      style={{ background: c, transform: colorNuevo === c ? 'scale(1.3)' : 'scale(1)', boxShadow: colorNuevo === c ? `0 0 8px ${c}` : 'none' }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 p-5 border-t" style={{ borderColor: 'var(--border)' }}>
              <button onClick={() => setModalCrear(false)} className="btn btn-ghost flex-1">Cancelar</button>
              <button onClick={handleCrear} disabled={guardando || !nombreNuevo.trim()} className="btn btn-primary flex-1">
                {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Crear proyecto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
