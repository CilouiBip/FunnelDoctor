-- Migration: Create oauth_states table
-- Date: 2025-04-04

CREATE TABLE IF NOT EXISTS public.oauth_states (
  state UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON public.oauth_states(expires_at);