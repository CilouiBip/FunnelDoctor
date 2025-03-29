/**
 * Hook de gestion de l'authentification YouTube avec diagnostic intégré
 */

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { connectYouTubeAccount, disconnectYouTubeAccount, checkYouTubeConnection } from '../services/youtube.service';
import { runYouTubeDiagnostic } from '../services/youtube-diagnostics';

export const useYouTubeAuth = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastError, setLastError] = useState<string | null>(null);
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);

  // Vérifier l'état de la connexion YouTube
  const checkConnection = useCallback(async () => {
    setIsLoading(true);
    setLastError(null);
    
    try {
      // Exécuter le diagnostic avant de vérifier la connexion
      const diagnostic = runYouTubeDiagnostic();
      setDiagnosticResult(diagnostic);
      
      // Si le diagnostic détecte un problème d'authentification, ne pas tenter l'appel API
      if (diagnostic.status !== 'OK') {
        console.warn('Diagnostic préventif: problèmes détectés avant appel API');
        setIsConnected(false);
        setIsLoading(false);
        setLastError('Problème de configuration détecté. Vérifiez la console.');
        return false;
      }
      
      // Vérifier la connexion YouTube uniquement si le diagnostic est bon
      const connectionStatus = await checkYouTubeConnection();
      setIsConnected(connectionStatus);
      return connectionStatus;
    } catch (error) {
      console.error('Erreur lors de la vérification de la connexion YouTube:', error);
      setIsConnected(false);
      setLastError(error.message || 'Erreur lors de la vérification');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Se connecter à YouTube
  const connect = useCallback(async () => {
    setIsLoading(true);
    setLastError(null);
    
    try {
      // Exécuter le diagnostic avant toute tentative de connexion
      const diagnostic = runYouTubeDiagnostic();
      setDiagnosticResult(diagnostic);
      
      // Si le diagnostic détecte un problème, afficher un message et ne pas continuer
      if (diagnostic.status !== 'OK') {
        console.error('Diagnostic préventif: Impossible de se connecter à YouTube');
        toast.error('Configuration invalide. Vérifiez que vous êtes connecté et que le backend est accessible.');
        setIsLoading(false);
        setLastError('Échec du diagnostic pré-connexion');
        return false;
      }
      
      // Lancer la connexion YouTube (qui redirige vers Google)
      await connectYouTubeAccount();
      return true;
    } catch (error) {
      console.error('Erreur lors de la connexion YouTube:', error);
      setLastError(error.message || 'Erreur lors de la connexion');
      toast.error('Impossible de se connecter à YouTube. ' + (error.message || 'Veuillez réessayer.'));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Se déconnecter de YouTube
  const disconnect = useCallback(async () => {
    setIsLoading(true);
    setLastError(null);
    
    try {
      const success = await disconnectYouTubeAccount();
      if (success) {
        setIsConnected(false);
        toast.success('Déconnexion YouTube réussie');
      } else {
        toast.error('Échec de la déconnexion YouTube');
      }
      return success;
    } catch (error) {
      console.error('Erreur lors de la déconnexion YouTube:', error);
      setLastError(error.message || 'Erreur lors de la déconnexion');
      toast.error('Erreur lors de la déconnexion YouTube');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Vérifier la connexion au chargement du composant
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Retourner l'état, les fonctions et le diagnostic
  return {
    isConnected,
    isLoading,
    lastError,
    diagnosticResult,
    connect,
    disconnect,
    checkConnection,
    runDiagnostic: () => {
      const result = runYouTubeDiagnostic();
      setDiagnosticResult(result);
      return result;
    }
  };
};
