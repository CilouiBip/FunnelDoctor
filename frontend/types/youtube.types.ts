/**
 * YouTube video resource interface
 */
export interface YouTubeVideo {
  id: string;
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
  kind: string;
  etag: string;
  nextPageToken?: string;
  prevPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: YouTubeVideo[];
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
