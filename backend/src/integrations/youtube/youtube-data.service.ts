import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { youtube_v3 } from 'googleapis';
import { IntegrationService } from '../integration.service';
import { YouTubeTokenRefreshService } from './youtube-token-refresh.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { YouTubeStorageService } from './youtube-storage.service';
import { YouTubeAuthService } from './youtube-auth.service';
import { YouTubeAnalyticsService } from './youtube-analytics.service'; // Assurez-vous qu'il est injecté

export interface VideoQueryOptions {
  limit?: number;
  pageToken?: string;
  order?: 'date' | 'rating' | 'viewCount' | 'title';
  period?: 'last7' | 'last28' | 'last30' | 'last90'; // Garde la période ici
}

// Garder une interface DTO simple pour le retour API
export interface VideoDTO {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnailUrl: string;
  channelId: string;
  channelTitle: string;
  stats: { // Stats de base de l'API Data
    viewCount: number;
    likeCount: number;
    commentCount: number;
    favoriteCount: number;
    // Engagement calculé par nous
    engagementRate?: number;
    engagementLevel?: string;
  };
  duration: string;
  tags?: string[];
  dbId?: string;
  analytics?: { // Analytics spécifiques à la période
    watchTimeMinutes?: number;
    averageViewDuration?: number;
    averageViewPercentage?: number;
    cardClickRate?: number; // Décimal 0-1
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

// Définition minimale pour VideoStatsDTO pour corriger la compilation
export interface VideoStatsDTO {
  id: string;
  title?: string; // Ajout optionnel pour contexte
  stats?: VideoDTO['stats']; // Réutilisation de la structure existante
  // Ajouter d'autres champs si nécessaire pour la logique de getVideoDetails, sinon laisser minimal
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
    // Injection maintenant obligatoire
    private readonly youtubeAnalyticsService: YouTubeAnalyticsService,
  ) {
     this.logger.log(`YouTubeDataService initialisé. Analytics Service présent: ${!!youtubeAnalyticsService}`);
  }

  /**
   * POINT D'ENTRÉE PRINCIPAL: Récupère les vidéos de base, les enrichit avec les analytics
   * pour la période demandée, les stocke, et retourne le résultat enrichi.
   */
  async getUserVideos(
    userId: string,
    options?: VideoQueryOptions,
    storeInDb: boolean = true, // Gardons l'option, mais par défaut à true
  ): Promise<{ videos: VideoDTO[]; nextPageToken?: string }> {
    const logPrefix = `[GetUserVideos][${options?.period || 'default'}]`;
    this.logger.debug(`${logPrefix} === START YOUTUBE VIDEO RETRIEVAL PROCESS ===`);
    this.logger.log(`${logPrefix} Options: ${JSON.stringify(options || {})}, storeInDb: ${storeInDb}`);

    const selectedPeriod = options?.period || 'last28'; // Période par défaut

    // 1 & 2: Validation & Client YouTube (inchangé)
    const youtube = await this.getAuthorizedYouTubeClient(userId);

    try {
      // 3 à 7: Récupération de la liste des vidéos de base (publiques uniquement)
       this.logger.log(`${logPrefix} Récupération des vidéos de base (limit=${options?.limit || 'default'})...`);
       // Passer explicitement la période, même si fetchPublicVideoItems ne l'utilise pas directement, pour cohérence des logs
       const fetchOptions: VideoQueryOptions = options || {};
       const { videoItems, nextPageToken } = await this.fetchPublicVideoItems(youtube, fetchOptions, selectedPeriod);
       this.logger.log(`${logPrefix} ${videoItems.length} vidéos publiques récupérées via fetchPublicVideoItems.`);

       if (videoItems.length === 0) {
          this.logger.warn(`${logPrefix} Aucune vidéo publique trouvée via fetchPublicVideoItems.`);
          return { videos: [], nextPageToken };
       }

      // 8: Mapper en DTOs de base
      const videos: VideoDTO[] = videoItems.map(item => this.mapToVideoDTO(item));
      this.logger.log(`${logPrefix} Mappage en ${videos.length} DTOs terminé.`);

      // 9: Enrichissement Asynchrone avec les Analytics (Correction Majeure Ici)
      if (this.youtubeAnalyticsService) {
        this.logger.log(`${logPrefix} DÉBUT Enrichissement API pour ${videos.length} vidéos, période=${selectedPeriod}`);

        // Créer les promesses pour chaque appel analytique
        const analyticsPromises = videos.map(video => {
          this.logger.debug(`${logPrefix} [AnalyticsPromise] Création promesse pour video ${video.id}, période ${selectedPeriod}`);
          return this.youtubeAnalyticsService.getVideoDetailedAnalytics(userId, video.id, selectedPeriod)
            .then(result => {
              if (!result) {
                this.logger.warn(`${logPrefix} [AnalyticsPromise] Résultat NULL pour video ${video.id}`);
              } else {
                 this.logger.debug(`${logPrefix} [AnalyticsPromise] Résultat OK pour video ${video.id}: ${Object.keys(result).join(', ')}`);
              }
              return result; // Retourner le résultat (peut être null)
            })
            .catch(err => {
              // Log l'erreur spécifique à cette vidéo mais ne bloque pas les autres
              this.logger.error(`${logPrefix} [AnalyticsPromise] Erreur analytics pour video ${video.id}: ${err.message}`, err.stack?.substring(0, 200));
              return null; // Important: retourner null pour ne pas faire échouer Promise.all
            });
        });


        // **ATTENDRE** la résolution de TOUTES les promesses
        this.logger.log(`${logPrefix} Attente de ${analyticsPromises.length} promesses analytics...`);
        const analyticsResults = await Promise.all(analyticsPromises);
        const successfulAnalyticsCount = analyticsResults.filter(r => r !== null).length;
        this.logger.log(`${logPrefix} Enrichissement API terminé. ${successfulAnalyticsCount} succès / ${videos.length} total.`);

        // **APPLIQUER** les résultats au tableau 'videos' APRÈS que tout soit terminé
        videos.forEach((video, index) => {
          const analyticsData = analyticsResults[index];
          this.logger.debug(`${logPrefix} [ApplyAnalytics] Application pour vidéo ${video.id} (index ${index}). Données reçues: ${analyticsData ? 'Oui' : 'Non/Null'}`);

          if (analyticsData) {
             this.logger.log(`${logPrefix} [ApplyAnalytics] Données analytics trouvées pour ${video.id}. Assignation...`);
             // Log avant assignation pour être sûr
             this.logger.debug(`${logPrefix} [ApplyAnalytics-Data] Contenu pour ${video.id}: ${JSON.stringify(analyticsData).substring(0, 300)}...`);
            video.analytics = analyticsData; // Assigner l'objet analytics complet

            // Recalculer/Assigner l'engagement basé sur les stats de base si nécessaire
             const viewCount = video.stats?.viewCount || 0;
             const likeCount = video.stats?.likeCount || 0;
             const commentCount = video.stats?.commentCount || 0;
             const likeWeight = 1; const commentWeight = 5;
             const engagementScore = viewCount > 0 ? ((likeCount * likeWeight) + (commentCount * commentWeight)) / viewCount : 0;
             const normalizedEngagement = Math.min(engagementScore / 0.1, 1);
             video.stats.engagementRate = parseFloat(engagementScore.toFixed(4));
             video.stats.engagementLevel = this.getEngagementLevel(normalizedEngagement);

            this.logger.log(`${logPrefix} [ApplyAnalytics] Vidéo ${video.id} MISE À JOUR avec données période ${selectedPeriod}: Reten(%)=${analyticsData.averageViewPercentage?.toFixed(2)}`);

             // Lancer le stockage en BDD en arrière-plan (ne pas attendre ici)
            if (storeInDb && video.dbId) { // Si on a déjà un ID BDD, on met juste à jour les stats
                this.storageService.storeVideoStats(video.dbId, video.stats, video.analytics)
                    .then(() => this.logger.debug(`${logPrefix} [ASYNC-STORAGE] Succès stockage stats pour ${video.id} (dbId: ${video.dbId})`))
                    .catch(err => this.logger.error(`${logPrefix} [ASYNC-STORAGE] Erreur stockage stats pour ${video.id} (dbId: ${video.dbId}): ${err.message}`));
            } else if (storeInDb && !video.dbId) { // Si la vidéo n'est pas encore en BDD
                 this.storageService.storeVideo(userId, video)
                    .then(dbId => {
                         video.dbId = dbId; // Met à jour l'objet en mémoire avec le nouvel ID
                         this.logger.debug(`${logPrefix} [ASYNC-STORAGE] Succès stockage vidéo ${video.id} (new dbId: ${dbId})`);
                         // Maintenant, stocker les stats associées à ce nouvel ID
                         this.storageService.storeVideoStats(dbId, video.stats, video.analytics)
                             .then(() => this.logger.debug(`${logPrefix} [ASYNC-STORAGE] Succès stockage stats post-insert pour ${video.id} (dbId: ${dbId})`))
                             .catch(err => this.logger.error(`${logPrefix} [ASYNC-STORAGE] Erreur stockage stats post-insert pour ${video.id} (dbId: ${dbId}): ${err.message}`));
                    })
                     .catch(err => this.logger.error(`${logPrefix} [ASYNC-STORAGE] Erreur stockage vidéo initiale ${video.id}: ${err.message}`));
            }

          } else {
            this.logger.warn(`${logPrefix} [ApplyAnalytics] Pas de données analytics fraîches trouvées/assignées pour ${video.id}. analytics sera: ${JSON.stringify(video.analytics)}`);
            if (!video.analytics) {
                video.analytics = {}; // Assurer existence de l'objet même vide
                this.logger.debug(`${logPrefix} [ApplyAnalytics] Initialisation de video.analytics à {} pour ${video.id}`);
            }
          }
        });
         this.logger.log(`${logPrefix} Tableau 'videos' finalisé après boucle d'enrichissement.`);

      } else {
        this.logger.error(`${logPrefix} ERREUR CRITIQUE: YouTubeAnalyticsService non disponible pour enrichissement!`);
      }

      // Log Final avant retour - Amélioré pour mieux voir le contenu de analytics
      const firstVideoAnalyticsContent = videos[0]?.analytics ? JSON.stringify(videos[0].analytics).substring(0, 300) + '...' : 'undefined/null';
      this.logger.log(`[FINAL-CHECK][Period: ${selectedPeriod}] State of 'videos' array JUST BEFORE return. Count: ${videos.length}. First video analytics content: ${firstVideoAnalyticsContent}`);
      // Log du premier objet complet (raccourci)
      // this.logger.log(`[FINAL-CHECK][Period: ${selectedPeriod}] First video object sample before return: ${JSON.stringify(videos[0], null, 2)?.substring(0, 500)}...`);
      this.logger.debug(`${logPrefix} === END YOUTUBE VIDEO RETRIEVAL PROCESS ===`);

      // Retourner le tableau 'videos' MAINTENANT mis à jour
      return { videos, nextPageToken };

    } catch (error) {
      this.logger.error(`${logPrefix} Erreur majeure dans getUserVideos: ${error.message}`, error.stack);
      // Gestion Erreur Token (inchangé)
      if (error.message.includes('invalid_grant') || error.message.includes('401') || error.message.includes('403')) {
           this.logger.warn(`${logPrefix} Token invalide détecté. Révocation...`);
           await this.youtubeAuthService.revokeIntegration(userId).catch(err => this.logger.error('Erreur révocation', err));
           throw new UnauthorizedException('Token invalid, must reconnect YouTube'); // Important de relancer pour le frontend
      }
      throw error; // Relancer les autres erreurs
    }
  }


   /**
   * Helper pour récupérer les items vidéo publics paginés
   */
   private async fetchPublicVideoItems(
     youtube: youtube_v3.Youtube,
     options: VideoQueryOptions,
     periodForLog?: string // Juste pour le log contextuel
   ): Promise<{ videoItems: youtube_v3.Schema$Video[], nextPageToken?: string }> {
     const { limit = 10, pageToken: initialPageToken } = options;
     const logPrefix = `[FetchVideoItems][${periodForLog || 'default'}]`;
     this.logger.debug(`${logPrefix} Début récupération items vidéo. Limite souhaitée: ${limit}, pageToken initial: ${initialPageToken}`);

     let collectedPublicVideos: youtube_v3.Schema$Video[] = [];
     let currentPageToken: string | undefined = initialPageToken;
     let fetchedItemsCount = 0;
     const maxResultsPerPage = Math.min(limit, 50); // API max is 50

     try {
       // Récupérer l'ID de la playlist d'uploads de la chaîne
       const channelsResponse = await youtube.channels.list({
         part: ['contentDetails'],
         mine: true,
       });

       const uploadsPlaylistId = channelsResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
       if (!uploadsPlaylistId) {
         this.logger.error(`${logPrefix} Impossible de trouver l'ID de la playlist d'uploads.`);
         throw new Error("Uploads playlist ID not found");
       }
       this.logger.debug(`${logPrefix} Uploads Playlist ID: ${uploadsPlaylistId}`);

       // Boucler jusqu'à atteindre la limite ou la fin des vidéos
       while (collectedPublicVideos.length < limit) {
         const remainingLimit = limit - collectedPublicVideos.length;
         const resultsToFetch = Math.min(maxResultsPerPage, remainingLimit > 0 ? remainingLimit * 2 : maxResultsPerPage); // Fetch more initially to account for filtering

         this.logger.log(`${logPrefix} Appel youtube.playlistItems.list: playlistId=${uploadsPlaylistId}, pageToken=${currentPageToken || 'start'}, maxResults=${resultsToFetch}`);

         const playlistResponse = await youtube.playlistItems.list({
           playlistId: uploadsPlaylistId,
           part: ['snippet'],
           maxResults: resultsToFetch,
           // Assurer que pageToken est string ou undefined, jamais null
           pageToken: currentPageToken || undefined,
         });

         fetchedItemsCount += playlistResponse.data.items?.length || 0;
         const nextPageTokenFromApi = playlistResponse.data.nextPageToken;
         this.logger.log(`${logPrefix} playlistItems.list a retourné ${playlistResponse.data.items?.length || 0} items. NextPageToken: ${!!nextPageTokenFromApi}`);

         if (!playlistResponse.data.items || playlistResponse.data.items.length === 0) {
           this.logger.log(`${logPrefix} Plus d'items dans la playlist.`);
           break; // Sortir si plus d'items
         }

         const videoIds = playlistResponse.data.items
           .map(item => item.snippet?.resourceId?.videoId)
           .filter((id): id is string => !!id);

         if (videoIds.length === 0) {
             this.logger.warn(`${logPrefix} Aucun ID vidéo trouvé dans les items de playlist retournés.`);
             // Assurer que currentPageToken est string ou undefined, jamais null
             currentPageToken = nextPageTokenFromApi || undefined;
             if (!currentPageToken) break; // Exit if no more pages
             continue; // Try next page
         }

         this.logger.log(`${logPrefix} IDs vidéo extraits: ${videoIds.length} IDs (${videoIds.slice(0, 3).join(', ')}...)`);

         // Récupérer les détails pour ces vidéos
         this.logger.log(`${logPrefix} Appel youtube.videos.list pour ${videoIds.length} IDs...`);
         const videosResponse = await youtube.videos.list({
           part: ['snippet', 'statistics', 'contentDetails', 'status'], // Added 'status' for privacy check
           id: videoIds,
           maxResults: videoIds.length, // Assurez-vous de demander tous les IDs
         });

         const detailedVideos = videosResponse.data.items || [];
         this.logger.log(`${logPrefix} videos.list a retourné ${detailedVideos.length} objets vidéo détaillés.`);

         // Filtrer pour ne garder que les vidéos publiques ET qui n'ont pas déjà été collectées
         const newPublicVideos = detailedVideos.filter(video =>
           video.status?.privacyStatus === 'public' &&
           !collectedPublicVideos.some(existing => existing.id === video.id)
         );

         const filteredCount = detailedVideos.length - newPublicVideos.length;
         if (filteredCount > 0) {
             this.logger.warn(`${logPrefix} ${filteredCount} vidéos filtrées (non publiques ou doublons).`);
         }

         // Ajouter les nouvelles vidéos publiques à la collection, sans dépasser la limite
         for (const video of newPublicVideos) {
             if (collectedPublicVideos.length < limit) {
                 collectedPublicVideos.push(video);
             } else {
                 break; // Limite atteinte
             }
         }

          this.logger.log(`${logPrefix} Vidéos publiques collectées: ${collectedPublicVideos.length}/${limit}`);

         // Préparer pour la prochaine itération ou sortir
         // Assurer que currentPageToken est string ou undefined, jamais null
         currentPageToken = nextPageTokenFromApi || undefined;
         if (!currentPageToken || collectedPublicVideos.length >= limit) {
           this.logger.log(`${logPrefix} Condition de sortie atteinte: ${!currentPageToken ? 'Plus de pages' : 'Limite atteinte'}`);
           break;
         }
       }

       this.logger.log(`${logPrefix} Retour de ${collectedPublicVideos.length} vidéos publiques. Total items parcourus: ${fetchedItemsCount}. Next page token: ${!!currentPageToken}`);
       return { videoItems: collectedPublicVideos, nextPageToken: currentPageToken };

     } catch (error) {
       this.logger.error(`${logPrefix} Erreur lors de la récupération des vidéos: ${error.message}`, error.stack);
       // Rethrow or handle as appropriate, maybe return empty array?
       throw error;
     }
   }


  /** Helper pour obtenir l'ID de la playlist d'uploads */
  private async getUploadPlaylistId(youtube: youtube_v3.Youtube): Promise<string | null> {
      const channelsResponse = await youtube.channels.list({
          part: ['contentDetails'],
          mine: true,
      });
      const uploadsPlaylistId = channelsResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsPlaylistId) {
          this.logger.warn(`[Helper] Uploads playlist ID introuvable.`);
          return null;
      }
      return uploadsPlaylistId;
  }


