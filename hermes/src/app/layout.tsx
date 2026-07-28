import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Hermes — Planificador Personal',
  description: 'Tu asistente personal inteligente. Captura tareas, ideas, proyectos y gym en un único panel que prioriza y organiza por ti.',
  keywords: ['planificador', 'productividad', 'personal', 'tareas', 'proyectos'],
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`h-full ${inter.variable}`}>
      <body className="min-h-full">{children}</body>
    </html>
  )
}
