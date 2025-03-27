import React from 'react';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { nanoid } from 'nanoid';

type StatTrend = {
  percentage: number;
  direction: 'up' | 'down' | 'neutral';
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  tooltip?: string;
  trend?: StatTrend;
  className?: string;
  colorClass?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  tooltip,
  trend,
  className = '',
  colorClass = 'bg-white',
}) => {
  const tooltipId = nanoid();
  
  return (
    <div className={`stats-card p-5 rounded-xl shadow-sm ${colorClass} ${className}`}>
      <div className="flex justify-between items-start mb-2">
        <h3 
          className="text-sm font-medium text-gray-500 truncate"
          data-tooltip-id={tooltipId}
          data-tooltip-content={tooltip}
        >
          {title}
        </h3>
        {tooltip && <Tooltip id={tooltipId} place="top" />}
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      
      <div className="flex flex-col">
        <div className="text-2xl font-semibold text-gray-800">
          {value}
        </div>
        
        {trend && (
          <div className="mt-1 flex items-center">
            {trend.direction === 'up' && (
              <span className="text-green-600 text-sm flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                {trend.percentage.toFixed(1)}%
              </span>
            )}
            {trend.direction === 'down' && (
              <span className="text-red-600 text-sm flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {trend.percentage.toFixed(1)}%
              </span>
            )}
            {trend.direction === 'neutral' && (
              <span className="text-gray-500 text-sm flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                Inchangé
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
