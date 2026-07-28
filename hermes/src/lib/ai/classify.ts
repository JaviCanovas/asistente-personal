import * as chrono from 'chrono-node'
import type { ClasificacionSugerida, ItemTipo, ItemPrioridad } from '../types'

// ============================================================
// HERMES — Clasificador heurístico de items
// ============================================================
// Sin LLM: usa keywords, regex y chrono-node para español.
// Devuelve sugerencias con nivel de confianza y razón explicada.
// ============================================================

// ——— Diccionario de keywords por tipo ————————————————————

const KEYWORDS_TIPO: Record<ItemTipo, string[]> = {
  tarea: [
    'hacer', 'completar', 'terminar', 'acabar', 'enviar', 'revisar',
    'preparar', 'organizar', 'actualizar', 'llamar', 'contactar',
    'comprar', 'buscar', 'investigar', 'implementar', 'desarrollar',
    'configurar', 'instalar', 'arreglar', 'corregir', 'escribir',
    'redactar', 'aprobar', 'pagar', 'gestionar', 'tramitar',
  ],
  evento: [
    'reunión', 'meeting', 'cita', 'entrevista', 'evento', 'conferencia',
    'charla', 'presentación', 'cumpleaños', 'aniversario', 'partido',
    'concierto', 'viaje', 'vuelo', 'tren', 'cena', 'almuerzo', 'café',
    'quedada', 'visita', 'clase', 'curso', 'taller', 'webinar',
  ],
  idea: [
    'idea', 'pensar', 'quizás', 'podría', 'sería interesante', 'qué tal si',
    'propuesta', 'concepto', 'brainstorm', 'explorar', 'investigar',
    '¿y si', 'se me ocurre', 'posibilidad', 'alternativa', 'sugerencia',
  ],
  nota: [
    'nota', 'apunte', 'recordar', 'no olvidar', 'anotar', 'información',
    'datos', 'referencia', 'enlace', 'link', 'resumen', 'documentación',
    'contraseña', 'código', 'número', 'dirección', 'horario',
  ],
  recordatorio: [
    'recordatorio', 'recordar', 'avisar', 'no olvidar', 'acordarse',
    'alerta', 'aviso', 'notificación', 'recordar que', 'reminder',
  ],
}

// ——— Keywords de prioridad ————————————————————————————————

const KEYWORDS_URGENTE = [
  'urgente', 'urgentemente', 'asap', 'ya', 'inmediatamente', 'crítico',
  'emergencia', 'hoy mismo', 'ahora mismo', 'importantísimo',
]
const VERBOS_ACCION = '(?:añad[ae]|añadir|pon(?:er)?|guardar?|apunt[ae]r?|registr[ae]r?|crear?|insertar?|anot[ae]r?)'

interface PatronExplicito {
  regex: RegExp
  tipo: ItemTipo
  razon: string
}

