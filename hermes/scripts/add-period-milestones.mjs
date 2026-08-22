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

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const TAG_NO_LECTIVO = 'No lectivo — Máster Big Data UMU'

// 10 Hitos explícitos de Inicio y Fin de periodos
const periodMilestones = [
  // VACACIONES NAVIDAD Y AÑO NUEVO
  {
    titulo: '🚀 Inicio: Vacaciones de Navidad y Año Nuevo',
    descripcion: 'Primer día del periodo vacacional de Navidad y Año Nuevo. No lectivo — Máster Big Data UMU.',
    fecha: '2026-12-21',
    categoria: 'vacaciones',
    tipoHito: 'inicio'
  },
  {
    titulo: '🏁 Fin: Vacaciones de Navidad y Año Nuevo',
    descripcion: 'Último día del periodo vacacional de Navidad y Año Nuevo. No lectivo — Máster Big Data UMU.',
    fecha: '2027-01-06',
    categoria: 'vacaciones',
    tipoHito: 'fin'
  },

  // VACACIONES SEMANA SANTA Y FIESTAS DE PRIMAVERA
  {
    titulo: '🚀 Inicio: Vacaciones de Semana Santa y Fiestas de Primavera',
    descripcion: 'Primer día del periodo vacacional de Semana Santa y Fiestas de Primavera. No lectivo — Máster Big Data UMU.',
    fecha: '2027-03-22',
    categoria: 'vacaciones',
    tipoHito: 'inicio'
  },
  {
    titulo: '🏁 Fin: Vacaciones de Semana Santa y Fiestas de Primavera',
    descripcion: 'Último día del periodo vacacional de Semana Santa y Fiestas de Primavera. No lectivo — Máster Big Data UMU.',
    fecha: '2027-04-04',
    categoria: 'vacaciones',
    tipoHito: 'fin'
  },

  // CONVOCATORIA I
  {
    titulo: '🚀 Inicio: Exámenes Convocatoria I',
    descripcion: 'Comienza el periodo de exámenes de la Convocatoria I. Máster Big Data UMU.',
    fecha: '2026-12-14',
    categoria: 'convocatoria',
    tipoHito: 'inicio'
  },
  {
    titulo: '🏁 Fin: Exámenes Convocatoria I (Entrega de Actas)',
    descripcion: 'Finaliza el periodo de exámenes de la Convocatoria I y fecha oficial de entrega de actas (29 ene 2027). Máster Big Data UMU.',
    fecha: '2027-01-29',
    categoria: 'convocatoria',
    tipoHito: 'fin'
  },

  // CONVOCATORIA II
  {
    titulo: '🚀 Inicio: Exámenes Convocatoria II',
    descripcion: 'Comienza el periodo de exámenes de la Convocatoria II. Máster Big Data UMU.',
    fecha: '2027-05-10',
    categoria: 'convocatoria',
    tipoHito: 'inicio'
  },
  {
    titulo: '🏁 Fin: Exámenes Convocatoria II',
    descripcion: 'Finaliza el periodo de exámenes de la Convocatoria II. Máster Big Data UMU.',
    fecha: '2027-06-06',
    categoria: 'convocatoria',
    tipoHito: 'fin'
  },

  // CONVOCATORIA III
  {
    titulo: '🚀 Inicio: Exámenes Convocatoria III',
    descripcion: 'Comienza el periodo de exámenes de la Convocatoria III. Máster Big Data UMU.',
    fecha: '2027-06-14',
    categoria: 'convocatoria',
    tipoHito: 'inicio'
  },
  {
    titulo: '🏁 Fin: Exámenes Convocatoria III',
    descripcion: 'Finaliza el periodo de exámenes de la Convocatoria III. Máster Big Data UMU.',
    fecha: '2027-07-04',
    categoria: 'convocatoria',
    tipoHito: 'fin'
  }
]

async function getAuthenticatedAuthClient() {
  const { data: creds } = await supabase.from('google_credentials').select('*').maybeSingle()
  if (!creds) return null

  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
  oauth2Client.setCredentials({
    access_token: creds.access_token,
    refresh_token: creds.refresh_token,
    expiry_date: creds.expiry_date
  })

  const isExpired = creds.expiry_date ? Date.now() >= (creds.expiry_date - 60000) : true
  if (isExpired && creds.refresh_token) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken()
      oauth2Client.setCredentials(credentials)
      await supabase.from('google_credentials').update({
        access_token: credentials.access_token,
        expiry_date: credentials.expiry_date,
        updated_at: new Date().toISOString()
      }).eq('id', creds.id)
    } catch (e) {
      console.error('Error refrescando token:', e.message)
      return null
    }
  }
  return oauth2Client
}

async function run() {
  console.log('🚀 1. Insertando 10 hitos explícitos de Inicio y Fin de periodos en Supabase...')
  const auth = await getAuthenticatedAuthClient()
  const calendar = auth ? google.calendar({ version: 'v3', auth }) : null

  // Obtener items existentes para evitar duplicados
  const { data: existentes } = await supabase.from('items').select('*')

  let creados = 0
  for (const m of periodMilestones) {
    const yaExiste = existentes?.find(i => i.titulo === m.titulo)
    if (yaExiste) {
      console.log(`  ⚠️ Hito "${m.titulo}" ya existía en Supabase.`)
      continue
    }

    const { data: item, error: insertErr } = await supabase
      .from('items')
      .insert({
        tipo: 'evento',
        titulo: m.titulo,
        descripcion: m.descripcion,
        estado: 'activo',
        prioridad: 'alta',
        fecha_evento: `${m.fecha}T00:00:00.000Z`,
        fecha_limite: `${m.fecha}T23:59:59.999Z`,
        etiquetas: [TAG_NO_LECTIVO, m.categoria, m.tipoHito],
        origen: 'web',
        metadata: {
          hito_periodo: true,
          tipo_hito: m.tipoHito,
          categoria: m.categoria,
          fecha: m.fecha
        }
      })
      .select()
      .single()

    if (insertErr) {
      console.error(`  ❌ Error insertando "${m.titulo}":`, insertErr.message)
      continue
    }

    console.log(`  ✅ Creado en Supabase: "${item.titulo}" (${m.fecha})`)
    creados++

    // Sincronizar en Google Calendar
    if (calendar) {
      try {
        const endDateObj = new Date(m.fecha)
        endDateObj.setDate(endDateObj.getDate() + 1)
        const nextDayStr = endDateObj.toISOString().split('T')[0]

        const res = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: {
            summary: `📅 ${item.titulo}`,
            description: `${item.descripcion}\n\n[Hermes Planner — ${TAG_NO_LECTIVO}]`,
            start: { date: m.fecha },
            end: { date: nextDayStr }
          }
        })

        if (res.data.id) {
          await supabase.from('items').update({ google_event_id: res.data.id }).eq('id', item.id)
          console.log(`    🗓️ Sincronizado en Google Calendar ID: ${res.data.id}`)
        }
      } catch (gErr) {
        console.error(`    ❌ Error sincronizando en Google Calendar:`, gErr.message)
      }
    }
  }

  console.log(`\n🎉 Finalizado. ${creados} hitos de periodo creados y sincronizados correctamente.`)
}

run()
