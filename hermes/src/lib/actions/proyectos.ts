'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Proyecto } from '@/lib/types'

// Guard: si las env vars son placeholders, devolver datos vacíos
function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  return url.startsWith('https://') && !url.includes('placeholder')
}

const PROYECTOS_DEMO: Proyecto[] = [
  { id: 'demo-1', nombre: 'Personal', descripcion: 'Proyectos personales', color: '#6366f1', estado: 'activo', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'demo-2', nombre: 'Trabajo', descripcion: 'Todo lo relacionado con el trabajo', color: '#f59e0b', estado: 'activo', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'demo-3', nombre: 'Salud', descripcion: 'Gym, nutrición y bienestar', color: '#10b981', estado: 'activo', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
]

function parseParentFromDesc(p: any): Proyecto {
  let parent_id = p.parent_id || null
  let descripcion = p.descripcion || undefined
  if (descripcion && typeof descripcion === 'string' && descripcion.startsWith('__parent:')) {
    const endIdx = descripcion.indexOf('__', 9)
    if (endIdx !== -1) {
      parent_id = descripcion.slice(9, endIdx)
      descripcion = descripcion.slice(endIdx + 2) || undefined
    }
  }
  return {
    ...p,
    parent_id,
    descripcion,
  }
}

export async function getProyectos() {
  if (!isSupabaseConfigured()) return PROYECTOS_DEMO.map(parseParentFromDesc)
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('proyectos')
    .select('*')
    .not('estado', 'eq', 'archivado')
    .order('nombre')
  if (error) {
    console.error('[getProyectos]', error.message)
    return PROYECTOS_DEMO.map(parseParentFromDesc)
  }
  return (data || []).map(parseParentFromDesc)
}

export async function getProyecto(id: string) {
  if (!isSupabaseConfigured()) return parseParentFromDesc(PROYECTOS_DEMO.find(p => p.id === id) ?? PROYECTOS_DEMO[0])
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('proyectos')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return parseParentFromDesc(data)
}

export async function crearProyecto(data: {
  nombre: string
  descripcion?: string
  color?: string
  fecha_inicio?: string
  fecha_fin?: string
  parent_id?: string | null
}) {
  const { parent_id, descripcion, ...rest } = data
  const finalDesc = parent_id ? `__parent:${parent_id}__${descripcion || ''}` : descripcion

  if (!isSupabaseConfigured()) {
    const demo = { ...PROYECTOS_DEMO[0], ...rest, descripcion, parent_id, id: Date.now().toString() }
    return demo
  }
  const supabase = await createClient()
  const { data: proyecto, error } = await supabase
    .from('proyectos')
    .insert({
      ...rest,
      descripcion: finalDesc,
      estado: 'activo',
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/proyectos')
  revalidatePath('/tareas')
  return parseParentFromDesc(proyecto)
}

export async function actualizarProyecto(id: string, data: Partial<Proyecto>) {
  const { parent_id, descripcion, ...rest } = data
  const updatePayload: any = { ...rest }
  if (parent_id !== undefined || descripcion !== undefined) {
    if (parent_id) {
      updatePayload.descripcion = `__parent:${parent_id}__${descripcion || ''}`
    } else if (descripcion !== undefined) {
      updatePayload.descripcion = descripcion
    }
  }

  if (!isSupabaseConfigured()) return { ...PROYECTOS_DEMO[0], ...data }
  const supabase = await createClient()
  const { data: proyecto, error } = await supabase
    .from('proyectos')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/proyectos')
  revalidatePath('/tareas')
  return proyecto as Proyecto
}

export async function archivarProyecto(id: string) {
  return actualizarProyecto(id, { estado: 'archivado' })
}

export async function eliminarProyecto(id: string) {
  if (!isSupabaseConfigured()) return
  const supabase = await createClient()
  const { error } = await supabase
    .from('proyectos')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/tareas')
  revalidatePath('/proyectos')
}