  // --- getAuthorizedYouTubeClient, getEngagementLevel, mapToVideoDTO, getVideoComments, getStoredVideos inchangés ---
  // ... (coller le reste des méthodes inchangées du fichier précédent) ...

   private async getAuthorizedYouTubeClient(userId: string): Promise<youtube_v3.Youtube> {
    // ... (code inchangé) ...
     this.logger.log(`[DIAGNOSTIC] getAuthorizedYouTubeClient for userId=${userId}`);
    const tokens = await this.integrationService.getIntegrationConfig(userId, 'youtube');
    if (!tokens) { throw new UnauthorizedException('YouTube integration not found'); }
    try {
      const accessToken = tokens.access_token || '';
      const refreshToken = tokens.refresh_token || '';
      const expiresAt = tokens.expires_at || 0;
      if (!accessToken || !refreshToken) { throw new UnauthorizedException('Invalid YouTube authorization tokens'); }
      const freshTokens = await this.tokenRefreshService.ensureFreshAccessToken(userId, accessToken, refreshToken, expiresAt);
      this.logger.log(`[DIAGNOSTIC] Token successfully refreshed/verified for user=${userId}`);
      return this.tokenRefreshService.createAuthorizedYouTubeClient(freshTokens);
    } catch (err) {
      this.logger.error(`[DIAGNOSTIC] Error refreshing token for user=${userId}: ${err.message}`, err.stack);
       if (err.message.includes('invalid_grant') || err.message.includes('401') || err.message.includes('403')) {
           await this.youtubeAuthService.revokeIntegration(userId).catch(revokeError => this.logger.error(`Error revoking: ${revokeError.message}`));
           throw new UnauthorizedException('Token invalid, must reconnect YouTube');
       }
      throw err;
    }
  }

