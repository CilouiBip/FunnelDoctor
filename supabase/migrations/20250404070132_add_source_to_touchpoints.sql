-- Migration: Add source column to touchpoints table
-- Date: 2025-04-04

ALTER TABLE public.touchpoints
ADD COLUMN source TEXT;