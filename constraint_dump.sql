

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."conversion_event_type" AS ENUM (
    'VISIT',
    'SIGNUP',
    'DEMO_REQUEST',
    'TRIAL_STARTED',
    'PURCHASE_MADE',
    'CONTACT_FORM',
    'DOWNLOAD',
    'EMAIL_CLICK',
    'CUSTOM',
    'FORM_SUBMIT',
    'BUTTON_CLICK',
    'PAGE_VIEW',
    'CONTENT_VIEW',
    'PAYMENT',
    'RDV',
    'DEMO_CANCELED'
);


ALTER TYPE "public"."conversion_event_type" OWNER TO "postgres";


CREATE TYPE "public"."lead_status" AS ENUM (
    'new',
    'contacted',
    'qualified',
    'negotiation',
    'won',
    'lost',
    'merged'
);


ALTER TYPE "public"."lead_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_overall_funnel_kpis_by_video"() RETURNS TABLE("video_db_id" "uuid", "video_id" "text", "video_title" "text", "total_visitors" bigint, "total_leads" bigint, "total_demos" bigint, "total_sales" bigint, "total_revenue" numeric, "visitor_to_lead_rate" numeric, "lead_to_demo_rate" numeric, "demo_to_sale_rate" numeric, "visitor_to_sale_rate" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH 
  -- Liste de toutes les vidéos
  all_videos AS (
    SELECT 
      v.id as video_db_id,
      v.video_id as youtube_video_id,
      v.title as video_title
    FROM youtube_videos v
  ),
  -- Associations vidéo-liens de tracking
  video_tracking_links AS (
    SELECT 
      av.video_db_id,
      tl.id as tracking_link_id
    FROM all_videos av
    JOIN tracking_links tl ON 
      tl.utm_source = 'youtube' AND 
      tl.utm_medium = 'video' AND 
      (tl.utm_campaign = av.youtube_video_id OR 
       tl.utm_content LIKE '%' || av.youtube_video_id || '%')
  ),
  -- Visiteurs par vidéo
  video_visitors AS (
    SELECT 
      vtl.video_db_id,
      COUNT(DISTINCT t.visitor_id) as total_visitors
    FROM touchpoints t
    JOIN video_tracking_links vtl ON t.tracking_link_id = vtl.tracking_link_id
    GROUP BY vtl.video_db_id
  ),
  -- Leads par vidéo
  video_leads AS (
    SELECT 
      vtl.video_db_id,
      COUNT(DISTINCT l.id) as total_leads
    FROM leads l
    JOIN visitors v ON l.id = v.lead_id
    JOIN touchpoints t ON v.visitor_id = t.visitor_id
    JOIN video_tracking_links vtl ON t.tracking_link_id = vtl.tracking_link_id
    GROUP BY vtl.video_db_id
  ),
  -- Demandes de démo par vidéo
  video_demos AS (
    SELECT 
      vtl.video_db_id,
      COUNT(DISTINCT ce.id) as total_demos
    FROM conversion_events ce
    JOIN leads l ON ce.lead_id = l.id
    JOIN visitors v ON l.id = v.lead_id
    JOIN touchpoints t ON v.visitor_id = t.visitor_id
    JOIN video_tracking_links vtl ON t.tracking_link_id = vtl.tracking_link_id
    WHERE ce.event_type = 'DEMO_REQUEST'
    GROUP BY vtl.video_db_id
  ),
  -- Ventes par vidéo
  video_sales AS (
    SELECT 
      vtl.video_db_id,
      COUNT(DISTINCT ce.id) as total_sales,
      COALESCE(SUM((ce.event_data->>'amount')::DECIMAL), 0) as total_revenue
    FROM conversion_events ce
    JOIN leads l ON ce.lead_id = l.id
    JOIN visitors v ON l.id = v.lead_id
    JOIN touchpoints t ON v.visitor_id = t.visitor_id
    JOIN video_tracking_links vtl ON t.tracking_link_id = vtl.tracking_link_id
    WHERE ce.event_type = 'PURCHASE_MADE'
    GROUP BY vtl.video_db_id
  )
  
  -- Assembler tous les résultats par vidéo
  SELECT
    av.video_db_id,
    av.youtube_video_id as video_id,
    av.video_title,
    COALESCE(vv.total_visitors, 0) as total_visitors,
    COALESCE(vl.total_leads, 0) as total_leads,
    COALESCE(vd.total_demos, 0) as total_demos,
    COALESCE(vs.total_sales, 0) as total_sales,
    COALESCE(vs.total_revenue, 0) as total_revenue,
    -- Calcul des taux de conversion (en pourcentage)
    CASE WHEN COALESCE(vv.total_visitors, 0) > 0 THEN 
      ROUND((COALESCE(vl.total_leads, 0)::DECIMAL / vv.total_visitors) * 100, 2)
    ELSE 0 END as visitor_to_lead_rate,
    CASE WHEN COALESCE(vl.total_leads, 0) > 0 THEN 
      ROUND((COALESCE(vd.total_demos, 0)::DECIMAL / vl.total_leads) * 100, 2)
    ELSE 0 END as lead_to_demo_rate,
    CASE WHEN COALESCE(vd.total_demos, 0) > 0 THEN 
      ROUND((COALESCE(vs.total_sales, 0)::DECIMAL / vd.total_demos) * 100, 2)
    ELSE 0 END as demo_to_sale_rate,
    CASE WHEN COALESCE(vv.total_visitors, 0) > 0 THEN 
      ROUND((COALESCE(vs.total_sales, 0)::DECIMAL / vv.total_visitors) * 100, 2)
    ELSE 0 END as visitor_to_sale_rate
  FROM all_videos av
  LEFT JOIN video_visitors vv ON av.video_db_id = vv.video_db_id
  LEFT JOIN video_leads vl ON av.video_db_id = vl.video_db_id
  LEFT JOIN video_demos vd ON av.video_db_id = vd.video_db_id
  LEFT JOIN video_sales vs ON av.video_db_id = vs.video_db_id
  ORDER BY total_revenue DESC, total_leads DESC;
END;
$$;


ALTER FUNCTION "public"."calculate_overall_funnel_kpis_by_video"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_video_funnel_kpis"("target_video_youtube_id" "text") RETURNS TABLE("video_id" "text", "video_title" "text", "total_visitors" bigint, "total_leads" bigint, "total_demos" bigint, "total_sales" bigint, "total_revenue" numeric, "visitor_to_lead_rate" numeric, "lead_to_demo_rate" numeric, "demo_to_sale_rate" numeric, "visitor_to_sale_rate" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH video_info AS (
    SELECT 
      v.id as video_db_id,
      v.video_id as youtube_video_id,
      v.title as video_title
    FROM youtube_videos v
    WHERE v.video_id = target_video_youtube_id
  ),
  -- Trouver les liens de tracking liés à la vidéo (via UTM)
  video_tracking_links AS (
    SELECT tl.id
    FROM tracking_links tl
    WHERE 
      tl.utm_source = 'youtube' AND 
      tl.utm_medium = 'video' AND 
      (tl.utm_campaign = target_video_youtube_id OR 
       tl.utm_content LIKE '%' || target_video_youtube_id || '%')
  ),
  -- Compter les visiteurs uniques venant de cette vidéo
  video_visitors AS (
    SELECT 
      COUNT(DISTINCT t.visitor_id) as total_visitors
    FROM touchpoints t
    JOIN video_tracking_links vtl ON t.tracking_link_id = vtl.id
  ),
  -- Compter les leads générés par cette vidéo
  video_leads AS (
    SELECT 
      COUNT(DISTINCT l.id) as total_leads
    FROM leads l
    JOIN visitors v ON l.id = v.lead_id
    JOIN touchpoints t ON v.visitor_id = t.visitor_id
    JOIN video_tracking_links vtl ON t.tracking_link_id = vtl.id
  ),
  -- Compter les demandes de démo venant de leads de cette vidéo
  video_demos AS (
    SELECT 
      COUNT(DISTINCT ce.id) as total_demos
    FROM conversion_events ce
    JOIN leads l ON ce.lead_id = l.id
    JOIN visitors v ON l.id = v.lead_id
    JOIN touchpoints t ON v.visitor_id = t.visitor_id
    JOIN video_tracking_links vtl ON t.tracking_link_id = vtl.id
    WHERE ce.event_type = 'DEMO_REQUEST'
  ),
  -- Compter les ventes issues de leads de cette vidéo et calculer le revenu total
  video_sales AS (
    SELECT 
      COUNT(DISTINCT ce.id) as total_sales,
      COALESCE(SUM((ce.event_data->>'amount')::DECIMAL), 0) as total_revenue
    FROM conversion_events ce
    JOIN leads l ON ce.lead_id = l.id
    JOIN visitors v ON l.id = v.lead_id
    JOIN touchpoints t ON v.visitor_id = t.visitor_id
    JOIN video_tracking_links vtl ON t.tracking_link_id = vtl.id
    WHERE ce.event_type = 'PURCHASE_MADE'
  )
  
  -- Assembler tous les KPIs et calculer les taux de conversion
  SELECT
    vi.youtube_video_id as video_id,
    vi.video_title,
    COALESCE(vv.total_visitors, 0) as total_visitors,
    COALESCE(vl.total_leads, 0) as total_leads,
    COALESCE(vd.total_demos, 0) as total_demos,
    COALESCE(vs.total_sales, 0) as total_sales,
    COALESCE(vs.total_revenue, 0) as total_revenue,
    -- Calcul des taux de conversion (en pourcentage)
    CASE WHEN COALESCE(vv.total_visitors, 0) > 0 THEN 
      ROUND((COALESCE(vl.total_leads, 0)::DECIMAL / vv.total_visitors) * 100, 2)
    ELSE 0 END as visitor_to_lead_rate,
    CASE WHEN COALESCE(vl.total_leads, 0) > 0 THEN 
      ROUND((COALESCE(vd.total_demos, 0)::DECIMAL / vl.total_leads) * 100, 2)
    ELSE 0 END as lead_to_demo_rate,
    CASE WHEN COALESCE(vd.total_demos, 0) > 0 THEN 
      ROUND((COALESCE(vs.total_sales, 0)::DECIMAL / vd.total_demos) * 100, 2)
    ELSE 0 END as demo_to_sale_rate,
    CASE WHEN COALESCE(vv.total_visitors, 0) > 0 THEN 
      ROUND((COALESCE(vs.total_sales, 0)::DECIMAL / vv.total_visitors) * 100, 2)
    ELSE 0 END as visitor_to_sale_rate
  FROM video_info vi
  LEFT JOIN video_visitors vv ON true
  LEFT JOIN video_leads vl ON true
  LEFT JOIN video_demos vd ON true
  LEFT JOIN video_sales vs ON true;
