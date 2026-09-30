import { getHomeData } from '@/lib/actions/home'
import HomeClient from './HomeClient'

export const metadata = { title: 'Inicio — Hermes' }
export const revalidate = 30

export default async function HomePage() {
  const { priorizados, plantillas, rutinas } = await getHomeData()

  return (
    <HomeClient
      priorizados={priorizados}
      plantillas={plantillas}
      rutinas={rutinas}
    />
  )
}
