import { Controller, Get, Query, Req, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { YouTubeAnalyticsService } from './youtube-analytics.service';
import { YouTubeDataService } from './youtube-data.service';
import { AggregatedVideoKPIsDTO } from './dtos/youtube-analytics.dto';

@Controller('youtube/analytics')
export class YouTubeAnalyticsController {
  private readonly logger = new Logger(YouTubeAnalyticsController.name);
  
  constructor(
    private readonly youtubeAnalyticsService: YouTubeAnalyticsService,
    private readonly youtubeDataService: YouTubeDataService
  ) {}

  /**
   * Endpoint pour récupérer les KPIs agrégés sur toutes les vidéos pour une période donnée
   * @param req Request avec l'utilisateur authentifié
   * @param period Période ('last7', 'last28', 'last30', 'last90')
   * @returns Les KPIs agrégés calculés sur toutes les vidéos
   */
  /**
   * Endpoint pour récupérer les KPIs agrégés sur toutes les vidéos pour une période donnée
   * @param req Request avec l'utilisateur authentifié
   * @param period Période ('last7', 'last28', 'last30', 'last90')
   * @returns Les KPIs agrégés calculés sur toutes les vidéos
   */
  @Get('summary')
  @UseGuards(JwtAuthGuard)
  async getSummary(@Req() req, @Query('period') period: string = 'last28'): Promise<{ success: boolean; data: AggregatedVideoKPIsDTO; message?: string; error?: string }> {
    try {
      this.logger.log(`[ENDPOINT] youtube/analytics/summary appelé avec period=${period}`);
      const userId = req.user.id;
      this.logger.debug(`[DEBUG] Traitement de la requête pour userId=${userId}, period=${period}`);
      
      // Utilisation de la nouvelle méthode d'agrégation dans le service analytics
      const aggregatedKPIs = await this.youtubeAnalyticsService.getAggregatedVideoKPIs(userId, period);
      
      this.logger.log(`[ENDPOINT] Retour des KPIs agrégés pour ${aggregatedKPIs.totalVideosAnalysed}/${aggregatedKPIs.totalVideosConsidered} vidéos`);
      
      // Si aucune vidéo n'a été analysée, on ajoute un message informatif
      if (aggregatedKPIs.totalVideosAnalysed === 0) {
        return {
          success: true,
          data: aggregatedKPIs,
          message: 'Aucune vidéo analysée pour cette période'
        };
      }
      
      return {
        success: true,
        data: aggregatedKPIs
      };
    } catch (error) {
      this.logger.error(`[ENDPOINT] Erreur lors de la récupération des KPIs agrégés: ${error.message}`, error.stack);
      // En cas d'erreur, on retourne un objet avec une structure cohérente
      // incluant data avec des valeurs par défaut
      return {
        success: false,
        data: this.youtubeAnalyticsService.getEmptyAggregatedKPIs(period),
        message: 'Une erreur est survenue lors du calcul des KPIs agrégés',
        error: error.message
      };
    }
  }
  
  /**
   * Endpoint de TEST non protégé pour valider l'implémentation
   * À SUPPRIMER en production
   */
  @Get('test/summary')
  async getTestSummary(@Query('period') period: string = 'last28', @Query('userId') userId: string = '1') {
    try {
      this.logger.log(`[TEST ENDPOINT] youtube/analytics/test/summary appelé avec period=${period}, userId=${userId}`);
      
      // Utilisation de la nouvelle méthode d'agrégation dans le service analytics
      const aggregatedKPIs = await this.youtubeAnalyticsService.getAggregatedVideoKPIs(userId, period);
      
      this.logger.log(`[TEST ENDPOINT] Résultat:
${JSON.stringify(aggregatedKPIs, null, 2)}`);
      
      return {
        success: true,
        data: aggregatedKPIs
      };
    } catch (error) {
      this.logger.error(`[TEST ENDPOINT] Erreur: ${error.message}`, error.stack);
      return {
        success: false,
        data: this.youtubeAnalyticsService.getEmptyAggregatedKPIs(period),
        message: 'Une erreur est survenue lors du test',
        error: error.message
      };
    }
  }
}
