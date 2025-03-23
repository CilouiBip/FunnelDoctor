"use client";

import React, { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  isLoading?: boolean;
  className?: string;
}

/**
 * Carte pour encapsuler les graphiques avec un titre et des actions optionnelles
 */
export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  children,
  actions,
  isLoading = false,
  className = '',
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      <div className="p-4 border-b border-gray-100 flex justify-between items-center">
        <h3 className="text-lg font-medium">{title}</h3>
        {actions && <div className="flex items-center space-x-2">{actions}</div>}
      </div>
      <div className="p-4">
        {isLoading ? (
          <div className="h-64 w-full flex items-center justify-center">
            <div className="h-48 w-full bg-gray-200 animate-pulse rounded"></div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export default ChartCard;
