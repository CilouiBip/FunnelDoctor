import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import {
  SourceAnalyticsResult,
  TimelineAnalyticsResult,
  LeadsAnalyticsResponse
} from '../interfaces/analytics-result.interface';

/**
 * Service responsable de l'analyse des leads
 */
@Injectable()
export class LeadsAnalyticsService {
  private readonly logger = new Logger(LeadsAnalyticsService.name);

  constructor(private supabaseService: SupabaseService) {}

  /**
   * Obtient les statistiques complu00e8tes sur les leads
   * @param params Paramu00e8tres de filtrage
   * @returns Analyse complu00e8te des leads
   */
  async getLeadsAnalytics(params: AnalyticsQueryDto): Promise<LeadsAnalyticsResponse> {
    this.logger.log(`Ru00e9cupu00e9ration des analytics des leads entre ${params.startDate} et ${params.endDate}`);
    
    try {
      // Exu00e9cution en parallu00e8le des requu00eates d'analytics
      const [totalLeads, conversionRate, bySource, timeline] = await Promise.all([
        this.getTotalLeads(params),
        this.getLeadsConversionRate(params),
        this.getLeadsBySource(params),
        this.getLeadsTimeline(params)
      ]);
      
      return {
        totalLeads,
        conversionRate,
        bySource,
        timeline
      };
    } catch (error) {
      this.logger.error(`Exception lors de l'analyse des leads: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtient le nombre total de leads
   * @param params Paramu00e8tres de filtrage
   * @returns Nombre total de leads
   */
  private async getTotalLeads(params: AnalyticsQueryDto): Promise<number> {
    try {
      const { data, error } = await this.supabaseService.getClient().rpc(
        'get_total_leads',
        {
          start_date: params.startDate,
          end_date: params.endDate,
          site_id: params.siteId || null,
          user_id: params.userId || null
        }
      );
      
      if (error) {
        this.logger.error(`Erreur lors du comptage des leads: ${error.message}`);
        throw new Error(`Analytics query failed: ${error.message}`);
      }
      
      return data || 0;
    } catch (error) {
      this.logger.error(`Exception lors du comptage des leads: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtient le taux de conversion des leads
   * @param params Paramu00e8tres de filtrage
   * @returns Taux de conversion des leads
   */
  private async getLeadsConversionRate(params: AnalyticsQueryDto): Promise<number> {
    try {
      const { data, error } = await this.supabaseService.getClient().rpc(
        'get_leads_conversion_rate',
        {
          start_date: params.startDate,
          end_date: params.endDate,
          site_id: params.siteId || null,
          user_id: params.userId || null
        }
      );
      
      if (error) {
        this.logger.error(`Erreur lors du calcul du taux de conversion: ${error.message}`);
        throw new Error(`Analytics query failed: ${error.message}`);
      }
      
      return data || 0;
    } catch (error) {
      this.logger.error(`Exception lors du calcul du taux de conversion: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtient les leads par source
   * @param params Paramu00e8tres de filtrage
   * @returns Ru00e9partition des leads par source
   */
  private async getLeadsBySource(params: AnalyticsQueryDto): Promise<SourceAnalyticsResult[]> {
    try {
      const { data, error } = await this.supabaseService.getClient().rpc(
        'get_leads_by_source',
        {
          start_date: params.startDate,
          end_date: params.endDate,
          site_id: params.siteId || null,
          user_id: params.userId || null,
          limit_val: params.limit || 10
        }
      );
      
      if (error) {
        this.logger.error(`Erreur lors de la ru00e9cupu00e9ration des leads par source: ${error.message}`);
        throw new Error(`Analytics query failed: ${error.message}`);
      }
      
      return data || [];
    } catch (error) {
      this.logger.error(`Exception lors de la ru00e9cupu00e9ration des leads par source: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtient la chronologie des leads
   * @param params Paramu00e8tres de filtrage
   * @returns Timeline des leads
   */
  private async getLeadsTimeline(params: AnalyticsQueryDto): Promise<TimelineAnalyticsResult[]> {
    try {
      const { data, error } = await this.supabaseService.getClient().rpc(
        'get_leads_timeline',
        {
          start_date: params.startDate,
          end_date: params.endDate,
          site_id: params.siteId || null,
          user_id: params.userId || null
        }
      );
      
      if (error) {
        this.logger.error(`Erreur lors de la ru00e9cupu00e9ration de la timeline des leads: ${error.message}`);
        throw new Error(`Analytics query failed: ${error.message}`);
      }
      
      return data || [];
    } catch (error) {
      this.logger.error(`Exception lors de la ru00e9cupu00e9ration de la timeline des leads: ${error.message}`);
      throw error;
    }
  }
}
