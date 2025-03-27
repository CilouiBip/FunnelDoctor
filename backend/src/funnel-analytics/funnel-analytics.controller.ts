import { Controller, Get, Param, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FunnelAnalyticsService } from './services/funnel-analytics.service';
import { VideoFunnelKPI, YouTubeFunnelResponse } from './interfaces/youtube-funnel.interface';

/**
 * Contrôleur pour les analyses de funnel de conversion
 */
@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class FunnelAnalyticsController {
  private readonly logger = new Logger(FunnelAnalyticsController.name);

  constructor(private readonly funnelAnalyticsService: FunnelAnalyticsService) {}

  /**
   * Endpoint pour obtenir les KPIs du funnel pour toutes les vidéos YouTube
   * @returns Liste des KPIs par vidéo
   */
  @Get('youtube-funnel')
  async getOverallYoutubeFunnelKpis(): Promise<YouTubeFunnelResponse> {
    try {
      this.logger.log('[API] Récupération des KPIs du funnel pour toutes les vidéos YouTube');
      const kpis = await this.funnelAnalyticsService.getOverallYoutubeFunnelKpis();
      return { success: true, data: kpis };
    } catch (error) {
      this.logger.error(`[API] Erreur lors de la récupération des KPIs du funnel YouTube: ${error.message}`);
      return { success: false, data: [], error: error.message };
    }
  }

  /**
   * Endpoint pour obtenir les KPIs du funnel pour une vidéo YouTube spécifique
   * @param videoId ID YouTube de la vidéo
   * @returns KPIs du funnel pour la vidéo
   */
  @Get('youtube-funnel/:videoId')
  async getVideoFunnelKpis(
    @Param('videoId') videoId: string
  ): Promise<YouTubeFunnelResponse> {
    try {
      this.logger.log(`[API] Récupération des KPIs du funnel pour la vidéo YouTube ${videoId}`);
      const kpis = await this.funnelAnalyticsService.getVideoFunnelKpis(videoId);
      return { success: true, data: kpis };
    } catch (error) {
      this.logger.error(`[API] Erreur lors de la récupération des KPIs du funnel pour la vidéo ${videoId}: ${error.message}`);
      return { 
        success: false, 
        data: {
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
        },
        error: error.message 
      };
    }
  }
}
