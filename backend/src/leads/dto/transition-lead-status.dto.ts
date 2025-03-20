import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { LeadStatus } from '../enums/lead-status.enum';

/**
 * DTO pour la transition d'un lead d'un statut u00e0 un autre
 */
export class TransitionLeadStatusDto {
  @IsNotEmpty()
  @IsEnum(LeadStatus)
  status: LeadStatus;

  @IsOptional()
  @IsString()
  comment?: string;
}
