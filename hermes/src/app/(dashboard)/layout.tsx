'use client'

import { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import { Menu, X } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="dashboard-layout">
      {/* Mobile Top Navbar */}
      <header className="md:hidden sticky top-0 left-0 right-0 h-16 bg-[#101320] border-b border-white/5 flex items-center justify-between px-6 z-40">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors focus:outline-none cursor-pointer"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <div className="flex items-center gap-3">
          <span className="font-bold text-white text-sm tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Hermes
          </span>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold tracking-wider text-white text-xs select-none"
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
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar with mobile toggle props */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="dashboard-main">
        {children}
      </main>
    </div>
  )
}
