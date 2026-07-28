import { getItemsActivos, getMiDiaItems } from '@/lib/actions/items'
import { addDays, format } from 'date-fns'
import MiDiaClient from './MiDiaClient'

export const metadata = { title: 'Mi día — Hermes' }
export const revalidate = 0 // Carga siempre fresca para planificación en tiempo real

export default async function MiDiaPage() {
  const ahora = new Date()
  const fechaHoy = format(ahora, 'yyyy-MM-dd')
  const fechaManana = format(addDays(ahora, 1), 'yyyy-MM-dd')

  const [itemsHoy, itemsManana, itemsActivos] = await Promise.all([
    getMiDiaItems(fechaHoy),
    getMiDiaItems(fechaManana),
    getItemsActivos(),
  ])

  // El backlog son todos los ítems activos que NO están ya planificados para hoy ni para mañana
  const idsPlanificados = new Set([
    ...itemsHoy.map(i => i.id),
    ...itemsManana.map(i => i.id),
  ])
  const backlog = itemsActivos.filter(i => !idsPlanificados.has(i.id))

  return (
    <MiDiaClient
      fechaHoy={fechaHoy}
      fechaManana={fechaManana}
      itemsHoyIniciales={itemsHoy}
      itemsMananaIniciales={itemsManana}
      backlogInicial={backlog}
    />
  )
}
