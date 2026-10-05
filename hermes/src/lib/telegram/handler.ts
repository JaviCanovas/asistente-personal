import { clasificarItem } from '@/lib/ai/classify'
import { getItemsActivos } from '@/lib/actions/items'
import type { ClasificacionSugerida, ItemPrioridad } from '@/lib/types'
import { startOfDay, endOfDay, isWithinInterval, format } from 'date-fns'
import type { Item } from '@/lib/types'
import { razonarConGroq, GroqDecision } from './groq'

export interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    date: number
    chat: { id: number; type: string }
    from?: { id: number; is_bot: boolean; first_name: string }
    text?: string
  }
  edited_message?: {
    message_id: number
    date: number
    chat: { id: number; type: string }
    from?: { id: number; is_bot: boolean; first_name: string }
    text?: string
  }
}

export interface TelegramMessage {
  chatId: number
  text: string
  messageId: number
  date: number
  senderName?: string
}

export interface ProcesarMensajeResult {
  crearItem?: {
    titulo: string
    tipo: 'tarea' | 'evento' | 'idea' | 'nota' | 'recordatorio'
    descripcion?: string
    prioridad: ItemPrioridad
    fecha_limite?: string
    fecha_evento?: string
    hora_inicio?: string
    proyecto_id?: string
    etiquetas?: string[]
    razon: string
  }
  modificarItem?: {
    itemId: string
    nuevaFecha?: string
    nuevaHora?: string
    nuevoTitulo?: string
    nuevoTipo?: 'tarea' | 'evento' | 'idea' | 'nota' | 'recordatorio'
    razon: string
  }
  respuesta: string
  necesitaConfirmacion?: {
    clasificacion: ClasificacionSugerida
    mensaje: string
  }
  esConsulta: boolean
  accionProcesada?: 'heuristica' | 'groq' | 'comando' | 'confirmacion'
}

// ============================================================
// COMANDOS
// ============================================================

async function comandoStart(msg: TelegramMessage): Promise<{ chatId: number; text: string; replyToMessageId?: number }> {
  return {
    chatId: msg.chatId,
    text: `🤖 ¡Hola! Soy Hermes, tu asistente personal.

Puedes hablarme como lo harías con una persona:
• "Llamar a Juan el viernes" → te lo guardo como tarea
• "Reunión con el equipo mañana a las 10" → evento en tu calendario
• "Idea: podcast sobre IA" → idea guardada
• "Qué tengo hoy" → te muestro tu día
• "Tareas pendientes" → tus tareas activas

Si no estoy seguro de qué quieres, te lo pregunto antes de guardar nada.`,
    replyToMessageId: msg.messageId,
  }
}

async function comandoAyuda(msg: TelegramMessage): Promise<{ chatId: number; text: string; replyToMessageId?: number }> {
  const texto = `📖 *Comandos de Hermes:*

\/start → Iniciar conversación
\/ayuda → Este mensaje
\/hoy → Ver tu día (tareas + eventos)
\/tareas → Ver tareas pendientes

También puedes escribir cualquier cosa en lenguaje natural:
• "Comprar leche" → tarea
• "Cena con María el sábado" → evento
• "Idea: app deTracking" → idea

Si no estoy seguro, te pregunto antes de guardar.`

  return {
    chatId: msg.chatId,
    text: texto,
    replyToMessageId: msg.messageId,
  }
}

const COMMANDS: Record<string, (msg: TelegramMessage) => Promise<{ chatId: number; text: string; replyToMessageId?: number }>> = {
  start: comandoStart,
  ayuda: comandoAyuda,
}

// ============================================================
// DETECCIÓN DE CONSULTAS BÁSICAS
// ============================================================

const PATRONES_CONSULTA: RegExp[] = [
  /qué\s+(tengo|tengo\s+hoy|debo\s+hacer|hacer\s+hoy|hay\s+para\s+hoy)/i,
  /tareas?\s+(pendientes|para\s+hoy|de\s+hoy|activas)/i,
  /eventos?\s+(de\s+hoy|hoy|para\s+hoy)/i,
  /calendario\s+(de\s+hoy|hoy)/i,
  /mi\s+día/i,
  /qué\s+está\s+(en\s+el|para\s+el)\s*(calendario|día|hoy)/i,
  /estado\s+(de\s+las?\s+tareas|tareas|proyecto)/i,
  /progreso/i,
  /inbox/i,
  /sin\s+procesar/i,
  /cómo\s+(estás|eres|te\s+va|te\s+encuentras|está\s+el|está\s+todo|amigo|vas)/i,
  /estás\s+(bien|mal|okay|bien\s+y\s+tú|preparado|listo)/i,
  /qué\s+(tal|todo|hace|pasa)/i,
  /hola/i,
  /saludos/i,
]

