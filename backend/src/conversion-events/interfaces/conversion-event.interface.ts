/**
 * Interface pour les événements de conversion
 * Alignée avec le schéma de base de données Supabase
 */
export interface ConversionEvent {
  id: string;
  leadId: string;
  // L'attribut eventName est obligatoire car NOT NULL en base
  eventName: string;
  // Note: eventType est maintenu pour compatibilité mais sera déprécié
  eventType?: string;
  // Attributs ajoutés ou normalisés
  eventData?: Record<string, any>;
  pageUrl?: string;
  siteId?: string;
  amount?: number;
  // userId remplace created_by
  userId: string;
  createdAt: Date;
  updatedAt?: Date;
}
