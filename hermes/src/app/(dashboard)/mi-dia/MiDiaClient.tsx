'use client'

import { useState, useTransition } from 'react'
import { Sun, Plus, Search, Sparkles, Inbox, AlertTriangle, Calendar, Star, CheckCircle, ChevronDown, ChevronUp, PlusCircle } from 'lucide-react'
import type { Item } from '@/lib/types'
import ItemCard from '@/components/items/ItemCard'
import { crearItem, agregarAMiDia, quitarDeMiDia } from '@/lib/actions/items'
import { format } from 'date-fns'

interface MiDiaClientProps {
  fechaHoy: string
  fechaManana: string
  itemsHoyIniciales: Item[]
  itemsMananaIniciales: Item[]
  backlogInicial: Item[]
}

export default function MiDiaClient({
  fechaHoy,
  fechaManana,
  itemsHoyIniciales,
  itemsMananaIniciales,
  backlogInicial,
}: MiDiaClientProps) {
  const [tabActive, setTabActive] = useState<'hoy' | 'manana'>('hoy')
  const [nuevaTareaTitulo, setNuevaTareaTitulo] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [itemsHoy, setItemsHoy] = useState<Item[]>(itemsHoyIniciales)
  const [itemsManana, setItemsManana] = useState<Item[]>(itemsMananaIniciales)
  const [backlog, setBacklog] = useState<Item[]>(backlogInicial)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const [isPending, startTransition] = useTransition()

  // Parsing helper to avoid timezone shifts
  const parseFecha = (str: string) => {
    const [y, m, d] = str.split('-').map(Number)
    return new Date(y, m - 1, d)
  }

  const dateHoy = parseFecha(fechaHoy)
  const dateManana = parseFecha(fechaManana)

  const formatHeader = (date: Date) => {
    const str = date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })
    return str.charAt(0).toUpperCase() + str.slice(1) // Capitalize first letter
  }

  const activeDateStr = tabActive === 'hoy' ? fechaHoy : fechaManana
  const currentItems = tabActive === 'hoy' ? itemsHoy : itemsManana

  // Completado
  const handleDone = (id: string, hecho: boolean) => {
    const nuevoEstado = hecho ? 'hecho' : 'activo'
    setItemsHoy(prev => prev.map(i => i.id === id ? { ...i, estado: nuevoEstado } : i))
    setItemsManana(prev => prev.map(i => i.id === id ? { ...i, estado: nuevoEstado } : i))
    setBacklog(prev => prev.map(i => i.id === id ? { ...i, estado: nuevoEstado } : i))
  }

  // Archivar
  const handleArchived = (id: string) => {
    setItemsHoy(prev => prev.filter(i => i.id !== id))
    setItemsManana(prev => prev.filter(i => i.id !== id))
    setBacklog(prev => prev.filter(i => i.id !== id))
  }

  // Eliminar
  const handleDeleted = (id: string) => {
    setItemsHoy(prev => prev.filter(i => i.id !== id))
    setItemsManana(prev => prev.filter(i => i.id !== id))
    setBacklog(prev => prev.filter(i => i.id !== id))
  }

  // Quitar de Mi Día
  const handleQuitar = (id: string) => {
    startTransition(async () => {
      try {
        await quitarDeMiDia(id)
        let itemMover: Item | undefined

        if (tabActive === 'hoy') {
          setItemsHoy(prev => {
            const found = prev.find(i => i.id === id)
            if (found) itemMover = found
            return prev.filter(i => i.id !== id)
          })
        } else {
          setItemsManana(prev => {
            const found = prev.find(i => i.id === id)
            if (found) itemMover = found
            return prev.filter(i => i.id !== id)
          })
        }

        if (itemMover) {
          const itemLimpio = {
            ...itemMover,
            metadata: { ...itemMover.metadata }
          }
          delete (itemLimpio.metadata as any).mi_dia_fecha
          setBacklog(prev => [itemLimpio, ...prev])
        }
      } catch (err) {
        console.error('Error al quitar de Mi Día:', err)
      }
    })
  }

  // Planificar tarea
  const handlePlanificar = (id: string) => {
    startTransition(async () => {
      try {
        await agregarAMiDia(id, activeDateStr)

        let itemMover: Item | undefined
        setBacklog(prev => {
          const found = prev.find(i => i.id === id)
          if (found) itemMover = found
          return prev.filter(i => i.id !== id)
        })

        // Asegurar que se quita del otro día por si acaso
        if (tabActive === 'hoy') {
          setItemsManana(prev => prev.filter(i => i.id !== id))
        } else {
          setItemsHoy(prev => prev.filter(i => i.id !== id))
        }

        if (itemMover) {
          const itemActualizado = {
            ...itemMover,
            metadata: { ...itemMover.metadata, mi_dia_fecha: activeDateStr }
          } as Item
          
          if (tabActive === 'hoy') {
            setItemsHoy(prev => [itemActualizado, ...prev])
          } else {
            setItemsManana(prev => [itemActualizado, ...prev])
          }
        }
      } catch (err) {
        console.error('Error al planificar:', err)
      }
    })
  }

  // Crear tarea rápida asignada al día activo
  const handleCrearTarea = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevaTareaTitulo.trim()) return

    const titulo = nuevaTareaTitulo.trim()
    setNuevaTareaTitulo('')

    startTransition(async () => {
      try {
        const nuevoItem = await crearItem({
          titulo,
          tipo: 'tarea',
          estado: 'activo',
          prioridad: 'media',
        })

        if (nuevoItem && nuevoItem.id) {
          await agregarAMiDia(nuevoItem.id, activeDateStr)
          const itemPlanificado = {
            ...nuevoItem,
            metadata: { ...nuevoItem.metadata, mi_dia_fecha: activeDateStr }
          } as Item

          if (tabActive === 'hoy') {
            setItemsHoy(prev => [itemPlanificado, ...prev])
          } else {
            setItemsManana(prev => [itemPlanificado, ...prev])
          }
        }
      } catch (err) {
        console.error('Error al crear tarea:', err)
      }
    })
  }

  // --- CLASIFICACIÓN DE SUGERENCIAS ---
  // 1. Vencidas: de días anteriores (limite o mi_dia_fecha) y no completadas
  const vencidas = backlog.filter(item => {
    if (item.estado === 'hecho' || item.estado === 'archivado') return false
    const limitDate = item.fecha_limite ? format(new Date(item.fecha_limite), 'yyyy-MM-dd') : null
    const plannedDate = (item.metadata as any)?.mi_dia_fecha

    const esLimitePasado = limitDate && limitDate < activeDateStr
    const esPlanificadoPasado = plannedDate && plannedDate < activeDateStr

    return esLimitePasado || esPlanificadoPasado
  })

  // 2. Programadas para el día activo
  const programadas = backlog.filter(item => {
    if (item.estado === 'hecho' || item.estado === 'archivado') return false
    if (vencidas.some(v => v.id === item.id)) return false
    const limitDate = item.fecha_limite ? format(new Date(item.fecha_limite), 'yyyy-MM-dd') : null
    return limitDate === activeDateStr
  })

  // 3. Inbox (sin procesar)
  const inboxItems = backlog.filter(item => {
    if (item.estado !== 'sin_procesar') return false
    if (vencidas.some(v => v.id === item.id) || programadas.some(p => p.id === item.id)) return false
    return true
  })

  // 4. Prioritarias (urgente o alta)
  const prioritarias = backlog.filter(item => {
    if (item.estado === 'hecho' || item.estado === 'archivado') return false
    if (vencidas.some(v => v.id === item.id) || programadas.some(p => p.id === item.id) || inboxItems.some(i => i.id === item.id)) return false
    return item.prioridad === 'urgente' || item.prioridad === 'alta'
  })

  // 5. Resto del backlog general
  const restoBacklog = backlog.filter(item => {
    if (item.estado === 'hecho' || item.estado === 'archivado') return false
    return !vencidas.some(v => v.id === item.id) &&
           !programadas.some(p => p.id === item.id) &&
           !inboxItems.some(i => i.id === item.id) &&
           !prioritarias.some(pr => pr.id === item.id)
  })

  // Filtro de búsqueda en tiempo real
  const filtrarLista = (lista: Item[]) => {
    if (!searchQuery.trim()) return lista
    const q = searchQuery.toLowerCase()
    return lista.filter(item => 
      item.titulo.toLowerCase().includes(q) || 
      (item.descripcion && item.descripcion.toLowerCase().includes(q))
    )
  }

  const renderFilaSugerencia = (item: Item, tipoText: string, colorIcon = 'var(--text-muted)') => {
    return (
      <div 
        key={item.id} 
        className="flex items-center justify-between gap-3 p-3 rounded-xl border border-white/0 hover:border-white/5 hover:bg-white/[1.5%] transition-all duration-200"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-200 line-clamp-1 group-hover:text-white transition-colors">
            {item.titulo}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {tipoText}
            </span>
            {item.proyecto && (
              <span className="inline-block text-xs font-semibold px-1.5 py-0.5 rounded" style={{ background: `${item.proyecto.color}15`, color: item.proyecto.color }}>
                {item.proyecto.nombre}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => handlePlanificar(item.id)}
          className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 transition-all shrink-0 active:scale-90"
          title="Añadir a mi día"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    )
  }

  const totalSugerencias = vencidas.length + programadas.length + inboxItems.length + prioritarias.length + restoBacklog.length

  return (
    <div className="max-w-6xl mx-auto animate-fade-in pb-8 md:pb-16 flex flex-col gap-5 md:gap-8">
      {/* Cabecera */}
      <header>
        <p className="text-xs uppercase tracking-widest font-semibold text-slate-500 mb-1.5" style={{ fontFamily: 'var(--font-inter)' }}>
          Planificación Diaria
        </p>
        <div className="flex items-center gap-3">
          <Sun className="w-7 h-7 text-purple-400" />
          <h1 className="text-3xl font-extrabold text-white tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Mi día
          </h1>
        </div>
        <p className="text-sm text-slate-400 mt-2" style={{ fontFamily: 'var(--font-inter)' }}>
          Planifica tu jornada seleccionando tareas y completándolas sobre la marcha.
        </p>
      </header>

      {/* Tabs selectoras */}
      <div className="flex gap-2 p-1.5 rounded-2xl bg-[#101320] border border-white/5 w-full sm:max-w-md">
        <button
          onClick={() => setTabActive('hoy')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 select-none ${
            tabActive === 'hoy'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          Hoy <span className="block text-xs font-normal opacity-80 mt-0.5">{formatHeader(dateHoy)}</span>
        </button>
        <button
          onClick={() => setTabActive('manana')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 select-none ${
            tabActive === 'manana'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          Mañana <span className="block text-xs font-normal opacity-80 mt-0.5">{formatHeader(dateManana)}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10 items-start">
        {/* Columna de Tareas Planificadas (Izquierda/Principal) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Input rápido - Formato Flex para evitar solapamientos */}
          <form onSubmit={handleCrearTarea} className="flex gap-3 items-stretch">
            <input
              type="text"
              placeholder={`Añadir una tarea a ${tabActive === 'hoy' ? 'Hoy' : 'Mañana'}...`}
              value={nuevaTareaTitulo}
              onChange={e => setNuevaTareaTitulo(e.target.value)}
              className="flex-1 px-5 py-3.5 rounded-xl border border-white/5 bg-[#101320] text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors text-sm shadow-inner"
            />
            <button 
              type="submit" 
              className="px-6 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20 active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir</span>
            </button>
          </form>

          {/* Listado */}
          <div className="space-y-4">
            {currentItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 md:py-24 text-center bg-[#101320]/40 rounded-2xl border border-dashed border-white/5 text-slate-500 p-6 backdrop-blur-sm">
                <CheckCircle className="w-10 h-10 md:w-14 md:h-14 text-slate-600/60 mb-3" />
                <p className="text-sm md:text-base font-bold text-slate-300">No hay tareas planificadas aún</p>
                <p className="text-xs text-slate-500 mt-2 max-w-[320px] leading-relaxed">
                  Escribe una arriba o selecciona tareas desde el panel de sugerencias de la derecha.
                </p>
              </div>
            ) : (
              <div className="space-y-3 item-list">
                {currentItems.map(item => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onDone={handleDone}
                    onArchived={handleArchived}
                    onDeleted={handleDeleted}
                    onRemoveFromMyDay={handleQuitar}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Columna de Sugerencias (Derecha) */}
        <div className="flex flex-col gap-6">
          <div className="card p-6" style={{ background: 'var(--bg-dark-card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-5 cursor-pointer select-none" onClick={() => setShowSuggestions(!showSuggestions)}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h2 className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                  Sugerencias
                </h2>
              </div>
              <button className="text-slate-400 hover:text-white transition-colors">
                {showSuggestions ? <ChevronUp className="w-4.5 h-4.5" /> : <ChevronDown className="w-4.5 h-4.5" />}
              </button>
            </div>

            {showSuggestions && (
              <div className="flex flex-col gap-5 animate-fade-in">
                {/* Buscador */}
                <div className="relative mb-2 flex items-center">
                  <Search 
                    className="absolute left-3.5 text-slate-500 pointer-events-none" 
                    style={{ width: '16px', height: '16px' }}
                  />
                  <input
                    type="text"
                    placeholder="Filtrar backlog..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pr-4 py-2.5 rounded-xl border border-white/5 bg-slate-950/40 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                    style={{ paddingLeft: '38px' }}
                  />
                </div>

                {totalSugerencias === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">¡No quedan tareas pendientes en el backlog!</p>
                ) : (
                  <div className="flex flex-col gap-5 max-h-[480px] overflow-y-auto pr-1">
                    {/* 1. Vencidas */}
                    {vencidas.length > 0 && filtrarLista(vencidas).length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold text-red-400/90 tracking-wider mb-2 flex items-center gap-1.5 uppercase">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400/95" />
                          Pendientes / Vencidas ({vencidas.length})
                        </p>
                        <div className="space-y-1.5 bg-slate-950/30 rounded-xl border border-white/5 p-2">
                          {filtrarLista(vencidas).map(i => renderFilaSugerencia(i, 'Pendiente anterior', '#f87171'))}
                        </div>
                      </div>
                    )}

                    {/* 2. Programadas */}
                    {programadas.length > 0 && filtrarLista(programadas).length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold text-emerald-400/90 tracking-wider mb-2 flex items-center gap-1.5 uppercase">
                          <Calendar className="w-3.5 h-3.5 shrink-0 text-emerald-400/95" />
                          Para este día ({programadas.length})
                        </p>
                        <div className="space-y-1.5 bg-slate-950/30 rounded-xl border border-white/5 p-2">
                          {filtrarLista(programadas).map(i => renderFilaSugerencia(i, 'Programada hoy', '#34d399'))}
                        </div>
                      </div>
                    )}

                    {/* 3. Inbox (sin procesar) */}
                    {inboxItems.length > 0 && filtrarLista(inboxItems).length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold text-purple-400/90 tracking-wider mb-2 flex items-center gap-1.5 uppercase">
                          <Inbox className="w-3.5 h-3.5 shrink-0 text-purple-400/95" />
                          Bandeja de entrada ({inboxItems.length})
                        </p>
                        <div className="space-y-1.5 bg-slate-950/30 rounded-xl border border-white/5 p-2">
                          {filtrarLista(inboxItems).map(i => renderFilaSugerencia(i, 'Inbox (sin procesar)', '#a78bfa'))}
                        </div>
                      </div>
                    )}

                    {/* 4. Prioritarias */}
                    {prioritarias.length > 0 && filtrarLista(prioritarias).length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold text-amber-400/90 tracking-wider mb-2 flex items-center gap-1.5 uppercase">
                          <Star className="w-3.5 h-3.5 shrink-0 text-amber-400/95" />
                          Prioridad Alta ({prioritarias.length})
                        </p>
                        <div className="space-y-1.5 bg-slate-950/30 rounded-xl border border-white/5 p-2">
                          {filtrarLista(prioritarias).map(i => renderFilaSugerencia(i, 'Alta prioridad', '#fbbf24'))}
                        </div>
                      </div>
                    )}

                    {/* 5. Backlog general */}
                    {restoBacklog.length > 0 && filtrarLista(restoBacklog).length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 tracking-wider mb-2 flex items-center gap-1.5 uppercase">
                          <CheckCircle className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                          Tareas del Backlog ({restoBacklog.length})
                        </p>
                        <div className="space-y-1.5 bg-slate-950/30 rounded-xl border border-white/5 p-2">
                          {filtrarLista(restoBacklog).map(i => renderFilaSugerencia(i, 'Backlog'))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
