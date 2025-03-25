import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { EncryptionService } from './encryption/encryption.service';

interface OAuthConfig {
  access_token: string;
  refresh_token?: string;
  expires_at?: number; // epoch timestamp in seconds
  token_type?: string;
  scope?: string;
  [key: string]: any; // For any additional provider-specific fields
}

interface OAuthEvent {
  user_id: string;
  integration_type: string;
  event_type: 'authorize' | 'callback' | 'refresh' | 'error' | 'revoke';
  status: 'success' | 'failure';
  details?: Record<string, any>;
  created_at?: string;
}

@Injectable()
export class IntegrationService {
  constructor(
    protected readonly supabaseService: SupabaseService,
    protected readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Generate a unique integration ID for storing OAuth configs
   * Gu00e9nu00e8re un UUID v4 valide requis par la table integrations
   */
  protected getIntegrationId(userId: string, integrationType: string): string {
    // Importer uuid dynamiquement pour u00e9viter les du00e9pendances circulaires
    const { v4: uuidv4 } = require('uuid');
    return uuidv4();
  }

  /**
   * Store OAuth configuration securely
   */
  async storeIntegrationConfig(
    userId: string, 
    integrationType: string, 
    config: OAuthConfig
  ): Promise<boolean> {
    try {
      // Encrypt sensitive token information
      const encryptedConfig = {
        ...config,
        access_token: this.encryptionService.encrypt(config.access_token),
      };
      
      if (config.refresh_token) {
        encryptedConfig.refresh_token = this.encryptionService.encrypt(config.refresh_token);
      }
      
      const integrationId = this.getIntegrationId(userId, integrationType);
      
      // Store in Supabase avec gestion correcte de l'upsert
      const { error } = await this.supabaseService.getAdminClient()
        .from('integrations')
        .upsert({
          id: integrationId,
          name: userId,  // Utilisation de 'name' au lieu de 'user_id'
          type: 'oauth',  // Renseigner le type requis
          integration_type: integrationType,
          config: encryptedConfig,
          updated_at: new Date().toISOString(),
        }, { 
          onConflict: 'name,integration_type',  // Utilisation de la contrainte correcte
          ignoreDuplicates: false  // Force la mise à jour si duplicata
        });
      
      if (error) {
        console.error(`Failed to store integration config: ${error.message}`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error(`Error storing integration config: ${error.message}`);
      return false;
    }
  }

  /**
   * Retrieve and decrypt OAuth configuration
   */
  async getIntegrationConfig(
    userId: string, 
    integrationType: string
  ): Promise<OAuthConfig | null> {
    try {
      // Rechercher par name et integration_type plutôt que par ID
      const { data, error } = await this.supabaseService.getAdminClient()
        .from('integrations')
        .select('config')
        .eq('name', userId)
        .eq('integration_type', integrationType)
        .single();
      
      if (error || !data) {
        return null;
      }
      
      const encryptedConfig = data.config;
      
      // Decrypt sensitive information
      const decryptedConfig = {
        ...encryptedConfig,
        access_token: this.encryptionService.decrypt(encryptedConfig.access_token),
      };
      
      if (encryptedConfig.refresh_token) {
        decryptedConfig.refresh_token = this.encryptionService.decrypt(encryptedConfig.refresh_token);
      }
      
      return decryptedConfig;
    } catch (error) {
      console.error(`Error retrieving integration config: ${error.message}`);
      return null;
    }
  }

  /**
   * Log OAuth events for auditing and debugging
   */
  async logOAuthEvent(event: OAuthEvent): Promise<void> {
    try {
      // Add timestamp if not provided
      if (!event.created_at) {
        event.created_at = new Date().toISOString();
      }
      
      await this.supabaseService.getAdminClient()
        .from('oauth_events')
        .insert(event);
    } catch (error) {
      console.error(`Failed to log OAuth event: ${error.message}`);
      // Non-blocking - we don't want to fail the main operation if logging fails
    }
  }
}
