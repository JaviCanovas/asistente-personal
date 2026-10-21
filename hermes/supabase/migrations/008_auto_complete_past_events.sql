-- ============================================================
-- HERMES — Migración 008: Auto-cumplir eventos pasados al terminar el día
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase:
-- https://supabase.com/dashboard/project/rnbyjtbcpxasourdfvfl/sql/new
-- ============================================================

-- 1. Actualizar eventos pasados existentes que hayan quedado en estado 'activo' o 'sin_procesar'
UPDATE items
SET estado = 'hecho', updated_at = NOW()
WHERE tipo = 'evento'
  AND estado IN ('activo', 'sin_procesar')
  AND (
    (fecha_evento IS NOT NULL AND (fecha_evento AT TIME ZONE 'Europe/Madrid')::date < CURRENT_DATE)
    OR
    (fecha_evento IS NULL AND fecha_limite IS NOT NULL AND (fecha_limite AT TIME ZONE 'Europe/Madrid')::date < CURRENT_DATE)
  );

-- 2. Función para auto-completar eventos pasados
CREATE OR REPLACE FUNCTION auto_completar_eventos_pasados()
RETURNS void AS $$
BEGIN
  UPDATE items
  SET estado = 'hecho', updated_at = NOW()
  WHERE tipo = 'evento'
    AND estado IN ('activo', 'sin_procesar')
    AND (
      (fecha_evento IS NOT NULL AND (fecha_evento AT TIME ZONE 'Europe/Madrid')::date < CURRENT_DATE)
      OR
      (fecha_evento IS NULL AND fecha_limite IS NOT NULL AND (fecha_limite AT TIME ZONE 'Europe/Madrid')::date < CURRENT_DATE)
    );
END;
$$ LANGUAGE plpgsql;
