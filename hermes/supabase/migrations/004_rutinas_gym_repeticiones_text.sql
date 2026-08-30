-- ============================================================
-- Migracion 004: Cambiar repeticiones en rutinas_gym de INTEGER a TEXT
-- 
-- El campo repeticiones necesita soportar formatos de texto como:
--   "10-10-10-10"  (reps por serie)
--   "12-15"        (rango)
--   "45-60 seg"    (tiempo)
--   "15 rep/lado"  (unilateral)
--
-- Ejecuta esto en el SQL Editor de Supabase antes de desplegar
-- ============================================================

ALTER TABLE rutinas_gym
  ALTER COLUMN repeticiones TYPE TEXT USING repeticiones::TEXT;
