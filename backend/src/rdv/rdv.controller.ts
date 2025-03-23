import {
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
  Logger,
  Req,
  Param,
  Get
} from '@nestjs/common';
import { RdvService } from './rdv.service';

@Controller('rdv')
export class RdvController {
  private readonly logger = new Logger(RdvController.name);

  constructor(private readonly rdvService: RdvService) {}
  
  /**
   * Marquer un RDV comme complété
   * Endpoint: POST /api/rdv/:eventId/complete
   */
  @Post(':eventId/complete')
  async markAsCompleted(
    @Param('eventId') eventId: string,
    @Body() body: { visitor_id?: string, notes?: string }
  ) {
    this.logger.log(`Marquage du RDV ${eventId} comme complété`);
    return this.rdvService.markAppointmentAsCompleted(eventId, body);
  }
  
  /**
   * Récupérer les RDV programmés
   * Endpoint: GET /api/rdv/scheduled
   */
  @Get('scheduled')
  async getScheduledAppointments() {
    this.logger.log('Récupération des RDV programmés');
    return this.rdvService.getScheduledAppointments();
  }

  /**
   * Point de terminaison pour les webhooks Calendly
   * Endpoint: POST /api/rdv/webhook
   * 
   * Remarque: Cet endpoint est public car Calendly envoie des requu00eates 
   * non authentifiu00e9es, mais nous vu00e9rifions la signature
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
    
    // Vu00e9rification basique que c'est bien un webhook Calendly
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
