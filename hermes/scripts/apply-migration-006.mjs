import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Faltan credenciales de Supabase');
  process.exit(1);
}

const sqlPath = join(__dirname, '..', 'supabase', 'migrations', '006_performance_indexes.sql');
const rawSql = readFileSync(sqlPath, 'utf-8');

// Eliminar comentarios de una línea y bloques
const noComments = rawSql
  .replace(/--.*$/gm, '')
  .replace(/\/\*[\s\S]*?\*\//g, '');

const statements = noComments
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 5);

console.log(`Aplicando migración 006: ${statements.length} índices...`);

for (const stmt of statements) {
  const cleanStmt = stmt.replace(/\s+/g, ' ').trim();
  const preview = cleanStmt.substring(0, 60);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql: cleanStmt + ';' })
    });
    
    if (res.ok) {
      console.log(`  ✅ ${preview}...`);
    } else {
      const err = await res.text();
      console.log(`  ℹ️ Respuesta (${res.status}): ${err.substring(0, 120)}`);
    }
  } catch (err) {
    console.error(`  ❌ Excepción: ${err.message}`);
  }
}
console.log('Migración 006 finalizada.');
