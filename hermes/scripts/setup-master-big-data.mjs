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

const MASTER_PARENT_ID = 'd9618833-4249-483f-8d3e-4b957ec54445' // Máster Big Data

// Configuración de asignaturas (sublistas)
const SUBLISTAS_CONFIG = [
  {
    id: 'dfc93fe2-3232-4e99-af38-598a5e6b1d30', // Previamente 'ESTADISTICA'
    nombre: 'Aprendizaje Estadístico',
    color: '#10b981',
    evaluacion: `- Prácticas en Python 60 % (una por cada parte, en grupo de dos o individual). Cada práctica: redacción 30 % + entrevista 70 %.
- Examen tipo test 40 %.
- Hay que superar ambas prácticas para aprobar.
- Si se suspende alguna parte, la nota final es el mínimo entre prácticas y examen.
- Mini-tests presenciales en los últimos 10 min de clase: hasta +1 punto extra.
- Solo puedo presentarme a 2 de las 3 convocatorias; en la II y la III se guardan prácticas y examen aprobados.`,
    items: [
      {
        tipo: 'tarea',
        titulo: '⚠️ Entrega práctica 1',
        descripcion: 'Entrega de la práctica 1 en Python (redacción 30 % + entrevista 70 %).',
        fecha_inicio: '2026-11-12',
        fecha_fin: '2026-11-12',
        tiene_alerta: true,
        prioridad: 'alta'
      },
      {
        tipo: 'tarea',
        titulo: '⚠️ Primera entrega práctica 2',
        descripcion: 'Primera entrega de la práctica 2 en Python. Es domingo, confirmar con el profesorado.',
        fecha_inicio: '2026-12-06',
        fecha_fin: '2026-12-06',
        tiene_alerta: true,
        prioridad: 'alta'
      },
      {
        tipo: 'tarea',
        titulo: '⚠️ Segunda entrega práctica 2',
        descripcion: 'Segunda entrega de la práctica 2 en Python. Es domingo, confirmar con el profesorado.',
        fecha_inicio: '2026-12-27',
        fecha_fin: '2026-12-27',
        tiene_alerta: true,
        prioridad: 'alta'
      },
      {
        tipo: 'evento',
        titulo: '⚠️ Examen tipo test (por la tarde)',
        descripcion: 'Examen tipo test de Aprendizaje Estadístico (40 % de la nota). Por la tarde (hora exacta por confirmar).',
        fecha_inicio: '2027-01-22',
        fecha_fin: '2027-01-22',
        tiene_alerta: true,
        prioridad: 'urgente'
      },
      {
        tipo: 'evento',
        titulo: 'Convocatoria II',
        descripcion: 'Convocatoria II de Aprendizaje Estadístico. Se guardan prácticas y examen aprobados.',
        fecha_inicio: '2027-05-17',
        fecha_fin: '2027-05-17',
        tiene_alerta: false,
        prioridad: 'media'
      },
      {
        tipo: 'evento',
        titulo: 'Convocatoria III',
        descripcion: 'Convocatoria III de Aprendizaje Estadístico. Se guardan prácticas y examen aprobados.',
        fecha_inicio: '2027-06-23',
        fecha_fin: '2027-06-23',
        tiene_alerta: false,
        prioridad: 'media'
      }
    ]
  },
  {
    id: '70c1eb63-04f4-4809-9f68-49bfb569d462', // Previamente 'BBDD'
    nombre: 'Bases de Datos a Gran Escala',
    color: '#ef4444',
    evaluacion: `- Pruebas periódicas / examen final / trabajo final 50 % (prueba final teórico-práctica).
- Prácticas 30 %: 15 % entrega de los boletines evaluables + 15 % parte práctica de la prueba final.
- Trabajos 20 % (opcional).
- Sin nota mínima por parte: se aprueba con 5/10 en la suma ponderada.
- Boletines evaluables: P2, P4, P6 y P7. Cada boletín: declarar DNI al inicio, celda final de entrega que envía un indicio a un servidor y devuelve un ID de acuse de recibo (guardarlo).

(Nota: falta confirmar con el profesor el plazo de entrega de cada boletín y la fecha de la prueba final.)`,
    items: [
      {
        tipo: 'evento',
        titulo: '⚠️ P2 (evaluable) SQL (II): DDL',
        descripcion: 'Boletín evaluable P2 SQL (II): DDL. Fechas: 2026-10-07 y 2026-10-08. Declarar DNI al inicio y guardar ID de acuse de recibo devuelto por la celda final. Falta confirmar plazo de entrega con el profesor.',
        fecha_inicio: '2026-10-07',
        fecha_fin: '2026-10-08',
        tiene_alerta: true,
        prioridad: 'alta',
        es_rango: true
      },
      {
        tipo: 'evento',
        titulo: '⚠️ P4 (evaluable) MongoDB',
        descripcion: 'Boletín evaluable P4 MongoDB. Fechas: 2026-10-28 y 2026-10-29. Declarar DNI al inicio y guardar ID de acuse de recibo devuelto por la celda final. Falta confirmar plazo de entrega con el profesor.',
        fecha_inicio: '2026-10-28',
        fecha_fin: '2026-10-29',
        tiene_alerta: true,
        prioridad: 'alta',
        es_rango: true
      },
      {
        tipo: 'evento',
        titulo: '⚠️ P6 (evaluable) Cassandra',
        descripcion: 'Boletín evaluable P6 Cassandra. Fechas: 2026-11-11 y 2026-11-12. Declarar DNI al inicio y guardar ID de acuse de recibo devuelto por la celda final. Falta confirmar plazo de entrega con el profesor.',
        fecha_inicio: '2026-11-11',
        fecha_fin: '2026-11-12',
        tiene_alerta: true,
        prioridad: 'alta',
        es_rango: true
      },
      {
        tipo: 'evento',
        titulo: '⚠️ P7 (evaluable) Grafos y Neo4j',
        descripcion: 'Boletín evaluable P7 Grafos y Neo4j. Fechas: 2026-11-18 y 2026-11-19. Declarar DNI al inicio y guardar ID de acuse de recibo devuelto por la celda final. Falta confirmar plazo de entrega con el profesor.',
        fecha_inicio: '2026-11-18',
        fecha_fin: '2026-11-19',
        tiene_alerta: true,
        prioridad: 'alta',
        es_rango: true
      },
      {
        tipo: 'evento',
        titulo: 'Repaso y pruebas parciales',
        descripcion: 'Repaso y pruebas parciales de Bases de Datos a Gran Escala.',
        fecha_inicio: '2026-11-26',
        fecha_fin: '2026-11-26',
        tiene_alerta: false,
        prioridad: 'media'
      },
      {
        tipo: 'evento',
        titulo: 'Repaso y pruebas parciales',
        descripcion: 'Repaso y pruebas parciales de Bases de Datos a Gran Escala.',
        fecha_inicio: '2026-12-03',
        fecha_fin: '2026-12-03',
        tiene_alerta: false,
        prioridad: 'media'
      }
    ]
  },
  {
    id: '6d219f58-6b74-4e65-bc47-be0125aff230', // Previamente 'VISUALIZACION DE DATOS'
    nombre: 'Visualización de Datos',
    color: '#38bdf8',
    evaluacion: `- Prueba final 40 % (tipo test con penalización de 1/(n-1) por fallo, y/o preguntas cortas).
- Prácticas 40 % (controles con ordenador, media aritmética).
- TAD (trabajo en parejas) 20 %: 10 % primer informe, 45 % segundo informe y presentación, 45 % documento.
- Mínimo 5/10 sobre la media ponderada. La evaluación continua no es recuperable en la convocatoria de impartición (salvo art. 8.6 REVA).
- Para recuperar en convocatorias posteriores, pedirlo por mensaje privado en el Aula Virtual al menos 15 días naturales antes.`,
    items: [
      {
        tipo: 'tarea',
        titulo: '⚠️ Primer informe TAD',
        descripcion: 'Semana del 2026-10-05 (día exacto por confirmar; establecido el lunes 2026-10-05). TAD en parejas (10 % del TAD).',
        fecha_inicio: '2026-10-05',
        fecha_fin: '2026-10-05',
        tiene_alerta: true,
        prioridad: 'alta'
      },
      {
        tipo: 'tarea',
        titulo: '⚠️ Control de prácticas 1',
        descripcion: 'Control de prácticas con ordenador en clase (media aritmética de prácticas 40 %).',
        fecha_inicio: '2026-10-19',
        fecha_fin: '2026-10-19',
        tiene_alerta: true,
        prioridad: 'alta'
      },
      {
        tipo: 'tarea',
        titulo: '⚠️ Control de prácticas 2',
        descripcion: 'Control de prácticas con ordenador en clase (media aritmética de prácticas 40 %).',
        fecha_inicio: '2026-10-26',
        fecha_fin: '2026-10-26',
        tiene_alerta: true,
        prioridad: 'alta'
      },
      {
        tipo: 'tarea',
        titulo: '⚠️ Presentación TAD',
        descripcion: 'Presentación y segundo informe del TAD (trabajo en parejas, 45 % del TAD).',
        fecha_inicio: '2026-11-02',
        fecha_fin: '2026-11-02',
        tiene_alerta: true,
        prioridad: 'alta'
      },
      {
        tipo: 'tarea',
        titulo: '⚠️ Entrega documento TAD',
        descripcion: 'Entrega final del documento TAD (trabajo en parejas, 45 % del TAD).',
        fecha_inicio: '2026-12-14',
        fecha_fin: '2026-12-14',
        tiene_alerta: true,
        prioridad: 'alta'
      }
    ]
  }
]

