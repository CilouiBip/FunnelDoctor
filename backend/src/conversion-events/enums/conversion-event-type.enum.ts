/**
 * Types d'événements de conversion
 * Synchronisés avec l'enum PostgreSQL conversion_event_type 
 */
export enum ConversionEventType {
  // Types d'événements standard
  PAYMENT = 'PAYMENT',             // Paiement effectué
  SIGNUP = 'SIGNUP',               // Inscription
  LOGIN = 'LOGIN',                 // Connexion
  
  // Types d'événements liés aux rendez-vous
  DEMO_SCHEDULED = 'DEMO_SCHEDULED', // RDV planifié
  DEMO_CANCELED = 'DEMO_CANCELED',   // RDV annulé
  
  // Autres types d'événements
  CONTACT_FORM = 'contact_form',     // Formulaire de contact (format historique)
  VISIT = 'visit',                   // Visite (format historique)
  TRIAL_STARTED = 'trial_started',   // Début d'essai (format historique)
  PURCHASE_MADE = 'purchase_made',   // Achat (format historique)
  UPSELL = 'upsell',                 // Vente additionnelle (format historique)
  REFERRAL = 'referral',             // Parrainage (format historique)
  
  // Type générique
  OTHER = 'OTHER'                    // Autre type d'événement
}
