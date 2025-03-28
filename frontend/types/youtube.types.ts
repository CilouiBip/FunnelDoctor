/**
 * YouTube video resource interface
 */
export interface YouTubeVideo {
  id: string;
  dbId?: string; // ID dans Supabase
  title?: string; // Pour faciliter l'accès direct sans passer par snippet
  description?: string; // Pour faciliter l'accès direct
  thumbnailUrl?: string; // URL de la miniature pour accès direct
  channelTitle?: string; // Titre de la chaîne pour accès direct
  publishedAt?: string; // Date de publication pour accès direct
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      default: YouTubeThumbnail;
      medium: YouTubeThumbnail;
      high: YouTubeThumbnail;
      standard?: YouTubeThumbnail;
      maxres?: YouTubeThumbnail;
    };
    channelTitle: string;
  };
  statistics?: {
    viewCount: string;
    likeCount: string;
    favoriteCount: string;
    commentCount: string;
  };
  // YouTube Analytics métriques avancées
  analytics?: {
    views?: number;
    watchTimeMinutes?: number;
    averageViewDuration?: number;
    likes?: number;
    comments?: number;
    // Nouvelles métriques de croissance
    subscribersGained?: number;
    shares?: number;
    // Métrique de rétention
    averageViewPercentage?: number;
    // Métriques des cartes/fiches
    cardClickRate?: number;
    cardClicks?: number;
    cardImpressions?: number;
    // Période d'analyse
    period?: {
      startDate?: string;
      endDate?: string;
    };
  };
  // Métriques calculées d'engagement et statistiques de base
  stats?: {
    // Métriques de base (viewCount, likeCount, etc.)
    viewCount?: string | number;
    likeCount?: string | number;
    commentCount?: string | number;
    favoriteCount?: string | number;
    // Métriques calculées d'engagement
    engagementRate?: number;
    normalizedEngagementRate?: number;
    engagementLevel?: string;
  };
  // Additional properties for FunnelDoctor metrics
  funnelMetrics?: {
    clickRate?: number;
    leads?: number;
    conversionRate?: number;
    earnings?: number;
  };
}

/**
 * YouTube thumbnail interface
 */
export interface YouTubeThumbnail {
  url: string;
  width: number;
  height: number;
}

/**
 * YouTube API response interface
 */
export interface YouTubeResponse {
  kind?: string;
  etag?: string;
  nextPageToken?: string;
  prevPageToken?: string;
  pageInfo?: {
    totalResults: number;
    resultsPerPage: number;
  };
  // Propriété selon le format de l'API YouTube standard
  items?: YouTubeVideo[];
  // Propriété selon le format renvoyé par notre backend
  videos?: YouTubeVideo[];
  // Réponse simplifiée
  data?: any;
}

/**
 * YouTube API error interface
 */
export interface YouTubeApiError {
  code: number;
  message: string;
  errors?: {
    message: string;
    domain: string;
    reason: string;
  }[];
}

/**
 * Paramètres pour la requête de vidéos YouTube
 */
export interface GetVideosParams {
  limit?: number;
  pageToken?: string;
  order?: 'date' | 'rating' | 'viewCount' | 'title';
  refresh?: boolean;
  period?: 'last7' | 'last28' | 'last30' | 'last90';
}

/**
 * Réponse de l'API pour la liste des vidéos
 */
export interface VideoListResponse {
  items: YouTubeVideo[];
  nextPageToken?: string;
  prevPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  kind?: string;
  etag?: string;
}
