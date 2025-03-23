-- Script de migration 20250330000000_analytics_functions.sql
-- Date: 2025-03-30
-- Description: Fonctions d'agrégation et index pour le module Analytics (Phase 3)

-- ====================================================
-- SECTION 1 : INDEX DE PERFORMANCE
-- ====================================================

-- 1.1 Index pour les événements
DO $$
BEGIN
  -- Index sur created_at pour les requêtes temporelles
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_conversion_events_created_at') THEN
    CREATE INDEX idx_conversion_events_created_at ON conversion_events (created_at);
    RAISE NOTICE 'Index idx_conversion_events_created_at créé avec succès';
  ELSE
    RAISE NOTICE 'Index idx_conversion_events_created_at existe déjà';
  END IF;
  
  -- Index sur event_category pour les requêtes d'analyse par catégorie
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_conversion_events_category') THEN
    CREATE INDEX idx_conversion_events_category ON conversion_events (event_category);
    RAISE NOTICE 'Index idx_conversion_events_category créé avec succès';
  ELSE
    RAISE NOTICE 'Index idx_conversion_events_category existe déjà';
  END IF;
  
  -- Index sur source_system pour les requêtes d'analyse par source
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_conversion_events_source') THEN
    CREATE INDEX idx_conversion_events_source ON conversion_events (source_system);
    RAISE NOTICE 'Index idx_conversion_events_source créé avec succès';
  ELSE
    RAISE NOTICE 'Index idx_conversion_events_source existe déjà';
  END IF;
  
  -- Index combiné pour les requêtes analytiques complexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_conversion_events_analytics_combo') THEN
    CREATE INDEX idx_conversion_events_analytics_combo ON conversion_events (created_at, event_category, source_system);
    RAISE NOTICE 'Index idx_conversion_events_analytics_combo créé avec succès';
  ELSE
    RAISE NOTICE 'Index idx_conversion_events_analytics_combo existe déjà';
  END IF;

END; $$;

-- 1.2 Index pour le funnel
DO $$
BEGIN
  -- Index sur created_at pour les requêtes temporelles du funnel
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_funnel_progress_created_at') THEN
    CREATE INDEX idx_funnel_progress_created_at ON funnel_progress (created_at);
    RAISE NOTICE 'Index idx_funnel_progress_created_at créé avec succès';
  ELSE
    RAISE NOTICE 'Index idx_funnel_progress_created_at existe déjà';
  END IF;
  
  -- Index sur stage pour l'analyse par étape du funnel
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_funnel_progress_stage') THEN
    CREATE INDEX idx_funnel_progress_stage ON funnel_progress (stage);
    RAISE NOTICE 'Index idx_funnel_progress_stage créé avec succès';
  ELSE
    RAISE NOTICE 'Index idx_funnel_progress_stage existe déjà';
  END IF;

END; $$;

-- 1.3 Index pour les leads
DO $$
BEGIN
  -- Index sur created_at pour les leads
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leads_created_at') THEN
    CREATE INDEX idx_leads_created_at ON leads (created_at);
    RAISE NOTICE 'Index idx_leads_created_at créé avec succès';
  ELSE
    RAISE NOTICE 'Index idx_leads_created_at existe déjà';
  END IF;

END; $$;

-- ====================================================
-- SECTION 2 : FONCTIONS D'AGRÉGATION POUR ÉVÉNEMENTS
-- ====================================================

-- 2.1 Fonction pour obtenir les événements par catégorie
/**
 * Fonction: get_events_by_category
 * Description: Agrège les événements par catégorie et calcule les pourcentages
 * Paramètres:
 *   - start_date: Date de début de la période d'analyse
 *   - end_date: Date de fin de la période d'analyse
 *   - site_id: ID du site (optionnel)
 *   - user_id: ID de l'utilisateur (optionnel)
 *   - limit_val: Nombre maximum de résultats à retourner
 * Retour: Table contenant catégorie, nombre d'événements et pourcentage
 */
