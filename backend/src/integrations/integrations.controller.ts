import { Body, Controller, Post, UseGuards, Request, Logger } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IntegrationsService } from './integrations.service';

import { SaveStripeDto } from './dto/save-stripe.dto';
import { SaveAcCkDto } from './dto/save-ac-ck.dto';

@ApiTags('integrations')
@Controller('integrations')
@UseGuards(JwtAuthGuard) // Toutes les routes requ00e8rent l'authentification JWT
@ApiBearerAuth()
export class IntegrationsController {
  private readonly logger = new Logger(IntegrationsController.name);

  constructor(private readonly integrationsService: IntegrationsService) {}


  @Post('stripe')
  @ApiOperation({ summary: 'Enregistre ou met u00e0 jour une intu00e9gration Stripe' })
  @ApiResponse({ status: 201, description: 'Intu00e9gration enregistru00e9e avec succu00e8s' })
  @ApiResponse({ status: 401, description: 'Non autoriu00e9' })
  @ApiResponse({ status: 500, description: 'Erreur serveur interne' })
  async saveStripeIntegration(@Request() req, @Body() dto: SaveStripeDto) {
    this.logger.log(`Enregistrement de l'intu00e9gration Stripe pour l'utilisateur ${req.user.id}`);
    const success = await this.integrationsService.saveStripeIntegration(req.user.id, dto);
    return { success };
  }

  @Post('email-marketing')
  @ApiOperation({ summary: 'Enregistre ou met u00e0 jour une intu00e9gration ActiveCampaign ou ConvertKit' })
  @ApiResponse({ status: 201, description: 'Intu00e9gration enregistru00e9e avec succu00e8s' })
  @ApiResponse({ status: 401, description: 'Non autoriu00e9' })
  @ApiResponse({ status: 500, description: 'Erreur serveur interne' })
  async saveEmailMarketingIntegration(@Request() req, @Body() dto: SaveAcCkDto) {
    this.logger.log(`Enregistrement de l'intu00e9gration ${dto.type === 'ac' ? 'ActiveCampaign' : 'ConvertKit'} pour l'utilisateur ${req.user.id}`);
    const success = await this.integrationsService.saveEmailMarketingIntegration(req.user.id, dto);
    return { success };
  }
}
