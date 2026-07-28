'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Item, ItemTipo, ItemEstado, ItemPrioridad } from '@/lib/types'

// Guard: si las env vars son placeholders, devolver datos de demo
function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  return url.startsWith('https://') && !url.includes('placeholder')
}

const ITEMS_DEMO: Item[] = [
  {
    id: 'demo-item-1', tipo: 'tarea', titulo: 'Configurar Supabase y conectar la base de datos',
    descripcion: 'Crea un proyecto en https://app.supabase.com, ejecuta la migración SQL y rellena .env.local con tus claves.',
    estado: 'sin_procesar', prioridad: 'alta', etiquetas: ['tecnología'], origen: 'web',
    metadata: {}, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-item-2', tipo: 'idea', titulo: 'Añadir integración con Telegram en el futuro',
    descripcion: 'Canal de entrada para capturar ideas rápidas desde el móvil.',
    estado: 'activo', prioridad: 'media', etiquetas: ['tecnología'], origen: 'web',
    metadata: {}, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-item-3', tipo: 'nota', titulo: 'Bienvenido a Hermes',
    descripcion: 'Este es tu planificador personal inteligente. Conecta Supabase para empezar a guardar datos reales.',
    estado: 'activo', prioridad: 'baja', etiquetas: [], origen: 'web',
    metadata: {}, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
]

export async function getItems(filtros?: {
  tipo?: ItemTipo
  estado?: ItemEstado
  proyecto_id?: string
}) {
  if (!isSupabaseConfigured()) {
    let items = ITEMS_DEMO
    if (filtros?.tipo)   items = items.filter(i => i.tipo === filtros.tipo)
    if (filtros?.estado) items = items.filter(i => i.estado === filtros.estado)
    return items
  }

  const supabase = await createClient()
  let query = supabase
    .from('items')
    .select('*, proyecto:proyectos(id, nombre, color)')
    .order('created_at', { ascending: false })

  if (filtros?.tipo)        query = query.eq('tipo', filtros.tipo)
  if (filtros?.estado)      query = query.eq('estado', filtros.estado)
  if (filtros?.proyecto_id) query = query.eq('proyecto_id', filtros.proyecto_id)

  const { data, error } = await query
  if (error) {
    console.error('[getItems]', error.message)
    return ITEMS_DEMO
  }
  return data as Item[]
}

export async function getItemsActivos() {
  if (!isSupabaseConfigured()) return ITEMS_DEMO.filter(i => ['activo', 'sin_procesar'].includes(i.estado))
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('items')
    .select('*, proyecto:proyectos(id, nombre, color)')
    .in('estado', ['activo', 'sin_procesar'])
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[getItemsActivos]', error.message)
    return ITEMS_DEMO
  }
  return data as Item[]
}

