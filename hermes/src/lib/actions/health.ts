'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { RutinaGym, PlantillaGym, SerieGym, SesionGym } from '@/lib/types'
import { actualizarNotasPlantilla } from '@/lib/utils'

function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  return url.startsWith('https://') && !url.includes('placeholder')
}

// Plantillas predeterminadas de la rutina actual del usuario (Fallback estático e inicialización)
const PLANTILLAS_PREDEFINIDAS = [
  {
    id: 'plantilla-1',
    nombre_dia: 'DÍA 1: TORSO FUERZA (Domingo Noche)',
    orden: 1,
    ejercicios: [
      { nombre: 'Press de Banca (Barra)', series: 4, repeticiones: '5-6', peso_kg: 65, descanso: '3 min', notas: 'RIR 1-2 | 6-6-5-5' },
      { nombre: 'Dominadas Supinas', series: 4, repeticiones: '6-8', peso_kg: 0, descanso: '3 min', notas: 'Libre | RIR 1 | 8-8-8-8' },
      { nombre: 'Remo en T (Máquina)', series: 3, repeticiones: '8-10', peso_kg: 35, descanso: '2 min', notas: 'RIR 1 | 10-10-10' },
      { nombre: 'Press Militar (Manc.)', series: 3, repeticiones: '6-8', peso_kg: 18, descanso: '2 min', notas: 'RIR 1 | 8-8-8' },
      { nombre: 'Elev. Laterales (Manc.)', series: 3, repeticiones: '12-15', peso_kg: 10, descanso: '90 seg', notas: 'RIR 0 | 15-15-15' },
      { nombre: 'Curl Bíceps Martillo', series: 3, repeticiones: '10-12', peso_kg: 10, descanso: '60 seg', notas: 'RIR 0 | 12-' },
      { nombre: 'Elev. Piernas Suelo', series: 3, repeticiones: '12-15', peso_kg: 4, descanso: '60 seg', notas: 'RIR 1 | 12' }
    ]
  },
  {
    id: 'plantilla-2',
    nombre_dia: 'DÍA 2: PIERNA COMPLETA (Martes)',
    orden: 2,
    ejercicios: [
      { nombre: 'Sentadilla V-Squat', series: 4, repeticiones: '8-10', peso_kg: 90, descanso: '3 min', notas: 'RIR 1-2 | 8-8-8-' },
      { nombre: 'Peso Muerto Rumano', series: 3, repeticiones: '8-10', peso_kg: 30, descanso: '3 min', notas: 'RIR 1-2 | 10-8-8' },
      { nombre: 'Curl Isquios (Máquina)', series: 3, repeticiones: '10-12', peso_kg: 80, descanso: '2 min', notas: 'RIR 0 | 12-12-12' },
      { nombre: 'Extensión Cuádriceps', series: 3, repeticiones: '12-15', peso_kg: 50, descanso: '90 seg', notas: 'RIR 0 | 15-15-15' },
      { nombre: 'Aductores (Máquina)', series: 3, repeticiones: '12-15', peso_kg: 65, descanso: '60 seg', notas: 'RIR 0' },
      { nombre: 'Gemelos en Máquina', series: 4, repeticiones: '15-20', peso_kg: 20, descanso: '60 seg', notas: 'RIR 0 | 20-20-' },
      { nombre: 'Plancha Abdominal', series: 3, repeticiones: '45-60 seg', peso_kg: 0, descanso: '60 seg', notas: 'RIR 0' }
    ]
  },
  {
    id: 'plantilla-3',
    nombre_dia: 'DÍA 3: EMPUJE HIPERTROFIA (Jueves)',
    orden: 3,
    ejercicios: [
      { nombre: 'Press Inclinado (Multi/Manc)', series: 4, repeticiones: '8-10', peso_kg: 45, descanso: '2 min', notas: 'RIR 1 | 10-10-9-9' },
      { nombre: 'Fondos Tríceps/Pecho', series: 3, repeticiones: '8-10', peso_kg: 0, descanso: '90 seg', notas: 'RIR 1 | 8-8-7' },
      { nombre: 'Aperturas (Máquina/Polea)', series: 3, repeticiones: '12-15', peso_kg: 15, descanso: '60 seg', notas: 'RIR 0 | 15-15-15' },
      { nombre: 'Elev. Laterales (Máq/Polea)', series: 4, repeticiones: '12-15', peso_kg: 22.5, descanso: '60 seg', notas: 'RIR 0 | 15-15-14-14' },
      { nombre: 'Tríceps Polea (Cuerda)', series: 3, repeticiones: '12-15', peso_kg: 17.5, descanso: '60 seg', notas: 'RIR 0 | 15-11-' },
      { nombre: 'Press Pallof (Core)', series: 3, repeticiones: '15 rep/lado', peso_kg: 12.5, descanso: '60 seg', notas: 'RIR 1 | 15-' }
    ]
  },
  {
    id: 'plantilla-4',
    nombre_dia: 'DÍA 4: TIRÓN HIPERTROFIA (Viernes)',
    orden: 4,
    ejercicios: [
      { nombre: 'Dominadas Pronas (Abiertas)', series: 4, repeticiones: '8-10', peso_kg: 2.5, descanso: '2 min', notas: 'RIR 1 | 9-9-8-8' },
      { nombre: 'Remo Agarre Cerrado/Gironda', series: 4, repeticiones: '10-12', peso_kg: 40, descanso: '90 seg', notas: 'RIR 1 | 12-12-11' },
      { nombre: 'Jalón al Pecho', series: 3, repeticiones: '10-12', peso_kg: 45, descanso: '90 seg', notas: 'RIR 1 | 12-12-' },
      { font: '', nombre: 'Face Pull (Polea Alta)', series: 3, repeticiones: '15-20', peso_kg: 25, descanso: '60 seg', notas: 'RIR 0 | 15-15-' },
      { nombre: 'Bíceps Curl', series: 3, repeticiones: '10-12', peso_kg: 10, descanso: '90 seg', notas: 'RIR 0-1' },
      { nombre: 'Bíceps Banco Scott', series: 3, repeticiones: '12-15', peso_kg: 20, descanso: '60 seg', notas: 'Superserie / Drop set (bajando peso conforme fallo)' },
      { nombre: 'Máquina Guiada Abdominales', series: 3, repeticiones: '10-12', peso_kg: 50, descanso: '60 seg', notas: 'RIR 0-1' }
    ]
  }
]

