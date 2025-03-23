-- Script de migration 20250327000000_normalize_contacts.sql
-- Date: 2025-03-27
-- Description: Normalisation des contacts pour la Phase 2.3

-- 1. Cru00e9er une table lead_contacts pour normaliser les informations de contact
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_contacts') THEN
    CREATE TABLE lead_contacts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      contact_type VARCHAR(20) NOT NULL, -- 'email', 'phone', 'address', etc.
      contact_value TEXT NOT NULL,
      is_primary BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    RAISE NOTICE 'Table lead_contacts cru00e9u00e9e avec succu00e8s';
  ELSE
    RAISE NOTICE 'Table lead_contacts existe du00e9ju00e0';
  END IF;
END;
$$;

-- 2. Trigger pour la mise u00e0 jour automatique de updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_lead_contacts') THEN
    CREATE TRIGGER set_timestamp_lead_contacts
    BEFORE UPDATE ON lead_contacts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
    RAISE NOTICE 'Trigger set_timestamp_lead_contacts cru00e9u00e9 avec succu00e8s';
  ELSE
    RAISE NOTICE 'Trigger set_timestamp_lead_contacts existe du00e9ju00e0';
  END IF;
END;
$$;

-- 3. Ajouter une ru00e9fu00e9rence explicite entre visitors et leads
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'visitors' AND column_name = 'lead_id') THEN
    ALTER TABLE visitors
      ADD COLUMN lead_id UUID NULL REFERENCES leads(id) ON DELETE SET NULL;
    RAISE NOTICE 'Colonne lead_id ajoutu00e9e u00e0 la table visitors';
  ELSE
    RAISE NOTICE 'Colonne lead_id existe du00e9ju00e0 dans la table visitors';
  END IF;
END;
$$;

-- 4. Optimiser pour les jointures
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_visitors_lead_id') THEN
    CREATE INDEX idx_visitors_lead_id ON visitors(lead_id);
    RAISE NOTICE 'Index idx_visitors_lead_id cru00e9u00e9';
  ELSE 
    RAISE NOTICE 'Index idx_visitors_lead_id existe du00e9ju00e0';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_lead_contacts_lead_id') THEN
    CREATE INDEX idx_lead_contacts_lead_id ON lead_contacts(lead_id);
    RAISE NOTICE 'Index idx_lead_contacts_lead_id cru00e9u00e9';
  ELSE
    RAISE NOTICE 'Index idx_lead_contacts_lead_id existe du00e9ju00e0';
  END IF;
END;
$$;

-- 5. Documentation et commentaires des tables et colonnes
COMMENT ON TABLE lead_contacts IS 'Informations de contact normalisu00e9es pour les leads';
COMMENT ON COLUMN lead_contacts.contact_type IS 'Type de contact (email, phone, address, social, etc.)';
COMMENT ON COLUMN lead_contacts.contact_value IS 'Valeur du contact (adresse email, numu00e9ro de tu00e9lu00e9phone, etc.)';
COMMENT ON COLUMN lead_contacts.is_primary IS 'Indique si ce contact est le contact principal pour ce type';
COMMENT ON COLUMN visitors.lead_id IS 'Ru00e9fu00e9rence au lead associu00e9 u00e0 ce visiteur, permet de relier explicitement visitors et leads';

-- Vu00e9rification finale
DO $$
BEGIN
  RAISE NOTICE 'Vu00e9rification de la table lead_contacts: %',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_contacts');
  RAISE NOTICE 'Vu00e9rification du trigger set_timestamp_lead_contacts: %',
    EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_lead_contacts');
  RAISE NOTICE 'Vu00e9rification de la colonne lead_id dans visitors: %',
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'visitors' AND column_name = 'lead_id');
  RAISE NOTICE 'Vu00e9rification des index: idx_visitors_lead_id=%', 
    EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_visitors_lead_id');
  RAISE NOTICE 'Vu00e9rification des index: idx_lead_contacts_lead_id=%', 
    EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_lead_contacts_lead_id');
END;
$$;
