/**
 * DTO pour retourner les informations de profil utilisateur
 */
export class UserProfileDto {
  id: string;
  email: string;
  full_name: string;
  company_name?: string;
  plan_id: string;
  is_verified: boolean;
  api_key?: string; // Clu00e9 API de l'utilisateur pour l'accu00e8s aux webhooks
  created_at: Date;
  updated_at: Date;
}