const PATRONES_EXPLICITOS: PatronExplicito[] = [
  // NOTA
  {
    regex: new RegExp(`${VERBOS_ACCION}\\s+(?:a\\s+|en\\s+)?(?:las\\s+|los\\s+)?notas?`, 'i'),
    tipo: 'nota',
    razon: 'instrucción explícita de añadir a notas'
  },
  {
    regex: new RegExp(`${VERBOS_ACCION}\\s+(?:una?\\s+)?nota`, 'i'),
    tipo: 'nota',
    razon: 'instrucción explícita de crear una nota'
  },
  {
    regex: /^nota\s*:/i,
    tipo: 'nota',
    razon: 'prefijo "Nota:"'
  },
  {
    regex: /^(?:anot(?:ar?|a|ado)|apunta(?:r)?)\s+/i,
    tipo: 'nota',
    razon: 'comando de anotación al inicio del texto'
  },

  // IDEA
  {
    regex: new RegExp(`${VERBOS_ACCION}\\s+(?:a\\s+|en\\s+)?(?:las\\s+|los\\s+)?ideas?`, 'i'),
    tipo: 'idea',
    razon: 'instrucción explícita de añadir a ideas'
  },
  {
    regex: new RegExp(`${VERBOS_ACCION}\\s+(?:una?\\s+)?idea`, 'i'),
    tipo: 'idea',
    razon: 'instrucción explícita de crear una idea'
  },
  {
    regex: /^idea\s*:/i,
    tipo: 'idea',
    razon: 'prefijo "Idea:"'
  },

  // TAREA
  {
    regex: new RegExp(`${VERBOS_ACCION}\\s+(?:a\\s+|en\\s+)?(?:las\\s+|los\\s+)?tareas?`, 'i'),
    tipo: 'tarea',
    razon: 'instrucción explícita de añadir a tareas'
  },
  {
    regex: new RegExp(`${VERBOS_ACCION}\\s+(?:una?\\s+)?tarea`, 'i'),
    tipo: 'tarea',
    razon: 'instrucción explícita de crear una tarea'
  },
  {
    regex: /^tarea\s*:/i,
    tipo: 'tarea',
    razon: 'prefijo "Tarea:"'
  },
  {
    regex: /^(?:tengo\s+que|hay\s+que|debo|necesito)\s+/i,
    tipo: 'tarea',
    razon: 'expresión de obligación al inicio del texto'
  },

  // RECORDATORIO
  {
    regex: new RegExp(`${VERBOS_ACCION}\\s+(?:a\\s+|en\\s+)?(?:las\\s+|los\\s+)?recordatorios?`, 'i'),
    tipo: 'recordatorio',
    razon: 'instrucción explícita de añadir a recordatorios'
  },
  {
    regex: new RegExp(`${VERBOS_ACCION}\\s+(?:una?\\s+)?recordatorio`, 'i'),
    tipo: 'recordatorio',
    razon: 'instrucción explícita de crear un recordatorio'
  },
  {
    regex: /^(?:recordatorio|reminder)\s*:/i,
    tipo: 'recordatorio',
    razon: 'prefijo "Recordatorio:"'
  },
  {
    regex: /^(?:recuérda(?:me)?|recordar(?:me)?)\s+/i,
    tipo: 'recordatorio',
    razon: 'comando de recordatorio al inicio del texto'
  },

  // EVENTO
  {
    regex: new RegExp(`${VERBOS_ACCION}\\s+(?:a\\s+|en\\s+)?(?:las\\s+|los\\s+)?eventos?`, 'i'),
    tipo: 'evento',
    razon: 'instrucción explícita de añadir a eventos'
  },
  {
    regex: new RegExp(`${VERBOS_ACCION}\\s+(?:una?\\s+)?(?:reunión|evento|cita|meeting|bloque|llamada)`, 'i'),
    tipo: 'evento',
    razon: 'instrucción explícita de agendar reunión/evento'
  },
  {
    regex: /^(?:evento|reunión|cita|meeting|llamada)\s*:/i,
    tipo: 'evento',
    razon: 'prefijo de evento'
  },
  {
    regex: /^(?:agendar|programar)\s+/i,
    tipo: 'evento',
    razon: 'comando de agendamiento al inicio del texto'
  }
]

function detectarTipoExplicito(texto: string): { tipo: ItemTipo; confianza: number; razon: string } | null {
  let mejorMatch: { tipo: ItemTipo; confianza: number; razon: string; index: number } | null = null

  for (const patron of PATRONES_EXPLICITOS) {
    const match = texto.match(patron.regex)
    if (match && match.index !== undefined) {
      const confianza = match.index < 5 ? 0.95 : 0.8
      if (!mejorMatch || match.index < mejorMatch.index) {
        mejorMatch = {
          tipo: patron.tipo,
          confianza,
          razon: patron.razon,
          index: match.index
        }
      }
    }
  }

  return mejorMatch
}

const KEYWORDS_ALTA = [
  'importante', 'prioritario', 'pronto', 'necesito', 'debo',
  'tengo que', 'hay que', 'fundamental', 'clave',
]
const KEYWORDS_BAJA = [
  'cuando pueda', 'algún día', 'sin prisa', 'opcional', 'si hay tiempo',
  'eventualmente', 'quizás', 'a largo plazo',
]

// ——— Keywords de proyecto por nombre —————————————————————

const KEYWORDS_PROYECTO: Record<string, string[]> = {
  gym: ['gym', 'gimnasio', 'entreno', 'ejercicio', 'pesas', 'cardio', 'rutina', 'deporte'],
  trabajo: ['trabajo', 'reunión', 'cliente', 'proyecto', 'informe', 'presentación', 'jefe', 'empresa'],
  personal: ['casa', 'familia', 'personal', 'hobby', 'ocio', 'vacaciones', 'amigos'],
}

// ——— Utilidad: contar coincidencias ——————————————————————

function contarCoincidencias(texto: string, keywords: string[]): number {
  const textoLower = texto.toLowerCase()
  return keywords.filter(kw => textoLower.includes(kw.toLowerCase())).length
}

// ——— Detectar tipo ————————————————————————————————————————

function detectarTipo(texto: string): { tipo: ItemTipo; confianza: number } {
  const puntuaciones = Object.entries(KEYWORDS_TIPO).map(([tipo, keywords]) => ({
    tipo: tipo as ItemTipo,
    puntos: contarCoincidencias(texto, keywords),
  }))

  puntuaciones.sort((a, b) => b.puntos - a.puntos)
  const ganador = puntuaciones[0]

  if (ganador.puntos === 0) return { tipo: 'tarea', confianza: 0.3 }
  const total = puntuaciones.reduce((s, p) => s + p.puntos, 0)
  return {
    tipo: ganador.tipo,
    confianza: Math.min(ganador.puntos / total, 0.95),
  }
}

// ——— Detectar prioridad ———————————————————————————————————

