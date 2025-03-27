import { useMemo } from 'react';
import { YouTubeVideo } from '../types/youtube.types';

/**
 * Interface pour les métriques agrégées YouTube
 */
export interface YouTubeAggregatedMetrics {
  // Métriques de vues et statistiques de base
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalWatchTimeMinutes: number;
  totalVideos: number;
  
  // Métriques de durée et rétention
  avgViewDuration: number;        // Durée moyenne de visionnage en secondes
  avgViewPercentage: number;      // Pourcentage moyen de rétention
  formattedAvgDuration: string;   // Durée moyenne formatée (MM:SS)
  avgDurationSeconds: number;     // Durée moyenne en secondes (nombre entier)
  
  // Métriques d'engagement
  avgEngagementRate: number;      // Taux d'engagement moyen (ratio)
  
  // Métriques de croissance
  totalSubscribersGained: number;
  totalShares: number;
  
  // Métriques des cards/endscreens
  avgCardCTR: number;             // Taux de clics moyen sur les cards (pourcentage)
  totalCardClicks: number;
  totalCardImpressions: number;
}

/**
 * Hook pour calculer des métriques agrégées à partir des vidéos YouTube
 * @param videos Liste des vidéos YouTube
 * @returns Métriques agrégées calculées
 */
const useYouTubeAnalytics = (videos: YouTubeVideo[] = []): YouTubeAggregatedMetrics => {
  // Calcul des métriques agrégées basé sur les données vidéos
  const analytics = useMemo(() => {
    if (!videos || videos.length === 0) {
      return {
        // Métriques de base
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        totalWatchTimeMinutes: 0,
        totalVideos: 0,
        
        // Métriques de durée et rétention
        avgViewDuration: 0,
        avgViewPercentage: 0,
        formattedAvgDuration: '0:00',
        avgDurationSeconds: 0,
        
        // Métriques d'engagement
        avgEngagementRate: 0,
        
        // Métriques de croissance
        totalSubscribersGained: 0,
        totalShares: 0,
        
        // Métriques des cards
        avgCardCTR: 0,
        totalCardClicks: 0,
        totalCardImpressions: 0
      };
    }

    // Initialize counters
    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalWatchTimeMinutes = 0;
    let totalViewDurationSeconds = 0;
    let totalViewPercentage = 0;
    let totalSubscribersGained = 0;
    let totalShares = 0;
    let totalCardClicks = 0;
    let totalCardImpressions = 0;
    let videosWithAnalytics = 0;
    let videosWithViewPercentage = 0;
    let videosWithCardData = 0;

    // Calculate totals
    videos.forEach(video => {
      // Log pour déboguer la structure des vidéos
      console.log(`[ANALYTICS-DEBUG] Processing video ${video.id}`, {
        hasStats: !!video.stats,
        hasAnalytics: !!video.analytics,
        statsProperties: video.stats ? Object.keys(video.stats) : [],
        analyticsProperties: video.analytics ? Object.keys(video.analytics) : []
      });
      
      // Basic statistics from video.stats (nouvelle structure)
      if (video.stats) {
        // Conversion de type string | number en number
        const viewCount = typeof video.stats.viewCount === 'number' ? video.stats.viewCount : parseInt(String(video.stats.viewCount || '0'));
        const likeCount = typeof video.stats.likeCount === 'number' ? video.stats.likeCount : parseInt(String(video.stats.likeCount || '0'));
        const commentCount = typeof video.stats.commentCount === 'number' ? video.stats.commentCount : parseInt(String(video.stats.commentCount || '0'));
        
        totalViews += viewCount;
        totalLikes += likeCount;
        totalComments += commentCount;
        console.log(`[ANALYTICS-DEBUG] Video ${video.id} stats: views=${viewCount}, likes=${likeCount}, comments=${commentCount}`);
      } 
      // Fallback vers l'ancienne structure si nécessaire
      else if (video.statistics) {
        totalViews += parseInt(video.statistics.viewCount || '0');
        totalLikes += parseInt(video.statistics.likeCount || '0');
        totalComments += parseInt(video.statistics.commentCount || '0');
        console.log(`[ANALYTICS-DEBUG] Video ${video.id} using legacy statistics object`);
      }

      // Advanced metrics from analytics
      if (video.analytics) {
        videosWithAnalytics++;
        console.log(`[ANALYTICS-DEBUG] Video ${video.id} analytics data:`, video.analytics);
        
        // Watch time metrics
        if (video.analytics.watchTimeMinutes) {
          totalWatchTimeMinutes += parseFloat(video.analytics.watchTimeMinutes);
        }
        
        if (video.analytics.averageViewDuration) {
          totalViewDurationSeconds += parseFloat(video.analytics.averageViewDuration);
        }
        
        // Retention
        if (video.analytics.averageViewPercentage) {
          // Faire une moyenne pondérée par les vues si possible
          let weight = 1;
          if (video.stats?.viewCount) {
            weight = typeof video.stats.viewCount === 'number' ? video.stats.viewCount : parseInt(String(video.stats.viewCount || '1'));
          }
          
          totalViewPercentage += parseFloat(String(video.analytics.averageViewPercentage)) * weight;
          videosWithViewPercentage += weight;
        }
        
        // Subscriber metrics
        if (video.analytics.subscribersGained) {
          totalSubscribersGained += typeof video.analytics.subscribersGained === 'number' 
            ? video.analytics.subscribersGained 
            : parseInt(String(video.analytics.subscribersGained || 0));
        }
        
        // Sharing metrics
        if (video.analytics.shares) {
          totalShares += typeof video.analytics.shares === 'number'
            ? video.analytics.shares
            : parseInt(String(video.analytics.shares || 0));
        }
        
        // Card (end screen) metrics
        if (video.analytics.cardClicks) {
          totalCardClicks += typeof video.analytics.cardClicks === 'number'
            ? video.analytics.cardClicks
            : parseInt(String(video.analytics.cardClicks || 0));
          videosWithCardData++;
        }
        
        if (video.analytics.cardImpressions) {
          totalCardImpressions += typeof video.analytics.cardImpressions === 'number'
            ? video.analytics.cardImpressions
            : parseInt(String(video.analytics.cardImpressions || 0));
        }
      }
    });
    
    console.log('[ANALYTICS-DEBUG] Aggregated metrics before averages:', {
      totalViews,
      totalLikes,
      totalComments,
      videosWithAnalytics,
      videosWithViewPercentage,
      totalViewPercentage,
      totalViewDurationSeconds,
      totalSubscribersGained,
      totalShares,
      totalCardClicks,
      totalCardImpressions
    });

    // Calculate averages
    const avgViewDuration = videosWithAnalytics > 0 ? totalViewDurationSeconds / videosWithAnalytics : 0;
    const avgViewPercentage = videosWithViewPercentage > 0 ? totalViewPercentage / videosWithViewPercentage : 0;
    const avgCardCTR = totalCardImpressions > 0 ? (totalCardClicks / totalCardImpressions) * 100 : 0;
    
    // Calculer l'engagement moyen (Total Likes + Total Comments) / Total Views
    const avgEngagementRate = totalViews > 0 ? (totalLikes + totalComments) / totalViews : 0;
    
    console.log('[ANALYTICS-DEBUG] Final averages calculated:', {
      avgViewDuration,
      avgViewPercentage,
      avgCardCTR,
      avgEngagementRate
    });
    
    // Convertir la durée en format minutes:secondes pour affichage
    const formattedAvgDuration = avgViewDuration > 0 
      ? `${Math.floor(avgViewDuration / 60)}:${Math.floor(avgViewDuration % 60).toString().padStart(2, '0')}`
      : '0:00';

    // Format de durée alternative en secondes pour comparaison
    const avgDurationSeconds = Math.round(avgViewDuration)

    return {
      totalViews,
      totalLikes,
      totalComments,
      totalWatchTimeMinutes,
      avgViewDuration,
      avgViewPercentage,
      totalSubscribersGained,
      totalShares,
      avgCardCTR,
      totalCardClicks,
      totalCardImpressions,
      totalVideos: videos.length,
      avgEngagementRate,      // Nouvelle métrique
      formattedAvgDuration,   // Format lisible de la durée moyenne
      avgDurationSeconds     // Secondes brutes pour affichage alternatif
    };
  }, [videos]);

  return analytics;
};

export default useYouTubeAnalytics;