END;
$$;


ALTER FUNCTION "public"."calculate_video_funnel_kpis"("target_video_youtube_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clean_old_tokens"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  DELETE FROM public.reset_tokens 
  WHERE 
    (expires_at < now() OR used = TRUE) 
    AND created_at < (now() - interval '7 days');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."clean_old_tokens"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_average_conversion_time"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid" DEFAULT NULL::"uuid", "user_id" "uuid" DEFAULT NULL::"uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
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


ALTER FUNCTION "public"."get_average_conversion_time"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_events_by_category"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid" DEFAULT NULL::"uuid", "user_id" "uuid" DEFAULT NULL::"uuid", "limit_val" integer DEFAULT 10) RETURNS TABLE("category" "text", "count" bigint, "percentage" numeric)
    LANGUAGE "plpgsql"
    AS $$
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


ALTER FUNCTION "public"."get_events_by_category"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid", "limit_val" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_events_by_source"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid" DEFAULT NULL::"uuid", "user_id" "uuid" DEFAULT NULL::"uuid", "limit_val" integer DEFAULT 10) RETURNS TABLE("source" "text", "count" bigint, "percentage" numeric)
    LANGUAGE "plpgsql"
    AS $$
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


ALTER FUNCTION "public"."get_events_by_source"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid", "limit_val" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_events_timeline"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid" DEFAULT NULL::"uuid", "user_id" "uuid" DEFAULT NULL::"uuid", "event_category" "text" DEFAULT NULL::"text", "source_system" "text" DEFAULT NULL::"text") RETURNS TABLE("date" "text", "count" bigint)
    LANGUAGE "plpgsql"
    AS $$
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


ALTER FUNCTION "public"."get_events_timeline"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid", "event_category" "text", "source_system" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_funnel_overall_conversion"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid" DEFAULT NULL::"uuid", "user_id" "uuid" DEFAULT NULL::"uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
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


ALTER FUNCTION "public"."get_funnel_overall_conversion"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_funnel_stages_analysis"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid" DEFAULT NULL::"uuid", "user_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("stage" "text", "count" bigint, "conversion_rate" numeric, "dropoff_rate" numeric)
    LANGUAGE "plpgsql"
    AS $$
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


ALTER FUNCTION "public"."get_funnel_stages_analysis"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_leads_by_source"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid" DEFAULT NULL::"uuid", "user_id" "uuid" DEFAULT NULL::"uuid", "limit_val" integer DEFAULT 10) RETURNS TABLE("source" "text", "count" bigint, "percentage" numeric)
    LANGUAGE "plpgsql"
    AS $$
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


ALTER FUNCTION "public"."get_leads_by_source"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid", "limit_val" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_leads_conversion_rate"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid" DEFAULT NULL::"uuid", "user_id" "uuid" DEFAULT NULL::"uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
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


ALTER FUNCTION "public"."get_leads_conversion_rate"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_leads_timeline"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid" DEFAULT NULL::"uuid", "user_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("date" "text", "count" bigint)
    LANGUAGE "plpgsql"
    AS $$
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


ALTER FUNCTION "public"."get_leads_timeline"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_tables"() RETURNS "json"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    result json;
BEGIN
    WITH tables AS (
        SELECT 
            t.table_name AS name
        FROM 
            information_schema.tables t
        WHERE 
            t.table_schema = 'public'
            AND t.table_type = 'BASE TABLE'
    ),
    columns AS (
        SELECT 
            c.table_name,
            json_agg(
                json_build_object(
                    'name', c.column_name,
                    'type', c.data_type,
                    'nullable', c.is_nullable = 'YES',
                    'default', c.column_default
                )
            ) AS columns
        FROM 
            information_schema.columns c
        WHERE 
            c.table_schema = 'public'
        GROUP BY 
            c.table_name
    ),
    foreign_keys AS (
        SELECT
            tc.table_name,
            json_agg(
                json_build_object(
                    'column', kcu.column_name,
                    'foreign_table', ccu.table_name,
                    'foreign_column', ccu.column_name
                )
            ) AS foreign_keys
        FROM 
            information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
        WHERE 
            tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = 'public'
        GROUP BY 
            tc.table_name
    )
    SELECT 
        json_agg(
            json_build_object(
                'name', t.name,
                'columns', COALESCE(c.columns, '[]'::json),
                'foreign_keys', COALESCE(fk.foreign_keys, '[]'::json)
            )
        ) INTO result
    FROM 
        tables t
        LEFT JOIN columns c ON t.name = c.table_name
        LEFT JOIN foreign_keys fk ON t.name = fk.table_name;

    RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_tables"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_total_events"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid" DEFAULT NULL::"uuid", "user_id" "uuid" DEFAULT NULL::"uuid", "event_category" "text" DEFAULT NULL::"text", "source_system" "text" DEFAULT NULL::"text") RETURNS bigint
    LANGUAGE "plpgsql"
    AS $$
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