function esConsultaBasica(texto: string): boolean {
  return PATRONES_CONSULTA.some(p => p.test(texto))
}

// ============================================================
// HANDLER PRINCIPAL
// ============================================================

export async function procesarMensajeTelegram(
  msg: TelegramMessage,
  allowedChatIds: number[],
  groqApiKey?: string,
  contextoConversacional?: string
): Promise<ProcesarMensajeResult> {
  const { chatId, text, messageId } = msg

  console.log(`[handler] procesando mensaje de ${chatId}: "${text}"`)
  console.log(`[handler] groqApiKey presente: ${groqApiKey ? 'si (longitud ' + groqApiKey.length + ')' : 'no'}`)

  // 1. Validar chat autorizado
  if (!allowedChatIds.includes(chatId)) {
    console.log(`[handler] Chat ${chatId} NO autorizado`)
    return {
      respuesta: '⚠️ Chat no autorizado. Contacta con el administrador para activar esta cuenta.',
      esConsulta: false,
      accionProcesada: 'heuristica',
    }
  }

  if (!text || text.trim().length === 0) {
    return {
      respuesta: '❌ No he recibido texto. Por favor, escribe un mensaje.',
      esConsulta: false,
      accionProcesada: 'heuristica',
    }
  }

  const texto = text.trim()

  // 2. Detectar comandos (/start, /ayuda, /hoy, /tareas)
  if (texto.startsWith('/')) {
    const comando = texto.slice(1).split(' ')[0].toLowerCase()
    const cmd = COMMANDS[comando]
    if (cmd) {
      const resultado = await cmd(msg)
      return { respuesta: resultado.text, esConsulta: false, accionProcesada: 'comando' }
    }
    return {
      respuesta: `❓ Comando no reconocido "\/${comando}". Escribe \/ayuda para ver lo que puedo hacer.`,
      esConsulta: false,
      accionProcesada: 'comando',
    }
  }

  // 3. Si Groq está disponible, utilizar Groq como motor principal (rápido, contextual, títulos limpios)
  if (groqApiKey) {
    console.log(`[handler] Razonando con Groq: "${texto}"`)
    const decision = await razonarConGroq(texto, groqApiKey, contextoConversacional)
    console.log(`[handler] Groq respondió: accion=${decision.accion}, titulo=${decision.titulo || 'ninguno'}, tipo=${decision.tipo}`)

    // Si Groq no falló de manera crítica, usamos su decisión
    if (!decision.razon?.startsWith('Error Groq:')) {
      return convertirDecisionAGroqResultado(decision, texto)
    }
    console.warn('[handler] Groq devolvió error, aplicando respaldo heurístico')
  }

  // 4. Si es consulta básica (sin Groq)
  if (esConsultaBasica(texto)) {
    return {
      respuesta: 'CONSULTA',
      esConsulta: true,
      accionProcesada: 'heuristica',
    }
  }

  // 5. Respaldo heurístico (cuando no hay Groq o falló)
  console.log(`[handler] Usando clasificador heurístico de respaldo para: "${texto}"`)
  const clasificacion = clasificarItem(texto)

  const prioridadMap: Record<string, ItemPrioridad> = {
    baja: 'baja',
    media: 'media',
    alta: 'alta',
    urgente: 'urgente',
  }

  const tituloLimpio = extractTitulo(texto, clasificacion)
  const esEvento = clasificacion.tipo === 'evento'

  const crearData: ProcesarMensajeResult['crearItem'] = {
    titulo: tituloLimpio,
    tipo: clasificacion.tipo,
    prioridad: prioridadMap[clasificacion.prioridad],
    razon: clasificacion.razon,
  }

  if (esEvento) {
    crearData.fecha_evento = clasificacion.fecha_limite
  } else if (clasificacion.fecha_limite) {
    crearData.fecha_limite = clasificacion.fecha_limite
  }

  if (clasificacion.etiquetas?.length) {
    crearData.etiquetas = clasificacion.etiquetas
  }

  const fechaMostrar = clasificacion.fecha_limite ? new Date(clasificacion.fecha_limite).toLocaleDateString('es-ES') : ''
  const confirmacionCreado = `✅ Guardado: "${crearData.titulo}"
📋 ${clasificacion.tipo.charAt(0).toUpperCase() + clasificacion.tipo.slice(1)} · ${clasificacion.prioridad} prioridad${fechaMostrar ? '\n📅 ' + fechaMostrar : ''}`

  return {
    crearItem: crearData,
    respuesta: confirmacionCreado,
    esConsulta: false,
    accionProcesada: 'heuristica',
  }
}

