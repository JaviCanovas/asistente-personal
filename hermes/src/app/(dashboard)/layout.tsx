'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import MobileBottomNav from '@/components/layout/MobileBottomNav'
import { Menu, X } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Sincronización global en segundo plano de acciones guardadas offline
  useEffect(() => {
    const handleGlobalSync = async () => {
      try {
        const { syncOfflineQueue } = await import('@/lib/offlineQueue')
        const { guardarSesionEstructurada } = await import('@/lib/actions/health')
        const { actualizarItem } = await import('@/lib/actions/items')
        await syncOfflineQueue({
          onSyncWorkout: async (payload) => {
            const res = await guardarSesionEstructurada(payload)
            return res.ok
          },
          onSyncTask: async (itemId) => {
            const res = await actualizarItem(itemId, { estado: 'hecho' })
            return !!res
          },
        })
      } catch (err) {
        console.warn('[DashboardLayout] Error sincronizando acciones offline:', err)
      }
    }

    if (typeof window !== 'undefined' && navigator.onLine) {
      handleGlobalSync()
    }

    window.addEventListener('online', handleGlobalSync)
    return () => window.removeEventListener('online', handleGlobalSync)
  }, [])

  return (
    <div className="dashboard-layout">
      {/* Mobile Top Navbar with glassmorphism */}
      <header
        className="md:hidden sticky top-0 left-0 right-0 h-14 flex items-center justify-between px-5 z-40"
        style={{
          background: 'rgba(13, 16, 27, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors focus:outline-none cursor-pointer"
          aria-label="Abrir menú"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <div className="flex items-center gap-2.5">
          <span className="font-bold text-white text-sm" style={{ fontFamily: 'var(--font-outfit), Outfit, sans-serif' }}>
            Hermes
          </span>
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center font-bold tracking-wider text-white text-[11px] select-none shadow-sm"
            style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)',
            }}
          >
            JC
          </div>
        </div>
      </header>

      {/* Backdrop for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/75 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar with mobile toggle props */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <main className="dashboard-main">
        {children}
      </main>

      {/* Mobile Bottom Navigation Dock */}
      <MobileBottomNav onOpenMenu={() => setSidebarOpen(true)} />
    </div>
  )
}