ALTER FUNCTION "public"."get_total_events"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid", "event_category" "text", "source_system" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_total_leads"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid" DEFAULT NULL::"uuid", "user_id" "uuid" DEFAULT NULL::"uuid") RETURNS bigint
    LANGUAGE "plpgsql"
    AS $$
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


ALTER FUNCTION "public"."get_total_leads"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_lead_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Ignorer si le statut n'a pas changé
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Insérer une entrée dans la table d'historique
  INSERT INTO lead_status_history (lead_id, old_status, new_status, user_id)
  VALUES (NEW.id, OLD.status, NEW.status, NEW.user_id);
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_lead_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."merge_leads"("source_lead_id" "uuid", "target_lead_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    success BOOLEAN;
BEGIN
    -- Mise à jour du status du lead source à 'merged'
    UPDATE leads
    SET status = 'merged',
        notes = COALESCE(notes, '') || 'Merged with lead ' || target_lead_id || ' on ' || NOW() || ';'
    WHERE id = source_lead_id;
    
    -- Mise à jour des visiteurs associés au lead source
    UPDATE visitors
    SET lead_id = target_lead_id
    WHERE lead_id = source_lead_id;
    
    -- Mise à jour des événements de conversion associés au lead source
    UPDATE conversion_events
    SET lead_id = target_lead_id
    WHERE lead_id = source_lead_id;
    
    success := FOUND;
    
    RETURN success;
END;
$$;


ALTER FUNCTION "public"."merge_leads"("source_lead_id" "uuid", "target_lead_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_lead_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Vérifier si le statut a changé
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) OR
     (TG_OP = 'INSERT' AND NEW.status IS NOT NULL) THEN
    
    -- Insérer dans l'historique avec les noms de colonnes corrects
    INSERT INTO lead_status_history (
      lead_id, 
      old_status,        -- Correction: previous_status → old_status
      new_status, 
      user_id            -- Correction: changed_by → user_id
    ) VALUES (
      NEW.id, 
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.status::lead_status ELSE NULL END,  -- Garde le cast car le type existe
      NEW.status::lead_status, 
      COALESCE(auth.uid(), NEW.user_id)  -- Garde auth.uid() car la fonction existe
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."record_lead_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."run_sql"("query" "text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  result json;
begin
  execute query;
  return '{}'::json;
exception when others then
  return json_build_object('error', SQLERRM);
end;
$$;


ALTER FUNCTION "public"."run_sql"("query" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."run_sql_select"("query" "text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  result json;
begin
  execute 'WITH query_result AS (' || query || ')
  SELECT json_agg(row_to_json(query_result)) FROM query_result' into result;
  return coalesce(result, '[]'::json);
exception when others then
  return json_build_object('error', SQLERRM);
end;
$$;


ALTER FUNCTION "public"."run_sql_select"("query" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_set_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Vérifier que la colonne updated_at existe sur la table
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = TG_TABLE_SCHEMA AND table_name = TG_TABLE_NAME AND column_name = 'updated_at'
  ) THEN
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_set_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_lead_status_from_conversion"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  lead_current_status TEXT;
BEGIN
  -- Ru00e9cupu00e9rer le statut actuel du lead
  SELECT status INTO lead_current_status
  FROM leads WHERE id = NEW.lead_id;
  
  -- Appliquer les ru00e8gles de transition automatique basu00e9es sur le type d'u00e9vu00e9nement
  IF NEW.event_type = 'PURCHASE_MADE' THEN
    -- Si achat, passer au statut 'won'
    UPDATE leads SET status = 'won' WHERE id = NEW.lead_id AND status != 'won';
    
  ELSIF NEW.event_type = 'DEMO_REQUEST' AND lead_current_status IN ('new', 'contacted') THEN
    -- Si demande de du00e9mo et statut infu00e9rieur, passer u00e0 'qualified'
    UPDATE leads SET status = 'qualified' WHERE id = NEW.lead_id;
    
  ELSIF NEW.event_type = 'TRIAL_STARTED' AND lead_current_status IN ('new', 'contacted', 'qualified') THEN
    -- Si essai du00e9marru00e9 et statut infu00e9rieur, passer u00e0 'negotiation'
    UPDATE leads SET status = 'negotiation' WHERE id = NEW.lead_id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_lead_status_from_conversion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_lead_status_from_event"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  lead_current_status TEXT;
BEGIN
  -- Si l'événement n'est pas associé à un lead, on ne fait rien
  IF NEW.lead_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Récupérer le statut actuel du lead
  SELECT status INTO lead_current_status FROM leads WHERE id = NEW.lead_id;
  
  -- Mises à jour conditionnelles du statut en fonction du type d'événement
  -- Ces règles peuvent être ajustées selon les besoins métier
  IF NEW.event_name = 'PURCHASE_MADE' AND lead_current_status != 'won' THEN
    UPDATE leads SET status = 'won', updated_at = NOW() WHERE id = NEW.lead_id;
  ELSIF NEW.event_name = 'DEMO_REQUEST' AND lead_current_status = 'new' THEN
    UPDATE leads SET status = 'qualified', updated_at = NOW() WHERE id = NEW.lead_id;
  ELSIF NEW.event_name = 'TRIAL_STARTED' AND (lead_current_status = 'new' OR lead_current_status = 'contacted' OR lead_current_status = 'qualified') THEN
    UPDATE leads SET status = 'negotiation', updated_at = NOW() WHERE id = NEW.lead_id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_lead_status_from_event"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
   NEW.updated_at = NOW(); 
   RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."bridge_associations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "email" "text" NOT NULL,
    "visitor_id" character varying(255) NOT NULL,
    "user_id" "uuid",
    "source_action" "text",
    "event_data" "jsonb" DEFAULT '{}'::"jsonb",
    "processed" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL
);


ALTER TABLE "public"."bridge_associations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."campaigns" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "status" character varying(50) DEFAULT 'active'::character varying NOT NULL,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversion_events" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "event_name" character varying(100) NOT NULL,
    "value" numeric(10,2) DEFAULT 0,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "event_type" "public"."conversion_event_type" DEFAULT 'CUSTOM'::"public"."conversion_event_type" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "event_data" "jsonb",
    "page_url" "text",
    "site_id" "text" DEFAULT 'default'::"text",
    "user_id" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "visitor_id" "uuid",
    "event_category" character varying(50),
    "source_system" character varying(50),
    CONSTRAINT "valid_event_type" CHECK (("event_type" = ANY (ARRAY['VISIT'::"public"."conversion_event_type", 'SIGNUP'::"public"."conversion_event_type", 'DEMO_REQUEST'::"public"."conversion_event_type", 'TRIAL_STARTED'::"public"."conversion_event_type", 'PURCHASE_MADE'::"public"."conversion_event_type", 'CONTACT_FORM'::"public"."conversion_event_type", 'DOWNLOAD'::"public"."conversion_event_type", 'EMAIL_CLICK'::"public"."conversion_event_type", 'CUSTOM'::"public"."conversion_event_type", 'FORM_SUBMIT'::"public"."conversion_event_type", 'BUTTON_CLICK'::"public"."conversion_event_type", 'PAGE_VIEW'::"public"."conversion_event_type", 'CONTENT_VIEW'::"public"."conversion_event_type", 'PAYMENT'::"public"."conversion_event_type", 'RDV'::"public"."conversion_event_type"])))
);


ALTER TABLE "public"."conversion_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."conversion_events" IS 'Événements de conversion du funnel marketing';



COMMENT ON COLUMN "public"."conversion_events"."event_name" IS 'Nom de l''événement, obligatoire (ex: rdv_scheduled, payment_received)';



COMMENT ON COLUMN "public"."conversion_events"."event_type" IS 'Type d''événement de conversion (enum conversion_event_type)';



COMMENT ON COLUMN "public"."conversion_events"."event_data" IS 'Données additionnelles spécifiques à l''événement (JSON)';



COMMENT ON COLUMN "public"."conversion_events"."user_id" IS 'Référence à l''utilisateur qui a créé l''événement, remplace created_by';



COMMENT ON COLUMN "public"."conversion_events"."updated_at" IS 'Date et heure de dernière modification, mise à jour automatiquement';



COMMENT ON COLUMN "public"."conversion_events"."visitor_id" IS 'Référence au visiteur associé à l''événement de conversion';



COMMENT ON COLUMN "public"."conversion_events"."event_category" IS 'Catégorie de l''événement (marketing, vente, support, etc.)';



COMMENT ON COLUMN "public"."conversion_events"."source_system" IS 'Système source de l''événement (site web, CRM, Calendly, etc.)';



CREATE TABLE IF NOT EXISTS "public"."external_mappings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "integration_id" "uuid" NOT NULL,
    "entity_type" "text" NOT NULL,
    "external_id" "text" NOT NULL,
    "internal_id" "uuid" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."external_mappings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."funnel_progress" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "visitor_id" "text",
    "current_stage" "text" NOT NULL,
    "rdv_scheduled_at" timestamp without time zone,
    "rdv_completed_at" timestamp without time zone,
    "payment_at" timestamp without time zone,
    "amount" numeric(10,2),
    "product_id" "text",
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "rdv_canceled_at" timestamp with time zone,
    CONSTRAINT "funnel_progress_stage_check" CHECK (("current_stage" = ANY (ARRAY['visit'::"text", 'lead_capture'::"text", 'rdv_scheduled'::"text", 'rdv_canceled'::"text", 'rdv_completed'::"text", 'proposal_sent'::"text", 'negotiation'::"text", 'won'::"text", 'lost'::"text", 'qualified'::"text", 'unqualified'::"text"])))
);


ALTER TABLE "public"."funnel_progress" OWNER TO "postgres";


COMMENT ON TABLE "public"."funnel_progress" IS 'Progression des visiteurs à travers le funnel';



COMMENT ON COLUMN "public"."funnel_progress"."current_stage" IS 'Étape actuelle du visiteur dans le funnel marketing';



COMMENT ON COLUMN "public"."funnel_progress"."rdv_scheduled_at" IS 'Date et heure de programmation du rendez-vous';



COMMENT ON COLUMN "public"."funnel_progress"."rdv_canceled_at" IS 'Date et heure d''annulation du rendez-vous';



COMMENT ON CONSTRAINT "funnel_progress_stage_check" ON "public"."funnel_progress" IS 'Vérifie que le funnel est valide';



CREATE TABLE IF NOT EXISTS "public"."funnel_steps" (
    "step_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" character varying(50) NOT NULL,
    "slug" character varying(50) NOT NULL,
    "label" character varying(100) NOT NULL,
    "description" "text",
    "color" character varying(20),
    "position" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."funnel_steps" OWNER TO "postgres";


COMMENT ON TABLE "public"."funnel_steps" IS 'Table qui stocke les étapes du funnel pour chaque utilisateur';



CREATE TABLE IF NOT EXISTS "public"."integration_configs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "integration_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "config_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."integration_configs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."integrations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" DEFAULT 'Default Integration Name'::"text",
    "type" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "config" "jsonb" DEFAULT '{}'::"jsonb",
    "integration_type" "text" DEFAULT 'unknown'::"text" NOT NULL,
    "user_id" character varying(255),
    "status" character varying(20) DEFAULT 'connected'::character varying NOT NULL
);


ALTER TABLE "public"."integrations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."integrations"."status" IS 'Connection status of the integration (e.g., connected, disconnected, error)';



CREATE TABLE IF NOT EXISTS "public"."lead_contacts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "contact_type" character varying(20) NOT NULL,
    "contact_value" "text" NOT NULL,
    "is_primary" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lead_contacts" OWNER TO "postgres";


COMMENT ON TABLE "public"."lead_contacts" IS 'Informations de contact normalisu00e9es pour les leads';



COMMENT ON COLUMN "public"."lead_contacts"."contact_type" IS 'Type de contact (email, phone, address, social, etc.)';



COMMENT ON COLUMN "public"."lead_contacts"."contact_value" IS 'Valeur du contact (adresse email, numu00e9ro de tu00e9lu00e9phone, etc.)';



COMMENT ON COLUMN "public"."lead_contacts"."is_primary" IS 'Indique si ce contact est le contact principal pour ce type';



CREATE TABLE IF NOT EXISTS "public"."lead_emails" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "is_verified" boolean DEFAULT false NOT NULL,
    "source_system" "text",
    "source_action" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."lead_emails" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lead_status_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "old_status" "text",
    "new_status" "text" NOT NULL,
    "user_id" "uuid",
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "previous_status" "text"
);


