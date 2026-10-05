// Hermes PWA — Service Worker v1.0.0
// Reglas estrictas:
// 1. Cero caché de datos de usuario/Supabase en el Service Worker.
// 2. Precache del App Shell y estáticos inmutables.
// 3. Navigation Preload y fallback instantáneo a caché para navegación.
// 4. Actualización controlada mediante SKIP_WAITING.

const SW_VERSION = 'hermes-v1.0.1';
const SHELL_CACHE = `hermes-shell-${SW_VERSION}`;
const STATIC_CACHE = `hermes-static-${SW_VERSION}`;

const PRECACHE_ASSETS = [
  '/offline',
  '/manifest.json',
  '/favicon-32.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

// Instalación: precachear recursos base del shell y activar inmediatamente
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

// Activación: limpiar cachés antiguas y habilitar Navigation Preload
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Habilitar Navigation Preload si el navegador lo soporta
      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.enable();
        } catch (e) {
          console.warn('[SW] Error habilitando navigationPreload:', e);
        }
      }

      // Eliminar versiones obsoletas de la caché
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== SHELL_CACHE && key !== STATIC_CACHE) {
            return caches.delete(key);
          }
        })
      );

      // Reclamar el control de todos los clientes inmediatamente
      await self.clients.claim();
    })()
  );
});

// Intercepción de peticiones (Fetch)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 0. En desarrollo local con Next.js Turbopack HMR, no interceptar peticiones con caché
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.port === '3000') {
    return;
  }

  // 1. Métodos que no sean GET nunca se cachean en el SW
  if (request.method !== 'GET') {
    return;
  }

  // 2. NUNCA cachear datos dinámicos ni APIs en el Service Worker:
  //    - Supabase REST/Auth (/rest/v1, /auth/v1)
  //    - Google Calendar API
  //    - Route Handlers de Next.js (/api/)
  //    - Server Actions de Next.js (cabecera 'next-action')
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com') ||
    url.pathname.startsWith('/api/') ||
    request.headers.get('next-action')
  ) {
    return; // Petición directa a la red sin interceptar
  }

  // 3. Navegación de páginas (HTML App Shell)
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Intentar primero usar la respuesta de navigation preload
          const preloadResponse = await event.preloadResponse;
          if (preloadResponse) {
            const cache = await caches.open(SHELL_CACHE);
            cache.put(request, preloadResponse.clone());
            return preloadResponse;
          }

          // Petición de red con fallback rápido (1.8s) a caché para no congelar la pantalla en conexiones lentas
          const networkPromise = fetch(request);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Network timeout')), 1800)
          );

          try {
            const response = await Promise.race([networkPromise, timeoutPromise]);
            if (response && response.ok) {
              const cache = await caches.open(SHELL_CACHE);
              cache.put(request, response.clone());
              return response;
            }
          } catch (timeoutOrNetworkErr) {
            // Si la red tarda más de 1.8s o falla, buscar en la caché
            const cachedResponse = await caches.match(request);
            if (cachedResponse) {
              // Devolver inmediatamente lo cacheado y actualizar en background
              networkPromise.then(async (bgRes) => {
                if (bgRes && bgRes.ok) {
                  const cache = await caches.open(SHELL_CACHE);
                  cache.put(request, bgRes);
                }
              }).catch(() => {});
              return cachedResponse;
            }

            // Fallback a la raíz '/' cacheada si existe
            const fallbackHome = await caches.match('/');
            if (fallbackHome) return fallbackHome;

            // Esperar a la red si no había nada en caché
            const finalNetRes = await networkPromise;
            if (finalNetRes) return finalNetRes;
          }
        } catch (err) {
          // Si estamos totalmente offline y no hay caché de la página específica
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;

          const cachedHome = await caches.match('/');
          if (cachedHome) return cachedHome;

          const cachedOffline = await caches.match('/offline');
          if (cachedOffline) return cachedOffline;
        }

        return new Response('Sin conexión', { status: 503, statusText: 'Offline' });
      })()
    );
    return;
  }

  // 4. Recursos estáticos inmutables de Next.js (/_next/static/...)
  //    Tienen hash en el nombre: Cache-First
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      (async () => {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          return cachedResponse || new Response('', { status: 404 });
        }
      })()
    );
    return;
  }

  // 5. Otros recursos estáticos (iconos, imágenes, manifest, fuentes)
  //    Stale-While-Revalidate
  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'style' ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(
      (async () => {
        const cachedResponse = await caches.match(request);
        const fetchPromise = fetch(request)
          .then(async (networkResponse) => {
            if (networkResponse.ok) {
              const cache = await caches.open(STATIC_CACHE);
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })()
    );
  }
});

let restTimerTimeout = null;

// Manejo de mensajes desde el cliente (p. ej., SKIP_WAITING para actualización, o timer de descanso)
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'START_REST_TIMER') {
    const { targetEndTime, ejercicio } = event.data;
    if (restTimerTimeout) clearTimeout(restTimerTimeout);

    const delay = Math.max(0, targetEndTime - Date.now());
    restTimerTimeout = setTimeout(() => {
      self.registration.showNotification('⏱️ ¡Descanso completado!', {
        body: `Tiempo de descanso cumplido para ${ejercicio || 'tu ejercicio'}. ¡A por la siguiente serie!`,
        icon: '/icon-192.png',
        badge: '/favicon-32.png',
        tag: 'gym-rest-timer',
        vibrate: [200, 100, 200, 100, 400],
        renotify: true,
        data: { url: '/gym' }
      });
      restTimerTimeout = null;
    }, delay);
  }

  if (event.data.type === 'CANCEL_REST_TIMER') {
    if (restTimerTimeout) {
      clearTimeout(restTimerTimeout);
      restTimerTimeout = null;
    }
  }
});

// Click en notificación del temporizador de descanso
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/gym';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url && client.url.includes('/gym')) {
            return client.focus();
          }
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

