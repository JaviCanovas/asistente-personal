// Backfill script: migra datos de rutinas_gym hacia sesiones_gym y series_gym
// Uso: node scripts/backfill-gym.mjs

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envContent = fs.readFileSync('.env.local', 'utf-8')
const env = Object.fromEntries(
  envContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const idx = line.indexOf('=')
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()]
    })
)

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

async function backfill() {
  console.log('Verificando si las tablas existen...')
  const check = await supabase.from('sesiones_gym').select('id').limit(1)
  if (check.error) {
    console.error('❌ Error: La tabla sesiones_gym aún no existe. Por favor ejecuta la migración 005_gym_structured_sets.sql en Supabase SQL Editor.')
    return
  }

  // Verificar si ya hay datos en sesiones_gym
  const { count } = await supabase.from('sesiones_gym').select('id', { count: 'exact', head: true })
  if (count && count > 0) {
    console.log(`⚠️ Ya existen ${count} sesiones en sesiones_gym. Saltando backfill para evitar duplicados.`)
    return
  }

  const { data: plantillas } = await supabase.from('plantillas_gym').select('*').order('orden')
  const { data: rutinas, error } = await supabase
    .from('rutinas_gym')
    .select('*')
    .order('fecha', { ascending: true })
    .order('created_at', { ascending: true })

  if (error || !rutinas) {
    console.error('Error cargando rutinas_gym:', error?.message)
    return
  }

  // Agrupar por fecha
  const sesionesPorFecha = {}
  for (const r of rutinas) {
    if (!sesionesPorFecha[r.fecha]) sesionesPorFecha[r.fecha] = []
    sesionesPorFecha[r.fecha].push(r)
  }

  console.log(`Iniciando migración de ${rutinas.length} registros en ${Object.keys(sesionesPorFecha).length} sesiones...`)

  let sesionesInsertadas = 0
  let seriesInsertadas = 0

  for (const [fecha, ejercicios] of Object.entries(sesionesPorFecha)) {
    const nombres = ejercicios.map(e => e.ejercicio.toLowerCase())
    let plantillaMatch = null
    if (plantillas) {
      for (const p of plantillas) {
        const matches = (p.ejercicios || []).filter(pe => 
          nombres.some(n => n.includes(pe.nombre.toLowerCase()) || pe.nombre.toLowerCase().includes(n))
        )
        if (matches.length >= 2) {
          plantillaMatch = p
          break
        }
      }
    }

    const { data: sesionData, error: sesionError } = await supabase
      .from('sesiones_gym')
      .insert({
        fecha,
        nombre_dia: plantillaMatch ? plantillaMatch.nombre_dia : `Entrenamiento ${fecha}`,
        plantilla_id: plantillaMatch ? plantillaMatch.id : null,
        estado: 'completada'
      })
      .select('id')
      .single()

    if (sesionError || !sesionData) {
      console.error(`Error creando sesión para ${fecha}:`, sesionError?.message)
      continue
    }

    sesionesInsertadas++
    const sesionId = sesionData.id
    const seriesToInsert = []

    for (const ej of ejercicios) {
      const notas = ej.notas || ''
      const repStr = ej.repeticiones || ''
      const numSeries = ej.series || 3
      const peso = ej.peso_kg || 0

      const matchReps = (notas.match(/(\d+[-/]\d+[-/]\d+(?:[-/]\d+)*)/) || repStr.match(/^(\d+[-/]\d+[-/]\d+(?:[-/]\d+)*)$/))
      const matchRir = (notas.match(/RIR\s*([0-9]+(?:-[0-9]+)?)/i) || repStr.match(/RIR\s*([0-9]+(?:-[0-9]+)?)/i))
      const rir = matchRir ? matchRir[1] : null

      let repsArray = []
      if (matchReps) {
        repsArray = matchReps[1].split(/[-/]/).map(n => parseInt(n)).filter(n => !isNaN(n))
      } else {
        const singleNum = parseInt(repStr) || parseInt(notas.match(/\b\d+\b/)?.[0] || '10')
        repsArray = Array(numSeries).fill(singleNum)
      }

      while (repsArray.length < numSeries) {
        repsArray.push(repsArray[repsArray.length - 1] || 10)
      }

      for (let s = 1; s <= numSeries; s++) {
        seriesToInsert.push({
          sesion_id: sesionId,
          ejercicio: ej.ejercicio,
          numero_serie: s,
          peso_kg: peso,
          repeticiones: repsArray[s - 1] || 10,
          rir_real: rir,
          completada: true,
          notas: notas || null
        })
      }
    }

    if (seriesToInsert.length > 0) {
      const { error: seriesError } = await supabase.from('series_gym').insert(seriesToInsert)
      if (seriesError) {
        console.error(`Error insertando series de sesión ${fecha}:`, seriesError.message)
      } else {
        seriesInsertadas += seriesToInsert.length
      }
    }
  }

  console.log(`\n🎉 Migración completada exitosamente!`)
  console.log(`✅ Sesiones insertadas: ${sesionesInsertadas}`)
  console.log(`✅ Series individuales insertadas: ${seriesInsertadas}`)
  console.log(`🛡️ Registros originales en 'rutinas_gym' siguen intactos.`)
}

backfill()
