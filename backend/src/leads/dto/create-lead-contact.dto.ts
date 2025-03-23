import { IsEnum, IsNotEmpty, IsString, IsUUID, IsBoolean, IsOptional } from 'class-validator';

/**
 * DTO pour la création d'un contact de lead normalisé
 */
export class CreateLeadContactDto {
  @IsUUID()
  leadId: string;

  @IsEnum(['email', 'phone', 'address', 'social'], { message: 'Type de contact invalide' })
  contactType: string;

  @IsString()
  @IsNotEmpty({ message: 'La valeur du contact est requise' })
  contactValue: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean = false;
}
