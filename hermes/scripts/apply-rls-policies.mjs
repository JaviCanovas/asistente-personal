// Script para aplicar políticas RLS a todas las tablas de Hermes
// Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/apply-rls-policies.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Faltan variables de entorno: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

// Tablas que necesitan políticas RLS permisivas (app personal sin auth)
const TABLAS = ['plantillas_gym', 'rutinas_gym', 'items', 'proyectos']

async function applyRLSPolicies() {
  console.log('🔐 Aplicando políticas RLS a todas las tablas de Hermes...\n')
  
  for (const tabla of TABLAS) {
    console.log(`📋 Tabla: ${tabla}`)
    
    // Las operaciones SQL en Supabase se hacen a través del Management API o SQL editor
    // Para verificar que las políticas necesitan aplicarse, intentamos una lectura de prueba
    const { data, error } = await supabase.from(tabla).select('id').limit(1)
    
    if (error) {
      console.log(`  ❌ Error accediendo a "${tabla}": ${error.message}`)
      console.log(`  ⚠️  Puede que necesite ejecutar el SQL de políticas manualmente.`)
    } else {
      console.log(`  ✅ Acceso OK a "${tabla}" (${data?.length ?? 0} filas visibles)`)
    }
  }
  
  console.log('\n📝 Para aplicar las políticas RLS, ejecuta el siguiente SQL en el SQL Editor de Supabase:')
  console.log('   https://supabase.com/dashboard/project/rnbyjtbcpxasourdfvfl/sql/new\n')
  
  const sql = `
-- Habilitar RLS y crear políticas permisivas para app personal
DO $$
DECLARE
  tablas TEXT[] := ARRAY['plantillas_gym', 'rutinas_gym', 'items', 'proyectos'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    
    -- SELECT
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_select" ON %I', t);
    EXECUTE format('CREATE POLICY "allow_all_select" ON %I FOR SELECT USING (true)', t);
    
    -- INSERT
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_insert" ON %I', t);
    EXECUTE format('CREATE POLICY "allow_all_insert" ON %I FOR INSERT WITH CHECK (true)', t);
    
    -- UPDATE
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_update" ON %I', t);
    EXECUTE format('CREATE POLICY "allow_all_update" ON %I FOR UPDATE USING (true) WITH CHECK (true)', t);
    
    -- DELETE
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_delete" ON %I', t);
    EXECUTE format('CREATE POLICY "allow_all_delete" ON %I FOR DELETE USING (true)', t);
    
    RAISE NOTICE 'Políticas aplicadas a tabla: %', t;
  END LOOP;
END $$;
`
  
  console.log(sql)
}

applyRLSPolicies()
