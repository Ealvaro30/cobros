-- Migration: 011_add_prioridad.sql
-- Add prioridad column to clientes table

ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS prioridad TEXT DEFAULT 'media'
CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente'));
