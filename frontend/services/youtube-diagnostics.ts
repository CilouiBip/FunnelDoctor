/**
 * Service de diagnostic pour l'intégration YouTube
 * Utilitaires pour vérifier et déboguer l'authentification et les appels API
 */

import { getAccessToken } from '../lib/services/auth.service';

/**
 * Vérifie l'état de l'authentification JWT
 * @returns Information sur le token JWT actuel
 */
export const checkJwtAuthStatus = (): { present: boolean; validFormat: boolean; details: any } => {
  try {
    // Récupération du token JWT
    const token = getAccessToken();
    
    if (!token) {
      console.warn('[DIAGNOSTIC] Aucun token JWT trouvé dans le localStorage');
      return {
        present: false, 
        validFormat: false,
        details: { message: 'Aucun token JWT trouvé' }
      };
    }
    
    // Vérification du format JWT (xxx.yyy.zzz)
    const isValidFormat = /^[\w-]+\.[\w-]+\.[\w-]+$/.test(token);
    
    if (!isValidFormat) {
      console.error('[DIAGNOSTIC] Format de token JWT invalide', token);
      return {
        present: true,
        validFormat: false,
        details: { token: token.substring(0, 10) + '...', format: 'invalide' }
      };
    }
    
    // Décodage basique du token (sans vérification de signature)
    const [headerBase64, payloadBase64] = token.split('.');
    
    // Décodage du header et payload
    const decodedHeader = JSON.parse(atob(headerBase64.replace(/-/g, '+').replace(/_/g, '/')));
    const decodedPayload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
    
    // Vérification de l'expiration
    const now = Math.floor(Date.now() / 1000);
    const isExpired = decodedPayload.exp ? decodedPayload.exp < now : false;
    
    // Calcul du temps restant avant expiration
    const expiresIn = decodedPayload.exp ? decodedPayload.exp - now : null;
    const expiresInMinutes = expiresIn ? Math.floor(expiresIn / 60) : null;
    
    console.log('[DIAGNOSTIC] Token JWT valide', {
      format: 'valide',
      alg: decodedHeader.alg,
      expired: isExpired,
      expiresIn: expiresInMinutes ? `${expiresInMinutes} minutes` : 'inconnu',
      user: decodedPayload.sub || decodedPayload.userId || 'inconnu'
    });
    
    return {
      present: true,
      validFormat: true,
      details: {
        header: decodedHeader,
        payload: decodedPayload,
        expired: isExpired,
        expiresIn: expiresInMinutes ? `${expiresInMinutes} minutes` : 'inconnu'
      }
    };
  } catch (error) {
    console.error('[DIAGNOSTIC] Erreur lors de la vérification du token JWT', error);
    return {
      present: false,
      validFormat: false,
      details: { error: error.message }
    };
  }
};

/**
 * Vérifie la configuration des URL d'API
 * @returns Information sur la configuration des URL
 */
export const checkApiUrlConfig = (): { valid: boolean; config: any } => {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  const config = {
    NEXT_PUBLIC_BACKEND_URL: baseUrl || 'non défini',
    NEXT_PUBLIC_API_URL: apiUrl || 'non défini',
    origin: typeof window !== 'undefined' ? window.location.origin : 'SSR',
  };
  
  const isValid = !!baseUrl; // Considérer comme valide si au moins NEXT_PUBLIC_BACKEND_URL est défini
  
  if (!isValid) {
    console.error('[CONFIG] Configuration des URL d\'API incomplète', config);
  } else {
    console.log('[CONFIG] Configuration des URL d\'API valide', config);
  }
  
  return { valid: isValid, config };
};

/**
 * Fonction utilitaire pour diagnostiquer l'état global de l'intégration YouTube
 * @returns Rapport de diagnostic complet
 */
export const runYouTubeDiagnostic = () => {
  console.group('===== DIAGNOSTIC INTÉGRATION YOUTUBE =====');
  
  // Vérification de la configuration des URL
  const urlConfig = checkApiUrlConfig();
  console.log('Configuration des URL :', urlConfig.valid ? '✅ OK' : '❌ ERREUR');
  
  // Vérification de l'authentification JWT
  const jwtStatus = checkJwtAuthStatus();
  console.log('Token JWT :', 
    jwtStatus.present 
      ? (jwtStatus.validFormat ? '✅ PRÉSENT ET VALIDE' : '⚠️ PRÉSENT MAIS FORMAT INVALIDE')
      : '❌ ABSENT');
  
  // Résumé des étapes à suivre
  if (!urlConfig.valid) {
    console.warn('⚠️ ACTION REQUISE: Configurez correctement NEXT_PUBLIC_BACKEND_URL dans le fichier .env du frontend');
  }
  
  if (!jwtStatus.present) {
    console.warn('⚠️ ACTION REQUISE: Connectez-vous pour obtenir un token JWT valide');
  } else if (!jwtStatus.validFormat) {
    console.warn('⚠️ ACTION REQUISE: Le format du token JWT est invalide, déconnectez-vous et reconnectez-vous');
  } else if (jwtStatus.details.expired) {
    console.warn('⚠️ ACTION REQUISE: Le token JWT est expiré, déconnectez-vous et reconnectez-vous');
  }
  
  console.groupEnd();
  
  return {
    timestamp: new Date().toISOString(),
    urlConfiguration: urlConfig,
    jwtAuthentication: jwtStatus,
    status: urlConfig.valid && jwtStatus.present && jwtStatus.validFormat && !jwtStatus.details.expired
      ? 'OK'
      : 'PROBLÈME DÉTECTÉ',
    nextSteps: !urlConfig.valid || !jwtStatus.present || !jwtStatus.validFormat || jwtStatus.details.expired
      ? 'Voir les messages ACTION REQUISE dans la console'
      : 'L\'intégration semble correctement configurée, testez les appels API'
  };
};
