"use client";

import React, { useState, useCallback } from 'react';
import { useEventsAnalytics, useFunnelAnalytics, useLeadsAnalytics } from '../../../hooks/useAnalytics';
import { AnalyticsQueryParams } from '../../../lib/types/analytics';
import FilterBar from '../../../components/analytics/FilterBar';
import MetricCard from '../../../components/analytics/cards/MetricCard';
import ChartCard from '../../../components/analytics/cards/ChartCard';
import PieChart from '../../../components/analytics/charts/PieChart';
import BarChart from '../../../components/analytics/charts/BarChart';
import LineChart from '../../../components/analytics/charts/LineChart';
import FunnelChart from '../../../components/analytics/charts/FunnelChart';

/**
 * Page principale du tableau de bord d'analytics
 */
export default function AnalyticsPage() {
  // État pour stocker les filtres
  const [filters, setFilters] = useState<AnalyticsQueryParams>(() => {
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    return {
      startDate: oneMonthAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
      limit: 10,
    };
  });

  // Hook pour récupérer les données d'analytics des événements
  const {
    data: eventsData,
    isLoading: isEventsLoading,
    isError: eventsError,
  } = useEventsAnalytics(filters);

  // Hook pour récupérer les données d'analytics du funnel
  const {
    data: funnelData,
    isLoading: isFunnelLoading,
    isError: funnelError,
  } = useFunnelAnalytics(filters);

  // Hook pour récupérer les données d'analytics des leads
  const {
    data: leadsData,
    isLoading: isLeadsLoading,
    isError: leadsError,
  } = useLeadsAnalytics(filters);

  // Gérer le changement de filtres
  const handleFilterChange = useCallback((newFilters: AnalyticsQueryParams) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      ...newFilters,
    }));
  }, []);

  // Formatter les données pour les graphiques de catégorie
  const categoryChartData = eventsData?.byCategory
    ? eventsData.byCategory.map(cat => ({
        name: cat.category,
        value: cat.count,
        percentage: cat.percentage,
      }))
    : [];

  // Formatter les données pour les graphiques de source
  const sourceChartData = eventsData?.bySource
    ? eventsData.bySource.map(src => ({
        name: src.source,
        value: src.count,
        percentage: src.percentage,
      }))
    : [];

  // Formatter les données pour les graphiques de timeline
  const timelineChartData = eventsData?.timeline
    ? eventsData.timeline.map(item => ({
        date: item.date,
        value: item.count,
      }))
    : [];

  // Composant pour afficher un message d'erreur avec possibilité de réessayer
  const ErrorMessage = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
    <div className="p-4 mb-4 rounded-lg bg-red-50 border border-red-200">
      <div className="flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        <span className="text-red-800">{message}</span>
      </div>
      <button 
        onClick={onRetry} 
        className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-sm rounded-md transition-colors"
      >
        Réessayer
      </button>
    </div>
  );

  // Fonction pour réessayer de charger les données
  const handleRetry = () => {
    if (eventsError) {
      // Recharger les événements
      (
        useEventsAnalytics(filters) as { mutate: () => void }
      ).mutate();
    }
    if (funnelError) {
      // Recharger le funnel
      (
        useFunnelAnalytics(filters) as { mutate: () => void }
      ).mutate();
    }
    if (leadsError) {
      // Recharger les leads
      (
        useLeadsAnalytics(filters) as { mutate: () => void }
      ).mutate();
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Tableau de Bord Analytics</h1>
        <p className="text-gray-600">Analysez les performances de votre funnel et l'engagement de vos utilisateurs</p>
      </div>

      {/* Barre de filtres */}
      <div className="mb-6">
        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          showCategoryFilter
          showSourceFilter
        />
      </div>

      {/* Afficher un message d'erreur global si nécessaire */}
      {(eventsError || funnelError || leadsError) && (
        <div className="mb-6">
          <ErrorMessage 
            message="Certaines données n'ont pas pu être chargées. Vérifiez votre connexion et les filtres appliqués." 
            onRetry={handleRetry} 
          />
        </div>
      )}

      {/* Cartes de métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total des Événements"
          value={eventsData?.totalEvents || 0}
          isLoading={isEventsLoading}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          }
          error={eventsError ? true : false}
        />
        <MetricCard
          title="Total des Leads"
          value={leadsData?.totalLeads || 0}
          isLoading={isLeadsLoading}
          error={leadsError ? true : false}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          }
        />
        <MetricCard
          title="Taux de Conversion"
          value={`${(funnelData?.overallConversionRate || 0).toFixed(1)}%`}
          isLoading={isFunnelLoading}
          error={funnelError ? true : false}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          }
        />
        <MetricCard
          title="Temps Moyen de Conversion"
          value={`${funnelData?.averageTimeToConversion || 0} h`}
          isLoading={isFunnelLoading}
          error={funnelError ? true : false}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Événements par Catégorie">
          {eventsError ? (
            <ErrorMessage 
              message="Erreur lors du chargement des données de catégories" 
              onRetry={handleRetry} 
            />
          ) : (
            <PieChart
              data={categoryChartData}
              isLoading={isEventsLoading}
              emptyMessage="Aucune donnée de catégorie disponible pour la période sélectionnée"
            />
          )}
        </ChartCard>

        <ChartCard title="Événements par Source">
          {eventsError ? (
            <ErrorMessage 
              message="Erreur lors du chargement des données de sources" 
              onRetry={handleRetry} 
            />
          ) : (
            <PieChart
              data={sourceChartData}
              isLoading={isEventsLoading}
              emptyMessage="Aucune donnée de source disponible pour la période sélectionnée"
            />
          )}
        </ChartCard>

        <ChartCard title="Événements au fil du temps">
          {eventsError ? (
            <ErrorMessage 
              message="Erreur lors du chargement des données chronologiques" 
              onRetry={handleRetry} 
            />
          ) : (
            <LineChart
              data={timelineChartData}
              dataKey="value"
              isLoading={isEventsLoading}
              emptyMessage="Aucune donnée chronologique disponible pour la période sélectionnée"
            />
          )}
        </ChartCard>

        <ChartCard title="Funnel de Conversion">
          {funnelError ? (
            <ErrorMessage 
              message="Erreur lors du chargement des données du funnel" 
              onRetry={handleRetry} 
            />
          ) : (
            <FunnelChart
              data={funnelData?.stages || []}
              isLoading={isFunnelLoading}
              emptyMessage="Aucune donnée de funnel disponible pour la période sélectionnée"
            />
          )}
        </ChartCard>
      </div>
    </div>
  );
}
