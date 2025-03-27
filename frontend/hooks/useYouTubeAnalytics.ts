import { useState, useEffect } from 'react';
import { YouTubeVideo } from '../types/youtube.types';

/**
 * Interface pour les mu00e9triques agru00e9gu00e9es YouTube
 */
export interface YouTubeAggregatedMetrics {
  // Statistiques de base
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  
  // Mu00e9triques de visionnage
  totalWatchTimeMinutes: number;
  avgViewDuration: number;
  avgViewPercentage: number;
  
  // Engagement
  avgEngagementRate: number;
  
  // Croissance
  totalSubscribersGained: number;
  totalShares: number;
  
  // Fiches/Cartes
  avgCardClickRate: number;
  totalCardClicks: number;
  totalCardImpressions: number;
  
  // Date de calcul
  lastCalculated: Date;
}

/**
 * Hook personnalisu00e9 pour calculer les mu00e9triques agru00e9gu00e9es u00e0 partir des vidu00e9os YouTube
 * @param videos Liste des vidu00e9os YouTube avec statistiques et analytics
 * @returns Mu00e9triques agru00e9gu00e9es calculu00e9es
 */
export const useYouTubeAnalytics = (videos: YouTubeVideo[]): YouTubeAggregatedMetrics => {
  const [metrics, setMetrics] = useState<YouTubeAggregatedMetrics>({
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalWatchTimeMinutes: 0,
    avgViewDuration: 0,
    avgViewPercentage: 0,
    avgEngagementRate: 0,
    totalSubscribersGained: 0,
    totalShares: 0,
    avgCardClickRate: 0,
    totalCardClicks: 0,
    totalCardImpressions: 0,
    lastCalculated: new Date()
  });
  
  useEffect(() => {
    if (!videos || videos.length === 0) return;
    
    // Log pour du00e9bogage
    console.log('[HOOK] Videos data sample:', videos.slice(0, 1));
    
    // Calcul des totaux pour les statistiques de base
    // Convertir toujours les chaiu00f1es en nombres et traiter les cas null/undefined
    const totalViews = videos.reduce((sum, video) => {
      const viewCount = video.statistics?.viewCount;
      return sum + (viewCount ? parseInt(viewCount.toString(), 10) : 0);
    }, 0);
    
    const totalLikes = videos.reduce((sum, video) => {
      const likeCount = video.statistics?.likeCount;
      return sum + (likeCount ? parseInt(likeCount.toString(), 10) : 0);
    }, 0);
      
    const totalComments = videos.reduce((sum, video) => {
      const commentCount = video.statistics?.commentCount;
      return sum + (commentCount ? parseInt(commentCount.toString(), 10) : 0);
    }, 0);
    
    // Calcul des mu00e9triques de visionnage - s'assurer que les valeurs sont des nombres
    const totalWatchTimeMinutes = videos.reduce((sum, video) => {
      const watchTime = video.analytics?.watchTimeMinutes;
      return sum + (typeof watchTime === 'number' ? watchTime : 0);
    }, 0);
    
    // Calcul des moyennes (uniquement pour les vidu00e9os avec donnu00e9es valides)
    // Assurons-nous que les valeurs sont toujours des nombres
    
    // Duru00e9e moyenne de visionnage
    const videosWithDuration = videos.filter(v => {
      const duration = v.analytics?.averageViewDuration;
      return typeof duration === 'number' && duration > 0;
    });
    
    console.log('[HOOK] Videos with duration:', videosWithDuration.length);
      
    const avgViewDuration = videosWithDuration.length > 0
      ? videosWithDuration.reduce((sum, v) => {
          const duration = v.analytics?.averageViewDuration;
          return sum + (typeof duration === 'number' ? duration : 0);
        }, 0) / videosWithDuration.length
      : 0;
    
    // Ru00e9tention
    const videosWithPercentage = videos.filter(v => {
      const percentage = v.analytics?.averageViewPercentage;
      return typeof percentage === 'number' && percentage > 0;
    });
    
    console.log('[HOOK] Videos with percentage:', videosWithPercentage.length);
      
    const avgViewPercentage = videosWithPercentage.length > 0
      ? videosWithPercentage.reduce((sum, v) => {
          const percentage = v.analytics?.averageViewPercentage;
          return sum + (typeof percentage === 'number' ? percentage : 0);
        }, 0) / videosWithPercentage.length
      : 0;
    
    // Engagement
    const videosWithEngagement = videos.filter(v => {
      const rate = v.stats?.engagementRate;
      return typeof rate === 'number' && rate > 0;
    });
    
    console.log('[HOOK] Videos with engagement:', videosWithEngagement.length);
    
    const avgEngagementRate = videosWithEngagement.length > 0
      ? videosWithEngagement.reduce((sum, v) => {
          const rate = v.stats?.engagementRate;
          return sum + (typeof rate === 'number' ? rate : 0);
        }, 0) / videosWithEngagement.length
      : 0;
    
    // Croissance - valeurs numeriques safes
    const totalSubscribersGained = videos.reduce((sum, video) => {
      const subs = video.analytics?.subscribersGained;
      return sum + (typeof subs === 'number' ? subs : 0);
    }, 0);
      
    const totalShares = videos.reduce((sum, video) => {
      const shares = video.analytics?.shares;
      return sum + (typeof shares === 'number' ? shares : 0);
    }, 0);
    
    // Fiches/Cartes
    const videosWithCardCTR = videos.filter(v => {
      const ctr = v.analytics?.cardClickRate;
      return typeof ctr === 'number' && ctr > 0;
    });
    
    console.log('[HOOK] Videos with card CTR:', videosWithCardCTR.length);
      
    const avgCardClickRate = videosWithCardCTR.length > 0
      ? videosWithCardCTR.reduce((sum, v) => {
          const ctr = v.analytics?.cardClickRate;
          return sum + (typeof ctr === 'number' ? ctr : 0);
        }, 0) / videosWithCardCTR.length
      : 0;
    
    const totalCardClicks = videos.reduce((sum, video) => {
      const clicks = video.analytics?.cardClicks;
      return sum + (typeof clicks === 'number' ? clicks : 0);
    }, 0);
      
    const totalCardImpressions = videos.reduce((sum, video) => {
      const impressions = video.analytics?.cardImpressions;
      return sum + (typeof impressions === 'number' ? impressions : 0);
    }, 0);
    
    // Mise u00e0 jour de l'u00e9tat avec tous les mu00e9triques calculu00e9s
    setMetrics({
      totalViews,
      totalLikes,
      totalComments,
      totalWatchTimeMinutes,
      avgViewDuration,
      avgViewPercentage,
      avgEngagementRate,
      totalSubscribersGained,
      totalShares,
      avgCardClickRate,
      totalCardClicks,
      totalCardImpressions,
      lastCalculated: new Date()
    });
  }, [videos]);
  
  return metrics;
};

export default useYouTubeAnalytics;
