-- Migration: Add user_id column to touchpoints table
-- Date: 2025-04-04

-- Add the user_id column with a foreign key constraint to the users table
ALTER TABLE public.touchpoints
ADD COLUMN user_id UUID REFERENCES public.users(id);

-- Create an index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_touchpoints_user_id ON public.touchpoints(user_id);