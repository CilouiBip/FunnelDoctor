// Import de l'instance Axios authentifiée pour toutes les requêtes authentifiées
import axios from 'axios';
import authenticatedAxios from '../lib/axios/authenticatedAxios';
import { extractData } from './api.adapter';
import { YouTubeVideo, YouTubeResponse, VideoListResponse, GetVideosParams } from '../types/youtube.types';
import toast from 'react-hot-toast';
import { getAccessToken } from '../lib/services/auth.service';

// Base API URLs - will be rewritten by Next.js config to point to your backend
const YOUTUBE_API_URL = '/api/youtube'; // Endpoint standard pour les données YouTube
const YOUTUBE_AUTH_API_URL = '/api/auth/youtube'; // URL pour les routes d'authentification YouTube

/**
 * Test the API connection with the diagnostic endpoint
 * @returns Promise with diagnostic information
 */
export const testYouTubeApiConnection = async () => {
  try {
    // Tester d'abord l'URL de diagnostic que nous venons d'ajouter
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    const diagnosticUrl = baseUrl ? `${baseUrl}${YOUTUBE_AUTH_API_URL}/diagnostic` : `${YOUTUBE_AUTH_API_URL}/diagnostic`;
    
    console.log('[DIAGNOSTIC] Testing API connection with URL:', diagnosticUrl);
    console.log('[DIAGNOSTIC] Current origin:', window.location.origin);
    
    // Utiliser axios standard (sans auth) pour le diagnostic car cette route ne nécessite pas d'authentification
    const response = await axios.get(diagnosticUrl, {
      timeout: 10000,
      headers: {
        'X-Request-Debug': 'true',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('[DIAGNOSTIC] API connection successful:', response.data);
    return {
      success: true,
      data: response.data,
      urlTested: diagnosticUrl
    };
  } catch (error) {
    console.error('[DIAGNOSTIC] API connection failed:', error);
    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL,
        headers: error.config?.headers
      }
    };
  }
}

/**
 * Fetch videos from the YouTube API
 * @param pageToken Optional token for pagination
 * @param limit Optional limit of videos to fetch
 * @param order Optional order parameter
 * @param period Optional period parameter (last7, last28, last30, last90)
 * @returns Promise with YouTube videos response
 */
export const fetchVideos = async (
  pageToken?: string,
  limit: number = 10,
  order: 'date' | 'rating' | 'viewCount' | 'title' = 'date',
  period: 'last7' | 'last28' | 'last30' | 'last90' = 'last28'
): Promise<YouTubeResponse> => {
  try {
    const params: Record<string, string | number> = { limit };
    if (pageToken) params.pageToken = pageToken;
    if (order) params.order = order;
    if (period) params.period = period; // Ajout du paramètre de période

    // This will be proxied through Next.js to your ngrok backend
    // Passage à l'endpoint standard pour stocker les vidéos en DB
    const finalUrl = `${YOUTUBE_API_URL}/videos`;
    console.log("[FRONTEND-FETCH] URL finale appelée (fetchVideos):", finalUrl, params);
    console.log("[INFO] Utilisation de l'endpoint standard pour stocker les vidéos en DB");
    
    // Utilisation de l'instance Axios authentifiée qui inclut automatiquement le token JWT
    console.log("[AUTH] Appel de l'API avec authentification JWT");
    const response = await authenticatedAxios.get(finalUrl, { params });
    
    // AJOUT DE LOGS DE DÉBOGAGE
    console.log('[FRONTEND-FETCH] Réponse API BRUTE pour /videos:', response.data);
    console.log('[FRONTEND-FETCH] Headers:', response.headers);
    console.log('[FRONTEND-FETCH] Status:', response.status);
    
    // Vérifier la structure exacte de la réponse
    if (response.data) {
      console.log('[FRONTEND-FETCH] Structure de la réponse:', {
        hasItems: response.data && typeof response.data === 'object' && 'items' in response.data ? !!response.data.items : false,
        itemsLength: response.data && typeof response.data === 'object' && 'items' in response.data && Array.isArray(response.data.items) ? response.data.items.length : undefined,
        hasData: response.data && typeof response.data === 'object' && 'data' in response.data ? !!response.data.data : false,
        hasVideos: response.data && typeof response.data === 'object' && 'videos' in response.data ? !!response.data.videos : false,
        keys: response.data && typeof response.data === 'object' ? Object.keys(response.data) : []
      });
    }
    
    // Utilisation de l'adaptateur pour extraire les données de la réponse standardisée
    const extracted = extractData<YouTubeResponse>(response);
    console.log('[FRONTEND-FETCH] Données extraites après adaptateur:', extracted);
    return extracted;
  } catch (error) {
    console.error('[FRONTEND-FETCH] Error fetching YouTube videos:', error);
    console.error('[FRONTEND-FETCH] Error details:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL
      }
    });
    throw error;
  }
};

