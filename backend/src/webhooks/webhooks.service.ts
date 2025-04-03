import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { IclosedWebhookDto } from './dto/iclosed-webhook.dto';
import { UsersService } from '../users/users.service';
import { MasterLeadService } from '../leads/services/master-lead.service';
import { TouchpointsService } from '../touchpoints/touchpoints.service';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly logger: Logger,
    private readonly usersService: UsersService,
    private readonly masterLeadService: MasterLeadService,
    private readonly touchpointsService: TouchpointsService,
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
}
