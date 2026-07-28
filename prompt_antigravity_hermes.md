# PROMPT PARA GOOGLE ANTIGRAVITY — Proyecto "Hermes" (Planificador Personal Inteligente)

> Instrucciones de uso: pega esto en el chat del agente de Antigravity (Editor view o Manager surface) como brief inicial de un proyecto nuevo. Deja que primero te devuelva un plan antes de que empiece a escribir código.

---

## BLOQUE 0 — Rol y forma de trabajar

Actúa como ingeniero full-stack senior. Vas a construir una aplicación web real, funcional y desplegable, no un prototipo estático. Antes de escribir código:

1. Propón el stack técnico (frontend, backend/API, base de datos, hosting) y justifícalo brevemente.
2. Genera un plan de trabajo por fases (esquema de datos → backend → frontend → lógica inteligente → pulido/despliegue).
3. Indica qué archivos/estructura de carpetas vas a crear antes de tocar código.

No es un calendario simple: es un planificador personal con varios módulos e inteligencia propia (ver bloques siguientes).

---

## BLOQUE 1 — Resumen ejecutivo del proyecto

"Hermes" es un asistente personal en forma de web app. No es un calendario ni un gestor de tareas al uso: es un panel único donde capturo tareas, ideas, notas, proyectos, entrenamientos y nutrición, y la propia app organiza, prioriza y planifica por mí, explicando siempre sus decisiones.

Todo pasa primero por una bandeja de entrada (Inbox) antes de clasificarse en su módulo definitivo.

---

## BLOQUE 2 — Stack y arquitectura recomendada

Preferencia de base (ajústala si tienes una razón técnica mejor, pero explícala):
- Frontend: Next.js (React) con Tailwind.
- Backend: API routes / server actions dentro del propio Next.js, o un backend ligero separado si lo justificas.
- Base de datos: Supabase (Postgres) — es la que ya uso en otros proyectos personales, así que mantengamos consistencia salvo que haya un motivo de peso para cambiarla.
- Autenticación: Google OAuth 2.0 (ya implementado). Los tokens se guardan en la tabla `google_credentials` de Supabase.
- Despliegue: Vercel para el frontend/backend; Supabase gestiona la base de datos.

Estructura general:
- Frontend y backend separados lógicamente aunque convivan en el mismo repo.
- Toda la lógica de clasificación, priorización y reorganización vive en el backend (funciones/servicios), no dispersa en el frontend.
- La base de datos es el único almacén de verdad; el frontend nunca decide lógica de negocio, solo la consume.

---

## BLOQUE 3 — Modelo de datos

Entidad principal `Item`, con un campo `tipo` en vez de tablas independientes por cada cosa. Esto simplifica la lógica y facilita ampliar la app más adelante.

Tipos de `Item`:
- `Tarea`
- `Evento`
- `Idea`
- `Nota`
- `Recordatorio`

Campos comunes sugeridos (ajústalos si lo justificas): id, tipo, título, descripción, estado (`sin_procesar` / `activo` / `hecho` / `archivado`), fecha_creación, fecha_límite o fecha_evento, proyecto_id (opcional, FK), etiquetas, prioridad, origen, metadata (JSON flexible por tipo).

Entidades específicas, fuera del modelo genérico porque su estructura es distinta:
- **Rutina Gym**: ejercicio, series, repeticiones, peso/marca, fecha, notas de progresión.
- **Nutrición**: registro de comida, macros o notas dietéticas, fecha, relación con mis objetivos.

Entidad de soporte:
- **Proyecto**: agrupa Items relacionados.

`Inbox` no es una tabla nueva: es el estado `sin_procesar` de cualquier `Item` recién creado, antes de asignarle proyecto/etiquetas/prioridad definitivos.

Genera el esquema final (tablas, tipos de datos, relaciones y migraciones de Supabase).

---

## BLOQUE 4 — Módulos de la Web App

La app debe tener estas secciones, todas conectadas a la misma base de datos:

- 📥 **Inbox**: captura rápida de cualquier cosa (texto libre), sin necesidad de elegir tipo/proyecto en el momento; se clasifica después.
- 📅 **Calendario**: vista mensual/semanal de Eventos y Tareas con fecha. Sincronizado bidireccionalmente con Google Calendar.
- ✅ **Tareas**
- 💡 **Ideas**
- 📁 **Proyectos**: vista de cada proyecto con sus Items asociados.
- 📝 **Notas**
- 🏋️ **Rutina Gym**: histórico de entrenamientos y progresión de marcas por ejercicio. Soporte de plantillas de entrenamiento por día.
- 🌅 **Mi Día**: vista diaria integrada con contexto del día (tareas, eventos, gym).
- 📊 **Revisión semanal**: resumen automático de lo completado, pendiente y propuesta de reorganización.

> **Nota**: el módulo de Nutrición queda fuera del scope actual. No lo implementes.

Cada módulo debe permitir crear, editar, archivar y filtrar/buscar. La navegación entre módulos debe ser fluida (sidebar o similar), no pantallas aisladas.

---

## BLOQUE 5 — Lógica inteligente integrada en la app

Esta es la parte que diferencia Hermes de un Notion o un Todoist cualquiera. La app debe incluir, como lógica de backend (no como un chatbot externo):

