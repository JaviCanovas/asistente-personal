-- ============================================================
-- HERMES — Migración 005: Sesiones y Series Estructuradas de GYM
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase:
-- https://supabase.com/dashboard/project/rnbyjtbcpxasourdfvfl/sql/new
-- ============================================================

-- 1. Tabla de Sesiones de Entrenamiento
CREATE TABLE IF NOT EXISTS sesiones_gym (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plantilla_id      UUID REFERENCES plantillas_gym(id) ON DELETE SET NULL,
  nombre_dia        TEXT NOT NULL,
  fecha             DATE NOT NULL DEFAULT CURRENT_DATE,
  estado            TEXT NOT NULL DEFAULT 'completada' CHECK (estado IN ('en_progreso', 'completada', 'descartada')),
  duracion_segundos INTEGER,
  notas             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabla de Series Individuales por Ejercicio
CREATE TABLE IF NOT EXISTS series_gym (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sesion_id         UUID NOT NULL REFERENCES sesiones_gym(id) ON DELETE CASCADE,
  ejercicio         TEXT NOT NULL,
  numero_serie      INTEGER NOT NULL,
  peso_kg           NUMERIC(6, 2) NOT NULL DEFAULT 0,
  repeticiones      INTEGER NOT NULL DEFAULT 0,
  rir_real          TEXT,
  completada        BOOLEAN NOT NULL DEFAULT true,
  notas             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Índices de Rendimiento
CREATE INDEX IF NOT EXISTS idx_sesiones_gym_fecha ON sesiones_gym(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_sesiones_gym_plantilla ON sesiones_gym(plantilla_id);
CREATE INDEX IF NOT EXISTS idx_series_gym_sesion ON series_gym(sesion_id);
CREATE INDEX IF NOT EXISTS idx_series_gym_ejercicio ON series_gym(ejercicio, created_at DESC);

-- 4. Habilitar RLS y Políticas Permisivas (App Personal)
ALTER TABLE sesiones_gym ENABLE ROW LEVEL SECURITY;
ALTER TABLE series_gym ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_select_sesiones" ON sesiones_gym;
CREATE POLICY "allow_all_select_sesiones" ON sesiones_gym FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_all_insert_sesiones" ON sesiones_gym;
CREATE POLICY "allow_all_insert_sesiones" ON sesiones_gym FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_update_sesiones" ON sesiones_gym;
CREATE POLICY "allow_all_update_sesiones" ON sesiones_gym FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_delete_sesiones" ON sesiones_gym;
CREATE POLICY "allow_all_delete_sesiones" ON sesiones_gym FOR DELETE USING (true);

DROP POLICY IF EXISTS "allow_all_select_series" ON series_gym;
CREATE POLICY "allow_all_select_series" ON series_gym FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_all_insert_series" ON series_gym;
CREATE POLICY "allow_all_insert_series" ON series_gym FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_update_series" ON series_gym;
CREATE POLICY "allow_all_update_series" ON series_gym FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_delete_series" ON series_gym;
CREATE POLICY "allow_all_delete_series" ON series_gym FOR DELETE USING (true);
