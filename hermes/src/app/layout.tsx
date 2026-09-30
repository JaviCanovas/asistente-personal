import type { Metadata, Viewport } from 'next'
import { Inter, Outfit } from 'next/font/google'
import AppProviders from '@/components/providers/QueryProvider'
import ServiceWorkerRegister from '@/components/pwa/ServiceWorkerRegister'
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
  weight: ['400', '600', '700'],
})

export const viewport: Viewport = {
  themeColor: '#080a0f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'Hermes — Planificador Personal',
  description: 'Tu asistente personal inteligente. Captura tareas, ideas, proyectos y gym en un único panel que prioriza y organiza por ti.',
  keywords: ['planificador', 'productividad', 'personal', 'tareas', 'proyectos'],
  manifest: '/manifest.json',
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
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Hermes',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`h-full ${inter.variable} ${outfit.variable}`}
      style={{ backgroundColor: '#080a0f', colorScheme: 'dark' }}
    >
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-full" style={{ backgroundColor: '#080a0f', colorScheme: 'dark' }}>
        <AppProviders>
          <ServiceWorkerRegister />
          {children}
        </AppProviders>
      </body>
    </html>
  )
}