// Mapa de descansos por nombre de ejercicio (fuente de verdad)
const DESCANSOS_POR_EJERCICIO: Record<string, string> = {
  'Press de Banca (Barra)': '3 min',
  'Dominadas Supinas': '3 min',
  'Remo en T (Máquina)': '2 min',
  'Press Militar (Manc.)': '2 min',
  'Elev. Laterales (Manc.)': '90 seg',
  'Curl Bíceps Martillo': '60 seg',
  'Elev. Piernas Suelo': '60 seg',
  'Sentadilla V-Squat': '3 min',
  'Peso Muerto Rumano': '3 min',
  'Curl Isquios (Máquina)': '2 min',
  'Extensión Cuádriceps': '90 seg',
  'Aductores (Máquina)': '60 seg',
  'Gemelos en Máquina': '60 seg',
  'Plancha Abdominal': '60 seg',
  'Press Inclinado (Multi/Manc)': '2 min',
  'Fondos Tríceps/Pecho': '90 seg',
  'Aperturas (Máquina/Polea)': '60 seg',
  'Elev. Laterales (Máq/Polea)': '60 seg',
  'Tríceps Polea (Cuerda)': '60 seg',
  'Press Pallof (Core)': '60 seg',
  'Dominadas Pronas (Abiertas)': '2 min',
  'Remo Agarre Cerrado/Gironda': '90 seg',
  'Jalón al Pecho': '90 seg',
  'Face Pull (Polea Alta)': '60 seg',
  'Bíceps Curl': '90 seg',
  'Bíceps Banco Scott': '60 seg',
  'Máquina Guiada Abdominales': '60 seg',
  'Superserie: Bíceps Curl Alterno + Abs Polea Alta Crunch': '60-90 seg',
}

// ============================================================
// GYM ACTIONS
// ============================================================

