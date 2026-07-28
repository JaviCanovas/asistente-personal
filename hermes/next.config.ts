import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Permitir que @fullcalendar transpile correctamente
  transpilePackages: ['@fullcalendar/core', '@fullcalendar/react', '@fullcalendar/daygrid', '@fullcalendar/timegrid', '@fullcalendar/interaction'],

  // chrono-node y googleapis son módulos pesados — sólo deben ejecutarse en el servidor
  serverExternalPackages: ['chrono-node', 'googleapis'],

  // Turbopack: evitar que chrono-node se bundlee para el cliente
  turbopack: {
    resolveAlias: {
      'chrono-node': { browser: './src/lib/stubs/chrono-stub.ts' },
      'googleapis': { browser: './src/lib/stubs/googleapis-stub.ts' },
    },
  },
}

export default nextConfig
