'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Play, ArrowRight, Dumbbell, CheckCircle, Circle, Calendar, Clock, Bell } from 'lucide-react'
import type { ItemPriorizado, PlantillaGym, RutinaGym } from '@/lib/types'
import { marcarHecho } from '@/lib/actions/items'

interface HomeClientProps {
  priorizados: ItemPriorizado[]
  plantillas: PlantillaGym[]
  rutinas: RutinaGym[]
}

export default function HomeClient({
  priorizados,
  plantillas,
  rutinas,
}: HomeClientProps) {
  const [isPending, startTransition] = useTransition()
  const [itemsHoy, setItemsHoy] = useState<ItemPriorizado[]>(priorizados)
  const hoy = new Date()

  // Formatear fecha en español: "jueves, 27 de julio"
  const opcionesFecha: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }
  const fechaFormateada = hoy.toLocaleDateString('es-ES', opcionesFecha)

  // Acciones: marcar tarea hecha en tiempo real
  const handleCheckItem = (itemId: string) => {
    startTransition(async () => {
      try {
        await marcarHecho(itemId)
        // Remover de la vista o actualizar estado localmente con animación
        setItemsHoy(prev => prev.filter(i => i.item.id !== itemId))
      } catch (err) {
        console.error('Error completando tarea:', err)
      }
    })
  }

  // Filtrar tareas y eventos para mostrar en Prioridades
  const tareasHoy = itemsHoy.filter(
    ({ item }) => item.tipo === 'tarea' && item.estado !== 'hecho'
  )

  // --- CÁLCULO DE AGENDA DIARIA ---
  const hoyStr = hoy.toISOString().split('T')[0]
  const agendaHoy = itemsHoy.filter(({ item }) => {
    const fecha = item.fecha_evento || item.fecha_limite
    if (!fecha) return item.tipo === 'evento'
    return fecha.startsWith(hoyStr)
  })

  // Ordenar agendaHoy cronológicamente por hora_inicio
  const agendaHoyOrdenada = [...agendaHoy].sort((a, b) => {
    const horaA = a.item.hora_inicio ?? '23:59'
    const horaB = b.item.hora_inicio ?? '23:59'
    return horaA.localeCompare(horaB)
  })

  // --- CÁLCULO DE GYM ---
  let plantillaRecomendada: PlantillaGym | undefined

  if (plantillas && plantillas.length > 0) {
    const ultimaPlantilla = getUltimaPlantillaRealizada(rutinas, plantillas)
    if (ultimaPlantilla) {
      // Recomendar la siguiente plantilla en la secuencia
      const indexUltima = plantillas.findIndex(p => p.id === ultimaPlantilla.id)
      const indexSiguiente = (indexUltima + 1) % plantillas.length
      plantillaRecomendada = plantillas[indexSiguiente]
    } else {
      // Fallback a recomendación por día de la semana si no hay historial
      const diaSemana = hoy.getDay()
      if (diaSemana === 0 || diaSemana === 1) {
        plantillaRecomendada = plantillas.find(p => p.nombre_dia.includes('DÍA 1') || p.orden === 1) || plantillas[0]
      } else if (diaSemana === 2 || diaSemana === 3) {
        plantillaRecomendada = plantillas.find(p => p.nombre_dia.includes('DÍA 2') || p.orden === 2) || plantillas[1] || plantillas[0]
      } else if (diaSemana === 4) {
        plantillaRecomendada = plantillas.find(p => p.nombre_dia.includes('DÍA 3') || p.orden === 3) || plantillas[2] || plantillas[0]
      } else if (diaSemana === 5 || diaSemana === 6) {
        plantillaRecomendada = plantillas.find(p => p.nombre_dia.includes('DÍA 4') || p.orden === 4) || plantillas[3] || plantillas[0]
      } else {
        plantillaRecomendada = plantillas[0]
      }
    }
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <header className="mb-5 md:mb-8">
        <p className="text-xs uppercase tracking-widest font-semibold text-slate-500 mb-1" style={{ fontFamily: 'var(--font-inter)' }}>
          Vista general de hoy
        </p>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
          ¡Buenos días, JC!
        </h1>
        <p className="text-sm text-slate-400 capitalize mt-0.5" style={{ fontFamily: 'var(--font-inter)' }}>
          {fechaFormateada}
        </p>
      </header>

      {/* Grid de Paneles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
        
        {/* PANEL 1: Prioridades de hoy */}
        <section className="card flex flex-col justify-between p-4 md:p-6" style={{ background: 'var(--bg-dark-card)', borderColor: 'var(--border)' }}>
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white tracking-wide uppercase text-[0.8125rem]" style={{ letterSpacing: '0.05em' }}>
                Prioridades de hoy
              </h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-400 border border-white/5">
                {tareasHoy.length} pendientes
              </span>
            </div>

            {tareasHoy.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                <CheckCircle className="w-8 h-8 text-emerald-500/80 mb-3" />
                <p className="text-xs font-semibold text-slate-300">¡Todo completado!</p>
                <p className="text-sm text-slate-400 mt-1 max-w-[280px]">No tienes tareas pendientes para hoy. Captura ideas o tareas en el Inbox.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {tareasHoy.slice(0, 5).map(({ item }) => {
                  const esAlta = item.prioridad === 'alta' || item.prioridad === 'urgente'
                  const esMedia = item.prioridad === 'media'
                  return (
                    <li
                      key={item.id}
                      className="group flex items-start justify-between gap-3 p-3 rounded-xl border border-white/0 hover:border-white/5 hover:bg-white/[1.5%] transition-all duration-200"
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleCheckItem(item.id)}
                          className="mt-0.5 shrink-0 text-slate-600 hover:text-purple-400 transition-colors"
                          disabled={isPending}
                        >
                          <Circle className="w-4.5 h-4.5 group-hover:hidden" />
                          <CheckCircle className="w-4.5 h-4.5 hidden group-hover:block text-purple-400" />
                        </button>
                        <div>
                          <p className="text-sm font-medium text-slate-200 line-clamp-2 leading-snug group-hover:text-white transition-colors">
                            {item.titulo}
                          </p>
                          {item.proyecto && (
                            <span className="inline-block text-[10px] font-semibold mt-1 px-1.5 py-0.2 rounded" style={{ background: `${item.proyecto.color}15`, color: item.proyecto.color }}>
                              {item.proyecto.nombre}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Badge de prioridad */}
                      <span
                        className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 self-start"
                        style={{
                          background: esAlta ? 'rgba(239, 68, 68, 0.08)' : esMedia ? 'rgba(245, 158, 11, 0.08)' : 'rgba(148, 163, 184, 0.08)',
                          color: esAlta ? 'var(--status-danger)' : esMedia ? 'var(--status-warning)' : 'var(--text-muted)',
                        }}
                      >
                        {item.prioridad === 'urgente' ? 'Urgente' : item.prioridad === 'media' ? 'Media' : item.prioridad === 'alta' ? 'Alta' : 'Baja'}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-white/5">
            <Link
              href="/tareas"
              className="flex items-center justify-between text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors group"
            >
              <span>Ver todas las tareas</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </section>

        {/* PANEL 2: Agenda de hoy */}
        <section className="card flex flex-col justify-between p-4 md:p-6" style={{ background: 'var(--bg-dark-card)', borderColor: 'var(--border)' }}>
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white tracking-wide uppercase text-[0.8125rem]" style={{ letterSpacing: '0.05em' }}>
                Agenda de hoy
              </h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-400 border border-white/5">
                {agendaHoyOrdenada.length} {agendaHoyOrdenada.length === 1 ? 'evento' : 'eventos'}
              </span>
            </div>

            {agendaHoyOrdenada.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                <Calendar className="w-8 h-8 text-indigo-500/80 mb-3" />
                <p className="text-xs font-semibold text-slate-300">Sin eventos hoy</p>
                <p className="text-sm text-slate-400 mt-1 max-w-[280px]">No tienes eventos ni tareas programadas para el día de hoy.</p>
              </div>
            ) : (
              <ul className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                {agendaHoyOrdenada.map(({ item }) => {
                  const esEvento = item.tipo === 'evento'
                  const Icon = item.tipo === 'recordatorio' ? Bell : esEvento ? Calendar : Clock

                  return (
                    <li
                      key={item.id}
                      className="group flex items-start justify-between gap-3 p-3 rounded-xl border border-white/0 hover:border-white/5 hover:bg-white/[1.5%] transition-all duration-200"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Botón de completar si es tarea/recordatorio, sino icono */}
                        {!esEvento ? (
                          <button
                            onClick={() => handleCheckItem(item.id)}
                            className="mt-0.5 shrink-0 text-slate-600 hover:text-purple-400 transition-colors"
                            disabled={isPending}
                          >
                            <Circle className="w-4.5 h-4.5 group-hover:hidden" />
                            <CheckCircle className="w-4.5 h-4.5 hidden group-hover:block text-purple-400" />
                          </button>
                        ) : (
                          <div className="mt-0.5 shrink-0 text-indigo-400">
                            <Icon className="w-4.5 h-4.5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors">
                            {item.titulo}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider bg-slate-800/40 px-1.5 py-0.2 rounded border border-white/5">
                              {item.hora_inicio ? `${item.hora_inicio}${item.hora_fin ? ` - ${item.hora_fin}` : ''}` : 'Todo el día'}
                            </span>
                            {item.proyecto && (
                              <span className="inline-block text-xs font-semibold mt-1 px-1.5 py-0.5 rounded" style={{ background: `${item.proyecto.color}15`, color: item.proyecto.color }}>
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

          <div className="mt-6 pt-4 border-t border-white/5">
            <Link
              href="/calendario"
              className="flex items-center justify-between text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors group"
            >
              <span>Ver calendario completo</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </section>

        {/* PANEL 3: Upcoming Gym Session */}
        <section className="card flex flex-col justify-between p-4 md:p-6" style={{ background: 'var(--bg-dark-card)', borderColor: 'var(--border)' }}>
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xs font-bold text-white tracking-widest uppercase">
                Próxima sesión de Gym
              </h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-400 border border-white/5">
                Recomendado
              </span>
            </div>

            {plantillaRecomendada ? (
              <div>
                {/* Título de la rutina */}
                <h3 className="text-base font-semibold text-slate-100 tracking-tight flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  <Dumbbell className="w-4 h-4 text-purple-400" />
                  {plantillaRecomendada.nombre_dia.replace(/DÍA \d+:\s*/, '')}
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5 uppercase tracking-wide">
                  {plantillaRecomendada.nombre_dia.split('(')[1]?.replace(')', '') || 'Programación diaria'}
                </p>

                {/* Lista de Ejercicios */}
                <ul className="mt-5 space-y-3">
                  {plantillaRecomendada.ejercicios.slice(0, 4).map((ej, index) => (
                    <li
                      key={index}
                      className="flex items-center justify-between text-sm py-1.5 border-b border-white/[2.5%] last:border-b-0"
                    >
                      <span className="font-medium text-slate-300 truncate pr-4 flex-1">
                        {ej.nombre}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider shrink-0 bg-slate-800/30 px-2 py-0.5 rounded border border-white/[1.5%]">
                        {ej.series}x{ej.repeticiones}
                      </span>
                    </li>
                  ))}
                  {plantillaRecomendada.ejercicios.length > 4 && (
                    <li className="text-xs text-center text-slate-400 font-medium pt-1.5">
                      + {plantillaRecomendada.ejercicios.length - 4} ejercicios más en esta sesión
                    </li>
                  )}
                </ul>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                <Dumbbell className="w-8 h-8 text-slate-600 mb-3" />
                <p className="text-xs font-semibold text-slate-300">Sin rutina configurada</p>
                <p className="text-sm text-slate-400 mt-1 max-w-[280px]">Crea o carga tus rutinas de entrenamiento en la sección Gym.</p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-white/5">
            {plantillaRecomendada ? (
              <Link
                href={`/gym?iniciar=${plantillaRecomendada.id}`}
                className="btn btn-primary w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold transition-all text-xs uppercase tracking-wider shadow-md hover:brightness-110 active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                  boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
                }}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Iniciar entrenamiento</span>
              </Link>
            ) : (
              <Link
                href="/gym"
                className="btn btn-ghost w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider"
              >
                Ir a Entrenamientos
              </Link>
            )}
          </div>
        </section>

      </div>
    </div>
  )
}

// Función helper para determinar la última plantilla realizada en base al historial
function getUltimaPlantillaRealizada(
  rutinas: RutinaGym[],
  plantillas: PlantillaGym[]
): PlantillaGym | undefined {
  if (!rutinas || rutinas.length === 0 || !plantillas || plantillas.length === 0) {
    return undefined
  }

  // 1. Ordenar rutinas por fecha desc y created_at desc
  const sortedRutinas = [...rutinas].sort((a, b) => {
    const dateComp = b.fecha.localeCompare(a.fecha)
    if (dateComp !== 0) return dateComp
    return (b.created_at || '').localeCompare(a.created_at || '')
  })

  // 2. Agrupar las rutinas más recientes de la fecha del último entrenamiento registrado
  const ultimaFecha = sortedRutinas[0].fecha
  const ejerciciosUltimaFecha = sortedRutinas
    .filter(r => r.fecha === ultimaFecha)
    .map(r => r.ejercicio.toLowerCase().trim())

  // 3. Buscar plantilla que tenga mayor coincidencia con los ejercicios de esta fecha
  let mejorPlantilla: PlantillaGym | undefined
  let maxCoincidencias = 0

  for (const p of plantillas) {
    let coincidencias = 0
    for (const ej of p.ejercicios) {
      const pNombre = ej.nombre.toLowerCase().trim()
      // Coincidencia exacta o parcial
      const tieneMatch = ejerciciosUltimaFecha.some(
        ejLog => ejLog.includes(pNombre) || pNombre.includes(ejLog)
      )
      if (tieneMatch) {
        coincidencias++
      }
    }
    if (coincidencias > maxCoincidencias) {
      maxCoincidencias = coincidencias
      mejorPlantilla = p
    }
  }

  if (mejorPlantilla && maxCoincidencias > 0) {
    return mejorPlantilla
  }

  // 4. Fallback: buscar secuencialmente hacia atrás en el historial de ejercicios
  // el primer ejercicio que coincida de forma unívoca con alguna plantilla
  for (const r of sortedRutinas) {
    const rNombre = r.ejercicio.toLowerCase().trim()
    for (const p of plantillas) {
      const tieneEjercicio = p.ejercicios.some(ej => {
        const pNombre = ej.nombre.toLowerCase().trim()
        return rNombre.includes(pNombre) || pNombre.includes(rNombre)
      })
      if (tieneEjercicio) {
        return p
      }
    }
  }

  return undefined
}
