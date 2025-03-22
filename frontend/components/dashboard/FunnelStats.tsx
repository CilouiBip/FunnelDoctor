import React from 'react';

interface FunnelStatsProps {
  steps: {
    label: string;
    count: number;
    dropoff?: number;
    dropoffPercentage?: number;
  }[];
}

export const FunnelStats: React.FC<FunnelStatsProps> = ({ steps }) => {
  // Calculer la largeur maximale en fonction de la valeur la plus élevée
  const maxCount = Math.max(...steps.map(step => step.count));

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-6">Funnel Statistics</h3>
      
      <div className="space-y-6">
        {steps.map((step, index) => {
          const widthPercentage = (step.count / maxCount) * 100;
          const isLastStep = index === steps.length - 1;
          
          return (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold mr-3">
                    {index + 1}
                  </div>
                  <span className="font-medium">{step.label}</span>
                </div>
                <span className="font-bold">{step.count}</span>
              </div>
              
              <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full" 
                  style={{ width: `${widthPercentage}%` }}
                ></div>
              </div>
              
              {!isLastStep && step.dropoffPercentage !== undefined && (
                <div className="text-right text-sm">
                  <span className="text-red-500">{step.dropoffPercentage}% drop-off</span>
                  <span className="text-gray-400 ml-1">({step.dropoff} users)</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            <span className="font-medium">Conversion Rate:</span> {((steps[steps.length - 1].count / steps[0].count) * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-gray-500">
            <span className="font-medium">Total Drop-off:</span> {((steps[0].count - steps[steps.length - 1].count) / steps[0].count * 100).toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
};
