/**
 * Service d'authentification pour la gestion des appels API liés à l'authentification
 */

// URL de base de l'API
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Clé de stockage du token dans le localStorage
const TOKEN_STORAGE_KEY = 'accessToken';

/**
 * Interface pour les données d'utilisateur
 */
export interface User {
  id: string;
  email: string;
  fullName?: string;
  companyName?: string;
  planId?: string;
  createdAt: Date;
}

/**
 * Interface pour la réponse d'authentification
 */
export interface AuthResponse {
  access_token: string;
  user: User;
}

/**
 * Connecte un utilisateur avec son email et mot de passe
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  console.log('[FRONTEND-LOGIN] Début de l\'appel login avec:', email);
  
  try {
    // Log la requête qui va être envoyée
    console.log(`[FRONTEND-LOGIN] API URL utilisée: ${API_URL}/api/auth/login`);
    
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json' // S'assurer que le serveur renvoie du JSON
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include' // Gérer les cookies CORS si nécessaire
    });
    
    console.log('[FRONTEND-LOGIN] Statut de la réponse:', response.status, response.statusText);
    console.log('[FRONTEND-LOGIN] Headers de la réponse:', {
      contentType: response.headers.get('Content-Type'),
      contentLength: response.headers.get('Content-Length')
    });
    
    // Vérifier que la réponse contient du JSON valide
    if (!response.headers.get('Content-Type')?.includes('application/json')) {
      console.warn('[FRONTEND-LOGIN] ATTENTION: La réponse n\'est pas au format JSON');
    }
    
    // Cloner la réponse pour pouvoir l'utiliser deux fois (en texte brut et en JSON)
    const responseClone = response.clone();
    
    // Récupérer le texte brut de la réponse pour diagnostic
    const rawText = await responseClone.text();
    console.log('[FRONTEND-LOGIN] Réponse brute du serveur:', rawText);
    
    // Parser le JSON avec gestion d'erreur
    let data;
    try {
      data = JSON.parse(rawText);
      // Le log demandé de la structure complète de l'objet
      console.log('[FRONTEND-LOGIN] Raw data received from /api/auth/login:', JSON.stringify(data));
      console.log('[FRONTEND-LOGIN] Structure de la réponse:', {
        keys: Object.keys(data),
        hasData: 'data' in data,
        dataKeys: data?.data ? Object.keys(data.data) : [],
        hasAccessToken: data?.data && 'access_token' in data.data,
        hasUser: data?.data && 'user' in data.data
      });
    } catch (parseError) {
      console.error('[FRONTEND-LOGIN] Erreur de parsing JSON:', parseError);
      throw new Error('Erreur lors du parsing de la réponse JSON');
    }
    
    if (!response.ok) {
      console.error('[FRONTEND-LOGIN] Erreur API:', data.message || 'Erreur inconnue');
      throw new Error(data.message || 'Erreur lors de la connexion');
    }
    
    // Logs de diagnostic pour le token
    // Vérifier la présence du token de manière sécurisée en tenant compte de la structure enveloppée
    const hasToken = data?.data && typeof data.data === 'object' && 'access_token' in data.data && data.data.access_token;
    console.log('[FRONTEND-LOGIN] Détection du token:', hasToken ? 'PRÉSENT' : 'ABSENT');
    
    if (hasToken) {
      console.log('[FRONTEND-LOGIN] Token reçu:', data.data.access_token.substring(0, 15) + '...');
      console.log('[FRONTEND-LOGIN] Type du token:', typeof data.data.access_token);
      console.log('[FRONTEND-LOGIN] Longueur du token:', data.data.access_token.length);
    } else {
      console.warn('[FRONTEND-LOGIN] Token ABSENT dans la réponse!');
    }
    
    // Stocker le token dans le localStorage
    if (typeof window !== 'undefined') {
      // Utiliser une valeur par défaut sécurisée
      const tokenToStore = hasToken ? data.data.access_token : '';
      localStorage.setItem(TOKEN_STORAGE_KEY, tokenToStore);
      
      // Vérifier que le token est bien stocké dans localStorage
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      console.log('[FRONTEND-LOGIN] Token stocké dans localStorage:', storedToken ? `${storedToken.substring(0, 15)}...` : 'ABSENT');
    }
    
    // Si l'API ne renvoie pas la structure attendue, reconstruire l'objet pour éviter des erreurs
    // C'est une mesure temporaire pour éviter des plantages ultérieurs
    if (!hasToken || !data?.data?.user) {
      console.warn('[FRONTEND-LOGIN] Reconstruction de l\'objet de réponse car structure invalide');
      return {
        access_token: hasToken ? data.data.access_token : '',
        user: data?.data?.user || { id: '', email: '', createdAt: new Date() }
      };
    }
    
    // Retourner la structure attendue par le reste de l'application
    return {
      access_token: data.data.access_token,
      user: data.data.user
    };
  } catch (error) {
    console.error('[FRONTEND-LOGIN] Erreur globale:', error);
    throw error;
  }
}

/**
 * Inscrit un nouvel utilisateur
 */
