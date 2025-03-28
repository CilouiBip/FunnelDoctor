import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { YouTubeAuthService } from './youtube-auth.service';
import { firstValueFrom } from 'rxjs';
import { AggregatedVideoKPIsDTO, VideoDetailedAnalyticsDTO } from './dtos/youtube-analytics.dto';
import { google, youtube_v3 } from 'googleapis'; // Import googleapis
import { OAuth2Client } from 'google-auth-library'; // Import OAuth2Client

/**
 * Service pour récupérer les statistiques YouTube pour un utilisateur
 */
@Injectable()
export class YouTubeAnalyticsService {
  private readonly logger = new Logger(YouTubeAnalyticsService.name);

  constructor(
    private readonly youtubeAuthService: YouTubeAuthService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Calcule les dates de début et de fin formatées pour une période donnée.
   */
  private calculatePeriodDates(period: string): { formattedStartDate: string; endDate: string } {
    const endDate = new Date();
    let startDate = new Date();

    switch (period) {
      case 'last7':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'last30':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case 'last90':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case 'last28':
      default:
        startDate.setDate(endDate.getDate() - 28);
        break;
    }
    
    const formatDate = (date: Date): string => date.toISOString().split('T')[0];
    
    return { formattedStartDate: formatDate(startDate), endDate: formatDate(endDate) };
  }

  /**
   * Extrait une valeur numérique d'une ligne de résultat API Analytics en fonction du nom de la métrique.
   */
  private extractValue(row: any[], headers: { name: string }[], metricName: string): number {
    const index = headers.findIndex(header => header.name === metricName);
    return index !== -1 && row[index] ? Number(row[index]) : 0;
  }

  /**
   * Récupère les métriques de base pour une chaîne YouTube
   * @param userId ID de l'utilisateur
   * @param startDate Date de début (YYYY-MM-DD)
   * @param endDate Date de fin (YYYY-MM-DD)
   */
  async getBasicMetrics(userId: string, startDate: string, endDate: string) {
    try {
      // 1. Vérifier l'intégration
      const isValid = await this.youtubeAuthService.hasValidIntegration(userId);
      if (!isValid) {
        this.logger.warn(`No valid YouTube integration for user ${userId}`);
        return null;
      }
      
      // 2. Récupérer le token
      const config = await this.youtubeAuthService.getIntegrationConfig(userId, 'youtube');
      if (!config || !config.access_token) {
        this.logger.warn(`YouTube access token not available for user ${userId}`);
        return null;
      }
      
      // 3. Récupérer la chaîne associée
      const channelResponse = await firstValueFrom(
        this.httpService.get('https://www.googleapis.com/youtube/v3/channels', {
          headers: {
            Authorization: `Bearer ${config.access_token}`,
          },
          params: {
            part: 'id,snippet,statistics',
            mine: true,
          },
        })
      );
      
      if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
        this.logger.warn(`No YouTube channel found for user ${userId}`);
        return null;
      }
      
      const channelId = channelResponse.data.items[0].id;
      const channelInfo = {
        id: channelId,
        title: channelResponse.data.items[0].snippet.title,
        description: channelResponse.data.items[0].snippet.description,
        statistics: channelResponse.data.items[0].statistics,
      };
      
      // 4. Récupérer les analytics
      const analyticsResponse = await firstValueFrom(
        this.httpService.get('https://youtubeanalytics.googleapis.com/v2/reports', {
          headers: {
            Authorization: `Bearer ${config.access_token}`,
          },
          params: {
            dimensions: 'day',
            endDate,
            ids: `channel==${channelId}`,
            metrics: 'views,estimatedMinutesWatched,averageViewDuration,likes,comments,shares,subscribersGained',
            startDate,
          },
        })
      ).catch(error => {
        this.logger.error(`Error fetching YouTube analytics: ${error.message}`, error.stack);
        if (error.response) {
          this.logger.error(`API response: ${JSON.stringify(error.response.data)}`);
        }
        return null;
      });
      
      if (!analyticsResponse) {
        return {
          channel: channelInfo,
          analytics_available: false,
          error: 'Failed to fetch analytics data'
        };
      }
      
      // 5. Formatter les résultats
      const data = analyticsResponse.data;
      
      // Calculer les totaux
      const totals = {
        views: 0,
        watch_time_minutes: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        subscribers_gained: 0,
      };
      
      const dailyData: any[] = [];
      
      if (data.rows && data.rows.length > 0) {
        data.rows.forEach((row: any[]) => {
          const [date, views, watchMinutes, avgDuration, likes, comments, shares, subscribersGained] = row;
          
          totals.views += views || 0;
          totals.watch_time_minutes += watchMinutes || 0;
          totals.likes += likes || 0;
          totals.comments += comments || 0;
          totals.shares += shares || 0;
          totals.subscribers_gained += subscribersGained || 0;
          
          dailyData.push({
            date,
            views,
            watch_minutes: watchMinutes,
            avg_view_duration: avgDuration,
            likes,
            comments,
            shares,
            subscribers_gained: subscribersGained,
          });
        });
      }
      
      return {
        channel: channelInfo,
        period: {
          start_date: startDate,
          end_date: endDate,
        },
        totals,
        avg_view_duration: totals.views ? (totals.watch_time_minutes * 60) / totals.views : 0,
        daily_data: dailyData,
        analytics_available: true
      };
      
    } catch (error) {
      this.logger.error(`Error in getBasicMetrics: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * Récupère les vidéos les plus performantes de la période
   */
  async getTopVideos(userId: string, startDate: string, endDate: string, maxResults = 10) {
    try {
      const isValid = await this.youtubeAuthService.hasValidIntegration(userId);
      if (!isValid) {
        return { videos: [], analytics_available: false };
      }
      
      const config = await this.youtubeAuthService.getIntegrationConfig(userId, 'youtube');
      if (!config || !config.access_token) {
        return { videos: [], analytics_available: false };
      }
      
      const channelResponse = await firstValueFrom(
        this.httpService.get('https://www.googleapis.com/youtube/v3/channels', {
          headers: {
            Authorization: `Bearer ${config.access_token}`,
          },
          params: {
            part: 'id',
            mine: true,
          },
        })
      );
      
      const channelId = channelResponse.data.items?.[0]?.id;
      if (!channelId) {
        return { videos: [], analytics_available: false };
      }
      
      const topVideosResponse = await firstValueFrom(
        this.httpService.get('https://youtubeanalytics.googleapis.com/v2/reports', {
          headers: {
            Authorization: `Bearer ${config.access_token}`,
          },
          params: {
            dimensions: 'video',
            endDate,
            ids: `channel==${channelId}`,
            metrics: 'views,estimatedMinutesWatched,likes,comments',
            sort: '-views',
            maxResults,
            startDate,
          },
        })
      ).catch(() => null);
      
      if (!topVideosResponse) {
        return { videos: [], analytics_available: false };
      }
      
      // Récupérer les détails des vidéos (titres, thumbnails, etc.)
      const videoIds = topVideosResponse.data.rows?.map((row: any[]) => row[0]) || [];
      
      if (videoIds.length === 0) {
        return { videos: [], analytics_available: true };
      }
      
      const videoDetailsResponse = await firstValueFrom(
        this.httpService.get('https://www.googleapis.com/youtube/v3/videos', {
          headers: {
            Authorization: `Bearer ${config.access_token}`,
          },
          params: {
            part: 'snippet,contentDetails',
            id: videoIds.join(','),
          },
        })
      ).catch(() => null);
      
      if (!videoDetailsResponse) {
        return { videos: [], analytics_available: false };
      }
      
      // Fusionner les données analytics avec les détails vidéo
      const videosMap: Record<string, any> = {};
      videoDetailsResponse.data.items.forEach((item: any) => {
        videosMap[item.id] = {
          id: item.id,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
          published_at: item.snippet.publishedAt,
          duration: item.contentDetails.duration,
        };
      });
      
      const videos = topVideosResponse.data.rows.map((row: any[]) => {
        const [videoId, views, watchMinutes, likes, comments] = row;
        return {
          ...videosMap[videoId],
          stats: {
            views,
            watch_minutes: watchMinutes,
            likes,
            comments,
          }
        };
      });
      
      return { videos, analytics_available: true };
      
    } catch (error) {
      this.logger.error(`Error in getTopVideos: ${error.message}`, error.stack);
      return { videos: [], analytics_available: false, error: error.message };
    }
  }

  /**
   * Récupère un résumé des métriques pour le tableau de bord
   */
  async getExecutiveSummary(userId: string, days = 30) {
    try {
      const endDate = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const formattedStartDate = startDate.toISOString().split('T')[0];
      
      const metrics = await this.getBasicMetrics(userId, formattedStartDate, endDate);
      
      if (!metrics || !metrics.analytics_available) {
        return {
          youtube_stats: {
            available: false,
            reason: metrics ? 'Analytics not available' : 'No valid YouTube integration',
          },
        };
      }
      
      // S'assurer que toutes les propriétés existent avant de les utiliser
      const totals = metrics.totals || {
        views: 0,
        watch_time_minutes: 0,
        likes: 0,
        comments: 0,
        subscribers_gained: 0
      };
      
      return {
        youtube_stats: {
          available: true,
          period: {
            start_date: formattedStartDate,
            end_date: endDate,
            days,
          },
          channel: {
            title: metrics.channel?.title || 'Unknown',
            subscribers: metrics.channel?.statistics?.subscriberCount || 0,
          },
          totals: {
            views: totals.views || 0,
            watch_time_minutes: totals.watch_time_minutes || 0,
            avg_view_duration_seconds: Math.round(metrics.avg_view_duration || 0),
            likes: totals.likes || 0,
            comments: totals.comments || 0,
            subscribers_gained: totals.subscribers_gained || 0,
          },
        },
      };
    } catch (error) {
      this.logger.error(`Error getting executive summary: ${error.message}`, error.stack);
      return {
        youtube_stats: {
          available: false,
          reason: 'Error fetching YouTube stats',
          error: error.message,
        },
      };
    }
  }

  /**
   * Récupère les statistiques détaillées pour une vidéo spécifique sur une période donnée.
   * Utilise les API YouTube Data et YouTube Analytics.
   */
  async getVideoDetailedAnalytics(userId: string, videoId: string, period: string): Promise<VideoDetailedAnalyticsDTO> {
    const logPrefix = `[YouTubeAnalyticsService][getVideoDetailedAnalytics] Video ID: ${videoId} Period: ${period}`; // Préfixe pour les logs

    this.logger.debug(`${logPrefix} Début de la récupération des données.`);

    // 1. Obtenir le token et channelId
    const config = await this.youtubeAuthService.getIntegrationConfig(userId, 'youtube');
    if (!config || !config.access_token || !config.youtube_channel_id) {
      this.logger.error(`${logPrefix} Configuration YouTube invalide ou manquante.`);
      throw new Error('Configuration YouTube invalide ou manquante.');
    }
    const accessToken = config.access_token;
    const channelId = config.youtube_channel_id;

    // 2. Préparer les requêtes API Analytics
    const { formattedStartDate, endDate } = this.calculatePeriodDates(period); // Calculate dates from period string
    const baseMetricsParams = {
      ids: `channel==${channelId}`,
      startDate: formattedStartDate, // Use calculated date
      endDate: endDate, // Use calculated date
      // Updated metrics list (including 'views')
      metrics: 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,shares,likes,comments', 
      dimensions: 'video',
      filters: `video==${videoId}`
    };

    const cardMetricsParams = {
      ...baseMetricsParams,
      metrics: 'cardImpressions,cardClicks,cardClickRate',
    };

    try {
      // 3. Exécuter les requêtes en parallèle
      const [baseMetricsResponse, cardMetricsResponse] = await Promise.all([
        firstValueFrom(this.httpService.get('https://youtubeanalytics.googleapis.com/v2/reports', {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: baseMetricsParams,
        })).catch(err => {
            this.logger.error(`${logPrefix} Erreur API Base Metrics: ${err.message}`);
            if (err.response?.data?.error?.message) {
                this.logger.error(`API Error Details: ${err.response.data.error.message}`);
            }
            return null; // Permet à Promise.all de continuer
        }),
        firstValueFrom(this.httpService.get('https://youtubeanalytics.googleapis.com/v2/reports', {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: cardMetricsParams,
        })).catch(err => {
            this.logger.error(`${logPrefix} Erreur API Card Metrics: ${err.message}`);
            if (err.response?.data?.error?.message) {
                this.logger.error(`API Error Details: ${err.response.data.error.message}`);
            }
            return null; // Permet à Promise.all de continuer
        }),
      ]);

      // Log de la réponse BRUTE de l'API Google
      this.logger.debug(`[getVideoDetailedAnalytics] Raw API Response for ${videoId}: ${JSON.stringify(baseMetricsResponse?.data, null, 2)}`);

      // Vérification de la structure de la réponse
      if (!baseMetricsResponse || !baseMetricsResponse.data || !baseMetricsResponse.data.columnHeaders || !baseMetricsResponse.data.rows) {
        this.logger.error(`${logPrefix} Réponse API invalide pour la vidéo ${videoId}.`);
        throw new Error(`Réponse API invalide pour la vidéo ${videoId}.`);
      }

      // 4. Extraire et traiter les résultats
      const analytics: Partial<VideoDetailedAnalyticsDTO> = {
          period: { startDate: formattedStartDate, endDate: endDate }, // Use calculated dates
          // Initialize with defaults
          views: 0, 
          watchTimeMinutes: 0,
          averageViewDuration: 0,
          averageViewPercentage: 0,
          subscribersGained: 0,
          shares: 0,
          likes: 0,
          comments: 0,
          cardImpressions: 0,
          cardClicks: 0,
          cardClickRate: 0,
      };

      const baseMetrics = [
        'views',
        'estimatedMinutesWatched',
        'averageViewDuration',
        'averageViewPercentage',
        'subscribersGained',
        'shares',
        'comments',
        'likes',
      ].join(',');

      // 2.1 Log des métriques de base demandées
      this.logger.debug(`${logPrefix} Base metrics requested: ${baseMetrics}`);

      if (baseMetricsResponse.data.rows && baseMetricsResponse.data.rows.length > 0) {
        const headers = baseMetricsResponse.data.columnHeaders;
        const rows = baseMetricsResponse.data.rows;

        // Log des headers et des lignes reçus
        this.logger.debug(`${logPrefix} Headers received: ${JSON.stringify(headers)}`);
        this.logger.debug(`${logPrefix} Rows received: ${JSON.stringify(rows)}`);

        const row = baseMetricsResponse.data.rows[0];
        analytics.views = this.extractValue(row, headers, 'views'); // Extract views
        analytics.watchTimeMinutes = this.extractValue(row, headers, 'estimatedMinutesWatched');
        analytics.averageViewDuration = this.extractValue(row, headers, 'averageViewDuration');
        analytics.averageViewPercentage = this.extractValue(row, headers, 'averageViewPercentage');
        analytics.subscribersGained = this.extractValue(row, headers, 'subscribersGained');
        analytics.shares = this.extractValue(row, headers, 'shares');
        analytics.comments = this.extractValue(row, headers, 'comments');
        analytics.likes = this.extractValue(row, headers, 'likes');
      } else {
        this.logger.warn(`${logPrefix} Aucune donnée de base retournée par l'API pour cette vidéo.`);
      }

      if (cardMetricsResponse && cardMetricsResponse.data && cardMetricsResponse.data.rows && cardMetricsResponse.data.rows.length > 0) {
        const cardHeaders = cardMetricsResponse.data.columnHeaders;
        const cardRow = cardMetricsResponse.data.rows[0];
        analytics.cardClickRate = this.extractValue(cardRow, cardHeaders, 'cardClickRate');
        analytics.cardClicks = this.extractValue(cardRow, cardHeaders, 'cardClicks');
        analytics.cardImpressions = this.extractValue(cardRow, cardHeaders, 'cardImpressions');
      } else {
          this.logger.warn(`${logPrefix} Aucune donnée de carte retournée par l'API pour cette vidéo.`);
      }
      
      // Log final des données analytics extraites pour cette vidéo
      this.logger.debug(`${logPrefix} Extracted analytics: ${JSON.stringify(analytics)}`);

      return analytics as VideoDetailedAnalyticsDTO; // Assumes all fields are now present

    } catch (error) {
      this.logger.error(`${logPrefix} Erreur globale lors de la récupération des analytics détaillés: ${error.message}`, error.stack);
      throw new Error(`Erreur lors de la récupération des analytics détaillés pour la vidéo ${videoId}: ${error.message}`);
    }
  }
  
