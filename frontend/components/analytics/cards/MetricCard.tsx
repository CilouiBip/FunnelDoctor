"use client";

import React, { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    label: string;
    isPositive: boolean;
  };
  footer?: string;
  isLoading?: boolean;
  error?: boolean;
  className?: string;
}

/**
 * Carte affichant une mu00e9trique principale avec tendance optionnelle
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  trend,
  footer,
  isLoading = false,
  error = false,
  className = '',
}) => {
  return (
    <div className={`bg-white p-5 rounded-lg shadow-sm border ${error ? 'border-red-200 bg-red-50' : 'border-gray-100'} ${className}`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-sm font-medium text-gray-500">{title}</h3>
          {isLoading ? (
            <div className="h-8 w-24 bg-gray-200 animate-pulse rounded mt-1"></div>
          ) : error ? (
            <p className="text-2xl font-semibold mt-1 text-red-600">Erreur</p>
          ) : (
            <p className="text-2xl font-semibold mt-1">{value}</p>
          )}
        </div>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>

      {trend && !isLoading && (
        <div className="mt-2 flex items-center">
          <span
            className={`flex items-center text-sm ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {trend.isPositive ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {trend.value}% {trend.label}
          </span>
        </div>
      )}

      {footer && !isLoading && <div className="mt-2 text-xs text-gray-500">{footer}</div>}

      {isLoading && (
        <div className="mt-2">
          <div className="h-4 w-32 bg-gray-200 animate-pulse rounded"></div>
        </div>
      )}
    </div>
  );
};

export default MetricCard;
