'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  Calendar,
  Clock,
  Pencil,
  RotateCcw,
  Check,
  X,
  ExternalLink,
  GraduationCap,
  Building2,
  Dumbbell,
  Coffee,
  Utensils,
  BookOpen,
  Sparkles,
  AlertCircle,
  Tag,
  CheckCircle2,
  CalendarDays,
  Flame,
} from 'lucide-react'
import type { Item } from '@/lib/types'
import { useToast } from '@/components/ui/Toast'

// ============================================================
// PALETA DE COLORES OFICIAL SOLICITADA
// - Gimnasio: verde teal (#5DCAA5)
// - Desayuno: ámbar (#F2A623)
// - Oficina UCAM: azul (#85B7EB)
// - Comida/descanso: gris (#B4B2A9)
// - Máster Big Data: rosa/coral (#ED93B1)
// - Sports Data Campus / libre: morado (#AFA9EC)
// ============================================================

export type ScheduleCategoryKey =
  | 'gym'
  | 'desayuno'
  | 'oficina'
  | 'comida'
  | 'master'
  | 'libre'

export interface CategoryStyle {
  label: string
  dot: string
  bg: string
  border: string
  text: string
  subtext: string
  badgeBg: string
  description: string
}

export const CATEGORIES: Record<ScheduleCategoryKey, CategoryStyle> = {
  gym: {
    label: 'Gimnasio',
    dot: '#5DCAA5',
    bg: '#EAF7F2',
    border: '#5DCAA5',
    text: '#0A4D37',
    subtext: '#13674D',
    badgeBg: 'rgba(93, 202, 165, 0.22)',
    description: 'Entrenamientos en Fitness Park Atalayas',
  },
  desayuno: {
    label: 'Desayuno',
    dot: '#F2A623',
    bg: '#FEF7EB',
    border: '#F2A623',
    text: '#7A3F00',
    subtext: '#995405',
    badgeBg: 'rgba(242, 166, 35, 0.22)',
    description: 'Desayunos completos, snacks y nutrición',
  },
  oficina: {
    label: 'Oficina UCAM',
    dot: '#85B7EB',
    bg: '#EEF6FC',
    border: '#85B7EB',
    text: '#0F3C6D',
    subtext: '#1A528F',
    badgeBg: 'rgba(133, 183, 235, 0.22)',
    description: 'UCAM CF · La Condomina y desplazamientos',
  },
  comida: {
    label: 'Comida / descanso',
    dot: '#B4B2A9',
    bg: '#F5F5F3',
    border: '#B4B2A9',
    text: '#33322E',
    subtext: '#4F4D47',
    badgeBg: 'rgba(180, 178, 169, 0.22)',
    description: 'Comida, pausas y recuperación',
  },
  master: {
    label: 'Máster Big Data',
    dot: '#ED93B1',
    bg: '#FDF2F6',
    border: '#ED93B1',
    text: '#681831',
    subtext: '#882444',
    badgeBg: 'rgba(237, 147, 177, 0.22)',
    description: 'Clases teóricas y prácticas en la UMU',
  },
  libre: {
    label: 'Sports Data Campus / libre',
    dot: '#AFA9EC',
    bg: '#F4F3FC',
    border: '#AFA9EC',
    text: '#332970',
    subtext: '#493B98',
    badgeBg: 'rgba(175, 169, 236, 0.22)',
    description: 'Estudio SDC, proyectos y tiempo libre',
  },
}

// Normalizador de categorías para compatibilidad hacia atrás
function normalizeCategory(cat: string): ScheduleCategoryKey {
  if (cat === 'gimnasio') return 'gym'
  if (cat === 'descanso') return 'comida'
  if (cat === 'sports') return 'libre'
  if (cat === 'trayecto') return 'oficina'
  if (cat in CATEGORIES) return cat as ScheduleCategoryKey
  return 'comida'
}

export interface CellData {
  id: string
  title: string
  subtitle?: string
  category: ScheduleCategoryKey
  keywords?: string[]
}

export interface ScheduleRow {
  id: string
  timeLabel: string
  timeSublabel?: string
  days: {
    lunes?: CellData
    martes?: CellData
    miercoles?: CellData
    jueves?: CellData
    viernes?: CellData
  }
}

// ============================================================
// DATOS INICIALES — CUATRIMESTRE 1 (Máster Big Data, UMU)
// ============================================================