1. **Clasificación desde Inbox**: al procesar un Item sin_procesar, sugerir tipo, proyecto y etiquetas probables a partir del texto (puede apoyarse en un modelo de lenguaje vía API si lo propones, pero la decisión final la confirmo yo con un clic).
2. **Detección de fechas límite** mencionadas en lenguaje natural dentro del texto del Item.
3. **Priorización diaria**: una vista "Hoy" que calcule y muestre qué debería hacer hoy, según fecha límite, prioridad y proyecto.
4. **Buscador de huecos libres**: dado el Calendario actual, encontrar bloques libres para encajar una Tarea nueva.
5. **Detección de sobrecarga**: si una semana tiene más carga de la razonable, avisar con antelación y sugerir qué mover.
6. **Sugerencia de bloques de trabajo profundo** en huecos largos y libres del calendario.
7. **Agrupación de tareas similares** (mismo proyecto o etiqueta) para proponer que se hagan juntas.
8. **Revisión semanal automática**: resumen de lo completado, lo pendiente y una propuesta de reorganización para la semana siguiente.

Regla no negociable: **cualquier reorganización o sugerencia automática debe venir acompañada de una explicación breve** de por qué se propone (ej. "sugerido para el jueves porque el miércoles ya tienes 3 bloques de trabajo profundo").

Nota de integraciones externas: de momento esta app no recibe entrada por Telegram; toda la captura es manual desde el Inbox de la web. Diseña el modelo y el backend de forma que en el futuro se pueda añadir un canal de entrada externo (Telegram u otro) sin rehacer la arquitectura, pero no lo implementes ahora.

Google Calendar está integrado bidireccionalmente: los eventos e ítems con fecha de Hermes se sincronizan con el Google Calendar del usuario (crear, actualizar, eliminar). El usuario conecta su cuenta desde la app mediante OAuth 2.0. Ten esto en cuenta al construir o modificar cualquier lógica de eventos/tareas con fecha.

---

## BLOQUE 6 — Entregables esperados

1. Plan de fases y stack confirmado (Bloque 0).
2. Esquema de base de datos en Supabase con migraciones.
3. Backend con los endpoints/acciones necesarios para cada operación del Bloque 5.
4. Frontend con todos los módulos del Bloque 4, navegables y funcionales.
5. Vista "Hoy" / "Mi Día" y "Revisión semanal" funcionando de extremo a extremo con datos reales.
6. Despliegue funcional (o instrucciones claras de despliegue en Vercel + Supabase) y una lista de variables de entorno necesarias.
7. Verificación: pruebas o capturas que confirmen que cada módulo funciona (crear, editar, archivar) antes de darlo por cerrado.

> **Consulta el Bloque 8 antes de empezar**: muestra qué está ya implementado para que no dupliques trabajo.

---

## BLOQUE 7 — Restricciones de formato de respuesta

- Trabaja fase por fase, en el orden del plan que propongas en el Bloque 0.
- Antes de cada fase, resume en 3-5 líneas qué vas a hacer.
- Si algo no es viable con el stack elegido, dilo explícitamente y propone alternativa, en vez de forzarlo.
- Al final de cada fase, deja claro qué falta para la siguiente.
- Lee siempre el Bloque 8 antes de escribir código nuevo, para no reimplementar lo que ya existe.

---

## BLOQUE 8 — Estado actual del proyecto (actualiza este bloque al final de cada sesión)

> Última actualización: julio 2026

### ✅ Implementado y funcional

**Infraestructura y autenticación**
- Stack: Next.js 15 (App Router) + Tailwind + Supabase (Postgres) + Vercel.
- Autenticación con Google OAuth 2.0 (`/api/auth/google/callback`). Tokens guardados en tabla `google_credentials`.
- Políticas RLS en Supabase configuradas.
- Variables de entorno necesarias: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_APP_URL`, `GEMINI_API_KEY`.

**Modelo de datos**
- Entidad `Item` (tipo: `tarea` | `evento` | `idea` | `nota` | `recordatorio`), con estados, prioridad, etiquetas, proyecto, metadata flexible y campo `google_event_id` para sincronización.
- Entidad `Proyecto`.
- Entidad `RutinaGym` + `PlantillaGym` (plantillas de entrenamiento por día con lista de ejercicios).
- Tipos TypeScript completos en `src/lib/types.ts`.

**Módulos del dashboard** (todos bajo `src/app/(dashboard)/`)
- 📥 Inbox
- 📅 Calendario (sincronizado con Google Calendar)
- ✅ Tareas
- 💡 Ideas
- 📁 Proyectos
- 📝 Notas
- 🏋️ Gym (con plantillas)
- 🌅 Mi Día
- 📊 Revisión semanal

**Lógica inteligente** (en `src/lib/ai/`)
- `classify.ts`: clasificación heurística de ítems desde Inbox (tipo, proyecto, etiquetas, fecha límite por lenguaje natural).
- `prioritize.ts`: priorización diaria con puntuación y explicación (`razon_prioridad`).

**Integración Google Calendar** (`src/lib/googleCalendar.ts`)
- Crear, actualizar y eliminar eventos en Google Calendar al operar sobre ítems con fecha.
- Auto-refresh de tokens OAuth.

### 🔜 Pendiente o por mejorar

- Lógica completa del Bloque 5 puntos 4-8 (buscador de huecos, detección de sobrecarga, bloques de trabajo profundo, agrupación de tareas, revisión semanal automática generada por IA).
- Despliegue en producción en Vercel (actualmente solo local en `localhost:3000`).
- Tests automatizados.

### ❌ Fuera de scope (no implementar)

- Módulo de Nutrición.
- Integración con Telegram (diseño preparado para añadirlo en el futuro, no implementar ahora).
