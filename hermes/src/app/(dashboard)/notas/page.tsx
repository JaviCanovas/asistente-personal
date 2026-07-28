import { getItems } from '@/lib/actions/items'
import { getProyectos } from '@/lib/actions/proyectos'
import NotasClient from './NotasClient'

export const metadata = { title: 'Notas — Hermes' }
export const revalidate = 30

export default async function NotasPage() {
  const [notas, proyectos] = await Promise.all([
    getItems({ tipo: 'nota' }),
    getProyectos(),
  ])
  return <NotasClient notas={notas} proyectos={proyectos} />
}
