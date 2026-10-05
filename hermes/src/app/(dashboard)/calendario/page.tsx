import { getItems } from '@/lib/actions/items'
import { getProyectos } from '@/lib/actions/proyectos'
import CalendarWrapper from '@/components/calendar/CalendarWrapper'
import { isGoogleConnected, obtenerEventosGoogle, sincronizarBorradosGoogle } from '@/lib/googleCalendar'
import type { Item } from '@/lib/types'

export const metadata = { title: 'Calendario — Hermes' }
export const revalidate = 0

export default async function CalendarioPage() {
  const googleConnected = await isGoogleConnected()

  // Sincronizar primero los eventos borrados de Google para no traerlos de la base de datos
  if (googleConnected) {
    try {
      await sincronizarBorradosGoogle()
    } catch (e) {
      console.error('[CalendarioPage] Error al sincronizar borrados:', e)
    }
  }

  const [items, proyectos, googleEventos] = await Promise.all([
    getItems(),
    getProyectos(),
    googleConnected ? obtenerEventosGoogle() : Promise.resolve([]),
  ])

  // Filtrar eventos de Google para no duplicar los que ya existen localmente en Supabase
  const localGoogleEventIds = new Set(
    items.map(i => i.google_event_id).filter(Boolean)
  )
  const filteredGoogleEventos = googleEventos.filter(
    e => !localGoogleEventIds.has(e.google_event_id)
  )

  const eventosLocales = items.filter(i =>
    (i.tipo === 'evento' && i.fecha_evento) ||
    (i.tipo === 'tarea' && i.fecha_limite) ||
    (i.tipo === 'recordatorio' && i.fecha_limite)
  )

  const eventos = [...eventosLocales, ...filteredGoogleEventos]
  const todosItems = [...items, ...filteredGoogleEventos]

  return <CalendarWrapper eventos={eventos} todosItems={todosItems} proyectos={proyectos} />
}

