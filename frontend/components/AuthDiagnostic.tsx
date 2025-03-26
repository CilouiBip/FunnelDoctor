'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { authenticatedAxios } from '../lib/axios/authenticatedAxios';

/**
 * Composant pour diagnostiquer les problèmes d'authentification JWT
 * Permet de tester les routes protégées sans impliquer YouTube
 */
export const AuthDiagnostic = () => {
  const [jwtTestResults, setJwtTestResults] = useState<{[key: string]: any}>({
    tokenState: 'Non testé',
    corsTest: 'Non testé',
    jwtTest: 'Non testé',
    tokenDetails: {}
  });
  const [backendUrl, setBackendUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Récupérer l'URL du backend depuis une méta-tag ou l'environnement
      const guessedUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://funnel.doctor.ngrok.app';
      setBackendUrl(guessedUrl);
    }
  }, []);
  
  // Vérifier l'état du token JWT dans localStorage
  const checkToken = () => {
    const token = localStorage.getItem('accessToken');
    const tokenObj = token ? { 
      present: true, 
      preview: token.substring(0, 15) + '...',
      length: token.length 
    } : { 
      present: false,
      preview: 'Aucun token',
      length: 0
    };
    
    // Aussi vérifier s'il y a un token sous l'ancienne clé
    const oldToken = localStorage.getItem('token');
    if (oldToken) {
      tokenObj.oldTokenPresent = true;
      tokenObj.oldTokenPreview = oldToken.substring(0, 15) + '...';
    }
    
    setJwtTestResults(prev => ({
      ...prev,
      tokenState: tokenObj.present ? 'Présent' : 'Absent',
      tokenDetails: tokenObj
    }));
    
    return tokenObj.present;
  };
  
  // Tester la route non protégée pour vérifier CORS
  const testCors = async () => {
    try {
      setIsLoading(true);
      setJwtTestResults(prev => ({ ...prev, corsTest: 'En cours...' }));
      
      const response = await axios.get(`${backendUrl}/api/auth/test-cors`);
      console.log('[DIAG-3] Réponse du test CORS:', response.data);
      
      setJwtTestResults(prev => ({
        ...prev,
        corsTest: `Succès (${response.status}): ${response.data.message}`
      }));
      return true;
    } catch (error: any) {
      console.error('[DIAG-3] Erreur test CORS:', error);
      setJwtTestResults(prev => ({
        ...prev,
        corsTest: `Échec: ${error.message || 'Erreur inconnue'}`
      }));
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Tester la route protégée par JWT
  const testJwt = async () => {
    try {
      setIsLoading(true);
      setJwtTestResults(prev => ({ ...prev, jwtTest: 'En cours...' }));
      
      const response = await authenticatedAxios.get(`${backendUrl}/api/auth/test-protected`);
      console.log('[DIAG-3] Réponse du test JWT protégé:', response.data);
      
      setJwtTestResults(prev => ({
        ...prev,
        jwtTest: `Succès (${response.status}): ${response.data.message}`
      }));
      return true;
    } catch (error: any) {
      console.error('[DIAG-3] Erreur test JWT:', error);
      const errorDetails = error.response 
        ? `Status: ${error.response.status}, Message: ${JSON.stringify(error.response.data)}` 
        : error.message || 'Erreur inconnue';
        
      setJwtTestResults(prev => ({
        ...prev,
        jwtTest: `Échec: ${errorDetails}`
      }));
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Lance tous les tests d'un coup
  const runAllTests = async () => {
    const hasToken = checkToken();
    if (!hasToken) {
      alert('Aucun token JWT trouvé! Vous devez vous connecter avant de lancer les tests.');
      return;
    }
    
    await testCors();
    await testJwt();
  };
  
  // Bouton pour effacer les tokens et se déconnecter
  const clearTokens = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('token'); // Ancienne clé également
    checkToken();
  };
  
  // Style status pour afficher réussite/échec visuellement
  const getStatusStyle = (status: string) => {
    if (status.includes('Succès')) return 'text-green-600 font-semibold';
    if (status.includes('Échec')) return 'text-red-600 font-semibold';
    return 'text-gray-600';
  };

  return (
    <div className="p-5 border rounded-lg bg-gray-50 space-y-4">
      <h2 className="text-xl font-bold">Diagnostic d'Authentification JWT</h2>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <h3 className="font-semibold">État du Token JWT:</h3>
          <span className={jwtTestResults.tokenDetails.present ? 'text-green-600' : 'text-red-600'}>
            {jwtTestResults.tokenState}
          </span>
        </div>
        
        {jwtTestResults.tokenDetails.present && (
          <div className="bg-gray-100 p-2 rounded text-sm font-mono break-all">
            Token: {jwtTestResults.tokenDetails.preview} 
            <span className="text-gray-500">(longueur: {jwtTestResults.tokenDetails.length})</span>
          </div>
        )}
        
        {jwtTestResults.tokenDetails.oldTokenPresent && (
          <div className="bg-yellow-100 p-2 rounded text-sm font-mono break-all border-l-4 border-yellow-400">
            <strong>Attention:</strong> Ancien token détecté sous la clé 'token': {jwtTestResults.tokenDetails.oldTokenPreview}
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <h3 className="font-semibold">Test CORS:</h3>
          <span className={getStatusStyle(jwtTestResults.corsTest)}>
            {jwtTestResults.corsTest}
          </span>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <h3 className="font-semibold">Test Route Protégée JWT:</h3>
          <span className={getStatusStyle(jwtTestResults.jwtTest)}>
            {jwtTestResults.jwtTest}
          </span>
        </div>
      </div>
      
      <div className="flex space-x-4 pt-4">
        <button
          onClick={checkToken}
          className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
          disabled={isLoading}
        >
          Vérifier Token
        </button>
        
        <button
          onClick={testCors}
          className="px-4 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 transition"
          disabled={isLoading}
        >
          Test CORS
        </button>
        
        <button
          onClick={testJwt}
          className="px-4 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition"
          disabled={isLoading}
        >
          Test JWT
        </button>
        
        <button
          onClick={runAllTests}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          disabled={isLoading}
        >
          Tous les Tests
        </button>
        
        <button
          onClick={clearTokens}
          className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
          disabled={isLoading}
        >
          Effacer Tokens
        </button>
      </div>
      
      {isLoading && (
        <div className="text-center py-2">
          <span className="inline-block animate-spin mr-2">⟳</span>
          Tests en cours...
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-500">
        <p>URL du Backend: {backendUrl}</p>
        <p className="mt-1">
          <strong>Note:</strong> Pour résoudre les problèmes d'authentification, assurez-vous que:
        </p>
        <ul className="list-disc pl-5 mt-1">
          <li>Le token JWT est correctement stocké sous la clé 'accessToken'</li>
          <li>Les requêtes CORS sont autorisées depuis votre origine</li>
          <li>Le token JWT n'est pas expiré et est valide</li>
        </ul>
      </div>
    </div>
  );
};