ALTER TABLE "public"."lead_status_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lead_visitor_ids" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "visitor_id" character varying(255) NOT NULL,
    "first_linked_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."lead_visitor_ids" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leads" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "link_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "campaign_id" "uuid",
    "email" character varying(255),
    "name" character varying(255),
    "company" character varying(255),
    "phone" character varying(50),
    "status" character varying(50) DEFAULT 'new'::character varying,
    "source_data" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "converted_at" timestamp with time zone,
    "value" numeric(10,2) DEFAULT 0,
    "notes" "text",
    "tags" "jsonb" DEFAULT '[]'::"jsonb",
    "external_ids" "jsonb" DEFAULT '{}'::"jsonb",
    "external_id" "text",
    "source_system" "text"
);


ALTER TABLE "public"."leads" OWNER TO "postgres";


COMMENT ON TABLE "public"."leads" IS 'Prospects qualifiés avec information de contact';



CREATE TABLE IF NOT EXISTS "public"."oauth_events" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "integration_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "status" "text" NOT NULL,
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."oauth_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."oauth_states" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "state" character varying(255) NOT NULL,
    "data" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "user_id" "uuid"
);


ALTER TABLE "public"."oauth_states" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plans" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "price_monthly" numeric(10,2) NOT NULL,
    "price_yearly" numeric(10,2) NOT NULL,
    "features" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "max_campaigns" integer DEFAULT 1 NOT NULL,
    "max_links" integer DEFAULT 100 NOT NULL,
    "max_leads" integer DEFAULT 1000 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reset_tokens" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '01:00:00'::interval) NOT NULL,
    "used" boolean DEFAULT false,
    "token_type" "text" NOT NULL
);


