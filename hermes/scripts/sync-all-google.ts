import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rnbyjtbcpxasourdfvfl.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`

function getOAuth2Client() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
}

async function getGoogleCredentials() {
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

async function getAuthenticatedAuthClient() {
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

  const isExpired = creds.expiry_date ? Date.now() >= (creds.expiry_date - 60000) : true

  if (isExpired && creds.refresh_token) {
    console.log('[getAuthenticatedAuthClient] Access token expired, refreshing...')
    try {
      const { credentials } = await oauth2Client.refreshAccessToken()
      oauth2Client.setCredentials(credentials)

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
      console.warn('[getAuthenticatedAuthClient] Error refreshing token:', err.message)
      return null
    }
  }

  return oauth2Client
}

function mapearItemAEventoGoogle(item: any) {
  const fechaStr = item.tipo === 'evento' ? item.fecha_evento : item.fecha_limite
  if (!fechaStr) return null

  const startDateTime = new Date(fechaStr).toISOString()
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

async function syncAll() {
  const auth = await getAuthenticatedAuthClient()
  if (!auth) {
    console.error('No se pudo obtener cliente de Google autenticado.')
    return
  }
  
  const calendar = google.calendar({ version: 'v3', auth })

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .or('fecha_evento.not.is.null,fecha_limite.not.is.null')

  if (error) {
    console.error('Error fetching items:', error)
    return
  }

  const pending = data.filter(item => !item.google_event_id)
  console.log(`Starting sync for ${pending.length} items...`)

  let successCount = 0
  for (const item of pending) {
    const eventData = mapearItemAEventoGoogle(item)
    if (!eventData) continue
    
    try {
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: eventData,
      })
      
      const newEventId = response.data.id
      if (newEventId) {
        await supabase
          .from('items')
          .update({ google_event_id: newEventId })
          .eq('id', item.id)
          
        console.log(`✅ Synced: ${item.titulo}`)
        successCount++
      }
    } catch (err: any) {
      console.error(`❌ Failed to sync: ${item.titulo}`, err.message)
    }
  }

  console.log(`\nFinished! Successfully synced ${successCount}/${pending.length} items.`)
}

syncAll()
