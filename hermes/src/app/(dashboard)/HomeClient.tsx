'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Play, ArrowRight, Dumbbell, CheckCircle2, Circle, Calendar,
  Clock, Bell, Plus, Sparkles, Check, Flame
} from 'lucide-react'
import type { ItemPriorizado, PlantillaGym, RutinaGym, Item } from '@/lib/types'
import { marcarHecho, crearItem } from '@/lib/actions/items'
import { getHomeData } from '@/lib/actions/home'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/Toast'

interface HomeClientProps {
  priorizados: ItemPriorizado[]
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
  plantillas,
  rutinas,
}: HomeClientProps) {
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  // Consulta persistida en IndexedDB: pinta de inmediato lo último conocido y refresca en segundo plano
  const { data: homeData, isFetching } = useQuery({
    queryKey: ['home-data'],
    queryFn: () => getHomeData(),
    initialData: {
      priorizados,
      plantillas,
      rutinas,
    },
    staleTime: 60 * 1000,
  })

  const priorizadosActuales = homeData?.priorizados ?? priorizados
  const plantillasActuales = homeData?.plantillas ?? plantillas
  const rutinasActuales = homeData?.rutinas ?? rutinas

  const [itemsHoy, setItemsHoy] = useState<ItemPriorizado[]>(priorizadosActuales)
  const [quickInput, setQuickInput] = useState('')
  const [isCreatingQuick, setIsCreatingQuick] = useState(false)

  // Sincronizar items locales cuando React Query finaliza la revalidación en background
  useEffect(() => {
    if (homeData?.priorizados) {
      setItemsHoy(homeData.priorizados)
    }
  }, [homeData?.priorizados])

  const hoy = new Date()
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
    if (!itemTarget) return

    setItemsHoy(prev => prev.filter(i => i.item.id !== itemId))
    queryClient.setQueryData(['home-data'], (old: any) => {
      if (!old) return old
      return {
        ...old,
        priorizados: old.priorizados?.filter((p: ItemPriorizado) => p.item.id !== itemId) ?? []
      }
    })

    showToast({
      message: `Completada: "${itemTarget.item.titulo}"`,
      type: 'success',
      duration: 5000,
      action: {
        label: 'Deshacer',
        onClick: async () => {
          setItemsHoy(prev => [...prev, itemTarget])
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
      setItemsHoy(prev => [...prev, itemTarget])
      showToast({ message: 'Error al guardar. Se restauró la tarea.', type: 'error' })
    })
  }

  // Creación rápida de tarea desde el dashboard
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
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Actualización optimista en la lista de prioridades de hoy
    setItemsHoy(prev => [{ item: nuevoItem, puntuacion: 10, razon: 'Creada hoy' }, ...prev])
    setQuickInput('')

    try {
      const hoyStr = hoy.toISOString().split('T')[0]
      const created = await crearItem({
        titulo,
        tipo: 'tarea',
        estado: 'activo',
        prioridad: 'media',
        fecha_limite: hoyStr,
      })
      if (created) {
        setItemsHoy(prev => prev.map(p => p.item.id === tempId ? { ...p, item: created } : p))
      }
      showToast({ message: 'Tarea añadida para hoy', type: 'success' })
    } catch (err: any) {
      console.error(err)
      setItemsHoy(prev => prev.filter(p => p.item.id !== tempId))
      showToast({ message: 'Error al crear la tarea', type: 'error' })
    } finally {
      setIsCreatingQuick(false)
    }
  }

  // Filtrar tareas y agenda de hoy
  const tareasHoy = itemsHoy.filter(({ item }) => item.tipo === 'tarea' && item.estado !== 'hecho')
  const hoyStr = hoy.toISOString().split('T')[0]
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
            href="/tareas"
            className="h-8 inline-flex items-center gap-2 px-3.5 rounded-xl border border-white/8 bg-neutral-900/60 hover:bg-neutral-800/80 transition-all text-xs font-semibold text-neutral-200 shadow-sm group"
          >
            <CheckCircle2 className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
            <span><strong className="text-white">{tareasHoy.length}</strong> tareas hoy</span>
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
                  <p className="text-xs text-neutral-400">Objetivos con impacto</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-200 border border-white/8">
                {tareasHoy.length}
              </span>
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
              <ul className="space-y-2">
                {tareasHoy.slice(0, 5).map(({ item }) => {
                  const esUrgente = item.prioridad === 'urgente'
                  const esAlta = item.prioridad === 'alta'
                  const esMedia = item.prioridad === 'media'

                  return (
                    <li
                      data-testid="list-row"
                      key={item.id}
                      className="group flex items-start justify-between gap-3.5 min-h-[48px] py-3 px-4 rounded-xl border border-white/6 bg-neutral-900/50 hover:bg-neutral-800/60 hover:border-white/12 transition-all shadow-sm"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleCheckItem(item.id)}
                          className="mt-0.5 shrink-0 text-neutral-400 hover:text-emerald-400 transition-colors cursor-pointer p-0.5 rounded-full hover:bg-white/5"
                          aria-label="Completar tarea"
                        >
                          <Circle className="w-4.5 h-4.5 group-hover:hidden text-neutral-500" />
                          <CheckCircle2 className="w-4.5 h-4.5 hidden group-hover:block text-emerald-400" />
                        </button>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-200 line-clamp-2 leading-relaxed group-hover:text-white transition-colors">
                            {item.titulo}
                          </p>
                          {item.proyecto && (
                            <span
                              className="inline-block text-xs font-semibold mt-1.5 px-2 py-0.5 rounded-md border"
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

                      <span
                        className="text-xs font-semibold uppercase px-2.5 py-1 rounded-full shrink-0 mt-0.5"
                        style={{
                          background: esUrgente ? 'rgba(239, 68, 68, 0.12)' : esAlta ? 'rgba(249, 115, 22, 0.12)' : esMedia ? 'rgba(99, 102, 241, 0.12)' : 'rgba(148, 163, 184, 0.1)',
                          color: esUrgente ? '#ef4444' : esAlta ? '#f97316' : esMedia ? '#818cf8' : '#94a3b8',
                          border: `1px solid ${esUrgente ? 'rgba(239, 68, 68, 0.25)' : esAlta ? 'rgba(249, 115, 22, 0.25)' : esMedia ? 'rgba(99, 102, 241, 0.25)' : 'rgba(148, 163, 184, 0.15)'}`,
                        }}
                      >
                        {item.prioridad}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-white/6">
            <Link
              href="/tareas"
              className="flex items-center justify-between text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors py-1 group"
            >
              <span>Ver todas las tareas</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </section>

        {/* PANEL 2: Agenda de Hoy */}
        <section data-testid="card" className="card flex flex-col justify-between p-5 sm:p-6 rounded-2xl border border-white/8 hover:border-sky-500/30 transition-all shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-[18px] font-semibold text-neutral-100" style={{ letterSpacing: 0, lineHeight: 1.3 }}>Agenda de hoy</h2>
                  <p className="text-xs text-neutral-400">Eventos y compromisos</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-200 border border-white/8">
                {agendaHoyOrdenada.length}
              </span>
            </div>

            {agendaHoyOrdenada.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-neutral-500">
                <div className="p-3.5 rounded-2xl bg-sky-500/10 text-sky-400 mb-3 border border-sky-500/20">
                  <Calendar className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-neutral-200">Sin eventos agendados</p>
                <p className="text-xs text-neutral-400 mt-1.5 max-w-[240px] leading-relaxed">
                  Tu día está despejado para trabajo profundo o descanso.
                </p>
              </div>
            ) : (
              <ul className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
                {agendaHoyOrdenada.map(({ item }) => {
                  const esEvento = item.tipo === 'evento'
                  const Icon = item.tipo === 'recordatorio' ? Bell : esEvento ? Calendar : Clock

                  return (
                    <li
                      data-testid="list-row"
                      key={item.id}
                      className="group flex items-start justify-between gap-3.5 min-h-[48px] py-3 px-4 rounded-xl border border-white/6 bg-neutral-900/50 hover:bg-neutral-800/60 hover:border-white/12 transition-all shadow-sm"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 shrink-0 mt-0.5">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-200 truncate group-hover:text-white transition-colors">
                            {item.titulo}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-xs text-sky-400 font-semibold px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20">
                              {item.hora_inicio ? `${item.hora_inicio}${item.hora_fin ? ` - ${item.hora_fin}` : ''}` : 'Todo el día'}
                            </span>
                            {item.proyecto && (
                              <span
                                className="text-xs font-semibold px-2 py-0.5 rounded-md border"
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
