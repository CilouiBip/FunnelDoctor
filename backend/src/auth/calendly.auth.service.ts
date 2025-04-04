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

      // Calcul de la date d'expiration (10 minutes dans le futur)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      // Stockage du state et de l'userId dans la table oauth_states avec expiration
      try {
        const supabase = this.supabaseService.getAdminClient();
        const { error } = await supabase
          .from('oauth_states')
          .insert({
            state,
            user_id: userId,
            expires_at: expiresAt.toISOString(),
          });

        if (error) {
          this.logger.error(`Erreur lors du stockage du state OAuth: ${error.message}`);
          throw new Error(`Erreur de stockage du state: ${error.message}`);
        }
      } catch (dbError) {
        this.logger.error(`Erreur de base de données lors du stockage du state: ${dbError.message}`, dbError.stack);
        throw new Error('Impossible de stocker le state pour le flux OAuth');
      }

      // Construction de l'URL d'autorisation Calendly
      const authUrl = new URL('https://auth.calendly.com/oauth/authorize');
      authUrl.searchParams.append('client_id', this.clientId);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('redirect_uri', this.redirectUri);
      authUrl.searchParams.append('state', state);
      
      // Ajout des scopes si nécessaire
      if (this.scopes?.length > 0 && this.scopes[0] !== 'default') {
        authUrl.searchParams.append('scope', this.scopes.join(' '));
      }

      this.logger.log(`URL d'autorisation générée pour l'utilisateur ${userId} avec state=${state}`);
      return authUrl.toString();
    } catch (error) {
      this.logger.error(`Erreur lors de la génération de l'URL d'autorisation: ${error.message}`, error.stack);
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
      
      // 1. Valider le state et récupérer l'userId associé
      let userId: string | null = null;
      try {
        const supabase = this.supabaseService.getAdminClient();
        const now = new Date().toISOString();
        
        // Recherche du state dans la table oauth_states
        const { data, error } = await supabase
          .from('oauth_states')
          .select('user_id, expires_at')
          .eq('state', state)
          .single();
        
        if (error || !data) {
          this.logger.error(`State OAuth invalide ou non trouvé: ${error?.message || 'Non trouvé'}`);
          throw new Error('Invalid state parameter');
        }
        
        // Vérification que le state n'est pas expiré
        if (new Date(data.expires_at) < new Date()) {
          this.logger.error(`State OAuth expiré`);
          throw new Error('State parameter expired');
        }
        
        userId = data.user_id;
        
        // Suppression du state utilisé pour éviter la réutilisation
        await supabase
          .from('oauth_states')
          .delete()
          .eq('state', state);
          
        this.logger.log(`State OAuth validé pour l'utilisateur ${userId}`);
      } catch (stateError) {
        // En cas d'erreur, rediriger vers le frontend avec message d'erreur
        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
        return {
          redirectUrl: `${frontendUrl}/settings/integrations?calendly_status=error&message=${encodeURIComponent(stateError.message || 'Invalid state')}`
        };
      }
      
      // 2. Échanger le code contre des tokens OAuth
      let tokensData;
      try {
        const tokenRequestBody = new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.redirectUri,
          client_id: this.clientId,
          client_secret: this.clientSecret
        });
        
        const { data } = await firstValueFrom(
          this.httpService.post('https://auth.calendly.com/oauth/token', tokenRequestBody, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }).pipe(
            catchError((error) => {
              this.logger.error(`Erreur lors de l'échange du code contre des tokens: ${error.message}`, error.stack);
              throw new Error(`Token exchange failed: ${error.response?.data?.error || error.message}`);
            })
          )
        );
        
        tokensData = data;
        this.logger.log(`Tokens OAuth obtenus avec succès pour l'utilisateur ${userId}`);
      } catch (tokenError) {
        // En cas d'erreur, rediriger vers le frontend avec message d'erreur
        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
        return {
          redirectUrl: `${frontendUrl}/settings/integrations?calendly_status=error&message=${encodeURIComponent(tokenError.message || 'Failed to get access token')}`
        };
      }
      
      // 3. Préparer et sauvegarder les tokens dans l'intégration
      try {
        const now = Math.floor(Date.now() / 1000); // Timestamp actuel en secondes
        const expiresIn = tokensData.expires_in || 3600; // Par défaut 1 heure si non spécifié
        const expiresAt = now + expiresIn;
        
        // Préparer l'objet DTO pour sauvegarder les tokens OAuth
        const oauthData = {
          access_token: tokensData.access_token,
          refresh_token: tokensData.refresh_token,
          token_type: tokensData.token_type || 'Bearer',
          scope: tokensData.scope || this.scopes.join(' '),
          expires_in: expiresIn,
          expires_at: expiresAt,
          refresh_token_expires_in: tokensData.refresh_token_expires_in
        };
        
        // Sauvegarder les credentials pour cet utilisateur en utilisant la méthode publique
        const success = await this.integrationsService.saveOAuthIntegration(
          userId,
          'calendly',
          oauthData
        );
        
        if (!success) {
          throw new Error('Impossible de sauvegarder les tokens OAuth Calendly');
        }
        
        this.logger.log(`Intégration Calendly sauvegardée pour l'utilisateur ${userId}`);
      } catch (saveError) {
        this.logger.error(`Erreur lors de la sauvegarde de l'intégration: ${saveError.message}`, saveError.stack);
        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
        return {
          redirectUrl: `${frontendUrl}/settings/integrations?calendly_status=error&message=${encodeURIComponent('Failed to save integration')}`
        };
      }
      
      // 4. Configurer le webhook Calendly
      try {
        // Vérification stricte de type pour userId pour éviter l'erreur de typscript
        if (typeof userId === 'string') {
          await this.calendlyV2Service.setupWebhookForUser(userId);
          this.logger.log(`Webhook Calendly configuré avec succès pour l'utilisateur ${userId}`);
        } else {
          this.logger.warn('Impossible de configurer le webhook Calendly: userId est null ou invalide');
        }
      } catch (webhookError) {
        // On ne fait pas échouer tout le processus si la création du webhook échoue
        // On log simplement l'erreur et on continue
        this.logger.error(`Avertissement: Impossible de configurer le webhook Calendly: ${webhookError.message}`, webhookError.stack);
      }

      // Retourner l'URL de succès vers le frontend
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
