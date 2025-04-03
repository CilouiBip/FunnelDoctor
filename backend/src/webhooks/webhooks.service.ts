import { Injectable, Logger } from '@nestjs/common';
import { IclosedWebhookDto } from './dto/iclosed-webhook.dto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  /**
   * Traite les webhooks reu00e7us de Zapier pour les rendez-vous iClosed
   * 
   * @param data Donnu00e9es du webhook iClosed
   * @returns Promise<void>
   */
  async handleIclosedWebhook(data: IclosedWebhookDto): Promise<void> {
    this.logger.log('Processing iClosed Webhook for API Key:', data.apiKey);
    this.logger.debug('iClosed Webhook Data:', {
      email: data.email,
      visitorId: data.visitorId,
      apiKey: data.apiKey,
    });

    // TODO: Logique future à implémenter
    // 1. Valider l'API Key pour trouver le userId
    // 2. Appeler MasterLeadService.findOrCreateMasterLead
    // 3. Appeler TouchpointsService.createRdvScheduledTouchpoint
  }
}
