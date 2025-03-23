/**
 * Types pour le module Analytics
 * Ces types correspondent aux DTOs définis dans le backend
 */

/**
 * Paramètres de requête pour les appels API d'analytics
 */
export interface AnalyticsQueryParams {
  startDate: string;
  endDate: string;
  siteId?: string;
  userId?: string;
  eventCategory?: string;
  sourceSystem?: string;
  funnelStage?: string;
  limit?: number;
}

/**
 * Résultat d'analyse par catégorie
 */
export interface CategoryAnalyticsResult {
  category: string;
  count: number;
  percentage: number;
}

/**
 * Résultat d'analyse par source
 */
export interface SourceAnalyticsResult {
  source: string;
  count: number;
  percentage: number;
}

/**
 * Résultat d'analyse temporelle
 */
export interface TimelineAnalyticsResult {
  date: string;
  count: number;
}

/**
 * Résultats complets d'analyse d'événements
 */
export interface EventsAnalyticsResponse {
  byCategory: CategoryAnalyticsResult[];
  bySource: SourceAnalyticsResult[];
  timeline: TimelineAnalyticsResult[];
  totalEvents: number;
}

/**
 * Résultat d'analyse d'une étape du funnel
 */
export interface FunnelAnalyticsResult {
  stage: string;
  count: number;
  conversionRate: number;
  dropoffRate: number;
}

/**
 * Résultats complets d'analyse du funnel
 */
export interface FunnelAnalyticsResponse {
  stages: FunnelAnalyticsResult[];
  overallConversionRate: number;
  averageTimeToConversion: number; // en heures
}

/**
 * Résultats complets d'analyse des leads
 */
export interface LeadsAnalyticsResponse {
  totalLeads: number;
  conversionRate: number;
  bySource: SourceAnalyticsResult[];
  timeline: TimelineAnalyticsResult[];
}
