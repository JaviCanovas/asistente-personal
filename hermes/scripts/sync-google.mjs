import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Cargar .env.local
let envContent = ''
try {
  envContent = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8')
} catch (e) {
  console.error('❌ Error leyendo .env.local:', e.message)
}

const envVars = {}
envContent.split('\n').forEach(line => {
  const cleanLine = line.trim()
  if (cleanLine && !cleanLine.startsWith('#')) {
    const [key, ...valueParts] = cleanLine.split('=')
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim()
    }
  }
})

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || envVars.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || envVars.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || envVars.GOOGLE_CLIENT_SECRET
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || envVars.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`

console.log('🔑 Credenciales cargadas:')
console.log('  Supabase URL:', SUPABASE_URL)
console.log('  Google Client ID:', CLIENT_ID ? `${CLIENT_ID.substring(0, 15)}...` : 'FALTA')

if (!SUPABASE_URL || !SUPABASE_KEY || !CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Faltan variables de entorno necesarias.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function getOAuth2Client() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
}

async function getGoogleCredentials() {
  const { data, error } = await supabase
    .from('google_credentials')
    .select('*')
    .maybeSingle()

  if (error) {
    console.error('Error al obtener google_credentials:', error.message)
    return null
  }
  return data
}

async function getAuthenticatedAuthClient() {
  const creds = await getGoogleCredentials()
  if (!creds) {
    console.error('❌ No se encontraron credenciales de Google en Supabase.')
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
    console.log('🔄 Token expirado, renovando con refresh token...')
    try {
      const { credentials } = await oauth2Client.refreshAccessToken()
      oauth2Client.setCredentials(credentials)

      const updateData = {
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

      console.log('✅ Token de acceso renovado correctamente.')
    } catch (err) {
      console.error('❌ Error renovando token de Google:', err.message)
      return null
    }
  }

  return oauth2Client
}

// Formatear item para Google Calendar (con soporte para eventos de todo el día y rangos)
function mapearItemAEventoGoogle(item) {
  const fechaInicioRaw = item.fecha_evento || item.fecha_limite
  if (!fechaInicioRaw) return null

  const fechaInicioStr = fechaInicioRaw.split('T')[0]
  const fechaFinRaw = item.fecha_limite || item.fecha_evento
  const fechaFinStr = fechaFinRaw.split('T')[0]

  const isAllDay = !item.hora_inicio

  let startObj = {}
  let endObj = {}

  if (isAllDay) {
    startObj = { date: fechaInicioStr }
    // Para Google Calendar, el 'end.date' en eventos todo el día es exclusivo (el día siguiente al último día)
    const endDateObj = new Date(fechaFinStr)
    endDateObj.setDate(endDateObj.getDate() + 1)
    const nextDayStr = endDateObj.toISOString().split('T')[0]
    endObj = { date: nextDayStr }
  } else {
    const startIso = `${fechaInicioStr}T${item.hora_inicio}:00`
    const endIso = `${fechaFinStr}T${item.hora_fin || '23:59'}:00`
    startObj = { dateTime: new Date(startIso).toISOString(), timeZone: 'Europe/Madrid' }
    endObj = { dateTime: new Date(endIso).toISOString(), timeZone: 'Europe/Madrid' }
  }

  return {
    summary: `${item.tipo === 'tarea' ? '☑️ ' : '📅 '}${item.titulo}`,
    description: `${item.descripcion || ''}\n\n[Hermes Planner — ${item.etiquetas?.join(', ') || ''}]`,
    start: startObj,
    end: endObj,
  }
}

async function startSync() {
  console.log('🚀 Autenticando con Google Calendar API...')
  const auth = await getAuthenticatedAuthClient()
  if (!auth) {
    console.error('❌ No fue posible obtener un cliente Google autenticado.')
    process.exit(1)
  }

  const calendar = google.calendar({ version: 'v3', auth })

  // Obtener items activos no sincronizados aún o pertenecientes a 'No lectivo — Máster Big Data UMU'
  const { data: items, error } = await supabase
    .from('items')
    .select('*')
    .neq('estado', 'archivado')

  if (error) {
    console.error('❌ Error obteniendo items:', error.message)
    process.exit(1)
  }

  // Filtrar los que no tienen google_event_id
  const pendientes = items.filter(i => !i.google_event_id && (i.fecha_evento || i.fecha_limite))
  console.log(`📦 Encontrados ${pendientes.length} items pendientes de sincronizar en Google Calendar.`)

  let ok = 0
  let errCount = 0

  for (const item of pendientes) {
    const eventBody = mapearItemAEventoGoogle(item)
    if (!eventBody) continue

    try {
      const res = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: eventBody,
      })

      const googleId = res.data.id
      if (googleId) {
        await supabase
          .from('items')
          .update({ google_event_id: googleId })
          .eq('id', item.id)
        
        console.log(`  ✅ Sincronizado en Google Calendar: "${item.titulo}" (Google Event ID: ${googleId})`)
        ok++
      }
    } catch (err) {
      console.error(`  ❌ Error al sincronizar "${item.titulo}":`, err.message)
      errCount++
    }
  }

  console.log(`\n🎉 Sincronización finalizada: ${ok} exitosos, ${errCount} errores.`)
}

startSync()
