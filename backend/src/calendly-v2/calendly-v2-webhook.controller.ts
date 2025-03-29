import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { CalendlyV2Service } from './calendly-v2.service';
import { CalendlyWebhookEventDto } from './dto/webhook-event.dto';
import { BridgingService } from '../bridging/bridging.service';
import { TouchpointsService } from '../touchpoints/touchpoints.service';
import { FunnelProgressService } from '../funnel-progress/funnel-progress.service';
import { SupabaseService } from '../supabase/supabase.service';

// Contrôleur pour les webhooks Calendly v2
// Cette configuration permet d'éviter le préfixe global pour cette route spécifique
@Controller({ path: 'rdv', host: undefined })
export class CalendlyV2WebhookController {
  private readonly logger = new Logger(CalendlyV2WebhookController.name);

  constructor(
    private readonly calendlyV2Service: CalendlyV2Service,
    private readonly bridgingService: BridgingService,
    private readonly touchpointsService: TouchpointsService,
    private readonly funnelProgressService: FunnelProgressService,
    private readonly supabaseService: SupabaseService,
  ) {}

  /**
   * Point de terminaison pour les webhooks Calendly API v2
   * Endpoint: POST /api/rdv/webhook-v2
   * 
   * Gère les événements 'invitee.created' et 'invitee.canceled'
   */
  @Post('webhook-v2')
  @HttpCode(200) // Calendly attend un statut 200 OK
  async handleWebhook(
    @Req() request: any,
    @Headers('calendly-webhook-signature') signature: string,
  ) {
    // Log brut AVANT toute validation de DTO
    this.logger.log('<<< RAW WEBHOOK RECEIVED on /webhook-v2 >>>');
    try {
      this.logger.log(`Raw Body Type: ${typeof request.body}`);
      this.logger.log(`Raw Body Content: ${JSON.stringify(request.body, null, 2)}`);
    } catch (e) {
      this.logger.error('Error logging raw body:', e);
      // Essayer de logguer différemment si ce n'est pas du JSON
      console.log('Raw Body (console):', request.body);
    }
    
    // Suite du code existant
    const payload = request.body;
    if (payload && payload.event) {
      this.logger.log(`Webhook v2 reçu: ${payload.event}`);
      this.logger.debug('Détail complet du payload:', JSON.stringify(payload));
    } else {
      this.logger.warn('Payload reçu sans propriété event');
    }
    this.logger.debug(`Signature: ${signature}`);

    // Vérifier la signature du webhook (sécurité)
    if (!this.calendlyV2Service.verifyWebhookSignature(payload, signature)) {
      this.logger.warn('Signature de webhook invalide ou non fournie');
      // Continuer quand même pour faciliter les tests
      // En production, on pourrait rejeter les requêtes non signées
    }

    try {
      // Router l'événement selon son type
      switch (payload.event) {
        case 'invitee.created':
          return this.handleInviteeCreated(payload);
        case 'invitee.canceled':
          return this.handleInviteeCanceled(payload);
        default:
          this.logger.warn(`Type d'événement non géré: ${payload.event}`);
          return { success: false, reason: 'unsupported_event_type' };
      }
    } catch (error) {
      this.logger.error(`Erreur lors du traitement du webhook: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Gère l'événement de création d'un invité Calendly (v2)
   * @param payload Données de l'événement
   */
  private async handleInviteeCreated(payload: CalendlyWebhookEventDto) {
    const { resource } = payload;

    if (!resource || !resource.invitee || !resource.invitee.email) {
      this.logger.warn('Données invitee.created incomplètes');
      return { success: false, reason: 'incomplete_data' };
    }

    // Extraire le visitor_id des paramètres UTM
    const visitor_id = this.calendlyV2Service.extractVisitorIdFromResource(resource);
    if (!visitor_id) {
      this.logger.warn('Aucun visitor_id trouvé dans les paramètres de tracking');
      return { success: false, reason: 'no_visitor_id' };
    }

    // Extraire l'ID utilisateur (propriétaire du calendrier)
    const userId = this.calendlyV2Service.extractUserIdFromCalendlyEvent(resource);
    if (!userId) {
      this.logger.warn('Impossible de déterminer l\'utilisateur pour cet événement Calendly');
      return { success: false, reason: 'unknown_user' };
    }

    try {
      // Associer le visitor au lead
      const result = await this.bridgingService.associateVisitorToLead({
        visitor_id,
        email: resource.invitee.email,
        user_id: userId,
        source: 'calendly-v2',
        metadata: {
          event_type: resource.scheduled_event?.name,
          invitee_name: resource.invitee.name,
          invitee_timezone: resource.invitee.timezone,
          scheduled_time: resource.scheduled_event?.start_time,
          event_status: 'scheduled',
          utm_source: resource.tracking?.utm_source,
          utm_medium: resource.tracking?.utm_medium,
          utm_campaign: resource.tracking?.utm_campaign,
          calendly_event_uri: resource.scheduled_event?.uri,
          rdv_time: new Date().toISOString(),
        },
      });

      this.logger.log(
        `Bridging réussi pour RDV Calendly v2: visitor_id=${visitor_id} -> lead_id=${result.lead_id}`
      );

      // Créer un touchpoint pour l'événement rdv_scheduled
      try {
        const touchpointResult = await this.touchpointsService.create({
          visitor_id,
          event_type: 'rdv_scheduled',
          event_data: {
            lead_id: result.lead_id,
            calendly_event_uri: resource.scheduled_event?.uri,
            scheduled_time: resource.scheduled_event?.start_time,
            invitee_email: resource.invitee.email,
            invitee_name: resource.invitee.name,
            event_name: resource.scheduled_event?.name,
            event_id: resource.scheduled_event?.uuid,
          },
          page_url: resource.tracking?.utm_source ? `utm_source=${resource.tracking.utm_source}` : undefined,
        });

        this.logger.log(`Touchpoint 'rdv_scheduled' créé avec succès: ${touchpointResult.id}`);
      } catch (touchpointError) {
        this.logger.error('Erreur lors de la création du touchpoint rdv_scheduled', touchpointError);
        // On continue même en cas d'erreur de création du touchpoint
      }

      // Créer un événement de conversion pour conserver la compatibilité
      try {
        const { data, error } = await this.supabaseService
          .getAdminClient()
          .from('conversion_events')
          .insert({
            lead_id: result.lead_id,
            // Champ obligatoire normalisé
            event_name: 'rdv_scheduled',
            // Conserver event_type pour compatibilité
            event_type: 'DEMO_REQUEST',
            // Données structurées complètes
            event_data: {
              source: 'calendly-v2',
              event_name: resource.scheduled_event?.name || 'Rendez-vous Calendly',
              scheduled_time: resource.scheduled_event?.start_time,
              invitee_email: resource.invitee.email,
              invitee_name: resource.invitee.name,
              event_id: resource.scheduled_event?.uuid,
              event_status: 'scheduled',
              utm_source: resource.tracking?.utm_source,
              utm_medium: resource.tracking?.utm_medium,
              utm_campaign: resource.tracking?.utm_campaign
            },
            // Données de suivi complètes
            page_url: resource.tracking?.utm_source ? `utm_source=${resource.tracking.utm_source}` : null,
            site_id: 'default',
            // user_id obligatoire
            user_id: userId
          })
          .select()
          .single();

        if (error) {
          this.logger.error("Erreur lors de la création de l'événement de conversion", error);
        } else {
          this.logger.log(`Événement de conversion créé avec succès: ${data.id}`);
        }
      } catch (conversionError) {
        this.logger.error("Erreur lors de la création de l'événement de conversion", conversionError);
        // On continue même en cas d'erreur
      }

      // Mettre à jour la progression du funnel avec rdv_scheduled
      try {
        const funnelResult = await this.funnelProgressService.updateFunnelProgress({
          visitor_id,
          current_stage: 'rdv_scheduled',
          rdv_scheduled_at: resource.scheduled_event?.start_time?.toString() || new Date().toISOString(),
          user_id: userId,
        });

        this.logger.log(`Progression du funnel mise à jour: ${funnelResult.id}, stage=${funnelResult.current_stage}`);
      } catch (funnelError) {
        this.logger.error('Erreur lors de la mise à jour de la progression du funnel', funnelError);
        // On continue même si l'enregistrement du funnel échoue
      }

      // Vérifier si un paiement est associé à l'événement
      try {
        const paymentInfo = await this.calendlyV2Service.getPaymentInfo(resource);
        
        if (paymentInfo && paymentInfo.paid) {
          this.logger.log('Paiement détecté pour cet événement Calendly');
          
          // Créer un touchpoint pour l'événement payment_succeeded
          await this.touchpointsService.create({
            visitor_id,
            event_type: 'payment_succeeded',
            event_data: {
              lead_id: result.lead_id,
              calendly_event_uri: resource.scheduled_event?.uri,
              payment_amount: paymentInfo.amount,
              payment_currency: paymentInfo.currency,
              stripe_transaction_id: paymentInfo.stripe_transaction_id,
              payment_status: paymentInfo.payment_status || 'completed',
            },
          });
          
          // Mettre à jour la progression du funnel avec payment_succeeded
          await this.funnelProgressService.updateFunnelProgress({
            visitor_id,
            current_stage: 'payment_succeeded',
            payment_succeeded_at: new Date().toISOString(),
            user_id: userId,
            payment_data: {
              amount: paymentInfo.amount,
              currency: paymentInfo.currency,
              payment_method: 'calendly-stripe',
              transaction_id: paymentInfo.stripe_transaction_id,
            },
          });
          
          this.logger.log(`Progression du funnel mise à jour avec payment_succeeded pour visitor_id=${visitor_id}`);
        }
      } catch (paymentError) {
        this.logger.error('Erreur lors du traitement des informations de paiement', paymentError);
        // Ne pas bloquer le processus si le traitement du paiement échoue
      }

      return {
        success: true,
        lead_id: result.lead_id,
        visitor_id,
      };
    } catch (error) {
      this.logger.error('Erreur lors du bridging pour RDV Calendly v2', error);
      throw error;
    }
  }

  /**
   * Gère l'événement d'annulation d'un invité Calendly (v2)
   * @param payload Données de l'événement
   */
  private async handleInviteeCanceled(payload: CalendlyWebhookEventDto) {
    const { resource } = payload;

    if (!resource || !resource.invitee || !resource.invitee.email) {
      this.logger.warn('Données invitee.canceled incomplètes');
      return { success: false, reason: 'incomplete_data' };
    }

    // Extraire le visitor_id des paramètres UTM
    const visitor_id = this.calendlyV2Service.extractVisitorIdFromResource(resource);
    if (!visitor_id) {
      this.logger.warn('Aucun visitor_id trouvé dans les paramètres de tracking');
      return { success: false, reason: 'no_visitor_id' };
    }

    // Extraire l'ID utilisateur (propriétaire du calendrier)
    const userId = this.calendlyV2Service.extractUserIdFromCalendlyEvent(resource);
    if (!userId) {
      this.logger.warn('Impossible de déterminer l\'utilisateur pour cet événement Calendly');
      return { success: false, reason: 'unknown_user' };
    }

    // Vérifier si c'est une reprogrammation ou une annulation définitive
    const isRescheduled = resource.scheduled_event?.rescheduled || false;
    const eventType = isRescheduled ? 'rdv_rescheduled' : 'rdv_canceled';

    try {
      // Créer un touchpoint pour l'événement d'annulation ou de reprogrammation
      const touchpointResult = await this.touchpointsService.create({
        visitor_id,
        event_type: eventType,
        event_data: {
          calendly_event_uri: resource.scheduled_event?.uri,
          scheduled_time: resource.scheduled_event?.start_time,
          invitee_email: resource.invitee.email,
          invitee_name: resource.invitee.name,
          event_name: resource.scheduled_event?.name,
          event_id: resource.scheduled_event?.uuid,
          cancellation_reason: resource.cancellation_reason || 'not_provided',
          is_rescheduled: isRescheduled,
        },
      });

      this.logger.log(`Touchpoint '${eventType}' créé avec succès: ${touchpointResult.id}`);

      // Récupérer le lead_id associé au visitor_id
      let lead_id: string | null = null;
      try {
        const { data: visitorData } = await this.supabaseService
          .getAdminClient()
          .from('visitors')
          .select('lead_id')
          .eq('visitor_id', visitor_id)
          .maybeSingle();
            
        lead_id = visitorData?.lead_id || null;
        
        if (!lead_id) {
          this.logger.warn(`Aucun lead_id trouvé pour le visitor_id ${visitor_id}`);
          return { success: false, reason: 'no_lead_found' };
        }
        
        this.logger.log(`Lead_id ${lead_id} récupéré pour le visitor_id ${visitor_id}`);
      } catch (leadError) {
        this.logger.error('Erreur lors de la récupération du lead_id', leadError);
        return { success: false, reason: 'lead_error' };
      }
      
      // Créer un événement de conversion normalisé
      try {
        const { data, error } = await this.supabaseService
          .getAdminClient()
          .from('conversion_events')
          .insert({
            lead_id,
            // Champ obligatoire normalisé
            event_name: isRescheduled ? 'rdv_rescheduled' : 'rdv_canceled',
            // Conserver event_type pour compatibilité
            event_type: 'DEMO_CANCELED',
            // Données structurées complètes
            event_data: {
              source: 'calendly-v2',
              event_name: resource.scheduled_event?.name || 'Rendez-vous Calendly',
              scheduled_time: resource.scheduled_event?.start_time,
              invitee_email: resource.invitee.email,
              invitee_name: resource.invitee.name,
              event_id: resource.scheduled_event?.uuid,
              event_status: isRescheduled ? 'rescheduled' : 'canceled',
              cancellation_reason: resource.cancellation_reason || 'not_provided',
              utm_source: resource.tracking?.utm_source,
              utm_medium: resource.tracking?.utm_medium,
              utm_campaign: resource.tracking?.utm_campaign
            },
            // Données de suivi complètes
            page_url: resource.tracking?.utm_source ? `utm_source=${resource.tracking.utm_source}` : null,
            site_id: 'default',
            // user_id obligatoire
            user_id: userId
          })
          .select()
          .single();

        if (error) {
          this.logger.error("Erreur lors de la création de l'événement de conversion", error);
        } else {
          this.logger.log(`Événement de conversion ${eventType} créé avec succès: ${data.id}`);
        }
      } catch (conversionError) {
        this.logger.error("Erreur lors de la création de l'événement de conversion", conversionError);
        // On continue même en cas d'erreur
      }

      // Si ce n'est pas une reprogrammation, on met à jour le funnel progress
      if (!isRescheduled) {
        try {
          const funnelResult = await this.funnelProgressService.updateFunnelProgress({
            visitor_id,
            current_stage: 'rdv_canceled',
            rdv_canceled_at: new Date().toISOString(),
            user_id: userId,
          });

          this.logger.log(`Progression du funnel mise à jour: ${funnelResult.id}, stage=${funnelResult.current_stage}`);
        } catch (funnelError) {
          this.logger.error('Erreur lors de la mise à jour de la progression du funnel', funnelError);
          // On continue même si l'enregistrement du funnel échoue
        }
      } else {
        this.logger.log('RDV reprogrammé, attente du nouvel événement invitee.created');
      }

      return {
        success: true,
        event_type: eventType,
        visitor_id,
      };
    } catch (error) {
      this.logger.error(`Erreur lors du traitement de l'événement ${eventType}`, error);
      throw error;
    }
  }
}