export async function crearItem(data: {
  titulo: string
  tipo?: ItemTipo
  descripcion?: string
  estado?: ItemEstado
  prioridad?: ItemPrioridad
  fecha_limite?: string
  fecha_evento?: string
  proyecto_id?: string
  etiquetas?: string[]
}) {
  if (!isSupabaseConfigured()) {
    console.warn('[crearItem] Supabase no configurado — item no persistido')
    return { ...ITEMS_DEMO[0], ...data, id: Date.now().toString() }
  }
  const supabase = await createClient()
  
  const tipo = data.tipo ?? 'tarea'
  let fecha_limite = data.fecha_limite
  let fecha_evento = data.fecha_evento

  if (tipo === 'evento') {
    fecha_evento = fecha_evento || fecha_limite
    fecha_limite = undefined
  } else {
    fecha_limite = fecha_limite || fecha_evento
    fecha_evento = undefined
  }

  // Insertar primero en Supabase
  const { data: item, error } = await supabase
    .from('items')
    .insert({
      titulo:       data.titulo,
      tipo,
      descripcion:  data.descripcion,
      estado:       data.estado ?? 'sin_procesar',
      prioridad:    data.prioridad ?? 'media',
      fecha_limite,
      fecha_evento,
      proyecto_id:  data.proyecto_id,
      etiquetas:    data.etiquetas ?? [],
      origen:       'web',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Sincronizar con Google Calendar si tiene fecha programada
  const { crearEventoGoogle } = await import('@/lib/googleCalendar')
  const tieneFecha = data.fecha_evento || data.fecha_limite
  if (tieneFecha) {
    const googleEventId = await crearEventoGoogle(item as Item)
    if (googleEventId) {
      // Actualizar el item con el ID del evento retornado por Google
      const { error: updateError } = await supabase
        .from('items')
        .update({ google_event_id: googleEventId })
        .eq('id', item.id)
      if (updateError) {
        console.error('[crearItem] Error al guardar google_event_id:', updateError.message)
      }
      item.google_event_id = googleEventId
    }
  }

  revalidatePath('/inbox')
  revalidatePath('/hoy')
  revalidatePath('/calendario')
  return item
}
export async function actualizarItem(id: string, data: Partial<Item>) {
  if (!isSupabaseConfigured()) return { ...ITEMS_DEMO[0], ...data }
  const supabase = await createClient()

  // Recuperar el item antes de actualizar para comparar los cambios de fecha y el ID de Google
  const { data: itemAntes } = await supabase
    .from('items')
    .select('*')
    .eq('id', id)
    .single()

  const tipo = data.tipo ?? itemAntes?.tipo ?? 'tarea'
  let fecha_limite: string | null | undefined = data.fecha_limite
  let fecha_evento: string | null | undefined = data.fecha_evento

  const esNullOEmpty = (val: any) => val === null || val === '';

  if (tipo === 'evento') {
    if (
      (data.fecha_limite !== undefined && esNullOEmpty(data.fecha_limite)) || 
      (data.fecha_evento !== undefined && esNullOEmpty(data.fecha_evento))
    ) {
      fecha_evento = null
      fecha_limite = null
    } else {
      const fechaFinal = data.fecha_evento || data.fecha_limite || itemAntes?.fecha_evento || itemAntes?.fecha_limite
      if (fechaFinal) {
        fecha_evento = fechaFinal
        fecha_limite = null
      }
    }
  } else {
    if (
      (data.fecha_limite !== undefined && esNullOEmpty(data.fecha_limite)) || 
      (data.fecha_evento !== undefined && esNullOEmpty(data.fecha_evento))
    ) {
      fecha_evento = null
      fecha_limite = null
    } else {
      const fechaFinal = data.fecha_limite || data.fecha_evento || itemAntes?.fecha_limite || itemAntes?.fecha_evento
      if (fechaFinal) {
        fecha_limite = fechaFinal
        fecha_evento = null
      }
    }
  }

  const cleanData = {
    ...data,
    fecha_limite,
    fecha_evento
  }

  const { data: item, error } = await supabase
    .from('items')
    .update(cleanData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Sincronizar cambios en Google Calendar
  if (itemAntes) {
    const { crearEventoGoogle, actualizarEventoGoogle, eliminarEventoGoogle } = await import('@/lib/googleCalendar')
    const tieneFechaAhora = item.fecha_evento || item.fecha_limite
    const teniaFechaAntes = itemAntes.fecha_evento || itemAntes.fecha_limite
    const googleEventId = itemAntes.google_event_id || item.google_event_id

    if (tieneFechaAhora) {
      if (googleEventId) {
        // Ya existía en Google, lo actualizamos
        await actualizarEventoGoogle(item as Item, googleEventId)
      } else {
        // Se le asignó fecha ahora, lo creamos
        const newGoogleEventId = await crearEventoGoogle(item as Item)
        if (newGoogleEventId) {
          const { error: updateError } = await supabase
            .from('items')
            .update({ google_event_id: newGoogleEventId })
            .eq('id', item.id)
          if (updateError) {
            console.error('[actualizarItem] Error al guardar google_event_id:', updateError.message)
          }
          item.google_event_id = newGoogleEventId
        }
      }
    } else if (teniaFechaAntes && googleEventId) {
      // Tenía fecha pero se la quitaron, lo eliminamos de Google Calendar
      await eliminarEventoGoogle(googleEventId)
      const { error: updateError } = await supabase
        .from('items')
        .update({ google_event_id: null })
        .eq('id', item.id)
      if (updateError) {
        console.error('[actualizarItem] Error al eliminar google_event_id:', updateError.message)
      }
      item.google_event_id = null
    }
  }

  revalidatePath('/inbox')
  revalidatePath('/hoy')
  revalidatePath('/tareas')
  revalidatePath('/ideas')
  revalidatePath('/notas')
  revalidatePath('/calendario')
  revalidatePath('/proyectos')
  revalidatePath('/revision-semanal')
  return item
}

export async function archivarItem(id: string) {
  return actualizarItem(id, { estado: 'archivado' })
}

export async function marcarHecho(id: string) {
  return actualizarItem(id, { estado: 'hecho' })
}

export async function eliminarItem(id: string) {
  if (!isSupabaseConfigured()) return
  const supabase = await createClient()

  // Recuperar el item antes de eliminar para obtener el ID de Google Calendar
  const { data: item } = await supabase
    .from('items')
    .select('google_event_id')
    .eq('id', id)
    .single()

  if (item?.google_event_id) {
    const { eliminarEventoGoogle } = await import('@/lib/googleCalendar')
    await eliminarEventoGoogle(item.google_event_id)
  }

  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/inbox')
  revalidatePath('/hoy')
  revalidatePath('/tareas')
  revalidatePath('/ideas')
  revalidatePath('/notas')
  revalidatePath('/calendario')
  revalidatePath('/proyectos')
  revalidatePath('/revision-semanal')
}

export async function procesarItemInbox(
  id: string,
  datos: {
    tipo: ItemTipo
    prioridad: ItemPrioridad
    proyecto_id?: string
    etiquetas?: string[]
    fecha_limite?: string
    descripcion?: string
  }
) {
  return actualizarItem(id, { ...datos, estado: 'activo' })
}

export async function clasificarItemHeuristico(texto: string) {
  // Import dinámico para no cargar chrono-node en el módulo servidor al importar items.ts
  const { clasificarItem } = await import('@/lib/ai/classify')
  return clasificarItem(texto)
}

export async function buscarItems(query: string) {
  if (!isSupabaseConfigured()) return ITEMS_DEMO.filter(i => i.titulo.toLowerCase().includes(query.toLowerCase()))
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('items')
    .select('*, proyecto:proyectos(id, nombre, color)')
    .ilike('titulo', `%${query}%`)
    .not('estado', 'eq', 'archivado')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw new Error(error.message)
  return data as Item[]
}

export async function getMiDiaItems(fecha: string) {
  if (!isSupabaseConfigured()) {
    return ITEMS_DEMO.filter(i => (i.metadata as any)?.mi_dia_fecha === fecha)
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('items')
    .select('*, proyecto:proyectos(id, nombre, color)')
    .eq('metadata->>mi_dia_fecha', fecha)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getMiDiaItems]', error.message)
    return []
  }
  return data as Item[]
}

export async function agregarAMiDia(id: string, fecha: string) {
  if (!isSupabaseConfigured()) return

  const supabase = await createClient()

  // Obtener item antes para conservar el metadata existente
  const { data: itemAntes, error: fetchError } = await supabase
    .from('items')
    .select('metadata, estado')
    .eq('id', id)
    .single()

  if (fetchError) throw new Error(fetchError.message)

  const metadataActual = itemAntes?.metadata || {}
  const metadataNuevo = { ...metadataActual, mi_dia_fecha: fecha }

  const updateData: any = { metadata: metadataNuevo }
  if (itemAntes?.estado === 'sin_procesar') {
    updateData.estado = 'activo'
  }

  const { error } = await supabase
    .from('items')
    .update(updateData)
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/inbox')
  revalidatePath('/hoy')
  revalidatePath('/tareas')
  revalidatePath('/mi-dia')
}

export async function quitarDeMiDia(id: string) {
  if (!isSupabaseConfigured()) return

  const supabase = await createClient()

  // Obtener item antes para conservar el metadata existente
  const { data: itemAntes, error: fetchError } = await supabase
    .from('items')
    .select('metadata')
    .eq('id', id)
    .single()

  if (fetchError) throw new Error(fetchError.message)

  const metadataActual = { ...(itemAntes?.metadata || {}) }
  delete metadataActual.mi_dia_fecha

  const { error } = await supabase
    .from('items')
    .update({ metadata: metadataActual })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/inbox')
  revalidatePath('/hoy')
  revalidatePath('/tareas')
  revalidatePath('/mi-dia')
}

