'use client'

import { useState, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Plus,
  Tag,
  AlertCircle,
  X
} from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isToday,
  parseISO
} from 'date-fns'
import { es } from 'date-fns/locale'
import type { Item, Proyecto } from '@/lib/types'
import { TIPO_CONFIG, PRIORIDAD_CONFIG } from '@/lib/utils'
import ItemCard from '@/components/items/ItemCard'
import ItemModal from '@/components/items/ItemModal'
import { encontrarBloquesLibres } from '@/lib/ai/prioritize'

interface CalendarioClientProps {
  eventos: Item[]
  todosItems: Item[]
  proyectos: Proyecto[]
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function CalendarioClient({ eventos, todosItems, proyectos }: CalendarioClientProps) {
  const [fechaActual, setFechaActual] = useState(new Date())
  const [diaSeleccionado, setDiaSeleccionado] = useState(new Date())
  const [vista, setVista] = useState<'mes' | 'semana'>('mes')
  const [itemSeleccionado, setItemSeleccionado] = useState<Item | null>(null)
  const [itemEditar, setItemEditar] = useState<Item | null>(null)
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false)

  // ——— NAVEGACIÓN ———————————————————————————————————————————
  const handlePrev = () => {
    setFechaActual(prev => (vista === 'mes' ? subMonths(prev, 1) : subWeeks(prev, 1)))
  }

  const handleNext = () => {
    setFechaActual(prev => (vista === 'mes' ? addMonths(prev, 1) : addWeeks(prev, 1)))
  }

  const handleHoy = () => {
    setFechaActual(new Date())
    setDiaSeleccionado(new Date())
  }

  // ——— LOGIC PARA VISTA MENSUAL ——————————————————————————————
  const diasMes = useMemo(() => {
    const inicioMes = startOfMonth(fechaActual)
    const finMes = endOfMonth(fechaActual)
    
    // Ajustar para empezar en Lunes (locale es empieza en Lunes, pero startOfWeek usa Sunday por defecto sin config)
    const inicioCalendario = startOfWeek(inicioMes, { weekStartsOn: 1 })
    const finCalendario = endOfWeek(finMes, { weekStartsOn: 1 })

    return eachDayOfInterval({ start: inicioCalendario, end: finCalendario })
  }, [fechaActual])