async function run() {
  console.log('🚀 Iniciando configuración de Máster Big Data en Hermes y Google Calendar...')

  // 1. Conexión Google Calendar
  const auth = await getAuthenticatedAuthClient()
  const calendar = auth ? google.calendar({ version: 'v3', auth }) : null
  if (calendar) {
    console.log('✅ Google Calendar API conectada.')
  } else {
    console.log('ℹ️ Google Calendar no conectado en este momento.')
  }

  // 2. Eliminar tareas de prueba vacías previas en estas sublistas
  const sublistIds = SUBLISTAS_CONFIG.map(s => s.id)
  const { data: tareasViejas } = await supabase
    .from('items')
    .select('id, titulo')
    .in('proyecto_id', sublistIds)
  
  if (tareasViejas && tareasViejas.length > 0) {
    console.log(`🧹 Limpiando ${tareasViejas.length} tareas borrador existentes en las sublistas...`)
    for (const tv of tareasViejas) {
      await supabase.from('items').delete().eq('id', tv.id)
    }
  }

  // 3. Procesar cada sublista
  for (const config of SUBLISTAS_CONFIG) {
    console.log(`\n📂 Actualizando sublista: "${config.nombre}" (ID: ${config.id})...`)
    
    // Actualizar nombre y parent en la tabla proyectos
    const descConParent = `__parent:${MASTER_PARENT_ID}__`
    const { error: updErr } = await supabase
      .from('proyectos')
      .update({
        nombre: config.nombre,
        color: config.color,
        descripcion: descConParent,
        updated_at: new Date().toISOString()
      })
      .eq('id', config.id)

    if (updErr) {
      console.error(`❌ Error actualizando proyecto ${config.nombre}:`, updErr.message)
      continue
    }
    console.log(`  ✅ Sublista "${config.nombre}" actualizada.`)

    // 4. Crear elemento "ℹ️ Evaluación" (primer elemento sin fecha, como nota)
    const { data: notaEvaluacion, error: notaErr } = await supabase
      .from('items')
      .insert({
        tipo: 'nota',
        titulo: 'ℹ️ Evaluación',
        descripcion: config.evaluacion,
        estado: 'activo',
        prioridad: 'media',
        proyecto_id: config.id,
        etiquetas: [config.nombre, 'Evaluación', 'Máster Big Data'],
        origen: 'web',
        metadata: {
          es_evaluacion: true,
          asignatura: config.nombre
        }
      })
      .select()
      .single()

    if (notaErr) {
      console.error(`  ❌ Error creando elemento Evaluación para ${config.nombre}:`, notaErr.message)
    } else {
      console.log(`  ✅ Elemento "ℹ️ Evaluación" creado (ID: ${notaEvaluacion.id}).`)
    }

    // 5. Crear cada fecha / hito
    for (const itemDef of config.items) {
      const fechaEventoIso = itemDef.tipo === 'evento' ? `${itemDef.fecha_inicio}T00:00:00.000Z` : null
      const fechaLimiteIso = itemDef.tipo === 'tarea' ? `${itemDef.fecha_fin}T23:59:59.999Z` : (itemDef.es_rango ? `${itemDef.fecha_fin}T23:59:59.999Z` : `${itemDef.fecha_inicio}T23:59:59.999Z`)

      const metadata = {
        asignatura: config.nombre,
        es_todo_el_dia: true,
        zona_horaria: 'Europe/Madrid',
        fecha_inicio: itemDef.fecha_inicio,
        fecha_fin: itemDef.fecha_fin,
        es_rango: !!itemDef.es_rango,
        tiene_recordatorios: itemDef.tiene_alerta,
        recordatorios: itemDef.tiene_alerta ? ['7d', '1d'] : []
      }

      const etiquetas = [config.nombre, 'Máster Big Data']
      if (itemDef.tiene_alerta) etiquetas.push('Evaluación')

      const { data: itemCreado, error: itemErr } = await supabase
        .from('items')
        .insert({
          tipo: itemDef.tipo,
          titulo: itemDef.titulo,
          descripcion: itemDef.descripcion,
          estado: 'activo',
          prioridad: itemDef.prioridad,
          fecha_evento: fechaEventoIso,
          fecha_limite: fechaLimiteIso,
          proyecto_id: config.id,
          etiquetas,
          origen: 'web',
          metadata
        })
        .select()
        .single()

      if (itemErr) {
        console.error(`  ❌ Error creando "${itemDef.titulo}":`, itemErr.message)
        continue
      }

      console.log(`  ✅ Creado [${itemDef.tipo}]: "${itemDef.titulo}" (${itemDef.fecha_inicio}${itemDef.es_rango ? ' a ' + itemDef.fecha_fin : ''})`)

      // 6. Sincronizar en Google Calendar si está conectado
      if (calendar) {
        try {
          const endDateObj = new Date(itemDef.fecha_fin)
          endDateObj.setDate(endDateObj.getDate() + 1)
          const nextDayStr = endDateObj.toISOString().split('T')[0]

          const overrides = []
          if (itemDef.tiene_alerta) {
            overrides.push({ method: 'popup', minutes: 7 * 24 * 60 }) // 7 días antes
            overrides.push({ method: 'popup', minutes: 1 * 24 * 60 })  // 1 día antes
          }

          const requestBody = {
            summary: `${itemDef.tipo === 'tarea' ? '☑️ ' : '📅 '}${itemDef.titulo}`,
            description: `${itemDef.descripcion}\n\n[Hermes Planner — ${config.nombre}]`,
            start: { date: itemDef.fecha_inicio },
            end: { date: nextDayStr },
          }

          if (overrides.length > 0) {
            requestBody.reminders = {
              useDefault: false,
              overrides
            }
          }

          const resG = await calendar.events.insert({
            calendarId: 'primary',
            requestBody
          })

          if (resG.data?.id) {
            await supabase
              .from('items')
              .update({ google_event_id: resG.data.id })
              .eq('id', itemCreado.id)
            console.log(`    🗓️ Sincronizado en Google Calendar: ${resG.data.id} (recordatorios: ${overrides.length > 0 ? '7d y 1d' : 'estándar'})`)
          }
        } catch (gErr) {
          console.warn(`    ⚠️ Advertencia sincronizando con Google Calendar:`, gErr.message)
        }
      }
    }
  }

  console.log('\n🎉 ¡Organización del Máster completada con éxito!')
}

run()
