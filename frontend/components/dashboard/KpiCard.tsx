import React from 'react';

interface KpiCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon
}) => {
  const changeColorClass = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-600'
  }[changeType];

  const changeIcon = {
    positive: '↑',
    negative: '↓',
    neutral: ''
  }[changeType];

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col">
      <div className="flex items-center mb-3">
        {icon && <div className="mr-3 text-primary">{icon}</div>}
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {change && (
        <div className={`mt-2 text-sm ${changeColorClass} flex items-center`}>
          <span>{changeIcon}</span>
          <span className="ml-1">{change}</span>
        </div>
      )}
    </div>
  );
};
