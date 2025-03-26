/**
 * Composant pour gérer la récupération du token JWT à partir du hash de l'URL
 * Ce composant s'exécute uniquement côté client
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface TokenFromHashProps {
  onTokenFound?: (token: string) => void;
}

export const TokenFromHash: React.FC<TokenFromHashProps> = ({ onTokenFound }) => {
  const router = useRouter();

  useEffect(() => {
    // Fonction pour extraire et traiter le token du hash
    const processHash = () => {
      try {
        // Vérifier si l'URL contient un hash avec token
        if (typeof window !== 'undefined' && window.location.hash) {
          const hash = window.location.hash.substring(1); // Enlever le # initial
          const params = new URLSearchParams(hash);
          const token = params.get('token');

          if (token) {
            console.log('[AUTH] Token trouvé dans l\'URL hash');
            
            // Stocker le token dans localStorage
            localStorage.setItem('accessToken', token);
            console.log('[AUTH] Token stocké dans localStorage');
            
            // Notifier le composant parent si nécessaire
            if (onTokenFound) {
              onTokenFound(token);
            }
            
            // Nettoyer l'URL pour des raisons de sécurité
            // Utiliser l'URL actuelle sans le hash
            const cleanUrl = window.location.href.split('#')[0];
            router.replace(cleanUrl);
            
            return token;
          }
        }
        return null;
      } catch (error) {
        console.error('[AUTH] Erreur lors du traitement du token dans le hash:', error);
        return null;
      }
    };

    const token = processHash();
    
    // Log de diagnostic
    if (token) {
      console.log('[DIAGNOSTIC] Token récupéré et stocké avec succès');
    } else {
      console.log('[DIAGNOSTIC] Aucun token trouvé dans le hash');
    }
  }, [router, onTokenFound]);

  // Ce composant ne rend rien visuellement
  return null;
};

export default TokenFromHash;
