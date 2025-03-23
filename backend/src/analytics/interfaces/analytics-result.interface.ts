/**
 * Interface pour les résultats d'analyse par catégorie
 */
export interface CategoryAnalyticsResult {
  category: string;
  count: number;
  percentage: number;
}

/**
 * Interface pour les résultats d'analyse temporelle
 */
export interface TimelineAnalyticsResult {
  date: string;
  count: number;
}

/**
 * Interface pour les résultats d'analyse par source
 */
export interface SourceAnalyticsResult {
  source: string;
  count: number;
  percentage: number;
}

/**
 * Interface pour les résultats d'analyse de funnel
 */
export interface FunnelAnalyticsResult {
  stage: string;
  count: number;
  conversionRate: number;
  dropoffRate: number;
}

/**
 * Interface pour les résultats complets d'analyse d'événements
 */
export interface EventsAnalyticsResponse {
  byCategory: CategoryAnalyticsResult[];
  bySource: SourceAnalyticsResult[];
  timeline: TimelineAnalyticsResult[];
  totalEvents: number;
}

/**
 * Interface pour les résultats d'analyse du funnel
 */
export interface FunnelAnalyticsResponse {
  stages: FunnelAnalyticsResult[];
  overallConversionRate: number;
  averageTimeToConversion: number; // en heures
}

/**
 * Interface pour les résultats d'analyse des leads
 */
export interface LeadsAnalyticsResponse {
  totalLeads: number;
  conversionRate: number;
  bySource: SourceAnalyticsResult[];
  timeline: TimelineAnalyticsResult[];
}
