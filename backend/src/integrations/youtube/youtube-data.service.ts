import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { youtube_v3 } from 'googleapis';
import { IntegrationService } from '../integration.service';
import { YouTubeTokenRefreshService } from './youtube-token-refresh.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { YouTubeStorageService } from './youtube-storage.service';
import { YouTubeAuthService } from './youtube-auth.service';
import { YouTubeAnalyticsService } from './youtube-analytics.service';

export interface VideoQueryOptions {
  limit?: number;
  pageToken?: string;
  order?: 'date' | 'rating' | 'viewCount' | 'title';
}

/** Base structure for standard YouTube video data. */
export interface VideoDTO {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnailUrl: string;
  channelId: string;
  channelTitle: string;
  stats: {
    viewCount: number;
    likeCount: number;
    commentCount: number;
    favoriteCount: number;
    // Données d'engagement enrichies depuis la base de données
    engagementRate?: number;
    engagementLevel?: string;
  };
  duration: string;
  tags?: string[];
  dbId?: string; // ID in DB after storing
  analytics?: {
    watchTimeMinutes?: number;
    averageViewDuration?: number;
    averageViewPercentage?: number;
    cardClickRate?: number;
    cardClicks?: number;
    cardImpressions?: number;
    subscribersGained?: number;
    shares?: number;
    period?: {
      startDate?: string;
      endDate?: string;
    };
  };
}

/** Extended version of VideoDTO for analytics. */
export interface VideoStatsDTO extends VideoDTO {
  engagement?: {
    engagementRate: number;            // Weighted ratio (likes + x*comments) / views
    normalizedEngagementRate?: number; // score 0..1
    engagementLevel?: string;          // textual category
  };
}

@Injectable()
export class YouTubeDataService {
  private readonly logger = new Logger(YouTubeDataService.name);

  constructor(
    private readonly integrationService: IntegrationService,
    private readonly tokenRefreshService: YouTubeTokenRefreshService,
    private readonly supabaseService: SupabaseService,
    private readonly storageService: YouTubeStorageService,
    private readonly youtubeAuthService: YouTubeAuthService,
    private readonly youtubeAnalyticsService: YouTubeAnalyticsService, // Maintenant obligatoire, pas optionnelle
  ) {
    this.logger.log(`YouTubeDataService initialisé avec YouTubeAnalyticsService: ${!!youtubeAnalyticsService}`);
  }

