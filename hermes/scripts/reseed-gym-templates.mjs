// Script para re-sembrar las plantillas corregidas en Supabase
// Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/reseed-gym-templates.mjs

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

const PLANTILLAS = [
  {
    nombre_dia: 'DÍA 1: TORSO FUERZA (Domingo Noche)',
    orden: 1,
    ejercicios: [
      { nombre: 'Press de Banca (Barra)', series: 4, repeticiones: '5-6', peso_kg: 65, descanso: '3 min', notas: 'RIR 1-2 | 6-6-5-5' },
      { nombre: 'Dominadas Supinas', series: 4, repeticiones: '6-8', peso_kg: 0, descanso: '3 min', notas: 'Libre | RIR 1 | 8-8-8-8' },
      { nombre: 'Remo en T (Máquina)', series: 3, repeticiones: '8-10', peso_kg: 35, descanso: '2 min', notas: 'RIR 1 | 10-10-10' },
      { nombre: 'Press Militar (Manc.)', series: 3, repeticiones: '6-8', peso_kg: 18, descanso: '2 min', notas: 'RIR 1 | 8-8-8' },
      { nombre: 'Elev. Laterales (Manc.)', series: 3, repeticiones: '12-15', peso_kg: 10, descanso: '90 seg', notas: 'RIR 0 | 15-15-15' },
      { nombre: 'Curl Bíceps Martillo', series: 3, repeticiones: '10-12', peso_kg: 10, descanso: '60 seg', notas: 'RIR 0 | 12-' },
      { nombre: 'Elev. Piernas Suelo', series: 3, repeticiones: '12-15', peso_kg: 4, descanso: '60 seg', notas: 'RIR 1 | 12' }
    ]
  },
  {
    nombre_dia: 'DÍA 2: PIERNA COMPLETA (Martes)',
    orden: 2,
    ejercicios: [
      { nombre: 'Sentadilla V-Squat', series: 4, repeticiones: '8-10', peso_kg: 90, descanso: '3 min', notas: 'RIR 1-2 | 8-8-8-' },
      { nombre: 'Peso Muerto Rumano', series: 3, repeticiones: '8-10', peso_kg: 30, descanso: '3 min', notas: 'RIR 1-2 | 10-8-8' },
      { nombre: 'Curl Isquios (Máquina)', series: 3, repeticiones: '10-12', peso_kg: 80, descanso: '2 min', notas: 'RIR 0 | 12-12-12' },
      { nombre: 'Extensión Cuádriceps', series: 3, repeticiones: '12-15', peso_kg: 50, descanso: '90 seg', notas: 'RIR 0 | 15-15-15' },
      { nombre: 'Aductores (Máquina)', series: 3, repeticiones: '12-15', peso_kg: 65, descanso: '60 seg', notas: 'RIR 0' },
      { nombre: 'Gemelos en Máquina', series: 4, repeticiones: '15-20', peso_kg: 20, descanso: '60 seg', notas: 'RIR 0 | 20-20-' },
      { nombre: 'Plancha Abdominal', series: 3, repeticiones: '45-60 seg', peso_kg: 0, descanso: '60 seg', notas: 'RIR 0' }
    ]
  },
  {
    nombre_dia: 'DÍA 3: EMPUJE HIPERTROFIA (Jueves)',
    orden: 3,
    ejercicios: [
      { nombre: 'Press Inclinado (Multi/Manc)', series: 4, repeticiones: '8-10', peso_kg: 45, descanso: '2 min', notas: 'RIR 1 | 10-10-9-9' },
      { nombre: 'Fondos Tríceps/Pecho', series: 3, repeticiones: '8-10', peso_kg: 0, descanso: '90 seg', notas: 'RIR 1 | 8-8-7' },
      { nombre: 'Aperturas (Máquina/Polea)', series: 3, repeticiones: '12-15', peso_kg: 15, descanso: '60 seg', notas: 'RIR 0 | 15-15-15' },
      { nombre: 'Elev. Laterales (Máq/Polea)', series: 4, repeticiones: '12-15', peso_kg: 22.5, descanso: '60 seg', notas: 'RIR 0 | 15-15-14-14' },
      { nombre: 'Tríceps Polea (Cuerda)', series: 3, repeticiones: '12-15', peso_kg: 17.5, descanso: '60 seg', notas: 'RIR 0 | 15-11-' },
      { nombre: 'Press Pallof (Core)', series: 3, repeticiones: '15 rep/lado', peso_kg: 12.5, descanso: '60 seg', notas: 'RIR 1 | 15-' }
    ]
  },
  {
    nombre_dia: 'DÍA 4: TIRÓN HIPERTROFIA (Viernes)',
    orden: 4,
    ejercicios: [
      { nombre: 'Dominadas Pronas (Abiertas)', series: 4, repeticiones: '8-10', peso_kg: 2.5, descanso: '2 min', notas: 'RIR 1 | 9-9-8-8' },
      { nombre: 'Remo Agarre Cerrado/Gironda', series: 4, repeticiones: '10-12', peso_kg: 40, descanso: '90 seg', notas: 'RIR 1 | 12-12-11' },
      { nombre: 'Jalón al Pecho', series: 3, repeticiones: '10-12', peso_kg: 45, descanso: '90 seg', notas: 'RIR 1 | 12-12-' },
      { nombre: 'Face Pull (Polea Alta)', series: 3, repeticiones: '15-20', peso_kg: 25, descanso: '60 seg', notas: 'RIR 0 | 15-15-' },
      { nombre: 'Bíceps Curl', series: 3, repeticiones: '10-12', peso_kg: 10, descanso: '90 seg', notas: 'RIR 0-1' },
      { nombre: 'Bíceps Banco Scott', series: 3, repeticiones: '12-15', peso_kg: 20, descanso: '60 seg', notas: 'Superserie / Drop set (bajando peso conforme fallo)' },
      { nombre: 'Máquina Guiada Abdominales', series: 3, repeticiones: '10-12', peso_kg: 50, descanso: '60 seg', notas: 'RIR 0-1' }
    ]
  }
]

async function run() {
  console.log('🔄 Sincronizando plantillas de entrenamiento corregidas en Supabase...')

  // Limpiar antiguas
  const { error: deleteError } = await supabase.from('plantillas_gym').delete().neq('orden', 0)
  if (deleteError) {
    console.error('❌ Error limpiando plantillas (es posible que la tabla no esté creada aún):', deleteError.message)
    return
  }

  // Insertar nuevas
  const { data, error: insertError } = await supabase.from('plantillas_gym').insert(PLANTILLAS).select()
  if (insertError) {
    console.error('❌ Error al sembrar plantillas:', insertError.message)
  } else {
    console.log(`✨ Sincronización exitosa: ${data.length} plantillas actualizadas en Supabase.`)
  }
}

run()
