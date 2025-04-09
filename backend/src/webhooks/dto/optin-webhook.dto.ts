import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * DTO pour le webhook d'opt-in
 * Utilisé dans l'endpoint /api/webhooks/optin
 */
export class OptinWebhookDto {
  /**
   * Clé API pour l'authentification du webhook
   * @example "api_123456789"
   */
  @IsString()
  @IsNotEmpty({ message: 'La clé API est requise' })
  apiKey: string;

  /**
   * Email du lead (opt-in)
   * @example "user@example.com"
   */
  @IsEmail({}, { message: 'Un email valide est requis' })
  @IsNotEmpty({ message: 'Email est requis' })
  email: string;

  /**
   * Identifiant du visiteur à associer au lead
   * @example "v_123456789"
   */
  @IsString()
  @IsNotEmpty({ message: 'L\'identifiant du visiteur est requis' })
  visitorId: string;

  /**
   * Source de l'opt-in (ex: formulaire, landing page)
   * @example "convertkit", "newsletter_form", "landing_page"
   */
  @IsString()
  @IsOptional()
  source?: string;

  /**
   * Données supplémentaires liées à l'opt-in
   * @example { "form_id": "123", "page": "/pricing" }
   */
  @IsOptional()
  eventData?: Record<string, any>;
}
