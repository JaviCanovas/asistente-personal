import { getItems } from '@/lib/actions/items'
import { getProyectos } from '@/lib/actions/proyectos'
import IdeasClient from './IdeasClient'

export const metadata = { title: 'Ideas — Hermes' }
export const revalidate = 30

export default async function IdeasPage() {
  const [ideas, proyectos] = await Promise.all([
    getItems({ tipo: 'idea' }),
    getProyectos(),
  ])
  return <IdeasClient ideas={ideas} proyectos={proyectos} />
}
