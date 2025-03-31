import { Injectable, Logger } from '@nestjs/common';
import { BridgingService } from '../bridging/bridging.service';
import { ConfigService } from '@nestjs/config';
import { FunnelProgressService } from '../funnel-progress/funnel-progress.service';
import { TouchpointsService } from '../touchpoints/touchpoints.service';
import { MasterLeadService } from '../leads/services/master-lead.service';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe;

  constructor(
    private readonly bridgingService: BridgingService,
    private readonly configService: ConfigService,
    private readonly funnelProgressService: FunnelProgressService,
    private readonly touchpointsService: TouchpointsService,
    private readonly masterLeadService: MasterLeadService,
  ) {
    // Initialiser Stripe avec la clé secrète
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      this.logger.error('STRIPE_SECRET_KEY n\'est pas définie');
    } else {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2024-12-18.acacia', // Version de l'API Stripe mise u00e0 jour
      });
    }
  }

  /**
   * Crée une session de paiement Stripe Checkout
   * @param data Données pour la création de la session
   * @returns URL de la session Stripe
   */
  async createCheckoutSession(data: {
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
    customerEmail?: string;
    visitor_id?: string;
  }) {
    if (!this.stripe) {
      throw new Error('Stripe n\'est pas configuré');
    }

    const { priceId, successUrl, cancelUrl, metadata, customerEmail, visitor_id } = data;
    this.logger.log(
      `Création session Stripe pour priceId=${priceId}, visitor_id=${visitor_id || 'non fourni'}, metadata=${JSON.stringify(metadata || {})}`
    );

    try {
      // Créer la session Stripe
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          ...(metadata || {}),
          ...(visitor_id ? { fd_visitor_id: visitor_id } : {})
        },
        customer_email: customerEmail,
      });

      this.logger.log(`Session Stripe créée avec succès: ${session.id}`);

      return {
        success: true,
        url: session.url,
        sessionId: session.id,
      };
    } catch (error) {
      this.logger.error('Erreur lors de la création de la session Stripe', error);
      throw error;
    }
  }

  /**
   * Traite les événements webhook de Stripe
   * @param payload Corps brut de la requête
   * @param signature Signature de l'en-tête Stripe
   * @returns Résultat du traitement
   */
  async handleWebhookEvent(payload: Buffer, signature: string, userId?: string) {
    if (!this.stripe) {
      throw new Error('Stripe n\'est pas configuré');
    }

    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET n\'est pas définie');
    }

    let event: Stripe.Event;

    try {
      // Vérifier la signature du webhook pour sécurité
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );
    } catch (error) {
      this.logger.error('Erreur de validation webhook Stripe', error);
      throw new Error(`Webhook Error: ${error.message}`);
    }

    this.logger.log(`Événement webhook Stripe reçu: ${event.type}`);

    try {
      // Traiter différents types d'événements
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          await this.handleCompletedCheckout(session, userId);
          break;
        }
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          this.logger.log(`PaymentIntent réussi: ${paymentIntent.id}`);
          break;
        }
        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          this.logger.log(`Échec PaymentIntent: ${paymentIntent.id}`);
          break;
        }
        default:
          this.logger.log(`Événement non géré: ${event.type}`);
      }

      return { received: true, type: event.type };
    } catch (error) {
      this.logger.error(`Erreur lors du traitement de l'événement ${event.type}`, error);
      throw error;
    }
  }

  /**
   * Gère une session de paiement complétée
   * Implémente la logique de stitching entre visiteur et lead
   * Crée un touchpoint de type payment_succeeded
   * @param session Session Stripe complétée
   * @param userId ID de l'utilisateur (optionnel)
   */
  private async handleCompletedCheckout(session: Stripe.Checkout.Session, userId?: string) {
    this.logger.log(`Traitement session complétée: ${session.id}`);

    // 1. Extraire l'email du client
    const email = session.customer_email || session.customer_details?.email;
    if (!email) {
      this.logger.error(`Session ${session.id} sans email client, impossible de traiter le paiement`);
      return { success: false, reason: 'missing_email' };
    }
    this.logger.log(`Email client extrait: ${email}`);
    
    // 2. Extraire le visitor_id des métadonnées (priorité à fd_visitor_id)
    const visitorIdFromMetadata = session.metadata?.fd_visitor_id || session.metadata?.visitor_id;
    if (visitorIdFromMetadata) {
      this.logger.log(`Visitor ID extrait des métadonnées: ${visitorIdFromMetadata}`);
    } else {
      this.logger.log('Aucun visitor_id trouvé dans les métadonnées');
    }
    
    // 3. Si pas de visitor_id dans les métadonnées, chercher via le bridge
    let visitorIdFromBridge = null;
    if (!visitorIdFromMetadata) {
      visitorIdFromBridge = await this.bridgingService.findVisitorIdByEmail(email);
      if (visitorIdFromBridge) {
        this.logger.log(`Visitor ID trouvé via bridge par email: ${visitorIdFromBridge}`);
      } else {
        this.logger.log(`Aucun visitor_id trouvé via bridge pour l'email ${email}`);
      }
    }
    
    // 4. Déterminer le visitor_id final à utiliser
    const finalVisitorId = visitorIdFromMetadata || visitorIdFromBridge || null;
    this.logger.log(`Visitor ID final utilisé: ${finalVisitorId || 'non disponible'}`);
    
    // Préparer les données de paiement
    const amount = session.amount_total ? session.amount_total / 100 : 0; // Convertir centimes en unités
    const currency = session.currency || 'usd';
    
    try {
      // 5. Trouver ou créer le master lead avec le visitor_id et l'email
      const masterLead = await this.masterLeadService.findOrCreateMasterLead(
        {
          email: email,
          visitor_id: finalVisitorId || undefined
        },
        userId || undefined,
        'stripe'
      );
      
      this.logger.log(`Master lead identifié/créé: ${masterLead.id}`);
      
      // 6. Créer un touchpoint pour l'événement de paiement
      const touchpointData = {
        visitor_id: finalVisitorId || 'unknown',
        event_type: 'payment_succeeded',
        master_lead_id: masterLead.id,
        event_data: {
          stripe_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent || null,
          payment_amount: amount,
          payment_currency: currency,
          payment_status: session.payment_status || 'completed',
          customer_email: email,
          customer_name: session.customer_details?.name,
          product_id: session.metadata?.product_id || session.line_items?.data[0]?.price?.id,
          payment_method: session.payment_method_types?.join(',') || 'card',
          payment_time: new Date().toISOString(),
          master_lead_id: masterLead.id,
          // Informations UTM si disponibles
          utm_source: session.metadata?.utm_source,
          utm_medium: session.metadata?.utm_medium,
          utm_campaign: session.metadata?.utm_campaign
        },
        page_url: session.metadata?.page_url
      };
      
      const touchpoint = await this.touchpointsService.create(touchpointData);
      this.logger.log(`Touchpoint de paiement créé avec succès: ${touchpoint.id}`);
      
      return {
        success: true,
        masterLeadId: masterLead.id,
        visitorId: finalVisitorId,
        touchpointId: touchpoint.id,
        sessionId: session.id
      };
    } catch (error) {
      this.logger.error(`Erreur lors du traitement de la session ${session.id}`, error);
      return { success: false, error: error.message };
    }
  }
}
