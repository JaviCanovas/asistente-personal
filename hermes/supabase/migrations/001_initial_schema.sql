-- ============================================================
-- HERMES — Esquema inicial de base de datos
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase
-- ============================================================

-- Habilitar extensiones útiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- para búsqueda fuzzy

-- ============================================================
-- TIPOS ENUMERADOS
-- ============================================================

CREATE TYPE item_tipo AS ENUM (
  'tarea',
  'evento',
  'idea',
  'nota',
  'recordatorio'
);

CREATE TYPE item_estado AS ENUM (
  'sin_procesar',
  'activo',
  'hecho',
  'archivado'
);

CREATE TYPE item_prioridad AS ENUM (
  'baja',
  'media',
  'alta',
  'urgente'
);

CREATE TYPE proyecto_estado AS ENUM (
  'activo',
  'pausado',
  'completado',
  'archivado'
);

-- ============================================================
-- TABLA: proyectos
-- ============================================================

CREATE TABLE proyectos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre        TEXT NOT NULL,
  descripcion   TEXT,
  color         TEXT DEFAULT '#6366f1',
  estado        proyecto_estado NOT NULL DEFAULT 'activo',
  fecha_inicio  DATE,
  fecha_fin     DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: items  (entidad principal — el núcleo de Hermes)
-- ============================================================

CREATE TABLE items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo            item_tipo NOT NULL DEFAULT 'tarea',
  titulo          TEXT NOT NULL,
  descripcion     TEXT,
  estado          item_estado NOT NULL DEFAULT 'sin_procesar',
  prioridad       item_prioridad NOT NULL DEFAULT 'media',
  fecha_limite    TIMESTAMPTZ,
  fecha_evento    TIMESTAMPTZ,           -- para tipo = 'evento'
  hora_inicio     TIME,                  -- para eventos con hora
  hora_fin        TIME,
  proyecto_id     UUID REFERENCES proyectos(id) ON DELETE SET NULL,
  etiquetas       TEXT[] DEFAULT '{}',
  origen          TEXT DEFAULT 'web',    -- 'web' | 'telegram' (futuro) | 'api'
  metadata        JSONB DEFAULT '{}',    -- datos flexibles por tipo
  razon_prioridad TEXT,                  -- explicación generada por la lógica heurística
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de rendimiento
CREATE INDEX items_estado_idx       ON items(estado);
CREATE INDEX items_tipo_idx         ON items(tipo);
CREATE INDEX items_proyecto_idx     ON items(proyecto_id);
CREATE INDEX items_fecha_limite_idx ON items(fecha_limite);
CREATE INDEX items_etiquetas_idx    ON items USING GIN(etiquetas);
CREATE INDEX items_titulo_search    ON items USING GIN(titulo gin_trgm_ops);

-- ============================================================
-- TABLA: rutinas_gym
-- ============================================================

CREATE TABLE rutinas_gym (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha         DATE NOT NULL DEFAULT CURRENT_DATE,
  ejercicio     TEXT NOT NULL,
  series        INTEGER NOT NULL DEFAULT 1,
  repeticiones  INTEGER,
  peso_kg       DECIMAL(6,2),
  duracion_min  INTEGER,                -- para ejercicios de tiempo (plancha, etc.)
  notas         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX rutinas_gym_fecha_idx    ON rutinas_gym(fecha);
CREATE INDEX rutinas_gym_ejercicio_idx ON rutinas_gym(ejercicio);

-- ============================================================
-- TABLA: nutricion
-- ============================================================

CREATE TABLE nutricion (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha       DATE NOT NULL DEFAULT CURRENT_DATE,
  momento     TEXT NOT NULL DEFAULT 'comida',  -- desayuno | almuerzo | comida | merienda | cena | snack
  descripcion TEXT NOT NULL,
  calorias    INTEGER,
  proteinas_g DECIMAL(6,2),
  carbos_g    DECIMAL(6,2),
  grasas_g    DECIMAL(6,2),
  notas       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX nutricion_fecha_idx ON nutricion(fecha);

-- ============================================================
-- TABLA: objetivos_nutricion  (metas diarias del usuario)
-- ============================================================

CREATE TABLE objetivos_nutricion (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  calorias    INTEGER DEFAULT 2000,
  proteinas_g DECIMAL(6,2) DEFAULT 150,
  carbos_g    DECIMAL(6,2) DEFAULT 250,
  grasas_g    DECIMAL(6,2) DEFAULT 70,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insertar fila de objetivos por defecto
INSERT INTO objetivos_nutricion DEFAULT VALUES;

-- ============================================================
-- TRIGGERS — updated_at automático
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER proyectos_updated_at
  BEFORE UPDATE ON proyectos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- DATOS DE EJEMPLO (seed mínimo para desarrollo)
-- ============================================================

INSERT INTO proyectos (nombre, descripcion, color) VALUES
  ('Personal', 'Proyectos y tareas personales', '#6366f1'),
  ('Trabajo', 'Todo lo relacionado con el trabajo', '#f59e0b'),
  ('Salud', 'Gym, nutrición y bienestar', '#10b981');

INSERT INTO items (tipo, titulo, descripcion, estado, prioridad) VALUES
  ('tarea', 'Configurar Hermes en producción', 'Desplegar en Vercel y conectar Supabase', 'sin_procesar', 'alta'),
  ('idea', 'Añadir integración con Telegram', 'Canal de entrada para capturar ideas rápidas desde el móvil', 'sin_procesar', 'media'),
  ('nota', 'Bienvenido a Hermes', 'Este es tu planificador personal. Empieza capturando cualquier cosa en el Inbox.', 'activo', 'baja');
