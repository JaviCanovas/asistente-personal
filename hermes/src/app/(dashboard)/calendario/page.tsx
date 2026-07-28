import { getItems } from '@/lib/actions/items'
import { getProyectos } from '@/lib/actions/proyectos'
import CalendarWrapper from '@/components/calendar/CalendarWrapper'

export const metadata = { title: 'Calendario — Hermes' }
export const revalidate = 30

export default async function CalendarioPage() {
  const [items, proyectos] = await Promise.all([
    getItems(),
    getProyectos()
  ])
  const eventos = items.filter(i =>
    (i.tipo === 'evento' && i.fecha_evento) ||
    (i.tipo === 'tarea' && i.fecha_limite) ||
    (i.tipo === 'recordatorio' && i.fecha_limite)
  )
  
  return <CalendarWrapper eventos={eventos} todosItems={items} proyectos={proyectos} />
}
