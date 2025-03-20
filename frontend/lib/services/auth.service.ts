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
 */
export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
  }
  // Redirection vers la page d'accueil
  window.location.href = '/';
}

/**
 * Récupère le token d'accès stocké
 */
export function getAccessToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken');
  }
  return null;
}

/**
 * Vérifie si l'utilisateur est authentifié
 */
export function isAuthenticated(): boolean {
  return !!getAccessToken();
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
