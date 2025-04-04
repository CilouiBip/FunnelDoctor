import { Controller, Get, Query, Req, Res, UseGuards, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CalendlyAuthService } from './calendly.auth.service';

/**
 * Contrôleur pour gérer l'authentification OAuth2 Calendly
 */
@Controller('/api/auth/calendly')
export class CalendlyAuthController {
  private readonly logger = new Logger(CalendlyAuthController.name);

  constructor(
    private readonly calendlyAuthService: CalendlyAuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Point d'entrée pour initier le flux d'autorisation OAuth2 Calendly
   * Génère une URL d'autorisation et redirige l'utilisateur vers Calendly
   * 
   * @param request Requête contenant l'utilisateur authentifié
   * @param response Réponse pour redirection
   */
  @Get('authorize')
  @UseGuards(JwtAuthGuard)
  async authorize(@Req() request, @Res() response: Response) {
    try {
      const userId = request.user.id;
      this.logger.log(`Démarrage du processus d'autorisation Calendly pour l'utilisateur ${userId}`);
      
      const authUrl = await this.calendlyAuthService.generateAuthUrl(userId);
      
      // Rediriger l'utilisateur vers l'URL d'autorisation Calendly
      return response.redirect(authUrl);
    } catch (error) {
      this.logger.error(`Erreur lors de la génération de l'URL d'autorisation Calendly: ${error.message}`, error.stack);
      
      // En cas d'erreur, rediriger vers la page d'intégrations avec un message d'erreur
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      return response.redirect(`${frontendUrl}/settings/integrations?calendly_status=error&message=${encodeURIComponent(error.message)}`);
    }
  }

  /**
   * Callback OAuth pour Calendly
   * Traite le code d'autorisation retourné par Calendly
   * 
   * @param code Code d'autorisation fourni par Calendly
   * @param state État généré précédemment pour vérifier l'authenticité de la requête
   * @param response Réponse pour redirection vers le frontend
   */
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() response: Response,
  ) {
    try {
      this.logger.log(`Réception du callback OAuth Calendly avec code et state: ${state}`);
      
      if (!code) {
        throw new Error('Code d\'autorisation manquant dans la requête de callback');
      }
      
      if (!state) {
        throw new Error('State manquant dans la requête de callback');
      }
      
      const { redirectUrl } = await this.calendlyAuthService.handleCallback(code, state);
      
      // Rediriger vers l'URL fournie par le service (succès ou erreur)
      return response.redirect(redirectUrl);
    } catch (error) {
      this.logger.error(`Erreur lors du traitement du callback Calendly: ${error.message}`, error.stack);
      
      // En cas d'erreur, rediriger vers la page d'intégrations avec un message d'erreur
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      return response.redirect(`${frontendUrl}/settings/integrations?calendly_status=error&message=${encodeURIComponent(error.message)}`);
    }
  }
}
