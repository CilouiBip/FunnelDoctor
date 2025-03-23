"use client";

import React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface LineChartProps {
  data: Array<{
    date: string;
    value: number;
    [key: string]: any;
  }>;
  dataKey: string;
  lineColor?: string;
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

/**
 * Composant de graphique en ligne pour visualiser les donnu00e9es temporelles
 */
export const LineChart: React.FC<LineChartProps> = ({
  data,
  dataKey,
  lineColor = '#0088FE',
  title,
  xAxisLabel,
  yAxisLabel,
  isLoading = false,
  emptyMessage = 'Aucune donnu00e9e disponible',
  className = '',
}) => {
  // Du00e9terminer si le graphique a des donnu00e9es u00e0 afficher
  const hasData = data.length > 0;

  // Formater les dates pour l'affichage
  const formattedData = data.map(item => ({
    ...item,
    formattedDate: new Date(item.date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
    }),
  }));

  // u00c9tat de chargement
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

  // Aucune donnu00e9e disponible
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
      const date = new Date(label).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      
      return (
        <div className="bg-white p-3 shadow-md rounded-md border border-gray-200">
          <p className="font-medium">{date}</p>
          <p className="text-sm">
            <span className="font-medium">{payload[0].value}</span> {dataKey}
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
          <RechartsLineChart
            data={formattedData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 30,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => new Date(date).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'short',
              })}
              label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -15 } : undefined}
            />
            <YAxis 
              label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke={lineColor} 
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default LineChart;
