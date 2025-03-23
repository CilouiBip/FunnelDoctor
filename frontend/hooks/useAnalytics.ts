import useSWR, { SWRConfiguration } from 'swr';
import { 
  AnalyticsQueryParams, 
  EventsAnalyticsResponse,
  FunnelAnalyticsResponse,
  LeadsAnalyticsResponse,
  CategoryAnalyticsResult,
  SourceAnalyticsResult,
  TimelineAnalyticsResult
} from '../lib/types/analytics';
import { getAccessToken } from '../lib/services/auth.service';

/**
 * Formater une date en ISO YYYY-MM-DD, avec gestion d'erreur robuste
 */
const formatToISODate = (dateInput: string | Date | null | undefined): string | undefined => {
  if (!dateInput) return undefined;
  
  try {
    // Si c'est déjà une date ISO YYYY-MM-DD, retourner telle quelle
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      console.log(`Date déjà au format ISO: ${dateInput}`);
      return dateInput;
    }
    
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    // Vérifier si la date est invalide
    if (isNaN(date.getTime())) {
      console.warn(`Date invalide détectée: ${dateInput}, utilisation de la date actuelle`);
      return new Date().toISOString().split('T')[0];
    }
    
    const isoDate = date.toISOString().split('T')[0];
    console.log(`Date convertie au format ISO: ${dateInput} -> ${isoDate}`);
    return isoDate;
  } catch (error) {
    console.error(`Erreur lors de la conversion de la date ${dateInput}:`, error);
    return new Date().toISOString().split('T')[0]; // Fallback à aujourd'hui
  }
};

/**
 * Formatter les paramètres pour l'API
 * Assure que les dates sont au format ISO YYYY-MM-DD avec gestion d'erreur robuste
 */
const formatQueryParams = (params: AnalyticsQueryParams): Record<string, string> => {
  const formattedParams: Record<string, string> = {};
  
  // Date de début avec fallback
  const startDate = formatToISODate(params.startDate);
  if (startDate) {
    formattedParams.startDate = startDate;
  } else {
    // Fallback: 30 jours en arrière
    const defaultStart = new Date();
    defaultStart.setDate(defaultStart.getDate() - 30);
    formattedParams.startDate = formatToISODate(defaultStart) as string;
    console.warn('Utilisation de la date de début par défaut (30 jours en arrière)');
  }
  
  // Date de fin avec fallback
  const endDate = formatToISODate(params.endDate);
  if (endDate) {
    formattedParams.endDate = endDate;
  } else {
    // Fallback: aujourd'hui
    formattedParams.endDate = formatToISODate(new Date()) as string;
    console.warn('Utilisation de la date de fin par défaut (aujourd\'hui)');
  }
  
  // Ajouter les autres paramètres s'ils sont définis
  if (params.siteId) formattedParams.siteId = params.siteId;
  if (params.userId) formattedParams.userId = params.userId;
  if (params.eventCategory) formattedParams.eventCategory = params.eventCategory;
  if (params.sourceSystem) formattedParams.sourceSystem = params.sourceSystem;
  if (params.funnelStage) formattedParams.funnelStage = params.funnelStage;
  if (params.limit) formattedParams.limit = params.limit.toString();
  
  console.log('Paramètres formatés pour API:', formattedParams);
  return formattedParams;
};

/**
 * Constructeur d'URL pour les requêtes API
 */
const buildApiUrl = (endpoint: string, params: AnalyticsQueryParams): string => {
  // Utiliser l'URL de l'API backend (port 3001)
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const formattedParams = formatQueryParams(params);
  
  // Construire l'URL avec les paramètres
  const url = new URL(`/api/analytics/${endpoint}`, baseUrl);
  
  Object.entries(formattedParams).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.append(key, value);
  });
  
  console.log(`📊 Analytics API URL: ${url.toString()}`);
  return url.toString();
};

/**
 * Fetcher générique pour SWR
 * Inclut des logs de performance et une meilleure gestion des erreurs
 */
