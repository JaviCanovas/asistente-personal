import { NextRequest, NextResponse } from 'next/server'
import {
  procesarMensajeTelegram,
  responderConsultaHoy,
  responderConsultaTareas,
  TelegramMessage,
  TelegramUpdate,
} from '@/lib/telegram/handler'
import { crearItem, actualizarItem, getItemsActivos } from '@/lib/actions/items'
import { razonarConGroq } from '@/lib/telegram/groq'

function getAllowedChatIds(): number[] {
  const raw = process.env.TELEGRAM_ALLOWED_CHAT_IDS || ''
  return raw
    .split(',')
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
      // Reintentar sin parse_mode: 'Markdown' por si caracteres especiales rompieron el parseo
      const retryResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          reply_to_message_id: replyTo,
        }),
      })

      if (!retryResponse.ok) {
        const errorText = await retryResponse.text()
        console.error(`[enviarRespuestaTelegram] Error final enviando Telegram (${retryResponse.status}): ${errorText}`)
      }
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

    console.log(`[Telegram Webhook] Recibido mensaje de chat ${msg.chatId}: "${msg.text}"`)

    // Obtener los ítems más recientes para darle memoria y contexto a Groq
    let contextoReciente = ''
    let ultimoItem: any = null
    try {
      const items = await getItemsActivos()
      const recientes = items.slice(0, 4)
      if (recientes.length > 0) {
        ultimoItem = recientes[0]
        contextoReciente = recientes
          .map(
            it =>
              `- [ID: ${it.id}] "${it.titulo}" (${it.tipo}${
                it.fecha_evento ? ', fecha_evento: ' + it.fecha_evento.slice(0, 10) : ''
              }${it.fecha_limite ? ', fecha_limite: ' + it.fecha_limite.slice(0, 10) : ''}${
                it.hora_inicio ? ', hora: ' + it.hora_inicio : ''
              })`
          )
          .join('\n')
      }
    } catch (e) {
      console.warn('[Telegram Webhook] No se pudo obtener items para contexto:', e)
    }

    const resultado = await procesarMensajeTelegram(
      msg,
      allowedChatIds,
      groqApiKey ? groqApiKey : '',
      contextoReciente
    )

    // 1. Modificar ítem existente (correcciones como "Tiene que ser jueves", "Cámbialo a las 20:00")
    if (resultado.modificarItem) {
      try {
        const targetId = resultado.modificarItem.itemId || (ultimoItem ? ultimoItem.id : null)
        if (targetId) {
          const updates: any = {}
          if (resultado.modificarItem.nuevaFecha) {
            if (resultado.modificarItem.nuevoTipo === 'evento' || ultimoItem?.tipo === 'evento') {
              updates.fecha_evento = resultado.modificarItem.nuevaFecha
              updates.fecha_limite = null
            } else {
              updates.fecha_limite = resultado.modificarItem.nuevaFecha
            }
          }
          if (resultado.modificarItem.nuevaHora) {
            updates.hora_inicio = resultado.modificarItem.nuevaHora
          }
          if (resultado.modificarItem.nuevoTitulo) {
            updates.titulo = resultado.modificarItem.nuevoTitulo
          }
          if (resultado.modificarItem.nuevoTipo) {
            updates.tipo = resultado.modificarItem.nuevoTipo
          }

          await actualizarItem(targetId, updates)
          await enviarRespuestaTelegram(msg.chatId, resultado.respuesta, msg.messageId)
          console.log(`[Telegram] Item modificado: ${targetId}`, updates)
          return NextResponse.json({ ok: true, update_processed: true, action: 'item_modificado', item_id: targetId })
        } else {
          await enviarRespuestaTelegram(msg.chatId, '⚠️ No encontré el ítem previo para modificar. Por favor, indícame el nombre.', msg.messageId)
          return NextResponse.json({ ok: true, update_processed: true })
        }
      } catch (err: any) {
        console.error('[Telegram] Error al modificar ítem:', err.message)
        await enviarRespuestaTelegram(msg.chatId, `❌ Error al actualizar: ${err.message}`, msg.messageId)
        return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
      }
    }

    // 2. Crear ítem (evento, tarea, nota, recordatorio)
    if (resultado.crearItem) {
      try {
        const itemCreado = await crearItem({
          titulo: resultado.crearItem.titulo,
          tipo: resultado.crearItem.tipo,
          descripcion: resultado.crearItem.descripcion,
          prioridad: resultado.crearItem.prioridad,
          fecha_limite: resultado.crearItem.fecha_limite,
          fecha_evento: resultado.crearItem.fecha_evento,
          hora_inicio: resultado.crearItem.hora_inicio,
          proyecto_id: resultado.crearItem.proyecto_id,
          etiquetas: resultado.crearItem.etiquetas,
          en_mi_dia: resultado.crearItem.en_mi_dia,
          origen: 'telegram',
        })

        await enviarRespuestaTelegram(msg.chatId, resultado.respuesta, msg.messageId)
        console.log(`[Telegram] Item creado: "${itemCreado.titulo}" (${itemCreado.id}) - tipo: ${itemCreado.tipo}`)
        return NextResponse.json({ ok: true, update_processed: true, action: 'item_creado', item_id: itemCreado.id })
      } catch (err: any) {
        console.error('[Telegram] Error al crear item:', err.message)
        await enviarRespuestaTelegram(msg.chatId, `❌ Error al guardar: ${err.message}`, msg.messageId)
        return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
      }
    }

    // 3. Consultas
    if (resultado.esConsulta) {
      const textoLower = msg.text.toLowerCase()
      let response: { text: string; replyToMessageId?: number } = { text: '', replyToMessageId: msg.messageId }

      if (textoLower.includes('hoy') || textoLower.includes('qué tengo') || textoLower.includes('mi día')) {
        const r = await responderConsultaHoy(msg)
        response = { text: r.text, replyToMessageId: r.replyToMessageId }
      } else if (textoLower.includes('tarea') || textoLower.includes('tareas')) {
        const r = await responderConsultaTareas(msg)
        response = { text: r.text, replyToMessageId: r.replyToMessageId }
      } else if (resultado.respuesta && resultado.respuesta !== 'CONSULTA') {
        response = { text: resultado.respuesta, replyToMessageId: msg.messageId }
      } else {
        response = { text: '¿Qué te gustaría consultar? Puedes pedirme ver tu día con /hoy o tus tareas con /tareas.', replyToMessageId: msg.messageId }
      }

      await enviarRespuestaTelegram(msg.chatId, response.text, response.replyToMessageId)
      return NextResponse.json({ ok: true, update_processed: true, action: 'consulta' })
    }

    // 4. Confirmación pendiente
    if (resultado.necesitaConfirmacion) {
      await enviarRespuestaTelegram(msg.chatId, resultado.respuesta, msg.messageId)
      return NextResponse.json({ ok: true, update_processed: true, action: 'confirmacion_pendiente' })
    }

    // 5. Respuesta conversacional genérica
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
