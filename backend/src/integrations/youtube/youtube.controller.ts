import { Controller, Get, Post, Query, Req, UseGuards, Logger, Param, Res, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { YouTubeAuthService } from './youtube-auth.service';
import { YouTubeDataService } from './youtube-data.service';
import { AuthService } from '../../auth/auth.service';
import { SupabaseService } from '../../supabase/supabase.service';

@Controller('auth/youtube')
export class YouTubeController {
  private readonly logger = new Logger(YouTubeController.name);
  
  constructor(
    private readonly youtubeAuthService: YouTubeAuthService,
    private readonly configService: ConfigService,
    private readonly youtubeDataService: YouTubeDataService,
    private readonly moduleRef: ModuleRef,
    private readonly supabaseService: SupabaseService,
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
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
   * Simple diagnostic endpoint to verify API connectivity
   */
  @Get('diagnostic')
  async diagnostic() {
    this.logger.log('Diagnostic endpoint called successfully');
    return { 
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      ngrokUrl: process.env.NGROK_PUBLIC_URL,
      youtubeRedirectUri: process.env.YOUTUBE_REDIRECT_URI,
      message: 'If you see this, the API connection is working properly'
    };
  }

  /**
   * Test route that doesn't require authentication
   * WARNING: This is for testing purposes only and should be removed in production
   */
  @Get('test-authorize')
  async testAuthorize() {
    try {
      // Log extensive debug info to troubleshoot the issue
      this.logger.log('Test-authorize endpoint called');
      this.logger.log(`Environment: ${process.env.NODE_ENV}`);
      this.logger.log(`NGROK URL: ${process.env.NGROK_PUBLIC_URL}`);
      this.logger.log(`YouTube redirect URI: ${process.env.YOUTUBE_REDIRECT_URI}`);
      
      // Use a test user ID - this should be a valid user ID from your database
      const testUserId = '1'; // Change this to a valid user ID in your database
      this.logger.log(`Generating auth URL for test user: ${testUserId}`);
      const authUrl = await this.youtubeAuthService.generateAuthUrl(testUserId);
      this.logger.log(`Auth URL generated: ${authUrl}`);
      
      return { authUrl };
    } catch (error) {
      this.logger.error(`Error generating test authorization URL: ${error.message}`);
      this.logger.error(error.stack);
      return { error: 'Failed to initiate YouTube test authorization', details: error.message };
    }
  }

  /**
   * Handle the callback from Google OAuth
   */
  @Get('callback')
  async handleCallback(@Query('code') code: string, @Query('state') state: string, @Query('error') error: string, @Res() res) {
    // Frontend app URL to redirect to after OAuth
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://funnel.doctor';
    
    // Handle OAuth errors
    if (error) {
      this.logger.error(`OAuth error: ${error}`);
      const redirectUrl = `${frontendUrl}/settings/integrations?youtube_status=error&message=${encodeURIComponent(error)}`;
      this.logger.log(`Manual redirect to: ${redirectUrl}`);
      return res.redirect(302, redirectUrl);
    }
    
    // Validate required parameters
    if (!code || !state) {
      const redirectUrl = `${frontendUrl}/settings/integrations?youtube_status=error&message=${encodeURIComponent('Missing required parameters')}`;
      this.logger.log(`Manual redirect to: ${redirectUrl}`);
      return res.redirect(302, redirectUrl);
    }
    
    try {
      // Process the callback
      const result = await this.youtubeAuthService.handleCallback(code, state);
      this.logger.log(`Callback processed successfully for userId=${result.userId}`);
      
      if (result.success && result.userId) {
        // Utiliser les services injectés directement (plus besoin de moduleRef)
        let userToken: string | null = null;
        
        try {
          // Récupérer les informations de l'utilisateur depuis la base de données
          const { data: userData, error: userError } = await this.supabaseService.getAdminClient()
            .from('users')
            .select('*')
            .eq('id', result.userId)
            .single();
          
          if (userData && !userError) {
            // Générer un nouveau JWT en utilisant le service JWT injecté
            const payload = { sub: userData.id, email: userData.email };
            
            // Option 1: Utiliser directement JwtService injecté
            userToken = this.jwtService.sign(payload);
            
            // Option 2 (alternative): Utiliser authService.login qui génère aussi un token
            // const authResult = await this.authService.login({ email: userData.email, id: userData.id });
            // userToken = authResult.access_token;
            
            this.logger.log(`Génération réussie d'un nouveau JWT pour userId=${result.userId}`);
          } else {
            this.logger.error(`Impossible de récupérer les données utilisateur: ${userError?.message}`);
          }
        } catch (tokenError) {
          this.logger.error(`Erreur lors de la génération du token: ${tokenError.message}`);
        }
        
        // Inclure le token dans les paramètres de redirection (dans un hash fragment pour plus de sécurité)
        const tokenParam = userToken ? `#token=${encodeURIComponent(userToken)}` : '';
        const redirectUrl = `${frontendUrl}/settings/integrations?youtube_status=success${tokenParam}`;
        
        this.logger.log(`Redirection vers: ${redirectUrl.split('#')[0]} (avec token JWT: ${userToken ? 'oui' : 'non'})`);
        this.logger.log(`État de l'authentification YouTube: intégration réussie pour l'utilisateur ${result.userId}`);
        return res.redirect(302, redirectUrl);
      } else {
        const redirectUrl = `${frontendUrl}/settings/integrations?youtube_status=error&message=${encodeURIComponent(result.error || 'Unknown error')}`;
        this.logger.log(`Redirection vers: ${redirectUrl} (état: erreur)`);
        return res.redirect(302, redirectUrl);
      }
    } catch (error) {
      this.logger.error(`Callback error: ${error.message}`);
      const redirectUrl = `${frontendUrl}/settings/integrations?youtube_status=error&message=${encodeURIComponent('Internal server error')}`;
      this.logger.log(`Redirection vers: ${redirectUrl} (état: erreur interne)`);
      return res.redirect(302, redirectUrl);
    }
  }

  /**
   * Check the status of the user's YouTube integration
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@Req() req) {
    // Log détaillé de la requête pour diagnostiquer les problèmes CORS
    this.logger.log(`[BACKEND STATUS] Request received for /api/auth/youtube/status - Method: ${req.method}`);
    this.logger.log(`[BACKEND STATUS] Headers: ${JSON.stringify(req.headers)}`);
    this.logger.log(`[BACKEND STATUS] Origin: ${req.headers.origin}`);
    
    try {
      const userId = req.user?.id;
      
      // Vérification de sécurité: s'assurer que l'ID utilisateur est disponible
      if (!userId) {
        this.logger.warn(`[BACKEND STATUS] Missing user ID in request`);
        return { integrated: false, error: 'Authentication error: user not identified' };
      }
      
      this.logger.log(`[BACKEND STATUS] Checking integration status for user: ${userId}`);
      const isValid = await this.youtubeAuthService.hasValidIntegration(userId);
      
      this.logger.log(`[BACKEND STATUS] Integration status for user ${userId}: ${isValid ? 'VALID' : 'INVALID'}`);
      return { integrated: isValid };
    } catch (error) {
      this.logger.error(`[BACKEND STATUS] Error checking integration status: ${error.message}`);
      this.logger.error(error.stack);
      return { integrated: false, error: 'Failed to check integration status' };
    }
  }

  /**
   * Revoke a user's YouTube integration (JWT auth required)
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
   * Revoke a user's YouTube integration by userId parameter
   * This endpoint matches what the frontend is calling
   */
  @Post('revoke/:userId')
  async revokeIntegrationByUserId(@Param('userId') userId: string) {
    try {
      this.logger.log(`Revoking YouTube integration for user ${userId}`);
      const success = await this.youtubeAuthService.revokeIntegration(userId);
      
      if (success) {
        this.logger.log(`Successfully revoked YouTube integration for user ${userId}`);
        return { success: true, message: 'Integration successfully revoked' };
      } else {
        this.logger.warn(`Failed to revoke YouTube integration for user ${userId}`);
        return { success: false, message: 'Failed to revoke integration' };
      }
    } catch (error) {
      this.logger.error(`Error revoking integration for user ${userId}: ${error.message}`);
      return { success: false, error: 'Failed to revoke integration', message: error.message };
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

  /**
   * Endpoint de test pour vérifier la validité de l'intégration YouTube et les vidéos d'un utilisateur
   * Cet endpoint permet de diagnostiquer rapidement si un utilisateur peut récupérer des vidéos
   */
  @Get('frontend-test/:userId')
  async frontendTest(@Param('userId') userId: string, @Query('limit') limit: string = '1') {
    try {
      // Vérifier si l'intégration est valide
      const hasValidIntegration = await this.youtubeAuthService.hasValidIntegration(userId);
      this.logger.log(`[TEST] Utilisateur ${userId} a une intégration valide: ${hasValidIntegration}`);
      
      if (!hasValidIntegration) {
        return {
          userId,
          hasValidIntegration: false,
          message: 'Aucune intégration YouTube valide trouvée pour cet utilisateur'
        };
      }
      
      // Récupérer quelques vidéos (sans les stocker)
      const limitNum = parseInt(limit, 10) || 1;
      this.logger.log(`[TEST] Récupération de ${limitNum} vidéos pour l'utilisateur ${userId}`);
      this.logger.log(`[TEST] EXPLICATION: Cet endpoint est configuré par défaut pour ne récupérer qu'UNE SEULE vidéo (limit=1) pour des tests rapides. Pour obtenir plus de vidéos, ajouter le paramètre ?limit=X à l'URL.`);
      this.logger.log(`[TEST] INFO DISPARITÉ: La différence entre le nombre de vidéos API (${limitNum}) et DB est normale - les vidéos en base ont été collectées au fil du temps par des appels répétés avec stockage en base.`);
      
      const { videos } = await this.youtubeDataService.getUserVideos(
        userId, 
        { limit: limitNum }, 
        false // Ne pas stocker en DB
      );
      
      // Récupérer le nombre de vidéos stockées en base
      let storedVideosCount = 0;
      try {
        const storedVideos = await this.youtubeDataService.getStoredVideos(userId);
        storedVideosCount = storedVideos?.length || 0;
      } catch (error) {
        this.logger.error(`[TEST] Erreur lors de la récupération des vidéos stockées: ${error.message}`);
      }
      
      return {
        userId,
        hasValidIntegration: true,
        apiVideosCount: videos.length,
        storedVideosCount,
        apiVideosSample: videos.length > 0 ? videos.map(v => ({
          id: v.id,
          title: v.title,
          publishedAt: v.publishedAt,
          viewCount: v.stats?.viewCount || 0
        })) : [],
        message: videos.length > 0 
          ? `${videos.length} vidéos récupérées via l'API, ${storedVideosCount} vidéos stockées en base` 
          : "Aucune vidéo trouvée via l'API YouTube. Vérifiez que l'utilisateur a bien des vidéos sur sa chaîne."
      };
    } catch (error) {
      this.logger.error(`[TEST] Erreur lors du test front-end: ${error.message}`, error.stack);
      return {
        userId,
        hasValidIntegration: false,
        error: error.message,
        message: 'Une erreur est survenue lors du test'
      };
    }
  }
}
