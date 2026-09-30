'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { get, set, del } from 'idb-keyval'
import { ToastProvider } from '@/components/ui/Toast'

const IDB_CACHE_KEY = 'hermes_react_query_cache_v1'

export default function AppProviders({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minuto de datos frescos sin refetch
            gcTime: 24 * 60 * 60 * 1000, // 24 horas retenido en caché / IndexedDB
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            retry: 1,
          },
        },
      }),
    []
  )

  const persister = useMemo(() => {
    if (typeof window === 'undefined') return undefined
    return {
      persistClient: async (client: any) => {
        try {
          await set(IDB_CACHE_KEY, client)
        } catch (e) {
          console.warn('[IndexedDB Persister] Error guardando caché:', e)
        }
      },
      restoreClient: async () => {
        try {
          return await get(IDB_CACHE_KEY)
        } catch (e) {
          console.warn('[IndexedDB Persister] Error restaurando caché:', e)
          return undefined
        }
      },
      removeClient: async () => {
        try {
          await del(IDB_CACHE_KEY)
        } catch (e) {
          console.warn('[IndexedDB Persister] Error eliminando caché:', e)
        }
      },
    }
  }, [])

  const content = <ToastProvider>{children}</ToastProvider>

  // Antes de montar en cliente o durante SSR, usar QueryClientProvider estándar
  if (!mounted || !persister) {
    return <QueryClientProvider client={queryClient}>{content}</QueryClientProvider>
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60 * 1000,
        buster: 'v1.0.0',
      }}
    >
      {content}
    </PersistQueryClientProvider>
  )
}
