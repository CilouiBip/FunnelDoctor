/**
 * Data Transfer Object pour sauvegarder une intégration OAuth
 */
export class SaveOAuthDto {
  /**
   * Le token d'accès OAuth
   */
  access_token: string;

  /**
   * Le refresh token OAuth (optionnel selon le fournisseur)
   */
  refresh_token?: string;

  /**
   * Le type de token (généralement "Bearer")
   */
  token_type?: string;

  /**
   * Les scopes/permissions accordés
   */
  scope?: string;

  /**
   * Durée de validité du token d'accès en secondes
   */
  expires_in?: number;

  /**
   * Timestamp d'expiration du token (en secondes depuis l'epoch)
   */
  expires_at?: number;

  /**
   * Durée de validité du refresh token en secondes (si applicable)
   */
  refresh_token_expires_in?: number;

  /**
   * Métadonnées supplémentaires spécifiques au fournisseur
   */
  [key: string]: any;
}
