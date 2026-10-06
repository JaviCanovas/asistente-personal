import { getHomeData } from '@/lib/actions/home'
import HomeClient from './HomeClient'

export const metadata = { title: 'Inicio — Hermes' }
export const revalidate = 0
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const { priorizados, proximosEventos, plantillas, rutinas } = await getHomeData()

  return (
    <HomeClient
      priorizados={priorizados}
      proximosEventos={proximosEventos}
      plantillas={plantillas}
      rutinas={rutinas}
    />
  )
}
