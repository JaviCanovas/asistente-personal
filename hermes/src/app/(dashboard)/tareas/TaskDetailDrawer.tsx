'use client'

import { useState, useEffect, useRef } from 'react'
import {
  X, Check, Trash2, Calendar, Star, Sun, Plus, CheckCircle2, Circle,
  Tag, Folder, Clock, AlertTriangle, FileText, ArrowRight
} from 'lucide-react'
import type { Item, Proyecto, ItemPrioridad } from '@/lib/types'
import { actualizarItem, eliminarItem, agregarAMiDia, quitarDeMiDia } from '@/lib/actions/items'
import { formatFechaRelativa, formatFecha } from '@/lib/utils'
import type { PasoTarea } from './todoUtils'
import { useToast } from '@/components/ui/Toast'

interface TaskDetailDrawerProps {
  item: Item | null
  proyectos: Proyecto[]
  onClose: () => void
  onUpdate: (updated: Item) => void
  onDelete: (id: string) => void
  onToggleDone: (id: string, hecho: boolean) => void
}

export default function TaskDetailDrawer({
  item,
  proyectos,
  onClose,
  onUpdate,
  onDelete,
  onToggleDone,
}: TaskDetailDrawerProps) {
  const { showToast } = useToast()
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [prioridad, setPrioridad] = useState<ItemPrioridad>('media')
  const [fechaLimite, setFechaLimite] = useState('')
  const [proyectoId, setProyectoId] = useState('')
  const [pasos, setPasos] = useState<PasoTarea[]>([])
  const [nuevoPasoTexto, setNuevoPasoTexto] = useState('')
  const [enMiDia, setEnMiDia] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (item) {
      setTitulo(item.titulo)
      setDescripcion(item.descripcion || '')
      setPrioridad(item.prioridad || 'media')
      setFechaLimite(item.fecha_limite ? item.fecha_limite.split('T')[0] : '')
      setProyectoId(item.proyecto_id || '')
      
      const meta = (item.metadata || {}) as any
      setPasos(Array.isArray(meta.pasos) ? meta.pasos : [])

      const hoyStr = new Date().toISOString().split('T')[0]
      setEnMiDia(meta.mi_dia_fecha === hoyStr)
    }
  }, [item])

  if (!item) return null

  const isHecho = item.estado === 'hecho'

  // Guardar cambios parciales
  async function persistirCambios(cambios: Partial<Item> & { metadata?: any }) {
    if (!item) return
    setGuardando(true)
    try {
      const metadataActualizada = {
        ...(item.metadata || {}),
        ...(cambios.metadata || {}),
      }

      const payload: any = {
        titulo: cambios.titulo !== undefined ? cambios.titulo : titulo,
        descripcion: cambios.descripcion !== undefined ? cambios.descripcion : (descripcion || undefined),
        prioridad: cambios.prioridad !== undefined ? cambios.prioridad : prioridad,
        fecha_limite: cambios.fecha_limite !== undefined ? cambios.fecha_limite : (fechaLimite || undefined),
        proyecto_id: cambios.proyecto_id !== undefined ? cambios.proyecto_id : (proyectoId || undefined),
        metadata: metadataActualizada,
      }

      const updated = await actualizarItem(item.id, payload)
      if (updated) {
        onUpdate(updated)
      }
    } catch (err: any) {
      console.error('Error guardando tarea:', err)
      showToast({ message: 'Error al actualizar la tarea', type: 'error' })
    } finally {
      setGuardando(false)
    }
  }

  // Toggle Hecho
  function handleToggleCompletada() {
    if (!item) return
    onToggleDone(item.id, !isHecho)
  }

  // Toggle Mi Día
  async function handleToggleMiDia() {
    if (!item) return
    const currentItem = item
    const nuevoEnMiDia = !enMiDia
    setEnMiDia(nuevoEnMiDia)
    const hoyStr = new Date().toISOString().split('T')[0]

    try {
      if (nuevoEnMiDia) {
        await agregarAMiDia(currentItem.id, hoyStr)
        const updatedItem: Item = {
          ...currentItem,
          metadata: { ...(currentItem.metadata || {}), mi_dia_fecha: hoyStr }
        }
        onUpdate(updatedItem)
        showToast({ message: 'Añadida a Mi Día', type: 'success' })
      } else {
        await quitarDeMiDia(currentItem.id)
        const newMeta = { ...(currentItem.metadata || {}) } as any
        delete newMeta.mi_dia_fecha
        const updatedItem: Item = { ...currentItem, metadata: newMeta }
        onUpdate(updatedItem)
        showToast({ message: 'Quitada de Mi Día', type: 'info' })
      }
    } catch (err) {
      console.error(err)
      setEnMiDia(!nuevoEnMiDia)
    }
  }

  // Subtareas / Pasos
  function handleAgregarPaso(e: React.FormEvent) {
    e.preventDefault()
    if (!nuevoPasoTexto.trim()) return

    const nuevo: PasoTarea = {
      id: `paso-${Date.now()}`,
      texto: nuevoPasoTexto.trim(),
      completado: false,
    }

    const nuevosPasos = [...pasos, nuevo]
    setPasos(nuevosPasos)
    setNuevoPasoTexto('')
    persistirCambios({ metadata: { pasos: nuevosPasos } })
  }

  function handleTogglePaso(id: string) {
    const nuevosPasos = pasos.map(p => p.id === id ? { ...p, completado: !p.completado } : p)
    setPasos(nuevosPasos)
    persistirCambios({ metadata: { pasos: nuevosPasos } })
  }

  function handleEliminarPaso(id: string) {
    const nuevosPasos = pasos.filter(p => p.id !== id)
    setPasos(nuevosPasos)
    persistirCambios({ metadata: { pasos: nuevosPasos } })
  }

  // Atajos de fecha rápida
  function setFechaRapida(diasDesdeHoy: number) {
    const d = new Date()
    d.setDate(d.getDate() + diasDesdeHoy)
    const fechaStr = d.toISOString().split('T')[0]
    setFechaLimite(fechaStr)
    persistirCambios({ fecha_limite: fechaStr })
  }

  const pasosCompletados = pasos.filter(p => p.completado).length

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer deslizante desde la derecha */}
      <aside
        ref={drawerRef}
        className="fixed top-0 bottom-0 right-0 w-full sm:w-[440px] z-50 flex flex-col bg-[#0e111d] border-l border-white/10 shadow-2xl animate-slide-in overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #101424 0%, #0c0e18 100%)',
        }}
      >
        {/* Cabecera del Drawer */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleCompletada}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isHecho
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'border border-neutral-600 text-transparent hover:border-emerald-400'
              }`}
            >
              <Check className="w-4 h-4 stroke-[3]" />
            </button>
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              {isHecho ? 'Completada' : 'Tarea pendiente'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Título editable */}
          <div>
            <textarea
              rows={2}
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              onBlur={() => persistirCambios({ titulo })}
              placeholder="Título de la tarea..."
              className="w-full bg-transparent text-lg font-bold text-neutral-100 placeholder:text-neutral-600 outline-none resize-none leading-snug border-b border-transparent focus:border-purple-500/40 pb-1"
              style={{
                textDecoration: isHecho ? 'line-through' : 'none',
                opacity: isHecho ? 0.6 : 1,
              }}
            />
          </div>

          {/* Botón rápido "Agregar a Mi Día" estilo Microsoft To Do */}
          <button
            type="button"
            onClick={handleToggleMiDia}
            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
              enMiDia
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-neutral-900/40 border-white/5 text-neutral-300 hover:bg-neutral-900/80 hover:border-white/10'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sun className={`w-4 h-4 ${enMiDia ? 'text-amber-400' : 'text-neutral-400'}`} />
              <span className="text-xs font-semibold">
                {enMiDia ? 'Agregado a Mi Día' : 'Agregar a Mi Día'}
              </span>
            </div>
            {enMiDia && (
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                Hoy
              </span>
            )}
          </button>

          {/* SECCIÓN PASOS / SUBTAREAS */}
          <div className="space-y-3 bg-neutral-900/40 p-4 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-300">
              <span>Pasos ({pasosCompletados}/{pasos.length})</span>
              {pasos.length > 0 && (
                <div className="w-16 h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all duration-300"
                    style={{ width: `${(pasosCompletados / pasos.length) * 100}%` }}
                  />
                </div>
              )}
            </div>

            {/* Listado de pasos */}
            {pasos.length > 0 && (
              <ul className="space-y-2">
                {pasos.map(paso => (
                  <li
                    key={paso.id}
                    className="group flex items-center justify-between gap-2.5 p-2 rounded-xl bg-neutral-950/40 border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleTogglePaso(paso.id)}
                        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                          paso.completado
                            ? 'bg-purple-500 text-white'
                            : 'border border-neutral-600 hover:border-purple-400'
                        }`}
                      >
                        {paso.completado && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </button>
                      <span
                        className={`text-xs truncate transition-all ${
                          paso.completado
                            ? 'line-through text-neutral-500'
                            : 'text-neutral-200'
                        }`}
                      >
                        {paso.texto}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleEliminarPaso(paso.id)}
                      className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 p-1 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Input para nuevo paso */}
            <form onSubmit={handleAgregarPaso} className="flex items-center gap-2 pt-1">
              <Plus className="w-4 h-4 text-purple-400 shrink-0" />
              <input
                type="text"
                value={nuevoPasoTexto}
                onChange={e => setNuevoPasoTexto(e.target.value)}
                placeholder="Agregar paso siguiente..."
                className="w-full bg-transparent text-xs text-neutral-200 placeholder:text-neutral-600 outline-none"
              />
              {nuevoPasoTexto.trim() && (
                <button
                  type="submit"
                  className="text-xs font-semibold text-purple-400 hover:text-purple-300 px-2 py-0.5"
                >
                  Agregar
                </button>
              )}
            </form>
          </div>

          {/* FECHA DE VENCIMIENTO */}
          <div className="space-y-2 bg-neutral-900/40 p-4 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-300">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-400" />
                <span>Fecha de vencimiento</span>
              </div>
              {fechaLimite && (
                <span className="text-[11px] text-sky-400 font-medium">
                  {formatFechaRelativa(fechaLimite) || formatFecha(fechaLimite, 'd MMM')}
                </span>
              )}
            </div>

            {/* Atajos rápidos */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setFechaRapida(0)}
                className="px-2.5 py-1.5 rounded-lg bg-neutral-800/60 hover:bg-neutral-800 text-[11px] text-neutral-300 border border-white/5 transition-colors"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => setFechaRapida(1)}
                className="px-2.5 py-1.5 rounded-lg bg-neutral-800/60 hover:bg-neutral-800 text-[11px] text-neutral-300 border border-white/5 transition-colors"
              >
                Mañana
              </button>
              <button
                type="button"
                onClick={() => setFechaRapida(7)}
                className="px-2.5 py-1.5 rounded-lg bg-neutral-800/60 hover:bg-neutral-800 text-[11px] text-neutral-300 border border-white/5 transition-colors"
              >
                +7 días
              </button>
            </div>

            <div className="pt-2">
              <input
                type="date"
                value={fechaLimite}
                onChange={e => {
                  setFechaLimite(e.target.value)
                  persistirCambios({ fecha_limite: e.target.value || undefined })
                }}
                className="input text-xs py-1.5 w-full"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>

          {/* PRIORIDAD Y PROYECTO */}
          <div className="grid grid-cols-2 gap-3">
            {/* Prioridad */}
            <div className="bg-neutral-900/40 p-3.5 rounded-2xl border border-white/5">
              <label className="text-[11px] font-semibold text-neutral-400 block mb-1.5">
                Prioridad
              </label>
              <select
                value={prioridad}
                onChange={e => {
                  const p = e.target.value as ItemPrioridad
                  setPrioridad(p)
                  persistirCambios({ prioridad: p })
                }}
                className="input text-xs py-1.5"
                style={{ background: '#131726' }}
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>

            {/* Proyecto */}
            <div className="bg-neutral-900/40 p-3.5 rounded-2xl border border-white/5">
              <label className="text-[11px] font-semibold text-neutral-400 block mb-1.5">
                Lista / Proyecto
              </label>
              <select
                value={proyectoId}
                onChange={e => {
                  setProyectoId(e.target.value)
                  persistirCambios({ proyecto_id: e.target.value || undefined })
                }}
                className="input text-xs py-1.5"
                style={{ background: '#131726' }}
              >
                <option value="">Sin proyecto</option>
                {proyectos.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* NOTAS / DESCRIPCIÓN */}
          <div className="bg-neutral-900/40 p-4 rounded-2xl border border-white/5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
              <FileText className="w-4 h-4 text-purple-400" />
              <span>Notas de la tarea</span>
            </div>
            <textarea
              rows={4}
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              onBlur={() => persistirCambios({ descripcion })}
              placeholder="Escribe notas adicionales, enlaces o detalles aquí..."
              className="w-full bg-neutral-950/40 p-3 rounded-xl border border-white/5 text-xs text-neutral-200 placeholder:text-neutral-600 outline-none resize-none focus:border-purple-500/40"
            />
          </div>
        </div>

        {/* Footer del Drawer */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-t border-white/5 bg-neutral-950/50">
          <span className="text-[11px] text-neutral-500">
            Creada {formatFechaRelativa(item.created_at)}
          </span>

          <button
            type="button"
            onClick={async () => {
              if (confirm(`¿Eliminar la tarea "${item.titulo}"?`)) {
                onDelete(item.id)
                onClose()
                try {
                  await eliminarItem(item.id)
                  showToast({ message: 'Tarea eliminada', type: 'info' })
                } catch (e) {
                  console.error(e)
                }
              }
            }}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Eliminar</span>
          </button>
        </div>
      </aside>
    </>
  )
}
