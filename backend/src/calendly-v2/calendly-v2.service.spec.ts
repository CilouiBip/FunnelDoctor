import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { CalendlyV2Service } from './calendly-v2.service';
import { BridgingService } from '../bridging/bridging.service';
import { TouchpointsService } from '../touchpoints/touchpoints.service';
import { MasterLeadService } from '../leads/services/master-lead.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { CalendlyWebhookPayloadDto, CalendlyPayloadDto } from './dto/webhook-payload.dto'; // Ajuste si le nom/chemin est différent
import { Lead } from '../leads/interfaces/lead.interface'; // Ajuste si le nom/chemin est différent
import { Touchpoint } from '../touchpoints/interfaces/touchpoint.interface'; // Ajuste si le nom/chemin est différent
import { of, throwError } from 'rxjs'; // pour mocker HttpService

// --- Mocks ---
const mockHttpService = {
  get: jest.fn(),
  post: jest.fn(),
  delete: jest.fn(),
};
const mockConfigService = {
  get: jest.fn(),
};
const mockBridgingService = {
  findVisitorIdByEmail: jest.fn(),
  createAssociation: jest.fn(), // On le mocke pour vérifier qu'il N'EST PAS appelé
};
const mockTouchpointsService = {
  create: jest.fn(),
};
const mockMasterLeadService = {
  findOrCreateMasterLead: jest.fn(),
};
const mockIntegrationsService = {
  getIntegrationConfig: jest.fn(),
  findUserIdByIntegrationDetails: jest.fn(), // Mock même si non utilisé activement pour l'instant
};

