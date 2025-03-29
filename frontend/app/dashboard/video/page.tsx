"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  fetchVideos, 
  checkYouTubeConnection, 
  connectYouTubeAccount, 
  disconnectYouTubeAccount,
  fetchAggregatedKPIs 
} from '../../../services/youtube.service';
import { YouTubeVideo, AggregatedVideoKPIsDTO } from '../../../types/youtube.types';
import toast from 'react-hot-toast';
import { formatNumber, formatDuration } from '../../../utils/formatters';
import StatCard from '../../../components/youtube/StatCard';
import VideoTable from '../../../components/youtube/VideoTable';

export default function VideoPerformancePage() {
  const [selectedPeriod, setSelectedPeriod] = useState('last28'); 
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState('');
  const [pageToken, setPageToken] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  // MODIFICATION: Changer le type pour accepter null et initialiser à null
  const [aggregatedKPIs, setAggregatedKPIs] = useState<AggregatedVideoKPIsDTO | null>(null);
  const [kpiLoading, setKpiLoading] = useState(false); 
  const [kpiError, setKpiError] = useState<string | null>(null); 

  const initializationRef = useRef(false);

  const getTokenFromHash = () => { /* ... */ return null; };
  const handleConnectYouTube = () => { connectYouTubeAccount(); };
  const handleDisconnectYouTube = async () => { /* ... */ };

  const loadVideos = async (periodToLoad = selectedPeriod, token?: string) => { 
    try {
      if (!token) {
         setVideos([]); 
      }
      setLoading(true);
      setError(''); 
      console.log(`[loadVideos] Chargement - Période: ${periodToLoad}, PageToken: ${token || 'INITIAL'}`);

      const response = await fetchVideos(
         token, 
         10, 
         'date', 
         periodToLoad as 'last7' | 'last28' | 'last30' | 'last90'
      );

      console.log('[loadVideos] Réponse API BRUTE:', response);
      const videosData = response?.videos || []; 
      console.log(`[loadVideos] ${videosData.length} vidéos extraites.`);

       console.log(`[PAGE.TSX AFTER SETVIDEOS][Period: ${periodToLoad}] State 'videos' should be updated. First video retention: ${videosData[0]?.analytics?.averageViewPercentage}`);

      if (token) {
        setVideos(prev => [...prev, ...videosData]);
      } else {
        setVideos(videosData);
      }
      setPageToken(response.nextPageToken || '');

    } catch (err: any) {
      console.error('[ERREUR] Impossible de charger les vidéos:', err);
      setError(err.response?.data?.message || err.message || 'Impossible de charger les vidéos.');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour charger les KPIs agrégés
  const loadAggregatedKPIs = useCallback(async (period: 'last7' | 'last28' | 'last30' | 'last90' = 'last28') => {
    setKpiLoading(true);
    setKpiError(null);
    try {
      // Appel au service qui retourne maintenant directement les KPIs ou null
      const kpiData = await fetchAggregatedKPIs(period);

      // Log de la valeur directe retournée par fetchAggregatedKPIs
      console.log('[DIAG-KPI] Données KPI retournées par fetchAggregatedKPIs:', JSON.stringify(kpiData, null, 2));

      if (kpiData) {
        // Utiliser directement kpiData pour mettre à jour l'état
        setAggregatedKPIs(kpiData);
        console.log('[DIAG-KPI] KPIs mis à jour dans l\'état avec:', kpiData);
      } else {
        console.error('[DIAG-KPI] Aucune donnée KPI reçue ou structure invalide.');
        setKpiError('Impossible de charger les KPIs agrégés.');
        // MODIFICATION: Réinitialiser avec null au lieu de {}
        setAggregatedKPIs(null);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des KPIs agrégés:', error);
      setKpiError(error.message || 'Une erreur est survenue.');
      // MODIFICATION: Réinitialiser avec null au lieu de {}
      setAggregatedKPIs(null);
    } finally {
      setKpiLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    const initialize = async () => {
        const hashToken = getTokenFromHash(); if (hashToken) { /*...*/ }
        const params = new URLSearchParams(window.location.search); if (params.get('youtube_connected') === 'true') { /*...*/ }

        console.log("[DEBUG] Vérification connexion...");
        setLoading(true); 
        try {
             const connected = await checkYouTubeConnection();
             setIsConnected(connected);
             if (connected) {
                 console.log("[DEBUG] Connecté. Chargement initial données (vidéos + KPIs) période par défaut:", selectedPeriod);
                 await Promise.all([
                   loadVideos(selectedPeriod),
                   loadAggregatedKPIs(selectedPeriod as 'last7' | 'last28' | 'last30' | 'last90')
                 ]);
             } else {
                 console.log("[DEBUG] Non connecté.");
                 setLoading(false);
             }
        } catch (err) {
             console.error("[DEBUG] Erreur init:", err);
             setError('Erreur connexion YouTube.');
             setLoading(false);
        }
    };
    initialize();
  }, []); 

  useEffect(() => {
      if (!initializationRef.current || !isConnected) return; 

      console.log(`[Period Change Effect] Déclenchement pour période: ${selectedPeriod}`);
      loadVideos(selectedPeriod);
      loadAggregatedKPIs(selectedPeriod as 'last7' | 'last28' | 'last30' | 'last90');

   }, [selectedPeriod, isConnected]); 

  const handleLoadMore = () => {
    if (pageToken && !loading) {
      loadVideos(selectedPeriod, pageToken);
    }
  };

  console.log(`[PAGE.TSX BEFORE RENDER][Period: ${selectedPeriod}] State 'videos' going to render. First video retention: ${videos[0]?.analytics?.averageViewPercentage}`);
  console.log(`[PAGE.TSX BEFORE RENDER][Period: ${selectedPeriod}] Backend Aggregated KPIs going to render:`, aggregatedKPIs);
  console.log('[DIAG-KPI] Rendu - Valeur de aggregatedKPIs AVANT rendu JSX:', aggregatedKPIs);
  console.log('[DIAG-KPI] Rendu - kpiLoading:', kpiLoading, 'kpiError:', kpiError);

  // Gestionnaire pour le changement de période
  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value);
    // MODIFICATION: Caster la valeur en type attendu
    loadAggregatedKPIs(value as 'last7' | 'last28' | 'last30' | 'last90');
  };

  return (
    <div className="py-4 px-1">
      <h1 className="text-2xl font-semibold mb-4">YouTube Dashboard</h1>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6"> {/* ... */} </div>

      {isConnected ? (
        <>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
               <div className="flex items-center space-x-2">
                <label htmlFor="periodSelect" className="text-gray-700">Period:</label>
                <select
                  id="periodSelect"
                  value={selectedPeriod}
                  onChange={(e) => handlePeriodChange(e.target.value)}
                  className="form-select rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  disabled={loading} 
                >
                  <option value="last7">Last 7 days</option>
                  <option value="last28">Last 28 days</option>
                  <option value="last30">Last 30 days</option>
                  <option value="last90">Last 90 days</option>
                </select>
              </div>
            </div>
             <div>
              <button onClick={() => loadVideos(selectedPeriod)} disabled={loading} className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 flex items-center space-x-1">
                 <span>Refresh</span>
              </button>
            </div>
          </div>

          {kpiLoading || (loading && !aggregatedKPIs) ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 animate-pulse">
                 {Array.from({ length: 8 }).map((_, i) => (
                     <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
                 ))}
             </div>
          ) : kpiError ? (
            <div className="mb-6 text-center text-red-600 bg-red-100 p-4 rounded-md">
              Error loading KPIs: {kpiError}
            </div>
          ) : aggregatedKPIs ? ( 
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <StatCard
                title="Total Views"
                value={formatNumber(aggregatedKPIs.totalViews)} 
                tooltip={`Période: ${aggregatedKPIs.period?.startDate} - ${aggregatedKPIs.period?.endDate} (${aggregatedKPIs.period?.days}j) | Vidéos analysées: ${aggregatedKPIs.totalVideosAnalysed}`}
              />
              <StatCard
                title="Avg Retention"
                value={`${aggregatedKPIs.averageRetentionPercentage?.toFixed(2) ?? '0.00'}%`}
                tooltip="Average percentage of each video watched by viewers."
              />
              <StatCard
                title="Avg Card CTR"
                value={`${aggregatedKPIs.averageCardCTR?.toFixed(2) ?? '0.00'}%`}
                tooltip={`Clicks: ${formatNumber(aggregatedKPIs.totalCardClicks)} / Impressions: ${formatNumber(aggregatedKPIs.totalCardImpressions)}`}
              />
              <StatCard
                title="Avg View Duration"
                value={formatDuration(aggregatedKPIs.averageViewDurationSeconds)}
                tooltip="Average length of time viewers watched the videos."
              />
              <StatCard
                title="Subscribers Gained"
                value={`+${formatNumber(aggregatedKPIs.totalSubscribersGained)}`}
                icon={<></>}
                tooltip="Subscribers gained during the period"
              />
              <StatCard
                title="Shares"
                value={formatNumber(aggregatedKPIs.totalShares)}
                icon={<></>}
                tooltip="Total shares during the period"
              />
              <StatCard
                title="Avg Engagement Rate"
                value={`${(((aggregatedKPIs.totalLikes || 0) + (aggregatedKPIs.totalComments || 0) + (aggregatedKPIs.totalShares || 0)) / (aggregatedKPIs.totalViews || 1) * 100).toFixed(2) ?? '0.00'}%`}
                icon={<></>}
                tooltip="(Likes + Comments + Shares) / Views"
              />
              <StatCard
                title="Total Likes"
                value={formatNumber(aggregatedKPIs.totalLikes)}
                icon={<></>}
                tooltip="Total likes during the period"
              />

            </div>
          ) : null /* Ne pas afficher les KPIs si erreur ou pas de données */}

          {loading && videos.length === 0 ? (
              <div className="text-center py-10">Loading initial videos...</div>
            ) : error ? (
              <div className="text-center py-10 text-red-600">Error loading videos: {error}</div>
            ) : videos.length === 0 ? (
              <div className="text-center py-10 text-gray-500">No public videos found for this period.</div>
            ) : (
              <div className="space-y-6">
                <VideoTable videos={videos} selectedPeriod={selectedPeriod} onViewDetails={(videoId) => console.log('View details for:', videoId)}/>
                {pageToken && (
                  <div className="flex justify-center mt-6">
                    <button onClick={handleLoadMore} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                      {loading ? 'Loading...' : 'Load more videos'}
                    </button>
                  </div>
                )}
              </div>
            )}
        </>
      ) : (
         <div className="text-center py-20">
             <p className="mb-4">Connect your YouTube account...</p>
             <button onClick={handleConnectYouTube} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50">Connect YouTube</button>
         </div>
      )}
    </div>
  );
}