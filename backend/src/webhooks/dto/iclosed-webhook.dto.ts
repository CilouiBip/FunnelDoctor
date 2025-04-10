import { IsEmail, IsNotEmpty, IsString, IsUUID, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO pour les données reçues du webhook Zapier lié à iClosed
 * Ce webhook est envoyé lors de deux événements différents :
 * 1. Lorsqu'un rendez-vous est pris via iClosed (les champs obligatoires uniquement)
 * 2. Lorsqu'un appel est terminé avec un résultat (callOutcome et champs associés en option)
 */
export class IclosedWebhookDto {
  /**
   * Email du prospect ayant pris rendez-vous
   */
  @IsEmail()
  email: string;

  /**
   * ID du visiteur extrait du cookie _fd_vid ou de la valeur first_utm_content (optionnel pour Call Outcome)
   */
  @IsOptional()
  @IsString() // Utilisation de IsString au lieu de IsUUID pour plus de flexibilité avec les données de tracking
  visitorId?: string;

  /**
   * Clé API FunnelDoctor pour identifier l'utilisateur
   */
  @IsNotEmpty()
  @IsString()
  apiKey: string;

  /**
   * Résultat de l'appel (ex: 'Sale', 'No Sale', 'No Show')
   */
  @IsOptional()
  @IsString()
  callOutcome?: string;

  /**
   * Raison si le résultat est 'No Sale'
   */
  @IsOptional()
  @IsString()
  noSaleReason?: string;

  /**
   * Objection principale du prospect
   */
  @IsOptional()
  @IsString()
  objection?: string;

  /**
   * Heure de début de l'appel
   */
  @IsOptional()
  @IsDateString()
  callStartTime?: string;

  /**
   * Notes sur le résultat de l'appel
   */
  @IsOptional()
  @IsString()
  outcomeNotes?: string;

  /**
   * Valeur de la vente (si applicable)
   */
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  dealValue?: number;

  /**
   * Nom du produit vendu
   */
  @IsOptional()
  @IsString()
  productName?: string;

  /**
   * Type de transaction (abonnement, paiement unique, etc.)
   */
  @IsOptional()
  @IsString()
  dealTransactionType?: string;

  /**
   * Date de création de la vente
   */
  @IsOptional()
  @IsDateString()
  dealCreatedAt?: string;
}
