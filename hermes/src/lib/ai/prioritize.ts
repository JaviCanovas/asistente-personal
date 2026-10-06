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
  const hoyStr = format(ahora, 'yyyy-MM-dd')

  const candidatos = items.filter(item => {
    if (item.estado === 'hecho' || item.estado === 'archivado') return false

    // Si es un evento, solo incluir si ocurre hoy
    if (item.tipo === 'evento') {
      if (!item.fecha_evento) return false
      if (item.fecha_evento.slice(0, 10) === hoyStr) return true
      try {
        return isWithinInterval(new Date(item.fecha_evento), { start: hoy, end: finHoy })
      } catch {
        return false
      }
    }

    // Tareas con fecha límite en el futuro (después de hoy) pertenecen a "Próximos eventos", no a hoy
    if (item.fecha_limite) {
      const fechaCorta = item.fecha_limite.slice(0, 10)
      if (fechaCorta > hoyStr) return false
    }

    // Items con fecha de evento en el futuro tampoco son para hoy
    if (item.fecha_evento) {
      const fechaCorta = item.fecha_evento.slice(0, 10)
      if (fechaCorta > hoyStr) return false
    }

    // Tareas, ideas, recordatorios activos + sin_procesar (de hoy, vencidas o sin fecha asignada)
    return item.estado === 'activo' || item.estado === 'sin_procesar'
  })

  const priorizados: ItemPriorizado[] = candidatos.map(item => {
    const miDiaFecha = (item.metadata as any)?.mi_dia_fecha
    const esMiDiaHoy = miDiaFecha === hoyStr || (typeof miDiaFecha === 'string' && miDiaFecha.startsWith(hoyStr))
    const esMiDiaPasado = Boolean(miDiaFecha && miDiaFecha < hoyStr)

    const puntuacionBase = calcularPuntuacionPrioridad(item.prioridad, item.fecha_limite)
    
    // Tareas de "Mi Día" para hoy tienen máxima prioridad absoluta (+1000)
    // Tareas de "Mi Día" de días anteriores pendientes de completar tienen prioridad destacada (+400)
    let puntuacion = puntuacionBase
    if (esMiDiaHoy) {
      const ordenRaw = (item.metadata as any)?.mi_dia_orden
      const ordenNum = ordenRaw !== undefined && ordenRaw !== null && ordenRaw !== '' ? Number(ordenRaw) : NaN
      const orden = !isNaN(ordenNum) ? ordenNum : 999
      // Máxima prioridad a los de Mi Día, respetando estrictamente el orden establecido por el usuario
      puntuacion = 10000 - Math.min(orden, 500) * 10 + (puntuacionBase / 100)
    } else if (esMiDiaPasado) {
      puntuacion += 400
    }

    const razon = generarRazon(item, puntuacion, esMiDiaHoy, esMiDiaPasado)
    return { item, puntuacion, razon, esMiDia: esMiDiaHoy }
  })

  priorizados.sort((a, b) => b.puntuacion - a.puntuacion)
  return priorizados
}

function generarRazon(
  item: Item,
  puntuacion: number,
  esMiDiaHoy?: boolean,
  esMiDiaPasado?: boolean
): string {
  const razones: string[] = []

  if (esMiDiaHoy) {
    const ordenRaw = (item.metadata as any)?.mi_dia_orden
    const ordenNum = ordenRaw !== undefined && ordenRaw !== null && ordenRaw !== '' ? Number(ordenRaw) : NaN
    if (!isNaN(ordenNum)) {
      razones.push(`En Mi Día (#${ordenNum + 1})`)
    } else {
      razones.push('En Mi Día')
    }
  } else if (esMiDiaPasado) {
    razones.push('Pendiente de Mi Día anterior')
  }

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

// ——— Próximos Eventos (ordenados por proximidad de fecha) ——————

export function parsearFechaLocal(fechaStr: string): Date {
  if (!fechaStr) return new Date()
  const fechaLimpia = fechaStr.trim()
  if (fechaLimpia.length >= 10 && fechaLimpia.includes('-')) {
    const parte = fechaLimpia.slice(0, 10)
    const [y, m, d] = parte.split('-').map(Number)
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m - 1, d)
    }
  }
  const d = new Date(fechaStr)
  return isNaN(d.getTime()) ? new Date() : d
}

