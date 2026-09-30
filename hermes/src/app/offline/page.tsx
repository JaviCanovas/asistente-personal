'use client'

import Link from 'next/link'
import { WifiOff, RefreshCw, Home } from 'lucide-react'



export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ backgroundColor: '#080a0f' }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
        }}
      >
        <WifiOff className="w-8 h-8 text-violet-400" />
      </div>

      <h1 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-outfit), Outfit, sans-serif' }}>
        Modo sin conexión
      </h1>

      <p className="text-slate-400 max-w-sm mb-8 text-sm leading-relaxed">
        Hermes no detecta conexión a Internet. Si abriste la app recientemente, tus tareas y entrenamientos están guardados en tu dispositivo.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-lg cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
            boxShadow: '0 4px 20px rgba(124, 58, 237, 0.4)',
          }}
        >
          <Home className="w-4 h-4" />
          <span>Volver al Inicio</span>
        </Link>

        <button
          onClick={() => {
            if (typeof window !== 'undefined') window.location.reload()
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white transition-colors border border-white/10 hover:bg-white/5 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reintentar</span>
        </button>
      </div>
    </div>
  )
}
