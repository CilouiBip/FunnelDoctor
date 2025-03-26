"use client";

import { useState, useEffect } from 'react';
import VideoCard from '../../../components/youtube/VideoCard';
import { fetchVideos } from '../../../services/youtube.service';
import { Spinner } from '../../../components/ui/Spinner';
import TokenFromHash from '../../../components/auth/TokenFromHash';

export default function YouTubeDashboard() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pageToken, setPageToken] = useState('');
  const [tokenRefreshed, setTokenRefreshed] = useState(false);

  // Callback pour traiter le token récupéré depuis l'URL
  const handleTokenFound = (token: string) => {
    console.log('[AUTH] Token récupéré et traité par la page YouTube');
    setTokenRefreshed(true);
  };

  useEffect(() => {
    const loadVideos = async () => {
      try {
        setLoading(true);
        const response = await fetchVideos();
        setVideos(response.items || []);
        setPageToken(response.nextPageToken || '');
      } catch (err) {
        console.error('Failed to load videos:', err);
        setError('Failed to load videos. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    // Ne charger les vidéos que si nous avons vérifié le token ou si nous n'avons pas été redirigés depuis OAuth
    // Le paramètre de dépendance tokenRefreshed garantit que cette fonction se déclenchera à nouveau après la récupération du token
    const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const isRedirectedFromOAuth = urlParams.get('status') === 'success';

    if (!isRedirectedFromOAuth || tokenRefreshed) {
      loadVideos();
    }
  }, [tokenRefreshed]);

  const loadMoreVideos = async () => {
    if (!pageToken) return;
    
    try {
      setLoading(true);
      const response = await fetchVideos(pageToken);
      setVideos(prev => [...prev, ...(response.items || [])]);
      setPageToken(response.nextPageToken || '');
    } catch (err) {
      console.error('Failed to load more videos:', err);
      setError('Failed to load more videos. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      {/* Composant invisible qui se charge d'extraire le token du hash */}
      <TokenFromHash onTokenFound={handleTokenFound} />
      
      <h1 className="text-2xl font-bold mb-6">YouTube Videos</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading && videos.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {videos.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">No videos found. Connect your YouTube account to see your videos here.</p>
              <button 
                onClick={() => {
                  import('../../../services/youtube.service').then(module => {
                    module.connectYouTubeAccount();
                  });
                }}
                className="mt-4 inline-block bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                Connect YouTube Account
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          )}

          {pageToken && (
            <div className="mt-8 text-center">
              <button
                onClick={loadMoreVideos}
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
