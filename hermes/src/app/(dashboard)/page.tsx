import { getItemsActivos } from '@/lib/actions/items'
import { getPlantillasGym, getRutinasGym } from '@/lib/actions/health'
import { priorizarItemsDeHoy } from '@/lib/ai/prioritize'
import { isGoogleConnected, obtenerEventosGoogle } from '@/lib/googleCalendar'
import type { Item } from '@/lib/types'
import HomeClient from './HomeClient'

export const metadata = { title: 'Inicio — Hermes' }
export const revalidate = 15 // Revalidación más frecuente para mantener la Home fresca

export default async function HomePage() {
  const [items, plantillas, rutinas, googleConnected] = await Promise.all([
    getItemsActivos(),
    getPlantillasGym(),
    getRutinasGym(),
    isGoogleConnected(),
  ])

  let googleEventos: Item[] = []
  if (googleConnected) {
    googleEventos = await obtenerEventosGoogle()
  }

  // Filtrar duplicados
  const localGoogleEventIds = new Set(
    items.map(i => i.google_event_id).filter(Boolean)
  )
  const filteredGoogleEventos = googleEventos.filter(
    e => !localGoogleEventIds.has(e.google_event_id)
  )

  const todosItems = [...items, ...filteredGoogleEventos]

  // Lógica de priorización de items de hoy
  const priorizados = priorizarItemsDeHoy(todosItems)

  return (
    <HomeClient
      priorizados={priorizados}
      plantillas={plantillas}
      rutinas={rutinas}
    />
  )
}

