import { NextRequest, NextResponse } from 'next/server'
import { procesarMensajeTelegram, responderConsultaHoy, responderConsultaTareas, ProcesarMensajeResult, TelegramMessage } from '@/lib/telegram/handler'
import { crearItem, getItemsActivos } from '@/lib/actions/items'
import { TelegramUpdate } from '@/lib/telegram/handler'
import { razonarConGroq } from '@/lib/telegram/groq'

function getAllowedChatIds(): number[] {
  const raw = process.env.TELEGRAM_ALLOWED_CHAT_IDS || ''
  return raw.split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => parseInt(s, 10))
    .filter(n => !isNaN(n))
}

function getBotToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN || ''
}

function getGroqApiKey(): string {
  return process.env.GROQ_API_KEY || ''
}

async function enviarRespuestaTelegram(chatId: number, text: string, replyTo?: number): Promise<void> {
  const token = getBotToken()
  if (!token) {
    console.error('[enviarRespuestaTelegram] No hay token configurado')
    return
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      reply_to_message_id: replyTo,
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[enviarRespuestaTelegram] Telegram API error (${response.status}): ${errorText}`)
    }
  } catch (err) {
    console.error('[enviarRespuestaTelegram] Error de red:', err)
  }
}

export async function POST(request: NextRequest) {
  if (!getBotToken()) {
    console.error('[Telegram Webhook] TELEGRAM_BOT_TOKEN no configurado')
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 })
  }

  try {
    const body: TelegramUpdate = await request.json()

    if (!body.message && !body.edited_message) {
      return NextResponse.json({ ok: true, ignored: true })
    }

    const telegramMsg = body.message || body.edited_message
    if (!telegramMsg?.text) {
      return NextResponse.json({ ok: true, ignored: true })
    }

    const msg: TelegramMessage = {
      chatId: telegramMsg.chat.id,
      text: telegramMsg.text,
      messageId: telegramMsg.message_id,
      date: telegramMsg.date,
      senderName: telegramMsg.from?.first_name,
    }

    const allowedChatIds = getAllowedChatIds()
    const groqApiKey = getGroqApiKey()
    const resultado = await procesarMensajeTelegram(msg, allowedChatIds, groqApiKey ? groqApiKey : undefined)

    // Si es consulta, fetch de datos y responder
    if (resultado.esConsulta) {
      const textoLower = msg.text.toLowerCase()
      let response: { text: string; replyToMessageId?: number } = { text: '', replyToMessageId: msg.messageId }

      const groqKey = getGroqApiKey()

      if (textoLower.includes('hoy') || textoLower.includes('qué tengo') || textoLower.includes('mi día')) {
        const r = await responderConsultaHoy(msg)
        response = { text: r.text, replyToMessageId: r.replyToMessageId }
      } else if (textoLower.includes('tarea') || textoLower.includes('tareas')) {
        const r = await responderConsultaTareas(msg)
        response = { text: r.text, replyToMessageId: r.replyToMessageId }
      } else if (groqKey) {
        // Consulta compleja — Groq con contexto de datos
        const items = await getItemsActivos()
        const activos = items.filter(i => i.estado === 'activo' || i.estado === 'sin_procesar')

        const contexto = activos.length > 0
          ? `El usuario tiene ${activos.length} items activos: ${activos.slice(0, 10).map(i => `- ${i.titulo} (${i.tipo}, ${i.prioridad}, ${i.fecha_limite || 'sin fecha'})`).join('\n')}`
          : 'El usuario no tiene items activos.'

        const decision = await razonarConGroq(msg.text, groqKey, contexto)

        if (decision.accion === 'responder' && decision.respuesta) {
          response = { text: decision.respuesta, replyToMessageId: msg.messageId }
        } else if (decision.accion === 'crear' && decision.titulo) {
          // Groq decidió que en realidad es crear algo, no consultar
          // Creamos el item y respondemos
          const itemCreado = await crearItem({
            titulo: decision.titulo,
            tipo: decision.tipo || 'tarea',
            prioridad: decision.prioridad || 'media',
            fecha_limite: decision.fecha_limite,
          })
          response = {
            text: `✅ Guardado: "${decision.titulo}"\n📋 ${decision.tipo || 'tarea'} · ${decision.prioridad || 'media'} prioridad`,
            replyToMessageId: msg.messageId,
          }
          console.log(`[Telegram] Groq decidió crear item: "${decision.titulo}"`)
        } else if (decision.pregunta) {
          response = { text: decision.pregunta, replyToMessageId: msg.messageId }
        } else {
          response = { text: 'No estoy seguro de qué quieres consultar. Escribe /ayuda para ver las opciones.', replyToMessageId: msg.messageId }
        }
      } else {
        response = { text: 'No estoy seguro de qué quieres consultar. Escribe /ayuda para ver las opciones.', replyToMessageId: msg.messageId }
      }

      await enviarRespuestaTelegram(msg.chatId, response.text, response.replyToMessageId)
      return NextResponse.json({ ok: true, update_processed: true, action: 'consulta' })
    }

    // Confirmación pendiente
    if (resultado.necesitaConfirmacion) {
      await enviarRespuestaTelegram(msg.chatId, resultado.respuesta, msg.messageId)
      console.log(`[Telegram] Usuario ${msg.chatId} esperando confirmación`)
      return NextResponse.json({ ok: true, update_processed: true, action: 'confirmacion_pendiente' })
    }

    // Crear item
    if (resultado.crearItem) {
      try {
        const itemCreado = await crearItem({
          titulo: resultado.crearItem.titulo,
          tipo: resultado.crearItem.tipo,
          descripcion: resultado.crearItem.descripcion,
          prioridad: resultado.crearItem.prioridad,
          fecha_limite: resultado.crearItem.fecha_limite,
          proyecto_id: resultado.crearItem.proyecto_id,
          etiquetas: resultado.crearItem.etiquetas,
        })

        await enviarRespuestaTelegram(msg.chatId, resultado.respuesta, msg.messageId)
        console.log(`[Telegram] Item creado: "${itemCreado.titulo}" (${itemCreado.id})`)
        return NextResponse.json({ ok: true, update_processed: true, action: 'item_creado', item_id: itemCreado.id })
      } catch (err: any) {
        console.error('[Telegram] Error al crear item:', err.message)
        await enviarRespuestaTelegram(msg.chatId, `❌ Error al guardar: ${err.message}`, msg.messageId)
        return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
      }
    }

    // Respuesta genérica
    if (resultado.respuesta) {
      await enviarRespuestaTelegram(msg.chatId, resultado.respuesta, msg.messageId)
    }

    return NextResponse.json({ ok: true, update_processed: true })
  } catch (err: any) {
    console.error('[Telegram Webhook Error]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Telegram Webhook',
    timestamp: new Date().toISOString(),
  })
}
