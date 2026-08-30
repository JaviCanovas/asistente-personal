'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Dumbbell, Plus, Trash2, TrendingUp, Loader2, Check, Edit2, Play, ChevronDown, ChevronUp, Save, X } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { RutinaGym, PlantillaGym, EjercicioPlantilla } from '@/lib/types'
import { formatFecha, actualizarNotasPlantilla } from '@/lib/utils'
import { crearRutinaGym, eliminarRutinaGym, guardarPlantillaGym, registrarSesionCompleta, sincronizarDescansos } from '@/lib/actions/health'

interface GymClientProps {
  rutinas: RutinaGym[]
  ejerciciosUnicos: string[]
  plantillas: PlantillaGym[]
}

export default function GymClient({ rutinas: rutinasIniciales, ejerciciosUnicos, plantillas: plantillasIniciales }: GymClientProps) {
  const [tabActiva, setTabActiva] = useState<'historial' | 'plantillas'>('plantillas')
  const [ejercicioFiltro, setEjercicioFiltro] = useState(ejerciciosUnicos[0] ?? 'Press de Banca')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [guardando, setGuardando] = useState(false)
  
  const [form, setForm] = useState({
    ejercicio: '', series: 3, repeticiones: '10', peso_kg: 0, fecha: new Date().toISOString().split('T')[0], notes: ''
  })

  // Gestión de plantillas
  const [plantillas, setPlantillas] = useState<PlantillaGym[]>(plantillasIniciales)

  useEffect(() => {
    setPlantillas(plantillasIniciales)
  }, [plantillasIniciales])
  const [diaExpandido, setDiaExpandido] = useState<string | null>(plantillasIniciales[0]?.id ?? null)
  const [editandoPlantillaId, setEditandoPlantillaId] = useState<string | null>(null)
  const [ejerciciosEditables, setEjerciciosEditables] = useState<any[]>([])
  const [sincronizando, setSincronizando] = useState(false)
  const [mensajeSync, setMensajeSync] = useState<string | null>(null)
  
  // Sesión activa (entrenamiento en curso a partir de plantilla)
  const [sesionActiva, setSesionActiva] = useState<{
    plantillaId: string
    nombreDia: string
    fecha: string
    ejercicios: any[]
  } | null>(null)

  // Iniciar entrenamiento automáticamente si viene en el query param 'iniciar'
  const searchParams = useSearchParams()
  const plantillaAIniciar = searchParams.get('iniciar')

  useEffect(() => {
    if (plantillaAIniciar && plantillas && plantillas.length > 0) {
      const plantilla = plantillas.find(p => p.id === plantillaAIniciar)
      if (plantilla) {
        // Ejecutar iniciarEntrenamiento en línea para evitar dependencias circulares o declarar la función antes
        setSesionActiva({
          plantillaId: plantilla.id,
          nombreDia: plantilla.nombre_dia,
          fecha: new Date().toISOString().split('T')[0],
          ejercicios: plantilla.ejercicios.map((ej: EjercicioPlantilla) => ({
            ...ej,
            completado: true,
            seriesLog: ej.series.toString(),
            repeticionesLog: ej.repeticiones.toString(),
            pesoLog: ej.peso_kg.toString(),
            notasLog: ej.notas || ''
          }))
        })
        setDiaExpandido(plantilla.id)
        setTabActiva('plantillas')
      }
    }
  }, [plantillaAIniciar, plantillas])

  // Sincronizar tiempos de descanso en Supabase
  async function handleSincronizarDescansos() {
    setSincronizando(true)
    setMensajeSync(null)
    try {
      const result = await sincronizarDescansos()
      setMensajeSync(result.mensaje)
      setTimeout(() => setMensajeSync(null), 4000)
    } catch (e) {
      setMensajeSync('Error al sincronizar')
    } finally {
      setSincronizando(false)
    }
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

  async function handleGuardar() {
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
    } finally {
      setGuardando(false)
    }
  }

  // Activar edición de plantilla
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
    } catch (e) {
      console.error(e)
    } finally {
      setGuardando(false)
    }
  }

  // Modificar campo de ejercicio en edición de plantilla
  const handleEditEjercicioField = (index: number, field: string, value: any) => {
    setEjerciciosEditables(prev => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  // Iniciar entrenamiento desde plantilla
  function iniciarEntrenamiento(p: PlantillaGym) {
    setSesionActiva({
      plantillaId: p.id,
      nombreDia: p.nombre_dia,
      fecha: new Date().toISOString().split('T')[0],
      ejercicios: p.ejercicios.map((ej: EjercicioPlantilla) => ({
        ...ej,
        completado: true,
        seriesLog: ej.series.toString(),
        repeticionesLog: ej.repeticiones.toString(),
        pesoLog: ej.peso_kg.toString(),
        notasLog: ej.notas || ''
      }))
    })
  }

  // Guardar entrenamiento completo
  async function finalizarEntrenamiento() {
    if (!sesionActiva) return
    setGuardando(true)
    try {
      await registrarSesionCompleta(sesionActiva.fecha, sesionActiva.ejercicios, sesionActiva.plantillaId)
      
      // Actualizar estado reactivo local con la progresión del entrenamiento finalizado
      setPlantillas(prev => prev.map(p => {
        if (p.id === sesionActiva.plantillaId) {
          const ejerciciosActualizados = p.ejercicios.map(ejOriginal => {
            const ejSesion = sesionActiva.ejercicios.find(e => e.nombre === ejOriginal.nombre && e.completado)
            if (ejSesion) {
              const pesoGuardar = ejSesion.pesoLog !== '' && !isNaN(parseFloat(ejSesion.pesoLog))
                ? parseFloat(ejSesion.pesoLog)
                : ejOriginal.peso_kg

              return {
                ...ejOriginal,
                series: parseInt(ejSesion.seriesLog) || ejOriginal.series,
                repeticiones: ejSesion.repeticionesLog || ejOriginal.repeticiones,
                peso_kg: pesoGuardar,
                notas: actualizarNotasPlantilla(ejOriginal.notas, ejSesion.notasLog)
              }
            }
            return ejOriginal
          })
          return { ...p, ejercicios: ejerciciosActualizados }
        }
        return p
      }))

      setSesionActiva(null)
      setTabActiva('historial')
    } catch (e) {
      console.error(e)
    } finally {
      setGuardando(false)
    }
  }

  // Agrupar rutinas por fecha
  const porFecha = rutinasIniciales.reduce<Record<string, RutinaGym[]>>((acc, r) => {
    if (!acc[r.fecha]) acc[r.fecha] = []
    acc[r.fecha].push(r)
    return acc
  }, {})

  const fechasOrdenadas = Object.keys(porFecha).sort((a, b) => b.localeCompare(a)).slice(0, 14)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="page-header pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: 'rgba(16,185,129,0.1)' }}>
            <Dumbbell className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gym & Entrenamiento</h1>
            <p className="text-sm text-neutral-400">Progreso de fuerza y rutinas estructuradas</p>
          </div>
        </div>
        
        {/* Selector de Pestañas */}
        <div
          className="flex gap-1.5 p-1 rounded-xl shadow-inner backdrop-blur-md"
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
            <Dumbbell 
              className="w-4 h-4 transition-all duration-300 transform group-hover:scale-110" 
              style={{ 
                color: tabActiva === 'plantillas' ? '#34d399' : 'var(--text-muted)',
                opacity: tabActiva === 'plantillas' ? 1 : 0.6 
              }} 
            />
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
            <TrendingUp 
              className="w-4 h-4 transition-all duration-300 transform group-hover:scale-110" 
              style={{ 
                color: tabActiva === 'historial' ? '#a78bfa' : 'var(--text-muted)',
                opacity: tabActiva === 'historial' ? 1 : 0.6 
              }} 
            />
            <span>Historial & Gráficas</span>
          </button>
        </div>
      </div>

      {/* VISTA DE PLANTILLAS Y RUTINAS */}
      {tabActiva === 'plantillas' && (
        <div className="space-y-6 mt-6">
          {/* Barra de sincronización de descansos */}
          <div className="flex items-center justify-between p-3 rounded-xl border" style={{ background: 'rgba(16,185,129,0.04)', borderColor: 'rgba(16,185,129,0.15)' }}>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">⏱️ Tiempos de descanso configurados para cada ejercicio</span>
              {mensajeSync && (
                <span className="text-xs text-emerald-400 font-medium">{mensajeSync}</span>
              )}
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
              <div key={p.id} className="card overflow-hidden">
                {/* Cabecera del Día de Entrenamiento */}
                <div
                  onClick={() => !esEditando && setDiaExpandido(esExpandido ? null : p.id)}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${esExpandido ? 'bg-neutral-900/40 border-b border-neutral-800' : 'hover:bg-neutral-900/20 cursor-pointer'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-xs shrink-0">
                      D{p.orden}
                    </span>
                    <h3 className="font-bold text-sm sm:text-base text-neutral-100 line-clamp-1">{p.nombre_dia}</h3>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      {esEditando ? (
                        <button
                          onClick={() => guardarCambiosPlantilla(p)}
                          className="btn btn-primary btn-sm flex items-center gap-1.5 text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Guardar</span>
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => iniciarEdicionPlantilla(p)}
                            className="btn btn-ghost btn-sm flex items-center gap-1.5 text-[11px] sm:text-xs py-1 sm:py-1.5 px-2 sm:px-3"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => iniciarEntrenamiento(p)}
                            className="btn btn-primary btn-sm flex items-center gap-1.5 text-[11px] sm:text-xs py-1 sm:py-1.5 px-2.5 sm:px-3"
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

                {/* Contenido / Ejercicios */}
                {esExpandido && (
                  <div className="p-5 bg-neutral-950/20">
                    {esEditando ? (
                      <div className="space-y-4">
                        {ejerciciosEditables.map((ej, index) => (
                          <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 bg-neutral-900/60 rounded-xl border border-neutral-800">
                            {/* Nombre del ejercicio */}
                            <div className="col-span-1 md:col-span-4">
                              <label className="label text-[10px] mb-1">Nombre</label>
                              <input
                                value={ej.nombre}
                                onChange={e => handleEditEjercicioField(index, 'nombre', e.target.value)}
                                className="input text-xs py-1.5"
                              />
                            </div>
                            
                            {/* Mini-grid de Series / Reps / Peso para móvil */}
                            <div className="col-span-1 md:col-span-5 grid grid-cols-3 gap-2">
                              <div>
                                <label className="label text-[10px] mb-1 text-center md:text-left">Series</label>
                                <input
                                  type="number"
                                  value={ej.series}
                                  onChange={e => handleEditEjercicioField(index, 'series', parseInt(e.target.value) || 0)}
                                  className="input text-xs py-1.5 text-center"
                                />
                              </div>
                              <div>
                                <label className="label text-[10px] mb-1 text-center md:text-left">Reps</label>
                                <input
                                  value={ej.repeticiones}
                                  onChange={e => handleEditEjercicioField(index, 'repeticiones', e.target.value)}
                                  className="input text-xs py-1.5 text-center"
                                />
                              </div>
                              <div>
                                <label className="label text-[10px] mb-1 text-center md:text-left">Peso (kg)</label>
                                <input
                                  type="number"
                                  value={ej.peso_kg}
                                  onChange={e => handleEditEjercicioField(index, 'peso_kg', parseFloat(e.target.value) || 0)}
                                  className="input text-xs py-1.5 text-center"
                                />
                              </div>
                            </div>

                            {/* Descanso / Notas */}
                            <div className="col-span-1 md:col-span-3">
                              <label className="label text-[10px] mb-1">Descanso / Notas</label>
                              <input
                                value={ej.notas || ''}
                                onChange={e => handleEditEjercicioField(index, 'notas', e.target.value)}
                                className="input text-xs py-1.5"
                                placeholder="Notas opcionales"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        {/* Vista en móvil: lista de tarjetas compactas */}
                        <div className="block md:hidden space-y-3">
                          {p.ejercicios.map((ej: EjercicioPlantilla, index: number) => (
                            <div key={index} className="p-3 bg-neutral-900/40 rounded-xl border border-neutral-800 space-y-2 text-xs">
                              <div className="flex justify-between items-center font-bold text-neutral-200">
                                <span>{ej.nombre}</span>
                                <span className="text-emerald-400 font-semibold px-2 py-0.5 bg-emerald-500/10 rounded">
                                  {ej.peso_kg > 0 ? `${ej.peso_kg} kg` : 'Libre'}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-neutral-400 pt-1 border-t border-neutral-900">
                                <div>
                                  <span className="block text-[9px] uppercase tracking-wider text-neutral-500">Series</span>
                                  <span className="font-semibold text-neutral-300">{ej.series}</span>
                                </div>
                                <div>
                                  <span className="block text-[9px] uppercase tracking-wider text-neutral-500">Reps</span>
                                  <span className="font-semibold text-neutral-300">{ej.repeticiones}</span>
                                </div>
                                <div>
                                  <span className="block text-[9px] uppercase tracking-wider text-neutral-500">Descanso</span>
                                  <span className="font-semibold text-neutral-300">{ej.descanso || '—'}</span>
                                </div>
                              </div>
                              {ej.notas && (
                                <div className="text-[10px] text-neutral-500 bg-neutral-950/20 p-2 rounded border border-neutral-900 mt-1 italic">
                                  {ej.notas}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Vista en escritorio: tabla */}
                        <table className="hidden md:table w-full text-left text-sm text-neutral-300">
                          <thead>
                            <tr className="border-b border-neutral-800 text-xs font-semibold text-neutral-400 uppercase">
                              <th className="py-2.5 px-2">Ejercicio</th>
                              <th className="py-2.5 px-2 text-center">Series</th>
                              <th className="py-2.5 px-2 text-center">Repeticiones</th>
                              <th className="py-2.5 px-2 text-center">Peso Recomendado</th>
                              <th className="py-2.5 px-2 text-center">Descanso</th>
                              <th className="py-2.5 px-2">Esfuerzo / Notas</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-900">
                            {p.ejercicios.map((ej: EjercicioPlantilla, index: number) => (
                              <tr key={index} className="hover:bg-neutral-900/10">
                                <td className="py-3 px-2 font-medium text-neutral-200">{ej.nombre}</td>
                                <td className="py-3 px-2 text-center">{ej.series}</td>
                                <td className="py-3 px-2 text-center">{ej.repeticiones}</td>
                                <td className="py-3 px-2 text-center font-semibold text-emerald-400">
                                  {ej.peso_kg > 0 ? `${ej.peso_kg} kg` : 'Libre'}
                                </td>
                                <td className="py-3 px-2 text-center text-xs text-neutral-400">{ej.descanso || '—'}</td>
                                <td className="py-3 px-2 text-xs text-neutral-400">{ej.notas || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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
        <div className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Gráfica de progresión */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-sm">Progresión de peso</span>
                </div>
                <select value={ejercicioFiltro} onChange={e => setEjercicioFiltro(e.target.value)} className="input text-xs py-1" style={{ maxWidth: 180 }}>
                  {ejerciciosUnicos.length > 0 ? (
                    ejerciciosUnicos.map(ej => <option key={ej} value={ej} style={{ background: '#1c1f2e' }}>{ej}</option>)
                  ) : (
                    <option value="Press de Banca" style={{ background: '#1c1f2e' }}>Press de Banca</option>
                  )}
                </select>
              </div>
              
              {datosGrafica.length < 2 ? (
                <div className="empty-state py-12">
                  <TrendingUp className="w-8 h-8 text-neutral-600" />
                  <p className="text-sm">Registra al menos 2 sesiones de este ejercicio para ver la gráfica de progreso</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={datosGrafica}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }}
                      labelStyle={{ color: 'var(--text-primary)' }}
                      formatter={(v: any) => [`${v} kg`, 'Peso']}
                    />
                    <Line type="monotone" dataKey="peso" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Histórico de sesiones */}
            <div className="card p-5 overflow-y-auto" style={{ maxHeight: 420 }}>
              <div className="flex items-center justify-between mb-4">
                <p className="font-semibold text-sm">Sesiones registradas</p>
                <button onClick={() => setMostrarFormulario(true)} className="btn btn-ghost btn-sm text-xs py-1 px-3">
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
                          <div key={r.id} className="flex items-center justify-between p-3 rounded-xl group hover:border-neutral-700 border border-transparent transition-colors"
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

      {/* PANEL DE REGISTRO EN CURSO (LOG SESIÓN DESDE PLANTILLA) */}
      {sesionActiva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="card w-full max-w-2xl animate-fade-in overflow-hidden shadow-2xl" style={{ background: 'var(--bg-surface)' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h2 className="font-bold text-lg text-emerald-400">Entrenamiento en Curso</h2>
                <p className="text-xs text-neutral-400">{sesionActiva.nombreDia}</p>
              </div>
              <button onClick={() => setSesionActiva(null)} className="p-1.5 rounded-lg hover:bg-neutral-800">
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
              {/* Selector de fecha */}
              <div className="flex items-center gap-3 mb-3 bg-neutral-900/60 p-3 rounded-xl border border-neutral-800">
                <span className="text-xs font-semibold text-neutral-300">Fecha del entreno:</span>
                <input
                  type="date"
                  value={sesionActiva.fecha}
                  onChange={e => setSesionActiva(prev => prev ? { ...prev, fecha: e.target.value } : null)}
                  className="input text-xs py-1"
                  style={{ maxWidth: 160, colorScheme: 'dark' }}
                />
              </div>

              {sesionActiva.ejercicios.map((ej, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border transition-all ${
                    ej.completado ? 'bg-neutral-900/60 border-neutral-800' : 'bg-neutral-950/20 border-transparent opacity-50'
                  }`}
                >
                  <div className="flex flex-col gap-2.5">
                    {/* Fila superior: checkbox + nombre + badge descanso */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={ej.completado}
                          onChange={e => {
                            const copy = [...sesionActiva.ejercicios]
                            copy[index].completado = e.target.checked
                            setSesionActiva(prev => prev ? { ...prev, ejercicios: copy } : null)
                          }}
                          className="w-4 h-4 rounded text-emerald-500 focus:ring-0 cursor-pointer shrink-0"
                        />
                        <div>
                          <p className="font-semibold text-sm text-neutral-200">{ej.nombre}</p>
                          <p className="text-[10px] text-neutral-500">Plantilla: {ej.series}x{ej.repeticiones} | {ej.peso_kg > 0 ? `${ej.peso_kg}kg` : 'Libre'}</p>
                        </div>
                      </div>
                      {/* Badge de descanso */}
                      {ej.descanso && (
                        <div
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold shrink-0"
                          style={{
                            background: 'rgba(251,191,36,0.12)',
                            border: '1px solid rgba(251,191,36,0.25)',
                            color: '#fbbf24',
                          }}
                        >
                          ⏱️ <span>Desc: {ej.descanso}</span>
                        </div>
                      )}
                    </div>

                    {/* Inputs de series/peso/reps */}
                    {ej.completado && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="w-16">
                          <label className="text-[9px] text-neutral-400 block mb-0.5">Series</label>
                          <input
                            type="number"
                            value={ej.seriesLog}
                            onClick={e => (e.target as HTMLInputElement).select()}
                            onChange={e => {
                              const copy = [...sesionActiva.ejercicios]
                              copy[index].seriesLog = e.target.value
                              setSesionActiva(prev => prev ? { ...prev, ejercicios: copy } : null)
                            }}
                            className="input text-xs text-center py-1 px-2"
                          />
                        </div>
                        <div className="w-16">
                          <label className="text-[9px] text-neutral-400 block mb-0.5">Reps</label>
                          <input
                            type="text"
                            value={ej.repeticionesLog}
                            onClick={e => (e.target as HTMLInputElement).select()}
                            onChange={e => {
                              const copy = [...sesionActiva.ejercicios]
                              copy[index].repeticionesLog = e.target.value
                              setSesionActiva(prev => prev ? { ...prev, ejercicios: copy } : null)
                            }}
                            className="input text-xs text-center py-1 px-2"
                          />
                        </div>
                        <div className="w-20">
                          <label className="text-[9px] text-neutral-400 block mb-0.5">Peso (kg)</label>
                          <input
                            type="number"
                            value={ej.pesoLog}
                            onClick={e => (e.target as HTMLInputElement).select()}
                            onChange={e => {
                              const copy = [...sesionActiva.ejercicios]
                              copy[index].pesoLog = e.target.value
                              setSesionActiva(prev => prev ? { ...prev, ejercicios: copy } : null)
                            }}
                            className="input text-xs text-center py-1 px-2"
                            step={0.5}
                          />
                        </div>
                        <div className="flex-1 min-w-[140px]">
                          <label className="text-[9px] text-neutral-400 block mb-0.5">Notas / Series hechas</label>
                          <input
                            type="text"
                            value={ej.notasLog}
                            onChange={e => {
                              const copy = [...sesionActiva.ejercicios]
                              copy[index].notasLog = e.target.value
                              setSesionActiva(prev => prev ? { ...prev, ejercicios: copy } : null)
                            }}
                            className="input text-xs py-1"
                            placeholder="Ej: 6-6-5-5"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 p-5 border-t" style={{ borderColor: 'var(--border)' }}>
              <button onClick={() => setSesionActiva(null)} className="btn btn-ghost flex-1">Cancelar</button>
              <button
                onClick={finalizarEntrenamiento}
                disabled={guardando}
                className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                style={{ background: 'var(--accent)' }}
              >
                {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Finalizar y Guardar Sesión</span>
              </button>
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
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Ejercicio *</label>
                <input value={form.ejercicio} onChange={e => setForm(f => ({ ...f, ejercicio: e.target.value }))}
                  className="input" placeholder="Ej: Sentadillas" autoFocus list="ejercicios-list" />
                <datalist id="ejercicios-list">
                  {ejerciciosUnicos.map(ej => <option key={ej} value={ej} />)}
                </datalist>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Series</label>
                  <input type="number" value={form.series} onClick={e => (e.target as HTMLInputElement).select()} onChange={e => setForm(f => ({ ...f, series: parseInt(e.target.value) || 0 }))} className="input text-center" min={1} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Reps</label>
                  <input type="text" value={form.repeticiones} onClick={e => (e.target as HTMLInputElement).select()} onChange={e => setForm(f => ({ ...f, repeticiones: e.target.value }))} className="input text-center" placeholder="10" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Peso (kg)</label>
                  <input type="number" value={form.peso_kg} onClick={e => (e.target as HTMLInputElement).select()} onChange={e => setForm(f => ({ ...f, peso_kg: parseFloat(e.target.value) || 0 }))} className="input text-center" min={0} step={0.5} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Fecha</label>
                <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} className="input" style={{ colorScheme: 'dark' }} />
              </div>
            </div>
            <div className="flex gap-2 p-5 border-t" style={{ borderColor: 'var(--border)' }}>
              <button onClick={() => setMostrarFormulario(false)} className="btn btn-ghost flex-1">Cancelar</button>
              <button onClick={handleGuardar} disabled={guardando || !form.ejercicio.trim()} className="btn btn-primary flex-1">
                {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
