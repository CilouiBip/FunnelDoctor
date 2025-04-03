import { Test } from '@nestjs/testing';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { UsersService } from '../users/users.service';
import { MasterLeadService } from '../leads/services/master-lead.service';
import { TouchpointsService } from '../touchpoints/touchpoints.service';
import { IclosedWebhookDto } from './dto/iclosed-webhook.dto';

// Pour simplifier les tests, nous utiliserons des types partiels
type PartialAny = any;

describe('WebhooksService Integration Tests', () => {
  let webhooksService: WebhooksService;
  let usersService: jest.Mocked<Pick<UsersService, 'findUserIdByApiKey'>>;
  let masterLeadService: jest.Mocked<Pick<MasterLeadService, 'findOrCreateMasterLead'>>;
  let touchpointsService: jest.Mocked<Pick<TouchpointsService, 'create'>>;
  let logger: jest.Mocked<Pick<Logger, 'log' | 'error' | 'debug'>>;

  beforeEach(async () => {
    // Create mocks for all dependencies
    usersService = {
      findUserIdByApiKey: jest.fn(),
    };

    masterLeadService = {
      findOrCreateMasterLead: jest.fn(),
    };

    touchpointsService = {
      create: jest.fn(),
    };

    logger = {
      log: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    // Create testing module
    const moduleRef = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: Logger, useValue: logger },
        { provide: UsersService, useValue: usersService },
        { provide: MasterLeadService, useValue: masterLeadService },
        { provide: TouchpointsService, useValue: touchpointsService }
      ],
    }).compile();

    webhooksService = moduleRef.get<WebhooksService>(WebhooksService);
  });

  describe('handleIclosedWebhook', () => {
    // Test case 1: Success scenario
    it('should process webhook successfully with valid API key', async () => {
      // Arrange
      const validDto: IclosedWebhookDto = {
        email: 'test@example.com',
        visitorId: '12345678-abcd-4321-efgh-123456789012',
        apiKey: 'valid-api-key-12345',
      };

      const mockUserId = 'user-123';
      const mockMasterLeadId = 'master-lead-456';

      // Setup mocks
      usersService.findUserIdByApiKey.mockResolvedValue(mockUserId);
      // Utilisation d'un mock simplifié avec le cast any pour ignorer les erreurs de type
      masterLeadService.findOrCreateMasterLead.mockResolvedValue({
        id: mockMasterLeadId,
        email: validDto.email
      } as PartialAny);
      
      touchpointsService.create.mockResolvedValue({
        id: 'touchpoint-789'
      } as PartialAny);

      // Act
      await webhooksService.handleIclosedWebhook(validDto);

      // Assert
      expect(usersService.findUserIdByApiKey).toHaveBeenCalledWith(validDto.apiKey);
      expect(masterLeadService.findOrCreateMasterLead).toHaveBeenCalledWith(
        { email: validDto.email, visitor_id: validDto.visitorId },
        mockUserId,
        'iclosed'
      );
      expect(touchpointsService.create).toHaveBeenCalledWith(expect.objectContaining({
        event_type: 'rdv_scheduled',
        visitor_id: validDto.visitorId,
        user_id: mockUserId,
        master_lead_id: mockMasterLeadId,
        source: 'iclosed',
        event_data: expect.objectContaining({
          email: validDto.email,
          source_tool: 'iclosed',
          booking_uri: null
        })
      }));
    });

    // Test case 2: Invalid API key scenario
    it('should throw UnauthorizedException when API key is invalid', async () => {
      // Arrange
      const invalidDto: IclosedWebhookDto = {
        email: 'test@example.com',
        visitorId: '12345678-abcd-4321-efgh-123456789012',
        apiKey: 'invalid-api-key',
      };

      // Setup mocks
      usersService.findUserIdByApiKey.mockResolvedValue(null);

      // Act & Assert
      await expect(async () => {
        await webhooksService.handleIclosedWebhook(invalidDto);
      }).rejects.toThrow(UnauthorizedException);

      // Verify downstream services were NOT called
      expect(masterLeadService.findOrCreateMasterLead).not.toHaveBeenCalled();
      expect(touchpointsService.create).not.toHaveBeenCalled();

      // Verify error was logged
      expect(logger.error).toHaveBeenCalledWith(
        'Invalid API Key received:',
        invalidDto.apiKey
      );
    });
  });
});
