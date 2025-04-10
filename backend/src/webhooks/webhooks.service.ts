import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { IclosedWebhookDto } from './dto/iclosed-webhook.dto';
import { OptinWebhookDto } from './dto/optin-webhook.dto';
import { UsersService } from '../users/users.service';
import { MasterLeadService } from '../leads/services/master-lead.service';
import { TouchpointsService } from '../touchpoints/touchpoints.service';
import { VisitorsService } from '../visitors/visitors.service';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly logger: Logger,
    private readonly usersService: UsersService,
    private readonly masterLeadService: MasterLeadService,
    private readonly touchpointsService: TouchpointsService,
    private readonly visitorsService: VisitorsService,
  ) {}

  /**
   * Traite les webhooks reçus de Zapier pour les rendez-vous iClosed
   * Gère deux types d'événements:
   * 1. RDV pris (valeur par défaut, sans callOutcome)
   * 2. Résultat d'appel (avec callOutcome)
   * 
   * @param data Données du webhook iClosed
   * @returns Promise<void>
   */
  async handleIclosedWebhook(data: IclosedWebhookDto): Promise<void> {
    this.logger.log('Processing iClosed Webhook for API Key:', data.apiKey);
    this.logger.debug('iClosed Webhook Data:', {
      email: data.email,
      visitorId: data.visitorId,
      apiKey: data.apiKey,
      callOutcome: data.callOutcome || 'N/A',
      callStartTime: data.callStartTime || 'N/A'
    });

    // 1. Valider l'API Key pour trouver le userId
    const userId = await this.usersService.findUserIdByApiKey(data.apiKey);
    
    if (!userId) {
      this.logger.error('Invalid API Key received:', data.apiKey);
      throw new UnauthorizedException('Invalid API Key');
    }
    
    this.logger.log(`User identified with API Key: ${data.apiKey}, userId: ${userId}`);
    
    // 1.5 S'assurer que le visiteur existe dans la table visitors avant de l'associer
    // Cela évite l'erreur de clé étrangère lors de l'association du visitor_id au lead
    if (data.visitorId) {
      this.logger.log(`Creating or updating visitor: ${data.visitorId}`);
      await this.visitorsService.createOrUpdate({
        visitor_id: data.visitorId,
        // Données minimales requises pour créer un visiteur
        metadata: { source: 'iclosed_webhook' }
      });
    }
    
    // 2. Créer ou récupérer le master lead avec les informations disponibles
    // On crée un objet de recherche avec l'email, et on ajoute le visitor_id seulement s'il est présent
    const searchParams: { email: string; visitor_id?: string } = { email: data.email };
    if (data.visitorId) {
      searchParams.visitor_id = data.visitorId;
    }
    
    const masterLead = await this.masterLeadService.findOrCreateMasterLead(
      searchParams,
      userId,
      'iclosed'
    );
    
    const masterLeadId = masterLead.id;
    
    // Vérifier si c'est un événement de résultat d'appel ou de réservation initiale
    if (data.callOutcome) {
      // C'est un événement de résultat d'appel
      this.logger.log(`Processing call outcome event for ${data.email}: ${data.callOutcome}`);
      
      // Déterminer le nouveau statut en fonction du callOutcome
      let newStatus: 'completed' | 'canceled' | 'no_show' = 'completed'; // Par défaut complété
      
      // Mapper les résultats possibles de iClosed vers nos statuts internes
      if (data.callOutcome.toLowerCase().includes('no show')) {
        newStatus = 'no_show';
      } else if (data.callOutcome.toLowerCase().includes('cancel')) {
        newStatus = 'canceled';
      }
      
      // Préparer les données du résultat
      const outcomeData: Record<string, any> = {
        call_outcome: data.callOutcome,
        timestamp: new Date().toISOString()
      };
      
      // Ajouter les champs optionnels s'ils sont présents
      if (data.noSaleReason) outcomeData.no_sale_reason = data.noSaleReason;
      if (data.objection) outcomeData.objection = data.objection;
      if (data.callStartTime) outcomeData.call_start_time = data.callStartTime;
      if (data.outcomeNotes) outcomeData.notes = data.outcomeNotes;
      if (data.dealValue) outcomeData.deal_value = data.dealValue;
      if (data.productName) outcomeData.product_name = data.productName;
      if (data.dealTransactionType) outcomeData.deal_transaction_type = data.dealTransactionType;
      if (data.dealCreatedAt) outcomeData.deal_created_at = data.dealCreatedAt;
      
      // Rechercher le touchpoint de RDV existant pour le mettre à jour
      this.logger.log(`Looking for existing appointment touchpoint for email=${data.email}, user=${userId}, callStartTime=${data.callStartTime}`);
      
      // Créer un filtre pour trouver le bon touchpoint basé sur callStartTime et email
      const searchEvent = {
          user_id: userId,
          event_type: 'rdv_scheduled',
          master_lead_id: masterLeadId,
          event_data: { // Utiliser event_data pour filtrer sur le callStartTime et l'email
            email: data.email,
            call_start_time: data.callStartTime
          }
        };
      
      this.logger.log(`Search criteria: ${JSON.stringify(searchEvent)}`);
      const searchResult = await this.touchpointsService.findAndUpdateByEvent(searchEvent,
        newStatus,
        outcomeData
      );
      
      if (searchResult.success && searchResult.touchpoint) {
        this.logger.log(`Successfully updated touchpoint ${searchResult.touchpoint.id} to ${newStatus} status`);
        
        // Si c'est exactement 'Sale', créer un touchpoint supplémentaire de type 'payment_succeeded'
        // Note: Nous vérifions strictement que callOutcome est exactement 'Sale' (vérification de valeur exacte)
        if (data.callOutcome === 'Sale' && data.dealValue) {
          this.logger.log(`Creating payment touchpoint for sale: ${data.dealValue}`);
          
          await this.touchpointsService.create({
            event_type: 'payment_succeeded',
            visitor_id: data.visitorId || `generated_${Date.now()}`, // Générer un ID si absent
            user_id: userId,
            master_lead_id: masterLeadId,
            source: 'iclosed',
            status: 'completed' as 'completed', // Cast explicit pour satisfaire TypeScript
            event_data: {
              email: data.email,
              amount: data.dealValue,
              currency: 'EUR', // Par défaut, peut être modifié si l'information est disponible
              product_name: data.productName || 'Unnamed Product',
              payment_type: data.dealTransactionType || 'one_time',
              timestamp: new Date().toISOString()
            }
          });
        }
      } else {
        // Touchpoint non trouvé, créer un nouveau touchpoint avec le statut final
        this.logger.warn(`No existing appointment touchpoint found for ${data.email}, creating fallback touchpoint`);
        
        // Créer un touchpoint avec un event_type qui indique clairement qu'il s'agit d'un résultat direct
        const fallbackTouchpointData = {
          event_type: 'rdv_completed_iclosed', // Touchpoint spécial pour indiquer qu'il s'agit d'un résultat direct sans RDV préalable
          visitor_id: data.visitorId || `generated_${Date.now()}`, // Générer un ID si absent
          user_id: userId,
          master_lead_id: masterLeadId,
          source: 'iclosed',
          status: newStatus as 'completed' | 'canceled' | 'no_show', // Cast explicit pour satisfaire TypeScript
          event_data: {
            email: data.email,
            source_tool: 'iclosed',
            ...outcomeData
          }
        };
        
        await this.touchpointsService.create(fallbackTouchpointData);
        
        // Si c'est une vente, créer également un touchpoint de paiement
        if (data.callOutcome.toLowerCase().includes('sale') && data.dealValue) {
          this.logger.log(`Creating payment touchpoint for direct sale: ${data.dealValue}`);
          
          await this.touchpointsService.create({
            event_type: 'payment_succeeded',
            visitor_id: data.visitorId || `generated_${Date.now()}`, // Générer un ID si absent
            user_id: userId,
            master_lead_id: masterLeadId,
            source: 'iclosed',
            status: 'completed' as 'completed', // Cast explicit pour satisfaire TypeScript
            event_data: {
              email: data.email,
              amount: data.dealValue,
              currency: 'EUR',
              product_name: data.productName || 'Unnamed Product',
              payment_type: data.dealTransactionType || 'one_time',
              timestamp: new Date().toISOString()
            }
          });
        }
      }
      
      this.logger.log(`Successfully processed iClosed call outcome webhook for ${data.email}, outcome: ${data.callOutcome}`);
    } else {
      // C'est un événement de réservation de RDV initial
      this.logger.log(`Processing initial appointment booking for ${data.email}`);
      
      // Créer le touchpoint de rendez-vous programmé
      const touchpointData = {
        event_type: 'rdv_scheduled',
        visitor_id: data.visitorId || `generated_${Date.now()}`, // Générer un ID si absent
        user_id: userId,
        master_lead_id: masterLeadId,
        source: 'iclosed',
        status: 'scheduled' as 'scheduled', // Cast explicit pour satisfaire TypeScript
        event_data: {
          email: data.email,
          source_tool: 'iclosed',
          booking_uri: null,
          // Stocker callStartTime si disponible, utile pour retrouver ce touchpoint plus tard
          call_start_time: data.callStartTime || null,
          timestamp: new Date().toISOString()
        }
      };
      
      await this.touchpointsService.create(touchpointData);
      
      this.logger.log(`Successfully processed iClosed appointment booking for ${data.email}, masterLeadId: ${masterLeadId}`);
    }
  }

  /**
   * Traite les webhooks d'opt-in reçus pour la création de lead et le stitching
   * 
   * @param data Données du webhook d'opt-in
   * @returns Les informations du master lead créé ou récupéré
   */
  async handleOptinWebhook(data: OptinWebhookDto): Promise<{ master_lead_id: string; visitor_id: string; email: string }> {
    this.logger.log('Processing Opt-in Webhook for API Key:', data.apiKey);
    this.logger.debug('Opt-in Webhook Data:', {
      email: data.email,
      visitorId: data.visitorId,
      source: data.source || 'optin_webhook'
    });

    // 1. Valider l'API Key pour trouver le userId
    const userId = await this.usersService.findUserIdByApiKey(data.apiKey);
    
    if (!userId) {
      this.logger.error('Invalid API Key received:', data.apiKey);
      throw new UnauthorizedException('Invalid API Key');
    }
    
    this.logger.log(`User identified with API Key: ${data.apiKey}, userId: ${userId}`);
    
    // 1.5 S'assurer que le visiteur existe dans la table visitors avant de l'associer
    if (data.visitorId) {
      this.logger.log(`Creating or updating visitor: ${data.visitorId}`);
      await this.visitorsService.createOrUpdate({
        visitor_id: data.visitorId,
        // Données minimales requises pour créer un visiteur
        metadata: { source: 'optin_webhook', sourceDetail: data.source }
      });
    }
    
    // 2. Créer ou récupérer le master lead avec les informations disponibles
    const masterLead = await this.masterLeadService.findOrCreateMasterLead(
      { email: data.email, visitor_id: data.visitorId },
      userId,
      data.source || 'optin_webhook'
    );
    
    const masterLeadId = masterLead.id;
    this.logger.log(`Master Lead created or retrieved: ${masterLeadId}`);
    
    // 3. Enregistrer le touchpoint d'opt-in
    const touchpointData = {
      event_type: 'optin',
      visitor_id: data.visitorId,
      user_id: userId,
      master_lead_id: masterLeadId,
      source: data.source || 'optin_webhook',
      event_data: {
        email: data.email,
        ...data.eventData || {},
        timestamp: new Date().toISOString()
      }
    };
    
    await this.touchpointsService.create(touchpointData);
    
    this.logger.log(`Successfully processed opt-in webhook for email ${data.email}, masterLeadId: ${masterLeadId}`);
    
    return {
      master_lead_id: masterLeadId,
      visitor_id: data.visitorId,
      email: data.email
    };
  }
}
