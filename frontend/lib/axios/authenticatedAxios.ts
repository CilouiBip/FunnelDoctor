import axios from 'axios';
import { getAccessToken } from '../services/auth.service';

/**
 * Instance Axios configurée avec authentification automatique
 * Ajoute le header Authorization: Bearer <token> à toutes les requêtes
 */
const authenticatedAxios = axios.create({
  // Timeout augmenté pour éviter les erreurs de timeout prématurées
  timeout: 15000,
  // Paramètres CORS pour permettre les requêtes entre domaines avec cookies/auth
  withCredentials: true
});

// Intercepteur qui ajoute le token JWT à chaque requête
authenticatedAxios.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    
    // Détection du endpoint YouTube - log spécifique pour déboguer le problème 401
    const isYouTubeAuthRequest = config.url?.includes('/api/auth/youtube/authorize');
    if (isYouTubeAuthRequest) {
      console.log('=================================================');
      console.log('[AUTH] Détection d\'une requête de connexion YouTube');
      console.log(`[AUTH] URL: ${config.url}`);
      console.log(`[AUTH] Méthode: ${config.method?.toUpperCase()}`);
      
      // Logs détaillés sur l'origine du token JWT
      if (typeof window !== 'undefined') {
        const rawToken = localStorage.getItem('accessToken');
        console.log(`[AUTH] Token brut dans localStorage: ${rawToken ? 'Présent' : 'Absent'}`);
        if (rawToken) {
          console.log(`[AUTH] Token brut (10 premiers car.): ${rawToken.substring(0, 10)}...`);
          try {
            const tokenData = JSON.parse(atob(rawToken.split('.')[1]));
            console.log(`[AUTH] Payload décodé: exp=${new Date(tokenData.exp * 1000).toLocaleString()}, sub=${tokenData.sub}`);
          } catch (e) {
            console.error('[AUTH] Erreur de décodage du token:', e);
          }
        }
      }
      console.log(`[AUTH] Token traité par getAccessToken(): ${token ? 'Valide' : 'Invalide/Absent'}`);
      console.log('=================================================');
    }
    
    // Ajouter le token JWT au header Authorization si disponible
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
      
      // Log de débogage (à supprimer en production)
      console.log('[AUTH] Token JWT ajouté à la requête', {
        url: config.url,
        method: config.method?.toUpperCase(),
        tokenStart: token.substring(0, 10) + '...',
        timestamp: new Date().toISOString()
      });
    } else {
      console.warn('[AUTH] Aucun token JWT disponible pour l\'authentification');
      
      // Si c'est une requête YouTube authorize, on affiche un message d'erreur explicite
      if (isYouTubeAuthRequest) {
        console.error('[AUTH] ERREUR CRITIQUE: Tentative de connexion YouTube sans token JWT valide');
        // Optionnel: notification toast pour l'utilisateur
        if (typeof window !== 'undefined') {
          // Décommenter pour activer la notification toast
          // import('react-hot-toast').then(({default: toast}) => {
          //   toast.error("Vous devez être connecté pour accéder à YouTube");
          // });
        }
      }
    }
    
    // Garantir que les headers existent toujours
    config.headers = config.headers || {};
    // Ajouter des headers pour faciliter le débogage
    config.headers['X-Request-Debug'] = 'true';
    config.headers['Content-Type'] = 'application/json';
    
    return config;
  },
  (error) => {
    console.error('[AUTH] Erreur dans l\'intercepteur de requête Axios', error);
    return Promise.reject(error);
  }
);

// Intercepteur de réponse pour gérer les erreurs d'authentification
authenticatedAxios.interceptors.response.use(
  (response) => {
    // Log de débogage pour les réponses réussies
    console.log('[AUTH] Réponse API reçue', {
      status: response.status,
      url: response.config.url,
      timestamp: new Date().toISOString()
    });
    return response;
  },
  (error) => {
    // Détection des erreurs réseau (sans réponse du serveur)
    if (!error.response) {
      console.error('[AUTH] Erreur réseau détectée', {
        url: error.config?.url,
        message: error.message || 'Network Error',
        timestamp: new Date().toISOString()
      });
      
      // Ajouter des informations de diagnostic pour les erreurs réseau
      error.networkDiagnostic = {
        baseURL: error.config?.baseURL,
        url: error.config?.url,
        method: error.config?.method,
        timestamp: new Date().toISOString(),
        browserOrigin: typeof window !== 'undefined' ? window.location.origin : 'SSR'
      };
    }
    // Gestion spécifique des erreurs 401 (non autorisé)
    else if (error.response.status === 401) {
      console.error('[AUTH] Erreur 401 Unauthorized détectée', {
        url: error.config.url,
        message: error.response.data?.message || 'Token expiré ou invalide',
        timestamp: new Date().toISOString()
      });
      
      // Possibilité d'ajouter ici une logique de rafraîchissement du token
      // ou de redirection vers la page de connexion
    }
    
    return Promise.reject(error);
  }
);

export default authenticatedAxios;
