'use server'

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
    proyecto_id?: string
    etiquetas?: string[]
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
  groqApiKey?: string
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

  // 2. Detectar comandos
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

  // 3. Detectar si es consulta básica (sin Groq)
  if (esConsultaBasica(texto)) {
    return {
      respuesta: 'CONSULTA',
      esConsulta: true,
      accionProcesada: 'heuristica',
    }
  }

  // 4. Intento heurístico primero (rápido)
  console.log(`[handler] Clasificando: "${texto}"`)
  const clasificacion = clasificarItem(texto)
  console.log(`[handler] Resultado heurístico: tipo=${clasificacion.tipo}, prioridad=${clasificacion.prioridad}, confianza=${clasificacion.confianza}, fecha_limite=${clasificacion.fecha_limite || 'ninguna'}`)
  const umbralConfirmacion = 0.6

  // 5. Si confianza baja → ir a Groq (razonamiento) si está disponible
  if (clasificacion.confianza < umbralConfirmacion && groqApiKey) {
    console.log(`[handler] Confianza baja (${clasificacion.confianza} < ${umbralConfirmacion}), llamando a Groq`)
    const decision = await razonarConGroq(texto, groqApiKey, undefined)
    console.log(`[handler] Groq respondió: accion=${decision.accion}, titulo=${decision.titulo || 'ninguno'}`)
    return convertirDecisionAGroqResultado(decision, texto, clasificacion)
  }

  console.log(`[handler] Confianza suficiente (${clasificacion.confianza}), usando heurística`)

  // 6. Confianza suficiente → crear item con heurística
  const prioridadMap: Record<string, ItemPrioridad> = {
    baja: 'baja',
    media: 'media',
    alta: 'alta',
    urgente: 'urgente',
  }

  const crearData: ProcesarMensajeResult['crearItem'] = {
    titulo: extractTitulo(texto, clasificacion),
    tipo: clasificacion.tipo,
    prioridad: prioridadMap[clasificacion.prioridad],
    razon: clasificacion.razon,
  }

  if (clasificacion.fecha_limite) {
    crearData.fecha_limite = clasificacion.fecha_limite
  }
  if (clasificacion.etiquetas?.length) {
    crearData.etiquetas = clasificacion.etiquetas
  }

  const confirmacionCreado = `✅ Guardado: "${crearData.titulo}"
📋 ${clasificacion.tipo.charAt(0).toUpperCase() + clasificacion.tipo.slice(1)} · ${clasificacion.prioridad} prioridad
${clasificacion.fecha_limite ? '📅 ' + new Date(clasificacion.fecha_limite!).toLocaleDateString('es-ES') : ''}
💬 ${clasificacion.razon}`

  return {
    crearItem: crearData,
    respuesta: confirmacionCreado,
    esConsulta: false,
    accionProcesada: 'heuristica',
  }
}

function convertirDecisionAGroqResultado(decision: GroqDecision, textoOriginal: string, clasificacionHeuristica?: ClasificacionSugerida): ProcesarMensajeResult {
  switch (decision.accion) {
    case 'crear':
      return {
        crearItem: {
          titulo: decision.titulo || textoOriginal.slice(0, 80),
          tipo: decision.tipo || 'tarea',
          prioridad: decision.prioridad || 'media',
          fecha_limite: decision.fecha_limite,
          razon: decision.razon || 'Decidido por Hermes (LLM)',
        },
        respuesta: `✅ Guardado: "${decision.titulo || textoOriginal.slice(0, 80)}"
📋 ${decision.tipo || 'tarea'} · ${decision.prioridad || 'media'} prioridad
💬 ${decision.razon || ''}`,
        esConsulta: false,
        accionProcesada: 'groq',
      }

    case 'preguntar':
      return {
        respuesta: decision.pregunta || '¿Podrías ser más específico sobre qué quieres?',
        esConsulta: false,
        accionProcesada: 'groq',
      }

    case 'responder':
    case 'consultar':
      return {
        respuesta: decision.respuesta || 'He procesado tu mensaje.',
        esConsulta: decision.accion === 'consultar',
        accionProcesada: 'groq',
      }

    default:
      return {
        respuesta: 'No he podido interpretar tu mensaje. Escribe /ayuda para ver opciones.',
        esConsulta: false,
        accionProcesada: 'groq',
      }
  }
}

function extractTitulo(texto: string, clasificacion: ClasificacionSugerida): string {
  let titulo = texto

  // Quitar prefijos de comando explícito
  const prefijos = [/^(?:tarea|evento|idea|nota|recordatorio|reminder)\s*:\s*/i]
  for (const p of prefijos) {
    const match = titulo.match(p)
    if (match) {
      titulo = titulo.slice(match[0].length)
    }
  }

  if (titulo.length > 100) {
    const match = titulo.match(/^([^.!?\n]{10,100}|[^.!?\n]+)/)
    if (match) {
      titulo = match[0].trim()
    }
  }

  return titulo.trim() || texto.slice(0, 80)
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

  const tareasHoy = activos
    .filter(i => i.tipo !== 'evento')
    .slice(0, 5)
    .map(i => {
      const urgency = i.prioridad === 'urgente' ? '🔴' : i.prioridad === 'alta' ? '🟠' : '🟡'
      const vence = i.fecha_limite ? ` (vence ${new Date(i.fecha_limite!).toLocaleDateString('es-ES')})` : ''
      return `${urgency} ${i.titulo}${vence}`
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
