import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { IntegrationService } from '../integration.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { EncryptionService } from '../encryption/encryption.service';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

interface YouTubeTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

interface StateData {
  userId: string;
  nonce: string;
}

@Injectable()
export class YouTubeAuthService extends IntegrationService {
  private readonly logger = new Logger(YouTubeAuthService.name);
  private readonly integration_type = 'youtube';
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly scopes: string[];
  
  constructor(
    protected readonly supabaseService: SupabaseService,
    protected readonly encryptionService: EncryptionService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    super(supabaseService, encryptionService);
    
    const clientId = this.configService.get<string>('YOUTUBE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('YOUTUBE_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('YOUTUBE_REDIRECT_URI');
    const scopesStr = this.configService.get<string>('YOUTUBE_SCOPES');
    
    if (!clientId || !clientSecret || !redirectUri || !scopesStr) {
      throw new Error('Missing YouTube OAuth configuration');
    }
    
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
    this.scopes = scopesStr.split(',');
  }

  /**
   * Generate a secure state parameter and store it for CSRF protection
   */
  private async generateAndStoreState(userId: string): Promise<string> {
    const nonce = uuidv4();
    const state = uuidv4();
    
    const stateData: StateData = { userId, nonce };
    
    // Store state for validation during callback
    // State expires after 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    
    const { error } = await this.supabaseService.getAdminClient()
      .from('oauth_states')
      .insert({
        state,
        data: stateData,
        created_at: new Date().toISOString(),
        expires_at: expiresAt,
      });
    
    if (error) {
      this.logger.error(`Failed to store OAuth state: ${error.message}`);
      throw new Error('Failed to initialize OAuth flow');
    }
    
    return state;
  }

  /**
   * Validate the state parameter returned in the callback
   */
  private async validateState(state: string): Promise<StateData | null> {
    try {
      const { data, error } = await this.supabaseService.getAdminClient()
        .from('oauth_states')
        .select('data')
        .eq('state', state)
        .gte('expires_at', new Date().toISOString())
        .single();
      
      if (error || !data) {
        this.logger.warn(`Invalid or expired state parameter: ${state}`);
        return null;
      }
      
      // Delete the used state to prevent replay attacks
      await this.supabaseService.getAdminClient()
        .from('oauth_states')
        .delete()
        .eq('state', state);
      
      return data.data as StateData;
    } catch (error) {
      this.logger.error(`Error validating state: ${error.message}`);
      return null;
    }
  }

  /**
   * Generate the authorization URL for YouTube OAuth
   */
  async generateAuthUrl(userId: string): Promise<string> {
    try {
      const state = await this.generateAndStoreState(userId);
      
      const params = new URLSearchParams({
        client_id: this.clientId,
        redirect_uri: this.redirectUri,
        response_type: 'code',
        scope: this.scopes.join(' '),
        access_type: 'offline',
        state,
        prompt: 'consent', // Always show consent screen to get refresh_token
      });
      
      await this.logOAuthEvent({
        user_id: userId,
        integration_type: this.integration_type,
        event_type: 'authorize',
        status: 'success',
        details: { state },
      });
      
      return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    } catch (error) {
      this.logger.error(`Error generating auth URL: ${error.message}`);
      
      await this.logOAuthEvent({
        user_id: userId,
        integration_type: this.integration_type,
        event_type: 'authorize',
        status: 'failure',
        details: { error: error.message },
      });
      
      throw error;
    }
  }

  /**
   * Handle the OAuth callback and exchange code for tokens
   */
  async handleCallback(code: string, state: string): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      // Validate state parameter
      const stateData = await this.validateState(state);
      if (!stateData) {
        return { success: false, error: 'Invalid or expired state parameter' };
      }
      
      const userId = stateData.userId;
      
      // Exchange authorization code for tokens
      const tokenResponse = await firstValueFrom(
        this.httpService.post(
          'https://oauth2.googleapis.com/token',
          {
            code,
            client_id: this.clientId,
            client_secret: this.clientSecret,
            redirect_uri: this.redirectUri,
            grant_type: 'authorization_code',
          },
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );
      
      const tokens: YouTubeTokens = tokenResponse.data;
      
      // Calculate token expiration timestamp
      const expiresAt = Math.floor(Date.now() / 1000) + (tokens.expires_in || 3600);
      
      // Store tokens
      const success = await this.storeIntegrationConfig(userId, this.integration_type, {
        ...tokens,
        expires_at: expiresAt,
      });
      
      if (!success) {
        throw new Error('Failed to store YouTube tokens');
      }
      
      await this.logOAuthEvent({
        user_id: userId,
        integration_type: this.integration_type,
        event_type: 'callback',
        status: 'success',
      });
      
      return { success: true, userId };
    } catch (error) {
      this.logger.error(`OAuth callback error: ${error.message}`, error.stack);
      
      let userId = 'unknown';
      try {
        const stateData = await this.validateState(state);
        if (stateData) {
          userId = stateData.userId;
        }
      } catch {}
      
      await this.logOAuthEvent({
        user_id: userId,
        integration_type: this.integration_type,
        event_type: 'callback',
        status: 'failure',
        details: { error: error.message },
      });
      
      return { success: false, error: 'Failed to complete YouTube authorization' };
    }
  }

