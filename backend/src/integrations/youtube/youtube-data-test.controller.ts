import { Controller, Get, Param, Query, Logger, NotFoundException } from '@nestjs/common';
import { Public } from '../../auth/decorators/public.decorator';
import { YouTubeDataService, VideoQueryOptions, VideoStatsDTO } from './youtube-data.service';

@Controller('test/youtube')
@Public() // Marquer toutes les routes comme publiques
export class YouTubeDataTestController {
  private readonly logger = new Logger(YouTubeDataTestController.name);
  // ID utilisateur de test - correspond à l'ID dans la table integrations
  private readonly TEST_USER_ID = '1'; // Changé de 'a23b3c5f-d742-4c7a-917b-9e1a18832982' à '1'
  
  constructor(
    private readonly youtubeDataService: YouTubeDataService,
  ) {}

  /**
   * Récupérer la liste des vidéos de l'utilisateur de test
   */
  @Get('videos')
  async getUserVideos(
    @Query('limit') limit?: number,
    @Query('pageToken') pageToken?: string,
    @Query('order') order?: 'date' | 'rating' | 'viewCount' | 'title',
    @Query('refresh') refresh?: boolean
  ) {
    try {
      const userId = this.TEST_USER_ID;
      this.logger.log(`[TEST][DIAGNOSTIC] Récupération des vidéos pour l'utilisateur ${userId}`);
      
      // Convertir les paramètres en format approprié
      const options: VideoQueryOptions = {};
      if (limit) options.limit = parseInt(limit as unknown as string, 10);
      if (pageToken) options.pageToken = pageToken;
      if (order) options.order = order;
      
      // Si refresh est true, récupérer depuis l'API YouTube, sinon depuis la BDD
      const refreshFromApi = refresh === true || (typeof refresh === 'string' && (refresh === 'true' || refresh === ''));
      
      if (refreshFromApi) {
        this.logger.log(`[TEST][DIAGNOSTIC] Rafraîchissement des vidéos depuis l'API YouTube pour l'utilisateur ${userId}`);
        
        // Vérification de l'intégration avant de procéder
        try {
          // Laisser cette ligne pour le diagnostic afin d'afficher toutes les erreurs
          this.logger.log(`[TEST][DIAGNOSTIC] Tentative de récupération des vidéos avec l'ID utilisateur: ${userId}`);
          return this.youtubeDataService.getUserVideos(userId, options, true);
        } catch (error) {
          this.logger.error(`[TEST][DIAGNOSTIC] Erreur détaillée lors de la récupération des vidéos: ${error.message}`, error.stack);
          throw error;
        }
      } else {
        this.logger.log(`[TEST][DIAGNOSTIC] Récupération des vidéos stockées en base de données pour l'utilisateur ${userId}`);
        const videos = await this.youtubeDataService.getStoredVideos(userId, options.limit);
        return { videos, nextPageToken: undefined };
      }
    } catch (error) {
      this.logger.error(`[TEST][DIAGNOSTIC] Erreur lors de la récupération des vidéos: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Récupérer la liste des vidéos stockées en base de données pour l'utilisateur de test
   */
  @Get('stored-videos')
  async getStoredVideos(
    @Query('limit') limit?: number,
    @Query('includeStats') includeStats?: boolean
  ) {
    try {
      const userId = this.TEST_USER_ID;
      this.logger.log(`[TEST] Récupération des vidéos stockées pour l'utilisateur ${userId}`);
      
      const parsedLimit = limit ? parseInt(limit as unknown as string, 10) : 50;
      const shouldIncludeStats = includeStats !== false && (typeof includeStats !== 'string' || includeStats !== 'false');
      
      const videos = await this.youtubeDataService.getStoredVideos(userId, parsedLimit, shouldIncludeStats);
      return { videos };
    } catch (error) {
      this.logger.error(`[TEST] Erreur lors de la récupération des vidéos stockées: ${error.message}`);
      throw error;
    }
  }

  /**
   * Récupérer les détails d'une vidéo spécifique
   */
  @Get('videos/:videoId')
  async getVideoDetails(
    @Param('videoId') videoId: string
  ): Promise<VideoStatsDTO> {
    try {
      const userId = this.TEST_USER_ID;
      this.logger.log(`[TEST] Récupération des détails de la vidéo ${videoId} pour l'utilisateur ${userId}`);
      
      const videoDetails = await this.youtubeDataService.getVideoDetails(userId, videoId);
      if (!videoDetails) {
        throw new NotFoundException(`Video with ID ${videoId} not found.`);
      }
      return videoDetails;
    } catch (error) {
      this.logger.error(`[TEST] Erreur lors de la récupération des détails de la vidéo: ${error.message}`);
      throw error;
    }
  }

  /**
   * Récupérer les commentaires d'une vidéo
   */
  @Get('videos/:videoId/comments')
  async getVideoComments(
    @Param('videoId') videoId: string
  ) {
    try {
      const userId = this.TEST_USER_ID;
      this.logger.log(`[TEST] Récupération des commentaires de la vidéo ${videoId} pour l'utilisateur ${userId}`);
      
      const comments = await this.youtubeDataService.getVideoComments(userId, videoId);
      return { comments };
    } catch (error) {
      this.logger.error(`[TEST] Erreur lors de la récupération des commentaires: ${error.message}`);
      throw error;
    }
  }
}
