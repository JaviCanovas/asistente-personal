'use client'

import dynamic from 'next/dynamic'
import type { Item, Proyecto } from '@/lib/types'

// Cargar dinámicamente el componente del calendario real con SSR deshabilitado
const DynamicCalendar = dynamic(() => import('@/app/(dashboard)/calendario/CalendarioClient'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[500px] card p-6">
      <div className="text-sm animate-pulse" style={{ color: 'var(--text-secondary)' }}>
        Iniciando vistas de calendario...
      </div>
    </div>
  )
})

interface CalendarWrapperProps {
  eventos: Item[]
  todosItems: Item[]
  proyectos: Proyecto[]
}

export default function CalendarWrapper({ eventos, todosItems, proyectos }: CalendarWrapperProps) {
  return <DynamicCalendar eventos={eventos} todosItems={todosItems} proyectos={proyectos} />
}
