import type { Metadata } from 'next'
import { Inter, Outfit } from 'next/font/google'
import AppProviders from '@/components/providers/QueryProvider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'Hermes — Planificador Personal',
  description: 'Tu asistente personal inteligente. Captura tareas, ideas, proyectos y gym en un único panel que prioriza y organiza por ti.',
  keywords: ['planificador', 'productividad', 'personal', 'tareas', 'proyectos'],
  icons: {
    icon: [
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon-32.png',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`h-full ${inter.variable} ${outfit.variable}`}>
      <body className="min-h-full">
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  )
}
