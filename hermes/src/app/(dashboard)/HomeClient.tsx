'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Play, ArrowRight, Dumbbell, CheckCircle2, Circle, Calendar,
  Plus, Check, Sun, ChevronDown
} from 'lucide-react'
import type { ItemPriorizado, PlantillaGym, RutinaGym, Item } from '@/lib/types'
import { marcarHecho, crearItem, agregarAMiDia } from '@/lib/actions/items'
import { getHomeData } from '@/lib/actions/home'
import { categorizarEvento, getEtiquetaFechaRelativa } from '@/lib/ai/prioritize'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/Toast'
import { format, addDays } from 'date-fns'

interface HomeClientProps {
  priorizados: ItemPriorizado[]
  proximosEventos?: Item[]
  plantillas: PlantillaGym[]
  rutinas: RutinaGym[]
}

function toSentenceCase(str: string): string {
  if (!str) return ''
  const s = str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  return s
    .replace(/(:\s*)(\w)/g, (_, sep, l) => sep + l.toUpperCase())
    .replace(/(\(\s*)(\w)/g, (_, sep, l) => sep + l.toUpperCase())
}

export default function HomeClient({
  priorizados,
  proximosEventos = [],
  plantillas,
  rutinas,
}: HomeClientProps) {
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  // Consulta persistida en IndexedDB: refresco inmediato sin bloqueo
  const { data: homeData, isFetching } = useQuery({
    queryKey: ['home-data'],
    queryFn: () => getHomeData(),
    initialData: {
      priorizados,
      proximosEventos,
      plantillas,
      rutinas,
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const priorizadosActuales = priorizados ?? homeData?.priorizados
  const proximosActuales = proximosEventos ?? homeData?.proximosEventos
  const plantillasActuales = plantillas ?? homeData?.plantillas
  const rutinasActuales = rutinas ?? homeData?.rutinas

  const [itemsHoy, setItemsHoy] = useState<ItemPriorizado[]>(priorizadosActuales)
  const [itemsProximos, setItemsProximos] = useState<Item[]>(proximosActuales)
  const [filtroEventos, setFiltroEventos] = useState<'todos' | 'examenes' | 'hoy'>('todos')
  const [expandedEventoId, setExpandedEventoId] = useState<string | null>(null)
  const [quickInput, setQuickInput] = useState('')
  const [isCreatingQuick, setIsCreatingQuick] = useState(false)

  // Sincronizar de inmediato cuando el componente recibe props actualizadas desde el servidor
  useEffect(() => {
    if (priorizados) {
      setItemsHoy(priorizados)
    }
    if (proximosEventos) {
      setItemsProximos(proximosEventos)
    }
  }, [priorizados, proximosEventos])

  // Sincronizar items locales cuando React Query finaliza la revalidación en background
  useEffect(() => {
    if (homeData?.priorizados) {
      setItemsHoy(homeData.priorizados)
    }
    if (homeData?.proximosEventos) {
      setItemsProximos(homeData.proximosEventos)
    }
  }, [homeData?.priorizados, homeData?.proximosEventos])

  const hoy = new Date()
  const hoyStr = format(hoy, 'yyyy-MM-dd')
  const hora = hoy.getHours()

  // Saludo dinámico según la hora del día
  const saludo =
    hora >= 6 && hora < 12
      ? { texto: '¡Buenos días, Javier!', icono: '☀️' }
      : hora >= 12 && hora < 20
      ? { texto: '¡Buenas tardes, Javier!', icono: '🌤️' }
      : { texto: '¡Buenas noches, Javier!', icono: '🌙' }

  // Formato de fecha completo en español
  const opcionesFecha: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }
  const fechaFormateada = hoy.toLocaleDateString('es-ES', opcionesFecha)
  const fechaCapitalizada = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1)

  // Acciones: marcar tarea hecha con actualización optimista inmediata (<16ms)
  const handleCheckItem = (itemId: string) => {
    const itemTarget = itemsHoy.find(i => i.item.id === itemId)
    const proximoTarget = itemsProximos.find(i => i.id === itemId)
    if (!itemTarget && !proximoTarget) return

    if (itemTarget) {
      setItemsHoy(prev => prev.filter(i => i.item.id !== itemId))
    }
    if (proximoTarget) {
      setItemsProximos(prev => prev.filter(i => i.id !== itemId))
    }

    queryClient.setQueryData(['home-data'], (old: any) => {
      if (!old) return old
      return {
        ...old,
        priorizados: old.priorizados?.filter((p: ItemPriorizado) => p.item.id !== itemId) ?? [],
        proximosEventos: old.proximosEventos?.filter((i: Item) => i.id !== itemId) ?? [],
      }
    })

    const titulo = itemTarget?.item.titulo || proximoTarget?.titulo || 'Tarea'

    showToast({
      message: `Completada: "${titulo}"`,
      type: 'success',
      duration: 5000,
      action: {
        label: 'Deshacer',
        onClick: async () => {
          if (itemTarget) setItemsHoy(prev => [...prev, itemTarget])
          if (proximoTarget) setItemsProximos(prev => [...prev, proximoTarget])
          try {
            await marcarHecho(itemId, false)
          } catch (e) {
            console.error(e)
          }
        },
      },
    })

    marcarHecho(itemId, true).catch(err => {
      console.error('Error completando tarea en background:', err)
      if (itemTarget) setItemsHoy(prev => [...prev, itemTarget])
      if (proximoTarget) setItemsProximos(prev => [...prev, proximoTarget])
      showToast({ message: 'Error al guardar. Se restauró la tarea.', type: 'error' })
    })
  }

  // Creación rápida de tarea desde el dashboard (asignada a Mi Día para hoy)
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const titulo = quickInput.trim()
    if (!titulo || isCreatingQuick) return

    setIsCreatingQuick(true)
    const tempId = `temp-${Date.now()}`
    const nuevoItem: Item = {
      id: tempId,
      tipo: 'tarea',
      titulo,
      estado: 'activo',
      prioridad: 'media',
      etiquetas: [],
      origen: 'web',
      metadata: { mi_dia_fecha: hoyStr },
      fecha_limite: hoyStr,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Actualización optimista en la lista de prioridades de hoy con alta prioridad de Mi Día
    setItemsHoy(prev => [{ item: nuevoItem, puntuacion: 1030, razon: 'En Mi Día', esMiDia: true }, ...prev])
    setQuickInput('')

    try {
      const created = await crearItem({
        titulo,
        tipo: 'tarea',
        estado: 'activo',
        prioridad: 'media',
        fecha_limite: hoyStr,
      })
      if (created) {
        await agregarAMiDia(created.id, hoyStr)
        const itemActualizado: Item = {
          ...created,
          metadata: { ...(created.metadata || {}), mi_dia_fecha: hoyStr },
        }
        setItemsHoy(prev => prev.map(p => p.item.id === tempId ? { ...p, item: itemActualizado, esMiDia: true } : p))
      }
      showToast({ message: 'Tarea añadida a Mi Día', type: 'success' })
    } catch (err: any) {
      console.error(err)
      setItemsHoy(prev => prev.filter(p => p.item.id !== tempId))
      showToast({ message: 'Error al crear la tarea', type: 'error' })
    } finally {
      setIsCreatingQuick(false)
    }
  }

  // Identificar si una tarea pertenece al apartado "Mi Día" de hoy
  const esItemDeMiDia = (item: Item) => {
    const f = (item.metadata as any)?.mi_dia_fecha
    return f === hoyStr || (typeof f === 'string' && f.startsWith(hoyStr))
  }

  // Filtrar tareas estrictamente para hoy (las de Mi Día siempre se incluyen; para el resto: de hoy, vencidas o sin fecha límite, nunca fechas futuras)
  const tareasHoy = itemsHoy.filter(({ item, esMiDia }) => {
    if (item.tipo !== 'tarea' || item.estado === 'hecho' || item.estado === 'archivado') return false
    if (esMiDia || esItemDeMiDia(item)) return true
    const fecha = item.fecha_limite || item.fecha_evento
    if (fecha) {
      const fechaCorta = fecha.slice(0, 10)
      if (fechaCorta > hoyStr) return false
    }
    return true
  })

  // Helper robusto para obtener orden numérico
  const getMiDiaOrden = (item: Item) => {
    const val = (item.metadata as any)?.mi_dia_orden
    if (val !== undefined && val !== null && val !== '') {
      const num = Number(val)
      if (!isNaN(num)) return num
    }
    return 9999
  }

  // Lista ordenada de Mi Día: estrictamente ordenada por mi_dia_orden definido por el usuario
  const tareasMiDia = tareasHoy
    .filter(({ item, esMiDia }) => esMiDia || esItemDeMiDia(item))
    .sort((a, b) => {
      const ordenA = getMiDiaOrden(a.item)
      const ordenB = getMiDiaOrden(b.item)
      if (ordenA !== ordenB) return ordenA - ordenB
      return b.puntuacion - a.puntuacion
    })

  const tareasOtras = tareasHoy.filter(({ item, esMiDia }) => !esMiDia && !esItemDeMiDia(item))

  // Lista ordenada: primero todas las de Mi Día, y luego el resto de prioridades para completar al menos 5 items
  const tareasAMostrar = [
    ...tareasMiDia,
    ...tareasOtras.slice(0, Math.max(0, 5 - tareasMiDia.length))
  ]

  // Próximos eventos filtrados por pestaña
  const proximosFiltrados = itemsProximos.filter(item => {
    if (filtroEventos === 'todos') return true
    if (filtroEventos === 'examenes') {
      return categorizarEvento(item).categoria === 'examen'
    }
    if (filtroEventos === 'hoy') {
      const fecha = (item.fecha_evento || item.fecha_limite || '').slice(0, 10)
      return fecha === hoyStr
    }
    return true
  })

  const totalExamenes = itemsProximos.filter(item => categorizarEvento(item).categoria === 'examen').length
  const totalHoy = itemsProximos.filter(item => {
    const fecha = (item.fecha_evento || item.fecha_limite || '').slice(0, 10)
    return fecha === hoyStr
  }).length

  const agendaHoy = itemsHoy.filter(({ item }) => {
    const fecha = item.fecha_evento || item.fecha_limite
    if (!fecha) return item.tipo === 'evento'
    return fecha.startsWith(hoyStr)
  })

  const agendaHoyOrdenada = [...agendaHoy].sort((a, b) => {
    const horaA = a.item.hora_inicio ?? '23:59'
    const horaB = b.item.hora_inicio ?? '23:59'
    return horaA.localeCompare(horaB)
  })

  // Cálculo de rutina GYM recomendada
  let plantillaRecomendada: PlantillaGym | undefined
  if (plantillasActuales && plantillasActuales.length > 0) {
    const ultimaPlantilla = getUltimaPlantillaRealizada(rutinasActuales, plantillasActuales)
    if (ultimaPlantilla) {
      const indexUltima = plantillasActuales.findIndex(p => p.id === ultimaPlantilla.id)
      const indexSiguiente = (indexUltima + 1) % plantillasActuales.length
      plantillaRecomendada = plantillasActuales[indexSiguiente]
    } else {
      const diaSemana = hoy.getDay()
      if (diaSemana === 0 || diaSemana === 1) {
        plantillaRecomendada = plantillasActuales.find(p => p.nombre_dia.includes('DÍA 1') || p.orden === 1) || plantillasActuales[0]
      } else if (diaSemana === 2 || diaSemana === 3) {
        plantillaRecomendada = plantillasActuales.find(p => p.nombre_dia.includes('DÍA 2') || p.orden === 2) || plantillasActuales[1] || plantillasActuales[0]
      } else if (diaSemana === 4) {
        plantillaRecomendada = plantillasActuales.find(p => p.nombre_dia.includes('DÍA 3') || p.orden === 3) || plantillasActuales[2] || plantillasActuales[0]
      } else {
        plantillaRecomendada = plantillasActuales.find(p => p.nombre_dia.includes('DÍA 4') || p.orden === 4) || plantillasActuales[3] || plantillasActuales[0]
      }
    }
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-8 space-y-6 animate-fade-in pb-12">
      {/* Hero Header con diseño espacioso y KPIs */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/8 mb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Día productivo
            </span>
            {isFetching && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-500/15 text-violet-300 border border-violet-500/25 transition-all">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping" />
                Actualizando
              </span>
            )}
            <span className="text-xs text-neutral-500">·</span>
            <span className="text-xs text-neutral-400 font-medium">{fechaCapitalizada}</span>
          </div>

          <h1 className="text-[32px] font-bold text-neutral-100 flex items-center gap-3" style={{ letterSpacing: 0, lineHeight: 1.2 }}>
            <span>{saludo.texto}</span>
            <span className="text-3xl">{saludo.icono}</span>
          </h1>
        </div>

        {/* Resumen rápido de métricas (KPIs) - 32px de alto */}
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/mi-dia"
            className="h-8 inline-flex items-center gap-2 px-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-all text-xs font-semibold text-amber-300 shadow-sm group"
          >
            <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform" />
            <span><strong className="text-amber-200">{tareasMiDia.length}</strong> en Mi Día</span>
          </Link>

          <Link
            href="/tareas"
            className="h-8 inline-flex items-center gap-2 px-3.5 rounded-xl border border-white/8 bg-neutral-900/60 hover:bg-neutral-800/80 transition-all text-xs font-semibold text-neutral-200 shadow-sm group"
          >
            <CheckCircle2 className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
            <span><strong className="text-white">{tareasAMostrar.length}</strong> tareas hoy</span>
          </Link>

          <Link
            href="/calendario"
            className="h-8 inline-flex items-center gap-2 px-3.5 rounded-xl border border-sky-500/25 bg-sky-500/10 hover:bg-sky-500/20 transition-all text-xs font-semibold text-sky-300 shadow-sm group"
          >
            <Calendar className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
            <span><strong className="text-white">{itemsProximos.length}</strong> próximos</span>
          </Link>

          {plantillaRecomendada && (
            <Link
              href={`/gym?iniciar=${plantillaRecomendada.id}`}
              className="h-8 inline-flex items-center gap-2 px-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 hover:bg-emerald-500/25 transition-all text-xs font-semibold text-emerald-300 shadow-sm group"
            >
              <Dumbbell className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>D{plantillaRecomendada.orden}: Entreno sugerido</span>
            </Link>
          )}
        </div>
      </header>

      {/* Input de captura rápida para el día de hoy: altura 44px, icono a 14px, pl 44px, botón a 8px del borde */}
      <form onSubmit={handleQuickAdd} className="mb-6">
        <div className="relative flex items-center">
          <input
            data-testid="input-with-icon"
            type="text"
            value={quickInput}
            onChange={e => setQuickInput(e.target.value)}
            placeholder="Añadir una tarea rápida para hoy... (pulsa Enter)"
            className="input w-full pl-11 pr-[110px] h-11 bg-neutral-900/70 border border-white/10 rounded-xl text-sm placeholder:text-neutral-500 focus:border-purple-500/60 focus:bg-neutral-900 shadow-inner"
          />
          <Plus className="absolute left-[14px] w-5 h-5 text-neutral-400 pointer-events-none" />
          <button
            type="submit"
            disabled={!quickInput.trim() || isCreatingQuick}
            className="absolute right-2 h-10 min-w-[96px] px-4 rounded-xl text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center gap-1.5 shadow-md"
          >
            <span>Crear</span>
          </button>
        </div>
      </form>

      {/* Grid de Paneles Principales: align-items start */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
        
        {/* PANEL 1: Prioridades de Hoy */}
        <section data-testid="card" className="card flex flex-col justify-between p-5 sm:p-6 rounded-2xl border border-white/8 hover:border-purple-500/30 transition-all shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-[18px] font-semibold text-neutral-100" style={{ letterSpacing: 0, lineHeight: 1.3 }}>Prioridades de hoy</h2>
                  <p className="text-xs text-neutral-400">
                    {tareasMiDia.length > 0 ? `${tareasMiDia.length} en Mi Día · ${tareasHoy.length} total` : 'Objetivos con impacto'}
                  </p>
                </div>
              </div>
              {tareasMiDia.length > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>{tareasMiDia.length} en Mi Día</span>
                </span>
              ) : (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-200 border border-white/8">
                  {tareasHoy.length}
                </span>
              )}
            </div>

            {tareasHoy.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-neutral-500">
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-400 mb-3 border border-emerald-500/20">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <p className="text-sm font-bold text-neutral-200">¡Al día con tus tareas!</p>
                <p className="text-xs text-neutral-400 mt-1.5 max-w-[240px] leading-relaxed">
                  No tienes tareas pendientes para hoy. Puedes agregar una arriba o relajarte.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {tareasMiDia.length === 0 && (
                  <div className="mb-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs text-amber-300">
                    <span className="flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Sin tareas en Mi Día</span>
                    </span>
                    <Link href="/mi-dia" className="font-semibold underline hover:text-amber-200 transition-colors">
                      Planificar día
                    </Link>
                  </div>
                )}
                <ul className="space-y-2">
                  {tareasAMostrar.map(({ item }, index) => {
                    const esUrgente = item.prioridad === 'urgente'
                    const esAlta = item.prioridad === 'alta'
                    const esMedia = item.prioridad === 'media'
                    const itemEsDeMiDia = esItemDeMiDia(item)
                    const esPrimeraNoMiDia = tareasMiDia.length > 0 && index === tareasMiDia.length

                    return (
                      <div key={item.id} className="space-y-2">
                        {esPrimeraNoMiDia && (
                          <div className="flex items-center gap-2 pt-2.5 pb-1 text-[11px] font-semibold tracking-wider uppercase text-neutral-500">
                            <div className="h-px bg-white/8 flex-1" />
                            <span>Otras sugerencias</span>
                            <div className="h-px bg-white/8 flex-1" />
                          </div>
                        )}
                        <li
                          data-testid="list-row"
                          className="group flex items-start justify-between gap-3.5 min-h-[50px] py-3.5 px-4 rounded-xl border border-white/6 bg-neutral-900/50 hover:bg-neutral-800/60 hover:border-white/12 transition-all shadow-sm"
                        >
                          <div className="flex items-start gap-3.5 flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleCheckItem(item.id)}
                              className="mt-0.5 shrink-0 text-neutral-400 hover:text-emerald-400 transition-colors cursor-pointer p-0.5 rounded-full hover:bg-white/5"
                              aria-label="Completar tarea"
                            >
                              <Circle className="w-4.5 h-4.5 group-hover:hidden text-neutral-500" />
                              <CheckCircle2 className="w-4.5 h-4.5 hidden group-hover:block text-emerald-400" />
                            </button>
                            <div className="flex-1 min-w-0">
                              <p
                                title={item.titulo}
                                className="text-sm font-semibold text-neutral-100 leading-snug break-words group-hover:text-white transition-colors"
                              >
                                {item.titulo}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap mt-1.5">
                                {itemEsDeMiDia && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md">
                                    <Sun className="w-3 h-3 text-amber-400" />
                                    <span>
                                      Mi Día
                                      {(() => {
                                        const ordenNum = getMiDiaOrden(item)
                                        return ordenNum !== 9999
                                          ? ` · #${ordenNum + 1}`
                                          : index < tareasMiDia.length ? ` · #${index + 1}` : ''
                                      })()}
                                    </span>
                                  </span>
                                )}
                                {item.proyecto && (
                                  <span
                                    className="inline-block text-xs font-semibold px-2 py-0.5 rounded-md border"
                                    style={{
                                      background: `${item.proyecto.color}18`,
                                      color: item.proyecto.color,
                                      borderColor: `${item.proyecto.color}35`,
                                    }}
                                  >
                                    {item.proyecto.nombre}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 mt-0.5 ml-2">
                            <span
                              className="text-[10px] sm:text-xs font-semibold uppercase px-2.5 py-1 rounded-full tracking-wider"
                              style={{
                                background: esUrgente ? 'rgba(239, 68, 68, 0.15)' : esAlta ? 'rgba(249, 115, 22, 0.15)' : esMedia ? 'rgba(99, 102, 241, 0.15)' : 'rgba(148, 163, 184, 0.1)',
                                color: esUrgente ? '#ef4444' : esAlta ? '#f97316' : esMedia ? '#818cf8' : '#94a3b8',
                                border: `1px solid ${esUrgente ? 'rgba(239, 68, 68, 0.3)' : esAlta ? 'rgba(249, 115, 22, 0.3)' : esMedia ? 'rgba(99, 102, 241, 0.3)' : 'rgba(148, 163, 184, 0.15)'}`,
                              }}
                            >
                              {item.prioridad}
                            </span>
                          </div>
                        </li>
                      </div>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-white/6 flex items-center justify-between">
            <Link
              href="/mi-dia"
              className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors py-1 group"
            >
              <Sun className="w-3.5 h-3.5 transition-transform group-hover:rotate-45" />
              <span>Planificar en Mi Día</span>
            </Link>
            <Link
              href="/tareas"
              className="flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors py-1 group"
            >
              <span>Ver todas</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </section>

        {/* PANEL 2: Próximos Eventos */}
        <section data-testid="card" className="card flex flex-col justify-between p-5 sm:p-6 rounded-2xl border border-white/8 hover:border-sky-500/30 transition-all shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-[18px] font-semibold text-neutral-100" style={{ letterSpacing: 0, lineHeight: 1.3 }}>Próximos eventos</h2>
                  <p className="text-xs text-neutral-400">Exámenes, entregas y agenda</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-200 border border-white/8">
                {proximosFiltrados.length}
              </span>
            </div>

            {/* Pestañas de filtrado rápido */}
            <div className="flex items-center gap-1.5 mb-3 flex-wrap">
              <button
                type="button"
                onClick={() => setFiltroEventos('todos')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  filtroEventos === 'todos'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                Próximos ({itemsProximos.length})
              </button>
              {totalExamenes > 0 && (
                <button
                  type="button"
                  onClick={() => setFiltroEventos('examenes')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    filtroEventos === 'examenes'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span>Exámenes</span>
                  <span className="text-[10px] px-1 rounded-full bg-amber-500/20 text-amber-300 font-bold">{totalExamenes}</span>
                </button>
              )}
              {totalHoy > 0 && (
                <button
                  type="button"
                  onClick={() => setFiltroEventos('hoy')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    filtroEventos === 'hoy'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span>Hoy</span>
                  <span className="text-[10px] px-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">{totalHoy}</span>
                </button>
              )}
            </div>

            {proximosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-neutral-500">
                <div className="p-3.5 rounded-2xl bg-sky-500/10 text-sky-400 mb-3 border border-sky-500/20">
                  <Calendar className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-neutral-200">Sin eventos en esta vista</p>
                <p className="text-xs text-neutral-400 mt-1.5 max-w-[240px] leading-relaxed">
                  {filtroEventos === 'examenes'
                    ? 'No tienes exámenes próximos registrados.'
                    : filtroEventos === 'hoy'
                    ? 'Sin eventos programados para hoy.'
                    : 'Tu calendario está despejado para las próximas semanas.'}
                </p>
              </div>
            ) : (
              <ul className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {proximosFiltrados.map((item) => {
                  const fechaStr = item.fecha_evento || item.fecha_limite || ''
                  const etiquetaRelativa = getEtiquetaFechaRelativa(fechaStr, item.hora_inicio)
                  const categoria = categorizarEvento(item)
                  const isExpanded = expandedEventoId === item.id

                  return (
                    <li
                      data-testid="list-row"
                      key={item.id}
                      onClick={() => setExpandedEventoId(prev => prev === item.id ? null : item.id)}
                      className={`group flex flex-col justify-between py-2.5 px-3.5 rounded-xl border transition-all shadow-sm cursor-pointer ${
                        isExpanded
                          ? 'border-sky-500/40 bg-neutral-800/80 ring-1 ring-sky-500/20'
                          : 'border-white/6 bg-neutral-900/50 hover:bg-neutral-800/60 hover:border-white/12'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2.5 w-full">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          {/* Indicador con icono de categoría */}
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs shrink-0 mt-0.5 border ${categoria.colorBg} ${categoria.colorBorder}`}
                            title={categoria.etiqueta}
                          >
                            {categoria.icono}
                          </span>

                          <div className="min-w-0 flex-1">
                            {/* Título: ahora en 2 líneas legibles completas, con tooltip nativo al hover */}
                            <p
                              title={item.titulo}
                              className={`text-sm font-semibold text-neutral-100 leading-snug break-words group-hover:text-white transition-colors ${
                                isExpanded ? 'line-clamp-none' : 'line-clamp-2'
                              }`}
                            >
                              {item.titulo}
                            </p>

                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              {/* Fecha formateada / relativa */}
                              <span
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                                  etiquetaRelativa.esHoy
                                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                                    : etiquetaRelativa.esManana
                                    ? 'bg-sky-500/15 text-sky-300 border-sky-500/25'
                                    : etiquetaRelativa.diasDiferencia <= 7
                                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/25'
                                    : 'bg-neutral-800/90 text-neutral-300 border-white/8'
                                }`}
                              >
                                {etiquetaRelativa.texto}
                              </span>

                              {/* Días restantes si no es hoy ni mañana */}
                              {etiquetaRelativa.etiquetaDias && !etiquetaRelativa.esHoy && !etiquetaRelativa.esManana && (
                                <span className="text-[11px] font-medium text-neutral-400 bg-neutral-800/80 px-2 py-0.5 rounded-md border border-white/6">
                                  {etiquetaRelativa.etiquetaDias}
                                </span>
                              )}

                              {/* Badge de tipo de evento */}
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wider ${categoria.colorBg} ${categoria.colorTexto} ${categoria.colorBorder}`}
                              >
                                {categoria.etiqueta}
                              </span>

                              {/* Proyecto asociado sin truncado artificial */}
                              {item.proyecto && (
                                <span
                                  className="text-[11px] font-semibold px-2 py-0.5 rounded-md border"
                                  style={{
                                    background: `${item.proyecto.color}18`,
                                    color: item.proyecto.color,
                                    borderColor: `${item.proyecto.color}35`,
                                  }}
                                  title={item.proyecto.nombre}
                                >
                                  {item.proyecto.nombre}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Chevron discreto que rota al desplegar */}
                        <div className="shrink-0 pt-0.5 pl-1 text-neutral-500 group-hover:text-neutral-300 transition-colors">
                          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-sky-400' : ''}`} />
                        </div>
                      </div>

                      {/* Detalles desplegables si se hace clic */}
                      {isExpanded && (
                        <div className="mt-2.5 pt-2.5 border-t border-white/8 w-full animate-fade-in text-xs space-y-2">
                          {item.descripcion && (
                            <p className="text-neutral-300 leading-relaxed bg-neutral-950/40 p-2.5 rounded-lg border border-white/6 whitespace-pre-line">
                              {item.descripcion}
                            </p>
                          )}

                          <div className="flex items-center justify-between text-neutral-400 pt-1 flex-wrap gap-2">
                            <span className="text-[11px]">
                              {item.hora_inicio ? `Horario: ${item.hora_inicio}${item.hora_fin ? ` - ${item.hora_fin}` : ''}` : 'Horario: Todo el día'}
                            </span>

                            <Link
                              href="/calendario"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1 group/link"
                            >
                              <span>Ver en calendario</span>
                              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5" />
                            </Link>
                          </div>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-white/6">
            <Link
              href="/calendario"
              className="flex items-center justify-between text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors py-1 group"
            >
              <span>Ver calendario completo</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </section>

        {/* PANEL 3: Próxima Sesión de GYM */}
        <section data-testid="card" className="card flex flex-col justify-between p-5 sm:p-6 rounded-2xl border border-emerald-500/25 hover:border-emerald-500/40 transition-all shadow-lg md:col-span-2 xl:col-span-1">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-[18px] font-semibold text-neutral-100" style={{ letterSpacing: 0, lineHeight: 1.3 }}>Entrenamiento gym</h2>
                  <p className="text-xs text-neutral-400">Rutina sugerida para hoy</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Sugerido
              </span>
            </div>

            {plantillaRecomendada ? (
              <div>
                <div className="py-3 px-4 rounded-xl bg-emerald-950/30 border border-emerald-500/25 mb-3 space-y-1">
                  <p className="font-semibold text-sm sm:text-base text-neutral-100">
                    {toSentenceCase(plantillaRecomendada.nombre_dia)}
                  </p>
                  <p className="text-xs text-emerald-400/90 font-medium">
                    {plantillaRecomendada.ejercicios.length} ejercicios planificados
                  </p>
                </div>

                <ul className="space-y-2">
                  {plantillaRecomendada.ejercicios.slice(0, 4).map((ej, index) => (
                    <li
                      data-testid="list-row"
                      key={index}
                      className="min-h-[44px] py-2.5 px-4 rounded-xl bg-neutral-900/50 hover:bg-neutral-800/50 border border-white/6 transition-colors shadow-sm flex items-center justify-between text-sm"
                    >
                      <span className="font-medium text-neutral-200 truncate pr-3">
                        {ej.nombre}
                      </span>
                      <span className="text-xs font-semibold text-emerald-300 shrink-0 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/25">
                        {ej.series} × {ej.repeticiones}
                      </span>
                    </li>
                  ))}
                  {plantillaRecomendada.ejercicios.length > 4 && (
                    <li className="text-xs text-center text-neutral-400 font-medium pt-1">
                      + {plantillaRecomendada.ejercicios.length - 4} ejercicios más en esta sesión
                    </li>
                  )}
                </ul>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center text-neutral-500">
                <Dumbbell className="w-8 h-8 text-neutral-600 mb-3" />
                <p className="text-sm font-bold text-neutral-200">Sin rutina programada</p>
                <p className="text-xs text-neutral-400 mt-1.5 max-w-[240px]">Configura tus plantillas en la sección Gym.</p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-white/6">
            {plantillaRecomendada ? (
              <Link
                href={`/gym?iniciar=${plantillaRecomendada.id}`}
                className="btn btn-primary w-full flex items-center justify-center gap-2.5 py-3 px-6 rounded-xl font-bold transition-all text-sm text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/35 hover:brightness-105 active:scale-[0.99]"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                }}
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Comenzar entrenamiento</span>
              </Link>
            ) : (
              <Link
                href="/gym"
                className="btn btn-ghost w-full py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-neutral-300 hover:text-white"
              >
                Ver módulo Gym
              </Link>
            )}
          </div>
        </section>

      </div>
    </div>
  )
}

function getUltimaPlantillaRealizada(
  rutinas: RutinaGym[],
  plantillas: PlantillaGym[]
): PlantillaGym | undefined {
  if (!rutinas || rutinas.length === 0 || !plantillas || plantillas.length === 0) {
    return undefined
  }

  const sortedRutinas = [...rutinas].sort((a, b) => {
    const dateComp = b.fecha.localeCompare(a.fecha)
    if (dateComp !== 0) return dateComp
    return (b.created_at || '').localeCompare(a.created_at || '')
  })

  const ultimaFecha = sortedRutinas[0].fecha
  const ejerciciosUltimaFecha = sortedRutinas
    .filter(r => r.fecha === ultimaFecha)
    .map(r => r.ejercicio.toLowerCase().trim())

  let mejorPlantilla: PlantillaGym | undefined
  let maxCoincidencias = 0

  for (const p of plantillas) {
    let coincidencias = 0
    for (const ej of p.ejercicios) {
      const pNombre = ej.nombre.toLowerCase().trim()
      const tieneMatch = ejerciciosUltimaFecha.some(
        ejLog => ejLog.includes(pNombre) || pNombre.includes(ejLog)
      )
      if (tieneMatch) coincidencias++
    }
    if (coincidencias > maxCoincidencias) {
      maxCoincidencias = coincidencias
      mejorPlantilla = p
    }
  }

  if (mejorPlantilla && maxCoincidencias > 0) return mejorPlantilla

  for (const r of sortedRutinas) {
    const rNombre = r.ejercicio.toLowerCase().trim()
    for (const p of plantillas) {
      const tieneEjercicio = p.ejercicios.some(ej => {
        const pNombre = ej.nombre.toLowerCase().trim()
        return rNombre.includes(pNombre) || pNombre.includes(rNombre)
      })
      if (tieneEjercicio) return p
    }
  }

  return undefined
}