  // ——— LOGIC PARA VISTA SEMANAL ——————————————————————————————
  const diasSemana = useMemo(() => {
    const inicio = startOfWeek(fechaActual, { weekStartsOn: 1 })
    const fin = endOfWeek(fechaActual, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: inicio, end: fin })
  }, [fechaActual])

  // Obtener items por día (soporta eventos de día único y rangos de fechas de inicio a fin)
  const getItemsDelDia = (dia: Date) => {
    const diaStart = Date.UTC(dia.getFullYear(), dia.getMonth(), dia.getDate())

    return eventos.filter(item => {
      const fechaInicioStr = item.tipo === 'evento' ? item.fecha_evento : item.fecha_limite
      if (!fechaInicioStr) return false
      try {
        const itemInicioObj = parseISO(fechaInicioStr)
        const inicioTime = Date.UTC(itemInicioObj.getFullYear(), itemInicioObj.getMonth(), itemInicioObj.getDate())

        const fechaFinStr = item.fecha_limite || item.fecha_evento
        if (fechaFinStr && fechaFinStr !== fechaInicioStr) {
          const itemFinObj = parseISO(fechaFinStr)
          const finTime = Date.UTC(itemFinObj.getFullYear(), itemFinObj.getMonth(), itemFinObj.getDate())
          return diaStart >= inicioTime && diaStart <= finTime
        }

        return inicioTime === diaStart
      } catch {
        return false
      }
    })
  }

  // Selector reactivo para mantener el item seleccionado sincronizado o cerrarlo si es eliminado/archivado
  const itemSeleccionadoActualizado = useMemo(() => {
    if (!itemSeleccionado) return null
    return eventos.find(e => e.id === itemSeleccionado.id) || null
  }, [itemSeleccionado, eventos])

  // Calcular huecos libres del día seleccionado
  const huecosLibres = useMemo(() => {
    const eventosDia = getItemsDelDia(diaSeleccionado).filter(
      item => item.tipo === 'evento' && item.fecha_evento
    )

    const eventosSimples = eventosDia.map(item => {
      const inicio = new Date(item.fecha_evento!)
      if (item.hora_inicio) {
        const [h, m] = item.hora_inicio.split(':').map(Number)
        inicio.setHours(h, m, 0, 0)
      } else {
        inicio.setHours(9, 0, 0, 0) // Default start if not specified
      }

      const fin = new Date(inicio)
      if (item.hora_fin) {
        const [h, m] = item.hora_fin.split(':').map(Number)
        fin.setHours(h, m, 0, 0)
      } else {
        fin.setHours(inicio.getHours() + 1) // Default duration of 1 hour
      }

      return { inicio, fin }
    })

    return encontrarBloquesLibres(eventosSimples, diaSeleccionado)
  }, [diaSeleccionado, eventos])

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header del Calendario */}
      <div className="page-header pb-4 border-b mb-6" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl animate-pulse-glow" style={{ background: 'rgba(167,139,250,0.1)' }}>
            <Calendar className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-purple-200 via-indigo-200 to-blue-200 bg-clip-text text-transparent">Calendario</h1>
            <p className="text-sm text-neutral-400 font-medium">Tus eventos y tareas programadas</p>
          </div>
        </div>

        {/* Controles de Vista & Navegación */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <div className="flex bg-neutral-950/80 backdrop-blur border border-neutral-800/60 p-1 rounded-xl shadow-inner shrink-0">
            <button
              onClick={() => setVista('mes')}
              className={`w-20 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 shrink-0 ${
                vista === 'mes' ? 'bg-neutral-800 text-white shadow-[0_2px_8px_rgba(0,0,0,0.4)]' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Mes
            </button>
            <button
              onClick={() => setVista('semana')}
              className={`w-20 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 shrink-0 ${
                vista === 'semana' ? 'bg-neutral-800 text-white shadow-[0_2px_8px_rgba(0,0,0,0.4)]' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Semana
            </button>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button onClick={handleHoy} className="btn btn-ghost btn-sm text-xs px-3 py-1.5 rounded-xl border border-neutral-800/80 hover:bg-neutral-800/50 transition-colors font-semibold font-medium shrink-0">
              Hoy
            </button>
            <button onClick={handlePrev} className="btn btn-ghost btn-sm p-2 rounded-xl border border-neutral-800/80 hover:bg-neutral-800/50 transition-colors shrink-0">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={handleNext} className="btn btn-ghost btn-sm p-2 rounded-xl border border-neutral-800/80 hover:bg-neutral-800/50 transition-colors shrink-0">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button onClick={() => setModalNuevoAbierto(true)} className="btn btn-primary btn-sm flex items-center gap-1.5 rounded-xl px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-[0_4px_14px_rgba(99,102,241,0.3)] hover:shadow-[0_4px_20px_rgba(99,102,241,0.45)] hover:-translate-y-0.5 transition-all duration-200 font-bold shrink-0">
            <Plus className="w-4 h-4" />
            <span>Añadir</span>
          </button>
        </div>
      </div>

      {/* Titulo del Periodo Actual */}
      <div className="mb-4">
        <h2 className="text-xl font-bold capitalize text-neutral-100 flex items-center gap-2">
          <span>{format(fechaActual, vista === 'mes' ? 'MMMM yyyy' : "'Semana del' d 'de' MMMM yyyy", { locale: es })}</span>
        </h2>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Cuerpo del Calendario */}
        <div className="flex-1 card p-5 overflow-hidden">
          {/* Cabecera de días de la semana */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="text-xs font-bold text-neutral-400 py-1.5 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Rejilla de días */}
          {vista === 'mes' ? (
            <div className="grid grid-cols-7 gap-2">
              {diasMes.map((dia, idx) => {
                const itemsDelDia = getItemsDelDia(dia)
                const esDeEsteMes = dia.getMonth() === fechaActual.getMonth()
                const hoy = isToday(dia)
                const seleccionado = isSameDay(dia, diaSeleccionado)

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setDiaSeleccionado(dia)
                      setItemSeleccionado(null)
                    }}
                    className={`min-h-[60px] md:min-h-[110px] p-1.5 md:p-2.5 rounded-xl md:rounded-2xl border flex flex-col justify-between transition-all duration-300 ease-out cursor-pointer relative group/cell ${
                      seleccionado
                        ? 'bg-purple-500/10 border-purple-500 shadow-[0_0_15px_rgba(167,139,250,0.25)] ring-1 ring-purple-500'
                        : hoy
                        ? 'bg-purple-500/5 border-purple-500/40 hover:border-purple-500/60 shadow-[inset_0_0_12px_rgba(167,139,250,0.05)]'
                        : esDeEsteMes
                        ? 'bg-neutral-900/40 backdrop-blur-md border-neutral-800/60 hover:bg-neutral-800/20 hover:border-neutral-700/80 hover:shadow-lg hover:shadow-purple-500/5'
                        : 'bg-neutral-950/10 border-transparent opacity-25 hover:opacity-50 hover:bg-neutral-900/10 hover:border-neutral-800/40'
                    }`}
                  >
                    {/* Número del día */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all duration-300 ${
                          hoy 
                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-[0_2px_8px_rgba(167,139,250,0.4)]' 
                            : 'text-neutral-400 group-hover/cell:text-neutral-200'
                        }`}
                      >
                        {dia.getDate()}
                      </span>
                      {itemsDelDia.length > 0 && (
                        <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-full border border-indigo-500/15">
                          {itemsDelDia.length}
                        </span>
                      )}
                    </div>

                    {/* Contenedor de mini eventos */}
                    <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
                      {/* Vista escritorio: Lista de títulos */}
                      <div className="hidden md:block space-y-1">
                        {itemsDelDia.slice(0, 3).map(item => {
                          const conf = TIPO_CONFIG[item.tipo]
                          const isTaskCompleted = item.estado === 'hecho'
                          
                          return (
                            <div
                              key={item.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                setItemSeleccionado(item)
                              }}
                              className={`text-[10px] px-2 py-1 rounded-lg border font-medium truncate cursor-pointer transition-all duration-250 ${
                                isTaskCompleted 
                                  ? 'opacity-40 line-through bg-neutral-900/50 border-neutral-850 text-neutral-500' 
                                  : 'hover:brightness-110 shadow-sm hover:shadow'
                              }`}
                              style={{
                                background: isTaskCompleted ? 'transparent' : conf.bg.split(' ')[0] || 'rgba(99,102,241,0.05)',
                                borderColor: isTaskCompleted ? 'transparent' : conf.bg.split(' ')[1] || 'rgba(99,102,241,0.1)',
                                color: isTaskCompleted ? 'var(--text-muted)' : 'var(--text-primary)'
                              }}
                            >
                              <span className="mr-1 inline-block shrink-0 scale-90">{conf.emoji}</span>
                              <span>{item.titulo}</span>
                            </div>
                          )
                        })}
                        {itemsDelDia.length > 3 && (
                          <div className="text-[9px] text-center text-neutral-500 font-bold bg-neutral-900/40 py-0.5 rounded-md border border-neutral-800/30">
                            + {itemsDelDia.length - 3} más
                          </div>
                        )}
                      </div>

                      {/* Vista móvil: Indicador de puntos */}
                      <div className="flex md:hidden justify-center gap-1 mt-1.5 flex-wrap">
                        {itemsDelDia.slice(0, 3).map(item => {
                          const conf = TIPO_CONFIG[item.tipo]
                          return (
                            <span
                              key={item.id}
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{
                                background: item.estado === 'hecho' ? '#64748b' : conf.bg.split(' ')[0] || 'var(--accent)'
                              }}
                            />
                          )
                        })}
                        {itemsDelDia.length > 3 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" title={`${itemsDelDia.length} items`} />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            // Vista Semanal
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3.5 min-h-[350px]">
              {diasSemana.map((dia, idx) => {
                const itemsDelDia = getItemsDelDia(dia)
                const hoy = isToday(dia)
                const seleccionado = isSameDay(dia, diaSeleccionado)

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setDiaSeleccionado(dia)
                      setItemSeleccionado(null)
                    }}
                    className={`p-3.5 rounded-2xl border flex flex-col cursor-pointer transition-all duration-300 ease-out ${
                      seleccionado
                        ? 'bg-purple-500/10 border-purple-500 shadow-[0_0_15px_rgba(167,139,250,0.25)] ring-1 ring-purple-500'
                        : hoy
                        ? 'bg-purple-500/5 border-purple-500/40 hover:border-purple-500/60 shadow-[inset_0_0_12px_rgba(167,139,250,0.05)]'
                        : 'bg-neutral-900/40 backdrop-blur-md border-neutral-800/60 hover:bg-neutral-800/20 hover:border-neutral-700/80 hover:shadow-lg'
                    }`}
                  >
                    <div className="text-center pb-2.5 border-b border-neutral-800/60 mb-3.5">
                      <p className="text-xs font-bold text-neutral-400 capitalize">{format(dia, 'eee', { locale: es })}</p>
                      <p className={`text-base font-black w-8 h-8 mx-auto flex items-center justify-center rounded-full mt-1.5 transition-all duration-300 ${
                        hoy 
                          ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-[0_2px_8px_rgba(167,139,250,0.4)]' 
                          : 'text-neutral-200'
                      }`}>
                        {dia.getDate()}
                      </p>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                      {itemsDelDia.map(item => {
                        const conf = TIPO_CONFIG[item.tipo]
                        const isTaskCompleted = item.estado === 'hecho'
                        
                        return (
                          <div
                            key={item.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              setItemSeleccionado(item)
                            }}
                            className={`text-xs p-2.5 rounded-xl border font-semibold cursor-pointer transition-all duration-200 ${
                              isTaskCompleted 
                                ? 'opacity-40 line-through bg-neutral-900/50 border-neutral-800 text-neutral-500' 
                                : 'hover:brightness-110 shadow-sm hover:shadow'
                            }`}
                            style={{
                              background: isTaskCompleted ? 'transparent' : conf.bg.split(' ')[0] || 'rgba(99,102,241,0.05)',
                              borderColor: isTaskCompleted ? 'transparent' : conf.bg.split(' ')[1] || 'rgba(99,102,241,0.1)',
                              color: isTaskCompleted ? 'var(--text-muted)' : 'var(--text-primary)'
                            }}
                          >
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span>{conf.emoji}</span>
                              <span className="text-[9px] uppercase tracking-wider font-extrabold text-neutral-300">{conf.label}</span>
                            </div>
                            <p className="truncate text-xs font-medium text-neutral-200">{item.titulo}</p>
                          </div>
                        )
                      })}
                      {itemsDelDia.length === 0 && (
                        <div className="text-[10px] text-center text-neutral-600 italic py-6 md:pt-16 font-medium">
                          Libre
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Panel lateral: Detalle de Item o Análisis del Día Seleccionado */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
          {itemSeleccionadoActualizado ? (
            <div className="card p-5 animate-fade-in border-purple-500/20 shadow-lg relative overflow-hidden">
              {/* Fondo decorativo sutil */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-800/80 relative z-10">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Detalles del Item</span>
                <button
                  onClick={() => setItemSeleccionado(null)}
                  className="p-1 rounded hover:bg-neutral-800 transition-colors"
                >
                  <X className="w-4 h-4 text-neutral-400" />
                </button>
              </div>
              <div className="relative z-10">
                <ItemCard 
                  item={itemSeleccionadoActualizado} 
                  onEdit={(item) => setItemEditar(item)}
                  onDeleted={() => setItemSeleccionado(null)}
                  onArchived={() => setItemSeleccionado(null)}
                />
              </div>
              <button
                onClick={() => setItemSeleccionado(null)}
                className="btn btn-ghost w-full mt-4 text-xs py-2 rounded-xl border border-neutral-800 hover:bg-neutral-800/50 transition-colors font-semibold"
              >
                Cerrar Detalles
              </button>
            </div>
          ) : (
            <div className="card p-5 animate-fade-in flex flex-col gap-4 relative overflow-hidden">
              {/* Fondo decorativo */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

              <div className="pb-2 border-b border-neutral-800/80">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Día: {format(diaSeleccionado, "d 'de' MMMM", { locale: es })}
                </span>
              </div>

              {/* Tareas y eventos del día */}
              <div>
                <h3 className="text-xs font-bold text-neutral-300 mb-2.5 flex items-center gap-1.5">
                  <span>📅</span>
                  <span>Eventos y Tareas ({getItemsDelDia(diaSeleccionado).length})</span>
                </h3>
                {getItemsDelDia(diaSeleccionado).length === 0 ? (
                  <div className="p-4 rounded-xl bg-neutral-950/20 border border-neutral-900 text-center">
                    <p className="text-xs text-neutral-500 italic">No hay nada programado.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {getItemsDelDia(diaSeleccionado).map(item => (
                      <div
                        key={item.id}
                        onClick={() => setItemSeleccionado(item)}
                        className="text-xs p-2.5 rounded-xl border border-neutral-800/60 bg-neutral-950/30 hover:bg-neutral-800/50 hover:border-neutral-700/60 cursor-pointer flex items-center gap-2 truncate transition-all duration-205"
                      >
                        <span className="shrink-0 scale-105">{TIPO_CONFIG[item.tipo].emoji}</span>
                        <span className="text-neutral-200 truncate font-medium">{item.titulo}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Buscador de Huecos Libres e Inteligencia de Foco */}
              <div className="pt-3 border-t border-neutral-800/80">
                <div className="flex items-center gap-1.5 mb-3">
                  <Clock className="w-4 h-4 text-purple-400 animate-pulse" />
                  <h3 className="text-xs font-bold text-neutral-200">Recomendaciones de Enfoque</h3>
                </div>
                
                {huecosLibres.length === 0 ? (
                  <div className="p-3 rounded-xl bg-neutral-950/20 border border-neutral-900">
                    <p className="text-xs text-neutral-500 italic text-center">Sin huecos libres disponibles hoy.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {huecosLibres.map((bloque, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border text-xs flex flex-col gap-1 transition-all duration-300 ${
                          bloque.adecuado_para_trabajo_profundo
                            ? 'bg-purple-950/15 border-purple-500/30 text-purple-200 shadow-[0_2px_8px_rgba(167,139,250,0.05)]'
                            : 'bg-neutral-950/30 border-neutral-800/80 text-neutral-300'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="flex items-center gap-1">
                            {bloque.adecuado_para_trabajo_profundo ? '🧠' : '⏰'}
                            {format(bloque.inicio, 'HH:mm')} - {format(bloque.fin, 'HH:mm')}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-neutral-900 text-neutral-400 font-semibold">
                            {bloque.duracion_min} min
                          </span>
                        </div>
                        {bloque.adecuado_para_trabajo_profundo && (
                          <div className="text-[9px] text-purple-400 font-bold mt-1 flex items-center gap-1 bg-purple-500/10 px-2 py-0.5 rounded-full w-fit">
                            <span>Deep Work Recomendado</span>
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="p-3 rounded-xl bg-indigo-950/5 border border-indigo-500/10 mt-1">
                      <p className="text-[10px] text-neutral-400 leading-relaxed">
                        💡 <em>Hermes sugiere reservar bloques continuos de más de 90 minutos para trabajo profundo (sin distracciones).</em>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Botón rápido para programar en este día */}
              <button
                onClick={() => setModalNuevoAbierto(true)}
                className="btn btn-ghost btn-sm w-full mt-2 text-xs flex items-center justify-center gap-1.5 rounded-xl border border-neutral-800 hover:bg-neutral-800/50 transition-colors font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Programar en este día</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nuevo Item */}
      {modalNuevoAbierto && (
        <ItemModal
          proyectos={proyectos}
          tipoDefault="evento"
          onClose={() => setModalNuevoAbierto(false)}
        />
      )}

      {/* Modal Editar Item */}
      {itemEditar && (
        <ItemModal
          item={itemEditar}
          proyectos={proyectos}
          onClose={() => setItemEditar(null)}
        />
      )}
    </div>
  )
}
