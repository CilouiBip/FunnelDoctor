'use client';

import { useEffect } from 'react';

/**
 * Composant pour migrer les tokens de l'ancienne clé 'token' vers 'accessToken'
 * Ce composant est invisible et effectue la migration au chargement de l'application
 */
export const TokenMigration = () => {
  useEffect(() => {
    // Cette migration ne s'exécute que côté client
    if (typeof window === 'undefined') return;
    
    try {
      const oldToken = localStorage.getItem('token');
      
      if (oldToken) {
        console.log('[MIGRATION] Token trouvé sous l\'ancienne clé "token"');
        
        // Vérifier si un token existe déjà sous accessToken
        const existingAccessToken = localStorage.getItem('accessToken');
        
        if (!existingAccessToken) {
          // Migrer le token vers la nouvelle clé
          localStorage.setItem('accessToken', oldToken);
          console.log('[MIGRATION] Token migré vers la clé "accessToken"');
        } else {
          console.log('[MIGRATION] Un token existe déjà sous "accessToken", conservation de ce token');
        }
        
        // Supprimer l'ancien token
        localStorage.removeItem('token');
        console.log('[MIGRATION] Ancienne clé "token" supprimée');
      }
    } catch (error) {
      console.error('[MIGRATION] Erreur lors de la migration du token:', error);
    }
  }, []);
  
  // Ce composant ne rend rien dans le DOM
  return null;
};