  /**
   * Récupère et agrège les KPIs pour toutes les vidéos publiques sur une période donnée.
   */
  public async getAggregatedVideoKPIs(userId: string, period: string = 'last28'): Promise<AggregatedVideoKPIsDTO> {
    const logPrefix = `[AggregatedKPIs][User:${userId}][Period:${period}]`;
    this.logger.log(`${logPrefix} Starting KPI aggregation.`);

    const { formattedStartDate, endDate } = this.calculatePeriodDates(period);
    
    try {
      // 1. Obtenir la configuration initiale
      let config = await this.youtubeAuthService.getIntegrationConfig(userId, 'youtube');
      if (!config || !config.access_token) {
        this.logger.error(`${logPrefix} No initial YouTube config found for user.`);
        throw new Error('YouTube integration configuration not found.');
      }
      
      // 2. Vérifier l'expiration et rafraîchir si nécessaire
      const nowSeconds = Math.floor(Date.now() / 1000);
      const bufferSeconds = 60; // Refresh if token expires within 60 seconds
      if (config.expires_at && config.expires_at <= nowSeconds + bufferSeconds) {
        this.logger.log(`${logPrefix} Token expired or expiring soon. Attempting refresh...`);
        const refreshed = await this.youtubeAuthService.refreshAccessToken(userId);
        if (!refreshed) {
          this.logger.error(`${logPrefix} Failed to refresh YouTube token.`);
          throw new Error('Failed to refresh YouTube access token.');
        }
        // Re-fetch config after refresh to get the new token
        config = await this.youtubeAuthService.getIntegrationConfig(userId, 'youtube');
        if (!config || !config.access_token) {
          this.logger.error(`${logPrefix} Failed to get config after token refresh.`);
          throw new Error('Failed to retrieve configuration after token refresh.');
        }
        this.logger.log(`${logPrefix} Token refreshed successfully.`);
      }

      // Proceed with the valid access token
      const accessToken = config.access_token;
      
      // 3. Créer un client OAuth2 et l'API YouTube
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });

