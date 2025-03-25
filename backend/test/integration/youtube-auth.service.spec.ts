import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { SupabaseService } from '../../src/supabase/supabase.service';
import { EncryptionService } from '../../src/integrations/encryption/encryption.service';
import { YouTubeAuthService } from '../../src/integrations/youtube/youtube-auth.service';
import { of } from 'rxjs';

describe('YouTubeAuthService', () => {
  let service: YouTubeAuthService;
  let httpService: HttpService;
  let supabaseService: SupabaseService;
  
  // Mock admin client for Supabase
  const mockAdminClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YouTubeAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key) => {
              const config = {
                'YOUTUBE_CLIENT_ID': '652703869964-g45dnpe0iqorjcu0brngo8i1vdkhnje1.apps.googleusercontent.com',
                'YOUTUBE_CLIENT_SECRET': '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',
                'YOUTUBE_REDIRECT_URI': 'https://funnel.doctor.ngrok.app/api/auth/youtube/callback',
                'YOUTUBE_SCOPES': 'https://www.googleapis.com/auth/youtube.readonly,https://www.googleapis.com/auth/yt-analytics.readonly',
                'ENCRYPTION_KEY': 'some_random_strong_key_for_encryption_32chars'
              };
              return config[key];
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
          provide: SupabaseService,
          useValue: {
            getAdminClient: jest.fn().mockReturnValue(mockAdminClient),
          },
        },
        {
          provide: EncryptionService,
          useValue: {
            encrypt: jest.fn(text => `encrypted_${text}`),
            decrypt: jest.fn(text => text.replace('encrypted_', '')),
          },
        },
      ],
    }).compile();

    service = module.get<YouTubeAuthService>(YouTubeAuthService);
    httpService = module.get<HttpService>(HttpService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateAuthUrl', () => {
    it('should generate a valid authorization URL', async () => {
      // Mock the state generation and storage
      mockAdminClient.insert.mockResolvedValueOnce({ error: null });

      const userId = 'test-user-123';
      const authUrl = await service.generateAuthUrl(userId);

      // Verify the URL structure
      expect(authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(authUrl).toContain('client_id=');
      expect(authUrl).toContain('redirect_uri=');
      expect(authUrl).toContain('response_type=code');
      expect(authUrl).toContain('scope=');
      expect(authUrl).toContain('state=');
      
      // Verify that the state was stored
      expect(mockAdminClient.from).toHaveBeenCalledWith('oauth_states');
      expect(mockAdminClient.insert).toHaveBeenCalled();
    });

    it('should log OAuth events when generating auth URL', async () => {
      // Mock the state generation and storage
      mockAdminClient.insert.mockResolvedValue({ error: null });

      const userId = 'test-user-123';
      await service.generateAuthUrl(userId);

      // Check that OAuth event was logged
      expect(mockAdminClient.from).toHaveBeenCalledWith('oauth_events');
      expect(mockAdminClient.insert).toHaveBeenCalled();
    });
  });

  describe('handleCallback', () => {
    it('should exchange code for tokens and store them', async () => {
      // Mock state validation
      mockAdminClient.single.mockResolvedValueOnce({
        data: { data: { userId: 'test-user-123', nonce: 'test-nonce' } },
        error: null,
      });
      mockAdminClient.delete.mockResolvedValueOnce({ error: null });

      // Mock token exchange
      jest.spyOn(httpService, 'post').mockImplementationOnce(() =>
        of({
          data: {
            access_token: 'youtube-access-token',
            refresh_token: 'youtube-refresh-token',
            expires_in: 3600,
            token_type: 'Bearer',
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: { url: '' },
        })
      );

      // Mock token storage
      mockAdminClient.upsert.mockResolvedValueOnce({ error: null });
      mockAdminClient.insert.mockResolvedValueOnce({ error: null }); // For OAuth event logging

      const result = await service.handleCallback(
        'test-auth-code',
        'test-state-value'
      );

      // Verify result
      expect(result.success).toBeTruthy();
      expect(result.userId).toEqual('test-user-123');

      // Verify HTTP call to exchange code
      expect(httpService.post).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          code: 'test-auth-code',
          grant_type: 'authorization_code',
        }),
        expect.any(Object)
      );

      // Verify token storage
      expect(mockAdminClient.from).toHaveBeenCalledWith('integrations');
      expect(mockAdminClient.upsert).toHaveBeenCalled();
    });

    it('should handle invalid state parameter', async () => {
      // Mock invalid state validation
      mockAdminClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Record not found' },
      });

      const result = await service.handleCallback(
        'test-auth-code',
        'invalid-state-value'
      );

      // Verify result
      expect(result.success).toBeFalsy();
      expect(result.error).toContain('Invalid or expired state parameter');
      
      // Verify no token exchange was attempted
      expect(httpService.post).not.toHaveBeenCalled();
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh tokens successfully', async () => {
      // Mock getting current tokens
      mockAdminClient.single.mockResolvedValueOnce({
        data: {
          config: {
            access_token: 'encrypted_old-access-token',
            refresh_token: 'encrypted_youtube-refresh-token',
            expires_at: Math.floor(Date.now() / 1000) - 100, // Expired
          },
        },
        error: null,
      });

      // Mock token refresh response
      jest.spyOn(httpService, 'post').mockImplementationOnce(() =>
        of({
          data: {
            access_token: 'new-access-token',
            expires_in: 3600,
            token_type: 'Bearer',
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: { url: '' },
        })
      );

      // Mock token storage
      mockAdminClient.upsert.mockResolvedValueOnce({ error: null });
      mockAdminClient.insert.mockResolvedValueOnce({ error: null }); // For OAuth event logging

      const result = await service.refreshAccessToken('test-user-123');

      // Verify result
      expect(result).toBeTruthy();

      // Verify HTTP call to refresh token
      expect(httpService.post).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          refresh_token: 'youtube-refresh-token', // Decrypted
          grant_type: 'refresh_token',
        }),
        expect.any(Object)
      );

      // Verify token storage
      expect(mockAdminClient.from).toHaveBeenCalledWith('integrations');
      expect(mockAdminClient.upsert).toHaveBeenCalled();
    });

    it('should handle missing refresh token', async () => {
      // Mock getting current tokens with no refresh token
      mockAdminClient.single.mockResolvedValueOnce({
        data: {
          config: {
            access_token: 'encrypted_old-access-token',
            // No refresh_token
            expires_at: Math.floor(Date.now() / 1000) - 100, // Expired
          },
        },
        error: null,
      });

      const result = await service.refreshAccessToken('test-user-123');

      // Verify result
      expect(result).toBeFalsy();
      
      // Verify no token refresh was attempted
      expect(httpService.post).not.toHaveBeenCalled();
    });
  });
});
