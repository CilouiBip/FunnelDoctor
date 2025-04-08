-- Migration pour corriger les fonctions d'analytics utilisant site_id
-- Date: 2025-04-07

-- ====================================================
-- SECTION 1 : MISE À JOUR DES FONCTIONS D'ÉVÉNEMENTS
-- ====================================================

-- 1.1 Mise à jour de get_events_by_category
-- Fonction corrigu00e9e pour enlever toute ru00e9fu00e9rence u00e0 site_id
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

-- 1.2 Mise à jour de get_events_by_source
-- Fonction corrigu00e9e pour enlever toute ru00e9fu00e9rence u00e0 site_id
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

-- 1.3 Mise à jour de get_events_timeline
-- Fonction corrigu00e9e pour enlever toute ru00e9fu00e9rence u00e0 site_id
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
    (user_id IS NULL OR e.user_id = user_id) AND
    (event_category IS NULL OR e.event_category = event_category) AND
    (source_system IS NULL OR e.source_system = source_system)
  GROUP BY ds.series_date
  ORDER BY ds.series_date;
END; $$;

-- 1.4 Mise à jour de get_total_events
-- Fonction corrigu00e9e pour enlever toute ru00e9fu00e9rence u00e0 site_id
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
  AND (user_id IS NULL OR conversion_events.user_id = user_id)
  AND (event_category IS NULL OR conversion_events.event_category = event_category) -- u00c9vite l'ambigu00fcitu00e9 en pru00e9cisant conversion_events.event_category
  AND (source_system IS NULL OR conversion_events.source_system = source_system) -- u00c9vite l'ambigu00fcitu00e9 en pru00e9cisant conversion_events.source_system;
  
  RETURN total_count;
END; $$;

-- ====================================================
-- SECTION 2 : MISE À JOUR DES FONCTIONS DE FUNNEL
-- ====================================================

-- 2.1 Mise à jour de get_funnel_stages_analysis
-- Fonction corrigu00e9e pour enlever toute ru00e9fu00e9rence u00e0 site_id
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

-- 2.2 Mise à jour de get_funnel_overall_conversion
-- Fonction corrigu00e9e pour enlever toute ru00e9fu00e9rence u00e0 site_id
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
  AND (user_id IS NULL OR funnel_progress.user_id = user_id)
  AND stage = (
    SELECT stage
    FROM funnel_progress
    WHERE created_at BETWEEN start_date AND end_date
    AND (user_id IS NULL OR funnel_progress.user_id = user_id)
    GROUP BY stage
    ORDER BY COUNT(DISTINCT visitor_id) DESC
    LIMIT 1
  );
  
  -- Déterminer le dernier stade (généralement 'PURCHASE_MADE' ou similaire)
  SELECT COUNT(DISTINCT visitor_id) INTO last_stage_count
  FROM funnel_progress
  WHERE created_at BETWEEN start_date AND end_date
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

-- 2.3 Mise à jour de get_average_conversion_time
-- Fonction corrigu00e9e pour enlever toute ru00e9fu00e9rence u00e0 site_id
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
    AND (user_id IS NULL OR funnel_progress.user_id = user_id)
    GROUP BY visitor_id
  ) first_stage
  JOIN (
    -- Dernier événement pour chaque visiteur
    SELECT visitor_id, MAX(created_at) as created_at
    FROM funnel_progress
    WHERE created_at BETWEEN start_date AND end_date
    AND (user_id IS NULL OR funnel_progress.user_id = user_id)
    AND stage = 'PURCHASE_MADE'
    GROUP BY visitor_id
  ) last_stage ON first_stage.visitor_id = last_stage.visitor_id;
  
  RETURN COALESCE(avg_hours, 0);
END; $$;

-- ====================================================
-- SECTION 3 : MISE À JOUR DES FONCTIONS DE LEADS
-- ====================================================

-- 3.1 Mise à jour de get_total_leads
-- Fonction corrigu00e9e pour enlever toute ru00e9fu00e9rence u00e0 site_id
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
  AND (user_id IS NULL OR leads.user_id = user_id);
  
  RETURN total_count;
END; $$;

-- 3.2 Mise à jour de get_leads_conversion_rate
-- Fonction corrigu00e9e pour enlever toute ru00e9fu00e9rence u00e0 site_id
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
  AND (user_id IS NULL OR leads.user_id = user_id);
  
  -- Nombre de leads convertis (avec achat)
  SELECT COUNT(DISTINCT l.id) INTO converted_leads
  FROM leads l
  JOIN conversion_events e ON l.id = e.lead_id
  WHERE l.created_at BETWEEN start_date AND end_date
  AND e.event_type = 'PAYMENT'
  AND (user_id IS NULL OR l.user_id = user_id);
  
  -- Calculer le taux de conversion
  IF total_leads > 0 THEN
    conversion_rate := ROUND((converted_leads * 100.0 / total_leads), 2);
  ELSE
    conversion_rate := 0;
  END IF;
  
  RETURN conversion_rate;
END; $$;

-- 3.3 Mise à jour de get_leads_by_source
-- Fonction corrigu00e9e pour enlever toute ru00e9fu00e9rence u00e0 site_id
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

-- 3.4 Mise à jour de get_leads_timeline
-- Fonction corrigu00e9e pour enlever toute ru00e9fu00e9rence u00e0 site_id
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
    (user_id IS NULL OR l.user_id = user_id)
  GROUP BY ds.series_date
  ORDER BY ds.series_date;
END; $$;

-- Notification de fin d'exécution
DO $$
BEGIN
  RAISE NOTICE 'Migration 2025-04-07-fix-analytics-site-id.sql terminée avec succès';
END; $$;
