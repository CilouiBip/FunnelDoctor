import { Injectable, Logger } from '@nestjs/common';
import { BridgingService } from '../bridging/bridging.service';
import { ConfigService } from '@nestjs/config';
import { FunnelProgressService } from '../funnel-progress/funnel-progress.service';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe;

  constructor(
    private readonly bridgingService: BridgingService,
    private readonly configService: ConfigService,
    private readonly funnelProgressService: FunnelProgressService,
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
  }) {
    if (!this.stripe) {
      throw new Error('Stripe n\'est pas configuré');
    }

    const { priceId, successUrl, cancelUrl, metadata, customerEmail } = data;
    this.logger.log(
      `Création session Stripe pour priceId=${priceId}, metadata=${JSON.stringify(metadata || {})}`
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
        metadata: metadata || {},
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
   * Association du visitor_id au lead
   * @param session Session Stripe complétée
   */
  private async handleCompletedCheckout(session: Stripe.Checkout.Session, userId?: string) {
    this.logger.log(`Traitement session complétée: ${session.id}`);

    // S'assurer que nous avons toutes les données nécessaires
    if (!session.customer_email && !session.customer_details?.email) {
      this.logger.warn(
        `Session ${session.id} sans email client, impossible de faire le bridging`
      );
      return;
    }

    // Récupérer les metadata importantes
    const visitor_id = session.metadata?.visitor_id;
    if (!visitor_id) {
      this.logger.warn(
        `Session ${session.id} sans visitor_id dans les metadata, impossible de faire le bridging`
      );
      return;
    }

    // Pour la sécurité, vérifier que userId est présent
    // Dans un système réel, ça devrait être géré par l'authentification webhook ou autre mécanisme
    if (!userId) {
      this.logger.warn(
        `Session ${session.id} sans userId, impossible de faire le bridging`
      );
      return;
    }

    const email = session.customer_email || session.customer_details?.email || 'unknown@example.com';
    const amount = session.amount_total ? session.amount_total / 100 : 0; // Stripe stocke en centimes

    try {
      // Associer le visitor au lead
      const result = await this.bridgingService.associateVisitorToLead({
        visitor_id,
        email,
        user_id: userId,
        source: 'stripe',
        value: amount,
        metadata: {
          session_id: session.id,
          payment_status: session.payment_status,
          customer_name: session.customer_details?.name,
          amount: amount,
          currency: session.currency,
          page_url: session.metadata?.page_url,
          utm_source: session.metadata?.utm_source,
          utm_medium: session.metadata?.utm_medium,
          utm_campaign: session.metadata?.utm_campaign,
          payment_time: new Date().toISOString(),
        },
      });

      this.logger.log(
        `Bridging réussi pour session ${session.id}: visitor_id=${visitor_id} -> lead_id=${result.lead_id}`
      );

      // Mettre à jour la progression du funnel
      try {
        const funnelResult = await this.funnelProgressService.updateFunnelProgress({
          visitor_id,
          current_stage: 'payment_succeeded',
          payment_at: new Date().toISOString(),
          amount: amount,
          product_id: session.metadata?.product_id || session.line_items?.data[0]?.price?.id,
          user_id: userId || 'system',
        });
        
        this.logger.log(`Progression du funnel mise à jour: ${funnelResult.id}, stage=${funnelResult.current_stage}`);
      } catch (funnelError) {
        this.logger.error('Erreur lors de la mise à jour de la progression du funnel', funnelError);
        // On continue malgré l'erreur
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Erreur lors du bridging pour session ${session.id}`,
        error
      );
      throw error;
    }
  }
}
