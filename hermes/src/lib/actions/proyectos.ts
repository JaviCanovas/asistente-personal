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

export async function getProyectos() {
  if (!isSupabaseConfigured()) return PROYECTOS_DEMO
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('proyectos')
    .select('*')
    .not('estado', 'eq', 'archivado')
    .order('nombre')
  if (error) {
    console.error('[getProyectos]', error.message)
    return PROYECTOS_DEMO
  }
  return data as Proyecto[]
}

export async function getProyecto(id: string) {
  if (!isSupabaseConfigured()) return PROYECTOS_DEMO.find(p => p.id === id) ?? PROYECTOS_DEMO[0]
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('proyectos')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data as Proyecto
}

export async function crearProyecto(data: {
  nombre: string
  descripcion?: string
  color?: string
  fecha_inicio?: string
  fecha_fin?: string
}) {
  if (!isSupabaseConfigured()) return { ...PROYECTOS_DEMO[0], ...data, id: Date.now().toString() }
  const supabase = await createClient()
  const { data: proyecto, error } = await supabase
    .from('proyectos')
    .insert(data)
    .select()
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/proyectos')
  return proyecto as Proyecto
}

export async function actualizarProyecto(id: string, data: Partial<Proyecto>) {
  if (!isSupabaseConfigured()) return { ...PROYECTOS_DEMO[0], ...data }
  const supabase = await createClient()
  const { data: proyecto, error } = await supabase
    .from('proyectos')
    .update(data)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/proyectos')
  return proyecto as Proyecto
}

export async function archivarProyecto(id: string) {
  return actualizarProyecto(id, { estado: 'archivado' })
}