/**
 * Get detailed analytics for a specific video
 * @param videoId YouTube video ID
 * @returns Promise with detailed video analytics
 */
export const getVideoAnalytics = async (videoId: string) => {
  try {
    const finalUrl = `${YOUTUBE_API_URL}/youtube/analytics/video/${videoId}`;
    console.log("URL appelée (getVideoAnalytics):", finalUrl);
    const response = await authenticatedAxios.get(finalUrl);
    return response.data;
  } catch (error) {
    console.error(`Error fetching analytics for video ${videoId}:`, error);
    throw error;
  }
};

/**
 * Interface pour la réponse de l'endpoint /api/youtube/analytics/summary
 */
interface AggregatedKPIsResponse {
  success: boolean;
  message?: string;
  data: {
    period: {
      startDate: string;
      endDate: string;
      days: number;
    };
    totalVideos: number;
    totalViews: number;
    avgViewPercentage: number;
    totalSubscribersGained: number;
    avgEngagementRate: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalWatchTimeMinutes: number;
    avgViewDuration: number;
    formattedAvgDuration: string;
  };
}

/**
 * Récupère les KPIs agrégés calculés sur toutes les vidéos pour une période donnée
 * @param period Période ('last7', 'last28', 'last30', 'last90')
 * @returns Promise avec les KPIs agrégés
 */
export const fetchAggregatedKPIs = async (period: 'last7' | 'last28' | 'last30' | 'last90' = 'last28') => {
  try {
    const finalUrl = `${YOUTUBE_API_URL}/analytics/summary`;
    console.log(`[KPIS] Récupération des KPIs agrégés pour la période ${period}`);
    console.log(`[KPIS] URL utilisée: ${finalUrl}`); // Log pour déboguer l'URL
    
    // Assurons-nous de passer la période comme paramètre de requête
    const response = await authenticatedAxios.get<AggregatedKPIsResponse>(finalUrl, { 
      params: { period },
      timeout: 60000 // *** AUGMENTATION TIMEOUT à 60 secondes ***
    });
    
    // LOGS de débogage des KPIs récupérés
    console.log(`[KPIS] Réponse du service /summary avec statut ${response.status}:`, response.data);
    
    if (!response.data.success) {
      console.error(`[KPIS] La réponse indique un échec:`, response.data.message);
      throw new Error(response.data.message || 'Erreur lors de la récupération des KPIs agrégés');
    }
    
    if (!response.data.data) {
      console.error(`[KPIS] La propriété 'data' est manquante dans la réponse`);
      throw new Error('Format de réponse invalide: données manquantes');
    }
    
    console.log(`[KPIS] Données reçues pour ${response.data.data.totalVideos} vidéos sur ${period}`);
    return response.data.data.data;
  } catch (error) {
    console.error(`[KPIS] Erreur lors de la récupération des KPIs agrégés:`, error);
    throw error;
  }
};



/**
 * Initiates the YouTube OAuth flow
 * @returns Redirect URL for the OAuth flow
 */
