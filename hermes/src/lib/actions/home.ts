'use server'

import { getItemsActivos } from '@/lib/actions/items'
import { getPlantillasGym, getRutinasGym } from '@/lib/actions/health'
import { priorizarItemsDeHoy } from '@/lib/ai/prioritize'
import { isGoogleConnected, obtenerEventosGoogleHoy } from '@/lib/googleCalendar'
import type { Item, ItemPriorizado, PlantillaGym, RutinaGym } from '@/lib/types'

export interface HomeData {
  priorizados: ItemPriorizado[]
  plantillas: PlantillaGym[]
  rutinas: RutinaGym[]
}

export async function getHomeData(): Promise<HomeData> {
  const [items, plantillas, rutinas, googleConnected] = await Promise.all([
    getItemsActivos(),
    getPlantillasGym(),
    getRutinasGym(),
    isGoogleConnected(),
  ])

  let googleEventos: Item[] = []
  if (googleConnected) {
    try {
      // Optimización crítica: sólo eventos de HOY, con caché en memoria
      googleEventos = await obtenerEventosGoogleHoy()
    } catch (e) {
      console.error('[getHomeData] Error al obtener eventos de Google:', e)
    }
  }

  // Filtrar duplicados con eventos ya sincronizados localmente
  const localGoogleEventIds = new Set(
    items.map((i) => i.google_event_id).filter(Boolean)
  )
  const filteredGoogleEventos = googleEventos.filter(
    (e) => !localGoogleEventIds.has(e.google_event_id)
  )

  const todosItems = [...items, ...filteredGoogleEventos]
  const priorizados = priorizarItemsDeHoy(todosItems)

  return {
    priorizados,
    plantillas,
    rutinas,
  }
}
