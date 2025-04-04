import { Injectable, Logger } from '@nestjs/common';
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
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly scopes: string[];

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly integrationsService: IntegrationsService,
    private readonly calendlyV2Service: CalendlyV2Service,
    private readonly supabaseService: SupabaseService,
  ) {
    // Ru00e9cupu00e9ration des variables de configuration
    const clientId = this.configService.get<string>('CALENDLY_CLIENT_ID');
    const clientSecret = this.configService.get<string>('CALENDLY_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('CALENDLY_REDIRECT_URI');
    const scopesStr = this.configService.get<string>('CALENDLY_SCOPES');

    // Vu00e9rification des variables requises
    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Missing Calendly OAuth configuration');
    }

    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
    this.scopes = scopesStr ? scopesStr.split(' ') : ['default'];

    this.logger.log('CalendlyAuthService initialisu00e9 avec succu00e8s');
  }

  /**
   * Gu00e9nu00e8re une URL d'autorisation pour le flux OAuth2 Calendly
   * @param userId ID de l'utilisateur initiant la demande d'autorisation
   * @returns URL d'autorisation Calendly
   */
  async generateAuthUrl(userId: string): Promise<string> {
    try {
      // Gu00e9nu00e9ration d'un state unique pour su00e9curiser le flux OAuth
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
      // TODO: Implu00e9menter la logique complu00e8te
      // - Valider state et ru00e9cupu00e9rer userId
      // - u00c9changer code contre tokens
      // - Sauvegarder tokens
      // - Cru00e9er webhook

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