export async function signup(email: string, password: string, fullName?: string, companyName?: string, planId?: string): Promise<AuthResponse> {
  // Conversion des propriétés camelCase vers snake_case pour le backend
  const response = await fetch(`${API_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      email, 
      password, 
      full_name: fullName, 
      company_name: companyName,
      plan_id: planId
    })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Erreur lors de l\'inscription');
  }
  
  // Stocker le token dans le localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
  }
  
  return data;
}

/**
 * Déconnecte l'utilisateur en supprimant le token
 * @param {string} reason - Raison de la déconnexion (optionnelle)
 * @param {string} redirectUrl - URL de redirection après déconnexion (optionnelle)
 */
export function logout(reason?: string, redirectUrl: string = '/'): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    
    // Si une raison est spécifiée, on la stocke pour l'afficher sur la page de login
    if (reason) {
      sessionStorage.setItem('logout_reason', reason);
    }
    
    console.log('[AUTH] Session terminée, token supprimé');
  }
  
  // Redirection avec paramètre de retour si spécifié
  const returnParam = redirectUrl !== '/' ? `?returnUrl=${encodeURIComponent(redirectUrl)}` : '';
  window.location.href = `/${returnParam}`;
}

/**
 * Demande un lien de réinitialisation de mot de passe pour une adresse email
 */
export async function forgotPassword(email: string): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Erreur lors de la demande de réinitialisation');
  }
  
  return data;
}

/**
 * Réinitialise le mot de passe avec un token valide
 */
export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password: newPassword })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Erreur lors de la réinitialisation du mot de passe');
  }
  
  return data;
}

/**
 * Décode un token JWT sans vérification
 * @param token Token JWT à décoder, peut être null ou undefined
 * @returns Le payload décodé ou null si le token est invalide
 */
export function decodeToken(token: string | null | undefined): any {
  // Vérifier que le token existe et est une chaîne de caractères non vide
  if (!token) {
    console.warn('[AUTH] Tentative de décodage d\'un token null ou undefined');
    return null;
  }
  
  try {
    // Vérifier que le token a le bon format (au moins 3 parties séparées par des points)
    const parts = token.split('.');
    if (parts.length < 2) {
      console.warn('[AUTH] Format de token invalide:', token.substring(0, 15) + '...');
      return null;
    }
    
    // Décodage basique d'un token JWT (partie payload uniquement)
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('[AUTH] Erreur lors du décodage du token:', error);
    return null;
  }
}

/**
 * Vérifie si un token est expiré
 * @param token Token JWT à vérifier, peut être null ou undefined
 * @returns true si le token est expiré ou invalide, false sinon
 */
export function isTokenExpired(token: string | null | undefined): boolean {
  // Si le token n'existe pas, il est considéré comme expiré
  if (!token) {
    console.warn('[AUTH] isTokenExpired: Token null ou undefined');
    return true;
  }
  
  const decodedToken = decodeToken(token);
  if (!decodedToken || !decodedToken.exp) {
    console.warn('[AUTH] Token invalide ou sans date d\'expiration');
    return true;
  }
  
  const currentTime = Math.floor(Date.now() / 1000);
  const isExpired = decodedToken.exp < currentTime;
  
  // Log de débogage pour l'expiration
  if (isExpired) {
    const expDate = new Date(decodedToken.exp * 1000);
    const diffMinutes = Math.floor((expDate.getTime() - Date.now()) / (1000 * 60));
    console.warn(`Token expiré depuis ${-diffMinutes} minutes (expiration: ${expDate.toLocaleString()})`);
  }
  
  return isExpired;
}

/**
 * Récupère des informations sur le token d'accès
 * @returns Objet contenant le token et ses informations décodées
 */
export function getTokenInfo(): { token: string | null, isValid: boolean, expiration: Date | null, userId: string | null } {
  // Si code exécuté côté serveur, retourner valeurs par défaut
  if (typeof window === 'undefined') {
    console.warn('[AUTH] getTokenInfo: Exécution côté serveur, pas de localStorage disponible');
    return { token: null, isValid: false, expiration: null, userId: null };
  }

  // Récupérer le token depuis localStorage
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  
  // Log de diagnostic pour comprendre le problème de token undefined
  console.log(`[AUTH] Token dans localStorage: ${token ? 'présent' : 'absent'}`);
  if (token) {
    console.log(`[AUTH] Début du token: ${token.substring(0, 15)}...`);
  } else {
    console.log('[AUTH] Clés disponibles dans localStorage:', Object.keys(localStorage));
  }

  // Si pas de token, retourner valeurs par défaut
  if (!token) {
    console.warn('[AUTH] getTokenInfo: Aucun token trouvé dans localStorage');
    return { token: null, isValid: false, expiration: null, userId: null };
  }

  // Décoder le token et vérifier sa validité
  const decodedToken = decodeToken(token);
  const isValid = decodedToken && !isTokenExpired(token);
  const expiration = decodedToken?.exp ? new Date(decodedToken.exp * 1000) : null;
  const userId = decodedToken?.sub || null;
  
  // Log d'information sur le token décodé
  console.log(`[AUTH] Token info - Valid: ${isValid}, Expiration: ${expiration?.toLocaleString() || 'N/A'}, UserId: ${userId || 'N/A'}`);
  
  return { token, isValid, expiration, userId };
}

/**
 * Récupère le token d'accès stocké
 */
export function getAccessToken(): string | null {
  const tokenInfo = getTokenInfo();
  console.log(`Auth Service: Token ${tokenInfo.token ? 'présent' : 'absent'}, Valide: ${tokenInfo.isValid}, Expiration: ${tokenInfo.expiration?.toLocaleString() || 'N/A'}, UserId: ${tokenInfo.userId || 'N/A'}`);
  
  // Ne retourner le token que s'il est valide
  return tokenInfo.isValid ? tokenInfo.token : null;
}

/**
 * Vérifie si l'utilisateur est authentifié
 */
export function isAuthenticated(): boolean {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) return false;
    
    const isValid = !isTokenExpired(token);
    console.log(`[AUTH] Vérification de l'authentification - Token présent: ${!!token}, Token valide: ${isValid}`);
    return isValid;
  }
  return false;
}

