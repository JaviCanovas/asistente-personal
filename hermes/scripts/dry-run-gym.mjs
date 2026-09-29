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

async function simulateMigration() {
  const { data: plantillas } = await supabase
    .from('plantillas_gym')
    .select('*')
    .order('orden')

  const { data: rutinas, error } = await supabase
    .from('rutinas_gym')
    .select('*')
    .order('fecha', { ascending: true })
    .order('created_at', { ascending: true })

  if (error || !rutinas) {
    console.error('Error fetching rutinas:', error)
    return
  }

  // Agrupar por fecha
  const sesionesPorFecha = {}
  for (const r of rutinas) {
    if (!sesionesPorFecha[r.fecha]) sesionesPorFecha[r.fecha] = []
    sesionesPorFecha[r.fecha].push(r)
  }

  const simulatedSesiones = []
  const simulatedSeries = []

  let totalRepsParsed = 0
  let totalRepsFallback = 0

  for (const [fecha, ejercicios] of Object.entries(sesionesPorFecha)) {
    // Intentar deducir plantilla
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

    const sesionId = `sim-sesion-${fecha}`
    simulatedSesiones.push({
      id: sesionId,
      fecha,
      nombre_dia: plantillaMatch ? plantillaMatch.nombre_dia : `Entrenamiento ${fecha}`,
      plantilla_id: plantillaMatch ? plantillaMatch.id : null,
      estado: 'completada',
      ejercicios_count: ejercicios.length
    })

    for (const ej of ejercicios) {
      const notas = ej.notas || ''
      const repStr = ej.repeticiones || ''
      const numSeries = ej.series || 3
      const peso = ej.peso_kg || 0

      // Buscar reps por serie: e.g. "6-6-5-5", "12-12-10", "8-8-8-8"
      const matchReps = (notas.match(/(\d+[-/]\d+[-/]\d+(?:[-/]\d+)*)/) || repStr.match(/^(\d+[-/]\d+[-/]\d+(?:[-/]\d+)*)$/))
      // Buscar RIR: e.g. "RIR 1-2", "RIR 0", "RIR 1"
      const matchRir = (notas.match(/RIR\s*([0-9]+(?:-[0-9]+)?)/i) || repStr.match(/RIR\s*([0-9]+(?:-[0-9]+)?)/i))
      const rir = matchRir ? matchRir[1] : null

      let repsArray = []
      if (matchReps) {
        repsArray = matchReps[1].split(/[-/]/).map(n => parseInt(n)).filter(n => !isNaN(n))
      }

      if (repsArray.length > 0) {
        totalRepsParsed++
      } else {
        totalRepsFallback++
        // Si no hay lista desagregada, extraer un número base de repStr (ej. "10-12" -> 10, "15" -> 15)
        const singleNum = parseInt(repStr) || parseInt(notas.match(/\b\d+\b/)?.[0] || '10')
        repsArray = Array(numSeries).fill(singleNum)
      }

      // Asegurar que repsArray tiene longitud igual a numSeries
      while (repsArray.length < numSeries) {
        repsArray.push(repsArray[repsArray.length - 1] || 10)
      }

      for (let s = 1; s <= numSeries; s++) {
        simulatedSeries.push({
          sesion_id: sesionId,
          ejercicio: ej.ejercicio,
          numero_serie: s,
          peso_kg: peso,
          repeticiones: repsArray[s - 1] || 10,
          rir_real: rir,
          completada: true,
          notas_originales: notas || null
        })
      }
    }
  }

  console.log(`\n================ SIMULACIÓN DE MIGRACIÓN ================`)
  console.log(`Total registros históricos en rutinas_gym: ${rutinas.length}`)
  console.log(`Sesiones creadas (agrupadas por fecha): ${simulatedSesiones.length}`)
  console.log(`Series individuales generadas: ${simulatedSeries.length}`)
  console.log(`Ejercicios con desglose exacto de series parseado: ${totalRepsParsed}`)
  console.log(`Ejercicios con repeticiones base (fallback conservador): ${totalRepsFallback}`)
  console.log(`Garantía: La tabla original 'rutinas_gym' permanece 100% INTACTA.`)
  console.log(`=========================================================\n`)

  console.log(`Ejemplo de 1 Sesión Simulada:`)
  console.log(JSON.stringify(simulatedSesiones[simulatedSesiones.length - 1], null, 2))

  const sampleSeries = simulatedSeries.filter(s => s.sesion_id === simulatedSesiones[simulatedSesiones.length - 1].id)
  console.log(`\nSeries correspondientes (${sampleSeries.length} series):`)
  console.table(sampleSeries.slice(0, 10).map(s => ({
    ejercicio: s.ejercicio.slice(0, 22),
    serie: `#${s.numero_serie}`,
    peso: `${s.peso_kg} kg`,
    reps: s.repeticiones,
    rir: s.rir_real || '—'
  })))
}

simulateMigration()
