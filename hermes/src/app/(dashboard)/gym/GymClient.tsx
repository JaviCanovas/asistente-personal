'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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
const STORAGE_KEY_REST_TIMER = 'hermes_active_rest_timer'

// Reproducir chime acústico sintetizado (Web Audio API) al terminar el descanso
function reproducirChimeFinDescanso() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    if (ctx.state === 'suspended') {
      ctx.resume()
    }
    const now = ctx.currentTime
    // Tres pitidos agradables: dos de 880Hz y uno de 1320Hz
    const tiempos = [0, 0.18, 0.36]
    tiempos.forEach((t, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(i === 2 ? 1320 : 880, now + t)
      gain.gain.setValueAtTime(0.3, now + t)
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + (i === 2 ? 0.3 : 0.14))
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + t)
      osc.stop(now + t + (i === 2 ? 0.3 : 0.14))
    })
  } catch (e) {
    console.warn('AudioContext no disponible o bloqueado:', e)
  }
}

// Desbloquear audio en gesto del usuario
function desbloquearAudio() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    if (ctx.state === 'suspended') {
      ctx.resume()
    }
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    gain.gain.value = 0.0001
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(0)
    osc.stop(0.001)
  } catch {}
}

// Disparar alertas multicanal: audio, vibración háptica y notificación nativa
function dispararNotificacionFinDescanso(ejercicio: string) {
  reproducirChimeFinDescanso()
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([200, 100, 200, 100, 400])
    } catch {}
  }
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification('⏱️ ¡Descanso completado!', {
            body: `Tiempo de descanso cumplido para ${ejercicio}. ¡A por la siguiente serie!`,
            icon: '/icon-192.png',
            badge: '/favicon-32.png',
            tag: 'gym-rest-timer',
            renotify: true
          } as any)
        }).catch(() => {
          new Notification('⏱️ ¡Descanso completado!', {
            body: `Tiempo de descanso cumplido para ${ejercicio}. ¡A por la siguiente serie!`,
            icon: '/icon-192.png'
          })
        })
      } else {
        new Notification('⏱️ ¡Descanso completado!', {
          body: `Tiempo de descanso cumplido para ${ejercicio}. ¡A por la siguiente serie!`,
          icon: '/icon-192.png'
        })
      }
    } catch (e) {
      console.warn('Error mostrando notificación:', e)
    }
  }
}

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
  repeticionesGuia?: string
  pesoSugerido?: number
  notasGuia?: string
  series: SerieSesion[]
}

export interface TimerRestState {
  activo: boolean
  targetEndTime: number
  duracionTotal: number
  segundosRestantes: number
  ejercicio: string
  completado?: boolean
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
  const router = useRouter()
  const { showToast } = useToast()
  const [tabActiva, setTabActiva] = useState<'historial' | 'plantillas'>('plantillas')
  const [rutinas, setRutinas] = useState<RutinaGym[]>(rutinasIniciales)
  useEffect(() => { setRutinas(rutinasIniciales) }, [rutinasIniciales])
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
  const [timerRest, setTimerRest] = useState<TimerRestState | null>(null)
  const originalTitleRef = useRef<string>('')

  // Preservar título original de la pestaña
  useEffect(() => {
    if (typeof document !== 'undefined') {
      originalTitleRef.current = document.title
    }
  }, [])

