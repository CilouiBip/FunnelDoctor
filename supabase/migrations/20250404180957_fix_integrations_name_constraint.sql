-- Migration: Ensure 'name' column in 'integrations' has a default and is nullable
-- Date: 2025-04-04

-- Attempt to add a default value first (might fail if column doesnt exist, but safe)
ALTER TABLE public.integrations
ALTER COLUMN name SET DEFAULT 'Default Integration Name';

-- Ensure the column allows NULL values
ALTER TABLE public.integrations
ALTER COLUMN name DROP NOT NULL;

-- Update existing NULL values just in case (optional but safe)
UPDATE public.integrations SET name = 'Default Integration Name' WHERE name IS NULL;