import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import {
  FunnelAnalyticsResult,
  FunnelAnalyticsResponse
} from '../interfaces/analytics-result.interface';

/**
 * Service responsable de l'analyse du funnel de conversion
 */
@Injectable()
export class FunnelAnalyticsService {
  private readonly logger = new Logger(FunnelAnalyticsService.name);

  constructor(private supabaseService: SupabaseService) {}

  /**
   * Obtient les statistiques des étapes du funnel
   * @param params Paramètres de filtrage
   * @returns Analyse complète du funnel
   */
  async getFunnelAnalytics(params: AnalyticsQueryDto): Promise<FunnelAnalyticsResponse> {
    this.logger.log(`Récupération des analytics du funnel entre ${params.startDate} et ${params.endDate}`);
    
    try {
      // Récupération des étapes du funnel
      const { data: stages, error: stagesError } = await this.supabaseService.getClient().rpc(
        'get_funnel_stages_analysis',
        {
          start_date: params.startDate,
          end_date: params.endDate,
          site_id: params.siteId || null,
          user_id: params.userId || null
        }
      );
      
      if (stagesError) {
        this.logger.error(`Erreur lors de l'analyse du funnel: ${stagesError.message}`);
        throw new Error(`Analytics query failed: ${stagesError.message}`);
      }
      
      // Récupération du taux de conversion global
      const { data: overallData, error: overallError } = await this.supabaseService.getClient().rpc(
        'get_funnel_overall_conversion',
        {
          start_date: params.startDate,
          end_date: params.endDate,
          site_id: params.siteId || null,
          user_id: params.userId || null
        }
      );
      
      if (overallError) {
        this.logger.error(`Erreur lors du calcul de conversion globale: ${overallError.message}`);
        throw new Error(`Analytics query failed: ${overallError.message}`);
      }
      
      // Récupération du temps moyen de conversion
      const { data: timeData, error: timeError } = await this.supabaseService.getClient().rpc(
        'get_average_conversion_time',
        {
          start_date: params.startDate,
          end_date: params.endDate,
          site_id: params.siteId || null,
          user_id: params.userId || null
        }
      );
      
      if (timeError) {
        this.logger.error(`Erreur lors du calcul du temps de conversion: ${timeError.message}`);
        throw new Error(`Analytics query failed: ${timeError.message}`);
      }
      
      this.logger.debug(`Analyse du funnel récupérée: ${stages?.length || 0} étapes, conversion globale: ${overallData || 0}%`);
      
      return {
        stages: stages || [],
        overallConversionRate: overallData || 0,
        averageTimeToConversion: timeData || 0
      };
    } catch (error) {
      this.logger.error(`Exception lors de l'analyse du funnel: ${error.message}`);
      throw error;
    }
  }
}
