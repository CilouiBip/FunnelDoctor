import React from 'react';
import { YouTubeVideo } from '../../types/youtube.types';
import { formatNumber, formatDuration, formatDate, getEngagementColorClass, getRetentionColorClass } from '../../utils/formatters';

interface VideoTableRowProps {
  video: YouTubeVideo;
  onViewDetails?: (videoId: string) => void;
}

const VideoTableRow: React.FC<VideoTableRowProps> = ({ video, onViewDetails }) => {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      {/* Colonne Vidu00e9o - Thumbnail et informations de base */}
      <td className="px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="w-16 h-9 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
            {/* Utiliser le debugger du navigateur pour voir cette information */}
            <img 
              src={video.snippet?.thumbnails?.medium?.url || 
                   video.snippet?.thumbnails?.default?.url || 
                   video.snippet?.thumbnails?.high?.url || 
                   'https://via.placeholder.com/120x90?text=No+Thumbnail'}
              alt={video.snippet?.title || 'YouTube Video'} 
              className="w-full h-full object-cover" 
              onError={(e) => {
                e.currentTarget.src = 'https://via.placeholder.com/120x90?text=Error';
                console.error('Failed to load image for video:', video.id);
              }}
            />
          </div>
          <div className="flex flex-col">
            <span className="font-medium truncate max-w-xs">{video.snippet?.title || 'Vidu00e9o sans titre'}</span>
            <span className="text-xs text-gray-500">
              {formatDate(video.snippet?.publishedAt)}
            </span>
          </div>
        </div>
      </td>

      {/* Statistiques de base */}
      <td className="px-4 py-4">
        <div className="flex flex-col space-y-1">
          <div className="flex items-center space-x-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="text-sm text-gray-700">
              {formatNumber(video.statistics?.viewCount)}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
            <span className="text-sm text-gray-700">
              {formatNumber(video.statistics?.likeCount)}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="text-sm text-gray-700">
              {formatNumber(video.statistics?.commentCount)}
            </span>
          </div>
        </div>
      </td>

      {/* Engagement */}
      <td className="px-4 py-4">
        <div className="flex flex-col space-y-1">
          <div className="text-sm">
            <span className={getEngagementColorClass(video.stats?.engagementLevel)}>
              {video.stats?.engagementRate 
                ? `${(video.stats.engagementRate * 100).toFixed(2)}%` 
                : 'N/A'}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {video.stats?.engagementLevel || 'N/A'}
          </div>
        </div>
      </td>

      {/* Ru00e9tention & Duru00e9e */}
      <td className="px-4 py-4">
        <div className="flex flex-col space-y-1">
          <div className="text-sm">
            <span className={getRetentionColorClass(video.analytics?.averageViewPercentage)}>
              {video.analytics?.averageViewPercentage 
                ? `${video.analytics.averageViewPercentage.toFixed(2)}%` 
                : 'N/A'}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {formatDuration(video.analytics?.averageViewDuration)}
          </div>
        </div>
      </td>

      {/* Fiches & CTAs */}
      <td className="px-4 py-4">
        <div className="flex flex-col space-y-1">
          <div className="text-sm flex justify-between items-center">
            <span className="font-medium">
              {video.analytics?.cardClickRate 
                ? `${(video.analytics.cardClickRate * 100).toFixed(2)}%` 
                : 'N/A'}
            </span>
            <span className="text-xs text-gray-500 ml-1">CTR</span>
          </div>
          <div className="text-xs text-gray-500 flex justify-between">
            <span>
              {formatNumber(video.analytics?.cardClicks || 0)}
            </span>
            <span>clics</span>
          </div>
          <div className="text-xs text-gray-500 flex justify-between">
            <span>
              {formatNumber(video.analytics?.cardImpressions || 0)}
            </span>
            <span>impressions</span>
          </div>
        </div>
      </td>

      {/* Croissance */}
      <td className="px-4 py-4">
        <div className="flex flex-col space-y-2">
          <div className="text-sm flex justify-between items-center">
            <span className="text-green-600 font-medium">
              +{formatNumber(video.analytics?.subscribersGained || 0)}
            </span>
            <span className="text-xs text-gray-500">abonnu00e9s</span>
          </div>
          <div className="text-sm flex justify-between items-center">
            <span className="text-blue-600 font-medium">
              {formatNumber(video.analytics?.shares || 0)}
            </span>
            <span className="text-xs text-gray-500">partages</span>
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