  /**
   * Retrieve user videos from YouTube (live fetch), store them if requested.
   * @param userId Internal user ID (the 'name' field in integrations table)
   * @param options Query options (limit, pageToken, order)
   * @param storeInDb whether to store the fetched videos in DB.
   */
  async getUserVideos(
    userId: string,
    options?: VideoQueryOptions,
    storeInDb: boolean = true,
  ): Promise<{ videos: VideoDTO[]; nextPageToken?: string }> {
    this.logger.debug('=== START YOUTUBE VIDEO RETRIEVAL PROCESS ===');
    this.logger.log(`[DIAGNOSTIC] getUserVideos for userId=${userId}, options=${JSON.stringify(options || {})}, storeInDb=${storeInDb}`);

    // 1) Check valid integration
    const isValidIntegration = await this.youtubeAuthService.hasValidIntegration(userId);
    this.logger.log(`[DIAGNOSTIC] Integration valid? ${isValidIntegration}`);
    if (!isValidIntegration) {
      this.logger.error(`[DIAGNOSTIC] No valid YouTube integration for user ${userId}`);
      throw new UnauthorizedException('No valid YouTube integration');
    }

    // 2) Retrieve tokens from DB
    const tokens = await this.integrationService.getIntegrationConfig(userId, 'youtube');
    if (!tokens || !tokens.access_token) {
      this.logger.error(`[DIAGNOSTIC] No valid token for userId=${userId}`);
      throw new UnauthorizedException('No valid token to access YouTube');
    }

    this.logger.log(`[DIAGNOSTIC] Attempting to get authorized client...`);
    let youtube: youtube_v3.Youtube;
    try {
      youtube = await this.getAuthorizedYouTubeClient(userId);
    } catch (err) {
      this.logger.error(`[DIAGNOSTIC] Error retrieving authorized client: ${err.message}`);
      // Possibly rethrow or handle. We'll rethrow for now.
      throw err;
    }

    // 3) Log query options
    this.logger.log(`[DIAGNOSTIC] API options: ${JSON.stringify(options || {})}`);

    try {
      // 4) Retrieve channel to find uploads playlist
      const channelsResponse = await youtube.channels.list({
        part: ['contentDetails'],
        mine: true,
      });

      if (!channelsResponse.data.items || channelsResponse.data.items.length === 0) {
        this.logger.warn(`[DIAGNOSTIC] No channel found for user ${userId}`);
        return { videos: [] };
      }

      const uploadsPlaylistId = channelsResponse.data.items[0].contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsPlaylistId) {
        this.logger.warn(`[DIAGNOSTIC] No uploads playlist found for user ${userId}`);
        return { videos: [] };
      }

      // 5) Paginate through the playlist items
      let allVideoItems: any[] = [];
      let nextPageToken: string | undefined = options?.pageToken;
      const maxResults = options?.limit ?? 50;
      
      // Log des paramètres de pagination pour diagnostic
      this.logger.log(`[PAGINATION INFO] Demandant max=${maxResults} vidéos, pageToken=${nextPageToken || 'initial'}, userId=${userId}`);
      this.logger.log(`[PAGINATION INFO] Limite appliquée: ${options?.limit ? 'Spécifiée manuellement' : 'Valeur par défaut (50)'}`);
      

      do {
        const playlistResponse = await youtube.playlistItems.list({
          part: ['snippet', 'contentDetails'],
          playlistId: uploadsPlaylistId,
          maxResults: Math.min(50, maxResults - allVideoItems.length),
          pageToken: nextPageToken,
        });

        const items = playlistResponse.data.items || [];
        allVideoItems = [...allVideoItems, ...items];
        nextPageToken = playlistResponse.data.nextPageToken || undefined;
      } while (nextPageToken && allVideoItems.length < maxResults);

      if (allVideoItems.length === 0) {
        this.logger.warn(`[DIAGNOSTIC] No uploaded videos found for user ${userId}`);
        return { videos: [] };
      }

      // 6) Extract video IDs
      const videoIds = allVideoItems
        .map((item) => item.contentDetails?.videoId)
        .filter(Boolean) as string[];

      // 7) Retrieve full details for these videos
      const videosResponse = await youtube.videos.list({
        part: ['snippet', 'statistics', 'contentDetails'],
        id: videoIds,
      });

      if (!videosResponse.data.items) {
        this.logger.warn(`[DIAGNOSTIC] Could not retrieve video details for user ${userId}`);
        return { videos: [] };
      }

      const rawVideos = videosResponse.data.items;
      this.logger.log(`[DIAGNOSTIC] Found ${rawVideos.length} videos from YouTube API for user ${userId}`);
      
      // Log some basic info about the first 3 videos for debugging
      if (rawVideos.length > 0) {
        rawVideos.slice(0, 3).forEach((video, i) => {
          this.logger.debug(`[DIAGNOSTIC] Video ${i+1} sample data: id=${video.id}, title='${video.snippet?.title}', published=${video.snippet?.publishedAt}`);
        });
      }

      // 8) Map them to our DTOs
      const videos = rawVideos.map((item) => this.mapToVideoDTO(item));
      this.logger.log(`[DIAGNOSTIC] Successfully mapped ${videos.length} videos to DTOs`);

      // 9) Optionally store in DB
      if (storeInDb && videos.length > 0) {
        this.logger.log(`[DIAGNOSTIC] Attempting to store ${videos.length} videos in database for user ${userId}`);
        let storedCount = 0;
        
        for (const vid of videos) {
          try {
            const dbId = await this.storageService.storeVideo(userId, vid);
            vid.dbId = dbId;
            storedCount++;
          } catch (storageError) {
            this.logger.error(`[DIAGNOSTIC] Error storing video ${vid.id}: ${storageError.message}`);
          }
        }
        
        this.logger.log(`[DIAGNOSTIC] Successfully stored ${storedCount}/${videos.length} videos in database`);
      } else if (!storeInDb) {
        this.logger.log(`[DIAGNOSTIC] Skipping database storage as requested (storeInDb=false)`);
      }

      // 10) NOUVEAU: Enrichissement avec les statistiques avancées depuis la base de données
      if (videos.length > 0) {
        try {
          this.logger.log(`[DIAGNOSTIC] Enrichissant ${videos.length} vidéos avec les données analytiques avancées de la base de données`);
          
          // 10.1) D'abord, enrichir avec les données stockées en BDD
          const storedVideos = await this.storageService.getUserStoredVideos(userId);
          
          // Créer une map des données stockées pour un accès rapide
          const storedVideosMap = new Map();
          storedVideos.forEach(storedVideo => {
            storedVideosMap.set(storedVideo.video_id, storedVideo);
          });
          
          // Enrichir chaque vidéo avec ses statistiques stockées
          videos.forEach(video => {
            const storedVideo = storedVideosMap.get(video.id);
            if (storedVideo && storedVideo.stats && storedVideo.stats.length > 0) {
              // Prendre les statistiques les plus récentes
              const latestStats = storedVideo.stats.reduce((latest, current) => {
                if (!latest || new Date(current.fetched_at) > new Date(latest.fetched_at)) {
                  return current;
                }
                return latest;
              }, null);
              
              if (latestStats) {
                // Initialiser avec les données analytiques de base
                video.analytics = {
                  watchTimeMinutes: latestStats.watch_time_minutes || 0,
                  averageViewDuration: latestStats.average_view_duration || 0,
                  averageViewPercentage: latestStats.average_view_percentage || 0,
                  cardClickRate: latestStats.card_click_rate || 0,
                  cardClicks: latestStats.card_clicks || 0,
                  cardImpressions: latestStats.card_impressions || 0,
                  subscribersGained: latestStats.subscribers_gained || 0,
                  shares: latestStats.shares || 0,
                  period: {
                    startDate: latestStats.analytics_period_start || '',
                    endDate: latestStats.analytics_period_end || ''
                  }
                };
                
                // Ajouter également les données d'engagement
                video.stats.engagementRate = latestStats.engagement_rate || 0;
                video.stats.engagementLevel = latestStats.engagement_level || 'N/A';
                
                this.logger.debug(`[DIAGNOSTIC] Vidéo ${video.id} enrichie avec analytics de la BDD: rétention=${video.analytics.averageViewPercentage}%, engagement=${video.stats.engagementRate}`);
              }
            } else {
              this.logger.debug(`[DIAGNOSTIC] Aucune donnée analytique trouvée en BDD pour la vidéo ${video.id}`);
            }
          });
          
          this.logger.log(`[DIAGNOSTIC] Enrichissement BDD des vidéos terminé`);
          
          // 10.2) NOUVEAU: Enrichir avec les analytics frais depuis l'API YouTube pour chaque vidéo
          // Vérification robuste de l'existence du service
          if (!this.youtubeAnalyticsService) {
            this.logger.error(`[DIAGNOSTIC] ERREUR CRITIQUE: YouTubeAnalyticsService n'est pas injecté ou disponible!`);
            this.logger.log(`[DIAGNOSTIC] Valeurs des services:
  - youtubeAuthService: ${!!this.youtubeAuthService}
  - tokenRefreshService: ${!!this.tokenRefreshService}
  - storageService: ${!!this.storageService}
  - youtubeAnalyticsService: ${!!this.youtubeAnalyticsService}`);
          } else {
            this.logger.log(`[DIAGNOSTIC] Début de l'enrichissement des vidéos depuis l'API YouTube Analytics...`);
            
            // Récupérer les analytics réelles pour chaque vidéo
            const analyticsPromises = videos.map(async (video) => {
              try {
                // Récupérer les analytics détaillées depuis l'API YouTube
                // Vérification explicite de l'existence du service avant appel pour éviter toute erreur TypeScript
                if (!this.youtubeAnalyticsService) {
                  this.logger.warn(`[DIAGNOSTIC] YouTubeAnalyticsService non disponible pour vidéo ${video.id}`);
                  return; // Sortir de la promesse courante
                }
                
                this.logger.log(`[DIAGNOSTIC] Appel à getVideoDetailedAnalytics pour vidéo ${video.id}`);
                const analytics = await this.youtubeAnalyticsService.getVideoDetailedAnalytics(userId, video.id, 30); // 30 derniers jours
                
                if (analytics) {
                  // Mettre à jour l'objet vidéo avec les données fraîches
                  video.analytics = analytics;
                  
                  // Recalculer l'engagement avec les nouvelles données (ligèrement différent du calcul dans le service storage)
                  const likeWeight = 1;
                  const commentWeight = 5;
                  const engagementScore = video.stats.viewCount > 0
                    ? ((video.stats.likeCount * likeWeight) + (video.stats.commentCount * commentWeight)) / video.stats.viewCount
                    : 0;
                    
                  // Normaliser sur un ratio de 0.1
                  const normalizedEngagement = Math.min(engagementScore / 0.1, 1);
                  
                  // Mettre à jour les stats d'engagement
                  video.stats.engagementRate = parseFloat(engagementScore.toFixed(4));
                  video.stats.engagementLevel = this.getEngagementLevel(normalizedEngagement);
                  
                  this.logger.log(`[DIAGNOSTIC] Analytics enrichies: vidéo ${video.id} - rétention=${analytics.averageViewPercentage.toFixed(2)}%, durée=${analytics.averageViewDuration}s, abonnés=${analytics.subscribersGained}, CTR=${analytics.cardClickRate}%`);
                  
                  // Sauvegarder ces analytics dans la base de données pour les consulter hors-ligne
                  if (video.dbId) {
                    try {
                      // Log détaillé des données qui vont être stockées
                      this.logger.log(`[DIAGNOSTIC] Données analytics prêtes pour stockage:
  - vidéo ID: ${video.id}
  - retention: ${analytics.averageViewPercentage}%
  - durée: ${analytics.averageViewDuration}s
  - abonnés: ${analytics.subscribersGained}
  - partages: ${analytics.shares}
  - cardCTR: ${analytics.cardClickRate}%
  - cardClicks: ${analytics.cardClicks}
  - cardImpr: ${analytics.cardImpressions}`);
                      
                      await this.storageService.storeVideoStats(video.dbId, video.stats, analytics);
                      this.logger.debug(`[DIAGNOSTIC] Analytics sauvegardées en BDD pour vidéo ${video.id}`);
                    } catch (storageError) {
                      this.logger.error(`[DIAGNOSTIC] Erreur sauvegarde analytics en BDD: ${storageError.message}`);
                    }
                  }
                }
              } catch (analyticsError) {
                this.logger.error(`[DIAGNOSTIC] Erreur récupération analytics pour vidéo ${video.id}: ${analyticsError.message}`);
              }
            });
            
            // Attendre que toutes les promesses soient résolues
            await Promise.all(analyticsPromises);
            this.logger.log(`[DIAGNOSTIC] Enrichissement avec YouTube Analytics terminé`);
          }
        } catch (enrichError) {
          this.logger.error(`[DIAGNOSTIC] Erreur lors de l'enrichissement des vidéos avec les analytics: ${enrichError.message}`, enrichError.stack);
          // Ne pas échouer complètement, continuer avec les données de base
        }
      }

      // Check existing videos in DB for this user for comparison
      let dbVideosCount = 0;
      try {
        const dbVideos = await this.storageService.getUserStoredVideos(userId);
        dbVideosCount = dbVideos?.length || 0;
        this.logger.log(`[DIAGNOSTIC] User has ${dbVideosCount} videos already stored in database`);
      } catch (dbError) {
        this.logger.error(`[DIAGNOSTIC] Error checking existing videos in DB: ${dbError.message}`);
      }
      
      this.logger.debug('=== END YOUTUBE VIDEO RETRIEVAL PROCESS ===');
      return {
        videos,
        nextPageToken,
      };
    } catch (error) {
      this.logger.error(`[DIAGNOSTIC] Error fetching user videos: ${error.message}`, error.stack);

      // Check for token invalid
      if (
        error.message.includes('invalid_grant') ||
        error.message.includes('Invalid Credentials') ||
        error.message.includes('401') ||
        error.message.includes('403')
      ) {
        this.logger.warn(`[DIAGNOSTIC] Detected invalid/expired token. auto-revoking for user=${userId}`);
        try {
          await this.youtubeAuthService.revokeIntegration(userId);
          this.logger.log(`[DIAGNOSTIC] YouTube integration revoked for user=${userId}`);
        } catch (revokeError) {
          this.logger.error(`[DIAGNOSTIC] Error revoking integration: ${revokeError.message}`, revokeError.stack);
        }
        return { videos: [] };
      }

      // Otherwise rethrow
      throw error;
    }
  }

  /**
   * Retrieve details (stats) for a single YouTube video.
   * Includes advanced engagement metrics with weighting (like=1, comment=5, etc.).
   */
  async getVideoDetails(userId: string, videoId: string): Promise<VideoStatsDTO> {
    this.logger.debug(`[DIAGNOSTIC] getVideoDetails for videoId=${videoId} userId=${userId}`);

    // get YouTube client
    const youtube = await this.getAuthorizedYouTubeClient(userId);

    try {
      const videoResp = await youtube.videos.list({
        part: ['snippet', 'statistics', 'contentDetails'],
        id: [videoId],
      });

      if (!videoResp.data.items || videoResp.data.items.length === 0) {
        this.logger.warn(`[DIAGNOSTIC] Video not found for videoId=${videoId}`);
        throw new Error(`Video ${videoId} non trouvée`);
      }

      const videoData = videoResp.data.items[0];
      const videoDTO = this.mapToVideoDTO(videoData);

      // Weighted engagement calculation
      const likeWeight = 1;
      const commentWeight = 5;
      const { viewCount, likeCount, commentCount } = videoDTO.stats;
      const engagementScore = viewCount > 0
        ? ((likeCount * likeWeight) + (commentCount * commentWeight)) / viewCount
        : 0;

      // Normaliser sur un ratio de 0.1
      const normalizedEngagement = Math.min(engagementScore / 0.1, 1);

      const videoStatsDTO: VideoStatsDTO = {
        ...videoDTO,
        engagement: {
          engagementRate: parseFloat(engagementScore.toFixed(4)),
          normalizedEngagementRate: parseFloat(normalizedEngagement.toFixed(4)),
          engagementLevel: this.getEngagementLevel(normalizedEngagement),
        }
      };

      // store in DB if needed
      const dbId = await this.storageService.storeVideo(userId, videoStatsDTO);
      videoStatsDTO.dbId = dbId;

      return videoStatsDTO;
    } catch (error) {
      this.logger.error(`[DIAGNOSTIC] Error retrieving video details: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Return an authorized YouTube client for the given user.
   * Refresh token if needed, or throw UnauthorizedException if impossible.
   */
  private async getAuthorizedYouTubeClient(userId: string): Promise<youtube_v3.Youtube> {
    this.logger.log(`[DIAGNOSTIC] getAuthorizedYouTubeClient for userId=${userId}`);

    const tokens = await this.integrationService.getIntegrationConfig(userId, 'youtube');
    if (!tokens) {
      this.logger.error(`[DIAGNOSTIC] No youtube tokens for userId=${userId}`);
      throw new UnauthorizedException('YouTube integration not found');
    }

    // Check expiration & refresh
    try {
      // Du00e9composition du token pour passer les paramu00e8tres requis
      const accessToken = tokens.access_token || '';
      const refreshToken = tokens.refresh_token || '';
      const expiresAt = tokens.expires_at || 0;
      
      this.logger.debug(`[DIAGNOSTIC] Tokens: access=${!!accessToken}, refresh=${!!refreshToken}, expires=${expiresAt}`);
      
      // Vu00e9rification que les tokens nu00e9cessaires sont pru00e9sents
      if (!accessToken || !refreshToken) {
        this.logger.error(`[DIAGNOSTIC] Missing tokens for user=${userId}: access=${!!accessToken}, refresh=${!!refreshToken}`);
        throw new UnauthorizedException('Invalid YouTube authorization tokens');
      }
      
      const freshTokens = await this.tokenRefreshService.ensureFreshAccessToken(
        userId, 
        accessToken, 
        refreshToken, 
        expiresAt
      );
      this.logger.log(`[DIAGNOSTIC] Token successfully refreshed/verified for user=${userId}`);
      // Create client
      return this.tokenRefreshService.createAuthorizedYouTubeClient(freshTokens);
    } catch (err) {
      this.logger.error(`[DIAGNOSTIC] Error refreshing token for user=${userId}: ${err.message}`, err.stack);
      if (
        err.message.includes('invalid_grant') ||
        err.message.includes('Invalid Credentials') ||
        err.message.includes('401') ||
        err.message.includes('403')
      ) {
        this.logger.warn(`[DIAGNOSTIC] Token invalid/expired for user=${userId}, revoking integration`);
        try {
          await this.youtubeAuthService.revokeIntegration(userId);
        } catch (revokeError) {
          this.logger.error(`[DIAGNOSTIC] Error revoking integration: ${revokeError.message}`, revokeError.stack);
        }
        throw new UnauthorizedException('Token invalid, must reconnect YouTube');
      }
      throw err;
    }
  }

  /**
   * Weighted engagement scoring → text label.
   */
  private getEngagementLevel(normalizedScore: number): string {
    if (normalizedScore >= 0.8) {
      return 'Exceptionnel';
    } else if (normalizedScore >= 0.6) {
      return 'Excellent';
    } else if (normalizedScore >= 0.4) {
      return 'Très bon';
    } else if (normalizedScore >= 0.2) {
      return 'Bon';
    } else if (normalizedScore >= 0.1) {
      return 'Moyen';
    } else {
      return 'Faible';
    }
  }

  /**
   * Map raw YouTube video data to our internal DTO.
   */
  private mapToVideoDTO(item: any): VideoDTO {
    if (!item) return {
      id: '',
      title: '',
      description: '',
      publishedAt: '',
      thumbnailUrl: '',
      channelId: '',
      channelTitle: '',
      stats: {
        viewCount: 0,
        likeCount: 0,
        commentCount: 0,
        favoriteCount: 0
      },
      duration: '',
    };

    const snippet = item.snippet || {};
    const statistics = item.statistics || {};
    const contentDetails = item.contentDetails || {};

    // pick best thumbnail
    const thumbs = snippet.thumbnails || {};
    const bestThumb = thumbs.maxres || thumbs.high || thumbs.medium || thumbs.default || {};

    return {
      id: item.id,
      title: snippet.title || 'Sans titre',
      description: snippet.description || '',
      publishedAt: snippet.publishedAt || '',
      thumbnailUrl: bestThumb.url || '',
      channelId: snippet.channelId || '',
      channelTitle: snippet.channelTitle || '',
      stats: {
        viewCount: parseInt(statistics.viewCount || '0', 10),
        likeCount: parseInt(statistics.likeCount || '0', 10),
        commentCount: parseInt(statistics.commentCount || '0', 10),
        favoriteCount: parseInt(statistics.favoriteCount || '0', 10),
      },
      duration: contentDetails.duration || '',
      tags: snippet.tags || [],
    };
  }

  /**
   * Retrieve comments for a specific video.
   */
  async getVideoComments(userId: string, videoId: string, maxResults = 20) {
    this.logger.debug(`[DIAGNOSTIC] getVideoComments for videoId=${videoId}, userId=${userId}`);

    const youtube = await this.getAuthorizedYouTubeClient(userId);

    try {
      const response = await youtube.commentThreads.list({
        part: ['snippet'],
        videoId,
        maxResults,
      });
      if (!response.data.items) {
        return [];
      }
      return response.data.items.map((item) => {
        if (!item.snippet?.topLevelComment?.snippet) {
          return {
            id: item.id || 'unknown',
            text: '',
            authorDisplayName: 'Unknown',
            authorProfileImageUrl: '',
            likeCount: 0,
            publishedAt: '',
          };
        }
        const snippet = item.snippet.topLevelComment.snippet;
        return {
          id: item.id || 'unknown',
          text: snippet.textDisplay || '',
          authorDisplayName: snippet.authorDisplayName || 'Unknown',
          authorProfileImageUrl: snippet.authorProfileImageUrl || '',
          likeCount: snippet.likeCount || 0,
          publishedAt: snippet.publishedAt || '',
        };
      });
    } catch (error) {
      this.logger.error(`[DIAGNOSTIC] Error retrieving comments for videoId=${videoId}: ${error.message}`, error.stack);
      throw new Error(`Error retrieving comments: ${error.message}`);
    }
  }

  /**
   * Retrieve stored videos from the database (no API call).  
   * @param userId User ID for which to retrieve stored videos
   * @param limit Maximum number of videos to retrieve
   * @param includeStats Whether to include detailed statistics
   */
  async getStoredVideos(userId: string, limit?: number, includeStats?: boolean): Promise<VideoDTO[]> {
    this.logger.log(`[DIAGNOSTIC] getStoredVideos for userId=${userId}, limit=${limit}, includeStats=${includeStats}`);
    
    try {
      // Check if the user has a valid integration
      const isValidIntegration = await this.youtubeAuthService.hasValidIntegration(userId);
      if (!isValidIntegration) {
        this.logger.warn(`[DIAGNOSTIC] No valid YouTube integration for user ${userId}`);
        return [];
      }

      // Retrieve videos from storage service
      return this.storageService.getUserStoredVideos(userId);
    } catch (error) {
      this.logger.error(`[DIAGNOSTIC] Error retrieving stored videos: ${error.message}`, error.stack);
      return [];
    }
  }
}
