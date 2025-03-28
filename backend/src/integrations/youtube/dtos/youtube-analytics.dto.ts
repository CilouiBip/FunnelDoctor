/**
 * DTOs pour les analytics YouTube
 */

export interface AggregatedVideoKPIsDTO {
  totalVideosConsidered: number; // Nombre d'IDs trouvés
  totalVideosAnalysed: number; // Nombre d'appels analytics réussis
  period: { startDate: string; endDate: string };
  totalViews: number;
  averageRetentionPercentage: number; // En % (0-100) 
  averageViewDurationSeconds: number; // En secondes
  totalSubscribersGained: number;
  totalShares: number;
  averageCardCTR: number; // Décimal (0-1)
  totalCardClicks: number;
  totalCardImpressions: number;
  totalWatchTimeMinutes: number; // Temps de visionnage total en minutes
}

// Ajout de l'interface pour les analytics détaillés d'une vidéo
export interface VideoDetailedAnalyticsDTO {
  period: { startDate: string; endDate: string };
  views: number;
  watchTimeMinutes: number;
  averageViewDuration: number; // Secondes
  averageViewPercentage: number; // Décimal (0-1)
  subscribersGained: number;
  shares: number;
  likes: number;
  comments: number;
  cardImpressions: number;
  cardClicks: number;
  cardClickRate: number; // Décimal (0-1)
}