ALTER TABLE "public"."reset_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."touchpoints" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "visitor_id" character varying(255) NOT NULL,
    "tracking_link_id" "uuid",
    "event_type" character varying(255) NOT NULL,
    "event_data" "jsonb" DEFAULT '{}'::"jsonb",
    "page_url" "text",
    "user_agent" "text",
    "ip_address" "text",
    "referrer" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "master_lead_id" "uuid",
    "source" "text",
    "user_id" "uuid"
);


ALTER TABLE "public"."touchpoints" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tracking_links" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "video_id" "uuid",
    "campaign_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "destination_url" "text" NOT NULL,
    "utm_source" character varying(255) DEFAULT 'youtube'::character varying,
    "utm_medium" character varying(255) DEFAULT 'video'::character varying,
    "utm_campaign" character varying(255),
    "utm_content" character varying(255),
    "utm_term" character varying(255),
    "short_code" character varying(20) NOT NULL,
    "clicks" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "expired_at" timestamp with time zone,
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."tracking_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "email" character varying(255) NOT NULL,
    "full_name" character varying(255) NOT NULL,
    "company_name" character varying(255),
    "password_hash" character varying(255),
    "plan_id" "uuid",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "last_login" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL,
    "email_verified" boolean DEFAULT false NOT NULL,
    "auth_provider" character varying(50) DEFAULT 'email'::character varying,
    "provider_id" character varying(255),
    "avatar_url" character varying(255),
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "is_verified" boolean DEFAULT false,
    "verified_at" timestamp with time zone,
    "api_key" "uuid"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."videos" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "youtube_id" character varying(20) NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" "text",
    "thumbnail_url" character varying(255),
    "published_at" timestamp with time zone,
    "metrics" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."videos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."visitors" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "visitor_id" character varying(255) NOT NULL,
    "first_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_agent" "text",
    "ip_address" "text",
    "lead_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source_platform" "text",
    "content_id" "text"
);


ALTER TABLE "public"."visitors" OWNER TO "postgres";


COMMENT ON TABLE "public"."visitors" IS 'Visiteurs du site avec information de tracking';



COMMENT ON COLUMN "public"."visitors"."lead_id" IS 'Ru00e9fu00e9rence au lead associu00e9 u00e0 ce visiteur, permet de relier explicitement visitors et leads';



CREATE TABLE IF NOT EXISTS "public"."youtube_video_stats" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "video_id" "uuid" NOT NULL,
    "view_count" integer DEFAULT 0 NOT NULL,
    "like_count" integer DEFAULT 0 NOT NULL,
    "comment_count" integer DEFAULT 0 NOT NULL,
    "favorite_count" integer DEFAULT 0 NOT NULL,
    "engagement_rate" numeric(10,6),
    "fetched_at" timestamp with time zone DEFAULT "now"(),
    "normalized_engagement_rate" numeric(10,6),
    "engagement_level" "text",
    "watch_time_minutes" numeric(10,2),
    "average_view_duration" numeric(10,2),
    "analytics_period_start" "date",
    "analytics_period_end" "date",
    "subscribers_gained" integer DEFAULT 0,
    "shares" integer DEFAULT 0,
    "average_view_percentage" numeric DEFAULT 0,
    "card_click_rate" numeric DEFAULT 0,
    "card_clicks" integer DEFAULT 0,
    "card_impressions" integer DEFAULT 0,
    "retention_level" character varying,
    "card_ctr" numeric(10,6) DEFAULT 0,
    "analytics_data" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."youtube_video_stats" OWNER TO "postgres";


COMMENT ON COLUMN "public"."youtube_video_stats"."subscribers_gained" IS 'Nombre d''abonnés gagnés grâce à cette vidéo sur la période';



COMMENT ON COLUMN "public"."youtube_video_stats"."shares" IS 'Nombre de partages de la vidéo sur la période';



COMMENT ON COLUMN "public"."youtube_video_stats"."average_view_percentage" IS 'Pourcentage moyen de la vidéo visionnée (rétention)';



COMMENT ON COLUMN "public"."youtube_video_stats"."card_click_rate" IS 'Taux de clic sur les cartes/fiches YouTube';



COMMENT ON COLUMN "public"."youtube_video_stats"."card_clicks" IS 'Nombre de clics sur les cartes/fiches YouTube';



COMMENT ON COLUMN "public"."youtube_video_stats"."card_impressions" IS 'Nombre d''affichages des cartes/fiches YouTube';



COMMENT ON COLUMN "public"."youtube_video_stats"."retention_level" IS 'Niveau qualitatif de rétention: LOW, MEDIUM, HIGH';



CREATE TABLE IF NOT EXISTS "public"."youtube_videos" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "text" NOT NULL,
    "video_id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "published_at" timestamp with time zone NOT NULL,
    "thumbnail_url" "text",
    "channel_id" "text" NOT NULL,
    "channel_title" "text",
    "duration" "text",
    "tags" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."youtube_videos" OWNER TO "postgres";


ALTER TABLE ONLY "public"."bridge_associations"
    ADD CONSTRAINT "bridge_associations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."conversion_events"
    ADD CONSTRAINT "conversion_events_event_data_check" CHECK ((("event_data" IS NULL) OR ("jsonb_typeof"("event_data") = 'object'::"text"))) NOT VALID;



COMMENT ON CONSTRAINT "conversion_events_event_data_check" ON "public"."conversion_events" IS 'Garantit que event_data est un objet JSON valide';



ALTER TABLE ONLY "public"."conversion_events"
    ADD CONSTRAINT "conversion_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."external_mappings"
    ADD CONSTRAINT "external_mappings_integration_id_entity_type_external_id_key" UNIQUE ("integration_id", "entity_type", "external_id");



ALTER TABLE ONLY "public"."external_mappings"
    ADD CONSTRAINT "external_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."funnel_progress"
    ADD CONSTRAINT "funnel_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."funnel_steps"
    ADD CONSTRAINT "funnel_steps_pkey" PRIMARY KEY ("step_id");



ALTER TABLE ONLY "public"."integration_configs"
    ADD CONSTRAINT "integration_configs_integration_id_user_id_key" UNIQUE ("integration_id", "user_id");



ALTER TABLE ONLY "public"."integration_configs"
    ADD CONSTRAINT "integration_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."integrations"
    ADD CONSTRAINT "integrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."integrations"
    ADD CONSTRAINT "integrations_user_id_integration_type_unique" UNIQUE ("user_id", "integration_type");



ALTER TABLE ONLY "public"."lead_contacts"
    ADD CONSTRAINT "lead_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_emails"
    ADD CONSTRAINT "lead_emails_lead_id_email_key" UNIQUE ("lead_id", "email");



ALTER TABLE ONLY "public"."lead_emails"
    ADD CONSTRAINT "lead_emails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_status_history"
    ADD CONSTRAINT "lead_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_visitor_ids"
    ADD CONSTRAINT "lead_visitor_ids_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_visitor_ids"
    ADD CONSTRAINT "lead_visitor_ids_visitor_id_key" UNIQUE ("visitor_id");



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."oauth_events"
    ADD CONSTRAINT "oauth_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."oauth_states"
    ADD CONSTRAINT "oauth_states_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."oauth_states"
    ADD CONSTRAINT "oauth_states_state_key" UNIQUE ("state");



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reset_tokens"
    ADD CONSTRAINT "reset_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reset_tokens"
    ADD CONSTRAINT "reset_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."touchpoints"
    ADD CONSTRAINT "touchpoints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tracking_links"
    ADD CONSTRAINT "tracking_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tracking_links"
    ADD CONSTRAINT "tracking_links_short_code_key" UNIQUE ("short_code");



