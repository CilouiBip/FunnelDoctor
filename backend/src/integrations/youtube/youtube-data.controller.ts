import { Controller, Get, Param, Query, Req, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { YouTubeDataService, VideoDTO, VideoQueryOptions, VideoStatsDTO } from './youtube-data.service';

@Controller('youtube')
export class YouTubeDataController {
  private readonly logger = new Logger(YouTubeDataController.name);
  
  constructor(
    private readonly youtubeDataService: YouTubeDataService,
  ) {}

  /**
   * Récupérer la liste des vidéos de l'utilisateur authentifié
   * @param req Requête HTTP avec info utilisateur
   * @param options Options de pagination et tri
   * @returns Liste des vidéos avec statistiques de base
   */
  @Get('videos')
  @UseGuards(JwtAuthGuard)
  async getUserVideos(
    @Req() req,
    @Query('limit') limit?: number,
    @Query('pageToken') pageToken?: string,
    @Query('order') order?: 'date' | 'rating' | 'viewCount' | 'title',
    @Query('refresh') refresh?: boolean
  ) {
    try {
      const userId = req.user.id;
      this.logger.log(`Récupération des vidéos pour l'utilisateur ${userId}`);
      
      // Convertir les paramètres en format approprié
      const options: VideoQueryOptions = {};
      if (limit) options.limit = parseInt(limit as unknown as string, 10);
      if (pageToken) options.pageToken = pageToken;
      if (order) options.order = order;
      
      // Si refresh est true, récupérer depuis l'API YouTube, sinon depuis la BDD
      const refreshFromApi = refresh === true || (typeof refresh === 'string' && (refresh === 'true' || refresh === ''));
      
      if (refreshFromApi) {
        this.logger.log(`Rafraîchissement des vidéos depuis l'API YouTube pour l'utilisateur ${userId}`);
        return this.youtubeDataService.getUserVideos(userId, options, true);
      } else {
        this.logger.log(`Récupération des vidéos stockées en base de données pour l'utilisateur ${userId}`);
        const videos = await this.youtubeDataService.getStoredVideos(userId, options.limit);
        return { videos, nextPageToken: undefined };
      }
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des vidéos: ${error.message}`);
      throw error;
    }
  }

  /**
   * Récupérer la liste des vidéos stockées en base de données pour l'utilisateur authentifié
   * @param req Requête HTTP avec info utilisateur
   * @param limit Nombre maximum de vidéos à récupérer
   * @param includeStats Si true, inclut les dernières statistiques pour chaque vidéo
   * @returns Liste des vidéos avec leurs statistiques
   */
  @Get('stored-videos')
  @UseGuards(JwtAuthGuard)
  async getStoredVideos(
    @Req() req,
    @Query('limit') limit?: number,
    @Query('includeStats') includeStats?: boolean
  ) {
    try {
      const userId = req.user.id;
      this.logger.log(`Récupération des vidéos stockées pour l'utilisateur ${userId}`);
      
      const parsedLimit = limit ? parseInt(limit as unknown as string, 10) : 50;
      const shouldIncludeStats = includeStats !== false && (typeof includeStats !== 'string' || includeStats !== 'false');
      
      const videos = await this.youtubeDataService.getStoredVideos(userId, parsedLimit, shouldIncludeStats);
      return { videos };
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des vidéos stockées: ${error.message}`);
      throw error;
    }
  }

  /**
   * Récupérer les détails d'une vidéo spécifique
   * @param req Requête HTTP avec info utilisateur
   * @param videoId ID de la vidéo YouTube
   * @returns Détails complets de la vidéo avec statistiques
   */
  @Get('videos/:videoId')
  @UseGuards(JwtAuthGuard)
  async getVideoDetails(
    @Req() req,
    @Param('videoId') videoId: string
  ): Promise<VideoStatsDTO> {
    try {
      const userId = req.user.id;
      this.logger.log(`Récupération des détails de la vidéo ${videoId} pour l'utilisateur ${userId}`);
      
      return this.youtubeDataService.getVideoDetails(userId, videoId);
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des détails de la vidéo: ${error.message}`);
      throw error;
    }
  }

  /**
   * Récupérer les commentaires d'une vidéo spécifique
   * @param req Requête HTTP avec info utilisateur
   * @param videoId ID de la vidéo YouTube
   * @param maxResults Nombre maximum de commentaires à récupérer
   * @returns Liste des commentaires pour la vidéo
   */
  @Get('videos/:videoId/comments')
  @UseGuards(JwtAuthGuard)
  async getVideoComments(
    @Req() req,
    @Param('videoId') videoId: string,
    @Query('maxResults') maxResults?: number
  ) {
    try {
      const userId = req.user.id;
      this.logger.log(`Récupération des commentaires pour la vidéo ${videoId}`);
      
      const comments = await this.youtubeDataService.getVideoComments(
        userId, 
        videoId, 
        maxResults ? parseInt(maxResults as unknown as string, 10) : undefined
      );
      
      return { comments };
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des commentaires: ${error.message}`);
      throw error;
    }
  }
}
