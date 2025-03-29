import React from 'react';
import { YouTubeVideo } from '../../types/youtube.types';
import { formatNumber, formatDuration, formatDate } from '../../utils/formatters'; // Supposant que formatDuration existe et gère 0 ou undefined

interface VideoTableRowProps {
  video: YouTubeVideo;
  onViewDetails?: (videoId: string) => void;
  index: number;
}

// PAS DE React.memo ici pour forcer le rendu
const VideoTableRow: React.FC<VideoTableRowProps> = ({ video, onViewDetails, index }) => {
  // Log de preuve
  console.log(`[VideoTableRow RENDER][Video ID: ${video.id}] Period: ${video.analytics?.period?.startDate} / Retention: ${video.analytics?.averageViewPercentage} / Subs: ${video.analytics?.subscribersGained}`);

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      {/* Video */}
      <td className="px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="w-16 h-9 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
            <img
              src={video.thumbnailUrl || "/images/thumbnail-placeholder.png"}
              alt={video.title || "Video thumbnail"}
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.src = "/images/thumbnail-placeholder.png"; }}
            />
          </div>
          <div>
            <span className="font-medium">{video.title || 'Titre Manquant'}</span>
            <span className="text-xs text-gray-500">ID: {video?.id || 'N/A'}</span>
          </div>
        </div>
      </td>

      {/* Views */}
      <td className="px-4 py-4">
        <div className="flex flex-col space-y-1">
           {/* DECISION: Afficher les vues de la période (analytics) */}
           <span>{formatNumber(video.analytics?.views ?? 0)}</span>
           <span className="text-xs text-gray-500">
              {/* Utilise analytics.watchTimeMinutes (période) */}
              Mins: {video.analytics?.watchTimeMinutes ? formatNumber(video.analytics.watchTimeMinutes) : '-'}
           </span>
           <span className="text-xs text-gray-500">
              {/* Utilise analytics.likes (période) ou stats.likeCount (total)? 
                  Gardons stats.likeCount pour le total des likes visibles sur YT */}
              Likes: {video.stats?.likeCount ? formatNumber(video.stats.likeCount) : '-'}
           </span>
        </div>
      </td>

      {/* Retention */}
      <td className="px-4 py-4">
        <div className="flex flex-col space-y-1">
          <div className="text-sm">
            {/* Utilise analytics.averageViewPercentage (période), formatée */}
            Rétention: {typeof video.analytics?.averageViewPercentage === 'number' ? `${video.analytics.averageViewPercentage.toFixed(1)}%` : '0.0%'}
          </div>
          <div className="text-xs text-gray-500">
             {/* Utilise analytics.averageViewDuration (période), formatée */}
             Durée: {formatDuration(video.analytics?.averageViewDuration ?? 0)}
          </div>
        </div>
      </td>

      {/* Engagement */}
      <td className="px-4 py-4">
        <div className="flex flex-col space-y-1">
          <div className="text-sm">
             {/* Utilise stats.engagementRate calculé (basé sur le total?) ou faudra-t-il un taux périodique? 
                 Pour l'instant, on garde celui calculé dans `stats` */}
             Taux: {typeof video.stats?.engagementRate === 'number' ? `${(video.stats.engagementRate * 100).toFixed(2)}%` : '0.00%'}
          </div>
          <div className="text-xs text-gray-500">
            {/* Utilise analytics.comments (période) */}
            Comms: {video.analytics?.comments ? formatNumber(video.analytics.comments) : '-'}
          </div>
        </div>
      </td>

      {/* Growth */}
      <td className="px-4 py-4">
        <div className="flex flex-col space-y-2">
          <div className="text-sm">
            {/* Utilise analytics.subscribersGained */}
            <span>Abonnés: {formatNumber(video.analytics?.subscribersGained ?? 0)}</span>
          </div>
          <div className="text-sm">
            {/* Utilise analytics.shares */}
            <span>Partages: {formatNumber(video.analytics?.shares ?? 0)}</span>
          </div>
        </div>
      </td>

      {/* Cards CTR */}
      <td className="px-4 py-4">
        <div className="flex flex-col space-y-1">
          <div className="text-sm">
            <span>
              {/* CORRECTION: Utilise analytics.cardClickRate */}
              CTR: {typeof video.analytics?.cardClickRate === 'number'
                ? `${(video.analytics.cardClickRate * 100).toFixed(1)}%`
                : '0.0%'}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {/* Utilise analytics.cardClicks */}
            <span>Clics: {formatNumber(video.analytics?.cardClicks ?? 0)}</span>
          </div>
          <div className="text-xs text-gray-500">
            <span>Impr: {video.analytics?.cardImpressions ?? 0}</span>
          </div>
        </div>
      </td>


    </tr>
  );
};

export default VideoTableRow;