export async function sincronizarDescansos(): Promise<{ ok: boolean; mensaje: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, mensaje: 'Supabase no configurado — usando datos locales' }
  }
  const supabase = createAdminClient()
  const { data: plantillas, error } = await supabase
    .from('plantillas_gym')
    .select('id, ejercicios')
    .order('orden')
  if (error || !plantillas) {
    return { ok: false, mensaje: `Error al leer plantillas: ${error?.message}` }
  }

  let actualizadas = 0
  for (const p of plantillas) {
    const ejerciciosActualizados = (p.ejercicios as any[]).map((ej: any) => ({
      ...ej,
      descanso: DESCANSOS_POR_EJERCICIO[ej.nombre] ?? ej.descanso ?? '—',
    }))
    const { error: updateError } = await supabase
      .from('plantillas_gym')
      .update({ ejercicios: ejerciciosActualizados })
      .eq('id', p.id)
    if (!updateError) actualizadas++
  }

  revalidatePath('/gym')
  return { ok: true, mensaje: `${actualizadas} plantilla(s) actualizadas con los tiempos de descanso` }
}

export async function getPlantillasGym(): Promise<PlantillaGym[]> {
  if (!isSupabaseConfigured()) return PLANTILLAS_PREDEFINIDAS
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('plantillas_gym')
    .select('*')
    .order('orden')
  if (error) {
    console.error('[getPlantillasGym] Fallback a predefinidas:', error.message)
    return PLANTILLAS_PREDEFINIDAS
  }
  if (!data || data.length === 0) {
    // Si la tabla está vacía, la inicializamos con un único insert en batch y devolvemos los datos insertados
    const { data: insertedData, error: insertError } = await supabase
      .from('plantillas_gym')
      .insert(
        PLANTILLAS_PREDEFINIDAS.map(p => ({
          nombre_dia: p.nombre_dia,
          orden: p.orden,
          ejercicios: p.ejercicios,
        }))
      )
      .select()
      .order('orden')
    
    if (insertError || !insertedData || insertedData.length === 0) {
      console.error('[getPlantillasGym] Error al inicializar plantillas:', insertError?.message)
      return PLANTILLAS_PREDEFINIDAS
    }
    return insertedData as PlantillaGym[]
  }
  return data as PlantillaGym[]
}

export async function guardarPlantillaGym(id: string, ejercicios: any[], nombreDia?: string) {
  if (!isSupabaseConfigured()) return
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    throw new Error('ID de plantilla inválido. Asegúrate de que la base de datos esté sincronizada.')
  }

  const supabase = createAdminClient()
  const updateData: any = { ejercicios }
  if (nombreDia) updateData.nombre_dia = nombreDia

  const { error } = await supabase
    .from('plantillas_gym')
    .update(updateData)
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/gym')
}

export async function getRutinasGym(filtros?: { ejercicio?: string; desde?: string; hasta?: string }) {
  if (!isSupabaseConfigured()) return [] as RutinaGym[]
  const supabase = createAdminClient()
  let query = supabase
    .from('rutinas_gym')
    .select('*')
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })

  if (filtros?.ejercicio) query = query.ilike('ejercicio', `%${filtros.ejercicio}%`)
  if (filtros?.desde)     query = query.gte('fecha', filtros.desde)
  if (filtros?.hasta)     query = query.lte('fecha', filtros.hasta)

  const { data, error } = await query
  if (error) { console.error('[getRutinasGym]', error.message); return [] }
  return data as RutinaGym[]
}

export async function getEjerciciosUnicos(): Promise<string[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('rutinas_gym').select('ejercicio')
  if (error) { console.error('[getEjerciciosUnicos]', error.message); return [] }
  const nombres = data.map((r: { ejercicio: string }) => r.ejercicio)
  return [...new Set(nombres)].sort()
}

export async function crearRutinaGym(data: {
  ejercicio: string
  series: number
  repeticiones?: string
  peso_kg?: number
  duracion_min?: number
  fecha?: string
  notas?: string
}) {
  if (!isSupabaseConfigured()) { console.warn('[crearRutinaGym] Supabase no configurado'); return }
  const supabase = createAdminClient()
  const { data: rutina, error } = await supabase
    .from('rutinas_gym')
    .insert({ ...data, fecha: data.fecha ?? new Date().toISOString().split('T')[0] })
    .select()
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/gym')
  return rutina as RutinaGym
}