const INITIAL_ROWS: ScheduleRow[] = [
  {
    id: 'despertar',
    timeLabel: 'Despertar',
    timeSublabel: 'Inicio del día',
    days: {
      lunes: {
        id: 'desp_l',
        title: 'Despertar 8:00',
        subtitle: 'sin gym',
        category: 'desayuno',
      },
      martes: {
        id: 'desp_m',
        title: 'Despertar 7:15',
        subtitle: 'gym',
        category: 'gym',
      },
      miercoles: {
        id: 'desp_x',
        title: 'Despertar 8:00',
        subtitle: 'sin gym',
        category: 'desayuno',
      },
      jueves: {
        id: 'desp_j',
        title: 'Despertar 7:15',
        subtitle: 'gym',
        category: 'gym',
      },
      viernes: {
        id: 'desp_v',
        title: 'Despertar 7:15',
        subtitle: 'gym',
        category: 'gym',
      },
    },
  },
  {
    id: 'snack',
    timeLabel: '7:15 – 7:30',
    timeSublabel: 'Pre-entreno',
    days: {
      martes: {
        id: 'snk_m',
        title: 'Snack rápido',
        subtitle: 'café + fruta',
        category: 'desayuno',
      },
      jueves: {
        id: 'snk_j',
        title: 'Snack rápido',
        subtitle: 'café + fruta',
        category: 'desayuno',
      },
      viernes: {
        id: 'snk_v',
        title: 'Snack rápido',
        subtitle: 'café + fruta',
        category: 'desayuno',
      },
    },
  },
  {
    id: 'bloque_745',
    timeLabel: '7:45 – 9:00',
    timeSublabel: 'Gym / Desayuno',
    days: {
      lunes: {
        id: 'des_l',
        title: 'Desayuno completo',
        subtitle: 'Inicio de semana con calma',
        category: 'desayuno',
      },
      martes: {
        id: 'gym_m',
        title: 'Torso Fuerza',
        subtitle: 'Fitness Park Atalayas',
        category: 'gym',
        keywords: ['gym', 'torso', 'fuerza', 'entreno'],
      },
      miercoles: {
        id: 'des_x',
        title: 'Desayuno completo',
        subtitle: '+ tareas variadas',
        category: 'desayuno',
      },
      jueves: {
        id: 'gym_j',
        title: 'Empuje Hipertrofia',
        subtitle: 'Fitness Park Atalayas',
        category: 'gym',
        keywords: ['gym', 'empuje', 'hipertrofia', 'entreno'],
      },
      viernes: {
        id: 'gym_v',
        title: 'Tirón Espalda',
        subtitle: 'Fitness Park Atalayas',
        category: 'gym',
        keywords: ['gym', 'tirón', 'tiron', 'espalda', 'entreno'],
      },
    },
  },
  {
    id: 'post_gym',
    timeLabel: '9:00 – 9:20',
    timeSublabel: 'Post-entreno',
    days: {
      martes: {
        id: 'ducha_m',
        title: 'Ducha + desayuno',
        subtitle: 'para llevar',
        category: 'desayuno',
      },
      jueves: {
        id: 'ducha_j',
        title: 'Ducha + desayuno',
        subtitle: 'para llevar',
        category: 'desayuno',
      },
      viernes: {
        id: 'ducha_v',
        title: 'Ducha + desayuno',
        subtitle: 'para llevar',
        category: 'desayuno',
      },
    },
  },
  {
    id: 'trayecto',
    timeLabel: 'Trayecto',
    timeSublabel: '~9:20 – 10:00',
    days: {
      lunes: {
        id: 'tray_l',
        title: 'Trayecto a oficina',
        subtitle: 'desde casa · salida ~8:50',
        category: 'oficina',
        keywords: ['ucam', 'oficina'],
      },
      martes: {
        id: 'tray_m',
        title: 'Trayecto a oficina',
        subtitle: 'Atalayas → La Condomina, ~10 min',
        category: 'oficina',
        keywords: ['ucam', 'oficina'],
      },
      jueves: {
        id: 'tray_j',
        title: 'Trayecto a oficina',
        subtitle: 'Atalayas → La Condomina, ~10 min',
        category: 'oficina',
        keywords: ['ucam', 'oficina'],
      },
    },
  },
  {
    id: 'oficina_manana',
    timeLabel: '10:00 – 13:00',
    timeSublabel: 'Oficina / Mañana',
    days: {
      lunes: {
        id: 'ofi_l',
        title: 'Oficina UCAM CF',
        subtitle: '9:15 – 13:15',
        category: 'oficina',
        keywords: ['ucam', 'oficina', 'scouting'],
      },
      martes: {
        id: 'ofi_m',
        title: 'Oficina UCAM CF',
        subtitle: '10:00 – 13:00',
        category: 'oficina',
        keywords: ['ucam', 'oficina', 'scouting'],
      },
      miercoles: {
        id: 'ofi_x',
        title: 'Mañana libre',
        subtitle: 'sin oficina',
        category: 'libre',
      },
      jueves: {
        id: 'ofi_j',
        title: 'Oficina UCAM CF',
        subtitle: '10:00 – 13:00',
        category: 'oficina',
        keywords: ['ucam', 'oficina', 'scouting'],
      },
      viernes: {
        id: 'ofi_v',
        title: 'Día libre',
        subtitle: 'sin oficina',
        category: 'libre',
      },
    },
  },
  {
    id: 'comida',
    timeLabel: 'Comida',
    timeSublabel: '13:00 – 16:00',
    days: {
      lunes: {
        id: 'com_l',
        title: 'Comida + descanso',
        subtitle: 'desde 13:15',
        category: 'comida',
      },
      martes: {
        id: 'com_m',
        title: 'Comida + descanso',
        subtitle: 'desde 13:00',
        category: 'comida',
      },
      miercoles: {
        id: 'com_x',
        title: 'Comida + descanso',
        subtitle: 'mediodía con calma',
        category: 'comida',
      },
      jueves: {
        id: 'com_j',
        title: 'Comida + descanso',
        subtitle: 'desde 13:00',
        category: 'comida',
      },
      viernes: {
        id: 'com_v',
        title: 'Comida + descanso',
        subtitle: 'mediodía con calma',
        category: 'comida',
      },
    },
  },
  {
    id: 'tarde_master',
    timeLabel: 'Tarde',
    timeSublabel: '~16:00 – 17:30',
    days: {
      lunes: {
        id: 'tar1_l',
        title: 'Visualización de Datos (T)',
        subtitle: '~16:00–17:30 · última clase: 2 nov',
        category: 'master',
        keywords: ['visualización', 'visualizacion', 'vd', 'datos'],
      },
      martes: {
        id: 'tar1_m',
        title: 'Aprendizaje Estadístico (T)',
        subtitle: '~16:00–17:30',
        category: 'master',
        keywords: ['aprendizaje', 'estadístico', 'estadistico', 'estadística', 'estadistica', 'ae'],
      },
      miercoles: {
        id: 'tar1_x',
        title: 'Oficina UCAM CF',
        subtitle: '15:30–18:30 · sin clase',
        category: 'oficina',
        keywords: ['ucam', 'oficina', 'scouting'],
      },
      jueves: {
        id: 'tar1_j',
        title: 'Bases de Datos a Gran Escala',
        subtitle: '~16:00–18:00 · última clase: 3 dic',
        category: 'master',
        keywords: ['bases de datos', 'bdge', 'gran escala', 'big data'],
      },
      viernes: {
        id: 'tar1_v',
        title: 'Aprendizaje Estadístico (P) + Visualización de Datos (P)',
        subtitle: '16:00–20:00 · último viernes con clase: 30 oct',
        category: 'master',
        keywords: ['aprendizaje', 'estadístico', 'visualización', 'visualizacion', 'prácticas', 'practicas'],
      },
    },
  },
  {
    id: 'tarde_tarde',
    timeLabel: '17:30 – 20:00',
    timeSublabel: 'Sesión final',
    days: {
      lunes: {
        id: 'tar2_l',
        title: 'Sports Data Campus',
        subtitle: 'estudio / directos',
        category: 'libre',
        keywords: ['sports data', 'sdc', 'campus'],
      },
      martes: {
        id: 'tar2_m',
        title: 'Sports Data Campus',
        subtitle: 'estudio / directos',
        category: 'libre',
        keywords: ['sports data', 'sdc', 'campus'],
      },
      miercoles: {
        id: 'tar2_x',
        title: 'En oficina hasta las 18:30',
        subtitle: 'después libre',
        category: 'oficina',
        keywords: ['ucam', 'oficina'],
      },
      jueves: {
        id: 'tar2_j',
        title: 'En clase máster (continúa)',
        subtitle: 'continúa la sesión hasta las 18:00 · después libre / SDC',
        category: 'master',
        keywords: ['bases de datos', 'bdge', 'sports data'],
      },
      viernes: {
        id: 'tar2_v',
        title: 'En clase máster (continúa)',
        subtitle: 'continúa la sesión (hasta el 30 oct)',
        category: 'master',
        keywords: ['aprendizaje', 'visualización', 'master'],
      },
    },
  },
]

