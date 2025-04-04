import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { EncryptionService } from './encryption/encryption.service';
import { SaveCalendlyDto } from './dto/save-calendly.dto';
import { SaveStripeDto } from './dto/save-stripe.dto';
import { SaveAcCkDto } from './dto/save-ac-ck.dto';
import { SaveOAuthDto } from './dto/save-oauth.dto';

/**
 * Types d'intu00e9grations supportu00e9s par le service
 */
export type IntegrationType = 'calendly' | 'stripe' | 'ac' | 'ck' | 'youtube';

/**
 * Service de gestion des intu00e9grations d'API tierces
 * Responsable du stockage su00e9curisu00e9 des clu00e9s API et des configurations
 */
@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Gu00e9nu00e8re un identifiant unique pour une intu00e9gration
   */
  private generateIntegrationId(): string {
    const { v4: uuidv4 } = require('uuid');
    return uuidv4();
  }

  /**
   * Mu00e9thode interne pour enregistrer ou mettre u00e0 jour une intu00e9gration
   * 
   * @param userId ID de l'utilisateur
   * @param integrationType Type d'intu00e9gration ('calendly', 'stripe', 'ac', 'ck')
   * @param config Configuration u00e0 enregistrer (peut contenir des clu00e9s cryptu00e9es)
   * @returns true si l'opu00e9ration a ru00e9ussi, false sinon
   */
  private async saveIntegration(
    userId: string,
    integrationType: string,
    config: Record<string, any>
  ): Promise<boolean> {
    try {
      this.logger.log(`Enregistrement de l'intu00e9gration ${integrationType} pour l'utilisateur ${userId}`);
      
      const supabase = this.supabaseService.getAdminClient();
      
      // Vu00e9rifier d'abord si une intu00e9gration existe du00e9ju00e0 pour cet utilisateur et ce type
      const { data, error: findError } = await supabase
        .from('integrations')
        .select('id')
        .eq('user_id', userId)
        .eq('integration_type', integrationType)
        .maybeSingle();
      
      let integrationId = data?.id;
      
      // Si aucune intu00e9gration n'existe, gu00e9nu00e9rer un nouvel ID
      if (!integrationId) {
        integrationId = this.generateIntegrationId();
      }
      
      // UPSERT dans la table integrations
      const { error } = await supabase
        .from('integrations')
        .upsert({
          id: integrationId,
          user_id: userId,
          integration_type: integrationType,
          type: 'api_key', // Type d'intu00e9gration (api_key ou oauth)
          config: config,
          status: 'active',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,integration_type',
          ignoreDuplicates: false // Force la mise u00e0 jour si duplicata
        });
      
      if (error) {
        this.logger.error(`Erreur lors de l'enregistrement de l'intu00e9gration ${integrationType}: ${error.message}`, error);
        return false;
      }
      
      this.logger.log(`Intu00e9gration ${integrationType} enregistru00e9e avec succu00e8s pour l'utilisateur ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(`Exception lors de l'enregistrement de l'intu00e9gration ${integrationType}: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Enregistre ou met u00e0 jour une intu00e9gration Calendly
   * 
   * @param userId ID de l'utilisateur
   * @param dto DTO contenant la clu00e9 API Calendly
   * @returns true si l'opu00e9ration a ru00e9ussi, false sinon
   */
  async saveCalendlyIntegration(userId: string, dto: SaveCalendlyDto): Promise<boolean> {
    try {
      // Crypter la clu00e9 API Calendly
      const encryptedKey = this.encryptionService.encrypt(dto.apiKey);
      
      // Configuration u00e0 enregistrer
      const config = {
        api_key: encryptedKey, // La clu00e9 cryptu00e9e
        is_encrypted: true,
        updated_at: new Date().toISOString()
      };
      
      return await this.saveIntegration(userId, 'calendly', config);
    } catch (error) {
      this.logger.error(`Erreur lors de l'enregistrement de l'intu00e9gration Calendly: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Enregistre ou met u00e0 jour une intu00e9gration Stripe
   * 
   * @param userId ID de l'utilisateur
   * @param dto DTO contenant les clu00e9s Stripe
   * @returns true si l'opu00e9ration a ru00e9ussi, false sinon
   */
  async saveStripeIntegration(userId: string, dto: SaveStripeDto): Promise<boolean> {
    try {
      // Crypter uniquement la clu00e9 secru00e8te (la clu00e9 publique peut rester en clair)
      const encryptedSecretKey = this.encryptionService.encrypt(dto.secretKey);
      
      // Configuration u00e0 enregistrer
      const config = {
        publishable_key: dto.publishableKey, // Pas besoin de crypter la clu00e9 publique
        secret_key: encryptedSecretKey, // La clu00e9 secru00e8te cryptu00e9e
        is_encrypted: true,
        updated_at: new Date().toISOString()
      };
      
      return await this.saveIntegration(userId, 'stripe', config);
    } catch (error) {
      this.logger.error(`Erreur lors de l'enregistrement de l'intu00e9gration Stripe: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Enregistre ou met u00e0 jour une intu00e9gration ActiveCampaign ou ConvertKit
   * 
   * @param userId ID de l'utilisateur
   * @param dto DTO contenant les informations d'intu00e9gration
   * @returns true si l'opu00e9ration a ru00e9ussi, false sinon
   */
  async saveEmailMarketingIntegration(userId: string, dto: SaveAcCkDto): Promise<boolean> {
    try {
      // Crypter la clu00e9 API
      const encryptedKey = this.encryptionService.encrypt(dto.apiKey);
      
      // Configuration u00e0 enregistrer
      const config = {
        api_key: encryptedKey, // La clu00e9 cryptu00e9e
        api_url: dto.apiUrl, // URL de l'API (pour ActiveCampaign)
        provider: dto.type, // 'ac' ou 'ck'
        is_encrypted: true,
        updated_at: new Date().toISOString()
      };
      
      // Utiliser le type comme identifiant d'intu00e9gration
      return await this.saveIntegration(userId, dto.type, config);
    } catch (error) {
      this.logger.error(`Erreur lors de l'enregistrement de l'intu00e9gration ${dto.type}: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Enregistre ou met u00e0 jour une intu00e9gration OAuth2
   * 
   * @param userId ID de l'utilisateur
   * @param integrationType Type d'intu00e9gration (ex: 'calendly', 'youtube')
   * @param oauthData DTO contenant les tokens OAuth2 et mu00e9tadonnu00e9es
   * @returns true si l'opu00e9ration a ru00e9ussi, false sinon
   */
  async saveOAuthIntegration(
    userId: string,
    integrationType: IntegrationType,
    oauthData: SaveOAuthDto
  ): Promise<boolean> {
    try {
      this.logger.log(`Enregistrement de l'intu00e9gration OAuth ${integrationType} pour l'utilisateur ${userId}`);
      
      // Pru00e9parer la configuration
      const config = {
        ...oauthData,
        is_encrypted: false, // Pas besoin de chiffrer car ce sont du00e9ju00e0 des tokens OAuth su00e9curisu00e9s
        updated_at: new Date().toISOString(),
        type: 'oauth' // Indiquer que c'est une intu00e9gration OAuth et non API_KEY
      };
      
      // Utiliser la mu00e9thode saveIntegration privu00e9e
      return await this.saveIntegration(userId, integrationType, config);
    } catch (error) {
      this.logger.error(`Erreur lors de l'enregistrement de l'intu00e9gration OAuth ${integrationType}: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Ru00e9cupu00e8re une configuration d'intu00e9gration pour un utilisateur spu00e9cifique
   * 
   * @param userId ID de l'utilisateur
   * @param integrationType Type d'intu00e9gration ('calendly', 'stripe', 'ac', 'ck', 'youtube')
   * @returns La configuration du00e9cryptu00e9e ou null si l'intu00e9gration n'existe pas
   * @throws NotFoundException si l'utilisateur n'existe pas ou si l'intu00e9gration n'est pas active
   */
  async getIntegrationConfig(
    userId: string,
    integrationType: IntegrationType
  ): Promise<Record<string, any> | null> {
    try {
      const supabase = this.supabaseService.getAdminClient();
      
      // Ru00e9cupu00e9rer la configuration de l'intu00e9gration
      const { data, error } = await supabase
        .from('integrations')
        .select('config, status')
        .eq('user_id', userId)
        .eq('integration_type', integrationType)
        .maybeSingle();
      
      if (error || !data) {
        this.logger.log(`Aucune configuration d'intu00e9gration ${integrationType} trouvu00e9e pour l'utilisateur ${userId}`);
        return null;
      }
      
      if (data.status !== 'active') {
        this.logger.log(`Intu00e9gration ${integrationType} inactive pour l'utilisateur ${userId}`);
        return null;
      }
      
      this.logger.log(`Configuration d'intu00e9gration ${integrationType} trouvu00e9e pour l'utilisateur ${userId}`);

      
      // Copier la configuration pour la modifier
      const config = { ...data.config };
      
      // Si la configuration contient des donnu00e9es cryptu00e9es, les du00e9crypter
      if (config.is_encrypted) {
        if (config.api_key) {
          config.api_key = this.encryptionService.decrypt(config.api_key);
        }
        
        if (config.secret_key) {
          config.secret_key = this.encryptionService.decrypt(config.secret_key);
        }
      }
      
      return config;
    } catch (error) {
      this.logger.error(`Erreur lors de la ru00e9cupu00e9ration de la configuration ${integrationType}: ${error.message}`, error.stack);
      return null;
    }
  }
}
