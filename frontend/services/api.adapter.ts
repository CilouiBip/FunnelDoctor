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
  // LOGS DE DÉBOGAGE
  console.log('[API-ADAPTER] Structure de la réponse brute:', {
    hasData: !!response.data,
    responseDataType: typeof response.data,
    responseKeys: response.data ? Object.keys(response.data) : [],
    hasSuccess: response.data ? 'success' in response.data : false,
    hasInnerData: response.data ? 'data' in response.data : false,
    hasItems: response.data ? 'items' in response.data : false,
  });

  // Vérification du format de réponse
  if (!response || !response.data) {
    console.error('[API-ADAPTER] Réponse API invalide - data manquant');
    throw new Error('Invalid API response: missing data');
  }

  // Vérification du succès de l'opération
  if (response.data.success === false) {
    const errorMessage = response.data.error || 'Operation failed';
    console.error('[API-ADAPTER] Erreur API:', errorMessage);
    throw new Error(errorMessage);
  }

  // Extraction des données
  if (response.data.data === undefined) {
    console.warn('[API-ADAPTER] Format de réponse inattendu - data absent:', response.data);
    
    // IMPORTANT: DÉBOGAGE - Examiner la structure de response.data quand data est absent
    if (response.data.items) {
      console.log('[API-ADAPTER] Structure du items trouvé:', {
        itemsLength: response.data.items.length,
        itemsIsArray: Array.isArray(response.data.items),
        firstItem: response.data.items.length > 0 ? response.data.items[0] : null
      });
    }
    
    // Si data n'existe pas mais que c'est une réponse paginée YouTube standard
    if (response.data.items && Array.isArray(response.data.items) && 'pageInfo' in response.data) {
      console.log('[API-ADAPTER] Détection d\'une structure de réponse YouTube standard');
      return response.data as T;
    }
    
    // Si data n'existe pas, on considère que la réponse entière est data
    const result = response.data as T;
    console.log('[API-ADAPTER] Type de données renvoyées:', typeof result, Array.isArray(result) ? 'array' : 'not array');
    return result;
  }

  const result = response.data.data as T;
  console.log('[API-ADAPTER] Données extraites de response.data.data:', {
    resultType: typeof result,
    isArray: Array.isArray(result),
    length: Array.isArray(result) ? result.length : 'N/A'
  });
  
  return result;
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