ALTER TABLE ONLY "public"."integrations"
    ADD CONSTRAINT "unique_name_integration" UNIQUE ("name", "integration_type");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_api_key_unique" UNIQUE ("api_key");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."visitors"
    ADD CONSTRAINT "visitors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."visitors"
    ADD CONSTRAINT "visitors_visitor_id_key" UNIQUE ("visitor_id");



ALTER TABLE ONLY "public"."youtube_video_stats"
    ADD CONSTRAINT "youtube_video_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."youtube_video_stats"
    ADD CONSTRAINT "youtube_video_stats_video_id_fetched_at_key" UNIQUE ("video_id", "fetched_at");



ALTER TABLE ONLY "public"."youtube_videos"
    ADD CONSTRAINT "youtube_videos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."youtube_videos"
    ADD CONSTRAINT "youtube_videos_user_id_video_id_key" UNIQUE ("user_id", "video_id");



CREATE INDEX "idx_bridge_associations_email" ON "public"."bridge_associations" USING "btree" ("email");



CREATE INDEX "idx_bridge_associations_processed" ON "public"."bridge_associations" USING "btree" ("processed");



CREATE INDEX "idx_bridge_associations_visitor_id" ON "public"."bridge_associations" USING "btree" ("visitor_id");



CREATE INDEX "idx_campaigns_user_id" ON "public"."campaigns" USING "btree" ("user_id");



CREATE INDEX "idx_conversion_events_analytics_combo" ON "public"."conversion_events" USING "btree" ("created_at", "event_category", "source_system");



CREATE INDEX "idx_conversion_events_category" ON "public"."conversion_events" USING "btree" ("event_category");



CREATE INDEX "idx_conversion_events_created_at" ON "public"."conversion_events" USING "btree" ("created_at");



CREATE INDEX "idx_conversion_events_event_name" ON "public"."conversion_events" USING "btree" ("event_name");



CREATE INDEX "idx_conversion_events_event_type" ON "public"."conversion_events" USING "btree" ("event_type");



CREATE INDEX "idx_conversion_events_lead_id" ON "public"."conversion_events" USING "btree" ("lead_id");



CREATE INDEX "idx_conversion_events_source" ON "public"."conversion_events" USING "btree" ("source_system");



CREATE INDEX "idx_conversion_events_type_created" ON "public"."conversion_events" USING "btree" ("event_type", "created_at");



CREATE INDEX "idx_conversion_events_user_id" ON "public"."conversion_events" USING "btree" ("user_id");



CREATE INDEX "idx_funnel_progress_created_at" ON "public"."funnel_progress" USING "btree" ("created_at");



CREATE INDEX "idx_funnel_progress_current_stage" ON "public"."funnel_progress" USING "btree" ("current_stage");



CREATE INDEX "idx_funnel_progress_rdv_scheduled_at" ON "public"."funnel_progress" USING "btree" ("rdv_scheduled_at");



CREATE INDEX "idx_funnel_progress_stage" ON "public"."funnel_progress" USING "btree" ("current_stage");



CREATE INDEX "idx_funnel_progress_user_id" ON "public"."funnel_progress" USING "btree" ("user_id");



CREATE INDEX "idx_funnel_progress_visitor_id" ON "public"."funnel_progress" USING "btree" ("visitor_id");



CREATE INDEX "idx_funnel_steps_user_id" ON "public"."funnel_steps" USING "btree" ("user_id");



CREATE INDEX "idx_funnel_steps_user_position" ON "public"."funnel_steps" USING "btree" ("user_id", "position");



CREATE INDEX "idx_lead_contacts_lead_id" ON "public"."lead_contacts" USING "btree" ("lead_id");



CREATE INDEX "idx_lead_emails_email" ON "public"."lead_emails" USING "btree" ("email");



CREATE INDEX "idx_lead_emails_lead_id" ON "public"."lead_emails" USING "btree" ("lead_id");



CREATE INDEX "idx_lead_status_history_changed_at" ON "public"."lead_status_history" USING "btree" ("changed_at");



CREATE INDEX "idx_lead_status_history_created_at" ON "public"."lead_status_history" USING "btree" ("created_at");



CREATE INDEX "idx_lead_status_history_lead_id" ON "public"."lead_status_history" USING "btree" ("lead_id");



CREATE INDEX "idx_lead_status_history_new_status" ON "public"."lead_status_history" USING "btree" ("new_status");



CREATE INDEX "idx_lead_status_history_user_id" ON "public"."lead_status_history" USING "btree" ("user_id");



CREATE INDEX "idx_lead_visitor_ids_lead_id" ON "public"."lead_visitor_ids" USING "btree" ("lead_id");



CREATE INDEX "idx_lead_visitor_ids_visitor_id" ON "public"."lead_visitor_ids" USING "btree" ("visitor_id");



CREATE INDEX "idx_leads_campaign_id" ON "public"."leads" USING "btree" ("campaign_id");



CREATE INDEX "idx_leads_converted_at" ON "public"."leads" USING "btree" ("converted_at");



CREATE INDEX "idx_leads_created_at" ON "public"."leads" USING "btree" ("created_at");



CREATE INDEX "idx_leads_email" ON "public"."leads" USING "btree" ("email");



CREATE INDEX "idx_leads_user_id" ON "public"."leads" USING "btree" ("user_id");



CREATE INDEX "idx_oauth_states_expires" ON "public"."oauth_states" USING "btree" ("expires_at");



CREATE INDEX "idx_oauth_states_expires_at" ON "public"."oauth_states" USING "btree" ("expires_at");



CREATE INDEX "idx_oauth_states_state" ON "public"."oauth_states" USING "btree" ("state");



CREATE INDEX "idx_oauth_states_user_id" ON "public"."oauth_states" USING "btree" ("user_id");



CREATE INDEX "idx_touchpoints_created_at" ON "public"."touchpoints" USING "btree" ("created_at");



CREATE INDEX "idx_touchpoints_event_type" ON "public"."touchpoints" USING "btree" ("event_type");



CREATE INDEX "idx_touchpoints_master_lead_id" ON "public"."touchpoints" USING "btree" ("master_lead_id");



CREATE INDEX "idx_touchpoints_user_id" ON "public"."touchpoints" USING "btree" ("user_id");



CREATE INDEX "idx_touchpoints_visitor_id" ON "public"."touchpoints" USING "btree" ("visitor_id");



CREATE INDEX "idx_tracking_links_campaign_id" ON "public"."tracking_links" USING "btree" ("campaign_id");



CREATE INDEX "idx_tracking_links_short_code" ON "public"."tracking_links" USING "btree" ("short_code");



CREATE INDEX "idx_tracking_links_user_id" ON "public"."tracking_links" USING "btree" ("user_id");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_videos_campaign_id" ON "public"."videos" USING "btree" ("campaign_id");



CREATE INDEX "idx_visitors_lead_id" ON "public"."visitors" USING "btree" ("lead_id");



CREATE INDEX "idx_visitors_visitor_id" ON "public"."visitors" USING "btree" ("visitor_id");



