import { getItemsActivos } from '@/lib/actions/items'
import { getPlantillasGym, getRutinasGym } from '@/lib/actions/health'
import { priorizarItemsDeHoy } from '@/lib/ai/prioritize'
import HomeClient from './HomeClient'

export const metadata = { title: 'Inicio — Hermes' }
export const revalidate = 15 // Revalidación más frecuente para mantener la Home fresca

export default async function HomePage() {
  const [items, plantillas, rutinas] = await Promise.all([
    getItemsActivos(),
    getPlantillasGym(),
    getRutinasGym(),
  ])

  // Lógica de priorización de items de hoy
  const priorizados = priorizarItemsDeHoy(items)

  return (
    <HomeClient
      priorizados={priorizados}
      plantillas={plantillas}
      rutinas={rutinas}
    />
  )
}
