import { Controller, Get, Query, Redirect, Req, UseGuards, Logger, Param } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { YouTubeAuthService } from './youtube-auth.service';

@Controller('auth/youtube')
export class YouTubeController {
  private readonly logger = new Logger(YouTubeController.name);
  
  constructor(
    private readonly youtubeAuthService: YouTubeAuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate an authorization URL and redirect the user to Google's OAuth page
   */
  @Get('authorize')
  @UseGuards(JwtAuthGuard)
  async authorize(@Req() req) {
    try {
      const userId = req.user.id;
      const authUrl = await this.youtubeAuthService.generateAuthUrl(userId);
      
      return { authUrl };
    } catch (error) {
      this.logger.error(`Error generating authorization URL: ${error.message}`);
      return { error: 'Failed to initiate YouTube authorization' };
    }
  }

  /**
   * Test route that doesn't require authentication
   * WARNING: This is for testing purposes only and should be removed in production
   */
  @Get('test-authorize')
  async testAuthorize() {
    try {
      // Use a test user ID - this should be a valid user ID from your database
      const testUserId = '1'; // Change this to a valid user ID in your database
      const authUrl = await this.youtubeAuthService.generateAuthUrl(testUserId);
      
      return { authUrl };
    } catch (error) {
      this.logger.error(`Error generating test authorization URL: ${error.message}`);
      return { error: 'Failed to initiate YouTube test authorization' };
    }
  }

  /**
   * Handle the callback from Google OAuth
   */
  @Get('callback')
  @Redirect()
  async handleCallback(@Query('code') code: string, @Query('state') state: string, @Query('error') error: string) {
    // Frontend app URL to redirect to after OAuth
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://funnel.doctor';
    
    // Handle OAuth errors
    if (error) {
      this.logger.error(`OAuth error: ${error}`);
      return {
        url: `${frontendUrl}/integrations/youtube?status=error&message=${encodeURIComponent(error)}`,
      };
    }
    
    // Validate required parameters
    if (!code || !state) {
      return {
        url: `${frontendUrl}/integrations/youtube?status=error&message=${encodeURIComponent('Missing required parameters')}`,
      };
    }
    
    try {
      // Process the callback
      const result = await this.youtubeAuthService.handleCallback(code, state);
      
      if (result.success) {
        return {
          url: `${frontendUrl}/integrations/youtube?status=success`,
        };
      } else {
        return {
          url: `${frontendUrl}/integrations/youtube?status=error&message=${encodeURIComponent(result.error || 'Unknown error')}`,
        };
      }
    } catch (error) {
      this.logger.error(`Callback error: ${error.message}`);
      return {
        url: `${frontendUrl}/integrations/youtube?status=error&message=${encodeURIComponent('Internal server error')}`,
      };
    }
  }

  /**
   * Check the status of the user's YouTube integration
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@Req() req) {
    try {
      const userId = req.user.id;
      const isValid = await this.youtubeAuthService.hasValidIntegration(userId);
      
      return { integrated: isValid };
    } catch (error) {
      this.logger.error(`Error checking integration status: ${error.message}`);
      return { integrated: false, error: 'Failed to check integration status' };
    }
  }

  /**
   * Revoke a user's YouTube integration
   */
  @Get('revoke')
  @UseGuards(JwtAuthGuard)
  async revokeIntegration(@Req() req) {
    try {
      const userId = req.user.id;
      const success = await this.youtubeAuthService.revokeIntegration(userId);
      
      return { success };
    } catch (error) {
      this.logger.error(`Error revoking integration: ${error.message}`);
      return { success: false, error: 'Failed to revoke integration' };
    }
  }

  /**
   * Debug endpoint - only available in development
   */
  @Get('debug/:userId')
  async debugIntegration(@Param('userId') userId: string) {
    // Only allow in development environment
    const isDev = this.configService.get<string>('NODE_ENV') !== 'production';
    
    if (!isDev) {
      return { error: 'Debug endpoints are not available in production' };
    }
    
    try {
      const isValid = await this.youtubeAuthService.hasValidIntegration(userId);
      
      return {
        userId,
        integrated: isValid,
      };
    } catch (error) {
      return { error: error.message };
    }
  }
}
