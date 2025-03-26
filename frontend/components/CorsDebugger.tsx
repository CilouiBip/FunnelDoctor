'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

/**
 * Composant pour diagnostiquer les problu00e8mes CORS
 * Teste les requu00eates vers le backend avec diffu00e9rentes configurations
 */
export const CorsDebugger = () => {
  const [results, setResults] = useState<{[key: string]: string}>({
    directGet: 'Non testu00e9',
    axiosGet: 'Non testu00e9',
    fetchGet: 'Non testu00e9',
    authTest: 'Non testu00e9'
  });
  const [backendUrl, setBackendUrl] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<string>('');
  
  useEffect(() => {
    // Du00e9terminer l'URL du backend depuis les variables d'environnement du navigateur
    if (typeof window !== 'undefined') {
      // Examiner toutes les mu00e9ta-tags pour trouver l'URL du backend
      const metaTags = document.getElementsByTagName('meta');
      for (let i = 0; i < metaTags.length; i++) {
        if (metaTags[i].getAttribute('name') === 'backend-url') {
          setBackendUrl(metaTags[i].getAttribute('content') || '');
          break;
        }
      }
      
      if (!backendUrl) {
        // Fallback: essayer de deviner l'URL
        const guessedUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://funnel.doctor.ngrok.app';
        setBackendUrl(guessedUrl);
        console.log('[CORS-DEBUG] URL backend devinu00e9e:', guessedUrl);
      }
    }
  }, []);
  
  // Exu00e9cuter les tests CORS
  const runTests = async () => {
    if (!backendUrl) {
      setErrorDetails('URL du backend non du00e9finie');
      return;
    }
    
    setResults({
      directGet: 'En cours...',
      axiosGet: 'En cours...',
      fetchGet: 'En cours...',
      authTest: 'En cours...'
    });
    
    // Test 1: Requu00eate directe avec Axios
    try {
      console.log(`[CORS-DEBUG] Test direct GET vers ${backendUrl}/api/health`);
      const directResult = await axios.get(`${backendUrl}/api/health`);
      setResults(prev => ({ ...prev, directGet: `Succu00e8s: ${directResult.status}` }));
    } catch (error: any) {
      const errorMsg = error.message || 'Erreur inconnue';
      console.error('[CORS-DEBUG] Erreur directGet:', error);
      setResults(prev => ({ ...prev, directGet: `u00c9chec: ${errorMsg}` }));
      
      // Analyse du00e9taillu00e9e des erreurs
      if (error.response) {
        setErrorDetails(`Status: ${error.response.status}\nHeaders: ${JSON.stringify(error.response.headers)}`);
      } else if (error.request) {
        setErrorDetails(`Aucune ru00e9ponse reu00e7ue - erreur ru00e9seau probable\n${error.toString()}`);
      }
    }
    
    // Test 2: Requu00eate GET avec Fetch API
    try {
      console.log(`[CORS-DEBUG] Test fetch GET vers ${backendUrl}/api/health`);
      const fetchResult = await fetch(`${backendUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Ne pas inclure credentials par du00e9faut pour voir si u00e7a change quelque chose
        credentials: 'omit'
      });
      
      setResults(prev => ({
        ...prev,
        fetchGet: `Succu00e8s: ${fetchResult.status}`
      }));
    } catch (error: any) {
      console.error('[CORS-DEBUG] Erreur fetchGet:', error);
      setResults(prev => ({
        ...prev,
        fetchGet: `u00c9chec: ${error.message || 'Erreur inconnue'}`
      }));
    }
    
    // Test 3: Requu00eate avec authentification
    const token = localStorage.getItem('accessToken');
    try {
      console.log(`[CORS-DEBUG] Test auth GET vers ${backendUrl}/api/users/me avec token: ${token ? 'pru00e9sent' : 'absent'}`);
      
      if (!token) {
        setResults(prev => ({ ...prev, authTest: 'Pas de token JWT disponible' }));
      } else {
        const authResult = await axios.get(`${backendUrl}/api/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        setResults(prev => ({
          ...prev,
          authTest: `Succu00e8s: ${authResult.status} - ${JSON.stringify(authResult.data)}`
        }));
      }
    } catch (error: any) {
      console.error('[CORS-DEBUG] Erreur authTest:', error);
      setResults(prev => ({
        ...prev,
        authTest: `u00c9chec: ${error.message || 'Erreur inconnue'}`
      }));
    }
  };
  
  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h2 className="text-lg font-bold mb-4">Diagnostic CORS et Authentication</h2>
      
      <div className="mb-4">
        <label className="block mb-2">URL du Backend:</label>
        <input 
          type="text" 
          value={backendUrl} 
          onChange={e => setBackendUrl(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="https://funnel.doctor.ngrok.app"
        />
      </div>
      
      <button 
        onClick={runTests}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mb-4"
      >
        Lancer les tests CORS
      </button>
      
      <div className="mt-4">
        <h3 className="font-semibold mb-2">Ru00e9sultats:</h3>
        <div className="space-y-2">
          {Object.entries(results).map(([key, value]) => (
            <div key={key} className="p-2 border rounded">
              <strong>{key}:</strong> {value}
            </div>
          ))}
        </div>
      </div>
      
      {errorDetails && (
        <div className="mt-4 p-3 border-l-4 border-red-500 bg-red-50">
          <h3 className="font-semibold text-red-700">Du00e9tails des erreurs:</h3>
          <pre className="mt-2 text-sm whitespace-pre-wrap">{errorDetails}</pre>
        </div>
      )}
      
      <div className="mt-4 p-3 border-l-4 border-blue-500 bg-blue-50">
        <h3 className="font-semibold">JWT localStorage:</h3>
        <pre className="mt-2 text-sm">
          {localStorage.getItem('accessToken') ? 
            `Pru00e9sent (${localStorage.getItem('accessToken')?.substring(0, 15)}...)` : 
            'Absent'}
        </pre>
      </div>
    </div>
  );
};
