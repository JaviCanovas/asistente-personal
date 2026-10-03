'use client'

import { useState, useDeferredValue } from 'react'
import {
  CheckSquare, Plus, Search, Star, Calendar, CheckCircle2,
  Clock, AlertTriangle, ChevronRight, Sun, BookOpen,
  MoreVertical, Edit3, ChevronDown, ListFilter, FolderPlus, Layers
} from 'lucide-react'
import type { Item, Proyecto, ItemPrioridad } from '@/lib/types'
import dynamic from 'next/dynamic'
import ItemCard from '@/components/items/ItemCard'
import TaskDatePicker from '@/components/ui/TaskDatePicker'

const TaskDetailDrawer = dynamic(() => import('./TaskDetailDrawer'), { ssr: false })
const NewListModal = dynamic(() => import('./NewListModal'), { ssr: false })
import { parseNaturalDate } from './todoUtils'
import { crearItem } from '@/lib/actions/items'
import { crearProyecto } from '@/lib/actions/proyectos'
import { useToast } from '@/components/ui/Toast'

type VistaId = 'mi-dia' | 'importantes' | 'planeadas' | 'todas' | 'completadas'

interface SmartListConfig {
  id: VistaId
  label: string
  icon: any
  color: string
  desc: string
}

const SMART_LISTS: SmartListConfig[] = [
  { id: 'mi-dia', label: 'Mi Día', icon: Sun, color: '#f59e0b', desc: 'Tareas seleccionadas para hoy' },
  { id: 'importantes', label: 'Importantes', icon: Star, color: '#f59e0b', desc: 'Prioridad alta y urgente' },
  { id: 'planeadas', label: 'Planeadas', icon: Calendar, color: '#38bdf8', desc: 'Tareas con fecha límite' },
  { id: 'todas', label: 'Todas las tareas', icon: CheckSquare, color: '#a78bfa', desc: 'Todas tus tareas activas' },
  { id: 'completadas', label: 'Completadas', icon: CheckCircle2, color: '#10b981', desc: 'Historial de tareas hechas' },
]

interface TareasClientProps {
  tareas: Item[]
  proyectos: Proyecto[]
}

// Helper para obtener todos los IDs descendientes de un proyecto recursivamente
function getDescendantProjectIds(allProjects: Proyecto[], rootId: string): string[] {
  const direct = allProjects.filter(p => p.parent_id === rootId).map(p => p.id)
  const sub = direct.flatMap(id => getDescendantProjectIds(allProjects, id))
  return [...direct, ...sub]
}

