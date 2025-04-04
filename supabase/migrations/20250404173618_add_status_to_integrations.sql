-- Migration: Add status column to integrations table
-- Date: 2025-04-04

-- Add the status column with a default value and NOT NULL constraint
ALTER TABLE public.integrations
ADD COLUMN status VARCHAR(20) DEFAULT 'connected' NOT NULL;

-- Add a comment describing the column's purpose
COMMENT ON COLUMN public.integrations.status IS 'Connection status of the integration (e.g., connected, disconnected, error)';

-- Optional: Update existing rows if necessary (if they should all be 'connected')
-- UPDATE public.integrations SET status = 'connected' WHERE status IS NULL;
-- Note: The DEFAULT 'connected' should handle new rows and potentially existing ones if ALTER is smart enough, but explicit UPDATE is safer for existing rows. Let's include it for safety.
UPDATE public.integrations SET status = 'connected' WHERE status IS NULL;