export async function registrarSesionCompleta(fecha: string, ejercicios: any[], plantillaId?: string) {
  if (!isSupabaseConfigured()) return
  const supabase = createAdminClient()
  
  // Registrar cada ejercicio completado en el historial
  for (const ej of ejercicios) {
    if (ej.completado) {
      const pesoValue = ej.pesoLog !== '' && !isNaN(parseFloat(ej.pesoLog))
        ? parseFloat(ej.pesoLog)
        : (ej.peso_kg ?? null)

      // Guardar repeticiones como string para soportar formatos como "10-10-10-10"
      const repsValue = ej.repeticionesLog?.trim() || ej.repeticiones || null

      const { error: insertError } = await supabase.from('rutinas_gym').insert({
        fecha,
        ejercicio: ej.nombre,
        series: parseInt(ej.seriesLog) || ej.series,
        repeticiones: repsValue,
        peso_kg: pesoValue,
        notas: ej.notasLog || ej.notas || null
      })
      if (insertError) {
        console.error(`[registrarSesionCompleta] Error insertando ejercicio "${ej.nombre}":`, insertError.message)
      }
    }
  }

  // Si se proporciona plantillaId, actualizar la plantilla con los nuevos valores de la sesión
  if (plantillaId) {
    // 1. Obtener la plantilla actual desde Supabase (fuente de verdad)
    const { data: plantilla, error: fetchError } = await supabase
      .from('plantillas_gym')
      .select('*')
      .eq('id', plantillaId)
      .single()

    if (fetchError) {
      console.error('[registrarSesionCompleta] Error al obtener plantilla para actualizar:', fetchError.message)
    } else if (plantilla) {
      // 2. Construir array actualizado con los datos reales registrados en la sesión
      const ejerciciosActualizados = (plantilla.ejercicios as any[]).map((ejOriginal: any) => {
        const ejSesion = ejercicios.find((e: any) => e.nombre === ejOriginal.nombre && e.completado)
        if (ejSesion) {
          // Peso: usar el valor registrado en la sesión si es válido
          const pesoGuardar = ejSesion.pesoLog !== '' && !isNaN(parseFloat(ejSesion.pesoLog))
            ? parseFloat(ejSesion.pesoLog)
            : ejOriginal.peso_kg

          // Series: usar el valor registrado si es válido
          const seriesGuardar = parseInt(ejSesion.seriesLog) || ejOriginal.series

          // Repeticiones: guardar como string para soportar "10-10-10-10", rangos, etc.
          const repsGuardar = ejSesion.repeticionesLog?.trim() || ejOriginal.repeticiones

          return {
            ...ejOriginal,
            series: seriesGuardar,
            repeticiones: repsGuardar,
            peso_kg: pesoGuardar,
            notas: actualizarNotasPlantilla(ejOriginal.notas, ejSesion.notasLog)
          }
        }
        return ejOriginal
      })

      // 3. Persistir la plantilla actualizada en Supabase
      const { error: updateError } = await supabase
        .from('plantillas_gym')
        .update({ ejercicios: ejerciciosActualizados })
        .eq('id', plantillaId)

      if (updateError) {
        console.error('[registrarSesionCompleta] Error al actualizar plantilla con progresión:', updateError.message)
        throw new Error(`No se pudo actualizar la plantilla: ${updateError.message}`)
      } else {
        console.log(`[registrarSesionCompleta] Plantilla ${plantillaId} actualizada correctamente con los nuevos pesos/reps.`)
      }
    }
  }

  revalidatePath('/gym')
}

export async function eliminarRutinaGym(id: string) {
  if (!isSupabaseConfigured()) return
  const supabase = createAdminClient()
  const { error } = await supabase.from('rutinas_gym').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/gym')
}

export interface DetalleHistorialEjercicio {
  fecha: string
  peso_kg: number
  series: number
  repeticiones: string
  notas?: string
  seriesDetalle: Array<{
    numero_serie: number
    peso_kg: number
    repeticiones: number
    rir?: string
  }>
  resumenTexto: string
}

