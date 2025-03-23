import {
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
  Logger,
  Req,
} from '@nestjs/common';
import { RdvService } from './rdv.service';

/**
 * Contrôleur dédié aux webhooks Calendly
 * Ce contrôleur utilise un chemin spécifique pour éviter le doublement du préfixe /api/
 */
@Controller({ path: 'rdv', host: undefined })
export class CalendlyWebhookController {
  private readonly logger = new Logger(CalendlyWebhookController.name);

  constructor(private readonly rdvService: RdvService) {}

  /**
   * Point de terminaison pour les webhooks Calendly
   * Endpoint: POST /api/rdv/webhook
   * 
   * Cette route est accessible à l'URL exacte configurée dans Calendly: /api/rdv/webhook
   * sans être affectée par le préfixe global
   */
  @Post('webhook')
  async handleWebhook(
    @Body() payload: any,
    @Headers('calendly-webhook-signature') signature: string,
    @Req() request: any,
  ) {
    // Logs détaillés pour diagnostiquer les problèmes de webhook
    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.logger.log(`✅ WEBHOOK CALENDLY REÇU [${new Date().toISOString()}]`);
    this.logger.log(`URL complète: ${request.protocol}://${request.get('host')}${request.originalUrl}`);
    this.logger.log(`Headers: ${JSON.stringify(request.headers, null, 2)}`);
    this.logger.log(`Signature: ${signature || 'AUCUNE SIGNATURE'}`);
    this.logger.log(`Payload brut: ${JSON.stringify(payload, null, 2)}`);
    
    // Vérification basique que c'est bien un webhook Calendly
    if (!payload || !payload.event) {
      this.logger.error('❌ Payload invalide: webhook rejeté');
      throw new UnauthorizedException('Payload invalide');
    }
    
    this.logger.log(`Type d'événement: ${payload.event}`);
    
    // La signature est optionnelle car Calendly ne l'inclut pas toujours
    // en fonction du plan d'abonnement
    return this.rdvService.handleWebhookEvent(payload, signature);
  }
}
