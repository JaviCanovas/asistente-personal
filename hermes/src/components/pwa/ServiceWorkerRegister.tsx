'use client'

import { useEffect, useRef } from 'react'
import { useToast } from '@/components/ui/Toast'

export default function ServiceWorkerRegister() {
  const { showToast } = useToast()
  const waitingWorkerRef = useRef<ServiceWorker | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    // En entorno de desarrollo (Next.js Turbopack HMR), desregistrar el Service Worker y limpiar cachés
    // para evitar que chunks desactualizados provoquen errores de "module factory is not available"
    if (process.env.NODE_ENV === 'development') {
      navigator.serviceWorker.getRegistrations().then(regs => {
        for (const reg of regs) {
          reg.unregister()
        }
      })
      if ('caches' in window) {
        caches.keys().then(keys => {
          for (const key of keys) {
            caches.delete(key)
          }
        })
      }
      return
    }

    let refreshing = false
    const hadController = Boolean(navigator.serviceWorker.controller)

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Solo recargar si la app ya estaba controlada por un worker previo (actualización de versión)
      if (hadController && !refreshing) {
        refreshing = true
        window.location.reload()
      }
    })

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        })

        // Comprobar si ya hay un worker esperando
        if (registration.waiting) {
          waitingWorkerRef.current = registration.waiting
          promptNewVersion()
        }

        // Escuchar cuando se detecta un worker nuevo
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              waitingWorkerRef.current = newWorker
              promptNewVersion()
            }
          })
        })

        // Recomprobar versión cuando la app vuelve a primer plano (reapertura)
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(() => {})
          }
        })
      } catch (error) {
        console.warn('[PWA] Error registrando Service Worker:', error)
      }
    }

    const promptNewVersion = () => {
      showToast({
        message: 'Hay una versión nueva de Hermes',
        type: 'info',
        duration: 0, // No autocerrar hasta que decida
        action: {
          label: 'Recargar',
          onClick: () => {
            if (waitingWorkerRef.current) {
              waitingWorkerRef.current.postMessage({ type: 'SKIP_WAITING' })
            } else {
              window.location.reload()
            }
          },
        },
      })
    }

    registerSW()
  }, [showToast])

  return null
}
