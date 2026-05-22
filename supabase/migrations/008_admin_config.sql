-- 008_admin_config.sql
-- Migration for admin configurable tables and schema tweaks

-- 1. Create bucket_meta table (dynamic bucket thresholds)
CREATE TABLE IF NOT EXISTS public.bucket_meta (
  id SERIAL PRIMARY KEY,
  bucket INTEGER NOT NULL UNIQUE,
  meta NUMERIC NOT NULL
);

-- Seed default bucket metas (example values)
INSERT INTO public.bucket_meta (bucket, meta) VALUES
  (5, 0.6),
  (6, 0.8)
ON CONFLICT (bucket) DO NOTHING;

-- 2. Create commission_rates table
CREATE TABLE IF NOT EXISTS public.commission_rates (
  bucket INTEGER NOT NULL,
  level INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  PRIMARY KEY (bucket, level)
);

-- Seed example commission rates
INSERT INTO public.commission_rates (bucket, level, amount) VALUES
  (5, 1, 50),
  (5, 2, 100),
  (6, 1, 150),
  (6, 2, 300)
ON CONFLICT (bucket, level) DO NOTHING;

-- 3. Create client_states table (dynamic client statuses)
CREATE TABLE IF NOT EXISTS public.client_states (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Seed default client states
INSERT INTO public.client_states (name, is_active) VALUES
  ('activo', TRUE),
  ('inactivo', FALSE),
  ('en_recuperacion', TRUE)
ON CONFLICT (name) DO NOTHING;

-- 4. Alter clientes table: remove email column, add unica_operacion boolean
ALTER TABLE public.clientes
  DROP COLUMN IF EXISTS email,
  ADD COLUMN IF NOT EXISTS unica_operacion BOOLEAN DEFAULT FALSE;

-- 5. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_clientes_bucket ON public.clientes(bucket);
CREATE INDEX IF NOT EXISTS idx_clientes_estado ON public.clientes(estado);
CREATE INDEX IF NOT EXISTS idx_gestiones_created_at ON public.gestiones(created_at);

-- 6. Update any dependent views (example placeholder – actual view definitions should be adjusted in later migration)
-- ALTER VIEW v_clientes_detalle ...; -- To be updated according to new schema

COMMIT;
