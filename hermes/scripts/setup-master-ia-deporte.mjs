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

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Faltan credenciales de Supabase.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

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
      console.warn('⚠️ No se pudo refrescar token de Google:', e.message)
      return null
    }
  }
  return oauth2Client
}

// ============================================================
// DEFINICIÓN DE DATOS DEL MÁSTER EN IA APLICADA AL DEPORTE
// ============================================================

export const MASTER_NAME = 'Máster IA Deporte'
export const MASTER_PARENT_ID = '29d855e0-8f93-44be-9c14-81589aa5392c' // ID existente en DB

export const SUBLISTAS_MODULOS = [
  { id_suffix: 'm1', nombre: 'M1 – IA como valor diferencial', color: '#8b5cf6' },
  { id_suffix: 'm2', nombre: 'M2 – ETL', color: '#06b6d4' },
  { id_suffix: 'm3', nombre: 'M3 – BI y Storytelling', color: '#3b82f6' },
  { id_suffix: 'm4', nombre: 'M4 – Machine Learning', color: '#10b981' },
  { id_suffix: 'm5', nombre: 'M5 – Deep Learning', color: '#f59e0b' },
  { id_suffix: 'm6', nombre: 'M6 – NLP', color: '#ec4899' },
  { id_suffix: 'm7', nombre: 'M7 – Visión por computadora', color: '#6366f1' },
  { id_suffix: 'm8', nombre: 'M8 – IA Generativa', color: '#14b8a6' },
  { id_suffix: 'm9', nombre: 'M9 – PFM', color: '#ef4444' }
]

// PARTE A: BLOQUES DE MÓDULOS (Eventos de rango, todo el día)
export const EVENTOS_PARTE_A = [
  {
    titulo: '[M1] Inteligencia artificial como valor diferencial en la industria deportiva',
    descripcion: 'Bloque completo del Módulo 1. Sports Data Campus (14ª edición).',
    fecha_inicio: '2026-10-20',
    fecha_fin: '2026-11-16',
    es_rango: true,
    modulo: 'M1'
  },
  {
    titulo: '[M2] Fuentes de datos y técnicas ETL en el deporte',
    descripcion: 'Bloque completo del Módulo 2. Sports Data Campus (14ª edición).',
    fecha_inicio: '2026-11-17',
    fecha_fin: '2026-12-14',
    es_rango: true,
    modulo: 'M2'
  },
  {
    titulo: '[M3] Business Intelligence y Storytelling en el deporte',
    descripcion: 'Bloque completo del Módulo 3. Sports Data Campus (14ª edición).',
    fecha_inicio: '2026-12-15',
    fecha_fin: '2027-01-18',
    es_rango: true,
    modulo: 'M3'
  },
  {
    titulo: 'Vacaciones de Navidad',
    descripcion: 'Periodo no lectivo. Sports Data Campus (14ª edición).',
    fecha_inicio: '2026-12-19',
    fecha_fin: '2027-01-07',
    es_rango: true,
    modulo: 'General'
  },
  {
    titulo: '[M4] Machine Learning: estrategia deportiva con Scikit-learn',
    descripcion: 'Bloque completo del Módulo 4. Sports Data Campus (14ª edición).',
    fecha_inicio: '2027-01-19',
    fecha_fin: '2027-02-15',
    es_rango: true,
    modulo: 'M4'
  },
  {
    titulo: '[M5] Deep Learning con TensorFlow y Keras aplicado al deporte',
    descripcion: 'Bloque completo del Módulo 5. Sports Data Campus (14ª edición).',
    fecha_inicio: '2027-02-16',
    fecha_fin: '2027-03-15',
    es_rango: true,
    modulo: 'M5'
  },
  {
    titulo: '[M6] NLP para la inteligencia deportiva',
    descripcion: 'Bloque completo del Módulo 6. Sports Data Campus (14ª edición).',
    fecha_inicio: '2027-03-16',
    fecha_fin: '2027-04-12',
    es_rango: true,
    modulo: 'M6'
  },
  {
    titulo: '[M7] Visión por computadora con OpenCV, ResNet y YOLO',
    descripcion: 'Bloque completo del Módulo 7. Sports Data Campus (14ª edición).',
    fecha_inicio: '2027-04-13',
    fecha_fin: '2027-05-24',
    es_rango: true,
    modulo: 'M7'
  },
  {
    titulo: '[M8] IA Generativa en acción deportiva',
    descripcion: 'Bloque completo del Módulo 8. Sports Data Campus (14ª edición).',
    fecha_inicio: '2027-05-25',
    fecha_fin: '2027-06-21',
    es_rango: true,
    modulo: 'M8'
  },
  {
    titulo: '[M9] Proyecto Final de Máster (PFM)',
    descripcion: 'Periodo del Proyecto Final de Máster. Sports Data Campus (14ª edición).',
    fecha_inicio: '2027-01-07',
    fecha_fin: '2027-06-30',
    es_rango: true,
    modulo: 'M9'
  }
]

