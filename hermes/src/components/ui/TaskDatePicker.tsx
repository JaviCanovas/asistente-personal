'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar as CalendarIcon, X } from 'lucide-react'

interface TaskDatePickerProps {
  value: string // YYYY-MM-DD
  onChange: (date: string) => void
}

function formatDateLabel(dateStr: string): string {
  if (!dateStr) return 'Fecha'
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [y, m, d] = dateStr.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  target.setHours(0, 0, 0, 0)

  if (target.getTime() === today.getTime()) {
    return 'Hoy'
  }
  if (target.getTime() === tomorrow.getTime()) {
    return 'Mañana'
  }

  // Short format: "15 oct"
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${d} ${months[m - 1]}`
}

function toYMD(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function TaskDatePicker({ value, onChange }: TaskDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const label = formatDateLabel(value)
  const isSelected = Boolean(value)

  const handleSetToday = () => {
    onChange(toYMD(new Date()))
    setIsOpen(false)
  }

  const handleSetTomorrow = () => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    onChange(toYMD(d))
    setIsOpen(false)
  }

  const handleSetNextWeek = () => {
    const d = new Date()
    // Next Monday or 7 days from now
    d.setDate(d.getDate() + 7)
    onChange(toYMD(d))
    setIsOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setIsOpen(false)
  }

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-semibold transition-all cursor-pointer select-none ${
          isSelected
            ? 'bg-sky-500/15 text-sky-300 border-sky-500/35 shadow-sm'
            : 'bg-neutral-900/80 text-neutral-400 border-white/8 hover:text-neutral-200 hover:border-white/15'
        }`}
      >
        <CalendarIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-sky-400' : 'text-neutral-400'}`} />
        <span>{label}</span>
        {isSelected && (
          <span
            onClick={handleClear}
            className="ml-1 p-0.5 rounded-full hover:bg-sky-500/20 text-sky-300 hover:text-white"
            title="Quitar fecha"
          >
            <X className="w-3 h-3" />
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 w-56 p-2 rounded-xl bg-neutral-900 border border-white/12 shadow-2xl shadow-black/80 backdrop-blur-xl animate-fade-in text-xs space-y-1">
          <p className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
            Fecha de vencimiento
          </p>
          <button
            type="button"
            onClick={handleSetToday}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer text-left"
          >
            <span>Hoy</span>
            <span className="text-[11px] text-neutral-500">
              {new Date().toLocaleDateString('es-ES', { weekday: 'short' })}
            </span>
          </button>
          <button
            type="button"
            onClick={handleSetTomorrow}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer text-left"
          >
            <span>Mañana</span>
            <span className="text-[11px] text-neutral-500">
              {(() => {
                const d = new Date()
                d.setDate(d.getDate() + 1)
                return d.toLocaleDateString('es-ES', { weekday: 'short' })
              })()}
            </span>
          </button>
          <button
            type="button"
            onClick={handleSetNextWeek}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer text-left"
          >
            <span>Próxima semana</span>
            <span className="text-[11px] text-neutral-500">
              {(() => {
                const d = new Date()
                d.setDate(d.getDate() + 7)
                return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
              })()}
            </span>
          </button>

          <div className="pt-1.5 pb-0.5 border-t border-white/8 px-1">
            <label className="block text-[11px] font-semibold text-neutral-400 mb-1 px-1">
              Elegir fecha:
            </label>
            <input
              type="date"
              value={value}
              onChange={e => {
                onChange(e.target.value)
                setIsOpen(false)
              }}
              className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-white/10 text-neutral-100 text-xs outline-none focus:border-purple-500 cursor-pointer"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {isSelected && (
            <button
              type="button"
              onClick={handleClear}
              className="w-full text-center px-2 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer text-[11px] font-medium"
            >
              Sin fecha
            </button>
          )}
        </div>
      )}
    </div>
  )
}
