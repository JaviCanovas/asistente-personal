import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'
import type { Item } from '@/lib/types'

// Configuración de las variables de entorno de Google OAuth
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`

export function getOAuth2Client() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
}

// Obtener credenciales guardadas en Supabase (si existen)
export async function getGoogleCredentials() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('google_credentials')
    .select('*')
    .maybeSingle()

  if (error) {
    console.error('[getGoogleCredentials] Error fetching credentials:', error.message)
    return null
  }
  return data
}

// Comprobar si Google Calendar está conectado
export async function isGoogleConnected(): Promise<boolean> {
  const creds = await getGoogleCredentials()
  return !!creds && !!creds.access_token
}

// Obtener cliente OAuth autenticado y con auto-refresh de tokens
export async function getAuthenticatedAuthClient() {
  const creds = await getGoogleCredentials()
  if (!creds) {
    console.log('[getAuthenticatedAuthClient] No Google credentials found.')
    return null
  }

  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({
    access_token: creds.access_token,
    refresh_token: creds.refresh_token,
    expiry_date: creds.expiry_date
  })

  // Comprobar si el token está próximo a expirar (o ya expiró)
  const isExpired = creds.expiry_date ? Date.now() >= (creds.expiry_date - 60000) : true

  if (isExpired && creds.refresh_token) {
    console.log('[getAuthenticatedAuthClient] Access token expired, refreshing...')
    try {
      const { credentials } = await oauth2Client.refreshAccessToken()
      oauth2Client.setCredentials(credentials)

      // Guardar nuevos tokens en la base de datos
      const supabase = await createClient()
      const updateData: any = {
        access_token: credentials.access_token,
        expiry_date: credentials.expiry_date,
        updated_at: new Date().toISOString()
      }
      if (credentials.refresh_token) {
        updateData.refresh_token = credentials.refresh_token
      }

      await supabase
        .from('google_credentials')
        .update(updateData)
        .eq('id', creds.id)

      console.log('[getAuthenticatedAuthClient] Access token refreshed successfully.')
    } catch (err: any) {
      console.error('[getAuthenticatedAuthClient] Error refreshing token:', err.message)
      return null
    }
  }

  return oauth2Client
}

// ============================================================
// OPERACIONES DE SINCRONIZACIÓN DE EVENTOS
// ============================================================

function mapearItemAEventoGoogle(item: Item) {
  const fechaStr = item.tipo === 'evento' ? item.fecha_evento : item.fecha_limite
  if (!fechaStr) return null

  // Google exige fechas en formato ISO para el timezone. Como Hermes guarda TIMESTAMPTZ, lo convertimos
  const startDateTime = new Date(fechaStr).toISOString()
  
  // Por defecto dura 1 hora
  const endDateTime = new Date(new Date(fechaStr).getTime() + 60 * 60 * 1000).toISOString()

  return {
    summary: `${item.tipo === 'tarea' ? '☑️ ' : '📅 '}${item.titulo}`,
    description: `${item.descripcion || ''}\n\nCreado desde Hermes Planner.`,
    start: {
      dateTime: startDateTime,
      timeZone: 'Europe/Madrid',
    },
    end: {
      dateTime: endDateTime,
      timeZone: 'Europe/Madrid',
    },
  }
}

// 1. Crear evento en Google Calendar
export async function crearEventoGoogle(item: Item): Promise<string | null> {
  const auth = await getAuthenticatedAuthClient()
  if (!auth) return null

  const eventData = mapearItemAEventoGoogle(item)
  if (!eventData) return null

  try {
    const calendar = google.calendar({ version: 'v3', auth })
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: eventData,
    })
    console.log('[crearEventoGoogle] Evento creado:', response.data.id)
    return response.data.id || null
  } catch (err: any) {
    console.error('[crearEventoGoogle] Error inserting event:', err.message)
    return null
  }
}

// 2. Actualizar evento existente
export async function actualizarEventoGoogle(item: Item, eventId: string): Promise<boolean> {
  const auth = await getAuthenticatedAuthClient()
  if (!auth) return false

  const eventData = mapearItemAEventoGoogle(item)
  if (!eventData) return false

  try {
    const calendar = google.calendar({ version: 'v3', auth })
    await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      requestBody: eventData,
    })
    console.log('[actualizarEventoGoogle] Evento actualizado:', eventId)
    return true
  } catch (err: any) {
    console.error('[actualizarEventoGoogle] Error updating event:', err.message)
    return false
  }
}

// 3. Eliminar evento
export async function eliminarEventoGoogle(eventId: string): Promise<boolean> {
  const auth = await getAuthenticatedAuthClient()
  if (!auth) return false

  try {
    const calendar = google.calendar({ version: 'v3', auth })
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    })
    console.log('[eliminarEventoGoogle] Evento eliminado:', eventId)
    return true
  } catch (err: any) {
    console.error('[eliminarEventoGoogle] Error deleting event:', err.message)
    return false
  }
}