      const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

      // 4. Récupérer l'ID de la playlist "Uploads"
      const channelsResponse = await youtube.channels.list({
        part: ['contentDetails'],
        mine: true,
      });

      // Corrected access: Use optional chaining and check items array
      const uploadsPlaylistId = channelsResponse.data?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsPlaylistId) {
        this.logger.error(`${logPrefix} Could not find uploads playlist ID for the user.`);
        throw new Error('Could not find uploads playlist ID.');
      }
      this.logger.log(`${logPrefix} Found uploads playlist ID: ${uploadsPlaylistId}`);

      // 5. Récupérer tous les IDs de vidéos de la playlist "Uploads"
      let allVideoIds: string[] = [];
      let nextPageToken: string | undefined | null = undefined;
      do {
        const playlistItemsResponse = await youtube.playlistItems.list({
          part: ['contentDetails'],
          playlistId: uploadsPlaylistId,
          maxResults: 50, // Max allowed by API
          pageToken: nextPageToken ?? undefined,
        });

        // Corrected access: Use response.data.items and optional chaining
        const videoIds = playlistItemsResponse.data?.items
            ?.map(item => item.contentDetails?.videoId)
            .filter((id): id is string => !!id) ?? [];
        
        allVideoIds = allVideoIds.concat(videoIds);
        // Corrected access: Use response.data.nextPageToken
        nextPageToken = playlistItemsResponse.data?.nextPageToken;
        this.logger.debug(`${logPrefix} Fetched ${videoIds.length} video IDs. Next page token: ${nextPageToken ? 'exists' : 'none'}. Total IDs so far: ${allVideoIds.length}`);

      } while (nextPageToken);

      this.logger.log(`${logPrefix} Found ${allVideoIds.length} total video IDs in uploads playlist.`);

      // 6. Filtrer pour ne garder que les vidéos publiques
      let publicVideoIds: string[] = [];
      if (allVideoIds.length > 0) {
          const batchSize = 50;
          for (let i = 0; i < allVideoIds.length; i += batchSize) {
              const batchIds = allVideoIds.slice(i, i + batchSize);
              this.logger.debug(`${logPrefix} Checking privacy status for batch ${Math.floor(i / batchSize) + 1}...`);
              const videosResponse = await youtube.videos.list({
                  part: ['status'],
                  id: batchIds,
                  maxResults: batchSize, 
              });

              // Corrected access: Use response.data.items and optional chaining
              const publicIdsInBatch = videosResponse.data?.items
                  ?.filter(item => item.status?.privacyStatus === 'public' && item.id)
                  .map(item => item.id!)
                  ?? [];
              
              publicVideoIds = publicVideoIds.concat(publicIdsInBatch);
              this.logger.debug(`${logPrefix} Found ${publicIdsInBatch.length} public videos in this batch. Total public IDs so far: ${publicVideoIds.length}`);
          }
      }

      this.logger.log(`${logPrefix} Found ${publicVideoIds.length} public video IDs.`);
       
      // 7. Récupérer les analytics détaillés pour chaque vidéo en parallèle
      let detailedAnalyticsResults: VideoDetailedAnalyticsDTO[] = [];
      let successCount = 0;
      let failureCount = 0;

      if (publicVideoIds.length > 0) {
        this.logger.log(`${logPrefix} Fetching detailed analytics for ${publicVideoIds.length} videos...`);
        const analyticsPromises = publicVideoIds.map(videoId => 
          this.getVideoDetailedAnalytics(userId, videoId, period) // Pass the original period string
        );

        const results = await Promise.allSettled(analyticsPromises);

        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            detailedAnalyticsResults.push(result.value);
            successCount++;
          } else {
            failureCount++;
            // Correctly access reason only on rejected promises
            const reason = result.status === 'rejected' ? result.reason : 'Unknown reason';
            this.logger.warn(`${logPrefix} Failed to fetch analytics for video ID: ${publicVideoIds[index]}. Reason: ${reason}`);
          }
        });

        this.logger.log(`${logPrefix} Detailed analytics fetched. Success: ${successCount}, Failed: ${failureCount}.`);
      } else {
        this.logger.log(`${logPrefix} No public videos found, skipping detailed analytics fetch.`);
      }
      
      // 8. Agréger les résultats
      let totalViews = 0;
      let totalWatchTimeMinutes = 0;
      let totalSubscribersGained = 0;
      let totalShares = 0;
      let totalLikes = 0;
      let totalComments = 0;
      let totalCardClicks = 0;
      let totalCardImpressions = 0;
      let totalWeightedRetentionSum = 0; // Sum of (retention * views)
      let totalViewsForRetention = 0;    // Sum of views for videos with retention data
      let totalWeightedDurationSum = 0;  // Sum of (duration * views)
      let totalViewsForDuration = 0;     // Sum of views for videos with duration data

      for (const analytics of detailedAnalyticsResults) {
        // CRITICAL: Check if views data is available for weighting
        const views = analytics.views;
        if (views === undefined || views === null) {
          // This shouldn't happen if getVideoDetailedAnalytics works as expected in #5.1
          this.logger.error(`${logPrefix} Missing 'views' data for a video result. Skipping its contribution to weighted averages. Data: ${JSON.stringify(analytics)}`);
          // Still sum non-weighted metrics if available
          totalWatchTimeMinutes += analytics.watchTimeMinutes || 0;
          totalSubscribersGained += analytics.subscribersGained || 0;
          totalShares += analytics.shares || 0;
          totalLikes += analytics.likes || 0;
          totalComments += analytics.comments || 0;
          totalCardClicks += analytics.cardClicks || 0;
          totalCardImpressions += analytics.cardImpressions || 0;
          continue; // Skip weighted calculations for this video
        }

        totalViews += views;
        totalWatchTimeMinutes += analytics.watchTimeMinutes || 0;
        totalSubscribersGained += analytics.subscribersGained || 0;
        totalShares += analytics.shares || 0;
        totalLikes += analytics.likes || 0;
        totalComments += analytics.comments || 0;
        totalCardClicks += analytics.cardClicks || 0;
        totalCardImpressions += analytics.cardImpressions || 0;

        // Weighted calculations (only if views > 0 to avoid NaN)
        if (views > 0) {
          // averageViewPercentage from API is 0-100
          if (analytics.averageViewPercentage !== undefined && analytics.averageViewPercentage !== null) {
            totalWeightedRetentionSum += analytics.averageViewPercentage * views;
            totalViewsForRetention += views;
          }
          // averageViewDuration from API is in seconds
          if (analytics.averageViewDuration !== undefined && analytics.averageViewDuration !== null) {
            totalWeightedDurationSum += analytics.averageViewDuration * views;
            totalViewsForDuration += views;
          }
        }
      }

      // 9. Calculer les moyennes finales
      // DTO requires 0-100 for retention percentage
      const averageRetentionPercentage = totalViewsForRetention > 0 
          ? totalWeightedRetentionSum / totalViewsForRetention 
          : 0;
      // DTO requires seconds for duration
      const averageViewDurationSeconds = totalViewsForDuration > 0 
          ? totalWeightedDurationSum / totalViewsForDuration 
          : 0;
      // DTO requires 0-1 for card CTR (API provides 0-1)
      const averageCardCTR = totalCardImpressions > 0 
          ? totalCardClicks / totalCardImpressions 
          : 0;

      // 10. Construire le résultat final
      const result: AggregatedVideoKPIsDTO = {
          totalVideosConsidered: publicVideoIds.length,
          totalVideosAnalysed: successCount,
          period: { startDate: formattedStartDate, endDate: endDate },
          totalViews: totalViews,
          averageRetentionPercentage: averageRetentionPercentage, // Already 0-100
          averageViewDurationSeconds: averageViewDurationSeconds,
          totalSubscribersGained: totalSubscribersGained,
          totalShares: totalShares,
          // Note: Likes and Comments are not in AggregatedVideoKPIsDTO, but we have them
          averageCardCTR: averageCardCTR, // Already 0-1
          totalCardClicks: totalCardClicks,
          totalCardImpressions: totalCardImpressions,
          totalWatchTimeMinutes: totalWatchTimeMinutes,
      };
      
      this.logger.log(`${logPrefix} Aggregation complete. Result: ${JSON.stringify(result)}`);
      return result;

     } catch (error) {
      // Log specific Google API errors if possible
      if (error.response?.data?.error) {
        this.logger.error(`${logPrefix} Google API Error: ${error.response.data.error.message} (Code: ${error.response.data.error.code})`, error.stack);
      } else {
        this.logger.error(`${logPrefix} Failed to aggregate video KPIs: ${error.message}`, error.stack);
      }
      // En cas d'erreur, retourner des KPIs vides
      return this.getEmptyAggregatedKPIs(period); 
     }
   }
 
  /**
   * Retourne un objet AggregatedVideoKPIsDTO vide pour une période donnée.
   */
  public getEmptyAggregatedKPIs(period: string = 'last28'): AggregatedVideoKPIsDTO {
    const { formattedStartDate, endDate } = this.calculatePeriodDates(period);
    this.logger.log(`[getEmptyAggregatedKPIs] Providing empty KPIs for period ${period} (${formattedStartDate} - ${endDate})`);
    return {
      totalVideosConsidered: 0,
      totalVideosAnalysed: 0,
      period: { startDate: formattedStartDate, endDate: endDate },
      totalViews: 0,
      averageRetentionPercentage: 0, // En %
      averageViewDurationSeconds: 0,
      totalSubscribersGained: 0,
      totalShares: 0,
      averageCardCTR: 0, // Décimal
      totalCardClicks: 0,
      totalCardImpressions: 0,
      totalWatchTimeMinutes: 0, 
    };
  }
}
