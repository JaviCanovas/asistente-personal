-- ============================================================
-- HERMES — Migración 003: Google Calendar Integration
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS google_credentials (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  access_token  TEXT NOT NULL,
  refresh_token TEXT,
  expiry_date   BIGINT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Columna opcional para enlazar los items directamente con el ID del evento de Google en caso de no querer usar metadata
ALTER TABLE items ADD COLUMN IF NOT EXISTS google_event_id TEXT;