CREATE INDEX "idx_youtube_video_stats_analytics_period" ON "public"."youtube_video_stats" USING "btree" ("analytics_period_start", "analytics_period_end");



CREATE INDEX "idx_youtube_video_stats_engagement_level" ON "public"."youtube_video_stats" USING "btree" ("engagement_level");



CREATE INDEX "idx_youtube_video_stats_fetched_at" ON "public"."youtube_video_stats" USING "btree" ("fetched_at");



CREATE INDEX "idx_youtube_video_stats_video_id" ON "public"."youtube_video_stats" USING "btree" ("video_id");



CREATE INDEX "idx_youtube_videos_published_at" ON "public"."youtube_videos" USING "btree" ("published_at");



CREATE INDEX "idx_youtube_videos_user_id" ON "public"."youtube_videos" USING "btree" ("user_id");



CREATE INDEX "idx_youtube_videos_video_id" ON "public"."youtube_videos" USING "btree" ("video_id");



CREATE INDEX "reset_tokens_token_idx" ON "public"."reset_tokens" USING "btree" ("token");



CREATE INDEX "reset_tokens_user_id_idx" ON "public"."reset_tokens" USING "btree" ("user_id");



CREATE UNIQUE INDEX "unique_primary_contact_per_type_and_lead" ON "public"."lead_contacts" USING "btree" ("lead_id", "contact_type") WHERE ("is_primary" = true);



COMMENT ON INDEX "public"."unique_primary_contact_per_type_and_lead" IS 'Assure que seul un contact est marqué comme primaire par type et par lead';



CREATE OR REPLACE TRIGGER "conversion_updates_lead_status" AFTER INSERT ON "public"."conversion_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_lead_status_from_conversion"();



CREATE OR REPLACE TRIGGER "lead_status_change" AFTER INSERT OR UPDATE ON "public"."leads" FOR EACH ROW EXECUTE FUNCTION "public"."record_lead_status_change"();



CREATE OR REPLACE TRIGGER "lead_status_change_trigger" AFTER UPDATE OF "status" ON "public"."leads" FOR EACH ROW EXECUTE FUNCTION "public"."log_lead_status_change"();



CREATE OR REPLACE TRIGGER "set_timestamp_campaigns" BEFORE UPDATE ON "public"."campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_timestamp_conversion_events" BEFORE UPDATE ON "public"."conversion_events" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_timestamp_funnel_progress" BEFORE UPDATE ON "public"."funnel_progress" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_timestamp_lead_contacts" BEFORE UPDATE ON "public"."lead_contacts" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_timestamp_leads" BEFORE UPDATE ON "public"."leads" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_timestamp_touchpoints" BEFORE UPDATE ON "public"."touchpoints" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_timestamp_tracking_links" BEFORE UPDATE ON "public"."tracking_links" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_timestamp_users" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_timestamp_visitors" BEFORE UPDATE ON "public"."visitors" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "trigger_clean_old_tokens" AFTER INSERT ON "public"."reset_tokens" FOR EACH STATEMENT EXECUTE FUNCTION "public"."clean_old_tokens"();



CREATE OR REPLACE TRIGGER "update_campaigns_timestamp" BEFORE UPDATE ON "public"."campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp"();



CREATE OR REPLACE TRIGGER "update_lead_status_trigger" AFTER INSERT ON "public"."conversion_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_lead_status_from_event"();



CREATE OR REPLACE TRIGGER "update_plans_timestamp" BEFORE UPDATE ON "public"."plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp"();



CREATE OR REPLACE TRIGGER "update_videos_timestamp" BEFORE UPDATE ON "public"."videos" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp"();



CREATE OR REPLACE TRIGGER "update_youtube_videos_updated_at" BEFORE UPDATE ON "public"."youtube_videos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."bridge_associations"
    ADD CONSTRAINT "bridge_associations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversion_events"
    ADD CONSTRAINT "conversion_events_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversion_events"
    ADD CONSTRAINT "conversion_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."conversion_events"
    ADD CONSTRAINT "conversion_events_visitor_id_fkey" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitors"("id");



ALTER TABLE ONLY "public"."external_mappings"
    ADD CONSTRAINT "external_mappings_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_status_history"
    ADD CONSTRAINT "fk_leads" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."touchpoints"
    ADD CONSTRAINT "fk_visitor" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitors"("visitor_id");



ALTER TABLE ONLY "public"."funnel_progress"
    ADD CONSTRAINT "fk_visitor_id" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitors"("visitor_id");



ALTER TABLE ONLY "public"."funnel_progress"
    ADD CONSTRAINT "funnel_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."integration_configs"
    ADD CONSTRAINT "integration_configs_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."integration_configs"
    ADD CONSTRAINT "integration_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_contacts"
    ADD CONSTRAINT "lead_contacts_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_emails"
    ADD CONSTRAINT "lead_emails_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_status_history"
    ADD CONSTRAINT "lead_status_history_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_status_history"
    ADD CONSTRAINT "lead_status_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."lead_visitor_ids"
    ADD CONSTRAINT "lead_visitor_ids_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_visitor_ids"
    ADD CONSTRAINT "lead_visitor_ids_visitor_id_fkey" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitors"("visitor_id");



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "public"."tracking_links"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."oauth_events"
    ADD CONSTRAINT "oauth_events_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id");



ALTER TABLE ONLY "public"."oauth_events"
    ADD CONSTRAINT "oauth_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."reset_tokens"
    ADD CONSTRAINT "reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."touchpoints"
    ADD CONSTRAINT "touchpoints_master_lead_id_fkey" FOREIGN KEY ("master_lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."touchpoints"
    ADD CONSTRAINT "touchpoints_tracking_link_id_fkey" FOREIGN KEY ("tracking_link_id") REFERENCES "public"."tracking_links"("id");



ALTER TABLE ONLY "public"."touchpoints"
    ADD CONSTRAINT "touchpoints_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."tracking_links"
    ADD CONSTRAINT "tracking_links_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tracking_links"
    ADD CONSTRAINT "tracking_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tracking_links"
    ADD CONSTRAINT "tracking_links_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id");



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."visitors"
    ADD CONSTRAINT "visitors_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id");



ALTER TABLE ONLY "public"."youtube_video_stats"
    ADD CONSTRAINT "youtube_video_stats_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."youtube_videos"("id") ON DELETE CASCADE;



CREATE POLICY "Allow service role to insert users" ON "public"."users" FOR INSERT TO "authenticated", "service_role" WITH CHECK (true);



CREATE POLICY "Users can CRUD conversion events for their leads" ON "public"."conversion_events" USING (("auth"."uid"() IN ( SELECT "leads"."user_id"
   FROM "public"."leads"
  WHERE ("leads"."id" = "conversion_events"."lead_id"))));



CREATE POLICY "Users can CRUD their own campaigns" ON "public"."campaigns" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can CRUD their own leads" ON "public"."leads" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can CRUD their own tracking links" ON "public"."tracking_links" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can CRUD their own videos" ON "public"."videos" USING (("auth"."uid"() IN ( SELECT "campaigns"."user_id"
   FROM "public"."campaigns"
  WHERE ("campaigns"."id" = "videos"."campaign_id"))));



