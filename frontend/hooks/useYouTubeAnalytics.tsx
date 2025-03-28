import { useState, useEffect, useMemo } from 'react';
import { YouTubeVideo } from '../types/youtube.types'; // Assure-toi que les types sont corrects

export interface YouTubeAggregatedMetrics {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalWatchTimeMinutes: number;
  totalVideos: number;
  avgViewDuration: number; // secondes
  avgViewPercentage: number; // pourcentage 0-100
  formattedAvgDuration: string; // MM:SS
  avgEngagementRate: number; // décimal 0-1
  totalSubscribersGained: number;
  totalShares: number;
  avgCardCTR: number; // pourcentage 0-100
  totalCardClicks: number;
  totalCardImpressions: number;
}

const useYouTubeAnalytics = (videos: YouTubeVideo[] = []): YouTubeAggregatedMetrics => {
  const logger = console; // Utilisation simple de console.log pour le hook

  const aggregatedMetrics = useMemo(() => {
     logger.log(`[HOOK useYouTubeAnalytics] Recalculating KPIs for ${videos.length} videos.`);

     // Log pour vérifier les données reçues par le hook
     if (videos.length > 0) {
         logger.log(`[HOOK useYouTubeAnalytics] First video data sample - Period: ${videos[0].analytics?.period?.startDate}, Retention: ${videos[0].analytics?.averageViewPercentage}`);
     }


    if (!videos || videos.length === 0) {
      return {
        totalViews: 0, totalLikes: 0, totalComments: 0, totalWatchTimeMinutes: 0,
        totalVideos: 0, avgViewDuration: 0, avgViewPercentage: 0, formattedAvgDuration: '0:00',
        avgEngagementRate: 0, totalSubscribersGained: 0, totalShares: 0, avgCardCTR: 0,
        totalCardClicks: 0, totalCardImpressions: 0
      };
    }

    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalWatchTimeMinutes = 0;
    let totalViewDurationSeconds = 0; // Somme des durées moyennes pondérées
    let totalViewPercentageWeight = 0; // Somme des poids (vues) pour la rétention %
    let totalWeightedViewPercentage = 0;
    let totalSubscribersGained = 0;
    let totalShares = 0;
    let totalCardClicks = 0;
    let totalCardImpressions = 0;
    let videoCountWithAnalytics = 0; // Compte les vidéos ayant des données analytics

    videos.forEach(video => {
      const views = video.stats?.viewCount || 0;
      const likes = video.stats?.likeCount || 0;
      const comments = video.stats?.commentCount || 0;

      totalViews += views;
      totalLikes += likes;
      totalComments += comments;

      if (video.analytics) {
        videoCountWithAnalytics++;
        const analytics = video.analytics;
        totalWatchTimeMinutes += analytics.watchTimeMinutes || 0;
        totalSubscribersGained += analytics.subscribersGained || 0;
        totalShares += analytics.shares || 0;
        totalCardClicks += analytics.cardClicks || 0;
        totalCardImpressions += analytics.cardImpressions || 0;

        // Moyenne pondérée pour la durée et le % de rétention
        const avgDuration = analytics.averageViewDuration || 0;
        const avgPercentage = analytics.averageViewPercentage || 0;

        if (views > 0) {
           totalViewDurationSeconds += avgDuration * views;
           totalWeightedViewPercentage += avgPercentage * views;
           totalViewPercentageWeight += views;
        }
      }
    });

    // Calcul des moyennes
    // Utilise totalViewPercentageWeight pour pondérer, qui est la somme des vues des vidéos ayant des analytics de rétention
    const avgViewDuration = totalViews > 0 ? totalViewDurationSeconds / totalViews : 0; // Moyenne pondérée globale
    const avgViewPercentage = totalViewPercentageWeight > 0 ? totalWeightedViewPercentage / totalViewPercentageWeight : 0;
    const avgCardCTR = totalCardImpressions > 0 ? (totalCardClicks / totalCardImpressions) * 100 : 0; // En pourcentage
    const avgEngagementRate = totalViews > 0 ? (totalLikes + totalComments) / totalViews : 0; // En décimal

    const formatDuration = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
     };

     const result = {
      totalViews,
      totalLikes,
      totalComments,
      totalWatchTimeMinutes,
      totalVideos: videos.length, // Nombre total de vidéos DANS LE TABLEAU ACTUEL
      avgViewDuration: Math.round(avgViewDuration),
      avgViewPercentage: parseFloat(avgViewPercentage.toFixed(1)), // En %
      formattedAvgDuration: formatDuration(avgViewDuration), // MM:SS
      avgEngagementRate: parseFloat(avgEngagementRate.toFixed(4)), // Décimal
      totalSubscribersGained,
      totalShares,
      avgCardCTR: parseFloat(avgCardCTR.toFixed(2)), // En %
      totalCardClicks,
      totalCardImpressions,
    };

    logger.log(`[HOOK useYouTubeAnalytics] KPIs Calculés: Views=${result.totalViews}, AvgRet(%) =${result.avgViewPercentage}, Subs=${result.totalSubscribersGained}`);
    return result;

  }, [videos]); // Recalcule SEULEMENT si le tableau 'videos' change

  return aggregatedMetrics;
};

export default useYouTubeAnalytics;