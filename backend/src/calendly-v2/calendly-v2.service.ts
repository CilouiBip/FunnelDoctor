import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom } from 'rxjs';
import { CalendlyWebhookPayloadDto } from './dto/webhook-payload.dto';
import { BridgingService } from '../bridging/bridging.service';
import { TouchpointsService } from '../touchpoints/touchpoints.service';
import { MasterLeadService } from '../leads/services/master-lead.service';
import { IntegrationsService, IntegrationType } from '../integrations/integrations.service';

@Injectable()
export class CalendlyV2Service {
  private readonly logger = new Logger(CalendlyV2Service.name);
  private readonly apiBaseUrl = 'https://api.calendly.com';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly bridgingService: BridgingService,
    private readonly touchpointsService: TouchpointsService,
    private readonly masterLeadService: MasterLeadService,
    private readonly integrationsService: IntegrationsService,
  ) {
    this.logger.log('CalendlyV2Service initialisé - utilisation des clés API par utilisateur');
  }
  
  /**
   * Génère les en-têtes HTTP pour les requêtes Calendly en utilisant la clé API de l'utilisateur
   * @param userId ID de l'utilisateur pour récupérer sa clé API Calendly
   * @returns Les en-têtes HTTP avec le jeton d'authentification
   * @throws UnauthorizedException si l'intégration n'est pas configurée pour cet utilisateur
   */
  private async getAuthHeaders(userId: string): Promise<Record<string, string>> {
    try {
      // Récupérer la configuration de l'intégration Calendly pour cet utilisateur
      const config = await this.integrationsService.getIntegrationConfig(userId, 'calendly');
      
      if (!config || !config.api_key) {
        this.logger.error(`Aucune clé API Calendly trouvée pour l'utilisateur ${userId}`);
        throw new UnauthorizedException('Intégration Calendly non configurée pour cet utilisateur');
      }
      
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.api_key}`
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des en-têtes d'authentification Calendly: ${error.message}`);
      throw error;
    }
  }

  /**
   * Récupère les informations de l'utilisateur Calendly actuel
   * @param userId ID de l'utilisateur pour récupérer sa clé API Calendly
   * @returns Les informations de l'utilisateur Calendly
   */
  async getCurrentUser(userId: string) {
    try {
      const headers = await this.getAuthHeaders(userId);
      
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.apiBaseUrl}/users/me`, { headers }).pipe(
          catchError((error) => {
            this.logger.error(`Error fetching current user: ${error.message}`, error.stack);
            throw error;
          }),
        ),
      );
      return data;
    } catch (error) {
      this.logger.error(`Failed to get current user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Récupère les types d'événements disponibles
   * @param userId ID de l'utilisateur pour récupérer sa clé API Calendly
   */
  async getEventTypes(userId: string) {
    try {
      const currentUser = await this.getCurrentUser(userId);
      const userUri = currentUser.resource.uri;
      const headers = await this.getAuthHeaders(userId);
      
      const { data } = await firstValueFrom(
        this.httpService.get(
          `${this.apiBaseUrl}/event_types?user=${userUri}`, 
          { headers }
        ).pipe(
          catchError((error) => {
            this.logger.error(`Error fetching event types: ${error.message}`, error.stack);
            throw error;
          }),
        ),
      );
      return data;
    } catch (error) {
      this.logger.error(`Failed to get event types: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Crée un webhook Calendly
   * @param callbackUrl URL de callback pour les événements webhook
   * @param events Types d'événements à recevoir
   * @param userId ID de l'utilisateur pour récupérer sa clé API Calendly
   */
  async createWebhook(callbackUrl: string, events: string[], userId: string) {
    try {
      const headers = await this.getAuthHeaders(userId);
      const currentUser = await this.getCurrentUser(userId);
      const organizationUri = currentUser.resource.current_organization;
      
      const payload = {
        url: callbackUrl,
        events,
        organization: organizationUri,
        scope: 'organization',
      };
      
      const { data } = await firstValueFrom(
        this.httpService.post(
          `${this.apiBaseUrl}/webhook_subscriptions`,
          payload,
          { headers }
        ).pipe(
          catchError((error) => {
            this.logger.error(`Error creating webhook: ${error.message}`, error.stack);
            throw error;
          }),
        ),
      );
      return data;
    } catch (error) {
      this.logger.error(`Failed to create webhook: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Liste les webhooks existants
   * @param userId ID de l'utilisateur pour récupérer sa clé API Calendly
   */
  async listWebhooks(userId: string) {
    try {
      const headers = await this.getAuthHeaders(userId);
      const currentUser = await this.getCurrentUser(userId);
      const organizationUri = currentUser.resource.current_organization;
      
      const { data } = await firstValueFrom(
        this.httpService.get(
          `${this.apiBaseUrl}/webhook_subscriptions?organization=${organizationUri}&scope=organization`,
          { headers }
        ).pipe(
          catchError((error) => {
            this.logger.error(`Error listing webhooks: ${error.message}`, error.stack);
            throw error;
          }),
        ),
      );
      return data;
    } catch (error) {
      this.logger.error(`Failed to list webhooks: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Supprime un webhook
   * @param webhookUuid UUID du webhook à supprimer
   * @param userId ID de l'utilisateur pour récupérer sa clé API Calendly
   */
  async deleteWebhook(webhookUuid: string, userId: string) {
    try {
      const headers = await this.getAuthHeaders(userId);
      
      await firstValueFrom(
        this.httpService.delete(
          `${this.apiBaseUrl}/webhook_subscriptions/${webhookUuid}`,
          { headers }
        ).pipe(
          catchError((error) => {
            this.logger.error(`Error deleting webhook: ${error.message}`, error.stack);
            throw error;
          }),
        ),
      );
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to delete webhook: ${error.message}`);
      throw error;
    }
  }

  /**
   * Configure un webhook Calendly pour un utilisateur après l'authentification OAuth2
   * @param userId ID de l'utilisateur pour lequel créer le webhook
   * @returns Résultat de la création du webhook
   */
  async setupWebhookForUser(userId: string) {
    try {
      this.logger.log(`Configuration du webhook Calendly pour l'utilisateur ${userId}`);
      
      // Récupérer les tokens OAuth2 de l'utilisateur
      const config = await this.integrationsService.getIntegrationConfig(userId, 'calendly');
      if (!config || !config.access_token) {
        throw new Error('Intégration Calendly non configurée ou access_token manquant');
      }
      
      // Préparer les en-têtes avec le token OAuth2
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.access_token}`
      };
      
      // Récupérer les informations de l'utilisateur et de l'organisation Calendly
      const { data: userData } = await firstValueFrom(
        this.httpService.get(`${this.apiBaseUrl}/users/me`, { headers }).pipe(
          catchError((error) => {
            this.logger.error(`Erreur lors de la récupération des infos utilisateur: ${error.message}`, error.stack);
            throw new Error(`Impossible de récupérer les informations utilisateur: ${error.response?.data?.message || error.message}`);
          })
        )
      );
      
      const userUri = userData.resource.uri;
      const organizationUri = userData.resource.current_organization;
      
      // Construire l'URL de callback pour le webhook
      const baseUrl = this.configService.get<string>('BACKEND_URL') || 'http://localhost:3001';
      const callbackUrl = `${baseUrl}/api/rdv/webhook-v2`;
      this.logger.log(`URL de callback Calendly configurée: ${callbackUrl}`);
      
      // Définir les événements que nous voulons écouter
      const events = ['invitee.created', 'invitee.canceled'];
      
      // Vérifier si un webhook existe déjà pour cette organisation
      const { data: webhooks } = await firstValueFrom(
        this.httpService.get(
          `${this.apiBaseUrl}/webhook_subscriptions?organization=${organizationUri}&scope=organization`,
          { headers }
        ).pipe(
          catchError((error) => {
            this.logger.error(`Erreur lors de la liste des webhooks: ${error.message}`, error.stack);
            throw new Error(`Impossible de lister les webhooks existants: ${error.response?.data?.message || error.message}`);
          })
        )
      );
      
      // Supprimer les webhooks existants avant d'en créer un nouveau
      if (webhooks && webhooks.collection && webhooks.collection.length > 0) {
        for (const webhook of webhooks.collection) {
          try {
            await firstValueFrom(
              this.httpService.delete(
                `${this.apiBaseUrl}/webhook_subscriptions/${webhook.uri.split('/').pop()}`,
                { headers }
              )
            );
            this.logger.log(`Webhook existant supprimé: ${webhook.uri}`);
          } catch (deleteError) {
            this.logger.warn(`Impossible de supprimer le webhook existant: ${deleteError.message}`);
            // Continuer malgré l'erreur
          }
        }
      }
      
      // Créer le nouveau webhook
      const payload = {
        url: callbackUrl,
        events,
        organization: organizationUri,
        user: userUri,
        scope: 'organization'
      };
      
      const { data } = await firstValueFrom(
        this.httpService.post(
          `${this.apiBaseUrl}/webhook_subscriptions`,
          payload,
          { headers }
        ).pipe(
          catchError((error) => {
            this.logger.error(`Erreur lors de la création du webhook: ${error.message}`, error.stack);
            throw new Error(`Impossible de créer le webhook: ${error.response?.data?.message || error.message}`);
          })
        )
      );
      
      this.logger.log(`Webhook Calendly créé avec succès pour l'utilisateur ${userId}`);
      return data;
    } catch (error) {
      this.logger.error(`Échec de la configuration du webhook Calendly: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Récupère les détails d'un événement programmé
   * @param uuid UUID de l'événement programmé
   * @param userId ID de l'utilisateur pour récupérer sa clé API Calendly
   */
  async getScheduledEvent(uuid: string, userId: string) {
    try {
      const headers = await this.getAuthHeaders(userId);
      
      const { data } = await firstValueFrom(
        this.httpService.get(
          `${this.apiBaseUrl}/scheduled_events/${uuid}`,
          { headers }
        ).pipe(
          catchError((error) => {
            this.logger.error(`Error fetching scheduled event: ${error.message}`, error.stack);
            throw error;
          }),
        ),
      );
      return data;
    } catch (error) {
      this.logger.error(`Failed to get scheduled event: ${error.message}`);
      throw error;
    }
  }

  /**
   * Récupère les détails d'un invité
   * @param eventUuid UUID de l'événement
   * @param inviteeUuid UUID de l'invité
   * @param userId ID de l'utilisateur pour récupérer sa clé API Calendly
   */
  async getInvitee(eventUuid: string, inviteeUuid: string, userId: string) {
    try {
      const headers = await this.getAuthHeaders(userId);
      
      const { data } = await firstValueFrom(
        this.httpService.get(
          `${this.apiBaseUrl}/scheduled_events/${eventUuid}/invitees/${inviteeUuid}`,
          { headers }
        ).pipe(
          catchError((error) => {
            this.logger.error(`Error fetching invitee: ${error.message}`, error.stack);
            throw error;
          }),
        ),
      );
      return data;
    } catch (error) {
      this.logger.error(`Failed to get invitee: ${error.message}`);
      throw error;
    }
  }

  /**
   * Traite un événement webhook Calendly
   * Extrait les informations importantes et crée les associations et touchpoints nécessaires
   * @param payload Données du webhook
   * @param userId ID de l'utilisateur (optionnel)
   */
  /**
   * Extrait l'ID utilisateur du nom d'organisation ou de l'UUID de l'événement Calendly
   * @param resource Données de l'événement Calendly
   * @returns ID utilisateur ou null si non trouvé
   */
  private extractUserIdFromCalendlyEvent(resource: any): string | null {
    // Dans la version MVP simplifiée, on retourne null si l'ID n'est pas trouvé
    return null;
  }

  /**
   * Extrait le visitor_id des informations de tracking UTM
   * @param resource Données de l'événement Calendly
   * @returns visitor_id ou undefined si non trouvé
   */
  private extractVisitorIdFromResource(resource: any): string | undefined {
    if (resource.tracking) {
      // Chercher dans utm_content
      if (resource.tracking.utm_content) {
        this.logger.log(`Visitor ID trouvé dans utm_content: ${resource.tracking.utm_content}`);
        return resource.tracking.utm_content;
      }
      // Chercher dans utm_visitor_id comme alternative
      if (resource.tracking.utm_visitor_id) {
        this.logger.log(`Visitor ID trouvé dans utm_visitor_id: ${resource.tracking.utm_visitor_id}`);
        return resource.tracking.utm_visitor_id;
      }
    }
    return undefined;
  }

  async processWebhookEvent(payload: CalendlyWebhookPayloadDto, userId?: string) {
    this.logger.log(`Traitement événement webhook Calendly: ${payload.event}`);
    
    // DEBUG: Ajout de logs détaillés pour analyser le payload
    this.logger.log(`[DEBUG-WEBHOOK] Contenu partiel du payload: ${JSON.stringify(payload).substring(0, 500)}...`);

    // Extraire l'information d'organisation et/ou d'utilisateur pour identifier le propriétaire
    let resolvedUserId: string | undefined = userId;
    if (!resolvedUserId && payload.payload) {
      // DEBUG: Analyser les chemins potentiels pour les URIs dans le payload
      this.logger.log(`[DEBUG-WEBHOOK] Analyse de la structure payload.payload: ${JSON.stringify(payload.payload, null, 2).substring(0, 500)}...`);
      
      if (payload.payload.organization) {
        this.logger.log(`[DEBUG-WEBHOOK] organization trouvée dans payload.payload: ${payload.payload.organization}`);
      }
      
      if (payload.payload.scheduled_event?.organization) {
        this.logger.log(`[DEBUG-WEBHOOK] organization trouvée dans payload.payload.scheduled_event: ${payload.payload.scheduled_event.organization}`);
      }
      
      if (payload.payload.user?.uri) {
        this.logger.log(`[DEBUG-WEBHOOK] user.uri trouvée dans payload.payload: ${payload.payload.user.uri}`);
      }
      
      // Vérifier d'autres chemins potentiels pour les URIs
      const anyPayload = payload as any;  // Cast to any pour éviter les erreurs TypeScript
      if (anyPayload.created_by) {
        this.logger.log(`[DEBUG-WEBHOOK] created_by trouvé dans payload: ${JSON.stringify(anyPayload.created_by)}`);
      }
      
      // Vérifier si event_memberships existe (peut être absent du type)
      const scheduledEvent = payload.payload.scheduled_event as any;
      if (scheduledEvent?.event_memberships) {
        this.logger.log(`[DEBUG-WEBHOOK] event_memberships trouvés: ${JSON.stringify(scheduledEvent.event_memberships)}`);
      }

      // Extraire l'URI de l'organisation depuis le payload (mêmes sources qu'avant, mais avec plus de logs)
      const ownerUri = payload.payload.organization || 
                      (payload.payload.scheduled_event && payload.payload.scheduled_event.organization) ||
                      (payload.payload.user && payload.payload.user.uri);
      
      this.logger.log(`[DEBUG-WEBHOOK] ownerUri extrait: ${ownerUri}`);
      
      const detailsToSearch: Record<string, string> = {};
      
      // Préparer les détails de recherche avec logs
      if (ownerUri) {
        detailsToSearch.organization_uri = ownerUri;
        this.logger.log(`[DEBUG-WEBHOOK] Ajout organization_uri à detailsToSearch: ${ownerUri}`);
      }
      
      if (payload.payload.user && payload.payload.user.uri) {
        detailsToSearch.user_uri = payload.payload.user.uri;
        this.logger.log(`[DEBUG-WEBHOOK] Ajout user_uri à detailsToSearch: ${payload.payload.user.uri}`);
      }
      
      // Ajouter d'autres sources potentielles d'URIs si elles existent
      // Réutiliser la variable anyPayload déjà déclarée plus haut
      if (anyPayload.created_by && anyPayload.created_by.uri) {
        detailsToSearch.created_by_uri = anyPayload.created_by.uri;
        this.logger.log(`[DEBUG-WEBHOOK] Ajout created_by_uri à detailsToSearch: ${anyPayload.created_by.uri}`);
      }
      
      // Rechercher l'utilisateur dans la base de données si on a des détails
      if (Object.keys(detailsToSearch).length > 0) {
        this.logger.log(`[DEBUG-WEBHOOK] Recherche d'utilisateur avec les détails: ${JSON.stringify(detailsToSearch)}`);
        try {
          const foundUserId = await this.integrationsService.findUserIdByIntegrationDetails('calendly', detailsToSearch);
          this.logger.log(`[DEBUG-WEBHOOK] Résultat de la recherche d'utilisateur: ${foundUserId || 'null'}`);
          if (foundUserId) {
            resolvedUserId = foundUserId;
            this.logger.log(`UserId trouvé pour l'événement Calendly: ${resolvedUserId}`);
          } else {
            this.logger.warn(`[DEBUG-WEBHOOK] Aucun utilisateur trouvé avec les détails fournis`);
          }
        } catch (error) {
          this.logger.error(`Erreur lors de la recherche du userId: ${error.message}`);
        }
      } else {
        this.logger.warn(`[DEBUG-WEBHOOK] Aucun détail pour la recherche d'utilisateur n'a été extrait du payload`);
      }
      
      if (!resolvedUserId) {
        this.logger.error(`Could not resolve userId for Calendly event`);
        return { success: false, message: 'Could not resolve user for event' };
      }
    } else if (!resolvedUserId) {
      // Si on n'a AUCUN moyen de trouver le userId, on ne peut pas traiter.
      this.logger.error(`Cannot process Calendly webhook without userId`);
      return { success: false, message: 'Cannot process webhook without user context' };
    }

    // Switch pour router vers les méthodes privées
    switch (payload.event) {
      case 'invitee.created':
        // IMPORTANT: Passer payload.payload (qui contient invitee, scheduled_event etc.) et le userId résolu
        return this._handleInviteeCreated(payload.payload, resolvedUserId); 
      case 'invitee.canceled':
         // IMPORTANT: Passer payload.payload et le userId résolu
        return this._handleInviteeCanceled(payload.payload, resolvedUserId);
      default:
        this.logger.warn(`Type d'événement Calendly non géré: ${payload.event}`);
        return { success: true, message: `Événement ignoré (non géré): ${payload.event}` }; // Retourne succès pour que Calendly ne retente pas
    }
  }

  /**
   * Traite un événement de création d'invité (RDV programmé)
   * @param inviteePayload Données du payload Calendly (invitee, scheduled_event, etc.)
   * @param userId ID de l'utilisateur (optionnel)
   * @returns Objet avec statut de succès et données associées
   */
  private async _handleInviteeCreated(inviteePayload: any, userId?: string) {
    this.logger.log(`Traitement d'un événement invitee.created`);
    
    // Vérifier que les données essentielles sont présentes
    if (!inviteePayload || !inviteePayload.invitee || !inviteePayload.invitee.email) {
      this.logger.error('Données d\'invité manquantes dans le payload');
      return { success: false, error: 'Missing invitee data' };
    }
    
    const invitee = inviteePayload.invitee;
    const email = invitee.email;

    // Récupérer le visitor_id des params UTM si disponible
    let visitorIdFromUtm = this.extractVisitorIdFromResource(inviteePayload);
    
    // 2. Chercher Visitor ID via Bridge (Fallback si pas dans UTM)
    let finalVisitorId = visitorIdFromUtm;
    if (!finalVisitorId) {
        try {
            // Appel simple pour lire la table bridge
            const visitorIdFromBridge = await this.bridgingService.findVisitorIdByEmail(email);
            if (visitorIdFromBridge) {
                finalVisitorId = visitorIdFromBridge; // Assigner si trouvé
                this.logger.log(`_handleInviteeCreated: Visitor ID trouvé via Bridge: ${finalVisitorId}`);
            } else {
                 this.logger.log(`_handleInviteeCreated: Aucun Visitor ID trouvé via Bridge pour ${email}`);
            }
        } catch (bridgeError) {
             this.logger.warn(`_handleInviteeCreated: Erreur lors de la recherche Bridge pour ${email}: ${bridgeError.message}`);
             // Continuer sans ID du bridge en cas d'erreur de lecture
        }
    }
    
    // Si toujours pas de visitor_id, générer un UUID pour Calendly
    if (!finalVisitorId) {
      finalVisitorId = `calendly_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      this.logger.log(`Génération d'un visitor_id pour Calendly: ${finalVisitorId}`);
    }

    try {
      
      // Utiliser MasterLeadService pour obtenir ou créer un master lead
      const masterLead = await this.masterLeadService.findOrCreateMasterLead(
        { email: email, visitor_id: finalVisitorId },
        userId,
        'calendly'
      );
      
      // Créer un touchpoint pour l'événement rdv_scheduled
      try {
        const touchpointData = {
          visitor_id: finalVisitorId,
          master_lead_id: masterLead.id,
          event_type: 'rdv_scheduled',
          event_data: {
            calendly_event_uri: inviteePayload.scheduled_event?.uri,
            scheduled_time: inviteePayload.scheduled_event?.start_time,
            invitee_email: email,
            invitee_name: invitee.name,
            event_name: inviteePayload.event_type?.name,
            event_id: inviteePayload.scheduled_event?.uuid || inviteePayload.scheduled_event?.id,
          },
          page_url: inviteePayload.tracking?.utm_source 
            ? `utm_source=${inviteePayload.tracking.utm_source}` 
            : undefined,
        };
        
        const touchpoint = await this.touchpointsService.create(touchpointData);
        this.logger.log(`Touchpoint 'rdv_scheduled' créé avec succès: ${touchpoint.id}`);
      } catch (touchpointError) {
        this.logger.error(`Erreur lors de la création du touchpoint: ${touchpointError.message}`, touchpointError);
        // On continue même en cas d'erreur de création du touchpoint
      }
      
      return {
        success: true,
        lead_id: masterLead.id,
        visitor_id: finalVisitorId,
        email: email
      };
    } catch (error) {
      this.logger.error(`Erreur lors du traitement de l'événement invitee.created: ${error.message}`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Traite un événement d'annulation d'invité (RDV annulé)
   * @param inviteePayload Données du payload Calendly (invitee, scheduled_event, etc.)
   * @param userId ID de l'utilisateur (optionnel)
   * @returns Objet avec statut de succès et données associées
   */
  private async _handleInviteeCanceled(inviteePayload: any, userId?: string) {
    this.logger.log(`Traitement d'un événement invitee.canceled`);
    
    // Vérifier que les données essentielles sont présentes
    if (!inviteePayload || !inviteePayload.invitee || !inviteePayload.invitee.email) {
      this.logger.error('Données d\'invité manquantes dans le payload');
      return { success: false, error: 'Missing invitee data' };
    }
    
    const invitee = inviteePayload.invitee;
    const email = invitee.email;

    // Récupérer le visitor_id des params UTM si disponible
    let visitorIdFromUtm = this.extractVisitorIdFromResource(inviteePayload);
    
    try {
      // Utiliser MasterLeadService pour obtenir ou créer un master lead
      const masterLead = await this.masterLeadService.findOrCreateMasterLead(
        { email: email, visitor_id: visitorIdFromUtm },
        userId,
        'calendly'
      );
      
      // Générer un visitor_id spécifique pour l'annulation si besoin
      const visitorIdForTouchpoint = visitorIdFromUtm || `calendly_cancel_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      // Créer un touchpoint pour l'événement rdv_canceled
      try {
        const touchpointData = {
          visitor_id: visitorIdForTouchpoint,
          master_lead_id: masterLead.id,
          event_type: 'rdv_canceled',
          event_data: {
            calendly_event_uri: inviteePayload.scheduled_event?.uri,
            scheduled_time: inviteePayload.scheduled_event?.start_time,
            canceled_time: new Date().toISOString(),
            invitee_email: email,
            invitee_name: invitee.name,
            event_name: inviteePayload.event_type?.name,
            event_id: inviteePayload.scheduled_event?.uuid || inviteePayload.scheduled_event?.id,
          },
          page_url: inviteePayload.tracking?.utm_source 
            ? `utm_source=${inviteePayload.tracking.utm_source}` 
            : undefined,
        };
        
        const touchpoint = await this.touchpointsService.create(touchpointData);
        this.logger.log(`Touchpoint 'rdv_canceled' créé avec succès: ${touchpoint.id}`);
      } catch (touchpointError) {
        this.logger.error(`Erreur lors de la création du touchpoint: ${touchpointError.message}`, touchpointError);
        // On continue même en cas d'erreur de création du touchpoint
      }
      
      return {
        success: true,
        lead_id: masterLead.id,
        visitor_id: visitorIdFromUtm,
        email: email
      };
    } catch (error) {
      this.logger.error(`Erreur lors du traitement de l'événement invitee.canceled: ${error.message}`, error);
      return { success: false, error: error.message };
    }
  }
}
