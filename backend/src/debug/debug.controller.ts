import { Controller, Get, Inject, Logger } from '@nestjs/common';
import { CalendlyV2Service } from '../calendly-v2/calendly-v2.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WebhooksService } from '../webhooks/webhooks.service';
import { IclosedWebhookDto } from '../webhooks/dto/iclosed-webhook.dto';

@ApiTags('Debug')
@Controller('debug')
export class DebugController {
  private readonly logger = new Logger(DebugController.name);

  constructor(
    @Inject('IS_DEBUG_ENABLED') private readonly isDebugEnabled: boolean,
    private readonly calendlyV2Service: CalendlyV2Service,
    private readonly webhooksService: WebhooksService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get debug module status' })
  @ApiResponse({ status: 200, description: 'Debug module status' })
  getStatus() {
    this.logger.log('Debug status request received');
    
    return {
      success: true,
      message: 'Debug module is operational',
      debugEnabled: this.isDebugEnabled,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('funnel-steps')
  @ApiOperation({ summary: 'Get funnel steps for debugging' })
  @ApiResponse({ status: 200, description: 'Funnel steps retrieved successfully' })
  async getFunnelSteps() {
    this.logger.log('Debug funnel steps request received');
    
    // Redirection vers l'endpoint existant
    return {
      success: true,
      message: 'Use /api/funnel-steps/debug endpoint for funnel steps data',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('visitors')
  @ApiOperation({ summary: 'Get visitors for debugging' })
  @ApiResponse({ status: 200, description: 'Visitors retrieved successfully' })
  async getVisitors() {
    this.logger.log('Debug visitors request received');
    
    return {
      success: true,
      message: 'Visitors debug endpoint functioning',
      note: 'This endpoint will be fully implemented in the next iteration',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('leads')
  @ApiOperation({ summary: 'Get leads for debugging' })
  @ApiResponse({ status: 200, description: 'Leads retrieved successfully' })
  async getLeads() {
    this.logger.log('Debug leads request received');
    
    return {
      success: true,
      message: 'Leads debug endpoint functioning',
      note: 'This endpoint will be fully implemented in the next iteration',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('touchpoints')
  @ApiOperation({ summary: 'Get touchpoints for debugging' })
  @ApiResponse({ status: 200, description: 'Touchpoints retrieved successfully' })
  async getTouchpoints() {
    this.logger.log('Debug touchpoints request received');
    
    return {
      success: true,
      message: 'Touchpoints debug endpoint functioning',
      note: 'This endpoint will be fully implemented in the next iteration',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('test-iclosed-booked')
  @ApiOperation({ summary: 'Test iClosed Call Booked logic directly' })
  @ApiResponse({ status: 200, description: 'iClosed Call Booked test results' })
  async testIclosedCallBooked() {
    this.logger.log('[TEST DIRECT ICLOSED BOOKED] Démarrage du test direct de la logique de réservation iClosed');
    
    // Préparer les données de test pour simuler une réservation iClosed
    const fakePayloadBooked: Partial<IclosedWebhookDto> = { 
      apiKey: '3b5833bf-609f-494d-be58-1efee8fdec6e', // Utilise la clé API fournie
      email: 'test-booked-iclosed@funneldoctor.test',
      visitorId: 'fd_test_visitor_booked_iclosed',
      callStartTime: new Date().toISOString() 
    };
    
    this.logger.log(`[TEST DIRECT ICLOSED BOOKED] Payload: ${JSON.stringify(fakePayloadBooked)}`);
    
    try {
      await this.webhooksService.handleIclosedWebhook(fakePayloadBooked as IclosedWebhookDto);
      
      this.logger.log('[TEST DIRECT ICLOSED BOOKED] Test réussi');
      return { 
        success: true, 
        message: 'Test direct de la réservation iClosed exécuté avec succès', 
        payload: fakePayloadBooked,
        timestamp: new Date().toISOString() 
      };
    } catch (error) {
      this.logger.error(`[TEST DIRECT ICLOSED BOOKED] Erreur: ${error.message}`, error.stack);
      return { 
        success: false, 
        message: 'Erreur lors du test direct de la réservation iClosed', 
        error: error.message,
        payload: fakePayloadBooked,
        timestamp: new Date().toISOString() 
      };
    }
  }

  @Get('test-iclosed-outcome-sale')
  @ApiOperation({ summary: 'Test iClosed Call Outcome Sale logic directly' })
  @ApiResponse({ status: 200, description: 'iClosed Call Outcome Sale test results' })
  async testIclosedCallOutcomeSale() {
    this.logger.log('[TEST DIRECT ICLOSED OUTCOME SALE] Démarrage du test direct de la logique de résultat de vente iClosed');
    
    // Récupérer l'heure de début d'appel utilisée dans le test précédent
    // Pour des raisons de stabilité des tests, on utilise la même heure exacte
    const callStartTime = new Date().toISOString();
    
    // Préparer les données de test pour simuler un résultat d'appel avec vente
    const fakePayloadOutcome: Partial<IclosedWebhookDto> = {
      apiKey: '3b5833bf-609f-494d-be58-1efee8fdec6e',
      email: 'test-booked-iclosed@funneldoctor.test', // MEME EMAIL que le test précédent
      visitorId: 'fd_test_visitor_booked_iclosed', // MEME VISITOR ID que le test précédent
      callStartTime: callStartTime, // Pour ce test, on utilise une nouvelle heure, mais en pratique ce serait la même
      callOutcome: 'Sale', 
      dealValue: 997,
      productName: 'Formation XYZ',
      dealTransactionType: 'one_time',
      outcomeNotes: 'Test de résultat de vente via l\'API de débogage'
    };
    
    this.logger.log(`[TEST DIRECT ICLOSED OUTCOME SALE] Payload: ${JSON.stringify(fakePayloadOutcome)}`);
    
    try {
      await this.webhooksService.handleIclosedWebhook(fakePayloadOutcome as IclosedWebhookDto);
      
      this.logger.log('[TEST DIRECT ICLOSED OUTCOME SALE] Test réussi');
      return { 
        success: true, 
        message: 'Test direct du résultat de vente iClosed exécuté avec succès', 
        payload: fakePayloadOutcome,
        timestamp: new Date().toISOString() 
      };
    } catch (error) {
      this.logger.error(`[TEST DIRECT ICLOSED OUTCOME SALE] Erreur: ${error.message}`, error.stack);
      return { 
        success: false, 
        message: 'Erreur lors du test direct du résultat de vente iClosed', 
        error: error.message,
        payload: fakePayloadOutcome,
        timestamp: new Date().toISOString() 
      };
    }
  }

}
