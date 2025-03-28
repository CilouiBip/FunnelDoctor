import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { VideoDTO } from './youtube-data.service'; // Assure-toi que l'import est correct

@Injectable()
export class YouTubeStorageService {
  private readonly logger = new Logger(YouTubeStorageService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async storeVideo(userId: string, video: VideoDTO): Promise<string> {
    // ... (Logique storeVideo inchangée) ...
    // MAIS assure-toi qu'elle appelle storeVideoStats à la fin
    try {
      const { data: existingVideo, error: findError } = await this.supabaseService.getAdminClient()
        .from('youtube_videos')
        .select('id')
        .eq('user_id', userId)
        .eq('video_id', video.id)
        .maybeSingle();

      if (findError) throw findError;

      let dbVideoId: string;

      if (existingVideo) {
        // Update
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
        if (updateError) throw updateError;
        dbVideoId = existingVideo.id;
      } else {
        // Insert
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
        if (insertError || !insertData) throw insertError || new Error('Insert failed');
        dbVideoId = insertData.id;
      }

      // Appel storeVideoStats (même si analytics est undefined au début)
      await this.storeVideoStats(dbVideoId, video.stats, video.analytics);
      return dbVideoId;

    } catch (error) {
      this.logger.error(`Erreur lors du stockage de la vidéo ${video.id}: ${error.message}`, error.stack);
      throw error; // Rethrow pour que l'appelant soit informé
    }
  }


  async storeVideoStats(dbVideoId: string, stats: any, analytics?: any): Promise<void> {
    const logPrefix = `[STORAGE][${dbVideoId}]`;
    try {
      this.logger.log(`${logPrefix} DÉBUT storeVideoStats`);
      if (!stats) {
        this.logger.error(`${logPrefix} ERREUR: Objet stats manquant.`);
        return; // Ne rien faire si les stats de base manquent
      }
      this.logger.log(`${logPrefix} Données entrantes - Stats: ${JSON.stringify(stats)}, Analytics: ${JSON.stringify(analytics)}`);

      // --- Calculs Engagement (Basés sur stats de base) ---
      const viewCount = parseInt(stats.viewCount || '0', 10);
      const likeCount = parseInt(stats.likeCount || '0', 10);
      const commentCount = parseInt(stats.commentCount || '0', 10);
      const favoriteCount = parseInt(stats.favoriteCount || '0', 10); // Moins utile mais gardons-le

      const likeWeight = 1;
      const commentWeight = 5; // Donner plus de poids aux commentaires
      const engagementScore = viewCount > 0
        ? ((likeCount * likeWeight) + (commentCount * commentWeight)) / viewCount
        : 0;
      const normalizedEngagement = Math.min(engagementScore / 0.1, 1); // Normaliser sur 0.1 = 100%
      const engagementLevel = this.getEngagementLevel(normalizedEngagement);
       this.logger.log(`${logPrefix} Engagement Calculé: Score=${engagementScore.toFixed(4)}, Level=${engagementLevel}`);

      // --- Préparation Données pour Supabase ---
      const dataToUpsert: any = {
        video_id: dbVideoId, // Clé étrangère vers youtube_videos
        view_count: viewCount,
        like_count: likeCount,
        comment_count: commentCount,
        favorite_count: favoriteCount,
        engagement_rate: parseFloat(engagementScore.toFixed(6)), // Précision
        normalized_engagement_rate: parseFloat(normalizedEngagement.toFixed(6)),
        engagement_level: engagementLevel,
        fetched_at: new Date().toISOString(),
        analytics_data: analytics ? JSON.stringify(analytics) : null // Stocke l'objet analytics brut
      };

      // --- Ajout des Données Analytiques (si présentes) ---
      if (analytics && typeof analytics === 'object') {
         this.logger.log(`${logPrefix} Enrichissement avec Analytics: Period=${analytics.period?.startDate}, Reten(%) =${analytics.averageViewPercentage}`);
         Object.assign(dataToUpsert, {
           watch_time_minutes: parseFloat(analytics.watchTimeMinutes || '0'),
           average_view_duration: parseFloat(analytics.averageViewDuration || '0'),
           average_view_percentage: parseFloat(analytics.averageViewPercentage || '0'),
           subscribers_gained: parseInt(analytics.subscribersGained || '0', 10),
           shares: parseInt(analytics.shares || '0', 10),
           card_clicks: parseInt(analytics.cardClicks || '0', 10),
           card_impressions: parseInt(analytics.cardImpressions || '0', 10),
           // **CORRECTION CTR** : Utilise cardClickRate (décimal 0-1 de l'API) directement
           card_ctr: parseFloat(analytics.cardClickRate || '0'), // API renvoie déjà décimal 0-1
           card_click_rate: parseFloat(analytics.cardClickRate || '0'), // Stockons aussi la valeur brute API
           analytics_period_start: analytics.period?.startDate || null,
           analytics_period_end: analytics.period?.endDate || null,
         });
          this.logger.log(`${logPrefix} Valeur card_ctr stockée: ${dataToUpsert.card_ctr}`);
      } else {
          this.logger.warn(`${logPrefix} Aucune donnée analytics fournie pour l'enrichissement.`);
          // Assurer que les champs analytics sont null si analytics n'existe pas
           Object.assign(dataToUpsert, {
             watch_time_minutes: null, average_view_duration: null, average_view_percentage: null,
             subscribers_gained: null, shares: null, card_clicks: null, card_impressions: null,
             card_ctr: null, card_click_rate: null, analytics_period_start: null, analytics_period_end: null
           });
      }

      // --- Upsert dans Supabase ---
      this.logger.log(`${logPrefix} Tentative d'Upsert dans youtube_video_stats`);
      const { data, error } = await this.supabaseService.getAdminClient()
        .from('youtube_video_stats')
        .upsert(dataToUpsert, { onConflict: 'video_id, fetched_at' }) // Assure l'unicité ou ajuste la contrainte
        .select('id')
        .single();

      if (error) {
        this.logger.error(`${logPrefix} ERREUR BDD Upsert: ${error.message}`, error.details);
        throw error;
      }

      this.logger.log(`${logPrefix} FIN storeVideoStats - Succès: statsId=${data?.id}`);

    } catch (error) {
      this.logger.error(`${logPrefix} ERREUR CRITIQUE dans storeVideoStats: ${error.message}`, error.stack);
      // Ne pas relancer l'erreur ici pour ne pas bloquer tout le processus si une vidéo échoue
    }
  }

  // --- getUserStoredVideos et getVideoStatsHistory probablement inchangés ---
  // ... (coller le reste du code) ...

  /**
   * Catégorise le niveau d'engagement (helper interne)
   */
   private getEngagementLevel(normalizedScore: number): string {
    if (normalizedScore >= 0.8) return 'Exceptionnel';
    if (normalizedScore >= 0.6) return 'Excellent';
    if (normalizedScore >= 0.4) return 'Très bon';
    if (normalizedScore >= 0.2) return 'Bon';
    if (normalizedScore >= 0.1) return 'Moyen';
    return 'Faible';
  }
}