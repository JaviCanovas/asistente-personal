import { Suspense } from 'react'
import { getRutinasGym, getEjerciciosUnicos, getPlantillasGym, getUltimoHistorialPorEjercicio, getRecordsPersonales } from '@/lib/actions/health'
import GymClient from './GymClient'

export const metadata = { title: 'Gym — Hermes' }
export const revalidate = 30

export default async function GymPage() {
  const [rutinas, ejercicios, plantillas, historialPrevio, recordsPersonales] = await Promise.all([
    getRutinasGym(),
    getEjerciciosUnicos(),
    getPlantillasGym(),
    getUltimoHistorialPorEjercicio(),
    getRecordsPersonales(),
  ])
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px] text-slate-500">
        Cargando rutina...
      </div>
    }>
      <GymClient
        rutinas={rutinas}
        ejerciciosUnicos={ejercicios}
        plantillas={plantillas}
        historialPrevio={historialPrevio}
        recordsPersonales={recordsPersonales}
      />
    </Suspense>
  )
}
