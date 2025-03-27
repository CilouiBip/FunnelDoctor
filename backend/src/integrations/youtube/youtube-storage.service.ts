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
      this.logger.log(`[STORAGE-DETAILED] DÉBUT storeVideoStats pour vidéo dbId=${dbVideoId}`);
      this.logger.log(`[STORAGE-DETAILED] Données d'entrée stats: ${JSON.stringify(stats, null, 2)}`);
      this.logger.log(`[STORAGE-DETAILED] Données d'entrée analytics: ${JSON.stringify(analytics, null, 2)}`);

      // Validation des entrées pour détecter tout problème potentiel
      if (!stats) {
        this.logger.error(`[STORAGE-DETAILED] ERREUR: Objet stats non défini ou null`);
        throw new Error('Statistiques non définies');
      }

      if (!stats.viewCount && stats.viewCount !== 0) {
        this.logger.warn(`[STORAGE-DETAILED] Attention: stats.viewCount non défini ou null. Stats complètes: ${JSON.stringify(stats)}`);
      }

      // Calcul pondéré de l'engagement (même formule que dans YouTubeDataService)
      const likeWeight = 1;
      const commentWeight = 5;
      
      // Score d'engagement pondéré
      const viewCount = parseInt(stats.viewCount) || 0;
      const likeCount = parseInt(stats.likeCount) || 0;
      const commentCount = parseInt(stats.commentCount) || 0;
      
      this.logger.log(`[STORAGE-DETAILED] Valeurs brutes: vues=${viewCount}, likes=${likeCount}, commentaires=${commentCount}`);
      
      const engagementScore = viewCount > 0
        ? ((likeCount * likeWeight) + (commentCount * commentWeight)) / viewCount
        : 0;
        
      // Normalisation du score (considérant qu'un ratio de 0.1 est déjà très bon)
      const normalizedEngagement = Math.min(engagementScore / 0.1, 1);
      
      this.logger.log(`[STORAGE-DETAILED] Score d'engagement calculé: ${engagementScore.toFixed(6)}, normalisé: ${normalizedEngagement.toFixed(6)}`);
      
      // Calcul du CTR des cards
      let cardCTR = 0;
      if (analytics) {
        // CORRECTION BUG: Utiliser cardClickRate fourni par l'API si disponible (déjà sous forme décimale 0-1)
        if (typeof analytics.cardClickRate === 'number' && !isNaN(analytics.cardClickRate)) {
          // Utiliser directement la valeur de l'API qui est déjà un décimal (0-1)
          cardCTR = analytics.cardClickRate;
          this.logger.log(`[STORAGE-DETAILED] Utilisation du cardClickRate fourni par l'API: ${analytics.cardClickRate} (déjà décimal 0-1) --> CTR stocké = ${cardCTR.toFixed(6)}`);
        } 
        // Fallback: calcul manuel si cardClickRate n'est pas fourni
        else {
          const cardClicks = parseInt(analytics.cardClicks) || 0;
          const cardImpressions = parseInt(analytics.cardImpressions) || 0;
          cardCTR = cardImpressions > 0 ? (cardClicks / cardImpressions) : 0;
          this.logger.log(`[STORAGE-DETAILED] CTR des cards calculé manuellement: ${cardClicks} clics / ${cardImpressions} impressions = ${cardCTR.toFixed(6)}`);
        }
      } else {
        this.logger.warn(`[STORAGE-DETAILED] Aucune donnée de cards disponible pour calcul du CTR`);
      }

      // Log de vérification du CTR pour la vidéo 2PJqrERIw3k (cas spécial)
      if (stats.videoId === '2PJqrERIw3k' || (analytics && analytics.videoId === '2PJqrERIw3k')) {
        this.logger.log(`[STORAGE-DETAILED] [CAS SPECIAL vidéo 2PJqrERIw3k] 
  - cardClickRate fourni par l'API (format décimal 0-1) = ${analytics?.cardClickRate}
  - cardClicks = ${analytics?.cardClicks}
  - cardImpressions = ${analytics?.cardImpressions}
  - CTR stocké en BDD (décimal) = ${cardCTR}
  - CTR pour affichage (%) = ${(cardCTR * 100).toFixed(2)}%`)
      }

      // Données de base pour l'insertion
      const statsData = {
        video_id: dbVideoId,
        view_count: viewCount,
        like_count: likeCount,
        comment_count: commentCount,
        favorite_count: parseInt(stats.favoriteCount) || 0,
        engagement_rate: parseFloat(engagementScore.toFixed(6)) || 0,
        normalized_engagement_rate: parseFloat(normalizedEngagement.toFixed(6)) || 0,
        engagement_level: this.getEngagementLevel(normalizedEngagement),
        fetched_at: new Date().toISOString(),
        // Stockage du JSON complet pour utilisation future
        analytics_data: analytics ? JSON.stringify(analytics) : '{}'
      };

      this.logger.log(`[STORAGE-DETAILED] Données de base prêtes: ${JSON.stringify(statsData, null, 2)}`);

      // Ajout des données analytiques si disponibles
      if (analytics) {
        this.logger.log(`[STORAGE-DETAILED] Enrichissement des données avec les analytics`);
        
        // Valeurs extraites et transformées pour le stockage
        const watchTimeMinutes = parseFloat(analytics.watchTimeMinutes) || 0;
        const avgViewDuration = parseFloat(analytics.averageViewDuration) || 0;
        const subsGained = parseInt(analytics.subscribersGained) || 0;
        const shares = parseInt(analytics.shares) || 0;
        const avgViewPercentage = parseFloat(analytics.averageViewPercentage) || 0;
        const cardClickRate = parseFloat(analytics.cardClickRate) || 0;
        const cardClicks = parseInt(analytics.cardClicks) || 0;
        const cardImpressions = parseInt(analytics.cardImpressions) || 0;
        
        const analyticsExtension = {
          // Métriques de durée de visionnage
          watch_time_minutes: watchTimeMinutes,
          average_view_duration: avgViewDuration,
          
          // Période d'analyse
          analytics_period_start: analytics.period?.startDate || null,
          analytics_period_end: analytics.period?.endDate || null,
          
          // Métriques de croissance
          subscribers_gained: subsGained,
          shares: shares,
          
          // Métriques de rétention
          average_view_percentage: avgViewPercentage,
          
          // Métriques des cards YouTube
          card_click_rate: cardClickRate,
          card_clicks: cardClicks,
          card_impressions: cardImpressions,
          card_ctr: parseFloat(cardCTR.toFixed(6)) || 0
        };
        
        Object.assign(statsData, analyticsExtension);
        
        // Log détaillé des métriques analytiques pour debugging
        this.logger.log(`[STORAGE-DETAILED] Métriques analytiques prêtes pour stockage:
` +
          `  - watchTimeMinutes: ${watchTimeMinutes}
` +
          `  - avgViewDuration: ${avgViewDuration}s
` +
          `  - avgViewPercentage: ${avgViewPercentage}%
` +
          `  - subscribersGained: ${subsGained}
` +
          `  - shares: ${shares}
` +
          `  - cardClickRate: ${cardClickRate}%
` +
          `  - cardClicks: ${cardClicks}
` +
          `  - cardImpressions: ${cardImpressions}
` +
          `  - cardCTR: ${cardCTR.toFixed(6)}`);
      } else {
        this.logger.warn(`[STORAGE-DETAILED] Aucune donnée analytics disponible pour enrichissement`);
      }

      this.logger.log(`[STORAGE-DETAILED] Prêt à insérer dans la table youtube_video_stats`);
      
      // Insertion dans la base de données
      const { data, error } = await this.supabaseService.getAdminClient()
        .from('youtube_video_stats')
        .insert(statsData)
        .select('id')
        .single();

      if (error) {
        this.logger.error(`[STORAGE-DETAILED] ERREUR BDD lors du stockage des statistiques: ${error.message}`);
        this.logger.error(`[STORAGE-DETAILED] Détails de l'erreur: ${JSON.stringify(error, null, 2)}`);
        throw error;
      }

      this.logger.log(`[STORAGE-DETAILED] Statistiques stockées avec succès pour vidéo dbId=${dbVideoId}, statsId=${data?.id}`);
      this.logger.log(`[STORAGE-DETAILED] FIN storeVideoStats pour vidéo dbId=${dbVideoId}`);
    } catch (error) {
      this.logger.error(`[STORAGE-DETAILED] ERREUR CRITIQUE dans storeVideoStats: ${error.message}`, error.stack);
      this.logger.error(`[STORAGE-DETAILED] Données qui ont provoqué l'erreur - stats: ${JSON.stringify(stats)}, analytics: ${JSON.stringify(analytics)}`);
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