export async function getUltimoHistorialPorEjercicio(): Promise<Record<string, DetalleHistorialEjercicio>> {
  if (!isSupabaseConfigured()) return {}
  const supabase = createAdminClient()

  // Intentar leer de series_gym con join de sesiones_gym si existen
  try {
    const { data: seriesData, error: seriesError } = await supabase
      .from('series_gym')
      .select('ejercicio, numero_serie, peso_kg, repeticiones, rir_real, created_at, sesiones_gym (fecha)')
      .order('created_at', { ascending: false })
      .limit(300)

    if (!seriesError && seriesData && seriesData.length > 0) {
      const mapa: Record<string, DetalleHistorialEjercicio> = {}
      for (const item of seriesData) {
        const key = item.ejercicio.trim().toLowerCase()
        const sesionFecha = (item.sesiones_gym as any)?.fecha || item.created_at?.split('T')[0] || ''
        
        if (!mapa[key]) {
          mapa[key] = {
            fecha: sesionFecha,
            peso_kg: Number(item.peso_kg) || 0,
            series: 1,
            repeticiones: String(item.repeticiones),
            seriesDetalle: [],
            resumenTexto: ''
          }
        }
        // Agrupar sólo las series de la última fecha
        if (mapa[key].fecha === sesionFecha) {
          mapa[key].seriesDetalle.push({
            numero_serie: item.numero_serie,
            peso_kg: Number(item.peso_kg) || 0,
            repeticiones: Number(item.repeticiones) || 0,
            rir: item.rir_real || undefined
          })
        }
      }

      // Ordenar series por numero_serie y generar resumenTexto
      for (const key of Object.keys(mapa)) {
        mapa[key].seriesDetalle.sort((a, b) => a.numero_serie - b.numero_serie)
        mapa[key].series = mapa[key].seriesDetalle.length
        const maxPeso = Math.max(...mapa[key].seriesDetalle.map(s => s.peso_kg), 0)
        mapa[key].peso_kg = maxPeso
        const repsList = mapa[key].seriesDetalle.map(s => s.repeticiones).join('-')
        mapa[key].repeticiones = repsList
        const primerRir = mapa[key].seriesDetalle.find(s => s.rir)?.rir
        mapa[key].resumenTexto = `${maxPeso > 0 ? `${maxPeso} kg · ` : ''}${repsList} reps${primerRir ? ` (RIR ${primerRir})` : ''}`
      }

      if (Object.keys(mapa).length > 0) return mapa
    }
  } catch {
    // Si la tabla series_gym aún no existe en Supabase, pasamos directamente a rutinas_gym
  }

  // Fallback: leer de rutinas_gym
  const { data: rutinas, error } = await supabase
    .from('rutinas_gym')
    .select('*')
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })

  if (error || !rutinas) return {}

  const mapa: Record<string, DetalleHistorialEjercicio> = {}

  for (const r of rutinas) {
    const key = r.ejercicio.trim().toLowerCase()
    if (mapa[key]) continue // Ya guardamos el más reciente

    const notas = r.notas || ''
    const repStr = r.repeticiones || ''
    const numSeries = r.series || 3
    const peso = r.peso_kg || 0

    // Parsear series de notas o repStr
    const matchReps = (notas.match(/(\d+[-/]\d+[-/]\d+(?:[-/]\d+)*)/) || repStr.match(/^(\d+[-/]\d+[-/]\d+(?:[-/]\d+)*)$/))
    const matchRir = (notas.match(/RIR\s*([0-9]+(?:-[0-9]+)?)/i) || repStr.match(/RIR\s*([0-9]+(?:-[0-9]+)?)/i))
    const rir = matchRir ? matchRir[1] : undefined

    let repsArray: number[] = []
    if (matchReps) {
      repsArray = matchReps[1].split(/[-/]/).map((n: string) => parseInt(n)).filter((n: number) => !isNaN(n))
    } else {
      const singleNum = parseInt(repStr) || parseInt(notas.match(/\b\d+\b/)?.[0] || '10')
      repsArray = Array(numSeries).fill(singleNum)
    }

    const seriesDetalle = repsArray.slice(0, numSeries).map((reps, idx) => ({
      numero_serie: idx + 1,
      peso_kg: peso,
      repeticiones: reps,
      rir
    }))

    const repsResumen = repsArray.join('-')
    const rirTexto = rir ? ` (RIR ${rir})` : ''
    const resumenTexto = `${peso > 0 ? `${peso} kg · ` : ''}${repsResumen} reps${rirTexto}`

    mapa[key] = {
      fecha: r.fecha,
      peso_kg: peso,
      series: numSeries,
      repeticiones: r.repeticiones || repsResumen,
      notas: r.notas,
      seriesDetalle,
      resumenTexto
    }
  }

  return mapa
}