// PARTE B: DETALLE DEL MÓDULO 1 (Eventos puntuales)
export const EVENTOS_PARTE_B = [
  // Clases en directo y tutorías (EN DIRECTO)
  {
    titulo: '[M1] [EN DIRECTO] Clase en directo: presentación del módulo y explicación del primer ejercicio',
    descripcion: 'Profesorado: Marco Benjumeda y Sergio Luengo. Clase en directo de presentación del módulo y explicación del primer ejercicio. (Pendiente de definir hora exacta).',
    profesor: 'Marco Benjumeda y Sergio Luengo',
    fecha_inicio: '2026-10-21',
    fecha_fin: '2026-10-21',
    es_rango: false,
    es_en_directo: true,
    modulo: 'M1'
  },
  {
    titulo: '[M1] [EN DIRECTO] Clase en directo: Valor de acciones y TCT scout',
    descripcion: 'Profesor: Marco Benjumeda. Clase en directo: Valor de acciones y TCT scout. (Pendiente de definir hora exacta).',
    profesor: 'Marco Benjumeda',
    fecha_inicio: '2026-10-28',
    fecha_fin: '2026-10-28',
    es_rango: false,
    es_en_directo: true,
    modulo: 'M1'
  },
  {
    titulo: '[M1] [EN DIRECTO] Tutoría en directo: resolver dudas del primer ejercicio, presentar el trabajo de grupo y dudas de los primeros módulos',
    descripcion: 'Profesorado: Marco Benjumeda y Sergio Luengo. Tutoría en directo para resolver dudas del primer ejercicio, presentar el trabajo de grupo y dudas de los primeros módulos. (Pendiente de definir hora exacta).',
    profesor: 'Marco Benjumeda y Sergio Luengo',
    fecha_inicio: '2026-11-04',
    fecha_fin: '2026-11-04',
    es_rango: false,
    es_en_directo: true,
    modulo: 'M1'
  },
  {
    titulo: '[M1] [EN DIRECTO] Clase en directo: Visión artificial y tracking óptico',
    descripcion: 'Profesor: Sergio Luengo. Clase en directo: Visión artificial y tracking óptico. (Pendiente de definir hora exacta).',
    profesor: 'Sergio Luengo',
    fecha_inicio: '2026-11-11',
    fecha_fin: '2026-11-11',
    es_rango: false,
    es_en_directo: true,
    modulo: 'M1'
  },
  // Videoclases (disponible desde)
  {
    titulo: '[M1] Videoclase 1: Introducción a la IA (disponible desde hoy)',
    descripcion: 'Profesor: Marco Benjumeda. Videoclase 1: Introducción a la IA disponible desde hoy en la plataforma.',
    profesor: 'Marco Benjumeda',
    fecha_inicio: '2026-10-22',
    fecha_fin: '2026-10-22',
    es_rango: false,
    modulo: 'M1'
  },
  {
    titulo: '[M1] Videoclase 2: Transformación digital y escalera de la IA (disponible desde hoy)',
    descripcion: 'Profesor: Jorge Fernández. Videoclase 2: Transformación digital y escalera de la IA disponible desde hoy en la plataforma.',
    profesor: 'Jorge Fernández',
    fecha_inicio: '2026-10-29',
    fecha_fin: '2026-10-29',
    es_rango: false,
    modulo: 'M1'
  },
  {
    titulo: '[M1] Videoclase 3: Machine Learning (disponible desde hoy)',
    descripcion: 'Profesor: Jacinto Carrasco. Videoclase 3: Machine Learning disponible desde hoy en la plataforma.',
    profesor: 'Jacinto Carrasco',
    fecha_inicio: '2026-11-05',
    fecha_fin: '2026-11-05',
    es_rango: false,
    modulo: 'M1'
  },
  {
    titulo: '[M1] Videoclase 4: Proyectos de IA y aplicaciones (disponible desde hoy)',
    descripcion: 'Profesor: Sergio Luengo. Videoclase 4: Proyectos de IA y aplicaciones disponible desde hoy en la plataforma.',
    profesor: 'Sergio Luengo',
    fecha_inicio: '2026-11-05',
    fecha_fin: '2026-11-05',
    es_rango: false,
    modulo: 'M1'
  },
  // Entregas y evaluación (recordatorios 2 días antes y el mismo día por la mañana)
  {
    titulo: '[M1] DEADLINE: actividad individual',
    descripcion: 'Entrega obligatoria: actividad individual del Módulo 1. Recordatorio programado 2 días antes y la mañana de la entrega.',
    fecha_inicio: '2026-11-10',
    fecha_fin: '2026-11-10',
    es_rango: false,
    tiene_alerta: true,
    prioridad: 'urgente',
    modulo: 'M1'
  },
  {
    titulo: '[M1] EXAMEN tipo test',
    descripcion: 'Examen tipo test del Módulo 1: Inteligencia artificial como valor diferencial en la industria deportiva. Recordatorio 2 días antes y la mañana del examen.',
    fecha_inicio: '2026-11-16',
    fecha_fin: '2026-11-16',
    es_rango: false,
    tiene_alerta: true,
    prioridad: 'urgente',
    modulo: 'M1'
  },
  {
    titulo: '[M1] DEADLINE: actividad grupal',
    descripcion: 'Entrega obligatoria: actividad grupal del Módulo 1 (fecha límite situada dentro del marco temporal del Módulo 2). Recordatorio programado 2 días antes y la mañana de la entrega.',
    fecha_inicio: '2026-11-25',
    fecha_fin: '2026-11-25',
    es_rango: false,
    tiene_alerta: true,
    prioridad: 'urgente',
    modulo: 'M1'
  }
]

