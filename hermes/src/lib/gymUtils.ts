// ============================================================
// HERMES — Utilidades de Gym (Intervalos de repeticiones y parsing de pesos)
// ============================================================

// Mapa canónico de intervalos de repeticiones objetivo (mínimo - máximo) por ejercicio
export const REPETICIONES_OBJETIVO_POR_EJERCICIO: Record<string, string> = {
  'press de banca (barra)': '5-6',
  'dominadas supinas': '6-8',
  'remo en t (máquina)': '8-10',
  'press militar (manc.)': '6-8',
  'elev. laterales (manc.)': '12-15',
  'curl bíceps martillo': '10-12',
  'elev. piernas suelo': '12-15',
  'sentadilla v-squat': '8-10',
  'peso muerto rumano': '8-10',
  'curl isquios (máquina)': '10-12',
  'extensión cuádriceps': '12-15',
  'aductores (máquina)': '12-15',
  'gemelos en máquina': '15-20',
  'plancha abdominal': '45-60 seg',
  'press inclinado (multi/manc)': '8-10',
  'fondos tríceps/pecho': '8-10',
  'aperturas (máquina/polea)': '12-15',
  'elev. laterales (máq/polea)': '12-15',
  'tríceps polea (cuerda)': '12-15',
  'press pallof (core)': '15 rep/lado',
  'dominadas pronas (abiertas)': '8-10',
  'remo agarre cerrado/gironda': '10-12',
  'jalón al pecho': '10-12',
  'face pull (polea alta)': '15-20',
  'bíceps curl': '10-12',
  'bíceps banco scott': '12-15',
  'máquina guiada abdominales': '10-12',
  'superserie: bíceps curl alterno + abs polea alta crunch': '10-12'
}

/**
 * Detecta si una cadena de repeticiones es un desglose de series ejecutadas de una sesión anterior
 * (ej: "12-12-12-12", "10-10-10", "8-8-8-8" o "12-12") en lugar de un rango objetivo ("12-15", "8-10").
 */
export function esFormatoSeriesHistoricas(reps?: string | null): boolean {
  if (!reps || typeof reps !== 'string') return false
  const trimmed = reps.trim()
  const partes = trimmed.split('-')
  // 3 o más series ejecutadas (ej. 12-12-12-12, 10-10-10, 8-8-8-8)
  if (partes.length >= 3 && partes.every(p => /^\d+$/.test(p.trim()))) return true
  // 2 series idénticas ejecutadas (ej. 12-12)
  if (partes.length === 2 && partes[0].trim() === partes[1].trim() && /^\d+$/.test(partes[0].trim())) {
    return true
  }
  return false
}

/**
 * Obtiene el intervalo de repeticiones objetivo (ej. "12-15") para un ejercicio,
 * saneando cualquier valor que haya quedado con el formato de series históricas de otra sesión.
 */
export function obtenerRepeticionesObjetivo(nombreEjercicio: string, repeticionesActuales?: string | null): string {
  const clave = nombreEjercicio.trim().toLowerCase()
  const objetivoPredefinido = REPETICIONES_OBJETIVO_POR_EJERCICIO[clave]

  if (!repeticionesActuales || esFormatoSeriesHistoricas(repeticionesActuales)) {
    return objetivoPredefinido || repeticionesActuales || '10-12'
  }

  return repeticionesActuales
}

/**
 * Convierte de manera segura cualquier entrada de peso (número o string con punto o coma decimal)
 * en un float numérico positivo.
 */
export function parsePesoKg(val: number | string | undefined | null): number {
  if (val === undefined || val === null || val === '') return 0
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.max(0, val)
  const cleaned = String(val).replace(',', '.')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : Math.max(0, parsed)
}
