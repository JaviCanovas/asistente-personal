import { NextRequest, NextResponse } from 'next/server'

/**
 * Configura el webhook de Telegram para que apunte a esta URL.
 *
 * USO (una sola vez, desde tu terminal o navegador):
 *   GET /api/telegram/set-webhook?url=https://tu-app.vercel.app/api/telegram/webhook
 *
 * O también puedes ejecutar:
 *   curl "https://api.telegram.org/bot<TU_TOKEN>/setWebhook?url=https://tu-app.vercel.app/api/telegram/webhook"
 *
 * Nota: Telegram requiere HTTPS. Vercel ya lo provee.
 */

export async function GET(request: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN

  if (!botToken) {
    return NextResponse.json(
      { error: 'Falta TELEGRAM_BOT_TOKEN en variables de entorno' },
      { status: 500 }
    )
  }

  // Obtener la URL base de la app
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const webhookUrl = `${appUrl.replace(/\/$/, '')}/api/telegram/webhook`

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'edited_message'],
      }),
    })

    const data = await response.json()

    if (data.ok) {
      return NextResponse.json({
        ok: true,
        webhook_url: webhookUrl,
        result: data.result,
      })
    } else {
      return NextResponse.json(
        { ok: false, error: data.description || 'Error desconocido', raw: data },
        { status: 500 }
      )
    }
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    )
  }
}
