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
      
      const { data, error } = await this.supabaseService.getAdminClient()
        .from('integrations')
        .select('id, user_id, config')
        .eq('integration_type', this.integration_type)
        .lt('config->expires_at', expiryThreshold);
      
      if (error) {
        throw new Error(`Failed to fetch expiring tokens: ${error.message}`);
      }
      
      if (!data || data.length === 0) {
        this.logger.debug('No YouTube tokens need refreshing');
        return;
      }
      
      this.logger.log(`Found ${data.length} YouTube tokens to refresh`);
      
      // Process each token that needs refreshing
      const refreshPromises = data.map(integration => 
        this.refreshTokenWithRetry(integration.user_id)
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
}
