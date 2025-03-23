import { Controller, Get, Logger, Query, Res } from '@nestjs/common';
import { CalendlyV2SubscriptionService } from './calendly-v2-subscription.service';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

/**
 * Contrôleur temporaire pour configurer les webhooks Calendly v2
 * À utiliser uniquement pour la configuration initiale, puis peut être supprimé
 */
@Controller('calendly-v2-setup')
export class CalendlyV2SetupController {
  private readonly logger = new Logger(CalendlyV2SetupController.name);

  constructor(
    private readonly subscriptionService: CalendlyV2SubscriptionService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Crée une souscription webhook pour Calendly v2
   * GET /api/calendly-v2-setup/create-subscription?callback_url=https://votre-domaine.com/api/rdv/webhook-v2&scope=user
   */
  @Get('create-subscription')
  async createSubscription(
    @Res() res: Response,
    @Query('callback_url') callbackUrl?: string,
    @Query('scope') scope: 'user' | 'organization' = 'user',
  ) {
    try {
      // Utiliser l'URL fournie ou construire une URL par défaut
      if (!callbackUrl) {
        // Récupérer l'URL de base depuis les variables d'environnement ou utiliser localhost
        const baseUrl = this.configService.get<string>('BASE_URL') || 'http://localhost:3001';
        callbackUrl = `${baseUrl}/api/rdv/webhook-v2`;
        this.logger.log(`Aucune URL de callback fournie, utilisation de l'URL par défaut: ${callbackUrl}`);
      }

      // Liste des événements à écouter
      const events = ['invitee.created', 'invitee.canceled'];

      this.logger.log(`Création d'une souscription webhook pour ${callbackUrl} avec scope=${scope}`);

      // Créer la souscription
      const subscription = await this.subscriptionService.setupWebhookSubscription(callbackUrl, events);

      return res.json({
        success: true,
        message: 'Souscription webhook créée avec succès',
        subscription,
        callbackUrl,
        events,
        scope,
      });
    } catch (error) {
      this.logger.error(`Erreur lors de la création de la souscription webhook: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: `Erreur lors de la création de la souscription webhook: ${error.message}`,
        error: error.response?.data || error.message,
      });
    }
  }

  /**
   * Liste les souscriptions webhook existantes
   * GET /api/calendly-v2-setup/list-subscriptions
   */
  @Get('list-subscriptions')
  async listSubscriptions(@Res() res: Response) {
    try {
      const subscriptions = await this.subscriptionService.listWebhookSubscriptions();
      return res.json({
        success: true,
        subscriptions: subscriptions.collection || [],
      });
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des souscriptions webhook: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: `Erreur lors de la récupération des souscriptions webhook: ${error.message}`,
        error: error.response?.data || error.message,
      });
    }
  }
}
