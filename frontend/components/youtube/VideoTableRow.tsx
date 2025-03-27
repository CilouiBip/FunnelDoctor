import React from 'react';
import { YouTubeVideo } from '../../types/youtube.types';
import { formatNumber, formatDuration, formatDate, getEngagementColorClass, getRetentionColorClass } from '../../utils/formatters';

interface VideoTableRowProps {
  video: YouTubeVideo;
  onViewDetails?: (videoId: string) => void;
}

const VideoTableRow: React.FC<VideoTableRowProps> = ({ video, onViewDetails }) => {
  // Log des props pour débogage
  console.log('[VideoTableRow] Props reçues pour video.id:', video?.id, video);
  
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      {/* Column: Video - Thumbnail and basic info */}
      <td className="px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="w-16 h-9 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
            <img 
              src={video.thumbnailUrl || "/images/thumbnail-placeholder.png"} 
              alt={video.title || "Video thumbnail"}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error(`Échec chargement image depuis thumbnailUrl: ${video.thumbnailUrl} pour video: ${video.id}`);
                // Si même la thumbnailUrl échoue, utiliser le placeholder local
                e.currentTarget.src = "/images/thumbnail-placeholder.png";
              }}
            />
          </div>
          <div className="flex flex-col">
            <span className="font-medium truncate max-w-xs">{video.title || 'Titre Manquant'}</span>
            <span className="text-xs text-gray-500">
              ID: {video?.id || 'N/A'}
            </span>
          </div>
        </div>
      </td>

      {/* Colonne VIEWS - Vues, minutes estimées et likes */}
      <td className="px-4 py-4">
        <div className="flex flex-col space-y-1">
          <div className="flex items-center space-x-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="text-sm text-gray-700 font-medium">
              {video.stats?.viewCount ?? 'N/A'}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-gray-500">
              Mins: {video.analytics?.estimatedMinutesWatched ?? video.analytics?.watchTimeMinutes ?? 'N/A'}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-gray-500">
              Likes: {video.stats?.likeCount ?? 'N/A'}
            </span>
          </div>
        </div>
      </td>

      {/* Colonne RETENTION - Pourcentage et durée de rétention */}
      <td className="px-4 py-4">
        <div className="flex flex-col space-y-1">
          <div className="text-sm">
            Rétention: {(video.analytics?.averageViewPercentage ?? 0).toFixed(1)} %
          </div>
          <div className="text-xs text-gray-500">
            Durée: {video.analytics?.averageViewDuration ?? 0} sec
          </div>
        </div>
      </td>

      {/* Colonne ENGAGEMENT - Taux et niveau d'engagement */}
      <td className="px-4 py-4">
        <div className="flex flex-col space-y-1">
          <div className="text-sm">
            Taux: {(video.stats?.engagementRate ?? 0).toFixed(4)}
          </div>
          <div className="text-xs text-gray-500">
            Niveau: {video.stats?.engagementLevel ?? 'N/A'}
          </div>
        </div>
      </td>

      {/* Colonne GROWTH - Abonnés gagnés et partages */}
      <td className="px-4 py-4">
        <div className="flex flex-col space-y-2">
          <div className="text-sm">
            <span>
              Abonnés: {video.analytics?.subscribersGained ?? 0}
            </span>
          </div>
          <div className="text-sm">
            <span>
              Partages: {video.analytics?.shares ?? 0}
            </span>
          </div>
        </div>
      </td>

      {/* Colonne CARDS CTR - Taux de clic, nombre de clics et impressions */}
      <td className="px-4 py-4">
        <div className="flex flex-col space-y-1">
          <div className="text-sm">
            <span>
              {/* cardClickRate est en décimal (0-1) venant de l'API, multiplication par 100 pour affichage % */}
              CTR: {typeof video.analytics?.cardClickRate === 'number' 
                ? `${(video.analytics.cardClickRate * 100).toFixed(1)}%` 
                : '0.0%'}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            <span>
              Clics: {video.analytics?.cardClicks ?? 0}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            <span>
              Impr: {video.analytics?.cardImpressions ?? 0}
            </span>
          </div>
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-4 text-right">
        <button 
          onClick={() => onViewDetails && onViewDetails(video.id)}
          className="text-indigo-600 hover:text-indigo-900 focus:outline-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      </td>
    </tr>
  );
};

export default VideoTableRow;