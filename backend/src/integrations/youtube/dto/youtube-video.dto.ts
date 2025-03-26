/**
 * DTO représentant une vidéo YouTube
 */
export class YouTubeVideoDto {
  id?: string;                     // UUID dans notre DB
  user_id: string;                 // ID utilisateur dans notre système
  video_id: string;                // ID YouTube de la vidéo
  title: string;
  description?: string;
  published_at: Date;
  thumbnail_url?: string;
  channel_id: string;
  channel_title?: string;
  duration?: string;
  tags?: string[];
  created_at?: Date;
  updated_at?: Date;
  stats?: YouTubeStatsDto;         // Statistiques associées (optionnel)
}

/**
 * DTO représentant les statistiques d'une vidéo YouTube
 */
export class YouTubeStatsDto {
  id?: string;                     // UUID dans notre DB
  video_id: string;                // UUID référence à youtube_videos
  view_count: number;
  like_count: number;
  comment_count: number;
  favorite_count: number;
  engagement_rate?: number;        // Calculé (peut être null)
  fetched_at?: Date;
}
