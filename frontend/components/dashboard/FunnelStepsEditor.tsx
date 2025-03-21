import React from 'react';

interface FunnelStep {
  id: string;
  name: string;
  description?: string;
}

export const FunnelStepsEditor: React.FC = () => {
  // Mock data pour les étapes du funnel
  const funnelSteps: FunnelStep[] = [
    { id: '1', name: 'Landing', description: 'Visite de la page d\'atterrissage' },
    { id: '2', name: 'Calendly', description: 'Prise de rendez-vous' },
    { id: '3', name: 'Payment', description: 'Paiement effectué' }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Funnel Steps</h3>
        <button className="text-sm px-3 py-1 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors">
          + Add Step
        </button>
      </div>
      
      <div className="space-y-3">
        {funnelSteps.map((step, index) => (
          <div 
            key={step.id}
            className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:border-primary/30 hover:bg-primary/5 transition-colors"
          >
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold mr-3">
                {index + 1}
              </div>
              <div>
                <h4 className="font-medium">{step.name}</h4>
                {step.description && <p className="text-sm text-gray-500">{step.description}</p>}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button className="text-gray-400 hover:text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21h-9.5A2.25 2.25 0 014 18.75V8.25A2.25 2.25 0 016.25 6H11" />
                </svg>
              </button>
              <button className="text-gray-400 hover:text-red-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
