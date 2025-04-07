import { Test, TestingModule } from '@nestjs/testing';
import { CalendlyAuthService } from './calendly.auth.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { IntegrationsService } from '../integrations/integrations.service';
import { CalendlyV2Service } from '../calendly-v2/calendly-v2.service';
import { SupabaseService } from '../supabase/supabase.service';
import { of, throwError } from 'rxjs';

describe('CalendlyAuthService', () => {
  let service: CalendlyAuthService;
  let configService: ConfigService;
  let httpService: HttpService;
  let integrationsService: IntegrationsService;
  let calendlyV2Service: CalendlyV2Service;
  let supabaseService: SupabaseService;

  const TEST_USER_ID = 'test-user-123';
  const TEST_CLIENT_ID = 'test-client-id';
  const TEST_CLIENT_SECRET = 'test-client-secret';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendlyAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              if (key === 'CALENDLY_CLIENT_ID') return TEST_CLIENT_ID;
              if (key === 'CALENDLY_CLIENT_SECRET') return TEST_CLIENT_SECRET;
              if (key === 'CALENDLY_REDIRECT_URI') return 'http://localhost:3000/api/auth/calendly/callback';
              if (key === 'CALENDLY_SCOPES') return 'read_events write_webhooks';
              if (key === 'FRONTEND_URL') return 'http://localhost:3000';
              return null;
            }),
          },
        },
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
          },
        },
        {
          provide: IntegrationsService,
          useValue: {
            getIntegrationConfig: jest.fn(),
            deleteIntegration: jest.fn(),
          },
        },
        {
          provide: CalendlyV2Service,
          useValue: {
            setupWebhookForUser: jest.fn(),
          },
        },
        {
          provide: SupabaseService,
          useValue: {
            getAdminClient: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CalendlyAuthService>(CalendlyAuthService);
    configService = module.get<ConfigService>(ConfigService);
    httpService = module.get<HttpService>(HttpService);
    integrationsService = module.get<IntegrationsService>(IntegrationsService);
    calendlyV2Service = module.get<CalendlyV2Service>(CalendlyV2Service);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('revokeIntegration', () => {
    it('should revoke an integration successfully when tokens exist', async () => {
      // Arrange
      const mockConfig = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
      };
      
      (integrationsService.getIntegrationConfig as jest.Mock).mockResolvedValue(mockConfig);
      (integrationsService.deleteIntegration as jest.Mock).mockResolvedValue(true);
      (httpService.post as jest.Mock).mockReturnValue(of({ data: {} }));
      
      // Act
      const result = await service.revokeIntegration(TEST_USER_ID);
      
      // Assert
      expect(result).toBe(true);
      expect(integrationsService.getIntegrationConfig).toHaveBeenCalledWith(TEST_USER_ID, 'calendly');
      expect(httpService.post).toHaveBeenCalledWith(
        'https://auth.calendly.com/oauth/revoke',
        expect.any(URLSearchParams),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded'
          })
        })
      );
      expect(integrationsService.deleteIntegration).toHaveBeenCalledWith(TEST_USER_ID, 'calendly');
    });
    
    it('should return true when no integration exists', async () => {
      // Arrange
      (integrationsService.getIntegrationConfig as jest.Mock).mockResolvedValue(null);
      
      // Act
      const result = await service.revokeIntegration(TEST_USER_ID);
      
      // Assert
      expect(result).toBe(true);
      expect(integrationsService.getIntegrationConfig).toHaveBeenCalledWith(TEST_USER_ID, 'calendly');
      expect(httpService.post).not.toHaveBeenCalled();
      expect(integrationsService.deleteIntegration).not.toHaveBeenCalled();
    });
    
    it('should not fail if token revocation API call fails', async () => {
      // Arrange
      const mockConfig = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
      };
      
      (integrationsService.getIntegrationConfig as jest.Mock).mockResolvedValue(mockConfig);
      (integrationsService.deleteIntegration as jest.Mock).mockResolvedValue(true);
      (httpService.post as jest.Mock).mockReturnValue(throwError(() => new Error('API Error')));
      
      // Act
      const result = await service.revokeIntegration(TEST_USER_ID);
      
      // Assert
      expect(result).toBe(true); // Should still succeed even if token revocation fails
      expect(integrationsService.deleteIntegration).toHaveBeenCalledWith(TEST_USER_ID, 'calendly');
    });
    
    it('should return false if integration deletion fails', async () => {
      // Arrange
      const mockConfig = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
      };
      
      (integrationsService.getIntegrationConfig as jest.Mock).mockResolvedValue(mockConfig);
      (integrationsService.deleteIntegration as jest.Mock).mockResolvedValue(false);
      (httpService.post as jest.Mock).mockReturnValue(of({ data: {} }));
      
      // Act
      const result = await service.revokeIntegration(TEST_USER_ID);
      
      // Assert
      expect(result).toBe(false);
      expect(integrationsService.deleteIntegration).toHaveBeenCalledWith(TEST_USER_ID, 'calendly');
    });
    
    it('should handle exceptions and return false', async () => {
      // Arrange
      (integrationsService.getIntegrationConfig as jest.Mock).mockRejectedValue(new Error('Test error'));
      
      // Act
      const result = await service.revokeIntegration(TEST_USER_ID);
      
      // Assert
      expect(result).toBe(false);
    });
  });
});
