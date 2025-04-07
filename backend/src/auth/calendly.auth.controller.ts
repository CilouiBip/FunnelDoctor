import { Controller, Get, Post, Query, Req, Res, UseGuards, Logger, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CalendlyAuthService } from '../auth/calendly.auth.service';
import { IntegrationsService } from '../integrations/integrations.service';

/**
 * Contrôleur pour gérer l'authentification OAuth2 Calendly
 */
@Controller('/auth/calendly')
export class CalendlyAuthController {
  private readonly logger = new Logger(CalendlyAuthController.name);

  constructor(
    private readonly calendlyAuthService: CalendlyAuthService,
    private readonly configService: ConfigService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  /**
   * Méthode sécurisée pour initier le flux OAuth2 Calendly et retourner l'URL d'autorisation au frontend
   * 
   * @param request Requête contenant l'utilisateur authentifié
   * @returns Objet contenant l'URL d'autorisation à utiliser pour la redirection frontend
   */
  @Get('initiate')
  @UseGuards(JwtAuthGuard) // Sécurise CET endpoint
  async initiateOAuth(@Req() request) {
    const userId = request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not found in request');
    }
    this.logger.log(`Initiating Calendly OAuth for user: ${userId}`);
    try {
      const authUrl = await this.calendlyAuthService.generateAuthUrl(userId);
      // Retourne l'URL au frontend
      return { authorizeUrl: authUrl };
    } catch (error) {
      this.logger.error(`Error initiating Calendly OAuth: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to initiate Calendly OAuth');
    }
  }

  /**
   * Point d'entrée pour initier le flux d'autorisation OAuth2 Calendly
   * Génère une URL d'autorisation et redirige l'utilisateur vers Calendly
   * 
   * @param request Requête contenant l'utilisateur authentifié
   * @param response Réponse pour redirection
   */
  @Get('authorize')
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

  /**
   * Endpoint pour vérifier le statut de la connexion Calendly d'un utilisateur
   * 
   * @param request Requête contenant l'utilisateur authentifié
   * @returns Objet indiquant si l'utilisateur a une intégration Calendly active
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getCalendlyStatus(@Req() request) {
    const userId = request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not found in request');
    }
    
    this.logger.log(`Vérification du statut d'intégration Calendly pour l'utilisateur: ${userId}`);
    
    try {
      const isConnected = await this.integrationsService.getUserIntegrationStatus(userId, 'calendly');
      this.logger.log(`Statut d'intégration Calendly pour l'utilisateur ${userId}: ${isConnected ? 'connecté' : 'déconnecté'}`);
      
      return { isConnected };
    } catch (error) {
      this.logger.error(`Erreur lors de la vérification du statut Calendly: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to check Calendly integration status');
    }
  }

  /**
   * Endpoint pour révoquer l'intégration Calendly d'un utilisateur
   * 
   * @param request Requête contenant l'utilisateur authentifié
   * @returns Message de succès ou d'erreur
   */
  @Post('revoke')
  @UseGuards(JwtAuthGuard)
  async revokeCalendly(@Req() request) {
    const userId = request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not found in request');
    }
    
    this.logger.log(`Demande de révocation de l'intégration Calendly pour l'utilisateur: ${userId}`);
    
    try {
      const success = await this.calendlyAuthService.revokeIntegration(userId);
      
      if (success) {
        this.logger.log(`Intégration Calendly révoquée avec succès pour l'utilisateur ${userId}`);
        return { success: true, message: 'Calendly integration revoked successfully.' };
      } else {
        this.logger.error(`Échec de la révocation de l'intégration Calendly pour l'utilisateur ${userId}`);
        throw new InternalServerErrorException('Failed to revoke Calendly integration');
      }
    } catch (error) {
      this.logger.error(`Erreur lors de la révocation de l'intégration Calendly: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to revoke Calendly integration: ' + error.message);
    }
  }
}
