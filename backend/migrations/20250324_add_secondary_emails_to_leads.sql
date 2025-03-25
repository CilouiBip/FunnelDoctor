-- Migration: Add secondary_emails column to leads table
-- Description: Adds an array column to store secondary email addresses for leads

-- Add secondary_emails as a text array column with default empty array
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS secondary_emails TEXT[] DEFAULT '{}' NOT NULL;

-- Create index on secondary_emails for faster lookups (GIN index for array column)
CREATE INDEX IF NOT EXISTS idx_leads_secondary_emails ON leads USING GIN (secondary_emails);

-- Add column for tracking when a lead has been merged into another
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS merged_into UUID DEFAULT NULL;

-- Create index on merged_into column
CREATE INDEX IF NOT EXISTS idx_leads_merged_into ON leads (merged_into);

-- Create bridging_activities table for logging email consolidation events
CREATE TABLE IF NOT EXISTS bridging_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id),
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on lead_id in bridging_activities
CREATE INDEX IF NOT EXISTS idx_bridging_activities_lead_id ON bridging_activities (lead_id);
