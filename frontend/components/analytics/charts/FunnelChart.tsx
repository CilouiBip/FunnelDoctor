"use client";

import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';

interface FunnelChartProps {
  data: Array<{
    stage: string;
    count: number;
    conversionRate?: number;
    dropoffRate?: number;
  }>;
  title?: string;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

/**
 * Composant de visualisation du funnel de conversion
 */
export const FunnelChart: React.FC<FunnelChartProps> = ({
  data,
  title,
  isLoading = false,
  emptyMessage = 'Aucune donnée disponible',
  className = '',
}) => {
  // Déterminer si le graphique a des données à afficher
  const hasData = data.length > 0;

  // Formatter les noms d'étapes pour l'affichage
  const formatStageName = (stageName: string): string => {
    return stageName
      .replace('_', ' ')
      .toLowerCase()
      .replace(/(?:^|\s)\S/g, (a) => a.toUpperCase());
  };

  // Formater les données pour l'affichage
  const formattedData = data.map((item) => ({
    ...item,
    name: formatStageName(item.stage),
    value: item.count,
  }));

  // État de chargement
  if (isLoading) {
    return (
      <div className={`bg-white p-5 rounded-lg shadow-sm border border-gray-100 ${className}`}>
        {title && <h3 className="text-lg font-medium mb-4">{title}</h3>}
        <div className="h-64 w-full flex items-center justify-center">
          <div className="h-48 w-full bg-gray-200 animate-pulse rounded"></div>
        </div>
      </div>
    );
  }

  // Aucune donnée disponible
  if (!hasData) {
    return (
      <div className={`bg-white p-5 rounded-lg shadow-sm border border-gray-100 ${className}`}>
        {title && <h3 className="text-lg font-medium mb-4">{title}</h3>}
        <div className="h-64 w-full flex items-center justify-center text-gray-500">
          {emptyMessage}
        </div>
      </div>
    );
  }

  // Personnaliser l'affichage des tooltips
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white p-3 shadow-md rounded-md border border-gray-200">
          <p className="font-medium">{item.name}</p>
          <p className="text-sm">
            <span className="font-medium">{item.value}</span> utilisateurs
          </p>
          {item.conversionRate !== undefined && (
            <p className="text-sm text-green-600">
              Taux de conversion: {(item.conversionRate * 100).toFixed(1)}%
            </p>
          )}
          {item.dropoffRate !== undefined && (
            <p className="text-sm text-red-600">
              Taux d'abandon: {(item.dropoffRate * 100).toFixed(1)}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`bg-white p-5 rounded-lg shadow-sm border border-gray-100 ${className}`}>
      {title && <h3 className="text-lg font-medium mb-4">{title}</h3>}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart
            data={formattedData}
            layout="vertical"
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={150} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              dataKey="value"
              name="Nombre d'utilisateurs"
              fill="#0088FE"
              radius={[0, 4, 4, 0]}
            >
              <LabelList
                dataKey="value"
                position="right"
                style={{ fill: '#333', fontSize: 12, fontWeight: 500 }}
              />
            </Bar>
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default FunnelChart;
