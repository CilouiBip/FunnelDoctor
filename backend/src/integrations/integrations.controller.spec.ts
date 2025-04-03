import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { SaveCalendlyDto } from './dto/save-calendly.dto';
import { SaveStripeDto } from './dto/save-stripe.dto';
import { SaveAcCkDto } from './dto/save-ac-ck.dto';

describe('IntegrationsController', () => {
  let controller: IntegrationsController;
  let service: IntegrationsService;

  const TEST_USER_ID = 'test-user-123';
  const mockRequest = {
    user: { id: TEST_USER_ID }
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntegrationsController],
      providers: [
        {
          provide: IntegrationsService,
          useValue: {
            saveCalendlyIntegration: jest.fn().mockResolvedValue(true),
            saveStripeIntegration: jest.fn().mockResolvedValue(true),
            saveEmailMarketingIntegration: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    controller = module.get<IntegrationsController>(IntegrationsController);
    service = module.get<IntegrationsService>(IntegrationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('saveCalendlyIntegration', () => {
    it('should call service.saveCalendlyIntegration with correct parameters', async () => {
      // Arrange
      const dto: SaveCalendlyDto = { apiKey: 'calendly-api-key-123' };
      
      // Act
      const result = await controller.saveCalendlyIntegration(mockRequest, dto);
      
      // Assert
      expect(service.saveCalendlyIntegration).toHaveBeenCalledWith(TEST_USER_ID, dto);
      expect(result).toEqual({ success: true });
    });
  });

  describe('saveStripeIntegration', () => {
    it('should call service.saveStripeIntegration with correct parameters', async () => {
      // Arrange
      const dto: SaveStripeDto = {
        publishableKey: 'pk_test_123',
        secretKey: 'sk_test_456'
      };
      
      // Act
      const result = await controller.saveStripeIntegration(mockRequest, dto);
      
      // Assert
      expect(service.saveStripeIntegration).toHaveBeenCalledWith(TEST_USER_ID, dto);
      expect(result).toEqual({ success: true });
    });
  });

  describe('saveEmailMarketingIntegration', () => {
    it('should call service.saveEmailMarketingIntegration with correct parameters for ActiveCampaign', async () => {
      // Arrange
      const dto: SaveAcCkDto = {
        apiKey: 'ac-api-key-789',
        apiUrl: 'https://account.api-us1.com',
        type: 'ac'
      };
      
      // Act
      const result = await controller.saveEmailMarketingIntegration(mockRequest, dto);
      
      // Assert
      expect(service.saveEmailMarketingIntegration).toHaveBeenCalledWith(TEST_USER_ID, dto);
      expect(result).toEqual({ success: true });
    });

    it('should call service.saveEmailMarketingIntegration with correct parameters for ConvertKit', async () => {
      // Arrange
      const dto: SaveAcCkDto = {
        apiKey: 'ck-api-key-012',
        type: 'ck'
      };
      
      // Act
      const result = await controller.saveEmailMarketingIntegration(mockRequest, dto);
      
      // Assert
      expect(service.saveEmailMarketingIntegration).toHaveBeenCalledWith(TEST_USER_ID, dto);
      expect(result).toEqual({ success: true });
    });
  });
});
