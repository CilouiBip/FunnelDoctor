import { Controller, Post, Body, Logger, HttpStatus, HttpException, HttpCode } from '@nestjs/common';
import { CalendlyWebhookDto, StripeWebhookDto } from './dto/webhook.dto';
import { IclosedWebhookDto } from './dto/iclosed-webhook.dto';
import { WebhooksService } from './webhooks.service';

@Controller('api/webhooks')
export class WebhooksController {
  constructor(
    private readonly logger: Logger,
    private readonly webhooksService: WebhooksService
  ) {}

  @Post('calendly-test')
  async testCalendlyWebhook(@Body() payload: CalendlyWebhookDto) {
    try {
      this.logger.log('Reçu webhook Calendly de test', {
        email: payload.email,
        tracking: payload.tracking,
        event_status: payload.event_status,
        rescheduled: payload.rescheduled,
        canceled: payload.canceled
      });
      
      // Récupérer le visitor_id depuis les paramètres de tracking
      const visitorId = payload.tracking?.visitor_id || 
                        payload.tracking?.utm_source || 
                        'test-visitor-id';
      const email = payload.email || 'test@example.com';
      const name = payload.name || 'Test User';
      
      // Vérifier les données minimales requises
      if (!email) {
        throw new HttpException('Email is required', HttpStatus.BAD_REQUEST);
      }
      
      // Détecter si c'est une reprogrammation ou une annulation
      const isRescheduled = payload.rescheduled === true;
      const isCanceled = payload.canceled === true;
      
      let funnel_stage = 'rdv_scheduled';
      let message = 'Réservation Calendly initiée';
      
      if (isRescheduled) {
        funnel_stage = 'rdv_rescheduled';
        message = 'Rendez-vous Calendly reprogrammé';
        this.logger.log('Reprogrammation détectée', { email, funnel_stage });
        
        // En production, recherchez le lead existant par email et mettez à jour son statut
        // Puis créez un nouvel événement de reprogrammation dans conversion_events
      } else if (isCanceled) {
        funnel_stage = 'rdv_canceled';
        message = 'Rendez-vous Calendly annulé';
        this.logger.log('Annulation détectée', { email, funnel_stage });
        
        // En production, recherchez le lead existant par email et mettez à jour son statut
        // Puis créez un nouvel événement d'annulation dans conversion_events
      }
      
      // Simuler l'enregistrement des données
      const leadData = {
        visitor_id: visitorId,
        email,
        name,
        source: 'calendly',
        funnel_progress: funnel_stage,
        created_at: new Date().toISOString(),
      };
      
      // Log des données capturées (en production, ceci serait enregistré dans la base)
      this.logger.log('Lead traité avec bridging visitor_id', leadData);
      
      // Générer un faux lead_id pour simuler le flow complet
      const fakeLeadId = `lead_${Math.floor(Math.random() * 1000)}`;
      
      // Simuler l'enregistrement d'un événement de conversion
      const conversionEventData = {
        lead_id: fakeLeadId,
        event_type: isRescheduled ? 'rdv_rescheduled' : (isCanceled ? 'rdv_canceled' : 'rdv_scheduled'),
        event_data: {
          source: 'calendly',
          email,
          visitor_id: visitorId,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      };
      
      this.logger.log('Événement de conversion enregistré', conversionEventData);
      
      return {
        success: true,
        message: message,
        data: {
          visitor_id: visitorId,
          lead_id: fakeLeadId,
          funnel_stage: funnel_stage,
          is_rescheduled: isRescheduled,
          is_canceled: isCanceled
        }
      };
    } catch (error) {
      this.logger.error('Erreur lors du traitement du webhook Calendly', error);
      throw new HttpException(
        error.message || 'Internal server error', 
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('stripe-test')
  async testStripeWebhook(@Body() payload: StripeWebhookDto) {
    try {
      this.logger.log('Reçu webhook Stripe de test', payload);
      
      // Récupérer le lead_id depuis les métadonnées
      const leadId = payload.metadata?.lead_id || 'test-lead-id';
      const visitorId = payload.metadata?.visitor_id || 'test-visitor-id';
      const amount = payload.amount || 0;
      const currency = payload.currency || 'EUR';
      const status = payload.status || 'succeeded';
      
      // Vérifier les données minimales requises
      if (!leadId) {
        throw new HttpException('Lead ID is required in metadata', HttpStatus.BAD_REQUEST);
      }

      // Déterminer le statut du funnel en fonction du statut du paiement
      let funnel_stage = 'payment_pending';
      let event_type = 'payment_initiated';
      
      if (status === 'succeeded') {
        funnel_stage = 'payment_succeeded';
        event_type = 'payment_succeeded';
        this.logger.log('Paiement réussi détecté', { leadId, funnel_stage });
      } else if (status === 'failed') {
        funnel_stage = 'payment_failed';
        event_type = 'payment_failed';
        this.logger.log('Échec de paiement détecté', { leadId, funnel_stage });
      }

      // Simuler l'enregistrement des données de paiement
      const paymentData = {
        lead_id: leadId,
        visitor_id: visitorId,
        amount,
        currency,
        status,
        created_at: new Date().toISOString(),
      };
      
      // Simuler la mise à jour de l'état du funnel pour ce lead
      const funnelProgressData = {
        lead_id: leadId,
        stage: funnel_stage,
        updated_at: new Date().toISOString()
      };
      
      // Simuler l'enregistrement d'un événement de conversion pour le paiement
      const conversionEventData = {
        lead_id: leadId,
        event_type: event_type,
        event_data: {
          amount,
          currency,
          payment_status: status,
          visitor_id: visitorId,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      };
      
      // Log des données capturées (en production, ceci serait enregistré dans la base)
      this.logger.log('Paiement enregistré avec bridging lead_id', paymentData);
      this.logger.log('Progression du funnel mise à jour', funnelProgressData);
      this.logger.log('Événement de conversion (paiement) enregistré', conversionEventData);
      
      return {
        success: true,
        message: `Webhook Stripe traité avec succès: ${event_type}`,
        data: {
          lead_id: leadId,
          visitor_id: visitorId,
          funnel_stage: funnel_stage,
          payment_status: status,
          payment_amount: amount,
          payment_currency: currency
        }
      };
    } catch (error) {
      this.logger.error('Erreur lors du traitement du webhook Stripe', error);
      throw new HttpException(
        error.message || 'Internal server error', 
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Gère les données de réservation provenant d'iClosed via un webhook Zapier
   * 
   * @param iclosedData Données validées du webhook iClosed
   * @returns Un message de confirmation pour Zapier
   */
  @Post('iclosed')
  @HttpCode(200)
  async handleIclosedWebhook(@Body() iclosedData: IclosedWebhookDto) {
    try {
      console.log('Received iClosed Webhook:', iclosedData);
      
      // Appel au service pour traiter les données
      await this.webhooksService.handleIclosedWebhook(iclosedData);
      
      return { success: true, message: 'iClosed webhook received successfully' };
    } catch (error) {
      this.logger.error('Error processing iClosed webhook', error);
      throw new HttpException(
        error.message || 'Internal server error', 
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
