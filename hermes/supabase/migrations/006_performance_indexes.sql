-- ============================================================
-- HERMES — Migración 006: Índices de Rendimiento para Consultas Clave
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase
-- Totalmente reversible y sin bloqueo de lecturas/escrituras
-- ============================================================

-- 1. Índice compuesto para items activos por fecha de creación (usado en getItemsActivos y Home)
CREATE INDEX IF NOT EXISTS idx_items_estado_created_at
  ON items(estado, created_at DESC);

-- 2. Índice compuesto para fechas límite de items activos (usado en priorización y vista Mi Día)
CREATE INDEX IF NOT EXISTS idx_items_fecha_limite_estado
  ON items(fecha_limite, estado)
  WHERE estado IN ('activo', 'sin_procesar');

-- 3. Índice parcial para eventos por fecha (usado en agenda diaria)
CREATE INDEX IF NOT EXISTS idx_items_tipo_fecha_evento
  ON items(fecha_evento)
  WHERE tipo = 'evento';

-- 4. Índice para rutinas de gimnasio ordenadas por fecha reciente (usado en Home y Gym)
CREATE INDEX IF NOT EXISTS idx_rutinas_gym_fecha_desc
  ON rutinas_gym(fecha DESC);

-- ============================================================
-- REVERSIBILIDAD:
-- DROP INDEX IF EXISTS idx_items_estado_created_at;
-- DROP INDEX IF EXISTS idx_items_fecha_limite_estado;
-- DROP INDEX IF EXISTS idx_items_tipo_fecha_evento;
-- DROP INDEX IF EXISTS idx_rutinas_gym_fecha_desc;
-- ============================================================
