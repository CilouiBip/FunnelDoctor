import { IsEmail, IsNotEmpty, IsString, IsUUID } from 'class-validator';

/**
 * DTO pour les données reçues du webhook Zapier lié à iClosed
 * Ce webhook est envoyé lorsqu'un rendez-vous est pris via iClosed
 */
export class IclosedWebhookDto {
  /**
   * Email du prospect ayant pris rendez-vous
   */
  @IsEmail()
  email: string;

  /**
   * ID du visiteur extrait du cookie _fd_vid
   */
  @IsUUID()
  visitorId: string;

  /**
   * Clé API FunnelDoctor pour identifier l'utilisateur
   */
  @IsNotEmpty()
  @IsString()
  apiKey: string;
}