const INITIAL_FINDE: CellData = {
  id: 'finde',
  title: 'Scouting / partidos (variable, prioridad sobre lo demás)',
  subtitle: 'hueco largo disponible para Sports Data Campus',
  category: 'libre',
  keywords: ['scouting', 'partido', 'partidos', 'sports data'],
}

const STORAGE_KEY = 'hermes_horario_c1_v1'

const DAYS_HEADER = [
  { key: 'lunes', label: 'Lunes', short: 'LUN', dayNum: 1 },
  { key: 'martes', label: 'Martes', short: 'MAR', dayNum: 2 },
  { key: 'miercoles', label: 'Miércoles', short: 'MIÉ', dayNum: 3 },
  { key: 'jueves', label: 'Jueves', short: 'JUE', dayNum: 4 },
  { key: 'viernes', label: 'Viernes', short: 'VIE', dayNum: 5 },
]

interface HorarioSemanalProps {
  initialTasks?: Item[]
}

export default function HorarioSemanal({ initialTasks = [] }: HorarioSemanalProps) {
  const { showToast } = useToast()
  const [rows, setRows] = useState<ScheduleRow[]>(INITIAL_ROWS)
  const [finde, setFinde] = useState<CellData>(INITIAL_FINDE)
  const [hasCustomizations, setHasCustomizations] = useState(false)
  const [currentDayIndex, setCurrentDayIndex] = useState<number>(-1)
  const [activeMobileTab, setActiveMobileTab] = useState<string>('todos')

  // Estado para modal de edición
  const [editingCell, setEditingCell] = useState<{
    id: string
    dayKey?: string
    rowId?: string
    title: string
    subtitle: string
    category: ScheduleCategoryKey
  } | null>(null)

  // Estado para ver tareas vinculadas
  const [taskDetailModal, setTaskDetailModal] = useState<{
    blockTitle: string
    tasks: Item[]
  } | null>(null)

  // Cargar estado guardado y detectar el día actual
  useEffect(() => {
    // 0 = Domingo, 1 = Lunes, ..., 5 = Viernes, 6 = Sábado
    const today = new Date().getDay()
    if (today >= 1 && today <= 5) {
      setCurrentDayIndex(today - 1)
    } else {
      // Fin de semana
      setCurrentDayIndex(today === 6 ? 5 : 6)
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.rows && Array.isArray(parsed.rows)) {
          // Normalizar categorías para evitar errores
          const normalizedRows = parsed.rows.map((row: ScheduleRow) => {
            const newDays = { ...row.days }
            Object.keys(newDays).forEach((k) => {
              const cell = newDays[k as keyof typeof newDays]
              if (cell) {
                newDays[k as keyof typeof newDays] = {
                  ...cell,
                  category: normalizeCategory(cell.category),
                }
              }
            })
            return { ...row, days: newDays }
          })
          setRows(normalizedRows)
        }
        if (parsed.finde) {
          setFinde({
            ...parsed.finde,
            category: normalizeCategory(parsed.finde.category),
          })
        }
        setHasCustomizations(true)
      }
    } catch (e) {
      console.error('Error cargando horario desde localStorage:', e)
    }
  }, [])

  // Guardar en localStorage
  const saveToStorage = (newRows: ScheduleRow[], newFinde: CellData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ rows: newRows, finde: newFinde }))
      setHasCustomizations(true)
    } catch (e) {
      console.error('Error guardando horario:', e)
    }
  }

  // Restaurar valores oficiales
  const handleReset = () => {
    if (window.confirm('¿Deseas restaurar el horario oficial del Cuatrimestre 1?')) {
      setRows(INITIAL_ROWS)
      setFinde(INITIAL_FINDE)
      localStorage.removeItem(STORAGE_KEY)
      setHasCustomizations(false)
      showToast({
        message: 'Horario oficial del Cuatrimestre 1 restaurado.',
        type: 'success',
      })
    }
  }

  // Abrir editor
  const handleStartEdit = (cell: CellData, dayKey?: string, rowId?: string) => {
    setEditingCell({
      id: cell.id,
      dayKey,
      rowId,
      title: cell.title,
      subtitle: cell.subtitle || '',
      category: cell.category,
    })
  }

  // Guardar edición
  const handleSaveEdit = () => {
    if (!editingCell) return

    if (editingCell.id === 'finde') {
      const updatedFinde: CellData = {
        ...finde,
        title: editingCell.title.trim() || 'Scouting / variable',
        subtitle: editingCell.subtitle.trim(),
        category: editingCell.category,
      }
      setFinde(updatedFinde)
      saveToStorage(rows, updatedFinde)
    } else {
      const updatedRows = rows.map((row) => {
        const newDays = { ...row.days }
        ;(Object.keys(newDays) as (keyof typeof newDays)[]).forEach((dayKey) => {
          const cell = newDays[dayKey]
          if (cell && cell.id === editingCell.id) {
            newDays[dayKey] = {
              ...cell,
              title: editingCell.title.trim() || 'Bloque horario',
              subtitle: editingCell.subtitle.trim(),
              category: editingCell.category,
            }
          }
        })
        return { ...row, days: newDays }
      })
      setRows(updatedRows)
      saveToStorage(updatedRows, finde)
    }

    setEditingCell(null)
    showToast({
      message: 'Bloque de horario actualizado correctamente.',
      type: 'success',
    })
  }

  // Vaciar contenido de la celda
  const handleClearCell = () => {
    if (!editingCell || editingCell.id === 'finde') return

    const updatedRows = rows.map((row) => {
      const newDays = { ...row.days }
      ;(Object.keys(newDays) as (keyof typeof newDays)[]).forEach((dayKey) => {
        const cell = newDays[dayKey]
        if (cell && cell.id === editingCell.id) {
          delete newDays[dayKey]
        }
      })
      return { ...row, days: newDays }
    })

    setRows(updatedRows)
    saveToStorage(updatedRows, finde)
    setEditingCell(null)
    showToast({
      message: 'Bloque vaciado.',
      type: 'info',
    })
  }

  // ============================================================
  // VINCULACIÓN CON TAREAS ACTIVAS DE HERMES
  // Detecta si hay entregas o tareas asociadas a una asignatura
  // ============================================================
  const matchingTasksMap = useMemo(() => {
    const map = new Map<string, Item[]>()
    if (!initialTasks || initialTasks.length === 0) return map

    const activeTasks = initialTasks.filter(
      (t) => t.estado !== 'hecho' && t.estado !== 'archivado'
    )

    const checkMatch = (cell: CellData): Item[] => {
      const titleNorm = cell.title.toLowerCase()
      const subNorm = (cell.subtitle || '').toLowerCase()
      const keywords = (cell.keywords || []).map((k) => k.toLowerCase())

      return activeTasks.filter((task) => {
        const tTitle = task.titulo.toLowerCase()
        const tDesc = (task.descripcion || '').toLowerCase()
        const tTags = (task.etiquetas || []).map((t) => t.toLowerCase())
        const pName = (task.proyecto?.nombre || '').toLowerCase()

        // Coincidencia por palabra clave explícita
        const kwMatch = keywords.some(
          (kw) =>
            tTitle.includes(kw) ||
            tDesc.includes(kw) ||
            tTags.some((t) => t.includes(kw)) ||
            pName.includes(kw)
        )
        if (kwMatch) return true

        // Coincidencias por asignaturas específicas
        if (
          titleNorm.includes('visualización') &&
          (tTitle.includes('visualiz') ||
            pName.includes('visualiz') ||
            tTags.includes('vd'))
        ) {
          return true
        }

        if (
          titleNorm.includes('aprendizaje') &&
          (tTitle.includes('aprendiz') ||
            tTitle.includes('estadíst') ||
            pName.includes('estadíst') ||
            tTags.includes('ae'))
        ) {
          return true
        }

        if (
          titleNorm.includes('bases de datos') &&
          (tTitle.includes('bases de datos') ||
            tTitle.includes('bdge') ||
            pName.includes('bases de datos') ||
            tTags.includes('bdge'))
        ) {
          return true
        }

        if (
          titleNorm.includes('ucam') &&
          (tTitle.includes('ucam') || pName.includes('ucam') || tTitle.includes('scouting'))
        ) {
          return true
        }

        if (
          titleNorm.includes('sports data') &&
          (tTitle.includes('sports data') ||
            tTitle.includes('sdc') ||
            pName.includes('sports data'))
        ) {
          return true
        }

        if (
          cell.category === 'gym' &&
          (tTitle.includes('gym') || tTitle.includes('entreno') || tTags.includes('gym'))
        ) {
          return true
        }

        return false
      })
    }

    // Mapear cada celda existente
    rows.forEach((row) => {
      Object.values(row.days).forEach((cell) => {
        if (cell) {
          const matched = checkMatch(cell)
          if (matched.length > 0) {
            map.set(cell.id, matched)
          }
        }
      })
    })

    const matchedFinde = checkMatch(finde)
    if (matchedFinde.length > 0) {
      map.set(finde.id, matchedFinde)
    }

    return map
  }, [rows, finde, initialTasks])

  // Fecha de hoy formateada para cabecera
  const hoyFechaStr = useMemo(() => {
    const now = new Date()
    return now.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    })
  }, [])

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-fade-in pb-20">
      {/* ============================================================
          1. CABECERA HERO DE HERMES (Espaciosa, tipografía no comprimida)
          ============================================================ */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-white/8">
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/25">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              Cuatrimestre 1 · Curso 2026/2027
            </span>
            <span className="text-xs text-neutral-500">·</span>
            <span className="text-xs text-neutral-400 capitalize font-medium">
              {hoyFechaStr}
            </span>
            {currentDayIndex >= 0 && currentDayIndex <= 4 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Hoy es {DAYS_HEADER[currentDayIndex].label}
              </span>
            )}
            {(currentDayIndex === 5 || currentDayIndex === 6) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                Fin de semana activo
              </span>
            )}
          </div>

          <h1
            className="text-[30px] sm:text-[34px] font-bold text-neutral-100 flex items-center gap-3"
            style={{ letterSpacing: 0, lineHeight: 1.2 }}
          >
            <span>Horario Semanal</span>
            <span className="text-purple-400 font-normal">/</span>
            <span className="text-neutral-300 text-2xl sm:text-3xl font-medium">
              Cuatrimestre 1
            </span>
          </h1>

          <p className="text-sm text-neutral-400 max-w-3xl leading-relaxed">
            Planificación semanal integrada para Javier Cánovas · Máster Big Data (UMU),
            UCAM CF y Sports Data Campus. Vista tipo semana estándar (Lunes a Viernes).
          </p>
        </div>

        {/* Acciones superiores */}
        <div className="flex items-center gap-3 flex-wrap">
          {hasCustomizations && (
            <button
              onClick={handleReset}
              className="h-9 inline-flex items-center gap-2 px-3.5 rounded-xl border border-white/10 bg-neutral-900/80 hover:bg-neutral-800 text-xs font-semibold text-neutral-300 shadow-sm transition-all"
              title="Restaurar a los datos originales del Cuatrimestre 1"
            >
              <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
              <span>Restaurar horario oficial</span>
            </button>
          )}

          <Link
            href="/tareas"
            className="h-9 inline-flex items-center gap-2 px-4 rounded-xl border border-purple-500/30 bg-purple-600/15 hover:bg-purple-600/25 text-xs font-semibold text-purple-200 transition-all shadow-sm"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Ver Tareas vinculadas</span>
          </Link>
        </div>
      </header>

      {/* ============================================================
          2. LEYENDA CORPORATIVA CON LA PALETA OFICIAL
          Chips con el color exacto solicitado
          ============================================================ */}
      <section
        data-testid="card"
        className="card p-5 sm:p-6 rounded-2xl border border-white/8 bg-neutral-900/60 backdrop-blur-md shadow-lg"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-purple-400" />
            <h2
              className="text-xs font-bold text-neutral-300 uppercase tracking-wider"
              style={{ letterSpacing: '0.06em' }}
            >
              Código de color oficial por categoría
            </h2>
          </div>
          <span className="text-[11px] text-neutral-400">
            Esquema idéntico al documento PDF oficial
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {Object.entries(CATEGORIES).map(([key, style]) => (
            <div
              key={key}
              className="flex items-center gap-2.5 p-2.5 rounded-xl border transition-all"
              style={{
                backgroundColor: style.bg,
                borderColor: style.border,
                color: style.text,
              }}
            >
              <span
                className="w-3 h-3 rounded-full shrink-0 shadow-xs ring-2 ring-white/60"
                style={{ backgroundColor: style.dot }}
              />
              <div className="min-w-0">
                <p className="text-xs font-bold truncate leading-tight">{style.label}</p>
                <p className="text-[10px] font-semibold opacity-75 truncate">{style.dot}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================
          3. TABLA / GRID SEMANAL TIPO MATRIZ
          Amplio, con aire, tipografía elegante y sin aspecto precario
          ============================================================ */}
      <section
        data-testid="card"
        className="card p-5 sm:p-6 rounded-2xl border border-white/10 bg-neutral-900/50 backdrop-blur-xl shadow-2xl space-y-4"
      >
        {/* Cabecera interna del cuadrante */}
        <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#0D4479] to-[#082949] text-amber-400 flex items-center justify-center font-bold text-base sm:text-lg tracking-wider shadow-lg shrink-0 border border-amber-400/30">
              JC
            </div>
            <div className="min-w-0">
              <h2
                className="text-base sm:text-lg font-bold text-neutral-100 flex items-center gap-2 flex-wrap"
                style={{ letterSpacing: 0 }}
              >
                <span>Semana Tipo — Lunes a Viernes</span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/10 text-neutral-300 font-mono font-medium hidden sm:inline-block">
                  {rows.length} franjas
                </span>
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                {activeMobileTab === 'todos'
                  ? 'Vista completa de la semana · Clic en bloque para editar'
                  : `Filtrado por: ${activeMobileTab.toUpperCase()} · Clic en bloque para editar`}
              </p>
            </div>
          </div>

          {/* Selector de días en vista móvil (< 768px) para visualización cómoda */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-900/90 border border-white/8 md:hidden overflow-x-auto shrink-0">
            <button
              onClick={() => setActiveMobileTab('todos')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeMobileTab === 'todos'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            {DAYS_HEADER.map((d, idx) => {
              const isToday = currentDayIndex === idx
              const isActive = activeMobileTab === d.key
              return (
                <button
                  key={d.key}
                  onClick={() => setActiveMobileTab(d.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-xs'
                      : isToday
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <span>{d.short}</span>
                  {isToday && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                </button>
              )
            })}
            <button
              onClick={() => setActiveMobileTab('finde')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeMobileTab === 'finde'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Finde
            </button>
          </div>
        </div>

        {/* Tabla responsive con scroll horizontal suave */}
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-neutral-950/60 p-2 sm:p-3">
          <table
            className={`w-full text-left border-collapse transition-all ${
              activeMobileTab === 'todos' ? 'min-w-[780px] md:min-w-[840px]' : 'w-full'
            }`}
          >
            {/* CABECERA DE DÍAS */}
            <thead>
              <tr className="border-b border-white/10">
                <th className="p-2 sm:p-3.5 w-24 sm:w-32 lg:w-36 text-center text-xs font-bold text-neutral-400 uppercase tracking-wider bg-neutral-950/80 rounded-tl-xl border-r border-white/10">
                  <div className="flex items-center justify-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-neutral-500" />
                    <span>HORA</span>
                  </div>
                </th>

                {DAYS_HEADER.map((day, index) => {
                  const isToday = currentDayIndex === index
                  const isMobileHidden =
                    activeMobileTab !== 'todos' && activeMobileTab !== day.key

                  return (
                    <th
                      key={day.key}
                      className={`p-3.5 text-center border-r border-white/10 transition-all ${
                        isMobileHidden ? 'hidden md:table-cell' : ''
                      } ${
                        index === DAYS_HEADER.length - 1 ? 'rounded-tr-xl' : ''
                      } ${
                        isToday
                          ? 'bg-purple-950/40 border-t-2 border-t-amber-400'
                          : 'bg-neutral-900/60'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold uppercase tracking-wider ${
                              isToday ? 'text-amber-300' : 'text-neutral-200'
                            }`}
                          >
                            {day.label}
                          </span>
                          {isToday && (
                            <span className="bg-amber-400 text-neutral-950 text-[10px] font-black px-1.5 py-0.2 rounded-md uppercase tracking-wider shadow-sm">
                              HOY
                            </span>
                          )}
                        </div>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>

            {/* CUERPO DE LA MATRIZ */}
            <tbody className="divide-y divide-white/5">
              {rows.map((row, rowIndex) => (
                <tr
                  key={row.id || rowIndex}
                  className="hover:bg-white/[0.015] transition-colors"
                >
                  {/* Columna Hora */}
                  <td className="p-3 align-middle text-center whitespace-nowrap bg-neutral-950/60 border-r border-white/10">
                    <div className="inline-flex flex-col items-center justify-center px-3 py-2 rounded-xl bg-neutral-900/90 border border-white/10 text-neutral-200 shadow-sm w-full">
                      <span className="font-mono text-xs font-bold leading-tight">
                        {row.timeLabel}
                      </span>
                      {row.timeSublabel && (
                        <span className="text-[10px] text-neutral-400 font-medium mt-0.5">
                          {row.timeSublabel}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 5 Columnas de Días */}
                  {DAYS_HEADER.map((day, dayIdx) => {
                    const isMobileHidden =
                      activeMobileTab !== 'todos' && activeMobileTab !== day.key

                    const dayKey = day.key as keyof typeof row.days
                    const cell = row.days[dayKey]
                    const isToday = currentDayIndex === dayIdx
                    const matchingTasks = cell ? matchingTasksMap.get(cell.id) || [] : []

                    if (!cell) {
                      return (
                        <td
                          key={day.key}
                          className={`p-2 border-r border-white/10 align-middle ${
                            isMobileHidden ? 'hidden md:table-cell' : ''
                          } ${
                            isToday ? 'bg-amber-400/[0.02]' : ''
                          }`}
                        >
                          <div className="h-full min-h-[96px] rounded-xl border border-dashed border-white/8 bg-white/[0.01] flex flex-col items-center justify-center text-neutral-600 font-mono text-xs transition-colors hover:border-white/20">
                            <span className="text-neutral-600 select-none">—</span>
                          </div>
                        </td>
                      )
                    }

                    const catStyle = CATEGORIES[cell.category] || CATEGORIES.comida

                    return (
                      <td
                        key={day.key}
                        className={`p-2 border-r border-white/10 align-top transition-colors ${
                          isMobileHidden ? 'hidden md:table-cell' : ''
                        } ${
                          isToday ? 'bg-amber-400/[0.02]' : ''
                        }`}
                      >
                        <div
                          className="rounded-xl p-3 border-2 shadow-sm hover:shadow-md transition-all h-full min-h-[96px] flex flex-col justify-between group relative"
                          style={{
                            backgroundColor: catStyle.bg,
                            borderColor: catStyle.border,
                          }}
                        >
                          <div>
                            {/* Etiqueta de Categoría + Botón Editar */}
                            <div className="flex items-center justify-between gap-1.5 mb-1.5">
                              <span
                                className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md"
                                style={{
                                  backgroundColor: catStyle.badgeBg,
                                  color: catStyle.text,
                                }}
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full shrink-0 shadow-2xs"
                                  style={{ backgroundColor: catStyle.dot }}
                                />
                                {catStyle.label}
                              </span>

                              <button
                                onClick={() => handleStartEdit(cell, day.key, row.id)}
                                className="p-1 rounded-md bg-white/90 hover:bg-white text-neutral-700 opacity-0 group-hover:opacity-100 transition-opacity shadow-xs border border-neutral-300"
                                title="Editar este bloque"
                                aria-label="Editar bloque"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Título Principal en negrita y bien espaciado */}
                            <div
                              className="font-bold text-[13px] leading-snug whitespace-pre-line"
                              style={{ color: catStyle.text }}
                            >
                              {cell.title}
                            </div>

                            {/* Subtítulo / Notas (hora exacta, notas fin de asignatura) */}
                            {cell.subtitle && (
                              <div
                                className="mt-1 text-[11.5px] font-medium leading-relaxed opacity-90"
                                style={{ color: catStyle.subtext }}
                              >
                                {cell.subtitle}
                              </div>
                            )}
                          </div>

                          {/* AVISO / INDICADOR DE TAREA VINCULADA */}
                          {matchingTasks.length > 0 && (
                            <div className="mt-2 pt-1.5 border-t border-black/10">
                              <button
                                onClick={() =>
                                  setTaskDetailModal({
                                    blockTitle: cell.title,
                                    tasks: matchingTasks,
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold shadow-2xs transition-all hover:scale-[1.02] cursor-pointer"
                                style={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.85)',
                                  color: catStyle.text,
                                  border: `1px solid ${catStyle.border}`,
                                }}
                                title="Ver tareas asociadas en Hermes"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                <span>
                                  📌 {matchingTasks.length}{' '}
                                  {matchingTasks.length === 1
                                    ? 'tarea vinculada'
                                    : 'tareas vinculadas'}
                                </span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}

              {/* ============================================================
                  FILA FIN DE SEMANA (Sábado & Domingo)
                  ============================================================ */}
              <tr
                className={`border-t-2 border-white/15 bg-neutral-950/60 ${
                  activeMobileTab !== 'todos' && activeMobileTab !== 'finde'
                    ? 'hidden md:table-row'
                    : ''
                }`}
              >
                <td className="p-3 align-middle text-center whitespace-nowrap bg-neutral-950 border-r border-white/10">
                  <div className="inline-flex flex-col items-center justify-center px-3 py-2 rounded-xl bg-purple-900/40 border border-purple-500/30 text-purple-200 shadow-sm w-full">
                    <span className="font-mono text-xs font-bold leading-tight">
                      Sáb / Dom
                    </span>
                    <span className="text-[10px] text-purple-300/80 font-medium mt-0.5">
                      Fin de semana
                    </span>
                  </div>
                </td>

                <td
                  colSpan={activeMobileTab === 'finde' ? 1 : DAYS_HEADER.length}
                  className="p-3"
                >
                    <div
                      className="rounded-xl p-4 border-2 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 group transition-all"
                      style={{
                        backgroundColor: CATEGORIES[finde.category].bg,
                        borderColor: CATEGORIES[finde.category].border,
                      }}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md"
                            style={{
                              backgroundColor: CATEGORIES[finde.category].badgeBg,
                              color: CATEGORIES[finde.category].text,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{
                                backgroundColor: CATEGORIES[finde.category].dot,
                              }}
                            />
                            {CATEGORIES[finde.category].label}
                          </span>
                          <span
                            className="text-xs font-semibold opacity-70"
                            style={{ color: CATEGORIES[finde.category].text }}
                          >
                            · Scouting variable + Sports Data Campus
                          </span>
                        </div>

                        <h3
                          className="font-bold text-sm sm:text-base leading-snug"
                          style={{ color: CATEGORIES[finde.category].text }}
                        >
                          {finde.title}
                        </h3>

                        {finde.subtitle && (
                          <p
                            className="text-xs sm:text-[13px] font-medium leading-relaxed opacity-90"
                            style={{ color: CATEGORIES[finde.category].subtext }}
                          >
                            {finde.subtitle}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                        {matchingTasksMap.get(finde.id)?.length ? (
                          <button
                            onClick={() =>
                              setTaskDetailModal({
                                blockTitle: finde.title,
                                tasks: matchingTasksMap.get(finde.id)!,
                              })
                            }
                            className="px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-purple-900 border border-purple-200 text-xs font-bold shadow-xs transition"
                          >
                            📌 {matchingTasksMap.get(finde.id)!.length} tareas vinculadas
                          </button>
                        ) : null}

                        <button
                          onClick={() => handleStartEdit(finde)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-purple-900 border border-purple-200 shadow-xs text-xs font-bold transition"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Editar fin de semana</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
            </tbody>
          </table>
        </div>

        {/* Pie de tabla */}
        <div className="py-3 px-6 bg-neutral-950 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-400">
          <span>
            Máster Big Data UMU · UCAM CF (La Condomina) · Sports Data Campus
          </span>
          <span className="font-mono text-[11px] text-neutral-500">
            Última actualización sincronizada
          </span>
        </div>
      </section>

      {/* ============================================================
          4. NOTAS FIJAS A MOSTRAR (Tarjetas con borde izquierdo de color)
          - Festivos del Cuatrimestre 1 (Borde ámbar)
          - Fin de Asignaturas (Borde rosa coral máster)
          - Matrícula y Asignaturas cursadas (Borde azul oficina)
          ============================================================ */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <CalendarDays className="w-4 h-4 text-purple-400" />
          <h2
            className="text-xs font-bold text-neutral-300 uppercase tracking-wider"
            style={{ letterSpacing: '0.06em' }}
          >
            Avisos y notas del Cuatrimestre 1
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
          {/* TARJETA 1: Festivos del Cuatrimestre 1 (Borde izquierdo ámbar #F2A623) */}
          <div
            data-testid="card"
            className="card p-5 sm:p-6 rounded-2xl border border-white/8 bg-neutral-900/60 backdrop-blur-md shadow-lg border-l-[6px] transition-all hover:border-white/15 flex flex-col justify-between"
            style={{ borderLeftColor: '#F2A623' }}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F2A623]/15 text-amber-300 border border-[#F2A623]/30">
                  <Calendar className="w-3 h-3 text-[#F2A623]" />
                  Calendario Académico
                </span>
                <span className="text-[11px] text-neutral-400 font-mono">2026/27</span>
              </div>

              <h3
                className="text-base font-bold text-neutral-100"
                style={{ letterSpacing: 0, lineHeight: 1.3 }}
              >
                Festivos del Cuatrimestre 1
              </h3>

              <div className="space-y-2 text-xs leading-relaxed text-neutral-300">
                <div className="flex items-start gap-2 p-1.5 rounded-lg bg-white/[0.02]">
                  <span className="font-bold text-amber-300 shrink-0 w-14">15 sep</span>
                  <span className="text-neutral-400">Festivo local (Murcia)</span>
                </div>
                <div className="flex items-start gap-2 p-1.5 rounded-lg bg-white/[0.02]">
                  <span className="font-bold text-amber-300 shrink-0 w-14">12 oct</span>
                  <span className="text-neutral-400">Fiesta Nacional (Hispanidad)</span>
                </div>
                <div className="flex items-start gap-2 p-1.5 rounded-lg bg-white/[0.02]">
                  <span className="font-bold text-amber-300 shrink-0 w-14">1 nov</span>
                  <span className="text-neutral-400">Todos los Santos</span>
                </div>
                <div className="flex items-start gap-2 p-1.5 rounded-lg bg-white/[0.02]">
                  <span className="font-bold text-amber-300 shrink-0 w-14">13 nov</span>
                  <span className="text-neutral-400">San Alberto Magno</span>
                </div>
                <div className="flex items-start gap-2 p-1.5 rounded-lg bg-white/[0.02]">
                  <span className="font-bold text-amber-300 shrink-0 w-14">7–8 dic</span>
                  <span className="text-neutral-400">Constitución e Inmaculada</span>
                </div>
                <div className="flex items-start gap-2 p-1.5 rounded-lg bg-white/[0.02]">
                  <span className="font-bold text-amber-300 shrink-0 w-14">21 dic–6 ene</span>
                  <span className="text-neutral-400">Vacaciones de Navidad</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-neutral-400 flex items-center justify-between">
              <span>Días no lectivos en la UMU</span>
              <span className="font-bold text-amber-300/80">6 periodos festivos</span>
            </div>
          </div>

          {/* TARJETA 2: Fin de Asignaturas (Borde izquierdo rosa #ED93B1) */}
          <div
            data-testid="card"
            className="card p-5 sm:p-6 rounded-2xl border border-white/8 bg-neutral-900/60 backdrop-blur-md shadow-lg border-l-[6px] transition-all hover:border-white/15 flex flex-col justify-between"
            style={{ borderLeftColor: '#ED93B1' }}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#ED93B1]/15 text-pink-300 border border-[#ED93B1]/30">
                  <GraduationCap className="w-3 h-3 text-[#ED93B1]" />
                  Hitos de Materias
                </span>
                <span className="text-[11px] text-neutral-400 font-mono">Cierre C1</span>
              </div>

              <h3
                className="text-base font-bold text-neutral-100"
                style={{ letterSpacing: 0, lineHeight: 1.3 }}
              >
                Fin de asignaturas
              </h3>

              <div className="space-y-2 text-xs leading-relaxed text-neutral-300">
                <div className="p-2 rounded-xl bg-pink-500/5 border border-pink-500/15 space-y-0.5">
                  <div className="flex items-center justify-between font-bold text-pink-300">
                    <span>Visualización de Datos</span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-pink-500/20">2 nov</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Última clase de la asignatura el lunes 2 de noviembre.
                  </p>
                </div>

                <div className="p-2 rounded-xl bg-pink-500/5 border border-pink-500/15 space-y-0.5">
                  <div className="flex items-center justify-between font-bold text-pink-300">
                    <span>Bases de Datos a Gran Escala</span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-pink-500/20">3 dic</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Última clase de la asignatura el jueves 3 de diciembre.
                  </p>
                </div>

                <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
                  <div className="flex items-center justify-between font-bold text-neutral-200">
                    <span>Viernes sin clase</span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-white/10 text-neutral-300">
                      Desde 6 nov
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    El viernes queda completamente libre a partir del 6 nov.
                  </p>
                </div>

                <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
                  <div className="flex items-center justify-between font-bold text-neutral-200">
                    <span>Aprendizaje Estadístico</span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-white/10 text-neutral-300">
                      Hasta 16 dic
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Continúa de forma regular hasta el cierre oficial de cuatrimestre.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-neutral-400 flex items-center justify-between">
              <span>Máster Big Data UMU</span>
              <span className="font-bold text-pink-300/80">Liberación progresiva</span>
            </div>
          </div>

          {/* TARJETA 3: Matrícula y Asignaturas (Borde izquierdo azul #85B7EB) */}
          <div
            data-testid="card"
            className="card p-5 sm:p-6 rounded-2xl border border-white/8 bg-neutral-900/60 backdrop-blur-md shadow-lg border-l-[6px] transition-all hover:border-white/15 flex flex-col justify-between"
            style={{ borderLeftColor: '#85B7EB' }}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#85B7EB]/15 text-blue-300 border border-[#85B7EB]/30">
                  <BookOpen className="w-3 h-3 text-[#85B7EB]" />
                  Expediente & Régimen
                </span>
                <span className="text-[11px] text-neutral-400 font-mono">Plan 2026</span>
              </div>

              <h3
                className="text-base font-bold text-neutral-100"
                style={{ letterSpacing: 0, lineHeight: 1.3 }}
              >
                Matrícula y asignaturas
              </h3>

              <div className="space-y-3 text-xs leading-relaxed">
                <div className="p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/20">
                  <span className="font-bold text-blue-300 block mb-0.5">
                    Modalidad de matrícula: Parcial
                  </span>
                  <p className="text-[11px] text-neutral-400">
                    Sin Inteligencia de Negocio ni Aplicaciones y Casos de Uso Empresarial.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <span className="font-bold text-neutral-200 text-xs block">
                    Asignaturas cursadas (Cuatrimestre 1):
                  </span>
                  <ul className="space-y-1 text-[11.5px] text-neutral-300 list-disc list-inside">
                    <li>Visualización de Datos</li>
                    <li>Aprendizaje Estadístico</li>
                    <li>Bases de Datos a Gran Escala</li>
                  </ul>
                </div>

                <div className="pt-2 border-t border-white/5 space-y-1.5">
                  <span className="font-bold text-neutral-300 text-xs block">
                    Cuatrimestre 2 (Aparte):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-neutral-300">
                      Internet de las Cosas
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-neutral-300">
                      Minería de Datos
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-neutral-400 flex items-center justify-between">
              <span>Carga académica adaptada</span>
              <span className="font-bold text-blue-300/80">3 materias activas</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          5. MODAL INTERACTIVO DE EDICIÓN
          Permite ajustar cualquier bloque puntual por si cambian horarios
          ============================================================ */}
      {editingCell && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-neutral-900 border border-white/15 text-white rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Editar bloque de horario
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Cambios guardados localmente para este dispositivo
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingCell(null)}
                className="text-neutral-400 hover:text-white p-1.5 rounded-xl hover:bg-neutral-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5 uppercase tracking-wider">
                  Título principal
                </label>
                <input
                  type="text"
                  value={editingCell.title}
                  onChange={(e) =>
                    setEditingCell({ ...editingCell, title: e.target.value })
                  }
                  placeholder="Ej: Oficina UCAM CF, Torso Fuerza, etc."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-white/15 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5 uppercase tracking-wider">
                  Subtítulo / Notas / Hora exacta
                </label>
                <input
                  type="text"
                  value={editingCell.subtitle}
                  onChange={(e) =>
                    setEditingCell({ ...editingCell, subtitle: e.target.value })
                  }
                  placeholder="Ej: 10:00–13:00, Atalayas, última clase: 2 nov, etc."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-white/15 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-2 uppercase tracking-wider">
                  Categoría y color
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(CATEGORIES).map(([key, style]) => {
                    const isSelected = editingCell.category === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setEditingCell({
                            ...editingCell,
                            category: key as ScheduleCategoryKey,
                          })
                        }
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                          isSelected
                            ? 'ring-2 ring-purple-500 shadow-sm'
                            : 'opacity-85 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: style.bg,
                          borderColor: isSelected ? style.dot : style.border,
                          color: style.text,
                        }}
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: style.dot }}
                        />
                        <span className="truncate">{style.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/10">
              {editingCell.id !== 'finde' && (
                <button
                  type="button"
                  onClick={handleClearCell}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition"
                >
                  Vaciar bloque
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setEditingCell(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-lg shadow-purple-600/30"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar cambios</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          6. MODAL DE DETALLE DE TAREAS ASOCIADAS
          Muestra la lista de entregas/tareas vinculadas a la materia
          ============================================================ */}
      {taskDetailModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-neutral-900 border border-white/15 text-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Tareas y entregas vinculadas
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    {taskDetailModal.blockTitle}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTaskDetailModal(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {taskDetailModal.tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 rounded-xl bg-neutral-950/80 border border-white/10 space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-neutral-200 leading-snug">
                      {task.titulo}
                    </span>
                    <span
                      className={`text-[9.5px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                        task.prioridad === 'alta'
                          ? 'bg-rose-500/20 text-rose-300'
                          : task.prioridad === 'urgente'
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}
                    >
                      {task.prioridad}
                    </span>
                  </div>

                  {task.descripcion && (
                    <p className="text-[11px] text-neutral-400 line-clamp-2">
                      {task.descripcion}
                    </p>
                  )}

                  {task.fecha_limite && (
                    <div className="flex items-center gap-1.5 text-[10.5px] text-amber-400/90 pt-1 font-mono">
                      <Clock className="w-3 h-3" />
                      <span>Entrega: {task.fecha_limite}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <span className="text-xs text-neutral-500">
                {taskDetailModal.tasks.length} activa(s)
              </span>
              <div className="flex items-center gap-2">
                <Link
                  href="/tareas"
                  onClick={() => setTaskDetailModal(null)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-sm transition"
                >
                  <span>Ir a Tareas</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <button
                  onClick={() => setTaskDetailModal(null)}
                  className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
