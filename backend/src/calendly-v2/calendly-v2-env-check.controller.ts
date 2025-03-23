import { Controller, Get, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CalendlyV2Service } from './calendly-v2.service';

// Type pour la réponse de l'API Calendly v2
interface CalendlyUserResponse {
  resource: {
    name: string;
    email: string;
    scheduling_url: string;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Contru00f4leur temporaire pour vu00e9rifier les variables d'environnement Calendly v2
 * u00c0 utiliser uniquement pour la configuration initiale
 */
@Controller('calendly-v2-check')
export class CalendlyV2EnvCheckController {
  private readonly logger = new Logger(CalendlyV2EnvCheckController.name);

  constructor(
    private readonly calendlyV2Service: CalendlyV2Service,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Vu00e9rifie les variables d'environnement pour Calendly v2
   * GET /api/calendly-v2-check/env
   */
  @Get('env')
  async checkEnvironment() {
    try {
      const pat = this.configService.get<string>('CALENDLY_PERSONAL_ACCESS_TOKEN');
      const webhookSigningKey = this.configService.get<string>('CALENDLY_WEBHOOK_SIGNING_KEY');
      
      // Vu00e9rifier si les variables sont du00e9finies
      const patDefined = !!pat;
      const webhookSigningKeyDefined = !!webhookSigningKey;
      
      // Masquer les tokens pour la su00e9curitu00e9
      const maskedPat = patDefined 
        ? `${pat.substring(0, 4)}...${pat.substring(pat.length - 4)}`
        : 'Non du00e9fini';
      
      const maskedSigningKey = webhookSigningKeyDefined
        ? `${webhookSigningKey.substring(0, 5)}...${webhookSigningKey.substring(webhookSigningKey.length - 4)}`
        : 'Non du00e9fini';

      // Ru00e9cupu00e9rer les informations de l'utilisateur pour vu00e9rifier que le PAT fonctionne
      let currentUser: CalendlyUserResponse | null = null;
      let userVerified = false;
      
      try {
        if (patDefined) {
          this.logger.log('Test de connexion avec le PAT Calendly...');
          currentUser = await this.calendlyV2Service.getCurrentUser();
          userVerified = !!currentUser && !!currentUser.resource;
          this.logger.log(`Connexion Calendly ru00e9ussie: ${currentUser?.resource?.name || 'Utilisateur inconnu'}`);
        }
      } catch (error) {
        this.logger.error(`Erreur lors de la vu00e9rification du PAT: ${error.message}`);
        userVerified = false;
      }
      
      return {
        success: true,
        environment: {
          calendlyPAT: {
            defined: patDefined,
            value: maskedPat,
            verified: userVerified
          },
          webhookSigningKey: {
            defined: webhookSigningKeyDefined,
            value: maskedSigningKey
          }
        },
        currentUser: userVerified && currentUser?.resource ? {
          name: currentUser.resource.name,
          email: currentUser.resource.email,
          schedulingUrl: currentUser.resource.scheduling_url,
          // Ne pas exposer trop de donnu00e9es sensibles
        } : null
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la vu00e9rification des variables d'environnement: ${error.message}`);
      return {
        success: false,
        message: `Erreur lors de la vu00e9rification: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }
}
