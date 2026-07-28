import { getItems } from '@/lib/actions/items'
import { generarResumenSemanal } from '@/lib/ai/prioritize'
import RevisionClient from './RevisionClient'

export const metadata = { title: 'Revisión semanal — Hermes' }
export const revalidate = 30

export default async function RevisionSemanalPage() {
  const items = await getItems()
  const resumen = generarResumenSemanal(items)
  return <RevisionClient resumen={resumen} />
}
