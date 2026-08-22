-- ============================================================
-- HERMES — Migración 002: Plantillas de Gym (Corregido)
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS plantillas_gym (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre_dia    TEXT NOT NULL,          -- e.g., 'DÍA 1: TORSO FUERZA'
  orden         INTEGER NOT NULL,
  ejercicios    JSONB NOT NULL,         -- [{ nombre, series, repeticiones, peso_kg, descanso, notas }]
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Resetear si ya existía para insertar la versión corregida
TRUNCATE TABLE plantillas_gym;

-- Insertar rutina inicial del usuario por defecto
INSERT INTO plantillas_gym (nombre_dia, orden, ejercicios) VALUES
  ('DÍA 1: TORSO FUERZA (Domingo Noche)', 1, '[
    {"nombre": "Press de Banca (Barra)", "series": 4, "repeticiones": "5-6", "peso_kg": 65, "descanso": "3 min", "notas": "RIR 1-2 | 6-6-5-5"},
    {"nombre": "Dominadas Supinas", "series": 4, "repeticiones": "6-8", "peso_kg": 0, "descanso": "3 min", "notas": "Libre | RIR 1 | 8-8-8-8"},
    {"nombre": "Remo en T (Máquina)", "series": 3, "repeticiones": "8-10", "peso_kg": 35, "descanso": "2 min", "notas": "RIR 1 | 10-10-10"},
    {"nombre": "Press Militar (Manc.)", "series": 3, "repeticiones": "6-8", "peso_kg": 18, "descanso": "2 min", "notas": "RIR 1 | 8-8-8"},
    {"nombre": "Elev. Laterales (Manc.)", "series": 3, "repeticiones": "12-15", "peso_kg": 10, "descanso": "90 seg", "notas": "RIR 0 | 15-15-15"},
    {"nombre": "Curl Bíceps Martillo", "series": 3, "repeticiones": "10-12", "peso_kg": 10, "descanso": "60 seg", "notas": "RIR 0 | 12-"},
    {"nombre": "Elev. Piernas Suelo", "series": 3, "repeticiones": "12-15", "peso_kg": 4, "descanso": "60 seg", "notas": "RIR 1 | 12"}
  ]'::jsonb),
  ('DÍA 2: PIERNA COMPLETA (Martes)', 2, '[
    {"nombre": "Sentadilla V-Squat", "series": 4, "repeticiones": "8-10", "peso_kg": 90, "descanso": "3 min", "notas": "RIR 1-2 | 8-8-8-"},
    {"nombre": "Peso Muerto Rumano", "series": 3, "repeticiones": "8-10", "peso_kg": 30, "descanso": "3 min", "notas": "RIR 1-2 | 10-8-8"},
    {"nombre": "Curl Isquios (Máquina)", "series": 3, "repeticiones": "10-12", "peso_kg": 80, "descanso": "2 min", "notas": "RIR 0 | 12-12-12"},
    {"nombre": "Extensión Cuádriceps", "series": 3, "repeticiones": "12-15", "peso_kg": 50, "descanso": "90 seg", "notas": "RIR 0 | 15-15-15"},
    {"nombre": "Aductores (Máquina)", "series": 3, "repeticiones": "12-15", "peso_kg": 65, "descanso": "60 seg", "notas": "RIR 0"},
    {"nombre": "Gemelos en Máquina", "series": 4, "repeticiones": "15-20", "peso_kg": 20, "descanso": "60 seg", "notas": "RIR 0 | 20-20-"},
    {"nombre": "Plancha Abdominal", "series": 3, "repeticiones": "45-60 seg", "peso_kg": 0, "descanso": "60 seg", "notas": "RIR 0"}
  ]'::jsonb),
  ('DÍA 3: EMPUJE HIPERTROFIA (Jueves)', 3, '[
    {"nombre": "Press Inclinado (Multi/Manc)", "series": 4, "repeticiones": "8-10", "peso_kg": 45, "descanso": "2 min", "notas": "RIR 1 | 10-10-9-9"},
    {"nombre": "Fondos Tríceps/Pecho", "series": 3, "repeticiones": "8-10", "peso_kg": 0, "descanso": "90 seg", "notas": "RIR 1 | 8-8-7"},
    {"nombre": "Aperturas (Máquina/Polea)", "series": 3, "repeticiones": "12-15", "peso_kg": 15, "descanso": "60 seg", "notas": "RIR 0 | 15-15-15"},
    {"nombre": "Elev. Laterales (Máq/Polea)", "series": 4, "repeticiones": "12-15", "peso_kg": 22.5, "descanso": "60 seg", "notas": "RIR 0 | 15-15-14-14"},
    {"nombre": "Tríceps Polea (Cuerda)", "series": 3, "repeticiones": "12-15", "peso_kg": 17.5, "descanso": "60 seg", "notas": "RIR 0 | 15-11-"},
    {"nombre": "Press Pallof (Core)", "series": 3, "repeticiones": "15 rep/lado", "peso_kg": 12.5, "descanso": "60 seg", "notas": "RIR 1 | 15-"}
  ]'::jsonb),
  ('DÍA 4: TIRÓN HIPERTROFIA (Viernes)', 4, '[
    {"nombre": "Dominadas Pronas (Abiertas)", "series": 4, "repeticiones": "8-10", "peso_kg": 2.5, "descanso": "2 min", "notas": "RIR 1 | 9-9-8-8"},
    {"nombre": "Remo Agarre Cerrado/Gironda", "series": 4, "repeticiones": "10-12", "peso_kg": 40, "descanso": "90 seg", "notas": "RIR 1 | 12-12-11"},
    {"nombre": "Jalón al Pecho", "series": 3, "repeticiones": "10-12", "peso_kg": 45, "descanso": "90 seg", "notas": "RIR 1 | 12-12-"},
    {"nombre": "Face Pull (Polea Alta)", "series": 3, "repeticiones": "15-20", "peso_kg": 25, "descanso": "60 seg", "notas": "RIR 0 | 15-15-"},
    {"nombre": "Bíceps Curl", "series": 3, "repeticiones": "10-12", "peso_kg": 10, "descanso": "90 seg", "notas": "RIR 0-1"},
    {"nombre": "Bíceps Banco Scott", "series": 3, "repeticiones": "12-15", "peso_kg": 20, "descanso": "60 seg", "notas": "Superserie / Drop set (bajando peso conforme fallo)"},
    {"nombre": "Máquina Guiada Abdominales", "series": 3, "repeticiones": "10-12", "peso_kg": 50, "descanso": "60 seg", "notas": "RIR 0-1"}
  ]'::jsonb);
