import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour les ru00e9sultats d'analyse par catu00e9gorie
 * Utilisu00e9 pour les graphiques en camembert, barres, etc.
 */
export class CategoryAnalyticsResultDto {
  @ApiProperty({ 
    description: 'Nom de la catu00e9gorie',
    example: 'marketing' 
  })
  category: string;

  @ApiProperty({ 
    description: 'Nombre d\'occurrences',
    example: 42 
  })
  count: number;

  @ApiProperty({ 
    description: 'Pourcentage du total',
    example: 25.5 
  })
  percentage: number;
}

/**
 * DTO pour les ru00e9sultats d'analyse temporelle
 * Utilisu00e9 pour les graphiques en ligne, histogrammes, etc.
 */
export class TimelineAnalyticsResultDto {
  @ApiProperty({ 
    description: 'Date (format ISO YYYY-MM-DD)',
    example: '2025-03-15' 
  })
  date: string;

  @ApiProperty({ 
    description: 'Nombre d\'occurrences pour cette date',
    example: 15 
  })
  count: number;
}

/**
 * DTO pour les ru00e9sultats d'analyse par source
 * Utilisu00e9 pour identifier l'origine des u00e9vu00e9nements
 */
export class SourceAnalyticsResultDto {
  @ApiProperty({ 
    description: 'Systu00e8me source',
    example: 'calendly' 
  })
  source: string;

  @ApiProperty({ 
    description: 'Nombre d\'occurrences',
    example: 38 
  })
  count: number;

  @ApiProperty({ 
    description: 'Pourcentage du total',
    example: 22.4 
  })
  percentage: number;
}

/**
 * DTO contenant tous les ru00e9sultats d'analyse de conversion
 * Regroupe les diffu00e9rents types d'analyse pour une vue complu00e8te
 */
export class EventsAnalyticsResponseDto {
  @ApiProperty({ 
    description: 'Analyse par catu00e9gorie d\'événement',
    type: [CategoryAnalyticsResultDto] 
  })
  byCategory: CategoryAnalyticsResultDto[];

  @ApiProperty({ 
    description: 'Analyse par source',
    type: [SourceAnalyticsResultDto] 
  })
  bySource: SourceAnalyticsResultDto[];

  @ApiProperty({ 
    description: 'Analyse temporelle (chronologique)',
    type: [TimelineAnalyticsResultDto] 
  })
  timeline: TimelineAnalyticsResultDto[];

  @ApiProperty({ 
    description: 'Total d\'événements sur la période',
    example: 167 
  })
  totalEvents: number;
}
