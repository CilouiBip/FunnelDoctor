"use client";

import { useState, useEffect, useRef } from 'react';
import { fetchVideos, checkYouTubeConnection, connectYouTubeAccount, disconnectYouTubeAccount } from '../../../services/youtube.service';
import { YouTubeVideo } from '../../../types/youtube.types';
import VideoCard from '../../../components/youtube/VideoCard';
import toast from 'react-hot-toast';

export default function VideoPerformancePage() {
  const [dateRange, setDateRange] = useState('last30');
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pageToken, setPageToken] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  
  // Fetch YouTube connection status and videos
  // Référence pour éviter les initialisations multiples en mode développement
  const initializationRef = useRef(false);
  
  useEffect(() => {
    // Vérifier si l'initialisation a déjà été faite
    if (initializationRef.current) {
      console.log("[DEBUG] Initialisation déjà effectuée, ignorée");
      return;
    }
    
    const initializeData = async () => {
      try {
        console.log("[DEBUG] Démarrage initializeData dans useEffect");
        initializationRef.current = true; // Marquer comme initialisé
        
        // Check if YouTube account is connected
        console.log("[DEBUG] Avant appel à checkYouTubeConnection");
        const connected = await checkYouTubeConnection();
        console.log("[DEBUG] État de connexion YouTube:", { 
          connected, 
          previousState: isConnected,
          timestamp: new Date().toISOString() 
        });
        
        setIsConnected(connected);
        console.log("[DEBUG] Après setIsConnected:", connected);
        
        if (connected) {
          console.log("[DEBUG] YouTube connecté, chargement des vidéos");
          await loadVideos();
        } else {
          console.log("[DEBUG] YouTube non connecté, affichage du bouton de connexion");
          setLoading(false);
        }
      } catch (err) {
        console.error('[DEBUG] Erreur initializeData:', err);
        setError('Failed to connect to YouTube. Please try again later.');
        setLoading(false);
      }
    };
    
    console.log("[DEBUG] Création de l'effet, isConnected:", isConnected);
    initializeData();
  }, []);
  
  // Function to load videos from the API
  const loadVideos = async (token?: string) => {
    try {
      setLoading(true);
      const response = await fetchVideos(token);
      
      if (token) {
        // Append videos for pagination
        setVideos(prev => [...prev, ...(response.items || [])]);
      } else {
        // Replace videos for initial load or refresh
        setVideos(response.items || []);
      }
      
      setPageToken(response.nextPageToken || '');
      setLoading(false);
    } catch (err) {
      console.error('Failed to load videos:', err);
      setError('Failed to load videos. Please try again later.');
      setLoading(false);
    }
  };
  
  // Function to handle YouTube account connection
  const handleConnectYouTube = () => {
    connectYouTubeAccount();
  };
  
  // Function to handle YouTube account disconnection
  const handleDisconnectYouTube = async () => {
    try {
      setLoading(true);
      const success = await disconnectYouTubeAccount();
      
      if (success) {
        setIsConnected(false);
        setVideos([]);
        console.log("[DEBUG] YouTube déconnecté avec succès");
        toast.success("Compte YouTube déconnecté avec succès");
      }
    } catch (error) {
      console.error("[DEBUG] Erreur lors de la déconnexion YouTube:", error);
      toast.error("Erreur lors de la déconnexion YouTube");
    } finally {
      setLoading(false);
    }
  };
  
  // Function to load more videos
  const handleLoadMore = () => {
    if (pageToken) {
      loadVideos(pageToken);
    }
  };
  
  // Sample video data structure for UI development/testing when API is not available
  // Remarque: Ces donnu00e9es mock ne sont plus utilisu00e9es mais conservu00e9es pour ru00e9fu00e9rence
  /* const mockVideos = [
    {
      id: 1,
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
      title: 'How to Grow Your Business with YouTube',
      publishedDate: '2025-03-01',
      views: 5423,
      clickRate: 3.2,
      leads: 78,
      conversionRate: 1.4,
      earnings: 1240
    },
    {
      id: 2,
      thumbnail: 'https://i.ytimg.com/vi/xvFZjo5PgG0/mqdefault.jpg',
      title: 'Top 5 Marketing Strategies for 2025',
      publishedDate: '2025-02-15',
      views: 12893,
      clickRate: 4.1,
      leads: 184,
      conversionRate: 1.8,
      earnings: 3420
    },
    {
      id: 3,
      thumbnail: 'https://i.ytimg.com/vi/6_b7RDuLwcI/mqdefault.jpg',
      title: 'Content Creation Masterclass',
      publishedDate: '2025-01-22',
      views: 7354,
      clickRate: 2.8,
      leads: 95,
      conversionRate: 1.3,
      earnings: 1680
    },
    {
      id: 4,
      thumbnail: 'https://i.ytimg.com/vi/jNQXAC9IVRw/mqdefault.jpg',
      title: 'SEO Secrets Revealed',
      publishedDate: '2025-01-05',
      views: 9276,
      clickRate: 3.5,
      leads: 132,
      conversionRate: 1.6,
      earnings: 2350
    },
  ]; */

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Video Performance</h1>
        <p className="text-text-secondary">Analyze the performance of your YouTube videos and their conversion metrics</p>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div className="flex space-x-2">
          <button 
            className={`tab ${dateRange === 'last7' ? 'active' : ''}`} 
            onClick={() => setDateRange('last7')}
          >
            Last 7 days
          </button>
          <button 
            className={`tab ${dateRange === 'last30' ? 'active' : ''}`} 
            onClick={() => setDateRange('last30')}
          >
            Last 30 days
          </button>
          <button 
            className={`tab ${dateRange === 'last90' ? 'active' : ''}`} 
            onClick={() => setDateRange('last90')}
          >
            Last 90 days
          </button>
          <button 
            className={`tab ${dateRange === 'year' ? 'active' : ''}`} 
            onClick={() => setDateRange('year')}
          >
            This year
          </button>
          <button 
            className={`tab ${dateRange === 'custom' ? 'active' : ''}`} 
            onClick={() => setDateRange('custom')}
          >
            Custom
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <input 
              type="text" 
              className="input-field pl-10" 
              placeholder="Search videos..."
            />
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <button className="btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Video
          </button>
        </div>
      </div>

      {/* Show connection prompt if YouTube is not connected */}
      {!isConnected && (
        <div className="mb-8 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-medium mb-2">Connect Your YouTube Account</h2>
          <p className="text-gray-600 mb-4">Connect your YouTube account to see your video performance metrics.</p>
          <button 
            onClick={handleConnectYouTube}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Connect YouTube
          </button>
        </div>
      )}
      
      {/* Error message if any */}
      {error && (
        <div className="mb-8 bg-red-50 p-4 rounded-md border border-red-200 text-red-700">
          {error}
        </div>
      )}
      
      {/* Loading indicator */}
      {loading && videos.length === 0 && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {/* Disconnect YouTube button (only shown when connected) */}
      {isConnected && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={handleDisconnectYouTube}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                En cours...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
                Déconnecter YouTube
              </>
            )}
          </button>
        </div>
      )}

      {/* Performance summary cards */}
      {isConnected && videos.length > 0 && (
        <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="stats-card">
          <div className="stats-card-header">
            <h3 className="stats-card-title">Total Views</h3>
          </div>
          <div className="stats-card-value">34,946</div>
          <div className="stats-card-change positive">
            <span className="change-value">↑ 12.4%</span>
          </div>
        </div>

        <div className="stats-card">
          <div className="stats-card-header">
            <h3 className="stats-card-title">Avg. Click Rate</h3>
          </div>
          <div className="stats-card-value">3.5%</div>
          <div className="stats-card-change positive">
            <span className="change-value">↑ 0.8%</span>
          </div>
        </div>

        <div className="stats-card">
          <div className="stats-card-header">
            <h3 className="stats-card-title">Total Leads</h3>
          </div>
          <div className="stats-card-value">489</div>
          <div className="stats-card-change positive">
            <span className="change-value">↑ 23.5%</span>
          </div>
        </div>

        <div className="stats-card">
          <div className="stats-card-header">
            <h3 className="stats-card-title">Revenue</h3>
          </div>
          <div className="stats-card-value">$8,690</div>
          <div className="stats-card-change positive">
            <span className="change-value">↑ 16.2%</span>
          </div>
        </div>
        </div>
      )}

      {/* Videos table or grid view */}
      {isConnected && videos.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">Video</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">Published</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">Views</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">Click Rate</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">Leads</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">Conv. Rate</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">Earnings</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-text-secondary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((video) => (
              <tr key={video.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-16 h-9 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                      <img 
                        src={video.snippet?.thumbnails?.medium?.url || ''}
                        alt={video.snippet?.title || 'YouTube Video'} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <span className="font-medium">{video.snippet?.title || 'Untitled Video'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-text-secondary">
                  {video.snippet?.publishedAt ? new Date(video.snippet.publishedAt).toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-6 py-4 text-text-secondary">
                  {video.statistics?.viewCount ? parseInt(video.statistics.viewCount).toLocaleString() : 'N/A'}
                </td>
                <td className="px-6 py-4 text-text-secondary">
                  {video.funnelMetrics?.clickRate ? `${video.funnelMetrics.clickRate}%` : 'N/A'}
                </td>
                <td className="px-6 py-4 text-text-secondary">
                  {video.funnelMetrics?.leads || 'N/A'}
                </td>
                <td className="px-6 py-4 text-text-secondary">
                  {video.funnelMetrics?.conversionRate ? `${video.funnelMetrics.conversionRate}%` : 'N/A'}
                </td>
                <td className="px-6 py-4 text-text-secondary">
                  ${video.funnelMetrics?.earnings || 'N/A'}
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-gray-400 hover:text-primary transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Pagination */}
        {pageToken && (
          <div className="p-4 border-t border-gray-100 flex justify-center">
            <button 
              onClick={handleLoadMore}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Load More Videos'}
            </button>
          </div>
        )}
      </div>
      ) : isConnected && videos.length === 0 && !loading ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
          <h3 className="text-lg font-medium mb-2">No Videos Found</h3>
          <p className="text-gray-500 mb-4">We couldn't find any videos for your YouTube account.</p>
          <button 
            onClick={() => loadVideos()}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Refresh
          </button>
        </div>
      ) : null}
    </div>
  );
}
