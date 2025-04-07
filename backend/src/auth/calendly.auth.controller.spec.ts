import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { CalendlyAuthController } from './calendly.auth.controller';
import { CalendlyAuthService } from './calendly.auth.service';
import { IntegrationsService } from '../integrations/integrations.service';

describe('CalendlyAuthController', () => {
  let controller: CalendlyAuthController;
  let integrationsService: IntegrationsService;

  // Mock des services
  const mockCalendlyAuthService = {
    generateAuthUrl: jest.fn(),
    handleCallback: jest.fn(),
    revokeIntegration: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'FRONTEND_URL') return 'http://localhost:3000';
      return null;
    }),
  };

  const mockIntegrationsService = {
    getUserIntegrationStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CalendlyAuthController],
      providers: [
        { provide: CalendlyAuthService, useValue: mockCalendlyAuthService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: IntegrationsService, useValue: mockIntegrationsService },
      ],
    }).compile();

    controller = module.get<CalendlyAuthController>(CalendlyAuthController);
    integrationsService = module.get<IntegrationsService>(IntegrationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCalendlyStatus', () => {
    it('should return isConnected: true when user has active Calendly integration', async () => {
      // Arrange
      const req = { user: { id: 'user-123' } };
      mockIntegrationsService.getUserIntegrationStatus.mockResolvedValue(true);

      // Act
      const result = await controller.getCalendlyStatus(req);

      // Assert
      expect(result).toEqual({ isConnected: true });
      expect(mockIntegrationsService.getUserIntegrationStatus).toHaveBeenCalledWith('user-123', 'calendly');
    });

    it('should return isConnected: false when user does not have active Calendly integration', async () => {
      // Arrange
      const req = { user: { id: 'user-123' } };
      mockIntegrationsService.getUserIntegrationStatus.mockResolvedValue(false);

      // Act
      const result = await controller.getCalendlyStatus(req);

      // Assert
      expect(result).toEqual({ isConnected: false });
      expect(mockIntegrationsService.getUserIntegrationStatus).toHaveBeenCalledWith('user-123', 'calendly');
    });

    it('should throw UnauthorizedException when user is not found in request', async () => {
      // Arrange
      const req = { user: null };

      // Act & Assert
      await expect(controller.getCalendlyStatus(req)).rejects.toThrow(UnauthorizedException);
      expect(mockIntegrationsService.getUserIntegrationStatus).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException when integration service throws error', async () => {
      // Arrange
      const req = { user: { id: 'user-123' } };
      mockIntegrationsService.getUserIntegrationStatus.mockRejectedValue(new Error('DB error'));

      // Act & Assert
      await expect(controller.getCalendlyStatus(req)).rejects.toThrow(InternalServerErrorException);
      expect(mockIntegrationsService.getUserIntegrationStatus).toHaveBeenCalledWith('user-123', 'calendly');
    });
  });

  describe('revokeCalendly', () => {
    it('should return success message when integration is revoked successfully', async () => {
      // Arrange
      const req = { user: { id: 'user-123' } };
      mockCalendlyAuthService.revokeIntegration.mockResolvedValue(true);

      // Act
      const result = await controller.revokeCalendly(req);

      // Assert
      expect(result).toEqual({ success: true, message: 'Calendly integration revoked successfully.' });
      expect(mockCalendlyAuthService.revokeIntegration).toHaveBeenCalledWith('user-123');
    });

    it('should throw UnauthorizedException when user is not found in request', async () => {
      // Arrange
      const req = { user: null };

      // Act & Assert
      await expect(controller.revokeCalendly(req)).rejects.toThrow(UnauthorizedException);
      expect(mockCalendlyAuthService.revokeIntegration).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException when revocation fails', async () => {
      // Arrange
      const req = { user: { id: 'user-123' } };
      mockCalendlyAuthService.revokeIntegration.mockResolvedValue(false);

      // Act & Assert
      await expect(controller.revokeCalendly(req)).rejects.toThrow(InternalServerErrorException);
      expect(mockCalendlyAuthService.revokeIntegration).toHaveBeenCalledWith('user-123');
    });

    it('should throw InternalServerErrorException when service throws error', async () => {
      // Arrange
      const req = { user: { id: 'user-123' } };
      mockCalendlyAuthService.revokeIntegration.mockRejectedValue(new Error('Service error'));

      // Act & Assert
      await expect(controller.revokeCalendly(req)).rejects.toThrow(InternalServerErrorException);
      expect(mockCalendlyAuthService.revokeIntegration).toHaveBeenCalledWith('user-123');
    });
  });
});