function detectarPrioridad(texto: string): ItemPrioridad {
  if (contarCoincidencias(texto, KEYWORDS_URGENTE) > 0) return 'urgente'
  if (contarCoincidencias(texto, KEYWORDS_ALTA) > 0) return 'alta'
  if (contarCoincidencias(texto, KEYWORDS_BAJA) > 0) return 'baja'
  return 'media'
}

// ——— Detectar proyecto sugerido ——————————————————————————

function detectarProyecto(texto: string): string | undefined {
  const resultados = Object.entries(KEYWORDS_PROYECTO).map(([proyecto, keywords]) => ({
    proyecto,
    puntos: contarCoincidencias(texto, keywords),
  })).filter(r => r.puntos > 0)

  if (resultados.length === 0) return undefined
  resultados.sort((a, b) => b.puntos - a.puntos)
  return resultados[0].proyecto
}

// ——— Detectar etiquetas ———————————————————————————————————

const ETIQUETAS_POSIBLES: Record<string, string[]> = {
  urgente: KEYWORDS_URGENTE,
  trabajo: ['trabajo', 'reunión', 'cliente', 'empresa', 'proyecto', 'informe'],
  personal: ['personal', 'casa', 'familia', 'amigos'],
  salud: ['gym', 'deporte', 'salud', 'médico', 'comida', 'dieta', 'ejercicio'],
  finanzas: ['pagar', 'factura', 'banco', 'dinero', 'transferencia', 'impuesto'],
  aprendizaje: ['estudiar', 'aprender', 'curso', 'libro', 'leer', 'formación'],
  tecnología: ['código', 'programar', 'app', 'software', 'web', 'api', 'bug'],
}

function detectarEtiquetas(texto: string): string[] {
  return Object.entries(ETIQUETAS_POSIBLES)
    .filter(([, keywords]) => contarCoincidencias(texto, keywords) > 0)
    .map(([etiqueta]) => etiqueta)
}

// ——— Detectar fecha en lenguaje natural ——————————————————

function detectarFecha(texto: string): string | undefined {
  try {
    const resultados = chrono.es.parse(texto, new Date(), { forwardDate: true })
    if (resultados.length > 0 && resultados[0].date()) {
      return resultados[0].date().toISOString()
    }
  } catch {
    // chrono puede fallar en algunos casos — ignorar
  }
  return undefined
}

// ——— Función principal exportada —————————————————————————

export function clasificarItem(texto: string): ClasificacionSugerida {
  const explicito = detectarTipoExplicito(texto)
  
  let tipo: ItemTipo
  let confianza: number
  let razonTipo: string | null = null

  if (explicito) {
    tipo = explicito.tipo
    confianza = explicito.confianza
    razonTipo = explicito.razon
  } else {
    const res = detectarTipo(texto)
    tipo = res.tipo
    confianza = res.confianza
  }

  const prioridad = detectarPrioridad(texto)
  let proyecto_sugerido = detectarProyecto(texto)
  const etiquetas = detectarEtiquetas(texto)
  const fecha_limite = detectarFecha(texto)

  // Filtrar sugerencia de proyecto según el tipo de item (evitar clasificar eventos personales en proyectos)
  if (tipo === 'recordatorio' || tipo === 'nota') {
    proyecto_sugerido = undefined
  } else if (tipo === 'evento') {
    // Para eventos, solo sugerimos el proyecto 'trabajo' (ej: reunión de trabajo)
    if (proyecto_sugerido !== 'trabajo') {
      proyecto_sugerido = undefined
    }
  }

  // Construir razón explicada (no negociable según el prompt)
  const razones: string[] = []

  if (razonTipo) {
    const tipoLabel = tipo.charAt(0).toUpperCase() + tipo.slice(1)
    razones.push(`Clasificado como ${tipoLabel} por ${razonTipo}`)
  } else if (tipo !== 'tarea' || confianza > 0.5) {
    const tipoLabel = tipo.charAt(0).toUpperCase() + tipo.slice(1)
    razones.push(`Clasificado como ${tipoLabel} por las palabras detectadas en el texto`)
  }

  if (prioridad === 'urgente') razones.push('Marcado como urgente por palabras clave de urgencia')
  else if (prioridad === 'alta') razones.push('Prioridad alta por lenguaje de necesidad/importancia')
  else if (prioridad === 'baja') razones.push('Prioridad baja por lenguaje "cuando pueda" / sin prisa')
  if (fecha_limite) razones.push(`Fecha detectada en el texto: ${new Date(fecha_limite).toLocaleDateString('es-ES')}`)
  if (proyecto_sugerido) razones.push(`Relacionado con el proyecto "${proyecto_sugerido}" por palabras clave`)
  if (razones.length === 0) razones.push('Clasificación por defecto (sin señales claras en el texto)')

  return {
    tipo,
    proyecto_sugerido,
    etiquetas,
    fecha_limite,
    prioridad,
    razon: razones.join('. '),
    confianza,
  }
}
