-- Script de migration 20250325000000_phase2_preparation.sql
-- Date: 2025-03-25
-- Description: Préparation de la Phase 2 - Documentation et métadonnées

-- Documentation du schéma actuel
COMMENT ON TABLE conversion_events IS 'Événements de conversion du funnel marketing';
COMMENT ON TABLE funnel_progress IS 'Progression des visiteurs à travers le funnel';
COMMENT ON TABLE leads IS 'Prospects qualifiés avec information de contact';
COMMENT ON TABLE visitors IS 'Visiteurs du site avec information de tracking';

-- Documentation des colonnes principales
COMMENT ON COLUMN conversion_events.event_type IS 'Type d''événement de conversion (enum conversion_event_type)';
COMMENT ON COLUMN conversion_events.event_data IS 'Données additionnelles spécifiques à l''événement (JSON)';
COMMENT ON COLUMN funnel_progress.current_stage IS 'Étape actuelle du visiteur dans le funnel marketing';
COMMENT ON COLUMN funnel_progress.rdv_scheduled_at IS 'Date et heure de programmation du rendez-vous';
COMMENT ON COLUMN funnel_progress.rdv_canceled_at IS 'Date et heure d''annulation du rendez-vous';

-- Vérification des index existants et création d''index manquants critiques
DO $$
BEGIN
  -- Index pour les jointures fréquentes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'conversion_events' AND indexname = 'idx_conversion_events_lead_id') THEN
    CREATE INDEX idx_conversion_events_lead_id ON conversion_events(lead_id);
    RAISE NOTICE 'Index idx_conversion_events_lead_id créé';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'funnel_progress' AND indexname = 'idx_funnel_progress_visitor_id') THEN
    CREATE INDEX idx_funnel_progress_visitor_id ON funnel_progress(visitor_id);
    RAISE NOTICE 'Index idx_funnel_progress_visitor_id créé';
  END IF;

  -- Index pour les recherches temporelles
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'conversion_events' AND indexname = 'idx_conversion_events_created_at') THEN
    CREATE INDEX idx_conversion_events_created_at ON conversion_events(created_at);
    RAISE NOTICE 'Index idx_conversion_events_created_at créé';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'funnel_progress' AND indexname = 'idx_funnel_progress_rdv_scheduled_at') THEN
    CREATE INDEX idx_funnel_progress_rdv_scheduled_at ON funnel_progress(rdv_scheduled_at);
    RAISE NOTICE 'Index idx_funnel_progress_rdv_scheduled_at créé';
  END IF;
END;
$$;

-- Préparation pour les futures migrations
-- Documentation sur la normalisation prévue (commentaire SQL uniquement, pas d''exécution)
/*
Plan de normalisation Phase 2:

1. Normalisation de conversion_events:
   - Standardisation des types d''événements
   - Structure cohérente pour event_data

2. Normalisation de funnel_progress:
   - Création d''enum pour les étapes
   - Relations explicites avec leads/visitors

3. Relations leads-visitors:
   - Table lead_contacts pour normaliser les infos de contact
   - Relation explicite entre leads et visitors

Chaque étape sera implémentée dans des migrations séparées.
*/

-- Rapport du schéma actuel
DO $$
DECLARE
  table_count INT;
  visitor_count INT;
  lead_count INT;
  event_count INT;
BEGIN
  -- Nombre total de tables
  SELECT COUNT(*) INTO table_count FROM information_schema.tables WHERE table_schema = 'public';
  
  -- Données statistiques de base
  SELECT COUNT(*) INTO visitor_count FROM visitors;
  SELECT COUNT(*) INTO lead_count FROM leads;
  SELECT COUNT(*) INTO event_count FROM conversion_events;
  
  -- Afficher le rapport
  RAISE NOTICE 'Rapport du schéma actuel:';
  RAISE NOTICE 'Tables totales: %', table_count;
  RAISE NOTICE 'Visiteurs: %', visitor_count;
  RAISE NOTICE 'Leads: %', lead_count;
  RAISE NOTICE 'Événements de conversion: %', event_count;
END;
$$;