export async function getRecordsPersonales(): Promise<Record<string, number>> {
  if (!isSupabaseConfigured()) return {}
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('rutinas_gym').select('ejercicio, peso_kg')
  if (error || !data) return {}

  const prs: Record<string, number> = {}
  for (const row of data) {
    if (row.peso_kg && row.peso_kg > 0) {
      const key = row.ejercicio.trim().toLowerCase()
      if (!prs[key] || row.peso_kg > prs[key]) {
        prs[key] = row.peso_kg
      }
    }
  }
  return prs
}

export interface SerieInput {
  numero_serie: number
  peso_kg: number
  repeticiones: number
  rir?: string
  completada: boolean
  notas?: string
}

export interface EjercicioSesionInput {
  nombre: string
  completado: boolean
  series: SerieInput[]
  descanso?: string
  notasGuia?: string
}

export async function guardarSesionEstructurada(payload: {
  fecha: string
  plantillaId?: string
  nombreDia: string
  duracionSegundos?: number
  ejercicios: EjercicioSesionInput[]
}) {
  if (!isSupabaseConfigured()) return { ok: false, mensaje: 'Supabase no configurado' }
  const supabase = createAdminClient()

  const ejerciciosCompletados = payload.ejercicios.filter(e => e.completado && e.series && e.series.length > 0)
  if (ejerciciosCompletados.length === 0) {
    return { ok: false, mensaje: 'No hay ejercicios con series para guardar' }
  }

  const fechaLimpia = payload.fecha && /^\d{4}-\d{2}-\d{2}$/.test(payload.fecha)
    ? payload.fecha
    : new Date().toISOString().split('T')[0]

  // Validar si plantillaId es un UUID válido para PostgreSQL
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const validPlantillaId = payload.plantillaId && uuidRegex.test(payload.plantillaId)
    ? payload.plantillaId
    : null

  const duracionLimpia = typeof payload.duracionSegundos === 'number' && !isNaN(payload.duracionSegundos) && payload.duracionSegundos > 0
    ? Math.round(payload.duracionSegundos)
    : null

  // 1. Registrar en las tablas estructuradas sesiones_gym y series_gym
  let sesionId: string | null = null
  try {
    const { data: sesionData, error: sesionError } = await supabase
      .from('sesiones_gym')
      .insert({
        fecha: fechaLimpia,
        plantilla_id: validPlantillaId,
        nombre_dia: payload.nombreDia || 'Entrenamiento',
        estado: 'completada',
        duracion_segundos: duracionLimpia
      })
      .select('id')
      .single()

    if (sesionError) {
      console.warn('[guardarSesionEstructurada] Error insertando en sesiones_gym:', sesionError.message)
    } else if (sesionData) {
      sesionId = sesionData.id
      const seriesToInsert: any[] = []
      for (const ej of ejerciciosCompletados) {
        for (const s of ej.series) {
          const pesoNumerico = typeof s.peso_kg === 'number' && !isNaN(s.peso_kg) ? Math.max(0, s.peso_kg) : 0
          const repsNumerico = parseInt(String(s.repeticiones)) || 0
          const numSerie = Math.max(1, Math.round(Number(s.numero_serie) || 1))

          seriesToInsert.push({
            sesion_id: sesionId,
            ejercicio: ej.nombre,
            numero_serie: numSerie,
            peso_kg: pesoNumerico,
            repeticiones: repsNumerico,
            rir_real: s.rir ? String(s.rir).trim() : null,
            completada: Boolean(s.completada),
            notas: s.notas ? String(s.notas).trim() : null
          })
        }
      }
      if (seriesToInsert.length > 0) {
        const { error: seriesError } = await supabase.from('series_gym').insert(seriesToInsert)
        if (seriesError) {
          console.warn('[guardarSesionEstructurada] Error insertando en series_gym:', seriesError.message)
        }
      }
    }
  } catch (err) {
    console.warn('[guardarSesionEstructurada] Fallo en sesiones_gym / series_gym:', err)
  }

  // 2. Registrar siempre en rutinas_gym (garantiza compatibilidad completa en el historial)
  let guardadosEnRutinas = 0
  for (const ej of ejerciciosCompletados) {
    const seriesCompletadas = ej.series.filter(s => s.completada)
    const seriesUsar = seriesCompletadas.length > 0 ? seriesCompletadas : ej.series
    const pesosValidos = seriesUsar.map(s => Number(s.peso_kg) || 0)
    const maxPeso = pesosValidos.length > 0 ? Math.max(...pesosValidos, 0) : 0
    const repsFormato = seriesUsar.map(s => s.repeticiones || 10).join('-')
    const rirValores = seriesUsar.map(s => s.rir).filter(Boolean)
    const rirTexto = rirValores.length > 0 ? `RIR ${rirValores[0]}` : ''

    const { error: insertError } = await supabase.from('rutinas_gym').insert({
      fecha: fechaLimpia,
      ejercicio: ej.nombre,
      series: Math.max(seriesUsar.length, 1),
      repeticiones: repsFormato || '10',
      peso_kg: maxPeso > 0 ? maxPeso : null,
      duracion_min: null,
      notas: rirTexto || null
    })

    if (insertError) {
      console.error(`[guardarSesionEstructurada] Error insertando en rutinas_gym "${ej.nombre}":`, insertError.message)
    } else {
      guardadosEnRutinas++
    }
  }

  // 3. Si viene de una plantilla con UUID válido, actualizar los pesos de la plantilla
  if (validPlantillaId) {
    try {
      const { data: plantilla } = await supabase
        .from('plantillas_gym')
        .select('*')
        .eq('id', validPlantillaId)
        .single()

      if (plantilla && Array.isArray(plantilla.ejercicios)) {
        const ejerciciosActualizados = plantilla.ejercicios.map((ejOriginal: any) => {
          if (!ejOriginal || !ejOriginal.nombre) return ejOriginal
          const ejSesion = ejerciciosCompletados.find(
            e => e.nombre && e.nombre.toLowerCase().trim() === ejOriginal.nombre.toLowerCase().trim()
          )
          if (ejSesion) {
            const seriesValidas = ejSesion.series || []
            const pesosSesion = seriesValidas.map(s => Number(s.peso_kg) || 0)
            const maxPesoSesion = pesosSesion.length > 0 ? Math.max(...pesosSesion, 0) : 0
            const repsSesion = seriesValidas.map(s => s.repeticiones).join('-')
            const rirSesion = seriesValidas.find(s => s.rir)?.rir

            return {
              ...ejOriginal,
              series: seriesValidas.length || ejOriginal.series,
              repeticiones: repsSesion || ejOriginal.repeticiones,
              peso_kg: maxPesoSesion > 0 ? maxPesoSesion : ejOriginal.peso_kg,
              notas: rirSesion ? `RIR ${rirSesion}` : ejOriginal.notas
            }
          }
          return ejOriginal
        })

        await supabase
          .from('plantillas_gym')
          .update({ ejercicios: ejerciciosActualizados })
          .eq('id', validPlantillaId)
      }
    } catch (templateErr) {
      console.warn('[guardarSesionEstructurada] Error actualizando pesos en plantilla (no crítico):', templateErr)
    }
  }

  revalidatePath('/gym')
  return { ok: true, sesionId, fecha: fechaLimpia, ejerciciosGuardados: guardadosEnRutinas }
}

export async function checkGoogleConnection(): Promise<boolean> {
  try {
    const { isGoogleConnected } = await import('@/lib/googleCalendar')
    return await isGoogleConnected()
  } catch (e) {
    console.error(e)
    return false
  }
}