function convertirDecisionAGroqResultado(
  decision: GroqDecision,
  textoOriginal: string
): ProcesarMensajeResult {
  switch (decision.accion) {
    case 'crear': {
      const tipo = decision.tipo || 'tarea'
      const titulo = decision.titulo || extractTitulo(textoOriginal)
      const prioridad = decision.prioridad || 'media'
      const fecha_evento = decision.fecha_evento || (tipo === 'evento' ? decision.fecha_limite : undefined)
      const fecha_limite = decision.fecha_limite || (tipo !== 'evento' ? decision.fecha_evento : undefined)

      let respuesta = decision.respuesta
      if (!respuesta) {
        const fechaLabel = fecha_evento || fecha_limite
        const horaLabel = decision.hora_inicio ? ` · ${decision.hora_inicio}` : ''
        respuesta = `✅ ${tipo.charAt(0).toUpperCase() + tipo.slice(1)} anotado: "${titulo}"${fechaLabel ? ' · ' + fechaLabel : ''}${horaLabel}`
      }

      return {
        crearItem: {
          titulo,
          tipo,
          prioridad,
          fecha_evento,
          fecha_limite,
          hora_inicio: decision.hora_inicio,
          razon: decision.razon || 'Procesado con IA de Hermes',
        },
        respuesta,
        esConsulta: false,
        accionProcesada: 'groq',
      }
    }

    case 'modificar': {
      return {
        modificarItem: {
          itemId: decision.item_id_a_modificar || '',
          nuevaFecha: decision.nueva_fecha,
          nuevaHora: decision.nueva_hora,
          nuevoTitulo: decision.nuevo_titulo,
          nuevoTipo: decision.nuevo_tipo,
          razon: decision.razon || 'Modificación solicitada',
        },
        respuesta: decision.respuesta || '✅ Ítem actualizado correctamente',
        esConsulta: false,
        accionProcesada: 'groq',
      }
    }

    case 'consultar':
      return {
        respuesta: decision.respuesta || 'CONSULTA',
        esConsulta: true,
        accionProcesada: 'groq',
      }

    case 'preguntar':
      return {
        respuesta: decision.pregunta || decision.respuesta || '¿Podrías darme más detalles?',
        esConsulta: false,
        accionProcesada: 'groq',
      }

    case 'responder':
    default:
      return {
        respuesta: decision.respuesta || 'He recibido tu mensaje.',
        esConsulta: false,
        accionProcesada: 'groq',
      }
  }
}

