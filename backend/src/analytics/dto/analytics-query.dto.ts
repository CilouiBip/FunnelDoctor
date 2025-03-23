import { IsDateString, IsOptional, IsUUID, IsString, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour les requêtes d'analyse
 * Permet de filtrer les données par période, site, utilisateur, etc.
 */
export class AnalyticsQueryDto {
  @ApiProperty({ 
    description: 'Date de début (format ISO)', 
    example: '2025-01-01'
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({ 
    description: 'Date de fin (format ISO)', 
    example: '2025-03-31'
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({ 
    description: 'ID du site (optionnel)', 
    required: false 
  })
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiProperty({ 
    description: 'ID de l\'utilisateur (optionnel)', 
    required: false 
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ 
    description: 'Catégorie d\'événement (optionnel)', 
    required: false,
    examples: ['marketing', 'sales', 'conversion']
  })
  @IsOptional()
  @IsString()
  eventCategory?: string;

  @ApiProperty({ 
    description: 'Système source (optionnel)', 
    required: false,
    examples: ['website', 'calendly', 'crm']
  })
  @IsOptional()
  @IsString()
  sourceSystem?: string;

  @ApiProperty({ 
    description: 'Étape du funnel (optionnel)', 
    required: false 
  })
  @IsOptional()
  @IsString()
  funnelStage?: string;

  @ApiProperty({ 
    description: 'Limite de résultats (1-100, défaut: 10)', 
    required: false,
    default: 10 
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10) || 10)
  limit? = 10;
}
