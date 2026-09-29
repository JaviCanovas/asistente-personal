export interface PasoTarea {
  id: string
  texto: string
  completado: boolean
}

const DIAS_SEMANA: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miércoles: 3,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sábado: 6,
  sabado: 6,
}

export function parseNaturalDate(input: string): { cleanTitle: string; dueDate: string | null } {
  let title = input.trim()
  const today = new Date()
  let targetDate: Date | null = null

  // 1. Pasado mañana
  const matchPasadoManana = title.match(/\b(para\s+)?pasado\s+mañana\b/i)
  if (matchPasadoManana) {
    targetDate = new Date(today)
    targetDate.setDate(today.getDate() + 2)
    title = title.replace(matchPasadoManana[0], '')
  }

  // 2. Mañana
  if (!targetDate) {
    const matchManana = title.match(/\b(para\s+)?mañana\b/i)
    if (matchManana) {
      targetDate = new Date(today)
      targetDate.setDate(today.getDate() + 1)
      title = title.replace(matchManana[0], '')
    }
  }

  // 3. Hoy
  if (!targetDate) {
    const matchHoy = title.match(/\b(para\s+)?hoy\b/i)
    if (matchHoy) {
      targetDate = new Date(today)
      title = title.replace(matchHoy[0], '')
    }
  }

  // 4. Días de la semana: "el viernes", "este viernes", "para el lunes"
  if (!targetDate) {
    const regexDia = /\b(?:para\s+)?(?:el\s+|este\s+)?(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\b/i
    const matchDia = title.match(regexDia)
    if (matchDia) {
      const diaTexto = matchDia[1].toLowerCase()
      const diaTarget = DIAS_SEMANA[diaTexto]
      if (diaTarget !== undefined) {
        const currentDay = today.getDay()
        let diff = diaTarget - currentDay
        if (diff <= 0) diff += 7 // próximo día de la semana
        targetDate = new Date(today)
        targetDate.setDate(today.getDate() + diff)
        title = title.replace(matchDia[0], '')
      }
    }
  }

  // Limpieza de caracteres residuales al final o inicio del título
  const cleanTitle = title
    .replace(/\s+/g, ' ')
    .replace(/\s+(para|el|en|de)$/i, '')
    .trim()

  const dueDate = targetDate ? targetDate.toISOString().split('T')[0] : null
  return { cleanTitle: cleanTitle || input.trim(), dueDate }
}
