import { Controller, Get, Query, UseGuards, Logger, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import { EventsAnalyticsService } from '../services/events-analytics.service';
import { FunnelAnalyticsService } from '../services/funnel-analytics.service';
import { LeadsAnalyticsService } from '../services/leads-analytics.service';

/**
 * Contrôleur exposant les endpoints d'analyse
 */
@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(
    private readonly eventsAnalyticsService: EventsAnalyticsService,
    private readonly funnelAnalyticsService: FunnelAnalyticsService,
    private readonly leadsAnalyticsService: LeadsAnalyticsService,
  ) {}

  /**
   * Endpoint pour l'analyse des événements
   */
  @Get('events')
  @ApiOperation({ summary: 'Obtenir les analytics des événements' })
  @ApiResponse({ status: 200, description: 'Données analytiques des événements récupérées avec succès' })
  async getEventAnalytics(@Query() query: AnalyticsQueryDto, @Request() req) {
    this.logger.log(`Requête d'analytics des événements reçue: ${JSON.stringify(query)}`);
    query.userId = req.user.id; // Extraction de l'ID utilisateur depuis la requête authentifiée
    this.logger.debug(`User ID extrait du token: ${query.userId}`);
    return this.eventsAnalyticsService.getEventsAnalyticsSummary(query);
  }

  /**
   * Endpoint pour l'analyse des événements par catégorie
   */
  @Get('events/category')
  @ApiOperation({ summary: 'Obtenir les événements par catégorie' })
  @ApiResponse({ status: 200, description: 'Événements par catégorie récupérés avec succès' })
  async getEventsByCategory(@Query() query: AnalyticsQueryDto, @Request() req) {
    this.logger.log(`Requête d'analytics des événements par catégorie reçue: ${JSON.stringify(query)}`);
    query.userId = req.user.id; // Extraction de l'ID utilisateur depuis la requête authentifiée
    this.logger.debug(`User ID extrait du token: ${query.userId}`);
    return this.eventsAnalyticsService.getEventsByCategory(query);
  }

  /**
   * Endpoint pour l'analyse des événements par source
   */
  @Get('events/source')
  @ApiOperation({ summary: 'Obtenir les événements par source' })
  @ApiResponse({ status: 200, description: 'Événements par source récupérés avec succès' })
  async getEventsBySource(@Query() query: AnalyticsQueryDto, @Request() req) {
    this.logger.log(`Requête d'analytics des événements par source reçue: ${JSON.stringify(query)}`);
    query.userId = req.user.id; // Extraction de l'ID utilisateur depuis la requête authentifiée
    this.logger.debug(`User ID extrait du token: ${query.userId}`);
    return this.eventsAnalyticsService.getEventsBySource(query);
  }

  /**
   * Endpoint pour l'analyse chronologique des événements
   */
  @Get('events/timeline')
  @ApiOperation({ summary: 'Obtenir la timeline des événements' })
  @ApiResponse({ status: 200, description: 'Timeline des événements récupérée avec succès' })
  async getEventsTimeline(@Query() query: AnalyticsQueryDto, @Request() req) {
    this.logger.log(`Requête de timeline des événements reçue: ${JSON.stringify(query)}`);
    query.userId = req.user.id; // Extraction de l'ID utilisateur depuis la requête authentifiée
    this.logger.debug(`User ID extrait du token: ${query.userId}`);
    return this.eventsAnalyticsService.getEventsTimeline(query);
  }

  /**
   * Endpoint pour l'analyse du funnel
   */
  @Get('funnel')
  @ApiOperation({ summary: 'Obtenir les analytics du funnel' })
  @ApiResponse({ status: 200, description: 'Données analytiques du funnel récupérées avec succès' })
  async getFunnelAnalytics(@Query() query: AnalyticsQueryDto, @Request() req) {
    this.logger.log(`Requête d'analytics du funnel reçue: ${JSON.stringify(query)}`);
    query.userId = req.user.id; // Extraction de l'ID utilisateur depuis la requête authentifiée
    this.logger.debug(`User ID extrait du token: ${query.userId}`);
    return this.funnelAnalyticsService.getFunnelAnalytics(query);
  }

  /**
   * Endpoint pour l'analyse des leads
   */
  @Get('leads')
  @ApiOperation({ summary: 'Obtenir les analytics des leads' })
  @ApiResponse({ status: 200, description: 'Données analytiques des leads récupérées avec succès' })
  async getLeadsAnalytics(@Query() query: AnalyticsQueryDto, @Request() req) {
    this.logger.log(`Requête d'analytics des leads reçue: ${JSON.stringify(query)}`);
    query.userId = req.user.id; // Extraction de l'ID utilisateur depuis la requête authentifiée
    this.logger.debug(`User ID extrait du token: ${query.userId}`);
    return this.leadsAnalyticsService.getLeadsAnalytics(query);
  }
}
