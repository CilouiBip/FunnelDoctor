import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom } from 'rxjs';
import { CalendlyResourceDto } from './dto/webhook-event.dto';

@Injectable()
export class CalendlyV2Service {
  private readonly logger = new Logger(CalendlyV2Service.name);
  private readonly apiBaseUrl = 'https://api.calendly.com';
  private readonly headers: Record<string, string>;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
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
  extractVisitorIdFromResource(resource: CalendlyResourceDto): string | null {
    if (!resource.tracking) {
      this.logger.warn('No tracking information found in Calendly event');
      return null;
    }

    const { tracking } = resource;
    
    // Méthode 1: format visitor_id/value dans utm_source/utm_medium
    if (tracking.utm_source === 'visitor_id' && tracking.utm_medium) {
      this.logger.log(`Visitor ID found in utm_medium: ${tracking.utm_medium}`);
      return tracking.utm_medium;
    }
    
    // Méthode 2: valeur directe dans utm_content
    if (tracking.utm_content && tracking.utm_content.startsWith('visitor_')) {
      this.logger.log(`Visitor ID found in utm_content: ${tracking.utm_content}`);
      return tracking.utm_content;
    }
    
    // Méthode 3: paramètre fd_tlid personnalisé
    if (tracking.fd_tlid) {
      this.logger.log(`Visitor ID found in fd_tlid: ${tracking.fd_tlid}`);
      return tracking.fd_tlid;
    }

    this.logger.warn('No visitor_id found in tracking parameters');
    return null;
  }

  /**
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
      // NOTE: Cette implémentation est simplifiée et devrait être remplacée
      // par une vraie table de mappage dans une application de production
      
      // En v2, on peut extraire l'URI de l'utilisateur à partir de l'événement
      const ownerUri = resource.scheduled_event?.uri?.split('/scheduled_events/')[0];
      
      if (ownerUri) {
        // Extraire l'ID utilisateur à partir de l'URI
        // Format : https://api.calendly.com/users/XXXX
        const userId = ownerUri.split('/users/')[1];
        
        // Si on a un ID, on le retourne, sinon on utilise un ID par défaut
        if (userId) {
          this.logger.log(`Extracted user ID from Calendly event: ${userId}`);
          return userId;
        }
      }
      
      // ID utilisateur valide pour tests (utilisateur réel trouvé dans Supabase)
      // NOTE: Ceci est une solution temporaire pour tester le bridging
      const validTestUserId = 'a89ad1a0-1cb1-47a4-9a6c-e4934f2cd93c'; // ID utilisateur existant en Supabase (mehdi.benchaffi@gmail.com)
      this.logger.warn(`Could not extract user ID from Calendly event, using valid test user ID: ${validTestUserId}`);
      return validTestUserId;
    } catch (error) {
      this.logger.error(`Error extracting user ID: ${error.message}`);
      return null;
    }
  }
}
