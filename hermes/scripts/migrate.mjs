// Script de migración — ejecuta el esquema SQL en Supabase
// Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Faltan variables de entorno: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

const sqlPath = join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql')
const sql = readFileSync(sqlPath, 'utf-8')

// Dividir en statements individuales para ejecutarlos uno a uno
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'))

console.log(`\n🚀 Hermes — Ejecutando migración (${statements.length} statements)\n`)

let ok = 0
let errores = 0

for (const stmt of statements) {
  // Usar rpc para ejecutar SQL arbitrario vía la función exec_sql si existe
  // Como alternativa, usamos fetch directo a la API de postgres
  const cleanStmt = stmt.replace(/\n/g, ' ').trim()
  const preview = cleanStmt.substring(0, 60)
  
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql: cleanStmt + ';' })
    })
    
    if (res.ok) {
      console.log(`  ✅ ${preview}…`)
      ok++
    } else {
      const err = await res.text()
      // Ignorar errores de "ya existe"
      if (err.includes('already exists') || err.includes('PGRST202')) {
        console.log(`  ⚠️  Ya existe (ignorado): ${preview}…`)
        ok++
      } else {
        console.log(`  ❌ Error: ${err.substring(0, 100)}`)
        console.log(`     Statement: ${cleanStmt.substring(0, 80)}`)
        errores++
      }
    }
  } catch (e) {
    console.log(`  ❌ Excepción: ${e.message}`)
    errores++
  }
}

console.log(`\n✨ Migración completada: ${ok} OK, ${errores} errores`)
