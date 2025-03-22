/**
 * Service d'authentification pour la gestion des appels API liés à l'authentification
 */

// URL de base de l'API
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Erreur lors de la connexion');
  }
  
  // Stocker le token dans le localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', data.access_token);
  }
  
  return data;
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
    localStorage.setItem('accessToken', data.access_token);
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
    localStorage.removeItem('accessToken');
    
    // Si une raison est spécifiée, on la stocke pour l'afficher sur la page de login
    if (reason) {
      sessionStorage.setItem('logout_reason', reason);
    }
  }
  
  // Redirection avec paramètre de retour si spécifié
  const returnParam = redirectUrl !== '/' ? `?returnUrl=${encodeURIComponent(redirectUrl)}` : '';
  window.location.href = `/${returnParam}`;
}

/**
 * Décode un token JWT sans vérification
 */
export function decodeToken(token: string): any {
  try {
    // Décodage basique d'un token JWT (partie payload uniquement)
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Erreur lors du décodage du token:', error);
    return null;
  }
}

/**
 * Vérifie si un token est expiré
 */
export function isTokenExpired(token: string): boolean {
  const decodedToken = decodeToken(token);
  if (!decodedToken || !decodedToken.exp) {
    console.warn('Token invalide ou sans date d\'expiration');
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
 */
export function getTokenInfo(): { token: string | null, isValid: boolean, expiration: Date | null, userId: string | null } {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  
  if (!token) {
    return { token: null, isValid: false, expiration: null, userId: null };
  }
  
  const decodedToken = decodeToken(token);
  const isValid = decodedToken && !isTokenExpired(token);
  const expiration = decodedToken?.exp ? new Date(decodedToken.exp * 1000) : null;
  const userId = decodedToken?.sub || null;
  
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
  return !!getAccessToken();
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
    return false;
  }
  
  // Si le token est expiré, déconnecter l'utilisateur
  if (!tokenInfo.isValid) {
    console.warn('Token expiré détecté, déconnexion de l\'utilisateur');
    
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
