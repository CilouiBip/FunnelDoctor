import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { IntegrationsService } from '../integrations/integrations.service';
import { SaveOAuthDto } from '../integrations/dto/save-oauth.dto';
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
            data: {} // Objet vide pour respecter la contrainte NOT NULL
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
        const oauthData: SaveOAuthDto = {
          access_token: tokensData.access_token,
          refresh_token: tokensData.refresh_token,
          token_type: tokensData.token_type || 'Bearer',
          scope: tokensData.scope || this.scopes.join(' '),
          expires_in: expiresIn,
          expires_at: expiresAt,
          refresh_token_expires_in: tokensData.refresh_token_expires_in,
          type: 'oauth',
          is_encrypted: false,
          updated_at: new Date().toISOString(),
          // Les propriétés suivantes seront remplies après l'appel à l'API
          user_uri: null,
          organization_uri: null
        };
        
        // Récupérer les informations de l'utilisateur Calendly pour obtenir les URIs
        this.logger.log('Récupération des informations utilisateur Calendly...');
        
        try {
          const { data } = await firstValueFrom(
            this.httpService.get('https://api.calendly.com/users/me', {
              headers: {
                'Authorization': `${tokensData.token_type || 'Bearer'} ${tokensData.access_token}`
              }
            }).pipe(
              catchError((error) => {
                this.logger.error(`Erreur lors de la récupération des infos utilisateur Calendly: ${error.message}`, error.stack);
                throw new Error(`User info fetch failed: ${error.response?.data?.error || error.message}`);
              })
            )
          );
          
          // Ajouter les URIs Calendly si disponibles
          if (data && data.resource) {
            if (data.resource.uri) {
              oauthData.user_uri = data.resource.uri;
              this.logger.log(`URI utilisateur Calendly obtenue: ${oauthData.user_uri}`);
            }
            
            if (data.resource.current_organization) {
              oauthData.organization_uri = data.resource.current_organization;
              this.logger.log(`URI organisation Calendly obtenue: ${oauthData.organization_uri}`);
            }
          }
        } catch (userInfoError) {
          this.logger.warn(`Impossible de récupérer les infos utilisateur Calendly: ${userInfoError.message}`);
          // On continue même sans les URIs, pour ne pas bloquer le processus d'authentification
        }
        
        // Les attributs supplémentaires sont déjà définis dans l'objet oauthData initial
        
        // Sauvegarder les credentials pour cet utilisateur en utilisant la méthode publique
        // Vérification que userId n'est pas null avant de l'utiliser
        if (!userId) {
          throw new Error('UserId non défini, impossible de sauvegarder les tokens OAuth');
        }
        
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

  /**
   * Révoque l'intégration Calendly d'un utilisateur
   * 
   * @param userId ID de l'utilisateur dont l'intégration doit être révoquée
   * @returns true si l'opération a réussi, false sinon
   */
  async revokeIntegration(userId: string): Promise<boolean> {
    try {
      this.logger.log(`Révocation de l'intégration Calendly pour l'utilisateur ${userId}`);
      
      // 1. Récupérer les informations d'intégration pour la révocation des tokens
      const integrationConfig = await this.integrationsService.getIntegrationConfig(userId, 'calendly');
      if (!integrationConfig) {
        this.logger.log(`Aucune intégration Calendly à révoquer pour l'utilisateur ${userId}`);
        return true; // Considérer comme un succès si aucune intégration n'existe
      }
      
      // 2. Révoquer les tokens OAuth Calendly
      if (integrationConfig.access_token) {
        try {
          // Vérification des variables de configuration requises
          if (!this.clientId || !this.clientSecret) {
            const missingParams: string[] = [];
            if (!this.clientId) missingParams.push('CALENDLY_CLIENT_ID');
            if (!this.clientSecret) missingParams.push('CALENDLY_CLIENT_SECRET');
            
            this.logger.warn(`Configuration incomplète pour la révocation OAuth: ${missingParams.join(', ')}`);
          } else {
            // Appel à l'API de révocation de Calendly
            const tokenRequestBody = new URLSearchParams({
              token: integrationConfig.access_token,
              client_id: this.clientId,
              client_secret: this.clientSecret
            });
            
            await firstValueFrom(
              this.httpService.post('https://auth.calendly.com/oauth/revoke', tokenRequestBody, {
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded'
                }
              }).pipe(
                catchError((error) => {
                  // Log mais ne fait pas échouer l'opération complète si la révocation échoue
                  this.logger.warn(`Erreur lors de la révocation du token Calendly: ${error.message}`, error.stack);
                  return [];
                })
              )
            );
            this.logger.log(`Tokens OAuth Calendly révoqués avec succès pour l'utilisateur ${userId}`);
          }
        } catch (revokeError) {
          // Log mais ne fait pas échouer l'opération complète
          this.logger.warn(`Erreur lors de la révocation du token Calendly: ${revokeError.message}`, revokeError.stack);
        }
      }
      
      // 3. TODO: Si on implémente les webhooks dans le futur, les supprimer ici
      // Pour le MVP, on peut simplement loguer un message
      this.logger.log(`Note: La suppression des webhooks Calendly n'est pas implémentée pour le MVP`);
      
      // 4. Supprimer l'intégration de la base de données
      console.log('[AUDIT REVOKE] Tentative de suppression pour', { userId });
      
      try {
        const deleted = await this.integrationsService.deleteIntegration(userId, 'calendly');
        console.log('[AUDIT REVOKE] Suppression DB pour', { userId }, 'TERMINÉE (apparemment sans erreur).');
        
        if (!deleted) {
          this.logger.error(`Échec de la suppression de l'intégration Calendly pour l'utilisateur ${userId}`);
          return false;
        }
      } catch (deleteError) {
        console.error('[AUDIT REVOKE] ERREUR lors de la suppression DB pour', { userId }, deleteError);
        this.logger.error(`Exception lors de la suppression de l'intégration Calendly: ${deleteError.message}`, deleteError.stack);
        return false;
      }
      
      this.logger.log(`Intégration Calendly révoquée avec succès pour l'utilisateur ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(`Exception lors de la révocation de l'intégration Calendly: ${error.message}`, error.stack);
      return false;
    }
  }
}