export function extractTitulo(texto: string, clasificacion?: ClasificacionSugerida): string {
  let titulo = texto.trim()

  // Quitar prefijos de comandos explícitos y fórmulas conversacionales
  const prefijos = [
    /^(?:tarea|evento|idea|nota|recordatorio|reminder)\s*:\s*/i,
    /^(?:recuérda(?:me)?(?:\s+que)?|recordar(?:me)?(?:\s+que)?)\s+/i,
    /^(?:apunta(?:r)?(?:\s+que)?|anota(?:r)?(?:\s+que)?)\s+/i,
    /^(?:no\s+olvid(?:es|ar)(?:\s+que)?)\s+/i,
    /^(?:tengo\s+que|hay\s+que|debo|necesito)\s+/i,
    /^(?:guarda(?:r)?(?:\s+que)?)\s+/i,
    /^(?:pon(?:me)?(?:\s+que)?)\s+/i,
    /^(?:añad(?:e|ir)(?:\s+que)?)\s+/i,
  ]

  for (const p of prefijos) {
    titulo = titulo.replace(p, '').trim()
  }

  // Quitar expresiones temporales iniciales que preceden al evento real
  // Ej: "el viernes por la noche tengo cena con los pibes" -> "cena con los pibes"
  // Ej: "este jueves voy al cine con gloria" -> "cine con gloria"
  titulo = titulo.replace(/^(?:que\s+)?(?:el|este|esta|próximo|proximo)\s+(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo|semana|finde|fin\s+de\s+semana)\s+(?:por\s+la\s+(?:mañana|tarde|noche)\s+)?(?:tengo|hay|voy\s+a\s+tener)?\s*/i, '').trim()

  // Quitar coletillas como "tengo cena..." -> "cena...", "voy al cine..." -> "cine..."
  titulo = titulo.replace(/^(?:tengo|voy\s+al?)\s+/i, '').trim()

  // Quitar fechas finales si están presentes (ej: "8 de Octubre", "el viernes")
  titulo = titulo.replace(/\s+(?:el\s+)?\d{1,2}(?:\s+de\s+[a-záéíóúñ]+(?:\s+de\s+\d{2,4})?)?\s*$/i, '').trim()
  titulo = titulo.replace(/\s+(?:el\s+|este\s+)?(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\s*$/i, '').trim()

  if (titulo.length > 80) {
    const match = titulo.match(/^([^.!?\n]{10,80})/)
    if (match) {
      titulo = match[0].trim()
    }
  }

  // Capitalizar primera letra
  if (titulo.length > 0) {
    titulo = titulo.charAt(0).toUpperCase() + titulo.slice(1)
  }

  return titulo || texto.slice(0, 80)
}

// ============================================================
// RESPUESTAS PARA CONSULTAS
// ============================================================

export async function responderConsultaHoy(msg: TelegramMessage): Promise<{ chatId: number; text: string; replyToMessageId?: number }> {
  const hoy = new Date()

  const items = await getItemsActivos()
  const activos = items.filter(i => i.estado === 'activo' || i.estado === 'sin_procesar')

  const eventosHoy = activos
    .filter(i => i.tipo === 'evento')
    .filter(i => {
      if (!i.fecha_evento) return false
      return isWithinInterval(new Date(i.fecha_evento), {
        start: startOfDay(hoy),
        end: endOfDay(hoy),
      })
    })
    .map(i => `📅 **${i.titulo}** (${i.hora_inicio || 'todo el día'})`)
    .join('\n')

  const hoyStr = format(hoy, 'yyyy-MM-dd')
  const tareasHoy = activos
    .filter(i => i.tipo !== 'evento')
    .sort((a, b) => {
      const aMiDia = (a.metadata as any)?.mi_dia_fecha === hoyStr ? 1 : 0
      const bMiDia = (b.metadata as any)?.mi_dia_fecha === hoyStr ? 1 : 0
      if (aMiDia !== bMiDia) return bMiDia - aMiDia
      return 0
    })
    .slice(0, 5)
    .map(i => {
      const esMiDia = (i.metadata as any)?.mi_dia_fecha === hoyStr
      const urgency = i.prioridad === 'urgente' ? '🔴' : i.prioridad === 'alta' ? '🟠' : '🟡'
      const vence = i.fecha_limite ? ` (vence ${new Date(i.fecha_limite!).toLocaleDateString('es-ES')})` : ''
      const tagMiDia = esMiDia ? ' ☀️ [Mi Día]' : ''
      return `${urgency} ${i.titulo}${tagMiDia}${vence}`
    })
    .join('\n')

  const sinProcesar = items.filter(i => i.estado === 'sin_procesar').length

  let texto = `📅 *Tu día ${format(hoy, 'EEEE d de MMMM')}*\n\n`

  if (eventosHoy) {
    texto += `*Eventos:*\n${eventosHoy}\n\n`
  } else {
    texto += `*Eventos:* Sin eventos programados hoy\n\n`
  }

  if (tareasHoy) {
    texto += `*Tareas prioritarias:*\n${tareasHoy}\n\n`
  } else {
    texto += `*Tareas:* No tienes tareas prioritarias hoy\n\n`
  }

  if (sinProcesar > 0) {
    texto += `📥 *Inbox:* Tienes ${sinProcesar} item(s) sin procesar. Dedica unos minutos a clasificarlos.`
  }

  return {
    chatId: msg.chatId,
    text: texto,
    replyToMessageId: msg.messageId,
  }
}

export async function responderConsultaTareas(msg: TelegramMessage): Promise<{ chatId: number; text: string; replyToMessageId?: number }> {
  const items = await getItemsActivos()
  const tareas = items
    .filter(i => i.tipo === 'tarea' && (i.estado === 'activo' || i.estado === 'sin_procesar'))
    .sort((a, b) => {
      const prioridadOrder: Record<string, number> = { urgente: 0, alta: 1, media: 2, baja: 3 }
      return (prioridadOrder[a.prioridad] ?? 4) - (prioridadOrder[b.prioridad] ?? 4)
    })
    .slice(0, 10)

  if (tareas.length === 0) {
    return {
      chatId: msg.chatId,
      text: '✅ *Tareas pendientes:*\n\nNo tienes tareas pendientes. ¡Todo al día!',
      replyToMessageId: msg.messageId,
    }
  }

  const texto = `📋 *Tareas pendientes (${tareas.length}):*\n\n` +
    tareas.map((t, i) => {
      const estado = t.estado === 'sin_procesar' ? '📥' : '✅'
      const urgency = t.prioridad === 'urgente' ? '🔴' : t.prioridad === 'alta' ? '🟠' : '🟡'
      const vence = t.fecha_limite ? ` — vence ${new Date(t.fecha_limite!).toLocaleDateString('es-ES')}` : ''
      const proyecto = t.proyecto?.nombre ? ` (${t.proyecto.nombre})` : ''
      return `${i + 1}. ${estado} ${urgency} **${t.titulo}**${proyecto}${vence}`
    }).join('\n') +
    `\n\n*Total: ${tareas.length} tarea(s)*`

  return {
    chatId: msg.chatId,
    text: texto,
    replyToMessageId: msg.messageId,
  }
}