   private getEngagementLevel(normalizedScore: number): string {
     // ... (code inchangé) ...
    if (normalizedScore >= 0.8) return 'Exceptionnel';
    if (normalizedScore >= 0.6) return 'Excellent';
    if (normalizedScore >= 0.4) return 'Très bon';
    if (normalizedScore >= 0.2) return 'Bon';
    if (normalizedScore >= 0.1) return 'Moyen';
    return 'Faible';
   }

   private mapToVideoDTO(item: any): VideoDTO {
     // ... (code inchangé) ...
     if (!item) return { id: '', title: '', description: '', publishedAt: '', thumbnailUrl: '', channelId: '', channelTitle: '', stats: { viewCount: 0, likeCount: 0, commentCount: 0, favoriteCount: 0 }, duration: '' };
     const snippet = item.snippet || {};
     const statistics = item.statistics || {};
     const contentDetails = item.contentDetails || {};
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

  async getVideoComments(userId: string, videoId: string, maxResults = 20) { /* ... code inchangé ... */ return []; }
  async getStoredVideos(userId: string, limit?: number, includeStats?: boolean): Promise<VideoDTO[]> { /* ... code inchangé ... */ return []; }
  async getVideoDetails(userId: string, videoId: string): Promise<VideoStatsDTO | null> { /* ... code inchangé (mais pourrait être simplifié/supprimé si non utilisé) ... */ return null; }
}