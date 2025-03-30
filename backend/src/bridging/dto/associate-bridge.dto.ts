import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * DTO pour l'association d'un email à un visitor_id 
 * Utilisé dans l'endpoint /api/bridge/associate
 */
export class AssociateBridgeDto {
  /**
   * Email à associer au visitor_id
   * @example "user@example.com"
   */
  @IsEmail()
  @IsNotEmpty()
  email: string;

  /**
   * Identifiant du visiteur à associer
   * @example "v_123456789"
   */
  @IsString()
  @IsNotEmpty()
  visitor_id: string;

  /**
   * Action qui a généré cette association
   * @example "calendly_submit", "optin_ac", "form_submission"
   */
  @IsString()
  @IsOptional()
  source_action?: string;

  /**
   * Données supplémentaires de contexte sur l'association
   * @example { "page": "/pricing", "referrer": "google.com" }
   */
  @IsOptional()
  event_data?: Record<string, any>;
}
