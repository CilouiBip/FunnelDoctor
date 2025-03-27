import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '../../supabase/supabase.service';
import { YouTubeAuthService } from './youtube-auth.service';

@Injectable()
export class YouTubeTokenRefreshService {
  private readonly logger = new Logger(YouTubeTokenRefreshService.name);
  private readonly integration_type = 'youtube';
  private readonly refreshInProgressFlag = {};

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly youtubeAuthService: YouTubeAuthService,
  ) {}

  /**
   * Scheduled job that runs every hour to refresh tokens that are about to expire
   * Set to run at minute 15 of every hour to avoid potential overlap with other scheduled tasks
   */
  @Cron(CronExpression.EVERY_HOUR)
  async refreshExpiringTokens() {
    this.logger.log('Starting scheduled YouTube token refresh job');
    
    try {
      // Find integrations with tokens that expire in less than 2 hours
      const expiryThreshold = Math.floor(Date.now() / 1000) + 2 * 60 * 60; // current time + 2 hours
      
      // Utiliser 'name' comme stockage d'ID utilisateur plutôt que 'user_id'
      // Logging pour diagnostic
      this.logger.log(`Recherche des jetons expirant avant ${new Date(expiryThreshold * 1000).toISOString()}`);
      
      const { data, error } = await this.supabaseService.getAdminClient()
        .from('integrations')
        .select('id, name, config')
        .eq('integration_type', this.integration_type)
        .lt('config->expires_at', expiryThreshold);
      
      this.logger.debug(`Résultat de la requête: ${data ? data.length : 0} intégrations trouvées`);
      
      if (error) {
        throw new Error(`Failed to fetch expiring tokens: ${error.message}`);
      }
      
      if (!data || data.length === 0) {
        this.logger.debug('No YouTube tokens need refreshing');
        return;
      }
      
      this.logger.log(`Found ${data.length} YouTube tokens to refresh`);
      
      // Process each token that needs refreshing
      this.logger.debug(`Intégrations trouvées: ${JSON.stringify(data.map(i => ({id: i.id, userId: i.name})))}`);
      
      const refreshPromises = data.map(integration => 
        this.refreshTokenWithRetry(integration.name) // Utiliser 'name' comme ID utilisateur
      );
      
      // Wait for all refresh operations to complete
      const results = await Promise.allSettled(refreshPromises);
      
      // Log overall results
      const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
      const failed = results.length - successful;
      
      this.logger.log(`YouTube token refresh completed. Success: ${successful}, Failed: ${failed}`);
      
    } catch (error) {
      this.logger.error(`Error in scheduled token refresh: ${error.message}`, error.stack);
    }
  }

  /**
   * Refresh a token with exponential backoff retry logic
   * @param userId The user ID to refresh the token for
   * @param attempt Current attempt number (for internal retry logic)
   * @returns Whether the refresh was successful
   */
  private async refreshTokenWithRetry(userId: string, attempt = 1): Promise<boolean> {
    // Maximum number of retry attempts
    const maxAttempts = 3;
    
    // Prevent concurrent refresh attempts for the same user
    const refreshKey = `refresh:${userId}`;
    if (this.refreshInProgressFlag[refreshKey]) {
      this.logger.debug(`Token refresh already in progress for user ${userId}`);
      return false;
    }
    
    try {
      this.refreshInProgressFlag[refreshKey] = true;
      
      // Attempt to refresh the token
      const success = await this.youtubeAuthService.refreshAccessToken(userId);
      
      if (success) {
        this.logger.debug(`Successfully refreshed token for user ${userId}`);
        return true;
      }
      
      // If we haven't exceeded max attempts, retry with exponential backoff
      if (attempt < maxAttempts) {
        const delayMs = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s...
        this.logger.debug(`Retry ${attempt}/${maxAttempts} for user ${userId} in ${delayMs}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return this.refreshTokenWithRetry(userId, attempt + 1);
      }
      
      this.logger.warn(`Failed to refresh token for user ${userId} after ${maxAttempts} attempts`);
      return false;
      
    } catch (error) {
      this.logger.error(
        `Error refreshing token for user ${userId}, attempt ${attempt}: ${error.message}`,
        error.stack
      );
      return false;
    } finally {
      // Clear the in-progress flag
      delete this.refreshInProgressFlag[refreshKey];
    }
  }

  /**
   * Vérifie si un token d'accès est valide et le rafraîchit si nécessaire
   * @param userId Identifiant de l'utilisateur
   * @param accessToken Token d'accès actuel
   * @param refreshToken Token de rafraîchissement
   * @param expiresAt Timestamp d'expiration (en secondes)
   * @returns Objet contenant tous les tokens nécessaires (access_token, refresh_token, expires_at)
   */
  async ensureFreshAccessToken(
    userId: string, 
    accessToken: string, 
    refreshToken: string, 
    expiresAt: number
  ): Promise<any> {
    // Vérifier si le token d'accès est expiré
    const currentTime = Math.floor(Date.now() / 1000);
    
    this.logger.log(`[TOKEN_REFRESH] Vérification token pour utilisateur=${userId}`);
    this.logger.debug(`[TOKEN_REFRESH] Temps actuel=${currentTime}, expiration=${expiresAt}, diff=${expiresAt - currentTime}s`);
    
    // Si le token expire dans moins de 5 minutes ou est déjà expiré, le rafraîchir
    if (!expiresAt || expiresAt - currentTime < 300) {
      this.logger.log(`[TOKEN_REFRESH] Token pour l'utilisateur ${userId} expire bientôt/expiré, rafraîchissement...`);
      
      try {
        const success = await this.youtubeAuthService.refreshAccessToken(userId);
        
        if (success) {
          const newTokens = await this.youtubeAuthService.getTokensForUser(userId);
          this.logger.log(`[TOKEN_REFRESH] Token rafraîchi avec succès pour utilisateur=${userId}`);
          this.logger.debug(`[TOKEN_REFRESH] Nouvelle expiration: ${newTokens.expires_at ? new Date(newTokens.expires_at * 1000).toISOString() : 'non spécifiée'}`);
          
          // CORRECTION IMPORTANTE: Retourner l'objet complet de tokens, pas seulement l'access_token
          return newTokens;
        } else {
          throw new Error('Échec du rafraîchissement du token');
        }
      } catch (error) {
        this.logger.error(`[TOKEN_REFRESH] Erreur rafraîchissement pour utilisateur=${userId}: ${error.message}`);
        
        // Détecter les erreurs de token invalid/revoked et révoquer l'intégration si nécessaire
        if (
          error.message.includes('invalid_grant') || 
          error.message.includes('Invalid Credentials') ||
          error.message.includes('401') || 
          error.message.includes('403')
        ) {
          this.logger.warn(`[TOKEN_REFRESH] Token définitivement invalide pour utilisateur=${userId}, révocation...`);
          try {
            await this.youtubeAuthService.revokeIntegration(userId);
            this.logger.warn(`[TOKEN_REFRESH] Intégration révoquée suite à un échec de rafraîchissement`);
          } catch (revokeError) {
            this.logger.error(`[TOKEN_REFRESH] Erreur révocation: ${revokeError.message}`);
          }
          throw new UnauthorizedException('Intégration YouTube invalide, reconnexion requise');
        }
        
        // Pour les autres types d'erreurs, on peut renvoyer les tokens actuels malgré l'expiration imminente
        this.logger.warn(`[TOKEN_REFRESH] Utilisation des tokens existants malgré l'échec du rafraîchissement`);
        return {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAt
        };
      }
    }
    
    this.logger.log(`[TOKEN_REFRESH] Token valide pour utilisateur=${userId}, pas de rafraîchissement nécessaire`);
    
    // CORRECTION IMPORTANTE: Retourner l'objet complet de tokens, pas seulement l'access_token
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt
    };
  }

  /**
   * Crée un client YouTube autorisé avec les tokens d'accès fournis
   * @param tokens Tokens OAuth valides
   * @returns Client YouTube API autorisé
   */
  createAuthorizedYouTubeClient(tokens: any) {
    this.logger.log(`[YOUTUBE_CLIENT] Création client YouTube avec tokens: access_token=${!!tokens.access_token}, refresh_token=${!!tokens.refresh_token}, expires_at=${tokens.expires_at || 'non défini'}`);
    
    // Vérification d'intégrité des tokens
    if (!tokens || !tokens.access_token) {
      this.logger.error('[YOUTUBE_CLIENT] ERREUR: Impossible de créer le client YouTube - access_token manquant');
      throw new Error('Access token requis pour créer un client YouTube');
    }
    
    // Création du client en utilisant les tokens COMPLETS
    const client = this.youtubeAuthService.createOAuthClient(tokens);
    
    this.logger.log('[YOUTUBE_CLIENT] Client YouTube créé avec succès');
    return client;
  }

  /**
   * Crée un client YouTube Analytics autorisé avec les tokens d'accès fournis
   * @param tokens Tokens OAuth valides
   * @returns Client YouTube Analytics API autorisé
   */
  createAuthorizedYouTubeAnalyticsClient(tokens: any) {
    const { google } = require('googleapis');
    
    this.logger.log(`[ANALYTICS_CLIENT] Création client YouTube Analytics avec tokens: ${JSON.stringify({
      has_access_token: !!tokens.access_token,
      has_refresh_token: !!tokens.refresh_token,
      expires_at: tokens.expires_at
    })}`);
    
    // Vérifier que nous avons un token d'accès
    if (!tokens || !tokens.access_token) {
      this.logger.error(`[ANALYTICS_CLIENT] Impossible de créer le client Analytics: token manquant`);
      throw new Error('Token d\'accès requis pour créer le client YouTube Analytics');
    }

    // CORRECTION IMPORTANTE: Utiliser directement un client OAuth2 sans paramètres
    // pour éviter d'accéder aux propriétés privées de YouTubeAuthService
    const oauth2Client = new google.auth.OAuth2();
    
    // CORRECTION CRITIQUE: Structure exacte des credentials attendue par Google
    const credentials: any = {
      access_token: tokens.access_token
    };
    
    // Ajouter refresh_token seulement s'il est disponible (pas null/undefined)
    if (tokens.refresh_token) {
      credentials.refresh_token = tokens.refresh_token;
    }
    
    // Ajouter expiry_date seulement si expires_at est défini
    // Google attend expiry_date en millisecondes depuis l'epoch
    if (tokens.expires_at) {
      credentials.expiry_date = tokens.expires_at * 1000; // Convertir en millisecondes
    }
    
    this.logger.log(`[ANALYTICS_CLIENT] Configuration des credentials: ${JSON.stringify({
      has_access_token: !!credentials.access_token, 
      has_refresh_token: !!credentials.refresh_token,
      has_expiry_date: !!credentials.expiry_date
    })}`);
    
    // Définition des credentials pour le client OAuth2
    oauth2Client.setCredentials(credentials);
    
    // Création du client YouTube Analytics
    const analyticsClient = google.youtubeAnalytics({
      version: 'v2',
      auth: oauth2Client
    });
    
    this.logger.log(`[ANALYTICS_CLIENT] Client YouTube Analytics créé avec succès`);
    return analyticsClient;
  }
}
