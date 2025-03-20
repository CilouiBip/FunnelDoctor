/**
 * Types d\'u00e9vu00e9nements de conversion
 */
export enum ConversionEventType {
  VISIT = 'visit',                // Visite sur le site
  SIGNUP = 'signup',              // Inscription
  CONTACT_FORM = 'contact_form',  // Formulaire de contact rempli
  DEMO_REQUEST = 'demo_request',  // Demande de du00e9mo
  TRIAL_STARTED = 'trial_started',// Du00e9but d'essai
  PURCHASE_MADE = 'purchase_made',// Achat effectuu00e9
  UPSELL = 'upsell',              // Vente additionnelle
  REFERRAL = 'referral'           // Parrainage
}
