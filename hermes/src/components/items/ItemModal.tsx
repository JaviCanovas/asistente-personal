'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Sparkles, Loader2 } from 'lucide-react'
import type { Item, ItemTipo, ItemPrioridad, Proyecto, ClasificacionSugerida } from '@/lib/types'
import { TIPO_CONFIG, COLORES_PROYECTO } from '@/lib/utils'
import { crearItem, actualizarItem, clasificarItemHeuristico } from '@/lib/actions/items'

interface ItemModalProps {
  item?: Item
  proyectos: Proyecto[]
  onClose: () => void
  tipoDefault?: ItemTipo
}

const TIPOS: ItemTipo[] = ['tarea', 'evento', 'idea', 'nota', 'recordatorio']
const PRIORIDADES: ItemPrioridad[] = ['baja', 'media', 'alta', 'urgente']
const ETIQUETAS_SUGERIDAS = ['trabajo', 'personal', 'salud', 'finanzas', 'aprendizaje', 'tecnología', 'urgente']

export default function ItemModal({ item, proyectos, onClose, tipoDefault = 'tarea' }: ItemModalProps) {
  const [titulo, setTitulo]           = useState(item?.titulo ?? '')
  const [tipo, setTipo]               = useState<ItemTipo>(item?.tipo ?? tipoDefault)
  const [descripcion, setDescripcion] = useState(item?.descripcion ?? '')
  const [prioridad, setPrioridad]     = useState<ItemPrioridad>(item?.prioridad ?? 'media')
  const [fechaLimite, setFechaLimite] = useState(item?.fecha_limite?.split('T')[0] ?? '')
  const [fechaEvento, setFechaEvento] = useState(item?.fecha_evento?.split('T')[0] ?? '')
  const [proyectoId, setProyectoId]   = useState(item?.proyecto_id ?? '')
  const [etiquetas, setEtiquetas]     = useState<string[]>(item?.etiquetas ?? [])
  const [clasificacion, setClasificacion] = useState<ClasificacionSugerida | null>(null)
  const [clasificando, setClasificando]   = useState(false)
  const [guardando, setGuardando]         = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  async function handleClasificar() {
    if (!titulo.trim()) return
    setClasificando(true)
    try {
      const result = await clasificarItemHeuristico(titulo + ' ' + descripcion)
      setClasificacion(result)
      // Aplicar sugerencias automáticamente
      setTipo(result.tipo)
      setPrioridad(result.prioridad)
      if (result.fecha_limite) setFechaLimite(result.fecha_limite.split('T')[0])
      if (result.etiquetas.length > 0) setEtiquetas(prev => [...new Set([...prev, ...result.etiquetas])])
    } finally {
      setClasificando(false)
    }
  }

  async function handleGuardar() {
    if (!titulo.trim()) return
    setGuardando(true)
    try {
      const data = {
        titulo:       titulo.trim(),
        tipo,
        descripcion:  descripcion.trim() || undefined,
        prioridad,
        fecha_limite: fechaLimite || undefined,
        fecha_evento: fechaEvento || undefined,
        proyecto_id:  proyectoId || undefined,
        etiquetas,
        estado:       (item?.estado ?? 'activo') as any,
      }
      if (item) {
        await actualizarItem(item.id, data)
      } else {
        await crearItem(data)
      }
      onClose()
    } finally {
      setGuardando(false)
    }
  }

  function toggleEtiqueta(tag: string) {
    setEtiquetas(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="card w-full max-w-lg animate-fade-in overflow-y-auto"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {item ? 'Editar item' : 'Nuevo item'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Título */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Título *
            </label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGuardar()}
                className="input flex-1"
                placeholder="¿Qué tienes que hacer?"
              />
              <button
                onClick={handleClasificar}
                disabled={clasificando || !titulo.trim()}
                className="btn btn-ghost shrink-0"
                title="Clasificar con heurística"
              >
                {clasificando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Sugerencia de clasificación */}
          {clasificacion && (
            <div
              className="rounded-lg p-3 text-xs"
              style={{ background: 'var(--accent-muted)', border: '1px solid var(--border-accent)', color: 'var(--text-accent)' }}
            >
              <span className="font-medium">💡 Sugerido:</span> {clasificacion.razon}
            </div>
          )}

          {/* Tipo */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Tipo</label>
            <div className="flex gap-1.5 flex-wrap">
              {TIPOS.map(t => {
                const conf = TIPO_CONFIG[t]
                const activo = tipo === t
                return (
                  <button
                    key={t}
                    onClick={() => setTipo(t)}
                    className="badge cursor-pointer transition-all"
                    style={
                      activo
                        ? { background: 'var(--accent)', color: 'white', border: '1px solid var(--accent)' }
                        : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
                    }
                  >
                    {conf.emoji} {conf.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Descripción</label>
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              className="input"
              rows={3}
              placeholder="Detalles adicionales…"
            />
          </div>

          {/* Prioridad + Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Prioridad</label>
              <select value={prioridad} onChange={e => setPrioridad(e.target.value as ItemPrioridad)} className="input">
                {PRIORIDADES.map(p => (
                  <option key={p} value={p} style={{ background: '#1a1d26' }}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                {tipo === 'evento' ? 'Fecha del evento' : 'Fecha límite'}
              </label>
              <input
                type="date"
                value={tipo === 'evento' ? fechaEvento : fechaLimite}
                onChange={e => tipo === 'evento' ? setFechaEvento(e.target.value) : setFechaLimite(e.target.value)}
                className="input"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>

          {/* Proyecto */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Proyecto</label>
            <select value={proyectoId} onChange={e => setProyectoId(e.target.value)} className="input">
              <option value="" style={{ background: '#1a1d26' }}>Sin proyecto</option>
              {proyectos.map(p => (
                <option key={p.id} value={p.id} style={{ background: '#1a1d26' }}>{p.nombre}</option>
              ))}
            </select>
          </div>

          {/* Etiquetas */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Etiquetas</label>
            <div className="flex gap-1.5 flex-wrap">
              {ETIQUETAS_SUGERIDAS.map(tag => {
                const activa = etiquetas.includes(tag)
                return (
                  <button
                    key={tag}
                    onClick={() => toggleEtiqueta(tag)}
                    className="badge cursor-pointer transition-all text-xs"
                    style={
                      activa
                        ? { background: 'var(--accent-muted)', color: 'var(--accent-hover)', border: '1px solid var(--border-accent)' }
                        : { background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                    }
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-5 border-t" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose} className="btn btn-ghost flex-1">Cancelar</button>
          <button
            onClick={handleGuardar}
            disabled={guardando || !titulo.trim()}
            className="btn btn-primary flex-1"
          >
            {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            {item ? 'Guardar cambios' : 'Crear item'}
          </button>
        </div>
      </div>
    </div>
  )
}
