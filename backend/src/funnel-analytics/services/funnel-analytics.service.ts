import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { VideoFunnelKPI } from '../interfaces/youtube-funnel.interface';

/**
 * Service responsable de l'analyse des conversions du funnel par source YouTube
 */
@Injectable()
export class FunnelAnalyticsService {
  private readonly logger = new Logger(FunnelAnalyticsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Ru00e9cupu00e8re les KPIs du funnel pour toutes les vidu00e9os YouTube
   * @returns Liste des KPIs par vidu00e9o
   */
  async getOverallYoutubeFunnelKpis(): Promise<VideoFunnelKPI[]> {
    try {
      this.logger.log('Ru00e9cupu00e9ration des KPIs du funnel pour toutes les vidu00e9os YouTube');
      
      const { data, error } = await this.supabaseService.getAdminClient()
        .rpc('calculate_overall_funnel_kpis_by_video');

      if (error) {
        this.logger.error(`Erreur lors de la ru00e9cupu00e9ration des KPIs du funnel: ${error.message}`);
        throw error;
      }

      // Si aucune donnu00e9e n'est disponible, retourner un tableau vide
      if (!data || data.length === 0) {
        this.logger.warn('Aucun ru00e9sultat de funnel YouTube trouvé');
        return [];
      }

      this.logger.debug(`${data.length} vidu00e9os avec KPIs de funnel ru00e9cupu00e9ru00e9es`);
      
      // Conversion des types pour s'assurer que les nombres sont correctement interprétés
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
      this.logger.error(`Erreur lors de la ru00e9cupu00e9ration des KPIs du funnel: ${error.message}`, error.stack);
      throw new Error(`Erreur lors de la ru00e9cupu00e9ration des KPIs du funnel: ${error.message}`);
    }
  }

  /**
   * Ru00e9cupu00e8re les KPIs du funnel pour une vidu00e9o YouTube spu00e9cifique
   * @param youtubeVideoId ID YouTube de la vidu00e9o
   * @returns KPIs du funnel pour la vidu00e9o
   */
  async getVideoFunnelKpis(youtubeVideoId: string): Promise<VideoFunnelKPI> {
    try {
      this.logger.log(`Ru00e9cupu00e9ration des KPIs du funnel pour la vidu00e9o YouTube ${youtubeVideoId}`);
      
      const { data, error } = await this.supabaseService.getAdminClient()
        .rpc('calculate_video_funnel_kpis', { target_video_youtube_id: youtubeVideoId });

      if (error) {
        this.logger.error(`Erreur lors de la ru00e9cupu00e9ration des KPIs pour la vidu00e9o ${youtubeVideoId}: ${error.message}`);
        throw error;
      }

      // Si aucune donnu00e9e n'est disponible, retourner des valeurs par du00e9faut
      if (!data || data.length === 0) {
        this.logger.warn(`Aucun ru00e9sultat de funnel trouvé pour la vidu00e9o ${youtubeVideoId}`);
        return {
          video_id: youtubeVideoId,
          video_title: 'Vidu00e9o inconnue',
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

      // Conversion des types pour les donnu00e9es retournu00e9es
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
      this.logger.error(`Erreur lors de la ru00e9cupu00e9ration des KPIs pour la vidu00e9o ${youtubeVideoId}: ${error.message}`, error.stack);
      throw new Error(`Erreur lors de la ru00e9cupu00e9ration des KPIs pour la vidu00e9o ${youtubeVideoId}: ${error.message}`);
    }
  }
}