export const connectYouTubeAccount = async () => {
  try {
    // Vérification et validation de la variable d'environnement NEXT_PUBLIC_BACKEND_URL
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    
    if (!baseUrl) {
      console.error('[ERREUR] NEXT_PUBLIC_BACKEND_URL non défini. Assurez-vous que ce paramètre est correctement configuré dans le fichier .env du frontend');
      console.error('[AIDE] Le format correct est: NEXT_PUBLIC_BACKEND_URL=https://funnel.doctor.ngrok.app');
      throw new Error('Configuration du backend manquante. Vérifiez le fichier .env du frontend.');
    }
    
    console.log("[INFO] Backend URL correctement configurée:", baseUrl);
    
    // Construire l'URL avec le backend URL configuré
    // Utiliser l'endpoint authorize standard avec authentification JWT
    const finalUrl = `${baseUrl}${YOUTUBE_AUTH_API_URL}/authorize`;
    
    console.log("[DEBUG] URL de connexion YouTube construite:", finalUrl);
    console.log("[DEBUG] Origine de la requête:", window.location.origin);
    
    // Logs détaillés pour le diagnostic
    console.log("[DIAGNOSTIC] Détails de la requête:", {
      baseUrl,
      apiPath: YOUTUBE_AUTH_API_URL,
      finalUrl,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'SSR'
    });
    
    // Vérification du JWT avant l'appel
    const token = getAccessToken();
    console.log("[JWT] Token disponible avant connexion YouTube:", token ? `${token.substring(0, 20)}...${token.substring(token.length - 10)}` : 'AUCUN TOKEN');
    console.log("[JWT] Token valide:", !!token);
    
    // Vérification du localStorage
    if (typeof window !== 'undefined') {
      const localStorageToken = localStorage.getItem('accessToken');
      console.log("[JWT] Token dans localStorage:", localStorageToken ? `${localStorageToken.substring(0, 20)}...${localStorageToken.substring(localStorageToken.length - 10)}` : 'AUCUN TOKEN');
    }
    
    // Utiliser authenticatedAxios pour inclure automatiquement le token JWT
    const response = await authenticatedAxios.get(finalUrl);
    
    // Utilisation de l'adaptateur pour extraire les données de la réponse standardisée
    const { authUrl } = extractData<{ authUrl: string }>(response);
    
    if (authUrl) {
      console.log("[AUTH] Redirection vers l'URL d'authentification Google:", authUrl);
      // Redirection vers l'URL d'authentification Google
      window.location.href = authUrl;
    } else {
      console.error("[ERREUR] Aucune URL d'authentification trouvée dans la réponse");
      throw new Error('No authorization URL found in the response');
    }
  } catch (error) {
    console.error('[ERREUR] Erreur lors de l\'initialisation de la connexion YouTube:', error);
    
    // Amélioration du diagnostic d'erreur
    const errorDetails = {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      networkDiagnostic: error.networkDiagnostic,
      timestamp: new Date().toISOString()
    };
    console.error('[DIAGNOSTIC] Détails de l\'erreur:', errorDetails);
    
    // Notification utilisateur
    toast.error("Impossible de se connecter à YouTube. Vérifiez votre connexion et réessayez.");
    throw error;
  }
};

/**
 * Check if the user has connected their YouTube account
 * @returns Promise with connection status
 */
export const checkYouTubeConnection = async () => {
  try {
    // Vérification et validation de la variable d'environnement NEXT_PUBLIC_BACKEND_URL
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    
    if (!baseUrl) {
      console.error('[ERREUR] NEXT_PUBLIC_BACKEND_URL non défini. Assurez-vous que ce paramètre est correctement configuré dans le fichier .env du frontend');
      return false; // Retourne false en cas d'erreur de configuration
    }
    
    // Utiliser l'endpoint standard qui nécessite une authentification JWT
    const finalUrl = `${baseUrl}${YOUTUBE_AUTH_API_URL}/status`;
    
    console.log("[INFO] Vérification connexion YouTube - Début");
    console.log("[INFO] URL de vérification standard:", finalUrl);
    
    const startTime = Date.now();
    // Utiliser authenticatedAxios pour inclure automatiquement le token JWT
    const response = await authenticatedAxios.get(finalUrl);
    const elapsed = Date.now() - startTime;
    
    // Utilisation de l'adaptateur pour extraire les données de la réponse standardisée
    const { integrated } = extractData<{ integrated: boolean }>(response);
    
    // Ajout de log détaillé sur la réponse
    console.log("[DEBUG] Résultat vérification YouTube:", { 
      integrated,
      timestamp: new Date().toISOString(),
      responseData: JSON.stringify(response.data).substring(0, 100) + '...',
      elapsed: elapsed + 'ms'
    });
    
    return integrated;
  } catch (error) {
    console.error('[ERREUR] Échec de la vérification du statut de connexion YouTube:', error);
    
    // Amélioration du diagnostic d'erreur
    const errorDetails = {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      networkDiagnostic: error.networkDiagnostic,
      timestamp: new Date().toISOString()
    };
    console.error('[DIAGNOSTIC] Détails de l\'erreur:', errorDetails);
    
    return false;
  }
};