/**
 * Stocke un token d'accès dans le localStorage
 * Cette fonction est particulièrement utile après un flux OAuth
 * @param token Le token JWT à stocker
 */
export function setAccessToken(token: string): void {
  if (typeof window !== 'undefined' && token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    console.log('[AUTH] Token stocké manuellement dans localStorage');
  }
}

/**
 * Extrait un token JWT du hash de l'URL (utilisé après redirection OAuth)
 * @returns Le token extrait ou null si absent
 */
export function extractTokenFromUrlHash(): string | null {
  if (typeof window !== 'undefined' && window.location.hash) {
    try {
      const hash = window.location.hash.substring(1); // Enlever le # initial
      const params = new URLSearchParams(hash);
      const token = params.get('token');
      
      if (token) {
        console.log('[AUTH] Token extrait du hash avec succès');
        return token;
      }
    } catch (error) {
      console.error('[AUTH] Erreur lors de l\'extraction du token du hash:', error);
    }
  }
  return null;
}

/**
 * Vérifie si le token a été rafraîchi après une redirection OAuth
 * @returns true si c'est un retour d'OAuth avec statut success
 */
export function isOAuthRedirect(): boolean {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('status') === 'success';
  }
  return false;
}

/**
 * Vérifie si le token est expiré et déconnecte l'utilisateur si c'est le cas
 * @param {boolean} silent - Si true, ne redirige pas l'utilisateur (utile pour les vérifications en arrière-plan)
 * @param {string} currentPath - Chemin actuel pour la redirection après reconnexion
 * @returns {boolean} true si le token est valide, false sinon
 */
export function checkTokenAndLogout(silent: boolean = false, currentPath: string = ''): boolean {
  const tokenInfo = getTokenInfo();
  
  // Si pas de token, on considère que l'utilisateur n'est pas connecté
  if (!tokenInfo.token) {
    console.log('[AUTH] Token non trouvé, redirection vers login nécessaire');
    return false;
  }
  
  // Si le token est expiré, déconnecter l'utilisateur
  if (!tokenInfo.isValid) {
    console.warn('[AUTH] Token expiré détecté, déconnexion de l\'utilisateur');
    
    if (!silent) {
      logout('Votre session a expiré. Veuillez vous reconnecter.', currentPath);
    } else {
      // En mode silencieux, on se contente de supprimer le token sans redirection
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
      }
    }
    return false;
  }
  
  return true;
}

/**
 * Ajoute le token d'authentification aux headers d'une requête
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAccessToken();
  
  const headers = {
    ...options.headers,
    'Authorization': token ? `Bearer ${token}` : ''
  };
  
  return fetch(url, {
    ...options,
    headers
  });
}

/**
 * Récupère les informations de l'utilisateur connecté
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await fetchWithAuth(`${API_URL}/api/users/me`);
    
    if (!response.ok) {
      return null;
    }
    
    // Conversion des propriétés snake_case vers camelCase pour le frontend
    const userData = await response.json();
    return {
      ...userData,
      fullName: userData.full_name,
      companyName: userData.company_name,
      planId: userData.plan_id,
      // Supprimer les propriétés en snake_case pour éviter la duplication
      full_name: undefined,
      company_name: undefined,
      plan_id: undefined
    };
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur', error);
    return null;
  }
}
