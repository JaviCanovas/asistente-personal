import { getItemsActivos } from '@/lib/actions/items'
import { priorizarItemsDeHoy, analizarCargaSemanal } from '@/lib/ai/prioritize'
import HoyClient from './HoyClient'

export const metadata = { title: 'Hoy — Hermes' }
export const revalidate = 30

export default async function HoyPage() {
  const items = await getItemsActivos()
  const priorizados = priorizarItemsDeHoy(items)
  const analisisCarga = analizarCargaSemanal(items)
  return <HoyClient priorizados={priorizados} analisisCarga={analisisCarga} />
}
