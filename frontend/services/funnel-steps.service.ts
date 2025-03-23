import { v4 as uuidv4 } from 'uuid';
import { getAccessToken } from '../lib/services/auth.service';

// Interface qui représente la structure d'une étape de funnel
export interface FunnelStep {
  step_id: string;
  type: string;        // Type non modifiable (ex: 'PAYMENT', 'VSL')
  slug: string;        // Slug stable pour identifier l'u00e9tape (ex: 'payment', 'vsl')
  label: string;       // Label modifiable par l'utilisateur
  description?: string;
  color?: string;      // Code couleur pour l'affichage visuel
  position?: number;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

// Service qui gu00e8re les opu00e9rations CRUD pour les u00e9tapes de funnel
export class FunnelStepsService {
  private static instance: FunnelStepsService;
  private apiUrl = '/api/funnel-steps';

  // Singleton pattern
  public static getInstance(): FunnelStepsService {
    if (!FunnelStepsService.instance) {
      FunnelStepsService.instance = new FunnelStepsService();
    }
    return FunnelStepsService.instance;
  }

  // Ru00e9cupu00e8re toutes les u00e9tapes depuis l'API
  async getSteps(): Promise<FunnelStep[]> {
    try {
      // Récupérer le token JWT
      const token = getAccessToken();
      console.log('Using token for getSteps:', token ? 'Token available' : 'No token');
      
      const response = await fetch(this.apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        credentials: 'include', // Important pour envoyer les cookies d'auth
      });

      if (!response.ok) {
        throw new Error(`Error fetching funnel steps: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch funnel steps:', error);
      return [];
    }
  }

  // Version de débogage qui utilise l'endpoint sans authentification
  async getDebugSteps(): Promise<FunnelStep[]> {
    try {
      console.log('Fetching funnel steps from debug endpoint');
      const response = await fetch(`${this.apiUrl}/debug`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Ne pas inclure credentials pour l'endpoint de debug
      });

      if (!response.ok) {
        throw new Error(`Error fetching debug funnel steps: ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('Debug funnel steps fetched:', responseData);
      
      // Extraire le tableau d'étapes du champ 'data' de la réponse standardisée API
      if (responseData && responseData.success && Array.isArray(responseData.data)) {
        console.log(`Extracted ${responseData.data.length} funnel steps from the response`);
        return responseData.data;
      } else {
        console.warn('Invalid response format from debug endpoint', responseData);
        return [];
      }
    } catch (error) {
      console.error('Failed to fetch debug funnel steps:', error);
      return [];
    }
  }

  // Génère un slug à partir du label (pour les étapes personnalisées)
  generateSlug(label: string): string {
    // Convertir en minuscules, remplacer les espaces par des underscores, retirer les caractères spéciaux
    let slug = label.toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 30); // Limiter la longueur
      
    // Ajouter un timestamp si le slug est vide
    if (!slug) {
      slug = `custom_${Date.now().toString(36)}`;
    }
    
    return slug;
  }
  
  // Crée une nouvelle étape via l'API
  async createStep(step: Omit<FunnelStep, 'step_id' | 'created_at' | 'updated_at'>): Promise<FunnelStep | null> {
    try {
      // Générer l'ID côté client pour assurer une réactivité immédiate
      const newStep: FunnelStep = {
        ...step,
        step_id: uuidv4(),
        // Si type n'est pas fourni, utiliser un type par défaut 'CUSTOM'
        type: step.type || 'CUSTOM',
        // Si slug n'est pas fourni, en générer un basé sur le type ou le label
        slug: step.slug || this.generateSlug(step.label),
        // Si color n'est pas fourni, utiliser une couleur par défaut
        color: step.color || '#94A3B8',
      };

      // Récupérer le token JWT
      const token = getAccessToken();
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        credentials: 'include',
        body: JSON.stringify(newStep),
      });

      if (!response.ok) {
        throw new Error(`Error creating funnel step: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create funnel step:', error);
      return null;
    }
  }

  // Met u00e0 jour une u00e9tape existante via l'API
  async updateStep(stepId: string, updates: Partial<Omit<FunnelStep, 'step_id'>>): Promise<FunnelStep | null> {
    try {
      // Récupérer le token JWT
      const token = getAccessToken();
      
      const response = await fetch(`${this.apiUrl}/${stepId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Error updating funnel step: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Failed to update funnel step ${stepId}:`, error);
      return null;
    }
  }

  // Supprime une u00e9tape via l'API
  async deleteStep(stepId: string): Promise<boolean> {
    try {
      // Récupérer le token JWT
      const token = getAccessToken();
      
      const response = await fetch(`${this.apiUrl}/${stepId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Error deleting funnel step: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error(`Failed to delete funnel step ${stepId}:`, error);
      return false;
    }
  }

  // Gu00e9nu00e8re un ID unique
  generateStepId(): string {
    return uuidv4();
  }
  
  // Met u00e0 jour les positions des u00e9tapes (pour le drag-and-drop)
  async updatePositions(positionUpdates: { step_id: string, position: number }[]): Promise<FunnelStep[] | null> {
    const requestId = `api-pos-${Date.now()}`;
    try {
      // Récupérer le token JWT
      const token = getAccessToken();
      
      // Log détaillé sur l'état du token
      console.log(`FunnelStepsService [${requestId}]: Début mise à jour positions - ${positionUpdates.length} éléments`);
      console.log(`FunnelStepsService [${requestId}]: État token:`, {
        disponible: !!token,
        longueur: token ? token.length : 0,
        début: token ? `${token.substring(0, 10)}...` : 'N/A'
      });
      
      // Sauvegarde de l'heure de début pour le calcul de la durée
      const startTime = performance.now();
      
      const response = await fetch(`${this.apiUrl}/positions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        credentials: 'include',
        body: JSON.stringify(positionUpdates),
      });

      // Calcul de la durée de l'appel
      const duration = (performance.now() - startTime).toFixed(2);
      console.log(`FunnelStepsService [${requestId}]: API call durée: ${duration}ms`);
      
      // Vérification détaillée du statut de la réponse
      console.log(`FunnelStepsService [${requestId}]: Statut réponse: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        // En cas d'erreur, enrichir l'objet d'erreur avec plus de détails
        const responseError: any = new Error(`Error updating funnel step positions: ${response.status} ${response.statusText}`);
        responseError.status = response.status;
        responseError.statusText = response.statusText;
        
        // Tenter de lire le corps de la réponse d'erreur si disponible
        try {
          const errorBody = await response.text();
          console.log(`FunnelStepsService [${requestId}]: Détails erreur:`, errorBody);
          responseError.responseBody = errorBody;
        } catch (e) {
          console.warn(`FunnelStepsService [${requestId}]: Impossible de lire le corps de l'erreur`); 
        }
        
        throw responseError;
      }

      const result = await response.json();
      console.log(`FunnelStepsService [${requestId}]: Positions mises à jour avec succès:`, 
        result.length + ' éléments');
      return result;
      
    } catch (error: any) {
      // Gestion plus détaillée des erreurs
      const errorDetails = {
        message: error.message || 'Unknown error',
        status: error.status || 0,
        responseBody: error.responseBody || null,
        stack: error.stack
      };
      
      console.error(`FunnelStepsService [${requestId}]: Échec mise à jour positions:`, errorDetails);
      
      // Propager l'erreur pour qu'elle soit traitée par le composant appelant
      throw error;
    }
  }
}
