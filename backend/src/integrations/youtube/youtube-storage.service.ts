import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { VideoDTO } from './youtube-data.service';

@Injectable()
export class YouTubeStorageService {
  private readonly logger = new Logger(YouTubeStorageService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Stocke ou met à jour une vidéo dans la base de données
   * @param userId ID de l'utilisateur propriétaire de la vidéo
   * @param video Données de la vidéo à stocker
   * @returns ID de la vidéo dans notre base de données
   */
  async storeVideo(userId: string, video: VideoDTO): Promise<string> {
    try {
      // Vérifier si la vidéo existe déjà pour cet utilisateur
      const { data: existingVideo, error: findError } = await this.supabaseService.getAdminClient()
        .from('youtube_videos')
        .select('id')
        .eq('user_id', userId)
        .eq('video_id', video.id)
        .maybeSingle();

      if (findError) {
        this.logger.error(`Erreur lors de la recherche de la vidéo: ${findError.message}`);
        throw findError;
      }

      if (existingVideo) {
        // Mettre à jour la vidéo existante
        const { error: updateError } = await this.supabaseService.getAdminClient()
          .from('youtube_videos')
          .update({
            title: video.title,
            description: video.description,
            thumbnail_url: video.thumbnailUrl,
            channel_title: video.channelTitle,
            duration: video.duration,
            tags: video.tags || [],
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingVideo.id);

        if (updateError) {
          this.logger.error(`Erreur lors de la mise à jour de la vidéo: ${updateError.message}`);
          throw updateError;
        }

        // Stocker les nouvelles statistiques et données analytiques si disponibles
        await this.storeVideoStats(existingVideo.id, video.stats, video.analytics);

        return existingVideo.id;
      } else {
        // Insérer une nouvelle vidéo
        const { data: insertData, error: insertError } = await this.supabaseService.getAdminClient()
          .from('youtube_videos')
          .insert({
            user_id: userId,
            video_id: video.id,
            title: video.title,
            description: video.description,
            published_at: video.publishedAt,
            thumbnail_url: video.thumbnailUrl,
            channel_id: video.channelId,
            channel_title: video.channelTitle,
            duration: video.duration,
            tags: video.tags || [],
          })
          .select('id')
          .single();

        if (insertError) {
          this.logger.error(`Erreur lors de l'insertion de la vidéo: ${insertError.message}`);
          throw insertError;
        }

        // Stocker les statistiques initiales et données analytiques si disponibles
        await this.storeVideoStats(insertData.id, video.stats, video.analytics);

        return insertData.id;
      }
    } catch (error) {
      this.logger.error(`Erreur lors du stockage de la vidéo: ${error.message}`, error.stack);
      throw new Error(`Erreur lors du stockage de la vidéo: ${error.message}`);
    }
  }

  /**
   * Stocke les statistiques d'une vidéo et ses données analytiques si disponibles
   * @param dbVideoId ID de la vidéo dans notre base de données
   * @param stats Statistiques de base de la vidéo (vues, likes, commentaires)
   * @param analytics Données analytiques avancées (optionnel)
   */
  async storeVideoStats(dbVideoId: string, stats: any, analytics?: any): Promise<void> {
    try {
      this.logger.debug(`Stockage des statistiques pour vidéo dbId=${dbVideoId}`);

      // Calcul pondéré de l'engagement (même formule que dans YouTubeDataService)
      const likeWeight = 1;
      const commentWeight = 5;
      
      // Score d'engagement pondéré
      const engagementScore = stats.viewCount > 0
        ? ((stats.likeCount * likeWeight) + (stats.commentCount * commentWeight)) / stats.viewCount
        : 0;
        
      // Normalisation du score (considérant qu'un ratio de 0.1 est déjà très bon)
      const normalizedEngagement = Math.min(engagementScore / 0.1, 1);
      
      // Calcul du CTR des cards (cardClicks / cardImpressions)
      const cardCTR = analytics?.cardImpressions > 0 
        ? (analytics.cardClicks / analytics.cardImpressions) 
        : 0;

      this.logger.debug(`Calcul du CTR des cards: ${analytics?.cardClicks || 0} clics / ${analytics?.cardImpressions || 0} impressions = ${cardCTR}`);

      // Données de base pour l'insertion
      const statsData = {
        video_id: dbVideoId,
        view_count: parseInt(stats.viewCount) || 0,
        like_count: parseInt(stats.likeCount) || 0,
        comment_count: parseInt(stats.commentCount) || 0,
        favorite_count: parseInt(stats.favoriteCount) || 0,
        engagement_rate: parseFloat(engagementScore.toFixed(6)) || 0,
        normalized_engagement_rate: parseFloat(normalizedEngagement.toFixed(6)) || 0,
        engagement_level: this.getEngagementLevel(normalizedEngagement),
        fetched_at: new Date().toISOString(),
        // Stockage du JSON complet pour utilisation future
        analytics_data: analytics ? JSON.stringify(analytics) : '{}'
      };

      // Ajout des données analytiques si disponibles
      if (analytics) {
        this.logger.debug(`Ajout des données analytiques pour vidéo dbId=${dbVideoId}`);
        Object.assign(statsData, {
          // Métriques de durée de visionnage
          watch_time_minutes: parseFloat(analytics.watchTimeMinutes) || 0,
          average_view_duration: parseFloat(analytics.averageViewDuration) || 0,
          
          // Période d'analyse
          analytics_period_start: analytics.period?.startDate || null,
          analytics_period_end: analytics.period?.endDate || null,
          
          // Métriques de croissance
          subscribers_gained: parseInt(analytics.subscribersGained) || 0,
          shares: parseInt(analytics.shares) || 0,
          
          // Métriques de rétention
          average_view_percentage: parseFloat(analytics.averageViewPercentage) || 0,
          
          // Métriques des cards YouTube
          card_click_rate: parseFloat(analytics.cardClickRate) || 0,
          card_clicks: parseInt(analytics.cardClicks) || 0,
          card_impressions: parseInt(analytics.cardImpressions) || 0,
          card_ctr: parseFloat(cardCTR.toFixed(6)) || 0
        });
        
        // Log des métriques analytiques pour debugging
        this.logger.debug(`Métriques analytiques: retention=${analytics.averageViewPercentage || 0}%, abonnés=${analytics.subscribersGained || 0}, partages=${analytics.shares || 0}`);
        this.logger.debug(`Métriques cartes: CTR=${cardCTR.toFixed(6) || 0}, clics=${analytics.cardClicks || 0}, impressions=${analytics.cardImpressions || 0}`);
      }

      const { error } = await this.supabaseService.getAdminClient()
        .from('youtube_video_stats')
        .insert(statsData);

      if (error) {
        this.logger.error(`Erreur lors du stockage des statistiques: ${error.message}`);
        throw error;
      }

      this.logger.debug(`Statistiques stockées avec succès pour vidéo dbId=${dbVideoId}`);
    } catch (error) {
      this.logger.error(`Erreur lors du stockage des statistiques: ${error.message}`, error.stack);
      throw new Error(`Erreur lors du stockage des statistiques: ${error.message}`);
    }
  }

  /**
   * Récupère toutes les vidéos stockées pour un utilisateur
   * @param userId ID de l'utilisateur
   * @returns Liste des vidéos avec leurs dernières statistiques
   */
  async getUserStoredVideos(userId: string) {
    try {
      // Récupérer toutes les vidéos de l'utilisateur
      const { data: videos, error: videosError } = await this.supabaseService.getAdminClient()
        .from('youtube_videos')
        .select('*, stats:youtube_video_stats(*)') // Jointure pour récupérer les statistiques les plus récentes
        .eq('user_id', userId)
        .order('published_at', { ascending: false });

      if (videosError) {
        this.logger.error(`Erreur lors de la récupération des vidéos: ${videosError.message}`);
        throw videosError;
      }

      return videos;
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des vidéos stockées: ${error.message}`, error.stack);
      throw new Error(`Erreur lors de la récupération des vidéos stockées: ${error.message}`);
    }
  }

  /**
   * Récupère l'historique des statistiques d'une vidéo spécifique
   * @param dbVideoId ID de la vidéo dans notre base de données
   * @returns Historique des statistiques de la vidéo
   */
  async getVideoStatsHistory(dbVideoId: string) {
    try {
      const { data, error } = await this.supabaseService.getAdminClient()
        .from('youtube_video_stats')
        .select('*')
        .eq('video_id', dbVideoId)
        .order('fetched_at', { ascending: true });

      if (error) {
        this.logger.error(`Erreur lors de la récupération de l'historique des statistiques: ${error.message}`);
        throw error;
      }

      return data;
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération de l'historique: ${error.message}`, error.stack);
      throw new Error(`Erreur lors de la récupération de l'historique: ${error.message}`);
    }
  }
  
  /**
   * Catégorise le niveau d'engagement d'une vidéo en fonction de son score normalisé
   * @param normalizedScore Score d'engagement normalisé entre 0 et 1
   * @returns Catégorie textuelle du niveau d'engagement
   */
  private getEngagementLevel(normalizedScore: number): string {
    if (normalizedScore >= 0.8) {
      return 'Exceptionnel';   // 80-100% = Engagement viral
    } else if (normalizedScore >= 0.6) {
      return 'Excellent';     // 60-80% = Très fort engagement
    } else if (normalizedScore >= 0.4) {
      return 'Très bon';      // 40-60% = Bon engagement
    } else if (normalizedScore >= 0.2) {
      return 'Bon';           // 20-40% = Engagement moyen
    } else if (normalizedScore >= 0.1) {
      return 'Moyen';         // 10-20% = Engagement basique
    } else {
      return 'Faible';        // 0-10% = Faible engagement
    }
  }
}
