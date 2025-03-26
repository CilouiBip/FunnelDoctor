/**
 * API Adapter - Standardise les réponses du backend
 * 
 * Le backend renvoie systématiquement des réponses au format:
 * {
 *   success: boolean,
 *   data: { ... },  // Données réelles
 *   timestamp: string,
 *   correlationId: string
 * }
 *
 * Cet adaptateur extrait les données pour simplifier l'utilisation côté frontend
 */

/**
 * Extrait les données de la réponse standardisée du backend
 * @param response Réponse axios du backend
 * @returns Les données contenues dans response.data.data
 * @throws Error si le format est invalide ou si success=false
 */
export const extractData = <T>(response: any): T => {
  // Vérification du format de réponse
  if (!response || !response.data) {
    throw new Error('Invalid API response: missing data');
  }

  // Vérification du succès de l'opération
  if (response.data.success === false) {
    const errorMessage = response.data.error || 'Operation failed';
    console.error('API Error:', errorMessage);
    throw new Error(errorMessage);
  }

  // Extraction des données
  if (response.data.data === undefined) {
    console.warn('API Response has unexpected format:', response.data);
    // Si data n'existe pas, on considère que la réponse entière est data
    return response.data as T;
  }

  return response.data.data as T;
};

/**
 * Adaptateur de configuration pour les options Axios
 * Permet d'ajouter facilement des headers, params, etc.
 */
export const configureRequest = (options: Record<string, any> = {}) => {
  return {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  };
};
