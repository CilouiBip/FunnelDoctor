"use client";

import { useEffect, useState } from 'react';

// Déclaration des types pour l'API FunnelDoctor globale
declare global {
  interface Window {
    FunnelDoctor: {
      getVisitorId: () => string;
      getUTMParams: () => Record<string, string>;
    };
  }
}

export default function TestUTM() {
  const [visitorId, setVisitorId] = useState<string>('');
  const [utmParams, setUtmParams] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Vérifier si le script est chargé, puis récupérer les données
    const checkScriptLoaded = () => {
      if (window.FunnelDoctor) {
        try {
          const id = window.FunnelDoctor.getVisitorId();
          const params = window.FunnelDoctor.getUTMParams() || {};
          
          setVisitorId(id);
          setUtmParams(params);
          setLoading(false);
        } catch (error) {
          console.error('Error accessing FunnelDoctor API:', error);
          setLoading(false);
        }
      } else {
        // Réessayer si le script n'est pas encore chargé
        setTimeout(checkScriptLoaded, 500);
      }
    };
    
    checkScriptLoaded();
  }, []);

  // Valeur par défaut sûre pour l'URL de test (utilisée lors du rendu côté serveur)
  const [testUrl, setTestUrl] = useState<string>('/test-utm?utm_source=youtube&utm_medium=video&utm_campaign=test&utm_content=bridging_demo');
  
  // useEffect supplémentaire pour générer l'URL de test côté client uniquement
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const baseUrl = window.location.origin + window.location.pathname;
      setTestUrl(`${baseUrl}?utm_source=youtube&utm_medium=video&utm_campaign=test&utm_content=bridging_demo`);
    }
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Test UTM Tracking</h1>
      
      {loading ? (
        <div className="bg-yellow-100 p-4 rounded-md mb-4">
          <p>Chargement du script FunnelDoctor...</p>
        </div>
      ) : null}
      
      <div className="bg-gray-50 p-6 rounded-lg shadow-sm mb-6">
        <h2 className="text-xl font-semibold mb-4">Visitor ID:</h2>
        <div className="bg-white p-3 rounded border">
          {visitorId ? (
            <code className="text-green-600">{visitorId}</code>
          ) : (
            <span className="text-red-500">Non généré</span>
          )}
        </div>
      </div>
      
      <div className="bg-gray-50 p-6 rounded-lg shadow-sm mb-6">
        <h2 className="text-xl font-semibold mb-4">UTM Parameters:</h2>
        <div className="bg-white p-3 rounded border">
          {Object.keys(utmParams).length > 0 ? (
            <pre className="text-sm overflow-auto">
              {JSON.stringify(utmParams, null, 2)}
            </pre>
          ) : (
            <p className="text-red-500">Aucun paramètre UTM détecté</p>
          )}
        </div>
      </div>
      
      <div className="bg-blue-50 p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Options de test:</h2>
        
        <div className="flex flex-col space-y-4">
          <a 
            href={testUrl}
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors w-fit"
          >
            Tester avec paramètres UTM (YouTube)
          </a>
          
          <a 
            href="/"
            className="inline-block bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors w-fit"
          >
            Retour à l'accueil
          </a>
          
          <a 
            href="/test-funnel"
            className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors w-fit"
          >
            Voir le tableau de bord funnel
          </a>
        </div>
      </div>
    </div>
  );
}
