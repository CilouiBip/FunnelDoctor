import { Injectable, Logger } from '@nestjs/common';
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
   * @param tokens Tokens OAuth actuels
   * @returns Tokens OAuth valides
   */
  async ensureFreshAccessToken(userId: string, tokens: any): Promise<any> {
    // Vérifier si le token d'accès est expiré
    const currentTime = Math.floor(Date.now() / 1000);
    const expiresAt = tokens.expires_at || 0;
    
    // Si le token expire dans moins de 5 minutes, le rafraîchir
    if (expiresAt - currentTime < 300) {
      this.logger.debug(`Le token pour l'utilisateur ${userId} expire bientôt, rafraîchissement...`);
      const success = await this.youtubeAuthService.refreshAccessToken(userId);
      
      if (success) {
        // Récupérer les nouveaux tokens
        return await this.youtubeAuthService.getTokensForUser(userId);
      } else {
        this.logger.warn(`Échec du rafraîchissement du token pour l'utilisateur ${userId}`);
        return tokens; // Retourner les tokens existants malgré l'expiration imminente
      }
    }
    
    return tokens;
  }

  /**
   * Crée un client YouTube autorisé avec les tokens d'accès fournis
   * @param tokens Tokens OAuth valides
   * @returns Client YouTube API autorisé
   */
  createAuthorizedYouTubeClient(tokens: any) {
    return this.youtubeAuthService.createOAuthClient(tokens);
  }
}
