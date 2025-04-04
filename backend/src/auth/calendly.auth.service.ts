import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { IntegrationsService } from '../integrations/integrations.service';
import { CalendlyV2Service } from '../calendly-v2/calendly-v2.service';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Service pour gu00e9rer l'authentification OAuth2 avec Calendly
 */
@Injectable()
export class CalendlyAuthService {
  private readonly logger = new Logger(CalendlyAuthService.name);
  private readonly clientId: string | undefined;
  private readonly clientSecret: string | undefined;
  private readonly redirectUri: string | undefined;
  private readonly scopes: string[];

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly integrationsService: IntegrationsService,
    private readonly calendlyV2Service: CalendlyV2Service,
    private readonly supabaseService: SupabaseService,
  ) {
    // Récupération des variables de configuration sans lever d'erreur immédiatement
    this.clientId = this.configService.get<string>('CALENDLY_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('CALENDLY_CLIENT_SECRET');
    this.redirectUri = this.configService.get<string>('CALENDLY_REDIRECT_URI');
    const scopesStr = this.configService.get<string>('CALENDLY_SCOPES');

    // Initialisation des scopes par défaut
    this.scopes = scopesStr ? scopesStr.split(' ') : ['default'];
    
    // Log des informations de configuration
    if (this.clientId && this.clientSecret && this.redirectUri) {
      this.logger.log('CalendlyAuthService initialisé avec succès');
    } else {
      this.logger.warn('CalendlyAuthService initialisé avec une configuration incomplète - les méthodes vérifieront les paramètres manquants lors de leur appel');
      const missingParams: string[] = [];
      if (!this.clientId) missingParams.push('CALENDLY_CLIENT_ID');
      if (!this.clientSecret) missingParams.push('CALENDLY_CLIENT_SECRET');
      if (!this.redirectUri) missingParams.push('CALENDLY_REDIRECT_URI');
      this.logger.warn(`Paramètres manquants: ${missingParams.join(', ')}`);
    }
  }

  /**
   * Gu00e9nu00e8re une URL d'autorisation pour le flux OAuth2 Calendly
   * @param userId ID de l'utilisateur initiant la demande d'autorisation
   * @returns URL d'autorisation Calendly
   */
  async generateAuthUrl(userId: string): Promise<string> {
    try {
      // Vérification des variables de configuration requises
      if (!this.clientId || !this.clientSecret || !this.redirectUri) {
        const missingParams: string[] = [];
        if (!this.clientId) missingParams.push('CALENDLY_CLIENT_ID');
        if (!this.clientSecret) missingParams.push('CALENDLY_CLIENT_SECRET');
        if (!this.redirectUri) missingParams.push('CALENDLY_REDIRECT_URI');
        
        const errorMsg = `Configuration OAuth Calendly manquante dans .env: ${missingParams.join(', ')}`;
        this.logger.error(errorMsg);
        throw new InternalServerErrorException(errorMsg);
      }
      
      // Génération d'un state unique pour sécuriser le flux OAuth
      const state = uuidv4();

      // TODO: Stocker state et userId dans la DB avec expiration
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15); // Expiration dans 15 minutes

      const supabase = this.supabaseService.getAdminClient();
      await supabase
        .from('oauth_states')
        .insert({
          state,
          user_id: userId,
          expires_at: expiresAt.toISOString(),
        });

      // Construction de l'URL d'autorisation Calendly
      const authUrl = new URL('https://auth.calendly.com/oauth/authorize');
      authUrl.searchParams.append('client_id', this.clientId);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('redirect_uri', this.redirectUri);
      authUrl.searchParams.append('state', state);
      
      if (this.scopes?.length > 0 && this.scopes[0] !== 'default') {
        authUrl.searchParams.append('scope', this.scopes.join(' '));
      }

      this.logger.log(`URL d'autorisation gu00e9nu00e9ru00e9e pour l'utilisateur ${userId} avec state=${state}`);
      return authUrl.toString();
    } catch (error) {
      this.logger.error(`Erreur lors de la gu00e9nu00e9ration de l'URL d'autorisation: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Traite le callback OAuth de Calendly et u00e9change le code contre des tokens
   * @param code Le code d'autorisation reu00e7u de Calendly
   * @param state Le state envoyu00e9 dans la requu00eate initiale
   * @returns URL de redirection vers le frontend
   */
  async handleCallback(code: string, state: string): Promise<{ redirectUrl: string }> {
    try {
      // Vérification des variables de configuration requises
      if (!this.clientId || !this.clientSecret || !this.redirectUri) {
        const missingParams: string[] = [];
        if (!this.clientId) missingParams.push('CALENDLY_CLIENT_ID');
        if (!this.clientSecret) missingParams.push('CALENDLY_CLIENT_SECRET');
        if (!this.redirectUri) missingParams.push('CALENDLY_REDIRECT_URI');
        
        const errorMsg = `Configuration OAuth Calendly manquante dans .env: ${missingParams.join(', ')}`;
        this.logger.error(errorMsg);
        throw new InternalServerErrorException(errorMsg);
      }
      
      // TODO: Implémenter la logique complète
      // - Valider state et récupérer userId
      // - Échanger code contre tokens
      // - Sauvegarder tokens
      // - Créer webhook

      // URL de redirection vers le frontend (succu00e8s factice pour l'instant)
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      return { redirectUrl: `${frontendUrl}/settings/integrations?calendly_status=success` };

    } catch (error) {
      this.logger.error(`Erreur lors du traitement du callback: ${error.message}`, error.stack);
      
      // URL de redirection vers le frontend (erreur)
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      return {
        redirectUrl: `${frontendUrl}/settings/integrations?calendly_status=error&message=${encodeURIComponent(error.message)}`
      };
    }
  }
}