const fetcher = async (url: string) => {
  console.log(`⚡️ Analytics API request: ${url}`);
  const startTime = performance.now();
  
  // Récupérer le token d'authentification
  const token = getAccessToken();
  if (!token) {
    console.warn("⚠️ Analytics API: Aucun token d'authentification disponible");
  }
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      credentials: 'include' // Inclure les cookies d'authentification
    });
    
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    console.log(`⚡️ Analytics API response time: ${responseTime.toFixed(2)}ms`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
      const error = new Error(`Erreur API Analytics (${response.status}): ${errorData.message || 'Détails non disponibles'}`);
      (error as any).info = errorData;
      (error as any).status = response.status;
      console.error(`❌ Analytics API error: ${error.message}`, errorData);
      throw error;
    }
    
    const data = await response.json();
    console.log(`✅ Analytics API success: ${url.split('?')[0]}`);
    return data;
  } catch (error) {
    if (!(error instanceof Error && (error as any).status)) {
      console.error(`❌ Analytics API network error: ${error}`);
    }
    throw error;
  }
};

interface AnalyticsHookResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: Error | null;
  mutate: () => void;
}

/**
 * Hook pour récupérer les données d'analytics des événements
 */
export const useEventsAnalytics = (
  params: AnalyticsQueryParams,
  options?: SWRConfiguration
): AnalyticsHookResult<EventsAnalyticsResponse> => {
  const apiUrl = buildApiUrl('events', params);
  
  const { data, error, mutate } = useSWR<EventsAnalyticsResponse>(
    apiUrl,
    fetcher,
    {
      revalidateOnFocus: false,
      ...options,
    }
  );
  
  return {
    data,
    isLoading: !error && !data,
    isError: error || null,
    mutate,
  };
};

/**
 * Hook pour récupérer les données d'analytics du funnel
 */
export const useFunnelAnalytics = (
  params: AnalyticsQueryParams,
  options?: SWRConfiguration
): AnalyticsHookResult<FunnelAnalyticsResponse> => {
  const apiUrl = buildApiUrl('funnel', params);
  
  const { data, error, mutate } = useSWR<FunnelAnalyticsResponse>(
    apiUrl,
    fetcher,
    {
      revalidateOnFocus: false,
      ...options,
    }
  );
  
  return {
    data,
    isLoading: !error && !data,
    isError: error || null,
    mutate,
  };
};

/**
 * Hook pour récupérer les données d'analytics des leads
 */
export const useLeadsAnalytics = (
  params: AnalyticsQueryParams,
  options?: SWRConfiguration
): AnalyticsHookResult<LeadsAnalyticsResponse> => {
  const apiUrl = buildApiUrl('leads', params);
  
  const { data, error, mutate } = useSWR<LeadsAnalyticsResponse>(
    apiUrl,
    fetcher,
    {
      revalidateOnFocus: false,
      ...options,
    }
  );
  
  return {
    data,
    isLoading: !error && !data,
    isError: error || null,
    mutate,
  };
};

/**
 * Hook pour récupérer les données d'analytics des événements par catégorie
 */
export const useEventsByCategory = (
  params: AnalyticsQueryParams,
  options?: SWRConfiguration
): AnalyticsHookResult<CategoryAnalyticsResult[]> => {
  const apiUrl = buildApiUrl('events/category', params);
  
  const { data, error, mutate } = useSWR<CategoryAnalyticsResult[]>(
    apiUrl,
    fetcher,
    {
      revalidateOnFocus: false,
      ...options,
    }
  );
  
  return {
    data,
    isLoading: !error && !data,
    isError: error || null,
    mutate,
  };
};

/**
 * Hook pour récupérer les données d'analytics des événements par source
 */
export const useEventsBySource = (
  params: AnalyticsQueryParams,
  options?: SWRConfiguration
): AnalyticsHookResult<SourceAnalyticsResult[]> => {
  const apiUrl = buildApiUrl('events/source', params);
  
  const { data, error, mutate } = useSWR<SourceAnalyticsResult[]>(
    apiUrl,
    fetcher,
    {
      revalidateOnFocus: false,
      ...options,
    }
  );
  
  return {
    data,
    isLoading: !error && !data,
    isError: error || null,
    mutate,
  };
};

/**
 * Hook pour récupérer les données d'analytics de la timeline des événements
 */
export const useEventsTimeline = (
  params: AnalyticsQueryParams,
  options?: SWRConfiguration
): AnalyticsHookResult<TimelineAnalyticsResult[]> => {
  const apiUrl = buildApiUrl('events/timeline', params);
  
  const { data, error, mutate } = useSWR<TimelineAnalyticsResult[]>(
    apiUrl,
    fetcher,
    {
      revalidateOnFocus: false,
      ...options,
    }
  );
  
  return {
    data,
    isLoading: !error && !data,
    isError: error || null,
    mutate,
  };
};