CREATE POLICY "Users can read own data" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own data" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."campaigns" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "campaigns_policy" ON "public"."campaigns" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."conversion_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "conversion_events_policy" ON "public"."conversion_events" USING ((EXISTS ( SELECT 1
   FROM "public"."leads"
  WHERE (("leads"."id" = "conversion_events"."lead_id") AND ("leads"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."funnel_progress" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "funnel_progress_policy" ON "public"."funnel_progress" USING (true);



ALTER TABLE "public"."lead_status_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lead_status_history_policy" ON "public"."lead_status_history" USING ((EXISTS ( SELECT 1
   FROM "public"."leads"
  WHERE (("leads"."id" = "lead_status_history"."lead_id") AND ("leads"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."leads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "leads_policy" ON "public"."leads" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."touchpoints" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "touchpoints_policy" ON "public"."touchpoints" USING (true);



ALTER TABLE "public"."tracking_links" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tracking_links_policy" ON "public"."tracking_links" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "user_policy" ON "public"."users" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."videos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."visitors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "visitors_policy" ON "public"."visitors" USING (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."calculate_overall_funnel_kpis_by_video"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_overall_funnel_kpis_by_video"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_overall_funnel_kpis_by_video"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_video_funnel_kpis"("target_video_youtube_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_video_funnel_kpis"("target_video_youtube_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_video_funnel_kpis"("target_video_youtube_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."clean_old_tokens"() TO "anon";
GRANT ALL ON FUNCTION "public"."clean_old_tokens"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."clean_old_tokens"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_average_conversion_time"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_average_conversion_time"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_average_conversion_time"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_events_by_category"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid", "limit_val" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_events_by_category"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid", "limit_val" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_events_by_category"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid", "limit_val" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_events_by_source"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid", "limit_val" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_events_by_source"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid", "limit_val" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_events_by_source"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid", "limit_val" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_events_timeline"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid", "event_category" "text", "source_system" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_events_timeline"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid", "event_category" "text", "source_system" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_events_timeline"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid", "event_category" "text", "source_system" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_funnel_overall_conversion"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_funnel_overall_conversion"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_funnel_overall_conversion"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_funnel_stages_analysis"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_funnel_stages_analysis"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_funnel_stages_analysis"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_leads_by_source"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid", "limit_val" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_leads_by_source"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid", "limit_val" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_leads_by_source"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid", "limit_val" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_leads_conversion_rate"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_leads_conversion_rate"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_leads_conversion_rate"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_leads_timeline"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_leads_timeline"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_leads_timeline"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_tables"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_tables"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tables"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_total_events"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid", "event_category" "text", "source_system" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_total_events"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid", "event_category" "text", "source_system" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_total_events"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid", "event_category" "text", "source_system" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_total_leads"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_total_leads"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_total_leads"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "site_id" "uuid", "user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_lead_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_lead_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_lead_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."merge_leads"("source_lead_id" "uuid", "target_lead_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."merge_leads"("source_lead_id" "uuid", "target_lead_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."merge_leads"("source_lead_id" "uuid", "target_lead_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_lead_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."record_lead_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_lead_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."run_sql"("query" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."run_sql"("query" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."run_sql"("query" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."run_sql_select"("query" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."run_sql_select"("query" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."run_sql_select"("query" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_lead_status_from_conversion"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_lead_status_from_conversion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_lead_status_from_conversion"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_lead_status_from_event"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_lead_status_from_event"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_lead_status_from_event"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."bridge_associations" TO "anon";
GRANT ALL ON TABLE "public"."bridge_associations" TO "authenticated";
GRANT ALL ON TABLE "public"."bridge_associations" TO "service_role";



GRANT ALL ON TABLE "public"."campaigns" TO "anon";
GRANT ALL ON TABLE "public"."campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."conversion_events" TO "anon";
GRANT ALL ON TABLE "public"."conversion_events" TO "authenticated";
GRANT ALL ON TABLE "public"."conversion_events" TO "service_role";



GRANT ALL ON TABLE "public"."external_mappings" TO "anon";
GRANT ALL ON TABLE "public"."external_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."external_mappings" TO "service_role";



GRANT ALL ON TABLE "public"."funnel_progress" TO "anon";
GRANT ALL ON TABLE "public"."funnel_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."funnel_progress" TO "service_role";



GRANT ALL ON TABLE "public"."funnel_steps" TO "anon";
GRANT ALL ON TABLE "public"."funnel_steps" TO "authenticated";
GRANT ALL ON TABLE "public"."funnel_steps" TO "service_role";



GRANT ALL ON TABLE "public"."integration_configs" TO "anon";
GRANT ALL ON TABLE "public"."integration_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."integration_configs" TO "service_role";



GRANT ALL ON TABLE "public"."integrations" TO "anon";
GRANT ALL ON TABLE "public"."integrations" TO "authenticated";
GRANT ALL ON TABLE "public"."integrations" TO "service_role";



GRANT ALL ON TABLE "public"."lead_contacts" TO "anon";
GRANT ALL ON TABLE "public"."lead_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_contacts" TO "service_role";



GRANT ALL ON TABLE "public"."lead_emails" TO "anon";
GRANT ALL ON TABLE "public"."lead_emails" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_emails" TO "service_role";



GRANT ALL ON TABLE "public"."lead_status_history" TO "anon";
GRANT ALL ON TABLE "public"."lead_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_status_history" TO "service_role";



GRANT ALL ON TABLE "public"."lead_visitor_ids" TO "anon";
GRANT ALL ON TABLE "public"."lead_visitor_ids" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_visitor_ids" TO "service_role";



GRANT ALL ON TABLE "public"."leads" TO "anon";
GRANT ALL ON TABLE "public"."leads" TO "authenticated";
GRANT ALL ON TABLE "public"."leads" TO "service_role";



GRANT ALL ON TABLE "public"."oauth_events" TO "anon";
GRANT ALL ON TABLE "public"."oauth_events" TO "authenticated";
GRANT ALL ON TABLE "public"."oauth_events" TO "service_role";



GRANT ALL ON TABLE "public"."oauth_states" TO "anon";
GRANT ALL ON TABLE "public"."oauth_states" TO "authenticated";
GRANT ALL ON TABLE "public"."oauth_states" TO "service_role";



GRANT ALL ON TABLE "public"."plans" TO "anon";
GRANT ALL ON TABLE "public"."plans" TO "authenticated";
GRANT ALL ON TABLE "public"."plans" TO "service_role";



GRANT ALL ON TABLE "public"."reset_tokens" TO "anon";
GRANT ALL ON TABLE "public"."reset_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."reset_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."touchpoints" TO "anon";
GRANT ALL ON TABLE "public"."touchpoints" TO "authenticated";
GRANT ALL ON TABLE "public"."touchpoints" TO "service_role";



GRANT ALL ON TABLE "public"."tracking_links" TO "anon";
GRANT ALL ON TABLE "public"."tracking_links" TO "authenticated";
GRANT ALL ON TABLE "public"."tracking_links" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."videos" TO "anon";
GRANT ALL ON TABLE "public"."videos" TO "authenticated";
GRANT ALL ON TABLE "public"."videos" TO "service_role";



GRANT ALL ON TABLE "public"."visitors" TO "anon";
GRANT ALL ON TABLE "public"."visitors" TO "authenticated";
GRANT ALL ON TABLE "public"."visitors" TO "service_role";



GRANT ALL ON TABLE "public"."youtube_video_stats" TO "anon";
GRANT ALL ON TABLE "public"."youtube_video_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."youtube_video_stats" TO "service_role";



GRANT ALL ON TABLE "public"."youtube_videos" TO "anon";
GRANT ALL ON TABLE "public"."youtube_videos" TO "authenticated";
GRANT ALL ON TABLE "public"."youtube_videos" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