CREATE OR REPLACE FUNCTION get_events_by_category(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  site_id UUID DEFAULT NULL,
  user_id UUID DEFAULT NULL,
  limit_val INT DEFAULT 10
)
RETURNS TABLE (
  category TEXT,
  count BIGINT,
  percentage NUMERIC
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH filtered_events AS (
    SELECT *
    FROM conversion_events
    WHERE created_at BETWEEN start_date AND end_date
    AND (site_id IS NULL OR conversion_events.site_id = site_id)
    AND (user_id IS NULL OR conversion_events.user_id = user_id)
  ),
  total AS (
    SELECT COUNT(*) AS total_count FROM filtered_events
  ),
  category_counts AS (
    SELECT 
      COALESCE(event_category, 'unknown') as category,
      COUNT(*) as count,
      ROUND((COUNT(*) * 100.0 / NULLIF((SELECT total_count FROM total), 0)), 2) as percentage
    FROM filtered_events
    GROUP BY category
    ORDER BY count DESC
    LIMIT limit_val
  )
  SELECT * FROM category_counts;
END; $$;

-- 2.2 Fonction pour obtenir les événements par source
/**
 * Fonction: get_events_by_source
 * Description: Agrège les événements par source (source_system) et calcule les pourcentages
 * Paramètres: Identiques à get_events_by_category
 * Retour: Table contenant source, nombre d'événements et pourcentage
 */
CREATE OR REPLACE FUNCTION get_events_by_source(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  site_id UUID DEFAULT NULL,
  user_id UUID DEFAULT NULL,
  limit_val INT DEFAULT 10
)
RETURNS TABLE (
  source TEXT,
  count BIGINT,
  percentage NUMERIC
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH filtered_events AS (
    SELECT *
    FROM conversion_events
    WHERE created_at BETWEEN start_date AND end_date
    AND (site_id IS NULL OR conversion_events.site_id = site_id)
    AND (user_id IS NULL OR conversion_events.user_id = user_id)
  ),
  total AS (
    SELECT COUNT(*) AS total_count FROM filtered_events
  ),
  source_counts AS (
    SELECT 
      COALESCE(source_system, 'unknown') as source,
      COUNT(*) as count,
      ROUND((COUNT(*) * 100.0 / NULLIF((SELECT total_count FROM total), 0)), 2) as percentage
    FROM filtered_events
    GROUP BY source
    ORDER BY count DESC
    LIMIT limit_val
  )
  SELECT * FROM source_counts;
END; $$;

-- 2.3 Fonction pour obtenir la timeline des événements
/**
 * Fonction: get_events_timeline
 * Description: Crée une timeline des événements par jour
 * Paramètres:
 *   - Paramètres standard + filtres optionnels pour event_category et source_system
 * Retour: Table contenant date et nombre d'événements
 */
CREATE OR REPLACE FUNCTION get_events_timeline(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  site_id UUID DEFAULT NULL,
  user_id UUID DEFAULT NULL,
  event_category TEXT DEFAULT NULL,
  source_system TEXT DEFAULT NULL
)
RETURNS TABLE (
  date TEXT,
  count BIGINT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT dates::date as series_date
    FROM generate_series(start_date::date, end_date::date, '1 day'::interval) dates
  )
  SELECT 
    TO_CHAR(ds.series_date, 'YYYY-MM-DD') as date,
    COUNT(e.id) as count
  FROM date_series ds
  LEFT JOIN conversion_events e ON 
    DATE(e.created_at) = ds.series_date AND
    (site_id IS NULL OR e.site_id = site_id) AND
    (user_id IS NULL OR e.user_id = user_id) AND
    (event_category IS NULL OR e.event_category = event_category) AND
    (source_system IS NULL OR e.source_system = source_system)
  GROUP BY ds.series_date
  ORDER BY ds.series_date;
END; $$;

-- 2.4 Fonction pour obtenir le nombre total d'événements
/**
 * Fonction: get_total_events
 * Description: Compte le nombre total d'événements selon les filtres
 */
CREATE OR REPLACE FUNCTION get_total_events(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  site_id UUID DEFAULT NULL,
  user_id UUID DEFAULT NULL,
  event_category TEXT DEFAULT NULL,
  source_system TEXT DEFAULT NULL
)
RETURNS BIGINT LANGUAGE plpgsql AS $$
DECLARE
  total_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO total_count
  FROM conversion_events
  WHERE created_at BETWEEN start_date AND end_date
  AND (site_id IS NULL OR conversion_events.site_id = site_id)
  AND (user_id IS NULL OR conversion_events.user_id = user_id)
  AND (event_category IS NULL OR conversion_events.event_category = event_category)
  AND (source_system IS NULL OR conversion_events.source_system = source_system);
  
  RETURN total_count;
END; $$;

-- ====================================================
-- SECTION 3 : FONCTIONS D'AGRÉGATION POUR FUNNEL
-- ====================================================

-- 3.1 Fonction pour analyser les étapes du funnel
/**
 * Fonction: get_funnel_stages_analysis
 * Description: Analyse les différentes étapes du funnel et leur taux de conversion
 */
CREATE OR REPLACE FUNCTION get_funnel_stages_analysis(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  site_id UUID DEFAULT NULL,
  user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  stage TEXT,
  count BIGINT,
  conversion_rate NUMERIC,
  dropoff_rate NUMERIC
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH funnel_data AS (
    SELECT 
      stage,
      COUNT(DISTINCT fp.visitor_id) as count
    FROM funnel_progress fp
    WHERE fp.created_at BETWEEN start_date AND end_date
    AND (site_id IS NULL OR fp.site_id = site_id)
    AND (user_id IS NULL OR fp.user_id = user_id)
    GROUP BY stage
    ORDER BY count DESC
  ),
  max_count AS (
    SELECT MAX(count) as max_val FROM funnel_data
  )
  SELECT
    fd.stage,
    fd.count,
    ROUND((fd.count * 100.0 / NULLIF(m.max_val, 0)), 2) as conversion_rate,
    CASE 
      WHEN fd.count = m.max_val THEN 0
      ELSE ROUND(((m.max_val - fd.count) * 100.0 / NULLIF(m.max_val, 0)), 2)
    END as dropoff_rate
  FROM funnel_data fd, max_count m;
END; $$;

-- 3.2 Fonction pour calculer le taux de conversion global du funnel
/**
 * Fonction: get_funnel_overall_conversion
 * Description: Calcule le taux de conversion global du premier au dernier stade
 */
CREATE OR REPLACE FUNCTION get_funnel_overall_conversion(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  site_id UUID DEFAULT NULL,
  user_id UUID DEFAULT NULL
)
RETURNS NUMERIC LANGUAGE plpgsql AS $$
DECLARE
  first_stage_count BIGINT;
  last_stage_count BIGINT;
  conversion_rate NUMERIC;
BEGIN
  -- Déterminer le premier stade (celui avec le plus grand nombre de visiteurs)
  SELECT COUNT(DISTINCT visitor_id) INTO first_stage_count
  FROM funnel_progress
  WHERE created_at BETWEEN start_date AND end_date
  AND (site_id IS NULL OR funnel_progress.site_id = site_id)
  AND (user_id IS NULL OR funnel_progress.user_id = user_id)
  AND stage = (
    SELECT stage
    FROM funnel_progress
    WHERE created_at BETWEEN start_date AND end_date
    AND (site_id IS NULL OR funnel_progress.site_id = site_id)
    AND (user_id IS NULL OR funnel_progress.user_id = user_id)
    GROUP BY stage
    ORDER BY COUNT(DISTINCT visitor_id) DESC
    LIMIT 1
  );
  
  -- Déterminer le dernier stade (généralement 'PURCHASE_MADE' ou similaire)
  SELECT COUNT(DISTINCT visitor_id) INTO last_stage_count
  FROM funnel_progress
  WHERE created_at BETWEEN start_date AND end_date
  AND (site_id IS NULL OR funnel_progress.site_id = site_id)
  AND (user_id IS NULL OR funnel_progress.user_id = user_id)
  AND stage = 'PURCHASE_MADE';
  
  -- Calculer le taux de conversion
  IF first_stage_count > 0 THEN
    conversion_rate := ROUND((last_stage_count * 100.0 / first_stage_count), 2);
  ELSE
    conversion_rate := 0;
  END IF;
  
  RETURN conversion_rate;
END; $$;

-- 3.3 Fonction pour calculer le temps moyen de conversion
/**
 * Fonction: get_average_conversion_time
 * Description: Calcule le temps moyen (en heures) pour traverser le funnel
 */
CREATE OR REPLACE FUNCTION get_average_conversion_time(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  site_id UUID DEFAULT NULL,
  user_id UUID DEFAULT NULL
)
RETURNS NUMERIC LANGUAGE plpgsql AS $$
DECLARE
  avg_hours NUMERIC;
BEGIN
  SELECT ROUND(AVG(EXTRACT(EPOCH FROM (last_stage.created_at - first_stage.created_at)) / 3600), 2) INTO avg_hours
  FROM (
    -- Premier événement pour chaque visiteur
    SELECT visitor_id, MIN(created_at) as created_at
    FROM funnel_progress
    WHERE created_at BETWEEN start_date AND end_date
    AND (site_id IS NULL OR funnel_progress.site_id = site_id)
    AND (user_id IS NULL OR funnel_progress.user_id = user_id)
    GROUP BY visitor_id
  ) first_stage
  JOIN (
    -- Dernier événement pour chaque visiteur
    SELECT visitor_id, MAX(created_at) as created_at
    FROM funnel_progress
    WHERE created_at BETWEEN start_date AND end_date
    AND (site_id IS NULL OR funnel_progress.site_id = site_id)
    AND (user_id IS NULL OR funnel_progress.user_id = user_id)
    AND stage = 'PURCHASE_MADE'
    GROUP BY visitor_id
  ) last_stage ON first_stage.visitor_id = last_stage.visitor_id;
  
  RETURN COALESCE(avg_hours, 0);
END; $$;

-- ====================================================
-- SECTION 4 : FONCTIONS D'AGRÉGATION POUR LEADS
-- ====================================================

-- 4.1 Fonction pour obtenir le nombre total de leads
/**
 * Fonction: get_total_leads
 * Description: Compte le nombre total de leads sur une période
 */
CREATE OR REPLACE FUNCTION get_total_leads(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  site_id UUID DEFAULT NULL,
  user_id UUID DEFAULT NULL
)
RETURNS BIGINT LANGUAGE plpgsql AS $$
DECLARE
  total_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO total_count
  FROM leads
  WHERE created_at BETWEEN start_date AND end_date
  AND (site_id IS NULL OR leads.site_id = site_id)
  AND (user_id IS NULL OR leads.user_id = user_id);
  
  RETURN total_count;
END; $$;

-- 4.2 Fonction pour calculer le taux de conversion des leads
/**
 * Fonction: get_leads_conversion_rate
 * Description: Calcule le pourcentage de leads qui ont effectué un achat
 */
CREATE OR REPLACE FUNCTION get_leads_conversion_rate(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  site_id UUID DEFAULT NULL,
  user_id UUID DEFAULT NULL
)
RETURNS NUMERIC LANGUAGE plpgsql AS $$
DECLARE
  total_leads BIGINT;
  converted_leads BIGINT;
  conversion_rate NUMERIC;
BEGIN
  -- Nombre total de leads
  SELECT COUNT(*) INTO total_leads
  FROM leads
  WHERE created_at BETWEEN start_date AND end_date
  AND (site_id IS NULL OR leads.site_id = site_id)
  AND (user_id IS NULL OR leads.user_id = user_id);
  
  -- Nombre de leads convertis (avec achat)
  SELECT COUNT(DISTINCT l.id) INTO converted_leads
  FROM leads l
  JOIN conversion_events e ON l.id = e.lead_id
  WHERE l.created_at BETWEEN start_date AND end_date
  AND e.event_type = 'PAYMENT'
  AND (site_id IS NULL OR l.site_id = site_id)
  AND (user_id IS NULL OR l.user_id = user_id);
  
  -- Calculer le taux de conversion
  IF total_leads > 0 THEN
    conversion_rate := ROUND((converted_leads * 100.0 / total_leads), 2);
  ELSE
    conversion_rate := 0;
  END IF;
  
  RETURN conversion_rate;
END; $$;

-- 4.3 Fonction pour obtenir les leads par source
/**
 * Fonction: get_leads_by_source
 * Description: Agrège les leads par source et calcule les pourcentages
 */
CREATE OR REPLACE FUNCTION get_leads_by_source(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  site_id UUID DEFAULT NULL,
  user_id UUID DEFAULT NULL,
  limit_val INT DEFAULT 10
)
RETURNS TABLE (
  source TEXT,
  count BIGINT,
  percentage NUMERIC
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH leads_with_source AS (
    SELECT
      l.id,
      COALESCE(e.source_system, 'unknown') as source
    FROM leads l
    LEFT JOIN conversion_events e ON l.id = e.lead_id
    WHERE l.created_at BETWEEN start_date AND end_date
    AND (site_id IS NULL OR l.site_id = site_id)
    AND (user_id IS NULL OR l.user_id = user_id)
    -- Prendre le premier événement associé au lead
    AND e.id = (
      SELECT id FROM conversion_events
      WHERE lead_id = l.id
      ORDER BY created_at ASC
      LIMIT 1
    )
  ),
  total AS (
    SELECT COUNT(*) AS total_count FROM leads_with_source
  ),
  source_counts AS (
    SELECT 
      source,
      COUNT(*) as count,
      ROUND((COUNT(*) * 100.0 / NULLIF((SELECT total_count FROM total), 0)), 2) as percentage
    FROM leads_with_source
    GROUP BY source
    ORDER BY count DESC
    LIMIT limit_val
  )
  SELECT * FROM source_counts;
END; $$;

-- 4.4 Fonction pour obtenir la timeline des leads
/**
 * Fonction: get_leads_timeline
 * Description: Crée une timeline des leads par jour
 */
CREATE OR REPLACE FUNCTION get_leads_timeline(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  site_id UUID DEFAULT NULL,
  user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  date TEXT,
  count BIGINT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT dates::date as series_date
    FROM generate_series(start_date::date, end_date::date, '1 day'::interval) dates
  )
  SELECT 
    TO_CHAR(ds.series_date, 'YYYY-MM-DD') as date,
    COUNT(l.id) as count
  FROM date_series ds
  LEFT JOIN leads l ON 
    DATE(l.created_at) = ds.series_date AND
    (site_id IS NULL OR l.site_id = site_id) AND
    (user_id IS NULL OR l.user_id = user_id)
  GROUP BY ds.series_date
  ORDER BY ds.series_date;
END; $$;

-- Notification de fin d'exécution
DO $$
BEGIN
  RAISE NOTICE 'Migration 20250330000000_analytics_functions.sql terminée avec succès';
END; $$;
