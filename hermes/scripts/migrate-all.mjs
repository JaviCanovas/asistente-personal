// Script de migración para aplicar las migraciones 002 y 003 en Supabase
// Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-all.mjs

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

async function runSQL(sqlText) {
  // Eliminar comentarios de línea de SQL
  const lines = sqlText.split('\n')
  const cleanLines = lines.map(line => {
    const commentIdx = line.indexOf('--')
    if (commentIdx !== -1) {
      // Ignorar si el -- está dentro de comillas (ej. en un JSON), pero en las cabeceras/comentarios normales no habrá comillas
      // Para simplificar, si la línea empieza con -- la eliminamos
      if (line.trim().startsWith('--')) {
        return ''
      }
    }
    return line
  })

  const statements = cleanLines
    .join('\n')
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0)

  let ok = 0
  let errores = 0

  for (const stmt of statements) {
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
        // Ignorar errores de "ya existe" o duplicados
        if (err.includes('already exists') || err.includes('PGRST202') || err.includes('relation') && err.includes('already exists')) {
          console.log(`  ⚠️  Ya existe/Ignorado: ${preview}…`)
          ok++
        } else {
          console.log(`  ❌ Error: ${err.substring(0, 150)}`)
          console.log(`     Statement: ${cleanStmt.substring(0, 80)}`)
          errores++
        }
      }
    } catch (e) {
      console.log(`  ❌ Excepción: ${e.message}`)
      errores++
    }
  }
  return { ok, errores }
}

async function start() {
  console.log('🚀 Hermes — Iniciando ejecución de migraciones pendientes...')

  // 1. Ejecutar Migración 002 (Gym)
  console.log('\n--- Ejecutando 002_plantillas_gym.sql ---')
  try {
    const sqlPath002 = join(__dirname, '..', 'supabase', 'migrations', '002_plantillas_gym.sql')
    const sql002 = readFileSync(sqlPath002, 'utf-8')
    const res002 = await runSQL(sql002)
    console.log(`📊 Migración 002 completada: ${res002.ok} OK, ${res002.errores} Errores`)
  } catch (err) {
    console.error('❌ Error leyendo migración 002:', err.message)
  }

  // 2. Ejecutar Migración 003 (Google Calendar)
  console.log('\n--- Ejecutando 003_google_calendar.sql ---')
  try {
    const sqlPath003 = join(__dirname, '..', 'supabase', 'migrations', '003_google_calendar.sql')
    const sql003 = readFileSync(sqlPath003, 'utf-8')
    const res003 = await runSQL(sql003)
    console.log(`📊 Migración 003 completada: ${res003.ok} OK, ${res003.errores} Errores`)
  } catch (err) {
    console.error('❌ Error leyendo migración 003:', err.message)
  }

  console.log('\n✨ Proceso de migración finalizado.')
}

start()
