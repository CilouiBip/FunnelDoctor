import React from 'react';
import { YouTubeVideo } from '../../types/youtube.types';
import VideoTableRow from './VideoTableRow';

interface VideoTableProps {
  videos: YouTubeVideo[];
  loading?: boolean;
  onViewDetails?: (videoId: string) => void;
}

const VideoTable: React.FC<VideoTableProps> = ({
  videos,
  loading = false,
  onViewDetails,
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center min-h-[300px] flex flex-col justify-center items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-800 mb-2">Aucune vidu00e9o trouve</h3>
        <p className="text-gray-500 max-w-md">Aucune vidu00e9o YouTube n'a u00e9tu00e9 trouvu00e9e. Vous n'avez peut-u00eatre pas encore publie de vidu00e9os ou une erreur s'est produite lors de la ru00e9cupu00e9ration des donnu00e9es.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vidu00e9o
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statistiques
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Engagement
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ru00e9tention
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fiches
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Croissance
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {videos.map((video) => (
              <VideoTableRow 
                key={video.id} 
                video={video} 
                onViewDetails={onViewDetails} 
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VideoTable;
