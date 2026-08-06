'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { RutinaGym, PlantillaGym } from '@/lib/types'
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
      { nombre: 'Bíceps Banco Scott', series: 3, repeticiones: '12-15', peso_kg: 15, descanso: '60 seg', notas: 'RIR 0' },
      { nombre: 'Superserie: Bíceps Curl Alterno + Abs Polea Alta Crunch', series: 3, repeticiones: 'Bíceps: 10-12 / Abs: 15-20', peso_kg: 10, descanso: '60-90 seg', notas: 'Descanso al terminar ambos' }
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
  'Bíceps Banco Scott': '60 seg',
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
  repeticiones?: number
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
  
  // Registrar cada ejercicio en la sesión de forma secuencial
  for (const ej of ejercicios) {
    if (ej.completado) {
      const pesoValue = ej.pesoLog !== '' && !isNaN(parseFloat(ej.pesoLog))
        ? parseFloat(ej.pesoLog)
        : (ej.peso_kg ?? null)

      await supabase.from('rutinas_gym').insert({
        fecha,
        ejercicio: ej.nombre,
        series: parseInt(ej.seriesLog) || ej.series,
        repeticiones: parseInt(ej.repeticionesLog) || parseInt(ej.repeticiones) || null,
        peso_kg: pesoValue,
        notas: ej.notasLog || ej.notas || null
      })
    }
  }

  // Si se proporciona plantillaId, actualizar la plantilla con los nuevos valores de la sesión
  if (plantillaId) {
    // 1. Obtener la plantilla actual
    const { data: plantilla, error: fetchError } = await supabase
      .from('plantillas_gym')
      .select('*')
      .eq('id', plantillaId)
      .single()

    if (!fetchError && plantilla) {
      // 2. Modificar sus ejercicios con los datos guardados de los ejercicios completados
      const ejerciciosActualizados = (plantilla.ejercicios as any[]).map((ejOriginal: any) => {
        // Buscar si este ejercicio fue completado en la sesión
        const ejSesion = ejercicios.find((e: any) => e.nombre === ejOriginal.nombre && e.completado)
        if (ejSesion) {
          const pesoGuardar = ejSesion.pesoLog !== '' && !isNaN(parseFloat(ejSesion.pesoLog))
            ? parseFloat(ejSesion.pesoLog)
            : ejOriginal.peso_kg

          return {
            ...ejOriginal,
            series: parseInt(ejSesion.seriesLog) || ejOriginal.series,
            repeticiones: ejSesion.repeticionesLog || ejOriginal.repeticiones,
            peso_kg: pesoGuardar,
            notas: actualizarNotasPlantilla(ejOriginal.notas, ejSesion.notasLog)
          }
        }
        return ejOriginal
      })

      // 3. Guardar en plantillas_gym
      await supabase
        .from('plantillas_gym')
        .update({ ejercicios: ejerciciosActualizados })
        .eq('id', plantillaId)
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

export async function checkGoogleConnection(): Promise<boolean> {
  try {
    const { isGoogleConnected } = await import('@/lib/googleCalendar')
    return await isGoogleConnected()
  } catch (e) {
    console.error(e)
    return false
  }
}
