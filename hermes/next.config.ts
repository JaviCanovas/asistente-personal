import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // chrono-node y googleapis son módulos pesados — sólo deben ejecutarse en el servidor
  serverExternalPackages: ['chrono-node', 'googleapis'],

  // Turbopack: evitar que chrono-node se bundlee para el cliente
  turbopack: {
    resolveAlias: {
      'chrono-node': { browser: './src/lib/stubs/chrono-stub.ts' },
      'googleapis': { browser: './src/lib/stubs/googleapis-stub.ts' },
    },
  },

  // Optimización de importaciones pesadas (árbol de iconos y fechas)
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },

  // Cabeceras específicas para el service worker
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ]
  },
}

export default nextConfig