// PARTE C: TAREAS EN SUBLISTAS POR MÓDULO
export const TAREAS_POR_MODULO = {
  'M1 – IA como valor diferencial': [
    {
      titulo: '[M1] Ver/asistir a clase en directo: presentación del módulo y primer ejercicio',
      descripcion: 'Profesores: Marco Benjumeda y Sergio Luengo.',
      fecha_limite: '2026-10-21',
      prioridad: 'alta'
    },
    {
      titulo: '[M1] Ver videoclase 1: Introducción a la IA',
      descripcion: 'Profesor: Marco Benjumeda. Disponible el 22/10/2026.',
      fecha_limite: '2026-10-22',
      prioridad: 'media'
    },
    {
      titulo: '[M1] Estudiar el manual de la videoclase 1: Introducción a la IA',
      descripcion: 'Estudiar manual asociado a la Videoclase 1 (vence 3 días después de su publicación).',
      fecha_limite: '2026-10-25',
      prioridad: 'media'
    },
    {
      titulo: '[M1] Ver/asistir a clase en directo: Valor de acciones y TCT scout',
      descripcion: 'Profesor: Marco Benjumeda.',
      fecha_limite: '2026-10-28',
      prioridad: 'alta'
    },
    {
      titulo: '[M1] Ver videoclase 2: Transformación digital y escalera de la IA',
      descripcion: 'Profesor: Jorge Fernández. Disponible el 29/10/2026.',
      fecha_limite: '2026-10-29',
      prioridad: 'media'
    },
    {
      titulo: '[M1] Estudiar el manual de la videoclase 2: Transformación digital y escalera de la IA',
      descripcion: 'Estudiar manual asociado a la Videoclase 2 (vence 3 días después de su publicación).',
      fecha_limite: '2026-11-01',
      prioridad: 'media'
    },
    {
      titulo: '[M1] Ver/asistir a tutoría en directo: dudas del primer ejercicio y trabajo de grupo',
      descripcion: 'Profesores: Marco Benjumeda y Sergio Luengo.',
      fecha_limite: '2026-11-04',
      prioridad: 'alta'
    },
    {
      titulo: '[M1] Ver videoclase 3: Machine Learning',
      descripcion: 'Profesor: Jacinto Carrasco. Disponible el 05/11/2026.',
      fecha_limite: '2026-11-05',
      prioridad: 'media'
    },
    {
      titulo: '[M1] Estudiar el manual de la videoclase 3: Machine Learning',
      descripcion: 'Estudiar manual asociado a la Videoclase 3 (vence 3 días después de su publicación).',
      fecha_limite: '2026-11-08',
      prioridad: 'media'
    },
    {
      titulo: '[M1] Ver videoclase 4: Proyectos de IA y aplicaciones',
      descripcion: 'Profesor: Sergio Luengo. Disponible el 05/11/2026.',
      fecha_limite: '2026-11-05',
      prioridad: 'media'
    },
    {
      titulo: '[M1] Estudiar el manual de la videoclase 4: Proyectos de IA y aplicaciones',
      descripcion: 'Estudiar manual asociado a la Videoclase 4 (vence 3 días después de su publicación).',
      fecha_limite: '2026-11-08',
      prioridad: 'media'
    },
    {
      titulo: '[M1] Entregar actividad individual',
      descripcion: 'Entrega de la actividad individual de M1 en el campus virtual.',
      fecha_limite: '2026-11-10',
      prioridad: 'urgente'
    },
    {
      titulo: '[M1] Ver/asistir a clase en directo: Visión artificial y tracking óptico',
      descripcion: 'Profesor: Sergio Luengo.',
      fecha_limite: '2026-11-11',
      prioridad: 'alta'
    },
    {
      titulo: '[M1] Preparar el examen tipo test',
      descripcion: 'Repaso y preparación del examen tipo test de M1 (el examen es el 16/11).',
      fecha_limite: '2026-11-15',
      prioridad: 'urgente'
    },
    {
      titulo: '[M1] Entregar actividad grupal',
      descripcion: 'Entrega final del trabajo en grupo de M1 en el campus virtual.',
      fecha_limite: '2026-11-25',
      prioridad: 'urgente'
    }
  ],
  'M2 – ETL': [
    {
      titulo: '[M2] Revisar planificación detallada del módulo (pendiente de recibir las fechas)',
      descripcion: 'Hito marcador al inicio de M2. Revisar calendario y tareas en el campus virtual.',
      fecha_limite: '2026-11-17',
      prioridad: 'media'
    }
  ],
  'M3 – BI y Storytelling': [
    {
      titulo: '[M3] Revisar planificación detallada del módulo (pendiente de recibir las fechas)',
      descripcion: 'Hito marcador al inicio de M3. Revisar calendario y tareas en el campus virtual.',
      fecha_limite: '2026-12-15',
      prioridad: 'media'
    }
  ],
  'M4 – Machine Learning': [
    {
      titulo: '[M4] Revisar planificación detallada del módulo (pendiente de recibir las fechas)',
      descripcion: 'Hito marcador al inicio de M4. Revisar calendario y tareas en el campus virtual.',
      fecha_limite: '2027-01-19',
      prioridad: 'media'
    }
  ],
  'M5 – Deep Learning': [
    {
      titulo: '[M5] Revisar planificación detallada del módulo (pendiente de recibir las fechas)',
      descripcion: 'Hito marcador al inicio de M5. Revisar calendario y tareas en el campus virtual.',
      fecha_limite: '2027-02-16',
      prioridad: 'media'
    }
  ],
  'M6 – NLP': [
    {
      titulo: '[M6] Revisar planificación detallada del módulo (pendiente de recibir las fechas)',
      descripcion: 'Hito marcador al inicio de M6. Revisar calendario y tareas en el campus virtual.',
      fecha_limite: '2027-03-16',
      prioridad: 'media'
    }
  ],
  'M7 – Visión por computadora': [
    {
      titulo: '[M7] Revisar planificación detallada del módulo (pendiente de recibir las fechas)',
      descripcion: 'Hito marcador al inicio de M7. Revisar calendario y tareas en el campus virtual.',
      fecha_limite: '2027-04-13',
      prioridad: 'media'
    }
  ],
  'M8 – IA Generativa': [
    {
      titulo: '[M8] Revisar planificación detallada del módulo (pendiente de recibir las fechas)',
      descripcion: 'Hito marcador al inicio de M8. Revisar calendario y tareas en el campus virtual.',
      fecha_limite: '2027-05-25',
      prioridad: 'media'
    }
  ],
  'M9 – PFM': [
    {
      titulo: '[M9] Revisar planificación detallada del módulo (pendiente de recibir las fechas)',
      descripcion: 'Hito marcador al inicio de M9 (PFM). Revisar hitos y entregas del Proyecto Final.',
      fecha_limite: '2027-01-07',
      prioridad: 'media'
    }
  ]
}

