"use client";

import { useState, useEffect, useRef } from 'react';
import { fetchVideos, checkYouTubeConnection, connectYouTubeAccount, disconnectYouTubeAccount } from '../../../services/youtube.service';
import { YouTubeVideo } from '../../../types/youtube.types';
import toast from 'react-hot-toast';
import useYouTubeAnalytics, { YouTubeAggregatedMetrics } from '../../../hooks/useYouTubeAnalytics';
import { formatNumber } from '../../../utils/formatters';
import StatCard from '../../../components/youtube/StatCard';
import VideoTable from '../../../components/youtube/VideoTable';
import DataDebugger from '../../../components/debug/DataDebugger';

export default function VideoPerformancePage() {
  const [dateRange, setDateRange] = useState('last30');
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pageToken, setPageToken] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  
  // Référence pour éviter les initialisations multiples en mode développement
  const initializationRef = useRef(false);
  
  // Fonction pour extraire le token JWT du hash URL après redirection OAuth
  const getTokenFromHash = () => {
    if (typeof window === 'undefined') return null;
    
    const hash = window.location.hash;
    if (!hash) return null;
    
    // Format attendu: #token=xxx
    const match = hash.match(/token=([^&]*)/);
    return match ? match[1] : null;
  };

  useEffect(() => {
    // Vérifier si l'initialisation a déjà été faite
    if (initializationRef.current) {
      console.log("[DEBUG] Initialisation déjà effectuée, ignorée");
      return;
    }
    
    const initializeData = async () => {
      try {
        console.log("[DEBUG] Démarrage initialisation dans useEffect");
        initializationRef.current = true; // Marquer comme initialisé
        
        // 1. Vérifier si un token JWT est présent dans le hash (callback OAuth)
        const hashToken = getTokenFromHash();
        if (hashToken) {
          console.log("[DEBUG] Token JWT détecté dans le hash URL");
          // Mettre à jour le token dans localStorage
          localStorage.setItem('accessToken', hashToken);
          toast.success("Session mise à jour avec succès");
          // Nettoyer l'URL (enlever le hash)
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        
        // 2. Vérifier si youtube_connected=true est présent dans l'URL
        const params = new URLSearchParams(window.location.search);
        const youtubeConnected = params.get('youtube_connected');
        if (youtubeConnected === 'true') {
          console.log("[DEBUG] Paramètre youtube_connected=true détecté");
          toast.success("Compte YouTube connecté avec succès !");
          // Nettoyer l'URL (enlever le paramètre)
          params.delete('youtube_connected');
          const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
          window.history.replaceState(null, '', newUrl);
        }
        
        // 3. Vérifier l'état de connexion YouTube
        console.log("[DEBUG] Vérification de la connexion YouTube");
        const connected = await checkYouTubeConnection();
        console.log("[DEBUG] État de connexion YouTube:", { connected });
        
        setIsConnected(connected);
        
        // 4. Charger les vidéos si connecté
        if (connected) {
          console.log("[DEBUG] YouTube connecté, chargement des vidéos");
          await loadVideos();
        } else {
          console.log("[DEBUG] YouTube non connecté, affichage du bouton de connexion");
          setLoading(false);
        }
      } catch (err) {
        console.error('[DEBUG] Erreur initialisation:', err);
        setError('Erreur de connexion à YouTube. Veuillez réessayer plus tard.');
        setLoading(false);
      }
    };
    
    initializeData();
  }, []);
  
  // Function to load videos from the API
  const loadVideos = async (token?: string) => {
    try {
      setLoading(true);
      console.log("[YOUTUBE] Chargement des vidéos avec pageToken:", token || 'INITIAL');
      
      // Appel à l'API pour récupérer les vidéos
      const response = await fetchVideos(token, 10, 'date');
      
      // Log 1 (Réponse Brute Reçue)
      console.log('[DEBUG-FETCH] Réponse API BRUTE:', response);
      
      // Extraction des données (vérifier structure par le log 1)
      const videosData = response?.videos || response?.items;
      
      // Log 2 (Données Extraites) 
      console.log('[DEBUG-FETCH] Tableau "videosData" extrait:', videosData);
      
      // Log 3 (Nombre d'éléments)
      console.log('[DEBUG-FETCH] Nombre d\'éléments extraits:', Array.isArray(videosData) ? videosData.length : 'N/A');
      
      // Préparation des données pour setState
      const dataToSet = Array.isArray(videosData) ? videosData : [];
      
      // Log 4 (Avant setVideos)
      console.log('[DEBUG-FETCH] Données passées à setVideos:', dataToSet);
      
      if (token) {
        // Append videos for pagination
        setVideos(prev => {
          const newState = [...prev, ...dataToSet];
          console.log("[FRONTEND-STATE] Nouveau state (pagination):", newState.length, "vidéos");
          return newState;
        });
      } else {
        // Replace videos for initial load or refresh
        setVideos(dataToSet);
        console.log("[FRONTEND-STATE] Nouveau state (remplacement complet):", dataToSet.length, "vidéos");
      }
      
      setPageToken(response.nextPageToken || '');
      setLoading(false);
    } catch (err) {
      console.error('[ERREUR] Impossible de charger les vidéos:', err);
      console.error('[FRONTEND-FETCH] Détails de l\'erreur:', err.message, err.stack);
      setError('Impossible de charger les vidéos. Veuillez réessayer plus tard.');
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
  
  // Calcul des métriques agrégées à partir des vidéos disponibles
  const aggregatedMetrics = useYouTubeAnalytics(videos);
  
  // LOGS DE DÉBOGAGE: État au moment du rendu
  console.log("[FRONTEND-RENDER] État videos au rendu:", {
    count: videos.length,
    isConnected: isConnected,
    isLoading: loading,
    hasError: !!error,
    firstVideoId: videos[0]?.id || 'none',
    pageToken: pageToken || 'none'
  });
  
  return (
    <div className="py-4 px-1">
      <h1 className="text-2xl font-semibold mb-4">YouTube Dashboard</h1>
      
      {/* YouTube Connection */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-medium">YouTube Account</h2>
            <p className="text-gray-600 mt-1">
              {isConnected ? 
                "Your YouTube account is connected. You can view your performance statistics." : 
                "Connect your YouTube account to view your video statistics."}
            </p>
          </div>
          <div>
            {isConnected ? (
              <button
                onClick={handleDisconnectYouTube}
                className="bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleConnectYouTube}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Connect YouTube
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content - conditionally displayed if connected */}
      {isConnected ? (
        <>
          {/* Header and filters */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-gray-700">Period: <span className="font-medium">Last 30 days</span></p>
            </div>
            <div>
              <button
                onClick={() => loadVideos()}
                className="text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Debug component for structure inspection - only visible in development */}
          {process.env.NODE_ENV === 'development' && videos.length > 0 && !loading && !error && (
            <DataDebugger
              data={videos[0]}
              title="First video - Complete structure"
              expanded={false}
            />
          )}
          
          {/* KPIs - Display aggregated metrics */}
          {videos.length > 0 && !loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              {/* Total Views */}
              <StatCard
                title="Total Views"
                value={formatNumber(aggregatedMetrics.totalViews)}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                }
                colorClass="bg-blue-50"
                tooltip="Total number of views across all videos"
              />
              
              {/* Average Retention % */}
              <StatCard
                title="Avg. Retention %"
                value={`${aggregatedMetrics.avgViewPercentage.toFixed(1)}%`}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                }
                colorClass="bg-green-50"
                tooltip="Average percentage of each video watched by viewers"
              />
              
              {/* Card CTR */}
              <StatCard
                title="Cards CTR"
                value={`${aggregatedMetrics.avgCardCTR.toFixed(2)}%`}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                }
                colorClass="bg-indigo-50"
                tooltip="Average click-through rate for YouTube cards and endscreens"
              />
              
              {/* Subscribers Gained */}
              <StatCard
                title="Subscribers"
                value={`+${formatNumber(aggregatedMetrics.totalSubscribersGained)}`}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
                colorClass="bg-red-50"
                tooltip="Total subscribers gained from these videos"
              />
              
              {/* Shares */}
              <StatCard
                title="Shares"
                value={formatNumber(aggregatedMetrics.totalShares)}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                }
                colorClass="bg-yellow-50"
                tooltip="Total number of times videos were shared"
              />
              
              <StatCard
                title="Avg Engagement"
                value={`${(aggregatedMetrics.avgEngagementRate * 100).toFixed(2)}%`}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                  </svg>
                }
                colorClass="bg-purple-50"
                tooltip="Average engagement rate ((likes + comments) / views)"
              />
              
              {/* Retention Time */}
              <StatCard
                title="Avg Retention Time"
                value={aggregatedMetrics.formattedAvgDuration || '0:00'}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                colorClass="bg-green-50"
                tooltip="Average duration viewers watch your videos (minutes:seconds)"
              />
              
              <StatCard
                title="New Subscribers"
                value={formatNumber(aggregatedMetrics.totalSubscribersGained)}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                }
                colorClass="bg-red-50"
                tooltip="Total new subscribers gained from these videos"
              />
            </div>
          )}
          
          {/* Debugger pour les métriques agrégées */}
          {videos.length > 0 && !loading && !error && (
            <DataDebugger
              data={aggregatedMetrics}
              title="Calculated Aggregated Metrics"
              expanded={false}
            />
          )}

          {/* Liste des vidéos */}
          {loading && videos.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center min-h-[300px] flex items-center justify-center">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
                <p>Loading videos...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center min-h-[300px] flex flex-col justify-center items-center">
              <div className="bg-red-100 text-red-600 p-4 rounded-lg mb-4 inline-block">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-red-600 font-medium mb-2">Error</p>
              <p className="text-gray-600">{error}</p>
            </div>
          ) : videos.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center min-h-[300px] flex flex-col justify-center items-center">
              <div className="bg-yellow-100 text-yellow-600 p-4 rounded-lg mb-4 inline-block">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-lg font-medium mb-2">No videos found</p>
              <p className="text-gray-600">You haven't published any videos on your YouTube channel yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tableau de vidéos amélioré avec tous les nouveaux indicateurs */}
              <VideoTable 
                videos={videos} 
                loading={loading}
                onViewDetails={(videoId) => console.log('View details for:', videoId)}
              />
              
              {/* Pagination */}
              {pageToken && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={handleLoadMore}
                    className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
                    disabled={loading}
                  >
                    {loading ? 'Loading...' : 'Load more videos'}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center min-h-[300px] flex flex-col justify-center items-center">
          <div className="bg-yellow-100 text-yellow-600 p-4 rounded-lg mb-4 inline-block">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-lg font-medium mb-2">Connect your YouTube account</p>
          <p className="text-gray-600 mb-6 max-w-md">
            To view your YouTube statistics, you must first authorize FunnelDoctor to access your data. The process is secure and you can revoke access at any time.
          </p>
          <button
            onClick={handleConnectYouTube}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Connect YouTube
          </button>
        </div>
      )}
    </div>
  );
}
