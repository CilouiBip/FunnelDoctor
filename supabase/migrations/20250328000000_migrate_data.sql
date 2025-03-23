-- Script de migration 20250328000000_migrate_data.sql
-- Date: 2025-03-28
-- Description: Migration des données pour la Phase 2.4

-- 1. Migration des données de contact depuis leads vers lead_contacts
DO $$
DECLARE
  lead_count INT := 0;
  email_count INT := 0;
  phone_count INT := 0;
BEGIN
  -- Compter les leads disponibles
  SELECT COUNT(*) INTO lead_count FROM leads;
  
  -- Migration des emails
  INSERT INTO lead_contacts (lead_id, contact_type, contact_value, is_primary, created_at, updated_at)
  SELECT 
    id, 
    'email', 
    email, 
    TRUE, 
    created_at, 
    updated_at
  FROM 
    leads
  WHERE 
    email IS NOT NULL AND email != ''
  ON CONFLICT DO NOTHING;
  
  GET DIAGNOSTICS email_count = ROW_COUNT;
  RAISE NOTICE 'Migrés % emails depuis leads vers lead_contacts', email_count;
  
  -- Migration des numéros de téléphone
  INSERT INTO lead_contacts (lead_id, contact_type, contact_value, is_primary, created_at, updated_at)
  SELECT 
    id, 
    'phone', 
    phone, 
    FALSE, 
    created_at, 
    updated_at
  FROM 
    leads
  WHERE 
    phone IS NOT NULL AND phone != ''
  ON CONFLICT DO NOTHING;
  
  GET DIAGNOSTICS phone_count = ROW_COUNT;
  RAISE NOTICE 'Migrés % numéros de téléphone depuis leads vers lead_contacts', phone_count;
  
  RAISE NOTICE 'Migration des contacts terminée: % leads traités, % emails, % téléphones', lead_count, email_count, phone_count;
END;
$$;

-- 2. Remplir les relations entre visitors et leads (basé sur funnel_progress ou touchpoints)
DO $$
DECLARE
  updated_count INT := 0;
BEGIN
  -- Mise à jour basée sur funnel_progress
  WITH visitor_lead_mapping AS (
    SELECT DISTINCT v.id as visitor_id, l.id as lead_id
    FROM visitors v
    JOIN funnel_progress fp ON fp.visitor_id = v.visitor_id
    JOIN leads l ON l.email IS NOT NULL
    JOIN touchpoints t ON t.visitor_id = v.visitor_id
    WHERE t.event_data->>'lead_id' = l.id::text
      AND v.lead_id IS NULL
  )
  UPDATE visitors v
  SET lead_id = vlm.lead_id
  FROM visitor_lead_mapping vlm
  WHERE v.id = vlm.visitor_id;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Relation visitors-leads mise à jour pour % visiteurs', updated_count;
END;
$$;

-- 3. Remplir event_category basé sur event_type
DO $$
DECLARE
  updated_count INT := 0;
BEGIN
  UPDATE conversion_events
  SET event_category = 
    CASE 
      WHEN event_type IN ('PAYMENT', 'PURCHASE_MADE') THEN 'revenue'
      WHEN event_type IN ('DEMO_SCHEDULED', 'DEMO_CANCELED') THEN 'appointment'
      WHEN event_type IN ('SIGNUP', 'LOGIN') THEN 'user_account'
      ELSE 'other'
    END
  WHERE event_category IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Catégories d''événements mises à jour pour % événements', updated_count;
END;
$$;

-- 4. Remplir source_system basé sur event_data ou contexte
DO $$
DECLARE
  updated_count INT := 0;
BEGIN
  UPDATE conversion_events
  SET source_system = 
    CASE 
      WHEN event_data->>'source' IS NOT NULL THEN event_data->>'source'
      WHEN event_type IN ('DEMO_SCHEDULED', 'DEMO_CANCELED') THEN 'calendly'
      WHEN page_url LIKE '%calendly%' THEN 'calendly'
      ELSE 'website'
    END
  WHERE source_system IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Source des événements mise à jour pour % événements', updated_count;
END;
$$;

-- Vérification finale
DO $$
DECLARE
  lead_contacts_count INT;
  visitor_lead_count INT;
  categorized_events_count INT;
  sourced_events_count INT;
BEGIN
  -- Vérifier le nombre de contacts migrés
  SELECT COUNT(*) INTO lead_contacts_count FROM lead_contacts;
  
  -- Vérifier le nombre de visitors liés à des leads
  SELECT COUNT(*) INTO visitor_lead_count FROM visitors WHERE lead_id IS NOT NULL;
  
  -- Vérifier le nombre d'événements catégorisés
  SELECT COUNT(*) INTO categorized_events_count FROM conversion_events WHERE event_category IS NOT NULL;
  
  -- Vérifier le nombre d'événements avec source identifiée
  SELECT COUNT(*) INTO sourced_events_count FROM conversion_events WHERE source_system IS NOT NULL;
  
  -- Rapport final
  RAISE NOTICE 'Rapport de migration:';
  RAISE NOTICE 'Contacts migrés: %', lead_contacts_count;
  RAISE NOTICE 'Visiteurs liés à des leads: %', visitor_lead_count;
  RAISE NOTICE 'Événements catégorisés: %', categorized_events_count;
  RAISE NOTICE 'Événements avec source identifiée: %', sourced_events_count;
END;
$$;
