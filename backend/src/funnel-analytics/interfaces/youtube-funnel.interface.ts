/**
 * Interface pour les KPIs du funnel YouTube par vidu00e9o
 */
export interface VideoFunnelKPI {
  video_id: string;
  video_title: string;
  total_visitors: number;
  total_leads: number;
  total_demos: number;
  total_sales: number;
  total_revenue: number;
  visitor_to_lead_rate: number;
  lead_to_demo_rate: number;
  demo_to_sale_rate: number;
  visitor_to_sale_rate: number;
}

/**
 * Interface pour la ru00e9ponse des KPIs du funnel YouTube
 */
export interface YouTubeFunnelResponse {
  success: boolean;
  data: VideoFunnelKPI[] | VideoFunnelKPI;
  error?: string;
}
