import { getProyectos } from '@/lib/actions/proyectos'
import { getItems } from '@/lib/actions/items'
import ProyectosClient from './ProyectosClient'

export const metadata = { title: 'Proyectos — Hermes' }
export const revalidate = 30

export default async function ProyectosPage() {
  const [proyectos, items] = await Promise.all([
    getProyectos(),
    getItems(),
  ])
  return <ProyectosClient proyectos={proyectos} todosLosItems={items} />
}
