import React from 'react';
import { YouTubeVideo } from '../../types/youtube.types';
import VideoTableRow from './VideoTableRow';

interface VideoTableProps {
  videos: YouTubeVideo[];
  loading?: boolean;
  selectedPeriod: string;
  onViewDetails?: (videoId: string) => void;
}

const VideoTable: React.FC<VideoTableProps> = ({
  videos,
  loading = false,
  selectedPeriod,
  onViewDetails,
}) => {
  // ... (Gestion loading et no videos inchangée) ...
  if (loading) { /* ... */ }
  if (!videos || videos.length === 0) { /* ... */ }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {/* ... (En-têtes de colonnes inchangés) ... */}
               <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Video</th>
               <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Views</th>
               <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Retention</th>
               <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Engagement</th>
               <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Growth</th>
               <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cards CTR</th>
               <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {videos.map((video, index) => (
              <VideoTableRow
                key={`${video.id}-${selectedPeriod}`} 
                video={video}
                onViewDetails={onViewDetails}
                index={index}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VideoTable;