'use client'

import React, { useState, useEffect } from 'react'
import { Pencil, RotateCcw, Check, X, Calendar } from 'lucide-react'

// Categorías y paleta de colores especificada
export interface CategoryStyle {
  label: string
  chipDot: string
  bg: string
  border: string
  text: string
  subtext: string
}

export const CATEGORIES: Record<string, CategoryStyle> = {
  gimnasio: {
    label: 'Gimnasio',
    chipDot: '#10B981',
    bg: '#ECFDF5',
    border: '#6EE7B7',
    text: '#065F46',
    subtext: '#047857',
  },
  desayuno: {
    label: 'Desayuno',
    chipDot: '#F59E0B',
    bg: '#FFFBEB',
    border: '#FCD34D',
    text: '#92400E',
    subtext: '#B45309',
  },
  oficina: {
    label: 'Oficina UCAM',
    chipDot: '#3B82F6',
    bg: '#EFF6FF',
    border: '#93C5FD',
    text: '#1E3A8A',
    subtext: '#1D4ED8',
  },
  descanso: {
    label: 'Comida / descanso',
    chipDot: '#6B7280',
    bg: '#F9FAFB',
    border: '#D1D5DB',
    text: '#1F2937',
    subtext: '#4B5563',
  },
  master: {
    label: 'Máster Big Data',
    chipDot: '#EC4899',
    bg: '#FDF2F8',
    border: '#F9A8D4',
    text: '#831843',
    subtext: '#9D174D',
  },
  sports: {
    label: 'Sports Data Campus / libre',
    chipDot: '#8B5CF6',
    bg: '#F5F3FF',
    border: '#C4B5FD',
    text: '#4C1D95',
    subtext: '#5B21B6',
  },
  trayecto: {
    label: 'Trayecto / Variable',
    chipDot: '#64748B',
    bg: '#F8FAFC',
    border: '#CBD5E1',
    text: '#1E293B',
    subtext: '#475569',
  },
}

export interface CellData {
  id: string
  title: string
  subtitle?: string
  category: keyof typeof CATEGORIES
  editable?: boolean
}

export interface ScheduleRow {
  timeLabel: string
  days: {
    lunes?: CellData
    martes?: CellData
    miercoles?: CellData
    jueves?: CellData
    viernes?: CellData
  }
}

// Datos por defecto del horario
const INITIAL_DESPERTAR: CellData = {
  id: 'despertar',
  title: 'Despertar',
  subtitle: '7:15 AM · Hora fija',
  category: 'desayuno',
}

