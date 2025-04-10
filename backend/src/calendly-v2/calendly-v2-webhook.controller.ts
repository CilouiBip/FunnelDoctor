  import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
  InternalServerErrorException
} from '@nestjs/common';
import { Request } from 'express';
import { CalendlyV2Service } from './calendly-v2.service';
import { CalendlyWebhookPayloadDto } from './dto/webhook-payload.dto';

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
      
      // Récupération du payload
      const payload = request.body as CalendlyWebhookPayloadDto;
      if (payload && payload.event) {
        this.logger.log(`Webhook v2 reçu: ${payload.event}`);
        this.logger.debug('Détail complet du payload:', JSON.stringify(payload));
      } else {
        this.logger.warn('Payload reçu sans propriété event');
      }
      this.logger.debug(`Signature: ${signature}`);

      // NOTE: La vérification de signature est maintenant gérée à l'intérieur du service
      // (actuellement désactivée comme dette technique acceptable)

      try {
        // La logique d'extraction du userId est maintenant dans le service CalendlyV2Service
        // qui identifie le propriétaire du webhook à partir des détails du payload

        // Appel au service qui gère la logique complète de traitement
        const result = await this.calendlyV2Service.processWebhookEvent(payload);

        // Gestion de la réponse HTTP basée sur le résultat du service
        if (result.success) {
          // Retourne un statut 200 OK, même si l'événement était ignoré
          return { status: 'success', result };
        } else {
          // Log l'erreur et retourne une erreur appropriée
          // Utiliser une analyse de type plus générique pour éviter les erreurs TS
          const resultObj = result as any; // Contournement du type union complexe
          const errorMessage = resultObj.error || 'Unknown error processing Calendly webhook';
          
          this.logger.error(`Erreur traitement webhook Calendly: ${errorMessage}`);
          // Pour éviter les retentatives Calendly, on pourrait retourner 200 même en cas d'erreur
          // Mais pour signaler clairement l'erreur, utilisons InternalServerErrorException
          throw new InternalServerErrorException(errorMessage);
        }
      } catch (error) {
        this.logger.error(`Erreur lors du traitement du webhook: ${error.message}`, error.stack);
        throw error;
      }
    }

  // Note: Les anciennes méthodes handleInviteeCreated et handleInviteeCanceled ont été supprimées
  // car toute la logique est maintenant gérée par la méthode processWebhookEvent du service

  /**
   * Point de terminaison spécifique pour les webhooks d'annulation Calendly API v2
   * Endpoint: POST /api/rdv/webhook-v2/canceled
   * 
   * Gère les événements 'invitee.canceled' spécifiquement
   */
  @Post('webhook-v2/canceled')
  @HttpCode(200) // Calendly attend un statut 200 OK
  async handleCancellation(
    @Body() payload: CalendlyWebhookPayloadDto,
    @Headers('calendly-webhook-signature') signature: string,
  ) {
    // Log brut du webhook
    this.logger.log('<<< CANCELLATION WEBHOOK RECEIVED on /webhook-v2/canceled >>>');
    try {
      if (payload && payload.event) {
        this.logger.log(`Webhook annulation reçu: ${payload.event}`);
      } else {
        this.logger.warn('Payload d\'annulation reçu sans propriété event');
        return { status: 'error', message: 'Payload invalide' };
      }
      
      // TODO: Implémenter la vérification de signature Calendly ici (MB-3.2.1)
      
      try {
        // Vérifier que c'est bien un événement d'annulation
        if (payload.event !== 'invitee.canceled') {
          this.logger.warn(`Type d'événement incorrect reçu sur /webhook-v2/canceled: ${payload.event}`);
          return { status: 'error', message: 'Type d\'\u00e9v\u00e9nement incorrect' };
        }
        
        // Appel au service pour traiter l'annulation
        const result = await this.calendlyV2Service.processWebhookEvent(payload);
        
        if (result.success) {
          return { status: 'success', result };
        } else {
          const resultObj = result as any;
          const errorMessage = resultObj.error || 'Unknown error processing Calendly cancellation webhook';
          
          this.logger.error(`Erreur traitement webhook d'annulation Calendly: ${errorMessage}`);
          throw new InternalServerErrorException(errorMessage);
        }
      } catch (error) {
        this.logger.error(`Erreur lors du traitement du webhook d'annulation: ${error.message}`, error.stack);
        throw error;
      }
    } catch (error) {
      this.logger.error(`Erreur lors de la lecture du payload d'annulation: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Invalid payload format');
    }
  }
}
