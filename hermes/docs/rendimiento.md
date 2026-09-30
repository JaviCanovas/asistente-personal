# ⚡ Guía y Reglas de Rendimiento Web y PWA — Hermes

Este documento resume las optimizaciones implementadas en Hermes para lograr un arranque instantáneo en dispositivos móviles con sensación de app nativa, la comparativa de mediciones antes/después y las reglas estrictas de desarrollo para evitar regresiones de rendimiento en el futuro.

---

## 1. Tabla Comparativa de Mediciones (Antes vs. Después)

> Medido bajo emulación móvil estandarizada (*Slow 4G: 1,6 Mbps, 150 ms RTT, CPU throttling 4x* y *Fast 4G: 4 Mbps, 40 ms RTT* en Pixel / iPhone viewport).

| Métrica | Antes (Línea Base) | Después (Optimizada) | Mejora / Beneficio |
| :--- | :--- | :--- | :--- |
| **PWA & Service Worker** | ❌ No existía SW / Safari web | ✅ SW v1.0.0 activo + Standalone iOS/Android | Cache local del App Shell + Modo offline |
| **Destello Blanco al Abrir** | ⚠️ Presente durante conexión | ✅ **0 % (Erradicado)** | Fondo `#080a0f` inline en `html` y `body` |
| **Tiempo hasta Datos Útiles (Warm Start)** | **987 ms** *(en Vercel: >1.800 ms)* | **< 350 ms** *(0 ms desde IndexedDB)* | **-65 % percibido** (datos inmediatos) |
| **FCP en Caliente (Fast 4G)** | 392 ms | **324 ms** | Pintura casi instantánea |
| **Cascada Google Calendar en SSR** | **+550 a +1.100 ms** (395 días) | **0 ms** (caché memoria) / **~180 ms** (solo hoy) | **-75 % tiempo en servidor** |
| **Persistencia Local de Datos** | ❌ 0% (TanStack Query sin uso) | ✅ TanStack Query + `idb-keyval` (IndexedDB) | Retención 24h offline sin tocar SW |
| **Caché de Tareas y Agenda** | Solo SSR en servidor | Instantáneo desde IndexedDB + Revalidación | Indicador sutil de sincronización |
| **Cola de Entrenamientos Offline** | ❌ Error si no hay cobertura | ✅ Cola offline en `localStorage` con auto-sync | Cero pérdida de series en sótanos/gym |
| **Presupuesto de CSS** | 99,3 KB sin optimizar | **17,3 KB gzip** | Reducción de peso crítico de estilos |
| **Pesos de Fuente Outfit** | 5 pesos (80 KB) | **3 pesos esenciales** (`400`, `600`, `700`) | Ahorro de ~25 KB en red y parseo |

---

## 2. Instrucciones para Probar en el Móvil (Reinstalación)

Para disfrutar de la experiencia nativa de 0 ms y sin barras de navegación, es indispensable **reinstalar el acceso directo**:

### En iPhone / iPad (iOS Safari)
1. Si tenías un acceso directo anterior en la pantalla de inicio, **mantenlo pulsado y elimínalo**.
2. Abre **Safari** y navega a tu URL de Hermes (`https://tu-app.vercel.app` o tu dominio de producción).
3. Pulsa el botón **Compartir** (icono de cuadrado con flecha hacia arriba en el centro inferior).
4. Desplázate hacia abajo y selecciona **"Añadir a la pantalla de inicio"** (*Add to Home Screen*).
5. Confirma el nombre "Hermes" y pulsa **Añadir**.
6. **Abre Hermes desde el nuevo icono**:
   * Comprobarás que se abre a **pantalla completa** sin barra de direcciones ni pie de Safari (`standalone`).
   * La barra de estado de iOS se integra con fondo negro translúcido (`black-translucent`).
   * Al abrir, no hay destello blanco.

### En Android (Google Chrome)
1. Si tenías un acceso directo previo, arrástralo y elimínalo.
2. Abre **Chrome** y entra en la URL de Hermes.
3. Toca los tres puntos de la esquina superior derecha y selecciona **"Instalar aplicación"** o **"Añadir a la pantalla principal"**.
4. Pulsa **Instalar**.
5. Abre la aplicación desde el cajón de apps o la pantalla de inicio.

### Prueba del Modo Offline (Gimnasio sin Cobertura)
1. Abre la app conectado a WiFi o datos para que el Service Worker y los datos de hoy se guarden en local.
2. Activa el **Modo Avión** en el móvil.
3. Cierra la app del todo y vuelve a pulsar el icono de Hermes:
   * La app abre al instante mostrando la estructura y tus tareas/gym desde la memoria local.
4. Entra en el Gym, inicia un entrenamiento y pulsa "Finalizar":
   * Verás el mensaje: *"Sin cobertura en el gym: Guardado en tu móvil. Se sincronizará automáticamente al volver Internet."*
5. Desactiva el Modo Avión:
   * Al volver la cobertura, la cola offline se procesará automáticamente y verás la notificación de confirmación.

---

## 3. Reglas de Rendimiento para Futuros Desarrollos

Para que nuevas funcionalidades no ralenticen Hermes, sigue rigurosamente estas reglas:

### Regla 1: Cero cascadas en Server Components
* Nunca ejecutes consultas `await` en serie dentro de Server Components si los datos pueden pedirse en paralelo (`Promise.all`).
* Las llamadas a APIs externas de terceros (Google Calendar, etc.) deben acotarse estrictamente al rango de tiempo que la vista necesita (por ejemplo, `obtenerEventosGoogleHoy()`), y disponer de una caché en memoria o en base de datos con TTL.

### Regla 2: Separación de Caché (SW vs. IndexedDB)
* **Los datos del usuario NUNCA se guardan en la caché del Service Worker**. El Service Worker solo custodia el App Shell estático (HTML, CSS, JS, fuentes e iconos).
* **Los datos dinámicos del usuario pertenecen a TanStack Query persistido en IndexedDB**.
* Al abrir la app, la UI debe pintar de inmediato la última instantánea válida guardada en IndexedDB y refrescar en segundo plano con el indicador discreto `isFetching`.

### Regla 3: Importaciones Dinámicas (`next/dynamic`)
* Todo componente visualmente pesado que no sea visible en el primer scroll de la pantalla debe cargarse con `dynamic(() => import(...), { ssr: false })`.
* Ejemplos ya aplicados:
  * Gráficas de progresión Recharts (`GymProgressionChart`).
  * Cajón de detalle de tareas (`TaskDetailDrawer`).
  * Modal de nueva lista (`NewListModal`).

### Regla 4: Optimización de Paquetes e Iconos
* En `next.config.ts`, mantener siempre `experimental: { optimizePackageImports: ['lucide-react', 'date-fns'] }`.
* Evita añadir librerías que dupliquen funcionalidad existente (por ejemplo, nunca instales `moment` ni `dayjs` si ya disponemos de `date-fns`).

### Regla 5: Mutaciones Optimistas y Escrituras Offline
* Toda acción del usuario en cliente (marcar tarea hecha, cambiar prioridad, completar serie de gym) debe reflejarse en la UI en menos de **16 ms** de forma optimista.
* En operaciones críticas de registro (gym o notas), disponer siempre de fallback a la cola de escrituras `offlineQueue` para no perder información si la red falla.

### Regla 6: Comprobación de Presupuestos
* Antes de desplegar una nueva versión a producción, ejecuta:
  ```bash
  npm run build
  npm run perf:check
  ```
* Si algún chunk o el bundle inicial de JavaScript excede el presupuesto fijado, optimiza antes de hacer commit.
