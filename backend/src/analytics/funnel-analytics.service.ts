import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

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

@Injectable()
export class FunnelAnalyticsService {
  private readonly logger = new Logger(FunnelAnalyticsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Récupère les KPIs du funnel pour toutes les vidéos YouTube
   * @returns Liste des KPIs par vidéo
   */
  async getOverallFunnelKPIsByVideo(): Promise<VideoFunnelKPI[]> {
    try {
      this.logger.debug('Récupération des KPIs du funnel pour toutes les vidéos');
      
      const { data, error } = await this.supabaseService.getAdminClient()
        .rpc('calculate_overall_funnel_kpis_by_video');

      if (error) {
        this.logger.error(`Erreur lors de la récupération des KPIs du funnel: ${error.message}`);
        throw error;
      }

      return data.map(item => ({
        video_id: item.video_id,
        video_title: item.video_title,
        total_visitors: parseInt(item.total_visitors) || 0,
        total_leads: parseInt(item.total_leads) || 0,
        total_demos: parseInt(item.total_demos) || 0,
        total_sales: parseInt(item.total_sales) || 0,
        total_revenue: parseFloat(item.total_revenue) || 0,
        visitor_to_lead_rate: parseFloat(item.visitor_to_lead_rate) || 0,
        lead_to_demo_rate: parseFloat(item.lead_to_demo_rate) || 0,
        demo_to_sale_rate: parseFloat(item.demo_to_sale_rate) || 0,
        visitor_to_sale_rate: parseFloat(item.visitor_to_sale_rate) || 0
      }));
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des KPIs du funnel: ${error.message}`, error.stack);
      throw new Error(`Erreur lors de la récupération des KPIs du funnel: ${error.message}`);
    }
  }

  /**
   * Récupère les KPIs du funnel pour une vidéo YouTube spécifique
   * @param videoId ID YouTube de la vidéo
   * @returns KPIs du funnel pour la vidéo
   */
  async getVideoFunnelKPIs(videoId: string): Promise<VideoFunnelKPI> {
    try {
      this.logger.debug(`Récupération des KPIs du funnel pour la vidéo ${videoId}`);
      
      const { data, error } = await this.supabaseService.getAdminClient()
        .rpc('calculate_video_funnel_kpis', { target_video_youtube_id: videoId });

      if (error) {
        this.logger.error(`Erreur lors de la récupération des KPIs du funnel pour la vidéo ${videoId}: ${error.message}`);
        throw error;
      }

      if (!data || data.length === 0) {
        return {
          video_id: videoId,
          video_title: 'Vidéo inconnue',
          total_visitors: 0,
          total_leads: 0,
          total_demos: 0,
          total_sales: 0,
          total_revenue: 0,
          visitor_to_lead_rate: 0,
          lead_to_demo_rate: 0,
          demo_to_sale_rate: 0,
          visitor_to_sale_rate: 0
        };
      }

      const item = data[0];
      return {
        video_id: item.video_id,
        video_title: item.video_title,
        total_visitors: parseInt(item.total_visitors) || 0,
        total_leads: parseInt(item.total_leads) || 0,
        total_demos: parseInt(item.total_demos) || 0,
        total_sales: parseInt(item.total_sales) || 0,
        total_revenue: parseFloat(item.total_revenue) || 0,
        visitor_to_lead_rate: parseFloat(item.visitor_to_lead_rate) || 0,
        lead_to_demo_rate: parseFloat(item.lead_to_demo_rate) || 0,
        demo_to_sale_rate: parseFloat(item.demo_to_sale_rate) || 0,
        visitor_to_sale_rate: parseFloat(item.visitor_to_sale_rate) || 0
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des KPIs du funnel pour la vidéo ${videoId}: ${error.message}`, error.stack);
      throw new Error(`Erreur lors de la récupération des KPIs du funnel pour la vidéo ${videoId}: ${error.message}`);
    }
  }
}
