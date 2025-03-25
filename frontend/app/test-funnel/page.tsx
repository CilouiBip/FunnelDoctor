"use client";

import { useEffect, useState } from 'react';

interface FunnelStage {
  stage: string;
  count: number;
  rate: number;
  color: string;
}

export default function TestFunnel() {
  const [funnelData, setFunnelData] = useState<FunnelStage[]>([
    { stage: 'UTM Source', count: 0, rate: 0, color: 'bg-blue-400' },
    { stage: 'Landing Page', count: 0, rate: 0, color: 'bg-green-400' },
    { stage: 'Calendly RDV', count: 0, rate: 0, color: 'bg-yellow-400' },
    { stage: 'Payment', count: 0, rate: 0, color: 'bg-purple-400' },
  ]);
  
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Dans un cas ru00e9el, ceci serait un appel API vers le backend
    // Pour le test, nous simulons des donnu00e9es apru00e8s un court du00e9lai
    const timer = setTimeout(() => {
      // Donnu00e9es fictives pour le test
      setFunnelData([
        { stage: 'UTM Source', count: 100, rate: 100, color: 'bg-blue-400' },
        { stage: 'Landing Page', count: 75, rate: 75, color: 'bg-green-400' },
        { stage: 'Calendly RDV', count: 25, rate: 33.3, color: 'bg-yellow-400' },
        { stage: 'Payment', count: 10, rate: 40, color: 'bg-purple-400' },
      ]);
      setIsLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Tableau de Bord Funnel</h1>
      
      <div className="flex mb-4 space-x-4">
        <a 
          href="/test-utm"
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Tester UTM Tracking
        </a>
        
        <a 
          href="/"
          className="inline-block bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
        >
          Retour u00e0 l'accueil
        </a>
      </div>
      
      {isLoading ? (
        <div className="bg-gray-100 p-8 rounded-lg text-center">
          <p>Chargement des donnu00e9es...</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Statistiques du Funnel</h2>
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">u00c9tape du Funnel</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Nombre</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Taux de Conversion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {funnelData.map((stage, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="py-3 px-4">{stage.stage}</td>
                    <td className="text-right py-3 px-4">{stage.count}</td>
                    <td className="text-right py-3 px-4">{stage.rate.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-4">Visualisation du Funnel</h2>
            <div className="space-y-3 bg-gray-50 p-4 rounded">
              {funnelData.map((stage, index) => (
                <div key={index} className="relative h-10">
                  <div 
                    className={`absolute h-full ${stage.color} rounded transition-all duration-500`}
                    style={{ width: `${stage.rate}%` }}
                  ></div>
                  <div className="absolute inset-0 flex items-center justify-between px-4">
                    <span className="font-medium">{stage.stage}</span>
                    <span className="font-medium">{stage.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded">
            <h3 className="font-medium">Comment tester le flux complet:</h3>
            <ol className="list-decimal pl-5 mt-2 space-y-2">
              <li>Accu00e9der u00e0 <a href="/test-utm?utm_source=youtube&utm_medium=video&utm_campaign=test" className="text-blue-600 underline">la page test UTM avec paramu00e8tres</a></li>
              <li>Vu00e9rifier la capture du visitor_id et des UTMs</li>
              <li>Simuler un webhook Calendly avec le visitor_id via curl</li>
              <li>Simuler un webhook Stripe avec le lead_id via curl</li>
              <li>Vu00e9rifier les donnu00e9es dans Supabase</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