const INITIAL_ROWS: ScheduleRow[] = [
  {
    timeLabel: '7:15 – 7:30',
    days: {
      lunes: { id: 'r1_l', title: 'Snack rápido', subtitle: 'café + fruta', category: 'desayuno' },
      martes: { id: 'r1_m', title: 'Desayuno completo', subtitle: '+ tareas variadas', category: 'desayuno' },
      miercoles: { id: 'r1_x', title: 'Snack rápido', subtitle: 'café + fruta', category: 'desayuno' },
      jueves: { id: 'r1_j', title: 'Desayuno completo', subtitle: '+ tareas variadas', category: 'desayuno' },
      viernes: { id: 'r1_v', title: 'Snack rápido', subtitle: 'café + fruta', category: 'desayuno' },
    },
  },
  {
    timeLabel: '7:45 – 9:00',
    days: {
      lunes: { id: 'r2_l', title: 'Torso fuerza', subtitle: 'Fitness Park Atalayas', category: 'gimnasio' },
      martes: undefined,
      miercoles: { id: 'r2_x', title: 'Empuje hipertrofia', subtitle: 'Fitness Park Atalayas', category: 'gimnasio' },
      jueves: undefined,
      viernes: { id: 'r2_v', title: 'Tirón espalda', subtitle: 'Fitness Park Atalayas', category: 'gimnasio' },
    },
  },
  {
    timeLabel: '9:00 – 9:20',
    days: {
      lunes: { id: 'r3_l', title: 'Ducha + desayuno', subtitle: 'para llevar', category: 'desayuno' },
      martes: undefined,
      miercoles: { id: 'r3_x', title: 'Ducha + desayuno', subtitle: 'para llevar', category: 'desayuno' },
      jueves: undefined,
      viernes: { id: 'r3_v', title: 'Ducha + desayuno', subtitle: 'para llevar', category: 'desayuno' },
    },
  },
  {
    timeLabel: '9:20 – 9:50',
    days: {
      lunes: { id: 'r4_l', title: 'Trayecto a oficina', subtitle: 'Atalayas → La Condomina, ~10 min', category: 'trayecto', editable: true },
      martes: { id: 'r4_m', title: 'Trayecto a oficina', subtitle: 'desde casa', category: 'trayecto', editable: true },
      miercoles: { id: 'r4_x', title: 'Trayecto a oficina', subtitle: 'Atalayas → La Condomina, ~10 min', category: 'trayecto', editable: true },
      jueves: { id: 'r4_j', title: 'Trayecto a oficina', subtitle: 'desde casa', category: 'trayecto', editable: true },
      viernes: { id: 'r4_v', title: 'Trayecto a oficina', subtitle: 'Atalayas → La Condomina, ~10 min', category: 'trayecto', editable: true },
    },
  },
  {
    timeLabel: '10:00 – 13:00',
    days: {
      lunes: { id: 'r5_l', title: 'Oficina UCAM CF', category: 'oficina' },
      martes: { id: 'r5_m', title: 'Oficina UCAM CF', category: 'oficina' },
      miercoles: { id: 'r5_x', title: 'Oficina UCAM CF', category: 'oficina' },
      jueves: { id: 'r5_j', title: 'Oficina UCAM CF', category: 'oficina' },
      viernes: { id: 'r5_v', title: 'Oficina UCAM CF', category: 'oficina' },
    },
  },
  {
    timeLabel: '13:00 – 16:00',
    days: {
      lunes: { id: 'r6_l', title: 'Comida + descanso', category: 'descanso' },
      martes: { id: 'r6_m', title: 'Comida + descanso', category: 'descanso' },
      miercoles: { id: 'r6_x', title: 'Comida + descanso', category: 'descanso' },
      jueves: { id: 'r6_j', title: 'Comida + descanso', category: 'descanso' },
      viernes: { id: 'r6_v', title: 'Comida + descanso', category: 'descanso' },
    },
  },
  {
    timeLabel: '16:00 – 20:30',
    days: {
      lunes: {
        id: 'r7_l',
        title: 'Visualización de Datos (T)\nInteligencia de Negocio (T)\nInteligencia de Negocio (P)',
        subtitle: '16:00 – 20:30',
        category: 'master',
      },
      martes: { id: 'r7_m', title: 'Aprendizaje Estadístico (T)', subtitle: '~16:00–17:30', category: 'master' },
      miercoles: { id: 'r7_x', title: 'Bases de Datos a Gran Escala (P)', subtitle: '~16:00–18:00', category: 'master' },
      jueves: { id: 'r7_j', title: 'Bases de Datos a Gran Escala (T)', subtitle: '~16:00–17:30', category: 'master' },
      viernes: {
        id: 'r7_v',
        title: 'Aprendizaje Estadístico (P)\nVisualización de Datos (P)',
        subtitle: '16:00–20:00',
        category: 'master',
      },
    },
  },
  {
    timeLabel: '18:00 – 20:00',
    days: {
      lunes: undefined,
      martes: { id: 'r8_m', title: 'Sports Data Campus', subtitle: 'estudio / directos', category: 'sports' },
      miercoles: { id: 'r8_x', title: 'Sports Data Campus', subtitle: 'estudio / directos', category: 'sports' },
      jueves: { id: 'r8_j', title: 'Sports Data Campus', subtitle: 'estudio / directos', category: 'sports' },
      viernes: undefined,
    },
  },
]

const INITIAL_FINDE = {
  id: 'finde',
  title: 'Scouting / partidos (variable, prioridad sobre lo demás)',
  subtitle: 'hueco largo disponible para Sports Data Campus',
  category: 'sports' as keyof typeof CATEGORIES,
  editable: true,
}

const STORAGE_KEY = 'hermes_horario_custom_v2'

