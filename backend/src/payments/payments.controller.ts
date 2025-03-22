import {
  Body,
  Controller,
  Headers,
  Post,
  RawBodyRequest,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// Utilisons Body pour remplacer temporairement le décorateur User

// DTOs pour la validation des requu00eates
class CreateCheckoutSessionDto {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

@Controller('api/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Cru00e9e une session de paiement Stripe Checkout
   * Endpoint: POST /api/payments/create-checkout-session
   */
  @Post('create-checkout-session')
  @UseGuards(JwtAuthGuard)
  async createCheckoutSession(
    @Body() createCheckoutDto: CreateCheckoutSessionDto,
    // Temporairement désactivé jusqu'à ce que le décorateur User soit disponible
    // @User() user: any,
  ) {
    // Ajouter un ID d'utilisateur factice pour le test
    if (!createCheckoutDto.metadata) {
      createCheckoutDto.metadata = {};
    }
    createCheckoutDto.metadata.user_id = 'test-user-id';
    
    return this.paymentsService.createCheckoutSession(createCheckoutDto);
  }

  /**
   * Point de terminaison pour les webhooks Stripe
   * Endpoint: POST /api/payments/webhook
   * 
   * Remarque: Cet endpoint est public car Stripe envoie des requu00eates 
   * non authentifiu00e9es, mais nous vu00e9rifions la signature
   */
  @Post('webhook')
  async handleWebhook(@Req() request: RawBodyRequest<Request>, @Headers('stripe-signature') signature: string) {
    if (!signature) {
      throw new UnauthorizedException('Stripe signature manquante');
    }

    // Ru00e9cupu00e9rer le corps brut pour la vu00e9rification de signature
    const payload = request.rawBody;
    if (!payload) {
      throw new UnauthorizedException('Payload manquant');
    }

    // Extraire l'identifiant utilisateur depuis les mu00e9tadonnu00e9es de l'u00e9vu00e9nement
    // En production, cette logique serait plus robuste
    let userId: string | undefined = undefined;
    try {
      const event = JSON.parse(payload.toString());
      if (event?.data?.object?.metadata?.user_id) {
        userId = event.data.object.metadata.user_id;
      }
    } catch (e) {
      // Ignorer les erreurs de parsing
    }

    return this.paymentsService.handleWebhookEvent(payload, signature, userId);
  }
}
