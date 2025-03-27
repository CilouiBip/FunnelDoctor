-- Migration pour la cru00e9ation des fonctions d'analytique du funnel de conversion
-- Date: 2025-03-27

-- Fonction 1: Calcul des KPIs du funnel pour une vidu00e9o YouTube spu00e9cifique
CREATE OR REPLACE FUNCTION calculate_video_funnel_kpis(target_video_youtube_id TEXT)
RETURNS TABLE (
  video_id TEXT,
  video_title TEXT,
  total_visitors BIGINT,
  total_leads BIGINT,
  total_demos BIGINT,
  total_sales BIGINT,
  total_revenue DECIMAL(15, 2),
  visitor_to_lead_rate DECIMAL(10, 2),
  lead_to_demo_rate DECIMAL(10, 2),
  demo_to_sale_rate DECIMAL(10, 2),
  visitor_to_sale_rate DECIMAL(10, 2)
)
LANGUAGE plpgsql
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

-- Fonction 2: Calcul des KPIs du funnel pour toutes les vidu00e9os YouTube
CREATE OR REPLACE FUNCTION calculate_overall_funnel_kpis_by_video()
RETURNS TABLE (
  video_db_id UUID,
  video_id TEXT,
  video_title TEXT,
  total_visitors BIGINT,
  total_leads BIGINT,
  total_demos BIGINT,
  total_sales BIGINT,
  total_revenue DECIMAL(15, 2),
  visitor_to_lead_rate DECIMAL(10, 2),
  lead_to_demo_rate DECIMAL(10, 2),
  demo_to_sale_rate DECIMAL(10, 2),
  visitor_to_sale_rate DECIMAL(10, 2)
)
LANGUAGE plpgsql
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