export function obtenerProximosEventos(items: Item[]): Item[] {
  const ahora = new Date()
  const y = ahora.getFullYear()
  const m = String(ahora.getMonth() + 1).padStart(2, '0')
  const d = String(ahora.getDate()).padStart(2, '0')
  const hoyStr = `${y}-${m}-${d}`

  const candidatos = items.filter(item => {
    if (item.estado === 'hecho' || item.estado === 'archivado') return false

    // Debe tener alguna fecha registrada
    const fechaInicio = item.fecha_evento || item.fecha_limite
    if (!fechaInicio) return false

    const fechaFin = item.fecha_limite || item.fecha_evento || fechaInicio

    const inicioCorta = fechaInicio.slice(0, 10)
    const finCorta = fechaFin.slice(0, 10)

    // Si terminó antes de hoy, ya es un evento pasado
    if (finCorta < hoyStr) return false

    // Si empieza hoy o en el futuro, o está en curso hoy
    return inicioCorta >= hoyStr || finCorta >= hoyStr
  })

  // Ordenar por proximidad de fecha ascendente (más cercano a hoy primero)
  candidatos.sort((a, b) => {
    const fechaA = (a.fecha_evento || a.fecha_limite || '').slice(0, 10)
    const fechaB = (b.fecha_evento || b.fecha_limite || '').slice(0, 10)

    // Si la fecha de inicio es anterior a hoy pero la fecha de fin sigue vigente hoy,
    // tratarlo como fecha de hoy para que no se quede desordenado en el pasado
    const efectivaA = fechaA < hoyStr ? hoyStr : fechaA
    const efectivaB = fechaB < hoyStr ? hoyStr : fechaB

    const compFecha = efectivaA.localeCompare(efectivaB)
    if (compFecha !== 0) return compFecha

    // Misma fecha -> ordenar por hora_inicio si existe
    const horaA = a.hora_inicio || '23:59'
    const horaB = b.hora_inicio || '23:59'
    const compHora = horaA.localeCompare(horaB)
    if (compHora !== 0) return compHora

    // Misma hora -> prioridad urgente/alta primero
    const pesos: Record<string, number> = { urgente: 4, alta: 3, media: 2, baja: 1 }
    const pesoA = pesos[a.prioridad] || 1
    const pesoB = pesos[b.prioridad] || 1
    return pesoB - pesoA
  })

  return candidatos
}

export type CategoriaEvento = 'examen' | 'entrega' | 'festivo' | 'google' | 'tarea' | 'evento'

export interface DetalleCategoriaEvento {
  categoria: CategoriaEvento
  etiqueta: string
  icono: string
  colorTexto: string
  colorBg: string
  colorBorder: string
}

