import { calcularPuntuacionPrioridad } from '../utils'
import type { Item, ItemPriorizado, BloqueLibre } from '../types'
import { startOfDay, endOfDay, isWithinInterval, addMinutes, format } from 'date-fns'

// ============================================================
// HERMES — Lógica de priorización diaria y gestión de huecos
// ============================================================

// ——— Vista "Hoy": priorizar items del día ————————————————

export function priorizarItemsDeHoy(items: Item[]): ItemPriorizado[] {
  const ahora = new Date()
  const hoy = startOfDay(ahora)
  const finHoy = endOfDay(ahora)

  const candidatos = items.filter(item => {
    if (item.estado === 'hecho' || item.estado === 'archivado') return false
    if (item.tipo === 'evento') {
      // Incluir eventos de hoy
      if (!item.fecha_evento) return false
      return isWithinInterval(new Date(item.fecha_evento), { start: hoy, end: finHoy })
    }
    // Tareas, ideas, recordatorios activos + sin_procesar urgentes
    return item.estado === 'activo' || item.estado === 'sin_procesar'
  })

  const priorizados: ItemPriorizado[] = candidatos.map(item => {
    const puntuacion = calcularPuntuacionPrioridad(item.prioridad, item.fecha_limite)
    const razon = generarRazon(item, puntuacion)
    return { item, puntuacion, razon }
  })

  priorizados.sort((a, b) => b.puntuacion - a.puntuacion)
  return priorizados
}