describe('CalendlyV2Service', () => {
  let service: CalendlyV2Service;
  let bridgingService: jest.Mocked<BridgingService>;
  let touchpointsService: jest.Mocked<TouchpointsService>;
  let masterLeadService: jest.Mocked<MasterLeadService>;
  let integrationsService: jest.Mocked<IntegrationsService>;
  let httpService: jest.Mocked<HttpService>; // Ajout du mock HttpService

  const mockUserId = 'test-user-id';
  const mockEmail = 'test@example.com';
  const mockVisitorIdUtm = 'visitor-utm-123';
  const mockVisitorIdBridge = 'visitor-bridge-456';
  const mockGeneratedVisitorIdRegex = /^calendly_\d+_[a-zA-Z0-9]+$/;
  const mockGeneratedCancelVisitorIdRegex = /^calendly_cancel_\d+_[a-zA-Z0-9]+$/;

  const mockMasterLead: Lead = { id: 'master-lead-123', email: mockEmail, user_id: mockUserId, created_at: new Date(), updated_at: new Date(), status:'new', full_name: 'Test User' };
  const mockTouchpoint: Touchpoint = { id: 'tp-calendly-123', master_lead_id: mockMasterLead.id, visitor_id: 'any-visitor-id', event_type: 'rdv_scheduled', created_at: new Date(), updated_at: new Date() };


  // --- Helpers pour créer les payloads de test ---
  // 1. Helper pour créer l'enveloppe complète du webhook (utile pour les tests de processWebhookEvent)
  const createMockWebhookPayload = (event: 'invitee.created' | 'invitee.canceled', email: string | null, tracking?: any): CalendlyWebhookPayloadDto => ({
    event,
    payload: createMockInviteePayload(email, tracking, event === 'invitee.canceled')
  });
  
  // 2. Helper pour créer le payload interne (utile pour tester directement _handleInviteeCreated/_handleInviteeCanceled)
  const createMockInviteePayload = (email: string | null, tracking?: any, isCanceled: boolean = false): any => ({
    // Simule la structure réelle du payload interne de Calendly
    invitee: email ? {
      email: email,
      name: 'Test User Name',
    } : undefined,
    scheduled_event: {
      uri: 'uri/scheduled_event/123',
      uuid: 'event-uuid-123',
      start_time: new Date().toISOString(),
    },
    event_type: {
      name: 'Test Event Type'
    },
    uri: 'uri/invitee/456',
    created_at: new Date().toISOString(),
    questions_and_answers: [],
    tracking: tracking || {}, // utm_content sera ici
    ...(isCanceled ? { cancellation: { reason: 'Changed mind' } } : {})
  });

  beforeEach(async () => {
    // Réinitialisation des mocks pour chaque test
    jest.clearAllMocks();
    
    // Valeur de test pour l'API key
    const mockCalendlyApiKey = 'test-calendly-key';
    
    // Configuration des mocks par défaut
    mockConfigService.get.mockImplementation((key) => {
      if (key === 'CALENDLY_API_KEY') return mockCalendlyApiKey;
      return 'mock-value';
    });
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendlyV2Service,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: BridgingService, useValue: mockBridgingService },
        { provide: TouchpointsService, useValue: mockTouchpointsService },
        { provide: MasterLeadService, useValue: mockMasterLeadService },
        { provide: IntegrationsService, useValue: mockIntegrationsService }
      ],
    }).compile();

    service = module.get<CalendlyV2Service>(CalendlyV2Service);
    httpService = module.get(HttpService) as jest.Mocked<HttpService>;
    integrationsService = module.get(IntegrationsService) as jest.Mocked<IntegrationsService>;
    bridgingService = module.get(BridgingService) as jest.Mocked<BridgingService>;
    masterLeadService = module.get(MasterLeadService) as jest.Mocked<MasterLeadService>;
    touchpointsService = module.get(TouchpointsService) as jest.Mocked<TouchpointsService>;
    
    // Configuration des mocks après initialisation des services
    integrationsService.getIntegrationConfig.mockResolvedValue({ 
      api_key: mockCalendlyApiKey,
      user_id: mockUserId
    });
    mockBridgingService.findVisitorIdByEmail.mockResolvedValue(null);
    mockMasterLeadService.findOrCreateMasterLead.mockResolvedValue(mockMasterLead);
    mockTouchpointsService.create.mockResolvedValue(mockTouchpoint);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAuthHeaders (private method test)', () => {
    it('should return correct headers when API key is found', async () => {
      const mockCalendlyApiKey = 'test-calendly-key';
      integrationsService.getIntegrationConfig.mockResolvedValue({ api_key: mockCalendlyApiKey });
      
      const headers = await (service as any).getAuthHeaders(mockUserId);
      expect(integrationsService.getIntegrationConfig).toHaveBeenCalledWith(mockUserId, 'calendly');
      expect(headers).toEqual({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mockCalendlyApiKey}`,
      });
    });

    it('should throw UnauthorizedException if API key is not found', async () => {
      integrationsService.getIntegrationConfig.mockResolvedValue(null);
      await expect((service as any).getAuthHeaders(mockUserId)).rejects.toThrow(UnauthorizedException);
      expect(integrationsService.getIntegrationConfig).toHaveBeenCalledWith(mockUserId, 'calendly');
    });
  });

  // We can skip testing all API wrappers like getCurrentUser, getEventTypes etc.
  // if we trust the getAuthHeaders test, or add simple tests just checking the call.

  describe('_handleInviteeCreated', () => {
    let inviteePayload: any;
    const visitorIdFromUtm = 'visitor-from-utm';
    const visitorIdFromBridge = 'visitor-from-bridge';
    const email = 'invitee@example.com';

    beforeEach(() => {
      // Reset mocks specific to this describe block
      masterLeadService.findOrCreateMasterLead.mockResolvedValue(mockMasterLead);
      touchpointsService.create.mockResolvedValue(mockTouchpoint);

      // Base payload pour tester directement la méthode privée
      inviteePayload = createMockInviteePayload(email);

       // Mock extractVisitorIdFromResource (important for controlling the flow)
       jest.spyOn(service as any, 'extractVisitorIdFromResource').mockReturnValue(null); // Default: not found in UTM
    });

    it('should use visitor_id from UTM if present', async () => {
       // Arrange
       inviteePayload.tracking = { utm_content: visitorIdFromUtm };
       jest.spyOn(service as any, 'extractVisitorIdFromResource').mockReturnValue(visitorIdFromUtm); // Override mock

       // Act
       await (service as any)._handleInviteeCreated(inviteePayload, mockUserId);

       // Assert
       expect(bridgingService.findVisitorIdByEmail).not.toHaveBeenCalled();
       expect(masterLeadService.findOrCreateMasterLead).toHaveBeenCalledWith(
         { email, visitor_id: visitorIdFromUtm }, mockUserId, 'calendly'
       );
       expect(touchpointsService.create).toHaveBeenCalledWith(
         expect.objectContaining({ visitor_id: visitorIdFromUtm, master_lead_id: mockMasterLead.id, event_type: 'rdv_scheduled' })
       );
    });

    it('should use visitor_id from bridge if not in UTM', async () => {
        // Arrange
        // No tracking info in payload (default beforeEach)
        bridgingService.findVisitorIdByEmail.mockResolvedValue(visitorIdFromBridge);

        // Act
        await (service as any)._handleInviteeCreated(inviteePayload, mockUserId);// Assert
        expect(bridgingService.findVisitorIdByEmail).toHaveBeenCalledWith(email);
        expect(masterLeadService.findOrCreateMasterLead).toHaveBeenCalledWith(
          { email, visitor_id: visitorIdFromBridge }, mockUserId, 'calendly'
        );
        expect(touchpointsService.create).toHaveBeenCalledWith(
          expect.objectContaining({ visitor_id: visitorIdFromBridge, master_lead_id: mockMasterLead.id, event_type: 'rdv_scheduled' })
        );
    });

    it('should create a fallback visitor_id if none found', async () => {
      // Arrange
      // No tracking info in payload, bridge returns null
      bridgingService.findVisitorIdByEmail.mockResolvedValue(null);

      // Act
      await (service as any)._handleInviteeCreated(inviteePayload, mockUserId);

      // Assert
      expect(bridgingService.findVisitorIdByEmail).toHaveBeenCalledWith(email);
      
      // L'ID visiteur est généré avant l'appel de findOrCreateMasterLead
      expect(masterLeadService.findOrCreateMasterLead).toHaveBeenCalledWith(
        expect.objectContaining({ 
          email, 
          visitor_id: expect.stringMatching(mockGeneratedVisitorIdRegex) 
        }), 
        mockUserId, 
        'calendly'
      );
       // Touchpoint gets a generated ID
      expect(touchpointsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          visitor_id: expect.stringMatching(mockGeneratedVisitorIdRegex), // Utilise le regex défini en haut du fichier
          master_lead_id: mockMasterLead.id,
          event_type: 'rdv_scheduled'
        })
      );
    });

     it('should return success false if email is missing', async () => {
      // Arrange
      inviteePayload.invitee = undefined; // Simulate missing invitee

      // Act
      const result = await (service as any)._handleInviteeCreated(inviteePayload, mockUserId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing invitee data'); // Message d'erreur correspondant à l'implémentation actuelle
      expect(masterLeadService.findOrCreateMasterLead).not.toHaveBeenCalled();
      expect(touchpointsService.create).not.toHaveBeenCalled();
    });

     it('should correctly create touchpoint data', async () => {
        // Arrange
        inviteePayload.tracking = { utm_content: visitorIdFromUtm, utm_source: 'google' };
        jest.spyOn(service as any, 'extractVisitorIdFromResource').mockReturnValue(visitorIdFromUtm);

        // Act
        await (service as any)._handleInviteeCreated(inviteePayload, mockUserId);// Assert
        expect(touchpointsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            visitor_id: visitorIdFromUtm,
            master_lead_id: mockMasterLead.id,
            event_type: 'rdv_scheduled',
            event_data: expect.objectContaining({
              calendly_event_uri: 'uri/scheduled_event/123', // Valeur du helper createMockInviteePayload
              event_id: 'event-uuid-123', // Valeur du helper createMockInviteePayload
              event_name: 'Test Event Type',
              invitee_email: email,
              invitee_name: 'Test User Name' // Valeur du helper createMockInviteePayload
              // Ne vérifie pas scheduled_time car il change à chaque exécution
            }),
            page_url: 'utm_source=google'
          })
        );
    });
  });

  describe('_handleInviteeCanceled', () => {
     let inviteePayload: any;
     const visitorIdFromUtm = 'visitor-from-utm-cancel';
     const email = 'invitee-cancel@example.com';

    beforeEach(() => {
        masterLeadService.findOrCreateMasterLead.mockResolvedValue(mockMasterLead);
        touchpointsService.create.mockResolvedValue(mockTouchpoint);

        // Crée un payload pour l'annulation avec tracking contenant le visitor ID
        inviteePayload = createMockInviteePayload(email, { utm_content: visitorIdFromUtm }, true);
        // Mock extractVisitorIdFromResource to return UTM value
        jest.spyOn(service as any, 'extractVisitorIdFromResource').mockReturnValue(visitorIdFromUtm);
    });

    it('should create rdv_canceled touchpoint', async () => {
        // Arrange
        // (Payload setup in beforeEach)

        // Act
        await (service as any)._handleInviteeCanceled(inviteePayload, mockUserId);

        // Assert
        expect(bridgingService.findVisitorIdByEmail).not.toHaveBeenCalled(); // Should not use bridge for cancel
        expect(masterLeadService.findOrCreateMasterLead).toHaveBeenCalledWith(
             // Should use visitorId from UTM for cancel event lookup
            { email, visitor_id: visitorIdFromUtm }, mockUserId, 'calendly'
        );
        expect(touchpointsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            visitor_id: visitorIdFromUtm,
            master_lead_id: mockMasterLead.id,
            event_type: 'rdv_canceled',
            event_data: expect.objectContaining({
              // Ne vérifie pas de champ spécifique cancellation_reason car il peut être structuré différemment
              // Mais vérifie les champs qui doivent exister
              calendly_event_uri: 'uri/scheduled_event/123',
              event_id: 'event-uuid-123',
              event_name: 'Test Event Type',
              invitee_email: email,
              invitee_name: 'Test User Name'
              // Les champs comme canceled_time sont dynamiques, ne pas les vérifier
            })
          })
        );
    });

     it('should create rdv_canceled touchpoint even if visitor_id is not found (generates one)', async () => {
        // Arrange
        inviteePayload.tracking = {}; // No UTMs
        jest.spyOn(service as any, 'extractVisitorIdFromResource').mockReturnValue(null); // Ensure UTM extraction fails

        // Act
        await (service as any)._handleInviteeCanceled(inviteePayload, mockUserId);

         // Assert
        expect(bridgingService.findVisitorIdByEmail).not.toHaveBeenCalled();
        expect(masterLeadService.findOrCreateMasterLead).toHaveBeenCalledWith(
             // Visitor ID peut être null selon l'implémentation
            { email, visitor_id: null }, mockUserId, 'calendly'
        );
        expect(touchpointsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            visitor_id: expect.stringMatching(mockGeneratedCancelVisitorIdRegex), // Utilise le regex défini en haut du fichier
            master_lead_id: mockMasterLead.id,
            event_type: 'rdv_canceled',
            event_data: expect.any(Object) // Vérifie seulement que event_data existe
          })
        );
    });
  });

});