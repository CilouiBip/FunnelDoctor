import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { youtube_v3 } from 'googleapis';
import { IntegrationService } from '../integration.service';
import { YouTubeTokenRefreshService } from './youtube-token-refresh.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { YouTubeStorageService } from './youtube-storage.service';
import { YouTubeAuthService } from './youtube-auth.service';

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
  };
  analytics?: {
    period: {
      startDate: string;
      endDate: string;
    };
    views: number;
    watchTimeMinutes: number;
    averageViewDuration: number;
    likes: number;
    comments: number;
  };
  duration: string;
  tags?: string[];
  dbId?: string; // ID in DB after storing
}

/**
 * Interface for YouTube Analytics data 
 */
export interface VideoAnalyticsDTO {
  // Période d'analyse
  period: {
    startDate: string;
    endDate: string;
  };
  // Métriques de base
  views: number;
  watchTimeMinutes: number;
  averageViewDuration: number;
  likes: number;
  comments: number;

  // Nouvelles métriques ajoutées - Métriques de croissance
  subscribersGained?: number;   // Nombre d'abonnés gagnés grâce à cette vidéo
  shares?: number;             // Nombre de partages de la vidéo
  
  // Métriques de rétention et engagement
  averageViewPercentage?: number; // Pourcentage moyen de la vidéo visionnée (rétention)
  
  // Métriques de cards/fiches YouTube (appels à l'action)
  cardClickRate?: number;      // Taux de clic sur les cartes YouTube
  cardClicks?: number;         // Nombre de clics sur les cartes YouTube
  cardImpressions?: number;    // Nombre d'affichages des cartes YouTube
}

