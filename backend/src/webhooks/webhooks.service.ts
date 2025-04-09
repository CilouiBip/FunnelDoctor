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
   * Traite les webhooks reu00e7us de Zapier pour les rendez-vous iClosed
   * 
   * @param data Donnu00e9es du webhook iClosed
   * @returns Promise<void>
   */
  async handleIclosedWebhook(data: IclosedWebhookDto): Promise<void> {
    this.logger.log('Processing iClosed Webhook for API Key:', data.apiKey);
    this.logger.debug('iClosed Webhook Data:', {
      email: data.email,
      visitorId: data.visitorId,
      apiKey: data.apiKey,
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
    const masterLead = await this.masterLeadService.findOrCreateMasterLead(
      { email: data.email, visitor_id: data.visitorId },
      userId,
      'iclosed'
    );
    
    const masterLeadId = masterLead.id;
    
    // 3. Enregistrer le touchpoint de rendez-vous
    const touchpointData = {
      event_type: 'rdv_scheduled',
      visitor_id: data.visitorId,
      user_id: userId,
      master_lead_id: masterLeadId,
      source: 'iclosed',
      event_data: {
        email: data.email,
        source_tool: 'iclosed',
        booking_uri: null,
        timestamp: new Date().toISOString()
      }
    };
    
    await this.touchpointsService.create(touchpointData);
    
    this.logger.log(`Successfully processed iClosed webhook for email ${data.email}, masterLeadId: ${masterLeadId}`);
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