export function categorizarEvento(item: Item): DetalleCategoriaEvento {
  const tituloLower = (item.titulo || '').toLowerCase()
  const etiquetasLower = (item.etiquetas || []).map(e => String(e).toLowerCase())

  if (
    tituloLower.includes('examen') ||
    tituloLower.includes('convocatoria') ||
    etiquetasLower.some(e => e.includes('examen') || e.includes('convocatoria'))
  ) {
    return {
      categoria: 'examen',
      etiqueta: 'Examen',
      icono: '🎓',
      colorTexto: 'text-amber-400',
      colorBg: 'bg-amber-500/10',
      colorBorder: 'border-amber-500/25',
    }
  }

  if (
    tituloLower.includes('entrega') ||
    tituloLower.includes('práctica') ||
    tituloLower.includes('practica') ||
    tituloLower.includes('boletín') ||
    tituloLower.includes('boletin') ||
    tituloLower.includes('trabajo') ||
    etiquetasLower.some(e => e.includes('evaluación') || e.includes('evaluacion') || e.includes('entrega') || e.includes('práctica'))
  ) {
    return {
      categoria: 'entrega',
      etiqueta: 'Entrega',
      icono: '📦',
      colorTexto: 'text-violet-400',
      colorBg: 'bg-violet-500/10',
      colorBorder: 'border-violet-500/25',
    }
  }

  if (
    etiquetasLower.some(e => e.includes('festivo') || e.includes('vacaciones') || e.includes('no lectivo')) ||
    tituloLower.includes('festivo') ||
    tituloLower.includes('vacaciones') ||
    tituloLower.includes('no lectivo')
  ) {
    return {
      categoria: 'festivo',
      etiqueta: 'No lectivo',
      icono: '🏖️',
      colorTexto: 'text-emerald-400',
      colorBg: 'bg-emerald-500/10',
      colorBorder: 'border-emerald-500/25',
    }
  }

  if (item.origen === 'google-calendar' || item.google_event_id) {
    return {
      categoria: 'google',
      etiqueta: 'Google Cal',
      icono: '📅',
      colorTexto: 'text-sky-400',
      colorBg: 'bg-sky-500/10',
      colorBorder: 'border-sky-500/25',
    }
  }

  if (item.tipo === 'tarea') {
    return {
      categoria: 'tarea',
      etiqueta: 'Tarea',
      icono: '⏰',
      colorTexto: 'text-indigo-400',
      colorBg: 'bg-indigo-500/10',
      colorBorder: 'border-indigo-500/25',
    }
  }

  return {
    categoria: 'evento',
    etiqueta: 'Evento',
    icono: '📅',
    colorTexto: 'text-sky-400',
    colorBg: 'bg-sky-500/10',
    colorBorder: 'border-sky-500/25',
  }
}

export function getEtiquetaFechaRelativa(fechaStr: string, horaInicio?: string): {
  texto: string
  esHoy: boolean
  esManana: boolean
  diasDiferencia: number
  etiquetaDias: string
} {
  const ahora = new Date()
  const y = ahora.getFullYear()
  const m = String(ahora.getMonth() + 1).padStart(2, '0')
  const d = String(ahora.getDate()).padStart(2, '0')
  const hoyStr = `${y}-${m}-${d}`

  const fechaCorta = fechaStr.slice(0, 10)
  const fechaObj = parsearFechaLocal(fechaCorta)
  const hoyObj = new Date(y, ahora.getMonth(), ahora.getDate())
  const diffMs = fechaObj.getTime() - hoyObj.getTime()
  const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDias === 0 || fechaCorta === hoyStr) {
    return {
      texto: horaInicio ? `Hoy · ${horaInicio}` : 'Hoy',
      esHoy: true,
      esManana: false,
      diasDiferencia: 0,
      etiquetaDias: 'Hoy',
    }
  }

  if (diffDias === 1) {
    return {
      texto: horaInicio ? `Mañana · ${horaInicio}` : 'Mañana',
      esHoy: false,
      esManana: true,
      diasDiferencia: 1,
      etiquetaDias: 'Mañana',
    }
  }

  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const mes = meses[fechaObj.getMonth()]
  const año = fechaObj.getFullYear() !== y ? ` ${fechaObj.getFullYear()}` : ''

  if (diffDias > 1 && diffDias <= 6) {
    const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const diaSemana = nombresDias[fechaObj.getDay()]
    return {
      texto: `${diaSemana} ${fechaObj.getDate()} ${mes}`,
      esHoy: false,
      esManana: false,
      diasDiferencia: diffDias,
      etiquetaDias: `En ${diffDias} días`,
    }
  }

  return {
    texto: `${fechaObj.getDate()} ${mes}${año}`,
    esHoy: false,
    esManana: false,
    diasDiferencia: diffDias,
    etiquetaDias: diffDias > 0 ? `En ${diffDias} días` : '',
  }
}

