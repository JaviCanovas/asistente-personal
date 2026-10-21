-- ============================================================
-- HERMES — Migración 007: Soporte de Decimales Flotantes (FLOAT) para pesos
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase:
-- https://supabase.com/dashboard/project/rnbyjtbcpxasourdfvfl/sql/new
-- ============================================================

-- Asegurar tipo DOUBLE PRECISION (float) en series_gym y rutinas_gym
ALTER TABLE series_gym
  ALTER COLUMN peso_kg TYPE DOUBLE PRECISION USING peso_kg::DOUBLE PRECISION;

ALTER TABLE rutinas_gym
  ALTER COLUMN peso_kg TYPE DOUBLE PRECISION USING peso_kg::DOUBLE PRECISION;
