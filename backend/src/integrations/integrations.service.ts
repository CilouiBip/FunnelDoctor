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
    config: Record<string, any>,
    options: { type?: string; name?: string } = {}
  ): Promise<boolean> {
    try {
      this.logger.log(`Enregistrement de l'intégration ${integrationType} pour l'utilisateur ${userId}`);
      
      const supabase = this.supabaseService.getAdminClient();
      
      // Vérifier d'abord si une intégration existe déjà pour cet utilisateur et ce type
      const { data, error: findError } = await supabase
        .from('integrations')
        .select('id')
        .eq('user_id', userId)
        .eq('integration_type', integrationType)
        .maybeSingle();
      
      let integrationId = data?.id;
      
      // Si aucune intégration n'existe, générer un nouvel ID
      if (!integrationId) {
        integrationId = this.generateIntegrationId();
      }
      
      // Générer un nom unique basé sur l'ID utilisateur pour éviter les conflits
      // entre différents utilisateurs qui ont le même type d'intégration
      const uniqueName = options.name || `${integrationType}-${userId.substring(0, 8)}`;
      
      // Préparer les données pour l'UPSERT
      const upsertData = {
        id: integrationId,
        user_id: userId,
        integration_type: integrationType,
        type: options.type || 'api_key', // Type d'intégration (api_key ou oauth)
        name: uniqueName, // Nom unique pour éviter les conflits de contrainte
        config: config,
        status: 'active',
        updated_at: new Date().toISOString(),
      };
      
      // Log des données envoyées pour le débogage
      this.logger.log(`[SAVE OAUTH] Données envoyées à UPSERT:`, JSON.stringify(upsertData));
      
      // UPSERT dans la table integrations
      const { error } = await supabase
        .from('integrations')
        .upsert(upsertData, {
          onConflict: 'user_id,integration_type',
          ignoreDuplicates: false // Force la mise à jour si duplicata
        });
      
      if (error) {
        this.logger.error(`Erreur lors de l'enregistrement de l'intégration ${integrationType}: ${error.message}`, error);
        this.logger.error(`Détails de l'erreur:`, JSON.stringify(error));
        return false;
      }
      
      this.logger.log(`Intégration ${integrationType} enregistrée avec succès pour l'utilisateur ${userId}`);
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

  /**
   * Vérifie si l'utilisateur possède une intégration active pour un service spécifique
   * 
   * @param userId ID de l'utilisateur
   * @param service Type d'intégration ('calendly', 'stripe', 'ac', 'ck', 'youtube')
   * @returns true si l'intégration est active, false sinon
   */
  async getUserIntegrationStatus(userId: string, service: IntegrationType): Promise<boolean> {
    try {
      console.log('[AUDIT STATUS SVC] Vérification statut pour', { userId, service });
      this.logger.log(`Vérification du statut d'intégration ${service} pour l'utilisateur ${userId}`);
      const supabase = this.supabaseService.getAdminClient();
      
      // Requête DB exacte qui va être exécutée pour vérifier l'intégration
      console.log('[AUDIT STATUS SVC] Critères de requête DB:', {
        table: 'integrations',
        columns: 'status, config, id',
        user_id: userId,
        integration_type: service,
        method: 'maybeSingle() [récupère au plus un enregistrement]'
      });
      
      // Forcer une requête directe à la base de données pour obtenir l'état le plus récent
      // sans utiliser de cache côté client
      const { data, error } = await supabase
        .from('integrations')
        .select('status, config, id')
        .eq('user_id', userId)
        .eq('integration_type', service)
        .maybeSingle();
      
      console.log('[AUDIT STATUS SVC] Résultat BRUT de la DB:', data);
      
      if (error) {
        this.logger.error(`Erreur lors de la vérification de l'intégration ${service}: ${error.message}`, error.stack);
        console.log('[AUDIT STATUS SVC] Erreur DB:', error);
        console.log('[AUDIT STATUS SVC] Statut booléen final qui sera retourné :', false);
        return false;
      }
      
      // Si aucune donnée trouvée dans la DB, l'intégration n'existe pas
      if (!data) {
        this.logger.log(`Aucune intégration ${service} trouvée pour l'utilisateur ${userId}`);
        console.log('[AUDIT STATUS SVC] Aucune entrée trouvée dans la DB - Cas \'non trouvé\' détecté');
        console.log('[AUDIT STATUS SVC] Statut booléen final qui sera retourné :', false);
        return false;
      }
      
      // Vérifier si le statut est 'active'
      if (data.status !== 'active') {
        this.logger.log(`Intégration ${service} inactive pour l'utilisateur ${userId}`);
        console.log('[AUDIT STATUS SVC] Entrée trouvée mais status non actif:', data.status);
        console.log('[AUDIT STATUS SVC] Statut booléen final qui sera retourné :', false);
        return false;
      }
      
      // Pour les intégrations OAuth, vérifier aussi si les tokens sont présents
      let calculatedStatus = true;
      if (service === 'calendly' || service === 'youtube') {
        console.log('[AUDIT STATUS SVC] Vérification des tokens pour intégration OAuth:', {
          access_token_present: !!data.config?.access_token,
          api_key_present: !!data.config?.api_key,
          is_encrypted: !!data.config?.is_encrypted
        });
        
        const hasTokens = data.config && 
                        (data.config.access_token || 
                         (data.config.api_key && data.config.is_encrypted));
        
        if (!hasTokens) {
          this.logger.log(`Intégration ${service} trouvée mais sans tokens valides pour l'utilisateur ${userId}`);
          console.log('[AUDIT STATUS SVC] Entrée trouvée mais sans tokens OAuth valides');
          calculatedStatus = false;
        }
      }
      
      console.log('[AUDIT STATUS SVC] Statut booléen final qui sera retourné :', calculatedStatus);
      if (calculatedStatus) {
        this.logger.log(`Intégration ${service} active trouvée pour l'utilisateur ${userId}`);
      }
      return calculatedStatus;
    } catch (error) {
      this.logger.error(`Exception lors de la vérification de l'intégration ${service}: ${error.message}`, error.stack);
      console.log(`[DEBUG STATUS SVC] Exception:`, error.message);
      console.log(`[DEBUG STATUS SVC] Statut retourné: false (exception)`);
      return false;
    }
  }

  /**
   * Trouve l'userId associé à une intégration Calendly à partir des détails d'intégration
   * Cette méthode est utilisée pour identifier l'utilisateur FunnelDoctor à partir des détails du webhook Calendly
   * 
   * @param integrationType Type d'intégration ('calendly')
   * @param integrationDetails Détails d'intégration (organization_uri, user_uri, etc.)
   * @returns L'ID de l'utilisateur FunnelDoctor ou null si aucun utilisateur n'est trouvé
   */
  async findUserIdByIntegrationDetails(
    integrationType: IntegrationType,
    integrationDetails: Record<string, string>
  ): Promise<string | null> {
    try {
      this.logger.log(`[DÉBOGAGE-INTÉGRATION] Recherche d'utilisateur via intégration ${integrationType} avec détails: ${JSON.stringify(integrationDetails)}`);
      
      const supabase = this.supabaseService.getAdminClient();
      
      // Construire la requête de base
      let query = supabase
        .from('integrations')
        .select('user_id, config, id')
        .eq('integration_type', integrationType)
        .eq('status', 'active');
      
      this.logger.log(`[DÉBOGAGE-INTÉGRATION] Requête SQL construite: select user_id, config, id from integrations where integration_type = '${integrationType}' and status = 'active'`);
      
      // Exécuter la requête
      const { data, error } = await query;
      
      this.logger.log(`[DÉBOGAGE-INTÉGRATION] Requête exécutée, résultat count: ${data?.length || 0}, error: ${error ? error.message : 'aucun'}`);
      if (data && data.length > 0) {
        this.logger.log(`[DÉBOGAGE-INTÉGRATION] Premier enregistrement trouvé: ID=${data[0].id}, user_id=${data[0].user_id}`);
        this.logger.log(`[DÉBOGAGE-INTÉGRATION] Structure de config: ${JSON.stringify(data[0].config, null, 2)}`);
      }
      
      if (error || !data || data.length === 0) {
        this.logger.warn(`Aucune intégration ${integrationType} active trouvée dans la recherche de détails`);
        return null;
      }
      
      // Parcourir les résultats et comparer les détails
      for (const integration of data) {
        const config = integration.config;
        
        this.logger.log(`[DÉBOGAGE-INTÉGRATION] Analyse de l'intégration ${integration.id} pour l'utilisateur ${integration.user_id}`);
        this.logger.log(`[DÉBOGAGE-INTÉGRATION] Détails recherchés: ${JSON.stringify(integrationDetails)}`);
        this.logger.log(`[DÉBOGAGE-INTÉGRATION] Config stocku00e9e: ${JSON.stringify(config)}`);
        
        // Pour Calendly, vérifier l'URI de l'organisation ou de l'utilisateur
        if (integrationType === 'calendly') {
          // Vérifie si organization_uri correspond
          if (integrationDetails.organization_uri) {
            const sourceUri = integrationDetails.organization_uri;
            const targetUri = config.organization_uri;
            const matches = targetUri === sourceUri;
            
            this.logger.log(`[DÉBOGAGE-INTÉGRATION] Comparaison organization_uri: ${sourceUri} === ${targetUri} => ${matches}`);
            
            if (matches) {
              this.logger.log(`UserId trouvé via organization_uri: ${integration.user_id}`);
              return integration.user_id;
            }
          }
          
          // Vérifie si user_uri correspond
          if (integrationDetails.user_uri) {
            const sourceUri = integrationDetails.user_uri;
            const targetUri = config.user_uri;
            const matches = targetUri === sourceUri;
            
            this.logger.log(`[DÉBOGAGE-INTÉGRATION] Comparaison user_uri: ${sourceUri} === ${targetUri} => ${matches}`);
            
            if (matches) {
              this.logger.log(`UserId trouvé via user_uri: ${integration.user_id}`);
              return integration.user_id;
            }
          }
          
          // Vérifie le champ account_uri pour compatibilité
          if (integrationDetails.organization_uri) {
            const sourceUri = integrationDetails.organization_uri;
            const targetUri = config.account_uri;
            const matches = targetUri === sourceUri;
            
            this.logger.log(`[DÉBOGAGE-INTÉGRATION] Comparaison account_uri (legacy): ${sourceUri} === ${targetUri} => ${matches}`);
            
            if (matches) {
              this.logger.log(`UserId trouvé via account_uri (legacy): ${integration.user_id}`);
              return integration.user_id;
            }
          }
        }
      }
      
      this.logger.warn(`Aucun utilisateur trouvé avec les détails d'intégration fournis pour ${integrationType}`);
      return null;
    } catch (error) {
      this.logger.error(`Erreur lors de la recherche d'utilisateur par détails d'intégration: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Supprime une intégration pour un utilisateur spécifique
   * 
   * @param userId ID de l'utilisateur
   * @param service Type d'intégration ('calendly', 'stripe', 'ac', 'ck', 'youtube')
   * @returns true si l'opération a réussi, false sinon
   */
  async deleteIntegration(userId: string, service: IntegrationType): Promise<boolean> {
    try {
      this.logger.log(`Suppression de l'intégration ${service} pour l'utilisateur ${userId}`);
      console.log(`[DELETE SVC] Début suppression pour ${service}, userId=${userId}`);
      
      // S'assurer que nous utilisons le client admin avec SERVICE_ROLE_KEY qui bypass les politiques RLS
      const supabase = this.supabaseService.getAdminClient();
      
      // Vérifier d'abord si l'intégration existe et récupérer son ID unique
      console.log(`[DELETE SVC] Recherche de l'intégration dans la DB...`);
      const { data: existingIntegration, error: findError } = await supabase
        .from('integrations')
        .select('id')
        .eq('user_id', userId)
        .eq('integration_type', service)
        .maybeSingle();
      
      console.log(`[DELETE SVC] Résultat recherche intégration:`, existingIntegration);
      
      if (findError) {
        this.logger.error(`Erreur lors de la recherche de l'intégration ${service}: ${findError.message}`, findError.stack);
        console.log(`[DELETE SVC] Erreur lors de la recherche:`, findError);
        return false;
      }
      
      // Si l'intégration n'existe pas, considérer l'opération comme réussie
      if (!existingIntegration) {
        this.logger.log(`Aucune intégration ${service} trouvée pour l'utilisateur ${userId}, rien à supprimer`);
        console.log(`[DELETE SVC] Aucune intégration trouvée, rien à supprimer`);
        return true;
      }
      
      // Utiliser l'ID unique pour une suppression plus fiable
      // Cette approche est plus robuste que de filtrer par user_id et integration_type
      const integrationId = existingIntegration.id;
      console.log(`[DELETE SVC] Intégration trouvée avec ID=${integrationId}, procédure de suppression...`);
      
      // Exécuter la suppression en utilisant l'ID spécifique
      const result = await supabase
        .from('integrations')
        .delete()
        .eq('id', integrationId)
        .select(); // Ajouter .select() pour obtenir les données supprimées et le décompte
      
      // Log complet du résultat pour diagnostiquer tout problème
      console.log('[DELETE SVC] Résultat brut Supabase delete:', result);
      
      if (result.error) {
        this.logger.error(`Erreur lors de la suppression de l'intégration ${service}: ${result.error.message}`, result.error.stack);
        console.log(`[DELETE SVC] ÉCHEC de la suppression:`, result.error);
        return false;
      }
      
      // Vérifier explicitement que des données ont été supprimées
      const successfulDeletion = result.data && result.data.length > 0;
      
      if (successfulDeletion) {
        this.logger.log(`Intégration ${service} supprimée avec succès pour l'utilisateur ${userId}`);
        console.log(`[DELETE SVC] SUCCÈS: Intégration supprimée avec ID=${integrationId}`);
        
        // Double-vérification pour confirmer que l'entrée n'existe plus
        const verificationCheck = await supabase
          .from('integrations')
          .select('id')
          .eq('id', integrationId)
          .maybeSingle();
        
        console.log(`[DELETE SVC] Vérification post-suppression:`, verificationCheck.data);
        
        if (verificationCheck.data) {
          console.log(`[DELETE SVC] ALERTE: L'intégration existe toujours après suppression!`);
          return false;
        }
        
        return true;
      } else {
        this.logger.error(`La suppression n'a supprimé aucune ligne pour l'intégration ${service} (ID=${integrationId})`);
        console.log(`[DELETE SVC] Aucune donnée supprimée malgré l'absence d'erreur!`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Exception lors de la suppression de l'intégration ${service}: ${error.message}`, error.stack);
      console.log(`[DELETE SVC] Exception lors de la suppression:`, error);
      return false;
    }
  }
}
