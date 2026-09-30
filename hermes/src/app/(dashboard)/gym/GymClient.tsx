'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  Dumbbell, Plus, Trash2, TrendingUp, Loader2, Check, Edit2, Play,
  ChevronDown, ChevronUp, Save, X, Timer, Copy, Trophy, AlertCircle, RotateCcw
} from 'lucide-react'
import type { RutinaGym, PlantillaGym, EjercicioPlantilla } from '@/lib/types'
import { formatFecha } from '@/lib/utils'
import {
  crearRutinaGym,
  eliminarRutinaGym,
  guardarPlantillaGym,
  sincronizarDescansos,
  guardarSesionEstructurada,
  type DetalleHistorialEjercicio,
  type EjercicioSesionInput,
  type SerieInput
} from '@/lib/actions/health'
import { enqueueOfflineAction, syncOfflineQueue } from '@/lib/offlineQueue'
import { useToast } from '@/components/ui/Toast'

const GymProgressionChart = dynamic(() => import('./GymProgressionChart'), {
  ssr: false,
  loading: () => (
    <div className="h-[220px] flex items-center justify-center">
      <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
    </div>
  ),
})

const STORAGE_KEY = 'hermes_active_workout'

function toSentenceCase(str: string): string {
  if (!str) return ''
  const s = str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  return s
    .replace(/(:\s*)(\w)/g, (_, sep, l) => sep + l.toUpperCase())
    .replace(/(\(\s*)(\w)/g, (_, sep, l) => sep + l.toUpperCase())
}

interface GymClientProps {
  rutinas: RutinaGym[]
  ejerciciosUnicos: string[]
  plantillas: PlantillaGym[]
  historialPrevio?: Record<string, DetalleHistorialEjercicio>
  recordsPersonales?: Record<string, number>
}

interface SerieSesion {
  numero_serie: number
  peso_kg: number
  repeticiones: number
  rir?: string
  completada: boolean
}

interface EjercicioActivo {
  nombre: string
  completado: boolean
  descanso?: string
  notasGuia?: string
  series: SerieSesion[]
}

interface SesionActivaData {
  plantillaId?: string
  nombreDia: string
  fecha: string
  ejercicios: EjercicioActivo[]
  iniciadoAt: number
}

export default function GymClient({
  rutinas: rutinasIniciales,
  ejerciciosUnicos,
  plantillas: plantillasIniciales,
  historialPrevio = {},
  recordsPersonales = {}
}: GymClientProps) {
  const { showToast } = useToast()
  const [tabActiva, setTabActiva] = useState<'historial' | 'plantillas'>('plantillas')
  const [ejercicioFiltro, setEjercicioFiltro] = useState(ejerciciosUnicos[0] ?? 'Press de Banca')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Formulario de registro único
  const [form, setForm] = useState({
    ejercicio: '', series: 3, repeticiones: '10', peso_kg: 0, fecha: new Date().toISOString().split('T')[0], notes: ''
  })

  // Gestión de plantillas
  const [plantillas, setPlantillas] = useState<PlantillaGym[]>(plantillasIniciales)
  useEffect(() => { setPlantillas(plantillasIniciales) }, [plantillasIniciales])
  const [diaExpandido, setDiaExpandido] = useState<string | null>(plantillasIniciales[0]?.id ?? null)
  const [editandoPlantillaId, setEditandoPlantillaId] = useState<string | null>(null)
  const [ejerciciosEditables, setEjerciciosEditables] = useState<any[]>([])
  const [sincronizando, setSincronizando] = useState(false)
  const [mensajeSync, setMensajeSync] = useState<string | null>(null)

  // Sesión activa y persistencia local
  const [sesionActiva, setSesionActiva] = useState<SesionActivaData | null>(null)
  const [sesionRecuperable, setSesionRecuperable] = useState<SesionActivaData | null>(null)
  const [estadoAutoGuardado, setEstadoAutoGuardado] = useState<'guardado' | 'guardando'>('guardado')
  const [timerRest, setTimerRest] = useState<{ activo: boolean; segundosRestantes: number; ejercicio: string } | null>(null)

  // Recuperar sesión pendiente de localStorage al montar
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as SesionActivaData
        if (parsed && parsed.ejercicios && parsed.ejercicios.length > 0) {
          setSesionRecuperable(parsed)
        }
      }
    } catch (e) {
      console.error('Error recuperando sesión local:', e)
    }
  }, [])

  // Auto-guardado en localStorage cada vez que cambia sesionActiva
  useEffect(() => {
    if (sesionActiva) {
      setEstadoAutoGuardado('guardando')
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sesionActiva))
        const timeout = setTimeout(() => setEstadoAutoGuardado('guardado'), 400)
        return () => clearTimeout(timeout)
      } catch (e) {
        console.error('Error guardando sesión en localStorage:', e)
      }
    }
  }, [sesionActiva])

  // Sincronización automática de entrenamientos guardados offline al recuperar cobertura
  useEffect(() => {
    const handleSync = () => {
      syncOfflineQueue({
        onSyncWorkout: async (payload) => {
          const res = await guardarSesionEstructurada(payload)
          return res.ok
        },
        onSuccessToast: (msg) => {
          showToast({ message: msg, type: 'success' })
        },
      })
    }

    if (typeof window !== 'undefined' && navigator.onLine) {
      handleSync()
    }

    window.addEventListener('online', handleSync)
    return () => window.removeEventListener('online', handleSync)
  }, [showToast])

  // Timer de descanso
  useEffect(() => {
    if (!timerRest || !timerRest.activo) return
    if (timerRest.segundosRestantes <= 0) {
      setTimerRest(null)
      return
    }
    const interval = setInterval(() => {
      setTimerRest(prev => {
        if (!prev || prev.segundosRestantes <= 1) return null
        return { ...prev, segundosRestantes: prev.segundosRestantes - 1 }
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [timerRest])

  // Iniciar entrenamiento automáticamente si viene en el query param 'iniciar'
  const searchParams = useSearchParams()
  const plantillaAIniciar = searchParams.get('iniciar')

  useEffect(() => {
    if (plantillaAIniciar && plantillas && plantillas.length > 0 && !sesionActiva) {
      const plantilla = plantillas.find(p => p.id === plantillaAIniciar)
      if (plantilla) {
        iniciarEntrenamiento(plantilla)
        setDiaExpandido(plantilla.id)
        setTabActiva('plantillas')
      }
    }
  }, [plantillaAIniciar, plantillas])

  // Sincronizar descansos en Supabase
  async function handleSincronizarDescansos() {
    setSincronizando(true)
    setMensajeSync(null)
    try {
      const result = await sincronizarDescansos()
      setMensajeSync(result.mensaje)
      setTimeout(() => setMensajeSync(null), 4000)
    } catch {
      setMensajeSync('Error al sincronizar')
    } finally {
      setSincronizando(false)
    }
  }

  // Activar edición de plantilla (Plan)
  function iniciarEdicionPlantilla(p: PlantillaGym) {
    setEditandoPlantillaId(p.id)
    setEjerciciosEditables(JSON.parse(JSON.stringify(p.ejercicios)))
  }

  // Guardar plantilla editada
  async function guardarCambiosPlantilla(p: PlantillaGym) {
    setGuardando(true)
    try {
      await guardarPlantillaGym(p.id, ejerciciosEditables)
      setPlantillas(prev => prev.map(item => item.id === p.id ? { ...item, ejercicios: ejerciciosEditables } : item))
      setEditandoPlantillaId(null)
      showToast({ message: 'Plantilla actualizada correctamente', type: 'success' })
    } catch (e) {
      console.error(e)
      showToast({ message: 'Error al actualizar plantilla', type: 'error' })
    } finally {
      setGuardando(false)
    }
  }

  const handleEditEjercicioField = (index: number, field: string, value: any) => {
    setEjerciciosEditables(prev => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  // Helper para parsear tiempo de descanso en segundos
  function parseDescansoSegundos(descStr?: string): number {
    if (!descStr) return 90
    if (descStr.includes('min')) {
      const m = parseFloat(descStr)
      return isNaN(m) ? 90 : Math.round(m * 60)
    }
    const s = parseInt(descStr)
    return isNaN(s) ? 90 : s
  }

  // Iniciar entrenamiento estructurado desde una plantilla
  function iniciarEntrenamiento(p: PlantillaGym) {
    const nuevosEjercicios: EjercicioActivo[] = p.ejercicios.map((ej: EjercicioPlantilla) => {
      const prev = historialPrevio[ej.nombre.trim().toLowerCase()]
      const numSeries = ej.series || 3
      
      // Parsear repeticiones base recomendadas (ej. "5-6" -> 6, "10-12" -> 10, "15" -> 15)
      const baseReps = parseInt(ej.repeticiones) || 10
      const basePeso = ej.peso_kg || 0

      // Si existe desglose de la última sesión, usarlo como punto de partida
      let seriesGeneradas: SerieSesion[] = []
      if (prev && prev.seriesDetalle && prev.seriesDetalle.length > 0) {
        seriesGeneradas = prev.seriesDetalle.slice(0, numSeries).map(s => ({
          numero_serie: s.numero_serie,
          peso_kg: s.peso_kg > 0 ? s.peso_kg : basePeso,
          repeticiones: s.repeticiones > 0 ? s.repeticiones : baseReps,
          rir: s.rir || '1',
          completada: false
        }))
      }

      // Si faltan series para alcanzar numSeries, rellenar
      while (seriesGeneradas.length < numSeries) {
        seriesGeneradas.push({
          numero_serie: seriesGeneradas.length + 1,
          peso_kg: basePeso,
          repeticiones: baseReps,
          rir: '1',
          completada: false
        })
      }

      return {
        nombre: ej.nombre,
        completado: true,
        descanso: ej.descanso,
        notasGuia: ej.notas,
        series: seriesGeneradas
      }
    })

    const nuevaSesion: SesionActivaData = {
      plantillaId: p.id,
      nombreDia: p.nombre_dia,
      fecha: new Date().toISOString().split('T')[0],
      ejercicios: nuevosEjercicios,
      iniciadoAt: Date.now()
    }

    setSesionActiva(nuevaSesion)
    setSesionRecuperable(null)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevaSesion))
  }

  // Reanudar sesión recuperada de localStorage
  function reanudarSesionRecuperada() {
    if (sesionRecuperable) {
      setSesionActiva(sesionRecuperable)
      setSesionRecuperable(null)
    }
  }

  // Descartar sesión recuperada
  function descartarSesionRecuperada() {
    localStorage.removeItem(STORAGE_KEY)
    setSesionRecuperable(null)
  }

  // Modificar serie individual
  function actualizarSerie(ejIdx: number, serieIdx: number, campo: keyof SerieSesion, valor: any) {
    if (!sesionActiva) return
    setSesionActiva(prev => {
      if (!prev) return null
      const copy = { ...prev, ejercicios: [...prev.ejercicios] }
      const ejCopy = { ...copy.ejercicios[ejIdx], series: [...copy.ejercicios[ejIdx].series] }
      ejCopy.series[serieIdx] = { ...ejCopy.series[serieIdx], [campo]: valor }

      // Si se marca como completada, disparar el timer de descanso
      if (campo === 'completada' && valor === true && ejCopy.descanso) {
        const segs = parseDescansoSegundos(ejCopy.descanso)
        setTimerRest({ activo: true, segundosRestantes: segs, ejercicio: ejCopy.nombre })
      }

      copy.ejercicios[ejIdx] = ejCopy
      return copy
    })
  }

  // Añadir serie a un ejercicio
  function agregarSerie(ejIdx: number) {
    if (!sesionActiva) return
    setSesionActiva(prev => {
      if (!prev) return null
      const copy = { ...prev, ejercicios: [...prev.ejercicios] }
      const ej = copy.ejercicios[ejIdx]
      const ultimaSerie = ej.series[ej.series.length - 1]
      const nuevaSerie: SerieSesion = {
        numero_serie: ej.series.length + 1,
        peso_kg: ultimaSerie ? ultimaSerie.peso_kg : 0,
        repeticiones: ultimaSerie ? ultimaSerie.repeticiones : 10,
        rir: ultimaSerie ? ultimaSerie.rir : '1',
        completada: false
      }
      copy.ejercicios[ejIdx] = { ...ej, series: [...ej.series, nuevaSerie] }
      return copy
    })
  }

  // Eliminar última serie de un ejercicio
  function eliminarSerie(ejIdx: number) {
    if (!sesionActiva) return
    setSesionActiva(prev => {
      if (!prev) return null
      const copy = { ...prev, ejercicios: [...prev.ejercicios] }
      const ej = copy.ejercicios[ejIdx]
      if (ej.series.length <= 1) return prev
      copy.ejercicios[ejIdx] = { ...ej, series: ej.series.slice(0, -1) }
      return copy
    })
  }

  // Copiar valores de la sesión anterior en 1 clic
  function copiarSesionAnterior(ejIdx: number) {
    if (!sesionActiva) return
    const ej = sesionActiva.ejercicios[ejIdx]
    const prev = historialPrevio[ej.nombre.trim().toLowerCase()]
    if (!prev || !prev.seriesDetalle || prev.seriesDetalle.length === 0) {
      showToast({ message: 'No hay datos anteriores registrados para este ejercicio', type: 'info' })
      return
    }

    setSesionActiva(actual => {
      if (!actual) return null
      const copy = { ...actual, ejercicios: [...actual.ejercicios] }
      const nuevasSeries = prev.seriesDetalle.map(s => ({
        numero_serie: s.numero_serie,
        peso_kg: s.peso_kg,
        repeticiones: s.repeticiones,
        rir: s.rir || '1',
        completada: false
      }))
      copy.ejercicios[ejIdx] = { ...ej, series: nuevasSeries }
      return copy
    })

    showToast({ message: `Copiados datos anteriores de "${ej.nombre}"`, type: 'success' })
  }

  // Finalizar y guardar sesión en Supabase y limpiar localStorage
  async function finalizarEntrenamiento() {
    if (!sesionActiva) return
    setGuardando(true)

    const duracionSegundos = Math.round((Date.now() - sesionActiva.iniciadoAt) / 1000)
    
    const payloadEjercicios: EjercicioSesionInput[] = sesionActiva.ejercicios.map(ej => ({
      nombre: ej.nombre,
      completado: ej.completado,
      descanso: ej.descanso,
      notasGuia: ej.notasGuia,
      series: ej.series.map(s => ({
        numero_serie: s.numero_serie,
        peso_kg: s.peso_kg,
        repeticiones: s.repeticiones,
        rir: s.rir,
        completada: s.completada
      }))
    }))

    const sessionPayload = {
      fecha: sesionActiva.fecha,
      plantillaId: sesionActiva.plantillaId,
      nombreDia: sesionActiva.nombreDia,
      duracionSegundos,
      ejercicios: payloadEjercicios
    }

    try {
      // Si el móvil está sin cobertura (sótano del gym), encolar en local inmediatamente
      if (typeof window !== 'undefined' && !navigator.onLine) {
        enqueueOfflineAction('guardar_entrenamiento', sessionPayload)
        localStorage.removeItem(STORAGE_KEY)
        setSesionActiva(null)
        setTimerRest(null)
        showToast({
          message: 'Sin cobertura en el gym: Guardado en tu móvil. Se sincronizará automáticamente al volver Internet.',
          type: 'info',
          duration: 7000
        })
        setTabActiva('historial')
        return
      }

      const res = await guardarSesionEstructurada(sessionPayload)

      if (res.ok) {
        localStorage.removeItem(STORAGE_KEY)
        setSesionActiva(null)
        setTimerRest(null)
        showToast({
          message: '¡Entrenamiento completado y guardado con éxito!',
          type: 'success',
          duration: 6000
        })
        setTabActiva('historial')
      } else {
        showToast({ message: res.mensaje || 'Error al guardar el entrenamiento', type: 'error' })
      }
    } catch (err: any) {
      console.warn('Fallo de red al guardar entrenamiento, encolando localmente:', err)
      enqueueOfflineAction('guardar_entrenamiento', {
        fecha: sesionActiva.fecha,
        plantillaId: sesionActiva.plantillaId,
        nombreDia: sesionActiva.nombreDia,
        duracionSegundos: Math.round((Date.now() - sesionActiva.iniciadoAt) / 1000),
        ejercicios: payloadEjercicios
      })
      localStorage.removeItem(STORAGE_KEY)
      setSesionActiva(null)
      setTimerRest(null)
      showToast({
        message: 'Guardado localmente sin conexión. Se sincronizará en cuanto haya cobertura.',
        type: 'info',
        duration: 7000
      })
      setTabActiva('historial')
    } finally {
      setGuardando(false)
    }
  }

  // Cancelar sesión activa pidiendo confirmación
  function cancelarSesionActiva() {
    if (confirm('¿Seguro que deseas salir del entrenamiento? Tu progreso guardado en este dispositivo se mantendrá.')) {
      setSesionActiva(null)
      setTimerRest(null)
    }
  }

  // Descartar completamente el entrenamiento en curso
  function descartarSesionDefinitiva() {
    if (confirm('¿Descartar este entrenamiento por completo? Se borrarán los datos no guardados.')) {
      localStorage.removeItem(STORAGE_KEY)
      setSesionActiva(null)
      setTimerRest(null)
      showToast({ message: 'Entrenamiento descartado', type: 'info' })
    }
  }

  // Guardar formulario de registro único
  async function handleGuardarRegistroUnico() {
    if (!form.ejercicio.trim()) return
    setGuardando(true)
    try {
      await crearRutinaGym({
        ejercicio: form.ejercicio.trim(),
        series: form.series,
        repeticiones: form.repeticiones?.trim() || undefined,
        peso_kg: form.peso_kg || undefined,
        fecha: form.fecha,
        notas: form.notes.trim() || undefined,
      })
      setMostrarFormulario(false)
      setForm({ ejercicio: '', series: 3, repeticiones: '10', peso_kg: 0, fecha: new Date().toISOString().split('T')[0], notes: '' })
      showToast({ message: 'Ejercicio registrado en el historial', type: 'success' })
    } finally {
      setGuardando(false)
    }
  }

  // Helper de parseo seguro de números en inputs
  function parseInputNumber(val: string, fallback: number = 0): number {
    const cleaned = val.replace(',', '.')
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? fallback : parsed
  }

  // Datos para la gráfica de progresión
  const datosGrafica = rutinasIniciales
    .filter(r => r.ejercicio.toLowerCase() === ejercicioFiltro.toLowerCase() && r.peso_kg)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map(r => ({
      fecha: formatFecha(r.fecha, 'd MMM'),
      peso: r.peso_kg,
      series: r.series,
      reps: r.repeticiones
    }))

  // Agrupar rutinas por fecha
  const porFecha = rutinasIniciales.reduce<Record<string, RutinaGym[]>>((acc, r) => {
    if (!acc[r.fecha]) acc[r.fecha] = []
    acc[r.fecha].push(r)
    return acc
  }, {})

  const fechasOrdenadas = Object.keys(porFecha).sort((a, b) => b.localeCompare(a)).slice(0, 14)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Banner de sesión recuperable si existe en localStorage */}
      {sesionRecuperable && !sesionActiva && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-sm text-neutral-100">
                Entrenamiento en curso recuperado: <span className="text-amber-300">{sesionRecuperable.nombreDia}</span>
              </p>
              <p className="text-xs text-neutral-400">
                Guardado en este dispositivo ({sesionRecuperable.fecha}) · {sesionRecuperable.ejercicios.length} ejercicios
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={descartarSesionRecuperada}
              className="btn btn-ghost btn-sm text-xs text-neutral-400 hover:text-white"
            >
              Descartar
            </button>
            <button
              onClick={reanudarSesionRecuperada}
              className="btn btn-primary btn-sm text-xs bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Continuar entreno</span>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-header pb-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: 'rgba(16,185,129,0.1)' }}>
            <Dumbbell className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-[32px] font-bold" style={{ letterSpacing: 0, lineHeight: 1.2 }}>Gym & Entrenamiento</h1>
            <p className="text-sm text-neutral-400">Control estructurado de series, RIR y progresión</p>
          </div>
        </div>

        {/* Selector de Pestañas */}
        <div
          className="flex gap-1.5 p-1 rounded-xl shadow-inner backdrop-blur-md self-start sm:self-auto"
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <button
            onClick={() => setTabActiva('plantillas')}
            className="group relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 cursor-pointer select-none border"
            style={
              tabActiva === 'plantillas'
                ? {
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.04) 100%)',
                    color: '#34d399',
                    borderColor: 'rgba(16, 185, 129, 0.25)',
                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.12)',
                  }
                : {
                    color: 'var(--text-secondary)',
                    borderColor: 'transparent',
                    background: 'transparent',
                  }
            }
          >
            <Dumbbell className="w-4 h-4 transition-all duration-300 transform group-hover:scale-110" />
            <span>Mis Rutinas</span>
          </button>

          <button
            onClick={() => setTabActiva('historial')}
            className="group relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 cursor-pointer select-none border"
            style={
              tabActiva === 'historial'
                ? {
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.04) 100%)',
                    color: '#a78bfa',
                    borderColor: 'rgba(139, 92, 246, 0.25)',
                    boxShadow: '0 4px 15px rgba(139, 92, 246, 0.12)',
                  }
                : {
                    color: 'var(--text-secondary)',
                    borderColor: 'transparent',
                    background: 'transparent',
                  }
            }
          >
            <TrendingUp className="w-4 h-4 transition-all duration-300 transform group-hover:scale-110" />
            <span>Historial & Gráficas</span>
          </button>
        </div>
      </div>

      {/* VISTA DE PLANTILLAS Y RUTINAS */}
      {tabActiva === 'plantillas' && (
        <div className="space-y-6">
          {/* Barra de sincronización de descansos */}
          <div className="flex items-center justify-between p-3 rounded-xl border" style={{ background: 'rgba(16,185,129,0.04)', borderColor: 'rgba(16,185,129,0.15)' }}>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">⏱️ Tiempos de descanso optimizados para fuerza e hipertrofia</span>
              {mensajeSync && <span className="text-xs text-emerald-400 font-medium">{mensajeSync}</span>}
            </div>
            <button
              onClick={handleSincronizarDescansos}
              disabled={sincronizando}
              className="btn btn-ghost btn-sm text-xs py-1 px-3 flex items-center gap-1.5"
              style={{ color: '#34d399', borderColor: 'rgba(16,185,129,0.3)' }}
            >
              {sincronizando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Sincronizar descansos
            </button>
          </div>

          {plantillas.map(p => {
            const esExpandido = diaExpandido === p.id
            const esEditando = editandoPlantillaId === p.id

            return (
              <div key={p.id} data-testid="card" className="card p-5 sm:p-6 rounded-2xl">
                {/* Cabecera del Día */}
                <div
                  onClick={() => !esEditando && setDiaExpandido(esExpandido ? null : p.id)}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    esExpandido ? 'pb-4 border-b border-neutral-800' : 'cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-xs shrink-0">
                      D{p.orden}
                    </span>
                    <h3 className="font-bold text-sm sm:text-base text-neutral-100 line-clamp-1">{toSentenceCase(p.nombre_dia)}</h3>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      {esEditando ? (
                        <button
                          onClick={() => guardarCambiosPlantilla(p)}
                          className="btn btn-primary btn-sm flex items-center gap-1.5 text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Guardar Plan</span>
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => iniciarEdicionPlantilla(p)}
                            className="btn btn-ghost btn-sm flex items-center gap-1.5 text-[11px] sm:text-xs py-1 sm:py-1.5 px-2 sm:px-3 text-neutral-300"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Editar Plan</span>
                          </button>
                          <button
                            onClick={() => iniciarEntrenamiento(p)}
                            className="btn btn-primary btn-sm flex items-center gap-1.5 text-[11px] sm:text-xs py-1 sm:py-1.5 px-3 text-white"
                            style={{ background: 'var(--accent)' }}
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>Comenzar</span>
                          </button>
                        </>
                      )}
                    </div>

                    {!esEditando && (
                      <button
                        onClick={() => setDiaExpandido(esExpandido ? null : p.id)}
                        className="p-1 text-neutral-400 hover:text-white"
                      >
                        {esExpandido ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Contenido / Ejercicios del Plan */}
                {esExpandido && (
                  <div className="pt-4">
                    {esEditando ? (
                      <div className="space-y-4">
                        <p className="text-xs text-neutral-400 mb-2">
                          Edita el plan de entrenamiento base (series objetivo, rangos de repetición y descansos recomendados):
                        </p>
                        {ejerciciosEditables.map((ej, index) => (
                          <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 bg-neutral-900/60 rounded-xl border border-neutral-800">
                            <div className="col-span-1 md:col-span-4">
                              <label className="label text-[10px] mb-1">Nombre</label>
                              <input
                                value={ej.nombre}
                                onChange={e => handleEditEjercicioField(index, 'nombre', e.target.value)}
                                className="input text-xs py-1.5"
                              />
                            </div>
                            <div className="col-span-1 md:col-span-5 grid grid-cols-3 gap-2">
                              <div>
                                <label className="label text-[10px] mb-1 text-center">Series</label>
                                <input
                                  type="number"
                                  value={ej.series}
                                  onChange={e => handleEditEjercicioField(index, 'series', parseInt(e.target.value) || 0)}
                                  className="input text-xs py-1.5 text-center"
                                />
                              </div>
                              <div>
                                <label className="label text-[10px] mb-1 text-center">Reps</label>
                                <input
                                  value={ej.repeticiones}
                                  onChange={e => handleEditEjercicioField(index, 'repeticiones', e.target.value)}
                                  className="input text-xs py-1.5 text-center"
                                />
                              </div>
                              <div>
                                <label className="label text-[10px] mb-1 text-center">Peso base (kg)</label>
                                <input
                                  type="number"
                                  step="0.5"
                                  value={ej.peso_kg}
                                  onChange={e => handleEditEjercicioField(index, 'peso_kg', parseFloat(e.target.value) || 0)}
                                  className="input text-xs py-1.5 text-center"
                                />
                              </div>
                            </div>
                            <div className="col-span-1 md:col-span-3">
                              <label className="label text-[10px] mb-1">Notas guía</label>
                              <input
                                value={ej.notas || ''}
                                onChange={e => handleEditEjercicioField(index, 'notas', e.target.value)}
                                className="input text-xs py-1.5"
                                placeholder="Notas técnicas"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Vista desktop & mobile con referencias de última sesión */}
                        <div className="grid grid-cols-1 gap-3">
                          {p.ejercicios.map((ej: EjercicioPlantilla, index: number) => {
                            const prev = historialPrevio[ej.nombre.trim().toLowerCase()]
                            const pr = recordsPersonales[ej.nombre.trim().toLowerCase()]
                            return (
                              <div
                                key={index}
                                data-testid="list-row"
                                className="p-3.5 min-h-[44px] bg-neutral-900/40 rounded-xl border border-neutral-800/80 hover:border-neutral-700/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-sm text-neutral-100">{ej.nombre}</span>
                                    {pr && pr > 0 && (
                                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-500/20">
                                        <Trophy className="w-3 h-3" /> PR: {pr} kg
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-neutral-400 flex items-center gap-2 flex-wrap">
                                    <span>Plan: <strong className="text-neutral-300">{ej.series} series × {ej.repeticiones} reps</strong></span>
                                    <span>·</span>
                                    <span>Peso sugerido: <strong className="text-emerald-400">{ej.peso_kg > 0 ? `${ej.peso_kg} kg` : 'Libre'}</strong></span>
                                    {ej.descanso && (
                                      <>
                                        <span>·</span>
                                        <span className="text-amber-400/90 font-medium">⏱️ {ej.descanso}</span>
                                      </>
                                    )}
                                  </div>
                                  {prev && (
                                    <div className="text-[11px] text-neutral-400 bg-neutral-950/40 px-2.5 py-1 rounded-lg border border-neutral-800/50 inline-block">
                                      Última sesión ({formatFecha(prev.fecha, 'd MMM')}): <span className="text-neutral-200 font-medium">{prev.resumenTexto}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* VISTA DE HISTORIAL Y GRÁFICAS */}
      {tabActiva === 'historial' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Gráfica de progresión */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-sm">Progresión de peso</span>
                </div>
                <select
                  value={ejercicioFiltro}
                  onChange={e => setEjercicioFiltro(e.target.value)}
                  className="input text-xs py-1"
                  style={{ maxWidth: 180 }}
                >
                  {ejerciciosUnicos.length > 0 ? (
                    ejerciciosUnicos.map(ej => (
                      <option key={ej} value={ej} style={{ background: '#1c1f2e' }}>{ej}</option>
                    ))
                  ) : (
                    <option value="Press de Banca" style={{ background: '#1c1f2e' }}>Press de Banca</option>
                  )}
                </select>
              </div>

              <GymProgressionChart data={datosGrafica} />
            </div>

            {/* Histórico de sesiones */}
            <div className="card p-5 overflow-y-auto" style={{ maxHeight: 420 }}>
              <div className="flex items-center justify-between mb-4">
                <p className="font-semibold text-sm">Sesiones registradas</p>
                <button
                  onClick={() => setMostrarFormulario(true)}
                  className="btn btn-ghost btn-sm text-xs py-1 px-3"
                >
                  <Plus className="w-3.5 h-3.5" /> Registrar único
                </button>
              </div>

              {fechasOrdenadas.length === 0 ? (
                <div className="empty-state py-8">
                  <Dumbbell className="w-8 h-8 text-neutral-600" />
                  <p className="text-sm">No has registrado ningún ejercicio aún.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {fechasOrdenadas.map(fecha => (
                    <div key={fecha}>
                      <p className="text-xs font-semibold mb-2 text-neutral-400 capitalize">
                        {formatFecha(fecha, "EEEE, d 'de' MMMM")}
                      </p>
                      <div className="space-y-1.5">
                        {porFecha[fecha].map(r => (
                          <div
                            key={r.id}
                            className="flex items-center justify-between p-3 rounded-xl group hover:border-neutral-700 border border-transparent transition-colors"
                            style={{ background: 'var(--bg-elevated)' }}
                          >
                            <div>
                              <span className="text-sm font-semibold text-neutral-200">{r.ejercicio}</span>
                              <span className="text-xs ml-3 text-neutral-400">
                                {r.series} × {r.repeticiones ?? '—'} reps
                                {r.peso_kg ? ` · ${r.peso_kg} kg` : ''}
                                {r.notas ? ` · ${r.notas}` : ''}
                              </span>
                            </div>
                            <button
                              onClick={() => eliminarRutinaGym(r.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-neutral-800 transition-all text-red-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ENTRENAMIENTO EN CURSO (LOG SESIÓN ESTRUCTURADA) */}
      {sesionActiva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
          <div
            className="card w-full max-w-3xl animate-fade-in flex flex-col shadow-2xl overflow-hidden"
            style={{ background: 'var(--bg-surface)', maxHeight: '92vh' }}
          >
            {/* Header del Modal con Estado de Auto-Guardado y Cronómetro */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base sm:text-lg text-emerald-400 flex items-center gap-2">
                    <span>{sesionActiva.nombreDia}</span>
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {estadoAutoGuardado === 'guardando' ? '💾 Guardando...' : '🟢 Guardado local'}
                    </span>
                  </h2>
                  <p className="text-xs text-neutral-400">Registro serie a serie · Auto-recuperación activa</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Timer de descanso flotante en cabecera */}
                {timerRest && timerRest.activo && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 animate-pulse">
                    <Timer className="w-4 h-4 text-amber-400" />
                    <span>
                      Descanso: {Math.floor(timerRest.segundosRestantes / 60)}:{String(timerRest.segundosRestantes % 60).padStart(2, '0')}
                    </span>
                    <button
                      onClick={() => setTimerRest(null)}
                      className="ml-1 hover:text-white text-neutral-400"
                      title="Detener temporizador"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <button
                  onClick={cancelarSesionActiva}
                  className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
                  title="Cerrar modal (mantiene progreso)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contenedor scrolleable de ejercicios */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
              {/* Selector de fecha */}
              <div className="flex items-center justify-between gap-3 bg-neutral-900/60 p-3 rounded-xl border border-neutral-800">
                <span className="text-xs font-semibold text-neutral-300">Fecha del entrenamiento:</span>
                <input
                  type="date"
                  value={sesionActiva.fecha}
                  onChange={e => setSesionActiva(prev => prev ? { ...prev, fecha: e.target.value } : null)}
                  className="input text-xs py-1"
                  style={{ maxWidth: 160, colorScheme: 'dark' }}
                />
              </div>

              {/* Lista de ejercicios con series individuales */}
              {sesionActiva.ejercicios.map((ej, ejIdx) => {
                const prev = historialPrevio[ej.nombre.trim().toLowerCase()]
                const pr = recordsPersonales[ej.nombre.trim().toLowerCase()] || 0

                return (
                  <div
                    key={ejIdx}
                    className="p-4 rounded-xl border bg-neutral-900/50 border-neutral-800 space-y-3"
                  >
                    {/* Fila del ejercicio: Nombre + Descanso + Acciones */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800/80 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-neutral-100">{ej.nombre}</h4>
                          {ej.descanso && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              ⏱️ {ej.descanso}
                            </span>
                          )}
                        </div>
                        {prev && (
                          <div className="text-[11px] text-neutral-400 mt-0.5">
                            Última sesión ({formatFecha(prev.fecha, 'd MMM')}):{' '}
                            <span className="text-emerald-400 font-medium">{prev.resumenTexto}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {prev && (
                          <button
                            type="button"
                            onClick={() => copiarSesionAnterior(ejIdx)}
                            className="btn btn-ghost btn-sm text-[11px] py-1 px-2.5 flex items-center gap-1 text-neutral-300 hover:text-emerald-300"
                            title="Rellenar series con los valores de la última vez"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copiar anterior</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => agregarSerie(ejIdx)}
                          className="btn btn-ghost btn-sm text-[11px] py-1 px-2.5 flex items-center gap-1 text-emerald-400 hover:bg-emerald-500/10"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Serie</span>
                        </button>
                      </div>
                    </div>

                    {/* Tabla de series estructurada */}
                    <div className="space-y-2">
                      <div className="grid grid-cols-12 gap-2 text-[10px] uppercase font-semibold text-neutral-400 px-2">
                        <span className="col-span-2 text-center">Serie</span>
                        <span className="col-span-3 text-center">Peso (kg)</span>
                        <span className="col-span-3 text-center">Reps</span>
                        <span className="col-span-2 text-center">RIR</span>
                        <span className="col-span-2 text-center">Listo</span>
                      </div>

                      {ej.series.map((serie, serieIdx) => {
                        const esPR = pr > 0 && serie.peso_kg > pr
                        return (
                          <div
                            key={serieIdx}
                            className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg border transition-all min-h-[44px] ${
                              serie.completada
                                ? 'bg-emerald-950/20 border-emerald-500/30'
                                : 'bg-neutral-950/40 border-neutral-800/80 hover:border-neutral-700'
                            }`}
                          >
                            {/* Número de Serie */}
                            <div className="col-span-2 flex items-center justify-center">
                              <span className="w-6 h-6 rounded-full bg-neutral-800 text-neutral-300 font-bold text-xs flex items-center justify-center">
                                {serie.numero_serie}
                              </span>
                            </div>

                            {/* Peso (kg) con soporte para coma decimal y auto-selección */}
                            <div className="col-span-3">
                              <div className="relative">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={serie.peso_kg === 0 ? '' : serie.peso_kg}
                                  placeholder="0"
                                  onFocus={e => e.target.select()}
                                  onChange={e => {
                                    const val = parseInputNumber(e.target.value, 0)
                                    actualizarSerie(ejIdx, serieIdx, 'peso_kg', val)
                                  }}
                                  className="input text-xs text-center py-1.5 px-1 font-semibold text-neutral-100"
                                />
                                {esPR && (
                                  <span
                                    title="¡Nuevo Récord Personal!"
                                    className="absolute -top-1 -right-1 flex h-2 w-2"
                                  >
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Repeticiones */}
                            <div className="col-span-3">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={serie.repeticiones === 0 ? '' : serie.repeticiones}
                                placeholder="10"
                                onFocus={e => e.target.select()}
                                onChange={e => {
                                  const val = parseInt(e.target.value) || 0
                                  actualizarSerie(ejIdx, serieIdx, 'repeticiones', val)
                                }}
                                className="input text-xs text-center py-1.5 px-1 font-semibold text-neutral-100"
                              />
                            </div>

                            {/* RIR (Repeticiones en Reserva) */}
                            <div className="col-span-2">
                              <input
                                type="text"
                                value={serie.rir ?? ''}
                                placeholder="1"
                                onFocus={e => e.target.select()}
                                onChange={e => actualizarSerie(ejIdx, serieIdx, 'rir', e.target.value)}
                                className="input text-xs text-center py-1.5 px-1 text-neutral-300"
                              />
                            </div>

                            {/* Checkbox de serie completada */}
                            <div className="col-span-2 flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => actualizarSerie(ejIdx, serieIdx, 'completada', !serie.completada)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                  serie.completada
                                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                                    : 'bg-neutral-800 text-neutral-500 hover:text-neutral-300'
                                }`}
                              >
                                <Check className={`w-4 h-4 ${serie.completada ? 'stroke-[3]' : ''}`} />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Botón para quitar última serie si hay más de 1 */}
                    {ej.series.length > 1 && (
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => eliminarSerie(ejIdx)}
                          className="text-[10px] text-neutral-500 hover:text-red-400 transition-colors"
                        >
                          Quitar última serie
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Footer de Acciones del Modal */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 sm:p-5 border-t shrink-0" style={{ borderColor: 'var(--border)' }}>
              <button
                type="button"
                onClick={descartarSesionDefinitiva}
                className="text-xs text-red-400 hover:text-red-300 hover:underline cursor-pointer"
              >
                Descartar entrenamiento
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={cancelarSesionActiva}
                  className="btn btn-ghost flex-1 sm:flex-none text-xs"
                >
                  Minimizar
                </button>
                <button
                  type="button"
                  onClick={finalizarEntrenamiento}
                  disabled={guardando}
                  className="btn btn-primary flex-1 sm:flex-none flex items-center justify-center gap-2 text-xs py-2 px-5 text-white"
                  style={{ background: 'var(--accent)' }}
                >
                  {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Finalizar y Guardar Sesión</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de registro de único ejercicio */}
      {mostrarFormulario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="card w-full max-w-sm animate-fade-in">
            <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="font-semibold text-sm">Registrar ejercicio único</h2>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Ejercicio *
                </label>
                <input
                  value={form.ejercicio}
                  onChange={e => setForm(f => ({ ...f, ejercicio: e.target.value }))}
                  className="input"
                  placeholder="Ej: Sentadillas"
                  autoFocus
                  list="ejercicios-list"
                />
                <datalist id="ejercicios-list">
                  {ejerciciosUnicos.map(ej => <option key={ej} value={ej} />)}
                </datalist>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Series</label>
                  <input
                    type="number"
                    value={form.series}
                    onFocus={e => (e.target as HTMLInputElement).select()}
                    onChange={e => setForm(f => ({ ...f, series: parseInt(e.target.value) || 0 }))}
                    className="input text-center"
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Reps</label>
                  <input
                    type="text"
                    value={form.repeticiones}
                    onFocus={e => (e.target as HTMLInputElement).select()}
                    onChange={e => setForm(f => ({ ...f, repeticiones: e.target.value }))}
                    className="input text-center"
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Peso (kg)</label>
                  <input
                    type="number"
                    value={form.peso_kg}
                    onFocus={e => (e.target as HTMLInputElement).select()}
                    onChange={e => setForm(f => ({ ...f, peso_kg: parseFloat(e.target.value) || 0 }))}
                    className="input text-center"
                    min={0}
                    step={0.5}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Fecha</label>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                  className="input"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            </div>
            <div className="flex gap-2 p-5 border-t" style={{ borderColor: 'var(--border)' }}>
              <button onClick={() => setMostrarFormulario(false)} className="btn btn-ghost flex-1">Cancelar</button>
              <button
                onClick={handleGuardarRegistroUnico}
                disabled={guardando || !form.ejercicio.trim()}
                className="btn btn-primary flex-1"
              >
                {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