/** Extended version of VideoDTO for analytics. */
export interface VideoStatsDTO extends VideoDTO {
  engagement?: {
    engagementRate: number;            // Weighted ratio (likes + x*comments) / views
    normalizedEngagementRate?: number; // score 0..1
    engagementLevel?: string;          // textual category
  };
  // Ajout de la référence aux données analytiques complètes
  analytics?: VideoAnalyticsDTO;
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
  ) {}

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
    this.logger.log('█████████ DÉBUT RÉCUPÉRATION VIDÉOS YOUTUBE █████████');
    this.logger.log(`[DATA] Récupération vidéos pour utilisateur=${userId}, options=${JSON.stringify(options || {})}, stockage=${storeInDb}`);

    try {
      // 1) Vérification de l'intégration
      this.logger.log(`[DATA] Étape 1: Vérification validité intégration YouTube pour utilisateur ${userId}`);
      const isValidIntegration = await this.youtubeAuthService.hasValidIntegration(userId);
      this.logger.log(`[DATA] Intégration valide: ${isValidIntegration}`);
      if (!isValidIntegration) {
        this.logger.error(`[DATA] Aucune intégration YouTube valide pour utilisateur ${userId}`);
        throw new UnauthorizedException('No valid YouTube integration');
      }

      // 2) Récupération des tokens depuis la base de données
      this.logger.log(`[DATA] Étape 2: Récupération des tokens depuis Supabase pour utilisateur ${userId}`);
      const tokens = await this.integrationService.getIntegrationConfig(userId, 'youtube');
      if (!tokens || !tokens.access_token) {
        this.logger.error(`[DATA] Tokens inexistants ou access_token manquant pour utilisateur ${userId}`);
        throw new UnauthorizedException('No valid token to access YouTube');
      }
      this.logger.log(`[DATA] Tokens récupérés avec succès pour utilisateur ${userId}`);
      this.logger.log(`[DATA] ACCESS_TOKEN: trouvé (${tokens.access_token ? 'oui' : 'non'}), REFRESH_TOKEN: trouvé (${tokens.refresh_token ? 'oui' : 'non'}), EXPIRES_AT: ${tokens.expires_at || 'non défini'}`);


      // 3) Création du client YouTube autorisé (avec refresh token si nécessaire)
      this.logger.log(`[DATA] Étape 3: Création du client YouTube autorisé (avec refresh si nécessaire)`);
      let youtube: youtube_v3.Youtube;
      try {
        youtube = await this.getAuthorizedYouTubeClient(userId);
        this.logger.log(`[DATA] Client YouTube créé avec succès et autorisé`);
      } catch (err) {
        this.logger.error(`[DATA] ERREUR création client YouTube: ${err.message}`);
        throw err;
      }

      // 4) Récupération de la chaîne et de la playlist uploads
      this.logger.log(`[DATA] Étape 4: Récupération des informations de la chaîne YouTube`);
      this.logger.log(`[DATA] Appel API YouTube Data: youtube.channels.list(mine=true)...`);
      
      const channelsResponse = await youtube.channels.list({
        part: ['contentDetails'],
        mine: true,
      });
      
      if (!channelsResponse.data.items || channelsResponse.data.items.length === 0) {
        this.logger.warn(`[DATA] Aucune chaîne trouvée pour l'utilisateur ${userId}`);
        return { videos: [] };
      }
      
      this.logger.log(`[DATA] Chaîne YouTube trouvée, recherche de la playlist des uploads`);
      const uploadsPlaylistId = channelsResponse.data.items[0].contentDetails?.relatedPlaylists?.uploads;
      
      if (!uploadsPlaylistId) {
        this.logger.warn(`[DATA] Playlist uploads introuvable pour l'utilisateur ${userId}`);
        return { videos: [] };
      }
      
      this.logger.log(`[DATA] Playlist uploads trouvée: ${uploadsPlaylistId}`);
      

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
      this.logger.log(`[DATA] Étape 8: Transformation des données brutes en DTOs`);
      const videos = rawVideos.map((item) => this.mapToVideoDTO(item));
      this.logger.log(`[DATA] Transformation réussie de ${videos.length} vidéos en DTOs structurés`);

      // 8b) ENRICHISSEMENT - Récupérer les statistiques analytiques pour les vidéos récentes
      this.logger.log(`[DATA] Étape 8b: Enrichissement avec données YouTube Analytics`);
      
      if (videos.length > 0) {
        // Limiter aux 10 vidéos les plus récentes pour respecter les quotas API
        const recentVideos = [...videos]
          .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
          .slice(0, 10);

        this.logger.log(`[ANALYTICS] Récupération des données analytiques pour ${recentVideos.length} vidéos récentes`);
        this.logger.log(`[ANALYTICS] ⮕ DÉBUT des appels à l'API YouTube Analytics`);
        
        let successCount = 0;
        for (const video of recentVideos) {
          try {
            this.logger.log(`[ANALYTICS] Récupération analytics pour vidéo ${video.id}...`);
            
            // Utiliser une promesse avec timeout pour éviter de bloquer trop longtemps
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout récupération analytics')), 15000)); // Timeout plus long
            
            const analyticsPromise = this.getVideoAnalytics(userId, video.id);
            const analytics = await Promise.race([analyticsPromise, timeoutPromise]);
            
            if (!analytics) {
              this.logger.warn(`[ANALYTICS] Aucune donnée analytics retournée pour vidéo ${video.id}`);
              continue;
            }
            
            // Enrichir l'objet vidéo avec les données analytiques
            video.analytics = {
              period: analytics.period || { startDate: '', endDate: '' },
              views: analytics.views || 0,
              watchTimeMinutes: analytics.watchTimeMinutes || 0,
              averageViewDuration: analytics.averageViewDuration || 0,
              likes: analytics.likes || 0,
              comments: analytics.comments || 0
            };
            
            successCount++;
            this.logger.log(`[ANALYTICS] ✓ Données analytics récupérées pour vidéo ${video.id}`);
          } catch (analyticsError) {
            // Ne pas bloquer le processus si une erreur survient pour une vidéo
            this.logger.error(`[ANALYTICS] ✗ ERREUR analytics pour vidéo ${video.id}: ${analyticsError.message}`);
          }
        }
        
        this.logger.log(`[ANALYTICS] ⮕ FIN des appels API Analytics - Succès: ${successCount}/${recentVideos.length} vidéos`);
      } else {
        this.logger.log(`[ANALYTICS] Aucune vidéo à enrichir avec les données analytics`);
      }

      // 9) Stockage en base de donnees Supabase
      this.logger.log(`[DATA] Étape 9: Stockage des vidéos dans Supabase`);
      
      if (storeInDb && videos.length > 0) {
        this.logger.log(`[STORAGE] ⮕ DÉBUT stockage de ${videos.length} vidéos dans Supabase pour utilisateur ${userId}`);
        let storedCount = 0;
        
        for (const vid of videos) {
          try {
            this.logger.log(`[STORAGE] Stockage de la vidéo ${vid.id} (${vid.title})...`);
            const dbId = await this.storageService.storeVideo(userId, vid);
            vid.dbId = dbId;
            storedCount++;
            this.logger.log(`[STORAGE] ✓ Vidéo ${vid.id} stockée avec succès (dbId=${dbId})`);
            
            // AJOUT FINAL: Stocker les statistiques si elles existent
            if (vid.analytics) {
              this.logger.log(`[STORAGE] Tentative stockage stats pour vidéo ${vid.id} (dbId=${dbId})`);
              try {
                await this.storageService.storeVideoStats(dbId, vid.stats, vid.analytics);
                this.logger.log(`[STORAGE] ✓ Stats pour vidéo ${vid.id} stockées avec succès`);
              } catch (statsError) {
                this.logger.error(`[STORAGE] ✗ ERREUR stockage stats pour vidéo ${vid.id}: ${statsError.message}`);
                // Ne pas bloquer le processus principal si le stockage des stats échoue pour une vidéo
              }
            } else {
              this.logger.warn(`[STORAGE] ⚠ Aucune donnée analytics à stocker pour vidéo ${vid.id}`);
            }
          } catch (storageError) {
            this.logger.error(`[STORAGE] ✗ ERREUR stockage vidéo ${vid.id}: ${storageError.message}`);
          }
        }
        
        this.logger.log(`[STORAGE] ⮕ FIN stockage - ${storedCount}/${videos.length} vidéos stockées avec succès`);
      } else if (!storeInDb) {
        this.logger.log(`[STORAGE] Stockage en base de données ignoré (storeInDb=false)`);
      } else {
        this.logger.log(`[STORAGE] Aucune vidéo à stocker dans Supabase`);
      }

      // Vérification des vidéos déjà en base pour comparaison
      let dbVideosCount = 0;
      try {
        const dbVideos = await this.storageService.getUserStoredVideos(userId);
        dbVideosCount = dbVideos?.length || 0;
        this.logger.log(`[STORAGE] L'utilisateur a désormais ${dbVideosCount} vidéos stockées en base`);
      } catch (dbError) {
        this.logger.warn(`[STORAGE] Impossible de vérifier le nombre de vidéos en base: ${dbError.message}`);
      }
      
      this.logger.log('█████████ FIN RÉCUPÉRATION VIDÉOS YOUTUBE █████████');
      return { videos, nextPageToken };
    } catch (error) {
      this.logger.error(`[DATA] ERREUR CRITIQUE récupération vidéos YouTube: ${error.message}`, error.stack);
      
      // Vérification des tokens invalides pour auto-révocation
      if (
        error.message.includes('invalid_grant') ||
        error.message.includes('Invalid Credentials') ||
        error.message.includes('401') ||
        error.message.includes('403')
      ) {
        this.logger.warn(`[AUTH] ⚠ Token invalide/expiré détecté, révocation automatique pour utilisateur=${userId}`);
        try {
          await this.youtubeAuthService.revokeIntegration(userId);
          this.logger.log(`[AUTH] ✓ Intégration YouTube révoquée avec succès pour utilisateur=${userId}`);
        } catch (revokeError) {
          this.logger.error(`[AUTH] ✗ Erreur lors de la révocation de l'intégration: ${revokeError.message}`, revokeError.stack);
        }
        return { videos: [] };
      }

      // Sinon, on propage l'erreur
      throw error;
    }
  }

  // Pas de contenu ici - cette section sera supprimée

  // Supprimié pour éviter les doublons - la deuxième implémentation sera utilisée

  // Méthode supprimée - version duplliquée présente plus bas

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
    this.logger.log(`[YOUTUBE_AUTH] Début de la création du client YouTube pour utilisateur=${userId}`);

    const tokens = await this.integrationService.getIntegrationConfig(userId, 'youtube');
    if (!tokens) {
      this.logger.error(`[YOUTUBE_AUTH] Aucun token pour userId=${userId}`);
      throw new UnauthorizedException('YouTube integration not found');
    }

    this.logger.log(`[YOUTUBE_AUTH] Tokens récupérés depuis la base de données pour user=${userId}`);
    this.logger.log(`[YOUTUBE_AUTH] Détails tokens - access_token: ${tokens.access_token ? 'présent' : 'manquant'}, refresh_token: ${tokens.refresh_token ? 'présent' : 'manquant'}, expires_at: ${tokens.expires_at || 'non défini'}`);

    // Vérifier et rafraîchir le token si nécessaire
    try {
      // CORRECTION IMPORTANTE: La méthode ensureFreshAccessToken retourne maintenant l'objet complet de tokens
      const freshTokens = await this.tokenRefreshService.ensureFreshAccessToken(
        userId, 
        tokens.access_token || '',
        tokens.refresh_token || '',
        tokens.expires_at || 0
      );
      
      // Vérifier que nous avons bien reçu l'objet complet de tokens
      if (!freshTokens || !freshTokens.access_token) {
        throw new Error('Tokens invalides reçus après rafraîchissement');
      }
      
      this.logger.log(`[YOUTUBE_AUTH] Token vérifié/rafraîchi avec succès pour user=${userId}`);
      this.logger.log(`[YOUTUBE_AUTH] Détails tokens frais - access_token: ${freshTokens.access_token ? 'présent' : 'manquant'}, refresh_token: ${freshTokens.refresh_token ? 'présent' : 'manquant'}, expires_at: ${freshTokens.expires_at || 'non défini'}`);
      
      // Créer le client avec les tokens frais COMPLETS (access_token ET refresh_token)
      const client = this.tokenRefreshService.createAuthorizedYouTubeClient(freshTokens);
      
      // Valider que le client a été créé avec succès
      if (!client) {
        throw new Error('Échec de création du client YouTube avec les tokens');
      }
      
      this.logger.log(`[YOUTUBE_AUTH] Client YouTube créé avec succès pour user=${userId}`);
      return client;
    } catch (err) {
      this.logger.error(`[YOUTUBE_AUTH] Erreur rafraîchissement token pour user=${userId}: ${err.message}`, err.stack);
      if (
        err.message.includes('invalid_grant') ||
        err.message.includes('Invalid Credentials') ||
        err.message.includes('401') ||
        err.message.includes('403') ||
        err.message.includes('No access') ||
        err.message.includes('refresh token')
      ) {
        this.logger.warn(`[YOUTUBE_AUTH] Token invalide/expiré pour user=${userId}, révocation en cours`);
        try {
          await this.youtubeAuthService.revokeIntegration(userId);
        } catch (revokeError) {
          this.logger.error(`[YOUTUBE_AUTH] Erreur révocation: ${revokeError.message}`, revokeError.stack);
        }
        throw new UnauthorizedException('Token invalid, must reconnect YouTube');
      }
      throw err;
    }
  }

  // Supprimé - fonction déjà implémentée plus bas

  /**
   * Map raw YouTube video data to our internal DTO.
   */
  private mapToVideoDTO(item: any): VideoDTO {
    this.logger.debug(`[MAPPING] Début transformation vidéo ${item?.id || 'unknown'}`);
    
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

    try {
      const snippet = item.snippet || {};
      const statistics = item.statistics || {};
      const contentDetails = item.contentDetails || {};

      // pick best thumbnail
      const thumbs = snippet.thumbnails || {};
      const bestThumb = thumbs.maxres || thumbs.high || thumbs.medium || thumbs.default || {};

      const dto = {
        id: item.id,
        title: snippet.title || 'Sans titre',
        description: snippet.description || '',
        publishedAt: snippet.publishedAt || new Date().toISOString(),
        thumbnailUrl: bestThumb.url || '',
        channelId: snippet.channelId || '',
        channelTitle: snippet.channelTitle || '',
        stats: {
          viewCount: parseInt(statistics.viewCount || '0', 10),
          likeCount: parseInt(statistics.likeCount || '0', 10),
          commentCount: parseInt(statistics.commentCount || '0', 10),
          favoriteCount: parseInt(statistics.favoriteCount || '0', 10),
        },
        duration: contentDetails.duration || 'PT0S',
        tags: snippet.tags || [],
      };
      
      this.logger.debug(`[MAPPING] Transformation réussie de la vidéo ${item.id}`);
      return dto;
    } catch (error) {
      this.logger.error(`[MAPPING] ERREUR transformation vidéo ${item?.id || 'unknown'}: ${error.message}`);
      return {
        id: item?.id || 'unknown',
        title: 'Erreur de conversion',
        description: 'Erreur lors de la récupération des données',
        publishedAt: new Date().toISOString(),
        thumbnailUrl: '',
        channelId: '',
        channelTitle: '',
        duration: 'PT0S',
        stats: { viewCount: 0, likeCount: 0, commentCount: 0, favoriteCount: 0 }
      };
    }
  }

  /**
   * Détermine le niveau d'engagement d'une vidéo en fonction de son score normalisé
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
   * Récupère les statistiques analytiques avancées pour une vidéo spécifique
   * @param userId ID de l'utilisateur propriétaire de la vidéo
   * @param videoId ID de la vidéo YouTube
   * @param startDate Date de début pour les statistiques (format YYYY-MM-DD)
   * @param endDate Date de fin pour les statistiques (format YYYY-MM-DD)
   * @returns Objet contenant les statistiques analytiques de la vidéo
   */
  async getVideoAnalytics(userId: string, videoId: string, startDate?: string, endDate?: string): Promise<any> {
    // Dates par défaut: derniers 30 jours
    const now = new Date();
    const defaultEndDate = now.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    now.setDate(now.getDate() - 30);
    const defaultStartDate = now.toISOString().split('T')[0];

    // Utiliser les dates fournies ou les dates par défaut
    const actualStartDate = startDate || defaultStartDate;
    const actualEndDate = endDate || defaultEndDate;

    this.logger.log(`Récupération des analytics pour la vidéo ${videoId} (${actualStartDate} au ${actualEndDate})`);

    try {
      // Obtenir un client YouTube autorisé
      const tokens = await this.integrationService.getIntegrationConfig(userId, 'youtube');
      if (!tokens || !tokens.access_token) {
        throw new UnauthorizedException('No valid token to access YouTube Analytics');
      }

      // Vérifier et rafraîchir le token si nécessaire
      this.logger.log(`[ANALYTICS] Vérification/rafraîchissement du token pour user=${userId} avant appel API Analytics`);
      const freshTokens = await this.tokenRefreshService.ensureFreshAccessToken(
        userId,
        tokens.access_token || '',
        tokens.refresh_token || '',
        tokens.expires_at || 0
      );
      
      // CORRECTION: Utiliser l'objet complet de tokens frais (et non juste la chaîne access_token)
      this.logger.log(`[ANALYTICS] Création du client Analytics avec des tokens valides pour user=${userId}`);
      this.logger.log(`[ANALYTICS] Détails tokens - access_token: ${freshTokens.access_token ? 'présent' : 'manquant'}, refresh_token: ${freshTokens.refresh_token ? 'présent' : 'manquant'}, expires_at: ${freshTokens.expires_at || 'non défini'}`);
      
      // CORRECTION: Passage correct de l'objet tokens complet avec access_token ET refresh_token
      const analyticsClient = this.tokenRefreshService.createAuthorizedYouTubeAnalyticsClient(freshTokens);

      // Faire la requête à l'API YouTube Analytics
      this.logger.log(`[ANALYTICS] Appel API YouTube Analytics pour vidéo ${videoId}`);
      
      // CORRECTION: Métriques valides (suppression de 'dislikes' qui n'est plus disponible)
      // AJOUT: Nouvelles métriques demandées (retention, abonnés, partages, métriques cartes/fiches)
      const response = await analyticsClient.reports.query({
        ids: 'channel==MINE',
        startDate: actualStartDate,
        endDate: actualEndDate,
        metrics: 'views,estimatedMinutesWatched,averageViewDuration,likes,comments,subscribersGained,shares,averageViewPercentage,cardClickRate,cardClicks,cardImpressions',
        dimensions: 'video',
        filters: `video==${videoId}`,
      });

      this.logger.debug(`Réponse API YouTube Analytics: ${JSON.stringify(response.data)}`);

      if (!response.data || !response.data.rows || response.data.rows.length === 0) {
        this.logger.warn(`Aucune donnée analytique trouvée pour la vidéo ${videoId}`);
        return {
          // Métriques de base
          views: 0,
          watchTimeMinutes: 0,
          averageViewDuration: 0,
          likes: 0,
          comments: 0,
          
          // Nouvelles métriques ajoutées - valeurs par défaut
          subscribersGained: 0,
          shares: 0,
          averageViewPercentage: 0,
          cardClickRate: 0,
          cardClicks: 0,
          cardImpressions: 0,
          
          period: {
            startDate: actualStartDate,
            endDate: actualEndDate,
          }
        };
      }

      // Extraire les données pertinentes de la réponse
      const videoData = response.data.rows.find(row => row[0] === videoId);
      if (!videoData) {
        this.logger.warn(`Vidéo ${videoId} non trouvée dans les résultats analytiques`);
        return {
          // Métriques de base
          views: 0,
          watchTimeMinutes: 0,
          averageViewDuration: 0,
          likes: 0,
          comments: 0,
          
          // Nouvelles métriques ajoutées - valeurs par défaut
          subscribersGained: 0,
          shares: 0,
          averageViewPercentage: 0,
          cardClickRate: 0,
          cardClicks: 0,
          cardImpressions: 0,
          
          period: {
            startDate: actualStartDate,
            endDate: actualEndDate,
          }
        };
      }

      // Structure des données depend de l'ordre des métriques demandées
      // MISE u00c0 JOUR: Ordre complet avec les nouvelles métriques ajoutées
      // [videoId, views, watchTimeMinutes, avgViewDuration, likes, comments, subscribersGained, shares, averageViewPercentage, cardClickRate, cardClicks, cardImpressions]
      const [
        videoIdResult, 
        views, 
        watchTimeMinutes, 
        avgViewDuration, 
        likes, 
        comments, 
        subscribersGained, 
        shares, 
        averageViewPercentage, 
        cardClickRate, 
        cardClicks, 
        cardImpressions
      ] = videoData;

      const analyticsResult = {
        views: parseInt(views || '0', 10),
        watchTimeMinutes: parseFloat(watchTimeMinutes || '0'),
        averageViewDuration: parseFloat(avgViewDuration || '0'),
        likes: parseInt(likes || '0', 10),
        comments: parseInt(comments || '0', 10),
        // Nouvelles métriques ajoutées
        subscribersGained: parseInt(subscribersGained || '0', 10),
        shares: parseInt(shares || '0', 10),
        averageViewPercentage: parseFloat(averageViewPercentage || '0'),
        cardClickRate: parseFloat(cardClickRate || '0'),
        cardClicks: parseInt(cardClicks || '0', 10),
        cardImpressions: parseInt(cardImpressions || '0', 10),
        period: {
          startDate: actualStartDate,
          endDate: actualEndDate,
        }
      };

      this.logger.log(`Statistiques obtenues pour vidéo ${videoId}: ${JSON.stringify(analyticsResult)}`);
      return analyticsResult;

    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des analytics pour vidéo ${videoId}: ${error.message}`, error.stack);
      
      // Vérifier si l'erreur est liée aux tokens ou quota
      if (error.message.includes('401') || error.message.includes('403')) {
        this.logger.warn(`Erreur d'autorisation pour l'API Analytics. Vérification/rafraîchissement des tokens...`);
        throw new UnauthorizedException('Erreur d\'authentification YouTube Analytics');
      }
      
      if (error.message.includes('403') && error.message.includes('quota')) {
        this.logger.warn(`Quota d'API YouTube Analytics dépassé`);
        throw new Error('Quota YouTube Analytics dépassé, veuillez réessayer plus tard');
      }
      
      throw error;
    }
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
