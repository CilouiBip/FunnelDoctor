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
 * Interface pour l'analyse des étapes du funnel
 */
export interface FunnelStageAnalysis {
  stage: string;
  count: number;
  conversion_rate: number;
  dropoff_rate: number;
}

/**
 * Interface pour la conversion globale du funnel
 */
export interface FunnelOverallConversion {
  total_visitors: number;
  total_leads: number;
  conversion_rate: number;
}

/**
 * Interface pour l'analyse temporelle du funnel
 */
export interface FunnelTimeAnalysis {
  date: string;
  visitors: number;
  leads: number;
  conversion_rate: number;
}

/**
 * Interface pour les résultats d'analyse du funnel
 */
export interface FunnelAnalyticsResponse {
  stages: FunnelStageAnalysis[];
  overall: FunnelOverallConversion;
  timeAnalysis: FunnelTimeAnalysis[];
}

/**
 * Interface pour les résultats de leads par source
 */
export interface LeadsBySourceResult {
  source: string;
  count: number;
  percentage: number;
}

/**
 * Interface pour le taux de conversion des leads
 */
export interface LeadsConversionRateResult {
  conversion_rate: number;
}

/**
 * Interface pour la timeline des leads
 */
export interface LeadsTimelineResult {
  date: string;
  count: number;
}

/**
 * Interface pour les résultats d'analyse des leads
 */
export interface LeadsAnalyticsResponse {
  totalLeads: number;
  conversionRate: LeadsConversionRateResult;
  bySource: LeadsBySourceResult[];
  timeline: LeadsTimelineResult[];
}
