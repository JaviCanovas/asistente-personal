'use server'

import { getItemsActivos } from '@/lib/actions/items'
import { getPlantillasGym, getRutinasGym } from '@/lib/actions/health'
import { priorizarItemsDeHoy, obtenerProximosEventos } from '@/lib/ai/prioritize'
import { isGoogleConnected, obtenerEventosGoogleProximos, sincronizarBorradosGoogle } from '@/lib/googleCalendar'
import type { Item, ItemPriorizado, PlantillaGym, RutinaGym } from '@/lib/types'

export interface HomeData {
  priorizados: ItemPriorizado[]
  proximosEventos: Item[]
  plantillas: PlantillaGym[]
  rutinas: RutinaGym[]
}

export async function getHomeData(): Promise<HomeData> {
  const googleConnected = await isGoogleConnected()

  if (googleConnected) {
    try {
      await sincronizarBorradosGoogle()
    } catch (e) {
      console.error('[getHomeData] Error al sincronizar borrados de Google:', e)
    }
  }

  const [items, plantillas, rutinas] = await Promise.all([
    getItemsActivos(),
    getPlantillasGym(),
    getRutinasGym(),
  ])

  let googleEventos: Item[] = []
  if (googleConnected) {
    try {
      // Eventos de Google Calendar desde el inicio de hoy hasta 90 días próximos (con caché)
      googleEventos = await obtenerEventosGoogleProximos(90)
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
  const proximosEventos = obtenerProximosEventos(todosItems)

  return {
    priorizados,
    proximosEventos,
    plantillas,
    rutinas,
  }
}