export default function TareasClient({ tareas: tareasIniciales, proyectos: proyectosIniciales }: TareasClientProps) {
  const { showToast } = useToast()
  const [items, setItems] = useState<Item[]>(tareasIniciales)
  const [proyectos, setProyectos] = useState<Proyecto[]>(proyectosIniciales)

  // Selección activa: puede ser una smart list ('mi-dia' | 'importantes' | ...) o el ID de un proyecto/asignatura
  const [seleccionId, setSeleccionId] = useState<string>('todas')
  const [busqueda, setBusqueda] = useState('')
  const deferredBusqueda = useDeferredValue(busqueda)

  // Control de Modales y Drawer
  const [isListModalOpen, setIsListModalOpen] = useState(false)
  const [proyectoEditar, setProyectoEditar] = useState<Proyecto | null>(null)
  const [parentIdParaModal, setParentIdParaModal] = useState<string | null>(null)
  const [tareaSeleccionada, setTareaSeleccionada] = useState<Item | null>(null)
  const [mostrarCompletadas, setMostrarCompletadas] = useState(false)
  const [mostrarMenuMovil, setMostrarMenuMovil] = useState(false)

  // Estado para sublistas anidadas y agrupamiento
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set())
  const [inlineSublistParentId, setInlineSublistParentId] = useState<string | null>(null)
  const [inlineSublistName, setInlineSublistName] = useState('')
  const [isCreatingSublist, setIsCreatingSublist] = useState(false)
  const [agruparPorSublista, setAgruparPorSublista] = useState(false)

  // Entrada rápida estilo To Do
  const [nuevoTitulo, setNuevoTitulo] = useState('')
  const [fechaRapida, setFechaRapida] = useState<string>('')
  const [esImportanteRapido, setEsImportanteRapido] = useState(false)
  const [creando, setCreando] = useState(false)

  const hoyStr = new Date().toISOString().split('T')[0]

  // Saber si la selección actual es una vista inteligente o un proyecto
  const smartActiva = SMART_LISTS.find(s => s.id === seleccionId)
  const proyectoActivo = proyectos.find(p => p.id === seleccionId)

  // Sublistas descendientes del proyecto activo
  const descendantIds = proyectoActivo ? getDescendantProjectIds(proyectos, proyectoActivo.id) : []
  const tieneSublistas = descendantIds.length > 0

  // Handlers para Tareas
  const handleDone = (id: string, hecho: boolean) => {
    setItems(prev =>
      prev.map(t => (t.id === id ? { ...t, estado: hecho ? 'hecho' : 'activo' } : t))
    )
    if (tareaSeleccionada && tareaSeleccionada.id === id) {
      setTareaSeleccionada(prev => prev ? { ...prev, estado: hecho ? 'hecho' : 'activo' } : null)
    }
  }

  const handleArchived = (id: string) => {
    setItems(prev => prev.filter(t => t.id !== id))
    if (tareaSeleccionada?.id === id) setTareaSeleccionada(null)
  }

  const handleDeleted = (id: string) => {
    setItems(prev => prev.filter(t => t.id !== id))
    if (tareaSeleccionada?.id === id) setTareaSeleccionada(null)
  }

  const handleUpdated = (updated: Item) => {
    setItems(prev => prev.map(t => (t.id === updated.id ? updated : t)))
    if (tareaSeleccionada?.id === updated.id) {
      setTareaSeleccionada(updated)
    }
  }

  // Handlers para Listas / Proyectos / Asignaturas
  const handleListaCreada = (nuevoProyecto: Proyecto) => {
    setProyectos(prev => [...prev, nuevoProyecto])
    setSeleccionId(nuevoProyecto.id)
    if (nuevoProyecto.parent_id) {
      setExpandedLists(prev => new Set(prev).add(nuevoProyecto.parent_id!))
    }
    setMostrarMenuMovil(false)
  }

  const handleListaActualizada = (actualizado: Proyecto) => {
    setProyectos(prev => prev.map(p => p.id === actualizado.id ? actualizado : p))
  }

  const handleListaEliminada = (id: string) => {
    setProyectos(prev => prev.filter(p => p.id !== id))
    if (seleccionId === id) {
      setSeleccionId('todas')
    }
  }

  // Alternar desplegable de lista
  const toggleExpandList = (listId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setExpandedLists(prev => {
      const next = new Set(prev)
      if (next.has(listId)) next.delete(listId)
      else next.add(listId)
      return next
    })
  }

  // Creación rápida inline de sublista (sin modal)
  const handleCreateInlineSublist = async (parentId: string, e: React.FormEvent) => {
    e.preventDefault()
    if (!inlineSublistName.trim() || isCreatingSublist) return

    setIsCreatingSublist(true)
    const parent = proyectos.find(p => p.id === parentId)
    const name = inlineSublistName.trim()

    try {
      const nuevo = await crearProyecto({
        nombre: name,
        color: parent?.color || '#8b5cf6',
        parent_id: parentId,
      })
      setProyectos(prev => [...prev, nuevo])
      setExpandedLists(prev => new Set(prev).add(parentId))
      setInlineSublistParentId(null)
      setInlineSublistName('')
      setSeleccionId(nuevo.id)
      showToast({ message: `Sublista "${name}" creada`, type: 'success' })
    } catch (err: any) {
      showToast({ message: 'Error al crear la sublista', type: 'error' })
    } finally {
      setIsCreatingSublist(false)
    }
  }

  // Creación rápida de tarea con parseo de fechas en lenguaje natural y asignación a la lista actual
  const handleCrearTareaRapida = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevoTitulo.trim() || creando) return

    setCreando(true)
    const rawInput = nuevoTitulo.trim()
    const { cleanTitle, dueDate } = parseNaturalDate(rawInput)

    const fechaFinal = fechaRapida || dueDate || (seleccionId === 'planeadas' ? hoyStr : undefined)
    const prioridadFinal: ItemPrioridad = (esImportanteRapido || seleccionId === 'importantes') ? 'alta' : 'media'
    const esMiDiaActivo = seleccionId === 'mi-dia'
    const metadataInicial: any = esMiDiaActivo ? { mi_dia_fecha: hoyStr } : {}
    const proyectoAsignadoId = proyectoActivo ? proyectoActivo.id : undefined

    const tempId = `temp-${Date.now()}`
    const nuevoItemTemp: Item = {
      id: tempId,
      tipo: 'tarea',
      titulo: cleanTitle,
      estado: 'activo',
      prioridad: prioridadFinal,
      fecha_limite: fechaFinal,
      proyecto_id: proyectoAsignadoId,
      proyecto: proyectoActivo || undefined,
      etiquetas: [],
      origen: 'web',
      metadata: metadataInicial,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setItems(prev => [nuevoItemTemp, ...prev])
    setNuevoTitulo('')
    setFechaRapida('')
    setEsImportanteRapido(false)

    try {
      const created = await crearItem({
        titulo: cleanTitle,
        tipo: 'tarea',
        estado: 'activo',
        prioridad: prioridadFinal,
        fecha_limite: fechaFinal,
        proyecto_id: proyectoAsignadoId,
      })
      if (created) {
        setItems(prev => prev.map(t => t.id === tempId ? { ...created, proyecto: proyectoActivo || created.proyecto } : t))
      }
      showToast({ message: `Tarea creada: "${cleanTitle}"`, type: 'success' })
    } catch (err: any) {
      console.error(err)
      setItems(prev => prev.filter(t => t.id !== tempId))
      showToast({ message: 'Error al crear la tarea', type: 'error' })
    } finally {
      setCreando(false)
    }
  }

  // Filtrado de tareas
  const tareasDeLaVista = items.filter(t => {
    if (deferredBusqueda && !t.titulo.toLowerCase().includes(deferredBusqueda.toLowerCase())) {
      return false
    }

    // Si se seleccionó una asignatura / proyecto específico:
    // Muestra las tareas directas Y las de sus sublistas
    if (proyectoActivo) {
      return t.proyecto_id === proyectoActivo.id || descendantIds.includes(t.proyecto_id || '')
    }

    if (seleccionId === 'completadas') {
      return t.estado === 'hecho'
    }

    if (t.estado === 'hecho' || t.estado === 'archivado') {
      return false
    }

    if (seleccionId === 'mi-dia') {
      return (t.metadata as any)?.mi_dia_fecha === hoyStr
    }

    if (seleccionId === 'importantes') {
      return t.prioridad === 'alta' || t.prioridad === 'urgente'
    }

    if (seleccionId === 'planeadas') {
      return !!(t.fecha_limite || t.fecha_evento)
    }

    if (seleccionId === 'todas') {
      return t.tipo === 'tarea' || !!t.proyecto_id
    }

    return true
  })

  // Partición entre activas y completadas para la vista actual, con ordenación preferencial (ℹ️ Evaluación al inicio, luego fechas)
  const tareasActivas = tareasDeLaVista
    .filter(t => t.estado !== 'hecho' && t.estado !== 'archivado')
    .sort((a, b) => {
      if (a.titulo.includes('ℹ️ Evaluación')) return -1
      if (b.titulo.includes('ℹ️ Evaluación')) return 1
      const dateA = (a.fecha_limite || a.fecha_evento || '').split('T')[0]
      const dateB = (b.fecha_limite || b.fecha_evento || '').split('T')[0]
      if (dateA && dateB) return dateA.localeCompare(dateB)
      if (dateA) return 1
      if (dateB) return -1
      return 0
    })
  const tareasCompletadas = tareasDeLaVista.filter(t => t.estado === 'hecho')

  // Agrupaciones para vista "Planeadas"
  const getFechaItem = (t: Item) => (t.fecha_limite || t.fecha_evento)?.split('T')[0] || ''
  const tareasVencidas = tareasActivas.filter(t => getFechaItem(t) && getFechaItem(t) < hoyStr)
  const tareasParaHoy = tareasActivas.filter(t => getFechaItem(t) && getFechaItem(t) === hoyStr)
  const tareasFuturas = tareasActivas.filter(t => getFechaItem(t) && getFechaItem(t) > hoyStr)

  // Conteos dinámicos para las vistas inteligentes
  const getSmartCount = (id: VistaId) => {
    switch (id) {
      case 'mi-dia':
        return items.filter(t => t.estado !== 'hecho' && t.estado !== 'archivado' && (t.metadata as any)?.mi_dia_fecha === hoyStr).length
      case 'importantes':
        return items.filter(t => t.estado !== 'hecho' && t.estado !== 'archivado' && (t.prioridad === 'alta' || t.prioridad === 'urgente')).length
      case 'planeadas':
        return items.filter(t => t.estado !== 'hecho' && t.estado !== 'archivado' && !!t.fecha_limite).length
      case 'todas':
        return items.filter(t => t.estado !== 'hecho' && t.estado !== 'archivado').length
      case 'completadas':
        return items.filter(t => t.estado === 'hecho').length
    }
  }

  // Conteo de tareas pendientes de un proyecto específico (incluyendo sublistas si aplica)
  const getProjectPendingCount = (projId: string) => {
    const subIds = getDescendantProjectIds(proyectos, projId)
    return items.filter(
      t => (t.proyecto_id === projId || subIds.includes(t.proyecto_id || '')) &&
           t.estado !== 'hecho' && t.estado !== 'archivado'
    ).length
  }

  // Placeholder dinámico para la barra de captura
  const placeholderContextual = proyectoActivo
    ? `Añadir una tarea a ${proyectoActivo.nombre}... (pulsa Enter)`
    : seleccionId === 'mi-dia'
    ? 'Añadir una tarea a Mi Día... (pulsa Enter)'
    : seleccionId === 'importantes'
    ? 'Añadir una tarea importante... (pulsa Enter)'
    : seleccionId === 'planeadas'
    ? 'Añadir una tarea planeada... (ej. "Entrega el viernes")'
    : 'Añadir una tarea... (ej. "Comprar billetes mañana" o "Revisar tema 2")'

  // Render recursivo de fila de proyecto/sublista (soporta >= 2 niveles)
  const renderProjectRow = (p: Proyecto, level: number = 0) => {
    const isSelected = seleccionId === p.id
    const pColor = p.color || '#8b5cf6'
    const pendientes = getProjectPendingCount(p.id)
    const children = proyectos.filter(child => child.parent_id === p.id)
    const hasChildren = children.length > 0
    const isExpanded = expandedLists.has(p.id)
    const isInlineCreating = inlineSublistParentId === p.id

    const paddingLeft = 12 + level * 16

    return (
      <div key={p.id} className="space-y-1">
        <div
          data-testid="list-row"
          className={`group w-full h-10 flex items-center justify-between py-2 px-3 rounded-[10px] text-xs transition-all cursor-pointer border ${
            isSelected
              ? 'bg-neutral-800 text-white shadow-sm border-white/10 font-semibold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40 font-medium'
          }`}
          style={{ paddingLeft: `${paddingLeft}px` }}
          onClick={() => {
            setSeleccionId(p.id)
            setMostrarMenuMovil(false)
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={e => toggleExpandList(p.id, e)}
                className="p-0.5 text-neutral-500 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90 text-white' : ''}`} />
              </button>
            ) : (
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                style={{ background: pColor }}
              />
            )}
            <span className="truncate">{p.nombre}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {pendientes > 0 && (
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  isSelected ? 'bg-white/15 text-white' : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {pendientes}
              </span>
            )}

            {/* Botón "+ Sublista" visible en móvil/touch y hover en desktop */}
            {level < 2 && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                    setProyectoEditar(null)
                    setParentIdParaModal(p.id)
                    setIsListModalOpen(true)
                  } else {
                    setInlineSublistParentId(inlineSublistParentId === p.id ? null : p.id)
                    setInlineSublistName('')
                    setExpandedLists(prev => new Set(prev).add(p.id))
                  }
                }}
                className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-1.5 hover:text-purple-300 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
                title="Añadir sublista"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Botón editar lista visible en móvil/touch y hover en desktop */}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                setProyectoEditar(p)
                setParentIdParaModal(null)
                setIsListModalOpen(true)
              }}
              className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-1.5 hover:text-white rounded-lg hover:bg-white/10 transition-all cursor-pointer"
              title="Configurar lista"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Formulario inline para añadir sublista (nombre + Enter, sin modal) */}
        {isInlineCreating && (
          <form
            onSubmit={e => handleCreateInlineSublist(p.id, e)}
            className="flex items-center gap-1.5 py-1 px-2 rounded-lg bg-neutral-900 border border-purple-500/40"
            style={{ marginLeft: `${paddingLeft + 12}px` }}
            onClick={e => e.stopPropagation()}
          >
            <FolderPlus className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <input
              type="text"
              autoFocus
              value={inlineSublistName}
              onChange={e => setInlineSublistName(e.target.value)}
              placeholder="Nombre sublista + Enter..."
              className="w-full bg-transparent text-xs text-neutral-100 placeholder:text-neutral-500 outline-none"
            />
            <button
              type="button"
              onClick={() => setInlineSublistParentId(null)}
              className="text-[10px] text-neutral-500 hover:text-neutral-300 px-1"
            >
              Esc
            </button>
          </form>
        )}

        {/* Hijos desplegables (sublistas) */}
        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {children.map(child => renderProjectRow(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  // Raíces principales (sin parent_id)
  const rootProjects = proyectos.filter(p => !p.parent_id)

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-8 space-y-6 animate-fade-in pb-12">
      {/* Botón selector de lista para Móvil */}
      <div className="lg:hidden flex items-center justify-between p-3.5 bg-neutral-900/80 border border-white/8 rounded-2xl">
        <button
          type="button"
          onClick={() => setMostrarMenuMovil(!mostrarMenuMovil)}
          className="flex items-center gap-2.5 text-sm font-bold text-neutral-100 truncate mr-2"
        >
          <ListFilter className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="truncate">{proyectoActivo ? proyectoActivo.nombre : smartActiva?.label || 'Mis Tareas'}</span>
          <ChevronDown className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform ${mostrarMenuMovil ? 'rotate-180' : ''}`} />
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          {proyectoActivo && (
            <button
              type="button"
              onClick={() => {
                setProyectoEditar(null)
                setParentIdParaModal(proyectoActivo.id)
                setIsListModalOpen(true)
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 text-xs font-semibold hover:bg-purple-600/30 transition-colors"
              title={`Crear sublista en ${proyectoActivo.nombre}`}
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Sublista</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => { setProyectoEditar(null); setParentIdParaModal(null); setIsListModalOpen(true); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-neutral-800 text-neutral-200 border border-white/10 text-xs font-semibold hover:bg-neutral-700 transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Lista</span>
          </button>
        </div>
      </div>

      {/* Grid de 2 Columnas estilo Microsoft To Do */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        
        {/* ========================================================
            COLUMNA IZQUIERDA: Panel de Listas y Asignaturas
            - Padding 12px (p-3)
            - Filas 40px (h-10), padding 8px 12px (py-2 px-3), 4px entre ellas
            - Secciones separadas 24px (space-y-6)
            - Título sección con 8px debajo (mb-2)
            ======================================================== */}
        <aside
          className={`lg:col-span-4 xl:col-span-3 card p-3 rounded-2xl border border-white/8 space-y-6 lg:sticky lg:top-6 ${
            mostrarMenuMovil ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* Vistas Inteligentes (Smart lists) */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 px-3 mb-2">
              Vistas Principales
            </p>
            <div className="space-y-1">
              {SMART_LISTS.map(v => {
                const Icon = v.icon
                const isSelected = seleccionId === v.id
                const count = getSmartCount(v.id)

                return (
                  <button
                    data-testid="list-row"
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setSeleccionId(v.id)
                      setMostrarMenuMovil(false)
                    }}
                    className={`w-full h-10 flex items-center justify-between py-2 px-3 rounded-[10px] text-xs transition-all cursor-pointer group ${
                      isSelected
                        ? 'bg-neutral-800 text-white shadow-sm border border-white/10 font-semibold'
                        : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/40 font-medium'
                    }`}
                    style={isSelected ? { color: v.color } : {}}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 shrink-0" style={{ color: isSelected ? v.color : undefined }} />
                      <span className="truncate">{v.label}</span>
                    </div>
                    {count > 0 && (
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                          isSelected ? 'bg-white/15 text-white' : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Divisor */}
          <div className="h-px bg-white/6" />

          {/* Listas Personalizadas / Asignaturas */}
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Mis Asignaturas / Listas
              </p>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-white/5">
                {proyectos.length}
              </span>
            </div>

            {/* Listado jerárquico de listas y sublistas con 4px entre filas */}
            <div className="space-y-1 max-h-[380px] overflow-y-auto pr-1">
              {rootProjects.map(p => renderProjectRow(p, 0))}

              {proyectos.length === 0 && (
                <p className="text-xs text-neutral-500 italic px-3 py-2">
                  No tienes listas todavía. Crea una para tus asignaturas.
                </p>
              )}
            </div>

            {/* Botón "+ Nueva lista" de 40px con 12px margen superior (mt-3) */}
            <button
              type="button"
              onClick={() => {
                setProyectoEditar(null)
                setIsListModalOpen(true)
              }}
              className="h-10 mt-3 flex items-center justify-center gap-2 w-full px-4 rounded-xl text-xs font-semibold text-purple-300 hover:text-white bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2]" />
              <span>Nueva lista</span>
            </button>
          </div>
        </aside>

        {/* ========================================================
            COLUMNA DERECHA: Vista de Tareas & Entrada rápida
            ======================================================== */}
        <main className="lg:col-span-8 xl:col-span-9 space-y-6">
          
          {/* Cabecera Contextual de la Lista: 24px de separación con la barra de añadir (mb-6) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/8 mb-6">
            <div className="flex items-center gap-3">
              {proyectoActivo ? (
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
                  style={{
                    background: `${proyectoActivo.color || '#8b5cf6'}20`,
                    color: proyectoActivo.color || '#8b5cf6',
                    border: `1px solid ${proyectoActivo.color || '#8b5cf6'}40`,
                  }}
                >
                  <BookOpen className="w-5 h-5" />
                </div>
              ) : smartActiva ? (
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
                  style={{
                    background: `${smartActiva.color}20`,
                    color: smartActiva.color,
                    border: `1px solid ${smartActiva.color}40`,
                  }}
                >
                  <smartActiva.icon className="w-5 h-5" />
                </div>
              ) : null}

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-neutral-100" style={{ letterSpacing: 0, lineHeight: 1.2 }}>
                    {proyectoActivo ? proyectoActivo.nombre : smartActiva?.label || 'Tareas'}
                  </h1>

                  {proyectoActivo && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setProyectoEditar(proyectoActivo)
                          setIsListModalOpen(true)
                        }}
                        className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                        title="Editar nombre o color de la lista"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* Botón + Nueva sublista en cabecera */}
                      <button
                        type="button"
                        onClick={() => {
                          setProyectoEditar(null)
                          setParentIdParaModal(proyectoActivo.id)
                          setIsListModalOpen(true)
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-purple-300 hover:text-white bg-purple-500/15 hover:bg-purple-500/25 transition-all cursor-pointer border border-purple-500/30 shadow-xs"
                      >
                        <Plus className="w-3 h-3 stroke-[2.5]" />
                        <span>Sublista</span>
                      </button>

                      {/* Toggle de agrupación por sublista si tiene sublistas */}
                      {tieneSublistas && (
                        <button
                          type="button"
                          onClick={() => setAgruparPorSublista(!agruparPorSublista)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                            agruparPorSublista
                              ? 'bg-purple-600 text-white border-purple-500'
                              : 'bg-neutral-900 text-neutral-400 border-white/8 hover:text-neutral-200'
                          }`}
                          title="Agrupar tareas por sublistas"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>Agrupar</span>
                        </button>
                      )}
                    </>
                  )}
                </div>

                <p className="text-xs text-neutral-400 mt-0.5">
                  {proyectoActivo
                    ? `${tareasActivas.length} tareas pendientes · ${tareasCompletadas.length} completadas`
                    : smartActiva?.desc || 'Organización inteligente'}
                </p>
              </div>
            </div>

            {/* Buscador de Tareas: icono a 14px, pl-11 (44px) para no tapar la "B" */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-[14px] top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
              <input
                data-testid="input-with-icon"
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar tareas..."
                className="input w-full h-11 pl-11 pr-4 text-sm rounded-xl bg-neutral-900/70 border border-white/8 placeholder:text-neutral-500 outline-none"
              />
            </div>
          </div>

          {/* Sublistas chips / tabs de navegación rápida si el proyecto o su padre tiene sublistas */}
          {proyectoActivo && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-4 scrollbar-none">
              <button
                type="button"
                onClick={() => setSeleccionId(proyectoActivo.parent_id || proyectoActivo.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                  seleccionId === (proyectoActivo.parent_id || proyectoActivo.id)
                    ? 'bg-purple-600/25 text-purple-200 border-purple-500/40 shadow-xs'
                    : 'bg-neutral-900/80 text-neutral-400 border-white/5 hover:text-neutral-200 hover:bg-neutral-800'
                }`}
              >
                {proyectoActivo.parent_id
                  ? `Ver ${proyectos.find(p => p.id === proyectoActivo.parent_id)?.nombre || 'principal'}`
                  : `Todo ${proyectoActivo.nombre} (${getProjectPendingCount(proyectoActivo.id)})`}
              </button>

              {/* Sublistas directas del proyecto activo o de su padre */}
              {proyectos
                .filter(p => p.parent_id === (proyectoActivo.parent_id || proyectoActivo.id))
                .map(sub => {
                  const isSubSelected = seleccionId === sub.id
                  const subCount = getProjectPendingCount(sub.id)
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSeleccionId(sub.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all cursor-pointer border ${
                        isSubSelected
                          ? 'bg-neutral-800 text-white border-white/20 shadow-xs font-semibold'
                          : 'bg-neutral-900/80 text-neutral-400 border-white/5 hover:text-neutral-200 hover:bg-neutral-800 font-medium'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: sub.color || '#8b5cf6' }}
                      />
                      <span>{sub.nombre}</span>
                      {subCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-neutral-300 font-semibold">
                          {subCount}
                        </span>
                      )}
                    </button>
                  )
                })}

              <button
                type="button"
                onClick={() => {
                  setProyectoEditar(null)
                  setParentIdParaModal(proyectoActivo.parent_id || proyectoActivo.id)
                  setIsListModalOpen(true)
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 whitespace-nowrap cursor-pointer transition-colors"
                title="Añadir nueva sublista"
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
                <span>+ Sublista</span>
              </button>
            </div>
          )}

          {/* Barra de añadir: Una sola tarjeta con padding 12px 16px:
              - Arriba el input de 44px
              - Abajo los chips separados 8px entre sí y 12px del input (mt-3)
              - Botón "Agregar" a la derecha alineado con 16px de margen
          */}
          <div data-testid="card" className="card rounded-2xl border border-white/8 bg-neutral-900/70 shadow-lg" style={{ padding: '12px 16px' }}>
            <form onSubmit={handleCrearTareaRapida}>
              <div className="relative flex items-center h-11">
                <Plus className="absolute left-[14px] w-5 h-5 text-purple-400 pointer-events-none" />
                <input
                  data-testid="input-with-icon"
                  type="text"
                  value={nuevoTitulo}
                  onChange={e => setNuevoTitulo(e.target.value)}
                  placeholder={placeholderContextual}
                  className="w-full h-11 pl-11 pr-4 bg-transparent text-sm sm:text-base text-neutral-100 placeholder:text-neutral-500 outline-none"
                />
              </div>

              {/* Fila inferior de chips */}
              <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-white/5 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Selector propio con Popover y accesos rápidos */}
                  <TaskDatePicker value={fechaRapida} onChange={setFechaRapida} />

                  {/* Botón Importante ⭐ */}
                  <button
                    type="button"
                    onClick={() => setEsImportanteRapido(!esImportanteRapido)}
                    className={`h-8 flex items-center gap-1.5 text-xs font-semibold px-3 rounded-xl border transition-all cursor-pointer ${
                      esImportanteRapido || seleccionId === 'importantes'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                        : 'bg-neutral-900/80 text-neutral-400 border-white/8 hover:text-neutral-200 hover:border-white/15'
                    }`}
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        esImportanteRapido || seleccionId === 'importantes'
                          ? 'fill-amber-400 text-amber-400'
                          : ''
                      }`}
                    />
                    <span>Importante</span>
                  </button>

                  {/* Badge de lista activa vinculada */}
                  {proyectoActivo && (
                    <span
                      className="h-8 inline-flex items-center gap-1.5 text-xs font-semibold px-3 rounded-xl border"
                      style={{
                        background: `${proyectoActivo.color || '#8b5cf6'}18`,
                        color: proyectoActivo.color || '#8b5cf6',
                        borderColor: `${proyectoActivo.color || '#8b5cf6'}35`,
                      }}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{proyectoActivo.nombre}</span>
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!nuevoTitulo.trim() || creando}
                  className="h-10 min-w-[96px] px-4 rounded-xl text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center gap-1.5 shadow-md ml-auto"
                  style={{
                    background: proyectoActivo?.color || 'var(--accent)',
                  }}
                >
                  <span>Agregar</span>
                </button>
              </div>
            </form>
          </div>

          {/* Listado de Tareas */}
          <div className="space-y-4">
            {/* Render especial agrupado para vista "Planeadas" */}
            {seleccionId === 'planeadas' && !busqueda ? (
              <div className="space-y-6">
                {/* 1. Vencidas */}
                {tareasVencidas.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span>Vencidas ({tareasVencidas.length})</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {tareasVencidas.map(item => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          onDone={handleDone}
                          onArchived={handleArchived}
                          onDeleted={handleDeleted}
                          onEdit={setTareaSeleccionada}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Para hoy */}
                {tareasParaHoy.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Para hoy ({tareasParaHoy.length})</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {tareasParaHoy.map(item => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          onDone={handleDone}
                          onArchived={handleArchived}
                          onDeleted={handleDeleted}
                          onEdit={setTareaSeleccionada}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Próximas */}
                {tareasFuturas.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 uppercase tracking-wider mb-2">
                      <Calendar className="w-4 h-4 text-sky-400" />
                      <span>Más adelante ({tareasFuturas.length})</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {tareasFuturas.map(item => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          onDone={handleDone}
                          onArchived={handleArchived}
                          onDeleted={handleDeleted}
                          onEdit={setTareaSeleccionada}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {tareasVencidas.length === 0 && tareasParaHoy.length === 0 && tareasFuturas.length === 0 && (
                  <div data-testid="card" className="empty-state mt-6 p-12 card text-center rounded-2xl flex flex-col items-center justify-center gap-3">
                    <Calendar className="w-10 h-10 text-neutral-600 mb-1 mx-auto" />
                    <p className="text-base font-semibold text-neutral-200">No hay tareas planeadas</p>
                    <p className="text-sm text-neutral-400 max-w-xs mx-auto">
                      Las tareas con fecha de vencimiento aparecerán agrupadas por fecha aquí.
                    </p>
                  </div>
                )}
              </div>
            ) : agruparPorSublista && proyectoActivo && tieneSublistas ? (
              /* Render agrupado por sublistas */
              <div className="space-y-6">
                {/* Tareas directas de la lista principal */}
                {(() => {
                  const directas = tareasActivas.filter(t => t.proyecto_id === proyectoActivo.id)
                  if (directas.length === 0) return null
                  return (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 px-1 mb-2">
                        {proyectoActivo.nombre} (Directas)
                      </p>
                      <div className="flex flex-col gap-2">
                        {directas.map(item => (
                          <ItemCard
                            key={item.id}
                            item={item}
                            onDone={handleDone}
                            onArchived={handleArchived}
                            onDeleted={handleDeleted}
                            onEdit={setTareaSeleccionada}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* Tareas por cada sublista */}
                {descendantIds.map(subId => {
                  const subProj = proyectos.find(p => p.id === subId)
                  if (!subProj) return null
                  const tareasSub = tareasActivas.filter(t => t.proyecto_id === subId)
                  if (tareasSub.length === 0) return null

                  return (
                    <div key={subId} className="space-y-2">
                      <div className="flex items-center gap-2 px-1 mb-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: subProj.color || '#8b5cf6' }} />
                        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                          {subProj.nombre} ({tareasSub.length})
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        {tareasSub.map(item => (
                          <ItemCard
                            key={item.id}
                            item={item}
                            onDone={handleDone}
                            onArchived={handleArchived}
                            onDeleted={handleDeleted}
                            onEdit={setTareaSeleccionada}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}

                {tareasActivas.length === 0 && (
                  <div data-testid="card" className="empty-state mt-6 p-12 card text-center rounded-2xl flex flex-col items-center justify-center gap-3">
                    <CheckSquare className="w-10 h-10 text-neutral-600 mb-1 mx-auto" />
                    <p className="text-base font-semibold text-neutral-200">No hay tareas pendientes</p>
                    <p className="text-sm text-neutral-400 max-w-xs mx-auto">
                      Añade una tarea arriba para comenzar
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Render estándar continuo */
              <div className="space-y-4">
                {tareasActivas.length === 0 && tareasCompletadas.length === 0 ? (
                  <div data-testid="card" className="empty-state mt-6 p-12 card text-center rounded-2xl flex flex-col items-center justify-center gap-3">
                    <CheckSquare className="w-10 h-10 text-neutral-600 mb-1 mx-auto" />
                    <p className="text-base font-semibold text-neutral-200">
                      {busqueda ? 'No se encontraron tareas' : 'No hay tareas pendientes'}
                    </p>
                    <p className="text-sm text-neutral-400 max-w-xs mx-auto">
                      {busqueda ? 'Prueba con otra palabra clave' : 'Añade una tarea arriba para comenzar'}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {tareasActivas.map(item => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        onDone={handleDone}
                        onArchived={handleArchived}
                        onDeleted={handleDeleted}
                        onEdit={setTareaSeleccionada}
                      />
                    ))}
                  </div>
                )}

                {/* Sección Plegable de Completadas */}
                {tareasCompletadas.length > 0 && (
                  <div className="pt-4 border-t border-white/6 space-y-2">
                    <button
                      type="button"
                      onClick={() => setMostrarCompletadas(!mostrarCompletadas)}
                      className="flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-neutral-200 py-1.5 transition-colors cursor-pointer select-none"
                    >
                      <ChevronRight
                        className={`w-4 h-4 transition-transform duration-200 ${
                          mostrarCompletadas ? 'rotate-90' : ''
                        }`}
                      />
                      <span>Completadas ({tareasCompletadas.length})</span>
                    </button>

                    {mostrarCompletadas && (
                      <div className="flex flex-col gap-2 opacity-80 pl-2 border-l-2 border-white/5">
                        {tareasCompletadas.map(item => (
                          <ItemCard
                            key={item.id}
                            item={item}
                            onDone={handleDone}
                            onArchived={handleArchived}
                            onDeleted={handleDeleted}
                            onEdit={setTareaSeleccionada}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal para Crear / Editar Lista o Asignatura */}
      <NewListModal
        isOpen={isListModalOpen}
        onClose={() => {
          setIsListModalOpen(false)
          setProyectoEditar(null)
          setParentIdParaModal(null)
        }}
        onCreated={handleListaCreada}
        onUpdated={handleListaActualizada}
        onDeleted={handleListaEliminada}
        proyectoEditar={proyectoEditar}
        parentIdInicial={parentIdParaModal}
        proyectosDisponibles={proyectos}
      />

      {/* Panel Lateral Deslizante (TaskDetailDrawer) */}
      <TaskDetailDrawer
        item={tareaSeleccionada}
        proyectos={proyectos}
        onClose={() => setTareaSeleccionada(null)}
        onUpdate={handleUpdated}
        onDelete={handleDeleted}
        onToggleDone={handleDone}
      />
    </div>
  )
}
