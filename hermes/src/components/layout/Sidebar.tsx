'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  Inbox,
  Home,
  Calendar,
  CheckSquare,
  FolderOpen,
  FileText,
  Dumbbell,
  RotateCcw,
  RefreshCw,
  CheckCircle,
  Settings,
  Sun,
  Lightbulb,
  Clock,
} from 'lucide-react'
import { checkGoogleConnection } from '@/lib/actions/health'

interface NavItem {
  href: string
  label: string
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>
  color: string   // accent colour for active glow
  badge?: string
}

const NAV_ITEMS: NavItem[] = [
  { href: '/',                 label: 'Inicio',           icon: Home,        color: '#a78bfa' },
  { href: '/mi-dia',           label: 'Mi Día',           icon: Sun,         color: '#f59e0b' },
  { href: '/inbox',            label: 'Bandeja',          icon: Inbox,       color: '#60a5fa' },
  { href: '/horario',          label: 'Horario',          icon: Clock,       color: '#EDA900' },
  { href: '/calendario',       label: 'Calendario',       icon: Calendar,    color: '#34d399' },
  { href: '/tareas',           label: 'Tareas',           icon: CheckSquare, color: '#a78bfa' },
  { href: '/gym',              label: 'Gimnasio',         icon: Dumbbell,    color: '#10b981' },
  { href: '/proyectos',        label: 'Proyectos',        icon: FolderOpen,  color: '#f59e0b' },
  { href: '/notas',            label: 'Notas',            icon: FileText,    color: '#94a3b8' },
  { href: '/revision-semanal', label: 'Revisión Semanal', icon: RotateCcw,  color: '#c084fc' },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null)

  useEffect(() => {
    checkGoogleConnection().then(setGoogleConnected).catch(() => setGoogleConnected(false))
  }, [pathname])

  return (
    <>
      <style>{`
        .nav-link-item {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 10px 13px;
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: 450;
          color: var(--text-muted);
          text-decoration: none;
          transition: all 0.18s ease;
          position: relative;
          overflow: hidden;
          border: 1px solid transparent;
          cursor: pointer;
          user-select: none;
        }
        .nav-link-item:hover:not(.nav-link-active) {
          background: rgba(255,255,255,0.04);
          color: var(--text-primary);
          border-color: rgba(255,255,255,0.05);
        }
        .nav-link-item:hover:not(.nav-link-active) .nav-icon {
          opacity: 1;
        }
        .nav-link-active {
          font-weight: 600;
          border-color: rgba(139, 92, 246, 0.2);
        }
        .nav-icon {
          opacity: 0.5;
          transition: opacity 0.2s, color 0.2s;
          flex-shrink: 0;
        }
        .nav-link-active .nav-icon {
          opacity: 1;
        }
        .nav-active-pill {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 60%;
          border-radius: 0 4px 4px 0;
        }
        .sidebar-section-label {
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-muted);
          padding: 0 13px;
          margin-top: 6px;
          margin-bottom: 2px;
          opacity: 0.6;
        }
      `}</style>

      <aside
        className={`fixed top-0 bottom-0 left-0 h-screen flex flex-col z-50 overflow-hidden transition-transform duration-300 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          width: 'var(--sidebar-width)',
          background: 'linear-gradient(180deg, #0e1120 0%, #0b0d14 100%)',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Logo / Avatar */}
        <div className="flex items-center gap-3 px-5 py-5 select-none">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-xs shrink-0"
            style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 60%, #ec4899 100%)',
              boxShadow: '0 0 18px rgba(124, 58, 237, 0.45)',
            }}
          >
            JC
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-none" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.01em' }}>
              Hermes
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Asistente personal</p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '0 20px' }} />

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto py-3 px-3" style={{ scrollbarWidth: 'none' }}>
          {/* Grupo: Principal */}
          <p className="sidebar-section-label">Principal</p>
          <ul className="space-y-0.5 mb-3">
            {NAV_ITEMS.slice(0, 5).map(({ href, label, icon: Icon, color }) => {
              const isActive =
                href === '/'
                  ? pathname === '/'
                  : pathname === href || pathname.startsWith(href + '/')

              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onClose}
                    className={`nav-link-item ${isActive ? 'nav-link-active' : ''}`}
                    style={isActive ? {
                      background: `${color}12`,
                      color: color,
                    } : {}}
                  >
                    {isActive && (
                      <span className="nav-active-pill" style={{ background: color }} />
                    )}
                    <Icon
                      className="nav-icon"
                      style={{ width: 17, height: 17, color: isActive ? color : undefined }}
                    />
                    <span>{label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Grupo: Salud & Proyectos */}
          <p className="sidebar-section-label">Salud & Trabajo</p>
          <ul className="space-y-0.5 mb-3">
            {NAV_ITEMS.slice(5, 8).map(({ href, label, icon: Icon, color }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/')

              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onClose}
                    className={`nav-link-item ${isActive ? 'nav-link-active' : ''}`}
                    style={isActive ? {
                      background: `${color}12`,
                      color: color,
                    } : {}}
                  >
                    {isActive && (
                      <span className="nav-active-pill" style={{ background: color }} />
                    )}
                    <Icon
                      className="nav-icon"
                      style={{ width: 17, height: 17, color: isActive ? color : undefined }}
                    />
                    <span>{label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Grupo: Revisión */}
          <p className="sidebar-section-label">Reflexión</p>
          <ul className="space-y-0.5">
            {NAV_ITEMS.slice(8).map(({ href, label, icon: Icon, color }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/')

              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onClose}
                    className={`nav-link-item ${isActive ? 'nav-link-active' : ''}`}
                    style={isActive ? {
                      background: `${color}12`,
                      color: color,
                    } : {}}
                  >
                    {isActive && (
                      <span className="nav-active-pill" style={{ background: color }} />
                    )}
                    <Icon
                      className="nav-icon"
                      style={{ width: 17, height: 17, color: isActive ? color : undefined }}
                    />
                    <span>{label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Google Calendar status */}
        <div className="px-3 pb-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 10 }}>
          {googleConnected === null ? (
            <div className="flex items-center gap-2 px-3 py-2 text-xs rounded-xl" style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)' }}>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Sincronizando...</span>
            </div>
          ) : googleConnected ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
              style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)', color: '#34d399' }}>
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Google Calendar activo</span>
            </div>
          ) : (
            <Link
              href="/api/auth/google"
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all justify-center w-full"
              style={{
                background: 'rgba(139, 92, 246, 0.08)',
                border: '1px solid rgba(139, 92, 246, 0.18)',
                color: 'var(--text-accent)',
              }}
            >
              <RefreshCw className="w-3 h-3 shrink-0" />
              <span>Conectar Google Calendar</span>
            </Link>
          )}
        </div>

        {/* Settings */}
        <div className="px-3 pb-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 8 }}>
          <Link
            href="/configuracion"
            onClick={onClose}
            className="nav-link-item"
          >
            <Settings className="nav-icon" style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: '0.85rem' }}>Configuración</span>
          </Link>
        </div>
      </aside>
    </>
  )
}
