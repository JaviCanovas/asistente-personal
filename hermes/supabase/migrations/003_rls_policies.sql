-- ============================================================
-- HERMES — Migración 003: Políticas RLS para plantillas_gym
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase
-- ============================================================

-- Habilitar RLS en plantillas_gym (por si acaso no lo está)
ALTER TABLE plantillas_gym ENABLE ROW LEVEL SECURITY;

-- Permitir SELECT a todos (incluye el usuario anónimo)
DROP POLICY IF EXISTS "Permitir lectura pública" ON plantillas_gym;
CREATE POLICY "Permitir lectura pública"
  ON plantillas_gym
  FOR SELECT
  USING (true);

-- Permitir INSERT a todos (app personal sin auth)
DROP POLICY IF EXISTS "Permitir inserción pública" ON plantillas_gym;
CREATE POLICY "Permitir inserción pública"
  ON plantillas_gym
  FOR INSERT
  WITH CHECK (true);

-- Permitir UPDATE a todos
DROP POLICY IF EXISTS "Permitir actualización pública" ON plantillas_gym;
CREATE POLICY "Permitir actualización pública"
  ON plantillas_gym
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Permitir DELETE a todos
DROP POLICY IF EXISTS "Permitir eliminación pública" ON plantillas_gym;
CREATE POLICY "Permitir eliminación pública"
  ON plantillas_gym
  FOR DELETE
  USING (true);

-- Verificar que las políticas se aplicaron correctamente
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'plantillas_gym';
