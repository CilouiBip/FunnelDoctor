import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BridgingService } from '../bridging/bridging.service';
import { ConfigService } from '@nestjs/config';
import { TouchpointsService } from '../touchpoints/touchpoints.service';
import { MasterLeadService } from '../leads/services/master-lead.service';
import { IntegrationsService } from '../integrations/integrations.service';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly bridgingService: BridgingService,
    private readonly configService: ConfigService,
    private readonly touchpointsService: TouchpointsService,
    private readonly masterLeadService: MasterLeadService,
    private readonly integrationsService: IntegrationsService,
  ) {
    this.logger.log('PaymentsService initialisu00e9 - utilisation des clu00e9s API par utilisateur');
  }

  /**
   * Initialise une instance Stripe avec la clu00e9 API secru00e8te de l'utilisateur
   * @param userId ID de l'utilisateur pour ru00e9cupu00e9rer ses clu00e9s Stripe
   * @returns Une instance Stripe configuru00e9e avec la clu00e9 secru00e8te de l'utilisateur
   * @throws NotFoundException si l'intu00e9gration n'est pas configuru00e9e
   */
  private async getStripeInstance(userId: string): Promise<Stripe> {
    try {
      // Ru00e9cupu00e9rer la configuration Stripe pour cet utilisateur
      const config = await this.integrationsService.getIntegrationConfig(userId, 'stripe');
      
      if (!config || !config.secret_key) {
        this.logger.error(`Aucune clu00e9 API Stripe trouvu00e9e pour l'utilisateur ${userId}`);
        throw new NotFoundException('Intu00e9gration Stripe non configuru00e9e pour cet utilisateur');
      }
      
      // Cru00e9er une nouvelle instance Stripe avec la clu00e9 secru00e8te de l'utilisateur
      return new Stripe(config.secret_key, {
        apiVersion: '2024-12-18.acacia', // Version de l'API Stripe
      });
    } catch (error) {
      this.logger.error(`Erreur lors de l'initialisation de Stripe: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cru00e9e une session de paiement Stripe Checkout
   * @param data Donnu00e9es pour la cru00e9ation de la session
   * @param userId ID de l'utilisateur pour ru00e9cupu00e9rer ses clu00e9s Stripe
   * @returns URL de la session Stripe
   */
  async createCheckoutSession(data: {
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
    customerEmail?: string;
    visitor_id?: string;
  }, userId: string) {
    try {
      // Initialiser Stripe avec la clu00e9 de l'utilisateur
      const stripe = await this.getStripeInstance(userId);

      const { priceId, successUrl, cancelUrl, metadata, customerEmail, visitor_id } = data;
      this.logger.log(
        `Cru00e9ation session Stripe pour priceId=${priceId}, visitor_id=${visitor_id || 'non fourni'}, metadata=${JSON.stringify(metadata || {})}`
      );

      // Cru00e9er la session avec les donnu00e9es fournies
      const session = await stripe.checkout.sessions.create({
        success_url: successUrl,
        cancel_url: cancelUrl,
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        customer_email: customerEmail,
        metadata: {
          ...metadata,
          fd_visitor_id: visitor_id || '',
        },
      });

      return {
        sessionId: session.id,
        url: session.url,
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la cru00e9ation de la session Stripe: ${error.message}`);
      throw error;
    }
  }

  /**
   * Traite les u00e9vu00e9nements webhook de Stripe
   * @param payload Corps brut de la requu00eate
   * @param signature Signature de l'en-tu00eate Stripe
   * @param userId ID de l'utilisateur pour ru00e9cupu00e9rer ses clu00e9s Stripe
   * @returns Ru00e9sultat du traitement
   */
  async handleWebhookEvent(payload: Buffer, signature: string, userId: string) {
    try {
      // Ru00e9cupu00e9rer la configuration Stripe pour cet utilisateur
      const config = await this.integrationsService.getIntegrationConfig(userId, 'stripe');
      
      if (!config || !config.secret_key || !config.webhook_secret) {
        this.logger.error(`Configuration Stripe incomplu00e8te pour l'utilisateur ${userId}`);
        throw new NotFoundException('Configuration Stripe incomplu00e8te pour cet utilisateur');
      }
      
      // Initialiser Stripe avec la clu00e9 de l'utilisateur
      const stripe = await this.getStripeInstance(userId);

      // Construire l'u00e9vu00e9nement u00e0 partir du payload et de la signature
      let event;
      try {
        event = stripe.webhooks.constructEvent(
          payload,
          signature,
          config.webhook_secret
        );
      } catch (err) {
        this.logger.error(`Webhook signature verification failed: ${err.message}`);
        throw new Error(`Webhook signature verification failed: ${err.message}`);
      }

      // Traiter l'u00e9vu00e9nement selon son type
      this.logger.log(`Webhook event received: ${event.type}`);

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        return await this.handleCompletedCheckout(session, userId);
      }

      return { received: true, type: event.type };
    } catch (error) {
      this.logger.error(`Erreur lors du traitement du webhook Stripe: ${error.message}`);
      throw error;
    }
  }

  /**
   * Gu00e8re une session de paiement complu00e9tu00e9e
   * Implu00e9mente la logique de stitching entre visiteur et lead
   * Cru00e9e un touchpoint de type payment_succeeded
   * @param session Session Stripe complu00e9tu00e9e
   * @param userId ID de l'utilisateur (optionnel)
   */
  async handleCompletedCheckout(session: Stripe.Checkout.Session, userId?: string) {
    this.logger.log(`Traitement session complu00e9tu00e9e: ${session.id}`);
    
    // Extraire les donnu00e9es essentielles de la session
    const email = session.customer_email || session.customer_details?.email;
    
    // Une session sans email ne peut pas u00eatre traitu00e9e correctement
    if (!email) {
      this.logger.error('Session sans email, impossible de traiter la conversion');
      return { success: false, error: 'Missing email' };
    }
    
    // Extraire visitor_id des mu00e9tadonnu00e9es si disponible
    const metadata = session.metadata || {};
    let visitorIdFromMetadata: string | undefined = undefined;
    
    if (metadata && (metadata.fd_visitor_id || metadata.visitor_id)) {
      visitorIdFromMetadata = metadata.fd_visitor_id || metadata.visitor_id;
      this.logger.log(`Visitor ID trouvu00e9 dans les mu00e9tadonnu00e9es: ${visitorIdFromMetadata}`);
    } else {
      this.logger.log('Aucun visitor_id trouvu00e9 dans les mu00e9tadonnu00e9es');
    }
    
    // Si pas de visitor_id dans les mu00e9tadonnu00e9es, chercher via le bridge
    let visitorIdFromBridge: string | undefined = undefined;
    if (!visitorIdFromMetadata) {
      const bridgeResult = await this.bridgingService.findVisitorIdByEmail(email);
      visitorIdFromBridge = bridgeResult || undefined;
      if (visitorIdFromBridge) {
        this.logger.log(`Visitor ID trouvu00e9 via bridge par email: ${visitorIdFromBridge}`);
      } else {
        this.logger.log(`Aucun visitor_id trouvu00e9 via bridge pour l'email ${email}`);
      }
    }
    
    // Du00e9terminer le visitor_id final u00e0 utiliser
    const finalVisitorId = visitorIdFromMetadata || visitorIdFromBridge;
    this.logger.log(`Visitor ID final utilisu00e9: ${finalVisitorId || 'non disponible'}`);
    
    try {
      // Cru00e9er/trouver un master lead et associer le visitor_id si disponible
      const masterLead = await this.masterLeadService.findOrCreateMasterLead(
        {
          email,
          visitor_id: finalVisitorId
        },
        userId,
        'stripe'
      );
      
      this.logger.log(`Master lead trouvu00e9/cru00e9u00e9: ${masterLead.id}`);
      
      // Cru00e9er un touchpoint pour le paiement uniquement si nous avons un visitor_id
      if (finalVisitorId) {
        try {
          const touchpointData = {
            visitor_id: finalVisitorId,
            master_lead_id: masterLead.id,
            event_type: 'payment_succeeded',
            event_data: {
              payment_intent: session.payment_intent,
              amount: session.amount_total,
              currency: session.currency,
              email: email,
              customer: session.customer,
              product_name: session.metadata?.product_name || 'Unknown product',
            },
          };
          
          const touchpoint = await this.touchpointsService.create(touchpointData);
          this.logger.log(`Touchpoint payment_succeeded cru00e9u00e9: ${touchpoint.id}`);
        } catch (touchpointError) {
          this.logger.error(`Erreur lors de la cru00e9ation du touchpoint: ${touchpointError.message}`, touchpointError);
        }
      } else {
        this.logger.warn(`Aucun visitor_id disponible, touchpoint non cru00e9u00e9 pour le paiement de ${email}`);
      }
      
      return {
        success: true,
        lead_id: masterLead.id,
        email: email,
        visitor_id: finalVisitorId || undefined,
        payment_intent: session.payment_intent,
      };
    } catch (error) {
      this.logger.error(`Erreur gu00e9nu00e9rale lors du traitement du paiement: ${error.message}`, error);
      throw error;
    }
  }
}
