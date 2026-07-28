import { getItems } from '@/lib/actions/items'
import { getProyectos } from '@/lib/actions/proyectos'
import { clasificarItem } from '@/lib/ai/classify'
import InboxClient from './InboxClient'
import type { ClasificacionSugerida } from '@/lib/types'

export const metadata = {
  title: 'Inbox — Hermes',
  description: 'Captura rápida de ideas, tareas y notas sin procesar',
}
export const revalidate = 30

export default async function InboxPage() {
  const [itemsSinProcesar, proyectos] = await Promise.all([
    getItems({ estado: 'sin_procesar' }),
    getProyectos(),
  ])

  // Clasificamos en el servidor para que chrono-node NUNCA entre en el bundle del cliente
  const sugerencias: ClasificacionSugerida[] = itemsSinProcesar.map(item =>
    clasificarItem(item.titulo + ' ' + (item.descripcion ?? ''))
  )

  return <InboxClient items={itemsSinProcesar} proyectos={proyectos} sugerencias={sugerencias} />
}
