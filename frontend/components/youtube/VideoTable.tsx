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
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="overflow-x-auto w-full">
        <table className="min-w-full w-full divide-y divide-gray-200 table-fixed">
          <thead className="bg-gray-50">
            <tr>
              {/* ... (En-têtes de colonnes inchangés) ... */}
               <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-4/12">Video</th>
               <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">Views</th>
               <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/12">Retention</th>
               <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/12">Engagement</th>
               <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/12">Growth</th>
               <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">Cards CTR</th>
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