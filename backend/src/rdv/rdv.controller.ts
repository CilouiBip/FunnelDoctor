import {
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { RdvService } from './rdv.service';

@Controller('api/rdv')
export class RdvController {
  constructor(private readonly rdvService: RdvService) {}

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
  ) {
    // Vu00e9rification basique que c'est bien un webhook Calendly
    if (!payload || !payload.event) {
      throw new UnauthorizedException('Payload invalide');
    }

    // La signature est optionnelle car Calendly ne l'inclut pas toujours
    // en fonction du plan d'abonnement
    return this.rdvService.handleWebhookEvent(payload, signature);
  }
}