/**
 * Disconnect YouTube account by revoking the integration
 * @returns Promise with disconnection result
 */
export const disconnectYouTubeAccount = async () => {
  try {
    // Vérification et validation de la variable d'environnement NEXT_PUBLIC_BACKEND_URL
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    
    if (!baseUrl) {
      console.error('[ERREUR] NEXT_PUBLIC_BACKEND_URL non défini dans le fichier .env du frontend');
      toast.error("Erreur de configuration: URL du backend manquante");
      return false;
    }
    
    // Utiliser l'endpoint standard qui nécessite une authentification JWT
    // L'ID utilisateur sera extrait du token JWT par le backend
    const finalUrl = `${baseUrl}${YOUTUBE_AUTH_API_URL}/revoke`;
    
    console.log("[INFO] Déconnexion YouTube - Début");
    console.log("[INFO] URL de déconnexion standard:", finalUrl);
    
    // Utiliser authenticatedAxios pour inclure automatiquement le token JWT
    const response = await authenticatedAxios.get(finalUrl);
    
    // Utilisation de l'adaptateur pour extraire les données
    const result = extractData<{ success: boolean, message?: string }>(response);
    
    console.log("[DEBUG] Résultat déconnexion YouTube:", result);
    
    if (result.success) {
      toast.success("Compte YouTube déconnecté avec succès");
      return true;
    } else {
      console.error("Échec de la déconnexion YouTube:", result.message || 'Raison inconnue');
      toast.error("Échec de la déconnexion: " + (result.message || 'Veuillez réessayer plus tard'));
      return false;
    }
  } catch (error) {
    console.error('Erreur lors de la déconnexion YouTube:', error);
    toast.error("Erreur lors de la déconnexion YouTube");
    return false;
  }
};

/**
 * Récupère la liste des vidéos YouTube de l'utilisateur
 * @param params Paramètres de requête (pagination, tri, etc.)
 * @returns Promise avec la liste des vidéos et les informations de pagination
 */
export const getYouTubeVideos = async (params: GetVideosParams = {}) => {
  try {
    const { limit = 10, pageToken, order = 'date' } = params;
    const queryParams = new URLSearchParams();
    
    if (limit) queryParams.append('limit', limit.toString());
    if (pageToken) queryParams.append('pageToken', pageToken);
    if (order) queryParams.append('order', order);
    // Ajouter une option pour stocker en base de données
    queryParams.append('storeInDb', 'true');
    
    // Vérification et validation de la variable d'environnement NEXT_PUBLIC_BACKEND_URL
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    
    if (!baseUrl) {
      console.error('[ERREUR] NEXT_PUBLIC_BACKEND_URL non défini dans le fichier .env du frontend');
      throw new Error('Configuration du backend manquante. Vérifiez le fichier .env du frontend.');
    }
    
    // Utiliser le bon format d'URL pour l'API standard
    // YOUTUBE_API_URL est déjà défini comme '/api/youtube'
    const finalUrl = `${baseUrl}${YOUTUBE_API_URL}/videos?${queryParams.toString()}`;
    console.log("[INFO] URL d'accès aux vidéos YouTube (endpoint standard):", finalUrl);
    
    // Utilisation de authenticatedAxios pour inclure automatiquement le JWT
    console.log("[AUTH] Appel de l'API standard avec authentification JWT");
    const response = await authenticatedAxios.get(finalUrl);
    
    // Utilisation de l'adaptateur pour extraire les données de la réponse standardisée
    return extractData<VideoListResponse>(response);
  } catch (error) {
    console.error('[ERREUR] Erreur lors de la récupération des vidéos YouTube:', error);
    
    // Amélioration du diagnostic d'erreur
    const errorDetails = {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      networkDiagnostic: error.networkDiagnostic,
      timestamp: new Date().toISOString()
    };
    console.error('[DIAGNOSTIC] Détails de l\'erreur:', errorDetails);
    
    throw error;
  }
};
