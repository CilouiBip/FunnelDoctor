"use client";

import React, { useState, useEffect } from 'react';
import DateRangePicker from './DateRangePicker';
import { AnalyticsQueryParams } from '../../lib/types/analytics';

interface FilterBarProps {
  filters: AnalyticsQueryParams;
  onFilterChange: (filters: AnalyticsQueryParams) => void;
  showCategoryFilter?: boolean;
  showSourceFilter?: boolean;
  showStageFilter?: boolean;
  className?: string;
}

/**
 * Barre de filtres pour les donnu00e9es d'analytics
 * Permet de su00e9lectionner une pu00e9riode et d'autres filtres optionnels
 */
export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  showCategoryFilter = false,
  showSourceFilter = false,
  showStageFilter = false,
  className = '',
}) => {
  // Formater les dates pour DateRangePicker
  const [startDate, setStartDate] = useState<Date | null>(
    filters.startDate ? new Date(filters.startDate) : null
  );
  const [endDate, setEndDate] = useState<Date | null>(
    filters.endDate ? new Date(filters.endDate) : null
  );

  // Gu00e9rer la su00e9lection de dates
  const handleDateChange = (start: Date | null, end: Date | null) => {
    setStartDate(start);
    setEndDate(end);

    if (start && end) {
      const startISO = start.toISOString().split('T')[0];
      const endISO = end.toISOString().split('T')[0];

      onFilterChange({
        ...filters,
        startDate: startISO,
        endDate: endISO,
      });
    }
  };

  // Gu00e9rer le changement des filtres de catu00e9gorie
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value || undefined;
    onFilterChange({
      ...filters,
      eventCategory: value,
    });
  };

  // Gu00e9rer le changement des filtres de source
  const handleSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value || undefined;
    onFilterChange({
      ...filters,
      sourceSystem: value,
    });
  };

  // Gu00e9rer le changement des filtres d'u00e9tape du funnel
  const handleStageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value || undefined;
    onFilterChange({
      ...filters,
      funnelStage: value,
    });
  };

  // Gu00e9rer le changement de la limite de ru00e9sultats
  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value, 10) || undefined;
    onFilterChange({
      ...filters,
      limit: value,
    });
  };

  // Gu00e9nu00e9rer des dates par du00e9faut si aucune n'est su00e9lectionnu00e9e
  useEffect(() => {
    if (!startDate || !endDate) {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 1); // Un mois en arriu00e8re par du00e9faut
      
      setStartDate(start);
      setEndDate(end);
      
      // Mettre u00e0 jour les filtres avec les dates par du00e9faut
      onFilterChange({
        ...filters,
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      });
    }
  }, []);

  return (
    <div className={`bg-white p-4 rounded-lg shadow-sm border border-gray-100 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-end space-y-4 md:space-y-0 md:space-x-4">
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onChange={handleDateChange}
        />

        {showCategoryFilter && (
          <div className="flex flex-col">
            <label htmlFor="category-filter" className="text-sm text-gray-600 mb-1">
              Catu00e9gorie
            </label>
            <select
              id="category-filter"
              value={filters.eventCategory || ''}
              onChange={handleCategoryChange}
              className="p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
            >
              <option value="">Toutes les catu00e9gories</option>
              <option value="marketing">Marketing</option>
              <option value="sales">Ventes</option>
              <option value="conversion">Conversion</option>
              <option value="engagement">Engagement</option>
            </select>
          </div>
        )}

        {showSourceFilter && (
          <div className="flex flex-col">
            <label htmlFor="source-filter" className="text-sm text-gray-600 mb-1">
              Source
            </label>
            <select
              id="source-filter"
              value={filters.sourceSystem || ''}
              onChange={handleSourceChange}
              className="p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
            >
              <option value="">Toutes les sources</option>
              <option value="website">Site web</option>
              <option value="calendly">Calendly</option>
              <option value="crm">CRM</option>
              <option value="email">Email</option>
            </select>
          </div>
        )}

        {showStageFilter && (
          <div className="flex flex-col">
            <label htmlFor="stage-filter" className="text-sm text-gray-600 mb-1">
              u00c9tape du funnel
            </label>
            <select
              id="stage-filter"
              value={filters.funnelStage || ''}
              onChange={handleStageChange}
              className="p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
            >
              <option value="">Toutes les u00e9tapes</option>
              <option value="VISIT">Visite</option>
              <option value="LEAD_CAPTURE">Capture de lead</option>
              <option value="APPOINTMENT_SCHEDULED">RDV programmu00e9</option>
              <option value="APPOINTMENT_COMPLETED">RDV complu00e9tu00e9</option>
              <option value="PURCHASE_MADE">Achat effectuu00e9</option>
            </select>
          </div>
        )}

        <div className="flex flex-col">
          <label htmlFor="limit-filter" className="text-sm text-gray-600 mb-1">
            Limite
          </label>
          <select
            id="limit-filter"
            value={filters.limit || 10}
            onChange={handleLimitChange}
            className="p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
