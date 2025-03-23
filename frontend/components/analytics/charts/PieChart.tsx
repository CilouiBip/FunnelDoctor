"use client";

import React from 'react';
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PieChartProps {
  data: Array<{
    name: string;
    value: number;
    percentage?: number;
  }>;
  colors?: string[];
  title?: string;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

/**
 * Composant de graphique en camembert utilisé pour afficher des distributions
 */
export const PieChart: React.FC<PieChartProps> = ({
  data,
  colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#5F9EA0', '#E91E63', '#9C27B0'],
  title,
  isLoading = false,
  emptyMessage = 'Aucune donnée disponible',
  className = '',
}) => {
  // Déterminer si le graphique a des données à afficher
  const hasData = data.length > 0 && data.some(item => item.value > 0);

  // Formater les données pour afficher les pourcentages
  const formattedData = data.map(item => ({
    name: item.name,
    value: item.value,
    percentage: item.percentage ?? 0,
  }));

  // Personnaliser l'affichage des tooltips
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white p-3 shadow-md rounded-md border border-gray-200">
          <p className="font-medium">{item.name}</p>
          <p className="text-sm">
            <span className="font-medium">{item.value}</span> ({item.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  // État de chargement
  if (isLoading) {
    return (
      <div className={`bg-white p-5 rounded-lg shadow-sm border border-gray-100 ${className}`}>
        {title && <h3 className="text-lg font-medium mb-4">{title}</h3>}
        <div className="h-64 w-full flex items-center justify-center">
          <div className="h-32 w-32 rounded-full bg-gray-200 animate-pulse"></div>
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

  return (
    <div className={`bg-white p-5 rounded-lg shadow-sm border border-gray-100 ${className}`}>
      {title && <h3 className="text-lg font-medium mb-4">{title}</h3>}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={formattedData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
              label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
            >
              {formattedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PieChart;
