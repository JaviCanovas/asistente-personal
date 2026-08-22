import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Leer variables de entorno desde .env.local
let envContent = ''
try {
  envContent = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8')
} catch (e) {
  console.error('❌ No se pudo leer .env.local:', e.message)
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

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Faltan las variables de entorno de Supabase.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const TAG_NO_LECTIVO = 'No lectivo — Máster Big Data UMU'

// Definición de los 17 eventos
const academicEvents = [
  // FESTIVOS Y DÍAS NO LECTIVOS (Individuales)
  {
    titulo: 'Festivo local Murcia',
    descripcion: 'Festivo local Murcia. Secretaría General UMU. No lectivo — Máster Big Data UMU.',
    inicio: '2026-09-15',
    fin: '2026-09-15',
    esRango: false,
    categoria: 'festivo'
  },
  {
    titulo: 'Día de la Hispanidad',
    descripcion: 'Fiesta Nacional de España. Secretaría General UMU. No lectivo — Máster Big Data UMU.',
    inicio: '2026-10-12',
    fin: '2026-10-12',
    esRango: false,
    categoria: 'festivo'
  },
  {
    titulo: 'Día de Todos los Santos',
    descripcion: 'Festivo nacional. Secretaría General UMU. No lectivo — Máster Big Data UMU.',
    inicio: '2026-11-01',
    fin: '2026-11-01',
    esRango: false,
    categoria: 'festivo'
  },
  {
    titulo: 'San Alberto Magno (Patrón UMU)',
    descripcion: 'San Alberto Magno (patrón Universidad de Murcia). Secretaría General UMU. No lectivo — Máster Big Data UMU.',
    inicio: '2026-11-13',
    fin: '2026-11-13',
    esRango: false,
    categoria: 'festivo'
  },
  {
    titulo: 'Traslado Día de la Constitución',
    descripcion: 'Traslado Día de la Constitución. Secretaría General UMU. No lectivo — Máster Big Data UMU.',
    inicio: '2026-12-07',
    fin: '2026-12-07',
    esRango: false,
    categoria: 'festivo'
  },
  {
    titulo: 'Inmaculada Concepción',
    descripcion: 'Festivo nacional. Secretaría General UMU. No lectivo — Máster Big Data UMU.',
    inicio: '2026-12-08',
    fin: '2026-12-08',
    esRango: false,
    categoria: 'festivo'
  },
  {
    titulo: 'Navidad',
    descripcion: 'Navidad. Secretaría General UMU. No lectivo — Máster Big Data UMU.',
    inicio: '2026-12-25',
    fin: '2026-12-25',
    esRango: false,
    categoria: 'festivo'
  },
  {
    titulo: 'Año Nuevo',
    descripcion: 'Año Nuevo. Secretaría General UMU. No lectivo — Máster Big Data UMU.',
    inicio: '2027-01-01',
    fin: '2027-01-01',
    esRango: false,
    categoria: 'festivo'
  },
  {
    titulo: 'Día de Reyes',
    descripcion: 'Día de Reyes. Secretaría General UMU. No lectivo — Máster Big Data UMU.',
    inicio: '2027-01-06',
    fin: '2027-01-06',
    esRango: false,
    categoria: 'festivo'
  },
  {
    titulo: 'San José',
    descripcion: 'Festivo autonómico San José. Secretaría General UMU. No lectivo — Máster Big Data UMU.',
    inicio: '2027-03-19',
    fin: '2027-03-19',
    esRango: false,
    categoria: 'festivo'
  },
  {
    titulo: 'Día del Trabajo',
    descripcion: 'Día Internacional de los Trabajadores. Secretaría General UMU. No lectivo — Máster Big Data UMU.',
    inicio: '2027-05-01',
    fin: '2027-05-01',
    esRango: false,
    categoria: 'festivo'
  },
  {
    titulo: 'Día de la Región de Murcia',
    descripcion: 'Día de la Región de Murcia. Secretaría General UMU. No lectivo — Máster Big Data UMU.',
    inicio: '2027-06-09',
    fin: '2027-06-09',
    esRango: false,
    categoria: 'festivo'
  },

  // PERIODOS VACACIONALES (Rangos de fechas)
  {
    titulo: 'Vacaciones de Navidad y Año Nuevo',
    descripcion: 'Periodo vacacional de Navidad y Año Nuevo (21/12/2026 al 06/01/2027 ambos inclusive). Secretaría General UMU. No lectivo — Máster Big Data UMU.',
    inicio: '2026-12-21',
    fin: '2027-01-06',
    esRango: true,
    categoria: 'vacaciones'
  },
  {
    titulo: 'Vacaciones de Semana Santa y Fiestas de Primavera',
    descripcion: 'Periodo vacacional de Semana Santa y Fiestas de Primavera (22/03/2027 al 04/04/2027 ambos inclusive). Secretaría General UMU. No lectivo — Máster Big Data UMU.',
    inicio: '2027-03-22',
    fin: '2027-04-04',
    esRango: true,
    categoria: 'vacaciones'
  },

  // CONVOCATORIAS DE EXÁMENES (Rangos de fechas)
  {
    titulo: 'Exámenes Convocatoria I',
    descripcion: 'Periodo de exámenes Convocatoria I (14/12/2026 al 29/01/2027). Entrega de actas: 29 de enero de 2027. Secretaría General UMU. No lectivo — Máster Big Data UMU.',
    inicio: '2026-12-14',
    fin: '2027-01-29',
    esRango: true,
    categoria: 'convocatoria'
  },
  {
    titulo: 'Exámenes Convocatoria II',
    descripcion: 'Periodo de exámenes Convocatoria II (10/05/2027 al 06/06/2027). Secretaría General UMU. No lectivo — Máster Big Data UMU.',
    inicio: '2027-05-10',
    fin: '2027-06-06',
    esRango: true,
    categoria: 'convocatoria'
  },
  {
    titulo: 'Exámenes Convocatoria III',
    descripcion: 'Periodo de exámenes Convocatoria III (14/06/2027 al 04/07/2027). Secretaría General UMU. No lectivo — Máster Big Data UMU.',
    inicio: '2027-06-14',
    fin: '2027-07-04',
    esRango: true,
    categoria: 'convocatoria'
  }
]

async function run() {
  console.log('🔍 1. Consultando items existentes en la base de datos de Hermes...')
  const { data: itemsExistentes, error: fetchErr } = await supabase
    .from('items')
    .select('*')
    .neq('estado', 'archivado')

  if (fetchErr) {
    console.error('❌ Error consultando items:', fetchErr.message)
    process.exit(1)
  }

  console.log(`📦 Encontrados ${itemsExistentes.length} items activos/existentes.`)

  // 2. Análisis de solapamientos
  const solapamientosDetectados = []

  for (const newEvent of academicEvents) {
    const nStart = new Date(`${newEvent.inicio}T00:00:00.000Z`).getTime()
    const nEnd = new Date(`${newEvent.fin}T23:59:59.999Z`).getTime()

    for (const existingItem of itemsExistentes) {
      const eDateStr = existingItem.fecha_evento || existingItem.fecha_limite
      if (!eDateStr) continue

      const eStart = new Date(eDateStr).getTime()
      const eEndStr = existingItem.fecha_limite || existingItem.fecha_evento
      const eEnd = eEndStr ? new Date(eEndStr).getTime() : eStart + (24 * 60 * 60 * 1000 - 1)

      // Comprobar solapamiento de rangos: nStart <= eEnd && nEnd >= eStart
      if (nStart <= eEnd && nEnd >= eStart) {
        solapamientosDetectados.push({
          eventoAcademico: newEvent.titulo,
          fechaEventoAcademico: `${newEvent.inicio} a ${newEvent.fin}`,
          itemExistente: existingItem.titulo,
          tipoExistente: existingItem.tipo,
          fechaExistente: eDateStr.split('T')[0],
          etiquetasExistente: existingItem.etiquetas || []
        })
      }
    }
  }

  if (solapamientosDetectados.length > 0) {
    console.log(`\n⚠️  SE HAN DETECTADO ${solapamientosDetectados.length} SOLAPAMIENTOS:`)
    solapamientosDetectados.forEach((s, idx) => {
      console.log(`  ${idx + 1}. [${s.eventoAcademico}] (${s.fechaEventoAcademico}) coincide con "${s.itemExistente}" (${s.tipoExistente}, ${s.fechaExistente}) [etiquetas: ${s.etiquetasExistente.join(', ')}]`)
    })
  } else {
    console.log('\n✅ No se detectó ningún solapamiento con otros eventos/tareas existentes.')
  }

  // 3. Insertar eventos en Hermes
  console.log('\n🚀 3. Insertando eventos del Calendario Académico en Supabase...')
  const creados = []
  for (const ev of academicEvents) {
    // Comprobar si ya existe para evitar duplicados en re-ejecuciones
    const existe = itemsExistentes.find(i => i.titulo === ev.titulo && (i.etiquetas || []).includes(TAG_NO_LECTIVO))
    if (existe) {
      console.log(`  ⚠️ Evento "${ev.titulo}" ya existía en la base de datos (ID: ${existe.id}). Omitiendo inserción.`)
      creados.push(existe)
      continue
    }

    const { data: itemCreado, error: insertErr } = await supabase
      .from('items')
      .insert({
        tipo: 'evento',
        titulo: ev.titulo,
        descripcion: ev.descripcion,
        estado: 'activo',
        prioridad: 'media',
        fecha_evento: `${ev.inicio}T00:00:00.000Z`,
        fecha_limite: `${ev.fin}T23:59:59.999Z`,
        etiquetas: [TAG_NO_LECTIVO, ev.categoria],
        origen: 'web',
        metadata: {
          origen_oficial: 'Secretaría General UMU',
          curso: '2026/2027',
          master: 'Máster Big Data UMU',
          es_rango: ev.esRango,
          fecha_inicio: ev.inicio,
          fecha_fin: ev.fin,
          categoria_academica: ev.categoria
        }
      })
      .select()
      .single()

    if (insertErr) {
      console.error(`❌ Error al insertar "${ev.titulo}":`, insertErr.message)
    } else {
      console.log(`  ✅ Creado: "${itemCreado.titulo}" (${ev.inicio} ${ev.esRango ? '-> ' + ev.fin : ''})`)
      creados.push(itemCreado)
    }
  }

  console.log(`\n🎉 Proceso completado. Se han procesado/creado ${creados.length} eventos académicos.`)

  // Resumen formateado para JSON/salida
  console.log('\n--- RESUMEN FINAL ---')
  console.log(JSON.stringify({
    totalInsertados: creados.length,
    solapamientos: solapamientosDetectados
  }, null, 2))
}

run()
