'use client'

import { useState, useEffect } from 'react'
import { X, Folder, BookOpen, Check, Trash2 } from 'lucide-react'
import type { Proyecto } from '@/lib/types'
import { crearProyecto, actualizarProyecto, eliminarProyecto } from '@/lib/actions/proyectos'
import { useToast } from '@/components/ui/Toast'

export const PALETA_COLORES = [
  { name: 'Violeta', hex: '#8b5cf6' },
  { name: 'Azul cielo', hex: '#38bdf8' },
  { name: 'Esmeralda', hex: '#10b981' },
  { name: 'Ámbar', hex: '#f59e0b' },
  { name: 'Rosa', hex: '#ec4899' },
  { name: 'Rojo', hex: '#ef4444' },
  { name: 'Índigo', hex: '#6366f1' },
  { name: 'Verde menta', hex: '#14b8a6' },
]

interface NewListModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (nuevo: Proyecto) => void
  onUpdated?: (actualizado: Proyecto) => void
  onDeleted?: (id: string) => void
  proyectoEditar?: Proyecto | null
}

export default function NewListModal({
  isOpen,
  onClose,
  onCreated,
  onUpdated,
  onDeleted,
  proyectoEditar,
}: NewListModalProps) {
  const { showToast } = useToast()
  const [nombre, setNombre] = useState('')
  const [color, setColor] = useState(PALETA_COLORES[0].hex)
  const [descripcion, setDescripcion] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false)

  const esEdicion = !!proyectoEditar

  useEffect(() => {
    if (proyectoEditar) {
      setNombre(proyectoEditar.nombre)
      setColor(proyectoEditar.color || PALETA_COLORES[0].hex)
      setDescripcion(proyectoEditar.descripcion || '')
    } else {
      setNombre('')
      setColor(PALETA_COLORES[0].hex)
      setDescripcion('')
    }
    setConfirmandoEliminar(false)
  }, [proyectoEditar, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const nombreLimpio = nombre.trim()
    if (!nombreLimpio || guardando) return

    setGuardando(true)
    try {
      if (esEdicion && proyectoEditar) {
        const actualizado = await actualizarProyecto(proyectoEditar.id, {
          nombre: nombreLimpio,
          color,
          descripcion: descripcion.trim() || undefined,
        })
        onUpdated?.(actualizado)
        showToast({ message: `Lista "${nombreLimpio}" actualizada`, type: 'success' })
      } else {
        const creado = await crearProyecto({
          nombre: nombreLimpio,
          color,
          descripcion: descripcion.trim() || undefined,
        })
        onCreated(creado)
        showToast({ message: `Lista "${nombreLimpio}" creada con éxito`, type: 'success' })
      }
      onClose()
    } catch (err: any) {
      console.error('Error guardando lista:', err)
      showToast({ message: 'Error al guardar la lista', type: 'error' })
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async () => {
    if (!proyectoEditar || guardando) return
    setGuardando(true)
    try {
      await eliminarProyecto(proyectoEditar.id)
      onDeleted?.(proyectoEditar.id)
      showToast({ message: `Lista "${proyectoEditar.nombre}" eliminada`, type: 'info' })
      onClose()
    } catch (err: any) {
      console.error('Error eliminando lista:', err)
      showToast({ message: 'Error al eliminar la lista', type: 'error' })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl p-6 space-y-5 text-neutral-100 animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header del Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
              style={{ background: `${color}25`, color: color, border: `1px solid ${color}40` }}
            >
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ letterSpacing: '0px' }}>
                {esEdicion ? 'Editar Lista / Asignatura' : 'Nueva Lista o Asignatura'}
              </h2>
              <p className="text-xs text-neutral-400">
                Organiza tus tareas estilo Microsoft To Do
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre de la Asignatura / Lista */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Nombre de la asignatura o lista *
            </label>
            <input
              type="text"
              autoFocus
              required
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Aprendizaje Estadístico, TFG, Inglés..."
              className="input w-full bg-neutral-950/70 border-white/10 rounded-xl px-3.5 py-2.5 text-sm placeholder:text-neutral-500 focus:border-purple-500/60"
            />
          </div>

          {/* Selector de Color */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">
              Color identificador
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
              {PALETA_COLORES.map(c => {
                const isSelected = color === c.hex
                return (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    title={c.name}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                      isSelected
                        ? 'ring-2 ring-white scale-110 shadow-lg'
                        : 'border-transparent hover:scale-105 opacity-80 hover:opacity-100'
                    }`}
                    style={{ background: c.hex }}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Descripción opcional */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Descripción o notas (opcional)
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Ej: Asignatura 2º cuatrimestre, profesor, aula..."
              className="input w-full bg-neutral-950/70 border-white/10 rounded-xl px-3.5 py-2 text-xs placeholder:text-neutral-500"
            />
          </div>

          {/* Botones de Acción */}
          <div className="pt-3 border-t border-white/8 flex items-center justify-between gap-3">
            {esEdicion ? (
              confirmandoEliminar ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleEliminar}
                    disabled={guardando}
                    className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Confirmar borrar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmandoEliminar(false)}
                    className="text-xs text-neutral-400 hover:text-white px-2 py-1"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmandoEliminar(true)}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar lista</span>
                </button>
              )
            ) : <div />}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!nombre.trim() || guardando}
                className="btn btn-primary px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed shadow-md text-white cursor-pointer"
                style={{ background: color }}
              >
                <span>{guardando ? 'Guardando...' : esEdicion ? 'Actualizar' : 'Crear lista'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
