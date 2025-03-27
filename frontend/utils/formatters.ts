/**
 * Formate un nombre avec séparateur de milliers
 * @param num Nombre à formater
 * @returns Chaîne formatée
 */
export const formatNumber = (num: number | string | undefined): string => {
  if (num === undefined || num === null) return '0';
  
  try {
    // Si c'est une chau00eene, essayer de la convertir en nombre
    const numValue = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : num;
    
    // Vu00e9rifier si c'est un nombre valide
    if (isNaN(numValue)) return '0';
    if (numValue === 0) return '0';
    
    // Formater le nombre avec des su00e9parateurs de milliers
    return new Intl.NumberFormat().format(numValue);
  } catch (error) {
    console.warn('Error formatting number:', num, error);
    return '0';
  }
};

/**
 * Formate une durée en secondes au format minutes:secondes
 * @param seconds Durée en secondes
 * @returns Chaîne formatée
 */
export const formatDuration = (seconds: number | string | undefined): string => {
  if (seconds === undefined || seconds === null) return '0s';
  
  try {
    // Convertir en nombre si c'est une chau00eene
    const secondsNum = typeof seconds === 'string' ? parseFloat(seconds) : seconds;
    
    // Vu00e9rifier si c'est un nombre valide
    if (isNaN(secondsNum)) return '0s';
    
    const minutes = Math.floor(secondsNum / 60);
    const remainingSeconds = Math.floor(secondsNum % 60);
    
    if (minutes < 1) {
      return `${remainingSeconds}s`;
    }
    
    return `${minutes}m ${remainingSeconds.toString().padStart(2, '0')}s`;
  } catch (error) {
    console.warn('Error formatting duration:', seconds, error);
    return '0s';
  }
};

/**
 * Formate une date au format localisé
 * @param dateString Chaîne de date ISO
 * @returns Date formatée
 */
export const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  } catch (error) {
    return 'Date invalide';
  }
};

/**
 * Obtient une classe CSS en fonction du niveau d'engagement
 * @param level Niveau d'engagement (LOW, MEDIUM, HIGH)
 * @returns Classe CSS
 */
export const getEngagementColorClass = (level: string | undefined): string => {
  if (!level) return 'text-gray-600';
  
  switch (level.toUpperCase()) {
    case 'HIGH':
      return 'text-green-600 font-medium';
    case 'MEDIUM':
      return 'text-yellow-600 font-medium';
    case 'LOW':
      return 'text-red-600 font-medium';
    default:
      return 'text-gray-600';
  }
};

/**
 * Obtient une classe CSS en fonction du pourcentage de rétention
 * @param percentage Pourcentage de rétention
 * @returns Classe CSS
 */
export const getRetentionColorClass = (percentage: number | undefined): string => {
  if (percentage === undefined || percentage === null) return 'text-gray-600';
  
  if (percentage >= 60) return 'text-green-600 font-medium';
  if (percentage >= 40) return 'text-yellow-600 font-medium';
  if (percentage > 0) return 'text-red-600 font-medium';
  return 'text-gray-600';
};
