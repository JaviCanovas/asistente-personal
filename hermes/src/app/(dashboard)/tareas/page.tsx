import { getItems } from '@/lib/actions/items'
import { getProyectos } from '@/lib/actions/proyectos'
import TareasClient from './TareasClient'

export const metadata = { title: 'Tareas — Hermes' }
export const revalidate = 30

export default async function TareasPage() {
  const [tareas, proyectos] = await Promise.all([
    getItems({ tipo: 'tarea' }),
    getProyectos(),
  ])
  return <TareasClient tareas={tareas} proyectos={proyectos} />
}
