  import {
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
  InternalServerErrorException
} from '@nestjs/common';
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
        // Déterminer le userId si possible (peut être extrait du payload ou être null/undefined)
        // TODO: Implémenter ici la logique d'extraction de userId si nécessaire
        const userId = undefined;

        // Appel UNIQUE au service refactorisé - toute la logique est maintenant dans le service
        const result = await this.calendlyV2Service.processWebhookEvent(payload, userId);

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
}
