import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, NotFoundException, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
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
    this.logger.log('CalendlyV2Service initialisé');
  }

  /**
   * Extrait le visitor_id des informations de tracking UTM
   * @param resource Données de l'événement Calendly
   * @returns visitor_id ou undefined si non trouvé
   */
  private extractVisitorIdFromResource(resource: any): string | undefined {
    if (resource?.tracking) {
      // Chercher dans utm_content d'abord
      if (resource.tracking.utm_content && typeof resource.tracking.utm_content === 'string') {
        this.logger.log(`[Stitching] Visitor ID trouvé dans utm_content: ${resource.tracking.utm_content}`);
        return resource.tracking.utm_content;
      }
      // Chercher dans utm_visitor_id comme alternative
      // Note: ce champ n'est pas standard Calendly, mais on le garde au cas où
      if (resource.tracking.utm_visitor_id && typeof resource.tracking.utm_visitor_id === 'string') { 
        this.logger.log(`[Stitching] Visitor ID trouvé dans utm_visitor_id: ${resource.tracking.utm_visitor_id}`);
        return resource.tracking.utm_visitor_id;
      }
    }
    this.logger.log(`[Stitching] Aucun Visitor ID trouvé dans les UTM.`);
    return undefined;
  }

  // --- Méthodes utilisant la clé API (Conservées mais moins utilisées pour le flux principal OAuth/Webhook) ---

  private async getAuthHeadersFromApiKey(userId: string): Promise<Record<string, string>> {
     // Cette méthode n'est probablement plus utilisée si on se base sur OAuth pour tout.
     // À vérifier et potentiellement supprimer si non nécessaire.
    try {
      const config = await this.integrationsService.getIntegrationConfig(userId, 'calendly');
      if (!config || !config.api_key) { // api_key est l'ancien nom potentiel ou PAT? À clarifier.
        this.logger.error(`Aucune clé API/PAT Calendly trouvée pour l'utilisateur ${userId}`);
        throw new UnauthorizedException('Intégration Calendly (API Key/PAT) non configurée');
      }
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.api_key}` // Utiliser api_key ou personal_access_token ?
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des en-têtes d'authentification Calendly (API Key): ${error.message}`);
      throw error;
    }
  }

  async getCurrentUserUsingApiKey(userId: string) {
    // Utilise l'API Key/PAT, potentiellement utile pour des vérifications ponctuelles indépendantes de l'OAuth
    try {
      const headers = await this.getAuthHeadersFromApiKey(userId);
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.apiBaseUrl}/users/me`, { headers }).pipe(
          catchError((error) => {
            this.logger.error(`Error fetching current user via API Key: ${error.message}`, error.stack);
            throw error;
          }),
        ),
      );
      return data;
    } catch (error) {
      this.logger.error(`Failed to get current user via API Key: ${error.message}`);
      throw error;
    }
  }

  // ... (autres méthodes potentielles utilisant getAuthHeadersFromApiKey : getEventTypes, createWebhook, listWebhooks, deleteWebhook si elles devaient utiliser PAT)
  // Pour l'instant, on se concentre sur le flux OAuth / Webhook V2.

  // --- Méthodes pour le flux OAuth et Webhook V2 ---

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
        throw new Error('Intégration Calendly OAuth non configurée ou access_token manquant');
      }
      if (!config.user_uri || !config.organization_uri) {
         this.logger.error(`URIs manquantes dans la config pour userId ${userId}. Reconnexion OAuth nécessaire?`);
         throw new Error('Informations utilisateur/organisation Calendly manquantes dans la configuration sauvegardée.');
      }

      // Préparer les en-têtes avec le token OAuth2
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.access_token}`
      };

      // Utiliser les URIs stockées lors de l'OAuth
      const userUri = config.user_uri;
      const organizationUri = config.organization_uri;

      // Construire l'URL de callback pour le webhook
      const baseUrl = this.configService.get<string>('BACKEND_URL');
      if (!baseUrl) {
          throw new Error('Variable BACKEND_URL non configurée dans .env');
      }
      const callbackUrl = `${baseUrl}/api/rdv/webhook-v2`; // URL corrigée et sans userId
      this.logger.log(`URL de callback Calendly configurée: ${callbackUrl}`);

      // Définir les événements que nous voulons écouter
      const events = ['invitee.created', 'invitee.canceled'];

      // Vérifier si un webhook existe déjà pour cette organisation et cette URL (pour éviter doublons inutiles)
      const listResponse = await firstValueFrom(
        this.httpService.get(
          `${this.apiBaseUrl}/webhook_subscriptions?organization=${organizationUri}&scope=organization`,
          { headers }
        ).pipe(
          catchError((error) => {
            this.logger.error(`Erreur lors de la liste des webhooks: ${error.response?.status} ${error.message}`, error.stack);
            // Ne pas bloquer si la liste échoue, mais logguer
            return [{ collection: [] }]; // Retourner un objet vide pour continuer
          })
        )
      );

      // Accéder aux webhooks en vérifiant si 'data' existe (succès) ou 'collection' (fallback erreur)
      const webhooks = (listResponse as any)?.data?.collection || (listResponse as any)?.[0]?.collection || [];
      
      // Supprimer les webhooks existants pointant vers NOTRE callbackUrl pour CETTE organisation (nettoyage)
      if (webhooks && webhooks.length > 0) {
        this.logger.log(`Vérification des webhooks existants pour l'organisation ${organizationUri}...`);
        for (const webhook of webhooks) {
          if (webhook.url === callbackUrl) {
            try {
              await firstValueFrom(
                this.httpService.delete(webhook.uri, { headers }) // Utiliser l'URI directe du webhook
              );
              this.logger.log(`Webhook existant pour notre URL supprimé: ${webhook.uri}`);
            } catch (deleteError) {
              this.logger.warn(`Impossible de supprimer le webhook existant (${webhook.uri}): ${deleteError.message}`);
              // Continuer malgré l'erreur
            }
          }
        }
      }

      // Créer le nouveau webhook (Calendly V2 recommande scope 'organization' ou 'user' basé sur besoin)
      // Utiliser scope 'organization' est souvent plus simple si l'admin connecte le compte.
      // Si chaque user connecte son propre compte Calendly, 'user' pourrait être plus approprié. À confirmer.
      const payload = {
        url: callbackUrl,
        events,
        organization: organizationUri,
        scope: 'organization', // Ou 'user' si chaque user a son compte propre ?
        // user: userUri // Nécessaire seulement si scope = 'user'
      };

      const { data } = await firstValueFrom(
        this.httpService.post(
          `${this.apiBaseUrl}/webhook_subscriptions`,
          payload,
          { headers }
        ).pipe(
          catchError((error) => {
            this.logger.error(`Erreur lors de la création du webhook: ${error.response?.status} ${error.message}`, error.response?.data || error.stack);
            throw new Error(`Impossible de créer le webhook: ${error.response?.data?.message || error.message}`);
          })
        )
      );

      this.logger.log(`Webhook Calendly créé/mis à jour avec succès pour l'organisation ${organizationUri} (associée à l'utilisateur ${userId})`);
      return data;
    } catch (error) {
      this.logger.error(`Échec de la configuration du webhook Calendly pour l'utilisateur ${userId}: ${error.message}`, error.stack);
      throw error; // Renvoyer l'erreur pour informer le processus OAuth
    }
  }


  /**
   * Traite un événement webhook Calendly reçu
   * Identifie l'utilisateur FunnelDoctor correspondant et route l'événement
   * @param payload Données complètes du webhook (incluant event, created_at, payload interne)
   */
  async processWebhookEvent(payload: CalendlyWebhookPayloadDto) {
    this.logger.log(`Traitement événement webhook Calendly: ${payload.event}`);
    this.logger.log(`[DEBUG-WEBHOOK] Contenu partiel du payload: ${JSON.stringify(payload).substring(0, 500)}...`);

    let resolvedUserId: string | undefined;
    let extractedUserUri: string | undefined = undefined;
    let extractedOrgUri: string | undefined = undefined;

    // --- Début Section Corrigée pour l'Extraction d'URI ---
    try {
        // 1. Essayer d'extraire l'URI depuis event_memberships (plus spécifique à l'événement)
        if ((payload.payload?.scheduled_event as any)?.event_memberships && (payload.payload.scheduled_event as any).event_memberships.length > 0) {
            // Vérifier explicitement la structure pour s'assurer d'extraire le bon champ
            const membershipUser = (payload.payload.scheduled_event as any).event_memberships[0]?.user;
            this.logger.log(`[DEBUG-WEBHOOK] Contenu de event_memberships[0].user: ${JSON.stringify(membershipUser)}`);
            
            // Extraire l'URI du user de event_memberships - essayer différents chemins possibles
            if (typeof membershipUser === 'string') {
                extractedUserUri = membershipUser;
            } else if (membershipUser && typeof membershipUser === 'object') {
                // Il pourrait être un objet avec une propriété uri
                extractedUserUri = membershipUser.uri;
                
                // Si ce n'est pas trouvable directement, essayer de parcourir les propriétés
                if (!extractedUserUri) {
                    this.logger.log(`[DEBUG-WEBHOOK] Exploration approfondie de membershipUser: ${Object.keys(membershipUser).join(', ')}`);
                    // Tenter d'identifier le champ contenant l'URI
                    for (const key of Object.keys(membershipUser)) {
                        if (key.includes('uri') || key.includes('url') || key.includes('id')) {
                            extractedUserUri = membershipUser[key];
                            this.logger.log(`[DEBUG-WEBHOOK] URI potentielle trouvée dans la clé ${key}: ${extractedUserUri}`);
                            break;
                        }
                    }
                }
            }
            
            if (extractedUserUri) {
                this.logger.log(`[DEBUG-WEBHOOK] URI utilisateur extraite avec succès de event_memberships: ${extractedUserUri}`);
            } else {
                this.logger.log(`[DEBUG-WEBHOOK] Aucune URI trouvée dans event_memberships après analyse approfondie`);
            }
        } else {
            this.logger.log(`[DEBUG-WEBHOOK] Pas d'event_memberships trouvés dans le payload`);
        }
        
        // 2. Si toujours pas trouvé, essayer d'extraire depuis created_by
        if (!extractedUserUri && (payload as any).created_by) {
            const createdBy = (payload as any).created_by;
            this.logger.log(`[DEBUG-WEBHOOK] Exploration de created_by: ${JSON.stringify(createdBy)}`);
            
            if (typeof createdBy === 'string') {
                extractedUserUri = createdBy;
            } else if (createdBy && typeof createdBy === 'object') {
                // Il pourrait être un objet avec une propriété uri
                extractedUserUri = createdBy.uri;
                
                // Si ce n'est pas trouvable directement, essayer de parcourir les propriétés
                if (!extractedUserUri) {
                    this.logger.log(`[DEBUG-WEBHOOK] Exploration approfondie de created_by: ${Object.keys(createdBy).join(', ')}`);
                    // Tenter d'identifier le champ contenant l'URI
                    for (const key of Object.keys(createdBy)) {
                        if (key.includes('uri') || key.includes('url') || key.includes('id')) {
                            extractedUserUri = createdBy[key];
                            this.logger.log(`[DEBUG-WEBHOOK] URI potentielle trouvée dans la clé ${key}: ${extractedUserUri}`);
                            break;
                        }
                    }
                }
            }
            
            if (extractedUserUri) {
                this.logger.log(`[DEBUG-WEBHOOK] URI utilisateur extraite avec succès de created_by: ${extractedUserUri}`);
            } else {
                this.logger.log(`[DEBUG-WEBHOOK] Aucune URI trouvée dans created_by après analyse approfondie`);
            }
        }

        // Essayer d'extraire l'URI d'organisation si possible (peut être utile pour la recherche)
        // Note: Elle n'était pas visible dans les logs précédents pour invitee.created, mais on essaie
        const orgUriFromPayload = payload.payload?.organization; // Chemin hypothétique
        if (orgUriFromPayload && typeof orgUriFromPayload === 'string') {
            extractedOrgUri = orgUriFromPayload;
             this.logger.log(`[DEBUG-WEBHOOK] URI Organisation extraite de payload.payload.organization: ${extractedOrgUri}`);
        } else {
             this.logger.log(`[DEBUG-WEBHOOK] URI Organisation non trouvée dans payload.payload.organization.`);
        }

        this.logger.log(`[DEBUG-WEBHOOK] URI utilisateur finale extraite: ${extractedUserUri || 'aucune'}`);
        this.logger.log(`[DEBUG-WEBHOOK] URI organisation finale extraite: ${extractedOrgUri || 'aucune'}`);


        // Préparer les détails pour la recherche dans notre DB
        const detailsToSearch: Record<string, string> = {};
        if (extractedUserUri) {
            detailsToSearch.user_uri = extractedUserUri;
        }
        if (extractedOrgUri) {
            detailsToSearch.organization_uri = extractedOrgUri;
        }

        // Rechercher le userId FunnelDoctor SEULEMENT si on a au moins une URI
        if (Object.keys(detailsToSearch).length > 0) {
            this.logger.log(`[DEBUG-WEBHOOK] Recherche d'utilisateur FunnelDoctor avec les détails: ${JSON.stringify(detailsToSearch)}`);
            try {
                const foundUserId = await this.integrationsService.findUserIdByIntegrationDetails('calendly', detailsToSearch);
                this.logger.log(`[DEBUG-WEBHOOK] Résultat de la recherche d'utilisateur FunnelDoctor: ${foundUserId || 'non trouvé'}`);
                if (foundUserId) {
                    resolvedUserId = foundUserId;
                    this.logger.log(`[DEBUG-WEBHOOK] UserId FunnelDoctor trouvé pour l'événement Calendly: ${resolvedUserId}`);
                } else {
                    this.logger.warn(`[DEBUG-WEBHOOK] Aucun utilisateur FunnelDoctor trouvé avec les détails fournis: ${JSON.stringify(detailsToSearch)}`);
                     // Que faire si aucun utilisateur n'est trouvé? Ignorer? Logguer + ignorer?
                     // Pour l'instant, on retourne une erreur car on ne peut pas traiter sans utilisateur.
                     return { success: false, message: 'Could not find matching FunnelDoctor user for this Calendly event' };
                }
            } catch (error) {
                this.logger.error(`[DEBUG-WEBHOOK] Erreur lors de la recherche du userId FunnelDoctor: ${error.message}`, error.stack);
                // Retourner une erreur si la recherche échoue
                 return { success: false, message: `Error finding FunnelDoctor user: ${error.message}` };
            }
        } else {
             this.logger.error("[DEBUG-WEBHOOK] Aucune URI utilisateur ou organisation n'a pu être extraite du payload. Impossible de rechercher l'utilisateur FunnelDoctor.");
             // On ne peut pas continuer sans URI de référence
             return { success: false, message: 'Could not extract user/org URI from webhook payload' };
        }

    } catch (extractionError) {
        // Attraper toute erreur inattendue pendant l'extraction/recherche
        this.logger.error(`Erreur inattendue lors de l'extraction/recherche userId : ${extractionError.message}`, extractionError.stack);
         return { success: false, message: `Unexpected error during user resolution: ${extractionError.message}` };
    }
    // --- Fin Section Corrigée ---

    // Le reste du code dépend de la résolution réussie du userId
    if (!resolvedUserId) {
         // Ce cas ne devrait plus être atteint si on retourne/throw plus tôt, mais sécurité
        this.logger.error(`Could not resolve userId for Calendly event (vérification finale)`);
        throw new InternalServerErrorException('User ID could not be resolved for Calendly event');
    }


    // Switch pour router vers les méthodes privées en passant le userId résolu
    switch (payload.event) {
      case 'invitee.created':
        // IMPORTANT: Passer payload.payload (qui contient invitee, scheduled_event etc.) et le resolvedUserId
        return this._handleInviteeCreated(payload.payload, resolvedUserId);
      case 'invitee.canceled':
         // IMPORTANT: Passer payload.payload et le resolvedUserId
        return this._handleInviteeCanceled(payload.payload, resolvedUserId);
      default:
        this.logger.warn(`Type d'événement Calendly non géré: ${payload.event}`);
        return { success: true, message: `Événement ignoré (non géré): ${payload.event}` }; // Retourne succès pour que Calendly ne retente pas
    }
  }

  /**
   * Traite un événement de création d'invité (RDV programmé)
   * @param inviteePayload Données du payload Calendly (invitee, scheduled_event, etc.)
   * @param userId ID de l'utilisateur FunnelDoctor (maintenant obligatoire)
   * @returns Objet avec statut de succès et données associées
   */
  private async _handleInviteeCreated(inviteePayload: any, userId: string) { // userId est maintenant requis
    this.logger.log(`[User: ${userId}] Entrée dans _handleInviteeCreated`);
    
    // Logs pour voir exactement ce qu'on reçoit
    this.logger.debug(`[User: ${userId}] Type de inviteePayload: ${typeof inviteePayload}`);
    this.logger.debug(`[User: ${userId}] Contient invitee ?: ${inviteePayload?.hasOwnProperty('invitee')}`);
    if (inviteePayload?.invitee) {
         this.logger.debug(`[User: ${userId}] Type de inviteePayload.invitee: ${typeof inviteePayload.invitee}`);
         this.logger.debug(`[User: ${userId}] Contient email dans invitee ?: ${inviteePayload.invitee?.hasOwnProperty('email')}`);
         this.logger.debug(`[User: ${userId}] Valeur de inviteePayload.invitee.email: ${inviteePayload.invitee?.email}`);
    } else {
         this.logger.warn(`[User: ${userId}] inviteePayload.invitee est absent ou null/undefined.`);
    }
    // Log de la structure pour être sûr
    this.logger.debug(`[User: ${userId}] Structure partielle de inviteePayload: ${JSON.stringify(inviteePayload, null, 2)?.substring(0, 500)}...`);

    // Vérification de structure amendée pour correspondre au format réel du payload
    // Dans le payload réel, l'email est directement au niveau racine du payload, pas dans un sous-objet invitee
    this.logger.debug(`[User: ${userId}] Email dans le payload: ${inviteePayload?.email || 'non trouvé'}`);
    
    if (!inviteePayload?.email || typeof inviteePayload.email !== 'string') {
        this.logger.error(`[User: ${userId}] Données d'email invité manquantes ou invalides dans le payload invitee.created.`);
        throw new InternalServerErrorException('Invalid or missing invitee email in Calendly webhook payload');
    }
    
    // Si la condition passe, on peut continuer
    const email = inviteePayload.email;
    this.logger.log(`[User: ${userId}] Email invité validé: ${email}`);
    
    // Créer un objet invitee pour la compatibilité avec le reste du code
    const invitee = {
        email,
        name: inviteePayload.name,
        first_name: inviteePayload.first_name,
        last_name: inviteePayload.last_name
    };

    // Récupérer le visitor_id des params UTM si disponible
    let visitorIdFromUtm = this.extractVisitorIdFromResource(inviteePayload);
    this.logger.log(`[User: ${userId}] Visitor ID depuis UTM: ${visitorIdFromUtm || 'non trouvé'}`);

    // Chercher Visitor ID via Bridge (Fallback si pas dans UTM)
    let finalVisitorId = visitorIdFromUtm;
    if (!finalVisitorId && email) { // S'assurer qu'on a un email pour chercher
        try {
            const visitorIdFromBridge = await this.bridgingService.findVisitorIdByEmail(email);
            if (visitorIdFromBridge) {
                finalVisitorId = visitorIdFromBridge;
                this.logger.log(`[User: ${userId}] Visitor ID trouvé via Bridge pour ${email}: ${finalVisitorId}`);
            } else {
                 this.logger.log(`[User: ${userId}] Aucun Visitor ID trouvé via Bridge pour ${email}`);
            }
        } catch (bridgeError) {
             this.logger.warn(`[User: ${userId}] Erreur lors de la recherche Bridge pour ${email}: ${bridgeError.message}`);
             // Continuer sans ID du bridge en cas d'erreur
        }
    }

    // Si toujours pas de visitor_id, générer un UUID pour Calendly
    if (!finalVisitorId) {
      finalVisitorId = `calendly_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      this.logger.log(`[User: ${userId}] Génération d'un visitor_id fallback pour Calendly: ${finalVisitorId}`);
    }

    try {
      // Utiliser MasterLeadService pour obtenir ou créer un master lead ASSOCIÉ AU BON UTILISATEUR
      this.logger.log(`[User: ${userId}] Recherche/Création MasterLead avec email=${email}, visitor_id=${finalVisitorId}`);
      const masterLead = await this.masterLeadService.findOrCreateMasterLead(
        { email: email, visitor_id: finalVisitorId },
        userId, // Passer le userId résolu
        'calendly' // Source
      );
      this.logger.log(`[User: ${userId}] MasterLead trouvé/créé: ID=${masterLead.id}`);

      // Créer un touchpoint pour l'événement rdv_scheduled
      try {
        const touchpointData = {
          visitor_id: finalVisitorId,
          master_lead_id: masterLead.id,
          user_id: userId, // Ajouter le userId au touchpoint
          integration_type: 'calendly' as IntegrationType, // Préciser le type d'intégration
          event_type: 'rdv_scheduled',
          event_data: {
            calendly_event_uri: inviteePayload.scheduled_event?.uri,
            scheduled_time: inviteePayload.scheduled_event?.start_time,
            invitee_email: email,
            invitee_name: invitee.name,
            event_name: inviteePayload.event_type?.name, // Attention: event_type est un objet dans le payload, pas juste le nom
            event_type_uri: inviteePayload.event_type?.uri, // Sauvegarder l'URI du type d'event peut être utile
            event_id: inviteePayload.scheduled_event?.uri?.split('/').pop() || inviteePayload.scheduled_event?.uuid, // Utiliser l'URI de l'event pour l'ID est plus fiable
            invitee_uri: inviteePayload.uri // URI de l'invité
          },
          page_url: inviteePayload.tracking?.utm_source
            ? `utm_source=${inviteePayload.tracking.utm_source}` // Simplifié, peut-être stocker tout l'objet tracking?
            : undefined,
          // timestamp: new Date(payload.created_at) // Utiliser le created_at du webhook parent ? Ou laisser la DB gérer?
        };

        this.logger.log(`[User: ${userId}] Préparation des données du touchpoint: ${JSON.stringify(touchpointData)}`);
        const touchpoint = await this.touchpointsService.create(touchpointData);
        this.logger.log(`[User: ${userId}] Touchpoint 'rdv_scheduled' créé avec succès: ${touchpoint.id}`);

      } catch (touchpointError) {
        this.logger.error(`[User: ${userId}] Erreur lors de la création du touchpoint: ${touchpointError.message}`, touchpointError.stack);
        // Peut-être retourner une erreur ici aussi pour signaler un problème partiel?
        // Pour l'instant, on logge mais on retourne succès car le lead a été traité.
      }

      return {
        success: true,
        message: 'Webhook traité et touchpoint créé',
        lead_id: masterLead.id,
        visitor_id: finalVisitorId,
        email: email
      };
    } catch (error) {
      this.logger.error(`[User: ${userId}] Erreur majeure lors du traitement de _handleInviteeCreated: ${error.message}`, error.stack);
      // Renvoyer une erreur plus spécifique si possible
      throw new InternalServerErrorException(`Processing invitee.created failed: ${error.message}`);
    }
  }


  /**
   * Traite un événement d'annulation d'invité (RDV annulé)
   * @param inviteePayload Données du payload Calendly (invitee, scheduled_event, etc.)
   * @param userId ID de l'utilisateur FunnelDoctor (obligatoire)
   * @returns Objet avec statut de succès et données associées
   */
  private async _handleInviteeCanceled(inviteePayload: any, userId: string) { // userId est maintenant requis
    this.logger.log(`Traitement d'un événement invitee.canceled pour l'utilisateur ${userId}`);

    // Vérifier que les données essentielles sont présentes
    if (!inviteePayload || !inviteePayload.invitee || !inviteePayload.invitee.email) {
      this.logger.error(`[User: ${userId}] Données d'invité manquantes dans le payload invitee.canceled`);
      return { success: false, error: 'Missing invitee data' };
    }

    const invitee = inviteePayload.invitee;
    const email = invitee.email;
     this.logger.log(`[User: ${userId}] Email invité (annulation): ${email}`);

    // Tenter de récupérer le visitor_id des UTM
    let visitorIdFromUtm = this.extractVisitorIdFromResource(inviteePayload);
    this.logger.log(`[User: ${userId}] Visitor ID depuis UTM (annulation): ${visitorIdFromUtm || 'non trouvé'}`);

    // Essayer de trouver le master_lead via email ou visitorId
    // On ne crée pas de nouveau lead pour une annulation, on cherche l'existant
    try {
       this.logger.log(`[User: ${userId}] Recherche MasterLead existant avec email=${email}, visitor_id=${visitorIdFromUtm}`);
      // Utiliser findOrCreateMasterLead car findMasterLeadByDetails n'existe pas
      // Note: cela pourrait créer un lead si aucun n'existe déjà, ce qui n'est pas idéal pour une annulation
      const masterLead = await this.masterLeadService.findOrCreateMasterLead(
         { email: email, visitor_id: visitorIdFromUtm },
         userId,
         'calendly' // Ajouter le paramètre 'source' requis
      );

      if (!masterLead) {
         this.logger.warn(`[User: ${userId}] Aucun MasterLead trouvé pour l'annulation (email: ${email}, visitorId: ${visitorIdFromUtm}). Impossible de créer le touchpoint d'annulation.`);
         // Retourner succès car l'événement est traité (on ne peut rien faire de plus)
         return { success: true, message: 'MasterLead not found for cancellation event, touchpoint skipped.' };
      }
       this.logger.log(`[User: ${userId}] MasterLead trouvé pour annulation: ID=${masterLead.id}`);

      // Utiliser le visitor_id du master lead trouvé ou un fallback si vraiment nécessaire
      // Utiliser visitorIdFromUtm avec fallback, car masterLead.visitor_id peut ne pas exister sur le type Lead
      const visitorIdForTouchpoint = visitorIdFromUtm || (masterLead as any).visitor_id || `calendly_cancel_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      // Créer un touchpoint pour l'événement rdv_canceled
      try {
        const touchpointData = {
          visitor_id: visitorIdForTouchpoint,
          master_lead_id: masterLead.id,
          user_id: userId, // Ajouter le userId au touchpoint
          integration_type: 'calendly' as IntegrationType,
          event_type: 'rdv_canceled',
          event_data: {
            calendly_event_uri: inviteePayload.scheduled_event?.uri,
            scheduled_time: inviteePayload.scheduled_event?.start_time,
            canceled_time: inviteePayload.cancellation?.canceled_at || new Date().toISOString(), // Utiliser la date d'annulation si fournie
            canceler_type: inviteePayload.cancellation?.canceler_type,
            cancellation_reason: inviteePayload.cancellation?.reason,
            invitee_email: email,
            invitee_name: invitee.name,
            event_name: inviteePayload.event_type?.name,
            event_type_uri: inviteePayload.event_type?.uri,
            event_id: inviteePayload.scheduled_event?.uri?.split('/').pop() || inviteePayload.scheduled_event?.uuid,
            invitee_uri: inviteePayload.uri
          },
          page_url: inviteePayload.tracking?.utm_source
            ? `utm_source=${inviteePayload.tracking.utm_source}`
            : undefined,
           // timestamp: new Date(payload.created_at) // Utiliser le created_at du webhook parent?
        };

        this.logger.log(`[User: ${userId}] Préparation des données du touchpoint d'annulation: ${JSON.stringify(touchpointData)}`);
        const touchpoint = await this.touchpointsService.create(touchpointData);
        this.logger.log(`[User: ${userId}] Touchpoint 'rdv_canceled' créé avec succès: ${touchpoint.id}`);

      } catch (touchpointError) {
        this.logger.error(`[User: ${userId}] Erreur lors de la création du touchpoint d'annulation: ${touchpointError.message}`, touchpointError.stack);
        // Logguer mais considérer l'événement comme traité
      }

      return {
        success: true,
        message: 'Webhook d\'annulation traité',
        lead_id: masterLead.id,
      };
    } catch (error) {
      this.logger.error(`[User: ${userId}] Erreur majeure lors du traitement de _handleInviteeCanceled: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Processing invitee.canceled failed: ${error.message}`);
    }
  }
}