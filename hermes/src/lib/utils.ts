import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns'
import { es } from 'date-fns/locale'
import type { ItemTipo, ItemPrioridad, ItemEstado } from './types'

// ——— Merge de clases Tailwind ——————————————————————————————
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ——— Formateo de fechas en español ————————————————————————
export function formatFecha(fecha: string | Date, pattern = 'd MMM yyyy') {
  return format(new Date(fecha), pattern, { locale: es })
}

export function formatFechaRelativa(fecha: string | Date) {
  try {
    const d = new Date(fecha)
    if (isNaN(d.getTime())) return ''
    const year = d.getFullYear()
    if (year < 1900 || year > 2100) {
      return format(d, 'd MMM yyyy', { locale: es })
    }
    if (isToday(d)) return 'Hoy'
    if (isTomorrow(d)) return 'Mañana'
    if (isPast(d)) return `Hace ${formatDistanceToNow(d, { locale: es })}`
    return formatDistanceToNow(d, { addSuffix: true, locale: es })
  } catch {
    return ''
  }
}

// ——— Colores por tipo de item ——————————————————————————————
export const TIPO_CONFIG: Record<ItemTipo, { label: string; emoji: string; color: string; bg: string }> = {
  tarea:        { label: 'Tarea',        emoji: '✅', color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
  evento:       { label: 'Evento',       emoji: '📅', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  idea:         { label: 'Idea',         emoji: '💡', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  nota:         { label: 'Nota',         emoji: '📝', color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20' },
  recordatorio: { label: 'Recordatorio', emoji: '🔔', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
}

// ——— Colores por prioridad ————————————————————————————————
export const PRIORIDAD_CONFIG: Record<ItemPrioridad, { label: string; color: string; dot: string }> = {
  baja:    { label: 'Baja',    color: 'text-slate-400',  dot: 'bg-slate-400' },
  media:   { label: 'Media',   color: 'text-blue-400',   dot: 'bg-blue-400' },
  alta:    { label: 'Alta',    color: 'text-orange-400', dot: 'bg-orange-400' },
  urgente: { label: 'Urgente', color: 'text-red-400',    dot: 'bg-red-400' },
}

// ——— Labels de estado ——————————————————————————————————————
export const ESTADO_CONFIG: Record<ItemEstado, { label: string; color: string }> = {
  sin_procesar: { label: 'Sin procesar', color: 'text-slate-400' },
  activo:       { label: 'Activo',       color: 'text-blue-400' },
  hecho:        { label: 'Hecho',        color: 'text-green-400' },
  archivado:    { label: 'Archivado',    color: 'text-slate-500' },
}

// ——— Colores predefinidos para proyectos ——————————————————
export const COLORES_PROYECTO = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#f97316', '#ef4444',
]

// ——— Calcular puntuación de prioridad ————————————————————
export function calcularPuntuacionPrioridad(
  prioridad: ItemPrioridad,
  fechaLimite?: string
): number {
  const PESO_PRIORIDAD: Record<ItemPrioridad, number> = {
    baja: 10, media: 30, alta: 60, urgente: 100,
  }
  let puntuacion = PESO_PRIORIDAD[prioridad]

  if (fechaLimite) {
    const dias = Math.ceil(
      (new Date(fechaLimite).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    if (dias < 0) puntuacion += 80      // vencido
    else if (dias === 0) puntuacion += 60 // hoy
    else if (dias === 1) puntuacion += 40 // mañana
    else if (dias <= 3) puntuacion += 20
    else if (dias <= 7) puntuacion += 10
  }

  return Math.min(puntuacion, 200)
}

// ——— Truncar texto ————————————————————————————————————————
export function truncate(text: string, maxLength = 80): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '…'
}

// ——— Actualizar las notas de la plantilla del gimnasio ———————
export function actualizarNotasPlantilla(notaOriginal: string | undefined, notaLog: string): string {
  const logTrimmed = notaLog.trim()
  if (!logTrimmed) return notaOriginal || ''
  
  const orig = (notaOriginal || '').trim()
  if (!orig) return logTrimmed

  // Si el valor ingresado es exactamente igual a la nota original, no cambiamos nada
  if (logTrimmed === orig) return orig

  const parts = orig.split('|').map(p => p.trim())
  const lastPart = parts[parts.length - 1]

  // Comprobamos si la última parte parece un registro de repeticiones (ej: "6-6-5-5", "12-", "8-8", "15 rep/lado")
  // Es un log si consiste principalmente de números, guiones, espacios, comas, o contiene la palabra "rep"
  const isRepLog = /^[0-9\s\-+,x]*(rep[s]?)?$/i.test(lastPart) || lastPart.toLowerCase().includes('rep')

  if (isRepLog && parts.length > 1) {
    // Reemplazar la última parte del log
    parts[parts.length - 1] = logTrimmed
    return parts.join(' | ')
  } else if (isRepLog && parts.length === 1) {
    // Si solo era un log de reps, lo reemplazamos por el nuevo
    return logTrimmed
  } else {
    // Si no parece un log de reps, lo añadimos al final respetando la estructura
    return `${orig} | ${logTrimmed}`
  }
}

