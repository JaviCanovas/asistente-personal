import { Metadata } from 'next'
import HorarioSemanal from '@/components/horario/HorarioSemanal'
import { getItems } from '@/lib/actions/items'

export const metadata: Metadata = {
  title: 'Horario Semanal — Cuatrimestre 1 | Hermes',
  description: 'Horario semanal del Cuatrimestre 1 · Máster Big Data UMU, UCAM CF y Sports Data Campus.',
}

export const dynamic = 'force-dynamic'

export default async function HorarioPage() {
  const tasks = await getItems({ tipo: 'tarea' })
  return <HorarioSemanal initialTasks={tasks} />
}
