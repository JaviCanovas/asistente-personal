'use client'

import { useState, useRef, useEffect } from 'react'
import { Inbox, Send, Loader2, X, Check, Edit2, Calendar, Folder, CheckCircle2 } from 'lucide-react'
import type { Item, Proyecto, ClasificacionSugerida, ItemTipo, ItemPrioridad } from '@/lib/types'
import { TIPO_CONFIG, PRIORIDAD_CONFIG, formatFecha, formatFechaRelativa } from '@/lib/utils'
import { crearItem, procesarItemInbox } from '@/lib/actions/items'

interface InboxClientProps {
  items: Item[]
  proyectos: Proyecto[]
  sugerencias: ClasificacionSugerida[]
}

interface ItemConSugerencia {
  item: Item
  sugerencia: ClasificacionSugerida
}

export default function InboxClient({ items: itemsIniciales, proyectos, sugerencias }: InboxClientProps) {
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [procesandoId, setProcesandoId] = useState<string | null>(null)
  
  // Para el modal de edición manual/personalización
  const [itemAEditar, setItemAEditar] = useState<Item | null>(null)
  const [sugerenciaAEditar, setSugerenciaAEditar] = useState<ClasificacionSugerida | null>(null)
  const [aplicandoTipo, setAplicandoTipo] = useState<ItemTipo>('tarea')
  const [aplicandoPrioridad, setAplicandoPrioridad] = useState<ItemPrioridad>('media')
  const [aplicandoProyecto, setAplicandoProyecto] = useState('')
  const [aplicandoFecha, setAplicandoFecha] = useState('')

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-enfocar el input al entrar
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // Las sugerencias vienen ya calculadas desde el servidor (sin chrono-node en el bundle del cliente)
  const itemsConSugerencias: ItemConSugerencia[] = itemsIniciales.map((item, i) => ({
    item,
    sugerencia: sugerencias[i] ?? { tipo: 'tarea', prioridad: 'media', etiquetas: [], confianza: 0.3, razon: '' }
  }))

  async function handleCapturar() {
    if (!texto.trim() || enviando) return
    const textoAEnviar = texto.trim()
    setTexto('') // Feedback instantáneo en la UI
    setEnviando(true)
    try {
      await crearItem({ titulo: textoAEnviar, estado: 'sin_procesar' })
      textareaRef.current?.focus()
    } catch (e) {
      console.error(e)
      setTexto(textoAEnviar) // Revertir si hay error
    } finally {
      setEnviando(false)
    }
  }

  // Aceptar la sugerencia automática directamente (¡Sin abrir modales!)
  async function handleAceptarSugerencia(item: Item, sugerencia: ClasificacionSugerida) {
    setProcesandoId(item.id)
    try {
      // Intentar mapear el nombre del proyecto sugerido al ID real
      const proyectoIdReal = sugerencia.proyecto_sugerido
        ? proyectos.find(p => p.nombre.toLowerCase().includes(sugerencia.proyecto_sugerido!.toLowerCase()))?.id ?? undefined
        : undefined

      await procesarItemInbox(item.id, {
        tipo: sugerencia.tipo,
        prioridad: sugerencia.prioridad,
        proyecto_id: proyectoIdReal,
        fecha_limite: sugerencia.fecha_limite || undefined,
        etiquetas: sugerencia.etiquetas,
      })
    } catch (e) {
      console.error(e)
    } finally {
      setProcesandoId(null)
    }
  }

  // Abrir modal de personalización manual
  function handleAbrirPersonalizar(item: Item, sugerencia: ClasificacionSugerida) {
    setItemAEditar(item)
    setSugerenciaAEditar(sugerencia)
    setAplicandoTipo(sugerencia.tipo)
    setAplicandoPrioridad(sugerencia.prioridad)
    setAplicandoProyecto(sugerencia.proyecto_sugerido
      ? proyectos.find(p => p.nombre.toLowerCase().includes(sugerencia.proyecto_sugerido!.toLowerCase()))?.id ?? ''
      : ''
    )
    setAplicandoFecha(sugerencia.fecha_limite?.split('T')[0] ?? '')
  }

  // Guardar personalización manual
  async function handleGuardarPersonalizacion() {
    if (!itemAEditar) return
    setProcesandoId(itemAEditar.id)
    try {
      await procesarItemInbox(itemAEditar.id, {
        tipo: aplicandoTipo,
        prioridad: aplicandoPrioridad,
        proyecto_id: aplicandoProyecto || undefined,
        fecha_limite: aplicandoFecha || undefined,
        etiquetas: sugerenciaAEditar?.etiquetas ?? [],
      })
      setItemAEditar(null)
      setSugerenciaAEditar(null)
    } catch (e) {
      console.error(e)
    } finally {
      setProcesandoId(null)
    }
  }

  const TIPOS: ItemTipo[] = ['tarea', 'evento', 'idea', 'nota', 'recordatorio']
  const PRIORIDADES: ItemPrioridad[] = ['baja', 'media', 'alta', 'urgente']

  return (
    <div className="max-w-3xl mx-auto px-1 py-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b gap-3" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl flex items-center justify-center animate-pulse-glow" style={{ background: 'var(--accent)' }}>
            <Inbox className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Bandeja de Entrada</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Captura rápida e inteligente con un solo clic</p>
          </div>
        </div>
        <span className="badge font-semibold px-3 py-1 text-xs self-start sm:self-auto" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
          {itemsIniciales.length} sin procesar
        </span>
      </div>

      {/* Captura Rápida Premium */}
      <div className="card p-4 mb-6" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div className="relative flex flex-col gap-3">
          <textarea
            ref={textareaRef}
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleCapturar()
              }
            }}
            className="input w-full resize-none border-none p-0 focus:ring-0 text-base"
            style={{ background: 'transparent', minHeight: '50px', boxShadow: 'none' }}
            placeholder="Añade una idea, recordatorio, reunión o tarea urgente aquí..."
          />
          <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Presiona <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-[10px]">Enter</kbd> para registrar
            </span>
            <button
              onClick={handleCapturar}
              disabled={enviando || !texto.trim()}
              className="btn btn-primary btn-sm flex items-center gap-2"
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Capturar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sección del listado */}
      <div className="section-label mb-4">Clasificación Rápida</div>

      {itemsConSugerencias.length === 0 ? (
        <div className="empty-state card p-10 flex flex-col items-center justify-center text-center">
          <div className="p-4 rounded-full mb-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <p className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>¡Inbox limpio!</p>
          <p className="text-sm max-w-sm" style={{ color: 'var(--text-muted)' }}>Todo lo que capturaste ya tiene un lugar y una fecha asignados.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {itemsConSugerencias.map(({ item, sugerencia }) => {
            const tipoConfig = TIPO_CONFIG[sugerencia.tipo]
            const prioridadConfig = PRIORIDAD_CONFIG[sugerencia.prioridad]
            const estaProcesando = procesandoId === item.id

            return (
              <div
                key={item.id}
                className="card p-5 animate-fade-in transition-all duration-200 border hover:border-neutral-700 relative overflow-hidden"
                style={{ background: 'var(--bg-surface)' }}
              >
                {estaProcesando && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-xs">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
                  </div>
                )}

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Info principal del item */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base mb-1" style={{ color: 'var(--text-primary)' }}>
                      {item.titulo}
                    </p>
                    <p className="text-xs mb-3.5" style={{ color: 'var(--text-muted)' }}>
                      Capturado {formatFecha(item.created_at, 'd MMM · HH:mm')}
                    </p>

                    {/* Sugerencias integradas interactivas */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)', marginRight: 4 }}>Sugerido:</span>
                      
                      {/* Tipo Badge */}
                      <span className={`badge text-xs ${tipoConfig.bg} ${tipoConfig.color}`}>
                        {tipoConfig.emoji} {tipoConfig.label}
                      </span>

                      {/* Prioridad Badge */}
                      <span className={`badge text-xs ${prioridadConfig.color}`} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        <span className={`w-1.5 h-1.5 rounded-full ${prioridadConfig.dot} mr-1`} />
                        {prioridadConfig.label}
                      </span>

                      {/* Proyecto sugerido */}
                      {sugerencia.proyecto_sugerido && (
                        <span className="badge text-xs text-indigo-300" style={{ background: 'var(--accent-muted)', border: '1px solid var(--border-accent)' }}>
                          <Folder className="w-3.5 h-3.5 mr-1" />
                          {sugerencia.proyecto_sugerido}
                        </span>
                      )}

                      {/* Fecha sugerida */}
                      {sugerencia.fecha_limite && (
                        <span className="badge text-xs text-amber-300" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                          <Calendar className="w-3.5 h-3.5 mr-1" />
                          {formatFechaRelativa(sugerencia.fecha_limite)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Botones de acción directos */}
                  <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                    <button
                      onClick={() => handleAbrirPersonalizar(item, sugerencia)}
                      className="btn btn-ghost btn-sm flex items-center gap-1.5 py-2 px-3 text-xs"
                      title="Personalizar datos antes de guardar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleAceptarSugerencia(item, sugerencia)}
                      className="btn btn-primary btn-sm flex items-center gap-1.5 py-2 px-4 text-xs font-semibold"
                      style={{ background: 'var(--accent)' }}
                      title="Aceptar clasificación automática"
                    >
                      <Check className="w-4 h-4" />
                      <span>Confirmar</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal lateral de personalización manual */}
      {itemAEditar && sugerenciaAEditar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(5, 5, 8, 0.85)', backdropFilter: 'blur(6px)' }}
          onClick={e => e.target === e.currentTarget && setItemAEditar(null)}
        >
          <div className="card w-full max-w-lg animate-fade-in overflow-hidden shadow-2xl" style={{ background: 'var(--bg-surface)' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                Personalizar Clasificación
              </h2>
              <button
                onClick={() => setItemAEditar(null)}
                className="p-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Elemento actual */}
              <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <p className="font-medium text-base animate-fade-in" style={{ color: 'var(--text-primary)' }}>{itemAEditar.titulo}</p>
              </div>

              {/* Razón explicada de la sugerencia */}
              <div className="p-4 rounded-xl text-sm animate-fade-in" style={{ background: 'var(--accent-muted)', border: '1px solid var(--border-accent)', color: 'var(--text-accent)' }}>
                <div className="flex gap-2.5 items-start">
                  <span className="text-lg leading-none">💡</span>
                  <div>
                    <span className="font-semibold block mb-0.5">Sugerencia de Hermes:</span>
                    <span className="text-neutral-300">{sugerenciaAEditar.razon}</span>
                  </div>
                </div>
              </div>

              {/* Selección del Tipo */}
              <div>
                <label className="label">Tipo de elemento</label>
                <div className="flex gap-2 flex-wrap">
                  {TIPOS.map(t => {
                    const conf = TIPO_CONFIG[t]
                    const seleccionado = aplicandoTipo === t
                    return (
                      <button
                        key={t}
                        onClick={() => setAplicandoTipo(t)}
                        className="badge cursor-pointer px-3.5 py-2 font-medium text-xs transition-all flex items-center gap-1.5"
                        style={seleccionado
                          ? { background: 'var(--accent)', color: 'white', border: '1px solid var(--accent)' }
                          : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
                        }
                      >
                        <span>{conf.emoji}</span>
                        <span>{conf.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Selección de la Prioridad */}
              <div>
                <label className="label">Prioridad</label>
                <div className="flex gap-2">
                  {PRIORIDADES.map(p => {
                    const seleccionado = aplicandoPrioridad === p
                    return (
                      <button
                        key={p}
                        onClick={() => setAplicandoPrioridad(p)}
                        className="badge cursor-pointer px-4 py-2 font-semibold text-xs flex-1 justify-center capitalize"
                        style={seleccionado
                          ? { background: 'var(--accent)', color: 'white', border: '1px solid var(--accent)' }
                          : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
                        }
                      >
                        {p}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Selección de Proyecto y Fecha límite */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Asignar a Proyecto</label>
                  <select
                    value={aplicandoProyecto}
                    onChange={e => setAplicandoProyecto(e.target.value)}
                    className="input w-full text-sm"
                  >
                    <option value="" style={{ background: '#1a1d26' }}>Sin proyecto</option>
                    {proyectos.map(p => (
                      <option key={p.id} value={p.id} style={{ background: '#1a1d26' }}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Fecha límite / Evento</label>
                  <input
                    type="date"
                    value={aplicandoFecha}
                    onChange={e => setAplicandoFecha(e.target.value)}
                    className="input w-full text-sm"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t" style={{ borderColor: 'var(--border)' }}>
              <button onClick={() => setItemAEditar(null)} className="btn btn-ghost flex-1">Cancelar</button>
              <button
                onClick={handleGuardarPersonalizacion}
                className="btn btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <span>Guardar y Clasificar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
