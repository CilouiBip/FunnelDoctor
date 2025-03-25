import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { YouTubeAuthService } from './youtube-auth.service';
import { firstValueFrom } from 'rxjs';

/**
 * Service pour ru00e9cupu00e9rer les statistiques YouTube pour un utilisateur
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
   * Ru00e9cupu00e8re les mu00e9triques de base pour une chau00eene YouTube
   * @param userId ID de l'utilisateur
   * @param startDate Date de du00e9but (YYYY-MM-DD)
   * @param endDate Date de fin (YYYY-MM-DD)
   */
  async getBasicMetrics(userId: string, startDate: string, endDate: string) {
    try {
      // 1. Vu00e9rifier l'intu00e9gration
      const isValid = await this.youtubeAuthService.hasValidIntegration(userId);
      if (!isValid) {
        this.logger.warn(`No valid YouTube integration for user ${userId}`);
        return null;
      }
      
      // 2. Ru00e9cupu00e9rer le token
      const config = await this.youtubeAuthService.getIntegrationConfig(userId, 'youtube');
      if (!config || !config.access_token) {
        this.logger.warn(`YouTube access token not available for user ${userId}`);
        return null;
      }
      
      // 3. Ru00e9cupu00e9rer la chau00eene associu00e9e
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
      
      // 4. Ru00e9cupu00e9rer les analytics
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
      
      // 5. Formater les ru00e9sultats
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
   * Ru00e9cupu00e8re les vidu00e9os les plus performantes de la pu00e9riode
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
      
      // Ru00e9cupu00e9rer les du00e9tails des vidu00e9os (titres, thumbnails, etc.)
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
      
      // Fusionner les donnu00e9es analytics avec les du00e9tails vidu00e9o
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
   * Ru00e9cupu00e8re un ru00e9sumu00e9 des mu00e9triques pour le tableau de bord
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
}
