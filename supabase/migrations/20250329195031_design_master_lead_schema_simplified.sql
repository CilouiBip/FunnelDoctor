-- Migration : Conception du schéma Master Lead (Version simplifiée)
-- Date : 2025-03-29
-- Description : Implémentation du modèle Master Lead - Structure uniquement

-- 1. Adapter la table leads existante pour servir de master_leads
ALTER TABLE leads
  -- Supprimer la contrainte d'unicité sur email car un master_lead peut avoir plusieurs emails
  DROP CONSTRAINT IF EXISTS leads_user_id_email_key,
  -- Rendre email nullable car il sera déplacé vers lead_emails
  ALTER COLUMN email DROP NOT NULL,
  -- Ajouter une colonne d'identifiant externe pour intégrations futures
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  -- Ajouter une colonne source_system pour tracer l'origine
  ADD COLUMN IF NOT EXISTS source_system TEXT;

-- 2. Création de la table lead_emails pour stocker plusieurs emails par lead
CREATE TABLE IF NOT EXISTS lead_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  source_system TEXT,  -- D'où vient cet email (calendly, stripe, form, etc.)
  source_action TEXT,  -- Action spécifique qui a fourni cet email
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Un email peut être dans le système plusieurs fois, mais unique par lead
  UNIQUE(lead_id, email)
);

-- 3. Création de la table lead_visitor_ids pour lier les visitor_ids aux master_leads
CREATE TABLE IF NOT EXISTS lead_visitor_ids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  visitor_id VARCHAR(255) NOT NULL REFERENCES visitors(visitor_id),
  first_linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT,  -- Comment cette association a été établie
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Un visitor_id ne peut être lié qu'à un seul lead
  UNIQUE(visitor_id)
);

-- 4. Création de la table bridge_associations pour le stockage temporaire des associations email-visitor_id
CREATE TABLE IF NOT EXISTS bridge_associations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  visitor_id VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  source_action TEXT,  -- Action qui a généré cette association (formulaire, etc.)
  event_data JSONB DEFAULT '{}',  -- Données supplémentaires de contexte
  processed BOOLEAN DEFAULT false,  -- Indique si l'association a été traitée
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Pas besoin d'updated_at car c'est une table temporaire
  -- Expirera après une période configurable
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + interval '7 days')
);

-- 5. Ajout de la colonne master_lead_id à la table touchpoints
ALTER TABLE touchpoints
  ADD COLUMN IF NOT EXISTS master_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;

-- 6. Index essentiels pour les performances
-- Index sur lead_emails
CREATE INDEX IF NOT EXISTS idx_lead_emails_email ON lead_emails(email);
CREATE INDEX IF NOT EXISTS idx_lead_emails_lead_id ON lead_emails(lead_id);

-- Index sur lead_visitor_ids
CREATE INDEX IF NOT EXISTS idx_lead_visitor_ids_lead_id ON lead_visitor_ids(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_visitor_ids_visitor_id ON lead_visitor_ids(visitor_id);

-- Index sur bridge_associations
CREATE INDEX IF NOT EXISTS idx_bridge_associations_email ON bridge_associations(email);
CREATE INDEX IF NOT EXISTS idx_bridge_associations_visitor_id ON bridge_associations(visitor_id);
CREATE INDEX IF NOT EXISTS idx_bridge_associations_processed ON bridge_associations(processed);

-- Index sur la nouvelle colonne touchpoints.master_lead_id
CREATE INDEX IF NOT EXISTS idx_touchpoints_master_lead_id ON touchpoints(master_lead_id);