  // Recuperar sesión pendiente de localStorage al montar enriqueciendo con plantilla
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as SesionActivaData
        if (parsed && parsed.ejercicios && parsed.ejercicios.length > 0) {
          parsed.ejercicios = parsed.ejercicios.map(ej => {
            if (ej.repeticionesGuia && ej.pesoSugerido !== undefined) return ej
            const ejTemplate = plantillas.flatMap(p => p.ejercicios).find(
              e => e.nombre.trim().toLowerCase() === ej.nombre.trim().toLowerCase()
            )
            return {
              ...ej,
              repeticionesGuia: ej.repeticionesGuia || ejTemplate?.repeticiones,
              pesoSugerido: ej.pesoSugerido ?? ejTemplate?.peso_kg,
              notasGuia: ej.notasGuia || ejTemplate?.notas
            }
          })
          setSesionRecuperable(parsed)
        }
      }
    } catch (e) {
      console.error('Error recuperando sesión local:', e)
    }
  }, [plantillas])

  // Recuperar timer de descanso persistente en localStorage al montar o recargar
  useEffect(() => {
    try {
      const savedTimer = localStorage.getItem(STORAGE_KEY_REST_TIMER)
      if (savedTimer) {
        const parsed = JSON.parse(savedTimer) as TimerRestState
        if (parsed && parsed.targetEndTime) {
          const restantes = Math.round((parsed.targetEndTime - Date.now()) / 1000)
          if (restantes > 0) {
            setTimerRest({
              ...parsed,
              activo: true,
              segundosRestantes: restantes,
              completado: false
            })
          } else {
            if (restantes > -180) {
              showToast({ message: `⏱️ Descanso completado para ${parsed.ejercicio}`, type: 'info' })
            }
            localStorage.removeItem(STORAGE_KEY_REST_TIMER)
          }
        }
      }
    } catch (e) {
      console.error('Error restaurando temporizador persistente:', e)
    }
  }, [showToast])

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
    const handleSync = async () => {
      const syncedCount = await syncOfflineQueue({
        onSyncWorkout: async (payload) => {
          const res = await guardarSesionEstructurada(payload)
          return res.ok
        },
        onSuccessToast: (msg) => {
          showToast({ message: msg, type: 'success' })
        },
      })
      if (syncedCount > 0) {
        router.refresh()
      }
    }

    if (typeof window !== 'undefined' && navigator.onLine) {
      handleSync()
    }

    window.addEventListener('online', handleSync)
    return () => window.removeEventListener('online', handleSync)
  }, [showToast, router])

  // Timer de descanso resiliente al cambio de app / bloqueo de pantalla
  useEffect(() => {
    if (!timerRest || !timerRest.activo) {
      if (typeof document !== 'undefined' && originalTitleRef.current) {
        document.title = originalTitleRef.current
      }
      return
    }

    if (timerRest.completado) return

    const tick = () => {
      setTimerRest(actual => {
        if (!actual || !actual.activo || actual.completado) return actual
        // Cálculo basado en timestamp absoluto real del reloj
        const remaining = Math.round((actual.targetEndTime - Date.now()) / 1000)
        if (remaining <= 0) {
          dispararNotificacionFinDescanso(actual.ejercicio)
          try {
            localStorage.removeItem(STORAGE_KEY_REST_TIMER)
          } catch {}
          if (typeof document !== 'undefined') {
            document.title = `🔔 ¡Tiempo! ${actual.ejercicio} | Hermes`
          }
          showToast({
            message: `⏱️ ¡Descanso terminado para ${actual.ejercicio}! Toca siguiente serie.`,
            type: 'success'
          })
          return { ...actual, segundosRestantes: 0, completado: true }
        }
        const mins = Math.floor(remaining / 60)
        const secs = String(remaining % 60).padStart(2, '0')
        if (typeof document !== 'undefined') {
          document.title = `⏱️ ${mins}:${secs} - ${actual.ejercicio} | Hermes`
        }
        return { ...actual, segundosRestantes: remaining }
      })
    }

    tick()
    const interval = setInterval(tick, 1000)

    // Re-sincronización instantánea cuando la app vuelve a primer plano (focus, visibilitychange, pageshow)
    const handleSyncOnResume = () => {
      if (typeof document !== 'undefined' && (document.visibilityState === 'visible' || document.hasFocus())) {
        tick()
      }
    }

    document.addEventListener('visibilitychange', handleSyncOnResume)
    window.addEventListener('focus', handleSyncOnResume)
    window.addEventListener('pageshow', handleSyncOnResume)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleSyncOnResume)
      window.removeEventListener('focus', handleSyncOnResume)
      window.removeEventListener('pageshow', handleSyncOnResume)
    }
  }, [timerRest?.targetEndTime, timerRest?.activo, timerRest?.completado, showToast])

  // Desvanecer notificación de descanso cumplido tras 5 segundos
  useEffect(() => {
    if (timerRest && timerRest.completado) {
      const timeout = setTimeout(() => {
        detenerTimerDescanso()
      }, 5000)
      return () => clearTimeout(timeout)
    }
  }, [timerRest?.completado])

  // Iniciar timer de descanso
  function iniciarTimerDescanso(duracionSegundos: number, nombreEjercicio: string) {
    desbloquearAudio()
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      try {
        Notification.requestPermission()
      } catch {}
    }

    const targetEndTime = Date.now() + duracionSegundos * 1000
    const nuevoTimer: TimerRestState = {
      activo: true,
      targetEndTime,
      duracionTotal: duracionSegundos,
      segundosRestantes: duracionSegundos,
      ejercicio: nombreEjercicio,
      completado: false
    }

    setTimerRest(nuevoTimer)
    try {
      localStorage.setItem(STORAGE_KEY_REST_TIMER, JSON.stringify(nuevoTimer))
    } catch {}

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'START_REST_TIMER',
        targetEndTime,
        ejercicio: nombreEjercicio
      })
    }
  }

  // Detener y limpiar timer de descanso
  function detenerTimerDescanso() {
    setTimerRest(null)
    try {
      localStorage.removeItem(STORAGE_KEY_REST_TIMER)
    } catch {}
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CANCEL_REST_TIMER' })
    }
    if (typeof document !== 'undefined' && originalTitleRef.current) {
      document.title = originalTitleRef.current
    }
  }

  // Ajustar tiempo (+30s / -15s)
  function ajustarTiempoTimer(segundosDelta: number) {
    setTimerRest(prev => {
      if (!prev || !prev.activo) return null
      const nuevoEnd = Math.max(Date.now() + 3000, prev.targetEndTime + segundosDelta * 1000)
      const restantes = Math.max(0, Math.round((nuevoEnd - Date.now()) / 1000))
      const updated: TimerRestState = {
        ...prev,
        targetEndTime: nuevoEnd,
        duracionTotal: Math.max(5, prev.duracionTotal + segundosDelta),
        segundosRestantes: restantes,
        completado: false
      }
      try {
        localStorage.setItem(STORAGE_KEY_REST_TIMER, JSON.stringify(updated))
      } catch {}
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'START_REST_TIMER',
          targetEndTime: nuevoEnd,
          ejercicio: prev.ejercicio
        })
      }
      return updated
    })
  }

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
        repeticionesGuia: ej.repeticiones,
        pesoSugerido: ej.peso_kg,
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

      // Si se marca como completada, disparar el timer de descanso resiliente a segundo plano
      if (campo === 'completada' && valor === true) {
        const segs = parseDescansoSegundos(ejCopy.descanso)
        iniciarTimerDescanso(segs, ejCopy.nombre)
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

    const duracionSegundos = Math.round((Date.now() - (sesionActiva.iniciadoAt || Date.now())) / 1000)
    
    // Filtrar ejercicios incluidos
    const ejerciciosParaGuardar = sesionActiva.ejercicios.filter(ej => ej.completado)
    if (ejerciciosParaGuardar.length === 0) {
      showToast({ message: 'No hay ejercicios marcados como incluidos para guardar', type: 'error' })
      setGuardando(false)
      return
    }

    const payloadEjercicios: EjercicioSesionInput[] = ejerciciosParaGuardar.map(ej => ({
      nombre: ej.nombre,
      completado: ej.completado,
      descanso: ej.descanso,
      notasGuia: ej.notasGuia,
      repeticionesGuia: ej.repeticionesGuia,
      series: ej.series.map(s => ({
        numero_serie: s.numero_serie,
        peso_kg: typeof s.peso_kg === 'number' && !isNaN(s.peso_kg) ? Math.max(0, s.peso_kg) : 0,
        repeticiones: parseInt(String(s.repeticiones)) || 0,
        rir: s.rir,
        completada: s.completada
      }))
    }))

    const sessionPayload = {
      fecha: sesionActiva.fecha || new Date().toISOString().split('T')[0],
      plantillaId: sesionActiva.plantillaId,
      nombreDia: sesionActiva.nombreDia,
      duracionSegundos,
      ejercicios: payloadEjercicios
    }

    // Preparar registros optimistas para ver el entreno inmediatamente en el Historial
    const registrosOptimistas: RutinaGym[] = payloadEjercicios.map(ej => {
      const seriesCompletadas = ej.series.filter(s => s.completada)
      const seriesUsar = seriesCompletadas.length > 0 ? seriesCompletadas : ej.series
      const maxPeso = Math.max(...seriesUsar.map(s => s.peso_kg), 0)
      const repsFormato = seriesUsar.map(s => s.repeticiones).join('-')
      const rirValores = seriesUsar.map(s => s.rir).filter(Boolean)
      const rirTexto = rirValores.length > 0 ? `RIR ${rirValores[0]}` : undefined
      return {
        id: `optimistic-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        fecha: sessionPayload.fecha,
        ejercicio: ej.nombre,
        series: Math.max(seriesUsar.length, 1),
        repeticiones: repsFormato || '10',
        peso_kg: maxPeso > 0 ? maxPeso : undefined,
        notas: rirTexto,
        created_at: new Date().toISOString()
      }
    })

    try {
      // Si el móvil está sin cobertura (sótano del gym), encolar en local inmediatamente
      if (typeof window !== 'undefined' && !navigator.onLine) {
        enqueueOfflineAction('guardar_entrenamiento', sessionPayload)
        setRutinas(prev => [...registrosOptimistas, ...prev])
        localStorage.removeItem(STORAGE_KEY)
        setSesionActiva(null)
        detenerTimerDescanso()
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
        setRutinas(prev => [...registrosOptimistas, ...prev])
        localStorage.removeItem(STORAGE_KEY)
        setSesionActiva(null)
        detenerTimerDescanso()
        showToast({
          message: '¡Entrenamiento completado y guardado con éxito!',
          type: 'success',
          duration: 6000
        })
        setTabActiva('historial')
        router.refresh()
      } else {
        showToast({ message: res.mensaje || 'Error al guardar el entrenamiento', type: 'error' })
      }
    } catch (err: any) {
      console.warn('Fallo de red al guardar entrenamiento, encolando localmente:', err)
      enqueueOfflineAction('guardar_entrenamiento', sessionPayload)
      setRutinas(prev => [...registrosOptimistas, ...prev])
      localStorage.removeItem(STORAGE_KEY)
      setSesionActiva(null)
      detenerTimerDescanso()
      showToast({
        message: 'Guardado en tu móvil sin conexión. Se sincronizará en cuanto haya cobertura.',
        type: 'info',
        duration: 7000
      })
      setTabActiva('historial')
    } finally {
      setGuardando(false)
    }
  }

  // Minimizar sesión activa (conserva progreso en local y deja el reloj de descanso corriendo)
  function minimizarSesionActiva() {
    if (sesionActiva) {
      setSesionRecuperable(sesionActiva)
      setSesionActiva(null)
    }
  }

  // Descartar completamente el entrenamiento en curso
  function descartarSesionDefinitiva() {
    if (confirm('¿Descartar este entrenamiento por completo? Se borrarán los datos no guardados.')) {
      localStorage.removeItem(STORAGE_KEY)
      setSesionActiva(null)
      detenerTimerDescanso()
      showToast({ message: 'Entrenamiento descartado', type: 'info' })
    }
  }

  // Guardar formulario de registro único
  async function handleGuardarRegistroUnico() {
    if (!form.ejercicio.trim()) return
    setGuardando(true)
    try {
      const nueva = await crearRutinaGym({
        ejercicio: form.ejercicio.trim(),
        series: form.series,
        repeticiones: form.repeticiones?.trim() || undefined,
        peso_kg: form.peso_kg || undefined,
        fecha: form.fecha,
        notas: form.notes.trim() || undefined,
      })
      if (nueva) {
        setRutinas(prev => [nueva, ...prev])
      }
      setMostrarFormulario(false)
      setForm({ ejercicio: '', series: 3, repeticiones: '10', peso_kg: 0, fecha: new Date().toISOString().split('T')[0], notes: '' })
      showToast({ message: 'Ejercicio registrado en el historial', type: 'success' })
      router.refresh()
    } finally {
      setGuardando(false)
    }
  }

  // Eliminar rutina con actualización optimista
  async function handleEliminarRutina(id: string) {
    if (!confirm('¿Eliminar este registro del historial?')) return
    setRutinas(prev => prev.filter(r => r.id !== id))
    try {
      await eliminarRutinaGym(id)
      showToast({ message: 'Registro eliminado del historial', type: 'info' })
      router.refresh()
    } catch {
      showToast({ message: 'Error al eliminar registro', type: 'error' })
    }
  }

  // Helper de parseo seguro de números en inputs
  function parseInputNumber(val: string, fallback: number = 0): number {
    const cleaned = val.replace(',', '.')
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? fallback : parsed
  }

  // Datos para la gráfica de progresión
  const datosGrafica = rutinas
    .filter(r => r.ejercicio.toLowerCase() === ejercicioFiltro.toLowerCase() && r.peso_kg)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map(r => ({
      fecha: formatFecha(r.fecha, 'd MMM'),
      peso: r.peso_kg,
      series: r.series,
      reps: r.repeticiones
    }))

  // Agrupar rutinas por fecha
  const porFecha = rutinas.reduce<Record<string, RutinaGym[]>>((acc, r) => {
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
                              onClick={() => handleEliminarRutina(r.id)}
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
                  <div className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    timerRest.completado
                      ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40 animate-pulse'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    <Timer className={`w-3.5 h-3.5 ${timerRest.completado ? 'text-emerald-400' : 'text-amber-400'}`} />
                    <span>
                      {timerRest.completado ? (
                        '¡Descanso listo!'
                      ) : (
                        <>
                          <span className="hidden sm:inline">Descanso: </span>
                          {Math.floor(timerRest.segundosRestantes / 60)}:{String(timerRest.segundosRestantes % 60).padStart(2, '0')}
                        </>
                      )}
                    </span>
                    {!timerRest.completado && (
                      <button
                        type="button"
                        onClick={() => ajustarTiempoTimer(30)}
                        className="px-1.5 py-0.5 ml-1 text-[10px] rounded bg-amber-500/30 hover:bg-amber-500/50 text-amber-200 transition-colors cursor-pointer"
                        title="Añadir 30 segundos"
                      >
                        +30s
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={detenerTimerDescanso}
                      className="ml-0.5 hover:text-white text-neutral-400 p-0.5 cursor-pointer"
                      title="Cerrar temporizador"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={minimizarSesionActiva}
                  className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
                  title="Minimizar (mantiene progreso y reloj de descanso)"
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

                // Resolver objetivo de repeticiones y peso sugerido (desde sesión o desde plantillas)
                const repeticionesObjetivo =
                  ej.repeticionesGuia ||
                  plantillas.find(p => p.id === sesionActiva.plantillaId)?.ejercicios.find(e => e.nombre.trim().toLowerCase() === ej.nombre.trim().toLowerCase())?.repeticiones ||
                  plantillas.flatMap(p => p.ejercicios).find(e => e.nombre.trim().toLowerCase() === ej.nombre.trim().toLowerCase())?.repeticiones;

                const pesoSugerido =
                  ej.pesoSugerido !== undefined
                    ? ej.pesoSugerido
                    : (plantillas.find(p => p.id === sesionActiva.plantillaId)?.ejercicios.find(e => e.nombre.trim().toLowerCase() === ej.nombre.trim().toLowerCase())?.peso_kg ??
                       plantillas.flatMap(p => p.ejercicios).find(e => e.nombre.trim().toLowerCase() === ej.nombre.trim().toLowerCase())?.peso_kg);

                const notasGuia =
                  ej.notasGuia ||
                  plantillas.find(p => p.id === sesionActiva.plantillaId)?.ejercicios.find(e => e.nombre.trim().toLowerCase() === ej.nombre.trim().toLowerCase())?.notas ||
                  plantillas.flatMap(p => p.ejercicios).find(e => e.nombre.trim().toLowerCase() === ej.nombre.trim().toLowerCase())?.notas;

                return (
                  <div
                    key={ejIdx}
                    className="p-4 rounded-xl border bg-neutral-900/50 border-neutral-800 space-y-3"
                  >
                    {/* Fila del ejercicio: Nombre + Abanico de reps + Descanso + Acciones */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800/80 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              setSesionActiva(actual => {
                                if (!actual) return null
                                const copy = { ...actual, ejercicios: [...actual.ejercicios] }
                                copy.ejercicios[ejIdx] = { ...copy.ejercicios[ejIdx], completado: !ej.completado }
                                return copy
                              })
                            }}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                              ej.completado
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : 'bg-neutral-800 text-neutral-400 border-white/10 hover:text-neutral-200'
                            }`}
                            title={ej.completado ? 'Ejercicio incluido (haz clic para omitirlo)' : 'Ejercicio omitido (haz clic para incluirlo)'}
                          >
                            {ej.completado ? '✓ Incluido' : '○ Omitido'}
                          </button>
                          <h4 className={`font-bold text-sm ${ej.completado ? 'text-neutral-100' : 'text-neutral-500 line-through'}`}>{ej.nombre}</h4>
                          {repeticionesObjetivo && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 flex items-center gap-1 shadow-sm">
                              🎯 {repeticionesObjetivo} reps
                            </span>
                          )}
                          {ej.descanso && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              ⏱️ {ej.descanso}
                            </span>
                          )}
                        </div>

                        {/* Línea descriptiva con objetivo de reps, peso sugerido y notas técnicas */}
                        <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1 flex-wrap">
                          {repeticionesObjetivo && (
                            <span>
                              Objetivo: <strong className="text-neutral-200 font-semibold">{repeticionesObjetivo} reps</strong>
                            </span>
                          )}
                          {pesoSugerido !== undefined && pesoSugerido > 0 && (
                            <>
                              <span className="text-neutral-600">·</span>
                              <span>
                                Sugerido: <strong className="text-emerald-400 font-semibold">{pesoSugerido} kg</strong>
                              </span>
                            </>
                          )}
                          {notasGuia && (
                            <>
                              <span className="text-neutral-600">·</span>
                              <span className="text-neutral-300 italic">💡 {notasGuia}</span>
                            </>
                          )}
                        </div>

                        {prev && (
                          <div className="text-[11px] text-neutral-400 mt-1">
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
                            className="btn btn-ghost btn-sm text-[11px] py-1 px-2.5 flex items-center gap-1 text-neutral-300 hover:text-emerald-300 cursor-pointer"
                            title="Rellenar series con los valores de la última vez"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copiar anterior</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => agregarSerie(ejIdx)}
                          className="btn btn-ghost btn-sm text-[11px] py-1 px-2.5 flex items-center gap-1 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Serie</span>
                        </button>
                      </div>
                    </div>

                    {/* Tabla de series estructurada */}
                    <div className={`space-y-2 transition-opacity ${ej.completado ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                      <div className="grid grid-cols-12 gap-2 text-[10px] uppercase font-semibold text-neutral-400 px-2">
                        <span className="col-span-2 text-center">Serie</span>
                        <span className="col-span-3 text-center">Peso (kg)</span>
                        <span className="col-span-3 text-center flex items-center justify-center gap-1">
                          <span>Reps</span>
                          {repeticionesObjetivo && (
                            <span className="text-sky-300 font-normal lowercase text-[9px]">({repeticionesObjetivo})</span>
                          )}
                        </span>
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

                            {/* Repeticiones con placeholder del abanico objetivo */}
                            <div className="col-span-3">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={serie.repeticiones === 0 ? '' : serie.repeticiones}
                                placeholder={repeticionesObjetivo || "10"}
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
                          className="text-[10px] text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
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
                  onClick={minimizarSesionActiva}
                  className="btn btn-ghost flex-1 sm:flex-none text-xs cursor-pointer"
                >
                  Minimizar
                </button>
                <button
                  type="button"
                  onClick={finalizarEntrenamiento}
                  disabled={guardando}
                  className="btn btn-primary flex-1 sm:flex-none flex items-center justify-center gap-2 text-xs py-2 px-5 text-white cursor-pointer"
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

      {/* Widget flotante de descanso cuando la sesión está minimizada o fuera del modal */}
      {!sesionActiva && timerRest && timerRest.activo && (
        <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-3 p-3 rounded-2xl bg-neutral-900/95 border border-amber-500/40 shadow-2xl backdrop-blur-md text-amber-300 animate-slide-up">
          <div className={`p-2 rounded-xl ${timerRest.completado ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
              Descanso · {timerRest.ejercicio}
            </div>
            <div className={`text-base font-extrabold ${timerRest.completado ? 'text-emerald-400' : 'text-amber-300'}`}>
              {timerRest.completado
                ? '¡Listo para siguiente serie!'
                : `${Math.floor(timerRest.segundosRestantes / 60)}:${String(timerRest.segundosRestantes % 60).padStart(2, '0')}`}
            </div>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            {!timerRest.completado && (
              <button
                type="button"
                onClick={() => ajustarTiempoTimer(30)}
                className="px-2 py-1 text-xs rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold transition-colors cursor-pointer"
                title="Añadir 30s"
              >
                +30s
              </button>
            )}
            {sesionRecuperable && (
              <button
                type="button"
                onClick={reanudarSesionRecuperada}
                className="btn btn-primary btn-sm text-xs py-1 px-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold cursor-pointer"
              >
                Abrir entreno
              </button>
            )}
            <button
              type="button"
              onClick={detenerTimerDescanso}
              className="p-1 hover:text-white text-neutral-400 text-xs cursor-pointer"
              title="Cerrar temporizador"
            >
              ✕
            </button>
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
