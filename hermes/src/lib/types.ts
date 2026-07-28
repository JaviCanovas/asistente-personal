// ============================================================
// HERMES — Tipos TypeScript que reflejan el esquema de Supabase
// ============================================================

export type ItemTipo = 'tarea' | 'evento' | 'idea' | 'nota' | 'recordatorio'
export type ItemEstado = 'sin_procesar' | 'activo' | 'hecho' | 'archivado'
export type ItemPrioridad = 'baja' | 'media' | 'alta' | 'urgente'
export type ProyectoEstado = 'activo' | 'pausado' | 'completado' | 'archivado'

export interface Proyecto {
  id: string
  nombre: string
  descripcion?: string
  color: string
  estado: ProyectoEstado
  fecha_inicio?: string
  fecha_fin?: string
  created_at: string
  updated_at: string
}

export interface Item {
  id: string
  tipo: ItemTipo
  titulo: string
  descripcion?: string
  estado: ItemEstado
  prioridad: ItemPrioridad
  fecha_limite?: string
  fecha_evento?: string
  hora_inicio?: string
  hora_fin?: string
  proyecto_id?: string
  etiquetas: string[]
  origen: string
  metadata: Record<string, unknown>
  razon_prioridad?: string
  google_event_id?: string | null
  created_at: string
  updated_at: string
  // JOIN con proyectos (opcional)
  proyecto?: Proyecto
}

export interface RutinaGym {
  id: string
  fecha: string
  ejercicio: string
  series: number
  repeticiones?: number
  peso_kg?: number
  duracion_min?: number
  notas?: string
  created_at: string
}

export interface EjercicioPlantilla {
  nombre: string
  series: number
  repeticiones: string
  peso_kg: number
  descanso?: string
  notas?: string
}

export interface PlantillaGym {
  id: string
  nombre_dia: string
  orden: number
  ejercicios: EjercicioPlantilla[]
}
// ============================================================
// Tipos para la lógica heurística
// ============================================================

export interface ClasificacionSugerida {
  tipo: ItemTipo
  proyecto_sugerido?: string
  etiquetas: string[]
  fecha_limite?: string
  prioridad: ItemPrioridad
  razon: string
  confianza: number // 0-1
}

export interface ItemPriorizado {
  item: Item
  puntuacion: number
  razon: string
}

export interface BloqueLibre {
  inicio: Date
  fin: Date
  duracion_min: number
  adecuado_para_trabajo_profundo: boolean
}

export interface ResumenSemanal {
  semana_inicio: string
  semana_fin: string
  completados: Item[]
  pendientes: Item[]
  sobrecarga_detectada: boolean
  propuesta_reorganizacion: string[]
  generado_en: string
}
