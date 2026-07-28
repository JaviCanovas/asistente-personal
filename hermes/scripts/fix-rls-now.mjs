// Script para aplicar políticas RLS directamente vía Supabase Management API
// Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/fix-rls-now.mjs
// O bien, define estas variables en un archivo .env.local y cárgalas antes de ejecutar.

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PROJECT_REF = SUPABASE_URL ? new URL(SUPABASE_URL).hostname.split('.')[0] : undefined

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Faltan variables de entorno: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// SQL a ejecutar
const SQL = `
DO $$
DECLARE
  tablas TEXT[] := ARRAY['plantillas_gym', 'rutinas_gym', 'items', 'proyectos'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_select" ON %I', t);
    EXECUTE format('CREATE POLICY "allow_all_select" ON %I FOR SELECT USING (true)', t);
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_insert" ON %I', t);
    EXECUTE format('CREATE POLICY "allow_all_insert" ON %I FOR INSERT WITH CHECK (true)', t);
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_update" ON %I', t);
    EXECUTE format('CREATE POLICY "allow_all_update" ON %I FOR UPDATE USING (true) WITH CHECK (true)', t);
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_delete" ON %I', t);
    EXECUTE format('CREATE POLICY "allow_all_delete" ON %I FOR DELETE USING (true)', t);
  END LOOP;
END $$;
`

async function run() {
  console.log('🔐 Aplicando políticas RLS vía Management API...')
  
  // Intentar con la Management API de Supabase
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: SQL })
  })
  
  if (res.ok) {
    const data = await res.json()
    console.log('✅ Políticas aplicadas correctamente:', JSON.stringify(data))
    return
  }
  
  const errText = await res.text()
  console.log(`⚠️  Management API no disponible (${res.status}): ${errText.substring(0, 200)}`)
  console.log('\n📋 Copia y pega este SQL en el SQL Editor de Supabase:')
  console.log('   https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql/new')
  console.log('\n' + SQL)
}

run()
