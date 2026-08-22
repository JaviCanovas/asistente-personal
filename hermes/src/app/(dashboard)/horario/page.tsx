import HorarioSemanal from '@/components/horario/HorarioSemanal'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Horario Semanal — Cuatrimestre 1 | Hermes',
  description: 'Horario semanal del Cuatrimestre 1 · Máster Big Data UMU, UCAM CF y Sports Data Campus.',
}

export default function HorarioPage() {
  return <HorarioSemanal />
}
