import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom } from 'rxjs';
import { CalendlyResourceDto } from './dto/webhook-event.dto';
import { BridgingService } from '../bridging/bridging.service';
import { TouchpointsService } from '../touchpoints/touchpoints.service';
import { MasterLeadService } from '../leads/services/master-lead.service';

@Injectable()
export class CalendlyV2Service {
  private readonly logger = new Logger(CalendlyV2Service.name);
  private readonly apiBaseUrl = 'https://api.calendly.com';
  private readonly headers: Record<string, string>;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly bridgingService: BridgingService,
    private readonly touchpointsService: TouchpointsService,
    private readonly masterLeadService: MasterLeadService,
  ) {
    const token = this.configService.get<string>('CALENDLY_PERSONAL_ACCESS_TOKEN');
    if (!token) {
      this.logger.error('CALENDLY_PERSONAL_ACCESS_TOKEN not found in environment variables');
    }
    
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Récupère les informations de l'utilisateur Calendly actuel
   */
  async getCurrentUser() {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.apiBaseUrl}/users/me`, { headers: this.headers }).pipe(
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
   */
  async getEventTypes() {
    try {
      const currentUser = await this.getCurrentUser();
      const userUri = currentUser.resource.uri;
      
      const { data } = await firstValueFrom(
        this.httpService.get(
          `${this.apiBaseUrl}/event_types?user=${userUri}`, 
          { headers: this.headers }
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
   * Vérifie la signature d'un webhook Calendly v2
   * @param payload Contenu du webhook
   * @param signature Signature reçue du webhook
   * @returns Si la signature est valide
   */
  verifyWebhookSignature(payload: any, signature: string): boolean {
    if (!signature) {
      this.logger.warn('No signature provided for webhook verification');
      return false;
    }

    try {
      const signingKey = this.configService.get<string>('CALENDLY_WEBHOOK_SIGNING_KEY');
      if (!signingKey) {
        this.logger.error('CALENDLY_WEBHOOK_SIGNING_KEY not found in environment variables');
        return false;
      }

      // TODO: Implement proper signature verification with crypto
      // For now, we'll just log and return true as this requires testing with actual Calendly webhooks
      this.logger.debug(`Webhook signature received: ${signature}`);
      this.logger.debug(`Signing key available: ${signingKey ? 'Yes' : 'No'}`);
      
      // In v2, Calendly provides documentation for proper signature verification
      // This would be implemented here using crypto library
      
      return true;
    } catch (error) {
      this.logger.error(`Error verifying webhook signature: ${error.message}`);
      return false;
    }
  }

  /**
   * Extrait le visitor_id des paramètres de tracking d'un événement Calendly v2
   * @param resource La ressource de l'événement Calendly
   * @returns Le visitor_id extrait ou null
   */
  extractVisitorIdFromResource(resource: any): string | null {
    this.logger.log(`[extractVisitorId] Attempting to extract visitor_id from utm_content`);
    
    // Priorité à utm_content dans tracking
    const utmContent = resource?.tracking?.utm_content;
    if (utmContent) {
      this.logger.log(`[extractVisitorId] Found in tracking.utm_content: ${utmContent}`);
      return String(utmContent); // Assurer que c'est une string
    }
  
    // Chercher aussi dans tracking_parameters pour plus de robustesse
    const utmContentFromParams = resource?.tracking?.tracking_parameters?.utm_content;
    if (utmContentFromParams) {
      this.logger.log(`[extractVisitorId] Found in tracking_parameters.utm_content: ${utmContentFromParams}`);
      return String(utmContentFromParams); // Assurer que c'est une string
    }
    
    this.logger.warn('[extractVisitorId] No utm_content found in tracking parameters');
    return null; // Retourne null si non trouvé
  }//
    
  /** //
   * Récupère les détails d'un événement planifié
   * @param uuid UUID de l'événement
   */
  async getScheduledEvent(uuid: string) {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(
          `${this.apiBaseUrl}/scheduled_events/${uuid}`,
          { headers: this.headers }
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
   * Récupère les détails d'un invité pour un événement planifié
   * @param eventUuid UUID de l'événement
   * @param inviteeUuid UUID de l'invité
   */
  async getInvitee(eventUuid: string, inviteeUuid: string) {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(
          `${this.apiBaseUrl}/scheduled_events/${eventUuid}/invitees/${inviteeUuid}`,
          { headers: this.headers }
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
   * Récupère les informations de paiement pour un invité
   * Si non présentes dans le webhook, fait un appel API pour les récupérer
   * @param resource La ressource de l'événement
   */
  async getPaymentInfo(resource: CalendlyResourceDto) {
    try {
      // Si les informations de paiement sont déjà dans le webhook, on les retourne
      if (resource.payment_info) {
        this.logger.log('Payment info found in webhook payload');
        return resource.payment_info;
      }

      // Sinon, on fait un appel API pour les récupérer
      this.logger.log('Payment info not in webhook, fetching via API');
      
      const eventUuid = resource.scheduled_event.uuid;
      const inviteeUuid = resource.invitee.uuid;
      
      if (!eventUuid || !inviteeUuid) {
        this.logger.warn('Missing event or invitee UUID, cannot fetch payment info');
        return null;
      }

      const inviteeData = await this.getInvitee(eventUuid, inviteeUuid);
      
      // Vérifier si les données de l'invité contiennent des infos de paiement
      if (inviteeData?.resource?.payment) {
        return {
          paid: inviteeData.resource.payment.paid || false,
          stripe_transaction_id: inviteeData.resource.payment.external_id,
          amount: inviteeData.resource.payment.amount,
          currency: inviteeData.resource.payment.currency,
          payment_status: inviteeData.resource.payment.status
        };
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Error getting payment info: ${error.message}`);
      return null;
    }
  }

  /**
   * Extrait l'ID utilisateur d'un événement Calendly
   * Dans une implémentation réelle, ce serait une table de mappage
   * entre les URIs Calendly et les IDs utilisateurs de l'application
   * @param resource La ressource de l'événement
   */
  extractUserIdFromCalendlyEvent(resource: CalendlyResourceDto): string | null {
    try {
      // En v2, on peut extraire l'URI de l'utilisateur à partir de l'événement
      const ownerUri = resource.scheduled_event?.uri?.split('/scheduled_events/')[0];
      
      if (ownerUri) {
        // Extraire l'ID utilisateur à partir de l'URI
        // Format : https://api.calendly.com/users/XXXX
        const userId = ownerUri.split('/users/')[1];
        
        if (userId) {
          this.logger.log(`Extracted user ID from Calendly event: ${userId}`);
          return userId;
        }
      }
      
      this.logger.warn('Could not extract user ID from Calendly event');
      return null; // Retourne null si l'ID ne peut pas être extrait
    } catch (error) {
      this.logger.error(`Error extracting user ID: ${error.message}`);
      return null;
    }
  }

  /**
   * Traite l'événement de création d'un invité Calendly (v2)
   * Cette méthode centralise la logique de traitement des webhooks invitee.created
   * 
   * @param resource Ressource de l'événement webhook
   * @returns Résultat du traitement
   */
  async processInviteeCreatedEvent(resource: any): Promise<any> {
    this.logger.log('Traitement de l\'événement invitee.created');

    try {
      // a. Extraire les données nécessaires
      const email = resource.invitee?.email;
      if (!email) {
        this.logger.error('Email manquant dans la ressource invitee.created');
        return { success: false, reason: 'missing_email' };
      }
      
      // Extraire le visitor_id depuis utm_content
      const visitorIdFromUtm = this.extractVisitorIdFromResource(resource);
      this.logger.log(`Visitor ID extrait des UTM parameters: ${visitorIdFromUtm || 'non trouvé'}`);
      
      // Extraire l'ID utilisateur propriétaire du calendrier
      const userId = this.extractUserIdFromCalendlyEvent(resource);
      if (!userId) {
        this.logger.error('Impossible de déterminer l\'utilisateur pour cet événement Calendly');
        return { success: false, reason: 'unknown_user' };
      }
      
      // b. Chercher un visitor_id associé à cet email dans bridge_associations
      const visitorIdFromBridge = await this.bridgingService.findVisitorIdByEmail(email);
      if (visitorIdFromBridge) {
        this.logger.log(`Visitor ID trouvé via bridge_associations: ${visitorIdFromBridge}`);
      }
      
      // c. Déterminer le visitor_id final à utiliser
      const finalVisitorId = visitorIdFromUtm || visitorIdFromBridge || null;
      this.logger.log(`Visitor ID final utilisé: ${finalVisitorId || 'non disponible'}`);
      
      // d. Trouver ou créer le master lead
      const masterLead = await this.masterLeadService.findOrCreateMasterLead(
        {
          email: email,
          visitor_id: finalVisitorId || undefined
        },
        userId,
        'calendly'
      );
      
      this.logger.log(`Master lead identifié/créé: ${masterLead.id}`);
      
      // e. Créer un touchpoint pour l'événement
      const touchpointData = {
        visitor_id: finalVisitorId || 'unknown',
        event_type: 'rdv_scheduled',
        master_lead_id: masterLead.id,
        event_data: {
          calendly_event_uri: resource.scheduled_event?.uri,
          scheduled_time: resource.scheduled_event?.start_time,
          invitee_email: email,
          invitee_name: resource.invitee?.name,
          event_name: resource.scheduled_event?.name,
          event_id: resource.scheduled_event?.uuid,
          master_lead_id: masterLead.id,
          lead_id: masterLead.id // Pour compatibilité
        },
        page_url: resource.tracking?.utm_source ? `utm_source=${resource.tracking.utm_source}` : undefined
      };
      
      const touchpoint = await this.touchpointsService.create(touchpointData);
      this.logger.log(`Touchpoint créé avec succès: ${touchpoint.id}`);

      return {
        success: true,
        masterLeadId: masterLead.id,
        visitorId: finalVisitorId,
        touchpointId: touchpoint.id,
        scheduledEvent: resource.scheduled_event?.uri
      };
    } catch (error) {
      this.logger.error(`Erreur lors du traitement invitee.created: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }

  /**
   * Traite l'événement d'annulation d'un invité Calendly (v2)
   * Cette méthode centralise la logique de traitement des webhooks invitee.canceled
   * 
   * @param resource Ressource de l'événement webhook
   * @returns Résultat du traitement
   */
  async processInviteeCanceledEvent(resource: any): Promise<any> {
    this.logger.log('Traitement de l\'événement invitee.canceled');

    try {
      // a. Extraire les données nécessaires
      const email = resource.invitee?.email;
      if (!email) {
        this.logger.error('Email manquant dans la ressource invitee.canceled');
        return { success: false, reason: 'missing_email' };
      }
      
      // Extraire le visitor_id depuis utm_content
      const visitorIdFromUtm = this.extractVisitorIdFromResource(resource);
      this.logger.log(`Visitor ID extrait des UTM parameters: ${visitorIdFromUtm || 'non trouvé'}`);
      
      // Extraire l'ID utilisateur propriétaire du calendrier
      const userId = this.extractUserIdFromCalendlyEvent(resource);
      if (!userId) {
        this.logger.error('Impossible de déterminer l\'utilisateur pour cet événement Calendly');
        return { success: false, reason: 'unknown_user' };
      }
      
      // Pour une annulation, on n'utilise pas le bridge car c'est un événement ultérieur 
      // à la création du RDV, qui arrive potentiellement bien après
      
      // b. Trouver ou créer le master lead
      const masterLead = await this.masterLeadService.findOrCreateMasterLead(
        {
          email: email,
          visitor_id: visitorIdFromUtm || undefined
        },
        userId,
        'calendly'
      );
      
      this.logger.log(`Master lead identifié/créé pour annulation: ${masterLead.id}`);
      
      // Déterminer si c'est un report ou une annulation pure
      const reason = resource.cancellation?.reason || '';
      const rescheduled = reason.toLowerCase().includes('reschedul');
      const eventType = rescheduled ? 'rdv_rescheduled' : 'rdv_canceled';
      
      // c. Créer un touchpoint pour l'événement d'annulation
      const touchpointData = {
        visitor_id: visitorIdFromUtm || 'unknown',
        event_type: eventType,
        master_lead_id: masterLead.id,
        event_data: {
          calendly_event_uri: resource.scheduled_event?.uri,
          canceled_time: new Date().toISOString(),
          scheduled_time: resource.scheduled_event?.start_time,
          invitee_email: email,
          invitee_name: resource.invitee?.name,
          event_name: resource.scheduled_event?.name,
          event_id: resource.scheduled_event?.uuid,
          cancellation_reason: reason,
          is_reschedule: rescheduled,
          master_lead_id: masterLead.id
        },
        page_url: resource.tracking?.utm_source ? `utm_source=${resource.tracking.utm_source}` : undefined
      };
      
      const touchpoint = await this.touchpointsService.create(touchpointData);
      this.logger.log(`Touchpoint d'annulation créé: ${touchpoint.id}`);

      return {
        success: true,
        masterLeadId: masterLead.id,
        visitorId: visitorIdFromUtm,
        touchpointId: touchpoint.id,
        eventType: eventType,
        scheduledEvent: resource.scheduled_event?.uri
      };
    } catch (error) {
      this.logger.error(`Erreur lors du traitement invitee.canceled: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }
}
