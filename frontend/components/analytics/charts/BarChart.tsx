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
} from 'recharts';

interface BarChartProps {
  data: Array<{
    name: string;
    value: number;
    [key: string]: any;
  }>;
  dataKey: string;
  barColor?: string;
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

/**
 * Composant de graphique en barres pour visualiser les données d'analytics
 */
export const BarChart: React.FC<BarChartProps> = ({
  data,
  dataKey,
  barColor = '#0088FE',
  title,
  xAxisLabel,
  yAxisLabel,
  isLoading = false,
  emptyMessage = 'Aucune donnée disponible',
  className = '',
}) => {
  // Déterminer si le graphique a des données à afficher
  const hasData = data.length > 0 && data.some(item => item[dataKey] > 0);

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
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-md rounded-md border border-gray-200">
          <p className="font-medium">{label}</p>
          <p className="text-sm">
            <span className="font-medium">{payload[0].value}</span>
          </p>
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
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 30,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="name" 
              label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -15 } : undefined}
            />
            <YAxis 
              label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey={dataKey} fill={barColor} radius={[4, 4, 0, 0]} />
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default BarChart;