export default function HorarioSemanal() {
  const [rows, setRows] = useState<ScheduleRow[]>(INITIAL_ROWS)
  const [finde, setFinde] = useState(INITIAL_FINDE)
  const [editingCell, setEditingCell] = useState<{ id: string; title: string; subtitle: string } | null>(null)
  const [hasCustomizations, setHasCustomizations] = useState(false)
  const [currentDayIndex, setCurrentDayIndex] = useState<number>(-1)

  // Cargar personalizaciones y detectar el día de la semana actual
  useEffect(() => {
    // 0 = Domingo, 1 = Lunes, ..., 5 = Viernes, 6 = Sábado
    const today = new Date().getDay()
    if (today >= 1 && today <= 5) {
      setCurrentDayIndex(today - 1) // 0: Lunes, 1: Martes, etc.
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.rows) setRows(parsed.rows)
        if (parsed.finde) setFinde(parsed.finde)
        setHasCustomizations(true)
      }
    } catch (e) {
      console.error('Error loading schedule from localStorage', e)
    }
  }, [])

  const saveToStorage = (newRows: ScheduleRow[], newFinde: typeof INITIAL_FINDE) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ rows: newRows, finde: newFinde }))
      setHasCustomizations(true)
    } catch (e) {
      console.error('Error saving schedule', e)
    }
  }

  const handleReset = () => {
    if (confirm('¿Deseas restaurar los valores por defecto del horario?')) {
      setRows(INITIAL_ROWS)
      setFinde(INITIAL_FINDE)
      localStorage.removeItem(STORAGE_KEY)
      setHasCustomizations(false)
    }
  }

  const handleStartEdit = (cell: CellData) => {
    setEditingCell({
      id: cell.id,
      title: cell.title,
      subtitle: cell.subtitle || '',
    })
  }

  const handleSaveEdit = () => {
    if (!editingCell) return

    if (editingCell.id === 'finde') {
      const updatedFinde = { ...finde, title: editingCell.title, subtitle: editingCell.subtitle }
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
              title: editingCell.title,
              subtitle: editingCell.subtitle,
            }
          }
        })
        return { ...row, days: newDays }
      })
      setRows(updatedRows)
      saveToStorage(updatedRows, finde)
    }

    setEditingCell(null)
  }

  const daysHeader = [
    { key: 'lunes', label: 'LUNES' },
    { key: 'martes', label: 'MARTES' },
    { key: 'miercoles', label: 'MIÉRCOLES' },
    { key: 'jueves', label: 'JUEVES' },
    { key: 'viernes', label: 'VIERNES' },
  ]

  return (
    <div className="w-full max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      {/* Barra superior de estado y acciones en Hermes */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              Horario Semanal UMU / UCAM / SDC
              {currentDayIndex !== -1 && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
                  Día actual destacado
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              Personalizado para Javier Cánovas · Edición interactiva activada
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasCustomizations && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
              title="Restaurar valores originales"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar original
            </button>
          )}
        </div>
      </div>

      {/* TARJETA PRINCIPAL DEL HORARIO (Diseño Corporativo solicitado) */}
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden font-sans">
        {/* 1. CABECERA CORPORATIVA */}
        <div className="p-6 sm:p-8 bg-white border-b-[3px] border-[#0D4479]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Monograma JC */}
            <div className="w-[52px] h-[52px] rounded-full bg-[#0D4479] text-[#EDA900] flex items-center justify-center font-bold text-xl tracking-wider shadow-md shrink-0 border-2 border-[#EDA900]/30">
              JC
            </div>
            {/* Título & Subtítulo */}
            <div className="space-y-1">
              <h1 className="text-xl sm:text-[22px] font-bold text-[#0D4479] leading-tight tracking-tight">
                Javier Cánovas — Horario semanal
              </h1>
              <p className="text-xs sm:text-[11.5px] text-[#5B6B7C] font-medium leading-relaxed">
                Cuatrimestre 1 · Curso académico 2026/2027 · Máster Big Data (UMU) + Sports Data Campus + UCAM CF
              </p>
            </div>
          </div>
        </div>

        {/* 2. LEYENDA (Chips con punto de color + etiqueta) */}
        <div className="px-6 py-3 bg-[#F8FAFC] border-b border-slate-200 flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          {Object.entries(CATEGORIES).map(([key, style]) => (
            <div
              key={key}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-2xs font-medium text-slate-700"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: style.chipDot }}
              />
              <span>{style.label}</span>
            </div>
          ))}
        </div>

        {/* 3. TABLA / GRID DE HORARIO */}
        <div className="overflow-x-auto p-2 sm:p-3 bg-slate-100/40">
          <table className="w-full text-left border-collapse min-w-[750px]">
            {/* CABECERA DE DÍAS */}
            <thead>
              <tr className="bg-[#0D4479] text-white text-xs font-bold tracking-wider">
                <th className="p-3 w-32 text-center border-r border-[#1B5A96] bg-[#0A3763] uppercase tracking-wide">
                  HORA
                </th>
                {daysHeader.map((day, index) => {
                  const isToday = currentDayIndex === index
                  return (
                    <th
                      key={day.key}
                      className={`p-3 text-center border-r border-[#1B5A96] transition-colors relative ${
                        isToday ? 'bg-[#155A9C] ring-2 ring-amber-400 ring-inset' : ''
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>{day.label}</span>
                        {isToday && (
                          <span className="bg-[#EDA900] text-[#0D4479] text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wide shadow-2xs">
                            HOY
                          </span>
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-[11.5px] leading-snug bg-white">
              {/* FILA BLOQUE 7:15 - DESPERTAR (Fila única, ancho completo) */}
              <tr className="bg-[#FEF7E6]/40">
                <td className="p-2 align-middle text-center bg-slate-50 border-r border-slate-200">
                  <div className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-[#92400E] text-white font-mono text-[11px] font-bold shadow-2xs">
                    7:15
                  </div>
                </td>
                <td colSpan={5} className="p-2">
                  <div className="rounded-xl p-2 bg-[#FEF7E6] border-2 border-[#FDE68A] shadow-2xs flex items-center justify-center gap-2 text-[#92400E]">
                    <span className="font-extrabold text-xs">⚡ {INITIAL_DESPERTAR.title}</span>
                    <span className="text-[11px] font-medium text-[#B45309]">({INITIAL_DESPERTAR.subtitle})</span>
                  </div>
                </td>
              </tr>

              {/* FILAS DE MATRIZ DE HORARIO */}
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-slate-50/50 transition-colors">
                  {/* Columna Hora */}
                  <td className="p-2 align-middle text-center whitespace-nowrap bg-slate-50 border-r border-slate-200">
                    <div className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-lg bg-[#0D4479] text-white font-mono text-[11px] font-bold shadow-2xs border border-[#0A3763]">
                      {row.timeLabel}
                    </div>
                  </td>

                  {/* 5 Columnas de Días */}
                  {daysHeader.map((day, dayIdx) => {
                    const dayKey = day.key as keyof typeof row.days
                    const cell = row.days[dayKey]
                    const isToday = currentDayIndex === dayIdx

                    if (!cell) {
                      return (
                        <td
                          key={dayIdx}
                          className={`p-1.5 border-r border-slate-200 align-top ${
                            isToday ? 'bg-amber-500/5' : ''
                          }`}
                        >
                          <div className="h-full min-h-[52px] rounded-xl border border-dashed border-slate-200 bg-slate-50/40 flex items-center justify-center text-slate-300 font-mono text-xs">
                            —
                          </div>
                        </td>
                      )
                    }

                    const catStyle = CATEGORIES[cell.category] || CATEGORIES.descanso

                    return (
                      <td
                        key={dayIdx}
                        className={`p-1.5 border-r border-slate-200 align-top transition-all ${
                          isToday ? 'bg-amber-500/5' : ''
                        }`}
                      >
                        <div
                          className="rounded-xl p-2.5 border-2 shadow-2xs hover:shadow-md transition-all h-full flex flex-col justify-between group relative"
                          style={{
                            backgroundColor: catStyle.bg,
                            borderColor: catStyle.border,
                          }}
                        >
                          {/* Etiqueta de categoría & Botón Editar */}
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="flex items-center gap-1.5 text-[9.5px] font-extrabold uppercase tracking-wider opacity-80" style={{ color: catStyle.text }}>
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: catStyle.chipDot }} />
                              {catStyle.label}
                            </span>
                            {cell.editable && (
                              <button
                                onClick={() => handleStartEdit(cell)}
                                className="p-1 rounded bg-white/90 hover:bg-white text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-2xs border border-slate-200"
                                title="Editar bloque"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Título Principal */}
                          <div className="whitespace-pre-line font-bold text-[11.5px] leading-snug" style={{ color: catStyle.text }}>
                            {cell.title}
                          </div>

                          {/* Subtítulo / Detalle */}
                          {cell.subtitle && (
                            <div className="mt-1 text-[10px] font-semibold leading-tight opacity-85" style={{ color: catStyle.subtext }}>
                              {cell.subtitle}
                            </div>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}

              {/* FILA FIN DE SEMANA (Ancho completo) */}
              <tr className="border-t-2 border-slate-300">
                <td className="p-2 align-middle text-center bg-slate-50 border-r border-slate-200">
                  <div className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-lg bg-[#4C1D95] text-white font-mono text-[11px] font-bold shadow-2xs">
                    Sáb / Dom
                  </div>
                </td>
                <td colSpan={5} className="p-2">
                  <div
                    className="rounded-xl p-3 border-2 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 group transition-all"
                    style={{
                      backgroundColor: CATEGORIES[finde.category].bg,
                      borderColor: CATEGORIES[finde.category].border,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: CATEGORIES[finde.category].chipDot }}
                      />
                      <div>
                        <span className="font-bold text-xs" style={{ color: CATEGORIES[finde.category].text }}>
                          {finde.title}
                        </span>
                        {finde.subtitle && (
                          <span className="text-xs ml-2 font-medium opacity-85" style={{ color: CATEGORIES[finde.category].subtext }}>
                            · {finde.subtitle}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleStartEdit(finde)}
                      className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white text-purple-900 border border-purple-200 shadow-2xs font-semibold self-start sm:self-auto transition"
                    >
                      <Pencil className="w-3 h-3" />
                      Editar fin de semana
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 4. BLOQUE FESTIVOS DEL CUATRIMESTRE 1 */}
        <div className="p-4 sm:p-5 bg-[#F8FAFC] border-t border-slate-200">
          <div className="p-4 rounded-xl bg-white border border-slate-200 border-l-[5px] border-l-[#EDA900] shadow-2xs space-y-1.5">
            <h3 className="text-xs font-bold text-[#0D4479] uppercase tracking-wide flex items-center gap-2">
              <span>📅 Festivos del Cuatrimestre 1</span>
            </h3>
            <p className="text-xs text-slate-700 font-medium leading-relaxed">
              15 sep <span className="text-slate-400">(festivo local)</span> · 12 oct <span className="text-slate-400">(Hispanidad)</span> · 1 nov <span className="text-slate-400">(Todos los Santos)</span> · 13 nov <span className="text-slate-400">(San Alberto Magno)</span> · 7–8 dic <span className="text-slate-400">(Constitución / Inmaculada)</span> · 21 dic–6 ene <span className="text-slate-400">(Navidad)</span>
            </p>
          </div>
        </div>

        {/* 5. PIE DE PÁGINA CORPORATIVO */}
        <div className="py-3 px-6 bg-slate-50 border-t border-slate-200 text-center text-[10.5px] text-slate-400 font-medium">
          Máster UMU · UCAM CF · Sports Data Campus
        </div>
      </div>

      {/* MODAL DE EDICIÓN PARA BLOQUES VARIABLES */}
      {editingCell && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-purple-400" />
                Editar bloque de horario
              </h3>
              <button
                onClick={() => setEditingCell(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Título principal</label>
                <input
                  type="text"
                  value={editingCell.title}
                  onChange={(e) => setEditingCell({ ...editingCell, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Subtítulo / Notas (opcional)</label>
                <input
                  type="text"
                  value={editingCell.subtitle}
                  onChange={(e) => setEditingCell({ ...editingCell, subtitle: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setEditingCell(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition shadow-lg shadow-purple-600/30"
              >
                <Check className="w-4 h-4" />
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