function generarRazon(item: Item, puntuacion: number): string {
  const razones: string[] = []

  if (item.fecha_limite) {
    try {
      const limite = new Date(item.fecha_limite)
      if (!isNaN(limite.getTime())) {
        const diasRestantes = Math.ceil((limite.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        if (diasRestantes >= -10000 && diasRestantes <= 10000) {
          if (diasRestantes < 0) razones.push(`Vencida hace ${Math.abs(diasRestantes)} día(s)`)
          else if (diasRestantes === 0) razones.push('Fecha límite hoy')
          else if (diasRestantes === 1) razones.push('Fecha límite mañana')
          else if (diasRestantes <= 3) razones.push(`Fecha límite en ${diasRestantes} días`)
        }
      }
    } catch {}
  }

  if (item.prioridad === 'urgente') razones.push('Marcada como urgente')
  else if (item.prioridad === 'alta') razones.push('Prioridad alta')

  if (item.tipo === 'evento') razones.push('Evento programado para hoy')

  if (razones.length === 0) {
    razones.push(item.prioridad === 'media' ? 'Tarea activa' : `Prioridad ${item.prioridad}`)
  }

  return razones.join(' · ')
}

// ——— Detección de sobrecarga semanal ————————————————————

export interface AnalisisSemana {
  total_items: number
  carga_alta: boolean
  mensaje?: string
  items_a_mover?: Item[]
}

export function analizarCargaSemanal(
  items: Item[],
  umbral = 15
): AnalisisSemana {
  const activos = items.filter(i => i.estado === 'activo' || i.estado === 'sin_procesar')

  if (activos.length > umbral) {
    const itemsMover = activos
      .filter(i => i.prioridad === 'baja' || i.prioridad === 'media')
      .slice(0, activos.length - umbral)

    return {
      total_items: activos.length,
      carga_alta: true,
      mensaje: `Tienes ${activos.length} items activos esta semana (umbral recomendado: ${umbral}). Considera mover ${itemsMover.length} item(s) de baja/media prioridad a la semana siguiente.`,
      items_a_mover: itemsMover,
    }
  }

  return { total_items: activos.length, carga_alta: false }
}

// ——— Buscador de huecos libres ———————————————————————————

interface EventoSimple {
  inicio: Date
  fin: Date
}

export function encontrarBloquesLibres(
  eventos: EventoSimple[],
  fecha: Date,
  duracionMinima = 30
): BloqueLibre[] {
  const inicioJornada = new Date(fecha)
  inicioJornada.setHours(8, 0, 0, 0)
  const finJornada = new Date(fecha)
  finJornada.setHours(21, 0, 0, 0)

  // Ordenar eventos por inicio
  const ordenados = [...eventos].sort((a, b) => a.inicio.getTime() - b.inicio.getTime())

  const bloques: BloqueLibre[] = []
  let cursor = inicioJornada

  for (const evento of ordenados) {
    if (evento.inicio > cursor) {
      const duracion = Math.round((evento.inicio.getTime() - cursor.getTime()) / 60000)
      if (duracion >= duracionMinima) {
        bloques.push({
          inicio: new Date(cursor),
          fin: new Date(evento.inicio),
          duracion_min: duracion,
          adecuado_para_trabajo_profundo: duracion >= 90,
        })
      }
    }
    if (evento.fin > cursor) cursor = evento.fin
  }

  // Hueco final del día
  if (cursor < finJornada) {
    const duracion = Math.round((finJornada.getTime() - cursor.getTime()) / 60000)
    if (duracion >= duracionMinima) {
      bloques.push({
        inicio: new Date(cursor),
        fin: finJornada,
        duracion_min: duracion,
        adecuado_para_trabajo_profundo: duracion >= 90,
      })
    }
  }

  return bloques
}

// ——— Agrupación de tareas similares ——————————————————————

export function agruparTareasSimilares(items: Item[]): Map<string, Item[]> {
  const grupos = new Map<string, Item[]>()

  for (const item of items) {
    // Agrupar por proyecto
    const clave = item.proyecto_id
      ? `proyecto:${item.proyecto_id}`
      : item.etiquetas.length > 0
      ? `etiqueta:${item.etiquetas[0]}`
      : 'sin_grupo'

    if (!grupos.has(clave)) grupos.set(clave, [])
    grupos.get(clave)!.push(item)
  }

  // Solo devolver grupos con más de 1 item
  for (const [clave, lista] of grupos) {
    if (lista.length <= 1) grupos.delete(clave)
  }

  return grupos
}

// ——— Revisión semanal ——————————————————————————————————
import type { ResumenSemanal } from '../types'
import { startOfWeek, endOfWeek, isWithinInterval as inInterval } from 'date-fns'

export function generarResumenSemanal(
  items: Item[],
  fechaReferencia = new Date()
): ResumenSemanal {
  const inicioSemana = startOfWeek(fechaReferencia, { weekStartsOn: 1 })
  const finSemana = endOfWeek(fechaReferencia, { weekStartsOn: 1 })

  const completados = items.filter(i => {
    if (i.estado !== 'hecho') return false
    return inInterval(new Date(i.updated_at), { start: inicioSemana, end: finSemana })
  })

  const pendientes = items.filter(i => i.estado === 'activo' || i.estado === 'sin_procesar')

  const analisis = analizarCargaSemanal(pendientes)
  const propuesta: string[] = []

  if (analisis.carga_alta && analisis.items_a_mover) {
    propuesta.push(`⚠️ Semana sobrecargada (${analisis.total_items} items activos). Considera posponer:`)
    analisis.items_a_mover.slice(0, 3).forEach(i => {
      propuesta.push(`  · "${i.titulo}" — prioridad ${i.prioridad}`)
    })
  }

  const vencidos = pendientes.filter(i => {
    if (!i.fecha_limite) return false
    try {
      const d = new Date(i.fecha_limite)
      if (isNaN(d.getTime())) return false
      const year = d.getFullYear()
      return year >= 1900 && year <= 2100 && d < new Date()
    } catch {
      return false
    }
  })
  if (vencidos.length > 0) {
    propuesta.push(`🔴 Tienes ${vencidos.length} item(s) con fecha límite vencida. Revísalos primero.`)
  }

  const sinProcesar = items.filter(i => i.estado === 'sin_procesar')
  if (sinProcesar.length > 0) {
    propuesta.push(`📥 Inbox: ${sinProcesar.length} item(s) sin procesar. Dedica 10 minutos a clasificarlos.`)
  }

  const grupos = agruparTareasSimilares(pendientes.filter(i => i.tipo === 'tarea'))
  for (const [, grupo] of grupos) {
    propuesta.push(`🔗 ${grupo.length} tareas relacionadas pueden hacerse juntas: "${grupo[0].titulo}" y más.`)
  }

  if (propuesta.length === 0) {
    propuesta.push('✅ ¡Buena semana! No hay sobrecarga ni items urgentes pendientes.')
  }

  return {
    semana_inicio: format(inicioSemana, 'yyyy-MM-dd'),
    semana_fin: format(finSemana, 'yyyy-MM-dd'),
    completados,
    pendientes,
    sobrecarga_detectada: analisis.carga_alta,
    propuesta_reorganizacion: propuesta,
    generado_en: new Date().toISOString(),
  }
}
