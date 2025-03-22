"use client";

import React, { useEffect, useState } from 'react';
import { FunnelStepsService, FunnelStep } from '../../../../services/funnel-steps.service';

// Récupérer l'instance du service
const funnelStepsService = FunnelStepsService.getInstance();

export default function FunnelDebugPage() {
  const [steps, setSteps] = useState<FunnelStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Pour forcer le rafraîchissement

  useEffect(() => {
    const fetchSteps = async () => {
      try {
        setLoading(true);
        // Utiliser la mu00e9thode de du00e9bogage sans authentification
        const data = await funnelStepsService.getDebugSteps();
        setSteps(data);
      } catch (err: any) {
        console.error('Erreur lors du fetch des steps:', err);
        setError(err.message || 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };

    fetchSteps();
  }, [refreshKey]); // Refetch quand refreshKey change

  const handleRefresh = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Funnel Steps Debug View</h1>
        <button 
          onClick={handleRefresh}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
        >
          Rafraîchir
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-gray-600">Chargement des étapes du funnel...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">
          <p>{error}</p>
          <button 
            className="mt-2 text-primary hover:underline" 
            onClick={handleRefresh}
          >
            Réessayer
          </button>
        </div>
      ) : steps.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Aucune étape trouvée dans la base de données.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {steps.map((step) => (
            <div 
              key={step.step_id} 
              className="border p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              style={{borderLeftWidth: '4px', borderLeftColor: step.color || '#94A3B8'}}
            >
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="font-medium pr-2">Step ID:</td>
                    <td className="text-gray-600 break-all">{step.step_id}</td>
                  </tr>
                  <tr>
                    <td className="font-medium pr-2">Slug:</td>
                    <td className="text-gray-600">{step.slug}</td>
                  </tr>
                  <tr>
                    <td className="font-medium pr-2">Type:</td>
                    <td className="text-gray-600">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                        {step.type}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="font-medium pr-2">Label:</td>
                    <td className="text-gray-600">{step.label}</td>
                  </tr>
                  <tr>
                    <td className="font-medium pr-2">Position:</td>
                    <td className="text-gray-600">{step.position}</td>
                  </tr>
                  <tr>
                    <td className="font-medium pr-2">Color:</td>
                    <td className="text-gray-600 flex items-center">
                      <div 
                        className="w-4 h-4 rounded-full mr-2" 
                        style={{backgroundColor: step.color || '#94A3B8'}}
                      ></div>
                      {step.color || '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-medium pr-2">Description:</td>
                    <td className="text-gray-600">{step.description || '—'}</td>
                  </tr>
                  <tr>
                    <td className="font-medium pr-2">Créé le:</td>
                    <td className="text-gray-600">{step.created_at ? new Date(step.created_at).toLocaleString() : '—'}</td>
                  </tr>
                  <tr>
                    <td className="font-medium pr-2">Mis à jour:</td>
                    <td className="text-gray-600">{step.updated_at ? new Date(step.updated_at).toLocaleString() : '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {!loading && steps.length > 0 && (
        <div className="mt-8 p-4 border rounded-lg bg-gray-50">
          <h2 className="text-lg font-semibold mb-2">Résumé</h2>
          <p><strong>Nombre total d'étapes:</strong> {steps.length}</p>
          <p><strong>Types d'étapes:</strong> {Array.from(new Set(steps.map(s => s.type))).join(', ')}</p>
          <p><strong>Positions utilisées:</strong> {steps.map(s => s.position).sort((a, b) => (a || 0) - (b || 0)).join(', ')}</p>
          <p><strong>Slugs:</strong> {steps.map(s => s.slug).join(', ')}</p>
        </div>
      )}
    </div>
  );
}
