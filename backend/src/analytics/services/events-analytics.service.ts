import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import {
  CategoryAnalyticsResult,
  SourceAnalyticsResult,
  TimelineAnalyticsResult,
  EventsAnalyticsResponse
} from '../interfaces/analytics-result.interface';

/**
 * Service responsable de l'analyse des événements de conversion
 */
@Injectable()
export class EventsAnalyticsService {
  private readonly logger = new Logger(EventsAnalyticsService.name);

  constructor(private supabaseService: SupabaseService) {}

  /**
   * Obtient les statistiques d'événements par catégorie
   * @param params Paramètres de filtrage
   * @returns Liste des catégories avec leurs statistiques
   */
  async getEventsByCategory(params: AnalyticsQueryDto): Promise<CategoryAnalyticsResult[]> {
    this.logger.log(`Récupération des événements par catégorie entre ${params.startDate} et ${params.endDate}`);
    
    try {
      const { data, error } = await this.supabaseService.getClient().rpc(
        'get_events_by_category',
        {
          start_date: params.startDate,
          end_date: params.endDate,
          site_id: params.siteId || null,
          user_id: params.userId || null,
          limit_val: params.limit || 10
        }
      );
      
      if (error) {
        this.logger.error(`Erreur lors de la récupération des événements par catégorie: ${error.message}`);
        throw new Error(`Analytics query failed: ${error.message}`);
      }
      
      this.logger.debug(`${data?.length || 0} catégories récupérées`);
      return data || [];
    } catch (error) {
      this.logger.error(`Exception lors de la récupération des événements par catégorie: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtient les statistiques d'événements par source
   * @param params Paramètres de filtrage
   * @returns Liste des sources avec leurs statistiques
   */
  async getEventsBySource(params: AnalyticsQueryDto): Promise<SourceAnalyticsResult[]> {
    this.logger.log(`Récupération des événements par source entre ${params.startDate} et ${params.endDate}`);
    
    try {
      const { data, error } = await this.supabaseService.getClient().rpc(
        'get_events_by_source',
        {
          start_date: params.startDate,
          end_date: params.endDate,
          site_id: params.siteId || null,
          user_id: params.userId || null,
          limit_val: params.limit || 10
        }
      );
      
      if (error) {
        this.logger.error(`Erreur lors de la récupération des événements par source: ${error.message}`);
        throw new Error(`Analytics query failed: ${error.message}`);
      }
      
      this.logger.debug(`${data?.length || 0} sources récupérées`);
      return data || [];
    } catch (error) {
      this.logger.error(`Exception lors de la récupération des événements par source: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtient la chronologie des événements
   * @param params Paramètres de filtrage
   * @returns Timeline des événements
   */
  async getEventsTimeline(params: AnalyticsQueryDto): Promise<TimelineAnalyticsResult[]> {
    this.logger.log(`Récupération de la timeline des événements entre ${params.startDate} et ${params.endDate}`);
    
    try {
      const { data, error } = await this.supabaseService.getClient().rpc(
        'get_events_timeline',
        {
          start_date: params.startDate,
          end_date: params.endDate,
          site_id: params.siteId || null,
          user_id: params.userId || null,
          event_category: params.eventCategory || null,
          source_system: params.sourceSystem || null
        }
      );
      
      if (error) {
        this.logger.error(`Erreur lors de la récupération de la timeline: ${error.message}`);
        throw new Error(`Analytics query failed: ${error.message}`);
      }
      
      this.logger.debug(`${data?.length || 0} points de données timeline récupérés`);
      return data || [];
    } catch (error) {
      this.logger.error(`Exception lors de la récupération de la timeline: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtient un résumé complet des statistiques d'événements
   * @param params Paramètres de filtrage
   * @returns Résumé complet des événements
   */
  async getEventsAnalyticsSummary(params: AnalyticsQueryDto): Promise<EventsAnalyticsResponse> {
    this.logger.log(`Récupération du résumé analytique complet entre ${params.startDate} et ${params.endDate}`);
    
    try {
      // Exécution en parallèle pour optimiser les performances
      const [byCategory, bySource, timeline, totalEvents] = await Promise.all([
        this.getEventsByCategory(params),
        this.getEventsBySource(params),
        this.getEventsTimeline(params),
        this.getTotalEvents(params)
      ]);
      
      return {
        byCategory,
        bySource,
        timeline,
        totalEvents
      };
    } catch (error) {
      this.logger.error(`Exception lors de la récupération du résumé analytique: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtient le nombre total d'événements
   * @param params Paramètres de filtrage
   * @returns Nombre total d'événements
   */
  private async getTotalEvents(params: AnalyticsQueryDto): Promise<number> {
    try {
      const { data, error } = await this.supabaseService.getClient().rpc(
        'get_total_events',
        {
          start_date: params.startDate,
          end_date: params.endDate,
          site_id: params.siteId || null,
          user_id: params.userId || null,
          event_category: params.eventCategory || null,
          source_system: params.sourceSystem || null
        }
      );
      
      if (error) {
        this.logger.error(`Erreur lors du comptage total des événements: ${error.message}`);
        throw new Error(`Analytics query failed: ${error.message}`);
      }
      
      return data || 0;
    } catch (error) {
      this.logger.error(`Exception lors du comptage total des événements: ${error.message}`);
      throw error;
    }
  }
}