// ============================================================
// FUNCIÓN PRINCIPAL DE EJECUCIÓN O VERIFICACIÓN
// ============================================================

export async function runSetup({ execute = false } = {}) {
  console.log(`\n🚀 Modo: ${execute ? 'EJECUCIÓN REAL' : 'DRY-RUN (Simulación sin escribir)'}`)

  // 1. Verificar proyecto padre
  const { data: parentProject, error: parentErr } = await supabase
    .from('proyectos')
    .select('*')
    .eq('id', MASTER_PARENT_ID)
    .maybeSingle()

  if (parentErr) {
    console.error('❌ Error buscando proyecto padre:', parentErr.message)
    return
  }

  console.log(`\n📁 Proyecto padre: ${parentProject ? parentProject.nombre : 'No existe'}`)
  if (execute) {
    if (parentProject) {
      await supabase
        .from('proyectos')
        .update({
          nombre: 'Máster IA Deporte',
          descripcion: 'Sports Data Campus — 14ª edición (2026/2027)',
          updated_at: new Date().toISOString()
        })
        .eq('id', MASTER_PARENT_ID)
      console.log('  ✅ Actualizado nombre a "Máster IA Deporte".')
    }
  }

  // 2. Gestionar sublistas (subproyectos)
  const sublistMap = new Map() // nombre -> id
  const { data: existingSublists } = await supabase
    .from('proyectos')
    .select('*')
    .ilike('descripcion', `%__parent:${MASTER_PARENT_ID}__%`)

  const existingByName = new Map((existingSublists || []).map(p => [p.nombre, p]))

  for (const sub of SUBLISTAS_MODULOS) {
    const existing = existingByName.get(sub.nombre)
    if (existing) {
      sublistMap.set(sub.nombre, existing.id)
      console.log(`  ℹ️ Sublista ya existe: "${sub.nombre}" (ID: ${existing.id})`)
    } else {
      if (execute) {
        const { data: created, error: crErr } = await supabase
          .from('proyectos')
          .insert({
            nombre: sub.nombre,
            descripcion: `__parent:${MASTER_PARENT_ID}__Módulo del Máster IA Deporte`,
            color: sub.color,
            estado: 'activo'
          })
          .select()
          .single()
        if (crErr) {
          console.error(`  ❌ Error creando sublista "${sub.nombre}":`, crErr.message)
        } else {
          sublistMap.set(sub.nombre, created.id)
          console.log(`  ✅ Creada sublista: "${sub.nombre}" (ID: ${created.id})`)
        }
      } else {
        console.log(`  [DRY-RUN] Se crearía sublista: "${sub.nombre}"`)
        sublistMap.set(sub.nombre, `simulated-${sub.id_suffix}`)
      }
    }
  }

  // 3. Comprobar duplicados existentes en DB
  const { data: existingDbItems } = await supabase
    .from('items')
    .select('id, titulo, tipo, fecha_evento, fecha_limite, proyecto_id')

  const existingItemKeys = new Set(
    (existingDbItems || []).map(i => {
      const fecha = (i.fecha_evento || i.fecha_limite || '').split('T')[0]
      return `${i.titulo.trim()}__${fecha}`
    })
  )

  // 4. Comprobar duplicados en Google Calendar
  const auth = await getAuthenticatedAuthClient()
  const calendar = auth ? google.calendar({ version: 'v3', auth }) : null
  const existingGoogleEvents = new Map() // title__date -> eventId

  if (calendar) {
    try {
      const gRes = await calendar.events.list({
        calendarId: 'primary',
        timeMin: '2026-10-01T00:00:00Z',
        timeMax: '2027-07-31T23:59:59Z',
        singleEvents: true,
        maxResults: 2500
      })
      for (const item of (gRes.data.items || [])) {
        if (!item.summary) continue
        const d = item.start?.date || (item.start?.dateTime ? item.start.dateTime.split('T')[0] : '')
        existingGoogleEvents.set(`${item.summary.trim()}__${d}`, item.id)
      }
      console.log(`🗓️ Google Calendar conectado: ${gRes.data.items?.length || 0} eventos analizados en el rango.`)
    } catch (e) {
      console.warn('⚠️ No se pudo consultar eventos de Google Calendar:', e.message)
    }
  }

  const results = []

  // 5. Procesar eventos (Parte A y Parte B)
  const todosEventos = [...EVENTOS_PARTE_A, ...EVENTOS_PARTE_B]

  for (const ev of todosEventos) {
    const key = `${ev.titulo.trim()}__${ev.fecha_inicio}`
    const yaEnDb = existingItemKeys.has(key)
    const yaEnGoogle = existingGoogleEvents.has(key) || existingGoogleEvents.has(`📅 ${key}`)

    if (yaEnDb || yaEnGoogle) {
      results.push({
        fecha: ev.es_rango ? `${ev.fecha_inicio} al ${ev.fecha_fin}` : ev.fecha_inicio,
        titulo: ev.titulo,
        tipo: 'evento',
        estado: 'Omitido (ya existía)'
      })
      continue
    }

    if (!execute) {
      results.push({
        fecha: ev.es_rango ? `${ev.fecha_inicio} al ${ev.fecha_fin}` : ev.fecha_inicio,
        titulo: ev.titulo,
        tipo: 'evento',
        estado: 'Listo para crear'
      })
      continue
    }

    // Insertar en Supabase
    let sublistId = MASTER_PARENT_ID
    if (ev.modulo && ev.modulo !== 'General') {
      const matchedSub = SUBLISTAS_MODULOS.find(s => s.nombre.startsWith(ev.modulo))
      if (matchedSub && sublistMap.get(matchedSub.nombre)) {
        sublistId = sublistMap.get(matchedSub.nombre)
      }
    }

    const fechaEventoIso = `${ev.fecha_inicio}T00:00:00.000Z`
    const fechaLimiteIso = `${ev.fecha_fin}T23:59:59.999Z`

    const overrides = []
    if (ev.tiene_alerta) {
      overrides.push({ method: 'popup', minutes: 2 * 24 * 60 }) // 2 días antes
      overrides.push({ method: 'popup', minutes: 0 })          // El mismo día por la mañana
    }

    let googleEventId = null

    // Sincronizar en Google Calendar (primary)
    if (calendar) {
      try {
        const endDateObj = new Date(ev.fecha_fin)
        endDateObj.setDate(endDateObj.getDate() + 1)
        const nextDayStr = endDateObj.toISOString().split('T')[0]

        const reqBody = {
          summary: `📅 ${ev.titulo}`,
          description: `${ev.descripcion}\n\n[Sports Data Campus — 14ª edición]`,
          start: { date: ev.fecha_inicio },
          end: { date: nextDayStr }
        }

        if (overrides.length > 0) {
          reqBody.reminders = {
            useDefault: false,
            overrides
          }
        }

        const gInserted = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: reqBody
        })
        googleEventId = gInserted.data.id || null
      } catch (gErr) {
        console.warn(`  ⚠️ Error al insertar evento en Google Calendar ("${ev.titulo}"):`, gErr.message)
      }
    }

    const { error: insErr } = await supabase
      .from('items')
      .insert({
        tipo: 'evento',
        titulo: ev.titulo,
        descripcion: ev.descripcion,
        estado: 'activo',
        prioridad: ev.prioridad || 'media',
        fecha_evento: fechaEventoIso,
        fecha_limite: fechaLimiteIso,
        proyecto_id: sublistId,
        etiquetas: ['Máster IA Deporte', ev.modulo],
        origen: 'web',
        google_event_id: googleEventId,
        metadata: {
          es_todo_el_dia: true,
          zona_horaria: 'Europe/Madrid',
          profesor: ev.profesor || null,
          es_en_directo: !!ev.es_en_directo,
          tiene_recordatorios: !!ev.tiene_alerta,
          es_rango: !!ev.es_rango
        }
      })

    if (insErr) {
      console.error(`  ❌ Error insertando evento en Supabase ("${ev.titulo}"):`, insErr.message)
      results.push({
        fecha: ev.es_rango ? `${ev.fecha_inicio} al ${ev.fecha_fin}` : ev.fecha_inicio,
        titulo: ev.titulo,
        tipo: 'evento',
        estado: `Error: ${insErr.message}`
      })
    } else {
      results.push({
        fecha: ev.es_rango ? `${ev.fecha_inicio} al ${ev.fecha_fin}` : ev.fecha_inicio,
        titulo: ev.titulo,
        tipo: 'evento',
        estado: googleEventId ? 'Creado y sincronizado en Google' : 'Creado'
      })
    }
  }

  // 6. Procesar Tareas (Parte C)
  for (const [nombreModulo, tareas] of Object.entries(TAREAS_POR_MODULO)) {
    const projId = sublistMap.get(nombreModulo) || MASTER_PARENT_ID

    for (const t of tareas) {
      const key = `${t.titulo.trim()}__${t.fecha_limite}`
      if (existingItemKeys.has(key)) {
        results.push({
          fecha: t.fecha_limite,
          titulo: t.titulo,
          tipo: 'tarea',
          estado: 'Omitido (ya existía)'
        })
        continue
      }

      if (!execute) {
        results.push({
          fecha: t.fecha_limite,
          titulo: t.titulo,
          tipo: 'tarea',
          estado: 'Listo para crear'
        })
        continue
      }

      const fechaLimiteIso = `${t.fecha_limite}T23:59:59.999Z`

      const { error: insTErr } = await supabase
        .from('items')
        .insert({
          tipo: 'tarea',
          titulo: t.titulo,
          descripcion: t.descripcion,
          estado: 'activo',
          prioridad: t.prioridad || 'media',
          fecha_limite: fechaLimiteIso,
          proyecto_id: projId,
          etiquetas: ['Máster IA Deporte', nombreModulo.split(' ')[0]],
          origen: 'web',
          metadata: {
            zona_horaria: 'Europe/Madrid',
            sublista: nombreModulo
          }
        })

      if (insTErr) {
        console.error(`  ❌ Error insertando tarea ("${t.titulo}"):`, insTErr.message)
        results.push({
          fecha: t.fecha_limite,
          titulo: t.titulo,
          tipo: 'tarea',
          estado: `Error: ${insTErr.message}`
        })
      } else {
        results.push({
          fecha: t.fecha_limite,
          titulo: t.titulo,
          tipo: 'tarea',
          estado: 'Creada en sublista'
        })
      }
    }
  }

  // 7. Mostrar resultados
  console.log('\n============================================================')
  console.log('RESUMEN DE OPERACIONES')
  console.log('============================================================')
  console.table(results)

  return results
}

// Si se llama directamente desde CLI
if (process.argv[1] && process.argv[1].endsWith('setup-master-ia-deporte.mjs')) {
  const shouldExecute = process.argv.includes('--execute')
  runSetup({ execute: shouldExecute })
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err)
      process.exit(1)
    })
}
