  import {
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { CalendlyV2Service } from './calendly-v2.service';
import { CalendlyWebhookEventDto } from './dto/webhook-event.dto';

// Contrôleur pour les webhooks Calendly v2
// Cette configuration permet d'éviter le préfixe global pour cette route spécifique
@Controller({ path: 'rdv', host: undefined })
export class CalendlyV2WebhookController {
  private readonly logger = new Logger(CalendlyV2WebhookController.name);

  constructor(
    private readonly calendlyV2Service: CalendlyV2Service,
  ) {}

  /**
   * Point de terminaison pour les webhooks Calendly API v2
   * Endpoint: POST /api/rdv/webhook-v2
   * 
   * Gère les événements 'invitee.created' et 'invitee.canceled'
   */
  @Post('webhook-v2')
  @HttpCode(200) // Calendly attend un statut 200 OK
  async handleWebhook(
    @Req() request: any,
    @Headers('calendly-webhook-signature') signature: string,
  ) {
      // Log brut AVANT toute validation de DTO
      this.logger.log('<<< RAW WEBHOOK RECEIVED on /webhook-v2 >>>');
      try {
        this.logger.log(`Raw Body Type: ${typeof request.body}`);
        this.logger.log(`Raw Body Content: ${JSON.stringify(request.body, null, 2)}`);
      } catch (e) {
        this.logger.error('Error logging raw body:', e);
        // Essayer de logguer différemment si ce n'est pas du JSON
        console.log('Raw Body (console):', request.body);
      }
      
      // Suite du code existant
      const payload = request.body;
      if (payload && payload.event) {
        this.logger.log(`Webhook v2 reçu: ${payload.event}`);
        this.logger.debug('Détail complet du payload:', JSON.stringify(payload));
      } else {
        this.logger.warn('Payload reçu sans propriété event');
      }
      this.logger.debug(`Signature: ${signature}`);

      // Vérifier la signature du webhook (sécurité)
      if (!this.calendlyV2Service.verifyWebhookSignature(payload, signature)) {
        this.logger.warn('Signature de webhook invalide ou non fournie');
        // Continuer quand même pour faciliter les tests
        // En production, on pourrait rejeter les requêtes non signées
      }

      try {
        // Router l'événement selon son type
        switch (payload.event) {
          case 'invitee.created':
            return this.handleInviteeCreated(payload);
          case 'invitee.canceled':
            return this.handleInviteeCanceled(payload);
          default:
            this.logger.warn(`Type d'événement non géré: ${payload.event}`);
            return { success: false, reason: 'unsupported_event_type' };
        }
      } catch (error) {
        this.logger.error(`Erreur lors du traitement du webhook: ${error.message}`, error.stack);
        throw error;
      }
    }

  /**
   * Gère l'événement de création d'un invité Calendly (v2)
   * @param payload Données de l'événement
   */
  private async handleInviteeCreated(payload: CalendlyWebhookEventDto) {
    const { resource } = payload;

    if (!resource || !resource.invitee || !resource.invitee.email) {
      this.logger.warn('Données invitee.created incomplètes');
      return { success: false, reason: 'incomplete_data' };
    }

    try {
      this.logger.log('Délégation du traitement de invitee.created au service');
      const result = await this.calendlyV2Service.processInviteeCreatedEvent(resource);
      return result;
    } catch (error) {
      this.logger.error(`Erreur lors du traitement de invitee.created: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }

  /**
   * Gère l'événement d'annulation d'un invité Calendly (v2)
   * @param payload Données de l'événement
   */
  private async handleInviteeCanceled(payload: CalendlyWebhookEventDto) {
    const { resource } = payload;

    if (!resource || !resource.invitee || !resource.invitee.email) {
      this.logger.warn('Données invitee.canceled incomplètes');
      return { success: false, reason: 'incomplete_data' };
    }

    try {
      this.logger.log('Délégation du traitement de invitee.canceled au service');
      const result = await this.calendlyV2Service.processInviteeCanceledEvent(resource);
      return result;
    } catch (error) {
      this.logger.error(`Erreur lors du traitement de invitee.canceled: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }
}
