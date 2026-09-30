'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Home, Sun, CheckSquare, Dumbbell, Menu } from 'lucide-react'

interface MobileBottomNavProps {
  onOpenMenu: () => void
}

export default function MobileBottomNav({ onOpenMenu }: MobileBottomNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  const NAV_BUTTONS = [
    { href: '/', label: 'Inicio', icon: Home, color: '#a78bfa' },
    { href: '/mi-dia', label: 'Mi Día', icon: Sun, color: '#f59e0b' },
    { href: '/tareas', label: 'Tareas', icon: CheckSquare, color: '#8b5cf6' },
    { href: '/gym', label: 'Gym', icon: Dumbbell, color: '#10b981' },
  ]

  // Prefetching inteligente en momentos de inactividad para las rutas principales
  useEffect(() => {
    const prefetchRoutes = () => {
      ['/tareas', '/gym', '/mi-dia'].forEach((route) => {
        router.prefetch(route)
      })
    }

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const handle = (window as any).requestIdleCallback(prefetchRoutes, { timeout: 2000 })
      return () => (window as any).cancelIdleCallback(handle)
    } else {
      const timer = setTimeout(prefetchRoutes, 1200)
      return () => clearTimeout(timer)
    }
  }, [router])

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 transition-all duration-300"
      style={{
        background: 'linear-gradient(180deg, rgba(14, 17, 28, 0.88) 0%, rgba(9, 11, 18, 0.96) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.5)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 8px), 8px)',
      }}
    >
      <div className="grid grid-cols-5 items-center justify-around h-15 px-2">
        {NAV_BUTTONS.map(({ href, label, icon: Icon, color }) => {
          const isActive = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')

          return (
            <Link
              key={href}
              href={href}
              prefetch={true}
              onTouchStart={() => router.prefetch(href)}
              onMouseEnter={() => router.prefetch(href)}
              className="flex flex-col items-center justify-center py-1 select-none transition-transform active:scale-90"
            >
              <div
                className={`relative flex items-center justify-center w-10 h-7 rounded-xl transition-all duration-200 ${
                  isActive ? 'shadow-sm' : ''
                }`}
                style={
                  isActive
                    ? {
                        background: `${color}20`,
                        color: color,
                      }
                    : {
                        color: '#64748b',
                      }
                }
              >
                <Icon className="w-5 h-5 transition-transform" style={{ color: isActive ? color : undefined }} />
                {isActive && (
                  <span
                    className="absolute -bottom-0.5 w-1 h-1 rounded-full animate-pulse"
                    style={{ background: color, boxShadow: `0 0 8px ${color}` }}
                  />
                )}
              </div>
              <span
                className="text-[10px] mt-0.5 font-medium transition-colors"
                style={{
                  color: isActive ? '#f8fafc' : '#64748b',
                  fontWeight: isActive ? 600 : 450,
                }}
              >
                {label}
              </span>
            </Link>
          )
        })}

        {/* Botón de Menú para abrir el drawer completo */}
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center py-1 select-none transition-transform active:scale-90 cursor-pointer"
        >
          <div className="flex items-center justify-center w-10 h-7 rounded-xl text-slate-400 hover:text-white transition-colors">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 font-medium text-slate-400">
            Más
          </span>
        </button>
      </div>
    </nav>
  )
}
