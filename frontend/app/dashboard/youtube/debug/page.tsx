"use client";

import { useState, useEffect } from 'react';
import { getTokenInfo, extractTokenFromUrlHash, isOAuthRedirect } from '../../../../lib/services/auth.service';
import TokenFromHash from '../../../../components/auth/TokenFromHash';

export default function YouTubeDebug() {
  const [tokenState, setTokenState] = useState({
    token: null as string | null,
    isValid: false,
    expiration: null as Date | null,
    userId: null as string | null,
    oauthRedirect: false,
    hashToken: null as string | null
  });

  const refreshTokenInfo = () => {
    const tokenInfo = getTokenInfo();
    const hashToken = extractTokenFromUrlHash();
    const oauthRedirect = isOAuthRedirect();
    
    setTokenState({
      ...tokenInfo,
      oauthRedirect,
      hashToken
    });
    
    console.log("[DEBUG] TokenInfo refreshed:", tokenInfo);
  };

  // Callback pour traiter le token récupéré depuis l'URL
  const handleTokenFound = (token: string) => {
    console.log('[DEBUG] Token récupéré et traité par la page de debug');
    refreshTokenInfo();
  };

  useEffect(() => {
    refreshTokenInfo();
  }, []);

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      {/* Composant invisible qui se charge d'extraire le token du hash */}
      <TokenFromHash onTokenFound={handleTokenFound} />
      
      <h1 className="text-2xl font-bold mb-6">Diagnostic YouTube OAuth</h1>
      
      <div className="mb-6 grid grid-cols-1 gap-4">
        <div className="p-4 bg-gray-100 rounded-lg">
          <h2 className="font-semibold mb-2">État du Token JWT</h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="font-medium">Token présent:</div>
            <div className={tokenState.token ? "text-green-600" : "text-red-600"}>
              {tokenState.token ? "Oui" : "Non"}
            </div>
            
            <div className="font-medium">Token valide:</div>
            <div className={tokenState.isValid ? "text-green-600" : "text-red-600"}>
              {tokenState.isValid ? "Oui" : "Non"}
            </div>
            
            <div className="font-medium">ID Utilisateur:</div>
            <div>{tokenState.userId || "N/A"}</div>
            
            <div className="font-medium">Expiration:</div>
            <div>{tokenState.expiration?.toLocaleString() || "N/A"}</div>
            
            <div className="font-medium">Redirection OAuth:</div>
            <div className={tokenState.oauthRedirect ? "text-green-600" : "text-gray-500"}>
              {tokenState.oauthRedirect ? "Oui" : "Non"}
            </div>
            
            <div className="font-medium">Token dans Hash:</div>
            <div className={tokenState.hashToken ? "text-green-600" : "text-gray-500"}>
              {tokenState.hashToken ? "Oui" : "Non"}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex space-x-4">
        <button 
          onClick={refreshTokenInfo}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Rafraîchir les Informations
        </button>
        
        <button 
          onClick={() => {
            import('../../../../services/youtube.service').then(module => {
              module.connectYouTubeAccount();
            });
          }}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Connecter YouTube
        </button>
      </div>
      
      {tokenState.token && (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg overflow-auto">
          <h2 className="font-semibold mb-2">Token JWT (tronqué)</h2>
          <pre className="text-xs">
            {`${tokenState.token.substring(0, 30)}...${tokenState.token.substring(tokenState.token.length - 30)}`}
          </pre>
        </div>
      )}
    </div>
  );
}