  /**
   * Refresh an access token using the refresh token
   */
  async refreshAccessToken(userId: string): Promise<boolean> {
    try {
      // Get current tokens
      const currentConfig = await this.getIntegrationConfig(userId, this.integration_type);
      if (!currentConfig || !currentConfig.refresh_token) {
        this.logger.error(`No refresh token available for user: ${userId}`);
        return false;
      }
      
      // Exchange refresh token for new access token
      const tokenResponse = await firstValueFrom(
        this.httpService.post(
          'https://oauth2.googleapis.com/token',
          {
            refresh_token: currentConfig.refresh_token,
            client_id: this.clientId,
            client_secret: this.clientSecret,
            grant_type: 'refresh_token',
          },
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );
      
      const tokens: YouTubeTokens = tokenResponse.data;
      
      // Calculate new expiration timestamp
      const expiresAt = Math.floor(Date.now() / 1000) + (tokens.expires_in || 3600);
      
      // Update stored configuration
      // Note: The response typically won't include a new refresh_token,
      // so we keep the existing one
      const updatedConfig = {
        ...currentConfig,
        access_token: tokens.access_token,
        expires_at: expiresAt,
        token_type: tokens.token_type || currentConfig.token_type,
      };
      
      const success = await this.storeIntegrationConfig(
        userId,
        this.integration_type,
        updatedConfig,
      );
      
      if (success) {
        await this.logOAuthEvent({
          user_id: userId,
          integration_type: this.integration_type,
          event_type: 'refresh',
          status: 'success',
        });
      } else {
        throw new Error('Failed to store refreshed tokens');
      }
      
      return success;
    } catch (error) {
      this.logger.error(`Token refresh error: ${error.message}`, error.stack);
      
      await this.logOAuthEvent({
        user_id: userId,
        integration_type: this.integration_type,
        event_type: 'refresh',
        status: 'failure',
        details: { error: error.message },
      });
      
      return false;
    }
  }

  /**
   * Check if a user has a valid YouTube integration
   */
  async hasValidIntegration(userId: string): Promise<boolean> {
    try {
      const config = await this.getIntegrationConfig(userId, this.integration_type);
      
      if (!config || !config.access_token) {
        return false;
      }
      
      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      if (config.expires_at && config.expires_at < now) {
        // Token is expired, try to refresh it
        if (config.refresh_token) {
          const refreshed = await this.refreshAccessToken(userId);
          return refreshed;
        }
        return false;
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Error checking integration validity: ${error.message}`);
      return false;
    }
  }

  /**
   * Revoke a user's YouTube integration
   */
  async revokeIntegration(userId: string): Promise<boolean> {
    try {
      const config = await this.getIntegrationConfig(userId, this.integration_type);
      
      if (!config || !config.access_token) {
        return true; // Nothing to revoke
      }
      
      // Revoke the access token
      await firstValueFrom(
        this.httpService.post(
          'https://oauth2.googleapis.com/revoke',
          { token: config.access_token },
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );
      
      // Remove the integration from our database
      const integrationId = this.getIntegrationId(userId, this.integration_type);
      
      const { error } = await this.supabaseService.getAdminClient()
        .from('integrations')
        .delete()
        .eq('id', integrationId);
      
      if (error) {
        throw new Error(`Failed to delete integration: ${error.message}`);
      }
      
      await this.logOAuthEvent({
        user_id: userId,
        integration_type: this.integration_type,
        event_type: 'revoke',
        status: 'success',
      });
      
      return true;
    } catch (error) {
      this.logger.error(`Error revoking integration: ${error.message}`);
      
      await this.logOAuthEvent({
        user_id: userId,
        integration_type: this.integration_type,
        event_type: 'revoke',
        status: 'failure',
        details: { error: error.message },
      });
      
      return false;
    }
  }
}
